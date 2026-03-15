import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { gardens, quotes } from '../db/schema';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

type Requester = {
  id: string;
};

type QuoteRow = {
  id: string;
  company_id: string;
  garden_id: string;
  garden_client_name: string;
  garden_address: string;
  services: string[];
  price: string;
  valid_until: string;
  created_at: Date;
};

@Injectable()
export class QuotesService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, companyId?: string) {
    const accessibleCompanyIds =
      await this.companiesService.resolveAdminCompanyIds(
        requester.id,
        companyId,
      );

    if (accessibleCompanyIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: quotes.id,
        company_id: quotes.companyId,
        garden_id: quotes.gardenId,
        garden_client_name: gardens.clientName,
        garden_address: gardens.address,
        services: quotes.services,
        price: quotes.price,
        valid_until: quotes.validUntil,
        created_at: quotes.createdAt,
      })
      .from(quotes)
      .innerJoin(gardens, eq(quotes.gardenId, gardens.id))
      .where(inArray(quotes.companyId, accessibleCompanyIds))
      .orderBy(desc(quotes.createdAt));
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const quote = await this.findQuoteById(id);
    if (!quote) {
      return null;
    }

    if (companyId && companyId !== quote.company_id) {
      return null;
    }

    await this.companiesService.assertAdminAccess(requester.id, quote.company_id);

    return quote;
  }

  async create(dto: CreateQuoteDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);

    await this.assertGardenExistsInCompany(dto.garden_id, dto.company_id);

    const createdAt = new Date();
    const validUntil = dto.valid_until ?? this.addOneMonth(createdAt);
    const services = this.normalizeServices(dto.services);

    const rows = await db
      .insert(quotes)
      .values({
        companyId: dto.company_id,
        gardenId: dto.garden_id,
        services,
        price: dto.price.toString(),
        validUntil,
        createdAt,
      })
      .returning({ id: quotes.id });

    return this.findQuoteByIdOrThrow(rows[0].id);
  }

  async update(id: string, dto: UpdateQuoteDto, requester: Requester) {
    const current = await this.findQuoteById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the quote company_id',
      );
    }

    await this.companiesService.assertAdminAccess(requester.id, current.company_id);

    const setPayload: {
      gardenId?: string;
      services?: string[];
      price?: string;
      validUntil?: string;
    } = {};

    if (dto.garden_id !== undefined) {
      await this.assertGardenExistsInCompany(dto.garden_id, current.company_id);
      setPayload.gardenId = dto.garden_id;
    }

    if (dto.services !== undefined) {
      setPayload.services = this.normalizeServices(dto.services);
    }

    if (dto.price !== undefined) {
      setPayload.price = dto.price.toString();
    }

    if (dto.valid_until !== undefined) {
      setPayload.validUntil = dto.valid_until;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(quotes)
      .set(setPayload)
      .where(eq(quotes.id, id))
      .returning({ id: quotes.id });

    if (updated.length === 0) {
      return null;
    }

    return this.findQuoteByIdOrThrow(id);
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findQuoteById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(requester.id, current.company_id);

    const deleted = await db
      .delete(quotes)
      .where(eq(quotes.id, id))
      .returning({ id: quotes.id });

    return deleted.length > 0;
  }

  private async findQuoteById(id: string): Promise<QuoteRow | null> {
    const rows = await db
      .select({
        id: quotes.id,
        company_id: quotes.companyId,
        garden_id: quotes.gardenId,
        garden_client_name: gardens.clientName,
        garden_address: gardens.address,
        services: quotes.services,
        price: quotes.price,
        valid_until: quotes.validUntil,
        created_at: quotes.createdAt,
      })
      .from(quotes)
      .innerJoin(gardens, eq(quotes.gardenId, gardens.id))
      .where(eq(quotes.id, id))
      .limit(1);

    return (rows[0] as QuoteRow | undefined) ?? null;
  }

  private async findQuoteByIdOrThrow(id: string) {
    const quote = await this.findQuoteById(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  private async assertGardenExistsInCompany(gardenId: string, companyId: string) {
    const rows = await db
      .select({
        id: gardens.id,
        company_id: gardens.companyId,
      })
      .from(gardens)
      .where(eq(gardens.id, gardenId))
      .limit(1);

    const garden = rows[0];
    if (!garden) {
      throw new NotFoundException('Garden not found');
    }

    if (garden.company_id !== companyId) {
      throw new BadRequestException('Garden does not belong to this company');
    }
  }

  private normalizeServices(services: string[]) {
    const normalizedServices = services
      .map((service) => service.trim())
      .filter(Boolean);

    if (normalizedServices.length === 0) {
      throw new BadRequestException('At least one service is required');
    }

    return normalizedServices;
  }

  private addOneMonth(date: Date) {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate.toISOString().slice(0, 10);
  }
}
