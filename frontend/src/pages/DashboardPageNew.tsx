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
  ClipboardList,
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
  ordersApi,
  invoicesApi,
  reportsApi,
} from '../services/api';
import type { Company, Counterparty, Warehouse, Material, ConcreteMark, Driver, Vehicle, Order, Invoice } from '../types';
import { useMediaQuery, useTheme } from '@mui/material';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactElement;
  isMobile?: boolean;
}> = ({ title, value, icon, isMobile }) => (
  <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
    <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-2 px-3 pt-3' : 'pb-2'}`}>
      <CardTitle className={isMobile ? 'text-xs font-medium text-gray-600' : 'text-sm font-medium text-gray-600'}>{title}</CardTitle>
      <div className={`text-gray-500 ${isMobile ? 'scale-75' : ''}`}>{icon}</div>
    </CardHeader>
    <CardContent className={isMobile ? 'px-3 pb-3 pt-0' : ''}>
      <div className={isMobile ? 'text-xl font-bold text-gray-600' : 'text-2xl font-bold text-gray-600'}>{value}</div>
    </CardContent>
  </Card>
);

export const DashboardPageNew: React.FC = () => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isManager = user?.role === UserRole.MANAGER;
  const isClient = user?.role === UserRole.CLIENT;
  const isDriver = user?.role === UserRole.DRIVER;
  const isDispatcher = user?.role === UserRole.DISPATCHER;
  const isOperator = user?.role === UserRole.OPERATOR;
  const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.DEVELOPER || user.role === UserRole.DIRECTOR);

  // Загрузка данных для менеджера и клиента (только их заказы)
  const isManagerOrClient = isManager || isClient;
  const { data: managerStats } = useApiData<any>({
    apiCall: isManagerOrClient ? () => reportsApi.getMyDashboard() : () => Promise.resolve({ data: null }),
    dependencies: [isManagerOrClient]
  });

  const { data: managerOrders } = useApiData<Order>({
    apiCall: isManagerOrClient ? () => ordersApi.getMy({ limit: '5' }) : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 5, totalPages: 0 } }),
    dependencies: [isManagerOrClient]
  });


  // Загрузка данных для водителя (его активные накладные)
  const { data: driverInvoices } = useApiData<Invoice>({
    apiCall: isDriver ? () => invoicesApi.getMyActive() : () => Promise.resolve({ data: [] }),
    dependencies: [isDriver]
  });

  // Загрузка всех накладных водителя для статистики
  const { data: allDriverInvoicesResponse } = useApiData<any>({
    apiCall: isDriver ? () => invoicesApi.getMy({ limit: '100' }) : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } }),
    dependencies: [isDriver]
  });

  // Извлекаем массив накладных из ответа
  const allDriverInvoices = Array.isArray(allDriverInvoicesResponse) 
    ? allDriverInvoicesResponse 
    : Array.isArray(allDriverInvoicesResponse?.data) 
      ? allDriverInvoicesResponse.data 
      : [];

  // Загрузка транспорта водителя
  const { data: driverVehicles } = useApiData<Vehicle>({
    apiCall: isDriver ? () => vehiclesApi.getMy() : () => Promise.resolve({ data: [] }),
    dependencies: [isDriver]
  });

  // Загрузка данных для диспетчера/оператора (активные накладные)
  const { data: activeInvoices } = useApiData<Invoice>({
    apiCall: (isDispatcher || isOperator) ? () => invoicesApi.getAll({ status: 'IN_TRANSIT,UNLOADING,ARRIVED' }) : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: [isDispatcher, isOperator]
  });

  // Общая статистика для администраторов
  const { data: generalStatsResponse } = useApiData<any>({
    apiCall: isAdmin ? () => reportsApi.getDashboard() : () => Promise.resolve({ data: null }),
    dependencies: [isAdmin]
  });

  // Извлекаем данные из ответа API
  // useApiData возвращает массив, но для dashboard это объект, поэтому берем первый элемент
  const generalStats = Array.isArray(generalStatsResponse) && generalStatsResponse.length > 0
    ? generalStatsResponse[0]
    : generalStatsResponse && typeof generalStatsResponse === 'object' && !Array.isArray(generalStatsResponse)
      ? generalStatsResponse
      : null;

  // Проверяем права доступа для загрузки данных
  const canViewCompanies = isAdmin;
  const canViewCounterparties = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.DEVELOPER || 
    user.role === UserRole.DIRECTOR || 
    user.role === UserRole.MANAGER ||
    user.role === UserRole.CLIENT
  );
  const canViewWarehouses = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.DEVELOPER || 
    user.role === UserRole.DIRECTOR || 
    user.role === UserRole.DISPATCHER
  );
  const canViewMaterials = canViewWarehouses;
  const canViewConcreteMarks = canViewWarehouses;
  const canViewDrivers = canViewWarehouses;
  const canViewVehicles = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.DEVELOPER || 
    user.role === UserRole.DIRECTOR || 
    user.role === UserRole.DISPATCHER
  );

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

  // Заказы для администраторов
  const { data: allOrders } = useApiData<Order>({
    apiCall: isAdmin ? () => ordersApi.getAll({ limit: '10' }) : () => Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    dependencies: [isAdmin]
  });

  // Статистика для менеджера и клиента
  // useApiData возвращает массив, но для dashboard это объект, поэтому берем первый элемент
  const managerStatsData = Array.isArray(managerStats) && managerStats.length > 0
    ? managerStats[0]
    : managerStats && typeof managerStats === 'object' && 'data' in managerStats && !Array.isArray(managerStats)
      ? (managerStats as { data: any }).data
      : managerStats && typeof managerStats === 'object' && !Array.isArray(managerStats)
        ? managerStats
        : null;

  return (
    <PageContainer>
      <div className={isMobile ? 'mb-4' : 'mb-6'}>
        <h1 className={isMobile ? 'text-xl font-bold text-gray-600' : 'text-3xl font-bold text-gray-600'}>Панель управления</h1>
        <p className={isMobile ? 'text-gray-500 mt-1 text-xs' : 'text-gray-500 mt-2'}>
          Добро пожаловать, {user?.firstName || user?.username}! 
          {!isMobile && ` Ваша роль: ${user?.role}`}
        </p>
      </div>

      {/* Статистика для менеджера и клиента */}
      {(isManager || isClient) && (
        <div className={`grid ${isMobile ? 'gap-2 grid-cols-2 mb-4' : 'gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8'}`}>
          <StatCard
            title="Мои заказы"
            value={managerStatsData?.totalOrders || 0}
            icon={<ClipboardList className="h-4 w-4" />}
            isMobile={isMobile}
          />
          <StatCard
            title="Мои накладные"
            value={managerStatsData?.totalInvoices || 0}
            icon={<FileText className="h-4 w-4" />}
            isMobile={isMobile}
          />
          {canViewCounterparties && (
            <StatCard
              title="Мои контрагенты"
              value={counterparties?.length || 0}
              icon={<Users className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
        </div>
      )}

      {/* Статистика для водителя */}
      {isDriver && (
        <>
          <div className={`grid ${isMobile ? 'gap-2 grid-cols-2 mb-4' : 'gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8'}`}>
            <StatCard
              title="Активные накладные"
              value={driverInvoices?.length || 0}
              icon={<FileText className="h-4 w-4" />}
              isMobile={isMobile}
            />
            <StatCard
              title="Мой транспорт"
              value={driverVehicles?.length || 0}
              icon={<Truck className="h-4 w-4" />}
              isMobile={isMobile}
            />
            <StatCard
              title="Всего накладных"
              value={allDriverInvoices?.length || 0}
              icon={<ClipboardList className="h-4 w-4" />}
              isMobile={isMobile}
            />
            <StatCard
              title="Завершено"
              value={allDriverInvoices?.filter((inv: Invoice) => inv.status === 'COMPLETED' || inv.status === 'DELIVERED').length || 0}
              icon={<FileText className="h-4 w-4" />}
              isMobile={isMobile}
            />
          </div>
          
          {/* Последние накладные водителя */}
          {driverInvoices && driverInvoices.length > 0 && (
            <div className={isMobile ? 'grid gap-3 grid-cols-1 mb-4' : 'grid gap-6 md:grid-cols-2 mb-8'}>
              <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
                <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
                  <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Активные накладные</CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
                  <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                    {driverInvoices.slice(0, 5).map((invoice: Invoice) => (
                      <div key={invoice.id} className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                        <div>
                          <p className={isMobile ? 'text-xs font-medium text-gray-600' : 'font-medium text-gray-600'}>
                            {invoice.invoiceNumber || `#${invoice.id}`}
                          </p>
                          <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                            {invoice.order?.orderNumber ? `Заказ ${invoice.order.orderNumber}` : 'Без заказа'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                            {invoice.status === 'IN_TRANSIT' ? 'В пути' :
                             invoice.status === 'UNLOADING' ? 'На разгрузке' :
                             invoice.status === 'ARRIVED' ? 'Прибыл' :
                             invoice.status === 'COMPLETED' ? 'Завершено' :
                             invoice.status === 'DELIVERED' ? 'Доставлено' : invoice.status}
                          </p>
                          {invoice.vehicle && (
                            <p className="text-xs text-gray-500">
                              {invoice.vehicle.plate}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Статистика для диспетчера/оператора */}
      {(isDispatcher || isOperator) && (
        <div className={`grid ${isMobile ? 'gap-2 grid-cols-2 mb-4' : 'gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8'}`}>
          <StatCard
            title="Активные накладные"
            value={activeInvoices?.length || 0}
            icon={<FileText className="h-4 w-4" />}
            isMobile={isMobile}
          />
          {canViewVehicles && (
            <StatCard
              title="Транспорт"
              value={vehicles?.length || 0}
              icon={<Truck className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewDrivers && (
            <StatCard
              title="Водители"
              value={drivers?.length || 0}
              icon={<User className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
        </div>
      )}

      {/* Общая статистика для администраторов */}
      {isAdmin && (
        <div className={`grid ${isMobile ? 'gap-2 grid-cols-2 mb-4' : 'gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8'}`}>
          {canViewCompanies && (
            <StatCard
              title="Компании"
              value={companies?.length || 0}
              icon={<Building2 className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewCounterparties && (
            <StatCard
              title="Контрагенты"
              value={counterparties?.length || 0}
              icon={<Users className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewWarehouses && (
            <StatCard
              title="Склады"
              value={warehouses?.length || 0}
              icon={<WarehouseIcon className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewMaterials && (
            <StatCard
              title="Материалы"
              value={materials?.length || 0}
              icon={<Package className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewConcreteMarks && (
            <StatCard
              title="Марки бетона"
              value={concreteMarks?.length || 0}
              icon={<Construction className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewDrivers && (
            <StatCard
              title="Водители"
              value={drivers?.length || 0}
              icon={<User className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {canViewVehicles && (
            <StatCard
              title="Транспорт"
              value={vehicles?.length || 0}
              icon={<Truck className="h-4 w-4" />}
              isMobile={isMobile}
            />
          )}
          {generalStats && (
            <>
              <StatCard
                title="Заказы"
                value={generalStats.totalOrders || 0}
                icon={<FileText className="h-4 w-4" />}
                isMobile={isMobile}
              />
              <StatCard
                title="Накладные"
                value={generalStats.totalInvoices || 0}
                icon={<FileText className="h-4 w-4" />}
                isMobile={isMobile}
              />
            </>
          )}
        </div>
      )}

      {/* Детальная информация для менеджера */}
      {isManager && (
        <div className={isMobile ? 'grid gap-3 grid-cols-1' : 'grid gap-6 md:grid-cols-2'}>
          <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
            <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Мои последние заказы</CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                {managerOrders && managerOrders.length > 0 ? (
                  managerOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <div>
                        <p className={isMobile ? 'text-xs font-medium text-gray-600' : 'font-medium text-gray-600'}>{order.orderNumber || `#${order.id}`}</p>
                        <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                          {order.concreteMark?.name} - {order.quantityM3} м³
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                          {order.customer?.name || 'Клиент'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.status === 'COMPLETED' ? 'Выполнен' : 
                           order.status === 'IN_DELIVERY' ? 'В доставке' :
                           order.status === 'DISPATCHED' ? 'Отправлен' : 'В процессе'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Нет заказов</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
            <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Статистика по заказам</CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                {managerStatsData?.ordersByStatus && managerStatsData.ordersByStatus.length > 0 ? (
                  managerStatsData.ordersByStatus.map((status: any, index: number) => (
                    <div key={index} className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <span className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                        {status.status === 'COMPLETED' ? 'Выполнено' :
                         status.status === 'IN_DELIVERY' ? 'В доставке' :
                         status.status === 'DISPATCHED' ? 'Отправлено' : 'В процессе'}
                      </span>
                      <span className={isMobile ? 'text-xs font-medium text-gray-600' : 'text-sm font-medium text-gray-600'}>{status._count.id}</span>
                    </div>
                  ))
                ) : (
                  <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Нет данных</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Детальная информация для водителя */}
      {isDriver && (
        <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
          <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Мои активные накладные</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              {driverInvoices && driverInvoices.length > 0 ? (
                driverInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                    <div>
                      <p className={isMobile ? 'text-xs font-medium text-gray-600' : 'font-medium text-gray-600'}>{invoice.invoiceNumber || `#${invoice.id}`}</p>
                      <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                        {invoice.order?.orderNumber} - {invoice.quantityM3} м³
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                        {invoice.order?.deliveryAddress || 'Адрес не указан'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Нет активных накладных</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Детальная информация для диспетчера/оператора */}
      {(isDispatcher || isOperator) && (
        <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
          <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Активные накладные в работе</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              {activeInvoices && activeInvoices.length > 0 ? (
                activeInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                    <div>
                      <p className={isMobile ? 'text-xs font-medium text-gray-600' : 'font-medium text-gray-600'}>{invoice.invoiceNumber || `#${invoice.id}`}</p>
                      <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                        {invoice.driver?.firstName} {invoice.driver?.lastName} - {invoice.vehicle?.plate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                        {invoice.order?.deliveryAddress || 'Адрес не указан'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Нет активных накладных</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Детальная информация для администраторов */}
      {isAdmin && (
        <div className={isMobile ? 'grid gap-3 grid-cols-1' : 'grid gap-6 md:grid-cols-2'}>
          <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
            <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Последние заказы</CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                {allOrders && allOrders.length > 0 ? (
                  allOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <div>
                        <p className={isMobile ? 'text-xs font-medium text-gray-600' : 'font-medium text-gray-600'}>{order.orderNumber || `#${order.id}`}</p>
                        <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                          {order.concreteMark?.name} - {order.quantityM3} м³
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
                          {order.customer?.name || 'Клиент'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.status === 'COMPLETED' ? 'Выполнен' : 
                           order.status === 'IN_DELIVERY' ? 'В доставке' :
                           order.status === 'DISPATCHED' ? 'Отправлен' : 'В процессе'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Нет заказов</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={isMobile ? 'shadow-sm' : 'shadow'}>
            <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm text-gray-600' : 'text-gray-600'}>Системная информация</CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                {generalStats && (
                  <>
                    <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <span className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Всего заказов:</span>
                      <span className={isMobile ? 'text-xs font-medium text-gray-600' : 'text-sm font-medium text-gray-600'}>{generalStats.totalOrders || 0}</span>
                    </div>
                    <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <span className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Всего накладных:</span>
                      <span className={isMobile ? 'text-xs font-medium text-gray-600' : 'text-sm font-medium text-gray-600'}>{generalStats.totalInvoices || 0}</span>
                    </div>
                    <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <span className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Всего компаний:</span>
                      <span className={isMobile ? 'text-xs font-medium text-gray-600' : 'text-sm font-medium text-gray-600'}>{companies?.length || 0}</span>
                    </div>
                    <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : ''}`}>
                      <span className={isMobile ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Всего материалов:</span>
                      <span className={isMobile ? 'text-xs font-medium text-gray-600' : 'text-sm font-medium text-gray-600'}>{materials?.length || 0}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};
