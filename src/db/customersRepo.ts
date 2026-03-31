import type { Knex } from 'knex';

export type CustomerRow = {
  id: number;
  nit: string;
  name: string;
  is_active: 0 | 1;
  created_at: Date;
  updated_at: Date;
};

export async function getActiveCustomers(db: Knex): Promise<CustomerRow[]> {
  return db<CustomerRow>('customers').select('*').where({ is_active: 1 }).orderBy('name', 'asc');
}

export async function getActiveCustomerByNit(db: Knex, nit: string): Promise<CustomerRow | null> {
  const row = await db<CustomerRow>('customers').select('*').where({ nit, is_active: 1 }).first();
  return row ?? null;
}
