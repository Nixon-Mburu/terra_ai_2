import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import useTerraStore from '../../store/useTerraStore';

const ROUTE_LABELS = {
  '/':        { label: 'Home',         sub: 'Terra AI Land Intelligence' },
  '/analyze': { label: 'Analyze Land', sub: 'Vision & Spatial Engine' },
  '/pricing': { label: 'Pricing',      sub: 'Choose your plan' },
  '/report':  { label: 'Report',       sub: 'Your risk assessment' },
};

const STATUS_CONFIG = {
  idle:    { icon: Zap,          color: 'text-terra-muted',   bg: 'bg-slate-100', label: 'Engine Ready' },
  loading: { icon: Loader2,      color: 'text-indigo-600',    bg: 'bg-indigo-50', label: 'Analyzing...' },
  done:    { icon: CheckCircle2, color: 'text-emerald-600',   bg: 'bg-emerald-50',label: 'Analysis Complete' },
  error:   { icon: AlertCircle,  color: 'text-red-600',       bg: 'bg-red-50',    label: 'Engine Error' },
};

export default function TopBar() {
  const location = useLocation();
  const { engineState } = useTerraStore();
  const route = ROUTE_LABELS[location.pathname] ?? { label: 'Terra AI', sub: '' };
  const statusCfg = STATUS_CONFIG[engineState.status] ?? STATUS_CONFIG.idle;
  const StatusIcon = statusCfg.icon;

  return (
    <header className="flex items-center justify-between px-6 h-16 bg-white border-b border-terra-border flex-shrink-0">
      {/* ── Breadcrumb ── */}
      <div>
        <AnimatePresence mode="wait">
          <motion.h1
            key={location.pathname}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="text-base font-bold text-terra-heading leading-tight"
          >
            {route.label}
          </motion.h1>
        </AnimatePresence>
        {route.sub && (
          <p className="text-xs text-terra-muted font-medium">{route.sub}</p>
        )}
      </div>

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-3">
        {/* Engine status pill */}
        <div className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold',
          statusCfg.bg, statusCfg.color
        )}>
          <StatusIcon
            className={clsx('w-3.5 h-3.5', engineState.status === 'loading' && 'animate-spin')}
          />
          <span>{statusCfg.label}</span>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-md">
          T
        </div>
      </div>
    </header>
  );
}
