import { IsOptional, IsUUID } from 'class-validator';

export class CompanyScopedQueryDto {
  @IsOptional()
  @IsUUID()
  company_id?: string;
}
