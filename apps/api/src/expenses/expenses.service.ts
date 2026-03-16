import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../db';
import { expenses, gardens } from '../db/schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import type { ExpenseCategory } from './expenses.constants';

type Requester = {
  id: string;
};

@Injectable()
export class ExpensesService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(requester: Requester, query: ListExpensesQueryDto) {
    const accessibleCompanyIds =
      await this.companiesService.resolveAdminCompanyIds(
        requester.id,
        query.company_id,
      );

    if (accessibleCompanyIds.length === 0) {
      return [];
    }

    const filters: SQL<unknown>[] = [
      inArray(expenses.companyId, accessibleCompanyIds),
    ];

    if (query.garden_id) {
      filters.push(eq(expenses.gardenId, query.garden_id));
    }
    if (query.date_from) {
      filters.push(gte(expenses.date, query.date_from));
    }
    if (query.date_to) {
      filters.push(lte(expenses.date, query.date_to));
    }

    return db
      .select({
        id: expenses.id,
        company_id: expenses.companyId,
        garden_id: expenses.gardenId,
        category: expenses.category,
        description: expenses.description,
        amount: expenses.amount,
        date: expenses.date,
      })
      .from(expenses)
      .where(and(...filters))
      .orderBy(desc(expenses.date), desc(expenses.id));
  }

  async findById(id: string, requester: Requester, companyId?: string) {
    const expense = await this.findExpenseById(id);
    if (!expense) {
      return null;
    }

    if (companyId && companyId !== expense.company_id) {
      return null;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      expense.company_id,
    );

    return expense;
  }

  async create(dto: CreateExpenseDto, requester: Requester) {
    await this.companiesService.assertAdminAccess(requester.id, dto.company_id);
    await this.assertGardenExistsInCompany(dto.garden_id, dto.company_id);

    const rows = await db
      .insert(expenses)
      .values({
        companyId: dto.company_id,
        gardenId: dto.garden_id,
        category: dto.category,
        description: dto.description,
        amount: dto.amount.toString(),
        date: dto.date,
      })
      .returning({
        id: expenses.id,
        company_id: expenses.companyId,
        garden_id: expenses.gardenId,
        category: expenses.category,
        description: expenses.description,
        amount: expenses.amount,
        date: expenses.date,
      });

    return rows[0];
  }

  async update(id: string, dto: UpdateExpenseDto, requester: Requester) {
    const current = await this.findExpenseById(id);
    if (!current) {
      return null;
    }

    if (dto.company_id !== current.company_id) {
      throw new BadRequestException(
        'company_id must match the expense company_id',
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
      category?: ExpenseCategory;
      description?: string;
      amount?: string;
      date?: string;
    } = {};
    const responsePayload: Record<string, unknown> = {
      id,
      company_id: current.company_id,
    };

    if (dto.garden_id !== undefined) {
      setPayload.gardenId = dto.garden_id;
      responsePayload.garden_id = dto.garden_id;
    }
    if (dto.category !== undefined) {
      setPayload.category = dto.category;
      responsePayload.category = dto.category;
    }
    if (dto.description !== undefined) {
      setPayload.description = dto.description;
      responsePayload.description = dto.description;
    }
    if (dto.amount !== undefined) {
      setPayload.amount = dto.amount.toString();
      responsePayload.amount = dto.amount.toFixed(2);
    }
    if (dto.date !== undefined) {
      setPayload.date = dto.date;
      responsePayload.date = dto.date;
    }

    if (Object.keys(setPayload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updated = await db
      .update(expenses)
      .set(setPayload)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });

    return updated.length > 0 ? responsePayload : null;
  }

  async remove(id: string, requester: Requester) {
    const current = await this.findExpenseById(id);
    if (!current) {
      return false;
    }

    await this.companiesService.assertAdminAccess(
      requester.id,
      current.company_id,
    );

    const deleted = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });

    return deleted.length > 0;
  }

  private async findExpenseById(id: string) {
    const rows = await db
      .select({
        id: expenses.id,
        company_id: expenses.companyId,
        garden_id: expenses.gardenId,
        category: expenses.category,
        description: expenses.description,
        amount: expenses.amount,
        date: expenses.date,
      })
      .from(expenses)
      .where(eq(expenses.id, id))
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
