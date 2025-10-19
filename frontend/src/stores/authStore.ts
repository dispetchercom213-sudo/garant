import { create } from 'zustand';
import { authApi, apiRequest } from '../services/api';
import { 
  getStoredToken, 
  getStoredUser, 
  saveAuthData, 
  clearAuthData, 
  isTokenValid,
  isTokenExpiringSoon,
  getTokenTimeToExpiry
} from '../utils/tokenUtils';
import { handleApiError, logError } from '../utils/errorUtils';

interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  currentRole?: string;
  email?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { login: string; password: string }) => Promise<void>;
  logout: () => void;
  switchRole: (role: string) => Promise<void>;
  initialize: () => void;
  clearError: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    console.log('🔐 Начинаем логин с данными:', { login: credentials.login });
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiRequest(() => authApi.login(credentials));
      
      const { access_token, user } = response;
      
      // Безопасно сохраняем данные
      saveAuthData(access_token, user);
      
      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      console.log('✅ Логин успешен, store обновлен');
    } catch (error: any) {
      logError('Login', error);
      const errorMessage = handleApiError(error);
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    console.log('🚪 Вызван logout - очищаем данные пользователя');
    clearAuthData();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  switchRole: async (role) => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        throw new Error('Пользователь не найден');
      }
      
      console.log('🔄 Начинаем переключение роли:', { 
        role, 
        userId: currentUser.id
      });
      
      const response = await apiRequest(() => authApi.switchRole(role, currentUser.id));
      
      const { access_token, user } = response;
      
      // Безопасно обновляем данные
      saveAuthData(access_token, user);
      
      // Обновляем store
      set({
        user,
        token: access_token,
        isAuthenticated: true,
        error: null,
      });
      
      console.log('✅ Роль успешно переключена');
    } catch (error: any) {
      logError('Switch Role', error);
      const errorMessage = handleApiError(error);
      
      // В случае ошибки не логаутим пользователя, просто показываем ошибку
      set({ error: errorMessage });
      throw error;
    }
  },

  initialize: () => {
    const token = getStoredToken();
    const user = getStoredUser();
    
    console.log('🚀 Инициализация authStore:', {
      token: token ? 'есть' : 'нет',
      user: user ? 'есть' : 'нет'
    });
    
    if (token && user) {
      // Проверяем, не истекает ли токен скоро
      if (isTokenExpiringSoon(token, 5)) {
        const timeToExpiry = getTokenTimeToExpiry(token);
        console.warn(`⚠️ Токен истекает через ${timeToExpiry} минут`);
      }
      
      console.log('✅ Успешная инициализация:', {
        user: `${user.username} (${user.role})`,
        tokenValid: isTokenValid(token)
      });
      
      set({
        user,
        token,
        isAuthenticated: true,
      });
    } else {
      console.log('❌ Нет валидного токена или пользователя для инициализации');
      // Очищаем невалидные данные
      clearAuthData();
    }
  },

  clearError: () => {
    set({ error: null });
  },

  updateUser: (updatedUser) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const newUser = { ...currentUser, ...updatedUser };
    
    // Безопасно обновляем данные
    try {
      const token = getStoredToken();
      if (token) {
        saveAuthData(token, newUser);
      }
      
      // Обновляем store
      set({ user: newUser });
      
      console.log('✅ Пользователь обновлен в store');
    } catch (error) {
      logError('Update User', error);
      console.error('❌ Ошибка при обновлении пользователя:', error);
    }
  },
}));