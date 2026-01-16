import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { Crosshair } from 'lucide-react';
import type { Station } from '@/types';
import { StationStatus } from '@/types';
import 'leaflet/dist/leaflet.css';

interface MapCanvasProps {
  stations: Station[];
  selectedStationId?: string;
  onSelectStation: (station: Station) => void;
  onClearSelection: () => void;
  userLocation: { lat: number; lng: number };
  legendItems?: { status: StationStatus | string; label: string }[];
}

const MapCanvas = ({
  stations,
  selectedStationId,
  onSelectStation,
  onClearSelection,
  userLocation,
  legendItems,
}: MapCanvasProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const leaflet = await import('leaflet');
      if (!isMounted || !mapRef.current) return;

      leafletRef.current = leaflet;
      const map = leaflet.map(mapRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      leaflet
        .tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
        })
        .addTo(map);

      leaflet.control.zoom({ position: 'bottomright' }).addTo(map);

      const userIcon = leaflet.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute inset-0 bg-sky-400 rounded-full animate-ping opacity-30 w-[36px] h-[36px] -ml-[8px] -mt-[8px]"></div>
            <div class="relative w-4 h-4 rounded-full bg-sky-500 border-[3px] border-white shadow-lg"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      leaflet.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

      map.on('click', () => onClearSelection());
      mapInstanceRef.current = map;
      setMapReady(true);
    };

    void initializeMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, [onClearSelection, userLocation.lat, userLocation.lng]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !leafletRef.current) return;
    const leaflet = leafletRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    stations.forEach((station) => {
      const isSelected = station.id === selectedStationId;
      const statusColor =
        station.status === StationStatus.AVAILABLE
          ? '#10b981'
          : station.status === StationStatus.BUSY
            ? '#f43f5e'
            : '#94a3b8';
      const iconSize = isSelected ? 34 : 28;
      const iconHtml = `
        <div class="leaflet-station-wrapper" style="transform: scale(${isSelected ? 1.12 : 1});">
          ${isSelected ? '<div class="leaflet-station-highlight"></div>' : ''}
          ${
            station.status === StationStatus.AVAILABLE
              ? '<div class="leaflet-station-pulse"></div>'
              : ''
          }
          <div
            class="leaflet-station-icon"
            style="background:${statusColor}; width:${iconSize}px; height:${iconSize}px;"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#ffffff" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"></path>
            </svg>
          </div>
        </div>
      `;

      const icon = leaflet.divIcon({
        className: 'leaflet-custom-marker',
        html: iconHtml,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      });

      const marker = leaflet.marker([station.lat, station.lng], {
        icon,
        zIndexOffset: isSelected ? 600 : 0,
      });
      marker.on('click', () => onSelectStation(station));
      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [mapReady, stations, selectedStationId, onSelectStation]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !selectedStationId) return;
    const station = stations.find((item) => item.id === selectedStationId);
    if (!station) return;
    const map = mapInstanceRef.current;
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 14);
    map.flyTo([station.lat, station.lng], targetZoom, {
      animate: true,
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [mapReady, selectedStationId, stations]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 12);
      onClearSelection();
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <button
        type="button"
        onClick={handleRecenter}
        className="absolute bottom-6 right-4 z-[400] rounded-full border border-border bg-surface-strong p-3 text-ink shadow-soft transition hover:scale-105"
        aria-label="Recenter map"
      >
        <Crosshair size={20} />
      </button>
      {legendItems && legendItems.length > 0 && (
        <div className="absolute left-4 top-4 z-[900] hidden items-center gap-3 rounded-2xl border border-border bg-surface/90 px-3 py-2 text-xs font-semibold text-muted backdrop-blur md:flex">
          {legendItems.map((item) => {
            const statusValue = String(item.status).toUpperCase();
            const indicatorClass =
              statusValue === StationStatus.AVAILABLE
                ? 'bg-accent shadow-[0_0_0_2px_rgba(16,185,129,0.2)]'
                : statusValue === StationStatus.BUSY
                  ? 'bg-danger'
                  : 'bg-slate-400';
            return (
              <span key={`${item.status}-${item.label}`} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${indicatorClass}`} />
                {item.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapCanvas;
