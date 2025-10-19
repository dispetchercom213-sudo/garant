import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

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
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER],
  },
  {
    text: 'Компании',
    icon: <Building2 className="h-5 w-5" />,
    path: '/companies',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR],
  },
  {
    text: 'Контрагенты',
    icon: <Users className="h-5 w-5" />,
    path: '/counterparties',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER],
  },
  {
    text: 'Склады',
    icon: <Warehouse className="h-5 w-5" />,
    path: '/warehouses',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER],
  },
  {
    text: 'Материалы',
    icon: <Package className="h-5 w-5" />,
    path: '/materials',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER],
  },
  {
    text: 'Марки бетона',
    icon: <Construction className="h-5 w-5" />,
    path: '/concrete-marks',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER],
  },
  {
    text: 'Водители',
    icon: <User className="h-5 w-5" />,
    path: '/drivers',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER],
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
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER],
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
    icon: <Receipt className="h-5 w-5" />,
    path: '/weighing-wizard',
    roles: [UserRole.DRIVER, UserRole.DEVELOPER],
  },
  {
    text: 'История взвешиваний',
    icon: <Receipt className="h-5 w-5" />,
    path: '/my-income-invoices',
    roles: [UserRole.DRIVER, UserRole.DEVELOPER],
  },
  {
    text: 'Заказы',
    icon: <FileText className="h-5 w-5" />,
    path: '/orders',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.DRIVER],
  },
  {
    text: 'Мои заявки',
    icon: <FileText className="h-5 w-5" />,
    path: '/my-requests',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.SUPPLIER, UserRole.DRIVER, UserRole.DIRECTOR],
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
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT],
  },
  {
    text: 'Расходные накладные',
    icon: <Receipt className="h-5 w-5" />,
    path: '/invoices/expense',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER],
  },
  {
    text: 'Отчеты',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.ACCOUNTANT],
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

const roleLabels = {
  [UserRole.DEVELOPER]: 'Разработчик',
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.DIRECTOR]: 'Директор',
  [UserRole.MANAGER]: 'Менеджер',
  [UserRole.ACCOUNTANT]: 'Бухгалтер',
  [UserRole.DRIVER]: 'Водитель',
};

interface LayoutProps {
  children: React.ReactNode;
}

export const LayoutNew: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role as UserRole))
  );

  const drawer = (
    <div className="flex flex-col h-full bg-white text-gray-900 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">BetonAPP</h1>
        <p className="text-sm text-gray-600">Система учёта бетонного завода</p>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = isCurrentPath(item.path);
            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-gray-900 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <UserCircle className="h-8 w-8 text-gray-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName || user?.username}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {user?.role && roleLabels[user.role as keyof typeof roleLabels]}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
      <div className="hidden md:flex md:w-64 md:flex-col">
        {drawer}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
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
                <SheetContent side="left" className="p-0 w-64">
                  {drawer}
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold text-gray-900">
                {filteredMenuItems.find(item => isCurrentPath(item.path))?.text || 'BetonAPP'}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-sm text-gray-600">
                {user?.firstName || user?.username} • {user?.role && roleLabels[user.role as keyof typeof roleLabels]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 mobile-scroll pb-16 md:pb-0">
          {children}
        </main>

        {/* Bottom Navigation for Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <ul className="flex justify-around items-center h-16">
            {filteredMenuItems.slice(0, 5).map((item) => {
              const isActive = isCurrentPath(item.path);
              return (
                <li key={item.path} className="flex-1">
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                      isActive
                        ? 'text-gray-900 bottom-nav-active'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium leading-tight">{item.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

    </div>
  );
};
