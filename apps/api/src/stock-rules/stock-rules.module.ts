import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { StockRulesController } from './stock-rules.controller';
import { StockRulesService } from './stock-rules.service';

@Module({
  imports: [CompaniesModule],
  controllers: [StockRulesController],
  providers: [StockRulesService],
})
export class StockRulesModule {}
