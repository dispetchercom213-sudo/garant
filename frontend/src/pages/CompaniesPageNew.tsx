import React, { useState } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { companiesApi } from '../services/api';
import type { Company } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { cleanFormData } from '../utils/dataUtils';

export const CompaniesPageNew: React.FC = () => {
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

  const columns: Column<Company>[] = [
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

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      bin: company.bin || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      director: company.director || '',
      bankName: company.bankName || '',
      iik: company.iik || '',
      bik: company.bik || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleDelete = (company: Company) => {
    setDeleteId(company.id);
    setConfirmOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название обязательно';
    }
    if (!formData.bin.trim()) {
      errors.bin = 'БИН обязателен';
    }
    if (!formData.address.trim()) {
      errors.address = 'Адрес обязателен';
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Компании</h1>
          <p className="text-gray-600">Управление компаниями</p>
        </div>
      </div>

      {/* Таблица с данными */}
      <DataTable
        data={companies}
        columns={columns}
        loading={loading}
        searchable={true}
        searchFields={['name', 'bin', 'address', 'phone']}
        searchPlaceholder="Поиск компаний..."
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonText="Добавить компанию"
      />

      {/* Модальное окно для создания/редактирования */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Редактировать компанию' : 'Добавить компанию'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany ? 'Внесите изменения в данные компании' : 'Заполните форму для создания новой компании'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bin">БИН *</Label>
                <Input
                  id="bin"
                  value={formData.bin}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                  className={formErrors.bin ? 'border-red-500' : ''}
                />
                {formErrors.bin && (
                  <p className="text-sm text-red-500">{formErrors.bin}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Адрес *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={formErrors.address ? 'border-red-500' : ''}
                />
                {formErrors.address && (
                  <p className="text-sm text-red-500">{formErrors.address}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={formErrors.phone ? 'border-red-500' : ''}
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-500">{formErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="director">Директор</Label>
                <Input
                  id="director"
                  value={formData.director}
                  onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Название банка</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iik">ИИК</Label>
                <Input
                  id="iik"
                  value={formData.iik}
                  onChange={(e) => setFormData({ ...formData, iik: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bik">БИК</Label>
                <Input
                  id="bik"
                  value={formData.bik}
                  onChange={(e) => setFormData({ ...formData, bik: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              {editingCompany ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить эту компанию? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

