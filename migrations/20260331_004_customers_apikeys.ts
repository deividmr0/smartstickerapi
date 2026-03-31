import crypto from 'node:crypto';
import type { Knex } from 'knex';

type LegacyApiKeyRow = {
  id: number;
  client_id: string;
  api_key: string;
  is_active: 0 | 1;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
};

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('customers'))) {
    await knex.schema.createTable('customers', (t) => {
      t.bigIncrements('id').primary();
      t.string('nit', 32).notNullable().unique();
      t.string('name', 256).notNullable();
      t.boolean('is_active').notNullable().defaultTo(true);
      t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
      t.index(['is_active'], 'idx_customers_active');
    });
  }

  const hasLegacyClientId = await knex.schema.hasColumn('apikeys', 'client_id');
  const hasLegacyApiKey = await knex.schema.hasColumn('apikeys', 'api_key');
  const hasCustomerId = await knex.schema.hasColumn('apikeys', 'customer_id');
  const hasApiKeyHash = await knex.schema.hasColumn('apikeys', 'api_key_hash');

  if (!hasLegacyClientId && !hasLegacyApiKey && hasCustomerId && hasApiKeyHash) {
    return;
  }

  if (await knex.schema.hasTable('apikeys_v2')) {
    await knex.schema.dropTable('apikeys_v2');
  }

  await knex.schema.createTable('apikeys_v2', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.string('api_key_hash', 128).notNullable().unique();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('last_used_at').nullable();
    t.dateTime('revoked_at').nullable();
    t.index(['customer_id'], 'idx_apikeys_customer_id');
    t.index(['is_active'], 'idx_apikeys_active');
  });

  const legacyRows = await knex<LegacyApiKeyRow>('apikeys').select('*');
  const legacyClientIds = Array.from(new Set(legacyRows.map((r) => r.client_id).filter(Boolean)));

  for (const clientId of legacyClientIds) {
    const existing = await knex('customers').select('id').where({ nit: clientId }).first();
    if (!existing) {
      await knex('customers').insert({
        nit: clientId,
        name: `Migrado ${clientId}`,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  for (const row of legacyRows) {
    const customer = await knex('customers').select('id').where({ nit: row.client_id }).first();
    if (!customer) continue;
    const apiKeyHash = crypto.createHash('sha256').update(row.api_key).digest('hex');
    await knex('apikeys_v2').insert({
      id: row.id,
      customer_id: customer.id,
      api_key_hash: apiKeyHash,
      is_active: row.is_active,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      revoked_at: row.revoked_at,
    });
  }

  await knex.schema.dropTable('apikeys');
  await knex.schema.renameTable('apikeys_v2', 'apikeys');
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('apikeys')) {
    await knex.schema.dropTable('apikeys');
  }

  await knex.schema.createTable('apikeys', (t) => {
    t.bigIncrements('id').primary();
    t.string('client_id', 128).notNullable();
    t.string('api_key', 128).notNullable().unique();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('last_used_at').nullable();
    t.dateTime('revoked_at').nullable();
    t.index(['client_id']);
    t.index(['is_active']);
  });

  await knex.schema.dropTableIfExists('customers');
}
