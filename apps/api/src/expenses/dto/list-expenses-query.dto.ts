import { IsOptional, IsUUID } from 'class-validator';
import { CompanyScopedQueryDto } from '../../common/dto/company-scoped-query.dto';

export class ListExpensesQueryDto extends CompanyScopedQueryDto {
  @IsOptional()
  @IsUUID()
  garden_id?: string;
}
