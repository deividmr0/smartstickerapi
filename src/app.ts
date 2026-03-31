import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import { envPlugin } from './plugins/env.js';
import { errorsPlugin } from './plugins/errors.js';
import { dbPlugin } from './plugins/db.js';
import { providerPlugin } from './plugins/provider.js';
import { authPlugin } from './plugins/auth.js';

import { healthRoutes } from './routes/health.js';
import { zonesRoutes } from './routes/zones.js';
import { devicesRoutes } from './routes/devices.js';
import { cacheRoutes } from './routes/cache.js';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.register(envPlugin);
  app.register(sensible);
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.register(swagger, {
    openapi: {
      info: { title: 'smartSticker API', version: '1.0.0' },
    },
  });
  app.register(swaggerUI, { routePrefix: '/docs' });

  app.register(errorsPlugin);
  app.register(dbPlugin);
  app.register(providerPlugin);
  app.register(authPlugin);

  app.register(healthRoutes);
  app.register(zonesRoutes, { prefix: '/v1' });
  app.register(devicesRoutes, { prefix: '/v1' });
  app.register(cacheRoutes, { prefix: '/v1' });

  return app;
}

