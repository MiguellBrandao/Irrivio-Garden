import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import {
  companyMembershipTeams,
  companyMemberships,
  gardens,
  productUsage,
  products,
  tasks,
} from '../db/schema';
import { CreateProductUsageDto } from './dto/create-product-usage.dto';
import { ListProductUsageQueryDto } from './dto/list-product-usage-query.dto';
import { UpdateProductUsageDto } from './dto/update-product-usage.dto';

type Requester = {
  id: string;
};

@Injectable()
export class ProductUsageService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListProductUsageQueryDto) {
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
    const employeeMembershipIds = new Set(
      accessibleMemberships
        .filter((membership) => membership.role === 'employee')
        .map((membership) => membership.id),
    );

    const rows = await db
      .select({
        id: productUsage.id,
        company_id: productUsage.companyId,
        product_id: productUsage.productId,
        product_name: products.name,
        garden_id: productUsage.gardenId,
        company_membership_id: productUsage.companyMembershipId,
        quantity: productUsage.quantity,
        date: productUsage.date,
        notes: productUsage.notes,
      })
      .from(productUsage)
      .innerJoin(products, eq(productUsage.productId, products.id))
      .where(and(...this.buildFilters(query, accessibleCompanyIds)))
      .orderBy(desc(productUsage.date), desc(productUsage.id));

    if (employeeMembershipIds.size === 0) {
      return rows;
    }

    return rows.filter((usage) => {
      if (adminCompanyIds.has(usage.company_id)) {
        return true;
      }

      return (
        usage.company_membership_id !== null &&
        employeeMembershipIds.has(usage.company_membership_id)
      );
    });
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const usage = await this.findUsageById(id);
    if (!usage) {
      return null;
    }

    if (companyId && companyId !== usage.company_id) {
      return null;
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        usage.company_id,
      );

    if (
      requesterMembership.role === 'employee' &&
      usage.company_membership_id !== requesterMembership.id
    ) {
      return null;
    }

