import type { Knex } from 'knex';
import type { Provider } from '../providers/types.js';
import type { Env } from '../config/env-schema.js';
import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
    db: Knex;
    provider: Provider;
    authenticate: (req: FastifyRequest) => Promise<void>;
  }
}

