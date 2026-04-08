import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootEnvFile = resolve(scriptDir, '../../../.env');

if (existsSync(rootEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(rootEnvFile);
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/floripa';

const email = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = (process.env.SUPER_ADMIN_PASSWORD ?? '').trim();

if (!email || !password) {
  console.log(
    'Skipping super admin bootstrap: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is missing.',
  );
  process.exit(0);
}

const pool = new Pool({ connectionString });

try {
  const passwordHash = await hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, is_super_admin)
     VALUES ($1, $2, true)
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       is_super_admin = true
     RETURNING xmax = 0 AS inserted`,
    [email, passwordHash],
  );

  if (result.rows[0]?.inserted) {
    console.log(`Super admin created: ${email}`);
  } else {
    console.log(`Super admin ensured for existing user: ${email}`);
  }
} finally {
  await pool.end();
}
