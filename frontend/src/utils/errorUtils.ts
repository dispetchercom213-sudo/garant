/**
 * Утилиты для обработки ошибок и retry логики
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Повторяем только для сетевых ошибок и 5xx ошибок
    return (
      !error.response || 
      (error.response.status >= 500 && error.response.status < 600)
    );
  }
};

/**
 * Выполняет функцию с retry логикой
 */
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Если это последняя попытка или ошибка не подходит для retry
      if (attempt === config.maxRetries || !config.retryCondition(error)) {
        throw error;
      }

      // Вычисляем задержку с экспоненциальным backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );

      console.warn(`Попытка ${attempt + 1} неудачна, повтор через ${delay}ms:`, (error as any)?.message || 'Unknown error');
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Обрабатывает ошибки API с детальными сообщениями
 */
export const handleApiError = (error: any): string => {
  if (!error) {
    return 'Неизвестная ошибка';
  }

  // Сетевая ошибка
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Ошибка сети. Проверьте подключение к интернету.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Превышено время ожидания запроса.';
    }
    return 'Ошибка сети. Попробуйте позже.';
  }

  // HTTP ошибки
  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 400:
      return data?.message || 'Некорректные данные запроса.';
    case 401:
      return 'Сессия истекла. Войдите в систему заново.';
    case 403:
      return 'Недостаточно прав для выполнения операции.';
    case 404:
      return 'Запрашиваемый ресурс не найден.';
    case 409:
      return data?.message || 'Конфликт данных.';
    case 422:
      return data?.message || 'Ошибка валидации данных.';
    case 429:
      return 'Слишком много запросов. Попробуйте позже.';
    case 500:
      return 'Внутренняя ошибка сервера.';
    case 502:
    case 503:
    case 504:
      return 'Сервер временно недоступен. Попробуйте позже.';
    default:
      return data?.message || `Ошибка сервера (${status}).`;
  }
};

/**
 * Проверяет, является ли ошибка связанной с аутентификацией
 * 401 - Unauthorized (токен истек или невалидный) - редирект на логин
 * 403 - Forbidden (недостаточно прав) - НЕ редиректим, это нормальная ошибка прав доступа
 */
export const isAuthError = (error: any): boolean => {
  return error?.response?.status === 401;
};

/**
 * Проверяет, является ли ошибка временной (можно повторить)
 */
export const isTemporaryError = (error: any): boolean => {
  if (!error.response) {
    return true; // Сетевые ошибки считаем временными
  }

  const status = error.response.status;
  return status >= 500 && status < 600;
};

/**
 * Логирует ошибку безопасно (без чувствительных данных)
 */
export const logError = (context: string, error: unknown): void => {
  const safeError = {
    message: (error as any)?.message || 'Unknown error',
    status: (error as any)?.response?.status,
    url: (error as any)?.config?.url,
    method: (error as any)?.config?.method,
    timestamp: new Date().toISOString()
  };

  console.error(`[${context}]`, safeError);
};

/**
 * Создает debounced функцию для предотвращения частых вызовов
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Создает throttled функцию для ограничения частоты вызовов
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
