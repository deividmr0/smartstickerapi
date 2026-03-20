import fp from 'fastify-plugin';
import env from '@fastify/env';
import { EnvSchema } from '../config/env-schema.js';

export const envPlugin = fp(async (app) => {
  await app.register(env, {
    confKey: 'config',
    schema: EnvSchema,
    dotenv: true,
  });
});

