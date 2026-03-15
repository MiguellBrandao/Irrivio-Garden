import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { companyMembershipTeams, gardens, tasks } from '../db/schema';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenDto } from './dto/update-garden.dto';

type Requester = {
  id: string;
};

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

    const rows = await db
      .insert(gardens)
      .values({
        companyId: dto.company_id,
        clientName: dto.client_name,
        address: dto.address,
        phone: dto.phone,
        monthlyPrice: dto.monthly_price?.toString(),
        maintenanceFrequency: dto.maintenance_frequency,
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
        maintenance_frequency: gardens.maintenanceFrequency,
        start_date: gardens.startDate,
        billing_day: gardens.billingDay,
        status: gardens.status,
        notes: gardens.notes,
        created_at: gardens.createdAt,
      });

    return rows[0];
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

    const setPayload: {
      clientName?: string;
      address?: string;
      phone?: string;
      monthlyPrice?: string;
      maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly';
      startDate?: string;
      billingDay?: number;
      status?: 'active' | 'paused' | 'cancelled';
      notes?: string;
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
    if (dto.monthly_price !== undefined) {
      setPayload.monthlyPrice = dto.monthly_price.toString();
      responsePayload.monthly_price = dto.monthly_price;
    }
    if (dto.maintenance_frequency !== undefined) {
      setPayload.maintenanceFrequency = dto.maintenance_frequency;
      responsePayload.maintenance_frequency = dto.maintenance_frequency;
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

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(gardens)
      .set(setPayload)
      .where(eq(gardens.id, id))
      .returning({ id: gardens.id });

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

  private async findAllFull(companyIds: string[]) {
    return db
      .select({
        id: gardens.id,
        company_id: gardens.companyId,
        client_name: gardens.clientName,
        address: gardens.address,
        phone: gardens.phone,
        monthly_price: gardens.monthlyPrice,
        maintenance_frequency: gardens.maintenanceFrequency,
        start_date: gardens.startDate,
        billing_day: gardens.billingDay,
        status: gardens.status,
        notes: gardens.notes,
        created_at: gardens.createdAt,
      })
      .from(gardens)
      .where(inArray(gardens.companyId, companyIds))
      .orderBy(desc(gardens.createdAt));
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
        maintenance_frequency: gardens.maintenanceFrequency,
        start_date: gardens.startDate,
        billing_day: gardens.billingDay,
        status: gardens.status,
        notes: gardens.notes,
        created_at: gardens.createdAt,
      })
      .from(gardens)
      .where(eq(gardens.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private toEmployeeGardenView(row: {
    id: string;
    company_id: string;
    client_name: string;
    address: string;
    phone: string | null;
    monthly_price: string | null;
    maintenance_frequency: string | null;
    start_date: string | null;
    billing_day: number | null;
    status: string;
    notes: string | null;
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
