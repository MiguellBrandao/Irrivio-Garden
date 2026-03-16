import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CompanyMembershipsModule } from './company-memberships/company-memberships.module';
import { CompaniesModule } from './companies/companies.module';
import { ExpensesModule } from './expenses/expenses.module';
import { GardensModule } from './gardens/gardens.module';
import { IrrigationZonesModule } from './irrigation-zones/irrigation-zones.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductUsageModule } from './product-usage/product-usage.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { StockRulesModule } from './stock-rules/stock-rules.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';
import { WorkLogsModule } from './worklogs/worklogs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CompaniesModule,
    CompanyMembershipsModule,
    UsersModule,
    AuthModule,
    ExpensesModule,
    GardensModule,
    IrrigationZonesModule,
    PaymentsModule,
    ProductsModule,
    StockRulesModule,
    ProductUsageModule,
    QuotesModule,
    TasksModule,
    TeamsModule,
    WorkLogsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
