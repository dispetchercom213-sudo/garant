import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Box, CircularProgress } from '@mui/material';
import { getStoredToken, getStoredUser } from '../utils/tokenUtils';

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

  // Безопасно проверяем токен и пользователя
  const token = getStoredToken();
  const storedUser = getStoredUser();
  
  console.log('🔒 ProtectedRoute проверка:', {
    token: token ? 'есть' : 'нет',
    user: storedUser ? 'есть' : 'нет',
    isAuthenticated,
    storeUser: user ? `${user.username} (${user.role})` : 'нет',
    isLoading,
    path: location.pathname
  });
  
  // Если нет валидного токена или пользователя - редирект
  if (!token || !storedUser) {
    console.log('❌ Нет валидного токена или пользователя, редирект на логин');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если store еще загружается - показываем загрузку
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

  // Если токен валидный, но store не инициализирован - используем данные из localStorage
  const currentUser = user || storedUser;
  if (!currentUser) {
    console.log('❌ Нет пользователя в store и localStorage, редирект на логин');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Проверяем роли, если требуется
  if (requiredRoles.length > 0 && !requiredRoles.includes(currentUser.role)) {
    console.log(`❌ Недостаточно прав. Требуется: ${requiredRoles.join(', ')}, есть: ${currentUser.role}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};