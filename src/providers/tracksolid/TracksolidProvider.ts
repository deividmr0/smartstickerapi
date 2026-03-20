import type { Knex } from 'knex';
import type { Provider, Device, DeviceLocation, DeviceTrackPoint } from '../types.js';
import { ApiError, UpstreamNotConfiguredError } from '../../lib/errors.js';
import { decryptString, encryptString } from '../../lib/crypto.js';
import { getZoneByCode } from '../../db/zonesRepo.js';
import { getZoneCredentialsByZoneId, updateZoneTokens } from '../../db/zoneCredentialsRepo.js';
import { JimiClient, type JimiTokenResult } from './jimiClient.js';

type JimiDevice = {
  imei: string;
  deviceName?: string | null;
  mcType?: string | null;
  sim?: string | null;
  deviceGroup?: string | null;
  enabledFlag?: number | string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  engineNumber?: string | null;
  carFrame?: string | null;
  vin?: string | null;
  vehicleNumber?: string | null;
  licensePlatNo?: string | null;
  deviceGroupId?: string | null;
};

type JimiLocation = {
  imei: string;
  deviceName?: string | null;
  status?: string | number | null;
  lat?: number | string | null;
  lng?: number | string | null;
  speed?: string | number | null;
  direction?: string | number | null;
  gpsTime?: string | null;
  posType?: string | null;
  batteryPowerVal?: string | number | null;
  electQuantity?: string | number | null;
  accStatus?: string | number | null;
  currentMileage?: string | number | null;
};

type JimiTrackPoint = {
  lat?: number | string | null;
  lng?: number | string | null;
  gpsTime?: string | null;
  direction?: string | number | null;
  gpsSpeed?: string | number | null;
  posType?: string | number | null;
  satellite?: string | number | null;
  ignition?: string | null;
  accStatus?: string | number | null;
};

type JimiTrackData = {
  mileage?: string | number | null;
};

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function jimiUtcToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  // Input: yyyy-MM-dd HH:mm:ss (UTC)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(' ', 'T') + 'Z';
  }
  return s;
}

function mapDevice(d: JimiDevice): Device {
  return {
    imei: d.imei,
    deviceName: d.deviceName ?? null,
    deviceType: d.mcType ?? null,
    sim: d.sim ?? null,
    group: d.deviceGroup ?? null,
    enabled: String(d.enabledFlag ?? '1') === '1',
    driverName: d.driverName ?? null,
    driverPhone: d.driverPhone ?? null,
    engineNumber: d.engineNumber ?? null,
    vin: d.vin ?? d.carFrame ?? null,
    plateNumber: d.vehicleNumber ?? d.licensePlatNo ?? null,
    raw: d,
  };
}

function mapLocation(l: JimiLocation): DeviceLocation {
  const statusRaw = l.status == null ? null : String(l.status);
  const status = statusRaw === '1' ? 'online' : statusRaw === '0' ? 'offline' : 'unknown';
  const battery = toNumberOrNull(l.batteryPowerVal) ?? toNumberOrNull(l.electQuantity);

  return {
    imei: l.imei,
    deviceName: l.deviceName ?? null,
    status,
    latitude: toNumberOrNull(l.lat),
    longitude: toNumberOrNull(l.lng),
    speed: toNumberOrNull(l.speed),
    course: toNumberOrNull(l.direction),
    gpsTime: jimiUtcToIso(l.gpsTime),
    positionType: l.posType ? String(l.posType).toLowerCase() : null,
    battery,
    acc: toNumberOrNull(l.accStatus),
    mileage: toNumberOrNull(l.currentMileage),
    raw: l,
  };
}

function mapTrackPoint(imei: string, p: JimiTrackPoint): DeviceTrackPoint {
  return {
    imei,
    latitude: toNumberOrNull(p.lat),
    longitude: toNumberOrNull(p.lng),
    gpsTime: jimiUtcToIso(p.gpsTime),
    speed: toNumberOrNull(p.gpsSpeed),
    course: toNumberOrNull(p.direction),
    positionType: p.posType != null ? String(p.posType).toLowerCase() : null,
    satellite: toNumberOrNull(p.satellite),
    ignition: p.ignition ?? null,
    accStatus: p.accStatus != null ? String(p.accStatus) : null,
    raw: p,
  };
}

function expiresInSeconds(expiresIn: string | number): number {
  const n = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
  return Number.isFinite(n) ? n : 3600;
}

export class TracksolidProvider implements Provider {
  constructor(
    private readonly db: Knex,
    private readonly encryptionKeyB64: string,
  ) {}

