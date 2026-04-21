import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { companyMembershipTeams, gardenTeams, gardens, tasks, teams } from '../db/schema';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenDto } from './dto/update-garden.dto';

type Requester = {
  id: string;
};

type GardenDayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type GardenScheduleValues = {
  isRegularService: boolean;
  showInCalendar: boolean;
  maintenanceFrequency: 'weekly' | 'biweekly' | 'monthly' | null;
  maintenanceDayOfWeek: GardenDayOfWeek | null;
  maintenanceAnchorDate: string | null;
  maintenanceStartTime: string | null;
  maintenanceEndTime: string | null;
};

const WEEKDAY_BY_JS_DAY: GardenDayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

@Injectable()
export class GardensService {
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
    const adminCompanyIds = new Set(
      accessibleMemberships
        .filter((membership) => membership.role === 'admin')
        .map((membership) => membership.company_id),
    );
    const employeeMemberships = accessibleMemberships.filter(
      (membership) => membership.role === 'employee',
    );

    const rows = await this.findAllFull(accessibleCompanyIds);

    if (employeeMemberships.length === 0) {
      return rows;
    }

    const accessibleGardenIds = new Set(
      await this.getAccessibleGardenIdsForCompanyMemberships(
        employeeMemberships.map((membership) => membership.id),
        employeeMemberships.map((membership) => membership.company_id),
      ),
    );

    return rows.flatMap((row) => {
      if (adminCompanyIds.has(row.company_id)) {
        return [row];
      }

      if (!accessibleGardenIds.has(row.id)) {
        return [];
      }

      return [this.toEmployeeGardenView(row)];
    });
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const garden = await this.findGardenById(id);
    if (!garden) {
      return null;
    }

    if (companyId && companyId !== garden.company_id) {
      return null;
    }

