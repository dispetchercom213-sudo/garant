import { create } from 'zustand';
import { authApi } from '../services/api';

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
      const response = await authApi.login(credentials);
      console.log('📡 Ответ от API логина:', response.data);
      
      const { access_token, user } = response.data;
      
      console.log('💾 Сохраняем в localStorage:', {
        token: access_token ? 'есть' : 'нет',
        user: user ? `${user.username} (${user.role})` : 'нет'
      });
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      console.log('✅ Логин успешен, store обновлен');
    } catch (error: any) {
      console.error('❌ Ошибка логина:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Ошибка входа в систему';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    console.log('🚪 Вызван logout - очищаем данные пользователя');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
        userId: currentUser.id, 
        currentUser,
        currentToken: localStorage.getItem('token')
      });
      
      const response = await authApi.switchRole(role, currentUser.id);
      console.log('📡 Ответ от API:', response.data);
      
      const { access_token, user } = response.data;
      
      // Обновляем localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('💾 Обновили localStorage:', {
        newToken: access_token,
        newUser: user
      });
      
      // Обновляем store
      set({
        user,
        token: access_token,
        isAuthenticated: true,
        error: null,
      });
      
      console.log('✅ Роль успешно переключена в store:', {
        user,
        token: access_token,
        isAuthenticated: true
      });
    } catch (error: any) {
      console.error('❌ Детали ошибки переключения роли:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Ошибка переключения роли';
      
      // В случае ошибки не логаутим пользователя, просто показываем ошибку
      set({ error: errorMessage });
      throw error;
    }
  },

  initialize: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    console.log('🚀 Инициализация authStore:', {
      token: token ? 'есть' : 'нет',
      userStr: userStr ? 'есть' : 'нет'
    });
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('✅ Успешная инициализация:', {
          user: `${user.username} (${user.role})`,
          token: token.substring(0, 20) + '...'
        });
        set({
          user,
          token,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('❌ Ошибка парсинга пользователя:', error);
        // Невалидные данные в localStorage, очищаем
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('❌ Нет токена или пользователя для инициализации');
    }
  },

  clearError: () => {
    set({ error: null });
  },

  updateUser: (updatedUser) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const newUser = { ...currentUser, ...updatedUser };
    
    // Обновляем localStorage
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Обновляем store
    set({ user: newUser });
    
    console.log('✅ Пользователь обновлен в store:', newUser);
  },
}));