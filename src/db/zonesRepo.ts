import type { Knex } from 'knex';

export type ZoneRow = {
  id: number;
  code: string;
  name: string;
  base_url: string;
  is_active: 0 | 1;
};

export async function listActiveZones(db: Knex): Promise<Pick<ZoneRow, 'code' | 'name'>[]> {
  const rows = await db<ZoneRow>('zones').select(['code', 'name']).where({ is_active: 1 }).orderBy('code', 'asc');
  return rows;
}

export async function getZoneByCode(db: Knex, code: string): Promise<ZoneRow | null> {
  const row = await db<ZoneRow>('zones').select('*').where({ code }).first();
  return row ?? null;
}

