import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DataTable, type Column } from '../components/ui/data-table';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import { usersApi } from '../services/api';
import { PageContainer } from '../components/PageContainer';
import type { User } from '../types';
import { UserRole, UserStatus } from '../types';

export const UsersPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { success, error } = useNotifications();

  const { data: users, loading, refetch } = useApiData<User>({
    apiCall: () => usersApi.getAll({ search: searchQuery }),
    dependencies: [searchQuery]
  });

  // Логирование данных пользователей для отладки
  React.useEffect(() => {
    if (users) {
      console.log('🔍 Данные пользователей:', users);
      users.forEach((user, index) => {
        console.log(`👤 Пользователь ${index + 1}:`, {
          id: user.id,
          login: user.login,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        });
      });
    }
  }, [users]);

  const [formData, setFormData] = useState({
    login: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: 'ADMIN' as UserRole,
    status: 'ACTIVE' as UserStatus,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Лейблы для ролей
  const roleLabels: Record<UserRole, string> = {
    [UserRole.DEVELOPER]: 'Разработчик',
    [UserRole.ADMIN]: 'Администратор',
    [UserRole.DIRECTOR]: 'Директор',
    [UserRole.ACCOUNTANT]: 'Бухгалтер',
    [UserRole.MANAGER]: 'Менеджер',
    [UserRole.DISPATCHER]: 'Диспетчер',
    [UserRole.SUPPLIER]: 'Поставщик',
    [UserRole.OPERATOR]: 'Оператор',
    [UserRole.DRIVER]: 'Водитель',
  };

  // Лейблы для статусов
  const statusLabels: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'Активный',
    [UserStatus.INACTIVE]: 'Неактивный',
    [UserStatus.BLOCKED]: 'Заблокирован',
  };

  const columns: Column<User>[] = [
    { id: 'login', label: 'Логин', minWidth: 120 },
    { 
      id: 'firstName', 
      label: 'ФИО', 
      minWidth: 200,
      render: (_value: any, row: User) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || '-'
    },
    { id: 'phone', label: 'Телефон', minWidth: 120 },
    { id: 'email', label: 'Email', minWidth: 150 },
    { 
      id: 'role', 
      label: 'Роль', 
      minWidth: 120,
      render: (value: UserRole) => roleLabels[value] || value
    },
    { 
      id: 'status', 
      label: 'Статус', 
      minWidth: 120,
      render: (value: UserStatus) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === UserStatus.ACTIVE 
            ? 'bg-green-100 text-green-800' 
            : value === UserStatus.INACTIVE
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {statusLabels[value] || value}
        </span>
      )
    },
    { id: 'createdAt', label: 'Создан', minWidth: 120, render: (value: string) => new Date(value).toLocaleDateString() },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.login.trim()) {
      errors.login = 'Логин обязателен';
    }

    if (!formData.password.trim() && !editingUser) {
      errors.password = 'Пароль обязателен';
    }

    if (!formData.role) {
      errors.role = 'Роль обязательна';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data = {
        login: formData.login.trim(),
        password: formData.password.trim(),
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        role: formData.role,
        status: formData.status,
      };

      console.log('📤 Отправляем данные пользователя:', data);

      if (editingUser) {
        await usersApi.update(editingUser.id, data);
        success('Пользователь обновлен');
      } else {
        await usersApi.create(data);
        success('Пользователь создан');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      console.error('❌ Ошибка при сохранении пользователя:', err);
      error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      login: user.login,
      password: '', // Не заполняем пароль при редактировании
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      status: user.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await usersApi.delete(deleteId);
      success('Пользователь удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      login: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'ADMIN' as UserRole,
      status: 'ACTIVE' as UserStatus,
    });
    setFormErrors({});
    setEditingUser(null);
    setModalOpen(false);
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={() => setModalOpen(true)} className="flex-1 sm:flex-initial">
            <span className="sm:inline">Создать</span>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск по логину, имени, телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={users || []}
          columns={columns}
          loading={loading}
          searchable={false}
          onEdit={handleEdit}
          onDelete={(user) => {
            setDeleteId(user.id);
            setConfirmOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : users && users.length > 0 ? (
            users.map((user) => (
              <EntityCard
                key={user.id}
                title={`${user.firstName || ''} ${user.lastName || ''}`}
                subtitle={user.login}
                badge={{
                  label: roleLabels[user.role] || user.role,
                  variant: user.status === 'ACTIVE' ? 'default' : 'secondary'
                }}
                fields={[
                  { label: 'Телефон', value: user.phone || '-' },
                  { label: 'Email', value: user.email || '-' },
                  { label: 'Статус', value: statusLabels[user.status] || user.status }
                ]}
                onEdit={() => handleEdit(user)}
                onDelete={() => {
                  setDeleteId(user.id);
                  setConfirmOpen(true);
                }}
              />
            ))
          ) : (
            <p className="col-span-full text-center py-8 text-gray-500">Нет данных</p>
          )}
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Внесите изменения в данные пользователя' : 'Заполните форму для создания нового пользователя'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="login">Логин *</Label>
              <Input
                id="login"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                placeholder="Введите логин"
              />
              {formErrors.login && (
                <p className="text-red-500 text-sm mt-1">{formErrors.login}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">
                Пароль {!editingUser && '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "Оставьте пустым, чтобы не изменять" : "Введите пароль"}
              />
              {formErrors.password && (
                <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Введите имя"
                />
              </div>

              <div>
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Введите фамилию"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Введите телефон"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Введите email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Роль *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.role && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.role}</p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно подтверждения удаления */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
