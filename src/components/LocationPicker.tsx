import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, useMapEvents } from 'react-leaflet';
import { MapPin, Locate } from 'lucide-react';
import Dialog from './Dialog';
import { ensureLeafletIcons } from '../utils/leafletSetup';
import { UserGroupModel } from '../firestore';
import type { GroupPolygon, MapCoordinate } from '../schemas/UserGroupSchema';
import { isPointInPolygon, parseLatLngString } from '../utils/geo';

ensureLeafletIcons();

const debugLog = (...args: unknown[]): void => {
  if (import.meta.env?.DEV) {
    console.debug('[LocationPicker]', ...args);
  }
};

interface LocationPickerProps {
  coordinates?: string; // Format: "lat,lng"
  onCoordinatesChange: (coordinates: string) => void;
  buttonText?: string;
  buttonClassName?: string;
}

interface Position {
  lat: number;
  lng: number;
}

const DEFAULT_POSITION: Position = { lat: 11.002374, lng: 76.966453 };

const positionsEqual = (a: Position | null | undefined, b: Position | null | undefined): boolean => {
  if (!a || !b) {
    return false;
  }
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
};

const polygonArea = (points: MapCoordinate[]): number => {
  if (points.length < 3) {
    return 0;
  }
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    area += points[i].lng * points[j].lat - points[j].lng * points[i].lat;
  }
  return Math.abs(area) / 2;
};

const polygonCentroid = (points: MapCoordinate[]): MapCoordinate => {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let sumLat = 0;
  let sumLng = 0;
  let factor = 0;

  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    const cross = points[i].lat * points[j].lng - points[j].lat * points[i].lng;
    sumLat += (points[i].lat + points[j].lat) * cross;
    sumLng += (points[i].lng + points[j].lng) * cross;
    factor += cross;
  }

  if (Math.abs(factor) < 1e-9) {
    // Fallback to arithmetic mean when polygon is degenerate
    const avgLat = points.reduce((acc, point) => acc + point.lat, 0) / points.length;
    const avgLng = points.reduce((acc, point) => acc + point.lng, 0) / points.length;
    return { lat: avgLat, lng: avgLng };
  }

  factor *= 3;
  return {
    lat: sumLat / factor,
    lng: sumLng / factor,
  };
};

type CoverageArea = {
  groupId: string;
  groupName?: string;
  polygonId: string;
  polygonName?: string;
  points: MapCoordinate[];
};

