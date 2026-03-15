import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { products } from '../db/schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { PRODUCT_UNITS, type ProductUnit } from './products.constants';
import { UpdateProductDto } from './dto/update-product.dto';

type Requester = {
  id: string;
};

@Injectable()
export class ProductsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListProductsQueryDto) {
    const accessibleCompanyIds =
      await this.companiesService.resolveAccessibleCompanyIds(
        requester.id,
        query.company_id,
      );

    if (accessibleCompanyIds.length === 0) {
      return [];
    }

    const filters: SQL<unknown>[] = [
      inArray(products.companyId, accessibleCompanyIds),
    ];

    if (query.search) {
      filters.push(ilike(products.name, `%${query.search.trim()}%`));
    }

    return db
      .select({
        id: products.id,
        company_id: products.companyId,
        name: products.name,
        unit: products.unit,
        stock_quantity: products.stockQuantity,
        created_at: products.createdAt,
      })
      .from(products)
      .where(and(...filters))
      .orderBy(desc(products.createdAt));
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const product = await this.findProductById(id);
    if (!product) {
      return null;
    }

    if (companyId && companyId !== product.company_id) {
      return null;
    }

    await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      product.company_id,
    );

    return product;
  }

  async create(dto: CreateProductDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);

    const name = dto.name.trim();
    const unit = this.normalizeUnit(dto.unit);
    if (!name || !unit) {
      throw new BadRequestException('name and unit are required');
    }

    const rows = await db
      .insert(products)
      .values({
        companyId: dto.company_id,
        name,
        unit,
        stockQuantity: (dto.stock_quantity ?? 0).toString(),
      })
      .returning({
        id: products.id,
        company_id: products.companyId,
        name: products.name,
        unit: products.unit,
        stock_quantity: products.stockQuantity,
        created_at: products.createdAt,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateProductDto, requester: Requester) {
    const current = await this.findProductById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the product company_id',
      );
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const setPayload: {
      name?: string;
      unit?: ProductUnit;
      stockQuantity?: string;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('name cannot be empty');
      }
      setPayload.name = name;
      responsePayload.name = name;
    }
    if (dto.unit !== undefined) {
      const unit = this.normalizeUnit(dto.unit);
      setPayload.unit = unit;
      responsePayload.unit = unit;
    }
    if (dto.stock_quantity !== undefined) {
      setPayload.stockQuantity = dto.stock_quantity.toString();
      responsePayload.stock_quantity = dto.stock_quantity;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(products)
      .set(setPayload)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findProductById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    return deleted.length > 0;
  }

  async assertProductExistsInCompany(productId: string, companyId: string) {
    const product = await this.findProductById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.company_id !== companyId) {
      throw new BadRequestException('Product does not belong to this company');
    }

    return product;
  }

  private async findProductById(id: string) {
    const rows = await db
      .select({
        id: products.id,
        company_id: products.companyId,
        name: products.name,
        unit: products.unit,
        stock_quantity: products.stockQuantity,
        created_at: products.createdAt,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private normalizeUnit(unit: string): ProductUnit {
    const normalized = unit.trim().toLowerCase();
    if (!PRODUCT_UNITS.includes(normalized as ProductUnit)) {
      throw new BadRequestException(
        `Invalid unit. Allowed: ${PRODUCT_UNITS.join(', ')}`,
      );
    }
    return normalized as ProductUnit;
  }
}
