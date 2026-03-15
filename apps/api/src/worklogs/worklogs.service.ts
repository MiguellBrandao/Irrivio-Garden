import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { companyMembershipTeams, tasks, workLogs } from '../db/schema';
import { CreateWorkLogDto } from './dto/create-worklog.dto';
import { ListWorkLogsQueryDto } from './dto/list-worklogs-query.dto';
import { UpdateWorkLogDto } from './dto/update-worklog.dto';

type Requester = {
  id: string;
};

@Injectable()
export class WorkLogsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListWorkLogsQueryDto) {
    const accessibleMemberships =
      await this.companiesService.resolveAccessibleCompanyMemberships(
        requester.id,
        query.company_id,
      );

    if (accessibleMemberships.length === 0) {
      return [];
    }

    const accessibleCompanyIds = accessibleMemberships.map(
      (membership) => membership.company_id,
    );
    const adminCompanyIds = new Set(
      accessibleMemberships
        .filter((membership) => membership.role === 'admin')
        .map((membership) => membership.company_id),
    );
    const employeeMemberships = accessibleMemberships.filter(
      (membership) => membership.role === 'employee',
    );
    const filters = this.buildFilters(query, accessibleCompanyIds);
    const rows = await db
      .select({
        id: workLogs.id,
        company_id: workLogs.companyId,
        task_id: workLogs.taskId,
        team_id: workLogs.teamId,
        garden_id: tasks.gardenId,
        start_time: workLogs.startTime,
        end_time: workLogs.endTime,
        description: workLogs.notes,
        created_at: workLogs.createdAt,
      })
      .from(workLogs)
      .innerJoin(tasks, eq(workLogs.taskId, tasks.id))
      .where(and(...filters))
      .orderBy(desc(workLogs.createdAt));

    if (employeeMemberships.length === 0) {
      return rows;
    }

    const visibleTeamIds = new Set(
      await this.getVisibleTeamIdsForMemberships(
        employeeMemberships.map((membership) => membership.id),
        employeeMemberships.map((membership) => membership.company_id),
      ),
    );

    return rows.filter((workLog) => {
      if (adminCompanyIds.has(workLog.company_id)) {
        return true;
      }

      return visibleTeamIds.has(workLog.team_id);
    });
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const workLog = await this.findWorkLogById(id);
    if (!workLog) {
      return null;
    }

    if (companyId && companyId !== workLog.company_id) {
      return null;
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      workLog.company_id,
    );

    if (requesterMembership.role === 'employee') {
      const visibleTeamIds = await this.getVisibleTeamIdsForMemberships(
        [requesterMembership.id],
        [workLog.company_id],
      );

      if (!visibleTeamIds.includes(workLog.team_id)) {
        return null;
      }
    }

