import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: Notification['type'],
    message: string,
    duration = 5000
  ) => {
    const id = Date.now().toString();
    const notification: Notification = {
      id,
      type,
      message,
      duration,
    };

    setNotifications(prev => [...prev, notification]);

    // Автоматически удаляем уведомление через указанное время
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const success = useCallback((message: string) => {
    addNotification('success', message);
  }, [addNotification]);

  const error = useCallback((message: string) => {
    addNotification('error', message);
  }, [addNotification]);

  const warning = useCallback((message: string) => {
    addNotification('warning', message);
  }, [addNotification]);

  const info = useCallback((message: string) => {
    addNotification('info', message);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  };
};

