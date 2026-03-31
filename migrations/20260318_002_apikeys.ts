import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('apikeys');
}

