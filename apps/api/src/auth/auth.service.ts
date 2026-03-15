import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.types';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  get refreshCookieName(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_COOKIE_NAME') ??
      'refresh_token'
    );
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    return this.usersService.validateUser(email, password);
  }

  async login(user: User, response: Response) {
    const tokens = await this.generateTokens(user);
    this.setRefreshCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      ...(await this.buildSessionPayload(user)),
    };
  }

  async refresh(refreshToken: string | undefined, response: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ??
          'dev_refresh_secret_change_me',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user);
    this.setRefreshCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

  logout(response: Response) {
    response.clearCookie(this.refreshCookieName, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureCookie(),
    });

    return { success: true };
  }

  async me(authenticatedUser: { id: string }) {
    const user = await this.usersService.findById(authenticatedUser.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildSessionPayload(user);
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessExpiresInSeconds = Math.floor(
      this.parseDurationMs(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      ) / 1000,
    );
    const refreshExpiresInSeconds = Math.floor(
      this.parseDurationMs(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      ) / 1000,
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ??
          'dev_access_secret_change_me',
        expiresIn: accessExpiresInSeconds,
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ??
          'dev_refresh_secret_change_me',
        expiresIn: refreshExpiresInSeconds,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async buildSessionPayload(user: User) {
    const companies = await this.companiesService.listAccessibleCompanies(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      companies,
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(this.refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureCookie(),
      path: '/',
      maxAge: this.parseDurationMs(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      ),
    });
  }

  private isSecureCookie(): boolean {
    const explicit = this.configService.get<string>('JWT_REFRESH_COOKIE_SECURE');
    if (explicit === 'true') {
      return true;
    }
    if (explicit === 'false') {
      return false;
    }
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * unitMs[unit];
  }
}
