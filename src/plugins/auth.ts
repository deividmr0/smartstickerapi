import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyRequest } from 'fastify';

export const authPlugin = fp(async (app) => {
  await app.register(jwt, {
    secret: app.config.JWT_SECRET,
    sign: { expiresIn: app.config.JWT_EXPIRES_IN ?? '8h' },
  });

  app.decorate('authenticate', async function authenticate(req: FastifyRequest) {
    await req.jwtVerify();
  });

  const isPublicPath = (url: string): boolean => {
    const pathname = url.split('?')[0] ?? '';
    return pathname === '/docs' || pathname.startsWith('/docs/');
  };

  app.addHook('onRequest', async (req, reply) => {
    if (isPublicPath(req.raw.url ?? req.url)) return;

    const authDisabled = (req.routeOptions.config as { auth?: boolean } | undefined)?.auth === false;
    if (authDisabled) return;

    try {
      await req.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

