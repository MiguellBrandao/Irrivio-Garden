import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { companyMemberships, users } from '../db/schema';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { User } from './users.types';

@Injectable()
export class UsersService {
  async findById(id: string): Promise<User | null> {
    const row = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!row[0]) {
      return null;
    }

    const employeeProfiles = await this.findEmployeeProfiles(id);
    return this.mapDbUser(row[0], employeeProfiles);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const row = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!row[0]) {
      return null;
    }

    const { passwordHash } = row[0];

    // Supports bcrypt hashes and plain values during transition.
    const validPassword = passwordHash.startsWith('$2')
      ? await compare(password, passwordHash)
      : password === passwordHash;

    if (!validPassword) {
      return null;
    }

    const employeeProfiles = await this.findEmployeeProfiles(row[0].id);
    return this.mapDbUser(row[0], employeeProfiles);
  }

  async updateProfile(id: string, dto: UpdateMyProfileDto): Promise<User | null> {
    const rows = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const target = rows[0];
    if (!target) {
      return null;
    }

    const trimmedName = dto.name?.trim();
    const password = dto.password?.trim();

    if (!trimmedName && !password) {
      throw new BadRequestException('No fields provided for update');
    }

    await db.transaction(async (tx) => {
      if (trimmedName) {
        const employeeRows = await tx
          .select({ id: companyMemberships.id })
          .from(companyMemberships)
          .where(eq(companyMemberships.userId, id));

        if (employeeRows.length === 0) {
          throw new BadRequestException(
            'Name update is not available for this account',
          );
        }

        await tx
          .update(companyMemberships)
          .set({ name: trimmedName })
          .where(eq(companyMemberships.userId, id));
      }

      if (password) {
        await tx
          .update(users)
          .set({ passwordHash: await hash(password, 10) })
          .where(eq(users.id, id));
      }
    });

    return this.findById(id);
  }

  private async findEmployeeProfiles(userId: string) {
    return db
      .select({
        name: companyMemberships.name,
        active: companyMemberships.active,
        created_at: companyMemberships.createdAt,
      })
      .from(companyMemberships)
      .where(eq(companyMemberships.userId, userId))
      .orderBy(
        desc(companyMemberships.active),
        desc(companyMemberships.createdAt),
      );
  }

  private mapDbUser(
    row: {
      id: string;
      email: string;
    },
    employeeProfiles: Array<{
      name: string;
      active: boolean;
      created_at: Date;
    }>,
  ): User | null {
    const activeProfile = employeeProfiles.find((profile) => profile.active);
    const fallbackProfile = employeeProfiles[0];

    if (!activeProfile) {
      throw new UnauthorizedException('User has no active company memberships');
    }

    return {
      id: row.id,
      email: row.email,
      name:
        activeProfile?.name ??
        fallbackProfile?.name ??
        this.fallbackNameFromEmail(row.email),
    };
  }

  private fallbackNameFromEmail(email: string): string {
    const base = email.split('@')[0] ?? 'user';
    return base.replace(/[._-]+/g, ' ').trim() || 'User';
  }
}
