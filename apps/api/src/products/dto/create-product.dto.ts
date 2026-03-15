import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';
import { PRODUCT_UNITS, type ProductUnit } from '../products.constants';

export class CreateProductDto extends CompanyScopedBodyDto {
  @IsString()
  name!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(PRODUCT_UNITS)
  unit!: ProductUnit;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_quantity?: number;
}
