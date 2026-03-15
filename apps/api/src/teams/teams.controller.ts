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
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';
import { UpdateTeamDto } from './dto/update-team.dto';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: CompanyScopedQueryDto) {
    return this.teamsService.findAll(
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
    const team = await this.teamsService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  @Post()
  create(@Body() dto: CreateTeamDto, @Req() request: Request) {
    return this.teamsService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamDto,
    @Req() request: Request,
  ) {
    const updated = await this.teamsService.update(
      id,
      dto,
      this.requesterFrom(request),
    );

    if (!updated) {
      throw new NotFoundException('Team not found');
    }

    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    const removed = await this.teamsService.remove(id, this.requesterFrom(request));
    if (!removed) {
      throw new NotFoundException('Team not found');
    }
  }
}
