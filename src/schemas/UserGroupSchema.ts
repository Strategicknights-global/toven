import { type } from 'arktype';

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface GroupPolygon {
  id: string;
  name?: string;
  points: MapCoordinate[];
}

export interface UserGroupSchema {
  id?: string;
  name: string;
  description?: string;
  coveragePolygons?: GroupPolygon[];
  createdAt?: Date;
  updatedAt?: Date;
}

const CoordinateType = type({
  lat: 'number',
  lng: 'number',
});

const PolygonType = type({
  id: 'string',
  "name?": 'string',
  points: CoordinateType.array(),
});

export const UserGroupCreate = type({
  name: 'string',
  "description?": 'string',
  "coveragePolygons?": PolygonType.array(),
});

export const UserGroupUpdate = type({
  "name?": 'string',
  "description?": 'string',
  "coveragePolygons?": PolygonType.array(),
});
