import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { useAuthStore } from '../stores/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { usersApi } from '../services/api';
import { UserCircle, Lock, Mail, Phone } from 'lucide-react';

const roleLabels: Record<string, string> = {
  DEVELOPER: 'Разработчик',
  ADMIN: 'Администратор',
  DIRECTOR: 'Директор',
  ACCOUNTANT: 'Бухгалтер',
  MANAGER: 'Менеджер',
  DISPATCHER: 'Диспетчер',
  SUPPLIER: 'Поставщик',
  OPERATOR: 'Оператор',
  DRIVER: 'Водитель',
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { success, error } = useNotifications();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const handleOpenProfileModal = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setProfileErrors({});
    setProfileModalOpen(true);
  };

  const handleOpenPasswordModal = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({});
    setPasswordModalOpen(true);
  };

  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.firstName?.trim()) {
      errors.firstName = 'Имя обязательно';
    }

    if (!profileData.lastName?.trim()) {
      errors.lastName = 'Фамилия обязательна';
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Некорректный email';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Введите текущий пароль';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'Введите новый пароль';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Пароль должен быть не менее 6 символов';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Подтвердите новый пароль';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateProfileForm() || !user) return;

    try {
      await usersApi.update(user.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email || undefined,
        phone: profileData.phone || undefined,
      });

      // Обновляем данные в store (автоматически обновится localStorage)
      updateUser({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
      });
      
      success('Профиль успешно обновлен. Изменения применятся к новым накладным.');
      setProfileModalOpen(false);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при обновлении профиля');
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm() || !user) return;

    try {
      await usersApi.update(user.id, {
        password: passwordData.newPassword,
      });

      success('Пароль успешно изменен');
      setPasswordModalOpen(false);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при изменении пароля');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Личный кабинет</h1>

      <div className="grid gap-6">
        {/* Основная информация */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Основная информация
            </h2>
            <Button onClick={handleOpenProfileModal} variant="outline">
              Редактировать
            </Button>
          </div>

          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="w-32 text-sm text-gray-600">ФИО:</div>
              <div className="font-medium">
                {user.firstName || user.lastName 
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : 'Не указано'}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-32 text-sm text-gray-600">Логин:</div>
              <div className="font-medium">{user.username}</div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-32 text-sm text-gray-600">
                <Mail className="h-4 w-4 inline mr-1" />
                Email:
              </div>
              <div className="font-medium">{user.email || 'Не указано'}</div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-32 text-sm text-gray-600">
                <Phone className="h-4 w-4 inline mr-1" />
                Телефон:
              </div>
              <div className="font-medium">{user.phone || 'Не указано'}</div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-32 text-sm text-gray-600">Роль:</div>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            </div>

            {user.currentRole && user.currentRole !== user.role && (
              <div className="flex items-start gap-3">
                <div className="w-32 text-sm text-gray-600">Текущая роль:</div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {roleLabels[user.currentRole] || user.currentRole}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Безопасность */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Безопасность
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Регулярно меняйте пароль для обеспечения безопасности вашей учетной записи
              </p>
              <Button onClick={handleOpenPasswordModal}>
                Изменить пароль
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Модальное окно редактирования профиля */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать профиль</DialogTitle>
            <DialogDescription>
              Внесите изменения в свои личные данные
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                placeholder="Введите имя"
              />
              {profileErrors.firstName && (
                <p className="text-red-500 text-sm mt-1">{profileErrors.firstName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                placeholder="Введите фамилию"
              />
              {profileErrors.lastName && (
                <p className="text-red-500 text-sm mt-1">{profileErrors.lastName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="email@example.com"
              />
              {profileErrors.email && (
                <p className="text-red-500 text-sm mt-1">{profileErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+7 (___) ___-__-__"
              />
              {profileErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{profileErrors.phone}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateProfile} className="bg-gray-800 hover:bg-gray-900">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно изменения пароля */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить пароль</DialogTitle>
            <DialogDescription>
              Введите текущий пароль и новый пароль
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Текущий пароль *</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Введите текущий пароль"
              />
              {passwordErrors.currentPassword && (
                <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newPassword">Новый пароль *</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Введите новый пароль (мин. 6 символов)"
              />
              {passwordErrors.newPassword && (
                <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтвердите новый пароль *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Повторите новый пароль"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleChangePassword} className="bg-gray-800 hover:bg-gray-900">
              Изменить пароль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};




