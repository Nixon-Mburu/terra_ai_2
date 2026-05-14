import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2, X, Clock, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import {
  reverseGeocodePosition,
  buildCandidatesFromGeocode,
  enrichLocationCandidates,
  readLocationHistory,
  writeLocationHistory,
  FALLBACK_LOCATION_CANDIDATES,
} from '../../utils/analyzeUtils';
import useTerraStore from '../../store/useTerraStore';

/**
 * LocationSearch — search bar + candidate list for confirming a map location.
 * Calls /api/location/reverse (via reverseGeocodePosition) then enriches
 * candidates with Wikipedia summaries. Updates mapState.approvedLocationData.
 */
export default function LocationSearch({ onLocationConfirmed }) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { mapState, setApprovedLocationData, setPinnedCoordinates } = useTerraStore();
  const inputRef = useRef(null);

  // Populate from pinned coordinates via reverse geocode
  const loadCandidatesForPin = async ({ lat, lng }) => {
    setLoading(true);
    setOpen(true);
    try {
      const history = readLocationHistory();
      const geocode = await reverseGeocodePosition({ latitude: lat, longitude: lng });
      const raw = buildCandidatesFromGeocode({ ...geocode, history });
      const enriched = await enrichLocationCandidates(raw);
      setCandidates(enriched);
    } catch {
      setCandidates(FALLBACK_LOCATION_CANDIDATES);
    } finally {
      setLoading(false);
    }
  };

  // Text-based search against fallback candidates + Nominatim
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query + ', Kenya')}&limit=5&addressdetails=1`
      );
      const results = await res.json();
      const mapped = results.map((r, i) => ({
        id: `nominatim-${i}`,
        name: r.display_name?.split(',')[0] ?? r.name,
        region: r.address?.state ?? r.address?.county ?? 'Kenya',
        country: r.address?.country ?? 'Kenya',
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        overview: r.display_name,
        wikiTitle: r.display_name?.split(',')[0],
      }));
      setCandidates(mapped.length > 0 ? mapped : FALLBACK_LOCATION_CANDIDATES);
    } catch {
      setCandidates(FALLBACK_LOCATION_CANDIDATES);
    } finally {
      setLoading(false);
    }
  };

  const confirmCandidate = (candidate) => {
    const locationData = {
      address: candidate.region,
      placeName: candidate.name,
      country: candidate.country,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    };
    setApprovedLocationData(locationData);
    setPinnedCoordinates(candidate.latitude, candidate.longitude);
    writeLocationHistory(candidate);
    setOpen(false);
    setQuery(candidate.name);
    onLocationConfirmed?.(candidate);
  };

  // Expose loadCandidatesForPin to parent via ref-like prop pattern
  LocationSearch.loadForPin = loadCandidatesForPin;

  return (
    <div className="relative w-full max-w-sm">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-white border border-terra-border rounded-xl shadow-lg px-3 py-2.5">
        <Search className="w-4 h-4 text-terra-muted flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search location in Kenya…"
          className="flex-1 text-sm text-terra-heading placeholder:text-terra-muted bg-transparent focus:outline-none"
        />
        {loading && <Loader2 className="w-4 h-4 text-terra-muted animate-spin flex-shrink-0" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setCandidates([]); setOpen(false); }}>
            <X className="w-4 h-4 text-terra-muted hover:text-terra-heading" />
          </button>
        )}
      </div>

      {/* Candidate Dropdown */}
      <AnimatePresence>
        {open && candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-terra-border shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-terra-border">
              <p className="text-xs text-terra-muted font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Confirm Location
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => confirmCandidate(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-terra-heading truncate">{c.name}</p>
                    <p className="text-xs text-terra-muted truncate">{c.region}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-terra-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
