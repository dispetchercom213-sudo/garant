import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Chip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Business,
  People,
  Store,
  Inventory,
  Construction,
  Person,
  LocalShipping,
  Assignment,
  Receipt,
  Assessment,
  Logout,
  AccountCircle,
  SwapHoriz,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles?: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    text: 'Компании',
    icon: <Business />,
    path: '/companies',
    roles: [UserRole.DEVELOPER, UserRole.ADMIN, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
  {
    text: 'Контрагенты',
    icon: <People />,
    path: '/counterparties',
  },
  {
    text: 'Склады',
    icon: <Store />,
    path: '/warehouses',
  },
  {
    text: 'Материалы',
    icon: <Inventory />,
    path: '/materials',
  },
  {
    text: 'Марки бетона',
    icon: <Construction />,
    path: '/concrete-marks',
  },
  {
    text: 'Водители',
    icon: <Person />,
    path: '/drivers',
  },
  {
    text: 'Транспорт',
    icon: <LocalShipping />,
    path: '/vehicles',
    roles: [UserRole.DEVELOPER, UserRole.ADMIN, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.DRIVER],
  },
  {
    text: 'Заказы',
    icon: <Assignment />,
    path: '/orders',
  },
  {
    text: 'Накладные',
    icon: <Receipt />,
    path: '/invoices',
  },
  {
    text: 'Отчёты',
    icon: <Assessment />,
    path: '/reports',
    roles: [UserRole.DEVELOPER, UserRole.ADMIN, UserRole.DIRECTOR, UserRole.ACCOUNTANT],
  },
  {
    text: 'Мои отчёты',
    icon: <Assessment />,
    path: '/my-reports',
    roles: [UserRole.MANAGER],
  },
  {
    text: 'Карта транспорта',
    icon: <LocalShipping />,
    path: '/my-map',
    roles: [UserRole.MANAGER],
  },
  {
    text: 'Карта транспорта',
    icon: <LocalShipping />,
    path: '/all-vehicles-map',
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR],
  },
];

const roleLabels: Record<UserRole, string> = {
  [UserRole.DEVELOPER]: 'Разработчик',
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.DIRECTOR]: 'Директор',
  [UserRole.ACCOUNTANT]: 'Бухгалтер',
  [UserRole.MANAGER]: 'Менеджер',
  [UserRole.DISPATCHER]: 'Диспетчер',
  [UserRole.SUPPLIER]: 'Поставщик',
  [UserRole.OPERATOR]: 'Оператор',
  [UserRole.DRIVER]: 'Водитель',
  [UserRole.CLIENT]: 'Клиент',
};

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, logout, switchRole } = useAuthStore();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setRoleMenuAnchor(event.currentTarget);
  };

  const handleRoleMenuClose = () => {
    setRoleMenuAnchor(null);
  };

  const handleRoleSwitch = async (newRole: string) => {
    try {
      console.log('🎯 Layout: начинаем смену роли на:', newRole);
      handleRoleMenuClose(); // Закрываем меню сразу
      
      await switchRole(newRole);
      
      // После успешной смены роли можно обновить страницу или показать уведомление
      console.log('🎉 Layout: роль успешно изменена на:', newRole);
    } catch (error: any) {
      console.error('💥 Layout: ошибка переключения роли:', error);
      
      // Показываем понятное сообщение пользователю
      const errorMessage = error.response?.data?.message || 'Ошибка переключения роли';
      
      // Можно добавить уведомление пользователю
      alert(`Не удалось переключить роль: ${errorMessage}`);
      
      // Не разлогиниваем пользователя при ошибке смены роли
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role as UserRole))
  );

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          BetonAPP
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'BetonAPP'}
          </Typography>

          {user && (
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={roleLabels[user.role as UserRole]}
                size="small"
                variant="outlined"
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  '& .MuiChip-label': {
                    fontSize: '0.75rem',
                  }
                }}
              />
              
              <IconButton
                color="inherit"
                onClick={handleRoleMenuOpen}
                size="small"
              >
                <SwapHoriz />
              </IconButton>
              
              <IconButton
                color="inherit"
                onClick={handleLogout}
                size="small"
              >
                <Logout />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* Меню переключения ролей */}
      <Menu
        anchorEl={roleMenuAnchor}
        open={Boolean(roleMenuAnchor)}
        onClose={handleRoleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        disableAutoFocusItem
      >
        {Object.entries(roleLabels).map(([role, label]) => (
          <MenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            selected={user?.role === role}
          >
            <ListItemIcon>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText primary={label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
