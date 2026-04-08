import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { CompanyMembershipRole } from '../common/types/company-membership-role.type';
import { db } from '../db';
import { companies, companyMemberships } from '../db/schema';
import { UpdateCompanyDto } from './dto/update-company.dto';

type AccessibleCompany = {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  favicon_path: string | null;
  address: string;
  nif: string;
  mobile_phone: string;
  email: string;
  iban: string;
  role: CompanyMembershipRole;
};

export type CompanyMembershipRecord = {
  id: string;
  company_id: string;
  active: boolean;
  role: CompanyMembershipRole;
  name: string;
};

@Injectable()
export class CompaniesService {
  async listAccessibleCompanies(userId: string): Promise<AccessibleCompany[]> {
    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logo_path: companies.logoPath,
        favicon_path: companies.faviconPath,
        address: companies.address,
        nif: companies.nif,
        mobile_phone: companies.mobilePhone,
        email: companies.email,
        iban: companies.iban,
        role: companyMemberships.role,
      })
      .from(companyMemberships)
      .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
      .where(
        and(
          eq(companyMemberships.userId, userId),
          eq(companyMemberships.active, true),
        ),
      )
      .orderBy(asc(companies.name));

    return rows as AccessibleCompany[];
  }

  async resolveAccessibleCompanyMemberships(userId: string, companyId?: string) {
    if (companyId) {
      return [await this.assertUserBelongsToCompany(userId, companyId)];
    }

    return this.listCompanyMemberships(userId);
  }

  async resolveAccessibleCompanyIds(userId: string, companyId?: string) {
    const memberships = await this.resolveAccessibleCompanyMemberships(
      userId,
      companyId,
    );
    return memberships.map((membership) => membership.company_id);
  }

  async resolveAdminCompanyIds(userId: string, companyId?: string) {
    if (companyId) {
      await this.assertAdminAccess(userId, companyId);
      return [companyId];
    }

    const memberships = await this.listCompanyMemberships(userId);
    return memberships
      .filter((membership) => membership.role === 'admin')
      .map((membership) => membership.company_id);
  }

  async findCompanyMembership(
    userId: string,
    companyId: string,
    options?: { includeInactive?: boolean },
  ): Promise<CompanyMembershipRecord | null> {
    const rows = (await db
      .select({
        id: companyMemberships.id,
        company_id: companyMemberships.companyId,
        active: companyMemberships.active,
        role: companyMemberships.role,
        name: companyMemberships.name,
      })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.userId, userId),
          eq(companyMemberships.companyId, companyId),
        ),
      )
      .limit(1)) as CompanyMembershipRecord[];

    const membership = rows[0] ?? null;
    if (!membership) {
      return null;
    }

    if (!options?.includeInactive && !membership.active) {
      return null;
    }

    return membership;
  }

  async listCompanyMemberships(userId: string, companyIds?: string[]) {
    const filters = [
      eq(companyMemberships.userId, userId),
      eq(companyMemberships.active, true),
    ];

    if (companyIds?.length) {
      filters.push(inArray(companyMemberships.companyId, companyIds));
    }

    const rows = await db
      .select({
        id: companyMemberships.id,
        company_id: companyMemberships.companyId,
        active: companyMemberships.active,
        role: companyMemberships.role,
        name: companyMemberships.name,
      })
      .from(companyMemberships)
      .where(and(...filters));

    return rows as CompanyMembershipRecord[];
  }

  async assertCompanyExists(companyId: string) {
    const rows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!rows[0]) {
      throw new NotFoundException('Company not found');
    }
  }

  async assertUserBelongsToCompany(userId: string, companyId: string) {
    await this.assertCompanyExists(companyId);

    const membership = await this.findCompanyMembership(userId, companyId);
    if (!membership) {
      throw new ForbiddenException(
        'You are not an active member of this company',
      );
    }

    return membership;
  }

  async assertAdminAccess(userId: string, companyId: string) {
    const membership = await this.assertUserBelongsToCompany(userId, companyId);

    if (membership.role !== 'admin') {
      throw new ForbiddenException('Only admins can manage this resource');
    }

    return membership;
  }

  async findAccessibleCompanyById(companyId: string, userId: string) {
    await this.assertUserBelongsToCompany(userId, companyId);

    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logo_path: companies.logoPath,
        favicon_path: companies.faviconPath,
        address: companies.address,
        nif: companies.nif,
        mobile_phone: companies.mobilePhone,
        email: companies.email,
        iban: companies.iban,
        role: companyMemberships.role,
      })
      .from(companyMemberships)
      .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
      .where(
        and(
          eq(companyMemberships.userId, userId),
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.active, true),
        ),
      )
      .limit(1);

    return (rows[0] as AccessibleCompany | undefined) ?? null;
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto, userId: string) {
    await this.assertAdminAccess(userId, companyId);

    const current = await this.findAccessibleCompanyById(companyId, userId);
    if (!current) {
      return null;
    }

    const setPayload: {
      name?: string;
      slug?: string;
      logoPath?: string | null;
      faviconPath?: string | null;
      address?: string;
      nif?: string;
      mobilePhone?: string;
      email?: string;
      iban?: string;
    } = {};

    if (dto.name !== undefined) {
      setPayload.name = this.normalizeRequired(dto.name, 'name');
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeRequired(dto.slug, 'slug').toLowerCase();
      await this.assertCompanySlugAvailable(slug, companyId);
      setPayload.slug = slug;
    }

    if (dto.logo_path !== undefined) {
      setPayload.logoPath = this.normalizeNullable(dto.logo_path);
    }

    if (dto.favicon_path !== undefined) {
      setPayload.faviconPath = this.normalizeNullable(dto.favicon_path);
    }

    if (dto.address !== undefined) {
      setPayload.address = this.normalizeRequired(dto.address, 'address');
    }

    if (dto.nif !== undefined) {
      setPayload.nif = this.normalizeRequired(dto.nif, 'nif');
    }

    if (dto.mobile_phone !== undefined) {
      setPayload.mobilePhone = this.normalizeRequired(dto.mobile_phone, 'mobile_phone');
    }

    if (dto.email !== undefined) {
      setPayload.email = this.normalizeRequired(dto.email, 'email').toLowerCase();
    }

    if (dto.iban !== undefined) {
      setPayload.iban = this.normalizeRequired(dto.iban, 'iban');
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(companies)
      .set(setPayload)
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });

    if (!updated[0]) {
      return null;
    }

    return this.findAccessibleCompanyById(companyId, userId);
  }

  private normalizeRequired(value: string, field: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }

    return normalized;
  }

  private normalizeNullable(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async assertCompanySlugAvailable(slug: string, companyId?: string) {
    const rows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    const existing = rows[0];
    if (existing && existing.id !== companyId) {
      throw new BadRequestException('slug is already in use');
    }
  }
}
