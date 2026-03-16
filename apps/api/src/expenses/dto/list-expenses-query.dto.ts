import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { CompanyScopedQueryDto } from '../../common/dto/company-scoped-query.dto';

export class ListExpensesQueryDto extends CompanyScopedQueryDto {
  @IsOptional()
  @IsUUID()
  garden_id?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
