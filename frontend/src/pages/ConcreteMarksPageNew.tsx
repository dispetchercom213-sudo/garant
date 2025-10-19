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
import { Plus, Trash2 } from 'lucide-react';
import { concreteMarksApi, materialsApi } from '../services/api';
import type { ConcreteMark, Material } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';

export const ConcreteMarksPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<ConcreteMark | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  
  const { data: concreteMarks, loading, refetch } = useApiData<ConcreteMark>({
    apiCall: () => concreteMarksApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });
  
  const { data: materials, loading: materialsLoading } = useApiData<Material>({
    apiCall: () => materialsApi.getAll()
  });

  // Логируем загрузку материалов для диагностики
  React.useEffect(() => {
    console.log('🔄 Статус загрузки материалов:', { materialsLoading, materials });
    if (materials && materials.length === 0) {
      console.log('⚠️ В базе данных нет материалов!');
    }
  }, [materialsLoading, materials]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    materials: [] as Array<{ materialId: number; quantityPerM3: number; unit: string }>,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Список единиц измерения
  const unitOptions = [
    { value: 'кг', label: 'кг' },
    { value: 'л', label: 'л' },
    { value: 'м³', label: 'м³' },
    { value: 'т', label: 'т' },
    { value: 'шт', label: 'шт' },
  ];

  const columns: Column<ConcreteMark>[] = [
    { id: 'name', label: 'Марка бетона', minWidth: 200 },
    { id: 'description', label: 'Описание', minWidth: 250 },
    { 
      id: 'materials', 
      label: 'Материалы', 
      minWidth: 200,
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {value?.slice(0, 3).map((material: any, index: number) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {material.material?.name} - {material.quantityPerM3} {material.unit}
            </span>
          ))}
          {value?.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{value.length - 3} еще
            </span>
          )}
        </div>
      )
    },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название марки обязательно';
    }

    if (formData.materials.length === 0) {
      errors.materials = 'Добавьте хотя бы один материал';
    }

    // Validate material quantities
    for (let i = 0; i < formData.materials.length; i++) {
      const material = formData.materials[i];
      if (!material.materialId) {
        errors[`material_${i}`] = 'Выберите материал';
      }
      if (!material.quantityPerM3 || material.quantityPerM3 <= 0) {
        errors[`quantity_${i}`] = 'Количество должно быть больше 0';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Шаг 1: Создаем марку бетона (только name и description)
      const concreteMarkData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      console.log('Отправляем данные марки бетона:', concreteMarkData);
      console.log('Исходные данные формы:', formData);

      let concreteMarkResponse;
      if (editingMark) {
        concreteMarkResponse = await concreteMarksApi.update(editingMark.id, concreteMarkData);
        success('Марка бетона обновлена');
      } else {
        concreteMarkResponse = await concreteMarksApi.create(concreteMarkData);
        success('Марка бетона создана');
      }

      const concreteMark = concreteMarkResponse.data;

      // Шаг 2: Обрабатываем материалы к марке бетона
      console.log('📦 Обрабатываем материалы марки бетона:', formData.materials);
      console.log('🔄 Режим редактирования:', !!editingMark);
      
      // Получаем существующие материалы марки бетона (только при редактировании)
      let existingMaterials: any[] = [];
      if (editingMark && editingMark.materials) {
        existingMaterials = editingMark.materials;
        console.log('📋 Существующие материалы марки:', existingMaterials);
        
        // Удаляем материалы, которые были удалены из формы
        const currentMaterialIds = formData.materials.map(m => parseInt(m.materialId.toString()));
        const materialsToDelete = existingMaterials.filter(
          existing => !currentMaterialIds.includes(existing.materialId)
        );
        
        console.log('🗑️ Материалы для удаления:', materialsToDelete);
        
        for (const materialToDelete of materialsToDelete) {
          try {
            await concreteMarksApi.removeMaterial(concreteMark.id, materialToDelete.materialId);
            console.log('✅ Материал удален:', materialToDelete.materialId);
          } catch (deleteErr: any) {
            console.error('❌ Ошибка при удалении материала:', deleteErr);
            error(`Ошибка при удалении материала: ${deleteErr.response?.data?.message || deleteErr.message}`);
          }
        }
      }
      
      // Добавляем/обновляем материалы из формы
      if (formData.materials.length > 0) {
        
        for (const material of formData.materials) {
          if (material.materialId && material.materialId > 0) {
            const materialData = {
              materialId: parseInt(material.materialId.toString()),
              quantityPerM3: parseFloat(material.quantityPerM3.toString()),
              unit: material.unit,
            };
            
            console.log('📦 Обрабатываем материал:', materialData);
            
            // Проверяем, существует ли уже этот материал в марке бетона
            const existingMaterial = existingMaterials.find(
              existing => existing.materialId === materialData.materialId
            );
            
            try {
              if (existingMaterial) {
                // Обновляем существующий материал
                console.log('🔄 Обновляем существующий материал');
                await concreteMarksApi.updateMaterial(
                  concreteMark.id, 
                  materialData.materialId, 
                  {
                    quantityPerM3: materialData.quantityPerM3,
                    unit: materialData.unit
                  }
                );
                console.log('✅ Материал успешно обновлен');
              } else {
                // Добавляем новый материал
                console.log('➕ Добавляем новый материал');
                await concreteMarksApi.addMaterial(concreteMark.id, materialData);
                console.log('✅ Материал успешно добавлен');
              }
            } catch (materialErr: any) {
              console.error('❌ Ошибка при обработке материала:', materialErr);
              console.error('📋 Детали ошибки материала:', {
                status: materialErr.response?.status,
                data: materialErr.response?.data,
                message: materialErr.response?.data?.message,
                errors: materialErr.response?.data?.errors
              });
              console.error('🔍 Полный ответ сервера для материала:', JSON.stringify(materialErr.response?.data, null, 2));
              error(`Ошибка при обработке материала: ${materialErr.response?.data?.message || materialErr.message}`);
            }
          }
        }
      }

      resetForm();
      refetch();
    } catch (err: any) {
      console.error('❌ Ошибка при создании марки бетона:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка при сохранении';
      error(errorMessage);
    }
  };

  const handleEdit = (mark: ConcreteMark) => {
    setEditingMark(mark);
    setFormData({
      name: mark.name,
      description: mark.description || '',
      materials: mark.materials?.map(m => ({
        materialId: parseInt(m.materialId.toString()),
        quantityPerM3: parseFloat(m.quantityPerM3.toString()),
        unit: m.unit,
      })) || [],
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await concreteMarksApi.delete(deleteId);
      success('Марка бетона удалена');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      // Закрываем диалог, чтобы показать сообщение об ошибке
      setConfirmOpen(false);
      setDeleteId(null);
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { materialId: 0, quantityPerM3: 0, unit: 'кг' }],
    });
  };

  const removeMaterial = (index: number) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== index),
    });
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    const newMaterials = [...formData.materials];
    let processedValue = value;
    
    // Преобразуем строки в числа для числовых полей
    if (field === 'materialId') {
      processedValue = parseInt(value.toString()) || 0;
    } else if (field === 'quantityPerM3') {
      processedValue = parseFloat(value.toString()) || 0;
    }
    
    newMaterials[index] = { ...newMaterials[index], [field]: processedValue };
    setFormData({ ...formData, materials: newMaterials });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      materials: [],
    });
    setFormErrors({});
    setEditingMark(null);
    setModalOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Марки бетона</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск марок бетона..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={concreteMarks}
          columns={columns}
          loading={loading}
          searchable={false}
          onEdit={handleEdit}
          onDelete={(mark) => {
            setDeleteId(mark.id);
            setConfirmOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : concreteMarks && concreteMarks.length > 0 ? (
            concreteMarks.map((mark) => (
              <EntityCard
                key={mark.id}
                title={mark.name}
                subtitle={mark.description}
                fields={[
                  { 
                    label: 'Материалы', 
                    value: mark.materials?.length ? `${mark.materials.length} материалов` : 'Нет материалов',
                    fullWidth: true 
                  }
                ]}
                onEdit={() => handleEdit(mark)}
                onDelete={() => {
                  setDeleteId(mark.id);
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingMark ? 'Редактировать марку бетона' : 'Добавить марку бетона'}
            </DialogTitle>
          
            <DialogDescription>
              Внесите изменения в данные
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название марки *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название марки бетона"
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Введите описание"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Состав материалов *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMaterial}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Добавить материал
                </Button>
              </div>

              {formErrors.materials && (
                <p className="text-red-500 text-sm mb-2">{formErrors.materials}</p>
              )}

              <div className="space-y-3">
                {formData.materials.map((material, index) => (
                  <div key={index} className="flex gap-3 items-end p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label>Материал *</Label>
                      <Select
                        value={material.materialId.toString()}
                        onValueChange={(value) => updateMaterial(index, 'materialId', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите материал" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials?.map((mat) => (
                            <SelectItem key={mat.id} value={mat.id.toString()}>
                              {mat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors[`material_${index}`] && (
                        <p className="text-red-500 text-sm mt-1">{formErrors[`material_${index}`]}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Label>Количество на м³ *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={material.quantityPerM3}
                        onChange={(e) => updateMaterial(index, 'quantityPerM3', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      {formErrors[`quantity_${index}`] && (
                        <p className="text-red-500 text-sm mt-1">{formErrors[`quantity_${index}`]}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Label>Единица измерения</Label>
                      <Select
                        value={material.unit}
                        onValueChange={(value) => updateMaterial(index, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите единицу" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMaterial(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="bg-gray-800 hover:bg-gray-900">
              {editingMark ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить эту марку бетона? Это действие нельзя отменить.
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
