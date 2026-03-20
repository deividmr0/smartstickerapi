import fp from 'fastify-plugin';
import knexFactory from 'knex';

export const dbPlugin = fp(async (app) => {
  const db = knexFactory({
    client: 'mysql2',
    connection: {
      host: app.config.DB_HOST,
      port: app.config.DB_PORT,
      user: app.config.DB_USER,
      password: app.config.DB_PASSWORD,
      database: app.config.DB_NAME,
    },
    pool: { min: 0, max: 10 },
  });

  app.decorate('db', db);

  app.addHook('onClose', async () => {
    await db.destroy();
  });
});