    await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      garden.company_id,
    );

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        garden.company_id,
      );

    if (requesterMembership.role === 'admin') {
      return garden;
    }

    const accessibleGardenIds = await this.getAccessibleGardenIdsForCompanyMemberships(
      [requesterMembership.id],
      [garden.company_id],
    );
    if (!accessibleGardenIds.includes(id)) {
      return null;
    }

    return this.toEmployeeGardenView(garden);
  }

  async create(dto: CreateGardenDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);

    const teamIds = this.getRequestedTeamIds(dto) ?? [];

    if (teamIds.length > 0) {
      await Promise.all(
        teamIds.map((teamId) => this.assertTeamExistsInCompany(teamId, dto.company_id)),
      );
    }

    const schedule = this.normalizeSchedule(dto);

    const rows = await db
      .insert(gardens)
      .values({
        companyId: dto.company_id,
        clientName: dto.client_name,
        address: dto.address,
        phone: dto.phone,
        monthlyPrice: dto.monthly_price?.toString(),
        isRegularService: schedule.isRegularService,
        showInCalendar: schedule.showInCalendar,
        maintenanceFrequency: schedule.maintenanceFrequency,
        maintenanceDayOfWeek: schedule.maintenanceDayOfWeek,
        maintenanceAnchorDate: schedule.maintenanceAnchorDate,
        maintenanceStartTime: schedule.maintenanceStartTime,
        maintenanceEndTime: schedule.maintenanceEndTime,
        startDate: dto.start_date,
        billingDay: dto.billing_day,
        status: dto.status ?? 'active',
        notes: dto.notes,
      })
      .returning({
        id: gardens.id,
        company_id: gardens.companyId,
        client_name: gardens.clientName,
        address: gardens.address,
        phone: gardens.phone,
        monthly_price: gardens.monthlyPrice,
        is_regular_service: gardens.isRegularService,
        show_in_calendar: gardens.showInCalendar,
        maintenance_frequency: gardens.maintenanceFrequency,
        maintenance_day_of_week: gardens.maintenanceDayOfWeek,
        maintenance_anchor_date: gardens.maintenanceAnchorDate,
        maintenance_start_time: gardens.maintenanceStartTime,
        maintenance_end_time: gardens.maintenanceEndTime,
        start_date: gardens.startDate,
        billing_day: gardens.billingDay,
        status: gardens.status,
        notes: gardens.notes,
        created_at: gardens.createdAt,
      });

    if (teamIds.length > 0) {
      await db.insert(gardenTeams).values(
        teamIds.map((teamId) => ({ gardenId: rows[0].id, teamId })),
      );
    }

    return { ...rows[0], team_ids: teamIds };
  }

  async update(id: string, dto: UpdateGardenDto, requester: Requester) {
    const current = await this.findGardenById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the garden company_id',
      );
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );
    const schedule = this.hasScheduleChanges(dto)
      ? this.normalizeSchedule(dto, current)
      : null;

    const setPayload: {
      clientName?: string;
      address?: string;
      phone?: string;
      teamId?: string | null;
      monthlyPrice?: string;
      isRegularService?: boolean;
      showInCalendar?: boolean;
      maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
      maintenanceDayOfWeek?: GardenDayOfWeek | null;
      maintenanceAnchorDate?: string | null;
      maintenanceStartTime?: string | null;
      maintenanceEndTime?: string | null;
      startDate?: string | null;
      billingDay?: number | null;
      status?: 'active' | 'paused' | 'cancelled';
      notes?: string | null;
    } = {};

    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.client_name !== undefined) {
      setPayload.clientName = dto.client_name;
      responsePayload.client_name = dto.client_name;
    }
    if (dto.address !== undefined) {
      setPayload.address = dto.address;
      responsePayload.address = dto.address;
    }
    if (dto.phone !== undefined) {
      setPayload.phone = dto.phone;
      responsePayload.phone = dto.phone;
    }
    const requestedTeamIds = this.getRequestedTeamIds(dto);
    if (requestedTeamIds !== undefined) {
      await Promise.all(
        requestedTeamIds.map((teamId) =>
          this.assertTeamExistsInCompany(teamId, current.company_id),
        ),
      );

      await db.delete(gardenTeams).where(eq(gardenTeams.gardenId, id));
      if (requestedTeamIds.length > 0) {
        await db.insert(gardenTeams).values(
          requestedTeamIds.map((teamId) => ({ gardenId: id, teamId })),
        );
      }
      responsePayload.team_ids = requestedTeamIds;
    }
    if (dto.monthly_price !== undefined) {
      setPayload.monthlyPrice = dto.monthly_price.toString();
      responsePayload.monthly_price = dto.monthly_price;
    }
    if (this.hasScheduleChanges(dto)) {
      setPayload.isRegularService = schedule!.isRegularService;
      setPayload.showInCalendar = schedule!.showInCalendar;
      setPayload.maintenanceFrequency = schedule!.maintenanceFrequency;
      setPayload.maintenanceDayOfWeek = schedule!.maintenanceDayOfWeek;
      setPayload.maintenanceAnchorDate = schedule!.maintenanceAnchorDate;
      setPayload.maintenanceStartTime = schedule!.maintenanceStartTime;
      setPayload.maintenanceEndTime = schedule!.maintenanceEndTime;
      responsePayload.is_regular_service = schedule!.isRegularService;
      responsePayload.show_in_calendar = schedule!.showInCalendar;
      responsePayload.maintenance_frequency = schedule!.maintenanceFrequency;
      responsePayload.maintenance_day_of_week = schedule!.maintenanceDayOfWeek;
      responsePayload.maintenance_anchor_date = schedule!.maintenanceAnchorDate;
      responsePayload.maintenance_start_time = schedule!.maintenanceStartTime;
      responsePayload.maintenance_end_time = schedule!.maintenanceEndTime;
    }
    if (dto.start_date !== undefined) {
      setPayload.startDate = dto.start_date;
      responsePayload.start_date = dto.start_date;
    }
    if (dto.billing_day !== undefined) {
      setPayload.billingDay = dto.billing_day;
      responsePayload.billing_day = dto.billing_day;
    }
    if (dto.status !== undefined) {
      setPayload.status = dto.status;
      responsePayload.status = dto.status;
    }
    if (dto.notes !== undefined) {
      setPayload.notes = dto.notes;
      responsePayload.notes = dto.notes;
    }

    if (Object.keys(setPayload).length === 0 && requestedTeamIds === undefined) {
      throw new BadRequestException('No fields provided for update');
    }

    let updated = [{ id }];
    if (Object.keys(setPayload).length > 0) {
      updated = await db
        .update(gardens)
        .set(setPayload)
        .where(eq(gardens.id, id))
        .returning({ id: gardens.id });
    }

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findGardenById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(gardens)
      .where(eq(gardens.id, id))
      .returning({ id: gardens.id });

    return deleted.length > 0;
  }

  async assertGardenExistsInCompany(gardenId: string, companyId: string) {
    const garden = await this.findGardenById(gardenId);
    if (!garden) {
      throw new NotFoundException('Garden not found');
    }
    if (garden.company_id !== companyId) {
      throw new BadRequestException('Garden does not belong to this company');
    }

    return garden;
  }

  async assertTeamExistsInCompany(teamId: string, companyId: string) {
    const rows = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.companyId, companyId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('Team not found');
    }

    return rows[0];
  }

  private getRequestedTeamIds(
    dto: CreateGardenDto | UpdateGardenDto,
  ): string[] | undefined {
    if (dto.team_ids !== undefined) {
      return dto.team_ids ? [...new Set(dto.team_ids)] : [];
    }

    if (dto.team_id !== undefined) {
      return dto.team_id ? [dto.team_id] : [];
    }

    return undefined;
  }

  private async findAllFull(companyIds: string[]) {
    const rows = await db
      .select({
        id: gardens.id,
        company_id: gardens.companyId,
        client_name: gardens.clientName,
        address: gardens.address,
        phone: gardens.phone,
        monthly_price: gardens.monthlyPrice,
        is_regular_service: gardens.isRegularService,
        show_in_calendar: gardens.showInCalendar,
        maintenance_frequency: gardens.maintenanceFrequency,
        maintenance_day_of_week: gardens.maintenanceDayOfWeek,
        maintenance_anchor_date: gardens.maintenanceAnchorDate,
        maintenance_start_time: gardens.maintenanceStartTime,
        maintenance_end_time: gardens.maintenanceEndTime,
        start_date: gardens.startDate,
        billing_day: gardens.billingDay,
        status: gardens.status,
        notes: gardens.notes,
        created_at: gardens.createdAt,
      })
      .from(gardens)
      .where(inArray(gardens.companyId, companyIds))
      .orderBy(desc(gardens.createdAt));

    const gardenIds = rows.map((garden) => garden.id);
    const gardenTeamRows =
      gardenIds.length > 0
        ? await db
            .select({
              garden_id: gardenTeams.gardenId,
              team_id: gardenTeams.teamId,
            })
            .from(gardenTeams)
            .where(inArray(gardenTeams.gardenId, gardenIds))
        : [];

    const gardenTeamMap = new Map<string, string[]>();
    gardenTeamRows.forEach((row) => {
      const existing = gardenTeamMap.get(row.garden_id) ?? [];
      gardenTeamMap.set(row.garden_id, [...existing, row.team_id]);
    });

    return rows.map((row) => ({
      ...row,
      team_ids: gardenTeamMap.get(row.id) ?? [],
    }));
  }

  private async findGardenById(id: string) {
    const rows = await db
      .select({
        id: gardens.id,
        company_id: gardens.companyId,
        client_name: gardens.clientName,
        address: gardens.address,
        phone: gardens.phone,
        monthly_price: gardens.monthlyPrice,
        is_regular_service: gardens.isRegularService,
        show_in_calendar: gardens.showInCalendar,
        maintenance_frequency: gardens.maintenanceFrequency,
        maintenance_day_of_week: gardens.maintenanceDayOfWeek,
        maintenance_anchor_date: gardens.maintenanceAnchorDate,
        maintenance_start_time: gardens.maintenanceStartTime,
        maintenance_end_time: gardens.maintenanceEndTime,
        start_date: gardens.startDate,
        billing_day: gardens.billingDay,
        status: gardens.status,
        notes: gardens.notes,
        created_at: gardens.createdAt,
      })
      .from(gardens)
      .where(eq(gardens.id, id))
      .limit(1);

    const garden = rows[0] ?? null;
    if (!garden) {
      return null;
    }

    const teamRows = await db
      .select({ team_id: gardenTeams.teamId })
      .from(gardenTeams)
      .where(eq(gardenTeams.gardenId, id));

    return { ...garden, team_ids: teamRows.map((row) => row.team_id) };
  }

  private toEmployeeGardenView(row: {
    id: string;
    company_id: string;
    client_name: string;
    address: string;
    phone: string | null;
    monthly_price: string | null;
    is_regular_service: boolean;
    show_in_calendar: boolean;
    maintenance_frequency: string | null;
    maintenance_day_of_week: string | null;
    maintenance_anchor_date: string | null;
    maintenance_start_time: string | null;
    maintenance_end_time: string | null;
    start_date: string | null;
    billing_day: number | null;
    status: string;
    notes: string | null;
    team_ids: string[];
    created_at: Date;
  }) {
    const { monthly_price, start_date, billing_day, ...safe } = row;
    return safe;
  }

  private async getAccessibleGardenIdsForCompanyMemberships(
    companyMembershipIds: string[],
    companyIds: string[],
  ) {
    if (companyMembershipIds.length === 0 || companyIds.length === 0) {
      return [];
    }

    const taskRows = await db
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

    const gardenRows = await db
      .select({ garden_id: gardens.id })
      .from(gardenTeams)
      .innerJoin(gardens, eq(gardenTeams.gardenId, gardens.id))
      .innerJoin(
        companyMembershipTeams,
        and(
          eq(companyMembershipTeams.teamId, gardenTeams.teamId),
          eq(companyMembershipTeams.companyId, gardens.companyId),
        ),
      )
      .where(
        and(
          inArray(
            companyMembershipTeams.companyMembershipId,
            companyMembershipIds,
          ),
          inArray(gardens.companyId, companyIds),
        ),
      );

    return [
      ...new Set(
        [...taskRows, ...gardenRows]
          .map((item) => item.garden_id)
          .filter((gardenId): gardenId is string => Boolean(gardenId)),
      ),
    ];
  }

  private hasScheduleChanges(dto: UpdateGardenDto) {
    return (
      dto.is_regular_service !== undefined ||
      dto.show_in_calendar !== undefined ||
      dto.maintenance_frequency !== undefined ||
      dto.maintenance_day_of_week !== undefined ||
      dto.maintenance_anchor_date !== undefined ||
      dto.maintenance_start_time !== undefined ||
      dto.maintenance_end_time !== undefined
    );
  }

  private normalizeSchedule(
    dto: CreateGardenDto | UpdateGardenDto,
    current?: {
      is_regular_service: boolean;
      show_in_calendar: boolean;
      maintenance_frequency: string | null;
      maintenance_day_of_week: string | null;
      maintenance_anchor_date: string | null;
      maintenance_start_time: string | null;
      maintenance_end_time: string | null;
    },
  ): GardenScheduleValues {
    const isRegularService =
      dto.is_regular_service ?? current?.is_regular_service ?? true;
    const showInCalendar = dto.show_in_calendar ?? current?.show_in_calendar ?? true;

    if (!isRegularService) {
      return {
        isRegularService: false,
        showInCalendar,
        maintenanceFrequency: null,
        maintenanceDayOfWeek: null,
        maintenanceAnchorDate: null,
        maintenanceStartTime: null,
        maintenanceEndTime: null,
      };
    }

    const maintenanceFrequency =
      dto.maintenance_frequency ??
      ((current?.maintenance_frequency as
        | 'weekly'
        | 'biweekly'
        | 'monthly'
        | null
        | undefined) ??
        null);

    if (!maintenanceFrequency) {
      throw new BadRequestException(
        'maintenance_frequency is required when is_regular_service is true',
      );
    }

    let maintenanceAnchorDate =
      dto.maintenance_anchor_date ?? current?.maintenance_anchor_date ?? null;

    if (maintenanceFrequency === 'weekly') {
      maintenanceAnchorDate = null;
    } else if (!maintenanceAnchorDate) {
      throw new BadRequestException(
        'maintenance_anchor_date is required for biweekly and monthly schedules',
      );
    }

    const maintenanceDayOfWeek =
      maintenanceFrequency === 'weekly'
        ? (dto.maintenance_day_of_week ??
          ((current?.maintenance_day_of_week as GardenDayOfWeek | null | undefined) ??
            // If current day is null for weekly, try to derive from anchor date if available
            (current?.maintenance_anchor_date ? this.getWeekdayFromIsoDate(current.maintenance_anchor_date) : null)))
        : this.getWeekdayFromIsoDate(maintenanceAnchorDate);

    if (!maintenanceDayOfWeek) {
      throw new BadRequestException(
        'maintenance_day_of_week is required when is_regular_service is true',
      );
    }

    const maintenanceStartTime =
      dto.maintenance_start_time ?? current?.maintenance_start_time ?? null;
    const maintenanceEndTime =
      dto.maintenance_end_time ?? current?.maintenance_end_time ?? null;

    if (
      maintenanceStartTime &&
      maintenanceEndTime &&
      maintenanceEndTime < maintenanceStartTime
    ) {
      throw new BadRequestException(
        'maintenance_end_time must be after maintenance_start_time',
      );
    }

    return {
      isRegularService: true,
      showInCalendar,
      maintenanceFrequency,
      maintenanceDayOfWeek,
      maintenanceAnchorDate,
      maintenanceStartTime,
      maintenanceEndTime,
    };
  }

  private getWeekdayFromIsoDate(value: string | null) {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return WEEKDAY_BY_JS_DAY[date.getDay()] ?? null;
  }
}
