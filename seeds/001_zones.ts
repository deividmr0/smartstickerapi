import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('zones').del();
  await knex('zones').insert([
    { code: 'ts', name: 'Tracksolid (TS)', base_url: 'http://open.10000track.com/route/rest', is_active: 1 },
    { code: 'hk', name: 'Hong Kong / Singapore', base_url: 'https://hk-open.tracksolidpro.com/route/rest', is_active: 1 },
    { code: 'eu', name: 'Europe', base_url: 'https://eu-open.tracksolidpro.com/route/rest', is_active: 1 },
    { code: 'us', name: 'United States', base_url: 'https://us-open.tracksolidpro.com/route/rest', is_active: 1 }
  ]);
}

