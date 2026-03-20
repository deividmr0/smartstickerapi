import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { listActiveZones } from '../db/zonesRepo.js';
import { ok } from '../lib/response.js';

export const zonesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/zones',
    {
      schema: {
        response: {
          200: Type.Object({
            data: Type.Array(
              Type.Object({
                code: Type.String(),
                name: Type.String(),
              }),
            ),
          }),
        },
      },
    },
    async () => {
      const zones = await listActiveZones(app.db);
      return ok(zones);
    },
  );
};

