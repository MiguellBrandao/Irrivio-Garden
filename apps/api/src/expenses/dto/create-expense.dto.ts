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

export class CreateExpenseDto extends CompanyScopedBodyDto {
  @IsUUID()
  garden_id!: string;

  @IsIn(expenseCategories)
  category!: (typeof expenseCategories)[number];

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  date!: string;
}
