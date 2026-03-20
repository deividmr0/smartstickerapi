import type { Knex } from 'knex';

export type DeviceCacheRow = {
  id: number;
  zone_id: number;
  imei: string;
  device_name: string | null;
  device_type: string | null;
  sim: string | null;
  device_group_id: string | null;
  device_group: string | null;
  enabled_flag: 0 | 1;
  driver_name: string | null;
  driver_phone: string | null;
  engine_number: string | null;
  vin: string | null;
  plate_number: string | null;
  raw_payload_json: unknown | null;
  last_synced_at: Date;
};

export async function getDevicesByZone(db: Knex, zoneId: number): Promise<DeviceCacheRow[]> {
  return db<DeviceCacheRow>('devices_cache').select('*').where({ zone_id: zoneId }).orderBy('device_name', 'asc');
}

export async function getDeviceByImei(
  db: Knex,
  zoneId: number,
  imei: string,
): Promise<DeviceCacheRow | null> {
  const row = await db<DeviceCacheRow>('devices_cache').select('*').where({ zone_id: zoneId, imei }).first();
  return row ?? null;
}

export async function getLastSyncedAt(db: Knex, zoneId: number): Promise<Date | null> {
  const row = await db('devices_cache')
    .where({ zone_id: zoneId })
    .max<{ max: Date | null }[]>({ max: 'last_synced_at' });
  const max = row?.[0]?.max ?? null;
  return max ? new Date(max) : null;
}

export async function upsertDevices(
  db: Knex,
  zoneId: number,
  devices: Array<Omit<DeviceCacheRow, 'id' | 'zone_id' | 'last_synced_at'> & { imei: string }>,
): Promise<void> {
  if (devices.length === 0) return;
  const now = new Date();

  const rows = devices.map((d) => ({
    zone_id: zoneId,
    imei: d.imei,
    device_name: d.device_name,
    device_type: d.device_type,
    sim: d.sim,
    device_group_id: d.device_group_id,
    device_group: d.device_group,
    enabled_flag: d.enabled_flag,
    driver_name: d.driver_name,
    driver_phone: d.driver_phone,
    engine_number: d.engine_number,
    vin: d.vin,
    plate_number: d.plate_number,
    raw_payload_json: d.raw_payload_json,
    last_synced_at: now,
  }));

  await db<DeviceCacheRow>('devices_cache')
    .insert(rows)
    .onConflict(['zone_id', 'imei'])
    .merge([
      'device_name',
      'device_type',
      'sim',
      'device_group_id',
      'device_group',
      'enabled_flag',
      'driver_name',
      'driver_phone',
      'engine_number',
      'vin',
      'plate_number',
      'raw_payload_json',
      'last_synced_at',
    ]);
}

