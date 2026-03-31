import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { ApiError } from '../lib/errors.js';
import { getActiveApiKeyByHash, touchApiKey } from '../db/apiKeysRepo.js';

export const authPlugin = fp(async (app) => {
  app.decorate('authenticate', async function authenticate(req: FastifyRequest) {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new ApiError('UNAUTHORIZED', 'Falta header Authorization', 401);

    const [scheme, rawKey] = authHeader.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !rawKey) {
      throw new ApiError('UNAUTHORIZED', 'Authorization debe ser Bearer <apiKey>', 401);
    }

    const key = rawKey.trim();
    if (!key) throw new ApiError('UNAUTHORIZED', 'API key vacía', 401);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const stored = await getActiveApiKeyByHash(app.db, keyHash);
    if (!stored) throw new ApiError('UNAUTHORIZED', 'API key inválida', 401);

    await touchApiKey(app.db, stored.id);
  });

  const isPublicPath = (url: string): boolean => {
    const pathname = url.split('?')[0] ?? '';
    return pathname === '/docs' || pathname.startsWith('/docs/');
  };

  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') return;
    if (isPublicPath(req.raw.url ?? req.url)) return;

    const authDisabled = (req.routeOptions.config as { auth?: boolean } | undefined)?.auth === false;
    if (authDisabled) return;

    try {
      await app.authenticate(req);
    } catch (err) {
      reply.send(err);
    }
  });
});

