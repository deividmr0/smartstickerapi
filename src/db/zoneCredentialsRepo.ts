import type { Knex } from 'knex';

export type ZoneCredentialsRow = {
  id: number;
  zone_id: number;
  app_key: string;
  app_secret_encrypted: string;
  user_id: string;
  user_pwd_md5_encrypted: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function getZoneCredentialsByZoneId(db: Knex, zoneId: number): Promise<ZoneCredentialsRow | null> {
  const row = await db<ZoneCredentialsRow>('zone_credentials').select('*').where({ zone_id: zoneId }).first();
  return row ?? null;
}

export async function upsertZoneCredentials(
  db: Knex,
  input: Pick<ZoneCredentialsRow, 'zone_id' | 'app_key' | 'app_secret_encrypted' | 'user_id' | 'user_pwd_md5_encrypted'>,
): Promise<void> {
  await db('zone_credentials')
    .insert({
      ...input,
      updated_at: new Date(),
      created_at: new Date(),
    })
    .onConflict(['zone_id'])
    .merge({
      app_key: input.app_key,
      app_secret_encrypted: input.app_secret_encrypted,
      user_id: input.user_id,
      user_pwd_md5_encrypted: input.user_pwd_md5_encrypted,
      updated_at: new Date(),
    });
}

export async function updateZoneTokens(
  db: Knex,
  zoneId: number,
  tokens: {
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expires_at: Date;
  },
): Promise<void> {
  await db('zone_credentials').where({ zone_id: zoneId }).update({
    ...tokens,
    updated_at: new Date(),
  });
}

