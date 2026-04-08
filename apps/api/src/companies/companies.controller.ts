import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  private requesterFrom(request: Request) {
    const user = request.user as { id: string };
    return { id: user.id };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    const company = await this.companiesService.findAccessibleCompanyById(
      id,
      this.requesterFrom(request).id,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() request: Request,
  ) {
    const company = await this.companiesService.updateCompany(
      id,
      dto,
      this.requesterFrom(request).id,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }
}
