import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';
import { expenseCategories } from '../expenses.constants';

export class UpdateExpenseDto extends CompanyScopedBodyDto {
  @IsOptional()
  @IsUUID()
  garden_id?: string;

  @IsOptional()
  @IsIn(expenseCategories)
  category?: (typeof expenseCategories)[number];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}