// Component to handle map clicks
const LocationMarker: React.FC<{
  position: Position | null;
  onPositionChange: (pos: Position) => void;
  availabilityStatus: 'unknown' | 'inside' | 'outside';
  areaLabel?: string | null;
}> = ({ position, onPositionChange, availabilityStatus, areaLabel }) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        <div className="space-y-1 text-sm">
          <div className="font-semibold text-slate-800">Selected Location</div>
          <div>Lat: {position.lat.toFixed(6)}</div>
          <div>Lng: {position.lng.toFixed(6)}</div>
          {availabilityStatus === 'inside' && (
            <div className="font-medium text-emerald-600">
              Delivery available{areaLabel ? ` in ${areaLabel}` : ''}.
            </div>
          )}
          {availabilityStatus === 'outside' && (
            <div className="font-medium text-rose-600">
              Sorry, this spot is outside our delivery coverage.
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  coordinates,
  onCoordinatesChange,
  buttonText = 'Select Location on Map',
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempPosition, setTempPosition] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<'unknown' | 'inside' | 'outside'>('unknown');
  const [matchedArea, setMatchedArea] = useState<CoverageArea | null>(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  const computeInitialPosition = useCallback((): Position => {
    const parsed = parseLatLngString(coordinates);
    if (parsed) {
      debugLog('Initial position derived from existing coordinates', parsed);
      return { lat: parsed.lat, lng: parsed.lng };
    }

    const firstArea = coverageAreas.find(area => area.points.length > 0);
    if (firstArea) {
      debugLog('Initial position derived from coverage area', { areaId: firstArea.polygonId, point: firstArea.points[0] });
      return { lat: firstArea.points[0].lat, lng: firstArea.points[0].lng };
    }

    debugLog('Initial position falling back to default', DEFAULT_POSITION);
    return DEFAULT_POSITION;
  }, [coordinates, coverageAreas]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setUserHasInteracted(false);
    debugLog('Dialog opened. Resetting interaction state.');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || userHasInteracted) {
      return;
    }

    const target = computeInitialPosition();
    debugLog('Setting initial map position', target);
    setTempPosition(prev => (positionsEqual(prev, target) ? prev ?? target : target));
  }, [isOpen, userHasInteracted, computeInitialPosition, coverageAreas]);

  useEffect(() => {
    let cancelled = false;

    const sanitizePoints = (polygon: GroupPolygon | null | undefined): MapCoordinate[] => {
      if (!polygon) {
        return [];
      }

      return (polygon.points ?? [])
        .map(point => ({
          lat: typeof point.lat === 'number' ? point.lat : Number(point.lat),
          lng: typeof point.lng === 'number' ? point.lng : Number(point.lng),
        }))
        .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    };

    const loadCoverage = async () => {
      setCoverageLoading(true);
      setCoverageError(null);
      try {
        debugLog('Fetching user groups for coverage');
        const groups = await UserGroupModel.findAll();
        if (cancelled) {
          return;
        }

        const areas: CoverageArea[] = groups.flatMap(group => {
          const groupId = group.id ?? `group-${group.name}`;
          const groupName = group.name;
          const polygons = group.coveragePolygons ?? [];

          return polygons
            .map((polygon, index): CoverageArea | null => {
              const points = sanitizePoints(polygon);
              if (points.length < 3) {
                return null;
              }
              return {
                groupId,
                groupName,
                polygonId: polygon.id ?? `${groupId}-polygon-${index}`,
                polygonName: polygon.name,
                points,
              };
            })
            .filter((polygon): polygon is CoverageArea => Boolean(polygon));
        });

        debugLog('Loaded coverage areas', areas);
        debugLog('Coverage area count', areas.length);
        setCoverageAreas(areas);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load delivery coverage areas:', error);
          setCoverageError('Failed to load delivery coverage areas. Please try again later.');
          setCoverageAreas([]);
        }
      } finally {
        if (!cancelled) {
          setCoverageLoading(false);
        }
      }
    };

    void loadCoverage();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateAvailability = useCallback((position: Position | null, areas: CoverageArea[]) => {
    if (!position || areas.length === 0) {
      setAvailabilityStatus('unknown');
      setMatchedArea(null);
      return;
    }

    const point = { lat: position.lat, lng: position.lng };
    const containingAreas = areas.filter(area => isPointInPolygon(point, area.points));
    if (containingAreas.length > 0) {
      const ranked = [...containingAreas].sort((a, b) => {
        const centroidA = polygonCentroid(a.points);
        const centroidB = polygonCentroid(b.points);
        const distanceA = (centroidA.lat - point.lat) ** 2 + (centroidA.lng - point.lng) ** 2;
        const distanceB = (centroidB.lat - point.lat) ** 2 + (centroidB.lng - point.lng) ** 2;
        if (Math.abs(distanceA - distanceB) > 1e-12) {
          return distanceA - distanceB;
        }

        const aArea = polygonArea(a.points);
        const bArea = polygonArea(b.points);
        if (Math.abs(aArea - bArea) > 1e-6) {
          return aArea - bArea;
        }

        const aHasName = Boolean(a.polygonName && a.polygonName.trim().length > 0);
        const bHasName = Boolean(b.polygonName && b.polygonName.trim().length > 0);
        if (aHasName !== bHasName) {
          return aHasName ? -1 : 1;
        }

        return (a.groupName ?? '').localeCompare(b.groupName ?? '');
      });
      debugLog('Containing areas ranked', ranked.map(area => ({
        id: area.polygonId,
        name: area.polygonName ?? area.groupName ?? '—',
        centroid: polygonCentroid(area.points),
        distance: (polygonCentroid(area.points).lat - point.lat) ** 2 + (polygonCentroid(area.points).lng - point.lng) ** 2,
        area: polygonArea(area.points),
      })));
      const foundArea = ranked[0];
      debugLog('Availability evaluated', { point, chosenArea: foundArea });
      setAvailabilityStatus('inside');
      setMatchedArea(foundArea);
      return;
    }

    debugLog('Availability evaluated', { point, chosenArea: null });
    setAvailabilityStatus('outside');
    setMatchedArea(null);
  }, []);

  useEffect(() => {
    const resolvedPosition: Position | null = tempPosition
      ? tempPosition
      : (() => {
          const parsed = parseLatLngString(coordinates);
          return parsed ? { lat: parsed.lat, lng: parsed.lng } : null;
        })();

    updateAvailability(resolvedPosition, coverageAreas);
  }, [coordinates, tempPosition, coverageAreas, updateAvailability]);

  const handleTempPositionChange = (newPos: Position) => {
    setUserHasInteracted(true);
    debugLog('Updating temporary position', newPos);
    const nextPosition: Position = { lat: newPos.lat, lng: newPos.lng };
    setTempPosition(prev => (positionsEqual(prev, nextPosition) ? prev : nextPosition));
  };

  const handleConfirmLocation = () => {
    if (!tempPosition) {
      return;
    }

    debugLog('Confirming selection', tempPosition);
    onCoordinatesChange(`${tempPosition.lat.toFixed(6)},${tempPosition.lng.toFixed(6)}`);
    setIsOpen(false);
    setSearchQuery('');
    setSearchError(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSearchError(null);
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Fetch autocomplete suggestions
  const fetchSearchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        setShowDropdown(true);
        setSearchError(null);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to search location. Please try again.');
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  // Handle input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedIndex(-1);
    
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timeoutId = setTimeout(() => {
        fetchSearchSuggestions(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  // Handle selecting a search result
  const handleSelectResult = (result: SearchResult) => {
    const newPos = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    handleTempPositionChange(newPos);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setShowDropdown(false);
    setSearchError(null);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectResult(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Get user's current location using browser geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }

    setGettingLocation(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        handleTempPositionChange(newPos);
        setGettingLocation(false);
        setSearchQuery(`Current Location (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to get your location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        setSearchError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Display current coordinates
  const currentCoords = coordinates ? coordinates.split(',').map(parseFloat) : null;
  const displayText = currentCoords 
    ? `Location: ${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)}`
    : 'No location selected';

  const selectedAreaLabel = useMemo(() => {
    if (!matchedArea) {
      return null;
    }
    const fallbackName = matchedArea.groupName ?? null;
    const polygonName = matchedArea.polygonName?.trim();
    return polygonName && polygonName.length > 0 ? polygonName : fallbackName;
  }, [matchedArea]);

  const hasResolvedPosition = useMemo(() => {
    if (tempPosition) {
      return true;
    }
    return Boolean(parseLatLngString(coordinates));
  }, [coordinates, tempPosition]);

  return (
    <>
      {/* Button to open map dialog */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 ${buttonClassName}`}
        >
          <MapPin size={18} className="text-purple-600" />
          <span>{buttonText}</span>
        </button>
        <p className="text-sm text-gray-600">{displayText}</p>
        {coverageError && (
          <p className="text-xs text-rose-600">{coverageError}</p>
        )}
        {coverageAreas.length > 0 && hasResolvedPosition && availabilityStatus === 'inside' && (
          <p className="text-xs text-emerald-600">Delivery available{selectedAreaLabel ? ` in ${selectedAreaLabel}` : ''}.</p>
        )}
        {coverageAreas.length > 0 && hasResolvedPosition && availabilityStatus === 'outside' && (
          <p className="text-xs text-rose-600">Outside our current delivery coverage. Please try a nearby location.</p>
        )}
      </div>

      {/* Map Dialog */}
      <Dialog
        open={isOpen}
        onClose={handleCancel}
        title="Select Location on Map"
        size="xxl"
      >
        <div className="space-y-4">
          {/* Search bar with autocomplete and current location button */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyPress}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search for a location (e.g., Coimbatore, India)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  autoComplete="off"
                />
                
                {/* Autocomplete dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={result.place_id}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 focus:bg-purple-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                          index === selectedIndex ? 'bg-purple-100' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-purple-600 mt-1 flex-shrink-0" />
                          <span className="flex-1">{result.display_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Use Current Location button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm whitespace-nowrap"
                title="Use my current location"
              >
                <Locate size={16} />
                {gettingLocation ? 'Getting...' : 'Current Location'}
              </button>
            </div>
          </div>

          {/* Error message */}
          {searchError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {searchError}
            </div>
          )}

          {/* Tip */}
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            <strong>Tip:</strong> Search for an address or click on the map to select your exact location.
          </div>

          {/* Delivery coverage message */}
          <div>
            {coverageLoading && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Checking delivery coverage…
              </div>
            )}
            {!coverageLoading && coverageError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {coverageError}
              </div>
            )}
            {!coverageLoading && !coverageError && coverageAreas.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Delivery coverage areas are not configured yet. You can still save a location.
              </div>
            )}
            {!coverageLoading && !coverageError && coverageAreas.length > 0 && availabilityStatus === 'inside' && matchedArea && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Great news! This location is inside our delivery zone{selectedAreaLabel ? ` (${selectedAreaLabel})` : ''}.
              </div>
            )}
            {!coverageLoading && !coverageError && coverageAreas.length > 0 && availabilityStatus === 'outside' && hasResolvedPosition && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Sorry, we are not delivering to this spot yet. Move the pin into the highlighted delivery area to continue.
              </div>
            )}
            {!coverageLoading && !coverageError && coverageAreas.length > 0 && availabilityStatus === 'unknown' && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Move the pin onto the map to see if we deliver there.
              </div>
            )}
          </div>

          {/* Selected coordinates display */}
          {tempPosition && (
            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
              <strong>Selected Coordinates:</strong> {tempPosition.lat.toFixed(6)}, {tempPosition.lng.toFixed(6)}
            </div>
          )}

          {/* Map */}
          <div style={{ height: '500px' }} className="rounded-lg overflow-hidden border border-gray-300">
            {tempPosition && (
              <MapContainer
                center={[tempPosition.lat, tempPosition.lng]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                key={`${tempPosition.lat}-${tempPosition.lng}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {coverageAreas.map(area => {
                  const positions = area.points.map(point => [point.lat, point.lng] as [number, number]);
                  const isSelectedArea = matchedArea?.polygonId === area.polygonId;
                  return (
                    <Polygon
                      key={`${area.groupId}-${area.polygonId}`}
                      positions={positions}
                      pathOptions={{
                        color: isSelectedArea ? '#059669' : '#7c3aed',
                        weight: isSelectedArea ? 3 : 2,
                        fillOpacity: isSelectedArea ? 0.28 : 0.18,
                        fillColor: isSelectedArea ? '#10b981' : '#a855f7',
                      }}
                    >
                      {(area.polygonName || area.groupName) && (
                        <Tooltip direction="center" permanent>
                          {area.polygonName ?? area.groupName}
                        </Tooltip>
                      )}
                    </Polygon>
                  );
                })}
                <LocationMarker
                  position={tempPosition}
                  onPositionChange={handleTempPositionChange}
                  availabilityStatus={availabilityStatus}
                  areaLabel={selectedAreaLabel}
                />
              </MapContainer>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={!tempPosition}
            >
              Set Location
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default LocationPicker;
