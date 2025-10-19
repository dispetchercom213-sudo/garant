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
import { vehiclesApi } from '../services/api';
import type { Vehicle } from '../types';
import { VehicleType } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';

export const VehiclesPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  
  const { data: vehicles, loading, refetch } = useApiData<Vehicle>({
    apiCall: () => vehiclesApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });

  const [formData, setFormData] = useState({
    type: 'MIXER' as VehicleType,
    plate: '',
    capacity: '',
    unit: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const vehicleTypeLabels = {
    [VehicleType.MIXER]: 'Миксер',
    [VehicleType.DUMP_TRUCK]: 'Самосвал',
    [VehicleType.LOADER]: 'Погрузчик',
    [VehicleType.OTHER]: 'Прочее',
  };

  const unitOptions = [
    { value: 'м³', label: 'Кубический метр (м³)' },
    { value: 'т', label: 'Тонна (т)' },
    { value: 'кг', label: 'Килограмм (кг)' },
    { value: 'л', label: 'Литр (л)' },
  ];

  const columns: Column<Vehicle>[] = [
    { id: 'plate', label: 'Номер', minWidth: 120 },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 120,
      render: (value: VehicleType) => (
        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
          {vehicleTypeLabels[value]}
        </span>
      )
    },
    { id: 'capacity', label: 'Грузоподъемность', minWidth: 150 },
    { id: 'unit', label: 'Единица измерения', minWidth: 150 },
    { 
      id: 'drivers' as keyof Vehicle,
      label: 'Водители', 
      minWidth: 200,
      render: (_value, row) => {
        if (!row.drivers || row.drivers.length === 0) {
          return <span className="text-gray-400">Нет водителей</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {row.drivers.map((driver, index) => (
              <span key={driver.id} className="text-blue-600 text-sm">
                {index + 1}. {driver.firstName} {driver.lastName}
              </span>
            ))}
          </div>
        );
      }
    },
    { 
      id: '_count' as keyof Vehicle,
      label: 'Накладных', 
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

    if (!formData.plate.trim()) {
      errors.plate = 'Номер автомобиля обязателен';
    }

    if (!formData.capacity.trim()) {
      errors.capacity = 'Грузоподъемность обязательна';
    } else {
      const capacityValue = parseFloat(formData.capacity.trim());
      if (isNaN(capacityValue) || capacityValue <= 0) {
        errors.capacity = 'Грузоподъемность должна быть положительным числом';
      }
    }

    if (!formData.unit.trim()) {
      errors.unit = 'Единица измерения обязательна';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data = {
        type: formData.type,
        plate: formData.plate.trim(),
        capacity: parseFloat(formData.capacity.trim()) || 0,
        unit: formData.unit.trim(),
      };

      console.log('Отправляем данные транспорта:', data);
      console.log('Исходные данные формы:', formData);

      if (editingVehicle) {
        await vehiclesApi.update(editingVehicle.id, data);
        success('Транспорт обновлен');
      } else {
        await vehiclesApi.create(data);
        success('Транспорт создан');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      console.error('❌ Ошибка при создании транспорта:', err);
      console.error('📋 Детали ошибки:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.response?.data?.message,
        errors: err.response?.data?.errors
      });
      console.error('🔍 Полный ответ сервера:', JSON.stringify(err.response?.data, null, 2));
      error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      type: vehicle.type,
      plate: vehicle.plate,
      capacity: vehicle.capacity?.toString() || '',
      unit: vehicle.unit || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await vehiclesApi.delete(deleteId);
      success('Транспорт удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      type: VehicleType.MIXER,
      plate: '',
      capacity: '',
      unit: '',
    });
    setFormErrors({});
    setEditingVehicle(null);
    setModalOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Транспорт</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск транспорта..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={vehicles}
          columns={columns}
          loading={loading}
          searchable={false}
          onEdit={handleEdit}
          onDelete={(vehicle) => {
            setDeleteId(vehicle.id);
            setConfirmOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : vehicles && vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <EntityCard
                key={vehicle.id}
                title={vehicle.plate}
                badge={{
                  label: vehicleTypeLabels[vehicle.type] || vehicle.type,
                  variant: 'default'
                }}
                fields={[
                  { label: 'Тип', value: vehicleTypeLabels[vehicle.type] || vehicle.type },
                  { label: 'Вместимость', value: vehicle.capacity ? `${vehicle.capacity} ${vehicle.unit || ''}` : '-' }
                ]}
                onEdit={() => handleEdit(vehicle)}
                onDelete={() => {
                  setDeleteId(vehicle.id);
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
              {editingVehicle ? 'Редактировать транспорт' : 'Добавить транспорт'}
            </DialogTitle>
          
            <DialogDescription>
              Внесите изменения в данные
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plate">Номер автомобиля *</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                placeholder="Введите номер автомобиля"
              />
              {formErrors.plate && (
                <p className="text-red-500 text-sm mt-1">{formErrors.plate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Тип транспорта</Label>
              <Select
                value={formData.type}
                onValueChange={(value: VehicleType) => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capacity">Грузоподъемность *</Label>
              <Input
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="Введите грузоподъемность"
              />
              {formErrors.capacity && (
                <p className="text-red-500 text-sm mt-1">{formErrors.capacity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit">Единица измерения *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите единицу измерения" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.unit && (
                <p className="text-red-500 text-sm mt-1">{formErrors.unit}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="bg-gray-800 hover:bg-gray-900">
              {editingVehicle ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот транспорт? Это действие нельзя отменить.
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
