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
import { CreateGardenDto } from './dto/create-garden.dto';
import { GardensService } from './gardens.service';
import { UpdateGardenDto } from './dto/update-garden.dto';

@UseGuards(JwtAuthGuard)
@Controller('gardens')
export class GardensController {
  constructor(private readonly gardensService: GardensService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: CompanyScopedQueryDto) {
    return this.gardensService.findAll(
      this.requesterFrom(request),
      query.company_id,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const garden = await this.gardensService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );
    if (!garden) {
      throw new NotFoundException('Garden not found');
    }
    return garden;
  }

  @Post()
  create(@Body() dto: CreateGardenDto, @Req() request: Request) {
    return this.gardensService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGardenDto,
    @Req() request: Request,
  ) {
    const updated = await this.gardensService.update(
      id,
      dto,
      this.requesterFrom(request),
    );
    if (!updated) {
      throw new NotFoundException('Garden not found');
    }
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    const removed = await this.gardensService.remove(id, this.requesterFrom(request));
    if (!removed) {
      throw new NotFoundException('Garden not found');
    }
  }
}
