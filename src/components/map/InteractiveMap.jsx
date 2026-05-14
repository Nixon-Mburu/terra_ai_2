import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Crosshair, Layers } from 'lucide-react';
import useTerraStore from '../../store/useTerraStore';

const NAIROBI_CENTER = { lat: -1.286389, lng: 36.817223 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MAP_TYPES = [
  { id: 'hybrid',    label: 'Hybrid',    },  // satellite + labels (DEFAULT)
  { id: 'roadmap',   label: 'Map',       },  // standard road map
  { id: 'satellite', label: 'Satellite', },  // pure satellite no labels
  { id: 'terrain',   label: 'Terrain',   },  // topographic
];

export default function InteractiveMap({ onPinDropped }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiError, setApiError] = useState(!API_KEY);
  const [activeType, setActiveType] = useState('hybrid');
  const { mapState, setPinnedCoordinates } = useTerraStore();

  useEffect(() => {
    if (!API_KEY) return;
    if (window.google?.maps) { initMap(); return; }
    const scriptId = 'terra-gmaps-script';
    if (document.getElementById(scriptId)) { window.__terraMapCallback = initMap; return; }
    window.__terraMapCallback = initMap;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=__terraMapCallback&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setApiError(true);
    document.head.appendChild(script);
    return () => { delete window.__terraMapCallback; };
  }, []);

  function initMap() {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: NAIROBI_CENTER,
      zoom: 13,
      // 'hybrid' = satellite tiles + road/place name labels (best of both)
      mapTypeId: 'hybrid',
      tilt: 0,
      zoomControl: true,
      mapTypeControl: false,   // we build our own toggle
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
    });
    mapInstanceRef.current = map;
    setMapReady(true);
    if (mapState.pinnedCoordinates.lat) dropPin(mapState.pinnedCoordinates, map);
    map.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      dropPin({ lat, lng }, map);
      setPinnedCoordinates(lat, lng);
      onPinDropped?.({ lat, lng });
    });
  }

  function dropPin({ lat, lng }, mapInstance) {
    const map = mapInstance ?? mapInstanceRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      animation: window.google.maps.Animation.DROP,
    });
    map.panTo({ lat, lng });
  }

  const switchMapType = (typeId) => {
    setActiveType(typeId);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(typeId);
    }
  };

  if (apiError || !API_KEY) {
    return (
      <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <MapPin className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-white font-semibold text-sm">Map Requires API Key</p>
          <p className="text-slate-400 text-xs max-w-xs">
            Add <code className="bg-white/10 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your{' '}
            <code className="bg-white/10 px-1 rounded">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden shadow-xl">
      {/* Map canvas */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Loading overlay */}
      <AnimatePresence>
        {!mapReady && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
            <Crosshair className="w-8 h-8 text-rose-400 animate-pulse" />
            <p className="text-slate-400 text-sm font-medium">Loading satellite view…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Map Type Toggle (custom, top-right) ── */}
      {mapReady && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-1">
          <Layers className="w-3.5 h-3.5 text-terra-muted ml-1.5 flex-shrink-0" />
          {MAP_TYPES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchMapType(id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-150 ${
                activeType === id
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-terra-body hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Coordinates display */}
      {mapState.pinnedCoordinates.lat && (
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-mono px-3 py-1.5 rounded-lg flex items-center gap-2">
          <MapPin className="w-3 h-3 text-rose-400" />
          {mapState.pinnedCoordinates.lat.toFixed(6)}, {mapState.pinnedCoordinates.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
