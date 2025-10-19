import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  // Проверяем токен напрямую из localStorage
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  console.log('🔒 ProtectedRoute проверка:', {
    token: token ? 'есть' : 'нет',
    userStr: userStr ? 'есть' : 'нет',
    isAuthenticated,
    user: user ? `${user.username} (${user.role})` : 'нет',
    isLoading,
    path: location.pathname
  });
  
  // Если нет токена или пользователя в localStorage - сразу редирект
  if (!token || !userStr) {
    console.log('❌ Нет токена или пользователя, редирект на логин');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если есть токен, но store еще загружается - показываем загрузку
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Если токен есть, но store не инициализирован - инициализируем
  if (token && userStr && (!isAuthenticated || !user)) {
    try {
      JSON.parse(userStr); // Проверяем валидность JSON
      // Если пользователь в localStorage валидный, но store не синхронизирован
      // Это может произойти при обновлении страницы
      return <>{children}</>;
    } catch (error) {
      // Невалидные данные - очищаем и редиректим
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  // Проверяем роли, если требуется
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};