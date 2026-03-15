import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { teams } from '../db/schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

type Requester = {
  id: string;
};

@Injectable()
export class TeamsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, companyId?: string) {
    const accessibleCompanyIds =
      await this.companiesService.resolveAccessibleCompanyIds(
        requester.id,
        companyId,
      );

    if (accessibleCompanyIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: teams.id,
        company_id: teams.companyId,
        name: teams.name,
        created_at: teams.createdAt,
      })
      .from(teams)
      .where(inArray(teams.companyId, accessibleCompanyIds))
      .orderBy(desc(teams.createdAt));
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const team = await this.findTeamById(id);
    if (!team) {
      return null;
    }

    if (companyId && companyId !== team.company_id) {
      return null;
    }

    await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      team.company_id,
    );

    return team;
  }

  async create(dto: CreateTeamDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);

    const name = dto.name.trim();
    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.companyId, dto.company_id), eq(teams.name, name)))
      .limit(1);

    if (existing[0]) {
      throw new ConflictException('Team name already exists in this company');
    }

    const rows = await db
      .insert(teams)
      .values({ companyId: dto.company_id, name })
      .returning({
        id: teams.id,
        company_id: teams.companyId,
        name: teams.name,
        created_at: teams.createdAt,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateTeamDto, requester: Requester) {
    const current = await this.findTeamById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the team company_id',
      );
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const setPayload: { name?: string } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Team name cannot be empty');
      }
      setPayload.name = trimmed;
      responsePayload.name = trimmed;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    if (setPayload.name) {
      const existing = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.companyId, current.company_id),
            eq(teams.name, setPayload.name),
          ),
        )
        .limit(1);

      if (existing[0] && existing[0].id !== id) {
        throw new ConflictException('Team name already exists in this company');
      }
    }

    const updated = await db
      .update(teams)
      .set(setPayload)
      .where(eq(teams.id, id))
      .returning({ id: teams.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findTeamById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(teams)
      .where(eq(teams.id, id))
      .returning({ id: teams.id });

    return deleted.length > 0;
  }

  private async findTeamById(id: string) {
    const rows = await db
      .select({
        id: teams.id,
        company_id: teams.companyId,
        name: teams.name,
        created_at: teams.createdAt,
      })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    return rows[0] ?? null;
  }
}
