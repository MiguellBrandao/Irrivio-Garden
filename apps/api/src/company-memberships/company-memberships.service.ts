import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CompanyMembershipRole } from '../common/types/company-membership-role.type';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import {
  companyMembershipTeams,
  companyMemberships,
  teams,
  users,
} from '../db/schema';
import { CreateCompanyMembershipDto } from './dto/create-company-membership.dto';
import { UpdateCompanyMembershipDto } from './dto/update-company-membership.dto';

type Requester = {
  id: string;
};

type CompanyMembershipBaseRow = {
  id: string;
  company_id: string;
  user_id: string | null;
  email: string | null;
  role: CompanyMembershipRole;
  name: string;
  phone: string | null;
  active: boolean;
  created_at: Date;
};

@Injectable()
export class CompanyMembershipsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, companyId?: string) {
    const accessibleMemberships =
      await this.companiesService.resolveAccessibleCompanyMemberships(
        requester.id,
        companyId,
      );

    if (accessibleMemberships.length === 0) {
      return [];
    }

    const accessibleCompanyIds = accessibleMemberships.map(
      (membership) => membership.company_id,
    );
    const roleMap = new Map<string, CompanyMembershipRole>(
      accessibleMemberships.map(
        (membership): [string, CompanyMembershipRole] => [
        membership.company_id,
        membership.role,
        ],
      ),
    );

    const rows = (await db
      .select({
        id: companyMemberships.id,
        company_id: companyMemberships.companyId,
        user_id: companyMemberships.userId,
        email: users.email,
        role: companyMemberships.role,
        name: companyMemberships.name,
        phone: companyMemberships.phone,
        active: companyMemberships.active,
        created_at: companyMemberships.createdAt,
      })
      .from(companyMemberships)
      .leftJoin(users, eq(companyMemberships.userId, users.id))
      .where(inArray(companyMemberships.companyId, accessibleCompanyIds))
      .orderBy(desc(companyMemberships.createdAt))) as CompanyMembershipBaseRow[];

    const withTeams = await this.attachTeamIds(rows);

    return withTeams.map((membership) => {
      const requesterRole = roleMap.get(membership.company_id);

      if (requesterRole === 'admin' || membership.user_id === requester.id) {
        return membership;
      }

      return this.toPublicCompanyMembershipView(membership);
    });
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const membership = await this.findCompanyMembershipRecordById(id);
    if (!membership) {
      return null;
    }

    if (companyId && companyId !== membership.company_id) {
      return null;
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        membership.company_id,
      );

    const [withTeams] = await this.attachTeamIds([membership]);

    if (
      requesterMembership.role === 'admin' ||
      membership.user_id === requester.id
    ) {
      return withTeams;
    }

