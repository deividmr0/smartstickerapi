export type ZoneCode = string;

export type Device = {
  imei: string;
  deviceName: string | null;
  deviceType: string | null;
  sim: string | null;
  group: string | null;
  enabled: boolean;
  driverName: string | null;
  driverPhone: string | null;
  engineNumber?: string | null;
  vin?: string | null;
  plateNumber?: string | null;
  raw?: unknown;
};

export type DeviceLocation = {
  imei: string;
  deviceName: string | null;
  status: 'online' | 'offline' | 'unknown';
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  gpsTime: string | null;
  positionType: string | null;
  battery: number | null;
  acc: number | null;
  mileage: number | null;
  raw?: unknown;
};

export type DeviceTrackPoint = {
  imei: string;
  latitude: number | null;
  longitude: number | null;
  gpsTime: string | null;
  speed: number | null;
  course: number | null;
  positionType: string | null;
  satellite: number | null;
  ignition: string | null;
  accStatus: string | null;
  raw?: unknown;
};

export interface Provider {
  listDevices(zone: ZoneCode): Promise<Device[]>;
  getDevice(zone: ZoneCode, imei: string): Promise<Device | null>;
  listLocationsByZone(zone: ZoneCode): Promise<DeviceLocation[]>;
  getLocationByImei(zone: ZoneCode, imei: string): Promise<DeviceLocation | null>;
  refreshZoneToken(zone: ZoneCode): Promise<void>;
  listDeviceTrack(
    zone: ZoneCode,
    imei: string,
    beginTime: string,
    endTime: string,
  ): Promise<{ points: DeviceTrackPoint[]; mileage: number | null }>;
}

