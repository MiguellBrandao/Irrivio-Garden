import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CompanyScopedQueryDto } from '../common/dto/company-scoped-query.dto'
import { CreateGardenNoteDto } from './dto/create-garden-note.dto'
import { GardenNotesService } from './garden-notes.service'

@UseGuards(JwtAuthGuard)
@Controller('gardens')
export class GardenNotesController {
  constructor(private readonly gardenNotesService: GardenNotesService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string }
    return { id: user.id }
  }

  @Get(':gardenId/notes')
  async list(
    @Param('gardenId', new ParseUUIDPipe()) gardenId: string,
    @Req() request: Request,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const notes = await this.gardenNotesService.listByGardenId(
      gardenId,
      this.requesterFrom(request),
      query.company_id,
    )
    if (!notes) {
      throw new NotFoundException('Garden not found')
    }
    return notes
  }

  @Post(':gardenId/notes')
  create(
    @Param('gardenId', new ParseUUIDPipe()) gardenId: string,
    @Body() dto: CreateGardenNoteDto,
    @Req() request: Request,
  ) {
    return this.gardenNotesService.create(
      gardenId,
      dto,
      this.requesterFrom(request),
    )
  }

  @Delete(':gardenId/notes/:noteId')
  @HttpCode(204)
  async remove(
    @Param('gardenId', new ParseUUIDPipe()) gardenId: string,
    @Param('noteId', new ParseUUIDPipe()) noteId: string,
    @Req() request: Request,
  ) {
    const removed = await this.gardenNotesService.remove(
      gardenId,
      noteId,
      this.requesterFrom(request),
    )
    if (!removed) {
      throw new NotFoundException('Garden note not found')
    }
  }
}
