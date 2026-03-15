import { Global, Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Global()
@Module({
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
