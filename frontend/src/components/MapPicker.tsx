import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  defaultCenter?: { lat: number; lng: number };
}

const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };

const MapPicker = ({ value, onChange, defaultCenter = DEFAULT_CENTER }: MapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const leaflet = await import('leaflet');
      if (!isMounted || !mapRef.current) return;
      leafletRef.current = leaflet;

      const initial = value ?? defaultCenter;
      const map = leaflet.map(mapRef.current, {
        center: [initial.lat, initial.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      leaflet
        .tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
        })
        .addTo(map);

      leaflet.control.zoom({ position: 'bottomright' }).addTo(map);

      if (value) {
        const marker = leaflet.marker([value.lat, value.lng], { draggable: true });
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onChange({ lat: position.lat, lng: position.lng });
        });
        marker.addTo(map);
        markerRef.current = marker;
      }

      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        const coords = { lat: event.latlng.lat, lng: event.latlng.lng };
        onChange(coords);
      });

      mapInstanceRef.current = map;
    };

    void initializeMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [defaultCenter, onChange, value]);

  useEffect(() => {
    if (!value || !mapInstanceRef.current || !leafletRef.current) return;
    const map = mapInstanceRef.current;
    if (!markerRef.current) {
      const leaflet = leafletRef.current;
      const marker = leaflet.marker([value.lat, value.lng], { draggable: true });
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChange({ lat: position.lat, lng: position.lng });
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
    map.setView([value.lat, value.lng], map.getZoom(), { animate: true });
  }, [value]);

  return (
    <div className="h-40 w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

export default MapPicker;
