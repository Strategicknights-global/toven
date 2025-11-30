import React, { useCallback, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { GroupPolygon, MapCoordinate } from '../schemas/UserGroupSchema';
import { ensureLeafletIcons } from '../utils/leafletSetup';

ensureLeafletIcons();

const DEFAULT_CENTER: [number, number] = [11.016844, 76.955832];
const DEFAULT_ZOOM = 12;

interface GroupCoverageEditorProps {
  polygons: GroupPolygon[];
  onPolygonsChange: (polygons: GroupPolygon[]) => void;
  disabled?: boolean;
}

interface DrawingHandlerProps {
  isDrawing: boolean;
  onAddPoint: (point: MapCoordinate) => void;
}

const DrawingHandler: React.FC<DrawingHandlerProps> = ({ isDrawing, onAddPoint }) => {
  useMapEvents({
    click(event) {
      if (!isDrawing) {
        return;
      }
      onAddPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
};

interface MapViewControllerProps {
  polygons: GroupPolygon[];
  activePoints: MapCoordinate[];
  isDrawing: boolean;
}

const MapViewController: React.FC<MapViewControllerProps> = ({ polygons, activePoints, isDrawing }) => {
  const map = useMap();

  React.useEffect(() => {
    map.invalidateSize();
  }, [map]);

  React.useEffect(() => {
    if (isDrawing) {
      return;
    }

    const storedPoints = polygons.flatMap(polygon => polygon.points);
    const pointsToFit = storedPoints.length > 0 ? storedPoints : activePoints;

    if (pointsToFit.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(pointsToFit.map(point => [point.lat, point.lng] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.25), { animate: false });
    }
  }, [polygons, activePoints, isDrawing, map]);

  return null;
};

const generatePolygonId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `polygon-${Math.random().toString(36).slice(2, 12)}`;
};

const GroupCoverageEditor: React.FC<GroupCoverageEditorProps> = ({ polygons, onPolygonsChange, disabled = false }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePoints, setActivePoints] = useState<MapCoordinate[]>([]);

  const activePolyline = useMemo(() => activePoints.map(point => [point.lat, point.lng] as [number, number]), [activePoints]);

  React.useEffect(() => {
    if (disabled) {
      setIsDrawing(false);
      setActivePoints([]);
    }
  }, [disabled]);

  const handleAddPoint = useCallback((point: MapCoordinate) => {
    setActivePoints(previous => [...previous, point]);
  }, []);

  const handleStartDrawing = () => {
    setActivePoints([]);
    setIsDrawing(true);
  };

  const handleUndoLastPoint = () => {
    setActivePoints(previous => previous.slice(0, -1));
  };

  const handleCancelDrawing = () => {
    setActivePoints([]);
    setIsDrawing(false);
  };

  const handleCompletePolygon = () => {
    if (activePoints.length < 3) {
      return;
    }
    const newPolygon: GroupPolygon = {
      id: generatePolygonId(),
      name: `Area ${polygons.length + 1}`,
      points: activePoints.map(point => ({ lat: point.lat, lng: point.lng })),
    };
    onPolygonsChange([...polygons, newPolygon]);
    setActivePoints([]);
    setIsDrawing(false);
  };

  const handleRemovePolygon = (id: string) => {
    onPolygonsChange(polygons.filter(polygon => polygon.id !== id));
  };

  const handleNameChange = (id: string, value: string) => {
    onPolygonsChange(polygons.map(polygon => polygon.id === id ? { ...polygon, name: value } : polygon));
  };

  const disableDrawingActions = disabled;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Draw coverage areas by starting a new polygon and clicking on the map for each vertex. You can create multiple polygons per group.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleStartDrawing}
          disabled={disableDrawingActions || isDrawing}
        >
          Start New Polygon
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleUndoLastPoint}
          disabled={disableDrawingActions || !isDrawing || activePoints.length === 0}
        >
          Undo Last Point
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleCancelDrawing}
          disabled={disableDrawingActions || !isDrawing}
        >
          Cancel Drawing
        </button>
        <button
          type="button"
          className="rounded-md border border-emerald-200 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleCompletePolygon}
          disabled={disableDrawingActions || !isDrawing || activePoints.length < 3}
        >
          Finish Polygon
        </button>
        {isDrawing && (
          <span className="text-xs text-slate-500">Points placed: {activePoints.length}</span>
        )}
      </div>

      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" preferCanvas>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <DrawingHandler isDrawing={isDrawing} onAddPoint={handleAddPoint} />
          <MapViewController polygons={polygons} activePoints={activePoints} isDrawing={isDrawing} />

          {polygons.map(polygon => (
            <Polygon
              key={polygon.id}
              positions={polygon.points.map(point => [point.lat, point.lng] as [number, number])}
              pathOptions={{ color: '#7c3aed', weight: 2, fillColor: '#a855f7', fillOpacity: 0.2 }}
            >
              {polygon.name ? (
                <Tooltip direction="center" permanent>
                  {polygon.name}
                </Tooltip>
              ) : null}
            </Polygon>
          ))}

          {activePolyline.length > 1 && (
            <Polyline positions={activePolyline} pathOptions={{ color: '#22c55e', weight: 2, dashArray: '6 4' }} />
          )}

          {activePoints.map((point, index) => (
            <CircleMarker
              key={`active-point-${index}`}
              center={[point.lat, point.lng]}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e' }}
              radius={4}
            />
          ))}
        </MapContainer>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Defined areas</h3>
        {polygons.length === 0 ? (
          <p className="text-sm text-slate-500">No polygons defined yet.</p>
        ) : (
          polygons.map((polygon, index) => (
            <div key={polygon.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
                <input
                  type="text"
                  value={polygon.name ?? `Area ${index + 1}`}
                  onChange={event => handleNameChange(polygon.id, event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={disabled}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemovePolygon(polygon.id)}
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupCoverageEditor;
