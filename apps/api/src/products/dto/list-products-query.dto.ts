import { IsOptional, IsString } from 'class-validator';
import { CompanyScopedQueryDto } from '../../common/dto/company-scoped-query.dto';

export class ListProductsQueryDto extends CompanyScopedQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
