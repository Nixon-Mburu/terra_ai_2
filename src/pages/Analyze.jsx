import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Map, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import Uploader from '../components/vision/Uploader';
import CinematicScanner from '../components/vision/CinematicScanner';
import PinDrop from '../components/map/PinDrop';
import ProgressiveLoader from '../components/results/ProgressiveLoader';
import RiskSummaryCard from '../components/results/RiskSummaryCard';
import Button from '../components/ui/Button';
import useTerraStore from '../store/useTerraStore';
import { getOrderedInstances } from '../utils/analyzeUtils';

// ─── Error Toast ──────────────────────────────────────────────
function ErrorToast({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-md"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
    </motion.div>
  );
}

// ─── Mode cards ───────────────────────────────────────────────
const MODE_CARDS = [
  {
    id: 'vision',
    icon: ScanLine,
    title: 'Scan via Photo',
    subtitle: 'Vision AI Flow',
    desc: 'Upload a land photo. Our YOLO model detects vegetation, terrain, water bodies, and structures instantly.',
    gradient: 'from-emerald-500 to-emerald-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    textColor: 'text-emerald-700',
    linkColor: '#10b981',
  },
  {
    id: 'map',
    icon: Map,
    title: 'Deep Map Analysis',
    subtitle: 'Spatial Engine Flow',
    desc: 'Drop a pin on the satellite map. The engine queries live infrastructure, zoning, and terrain data for that exact coordinate.',
    gradient: 'from-indigo-500 to-indigo-600',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    textColor: 'text-indigo-700',
    linkColor: '#4f46e5',
  },
];

export default function Analyze() {
  const navigate = useNavigate();
  const {
    visionState, mapState, engineState,
    setScanStatus, setAnnotations,
    setEngineStatus, setEngineResult, setEngineError, resetEngineState,
  } = useTerraStore();

  const [mode, setMode] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // ─── Vision: send FormData to /api/vision/analyze ────────
  // CRITICAL: The engine expects multipart/form-data with `image` field.
  // NOT JSON. NOT base64. A real File object in FormData.
  const handleScan = async () => {
    const file = visionState.uploadedFile;
    if (!file) {
      setErrorMsg('No image file found. Please re-upload the image.');
      return;
    }

    setScanStatus('scanning');
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/vision/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Vision API error ${res.status}`);
      }

      const data = await res.json();
      // Engine returns instances array — getOrderedInstances sorts by confidence
      const orderedInstances = getOrderedInstances(data);
      setAnnotations(orderedInstances, data);

    } catch (err) {
      setScanStatus('idle');
      setErrorMsg(err.message ?? 'Vision analysis failed. Please try again.');
    }
  };

  // ─── Map: trigger spatial engine ─────────────────────────
  const handleSpatialAnalyze = async () => {
    const { lat, lng } = mapState.pinnedCoordinates;
    if (!lat || !lng) {
      setErrorMsg('Please drop a pin on the map first.');
      return;
    }

    setEngineStatus('loading', 'Querying Nairobi infrastructure data…');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/spatial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          clientContext: mapState.approvedLocationData ?? null,
          visionContext: visionState.rawVisionPayload ?? null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Spatial API error ${res.status}`);
      }

      const data = await res.json();

      // Engine returns { success, payload, report, report_source }
      // payload = raw geospatial data (elevation_m, slope_percent, etc.)
      // report  = Gemini-structured object (overall_risk_score, sections[], etc.)
      const payload = data.payload ?? data;
      const report  = data.report ?? null;  // report is an OBJECT, not a string

      setEngineResult(payload, report);

    } catch (err) {
      setEngineError(err.message ?? 'Spatial analysis failed. Please try again.');
      setErrorMsg(err.message ?? 'Engine error. Please try again.');
    }
  };

  const pinSet = !!mapState.pinnedCoordinates.lat;
  const scanDone = visionState.scanStatus === 'complete';
  const engineDone = engineState.status === 'done';

  return (
    <MainLayout>
      <ProgressiveLoader />

      <AnimatePresence>
        {errorMsg && (
          <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── Mode Selection ── */}
          {!mode && (
            <motion.div key="mode-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-terra-heading mb-3">Choose your analysis method</h2>
                <p className="text-terra-body">Both pathways converge to the same risk report — pick what you have.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {MODE_CARDS.map(({ id, icon: Icon, title, subtitle, desc, gradient, lightBg, border, textColor, linkColor }) => (
                  <motion.button
                    key={id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMode(id)}
                    className={`text-left bg-white/70 backdrop-blur-md border ${border} rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}
                  >
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg mb-6`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className={`inline-block text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full ${lightBg} ${textColor} mb-3`}>
                      {subtitle}
                    </div>
                    <h3 className="text-xl font-black text-terra-heading mb-3">{title}</h3>
                    <p className="text-sm text-terra-body leading-relaxed mb-6">{desc}</p>
                    <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: linkColor }}>
                      Get Started <ChevronRight className="w-4 h-4" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Vision Flow ── */}
          {mode === 'vision' && (
            <motion.div key="vision-flow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => setMode(null)}
                  className="text-terra-muted hover:text-terra-heading text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-black text-terra-heading">Vision AI Scanner</h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Uploader + CTA */}
                <div className="space-y-4">
                  <Uploader />
                  {visionState.uploadedFile && visionState.scanStatus === 'idle' && (
                    <Button fullWidth variant="primary" size="lg" icon={ScanLine} onClick={handleScan}>
                      Start YOLO Scan
                    </Button>
                  )}
                  {visionState.scanStatus === 'scanning' && (
                    <Button fullWidth variant="secondary" size="lg" loading disabled>
                      Scanning…
                    </Button>
                  )}
                </div>

                {/* Right: CinematicScanner + upsell */}
                <div className="space-y-4">
                  <CinematicScanner />

                  {/* Upsell banner after scan completes */}
                  {scanDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-indigo-800 font-semibold text-sm">
                          Want deeper legal and zoning analysis for this plot?
                        </p>
                        <p className="text-indigo-600 text-xs mt-0.5">
                          Drop a pin to run the full spatial engine with this vision context.
                        </p>
                      </div>
                      <Button variant="indigo" size="sm" iconRight={ArrowRight} onClick={() => setMode('map')}>
                        Drop a Pin
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Map Flow ── */}
          {mode === 'map' && (
            <motion.div key="map-flow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => { setMode(null); resetEngineState(); }}
                  className="text-terra-muted hover:text-terra-heading text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-black text-terra-heading">Spatial Risk Engine</h2>
              </div>

              {/* Full map stage with PinDrop (includes LocationSearch) */}
              <div className="relative" style={{ height: '600px' }}>
                <PinDrop />
                {engineDone && <RiskSummaryCard />}
              </div>

              {/* Analyze CTA */}
              {!engineDone && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Map}
                    loading={engineState.status === 'loading'}
                    disabled={!pinSet || engineState.status === 'loading'}
                    onClick={handleSpatialAnalyze}
                  >
                    {pinSet ? 'Run Spatial Analysis' : 'Drop a Pin First'}
                  </Button>
                </div>
              )}

              {/* Done: navigate to report */}
              {engineDone && (
                <div className="mt-4 flex justify-center">
                  <Button variant="secondary" size="md" onClick={() => navigate('/report')}>
                    View Full Report →
                  </Button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
