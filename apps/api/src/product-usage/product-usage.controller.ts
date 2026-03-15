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
import { CreateProductUsageDto } from './dto/create-product-usage.dto';
import { ListProductUsageQueryDto } from './dto/list-product-usage-query.dto';
import { UpdateProductUsageDto } from './dto/update-product-usage.dto';
import { ProductUsageService } from './product-usage.service';

@UseGuards(JwtAuthGuard)
@Controller('product-usage')
export class ProductUsageController {
  constructor(private readonly productUsageService: ProductUsageService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: ListProductUsageQueryDto) {
    return this.productUsageService.findAll(this.requesterFrom(request), query);
  }

  @Get(':id')
  async findOne(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const usage = await this.productUsageService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );
    if (!usage) {
      throw new NotFoundException('Product usage not found');
    }
    return usage;
  }

  @Post()
  create(@Req() request: Request, @Body() dto: CreateProductUsageDto) {
    return this.productUsageService.create(dto, this.requesterFrom(request));
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductUsageDto,
  ) {
    const updated = await this.productUsageService.update(
      id,
      dto,
      this.requesterFrom(request),
    );
    if (!updated) {
      throw new NotFoundException('Product usage not found');
    }
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const removed = await this.productUsageService.remove(
      id,
      this.requesterFrom(request),
    );
    if (!removed) {
      throw new NotFoundException('Product usage not found');
    }
  }
}
