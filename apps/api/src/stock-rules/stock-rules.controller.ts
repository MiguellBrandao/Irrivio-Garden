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
import { CreateStockRuleDto } from './dto/create-stock-rule.dto';
import { ListStockRulesQueryDto } from './dto/list-stock-rules-query.dto';
import { UpdateStockRuleDto } from './dto/update-stock-rule.dto';
import { StockRulesService } from './stock-rules.service';

@UseGuards(JwtAuthGuard)
@Controller('stock-rules')
export class StockRulesController {
  constructor(private readonly stockRulesService: StockRulesService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: ListStockRulesQueryDto) {
    return this.stockRulesService.findAll(this.requesterFrom(request), query);
  }

  @Get(':id')
  async findOne(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const stockRule = await this.stockRulesService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );

    if (!stockRule) {
      throw new NotFoundException('Stock rule not found');
    }

    return stockRule;
  }

  @Post()
  create(@Req() request: Request, @Body() dto: CreateStockRuleDto) {
    return this.stockRulesService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStockRuleDto,
  ) {
    const updated = await this.stockRulesService.update(
      id,
      dto,
      this.requesterFrom(request),
    );

    if (!updated) {
      throw new NotFoundException('Stock rule not found');
    }

    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const removed = await this.stockRulesService.remove(
      id,
      this.requesterFrom(request),
    );

    if (!removed) {
      throw new NotFoundException('Stock rule not found');
    }
  }
}
