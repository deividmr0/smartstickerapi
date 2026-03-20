import fp from 'fastify-plugin';
import { ApiError } from '../lib/errors.js';
import { fail } from '../lib/response.js';

export const errorsPlugin = fp(async (app) => {
  app.setNotFoundHandler(async (_req, reply) => {
    return reply.code(404).send(fail('NOT_FOUND', 'Not Found'));
  });

  app.setErrorHandler(async (err, req, reply) => {
    const statusCode =
      (err as { statusCode?: number }).statusCode && Number.isInteger((err as { statusCode?: number }).statusCode)
        ? (err as { statusCode: number }).statusCode
        : 500;

    if (err instanceof ApiError) {
      req.log.warn({ err, code: err.code }, 'api_error');
      return reply.code(err.statusCode).send(fail(err.code, err.message));
    }

    const fastifyCode = (err as { code?: string }).code;
    if (fastifyCode === 'FST_ERR_VALIDATION' || fastifyCode === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      req.log.info({ err }, 'validation_error');
      return reply.code(400).send(fail('BAD_REQUEST', 'Parámetros inválidos'));
    }

    if (typeof fastifyCode === 'string' && fastifyCode.startsWith('FST_JWT')) {
      req.log.info({ err }, 'jwt_error');
      return reply.code(401).send(fail('UNAUTHORIZED', 'JWT ausente o inválido'));
    }

    if (statusCode === 401) return reply.code(401).send(fail('UNAUTHORIZED', 'No autorizado'));
    if (statusCode === 403) return reply.code(403).send(fail('FORBIDDEN', 'Sin permisos'));
    if (statusCode === 404) return reply.code(404).send(fail('NOT_FOUND', 'No encontrado'));
    if (statusCode === 429) return reply.code(429).send(fail('UPSTREAM_RATE_LIMIT', 'Too Many Requests'));

    req.log.error({ err }, 'unhandled_error');
    return reply.code(500).send(fail('INTERNAL_ERROR', 'Error interno'));
  });
});

