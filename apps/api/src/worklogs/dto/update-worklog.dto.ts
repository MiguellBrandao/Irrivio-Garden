import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

export class UpdateWorkLogDto extends CompanyScopedBodyDto {
  @IsOptional()
  @IsISO8601()
  start_time?: string;

  @IsOptional()
  @IsISO8601()
  end_time?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