    return workLog;
  }

  async create(dto: CreateWorkLogDto, requester: Requester) {
    this.assertStartBeforeEnd(dto.start_time, dto.end_time);
    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      dto.company_id,
    );

    const task = await this.findTask(dto.task_id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.company_id !== dto.company_id) {
      throw new BadRequestException('Task does not belong to this company');
    }

    if (!task.team_id) {
      throw new BadRequestException('Task has no team assigned');
    }
    if (task.team_id !== dto.team_id) {
      throw new BadRequestException('team_id must match task team_id');
    }

    if (requesterMembership.role === 'employee') {
      await this.assertMembershipInTeam(requesterMembership.id, dto.company_id, dto.team_id);
    }

    const rows = await db
      .insert(workLogs)
      .values({
        companyId: dto.company_id,
        taskId: dto.task_id,
        teamId: dto.team_id,
        startTime: new Date(dto.start_time),
        endTime: dto.end_time ? new Date(dto.end_time) : null,
        notes: dto.description,
      })
      .returning({
        id: workLogs.id,
        company_id: workLogs.companyId,
        task_id: workLogs.taskId,
        team_id: workLogs.teamId,
        start_time: workLogs.startTime,
        end_time: workLogs.endTime,
        description: workLogs.notes,
        created_at: workLogs.createdAt,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateWorkLogDto, requester: Requester) {
    const current = await this.findWorkLogById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the work log company_id',
      );
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      current.company_id,
    );

    if (requesterMembership.role === 'employee') {
      await this.assertMembershipInTeam(
        requesterMembership.id,
        current.company_id,
        current.team_id,
      );
    }

    const startTime =
      dto.start_time ?? (current.start_time?.toISOString() ?? undefined);
    const endTime =
      dto.end_time ?? (current.end_time?.toISOString() ?? undefined);
    this.assertStartBeforeEnd(startTime, endTime);

    const setPayload: {
      startTime?: Date;
      endTime?: Date | null;
      notes?: string;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.start_time !== undefined) {
      setPayload.startTime = new Date(dto.start_time);
      responsePayload.start_time = dto.start_time;
    }
    if (dto.end_time !== undefined) {
      setPayload.endTime = new Date(dto.end_time);
      responsePayload.end_time = dto.end_time;
    }
    if (dto.description !== undefined) {
      setPayload.notes = dto.description;
      responsePayload.description = dto.description;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(workLogs)
      .set(setPayload)
      .where(eq(workLogs.id, id))
      .returning({ id: workLogs.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findWorkLogById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(workLogs)
      .where(eq(workLogs.id, id))
      .returning({ id: workLogs.id });
    return deleted.length > 0;
  }

  private buildFilters(query: ListWorkLogsQueryDto, companyIds: string[]) {
    const filters: SQL<unknown>[] = [inArray(workLogs.companyId, companyIds)];
    if (query.task_id) filters.push(eq(workLogs.taskId, query.task_id));
    if (query.team_id) filters.push(eq(workLogs.teamId, query.team_id));
    if (query.garden_id) filters.push(eq(tasks.gardenId, query.garden_id));
    if (query.start_from)
      filters.push(gte(workLogs.startTime, new Date(query.start_from)));
    if (query.start_to)
      filters.push(lte(workLogs.startTime, new Date(query.start_to)));
    return filters;
  }

  private assertStartBeforeEnd(start?: string, end?: string) {
    if (!start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid start_time or end_time');
    }
    if (endDate < startDate) {
      throw new BadRequestException('end_time must be after start_time');
    }
  }

  private async findTask(taskId: string) {
    const rows = await db
      .select({
        id: tasks.id,
        company_id: tasks.companyId,
        team_id: tasks.teamId,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async findWorkLogById(id: string) {
    const rows = await db
      .select({
        id: workLogs.id,
        company_id: workLogs.companyId,
        task_id: workLogs.taskId,
        team_id: workLogs.teamId,
        garden_id: tasks.gardenId,
        start_time: workLogs.startTime,
        end_time: workLogs.endTime,
        description: workLogs.notes,
        created_at: workLogs.createdAt,
      })
      .from(workLogs)
      .innerJoin(tasks, eq(workLogs.taskId, tasks.id))
      .where(eq(workLogs.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private async assertMembershipInTeam(
    companyMembershipId: string,
    companyId: string,
    teamId: string,
  ) {
    const teamMembership = await db
      .select({ team_id: companyMembershipTeams.teamId })
      .from(companyMembershipTeams)
      .where(
        and(
          eq(companyMembershipTeams.companyMembershipId, companyMembershipId),
          eq(companyMembershipTeams.companyId, companyId),
          eq(companyMembershipTeams.teamId, teamId),
        ),
      )
      .limit(1);

    if (!teamMembership[0]) {
      throw new ForbiddenException('You cannot access work logs for this team');
    }
  }

  private async getVisibleTeamIdsForMemberships(
    companyMembershipIds: string[],
    companyIds: string[],
  ) {
    if (companyMembershipIds.length === 0 || companyIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ team_id: companyMembershipTeams.teamId })
      .from(companyMembershipTeams)
      .where(
        and(
          inArray(
            companyMembershipTeams.companyMembershipId,
            companyMembershipIds,
          ),
          inArray(companyMembershipTeams.companyId, companyIds),
        ),
      );

    return [...new Set(rows.map((row) => row.team_id))];
  }
}
