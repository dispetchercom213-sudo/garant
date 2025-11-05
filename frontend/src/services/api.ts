import axios, { type AxiosResponse } from 'axios';
import { getStoredToken, clearAuthData } from '../utils/tokenUtils';
import { handleApiError, isAuthError, logError, retryRequest, type RetryOptions } from '../utils/errorUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 секунд таймаут
});

// Интерцептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Добавляем CSRF токен если есть
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    logError('Request Interceptor', error);
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ответов
api.interceptors.response.use(
  (response) => {
    // Сохраняем CSRF токен если он пришел в ответе
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken);
    }
    
    return response;
  },
  (error) => {
    logError('Response Interceptor', error);
    
    if (isAuthError(error)) {
      // Проверяем, не это ли запрос смены роли
      if (error.config?.url?.includes('/auth/switch-role')) {
        console.warn('⚠️ 401 ошибка при смене роли - НЕ очищаем localStorage');
        // Не очищаем localStorage при ошибке смены роли
      } else {
        console.warn('🚪 Токен истек - очищаем localStorage и перенаправляем на логин');
        clearAuthData();
        
        // Плавный редирект вместо принудительного
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Выполняет API запрос с retry логикой
 */
export const apiRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  retryOptions?: RetryOptions
): Promise<T> => {
  try {
    const response = await retryRequest(requestFn, retryOptions);
    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    throw new Error(errorMessage);
  }
};

// API методы для аутентификации
export const authApi = {
  login: (credentials: { login: string; password: string }) =>
    api.post('/auth/login', { username: credentials.login, password: credentials.password }),
  switchRole: (role: string, userId?: number) =>
    api.post('/auth/switch-role', { role, userId }),
  getRoles: () =>
    api.get('/auth/roles'),
};

// API методы для пользователей
export const usersApi = {
  getAll: (params?: any) =>
    api.get('/users', { params }),
  getById: (id: number) =>
    api.get(`/users/${id}`),
  create: (data: any) =>
    api.post('/users', data),
  update: (id: number, data: any) =>
    api.patch(`/users/${id}`, data),
  delete: (id: number) =>
    api.delete(`/users/${id}`),
};

// API методы для компаний
export const companiesApi = {
  getAll: (params?: any) =>
    api.get('/companies', { params }),
  getById: (id: number) =>
    api.get(`/companies/${id}`),
  getStats: () =>
    api.get('/companies/stats'),
  create: (data: any) =>
    api.post('/companies', data),
  update: (id: number, data: any) =>
    api.patch(`/companies/${id}`, data),
  delete: (id: number) =>
    api.delete(`/companies/${id}`),
};

// API методы для контрагентов
export const counterpartiesApi = {
  getAll: (params?: any) =>
    api.get('/counterparties', { params }),
  getById: (id: number) =>
    api.get(`/counterparties/${id}`),
  getStats: () =>
    api.get('/counterparties/stats'),
  create: (data: any) =>
    api.post('/counterparties', data),
  update: (id: number, data: any) =>
    api.patch(`/counterparties/${id}`, data),
  delete: (id: number) =>
    api.delete(`/counterparties/${id}`),
};

// API методы для складов
export const warehousesApi = {
  getAll: (params?: any) =>
    api.get('/warehouses', { params }),
  getById: (id: number) =>
    api.get(`/warehouses/${id}`),
  getStats: () =>
    api.get('/warehouses/stats'),
  getMaterialBalances: (id: number) =>
    api.get(`/warehouses/${id}/balances`),
  getAllMaterialBalances: (params?: any) =>
    api.get('/warehouses/materials/balances', { params }),
  create: (data: any) =>
    api.post('/warehouses', data),
  update: (id: number, data: any) =>
    api.patch(`/warehouses/${id}`, data),
  delete: (id: number) =>
    api.delete(`/warehouses/${id}`),
};

// API методы для материалов
export const materialsApi = {
  getAll: (params?: any) =>
    api.get('/materials', { params }),
  getById: (id: number) =>
    api.get(`/materials/${id}`),
  getStats: () =>
    api.get('/materials/stats'),
  getTypes: () =>
    api.get('/materials/types'),
  getByType: (type: string) =>
    api.get(`/materials/by-type/${type}`),
  create: (data: any) =>
    api.post('/materials', data),
  update: (id: number, data: any) =>
    api.patch(`/materials/${id}`, data),
  delete: (id: number) =>
    api.delete(`/materials/${id}`),
};

// API методы для марок бетона
export const concreteMarksApi = {
  getAll: (params?: any) =>
    api.get('/concrete-marks', { params }),
  getById: (id: number) =>
    api.get(`/concrete-marks/${id}`),
  getStats: () =>
    api.get('/concrete-marks/stats'),
  create: (data: any) =>
    api.post('/concrete-marks', data),
  update: (id: number, data: any) =>
    api.patch(`/concrete-marks/${id}`, data),
  delete: (id: number) =>
    api.delete(`/concrete-marks/${id}`),
  addMaterial: (id: number, data: any) =>
    api.post(`/concrete-marks/${id}/materials`, data),
  updateMaterial: (id: number, materialId: number, data: any) =>
    api.patch(`/concrete-marks/${id}/materials/${materialId}`, data),
  removeMaterial: (id: number, materialId: number) =>
    api.delete(`/concrete-marks/${id}/materials/${materialId}`),
  calculateComposition: (id: number, quantityM3: number) =>
    api.get(`/concrete-marks/${id}/calculate?quantityM3=${quantityM3}`),
};

// API методы для водителей
export const driversApi = {
  getAll: (params?: any) =>
    api.get('/drivers', { params }),
  getById: (id: number) =>
    api.get(`/drivers/${id}`),
  getMe: () =>
    api.get('/drivers/me'),
  getStats: () =>
    api.get('/drivers/stats'),
  getAvailable: () =>
    api.get('/drivers/available'),
  getPerformance: (id: number) =>
    api.get(`/drivers/${id}/performance`),
  create: (data: any) =>
    api.post('/drivers', data),
  update: (id: number, data: any) =>
    api.patch(`/drivers/${id}`, data),
  delete: (id: number) =>
    api.delete(`/drivers/${id}`),
};

// API методы для транспорта
export const vehiclesApi = {
  getAll: (params?: any) =>
    api.get('/vehicles', { params }),
  getMy: (params?: any) =>
    api.get('/vehicles/my', { params }),
  getById: (id: number) =>
    api.get(`/vehicles/${id}`),
  getStats: () =>
    api.get('/vehicles/stats'),
  getAvailable: () =>
    api.get('/vehicles/available'),
  create: (data: any) =>
    api.post('/vehicles', data),
  update: (id: number, data: any) =>
    api.patch(`/vehicles/${id}`, data),
  delete: (id: number) =>
    api.delete(`/vehicles/${id}`),
};

// API методы для заказов
export const ordersApi = {
  getAll: (params?: any) =>
    api.get('/orders', { params }),
  getMy: (params?: any) =>
    api.get('/orders/my', { params }),
  getById: (id: number) =>
    api.get(`/orders/${id}`),
  getStats: () =>
    api.get('/orders/stats'),
  getPending: () =>
    api.get('/orders/pending'),
  getByCustomer: (customerId: number) =>
    api.get(`/orders/customer/${customerId}`),
  create: (data: any) =>
    api.post('/orders', data),
  update: (id: number, data: any) =>
    api.patch(`/orders/${id}`, data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  delete: (id: number) =>
    api.delete(`/orders/${id}`),
  getMaterials: (id: number) =>
    api.get(`/orders/${id}/materials`),
  // Новые методы для workflow изменений
  proposeChanges: (id: number, data: any) =>
    api.patch(`/orders/${id}/propose-changes`, data),
  acceptChanges: (id: number) =>
    api.patch(`/orders/${id}/accept-changes`, {}),
  rejectChanges: (id: number) =>
    api.patch(`/orders/${id}/reject-changes`, {}),
  // Методы для запроса на удаление
  requestDeletion: (id: number, reason: string) =>
    api.patch(`/orders/${id}/request-deletion`, { reason }),
  approveDeletion: (id: number) =>
    api.patch(`/orders/${id}/approve-deletion`, {}),
  rejectDeletion: (id: number) =>
    api.patch(`/orders/${id}/reject-deletion`, {}),
};

// API методы для накладных
export const invoicesApi = {
  getAll: (params?: any) =>
    api.get('/invoices', { params }),
  getMy: (params?: any) =>
    api.get('/invoices/my', { params }),
  getById: (id: number) =>
    api.get(`/invoices/${id}`),
  getStats: () =>
    api.get('/invoices/stats'),
  getByDriver: (driverId: number) =>
    api.get(`/invoices/driver/${driverId}`),
  create: (data: any) =>
    api.post('/invoices', data),
  update: (id: number, data: any) =>
    api.patch(`/invoices/${id}`, data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/invoices/${id}/status`, { status }),
  delete: (id: number) =>
    api.delete(`/invoices/${id}`),
  addItem: (id: number, data: any) =>
    api.post(`/invoices/${id}/items`, data),
  updateItem: (id: number, itemId: number, data: any) =>
    api.patch(`/invoices/${id}/items/${itemId}`, data),
  removeItem: (id: number, itemId: number) =>
    api.delete(`/invoices/${id}/items/${itemId}`),
  processWarehouse: (id: number) =>
    api.post(`/invoices/${id}/process-warehouse`),
  // Методы для отслеживания маршрута водителя
  getMyActive: () =>
    api.get('/invoices/my-active'),
  accept: (id: number) =>
    api.post(`/invoices/${id}/accept`),
  markArrivedAtSite: (id: number, latitude?: number, longitude?: number) =>
    api.post(`/invoices/${id}/arrived-at-site`, { latitude, longitude }),
  markDepartedFromSite: (id: number, latitude?: number, longitude?: number) =>
    api.post(`/invoices/${id}/departed-from-site`, { latitude, longitude }),
  markArrivedAtPlant: (id: number, latitude?: number, longitude?: number) =>
    api.post(`/invoices/${id}/arrived-at-plant`, { latitude, longitude }),
  // Методы для менеджера
  getMyVehiclesForMap: () =>
    api.get('/invoices/my-vehicles-map'),
  getAllVehiclesForMap: () =>
    api.get('/invoices/all-vehicles-map'),
};

// API методы для отчетов
export const reportsApi = {
  getDashboard: () =>
    api.get('/reports/dashboard'),
  getOrders: (params?: any) =>
    api.get('/reports/orders', { params }),
  getInvoices: (params?: any) =>
    api.get('/reports/invoices', { params }),
  // Методы для менеджера (только свои заказы)
  getMyDashboard: () =>
    api.get('/reports/my/dashboard'),
  getMyOrders: (params?: any) =>
    api.get('/reports/my/orders', { params }),
  getMyInvoices: (params?: any) =>
    api.get('/reports/my/invoices', { params }),
  // Отчет по контрагенту
  getCounterpartyReport: (counterpartyId: number, params?: any) =>
    api.get(`/reports/counterparty/${counterpartyId}`, { params }),
  // Отчет по транспорту
  getVehiclesReport: (params?: any) =>
    api.get('/reports/vehicles', { params }),
};

// API методы для дополнительных услуг
export const additionalServicesApi = {
  getAll: (params?: any) =>
    api.get('/additional-services', { params }),
  getById: (id: number) =>
    api.get(`/additional-services/${id}`),
  create: (data: any) =>
    api.post('/additional-services', data),
  update: (id: number, data: any) =>
    api.patch(`/additional-services/${id}`, data),
  delete: (id: number) =>
    api.delete(`/additional-services/${id}`),
};

// API методы для внутренних заявок
export const internalRequestsApi = {
  getAll: (params?: any) =>
    api.get('/internal-requests', { params }),
  getMy: (params?: any) =>
    api.get('/internal-requests/my', { params }),
  getById: (id: number) =>
    api.get(`/internal-requests/${id}`),
  create: (data: any) =>
    api.post('/internal-requests', data),
  supplyFill: (id: number, data: any) =>
    api.patch(`/internal-requests/${id}/supply-fill`, data),
  directorDecision: (id: number, data: any) =>
    api.patch(`/internal-requests/${id}/director-decision`, data),
  accountantFund: (id: number) =>
    api.patch(`/internal-requests/${id}/accountant-fund`),
  markPurchased: (id: number) =>
    api.patch(`/internal-requests/${id}/mark-purchased`),
  confirmReceive: (id: number) =>
    api.patch(`/internal-requests/${id}/confirm-receive`),
  getStats: () =>
    api.get('/internal-requests/stats/summary'),
};

// API методы для весов ScaleBridge
export const scaleApi = {
  // Получить статус весов для склада
  getStatus: (warehouseId: number) =>
    api.get(`/scale/${warehouseId}/status`),
  
  // Настроить весы для склада
  configure: (warehouseId: number, data: { scaleIp: string; comPort?: string }) =>
    api.post(`/scale/${warehouseId}/configure`, data),
  
  // Получить API ключ от ScaleBridge
  getApiKey: (warehouseId: number, data: { scaleIp: string }) =>
    api.post(`/scale/${warehouseId}/get-api-key`, data),
  
  // Тест соединения с ScaleBridge
  testConnection: (warehouseId: number, data: { scaleIp: string; apiKey: string }) =>
    api.post(`/scale/${warehouseId}/test-connection`, data),
  
  // Выполнить взвешивание
  weigh: (warehouseId: number, data: { action: 'brutto' | 'tara' | 'netto'; orderId?: number }) =>
    api.post(`/scale/${warehouseId}/weigh`, data),
  
  // Получить текущий вес
  getCurrentWeight: (warehouseId: number) =>
    api.get(`/scale/${warehouseId}/current-weight`),
  
  // Поиск ScaleBridge устройств в сети
  discoverDevices: (subnet?: string) =>
    api.get(`/scale/discover${subnet ? `?subnet=${subnet}` : ''}`),
  
  // Отладка: проверить что возвращает ScaleBridge
  debugConfig: (ip: string) =>
    api.get(`/scale/debug-config?ip=${ip}`),
};

// API методы для истории взвешивания водителя
export const driverWeighingHistoryApi = {
  create: (data: any) =>
    api.post('/driver-weighing-history', data),
  getMy: () =>
    api.get('/driver-weighing-history/my'),
};

// API методы для уведомлений
export const notificationsApi = {
  getAll: (params?: { unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  getUnreadCountByType: (type: string) =>
    api.get(`/notifications/unread-count/${type}`),
  markAsRead: (id: number) =>
    api.patch(`/notifications/${id}/read`),
  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),
  markAsReadByType: (type: string) =>
    api.patch(`/notifications/mark-read-by-type/${type}`),
};