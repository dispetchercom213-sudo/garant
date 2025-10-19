import React, { useState } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { warehousesApi, companiesApi, scaleApi } from '../services/api';
import type { Warehouse, Company } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { Scale, Wifi, Camera, Settings, CheckCircle, XCircle, Loader2, Copy, ExternalLink } from 'lucide-react';

export const WarehousesPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  
  const { data: warehouses, loading, refetch } = useApiData<Warehouse>({
    apiCall: () => warehousesApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });
  
  const { data: companies } = useApiData<Company>({
    apiCall: () => companiesApi.getAll()
  });

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    coordinates: '',
    phone: '',
    companyId: '',
    // Настройки весов
    hasScales: false,
    hasCamera: false,
    scaleIp: 'https://casey-nether-billie.ngrok-free.dev',
    scaleApiKey: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [scaleStatus, setScaleStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [scaleMessage, setScaleMessage] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);

  const columns: Column<Warehouse>[] = [
    { id: 'name', label: 'Название', minWidth: 200 },
    { id: 'address', label: 'Адрес', minWidth: 250 },
    { id: 'phone', label: 'Телефон', minWidth: 120 },
    { 
      id: 'company', 
      label: 'Компания', 
      minWidth: 150,
      render: (value) => value?.name || '-'
    },
    { 
      id: 'latitude', 
      label: 'Координаты', 
      minWidth: 150,
      render: (_value, row) => 
        row.latitude && row.longitude 
          ? `${row.latitude}, ${row.longitude}` 
          : '-'
    },
    {
      id: 'hasScales',
      label: 'Весы',
      minWidth: 120,
      render: (_value, row) => {
        if (!row.hasScales) {
          return <span className="text-gray-400">Не подключены</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Scale className="h-4 w-4 text-green-500" />
              <span className="text-green-600 text-sm">Подключено</span>
            </div>
            {row.hasCamera && (
              <Camera className="h-4 w-4 text-blue-500" />
            )}
          </div>
        );
      }
    },
  ];


  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      address: '',
      coordinates: '',
      phone: '',
      companyId: '',
      hasScales: false,
      hasCamera: false,
      scaleIp: 'https://casey-nether-billie.ngrok-free.dev',
      scaleApiKey: '',
    });
    setFormErrors({});
    setScaleStatus('disconnected');
    setScaleMessage('');
    setModalOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      coordinates: warehouse.latitude && warehouse.longitude 
        ? `${warehouse.latitude}, ${warehouse.longitude}` 
        : '',
      phone: warehouse.phone || '',
      companyId: warehouse.companyId?.toString() || '',
      hasScales: warehouse.hasScales || false,
      hasCamera: warehouse.hasCamera || false,
      scaleIp: warehouse.scaleIpAddress || '',
      scaleApiKey: warehouse.scaleApiKey || '',
    });
    setFormErrors({});
    setScaleStatus('disconnected');
    setScaleMessage('');
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название обязательно';
    }

    if (!formData.address.trim()) {
      errors.address = 'Адрес обязателен';
    }

    if (!formData.companyId) {
      errors.companyId = 'Компания обязательна';
    }

    if (formData.coordinates.trim()) {
      const coordParts = formData.coordinates.split(',');
      if (coordParts.length !== 2) {
        errors.coordinates = 'Координаты должны быть в формате: широта, долгота';
      } else {
        const lat = parseFloat(coordParts[0].trim());
        const lng = parseFloat(coordParts[1].trim());
        if (isNaN(lat) || isNaN(lng)) {
          errors.coordinates = 'Координаты должны быть числами';
        } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          errors.coordinates = 'Недопустимые значения координат';
        }
      }
    }

    // Валидация настроек весов
    if (formData.hasScales) {
      if (!formData.scaleIp.trim()) {
        errors.scaleIp = 'URL весов обязателен';
      } else {
        // Проверка формата URL или IP адреса
        const urlPattern = /^https?:\/\/.+/;
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!urlPattern.test(formData.scaleIp) && !ipPattern.test(formData.scaleIp)) {
          errors.scaleIp = 'Неверный формат URL (например: https://casey-nether-billie.ngrok-free.dev) или IP адреса';
        }
      }

      if (!formData.scaleApiKey.trim()) {
        errors.scaleApiKey = 'API ключ обязателен. Нажмите "Тест соединения" для автоматического получения';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data: any = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || undefined,
        companyId: parseInt(formData.companyId),
        // Настройки весов
        hasScales: formData.hasScales,
        hasCamera: formData.hasCamera,
        scaleIpAddress: formData.hasScales ? formData.scaleIp : undefined,
        scaleApiKey: formData.hasScales ? formData.scaleApiKey : undefined,
      };

      if (formData.coordinates.trim()) {
        const [lat, lng] = formData.coordinates.split(',').map(c => parseFloat(c.trim()));
        data.latitude = lat;
        data.longitude = lng;
      }

      if (editingWarehouse) {
        await warehousesApi.update(editingWarehouse.id, data);
        success('Склад обновлен');
      } else {
        await warehousesApi.create(data);
        success('Склад создан');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await warehousesApi.delete(deleteId);
      success('Склад удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      coordinates: '',
      phone: '',
      companyId: '',
      hasScales: false,
      hasCamera: false,
      scaleIp: 'https://casey-nether-billie.ngrok-free.dev',
      scaleApiKey: '',
    });
    setFormErrors({});
    setScaleStatus('disconnected');
    setScaleMessage('');
    setEditingWarehouse(null);
    setModalOpen(false);
  };

  // Функции для работы с весами
  const discoverDevices = async () => {
    setIsDiscovering(true);
    try {
      const response = await scaleApi.discoverDevices('192.168.1');
      setDiscoveredDevices(response.data || []);
      success(`Найдено ${response.data?.length || 0} устройств`);
    } catch (err: any) {
      error('Ошибка поиска устройств: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDiscovering(false);
    }
  };

  const testConnection = async () => {
    if (!formData.scaleIp) {
      error('Введите URL весов');
      return;
    }

    setIsTestingConnection(true);
    setScaleStatus('connecting');
    setScaleMessage('Проверка соединения...');

    try {
      // Сначала получаем API ключ
      const apiKeyResponse = await scaleApi.getApiKey(editingWarehouse?.id || 0, {
        scaleIp: formData.scaleIp
      });
      
      const apiKey = apiKeyResponse.data.apiKey;
      setFormData({ ...formData, scaleApiKey: apiKey });

      // Затем тестируем соединение
      await scaleApi.testConnection(editingWarehouse?.id || 0, {
        scaleIp: formData.scaleIp,
        apiKey: apiKey
      });

      setScaleStatus('connected');
      setScaleMessage('Соединение успешно установлено');
      success('Весы подключены успешно');
    } catch (err: any) {
      setScaleStatus('error');
      setScaleMessage('Ошибка подключения: ' + (err.response?.data?.message || err.message));
      error('Ошибка подключения к весам: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getScaleStatusIcon = () => {
    switch (scaleStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const copyApiKey = async () => {
    if (formData.scaleApiKey) {
      try {
        await navigator.clipboard.writeText(formData.scaleApiKey);
        success('API ключ скопирован в буфер обмена');
      } catch (err) {
        error('Не удалось скопировать API ключ');
      }
    }
  };

  const openScaleBridgeSettings = () => {
    if (formData.scaleIp) {
      // Если это URL, используем как есть, иначе добавляем http:// и порт
      const url = formData.scaleIp.startsWith('http') 
        ? formData.scaleIp 
        : `http://${formData.scaleIp}:5055`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Склады</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск складов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={warehouses}
          columns={columns}
          loading={loading}
          searchable={false}
          onEdit={handleEdit}
          onDelete={(warehouse) => {
            setDeleteId(warehouse.id);
            setConfirmOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : warehouses && warehouses.length > 0 ? (
            warehouses.map((warehouse) => (
              <EntityCard
                key={warehouse.id}
                title={warehouse.name}
                subtitle={warehouse.company?.name}
                fields={[
                  { label: 'Адрес', value: warehouse.address, fullWidth: true },
                  { label: 'Телефон', value: warehouse.phone },
                  { label: 'Координаты', value: warehouse.latitude && warehouse.longitude ? `${warehouse.latitude}, ${warehouse.longitude}` : '-' },
                  { 
                    label: 'Весы', 
                    value: warehouse.hasScales ? (
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 text-sm">Подключено</span>
                        {warehouse.hasCamera && (
                          <Camera className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Не подключены</span>
                    )
                  }
                ]}
                onEdit={() => handleEdit(warehouse)}
                onDelete={() => {
                  setDeleteId(warehouse.id);
                  setConfirmOpen(true);
                }}
              />
            ))
          ) : (
            <p className="col-span-full text-center py-8 text-gray-500">Нет данных</p>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Редактировать склад' : 'Добавить склад'}
            </DialogTitle>
          
            <DialogDescription>
              Внесите изменения в данные
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название склада"
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Адрес *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Введите адрес склада"
              />
              {formErrors.address && (
                <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Введите телефон"
              />
            </div>

            <div>
              <Label htmlFor="companyId">Компания *</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => setFormData({ ...formData, companyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите компанию" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.companyId && (
                <p className="text-red-500 text-sm mt-1">{formErrors.companyId}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="coordinates">Координаты</Label>
              <Input
                id="coordinates"
                value={formData.coordinates}
                onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                placeholder="Широта, долгота (например: 43.2220, 76.8512)"
              />
              {formErrors.coordinates && (
                <p className="text-red-500 text-sm mt-1">{formErrors.coordinates}</p>
              )}
            </div>
          </div>

          {/* Секция настройки весов */}
          <div className="col-span-2 border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Настройка весов ScaleBridge</h3>
            </div>

            <div className="space-y-4">
              {/* Подключение весов */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasScales"
                  checked={formData.hasScales}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasScales: !!checked })}
                />
                <Label htmlFor="hasScales" className="text-sm font-medium">
                  Подключить весы ScaleBridge
                </Label>
              </div>

              {/* Настройки весов - показываются только если весы подключены */}
              {formData.hasScales && (
                <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* Камера */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasCamera"
                      checked={formData.hasCamera}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasCamera: !!checked })}
                    />
                    <Label htmlFor="hasCamera" className="text-sm font-medium">
                      <Camera className="h-4 w-4 inline mr-1" />
                      Камера доступна (делать фото при взвешивании)
                    </Label>
                  </div>

                  {/* URL ScaleBridge */}
                  <div>
                      <Label htmlFor="scaleIp">URL ScaleBridge *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="scaleIp"
                        value={formData.scaleIp}
                        onChange={(e) => setFormData({ ...formData, scaleIp: e.target.value })}
                        placeholder="https://casey-nether-billie.ngrok-free.dev"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={discoverDevices}
                        disabled={isDiscovering}
                      >
                        {isDiscovering ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {formErrors.scaleIp && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.scaleIp}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Введите URL ScaleBridge (например: https://casey-nether-billie.ngrok-free.dev) или локальный IP
                    </p>
                  </div>

                  {/* API ключ */}
                  <div>
                    <Label htmlFor="scaleApiKey">API ключ *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="scaleApiKey"
                        value={formData.scaleApiKey}
                        onChange={(e) => setFormData({ ...formData, scaleApiKey: e.target.value })}
                        placeholder="Скопируйте из настроек ScaleBridge"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyApiKey}
                        disabled={!formData.scaleApiKey}
                        title="Скопировать API ключ"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openScaleBridgeSettings}
                        disabled={!formData.scaleIp}
                        title="Открыть настройки ScaleBridge"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    {formErrors.scaleApiKey ? (
                      <p className="text-red-500 text-sm mt-1">{formErrors.scaleApiKey}</p>
                    ) : (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                        <p className="font-medium text-blue-900 mb-1">🔒 Рекомендация по безопасности:</p>
                        <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
                          <li>Нажмите кнопку <ExternalLink className="h-3 w-3 inline" /> чтобы открыть ScaleBridge</li>
                          <li>В ScaleBridge перейдите в раздел "Настройки API"</li>
                          <li>Скопируйте API ключ оттуда и вставьте сюда</li>
                          <li>Или нажмите "Тест соединения" для автоматического получения</li>
                        </ol>
                      </div>
                    )}
                  </div>

                  {/* Статус подключения */}
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center gap-2">
                      {getScaleStatusIcon()}
                      <span className="text-sm font-medium">
                        {scaleStatus === 'connected' ? 'Подключено' :
                         scaleStatus === 'error' ? 'Ошибка' :
                         scaleStatus === 'connecting' ? 'Подключение...' : 'Не подключено'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={testConnection}
                      disabled={isTestingConnection || !formData.scaleIp}
                    >
                      {isTestingConnection ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      Тест соединения
                    </Button>
                  </div>

                  {scaleMessage && (
                    <div className={`text-sm p-2 rounded ${
                      scaleStatus === 'connected' ? 'bg-green-100 text-green-800' :
                      scaleStatus === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {scaleMessage}
                    </div>
                  )}

                  {/* Список найденных устройств */}
                  {discoveredDevices.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Найденные устройства:</Label>
                      <div className="mt-2 space-y-2">
                        {discoveredDevices.map((device, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                            onClick={() => setFormData({ ...formData, scaleIp: device.ip })}
                          >
                            <div>
                              <div className="font-medium">{device.ip}</div>
                              <div className="text-sm text-gray-500">Вес: {device.weight} кг</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, scaleIp: device.ip });
                              }}
                            >
                              Выбрать
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="bg-gray-800 hover:bg-gray-900">
              {editingWarehouse ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот склад? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
