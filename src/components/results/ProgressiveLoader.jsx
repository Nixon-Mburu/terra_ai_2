import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import useTerraStore from '../../store/useTerraStore';

const LOADING_STEPS = [
  { message: 'Querying Nairobi infrastructure data…',           duration: 3500 },
  { message: 'Calculating riparian buffers and slope terrain…', duration: 4000 },
  { message: 'Cross-referencing zoning records…',               duration: 3000 },
  { message: 'Synthesizing final risk report via Gemini…',      duration: 5000 },
];

/**
 * ProgressiveLoader — full-screen overlay that cycles through
 * the blueprint's 4 loading messages while the Flask engine runs.
 * Renders only when engineState.status === 'loading'.
 */
export default function ProgressiveLoader() {
  const { engineState } = useTerraStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState('');

  const isVisible = engineState.status === 'loading';

  // Cycle through loading steps
  useEffect(() => {
    if (!isVisible) { setStepIndex(0); return; }

    let current = 0;
    const advance = () => {
      current = Math.min(current + 1, LOADING_STEPS.length - 1);
      setStepIndex(current);
    };

    const timers = LOADING_STEPS.slice(0, -1).map((step, i) => {
      const accumulated = LOADING_STEPS.slice(0, i + 1).reduce((sum, s) => sum + s.duration, 0);
      return setTimeout(() => advance(), accumulated);
    });

    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  // Animated ellipsis
  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => setDots((d) => (d.length < 3 ? d + '.' : '')), 420);
    return () => clearInterval(id);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="progressive-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-8 max-w-sm w-full px-8">
            {/* Pulsing ring */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-emerald-400 blur-xl"
              />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl">
                <Loader2 className="w-9 h-9 text-white animate-spin" />
              </div>
            </div>

            {/* Step message */}
            <div className="text-center min-h-[56px] flex flex-col items-center justify-center gap-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stepIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="text-terra-heading font-semibold text-base text-center"
                >
                  {LOADING_STEPS[stepIndex].message}
                </motion.p>
              </AnimatePresence>
              <span className="text-terra-muted text-sm font-mono w-6 inline-block">{dots}</span>
            </div>

            {/* Step progress dots */}
            <div className="flex items-center gap-2">
              {LOADING_STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scale: i === stepIndex ? 1.4 : 1 }}
                  className={`rounded-full transition-all duration-300 ${
                    i <= stepIndex
                      ? 'bg-emerald-500 w-2.5 h-2.5'
                      : 'bg-slate-200 w-2 h-2'
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-terra-muted text-center">
              Terra AI Spatial Engine is analyzing your coordinates
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
