import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

export class UpdateProductUsageDto extends CompanyScopedBodyDto {
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
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
