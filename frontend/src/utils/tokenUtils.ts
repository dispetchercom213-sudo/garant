/**
 * Утилиты для безопасной работы с токенами и localStorage
 */

export interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  role?: string;
  [key: string]: any;
}

/**
 * Безопасно парсит JWT токен без выбрасывания ошибок
 */
export const parseToken = (token: string): TokenPayload | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.warn('Не удалось распарсить токен:', error);
    return null;
  }
};

/**
 * Проверяет валидность токена (не истек ли)
 */
export const isTokenValid = (token: string): boolean => {
  const payload = parseToken(token);
  if (!payload) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
};

/**
 * Проверяет, истекает ли токен в ближайшие 5 минут
 */
export const isTokenExpiringSoon = (token: string, minutes = 5): boolean => {
  const payload = parseToken(token);
  if (!payload) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  const timeUntilExpiry = expirationTime - now;
  
  return timeUntilExpiry < (minutes * 60) && timeUntilExpiry > 0;
};

/**
 * Безопасно получает токен из localStorage
 */
export const getStoredToken = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    return token && isTokenValid(token) ? token : null;
  } catch (error) {
    console.warn('Ошибка при получении токена:', error);
    return null;
  }
};

/**
 * Безопасно получает пользователя из localStorage
 */
export const getStoredUser = (): any | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return null;
    }

    const user = JSON.parse(userStr);
    
    // Базовая валидация структуры пользователя
    if (typeof user !== 'object' || !user.id || !user.username || !user.role) {
      console.warn('Невалидная структура пользователя в localStorage');
      return null;
    }

    return user;
  } catch (error) {
    console.warn('Ошибка при получении пользователя:', error);
    return null;
  }
};

/**
 * Безопасно очищает данные аутентификации
 */
export const clearAuthData = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('csrfToken');
  } catch (error) {
    console.warn('Ошибка при очистке данных аутентификации:', error);
  }
};

/**
 * Безопасно сохраняет данные аутентификации
 */
export const saveAuthData = (token: string, user: any): void => {
  try {
    if (!isTokenValid(token)) {
      throw new Error('Невалидный токен');
    }

    if (!user || typeof user !== 'object') {
      throw new Error('Невалидные данные пользователя');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Ошибка при сохранении данных аутентификации:', error);
    clearAuthData();
    throw error;
  }
};

/**
 * Получает время до истечения токена в минутах
 */
export const getTokenTimeToExpiry = (token: string): number => {
  const payload = parseToken(token);
  if (!payload) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;
  
  return Math.max(0, Math.floor(timeUntilExpiry / 60));
};
