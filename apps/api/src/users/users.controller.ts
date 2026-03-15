import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  async updateMyProfile(
    @Body() dto: UpdateMyProfileDto,
    @Req() request: Request,
  ) {
    const user = request.user as { id: string };
    const updatedUser = await this.usersService.updateProfile(user.id, dto);

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      user: updatedUser,
    };
  }
}
