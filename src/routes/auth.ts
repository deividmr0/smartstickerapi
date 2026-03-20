import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ApiError } from '../lib/errors.js';
import { ok } from '../lib/response.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/auth/login',
    {
      config: { auth: false },
      schema: {
        body: Type.Object({
          clientId: Type.String({ minLength: 1 }),
          clientSecret: Type.String({ minLength: 1 }),
        }),
        response: {
          200: Type.Object({
            data: Type.Object({
              token: Type.String(),
            }),
          }),
        },
      },
    },
    async (req) => {
      const { clientId, clientSecret } = req.body as { clientId: string; clientSecret: string };

      if (clientId !== app.config.B2B_CLIENT_ID || clientSecret !== app.config.B2B_CLIENT_SECRET) {
        throw new ApiError('UNAUTHORIZED', 'Credenciales inválidas', 401);
      }

      const token = app.jwt.sign({ typ: 'b2b', sub: clientId });
      return ok({ token });
    },
  );
};

