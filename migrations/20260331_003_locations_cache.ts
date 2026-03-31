import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('device_track_cache_points'))) {
    await knex.schema.createTable('device_track_cache_points', (t) => {
      t.bigIncrements('id').primary();
      t.bigInteger('zone_id').unsigned().notNullable().references('id').inTable('zones').onDelete('CASCADE');
      t.string('imei', 32).notNullable();
      t.dateTime('gps_time').notNullable();
      t.decimal('latitude', 10, 7).nullable();
      t.decimal('longitude', 10, 7).nullable();
      t.decimal('speed', 10, 2).nullable();
      t.decimal('course', 10, 2).nullable();
      t.string('position_type', 32).nullable();
      t.integer('satellite').nullable();
      t.string('ignition', 16).nullable();
      t.string('acc_status', 16).nullable();
      t.json('raw_payload_json').nullable();
      t.dateTime('last_synced_at').notNullable().defaultTo(knex.fn.now());

      t.unique(['zone_id', 'imei', 'gps_time'], { indexName: 'uniq_track_points' });
      t.index(['zone_id', 'imei', 'gps_time'], 'idx_track_points_range');
    });
  }

  if (!(await knex.schema.hasTable('device_track_cache_windows'))) {
    await knex.schema.createTable('device_track_cache_windows', (t) => {
      t.bigIncrements('id').primary();
      t.bigInteger('zone_id').unsigned().notNullable().references('id').inTable('zones').onDelete('CASCADE');
      t.string('imei', 32).notNullable();
      t.dateTime('begin_time').notNullable();
      t.dateTime('end_time').notNullable();
      t.decimal('mileage', 12, 3).nullable();
      t.dateTime('last_synced_at').notNullable().defaultTo(knex.fn.now());

      t.unique(['zone_id', 'imei', 'begin_time', 'end_time'], { indexName: 'uniq_track_windows' });
      t.index(['zone_id', 'imei', 'last_synced_at'], 'idx_track_windows_fresh');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('device_track_cache_windows');
  await knex.schema.dropTableIfExists('device_track_cache_points');
}
