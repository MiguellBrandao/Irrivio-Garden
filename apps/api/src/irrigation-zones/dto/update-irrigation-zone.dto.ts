import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CompanyScopedBodyDto } from '../../common/dto/company-scoped-body.dto';
import {
  irrigationFrequencies,
  irrigationWeekDays,
} from '../irrigation-zones.constants';

export class UpdateIrrigationZoneDto extends CompanyScopedBodyDto {
  @IsOptional()
  @IsUUID()
  garden_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(irrigationFrequencies)
  frequency_type?: (typeof irrigationFrequencies)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  interval_days?: number;

  @IsOptional()
  @IsArray()
  @IsIn(irrigationWeekDays, { each: true })
  week_days?: (typeof irrigationWeekDays)[number][];

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
