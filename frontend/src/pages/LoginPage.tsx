import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = useState({
    login: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated, error, clearError, user } = useAuthStore();
  const location = useLocation();

  // Функция для определения стартовой страницы в зависимости от роли
  const getDefaultPageForRole = (role: UserRole): string => {
    switch (role) {
      case UserRole.DIRECTOR:
      case UserRole.ACCOUNTANT:
      case UserRole.DISPATCHER:
      case UserRole.OPERATOR:
      case UserRole.SUPPLIER:
      case UserRole.ADMIN:
      case UserRole.DEVELOPER:
        return '/dashboard';
      
      case UserRole.MANAGER:
        return '/orders';
      
      case UserRole.DRIVER:
        return '/my-invoices';
      
      default:
        return '/dashboard';
    }
  };

  const from = (location.state as any)?.from?.pathname || (user ? getDefaultPageForRole(user.role as UserRole) : '/dashboard');

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await login(credentials);
    } catch (error) {
      // Ошибка уже обработана в store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) clearError();
  };

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Paper
          elevation={1}
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 400,
          }}
        >
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            mb={3}
          >
            <LoginIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" gutterBottom>
              BetonAPP
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Система учёта бетонного завода
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Логин"
              name="login"
              value={credentials.login}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="username"
              autoFocus
            />
            
            <TextField
              fullWidth
              label="Пароль"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || !credentials.login || !credentials.password}
            >
              {isSubmitting ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};