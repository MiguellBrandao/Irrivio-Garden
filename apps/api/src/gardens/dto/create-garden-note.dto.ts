import { IsString, MaxLength } from 'class-validator'
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto'

export class CreateGardenNoteDto extends CompanyScopedBodyDto {
  @IsString()
  @MaxLength(1000)
  note!: string
}
