import React from 'react';
import { Box, Typography, Paper, Card, CardContent } from '@mui/material';
import {
  Business,
  People,
  Store,
  Inventory,
  Construction,
  Person,
  LocalShipping,
  Assignment,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactElement;
}> = ({ title, value, icon }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box mr={2} color="primary.main">
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" color="primary">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Панель управления
      </Typography>
      
      <Typography variant="body1" color="text.secondary" mb={3}>
        Добро пожаловать, {user?.firstName || user?.username}! 
        Ваша роль: {user?.role}
      </Typography>

      <Box 
        display="grid" 
        gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" 
        gap={3}
      >
        <StatCard
          title="Компании"
          value="0"
          icon={<Business />}
        />
        <StatCard
          title="Контрагенты"
          value="0"
          icon={<People />}
        />
        <StatCard
          title="Склады"
          value="0"
          icon={<Store />}
        />
        <StatCard
          title="Материалы"
          value="0"
          icon={<Inventory />}
        />
        <StatCard
          title="Марки бетона"
          value="0"
          icon={<Construction />}
        />
        <StatCard
          title="Водители"
          value="0"
          icon={<Person />}
        />
        <StatCard
          title="Транспорт"
          value="0"
          icon={<LocalShipping />}
        />
        <StatCard
          title="Заказы"
          value="0"
          icon={<Assignment />}
        />
      </Box>

      <Box mt={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Последние действия
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Здесь будут отображаться последние действия в системе
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};