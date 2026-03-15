import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { CompanyScopedQueryDto } from '../../common/dto/company-scoped-query.dto';

export class ListWorkLogsQueryDto extends CompanyScopedQueryDto {
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsOptional()
  @IsUUID()
  team_id?: string;

  @IsOptional()
  @IsUUID()
  garden_id?: string;

  @IsOptional()
  @IsISO8601()
  start_from?: string;

  @IsOptional()
  @IsISO8601()
  start_to?: string;
}
