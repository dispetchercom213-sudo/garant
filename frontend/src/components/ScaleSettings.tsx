import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Scale, Camera, Wifi, Settings, CheckCircle, XCircle, Loader2, Copy, ExternalLink } from 'lucide-react';
import { scaleApi } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';

interface ScaleSettingsProps {
  warehouseId?: number;
  initialData?: {
    hasScales: boolean;
    hasCamera: boolean;
    scaleIp: string;
    scaleApiKey: string;
    scaleComPort: string;
  };
  onDataChange: (data: any) => void;
}

export const ScaleSettings: React.FC<ScaleSettingsProps> = ({
  warehouseId,
  initialData = {
    hasScales: false,
    hasCamera: false,
    scaleIp: 'https://casey-nether-billie.ngrok-free.dev',
    scaleApiKey: '',
  },
  onDataChange,
}) => {
  const { success, error } = useNotifications();
  const [formData, setFormData] = useState(initialData);
  const [scaleStatus, setScaleStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [scaleMessage, setScaleMessage] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);

  const handleDataChange = (newData: any) => {
    setFormData(newData);
    onDataChange(newData);
  };

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
      error('Введите IP адрес весов');
      return;
    }

    setIsTestingConnection(true);
    setScaleStatus('connecting');
    setScaleMessage('Проверка соединения...');

    try {
      // Сначала получаем API ключ
      const apiKeyResponse = await scaleApi.getApiKey(warehouseId || 0, {
        scaleIp: formData.scaleIp
      });
      
      const apiKey = apiKeyResponse.data.apiKey;
      const newData = { ...formData, scaleApiKey: apiKey };
      handleDataChange(newData);

      // Затем тестируем соединение
      await scaleApi.testConnection(warehouseId || 0, {
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
      window.open(`http://${formData.scaleIp}:5055`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Настройка весов ScaleBridge</h3>
      </div>

      {/* Подключение весов */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hasScales"
          checked={formData.hasScales}
          onCheckedChange={(checked) => handleDataChange({ ...formData, hasScales: !!checked })}
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
              onCheckedChange={(checked) => handleDataChange({ ...formData, hasCamera: !!checked })}
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
                onChange={(e) => handleDataChange({ ...formData, scaleIp: e.target.value })}
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
            <p className="text-xs text-gray-500 mt-1">
              ScaleBridge должен быть запущен и подключен к весам локально
            </p>
          </div>

          {/* API ключ */}
          <div>
            <Label htmlFor="scaleApiKey">API ключ *</Label>
            <div className="flex gap-2">
              <Input
                id="scaleApiKey"
                value={formData.scaleApiKey}
                onChange={(e) => handleDataChange({ ...formData, scaleApiKey: e.target.value })}
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
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-medium text-blue-900 mb-1">🔒 Рекомендация по безопасности:</p>
              <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Нажмите кнопку <ExternalLink className="h-3 w-3 inline" /> чтобы открыть ScaleBridge</li>
                <li>В ScaleBridge перейдите в раздел "Настройки API"</li>
                <li>Скопируйте API ключ оттуда и вставьте сюда</li>
                <li>Или нажмите "Тест соединения" для автоматического получения</li>
              </ol>
            </div>
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
                    onClick={() => handleDataChange({ ...formData, scaleIp: device.ip })}
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
                        handleDataChange({ ...formData, scaleIp: device.ip });
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
  );
};
