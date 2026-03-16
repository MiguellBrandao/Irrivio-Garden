import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
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

  @IsDateString()
  date!: string;
}
