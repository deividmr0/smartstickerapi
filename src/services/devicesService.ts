import { ApiError } from '../lib/errors.js';
import type { FastifyInstance } from 'fastify';
import { getZoneByCode } from '../db/zonesRepo.js';
import { createSyncJob, finishSyncJobFail, finishSyncJobSuccess } from '../db/syncJobsRepo.js';
import {
  getDeviceByImei,
  getDevicesByZone,
  getLastSyncedAt,
  type DeviceCacheRow,
  upsertDevices,
} from '../db/devicesCacheRepo.js';
import type { Device } from '../providers/types.js';

type DeviceCacheInput = Omit<DeviceCacheRow, 'id' | 'zone_id' | 'last_synced_at'> & { imei: string };

function isCacheFresh(lastSyncedAt: Date | null, ttlSeconds: number): boolean {
  if (!lastSyncedAt || ttlSeconds <= 0) return false;
  return Date.now() - lastSyncedAt.getTime() <= ttlSeconds * 1000;
}

function toCacheDevice(device: Device): DeviceCacheInput {
  return {
    imei: device.imei,
    device_name: device.deviceName,
    device_type: device.deviceType,
    sim: device.sim,
    device_group_id: null,
    device_group: device.group,
    enabled_flag: device.enabled ? 1 : 0,
    driver_name: device.driverName,
    driver_phone: device.driverPhone,
    engine_number: device.engineNumber ?? null,
    vin: device.vin ?? null,
    plate_number: device.plateNumber ?? null,
    raw_payload_json: device.raw ?? null,
  };
}

function fromCacheDevice(row: DeviceCacheRow): Device {
  return {
    imei: row.imei,
    deviceName: row.device_name,
    deviceType: row.device_type,
    sim: row.sim,
    group: row.device_group,
    enabled: row.enabled_flag === 1,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    engineNumber: row.engine_number,
    vin: row.vin,
    plateNumber: row.plate_number,
    raw: row.raw_payload_json,
  };
}

export async function listDevices(app: FastifyInstance, zoneCode: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const ttl = app.config.DEVICES_CACHE_TTL_SECONDS;
  const lastSyncedAt = await getLastSyncedAt(app.db, zone.id);
  if (isCacheFresh(lastSyncedAt, ttl)) {
    const cachedRows = await getDevicesByZone(app.db, zone.id);
    return { devices: cachedRows.map(fromCacheDevice), cached: true };
  }

  const devices = await app.provider.listDevices(zoneCode);
  if (devices.length > 0) {
    await upsertDevices(
      app.db,
      zone.id,
      devices.map(toCacheDevice),
    );
  }
  return { devices, cached: false };
}

export async function syncDevices(app: FastifyInstance, zoneCode: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const jobId = await createSyncJob(app.db, zone.id, 'devices_catalog_sync_manual');
  try {
    const devices = await app.provider.listDevices(zoneCode);
    if (devices.length > 0) {
      await upsertDevices(
        app.db,
        zone.id,
        devices.map(toCacheDevice),
      );
    }
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

  const ttl = app.config.DEVICES_CACHE_TTL_SECONDS;
  const lastSyncedAt = await getLastSyncedAt(app.db, zone.id);
  if (isCacheFresh(lastSyncedAt, ttl)) {
    const cached = await getDeviceByImei(app.db, zone.id, imei);
    if (cached) return { device: fromCacheDevice(cached), cached: true };
  }

  const device = await app.provider.getDevice(zoneCode, imei);
  if (!device) throw new ApiError('NOT_FOUND', 'Dispositivo no encontrado', 404);
  await upsertDevices(app.db, zone.id, [toCacheDevice(device)]);
  return { device, cached: false };
}

export async function refreshZoneToken(app: FastifyInstance, zoneCode: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  await app.provider.refreshZoneToken(zoneCode);
  return { refreshed: true };
}

