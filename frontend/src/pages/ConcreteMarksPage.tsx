import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Divider,
  Chip,
  IconButton,
  MenuItem,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { concreteMarksApi, materialsApi } from '../services/api';
import type { ConcreteMark, Material } from '../types';
import { useNotifications } from '../hooks/useNotifications';

export const ConcreteMarksPage: React.FC = () => {
  const [concreteMarks, setConcreteMarks] = useState<ConcreteMark[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<ConcreteMark | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    materials: [] as Array<{ materialId: number; quantityPerM3: number; unit: string }>,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns: Column[] = [
    { id: 'name', label: 'Марка бетона', minWidth: 200 },
    { id: 'description', label: 'Описание', minWidth: 250 },
    { 
      id: 'materials', 
      label: 'Материалы', 
      minWidth: 200,
      render: (value) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {value?.slice(0, 3).map((material: any) => (
            <Chip
              key={material.id}
              label={`${material.material.name} ${material.quantityPerM3}${material.unit}`}
              size="small"
              variant="outlined"
            />
          ))}
          {value?.length > 3 && (
            <Chip
              label={`+${value.length - 3} еще`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )
    },
  ];

  useEffect(() => {
    fetchConcreteMarks();
    fetchMaterials();
  }, []);

  const fetchConcreteMarks = async () => {
    try {
      setLoading(true);
      const response = await concreteMarksApi.getAll({ search: searchQuery });
      setConcreteMarks(response.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка загрузки марок бетона');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await materialsApi.getAll();
      // Обрабатываем разные форматы ответа API
      const materialsData = response.data || response || [];
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
    } catch (err: any) {
      console.error('Ошибка загрузки материалов:', err);
      setMaterials([]); // Устанавливаем пустой массив в случае ошибки
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => fetchConcreteMarks(), 300);
  };

  const handleAdd = () => {
    setEditingMark(null);
    setFormData({
      name: '',
      description: '',
      materials: [],
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const mark = concreteMarks.find(m => m.id === id);
    if (mark) {
      setEditingMark(mark);
      setFormData({
        name: mark.name,
        description: mark.description || '',
        materials: mark.materials?.map(m => ({
          materialId: m.materialId,
          quantityPerM3: m.quantityPerM3,
          unit: m.unit,
        })) || [],
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
      errors.name = 'Название марки обязательно';
    }

    if (formData.materials.length === 0) {
      errors.materials = 'Необходимо добавить хотя бы один материал';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (editingMark) {
        await concreteMarksApi.update(editingMark.id, formData);
        success('Марка бетона успешно обновлена');
      } else {
        await concreteMarksApi.create(formData);
        success('Марка бетона успешно создана');
      }
      
      setModalOpen(false);
      fetchConcreteMarks();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения марки бетона');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await concreteMarksApi.delete(deleteId);
      success('Марка бетона успешно удалена');
      setConfirmOpen(false);
      setDeleteId(null);
      fetchConcreteMarks();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления марки бетона');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { materialId: 0, quantityPerM3: 0, unit: '' }],
    }));
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      ),
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  return (
    <Box>
      <DataTable
        title="Марки бетона"
        columns={columns}
        data={concreteMarks}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['name', 'description']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMark ? 'Редактировать марку бетона' : 'Добавить марку бетона'}
        maxWidth="lg"
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingMark ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Название марки *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
              placeholder="Б25 (М350)"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Описание"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={2}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Состав на 1 м³</Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addMaterial}
                size="small"
              >
                Добавить материал
              </Button>
            </Box>
            
            {formErrors.materials && (
              <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                {formErrors.materials}
              </Typography>
            )}
            
            {formData.materials.map((material, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Материал"
                    value={material.materialId}
                    onChange={(e) => updateMaterial(index, 'materialId', Number(e.target.value))}
                  >
                    <MenuItem value={0}>Выберите материал</MenuItem>
                    {Array.isArray(materials) && materials.map((mat) => (
                      <MenuItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Количество"
                    type="number"
                    value={material.quantityPerM3}
                    onChange={(e) => updateMaterial(index, 'quantityPerM3', Number(e.target.value))}
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    select
                    label="Единица"
                    value={material.unit}
                    onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
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
                <Grid item xs={12} sm={2}>
                  <IconButton
                    onClick={() => removeMaterial(index)}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление марки бетона"
        message="Вы уверены, что хотите удалить эту марку бетона? Это действие нельзя отменить."
      />
    </Box>
  );
};