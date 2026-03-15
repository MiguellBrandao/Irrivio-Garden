import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

export class CreateWorkLogDto extends CompanyScopedBodyDto {
  @IsUUID()
  task_id!: string;

  @IsUUID()
  team_id!: string;

  @IsISO8601()
  start_time!: string;

  @IsOptional()
  @IsISO8601()
  end_time?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
