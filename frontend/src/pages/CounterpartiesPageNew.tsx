import React, { useState } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { counterpartiesApi } from '../services/api';
import type { Counterparty } from '../types';
import { CounterpartyKind, CounterpartyType, UserRole } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { useAuthStore } from '../stores/authStore';

export const CounterpartiesPageNew: React.FC = () => {
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingCounterparty, setEditingCounterparty] = useState<Counterparty | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  
  // Проверка прав на редактирование/удаление
  const canEdit = () => {
    if (!user) return false;
    // Директор, Диспетчер, Бухгалтер, Админ и Разработчик могут редактировать всех
    const canEditAll = [UserRole.DIRECTOR as string, UserRole.DISPATCHER as string, UserRole.ACCOUNTANT as string, UserRole.ADMIN as string, UserRole.DEVELOPER as string].includes(user.role);
    if (canEditAll) {
      return true;
    }
    // Остальные (Водитель, Менеджер, Оператор) могут редактировать только своих (которые видят)
    return true;
  };
  
  const canDelete = () => {
    if (!user) return false;
    
    // ADMIN и DEVELOPER могут удалять всех
    const canDeleteAll = [UserRole.ADMIN as string, UserRole.DEVELOPER as string].includes(user.role);
    if (canDeleteAll) {
      return true;
    }
    
    // Директор, Диспетчер и Бухгалтер могут удалять всех (кого видят)
    const isPrivilegedRole = [UserRole.DIRECTOR as string, UserRole.DISPATCHER as string, UserRole.ACCOUNTANT as string].includes(user.role);
    if (isPrivilegedRole) {
      return true;
    }
    
    // Менеджер, Оператор и Водитель могут удалять только своих (которых они видят)
    return true;
  };
  
  const { data: counterparties, loading, refetch } = useApiData<Counterparty>({
    apiCall: () => counterpartiesApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });

  const [formData, setFormData] = useState({
    kind: 'LEGAL' as CounterpartyKind,
    type: 'CUSTOMER' as CounterpartyType,
    name: '',
    binOrIin: '',
    phone: '',
    address: '',
    representativeName: '',
    representativePhone: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns: Column<Counterparty>[] = [
    { 
      id: 'kind', 
      label: 'Тип лица', 
      minWidth: 100,
      render: (value: CounterpartyKind) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'LEGAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {value === 'LEGAL' ? 'Юр. лицо' : 'Физ. лицо'}
        </span>
      )
    },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 100,
      render: (value: CounterpartyType) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'CUSTOMER' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {value === 'CUSTOMER' ? 'Покупатель' : 'Поставщик'}
        </span>
      )
    },
    { id: 'name', label: 'Название', minWidth: 200 },
    { id: 'binOrIin', label: 'БИН/ИИН', minWidth: 120 },
    { id: 'phone', label: 'Телефон', minWidth: 120 },
    { id: 'address', label: 'Адрес', minWidth: 250 },
    { id: 'representativeName', label: 'Представитель', minWidth: 150 },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название обязательно';
    }

    if (!formData.binOrIin.trim()) {
      errors.binOrIin = 'БИН/ИИН обязательно';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Телефон обязателен';
    }

    if (formData.kind === CounterpartyKind.LEGAL && !formData.representativeName.trim()) {
      errors.representativeName = 'Представитель обязателен для юридических лиц';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          typeof value === 'string' && value.trim() === '' ? undefined : value
        ])
      );

      if (editingCounterparty) {
        await counterpartiesApi.update(editingCounterparty.id, cleanData);
        success('Контрагент обновлен');
      } else {
        await counterpartiesApi.create(cleanData);
        success('Контрагент создан');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (counterparty: Counterparty) => {
    setEditingCounterparty(counterparty);
    setFormData({
      kind: counterparty.kind,
      type: counterparty.type,
      name: counterparty.name,
      binOrIin: counterparty.binOrIin || '',
      phone: counterparty.phone,
      address: counterparty.address || '',
      representativeName: counterparty.representativeName || '',
      representativePhone: counterparty.representativePhone || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await counterpartiesApi.delete(deleteId);
      success('Контрагент удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      kind: 'LEGAL' as CounterpartyKind,
      type: 'CUSTOMER' as CounterpartyType,
      name: '',
      binOrIin: '',
      phone: '',
      address: '',
      representativeName: '',
      representativePhone: '',
    });
    setFormErrors({});
    setEditingCounterparty(null);
    setModalOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const kindLabels = {
    LEGAL: 'Юр. лицо',
    INDIVIDUAL: 'Физ. лицо'
  };

  const typeLabels = {
    SUPPLIER: 'Поставщик',
    CUSTOMER: 'Клиент'
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Контрагенты</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск контрагентов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
          <DataTable
            data={counterparties}
            columns={columns}
            loading={loading}
            searchable={false}
            onEdit={(cp) => canEdit() && handleEdit(cp)}
            onDelete={(cp) => {
              if (canDelete()) {
                setDeleteId(cp.id);
                setConfirmOpen(true);
              }
            }}
          />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : counterparties && counterparties.length > 0 ? (
            counterparties.map((counterparty) => (
              <EntityCard
                key={counterparty.id}
                title={counterparty.name}
                subtitle={counterparty.binOrIin}
                badge={{
                  label: typeLabels[counterparty.type],
                  variant: counterparty.type === 'SUPPLIER' ? 'default' : 'secondary'
                }}
                fields={[
                  { label: 'Тип', value: kindLabels[counterparty.kind] },
                  { label: 'Телефон', value: counterparty.phone },
                  { label: 'Адрес', value: counterparty.address, fullWidth: true }
                ]}
                onEdit={canEdit() ? () => handleEdit(counterparty) : undefined}
                onDelete={canDelete() ? () => {
                  setDeleteId(counterparty.id);
                  setConfirmOpen(true);
                } : undefined}
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
              {editingCounterparty ? 'Редактировать контрагента' : 'Добавить контрагента'}
            </DialogTitle>
            <DialogDescription>
              {editingCounterparty ? 'Внесите изменения в данные контрагента' : 'Заполните форму для создания нового контрагента'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kind">Тип лица</Label>
              <Select
                value={formData.kind}
                onValueChange={(value: CounterpartyKind) => 
                  setFormData({ ...formData, kind: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CounterpartyKind.LEGAL}>Юридическое лицо</SelectItem>
                  <SelectItem value={CounterpartyKind.INDIVIDUAL}>Физическое лицо</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.kind && (
                <p className="text-red-500 text-sm mt-1">{formErrors.kind}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Тип</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CounterpartyType) => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CounterpartyType.CUSTOMER}>Покупатель</SelectItem>
                  <SelectItem value={CounterpartyType.SUPPLIER}>Поставщик</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.type && (
                <p className="text-red-500 text-sm mt-1">{formErrors.type}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название"
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="binOrIin">БИН/ИИН *</Label>
              <Input
                id="binOrIin"
                value={formData.binOrIin}
                onChange={(e) => setFormData({ ...formData, binOrIin: e.target.value })}
                placeholder="Введите БИН или ИИН"
              />
              {formErrors.binOrIin && (
                <p className="text-red-500 text-sm mt-1">{formErrors.binOrIin}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Введите телефон"
              />
              {formErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Введите адрес"
              />
            </div>

            {formData.kind === CounterpartyKind.LEGAL && (
              <>
                <div>
                  <Label htmlFor="representativeName">Представитель *</Label>
                  <Input
                    id="representativeName"
                    value={formData.representativeName}
                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                    placeholder="Введите имя представителя"
                  />
                  {formErrors.representativeName && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.representativeName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="representativePhone">Телефон представителя</Label>
                  <Input
                    id="representativePhone"
                    value={formData.representativePhone}
                    onChange={(e) => setFormData({ ...formData, representativePhone: e.target.value })}
                    placeholder="Введите телефон представителя"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="bg-gray-800 hover:bg-gray-900">
              {editingCounterparty ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этого контрагента? Это действие нельзя отменить.
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
