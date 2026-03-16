import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { CompanyScopedQueryDto } from '../../common/dto/company-scoped-query.dto';

export class ListProductUsageQueryDto extends CompanyScopedQueryDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsUUID()
  garden_id?: string;

  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsOptional()
  @IsUUID()
  company_membership_id?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
