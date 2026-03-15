import { IsUUID } from 'class-validator';

export class CompanyScopedBodyDto {
  @IsUUID()
  company_id!: string;
}
