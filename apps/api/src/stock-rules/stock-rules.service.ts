import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { products, stockRules } from '../db/schema';
import { CreateStockRuleDto } from './dto/create-stock-rule.dto';
import { ListStockRulesQueryDto } from './dto/list-stock-rules-query.dto';
import { UpdateStockRuleDto } from './dto/update-stock-rule.dto';
import type { StockRuleOperator } from './stock-rules.constants';

type Requester = {
  id: string;
};

@Injectable()
export class StockRulesService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListStockRulesQueryDto) {
    const accessibleCompanyIds =
      await this.companiesService.resolveAccessibleCompanyIds(
        requester.id,
        query.company_id,
      );

    if (accessibleCompanyIds.length === 0) {
      return [];
    }

    const filters: SQL<unknown>[] = [
      inArray(stockRules.companyId, accessibleCompanyIds),
    ];

    if (query.product_id) {
      filters.push(eq(stockRules.productId, query.product_id));
    }

    return db
      .select({
        id: stockRules.id,
        company_id: stockRules.companyId,
        product_id: stockRules.productId,
        product_name: products.name,
        product_unit: products.unit,
        product_stock_quantity: products.stockQuantity,
        operator: stockRules.operator,
        threshold_quantity: stockRules.thresholdQuantity,
        emails: stockRules.emails,
        created_at: stockRules.createdAt,
      })
      .from(stockRules)
      .innerJoin(products, eq(stockRules.productId, products.id))
      .where(and(...filters))
      .orderBy(desc(stockRules.createdAt));
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const stockRule = await this.findStockRuleById(id);
    if (!stockRule) {
      return null;
    }

    if (companyId && companyId !== stockRule.company_id) {
      return null;
    }

    await this.companiesService.assertUserBelongsToCompany(
      requester.id,
      stockRule.company_id,
    );

    return stockRule;
  }

  async create(dto: CreateStockRuleDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);
    await this.assertProductExistsInCompany(dto.product_id, dto.company_id);

    const rows = await db
      .insert(stockRules)
      .values({
        companyId: dto.company_id,
        productId: dto.product_id,
        operator: dto.operator,
        thresholdQuantity: dto.threshold_quantity.toString(),
        emails: dto.emails,
      })
      .returning({
        id: stockRules.id,
        company_id: stockRules.companyId,
        product_id: stockRules.productId,
        operator: stockRules.operator,
        threshold_quantity: stockRules.thresholdQuantity,
        emails: stockRules.emails,
        created_at: stockRules.createdAt,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateStockRuleDto, requester: Requester) {
    const current = await this.findStockRuleById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the stock rule company_id',
      );
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const targetProductId = dto.product_id ?? current.product_id;
    await this.assertProductExistsInCompany(targetProductId, current.company_id);

    const setPayload: {
      productId?: string;
      operator?: StockRuleOperator;
      thresholdQuantity?: string;
      emails?: string[];
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.product_id !== undefined) {
      setPayload.productId = dto.product_id;
      responsePayload.product_id = dto.product_id;
    }
    if (dto.operator !== undefined) {
      setPayload.operator = dto.operator;
      responsePayload.operator = dto.operator;
    }
    if (dto.threshold_quantity !== undefined) {
      setPayload.thresholdQuantity = dto.threshold_quantity.toString();
      responsePayload.threshold_quantity = dto.threshold_quantity;
    }
    if (dto.emails !== undefined) {
      setPayload.emails = dto.emails;
      responsePayload.emails = dto.emails;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(stockRules)
      .set(setPayload)
      .where(eq(stockRules.id, id))
      .returning({ id: stockRules.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findStockRuleById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(stockRules)
      .where(eq(stockRules.id, id))
      .returning({ id: stockRules.id });

    return deleted.length > 0;
  }

  private async findStockRuleById(id: string) {
    const rows = await db
      .select({
        id: stockRules.id,
        company_id: stockRules.companyId,
        product_id: stockRules.productId,
        product_name: products.name,
        product_unit: products.unit,
        product_stock_quantity: products.stockQuantity,
        operator: stockRules.operator,
        threshold_quantity: stockRules.thresholdQuantity,
        emails: stockRules.emails,
        created_at: stockRules.createdAt,
      })
      .from(stockRules)
      .innerJoin(products, eq(stockRules.productId, products.id))
      .where(eq(stockRules.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private async assertProductExistsInCompany(productId: string, companyId: string) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
      .limit(1);

    if (!rows[0]) {
      throw new NotFoundException('Product not found');
    }
  }
}
