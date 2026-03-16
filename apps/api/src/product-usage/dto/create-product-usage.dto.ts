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

export class CreateProductUsageDto extends CompanyScopedBodyDto {
  @IsUUID()
  product_id!: string;

  @IsUUID()
  garden_id!: string;

  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsOptional()
  @IsUUID()
  company_membership_id?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