  private async getClientAndToken(zoneCode: string) {
    const zone = await getZoneByCode(this.db, zoneCode);
    if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

    const creds = await getZoneCredentialsByZoneId(this.db, zone.id);
    if (!creds) throw new UpstreamNotConfiguredError('No hay credenciales configuradas para esta zona');

    const appSecret = decryptString(creds.app_secret_encrypted, this.encryptionKeyB64);
    const userPwdMd5 = decryptString(creds.user_pwd_md5_encrypted, this.encryptionKeyB64);
    const client = new JimiClient(zone.base_url, creds.app_key, appSecret);

    const getNewToken = async (): Promise<JimiTokenResult> => {
      return client.call<JimiTokenResult>('jimi.oauth.token.get', {
        user_id: creds.user_id,
        user_pwd_md5: userPwdMd5,
        expires_in: '7200',
      });
    };

    const refreshToken = async (accessToken: string, refreshToken: string): Promise<JimiTokenResult> => {
      return client.call<JimiTokenResult>('jimi.oauth.token.refresh', {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: '7200',
      });
    };

    const persistTokens = async (t: JimiTokenResult) => {
      const expSeconds = expiresInSeconds(t.expiresIn);
      const expiresAt = new Date(Date.now() + expSeconds * 1000);
      await updateZoneTokens(this.db, zone.id, {
        access_token_encrypted: encryptString(t.accessToken, this.encryptionKeyB64),
        refresh_token_encrypted: encryptString(t.refreshToken, this.encryptionKeyB64),
        token_expires_at: expiresAt,
      });
      return { accessToken: t.accessToken, refreshToken: t.refreshToken };
    };

    const tokenStillValid = (expiresAt: Date | null) => {
      if (!expiresAt) return false;
      return expiresAt.getTime() - Date.now() > 60_000; // 60s margen
    };

    const ensureToken = async () => {
      if (creds.access_token_encrypted && creds.refresh_token_encrypted && tokenStillValid(creds.token_expires_at)) {
        return {
          accessToken: decryptString(creds.access_token_encrypted, this.encryptionKeyB64),
          refreshToken: decryptString(creds.refresh_token_encrypted, this.encryptionKeyB64),
        };
      }

      if (creds.access_token_encrypted && creds.refresh_token_encrypted) {
        const at = decryptString(creds.access_token_encrypted, this.encryptionKeyB64);
        const rt = decryptString(creds.refresh_token_encrypted, this.encryptionKeyB64);
        try {
          const refreshed = await refreshToken(at, rt);
          return await persistTokens(refreshed);
        } catch {
          // fallback a get
        }
      }

      const fresh = await getNewToken();
      return await persistTokens(fresh);
    };

    const forceRefresh = async () => {
      // Usado cuando el proveedor responde "token invalid" (1004)
      const latest = await getZoneCredentialsByZoneId(this.db, zone.id);
      if (latest?.access_token_encrypted && latest.refresh_token_encrypted) {
        const at = decryptString(latest.access_token_encrypted, this.encryptionKeyB64);
        const rt = decryptString(latest.refresh_token_encrypted, this.encryptionKeyB64);
        const refreshed = await refreshToken(at, rt);
        await persistTokens(refreshed);
        return;
      }

      const fresh = await getNewToken();
      await persistTokens(fresh);
    };

    const { accessToken } = await ensureToken();
    return { client, accessToken, account: creds.user_id, forceRefresh };
  }

  async listDevices(zone: string): Promise<Device[]> {
    const { client, accessToken, account, forceRefresh } = await this.getClientAndToken(zone);
    const list = await client.call<JimiDevice[]>(
      'jimi.user.device.list',
      { access_token: accessToken, target: account },
      { retryOnTokenInvalid: forceRefresh },
    );
    return list.map(mapDevice);
  }

  async getDevice(zone: string, imei: string): Promise<Device | null> {
    const { client, accessToken, forceRefresh } = await this.getClientAndToken(zone);
    const d = await client.call<JimiDevice>(
      'jimi.track.device.detail',
      { access_token: accessToken, imei },
      { retryOnTokenInvalid: forceRefresh },
    );
    return d?.imei ? mapDevice(d) : null;
  }

  async listLocationsByZone(zone: string): Promise<DeviceLocation[]> {
    const { client, accessToken, account, forceRefresh } = await this.getClientAndToken(zone);
    const list = await client.call<JimiLocation[]>(
      'jimi.user.device.location.list',
      { access_token: accessToken, target: account },
      { retryOnTokenInvalid: forceRefresh },
    );
    return list.map(mapLocation);
  }

  async getLocationByImei(zone: string, imei: string): Promise<DeviceLocation | null> {
    const { client, accessToken, forceRefresh } = await this.getClientAndToken(zone);
    const list = await client.call<JimiLocation[]>(
      'jimi.device.location.get',
      { access_token: accessToken, imeis: imei },
      { retryOnTokenInvalid: forceRefresh },
    );
    const found = list.find((x) => x.imei === imei) ?? list[0];
    return found ? mapLocation(found) : null;
  }

  async listDeviceTrack(
    zone: string,
    imei: string,
    beginTime: string,
    endTime: string,
  ): Promise<{ points: DeviceTrackPoint[]; mileage: number | null }> {
    const { client, accessToken, forceRefresh } = await this.getClientAndToken(zone);
    const { result, data } = await client.callWithData<JimiTrackPoint[], JimiTrackData>(
      'jimi.device.track.list',
      { access_token: accessToken, imei, begin_time: beginTime, end_time: endTime },
      { retryOnTokenInvalid: forceRefresh },
    );

    return {
      points: result.map((x) => mapTrackPoint(imei, x)),
      mileage: toNumberOrNull(data?.mileage),
    };
  }
}

