import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ok } from '../lib/response.js';
import { getDeviceDetail, listDevices } from '../services/devicesService.js';
import { getLocationByImei, listDeviceTrackByImei, listLocationsByZone } from '../services/locationsService.js';

const ZoneQuery = Type.Object({
  zone: Type.String({ minLength: 1 }),
});

const ImeiParam = Type.Object({
  imei: Type.String({ minLength: 10 }),
});

const TrackRangeQuery = Type.Object({
  zone: Type.String({ minLength: 1 }),
  beginTime: Type.Optional(Type.String({ minLength: 19 })),
  endTime: Type.Optional(Type.String({ minLength: 19 })),
});

const DeviceSchema = Type.Object({
  imei: Type.String(),
  deviceName: Type.Union([Type.String(), Type.Null()]),
  deviceType: Type.Union([Type.String(), Type.Null()]),
  sim: Type.Union([Type.String(), Type.Null()]),
  group: Type.Union([Type.String(), Type.Null()]),
  enabled: Type.Boolean(),
  driverName: Type.Union([Type.String(), Type.Null()]),
  driverPhone: Type.Union([Type.String(), Type.Null()]),
  engineNumber: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  vin: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  plateNumber: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

const LocationSchema = Type.Object({
  imei: Type.String(),
  deviceName: Type.Union([Type.String(), Type.Null()]),
  status: Type.Union([Type.Literal('online'), Type.Literal('offline'), Type.Literal('unknown')]),
  latitude: Type.Union([Type.Number(), Type.Null()]),
  longitude: Type.Union([Type.Number(), Type.Null()]),
  speed: Type.Union([Type.Number(), Type.Null()]),
  course: Type.Union([Type.Number(), Type.Null()]),
  gpsTime: Type.Union([Type.String(), Type.Null()]),
  positionType: Type.Union([Type.String(), Type.Null()]),
  battery: Type.Union([Type.Number(), Type.Null()]),
  acc: Type.Union([Type.Number(), Type.Null()]),
  mileage: Type.Union([Type.Number(), Type.Null()]),
});

const TrackPointSchema = Type.Object({
  imei: Type.String(),
  latitude: Type.Union([Type.Number(), Type.Null()]),
  longitude: Type.Union([Type.Number(), Type.Null()]),
  gpsTime: Type.Union([Type.String(), Type.Null()]),
  speed: Type.Union([Type.Number(), Type.Null()]),
  course: Type.Union([Type.Number(), Type.Null()]),
  positionType: Type.Union([Type.String(), Type.Null()]),
  satellite: Type.Union([Type.Number(), Type.Null()]),
  ignition: Type.Union([Type.String(), Type.Null()]),
  accStatus: Type.Union([Type.String(), Type.Null()]),
});

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/devices',
    {
      schema: {
        querystring: ZoneQuery,
        response: {
          200: Type.Object({
            data: Type.Array(DeviceSchema),
            meta: Type.Object({
              zone: Type.String(),
              cached: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (req) => {
      const { zone } = req.query as { zone: string };
      const { devices, cached } = await listDevices(app, zone);
      return ok(devices, { zone, cached });
    },
  );

  app.get(
    '/devices/:imei',
    {
      schema: {
        params: ImeiParam,
        querystring: ZoneQuery,
        response: {
          200: Type.Object({
            data: DeviceSchema,
            meta: Type.Optional(
              Type.Object({
                zone: Type.String(),
                cached: Type.Boolean(),
              }),
            ),
          }),
        },
      },
    },
    async (req) => {
      const { zone } = req.query as { zone: string };
      const { imei } = req.params as { imei: string };
      const { device, cached } = await getDeviceDetail(app, zone, imei);
      return ok(device, { zone, cached });
    },
  );

  app.get(
    '/devices/locations',
    {
      schema: {
        querystring: ZoneQuery,
        response: {
          200: Type.Object({
            data: Type.Array(LocationSchema),
            meta: Type.Object({
              zone: Type.String(),
              cached: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (req) => {
      const { zone } = req.query as { zone: string };
      const { locations, cached } = await listLocationsByZone(app, zone);
      return ok(locations, { zone, cached });
    },
  );

  app.get(
    '/devices/:imei/locations',
    {
      schema: {
        params: ImeiParam,
        querystring: TrackRangeQuery,
        response: {
          200: Type.Object({
            data: Type.Array(TrackPointSchema),
            meta: Type.Object({
              zone: Type.String(),
              imei: Type.String(),
              beginTime: Type.String(),
              endTime: Type.String(),
              total: Type.Integer(),
              mileage: Type.Union([Type.Number(), Type.Null()]),
              cached: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (req) => {
      const { zone, beginTime, endTime } = req.query as { zone: string; beginTime?: string; endTime?: string };
      const { imei } = req.params as { imei: string };
      const result = await listDeviceTrackByImei(app, zone, imei, beginTime, endTime);

      return ok(result.points, {
        zone,
        imei,
        beginTime: result.beginTime,
        endTime: result.endTime,
        total: result.points.length,
        mileage: result.mileage,
        cached: result.cached,
      });
    },
  );

  app.get(
    '/devices/:imei/location',
    {
      schema: {
        params: ImeiParam,
        querystring: ZoneQuery,
        response: {
          200: Type.Object({
            data: LocationSchema,
            meta: Type.Object({
              zone: Type.String(),
              cached: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (req) => {
      const { zone } = req.query as { zone: string };
      const { imei } = req.params as { imei: string };
      const { location, cached } = await getLocationByImei(app, zone, imei);
      return ok(location, { zone, cached });
    },
  );
};

