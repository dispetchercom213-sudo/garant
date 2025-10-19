import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Building2,
  Users,
  Warehouse as WarehouseIcon,
  Package,
  Construction,
  User,
  Truck,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useApiData } from '../hooks/useApiData';
import { PageContainer } from '../components/PageContainer';
import { UserRole } from '../types';
import { 
  companiesApi, 
  counterpartiesApi, 
  warehousesApi, 
  materialsApi, 
  concreteMarksApi, 
  driversApi, 
  vehiclesApi, 
  ordersApi 
} from '../services/api';
import type { Company, Counterparty, Warehouse, Material, ConcreteMark, Driver, Vehicle, Order } from '../types';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactElement;
}> = ({ title, value, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export const DashboardPageNew: React.FC = () => {
  const { user } = useAuthStore();

  // Проверяем права доступа для загрузки данных
  const canViewCompanies = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string].includes(user.role);
  const canViewCounterparties = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.MANAGER as string].includes(user.role);
  const canViewWarehouses = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.DISPATCHER as string].includes(user.role);
  const canViewMaterials = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.DISPATCHER as string].includes(user.role);
  const canViewConcreteMarks = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.DISPATCHER as string].includes(user.role);
  const canViewDrivers = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.DISPATCHER as string].includes(user.role);
  const canViewVehicles = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.DISPATCHER as string, UserRole.MANAGER as string].includes(user.role);

  // Загрузка статистических данных только если есть права
  const { data: companies } = useApiData<Company>({
    apiCall: canViewCompanies ? () => companiesApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: counterparties } = useApiData<Counterparty>({
    apiCall: canViewCounterparties ? () => counterpartiesApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: warehouses } = useApiData<Warehouse>({
    apiCall: canViewWarehouses ? () => warehousesApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: materials } = useApiData<Material>({
    apiCall: canViewMaterials ? () => materialsApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: concreteMarks } = useApiData<ConcreteMark>({
    apiCall: canViewConcreteMarks ? () => concreteMarksApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: drivers } = useApiData<Driver>({
    apiCall: canViewDrivers ? () => driversApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: vehicles } = useApiData<Vehicle>({
    apiCall: canViewVehicles ? () => vehiclesApi.getAll() : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: []
  });

  const { data: orders } = useApiData<Order>({
    apiCall: () => ordersApi.getAll(),
    dependencies: []
  });

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Панель управления</h1>
        <p className="text-muted-foreground mt-2">
          Добро пожаловать, {user?.firstName || user?.username}! 
          Ваша роль: {user?.role}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {canViewCompanies && (
          <StatCard
            title="Компании"
            value={companies?.length || 0}
            icon={<Building2 className="h-4 w-4" />}
          />
        )}
        {canViewCounterparties && (
          <StatCard
            title="Контрагенты"
            value={counterparties?.length || 0}
            icon={<Users className="h-4 w-4" />}
          />
        )}
        {canViewWarehouses && (
          <StatCard
            title="Склады"
            value={warehouses?.length || 0}
            icon={<WarehouseIcon className="h-4 w-4" />}
          />
        )}
        {canViewMaterials && (
          <StatCard
            title="Материалы"
            value={materials?.length || 0}
            icon={<Package className="h-4 w-4" />}
          />
        )}
        {canViewConcreteMarks && (
          <StatCard
            title="Марки бетона"
            value={concreteMarks?.length || 0}
            icon={<Construction className="h-4 w-4" />}
          />
        )}
        {canViewDrivers && (
          <StatCard
            title="Водители"
            value={drivers?.length || 0}
            icon={<User className="h-4 w-4" />}
          />
        )}
        {canViewVehicles && (
          <StatCard
            title="Транспорт"
            value={vehicles?.length || 0}
            icon={<Truck className="h-4 w-4" />}
          />
        )}
        <StatCard
          title="Заказы"
          value={orders?.length || 0}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние заказы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.concreteMark?.name} - {order.quantityM3} м³
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {order.customer?.name || 'Клиент'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.status === 'COMPLETED' ? 'Выполнен' : 
                         order.status === 'IN_DELIVERY' ? 'В доставке' :
                         order.status === 'DISPATCHED' ? 'Отправлен' : 'В процессе'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Нет заказов</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Системная информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Всего пользователей:</span>
                <span className="text-sm font-medium">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Всего компаний:</span>
                <span className="text-sm font-medium">{companies?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Всего материалов:</span>
                <span className="text-sm font-medium">{materials?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Всего заказов:</span>
                <span className="text-sm font-medium">{orders?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
