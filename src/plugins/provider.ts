import fp from 'fastify-plugin';
import { MockProvider } from '../providers/mock/MockProvider.js';
import { TracksolidProvider } from '../providers/tracksolid/TracksolidProvider.js';

export const providerPlugin = fp(async (app) => {
  const mode = app.config.PROVIDER_MODE ?? 'tracksolid';
  const provider =
    mode === 'mock' ? new MockProvider() : new TracksolidProvider(app.db, app.config.ENCRYPTION_KEY_B64);
  app.decorate('provider', provider);
});

