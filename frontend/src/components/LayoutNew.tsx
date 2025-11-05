import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { 
  Building2, 
  Users, 
  Warehouse, 
  Package, 
  Construction, 
  User, 
  Truck, 
  FileText, 
  Receipt, 
  BarChart3,
  Menu,
  LogOut,
  UserCircle,
  UserCheck,
  Mail,
  Settings,
  MapPin,
  History,
  Bell,
  X,
  Check
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';
import { notificationsApi } from '../services/api';
import { StatusToggle } from './StatusToggle';

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles?: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    text: 'Панель управления',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/dashboard',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.DRIVER, UserRole.CLIENT],
  },
  {
    text: 'Компании',
    icon: <Building2 className="h-5 w-5" />,
    path: '/companies',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Контрагенты',
    icon: <Users className="h-5 w-5" />,
    path: '/counterparties',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Склады',
    icon: <Warehouse className="h-5 w-5" />,
    path: '/warehouses',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Остатки материалов',
    icon: <Package className="h-5 w-5" />,
    path: '/warehouses/material-balances',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.SUPPLIER, UserRole.DISPATCHER, UserRole.ACCOUNTANT],
  },
  {
    text: 'Материалы',
    icon: <Package className="h-5 w-5" />,
    path: '/materials',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Марки бетона',
    icon: <Construction className="h-5 w-5" />,
    path: '/concrete-marks',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Водители',
    icon: <User className="h-5 w-5" />,
    path: '/drivers',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Пользователи',
    icon: <UserCheck className="h-5 w-5" />,
    path: '/users',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR],
  },
  {
    text: 'Транспорт',
    icon: <Truck className="h-5 w-5" />,
    path: '/vehicles',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Мой транспорт',
    icon: <Truck className="h-5 w-5" />,
    path: '/my-vehicles',
    roles: [UserRole.DRIVER, UserRole.DEVELOPER],
  },
  {
    text: 'Мои накладные',
    icon: <Receipt className="h-5 w-5" />,
    path: '/my-invoices',
    roles: [UserRole.DRIVER, UserRole.DEVELOPER],
  },
  {
    text: 'Взвешивание',
    icon: <Package className="h-5 w-5" />,
    path: '/weighing-wizard',
    roles: [UserRole.DRIVER, UserRole.DEVELOPER],
  },
  {
    text: 'История взвешивания',
    icon: <History className="h-5 w-5" />,
    path: '/weighing-history',
    roles: [UserRole.DRIVER, UserRole.DEVELOPER],
  },
  {
    text: 'Заказы',
    icon: <FileText className="h-5 w-5" />,
    path: '/orders',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT, UserRole.DRIVER, UserRole.CLIENT],
  },
  {
    text: '📝 Мои заявки',
    icon: <FileText className="h-5 w-5" />,
    path: '/my-requests',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.SUPPLIER],
  },
  {
    text: 'Заявки',
    icon: <Package className="h-5 w-5" />,
    path: '/supplier-requests',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.SUPPLIER],
  },
  {
    text: 'Заявки',
    icon: <UserCheck className="h-5 w-5" />,
    path: '/director-requests',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR],
  },
  {
    text: 'Заявки',
    icon: <Receipt className="h-5 w-5" />,
    path: '/accountant-requests',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.ACCOUNTANT],
  },
  {
    text: 'Приходные накладные',
    icon: <Receipt className="h-5 w-5" />,
    path: '/invoices/income',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT, UserRole.CLIENT],
  },
  {
    text: 'Расходные накладные',
    icon: <Receipt className="h-5 w-5" />,
    path: '/invoices/expense',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Отчеты',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT],
  },
  {
    text: 'Отчет по транспорту',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports/vehicles',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR],
  },
  {
    text: 'Мои отчеты',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/my-reports',
    roles: [UserRole.MANAGER, UserRole.CLIENT],
  },
  {
    text: 'Карта транспорта',
    icon: <MapPin className="h-5 w-5" />,
    path: '/my-map',
    roles: [UserRole.MANAGER, UserRole.CLIENT],
  },
  {
    text: 'Карта транспорта',
    icon: <MapPin className="h-5 w-5" />,
    path: '/all-vehicles-map',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Настройки Email',
    icon: <Mail className="h-5 w-5" />,
    path: '/email-settings',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR],
  },
  {
    text: 'Личный кабинет',
    icon: <Settings className="h-5 w-5" />,
    path: '/profile',
  },
];

