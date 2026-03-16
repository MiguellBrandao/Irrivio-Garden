import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { IrrigationZonesController } from './irrigation-zones.controller';
import { IrrigationZonesService } from './irrigation-zones.service';

@Module({
  imports: [CompaniesModule],
  controllers: [IrrigationZonesController],
  providers: [IrrigationZonesService],
})
export class IrrigationZonesModule {}
