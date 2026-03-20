import { ApiError } from '../lib/errors.js';
import type { FastifyInstance } from 'fastify';
import { getZoneByCode } from '../db/zonesRepo.js';

const JIMI_UTC_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function formatUtcDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function parseAndValidateRange(beginTime?: string, endTime?: string) {
  const now = new Date();
  const defaultEnd = now;
  const defaultBegin = new Date(defaultEnd.getTime() - 24 * 60 * 60 * 1000);

  const begin = beginTime ?? formatUtcDateTime(defaultBegin);
  const end = endTime ?? formatUtcDateTime(defaultEnd);

  if (!JIMI_UTC_REGEX.test(begin) || !JIMI_UTC_REGEX.test(end)) {
    throw new ApiError('BAD_REQUEST', 'beginTime/endTime deben tener formato yyyy-MM-dd HH:mm:ss (UTC)', 400);
  }

  const beginDate = new Date(begin.replace(' ', 'T') + 'Z');
  const endDate = new Date(end.replace(' ', 'T') + 'Z');

  if (Number.isNaN(beginDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ApiError('BAD_REQUEST', 'Rango de fechas inválido', 400);
  }

  if (beginDate >= endDate) {
    throw new ApiError('BAD_REQUEST', 'beginTime debe ser menor que endTime', 400);
  }

  const maxSpanMs = 7 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - beginDate.getTime() > maxSpanMs) {
    throw new ApiError('BAD_REQUEST', 'El rango máximo permitido es de 7 días', 400);
  }

  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (beginDate < threeMonthsAgo) {
    throw new ApiError('BAD_REQUEST', 'beginTime no puede ser mayor a 3 meses hacia atrás', 400);
  }

  return { beginTime: begin, endTime: end };
}

export async function listLocationsByZone(app: FastifyInstance, zoneCode: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const locations = await app.provider.listLocationsByZone(zoneCode);
  return { locations, cached: false };
}

export async function getLocationByImei(app: FastifyInstance, zoneCode: string, imei: string) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const location = await app.provider.getLocationByImei(zoneCode, imei);
  if (!location) throw new ApiError('NOT_FOUND', 'Ubicación no encontrada', 404);
  return { location, cached: false };
}

export async function listDeviceTrackByImei(
  app: FastifyInstance,
  zoneCode: string,
  imei: string,
  beginTime?: string,
  endTime?: string,
) {
  const zone = await getZoneByCode(app.db, zoneCode);
  if (!zone || zone.is_active !== 1) throw new ApiError('NOT_FOUND', 'Zona no encontrada', 404);

  const range = parseAndValidateRange(beginTime, endTime);
  const { points, mileage } = await app.provider.listDeviceTrack(zoneCode, imei, range.beginTime, range.endTime);

  return { points, mileage, beginTime: range.beginTime, endTime: range.endTime, cached: false };
}

