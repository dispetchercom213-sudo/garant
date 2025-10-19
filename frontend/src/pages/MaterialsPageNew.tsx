import React, { useState, useEffect } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { materialsApi } from '../services/api';
import type { Material, MaterialType } from '../types';
import { MaterialTypeEnum } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { cleanFormData } from '../utils/dataUtils';

export const MaterialsPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  
  const { data: materials, loading, refetch } = useApiData<Material>({
    apiCall: () => materialsApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });

  // Загружаем доступные типы материалов
  const { data: materialTypes, loading: typesLoading } = useApiData<MaterialType>({
    apiCall: () => materialsApi.getTypes(),
    dependencies: []
  });

  // Логируем загрузку типов материалов для диагностики
  useEffect(() => {
    console.log('🔄 Статус загрузки типов материалов:', { typesLoading, materialTypes });
    if (materialTypes && materialTypes.length === 0) {
      console.log('⚠️ В базе данных нет типов материалов!');
    }
  }, [typesLoading, materialTypes]);

  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    typeName: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Устанавливаем первый доступный тип материала при загрузке
  useEffect(() => {
    if (!formData.typeName) {
      if (materialTypes && materialTypes.length > 0) {
        // Используем первый тип из API
        setFormData(prev => ({ ...prev, typeName: materialTypes[0].name }));
      } else {
        // Используем первый тип из статического списка (всегда доступен)
        setFormData(prev => ({ ...prev, typeName: MaterialTypeEnum.CEMENT }));
      }
    }
  }, [materialTypes, formData.typeName]);

  // Статический список типов материалов как fallback
  const staticMaterialTypes = [
    { name: MaterialTypeEnum.CEMENT, label: 'Цемент' },
    { name: MaterialTypeEnum.SAND, label: 'Песок' },
    { name: MaterialTypeEnum.GRAVEL, label: 'Щебень' },
    { name: MaterialTypeEnum.WATER, label: 'Вода' },
    { name: MaterialTypeEnum.ADDITIVE, label: 'Добавка' },
  ];

  const materialTypeLabels = {
    [MaterialTypeEnum.CEMENT]: 'Цемент',
    [MaterialTypeEnum.SAND]: 'Песок',
    [MaterialTypeEnum.GRAVEL]: 'Щебень',
    [MaterialTypeEnum.WATER]: 'Вода',
    [MaterialTypeEnum.ADDITIVE]: 'Добавка',
  };

  const unitOptions = [
    { value: 'кг', label: 'Килограмм (кг)' },
    { value: 'т', label: 'Тонна (т)' },
    { value: 'м³', label: 'Кубический метр (м³)' },
    { value: 'л', label: 'Литр (л)' },
    { value: 'шт', label: 'Штука (шт)' },
    { value: 'упак', label: 'Упаковка (упак)' },
  ];

  const columns: Column<Material>[] = [
    { id: 'name', label: 'Название', minWidth: 200 },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 120,
      render: (value) => (
        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
          {materialTypeLabels[value?.name as MaterialTypeEnum] || value?.name}
        </span>
      )
    },
    { id: 'unit', label: 'Единица измерения', minWidth: 150 },
  ];

  const validateForm = (): boolean => {
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Находим выбранный тип материала из API или статического списка
      const selectedType = materialTypes?.find(type => type.name === formData.typeName) ||
                          staticMaterialTypes.find(type => type.name === formData.typeName);
      
      // Используем выбранный тип, если он есть, иначе используем значение из формы
      const typeNameToSend = selectedType?.name || formData.typeName || MaterialTypeEnum.CEMENT;
      
      const rawData = {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        typeName: typeNameToSend,
      };
      
      console.log('📋 Сырые данные перед очисткой:', rawData);
      
      const data = cleanFormData(rawData, ['unit']);
      
      console.log('Отправляем данные материала:', data);
      console.log('Исходные данные формы:', formData);
      console.log('Доступные типы материалов (API):', materialTypes);
      console.log('Статические типы материалов:', staticMaterialTypes);
      console.log('🎯 Выбранный тип:', selectedType);
      console.log('✅ Итоговый typeName для отправки:', typeNameToSend);
      console.log('🔍 Проверяем typeName:', {
        'formData.typeName': formData.typeName,
        'selectedType?.name': selectedType?.name,
        'typeNameToSend': typeNameToSend,
        'isValid': Object.values(MaterialTypeEnum).includes(typeNameToSend as MaterialTypeEnum)
      });

      if (editingMaterial) {
        await materialsApi.update(editingMaterial.id, data);
        success('Материал обновлен');
      } else {
        await materialsApi.create(data);
        success('Материал создан');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      console.error('❌ Ошибка при создании материала:', err);
      console.error('📋 Детали ошибки:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.response?.data?.message,
        errors: err.response?.data?.errors
      });
      console.error('🔍 Полный ответ сервера:', JSON.stringify(err.response?.data, null, 2));
      error(err.response?.data?.message || err.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit: material.unit,
      typeName: material.type?.name || MaterialTypeEnum.CEMENT,
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await materialsApi.delete(deleteId);
      success('Материал удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit: '',
      typeName: MaterialTypeEnum.CEMENT,
    });
    setFormErrors({});
    setEditingMaterial(null);
    setModalOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Материалы</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск материалов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={materials}
          columns={columns}
          loading={loading}
          searchable={false}
          onEdit={handleEdit}
          onDelete={(material) => {
            setDeleteId(material.id);
            setConfirmOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : materials && materials.length > 0 ? (
            materials.map((material) => (
              <EntityCard
                key={material.id}
                title={material.name}
                badge={{
                  label: materialTypeLabels[material.type?.name as MaterialTypeEnum] || material.type?.name || 'Неизвестно',
                  variant: 'default'
                }}
                fields={[
                  { label: 'Единица измерения', value: material.unit },
                  { label: 'Тип', value: materialTypeLabels[material.type?.name as MaterialTypeEnum] || material.type?.name }
                ]}
                onEdit={() => handleEdit(material)}
                onDelete={() => {
                  setDeleteId(material.id);
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
              {editingMaterial ? 'Редактировать материал' : 'Добавить материал'}
            </DialogTitle>
          
            <DialogDescription>
              Внесите изменения в данные
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название материала"
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="typeName">Тип материала</Label>
              <Select
                value={formData.typeName}
                onValueChange={(value: MaterialTypeEnum) => 
                  setFormData({ ...formData, typeName: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
            <SelectContent>
              {materialTypes && materialTypes.length > 0 ? (
                // Используем типы из API
                materialTypes.map((type) => (
                  <SelectItem key={type.name} value={type.name}>
                    {materialTypeLabels[type.name as MaterialTypeEnum] || type.name}
                  </SelectItem>
                ))
              ) : (
                // Fallback к статическому списку
                staticMaterialTypes.map((type) => (
                  <SelectItem key={type.name} value={type.name}>
                    {type.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
              </Select>
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
              {editingMaterial ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот материал? Это действие нельзя отменить.
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
