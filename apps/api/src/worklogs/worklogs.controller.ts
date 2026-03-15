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
import { CreateWorkLogDto } from './dto/create-worklog.dto';
import { ListWorkLogsQueryDto } from './dto/list-worklogs-query.dto';
import { UpdateWorkLogDto } from './dto/update-worklog.dto';
import { WorkLogsService } from './worklogs.service';

@UseGuards(JwtAuthGuard)
@Controller('worklogs')
export class WorkLogsController {
  constructor(private readonly workLogsService: WorkLogsService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: ListWorkLogsQueryDto) {
    return this.workLogsService.findAll(this.requesterFrom(request), query);
  }

  @Get(':id')
  async findOne(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const workLog = await this.workLogsService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );
    if (!workLog) {
      throw new NotFoundException('Work log not found');
    }
    return workLog;
  }

  @Post()
  create(@Req() request: Request, @Body() dto: CreateWorkLogDto) {
    return this.workLogsService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkLogDto,
  ) {
    const updated = await this.workLogsService.update(
      id,
      dto,
      this.requesterFrom(request),
    );
    if (!updated) {
      throw new NotFoundException('Work log not found');
    }
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const removed = await this.workLogsService.remove(
      id,
      this.requesterFrom(request),
    );
    if (!removed) {
      throw new NotFoundException('Work log not found');
    }
  }
}
