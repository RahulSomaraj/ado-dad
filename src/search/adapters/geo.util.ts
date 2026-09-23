import { GeoPoint } from '../planner/search-plan';

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km (same formula the Mongo adapter evaluates server-side). */
export function distanceKmBetween(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const cosine = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return EARTH_RADIUS_KM * Math.acos(Math.min(1, Math.max(-1, cosine)));
}
