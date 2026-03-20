import type { FastifyPluginAsync } from 'fastify';
import { ok } from '../lib/response.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      config: { auth: false },
    },
    async () => {
      return ok({ status: 'ok' }, { uptimeSeconds: Math.round(process.uptime()) });
    },
  );
};

