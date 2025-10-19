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
import { materialsApi } from '../services/api';
import type { Material } from '../types';
import { MaterialTypeEnum } from '../types';
import { useNotifications } from '../hooks/useNotifications';

export const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();

  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    typeName: 'CEMENT' as MaterialTypeEnum,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const materialTypeLabels = {
    [MaterialTypeEnum.CEMENT]: 'Цемент',
    [MaterialTypeEnum.SAND]: 'Песок',
    [MaterialTypeEnum.GRAVEL]: 'Щебень',
    [MaterialTypeEnum.WATER]: 'Вода',
    [MaterialTypeEnum.ADDITIVE]: 'Добавка',
  };

  const columns: Column[] = [
    { id: 'name', label: 'Название', minWidth: 200 },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 120,
      render: (value) => (
        <Chip 
          label={materialTypeLabels[value?.name as MaterialTypeEnum] || value?.name} 
          size="small" 
          variant="outlined"
        />
      )
    },
    { id: 'unit', label: 'Единица измерения', minWidth: 150 },
  ];

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await materialsApi.getAll({ search: searchQuery });
      setMaterials(response.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => fetchMaterials(), 300);
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setFormData({
      name: '',
      unit: '',
      typeName: MaterialTypeEnum.CEMENT,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const material = materials.find(m => m.id === id);
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        unit: material.unit,
        typeName: material.type?.name || MaterialTypeEnum.CEMENT,
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

    if (!formData.unit.trim()) {
      errors.unit = 'Единица измерения обязательна';
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
        name: formData.name,
        unit: formData.unit,
        typeName: formData.typeName,
      };

      if (editingMaterial) {
        await materialsApi.update(editingMaterial.id, data);
        success('Материал успешно обновлен');
      } else {
        await materialsApi.create(data);
        success('Материал успешно создан');
      }
      
      setModalOpen(false);
      fetchMaterials();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения материала');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await materialsApi.delete(deleteId);
      success('Материал успешно удален');
      setConfirmOpen(false);
      setDeleteId(null);
      fetchMaterials();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления материала');
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
        title="Материалы"
        columns={columns}
        data={materials}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['name', 'unit']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMaterial ? 'Редактировать материал' : 'Добавить материал'}
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingMaterial ? 'Обновить' : 'Создать'}
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
              label="Тип материала *"
              value={formData.typeName}
              onChange={(e) => handleInputChange('typeName', e.target.value)}
              error={!!formErrors.typeName}
              helperText={formErrors.typeName}
            >
              {Object.entries(materialTypeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Единица измерения *"
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
              error={!!formErrors.unit}
              helperText={formErrors.unit}
            >
              <MenuItem value="кг">кг</MenuItem>
              <MenuItem value="л">л</MenuItem>
              <MenuItem value="м³">м³</MenuItem>
              <MenuItem value="т">т</MenuItem>
              <MenuItem value="шт">шт</MenuItem>
              <MenuItem value="м">м</MenuItem>
              <MenuItem value="м²">м²</MenuItem>
              <MenuItem value="г">г</MenuItem>
              <MenuItem value="мг">мг</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление материала"
        message="Вы уверены, что хотите удалить этот материал? Это действие нельзя отменить."
      />
    </Box>
  );
};