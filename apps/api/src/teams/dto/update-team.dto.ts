import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

export class UpdateTeamDto extends CompanyScopedBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;
}
