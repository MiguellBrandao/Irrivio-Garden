import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { gardens, payments } from '../db/schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

type Requester = {
  id: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, companyId?: string) {
    const accessibleCompanyIds = await this.companiesService.resolveAdminCompanyIds(
      requester.id,
      companyId,
    );

    if (accessibleCompanyIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: payments.id,
        company_id: payments.companyId,
        garden_id: payments.gardenId,
        month: payments.month,
        year: payments.year,
        amount: payments.amount,
        paid_at: payments.paidAt,
        notes: payments.notes,
      })
      .from(payments)
      .where(inArray(payments.companyId, accessibleCompanyIds))
      .orderBy(desc(payments.year), desc(payments.month), desc(payments.id));
  }

  async create(dto: CreatePaymentDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);
    await this.assertGardenExistsInCompany(dto.garden_id, dto.company_id);

    const rows = await db
      .insert(payments)
      .values({
        companyId: dto.company_id,
        gardenId: dto.garden_id,
        month: dto.month,
        year: dto.year,
        amount: dto.amount.toString(),
        paidAt: dto.paid_at ? new Date(dto.paid_at) : null,
        notes: dto.notes,
      })
      .returning({
        id: payments.id,
        company_id: payments.companyId,
        garden_id: payments.gardenId,
        amount: payments.amount,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdatePaymentDto, requester: Requester) {
    const current = await this.findPaymentById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the payment company_id',
      );
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    if (dto.garden_id !== undefined) {
      await this.assertGardenExistsInCompany(dto.garden_id, current.company_id);
    }

    const setPayload: {
      gardenId?: string;
      month?: number;
      year?: number;
      amount?: string;
      paidAt?: Date | null;
      notes?: string;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.garden_id !== undefined) {
      setPayload.gardenId = dto.garden_id;
      responsePayload.garden_id = dto.garden_id;
    }
    if (dto.month !== undefined) {
      setPayload.month = dto.month;
      responsePayload.month = dto.month;
    }
    if (dto.year !== undefined) {
      setPayload.year = dto.year;
      responsePayload.year = dto.year;
    }
    if (dto.amount !== undefined) {
      setPayload.amount = dto.amount.toString();
      responsePayload.amount = dto.amount.toFixed(2);
    }
    if (dto.paid_at !== undefined) {
      setPayload.paidAt = dto.paid_at ? new Date(dto.paid_at) : null;
      responsePayload.paid_at = dto.paid_at;
    }
    if (dto.notes !== undefined) {
      setPayload.notes = dto.notes;
      responsePayload.notes = dto.notes;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(payments)
      .set(setPayload)
      .where(eq(payments.id, id))
      .returning({ id: payments.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const payment = await this.findPaymentById(id);
    if (!payment) {
      return null;
    }

    if (companyId && companyId !== payment.company_id) {
      return null;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      payment.company_id,
    );

    return payment;
  }

  async remove(id: string, requester: Requester) {
    const payment = await this.findPaymentById(id);
    if (!payment) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      payment.company_id,
    );

    const deleted = await db
      .delete(payments)
      .where(eq(payments.id, id))
      .returning({ id: payments.id });

    return deleted.length > 0;
  }

  private async findPaymentById(id: string) {
    const rows = await db
      .select({
        id: payments.id,
        company_id: payments.companyId,
        garden_id: payments.gardenId,
        month: payments.month,
        year: payments.year,
        amount: payments.amount,
        paid_at: payments.paidAt,
        notes: payments.notes,
      })
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    return rows[0] ?? null;
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
}
