import type { Knex } from 'knex';
import type { DeviceTrackPoint } from '../providers/types.js';

export type DeviceTrackCachePointRow = {
  id: number;
  zone_id: number;
  imei: string;
  gps_time: Date;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  position_type: string | null;
  satellite: number | null;
  ignition: string | null;
  acc_status: string | null;
  raw_payload_json: unknown | null;
  last_synced_at: Date;
};

export type DeviceTrackCacheWindowRow = {
  id: number;
  zone_id: number;
  imei: string;
  begin_time: Date;
  end_time: Date;
  mileage: string | number | null;
  last_synced_at: Date;
};

function jimiUtcToDate(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}

function valueToNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

export function mapMileageFromCache(value: unknown): number | null {
  return valueToNumber(value);
}

function toIsoUtc(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function mapTrackPointFromCache(row: DeviceTrackCachePointRow): DeviceTrackPoint {
  return {
    imei: row.imei,
    latitude: valueToNumber(row.latitude),
    longitude: valueToNumber(row.longitude),
    gpsTime: toIsoUtc(row.gps_time),
    speed: valueToNumber(row.speed),
    course: valueToNumber(row.course),
    positionType: row.position_type,
    satellite: valueToNumber(row.satellite),
    ignition: row.ignition,
    accStatus: row.acc_status,
  };
}

export async function getTrackWindow(
  db: Knex,
  zoneId: number,
  imei: string,
  beginTime: string,
  endTime: string,
): Promise<DeviceTrackCacheWindowRow | null> {
  const row = await db<DeviceTrackCacheWindowRow>('device_track_cache_windows')
    .select('*')
    .where({
      zone_id: zoneId,
      imei,
      begin_time: jimiUtcToDate(beginTime),
      end_time: jimiUtcToDate(endTime),
    })
    .first();
  return row ?? null;
}

export async function getTrackPointsByRange(
  db: Knex,
  zoneId: number,
  imei: string,
  beginTime: string,
  endTime: string,
): Promise<DeviceTrackCachePointRow[]> {
  return db<DeviceTrackCachePointRow>('device_track_cache_points')
    .select('*')
    .where({ zone_id: zoneId, imei })
    .andWhere('gps_time', '>=', jimiUtcToDate(beginTime))
    .andWhere('gps_time', '<=', jimiUtcToDate(endTime))
    .orderBy('gps_time', 'asc');
}

export async function upsertTrackPoints(
  db: Knex,
  zoneId: number,
  imei: string,
  points: DeviceTrackPoint[],
): Promise<void> {
  const now = new Date();
  const rows = points
    .filter((p) => Boolean(p.gpsTime))
    .map((p) => ({
      zone_id: zoneId,
      imei,
      gps_time: new Date(String(p.gpsTime)),
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      course: p.course,
      position_type: p.positionType,
      satellite: p.satellite,
      ignition: p.ignition,
      acc_status: p.accStatus,
      last_synced_at: now,
    }));

  if (rows.length === 0) return;

  await db('device_track_cache_points')
    .insert(rows)
    .onConflict(['zone_id', 'imei', 'gps_time'])
    .merge([
      'latitude',
      'longitude',
      'speed',
      'course',
      'position_type',
      'satellite',
      'ignition',
      'acc_status',
      'last_synced_at',
    ]);
}

export async function upsertTrackWindow(
  db: Knex,
  zoneId: number,
  imei: string,
  beginTime: string,
  endTime: string,
  mileage: number | null,
): Promise<void> {
  const now = new Date();
  await db('device_track_cache_windows')
    .insert({
      zone_id: zoneId,
      imei,
      begin_time: jimiUtcToDate(beginTime),
      end_time: jimiUtcToDate(endTime),
      mileage,
      last_synced_at: now,
    })
    .onConflict(['zone_id', 'imei', 'begin_time', 'end_time'])
    .merge({
      mileage,
      last_synced_at: now,
    });
}
