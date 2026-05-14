import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, XCircle, Download, ChevronRight,
  Flame, Droplets, Mountain
} from 'lucide-react';
import { clsx } from 'clsx';
import useTerraStore from '../../store/useTerraStore';
import Button from '../ui/Button';

/**
 * RiskSummaryCard — Floating card overlay on the map.
 * Reads from:
 *   engineState.report  → { overall_risk_score, overall_risk_label, key_flags, investment_verdict }
 *   engineState.payload → { elevation_m, slope_percent, flood_history }
 */

function riskConfig(score) {
  if (score >= 65) return { color: 'text-red-600',    bg: 'bg-red-50',    bar: 'bg-red-500',    icon: XCircle,       badge: 'bg-red-50 border-red-300 text-red-700' };
  if (score >= 40) return { color: 'text-amber-600',  bg: 'bg-amber-50',  bar: 'bg-amber-500',  icon: AlertTriangle, badge: 'bg-amber-50 border-amber-300 text-amber-700' };
  return               { color: 'text-emerald-600',   bg: 'bg-emerald-50',bar: 'bg-emerald-500', icon: CheckCircle2,  badge: 'bg-emerald-50 border-emerald-300 text-emerald-700' };
}

export default function RiskSummaryCard() {
  const navigate = useNavigate();
  const { engineState } = useTerraStore();

  if (engineState.status !== 'done') return null;

  const report  = engineState.report  ?? {};
  const payload = engineState.payload ?? {};

  const score   = typeof report.overall_risk_score === 'number' ? report.overall_risk_score : 0;
  const label   = String(report.overall_risk_label ?? 'UNKNOWN');
  const flags   = Array.isArray(report.key_flags) ? report.key_flags : [];
  const verdict = report.investment_verdict ? String(report.investment_verdict) : null;

  const elevation = payload.elevation_m   != null ? `${payload.elevation_m}m`   : '—';
  const slope     = payload.slope_percent != null ? `${payload.slope_percent}%`  : '—';
  const flood     = payload.flood_history === true ? 'Detected'
                  : payload.flood_history === false ? 'Clear' : '—';

  const { color, bar, badge, icon: RiskIcon } = riskConfig(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.1 }}
      className="absolute bottom-4 left-4 right-4 z-20 md:left-auto md:right-4 md:w-[360px]"
    >
      {/* Solid white card — no blur that kills legibility */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">

        {/* ── Score header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Overall Risk Score</p>
              <div className="flex items-end gap-2">
                <span className={clsx('text-5xl font-black leading-none', color)}>{score}</span>
                <span className="text-slate-400 text-lg mb-1 font-medium">/100</span>
              </div>
              {verdict && (
                <p className="text-[11px] font-semibold text-slate-600 mt-1">{verdict}</p>
              )}
            </div>
            <span className={clsx('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border', badge)}>
              <RiskIcon className="w-3 h-3" />
              {label}
            </span>
          </div>

          {/* Score bar */}
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={clsx('h-full rounded-full', bar)}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            />
          </div>
        </div>

        {/* ── Quick stats ── */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { icon: Mountain, label: 'Elevation', value: elevation },
            { icon: Flame,    label: 'Slope',     value: slope },
            { icon: Droplets, label: 'Flood',     value: flood },
          ].map(({ icon: Icon, label: lbl, value }) => (
            <div key={lbl} className="flex flex-col items-center py-3 gap-0.5">
              <Icon className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
              <span className="text-[10px] text-slate-500 font-medium">{lbl}</span>
              <span className="text-sm font-bold text-slate-900 capitalize">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Key flags (capped at 3) ── */}
        {flags.length > 0 && (
          <div className="px-5 py-3 max-h-36 overflow-y-auto">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Key Risk Flags</p>
            {flags.slice(0, 3).map((flag, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-700 leading-snug">{flag}</p>
              </motion.div>
            ))}
            {flags.length > 3 && (
              <p className="text-[10px] text-slate-400 mt-1">+{flags.length - 3} more in full report</p>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="px-5 py-4 bg-slate-50">
          <button
            onClick={() => navigate('/report')}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-3 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Full PDF Report
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
