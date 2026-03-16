import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import {
  companyMembershipTeams,
  gardens,
  irrigationZones,
  tasks,
} from '../db/schema';
import { CreateIrrigationZoneDto } from './dto/create-irrigation-zone.dto';
import { ListIrrigationZonesQueryDto } from './dto/list-irrigation-zones-query.dto';
import { UpdateIrrigationZoneDto } from './dto/update-irrigation-zone.dto';
import type {
  IrrigationFrequency,
  IrrigationWeekDay,
} from './irrigation-zones.constants';

type Requester = {
  id: string;
};

@Injectable()
export class IrrigationZonesService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListIrrigationZonesQueryDto) {
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

    const filters: SQL<unknown>[] = [
      inArray(irrigationZones.companyId, accessibleCompanyIds),
    ];

    if (query.garden_id) {
      filters.push(eq(irrigationZones.gardenId, query.garden_id));
    }

    const rows = await db
      .select({
        id: irrigationZones.id,
        company_id: irrigationZones.companyId,
        garden_id: irrigationZones.gardenId,
        name: irrigationZones.name,
        frequency_type: irrigationZones.frequencyType,
        interval_days: irrigationZones.intervalDays,
        week_days: irrigationZones.weekDays,
        start_date: irrigationZones.startDate,
        start_time: irrigationZones.startTime,
        end_time: irrigationZones.endTime,
        active: irrigationZones.active,
        created_at: irrigationZones.createdAt,
      })
      .from(irrigationZones)
      .where(and(...filters))
      .orderBy(asc(irrigationZones.name), asc(irrigationZones.startTime));

    if (employeeMemberships.length === 0) {
      return rows;
    }

    const accessibleGardenIds = new Set(
      await this.getAccessibleGardenIdsForCompanyMemberships(
        employeeMemberships.map((membership) => membership.id),
        employeeMemberships.map((membership) => membership.company_id),
      ),
    );

    return rows.filter((row) => {
      if (adminCompanyIds.has(row.company_id)) {
        return true;
      }

      return accessibleGardenIds.has(row.garden_id);
    });
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const irrigationZone = await this.findIrrigationZoneById(id);
    if (!irrigationZone) {
      return null;
    }

    if (companyId && companyId !== irrigationZone.company_id) {
      return null;
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        irrigationZone.company_id,
      );

    if (requesterMembership.role === 'admin') {
      return irrigationZone;
    }

    const accessibleGardenIds =
      await this.getAccessibleGardenIdsForCompanyMemberships(
        [requesterMembership.id],
        [irrigationZone.company_id],
      );

    if (!accessibleGardenIds.includes(irrigationZone.garden_id)) {
      return null;
    }

