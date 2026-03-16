import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyScopedQueryDto } from '../common/dto/company-scoped-query.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: ListExpensesQueryDto) {
    return this.expensesService.findAll(this.requesterFrom(request), query);
  }

  @Get(':id')
  async findOne(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const expense = await this.expensesService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  @Post()
  create(@Req() request: Request, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const updated = await this.expensesService.update(
      id,
      dto,
      this.requesterFrom(request),
    );

    if (!updated) {
      throw new NotFoundException('Expense not found');
    }

    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const removed = await this.expensesService.remove(
      id,
      this.requesterFrom(request),
    );

    if (!removed) {
      throw new NotFoundException('Expense not found');
    }
  }
}
