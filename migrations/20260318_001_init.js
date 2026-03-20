export async function up(knex) {
    await knex.schema.createTable('zones', (t) => {
        t.bigIncrements('id').primary();
        t.string('code', 16).notNullable().unique();
        t.string('name', 128).notNullable();
        t.string('base_url', 512).notNullable();
        t.boolean('is_active').notNullable().defaultTo(true);
        t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
        t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
    await knex.schema.createTable('zone_credentials', (t) => {
        t.bigIncrements('id').primary();
        t.bigInteger('zone_id').unsigned().notNullable().references('id').inTable('zones').onDelete('CASCADE');
        t.string('app_key', 256).notNullable();
        t.text('app_secret_encrypted').notNullable();
        t.string('user_id', 256).notNullable();
        t.text('user_pwd_md5_encrypted').notNullable();
        t.text('access_token_encrypted').nullable();
        t.text('refresh_token_encrypted').nullable();
        t.dateTime('token_expires_at').nullable();
        t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
        t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
        t.unique(['zone_id']);
    });
    await knex.schema.createTable('devices_cache', (t) => {
        t.bigIncrements('id').primary();
        t.bigInteger('zone_id').unsigned().notNullable().references('id').inTable('zones').onDelete('CASCADE');
        t.string('imei', 32).notNullable();
        t.string('device_name', 256).nullable();
        t.string('device_type', 128).nullable();
        t.string('sim', 64).nullable();
        t.string('device_group_id', 64).nullable();
        t.string('device_group', 256).nullable();
        t.boolean('enabled_flag').notNullable().defaultTo(true);
        t.string('driver_name', 256).nullable();
        t.string('driver_phone', 64).nullable();
        t.string('engine_number', 128).nullable();
        t.string('vin', 128).nullable();
        t.string('plate_number', 64).nullable();
        t.json('raw_payload_json').nullable();
        t.dateTime('last_synced_at').notNullable().defaultTo(knex.fn.now());
        t.unique(['zone_id', 'imei']);
        t.index(['zone_id']);
        t.index(['imei']);
    });
    await knex.schema.createTable('sync_jobs', (t) => {
        t.bigIncrements('id').primary();
        t.bigInteger('zone_id').unsigned().notNullable().references('id').inTable('zones').onDelete('CASCADE');
        t.string('job_type', 64).notNullable();
        t.string('status', 32).notNullable();
        t.dateTime('started_at').notNullable().defaultTo(knex.fn.now());
        t.dateTime('finished_at').nullable();
        t.integer('records_processed').notNullable().defaultTo(0);
        t.text('error_message').nullable();
        t.index(['zone_id', 'job_type', 'status']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('sync_jobs');
    await knex.schema.dropTableIfExists('devices_cache');
    await knex.schema.dropTableIfExists('zone_credentials');
    await knex.schema.dropTableIfExists('zones');
}
