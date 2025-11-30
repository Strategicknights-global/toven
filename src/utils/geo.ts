import type { GroupPolygon, MapCoordinate } from '../schemas/UserGroupSchema';

const EPSILON = 1e-9;

export const parseLatLngString = (value: string | null | undefined): MapCoordinate | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const [latRaw, lngRaw] = value.split(',').map(segment => segment.trim());
  if (!latRaw || !lngRaw) {
    return null;
  }
  const lat = Number.parseFloat(latRaw);
  const lng = Number.parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
};

const isPointOnSegment = (point: MapCoordinate, start: MapCoordinate, end: MapCoordinate): boolean => {
  const cross = (point.lat - start.lat) * (end.lng - start.lng) - (point.lng - start.lng) * (end.lat - start.lat);
  if (Math.abs(cross) > EPSILON) {
    return false;
  }

  const dot = (point.lng - start.lng) * (end.lng - start.lng) + (point.lat - start.lat) * (end.lat - start.lat);
  if (dot < -EPSILON) {
    return false;
  }

  const squaredLength = (end.lng - start.lng) ** 2 + (end.lat - start.lat) ** 2;
  if (dot - squaredLength > EPSILON) {
    return false;
  }

  return true;
};

export const isPointInPolygon = (point: MapCoordinate, polygon: MapCoordinate[]): boolean => {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vertexI = polygon[i];
    const vertexJ = polygon[j];

    if (isPointOnSegment(point, vertexI, vertexJ)) {
      return true;
    }

    const intersects = ((vertexI.lat > point.lat) !== (vertexJ.lat > point.lat)) &&
      (point.lng < ((vertexJ.lng - vertexI.lng) * (point.lat - vertexI.lat)) / ((vertexJ.lat - vertexI.lat) || EPSILON) + vertexI.lng);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

export const isPointInsideGroupPolygons = (point: MapCoordinate, polygons?: GroupPolygon[] | null): boolean => {
  if (!polygons || polygons.length === 0) {
    return false;
  }

  return polygons.some(polygon => isPointInPolygon(point, polygon.points));
};

export const clonePolygons = (polygons: GroupPolygon[]): GroupPolygon[] =>
  polygons.map(polygon => ({
    id: polygon.id,
    name: polygon.name,
    points: polygon.points.map(point => ({ lat: point.lat, lng: point.lng })),
  }));
