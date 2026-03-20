import { ApiError } from '../lib/errors.js';
import type { FastifyInstance } from 'fastify';
import { getZoneByCode } from '../db/zonesRepo.js';
import { createSyncJob, finishSyncJobFail, finishSyncJobSuccess } from '../db/syncJobsRepo.js';

export async function listDevices(app: FastifyInstance, zoneCode: string) {
  debugger;
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const devices = await app.provider.listDevices(zoneCode);
  return { devices, cached: false };
}

export async function syncDevices(app: FastifyInstance, zoneCode: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const jobId = await createSyncJob(app.db, zone.id, 'devices_catalog_sync_manual');
  try {
    const devices = await app.provider.listDevices(zoneCode);
    await finishSyncJobSuccess(app.db, jobId, devices.length);
    return { processed: devices.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown';
    await finishSyncJobFail(app.db, jobId, message);
    throw e;
  }
}

export async function getDeviceDetail(app: FastifyInstance, zoneCode: string, imei: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const device = await app.provider.getDevice(zoneCode, imei);
  if (!device) throw new ApiError('NOT_FOUND', 'Dispositivo no encontrado', 404);
  return { device, cached: false };
}

