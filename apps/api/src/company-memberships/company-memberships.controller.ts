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
import { CreateCompanyMembershipDto } from './dto/create-company-membership.dto';
import { UpdateCompanyMembershipDto } from './dto/update-company-membership.dto';
import { CompanyMembershipsService } from './company-memberships.service';

@UseGuards(JwtAuthGuard)
@Controller('company-memberships')
export class CompanyMembershipsController {
  constructor(
    private readonly companyMembershipsService: CompanyMembershipsService,
  ) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: CompanyScopedQueryDto) {
    return this.companyMembershipsService.findAll(
      this.requesterFrom(request),
      query.company_id,
    );
  }

  @Post()
  create(@Body() dto: CreateCompanyMembershipDto, @Req() request: Request) {
    return this.companyMembershipsService.create(dto, this.requesterFrom(request));
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Query() query: CompanyScopedQueryDto,
  ) {
    const companyMembership = await this.companyMembershipsService.findById(
      id,
      this.requesterFrom(request),
      query.company_id,
    );
    if (!companyMembership) {
      throw new NotFoundException('Company membership not found');
    }
    return companyMembership;
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCompanyMembershipDto,
    @Req() request: Request,
  ) {
    const companyMembership = await this.companyMembershipsService.update(
      id,
      dto,
      this.requesterFrom(request),
    );
    if (!companyMembership) {
      throw new NotFoundException('Company membership not found');
    }
    return companyMembership;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    const removed = await this.companyMembershipsService.remove(
      id,
      this.requesterFrom(request),
    );
    if (!removed) {
      throw new NotFoundException('Company membership not found');
    }
  }
}
