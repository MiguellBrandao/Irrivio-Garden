import { IsString, MaxLength } from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

export class CreateTeamDto extends CompanyScopedBodyDto {
  @IsString()
  @MaxLength(150)
  name!: string;
}
