import 'dotenv/config';
import crypto from 'node:crypto';
import knexFactory from 'knex';
import { createApiKey } from '../src/db/apiKeysRepo.js';
import { getActiveCustomerByNit, getActiveCustomers } from '../src/db/customersRepo.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno ${name}`);
  return value;
}

function parseNitArg(): string | null {
  const arg = process.argv.find((x) => x.startsWith('--nit='));
  if (!arg) return null;
  const value = arg.slice('--nit='.length).trim();
  return value || null;
}

function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function main() {
  const db = knexFactory({
    client: 'mysql2',
    connection: {
      host: requireEnv('DB_HOST'),
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: requireEnv('DB_USER'),
      password: process.env.DB_PASSWORD ?? '',
      database: requireEnv('DB_NAME'),
    },
  });

  try {
    const nit = parseNitArg();
    const customers = nit
      ? (() => {
          const one = getActiveCustomerByNit(db, nit);
          return one.then((row) => (row ? [row] : []));
        })()
      : getActiveCustomers(db);

    const rows = await customers;
    if (rows.length === 0) {
      // eslint-disable-next-line no-console
      console.log(nit ? `No hay customer activo para nit=${nit}` : 'No hay customers activos');
      return;
    }

    for (const customer of rows) {
      const apiKey = generateApiKey();
      const apiKeyHash = sha256(apiKey);
      await createApiKey(db, customer.id, apiKeyHash);
      // eslint-disable-next-line no-console
      console.log(`${customer.nit}\t${customer.name}\t${apiKey}`);
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
