import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyScopedQueryDto } from '../common/dto/company-scoped-query.dto';
import { CreateIrrigationZoneDto } from './dto/create-irrigation-zone.dto';
import { ListIrrigationZonesQueryDto } from './dto/list-irrigation-zones-query.dto';
import { UpdateIrrigationZoneDto } from './dto/update-irrigation-zone.dto';
import { IrrigationZonesService } from './irrigation-zones.service';

@UseGuards(JwtAuthGuard)
@Controller('irrigation-zones')
export class IrrigationZonesController {
  constructor(
    private readonly irrigationZonesService: IrrigationZonesService,
  ) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(
    @Req() request: Request,
    @Query() query: ListIrrigationZonesQueryDto,
  ) {
    return this.irrigationZonesService.findAll(
      this.requesterFrom(request),
      query,
    );
  }

  @Get(':id')
  async findOne(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const irrigationZone = await this.irrigationZonesService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );

    if (!irrigationZone) {
      throw new NotFoundException('Irrigation zone not found');
    }

    return irrigationZone;
  }

  @Post()
  create(@Req() request: Request, @Body() dto: CreateIrrigationZoneDto) {
    return this.irrigationZonesService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIrrigationZoneDto,
  ) {
    const updated = await this.irrigationZonesService.update(
      id,
      dto,
      this.requesterFrom(request),
    );

    if (!updated) {
      throw new NotFoundException('Irrigation zone not found');
    }

    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const removed = await this.irrigationZonesService.remove(
      id,
      this.requesterFrom(request),
    );

    if (!removed) {
      throw new NotFoundException('Irrigation zone not found');
    }
  }
}
