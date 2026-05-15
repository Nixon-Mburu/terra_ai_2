import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import InteractiveMap from './InteractiveMap';
import LocationSearch from './LocationSearch';
import useTerraStore from '../../store/useTerraStore';

/**
 * PinDrop — Composes InteractiveMap + LocationSearch into a single workflow.
 * When the user drops a pin, reverse-geocode candidates are fetched automatically.
 * When a location is confirmed from the search, the map pans to it.
 *
 * Updates: mapState.pinnedCoordinates + mapState.approvedLocationData
 */
export default function PinDrop() {
  const { mapState } = useTerraStore();
  const searchRef = useRef(null);

  const handlePinDropped = async ({ lat, lng }) => {
    // Auto-trigger reverse geocode candidate load when pin drops
    if (LocationSearch.loadForPin) {
      await LocationSearch.loadForPin({ lat, lng });
    }
  };

  const handleLocationConfirmed = () => {
    // Pin coordinates set in store automatically by LocationSearch
  };

  const pinSet = !!mapState.pinnedCoordinates.lat;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Top bar: search overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <LocationSearch onLocationConfirmed={handleLocationConfirmed} />


      </div>

      {/* Map fills the remaining space */}
      <div className="flex-1 relative">
        <InteractiveMap onPinDropped={handlePinDropped} />
      </div>

      {/* Instructions overlay when no pin dropped */}
      <AnimatePresence>
        {!pinSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-sm text-white text-xs font-medium px-5 py-2.5 rounded-full shadow-xl">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Click anywhere on the satellite map to drop a pin
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
