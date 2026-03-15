import 'dotenv/config';
import { hash } from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { companies, companyMemberships, users } from '../src/db/schema';

async function seedUsers() {
  const plainPassword = 'Nodeapp2107.';
  const passwordHash = await hash(plainPassword, 10);
  const defaultCompanySlug = 'floripa-jardins';

  const seedData = [
    {
      email: 'miguellbdefault@gmail.com',
      role: 'admin' as const,
      employeeName: 'Miguel Admin',
    },
    {
      email: 'miguellbwork@gmail.com',
      role: 'employee' as const,
      employeeName: 'Miguel Work',
    },
  ];

  const existingUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      inArray(
        users.email,
        seedData.map((item) => item.email),
      ),
    );

  if (existingUsers.length > 0) {
    await db.delete(companyMemberships).where(
      inArray(
        companyMemberships.userId,
        existingUsers.map((user) => user.id),
      ),
    );
  }

  await db.delete(users).where(
    inArray(
      users.email,
      seedData.map((item) => item.email),
    ),
  );

  let defaultCompanyId =
    (
      await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.slug, defaultCompanySlug))
        .limit(1)
    )[0]?.id ?? null;

  if (!defaultCompanyId) {
    const insertedCompanies = await db
      .insert(companies)
      .values({
        name: 'Floripa Jardins',
        slug: defaultCompanySlug,
        logoPath: '/companies/floripa-jardins.png',
        faviconPath: '/companies/floripa-jardins-favicon.png',
        address: 'Rua Horta do Palacio- Edf. Palacio Apart.1007, 8500-512 Portimao',
        nif: '233125825',
        mobilePhone: '965403815',
        email: 'talesbrandao@hotmail.com',
        iban: 'PT 50 0007 02 87 302 5220 0028 0',
      })
      .returning({ id: companies.id });

    defaultCompanyId = insertedCompanies[0]?.id ?? null;
  }

  if (!defaultCompanyId) {
    throw new Error('Nao foi possivel criar a company por defeito');
  }

  const insertedUsers = await db
    .insert(users)
    .values(
      seedData.map((item) => ({
        email: item.email,
        passwordHash,
      })),
    )
    .returning({ id: users.id, email: users.email });

  await db.insert(companyMemberships).values(
    insertedUsers.map((inserted) => {
      const match = seedData.find((item) => item.email === inserted.email);
      return {
        companyId: defaultCompanyId,
        userId: inserted.id,
        role: match?.role ?? 'employee',
        name: match?.employeeName ?? inserted.email,
      };
    }),
  );

  console.log('Seed concluido:', insertedUsers.map((u) => u.email).join(', '));
}

seedUsers()
  .catch((error) => {
    console.error('Erro no seed de users:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
