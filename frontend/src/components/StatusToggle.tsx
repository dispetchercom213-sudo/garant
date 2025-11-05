import React, { useState } from 'react';
import { Button } from './ui/button';
import { Circle, Coffee } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { usersApi } from '../services/api';
import { AvailabilityStatus } from '../types';

export const StatusToggle: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { success, error } = useNotifications();
  const [updating, setUpdating] = useState(false);

  if (!user || user.role !== 'DRIVER') {
    return null;
  }

  const currentStatus = user.availabilityStatus || AvailabilityStatus.ONLINE;
  const isOnline = currentStatus === AvailabilityStatus.ONLINE;

  const handleToggle = async () => {
    if (!user || updating) return;

    try {
      setUpdating(true);
      const newStatus = isOnline ? AvailabilityStatus.BREAK : AvailabilityStatus.ONLINE;

      await usersApi.update(user.id, {
        availabilityStatus: newStatus,
      });

      updateUser({
        availabilityStatus: newStatus,
      });

      success(isOnline ? 'Статус изменен: Отдыхаю' : 'Статус изменен: На работе');
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при изменении статуса');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={updating}
      variant="outline"
      size="sm"
      className={`flex items-center gap-2 transition-all font-medium ${
        isOnline
          ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400'
          : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400'
      } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isOnline ? (
        <>
          <Circle className="h-3 w-3 fill-green-500 text-green-500" />
          <span className="hidden sm:inline">На работе</span>
          <span className="sm:hidden">Работа</span>
        </>
      ) : (
        <>
          <Coffee className="h-3 w-3 text-orange-500" />
          <span className="hidden sm:inline">Отдыхаю</span>
          <span className="sm:hidden">Отдых</span>
        </>
      )}
    </Button>
  );
};