    return usage;
  }

  async create(dto: CreateProductUsageDto, requester: Requester) {
    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        dto.company_id,
      );

    let targetCompanyMembershipId: string;

    if (requesterMembership.role === 'admin') {
      if (!dto.company_membership_id) {
        throw new BadRequestException(
          'company_membership_id is required when admin creates product usage',
        );
      }
      targetCompanyMembershipId = dto.company_membership_id;
    } else {
      if (dto.company_membership_id !== undefined) {
        throw new ForbiddenException(
          'Employees cannot set company_membership_id',
        );
      }

      targetCompanyMembershipId = requesterMembership.id;
      await this.assertCompanyMembershipCanAccessGarden(
        requesterMembership.id,
        dto.garden_id,
        dto.company_id,
      );
    }

    await this.assertCompanyMembershipExistsInCompany(
      targetCompanyMembershipId,
      dto.company_id,
    );
    await this.assertGardenExistsInCompany(dto.garden_id, dto.company_id);
    await this.assertProductExistsInCompany(dto.product_id, dto.company_id);

    return db.transaction(async (tx) => {
      await this.adjustProductStock(tx, dto.product_id, dto.company_id, -dto.quantity);

      const rows = await tx
        .insert(productUsage)
        .values({
          companyId: dto.company_id,
          productId: dto.product_id,
          gardenId: dto.garden_id,
          companyMembershipId: targetCompanyMembershipId,
          quantity: dto.quantity.toString(),
          date: dto.date,
          notes: dto.notes,
        })
        .returning({
          id: productUsage.id,
          company_id: productUsage.companyId,
          product_id: productUsage.productId,
          garden_id: productUsage.gardenId,
          company_membership_id: productUsage.companyMembershipId,
          quantity: productUsage.quantity,
          date: productUsage.date,
          notes: productUsage.notes,
        });

      return rows[0];
    });
  }

  async update(id: string, dto: UpdateProductUsageDto, requester: Requester) {
    const current = await this.findUsageById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the product usage company_id',
      );
    }

    const requesterMembership =
      await this.companiesService.assertUserBelongsToCompany(
        requester.id,
        current.company_id,
      );

    if (requesterMembership.role === 'employee') {
      if (current.company_membership_id !== requesterMembership.id) {
        throw new ForbiddenException(
          'You can only update your own product usage logs',
        );
      }

      if (dto.company_membership_id !== undefined) {
        throw new ForbiddenException(
          'Employees cannot update company_membership_id',
        );
      }
    }

    const targetProductId = dto.product_id ?? current.product_id;
    const targetGardenId = dto.garden_id ?? current.garden_id;
    const targetCompanyMembershipId =
      dto.company_membership_id ?? current.company_membership_id;
    const targetQuantity = dto.quantity ?? Number(current.quantity);

    if (requesterMembership.role === 'employee') {
      await this.assertCompanyMembershipCanAccessGarden(
        requesterMembership.id,
        targetGardenId,
        current.company_id,
      );
    }

    await this.assertProductExistsInCompany(targetProductId, current.company_id);
    await this.assertGardenExistsInCompany(targetGardenId, current.company_id);
    if (targetCompanyMembershipId) {
      await this.assertCompanyMembershipExistsInCompany(
        targetCompanyMembershipId,
        current.company_id,
      );
    }

    const setPayload: {
      productId?: string;
      gardenId?: string;
      companyMembershipId?: string;
      quantity?: string;
      date?: string;
      notes?: string;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.product_id !== undefined) {
      setPayload.productId = dto.product_id;
      responsePayload.product_id = dto.product_id;
    }
    if (dto.garden_id !== undefined) {
      setPayload.gardenId = dto.garden_id;
      responsePayload.garden_id = dto.garden_id;
    }
    if (dto.company_membership_id !== undefined) {
      setPayload.companyMembershipId = dto.company_membership_id;
      responsePayload.company_membership_id = dto.company_membership_id;
    }
    if (dto.quantity !== undefined) {
      setPayload.quantity = dto.quantity.toString();
      responsePayload.quantity = dto.quantity;
    }
    if (dto.date !== undefined) {
      setPayload.date = dto.date;
      responsePayload.date = dto.date;
    }
    if (dto.notes !== undefined) {
      setPayload.notes = dto.notes;
      responsePayload.notes = dto.notes;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    return db.transaction(async (tx) => {
      const currentQuantity = Number(current.quantity);
      if (targetProductId === current.product_id) {
        const stockDelta = currentQuantity - targetQuantity;
        await this.adjustProductStock(
          tx,
          targetProductId,
          current.company_id,
          stockDelta,
        );
      } else {
        await this.adjustProductStock(
          tx,
          current.product_id,
          current.company_id,
          currentQuantity,
        );
        await this.adjustProductStock(
          tx,
          targetProductId,
          current.company_id,
          -targetQuantity,
        );
      }

      const updated = await tx
        .update(productUsage)
        .set(setPayload)
        .where(eq(productUsage.id, id))
        .returning({ id: productUsage.id });

      return updated.length > 0 ? responsePayload : null;
    });
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findUsageById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(requester.id, current.company_id);

    return db.transaction(async (tx) => {
      await this.adjustProductStock(
        tx,
        current.product_id,
        current.company_id,
        Number(current.quantity),
      );

      const deleted = await tx
        .delete(productUsage)
        .where(eq(productUsage.id, id))
        .returning({ id: productUsage.id });

      return deleted.length > 0;
    });
  }

  private buildFilters(query: ListProductUsageQueryDto, companyIds: string[]) {
    const filters: SQL<unknown>[] = [inArray(productUsage.companyId, companyIds)];
    if (query.product_id) {
      filters.push(eq(productUsage.productId, query.product_id));
    }
    if (query.garden_id) {
      filters.push(eq(productUsage.gardenId, query.garden_id));
    }
    if (query.company_membership_id) {
      filters.push(
        eq(productUsage.companyMembershipId, query.company_membership_id),
      );
    }
    if (query.date_from) {
      filters.push(gte(productUsage.date, query.date_from));
    }
    if (query.date_to) {
      filters.push(lte(productUsage.date, query.date_to));
    }
    return filters;
  }

  private async adjustProductStock(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    productId: string,
    companyId: string,
    delta: number,
  ) {
    const rows = await tx
      .select({
        id: products.id,
        stock_quantity: products.stockQuantity,
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
      .limit(1);

    const product = rows[0];
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const currentStock = Number(product.stock_quantity);
    const newStock = currentStock + delta;
    if (newStock < 0) {
      throw new BadRequestException('Insufficient product stock');
    }

    await tx
      .update(products)
      .set({ stockQuantity: newStock.toString() })
      .where(eq(products.id, productId));
  }

  private async findUsageById(id: string) {
    const rows = await db
      .select({
        id: productUsage.id,
        company_id: productUsage.companyId,
        product_id: productUsage.productId,
        product_name: products.name,
        garden_id: productUsage.gardenId,
        company_membership_id: productUsage.companyMembershipId,
        quantity: productUsage.quantity,
        date: productUsage.date,
        notes: productUsage.notes,
      })
      .from(productUsage)
      .innerJoin(products, eq(productUsage.productId, products.id))
      .where(eq(productUsage.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private async assertCompanyMembershipExistsInCompany(
    companyMembershipId: string,
    companyId: string,
  ) {
    const rows = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.id, companyMembershipId),
          eq(companyMemberships.companyId, companyId),
        ),
      )
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Company membership not found');
    }
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

  private async assertProductExistsInCompany(
    productId: string,
    companyId: string,
  ) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Product not found');
    }
  }

  private async assertCompanyMembershipCanAccessGarden(
    companyMembershipId: string,
    gardenId: string,
    companyId: string,
  ) {
    const rows = await db
      .select({ garden_id: gardens.id })
      .from(companyMembershipTeams)
      .innerJoin(
        tasks,
        and(
          eq(companyMembershipTeams.teamId, tasks.teamId),
          eq(companyMembershipTeams.companyId, tasks.companyId),
        ),
      )
      .innerJoin(
        gardens,
        and(eq(tasks.gardenId, gardens.id), eq(tasks.companyId, gardens.companyId)),
      )
      .where(
        and(
          eq(companyMembershipTeams.companyMembershipId, companyMembershipId),
          eq(companyMembershipTeams.companyId, companyId),
          eq(tasks.companyId, companyId),
        ),
      );

    const accessibleGardenIds = [
      ...new Set(rows.map((row) => row.garden_id).filter(Boolean)),
    ];

    if (!accessibleGardenIds.includes(gardenId)) {
      throw new ForbiddenException(
        'You can only register product usage for your gardens',
      );
    }
  }
}
