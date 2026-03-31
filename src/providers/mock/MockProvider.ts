import type { Provider, Device, DeviceLocation, DeviceTrackPoint } from '../types.js';

function sampleDevices(zone: string): Device[] {
  return [
    {
      imei: `00000000000000${zone.length}`.slice(0, 15),
      deviceName: `Demo ${zone.toUpperCase()} 1`,
      deviceType: 'JM-LL301',
      sim: '8957000000000000000',
      group: `Fleet ${zone.toUpperCase()}`,
      enabled: true,
      driverName: 'Carlos Ruiz',
      driverPhone: '3000000000',
      engineNumber: 'ENG-8891',
      vin: '1HGCM82633A123456',
      plateNumber: 'ABC123',
    },
    {
      imei: `11111111111111${zone.length}`.slice(0, 15),
      deviceName: `Demo ${zone.toUpperCase()} 2`,
      deviceType: 'JM-VL02',
      sim: '8957000000000000001',
      group: `Fleet ${zone.toUpperCase()}`,
      enabled: true,
      driverName: null,
      driverPhone: null,
      engineNumber: null,
      vin: null,
      plateNumber: null,
    },
  ];
}

function nowIso(): string {
  return new Date().toISOString();
}

export class MockProvider implements Provider {
  async listDevices(zone: string): Promise<Device[]> {
    return sampleDevices(zone);
  }

  async getDevice(zone: string, imei: string): Promise<Device | null> {
    return sampleDevices(zone).find((d) => d.imei === imei) ?? null;
  }

  async listLocationsByZone(zone: string): Promise<DeviceLocation[]> {
    return sampleDevices(zone).map((d, idx) => ({
      imei: d.imei,
      deviceName: d.deviceName,
      status: idx % 2 === 0 ? 'online' : 'offline',
      latitude: 6.2442 + idx * 0.001,
      longitude: -75.5812 - idx * 0.001,
      speed: idx % 2 === 0 ? 42 : 0,
      course: 180,
      gpsTime: nowIso(),
      positionType: 'gps',
      battery: 87 - idx * 10,
      acc: idx % 2 === 0 ? 1 : 0,
      mileage: 154320.5 + idx * 100,
    }));
  }

  async getLocationByImei(zone: string, imei: string): Promise<DeviceLocation | null> {
    return (await this.listLocationsByZone(zone)).find((l) => l.imei === imei) ?? null;
  }

  async refreshZoneToken(_zone: string): Promise<void> {
    // No-op in mock mode.
  }

  async listDeviceTrack(
    zone: string,
    imei: string,
    beginTime: string,
    endTime: string,
  ): Promise<{ points: DeviceTrackPoint[]; mileage: number | null }> {
    const device = await this.getDevice(zone, imei);
    if (!device) return { points: [], mileage: null };

    const start = new Date(beginTime);
    const end = new Date(endTime);
    const steps = 8;
    const totalMs = Math.max(1, end.getTime() - start.getTime());
    const points: DeviceTrackPoint[] = [];

    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const t = new Date(start.getTime() + totalMs * ratio);
      points.push({
        imei,
        latitude: 6.2442 + i * 0.0005,
        longitude: -75.5812 - i * 0.0005,
        gpsTime: t.toISOString(),
        speed: i === 0 ? 0 : 35 + i,
        course: 180,
        positionType: 'gps',
        satellite: 12,
        ignition: 'ON',
        accStatus: 'ON',
      });
    }

    return { points, mileage: 12.4 };
  }
}

