import { useState, useEffect } from 'react';
import { Container, Title, Paper, Group, TextInput, Select, Button, Stack, Alert } from '@mantine/core';
import { DataTable, type Column } from '../components/ui/data-table';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { api } from '../services/api';
import { type Vehicle, VehicleType } from '../types';
import { AlertCircle, CheckCircle } from 'lucide-react';

// Лейблы для типов транспорта
const VehicleTypeLabels = {
  MIXER: 'Миксер',
  DUMP_TRUCK: 'Самосвал',
  LOADER: 'Погрузчик',
  OTHER: 'Прочее',
};

interface VehicleFormData {
  type: string;
  plate: string;
  capacity: string;
  unit: string;
}

export const MyVehiclesPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [formData, setFormData] = useState<VehicleFormData>({
    type: VehicleType.MIXER,
    plate: '',
    capacity: '',
    unit: 'м³',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Загрузка транспорта водителя
  const fetchMyVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vehicles/my');
      setVehicles(response.data.data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки транспорта:', error);
      setErrorMessage(error.response?.data?.message || 'Ошибка загрузки транспорта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVehicles();
  }, []);

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plate.trim()) {
      newErrors.plate = 'Номер автомобиля обязателен';
    }

    if (!formData.capacity.trim() || isNaN(Number(formData.capacity))) {
      newErrors.capacity = 'Укажите корректную грузоподъёмность';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Выберите единицу измерения';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Создание транспорта
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      const payload = {
        type: formData.type,
        plate: formData.plate.trim(),
        capacity: parseFloat(formData.capacity),
        unit: formData.unit,
      };

      await api.post('/vehicles/my', payload);
      
      setSuccessMessage('Транспорт успешно добавлен!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      resetForm();
      fetchMyVehicles();
    } catch (error: any) {
      console.error('Ошибка создания транспорта:', error);
      setErrorMessage(error.response?.data?.message || 'Ошибка создания транспорта');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: VehicleType.MIXER,
      plate: '',
      capacity: '',
      unit: 'м³',
    });
    setErrors({});
  };

  // Удаление (отвязка) транспорта
  const handleDelete = async (vehicle: Vehicle) => {
    try {
      setLoading(true);
      await api.delete(`/vehicles/my/${vehicle.id}`);
      
      setSuccessMessage('Транспорт успешно удалён из вашего списка!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      fetchMyVehicles();
    } catch (error: any) {
      console.error('Ошибка удаления транспорта:', error);
      setErrorMessage(error.response?.data?.message || 'Ошибка удаления транспорта');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Колонки таблицы
  const columns: Column<Vehicle>[] = [
    { 
      id: 'plate', 
      label: 'Номер', 
      minWidth: 140 
    },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 150,
      render: (value) => VehicleTypeLabels[value as keyof typeof VehicleTypeLabels] || value
    },
    { 
      id: 'capacity', 
      label: 'Грузоподъёмность', 
      minWidth: 150,
      render: (value, row) => value ? `${value} ${row.unit || ''}` : '-'
    },
    { 
      id: '_count' as keyof Vehicle,
      label: 'Накладных', 
      minWidth: 120,
      render: (_value, row) => {
        const count = row._count?.invoices || 0;
        return (
          <span className={count > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {count}
          </span>
        );
      }
    },
  ];

  return (
    <Container size="xl" className="py-6">
      <Stack gap="md">
        <Title order={2}>Мой транспорт</Title>

        {/* Форма добавления транспорта */}
        <Paper shadow="sm" p="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <Title order={4}>Добавить транспорт</Title>

              {successMessage && (
                <Alert icon={<CheckCircle size={16} />} color="green">
                  {successMessage}
                </Alert>
              )}

              {errorMessage && (
                <Alert icon={<AlertCircle size={16} />} color="red">
                  {errorMessage}
                </Alert>
              )}

              <Group grow>
                <TextInput
                  label="Номер автомобиля"
                  placeholder="ABC123"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                  error={errors.plate}
                  required
                />

                <Select
                  label="Тип транспорта"
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value || VehicleType.MIXER })}
                  data={Object.entries(VehicleTypeLabels).map(([key, label]) => ({
                    value: key,
                    label: label as string,
                  }))}
                  required
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Грузоподъёмность"
                  placeholder="10"
                  type="number"
                  step="0.01"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  error={errors.capacity}
                  required
                />

                <Select
                  label="Единица измерения"
                  value={formData.unit}
                  onChange={(value) => setFormData({ ...formData, unit: value || 'м³' })}
                  data={[
                    { value: 'м³', label: 'м³' },
                    { value: 'т', label: 'тонн' },
                    { value: 'кг', label: 'кг' },
                  ]}
                  required
                />
              </Group>

              <div className="bg-gray-50 border border-gray-300 rounded-md p-3">
                <p className="text-sm text-gray-900">
                  <strong>Информация:</strong>
                </p>
                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                  <li>• Если номер уже существует - вы просто добавите его в свой список</li>
                  <li>• Если номер новый - будет создан новый транспорт</li>
                  <li>• Один транспорт может быть у нескольких водителей</li>
                  <li>• Администраторы и диспетчеры видят весь транспорт системы</li>
                </ul>
              </div>

              <Group justify="flex-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Очистить
                </Button>
                <Button type="submit" loading={loading}>
                  Добавить транспорт
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>

        {/* Таблица транспорта */}
        <Paper shadow="sm" p="md" withBorder>
          <div className="flex justify-between items-center mb-4">
            <Title order={4}>Мой транспорт ({vehicles.length})</Title>
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
          
          {viewMode === 'table' ? (
            <>
              <DataTable
                columns={columns}
                data={vehicles}
                loading={loading}
                onDelete={handleDelete}
                searchable={false}
              />
              
              {vehicles.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  У вас пока нет транспорта
                </div>
              )}
            </>
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
                      label: VehicleTypeLabels[vehicle.type as keyof typeof VehicleTypeLabels] || vehicle.type,
                      variant: 'default'
                    }}
                    fields={[
                      { label: 'Тип', value: VehicleTypeLabels[vehicle.type as keyof typeof VehicleTypeLabels] || vehicle.type },
                      { label: 'Вместимость', value: vehicle.capacity ? `${vehicle.capacity} ${vehicle.unit || ''}` : '-' },
                      { label: 'Накладных', value: vehicle._count?.invoices ? `${vehicle._count.invoices}` : '0' }
                    ]}
                    onDelete={() => handleDelete(vehicle)}
                  />
                ))
              ) : (
                <p className="col-span-full text-center py-8 text-gray-500">У вас пока нет транспорта</p>
              )}
            </div>
          )}
          
          {vehicles.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
              <strong>Совет:</strong> Нажмите на кнопку "Удалить", чтобы убрать транспорт из вашего списка. 
              Транспорт останется в системе и будет доступен другим водителям.
            </div>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

