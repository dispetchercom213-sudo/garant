import { useEffect, memo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { LayoutNew as Layout } from './components/LayoutNew';
import { UserRole } from './types';

// Компонент для редиректа на стартовую страницу в зависимости от роли
const RoleBasedRedirect = memo(() => {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/dashboard" replace />;
  
  switch (user.role) {
    case UserRole.DIRECTOR:
    case UserRole.ACCOUNTANT:
    case UserRole.DISPATCHER:
    case UserRole.OPERATOR:
    case UserRole.SUPPLIER:
    case UserRole.ADMIN:
    case UserRole.DEVELOPER:
      return <Navigate to="/dashboard" replace />;
    
    case UserRole.MANAGER:
    case UserRole.CLIENT:
      return <Navigate to="/orders" replace />;
    
    case UserRole.DRIVER:
      return <Navigate to="/my-invoices" replace />;
    
    default:
      return <Navigate to="/dashboard" replace />;
  }
});
import { LoginPage } from './pages/LoginPage';
import { DashboardPageNew as DashboardPage } from './pages/DashboardPageNew';
import { CompaniesPageNew as CompaniesPage } from './pages/CompaniesPageNew';
import { CounterpartiesPageNew as CounterpartiesPage } from './pages/CounterpartiesPageNew';
import { CounterpartyReportPage } from './pages/CounterpartyReportPage';
import { VehiclesReportPage } from './pages/VehiclesReportPage';
import { MaterialBalancesPage } from './pages/MaterialBalancesPage';
import { WarehousesPageNew as WarehousesPage } from './pages/WarehousesPageNew';
import { MaterialsPageNew as MaterialsPage } from './pages/MaterialsPageNew';
import { ConcreteMarksPageNew as ConcreteMarksPage } from './pages/ConcreteMarksPageNew';
import { DriversPageNew as DriversPage } from './pages/DriversPageNew';
import { VehiclesPageNew as VehiclesPage } from './pages/VehiclesPageNew';
import { MyVehiclesPage } from './pages/MyVehiclesPage';
import { OrdersPageNew as OrdersPage } from './pages/OrdersPageNew';
import { InvoicesPageNew as InvoicesPage } from './pages/InvoicesPageNew';
import { IncomeInvoicesPage } from './pages/IncomeInvoicesPage';
import { ExpenseInvoicesPage } from './pages/ExpenseInvoicesPage';
import { UsersPageNew as UsersPage } from './pages/UsersPageNew';
import { ReportsPage } from './pages/ReportsPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { ManagerMapPage } from './pages/ManagerMapPage';
import { AllVehiclesMapPage } from './pages/AllVehiclesMapPage';
import EmailSettingsPage from './pages/EmailSettingsPage';
import MyInvoicesDriverPage from './pages/MyInvoicesDriverPage';
import MyIncomeInvoicesDriverPage from './pages/MyIncomeInvoicesDriverPage';
import DriverWeighingWizard from './pages/DriverWeighingWizard';
import DriverWeighingHistoryPage from './pages/DriverWeighingHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { TestPage } from './pages/TestPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { SupplierRequestsPage } from './pages/SupplierRequestsPage';
import { DirectorRequestsPage } from './pages/DirectorRequestsPage';
import { AccountantRequestsPage } from './pages/AccountantRequestsPage';
import { InternalRequestsReportPage } from './pages/InternalRequestsReportPage';

const App = memo(() => {
  const { initialize } = useAuthStore();

  const handleInitialize = useCallback(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    handleInitialize();
  }, [handleInitialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<RoleBasedRedirect />} />
                  <Route path="/dashboard" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.SUPPLIER, UserRole.DRIVER]}>
                      <DashboardPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/companies" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <CompaniesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/counterparties" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <CounterpartiesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/reports/counterparty/:id" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT, UserRole.MANAGER, UserRole.DISPATCHER]}>
                      <CounterpartyReportPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/reports/vehicles" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR]}>
                      <VehiclesReportPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/warehouses/material-balances" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.SUPPLIER, UserRole.DISPATCHER, UserRole.ACCOUNTANT]}>
                      <MaterialBalancesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/warehouses" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <WarehousesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/materials" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <MaterialsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/concrete-marks" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <ConcreteMarksPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/drivers" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <DriversPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/vehicles" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <VehiclesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/my-vehicles" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.DRIVER, UserRole.DEVELOPER]}>
                      <MyVehiclesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/orders" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT, UserRole.DRIVER, UserRole.CLIENT]}>
                      <OrdersPage />
                    </RoleProtectedRoute>
                  } />
                  {/* Старый маршрут для обратной совместимости */}
                  <Route path="/invoices" element={<InvoicesPage />} />
                  {/* Новые маршруты для приходных и расходных накладных */}
                  <Route path="/invoices/income" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT, UserRole.CLIENT]}>
                      <IncomeInvoicesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/invoices/expense" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <ExpenseInvoicesPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/my-invoices" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.DRIVER, UserRole.DEVELOPER]}>
                      <MyInvoicesDriverPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/my-income-invoices" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.DRIVER, UserRole.DEVELOPER]}>
                      <MyIncomeInvoicesDriverPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/weighing-wizard" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.DRIVER, UserRole.DEVELOPER]}>
                      <DriverWeighingWizard />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/weighing-history" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.DRIVER, UserRole.DEVELOPER]}>
                      <DriverWeighingHistoryPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/users" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR]}>
                      <UsersPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT]}>
                      <ReportsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/my-reports" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.MANAGER, UserRole.CLIENT]}>
                      <MyReportsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/my-map" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.MANAGER, UserRole.CLIENT]}>
                      <ManagerMapPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/all-vehicles-map" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR]}>
                      <AllVehiclesMapPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/email-settings" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR]}>
                      <EmailSettingsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/test" element={<TestPage />} />
                  {/* Внутренние заявки */}
                  <Route path="/my-requests" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.SUPPLIER, UserRole.DRIVER, UserRole.DIRECTOR]}>
                      <MyRequestsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/supplier-requests" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.SUPPLIER]}>
                      <SupplierRequestsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/director-requests" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR]}>
                      <DirectorRequestsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/accountant-requests" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.ACCOUNTANT]}>
                      <AccountantRequestsPage />
                    </RoleProtectedRoute>
                  } />
                  <Route path="/internal-requests-report" element={
                    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT]}>
                      <InternalRequestsReportPage />
                    </RoleProtectedRoute>
                  } />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
});

App.displayName = 'App';

export default App;