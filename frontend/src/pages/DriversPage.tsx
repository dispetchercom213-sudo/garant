import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { driversApi } from '../services/api';
import type { Driver } from '../types';
import { useNotifications } from '../hooks/useNotifications';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns: Column[] = [
    { id: 'name', label: 'ФИО', minWidth: 200 },
    { id: 'phone', label: 'Телефон', minWidth: 120 },
  ];

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await driversApi.getAll({ search: searchQuery });
      setDrivers(response.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка загрузки водителей');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => fetchDrivers(), 300);
  };

  const handleAdd = () => {
    setEditingDriver(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const driver = drivers.find(d => d.id === id);
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
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

    if (!formData.firstName.trim()) {
      errors.firstName = 'Имя обязательно';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Фамилия обязательна';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Телефон обязателен';
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
      };

      if (editingDriver) {
        await driversApi.update(editingDriver.id, data);
        success('Водитель успешно обновлен');
      } else {
        await driversApi.create(data);
        success('Водитель успешно создан');
      }
      
      setModalOpen(false);
      fetchDrivers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения водителя');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await driversApi.delete(deleteId);
      success('Водитель успешно удален');
      setConfirmOpen(false);
      setDeleteId(null);
      fetchDrivers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления водителя');
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
        title="Водители"
        columns={columns}
        data={drivers}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['name', 'phone', 'licenseNumber']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDriver ? 'Редактировать водителя' : 'Добавить водителя'}
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingDriver ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Имя *"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Фамилия *"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              error={!!formErrors.lastName}
              helperText={formErrors.lastName}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Телефон *"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={!!formErrors.phone}
              helperText={formErrors.phone}
            />
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление водителя"
        message="Вы уверены, что хотите удалить этого водителя? Это действие нельзя отменить."
      />
    </Box>
  );
};