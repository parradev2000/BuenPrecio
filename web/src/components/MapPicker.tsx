import { useCallback, useEffect, useRef } from 'react';
import { App, Button } from 'antd';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';
import { getCurrentPosition, reverseGeocode } from '../lib/geo';

export type MapPick = { address: string; latitude: number; longitude: number };

type MapPickerProps = {
  onPick: (pick: MapPick) => void;
};

const ICON = L.divIcon({
  className: '',
  html: '<div class="map-pin"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" fill="#e11d48" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function MapPicker({ onPick }: MapPickerProps) {
  const { message } = App.useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const addMarker = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], { icon: ICON }).addTo(map);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [21.6, -79.3],
      zoom: 7,
      minZoom: 7,
      maxBounds: L.latLngBounds([19.4, -85.3], [23.5, -73.9]),
      maxBoundsViscosity: 1,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      addMarker(lat, lng);
      const address = (await reverseGeocode(lat, lng)) ?? '';
      onPickRef.current({ latitude: lat, longitude: lng, address });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [addMarker]);

  async function locateMe() {
    try {
      const pos = await getCurrentPosition();
      const map = mapRef.current;
      if (map) map.setView([pos.latitude, pos.longitude], 16);
      addMarker(pos.latitude, pos.longitude);
      const address = (await reverseGeocode(pos.latitude, pos.longitude)) ?? '';
      onPickRef.current({ ...pos, address });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'No se pudo obtener la ubicación');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-slate-200 sm:h-72"
      />
      <div>
        <Button size="small" onClick={() => void locateMe()}>
          Usar mi ubicación
        </Button>
      </div>
    </div>
  );
}