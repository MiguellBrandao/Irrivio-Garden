import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { CompaniesService } from '../companies/companies.service'
import { db } from '../db'
import { companyMemberships, gardenNotes } from '../db/schema'
import { CreateGardenNoteDto } from './dto/create-garden-note.dto'
import { GardensService } from './gardens.service'

type Requester = {
  id: string
}

@Injectable()
export class GardenNotesService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly gardensService: GardensService,
  ) {}

  async listByGardenId(gardenId: string, requester: Requester, companyId?: string) {
    const garden = await this.gardensService.findById(gardenId, requester, companyId)
    if (!garden) {
      throw new NotFoundException('Garden not found')
    }

    const rows = await db
      .select({
        id: gardenNotes.id,
        company_id: gardenNotes.companyId,
        garden_id: gardenNotes.gardenId,
        company_membership_id: gardenNotes.companyMembershipId,
        created_by_user_id: gardenNotes.createdByUserId,
        company_membership_name: companyMemberships.name,
        note: gardenNotes.note,
        created_at: gardenNotes.createdAt,
      })
      .from(gardenNotes)
      .innerJoin(
        companyMemberships,
        eq(companyMemberships.id, gardenNotes.companyMembershipId),
      )
      .where(eq(gardenNotes.gardenId, gardenId))
      .orderBy(desc(gardenNotes.createdAt))

    return rows
  }

  async create(gardenId: string, dto: CreateGardenNoteDto, requester: Requester) {
    const garden = await this.gardensService.findById(
      gardenId,
      requester,
      dto.company_id,
    )
    if (!garden) {
      throw new NotFoundException('Garden not found')
    }

    const membership = await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      garden.company_id,
    )

    if (!dto.note.trim()) {
      throw new BadRequestException('Note must not be empty')
    }

    const rows = await db
      .insert(gardenNotes)
      .values({
        companyId: garden.company_id,
        gardenId,
        companyMembershipId: membership.id,
        createdByUserId: requester.id,
        note: dto.note.trim(),
      })
      .returning({
        id: gardenNotes.id,
        company_id: gardenNotes.companyId,
        garden_id: gardenNotes.gardenId,
        company_membership_id: gardenNotes.companyMembershipId,
        created_by_user_id: gardenNotes.createdByUserId,
        note: gardenNotes.note,
        created_at: gardenNotes.createdAt,
      })

    return rows[0]
  }

  async remove(gardenId: string, noteId: string, requester: Requester) {
    const noteRows = await db
      .select({
        id: gardenNotes.id,
        garden_id: gardenNotes.gardenId,
        company_id: gardenNotes.companyId,
        company_membership_id: gardenNotes.companyMembershipId,
        created_by_user_id: gardenNotes.createdByUserId,
      })
      .from(gardenNotes)
      .where(eq(gardenNotes.id, noteId))
      .limit(1)

    const note = noteRows[0]
    if (!note || note.garden_id !== gardenId) {
      return false
    }

    const garden = await this.gardensService.findById(gardenId, requester)
    if (!garden) {
      return false
    }

    const membership = await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      garden.company_id,
    )

    if (membership.role !== 'admin' && note.created_by_user_id !== requester.id) {
      throw new ForbiddenException('Only admins or the note author can delete this note')
    }

    const deleted = await db
      .delete(gardenNotes)
      .where(eq(gardenNotes.id, noteId))
      .returning({ id: gardenNotes.id })

    return deleted.length > 0
  }
}
