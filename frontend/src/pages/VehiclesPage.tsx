import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Chip,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { vehiclesApi } from '../services/api';
import type { Vehicle } from '../types';
import { VehicleType } from '../types';
import { useNotifications } from '../hooks/useNotifications';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();

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

  const columns: Column[] = [
    { id: 'plate', label: 'Номер', minWidth: 120 },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 120,
      render: (value) => (
        <Chip 
          label={vehicleTypeLabels[value as VehicleType] || value} 
          size="small" 
          variant="outlined"
        />
      )
    },
    { 
      id: 'capacity', 
      label: 'Грузоподъемность', 
      minWidth: 150,
      render: (value, row) => value ? `${value} ${row.unit || ''}` : '-'
    },
  ];

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesApi.getAll({ search: searchQuery });
      setVehicles(response.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка загрузки транспорта');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => fetchVehicles(), 300);
  };

  const handleAdd = () => {
    setEditingVehicle(null);
    setFormData({
      type: VehicleType.MIXER,
      plate: '',
      capacity: '',
      unit: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        type: vehicle.type as VehicleType,
        plate: vehicle.plate,
        capacity: vehicle.capacity?.toString() || '',
        unit: vehicle.unit || '',
      });
      setFormErrors({});
      setModalOpen(true);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.plate.trim()) {
      errors.plate = 'Номер транспорта обязателен';
    }

    if (formData.capacity && isNaN(Number(formData.capacity))) {
      errors.capacity = 'Грузоподъемность должна быть числом';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const data = {
        ...formData,
        capacity: formData.capacity ? Number(formData.capacity) : undefined,
      };

      if (editingVehicle) {
        await vehiclesApi.update(editingVehicle.id, data);
        success('Транспорт успешно обновлен');
      } else {
        await vehiclesApi.create(data);
        success('Транспорт успешно создан');
      }
      
      setModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения транспорта');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await vehiclesApi.delete(deleteId);
      success('Транспорт успешно удален');
      setConfirmOpen(false);
      setDeleteId(null);
      fetchVehicles();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления транспорта');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Box>
      <DataTable
        title="Транспорт"
        columns={columns}
        data={vehicles}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['plate']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? 'Редактировать транспорт' : 'Добавить транспорт'}
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingVehicle ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Тип транспорта *"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              error={!!formErrors.type}
              helperText={formErrors.type}
            >
              {Object.entries(vehicleTypeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Номер *"
              value={formData.plate}
              onChange={(e) => handleInputChange('plate', e.target.value)}
              error={!!formErrors.plate}
              helperText={formErrors.plate}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Грузоподъемность"
              type="number"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
              error={!!formErrors.capacity}
              helperText={formErrors.capacity}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Единица измерения"
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
            >
              <MenuItem value="м³">м³</MenuItem>
              <MenuItem value="кг">кг</MenuItem>
              <MenuItem value="т">т</MenuItem>
              <MenuItem value="л">л</MenuItem>
              <MenuItem value="г">г</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление транспорта"
        message="Вы уверены, что хотите удалить этот транспорт? Это действие нельзя отменить."
      />
    </Box>
  );
};