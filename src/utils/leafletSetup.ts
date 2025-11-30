import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let initialized = false;

export const ensureLeafletIcons = (): void => {
  if (initialized) {
    return;
  }

  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
  if (proto && '_getIconUrl' in proto) {
    delete (proto as { _getIconUrl?: unknown })._getIconUrl;
  }

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  initialized = true;
};

export default ensureLeafletIcons;