    return irrigationZone;
  }

  async create(dto: CreateIrrigationZoneDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);
    await this.assertGardenExistsInCompany(dto.garden_id, dto.company_id);

    const normalizedName = dto.name.trim();
    if (!normalizedName) {
      throw new BadRequestException('name is required');
    }

    const normalizedWeekDays = this.normalizeWeekDays(dto.week_days);
    this.assertValidSchedule({
      frequency_type: dto.frequency_type,
      interval_days: dto.interval_days,
      week_days: normalizedWeekDays,
      start_time: dto.start_time,
      end_time: dto.end_time,
    });

    const rows = await db
      .insert(irrigationZones)
      .values({
        companyId: dto.company_id,
        gardenId: dto.garden_id,
        name: normalizedName,
        frequencyType: dto.frequency_type,
        intervalDays:
          dto.frequency_type === 'every_n_days' ? dto.interval_days ?? null : null,
        weekDays:
          dto.frequency_type === 'weekly' ? normalizedWeekDays : [],
        startDate: dto.start_date,
        startTime: dto.start_time,
        endTime: dto.end_time,
        active: dto.active ?? true,
      })
      .returning({
        id: irrigationZones.id,
        company_id: irrigationZones.companyId,
        garden_id: irrigationZones.gardenId,
        name: irrigationZones.name,
        frequency_type: irrigationZones.frequencyType,
        interval_days: irrigationZones.intervalDays,
        week_days: irrigationZones.weekDays,
        start_date: irrigationZones.startDate,
        start_time: irrigationZones.startTime,
        end_time: irrigationZones.endTime,
        active: irrigationZones.active,
        created_at: irrigationZones.createdAt,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateIrrigationZoneDto, requester: Requester) {
    const current = await this.findIrrigationZoneById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the irrigation zone company_id',
      );
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const targetGardenId = dto.garden_id ?? current.garden_id;
    const targetFrequencyType = dto.frequency_type ?? current.frequency_type;
    const targetIntervalDays =
      targetFrequencyType === 'every_n_days'
        ? dto.interval_days ?? current.interval_days ?? undefined
        : undefined;
    const targetWeekDays =
      targetFrequencyType === 'weekly'
        ? this.normalizeWeekDays(dto.week_days ?? current.week_days)
        : [];
    const targetStartTime = dto.start_time ?? current.start_time;
    const targetEndTime = dto.end_time ?? current.end_time;

    if (dto.garden_id !== undefined) {
      await this.assertGardenExistsInCompany(dto.garden_id, current.company_id);
    }

    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('name is required');
    }

    this.assertValidSchedule({
      frequency_type: targetFrequencyType,
      interval_days: targetIntervalDays,
      week_days: targetWeekDays,
      start_time: targetStartTime,
      end_time: targetEndTime,
    });

    const setPayload: {
      gardenId?: string;
      name?: string;
      frequencyType?: IrrigationFrequency;
      intervalDays?: number | null;
      weekDays?: string[];
      startDate?: string;
      startTime?: string;
      endTime?: string;
      active?: boolean;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
      garden_id: targetGardenId,
    };

    if (dto.garden_id !== undefined) {
      setPayload.gardenId = dto.garden_id;
      responsePayload.garden_id = dto.garden_id;
    }
    if (dto.name !== undefined) {
      setPayload.name = dto.name.trim();
      responsePayload.name = dto.name.trim();
    }
    if (dto.frequency_type !== undefined) {
      setPayload.frequencyType = dto.frequency_type;
      responsePayload.frequency_type = dto.frequency_type;
    }
    if (dto.interval_days !== undefined || dto.frequency_type !== undefined) {
      const normalizedInterval =
        targetFrequencyType === 'every_n_days' ? targetIntervalDays ?? null : null;
      setPayload.intervalDays = normalizedInterval;
      responsePayload.interval_days = normalizedInterval;
    }
    if (dto.week_days !== undefined || dto.frequency_type !== undefined) {
      const normalizedWeekDaysForSave =
        targetFrequencyType === 'weekly' ? targetWeekDays : [];
      setPayload.weekDays = normalizedWeekDaysForSave;
      responsePayload.week_days = normalizedWeekDaysForSave;
    }
    if (dto.start_date !== undefined) {
      setPayload.startDate = dto.start_date;
      responsePayload.start_date = dto.start_date;
    }
    if (dto.start_time !== undefined) {
      setPayload.startTime = dto.start_time;
      responsePayload.start_time = dto.start_time;
    }
    if (dto.end_time !== undefined) {
      setPayload.endTime = dto.end_time;
      responsePayload.end_time = dto.end_time;
    }
    if (dto.active !== undefined) {
      setPayload.active = dto.active;
      responsePayload.active = dto.active;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(irrigationZones)
      .set(setPayload)
      .where(eq(irrigationZones.id, id))
      .returning({ id: irrigationZones.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findIrrigationZoneById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(irrigationZones)
      .where(eq(irrigationZones.id, id))
      .returning({ id: irrigationZones.id });

    return deleted.length > 0;
  }

  private async findIrrigationZoneById(id: string) {
    const rows = await db
      .select({
        id: irrigationZones.id,
        company_id: irrigationZones.companyId,
        garden_id: irrigationZones.gardenId,
        name: irrigationZones.name,
        frequency_type: irrigationZones.frequencyType,
        interval_days: irrigationZones.intervalDays,
        week_days: irrigationZones.weekDays,
        start_date: irrigationZones.startDate,
        start_time: irrigationZones.startTime,
        end_time: irrigationZones.endTime,
        active: irrigationZones.active,
        created_at: irrigationZones.createdAt,
      })
      .from(irrigationZones)
      .where(eq(irrigationZones.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private normalizeWeekDays(weekDays?: string[]) {
    if (!weekDays?.length) {
      return [];
    }

    const order: IrrigationWeekDay[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    return [...new Set(weekDays as IrrigationWeekDay[])].sort(
      (left, right) => order.indexOf(left) - order.indexOf(right),
    );
  }

  private assertValidSchedule(schedule: {
    frequency_type: IrrigationFrequency;
    interval_days?: number;
    week_days: string[];
    start_time: string;
    end_time: string;
  }) {
    if (!schedule.start_time.trim() || !schedule.end_time.trim()) {
      throw new BadRequestException('start_time and end_time are required');
    }

    if (!this.isTimeRangeValid(schedule.start_time, schedule.end_time)) {
      throw new BadRequestException('end_time must be after start_time');
    }

    if (schedule.frequency_type === 'daily') {
      if (schedule.interval_days !== undefined) {
        throw new BadRequestException(
          'interval_days is only allowed for every_n_days frequency',
        );
      }

      if (schedule.week_days.length > 0) {
        throw new BadRequestException(
          'week_days is only allowed for weekly frequency',
        );
      }

      return;
    }

    if (schedule.frequency_type === 'every_n_days') {
      if (
        schedule.interval_days === undefined ||
        !Number.isInteger(schedule.interval_days) ||
        schedule.interval_days < 2
      ) {
        throw new BadRequestException(
          'interval_days must be an integer greater than or equal to 2',
        );
      }

      if (schedule.week_days.length > 0) {
        throw new BadRequestException(
          'week_days is only allowed for weekly frequency',
        );
      }

      return;
    }

    if (schedule.week_days.length === 0) {
      throw new BadRequestException(
        'week_days must contain at least one day for weekly frequency',
      );
    }

    if (schedule.interval_days !== undefined) {
      throw new BadRequestException(
        'interval_days is only allowed for every_n_days frequency',
      );
    }
  }

  private isTimeRangeValid(startTime: string, endTime: string) {
    const start = this.parseTimeToMinutes(startTime);
    const end = this.parseTimeToMinutes(endTime);

    if (start === null || end === null) {
      throw new BadRequestException('Invalid time format');
    }

    return end > start;
  }

  private parseTimeToMinutes(value: string) {
    const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
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

  private async getAccessibleGardenIdsForCompanyMemberships(
    companyMembershipIds: string[],
    companyIds: string[],
  ) {
    if (companyMembershipIds.length === 0 || companyIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ garden_id: tasks.gardenId })
      .from(tasks)
      .innerJoin(
        companyMembershipTeams,
        and(
          eq(companyMembershipTeams.teamId, tasks.teamId),
          eq(companyMembershipTeams.companyId, tasks.companyId),
        ),
      )
      .where(
        and(
          inArray(
            companyMembershipTeams.companyMembershipId,
            companyMembershipIds,
          ),
          inArray(tasks.companyId, companyIds),
        ),
      );

    return [
      ...new Set(
        rows
          .map((item) => item.garden_id)
          .filter((gardenId): gardenId is string => Boolean(gardenId)),
      ),
    ];
  }
}
