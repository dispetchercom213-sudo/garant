import React, { useState } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { driversApi } from '../services/api';
import type { Driver } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';

export const DriversPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  
  const { data: drivers, loading, refetch } = useApiData<Driver>({
    apiCall: () => driversApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns: Column<Driver>[] = [
    { 
      id: 'name', 
      label: 'ФИО', 
      minWidth: 200,
      render: (_value, row) => `${row.firstName} ${row.lastName}`
    },
    { id: 'phone', label: 'Телефон (логин)', minWidth: 150 },
    { 
      id: 'email', 
      label: 'Email', 
      minWidth: 180,
      render: (value) => value || <span className="text-gray-400">-</span>
    },
    { 
      id: 'user' as keyof Driver, 
      label: 'Статус', 
      minWidth: 100,
      render: (_value, row) => {
        const status = row.user?.status || 'ACTIVE';
        const statusLabels: Record<string, { text: string; color: string }> = {
          ACTIVE: { text: 'Активен', color: 'bg-green-100 text-green-800' },
          INACTIVE: { text: 'Неактивен', color: 'bg-gray-100 text-gray-800' },
          BLOCKED: { text: 'Заблокирован', color: 'bg-red-100 text-red-800' },
        };
        const statusInfo = statusLabels[status] || statusLabels.ACTIVE;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        );
      }
    },
    { 
      id: '_count' as keyof Driver, 
      label: 'Накладные', 
      minWidth: 120,
      render: (_value, row) => {
        const count = row._count?.invoices || 0;
        return (
          <span className={count > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
            {count}
          </span>
        );
      }
    },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'Имя обязательно';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Фамилия обязательна';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Телефон обязателен';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Некорректный email';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
      };

      if (editingDriver) {
        await driversApi.update(editingDriver.id, data);
        success('Водитель обновлен');
      } else {
        await driversApi.create(data);
        success('Водитель создан. Пароль для входа: 123456');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      email: driver.email || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await driversApi.delete(deleteId);
      success('Водитель удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    });
    setFormErrors({});
    setEditingDriver(null);
    setModalOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Водители</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск водителей..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={drivers}
          columns={columns}
          loading={loading}
          searchable={false}
          onEdit={handleEdit}
          onDelete={(driver) => {
            setDeleteId(driver.id);
            setConfirmOpen(true);
          }}
          canDelete={(driver) => {
            const invoicesCount = driver._count?.invoices || 0;
            return invoicesCount === 0;
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : drivers && drivers.length > 0 ? (
            drivers.map((driver) => (
              <EntityCard
                key={driver.id}
                title={`${driver.firstName} ${driver.lastName}`}
                subtitle={driver.phone}
                fields={[
                  { label: 'Email', value: driver.email || '-' },
                  { label: 'Номер ВУ', value: driver.licenseNumber || '-' },
                  { label: 'Накладных', value: driver._count?.invoices ? `${driver._count.invoices}` : '0' }
                ]}
                onEdit={() => handleEdit(driver)}
                onDelete={() => {
                  setDeleteId(driver.id);
                  setConfirmOpen(true);
                }}
                canDelete={(driver._count?.invoices || 0) === 0}
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
              {editingDriver ? 'Редактировать водителя' : 'Добавить водителя'}
            </DialogTitle>
          
            <DialogDescription>
              {editingDriver ? 'Внесите изменения в данные водителя' : 'Заполните форму для создания нового водителя. Пользователь с ролью DRIVER будет создан автоматически.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Телефон (логин) *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Введите номер телефона"
              />
              {formErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Имя *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Введите имя"
                />
                {formErrors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Фамилия *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Введите фамилию"
                />
                {formErrors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com (опционально)"
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
              )}
            </div>

            {!editingDriver && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Информация:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Логин для входа: номер телефона</li>
                  <li>• Пароль по умолчанию: <strong>123456</strong></li>
                  <li>• Роль: Водитель (DRIVER)</li>
                  <li>• Статус: Активен</li>
                  <li>• Водитель сможет изменить пароль в личном кабинете</li>
                </ul>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="bg-gray-800 hover:bg-gray-900">
              {editingDriver ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const driver = drivers.find(d => d.id === deleteId);
                const invoicesCount = driver?._count?.invoices || 0;
                
                if (invoicesCount > 0) {
                  return (
                    <span className="text-yellow-600 font-medium">
                      ⚠️ Нельзя удалить водителя, у которого есть {invoicesCount} накладных.
                      Сначала удалите все накладные или измените водителя в них.
                    </span>
                  );
                }
                
                return 'Вы уверены, что хотите удалить этого водителя? Это действие нельзя отменить.';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={(() => {
                const driver = drivers.find(d => d.id === deleteId);
                return (driver?._count?.invoices || 0) > 0;
              })()}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
