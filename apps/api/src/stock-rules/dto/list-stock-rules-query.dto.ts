import { IsOptional, IsUUID } from 'class-validator';
import { CompanyScopedQueryDto } from '../../common/dto/company-scoped-query.dto';

export class ListStockRulesQueryDto extends CompanyScopedQueryDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;
}
