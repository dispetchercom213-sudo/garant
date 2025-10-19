import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { MaterialsModule } from './materials/materials.module';
import { ConcreteMarksModule } from './concrete-marks/concrete-marks.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ReportsModule } from './reports/reports.module';
import { ScaleModule } from './scale/scale.module';
import { SettingsModule } from './settings/settings.module';
import { TasksModule } from './tasks/tasks.module';
import { InternalRequestsModule } from './internal-requests/internal-requests.module';
import { AdditionalServicesModule } from './additional-services/additional-services.module';
import { DriverWeighingHistoryModule } from './driver-weighing-history/driver-weighing-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    CounterpartiesModule,
    WarehousesModule,
    MaterialsModule,
    ConcreteMarksModule,
    OrdersModule,
    InvoicesModule,
    DriversModule,
    VehiclesModule,
    ReportsModule,
    ScaleModule,
    SettingsModule,
    TasksModule,
    InternalRequestsModule,
    AdditionalServicesModule,
    DriverWeighingHistoryModule,
  ],
})
export class AppModule {}
