import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { companiesApi } from '../services/api';
import type { Company } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { cleanFormData } from '../utils/dataUtils';

export const CompaniesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();
  
  const { data: companies, loading, refetch } = useApiData<Company>({
    apiCall: () => companiesApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });

  const [formData, setFormData] = useState({
    name: '',
    bin: '',
    address: '',
    phone: '',
    email: '',
    director: '',
    bankName: '',
    iik: '',
    bik: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns: Column[] = [
    { id: 'name', label: 'Название', minWidth: 200 },
    { id: 'bin', label: 'БИН', minWidth: 120 },
    { id: 'address', label: 'Адрес', minWidth: 250 },
    { id: 'phone', label: 'Телефон', minWidth: 120 },
    { id: 'email', label: 'Email', minWidth: 150 },
    { id: 'director', label: 'Директор', minWidth: 150 },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAdd = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      bin: '',
      address: '',
      phone: '',
      email: '',
      director: '',
      bankName: '',
      iik: '',
      bik: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const company = companies.find(c => c.id === id);
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        bin: company.bin,
        address: company.address,
        phone: company.phone,
        email: company.email || '',
        director: company.director || '',
        bankName: company.bankName || '',
        iik: company.iik || '',
        bik: company.bik || '',
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

    if (!formData.bin.trim()) {
      errors.bin = 'БИН обязателен';
    } else if (!/^\d{12}$/.test(formData.bin)) {
      errors.bin = 'БИН должен содержать 12 цифр';
    }

    if (!formData.address.trim()) {
      errors.address = 'Адрес обязателен';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Телефон обязателен';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Неверный формат email';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Очищаем пустые строки для опциональных полей
      const cleanData = cleanFormData(formData, ['email', 'director', 'bankName', 'iik', 'bik']);

      if (editingCompany) {
        await companiesApi.update(editingCompany.id, cleanData);
        success('Компания успешно обновлена');
      } else {
        await companiesApi.create(cleanData);
        success('Компания успешно создана');
      }
      
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения компании');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await companiesApi.delete(deleteId);
      success('Компания успешно удалена');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления компании');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку для поля при изменении
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Box>
      <DataTable
        title="Компании"
        columns={columns}
        data={companies}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['name', 'bin', 'address', 'phone', 'email', 'director']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCompany ? 'Редактировать компанию' : 'Добавить компанию'}
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingCompany ? 'Обновить' : 'Создать'}
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
              label="БИН *"
              value={formData.bin}
              onChange={(e) => handleInputChange('bin', e.target.value)}
              error={!!formErrors.bin}
              helperText={formErrors.bin}
            />
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
              label="Телефон *"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={!!formErrors.phone}
              helperText={formErrors.phone}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Директор"
              value={formData.director}
              onChange={(e) => handleInputChange('director', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Банк"
              value={formData.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ИИК"
              value={formData.iik}
              onChange={(e) => handleInputChange('iik', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="БИК"
              value={formData.bik}
              onChange={(e) => handleInputChange('bik', e.target.value)}
            />
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление компании"
        message="Вы уверены, что хотите удалить эту компанию? Это действие нельзя отменить."
      />
    </Box>
  );
};