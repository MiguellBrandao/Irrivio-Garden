import { Module } from '@nestjs/common';
import { CompanyMembershipsController } from './company-memberships.controller';
import { CompanyMembershipsService } from './company-memberships.service';

@Module({
  controllers: [CompanyMembershipsController],
  providers: [CompanyMembershipsService],
  exports: [CompanyMembershipsService],
})
export class CompanyMembershipsModule {}