    return this.toPublicCompanyMembershipView(withTeams);
  }

  async create(dto: CreateCompanyMembershipDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);

    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedTeamIds = this.normalizeTeamIds(dto.team_ids);
    await this.assertValidTeamIds(normalizedTeamIds, dto.company_id);

    return db.transaction(async (tx) => {
      const existingUsers = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      let userId = existingUsers[0]?.id;

      if (!userId) {
        const passwordHash = await hash(dto.password, 10);

        const insertedUsers = await tx
          .insert(users)
          .values({
            email: normalizedEmail,
            passwordHash,
          })
          .returning({ id: users.id });

        userId = insertedUsers[0]?.id;
      }

      if (!userId) {
        throw new BadRequestException('Failed to create user');
      }

      const existingMembership = await tx
        .select({ id: companyMemberships.id })
        .from(companyMemberships)
        .where(
          and(
            eq(companyMemberships.userId, userId),
            eq(companyMemberships.companyId, dto.company_id),
          ),
        )
        .limit(1);

      if (existingMembership[0]) {
        throw new ConflictException(
          'Company membership already exists for this company and user',
        );
      }

      const insertedMemberships = (await tx
        .insert(companyMemberships)
        .values({
          companyId: dto.company_id,
          userId,
          role: dto.role,
          name: dto.name,
          phone: dto.phone,
          active: dto.active ?? true,
        })
        .returning({
          id: companyMemberships.id,
          company_id: companyMemberships.companyId,
          user_id: companyMemberships.userId,
          role: companyMemberships.role,
          name: companyMemberships.name,
          phone: companyMemberships.phone,
          active: companyMemberships.active,
          created_at: companyMemberships.createdAt,
        })) as CompanyMembershipBaseRow[];

      const companyMembership = insertedMemberships[0];
      if (!companyMembership) {
        throw new BadRequestException('Failed to create company membership');
      }

      if (normalizedTeamIds.length > 0) {
        await tx.insert(companyMembershipTeams).values(
          normalizedTeamIds.map((teamId) => ({
            companyId: dto.company_id,
            companyMembershipId: companyMembership.id,
            teamId,
          })),
        );
      }

      return {
        ...companyMembership,
        email: normalizedEmail,
        team_ids: normalizedTeamIds,
      };
    });
  }

  async update(id: string, dto: UpdateCompanyMembershipDto, requester: Requester) {
    const target = await this.findCompanyMembershipRecordById(id);
    if (!target) {
      return null;
    }

    if (dto.company_id !== target.company_id) {
      throw new BadRequestException(
        'company_id must match the company membership company_id',
      );
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        target.company_id,
      );

    if (requesterMembership.role !== 'admin') {
      if (target.user_id !== requester.id) {
        throw new ForbiddenException('You can only update your own profile');
      }

      if (
        dto.user_id !== undefined ||
        dto.role !== undefined ||
        dto.team_ids !== undefined ||
        dto.active !== undefined
      ) {
        throw new ForbiddenException(
          'Employees can only update their own name and phone',
        );
      }
    }

    const setPayload: {
      userId?: string;
      role?: CompanyMembershipRole;
      name?: string;
      phone?: string;
      active?: boolean;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: target.company_id,
    };

    if (dto.user_id !== undefined) {
      await this.assertUserExists(dto.user_id);
      await this.assertCompanyMembershipDoesNotExistForCompany(
        dto.user_id,
        target.company_id,
        id,
      );
      setPayload.userId = dto.user_id;
      responsePayload.user_id = dto.user_id;
    }
    if (dto.role !== undefined) {
      setPayload.role = dto.role;
      responsePayload.role = dto.role;
    }
    if (dto.name !== undefined) {
      setPayload.name = dto.name;
      responsePayload.name = dto.name;
    }
    if (dto.phone !== undefined) {
      setPayload.phone = dto.phone;
      responsePayload.phone = dto.phone;
    }
    if (dto.active !== undefined) {
      setPayload.active = dto.active;
      responsePayload.active = dto.active;
    }
    if (dto.team_ids !== undefined) {
      responsePayload.team_ids = this.normalizeTeamIds(dto.team_ids);
    }

    if (Object.keys(setPayload).length === 0 && dto.team_ids === undefined) {
      throw new BadRequestException('No fields provided for update');
    }

    if (dto.team_ids !== undefined) {
      await this.assertValidTeamIds(
        this.normalizeTeamIds(dto.team_ids),
        target.company_id,
      );
    }

    return db.transaction(async (tx) => {
      if (Object.keys(setPayload).length > 0) {
        const updatedRows = await tx
          .update(companyMemberships)
          .set(setPayload)
          .where(eq(companyMemberships.id, id))
          .returning({ id: companyMemberships.id });

        if (updatedRows.length === 0) {
          return null;
        }
      }

      if (dto.team_ids !== undefined) {
        const teamIds = this.normalizeTeamIds(dto.team_ids);
        await tx
          .delete(companyMembershipTeams)
          .where(
            and(
              eq(companyMembershipTeams.companyMembershipId, id),
              eq(companyMembershipTeams.companyId, target.company_id),
            ),
          );
        if (teamIds.length > 0) {
          await tx.insert(companyMembershipTeams).values(
            teamIds.map((teamId) => ({
              companyId: target.company_id,
              companyMembershipId: id,
              teamId,
            })),
          );
        }
      }

      return responsePayload;
    });
  }

  async remove(id: string, requester: Requester) {
    const target = await this.findCompanyMembershipRecordById(id);
    if (!target) {
      return false;
    }

    await this.companiesService.assertAdminAccess(requester.id, target.company_id);

    return db.transaction(async (tx) => {
      const deletedMemberships = await tx
        .delete(companyMemberships)
        .where(eq(companyMemberships.id, id))
        .returning({ id: companyMemberships.id, user_id: companyMemberships.userId });

      if (deletedMemberships.length === 0) {
        return false;
      }

      const userId = deletedMemberships[0]?.user_id;
      if (userId) {
        const remainingMemberships = await tx
          .select({ id: companyMemberships.id })
          .from(companyMemberships)
          .where(eq(companyMemberships.userId, userId))
          .limit(1);

        if (remainingMemberships.length === 0) {
          await tx.delete(users).where(eq(users.id, userId));
        }
      }

      return true;
    });
  }

  private normalizeTeamIds(teamIds?: string[]): string[] {
    if (!teamIds) {
      return [];
    }

    return [...new Set(teamIds.map((value) => value.trim()).filter(Boolean))];
  }

  private async assertValidTeamIds(teamIds: string[], companyId: string) {
    if (teamIds.length === 0) {
      return;
    }

    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.companyId, companyId), inArray(teams.id, teamIds)));

    const existingIds = new Set(existing.map((row) => row.id));
    const invalidTeamIds = teamIds.filter((teamId) => !existingIds.has(teamId));

    if (invalidTeamIds.length > 0) {
      throw new BadRequestException({
        message: 'Invalid team_ids for company',
        invalid_team_ids: invalidTeamIds,
      });
    }
  }

  private async attachTeamIds(rows: CompanyMembershipBaseRow[]) {
    if (rows.length === 0) {
      return [];
    }

    const memberships = await db
      .select({
        company_membership_id: companyMembershipTeams.companyMembershipId,
        team_id: companyMembershipTeams.teamId,
      })
      .from(companyMembershipTeams)
      .where(
        inArray(
          companyMembershipTeams.companyMembershipId,
          rows.map((row) => row.id),
        ),
      );

    const map = new Map<string, string[]>();
    for (const membership of memberships) {
      const current = map.get(membership.company_membership_id) ?? [];
      current.push(membership.team_id);
      map.set(membership.company_membership_id, current);
    }

    return rows.map((row) => ({
      ...row,
      team_ids: map.get(row.id) ?? [],
    }));
  }

  private toPublicCompanyMembershipView(
    companyMembership: CompanyMembershipBaseRow & { team_ids: string[] },
  ) {
    const { user_id, email, active, created_at, ...baseCompanyMembership } =
      companyMembership;
    return baseCompanyMembership;
  }

  private async findCompanyMembershipRecordById(id: string) {
    const rows = (await db
      .select({
        id: companyMemberships.id,
        company_id: companyMemberships.companyId,
        user_id: companyMemberships.userId,
        email: users.email,
        role: companyMemberships.role,
        name: companyMemberships.name,
        phone: companyMemberships.phone,
        active: companyMemberships.active,
        created_at: companyMemberships.createdAt,
      })
      .from(companyMemberships)
      .leftJoin(users, eq(companyMemberships.userId, users.id))
      .where(eq(companyMemberships.id, id))
      .limit(1)) as CompanyMembershipBaseRow[];

    return rows[0] ?? null;
  }

  private async assertUserExists(userId: string) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!rows[0]) {
      throw new NotFoundException('User not found');
    }
  }

  private async assertCompanyMembershipDoesNotExistForCompany(
    userId: string,
    companyId: string,
    currentCompanyMembershipId: string,
  ) {
    const rows = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.userId, userId),
          eq(companyMemberships.companyId, companyId),
        ),
      )
      .limit(1);

    if (rows[0] && rows[0].id !== currentCompanyMembershipId) {
      throw new ConflictException(
        'Company membership already exists for this company and user',
      );
    }
  }
}