const roleLabels: Record<UserRole, string> = {
  [UserRole.DEVELOPER]: 'Разработчик',
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.DIRECTOR]: 'Директор',
  [UserRole.MANAGER]: 'Менеджер',
  [UserRole.ACCOUNTANT]: 'Бухгалтер',
  [UserRole.DISPATCHER]: 'Диспетчер',
  [UserRole.SUPPLIER]: 'Поставщик',
  [UserRole.OPERATOR]: 'Оператор',
  [UserRole.DRIVER]: 'Водитель',
  [UserRole.CLIENT]: 'Клиент',
};

interface LayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: string;
}

export const LayoutNew: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState<Record<string, number>>({});
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Загружаем количество непрочитанных уведомлений
  useEffect(() => {
    if (user) {
      const loadNotificationCounts = async () => {
        try {
          // Получаем общее количество непрочитанных
          const unreadResponse = await notificationsApi.getUnreadCount();
          const totalUnread = unreadResponse.data?.count || 0;
          
          // Получаем количество по типам для разных разделов
          const orderCount = await notificationsApi.getUnreadCountByType('order').catch(() => ({ data: { count: 0 } }));
          const invoiceCount = await notificationsApi.getUnreadCountByType('invoice').catch(() => ({ data: { count: 0 } }));
          const requestCount = await notificationsApi.getUnreadCountByType('request').catch(() => ({ data: { count: 0 } }));
          
          const counts = {
            orders: orderCount.data?.count || 0,
            invoices: invoiceCount.data?.count || 0,
            requests: requestCount.data?.count || 0,
            total: totalUnread,
          };
          
          console.log('🔔 Уведомления загружены:', counts);
          setNotificationCounts(counts);
        } catch (error) {
          console.error('❌ Ошибка загрузки уведомлений:', error);
          // Устанавливаем нули в случае ошибки, чтобы не показывать старые данные
          setNotificationCounts({
            orders: 0,
            invoices: 0,
            requests: 0,
            total: 0,
          });
        }
      };

      loadNotificationCounts();
      // Обновляем каждые 30 секунд
      const interval = setInterval(loadNotificationCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Помечаем уведомления как прочитанные при открытии раздела
  useEffect(() => {
    if (user && location.pathname) {
      const markNotificationsAsRead = async () => {
        try {
          if (location.pathname === '/orders' || location.pathname.startsWith('/orders/')) {
            await notificationsApi.markAsReadByType('order');
            setNotificationCounts(prev => ({ ...prev, orders: 0 }));
          } else if (location.pathname === '/invoices' || location.pathname.startsWith('/invoices/') || 
                     location.pathname === '/my-invoices' || location.pathname.startsWith('/my-invoices/')) {
            await notificationsApi.markAsReadByType('invoice');
            setNotificationCounts(prev => ({ ...prev, invoices: 0 }));
          } else if (location.pathname === '/my-requests' || location.pathname.startsWith('/my-requests/') ||
                     location.pathname === '/supplier-requests' || location.pathname.startsWith('/supplier-requests/') ||
                     location.pathname === '/director-requests' || location.pathname.startsWith('/director-requests/') ||
                     location.pathname === '/accountant-requests' || location.pathname.startsWith('/accountant-requests/')) {
            await notificationsApi.markAsReadByType('request');
            setNotificationCounts(prev => ({ ...prev, requests: 0 }));
          }
        } catch (error) {
          console.error('Ошибка при пометке уведомлений как прочитанных:', error);
        }
      };

      markNotificationsAsRead();
    }
  }, [location.pathname, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  // Загрузить список уведомлений
  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setNotificationsLoading(true);
      const response = await notificationsApi.getAll({ unreadOnly: false });
      const notificationsList = response.data || [];
      // Сортируем: сначала непрочитанные, потом по дате
      const sorted = [...notificationsList].sort((a, b) => {
        if (a.isRead !== b.isRead) {
          return a.isRead ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setNotifications(sorted);
    } catch (error) {
      console.error('Ошибка загрузки списка уведомлений:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Открыть/закрыть список уведомлений
  const toggleNotifications = async () => {
    if (!notificationsOpen) {
      await loadNotifications();
    }
    setNotificationsOpen(!notificationsOpen);
  };

  // Отметить уведомление как прочитанное
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      // Обновляем счетчики
      const counts = await Promise.all([
        notificationsApi.getUnreadCountByType('order').catch(() => ({ data: { count: 0 } })),
        notificationsApi.getUnreadCountByType('invoice').catch(() => ({ data: { count: 0 } })),
        notificationsApi.getUnreadCountByType('request').catch(() => ({ data: { count: 0 } })),
      ]);
      setNotificationCounts({
        orders: counts[0].data?.count || 0,
        invoices: counts[1].data?.count || 0,
        requests: counts[2].data?.count || 0,
        total: (await notificationsApi.getUnreadCount()).data?.count || 0,
      });
    } catch (error) {
      console.error('Ошибка при пометке уведомления как прочитанного:', error);
    }
  };

  // Отметить все как прочитанные
  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setNotificationCounts({
        orders: 0,
        invoices: 0,
        requests: 0,
        total: 0,
      });
    } catch (error) {
      console.error('Ошибка при пометке всех уведомлений как прочитанных:', error);
    }
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Получить количество уведомлений для раздела
  const getNotificationCount = (path: string): number => {
    // Заказы
    if (path === '/orders' || path.startsWith('/orders')) {
      return notificationCounts.orders || 0;
    }
    // Накладные (все виды)
    if (path === '/invoices' || path.startsWith('/invoices') || 
        path === '/my-invoices' || path.startsWith('/my-invoices') ||
        path === '/my-income-invoices' || path.startsWith('/my-income-invoices')) {
      return notificationCounts.invoices || 0;
    }
    // Заявки (все виды)
    if (path === '/my-requests' || path.startsWith('/my-requests') ||
        path === '/supplier-requests' || path.startsWith('/supplier-requests') ||
        path === '/director-requests' || path.startsWith('/director-requests') ||
        path === '/accountant-requests' || path.startsWith('/accountant-requests')) {
      return notificationCounts.requests || 0;
    }
    return 0;
  };

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role as UserRole))
  );

  const drawer = (
    <div className="flex flex-col h-full bg-white text-gray-600 overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-600">BetonAPP</h1>
        <p className="text-sm text-gray-500">Система учёта бетонного завода</p>
      </div>
      
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = isCurrentPath(item.path);
            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className={isActive ? 'text-gray-900' : 'text-gray-600'}>{item.icon}</span>
                    <span className="font-medium truncate">{item.text}</span>
                  </div>
                  {(() => {
                    const count = getNotificationCount(item.path);
                    if (count > 0) {
                      return (
                        <span 
                          className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full ml-2 flex-shrink-0 z-10"
                          title={`${count} непрочитанных уведомлений`}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-shrink-0 p-4 border-t border-gray-300">
        <div className="flex items-center space-x-3 mb-3">
          <UserCircle className="h-8 w-8 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 truncate">
              {user?.firstName || user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role && roleLabels[user.role as keyof typeof roleLabels]}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start bg-white border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:overflow-hidden">
        {drawer}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              {/* Переключатель статуса для водителей */}
              {user?.role === UserRole.DRIVER && (
                <StatusToggle />
              )}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 overflow-hidden flex flex-col">
                  {drawer}
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold text-gray-900">
                {filteredMenuItems.find(item => isCurrentPath(item.path))?.text || 'BetonAPP'}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              {/* Иконка уведомлений */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleNotifications}
                  className="relative"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {notificationCounts.total > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4.5 px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                      {notificationCounts.total > 99 ? '99+' : notificationCounts.total}
                    </span>
                  )}
                </Button>
                
                {/* Dropdown с уведомлениями */}
                {notificationsOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Уведомления</h3>
                        <div className="flex items-center space-x-2">
                          {notificationCounts.total > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={markAllAsRead}
                              className="text-xs text-gray-600 hover:text-gray-900"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Прочитать все
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNotificationsOpen(false)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* List */}
                      <div className="flex-1 overflow-y-auto">
                        {notificationsLoading ? (
                          <div className="p-8 text-center text-gray-500">
                            Загрузка...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            Нет уведомлений
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                              <div
                                key={notification.id}
                                onClick={() => {
                                  if (!notification.isRead) {
                                    markNotificationAsRead(notification.id);
                                  }
                                  // Переход на связанную страницу
                                  if (notification.relatedType === 'order' && notification.relatedId) {
                                    navigate(`/orders`);
                                    setNotificationsOpen(false);
                                  } else if (notification.relatedType === 'invoice' && notification.relatedId) {
                                    navigate(`/invoices`);
                                    setNotificationsOpen(false);
                                  } else if (notification.relatedType === 'request' && notification.relatedId) {
                                    navigate(`/my-requests`);
                                    setNotificationsOpen(false);
                                  }
                                }}
                                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  !notification.isRead ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                    !notification.isRead ? 'bg-blue-500' : 'bg-transparent'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${
                                      !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                      {new Date(notification.createdAt).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="hidden sm:block text-sm text-gray-600">
                {user?.firstName || user?.username} • {user?.role && roleLabels[user.role as keyof typeof roleLabels]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>

    </div>
  );
};
