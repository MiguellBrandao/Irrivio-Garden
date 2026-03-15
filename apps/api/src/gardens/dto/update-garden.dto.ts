import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

export class UpdateGardenDto extends CompanyScopedBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  client_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsNumber()
  monthly_price?: number;

  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'biweekly', 'monthly'])
  maintenance_frequency?: 'weekly' | 'biweekly' | 'monthly';

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  billing_day?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'cancelled'])
  status?: 'active' | 'paused' | 'cancelled';

  @IsOptional()
  @IsString()
  notes?: string;
}
