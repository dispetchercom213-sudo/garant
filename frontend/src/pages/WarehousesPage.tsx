import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { warehousesApi, companiesApi } from '../services/api';
import type { Warehouse, Company } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';

export const WarehousesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns: Column[] = [
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
      id: 'coordinates', 
      label: 'Координаты', 
      minWidth: 150,
      render: (_value, row) => 
        row.latitude && row.longitude 
          ? `${row.latitude}, ${row.longitude}` 
          : '-'
    },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      address: '',
      coordinates: '',
      phone: '',
      companyId: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        address: warehouse.address,
        coordinates: warehouse.latitude && warehouse.longitude 
          ? `${warehouse.latitude}, ${warehouse.longitude}` 
          : '',
        phone: warehouse.phone || '',
        companyId: warehouse.companyId?.toString() || '',
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

    if (!formData.name.trim()) {
      errors.name = 'Название обязательно';
    }

    if (!formData.address.trim()) {
      errors.address = 'Адрес обязателен';
    }

    if (formData.coordinates && formData.coordinates.trim()) {
      const coords = formData.coordinates.split(',');
      if (coords.length !== 2) {
        errors.coordinates = 'Введите координаты в формате: широта, долгота';
      } else {
        const lat = coords[0].trim();
        const lng = coords[1].trim();
        if (isNaN(Number(lat)) || isNaN(Number(lng))) {
          errors.coordinates = 'Координаты должны быть числами';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      if (formData.coordinates && formData.coordinates.trim()) {
        const coords = formData.coordinates.split(',');
        if (coords.length === 2) {
          latitude = Number(coords[0].trim());
          longitude = Number(coords[1].trim());
        }
      }
      
      const data = {
        ...formData,
        latitude,
        longitude,
        companyId: formData.companyId ? Number(formData.companyId) : undefined,
      };
      
      // Убираем coordinates из данных, отправляемых на сервер
      delete (data as any).coordinates;

      if (editingWarehouse) {
        await warehousesApi.update(editingWarehouse.id, data);
        success('Склад успешно обновлен');
      } else {
        await warehousesApi.create(data);
        success('Склад успешно создан');
      }
      
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения склада');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await warehousesApi.delete(deleteId);
      success('Склад успешно удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления склада');
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
        title="Склады"
        columns={columns}
        data={warehouses}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['name', 'address', 'phone']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWarehouse ? 'Редактировать склад' : 'Добавить склад'}
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingWarehouse ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Название *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Компания"
              value={formData.companyId}
              onChange={(e) => handleInputChange('companyId', e.target.value)}
            >
              <MenuItem value="">Выберите компанию</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Адрес *"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              error={!!formErrors.address}
              helperText={formErrors.address}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Телефон"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Координаты"
              value={formData.coordinates}
              onChange={(e) => handleInputChange('coordinates', e.target.value)}
              error={!!formErrors.coordinates}
              helperText={formErrors.coordinates || "Формат: широта, долгота (например: 43.238949, 76.889709)"}
              placeholder="43.238949, 76.889709"
            />
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление склада"
        message="Вы уверены, что хотите удалить этот склад? Это действие нельзя отменить."
      />
    </Box>
  );
};