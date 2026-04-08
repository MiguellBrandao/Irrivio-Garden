import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class UpdateGardenDto extends CompanyScopedBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  client_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsNumber()
  monthly_price?: number;

  @IsOptional()
  @IsBoolean()
  is_regular_service?: boolean;

  @IsOptional()
  @IsBoolean()
  show_in_calendar?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'biweekly', 'monthly'])
  maintenance_frequency?: 'weekly' | 'biweekly' | 'monthly' | null;

  @IsOptional()
  @IsString()
  @IsIn([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  maintenance_day_of_week?:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
    | null;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_REGEX, {
    message: 'maintenance_anchor_date must be in YYYY-MM-DD format',
  })
  maintenance_anchor_date?: string | null;

  @IsOptional()
  @IsString()
  @Matches(TIME_ONLY_REGEX, {
    message: 'maintenance_start_time must be in HH:mm or HH:mm:ss format',
  })
  maintenance_start_time?: string | null;

  @IsOptional()
  @IsString()
  @Matches(TIME_ONLY_REGEX, {
    message: 'maintenance_end_time must be in HH:mm or HH:mm:ss format',
  })
  maintenance_end_time?: string | null;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_REGEX, {
    message: 'start_date must be in YYYY-MM-DD format',
  })
  start_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  billing_day?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'cancelled'])
  status?: 'active' | 'paused' | 'cancelled';

  @IsOptional()
  @IsString()
  notes?: string;
}
