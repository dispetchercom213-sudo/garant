import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Chip,
  Grid,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { counterpartiesApi } from '../services/api';
import type { Counterparty } from '../types';
import { CounterpartyKind, CounterpartyType } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';

export const CounterpartiesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingCounterparty, setEditingCounterparty] = useState<Counterparty | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();
  
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

  const columns: Column[] = [
    { 
      id: 'kind', 
      label: 'Тип лица', 
      minWidth: 100,
      render: (value) => (
        <Chip 
          label={value === CounterpartyKind.INDIVIDUAL ? 'Физ. лицо' : 'Юр. лицо'} 
          size="small" 
          variant="outlined"
        />
      )
    },
    { 
      id: 'type', 
      label: 'Роль', 
      minWidth: 100,
      render: (value) => (
        <Chip 
          label={value === CounterpartyType.CUSTOMER ? 'Покупатель' : 'Поставщик'} 
          size="small" 
          variant="outlined"
          color={value === CounterpartyType.CUSTOMER ? 'primary' : 'secondary'}
        />
      )
    },
    { id: 'name', label: 'Название/ФИО', minWidth: 200 },
    { id: 'binOrIin', label: 'БИН/ИИН', minWidth: 120 },
    { id: 'phone', label: 'Телефон', minWidth: 120 },
    { id: 'address', label: 'Адрес', minWidth: 250 },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAdd = () => {
    setEditingCounterparty(null);
    setFormData({
      kind: CounterpartyKind.LEGAL,
      type: CounterpartyType.CUSTOMER,
      name: '',
      binOrIin: '',
      phone: '',
      address: '',
      representativeName: '',
      representativePhone: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const counterparty = counterparties.find(c => c.id === id);
    if (counterparty) {
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
      errors.name = 'Название/ФИО обязательно';
    }

    if (formData.kind === CounterpartyKind.LEGAL && !formData.binOrIin.trim()) {
      errors.binOrIin = 'БИН обязателен для юридического лица';
    } else if (formData.kind === CounterpartyKind.INDIVIDUAL && !formData.binOrIin.trim()) {
      errors.binOrIin = 'ИИН обязателен для физического лица';
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
      if (editingCounterparty) {
        await counterpartiesApi.update(editingCounterparty.id, formData);
        success('Контрагент успешно обновлен');
      } else {
        await counterpartiesApi.create(formData);
        success('Контрагент успешно создан');
      }
      
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения контрагента');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await counterpartiesApi.delete(deleteId);
      success('Контрагент успешно удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления контрагента');
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
        title="Контрагенты"
        columns={columns}
        data={counterparties}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['name', 'binOrIin', 'phone', 'address', 'representativeName']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCounterparty ? 'Редактировать контрагента' : 'Добавить контрагента'}
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingCounterparty ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Тип лица *"
              value={formData.kind}
              onChange={(e) => handleInputChange('kind', e.target.value)}
              error={!!formErrors.kind}
              helperText={formErrors.kind}
            >
              <MenuItem value={CounterpartyKind.INDIVIDUAL}>Физическое лицо</MenuItem>
              <MenuItem value={CounterpartyKind.LEGAL}>Юридическое лицо</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Роль *"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              error={!!formErrors.type}
              helperText={formErrors.type}
            >
              <MenuItem value={CounterpartyType.CUSTOMER}>Покупатель</MenuItem>
              <MenuItem value={CounterpartyType.SUPPLIER}>Поставщик</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={formData.kind === CounterpartyKind.INDIVIDUAL ? 'ФИО *' : 'Название *'}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={formData.kind === CounterpartyKind.INDIVIDUAL ? 'ИИН *' : 'БИН *'}
              value={formData.binOrIin}
              onChange={(e) => handleInputChange('binOrIin', e.target.value)}
              error={!!formErrors.binOrIin}
              helperText={formErrors.binOrIin}
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
              label="Адрес"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Представитель"
              value={formData.representativeName}
              onChange={(e) => handleInputChange('representativeName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Телефон представителя"
              value={formData.representativePhone}
              onChange={(e) => handleInputChange('representativePhone', e.target.value)}
            />
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление контрагента"
        message="Вы уверены, что хотите удалить этого контрагента? Это действие нельзя отменить."
      />
    </Box>
  );
};