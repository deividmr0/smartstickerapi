import type { Knex } from 'knex';

export type ApiKeyRow = {
  id: number;
  customer_id: number;
  api_key_hash: string;
  is_active: 0 | 1;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
};

export async function createApiKey(db: Knex, customerId: number, apiKeyHash: string): Promise<void> {
  await db<ApiKeyRow>('apikeys').insert({
    customer_id: customerId,
    api_key_hash: apiKeyHash,
    is_active: 1,
    created_at: new Date(),
    last_used_at: null,
    revoked_at: null,
  });
}

export async function getActiveApiKeyByHash(db: Knex, apiKeyHash: string): Promise<ApiKeyRow | null> {
  const row = await db<ApiKeyRow>('apikeys')
    .select('*')
    .where({ api_key_hash: apiKeyHash, is_active: 1 })
    .whereNull('revoked_at')
    .first();
  return row ?? null;
}

export async function touchApiKey(db: Knex, id: number): Promise<void> {
  await db<ApiKeyRow>('apikeys').where({ id }).update({ last_used_at: new Date() });
}

