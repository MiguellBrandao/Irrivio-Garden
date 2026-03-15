import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import {
  companyMembershipTeams,
  gardens,
  tasks,
  teams,
} from '../db/schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { TaskType } from './tasks.constants';

type Requester = {
  id: string;
};

@Injectable()
export class TasksService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListTasksQueryDto) {
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
        id: tasks.id,
        company_id: tasks.companyId,
        garden_id: tasks.gardenId,
        team_id: tasks.teamId,
        date: tasks.date,
        start_time: tasks.startTime,
        end_time: tasks.endTime,
        task_type: tasks.taskType,
        description: tasks.description,
        created_at: tasks.createdAt,
      })
      .from(tasks)
      .where(and(...filters))
      .orderBy(desc(tasks.date), desc(tasks.startTime), desc(tasks.createdAt));

    if (employeeMemberships.length === 0) {
      return rows;
    }

    const visibleTeamIds = new Set(
      await this.getVisibleTeamIdsForMemberships(
        employeeMemberships.map((membership) => membership.id),
        employeeMemberships.map((membership) => membership.company_id),
      ),
    );

    return rows.filter((task) => {
      if (adminCompanyIds.has(task.company_id)) {
        return true;
      }

      return task.team_id !== null && visibleTeamIds.has(task.team_id);
    });
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const task = await this.findTaskById(id);
    if (!task) {
      return null;
    }

    if (companyId && companyId !== task.company_id) {
      return null;
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      task.company_id,
    );

    if (requesterMembership.role === 'employee') {
      const visibleTeamIds = await this.getVisibleTeamIdsForMemberships(
        [requesterMembership.id],
        [task.company_id],
      );

      if (!task.team_id || !visibleTeamIds.includes(task.team_id)) {
        return null;
      }
    }

    return task;
  }

  async create(dto: CreateTaskDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);
    await this.assertGardenExistsInCompany(dto.garden_id, dto.company_id);
    await this.assertTeamExistsInCompany(dto.team_id, dto.company_id);

    const rows = await db
      .insert(tasks)
      .values({
        companyId: dto.company_id,
        gardenId: dto.garden_id,
        teamId: dto.team_id,
        date: dto.date,
        startTime: dto.start_time,
        endTime: dto.end_time,
        taskType: dto.task_type,
        description: dto.description,
      })
      .returning({
        id: tasks.id,
        company_id: tasks.companyId,
        garden_id: tasks.gardenId,
        team_id: tasks.teamId,
        date: tasks.date,
        start_time: tasks.startTime,
        end_time: tasks.endTime,
        task_type: tasks.taskType,
        description: tasks.description,
        created_at: tasks.createdAt,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateTaskDto, requester: Requester) {
    const current = await this.findTaskById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException('company_id must match the task company_id');
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    if (dto.garden_id !== undefined) {
      await this.assertGardenExistsInCompany(dto.garden_id, current.company_id);
    }
    if (dto.team_id !== undefined) {
      await this.assertTeamExistsInCompany(dto.team_id, current.company_id);
    }

    const setPayload: {
      gardenId?: string;
      teamId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      taskType?: TaskType;
      description?: string;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.garden_id !== undefined) {
      setPayload.gardenId = dto.garden_id;
      responsePayload.garden_id = dto.garden_id;
    }
    if (dto.team_id !== undefined) {
      setPayload.teamId = dto.team_id;
      responsePayload.team_id = dto.team_id;
    }
    if (dto.date !== undefined) {
      setPayload.date = dto.date;
      responsePayload.date = dto.date;
    }
    if (dto.start_time !== undefined) {
      setPayload.startTime = dto.start_time;
      responsePayload.start_time = dto.start_time;
    }
    if (dto.end_time !== undefined) {
      setPayload.endTime = dto.end_time;
      responsePayload.end_time = dto.end_time;
    }
    if (dto.task_type !== undefined) {
      setPayload.taskType = dto.task_type;
      responsePayload.task_type = dto.task_type;
    }
    if (dto.description !== undefined) {
      setPayload.description = dto.description;
      responsePayload.description = dto.description;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(tasks)
      .set(setPayload)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findTaskById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });

    return deleted.length > 0;
  }

  private buildFilters(query: ListTasksQueryDto, companyIds: string[]) {
    const filters: SQL<unknown>[] = [inArray(tasks.companyId, companyIds)];
    if (query.garden_id) filters.push(eq(tasks.gardenId, query.garden_id));
    if (query.team_id) filters.push(eq(tasks.teamId, query.team_id));
    if (query.date_from) filters.push(gte(tasks.date, query.date_from));
    if (query.date_to) filters.push(lte(tasks.date, query.date_to));
    return filters;
  }

  private async assertGardenExistsInCompany(gardenId: string, companyId: string) {
    const rows = await db
      .select({ id: gardens.id })
      .from(gardens)
      .where(and(eq(gardens.id, gardenId), eq(gardens.companyId, companyId)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Garden not found');
    }
  }

  private async assertTeamExistsInCompany(teamId: string, companyId: string) {
    const rows = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.companyId, companyId)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Team not found');
    }
  }

  private async findTaskById(id: string) {
    const rows = await db
      .select({
        id: tasks.id,
        company_id: tasks.companyId,
        garden_id: tasks.gardenId,
        team_id: tasks.teamId,
        date: tasks.date,
        start_time: tasks.startTime,
        end_time: tasks.endTime,
        task_type: tasks.taskType,
        description: tasks.description,
        created_at: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    return rows[0] ?? null;
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
