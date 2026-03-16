import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';
import {
  STOCK_RULE_OPERATORS,
  type StockRuleOperator,
} from '../stock-rules.constants';

export class CreateStockRuleDto extends CompanyScopedBodyDto {
  @IsUUID()
  product_id!: string;

  @IsIn(STOCK_RULE_OPERATORS)
  operator!: StockRuleOperator;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  threshold_quantity!: number;

  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((email) =>
            typeof email === 'string' ? email.trim().toLowerCase() : email,
          )
          .filter(Boolean)
      : value,
  )
  @IsEmail({}, { each: true })
  emails!: string[];
}
