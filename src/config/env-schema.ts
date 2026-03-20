import { Type, type Static } from '@sinclair/typebox';

export const EnvSchema = Type.Object({
  NODE_ENV: Type.Optional(Type.Union([Type.Literal('development'), Type.Literal('production'), Type.Literal('test')])),

  HOST: Type.String({ default: '0.0.0.0' }),
  PORT: Type.Integer({ default: 3000, minimum: 1, maximum: 65535 }),
  LOG_LEVEL: Type.Optional(
    Type.Union([
      Type.Literal('fatal'),
      Type.Literal('error'),
      Type.Literal('warn'),
      Type.Literal('info'),
      Type.Literal('debug'),
      Type.Literal('trace'),
      Type.Literal('silent'),
    ]),
  ),

  B2B_CLIENT_ID: Type.String({ minLength: 1 }),
  B2B_CLIENT_SECRET: Type.String({ minLength: 1 }),

  JWT_SECRET: Type.String({ minLength: 16 }),
  JWT_EXPIRES_IN: Type.Optional(Type.String({ default: '8h' })),

  ENCRYPTION_KEY_B64: Type.String({ minLength: 10 }),

  DB_HOST: Type.String({ minLength: 1 }),
  DB_PORT: Type.Integer({ default: 3306 }),
  DB_USER: Type.String({ minLength: 1 }),
  DB_PASSWORD: Type.String({ minLength: 0 }),
  DB_NAME: Type.String({ minLength: 1 }),

  DEVICES_CACHE_TTL_SECONDS: Type.Integer({ default: 900, minimum: 0 }),
  PROVIDER_MODE: Type.Optional(Type.Union([Type.Literal('mock'), Type.Literal('tracksolid')])),
});

export type Env = Static<typeof EnvSchema>;

