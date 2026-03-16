import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
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
  @IsDateString()
  date?: string;
}
