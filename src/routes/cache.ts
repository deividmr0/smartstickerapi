import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ok } from '../lib/response.js';
import { syncDevices } from '../services/devicesService.js';

export const cacheRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/cache/devices/sync',
    {
      schema: {
        body: Type.Object({
          zone: Type.String({ minLength: 1 }),
        }),
        response: {
          200: Type.Object({
            data: Type.Object({
              processed: Type.Integer(),
            }),
            meta: Type.Object({
              zone: Type.String(),
            }),
          }),
        },
      },
    },
    async (req) => {
      const { zone } = req.body as { zone: string };
      const { processed } = await syncDevices(app, zone);
      return ok({ processed }, { zone });
    },
  );
};

