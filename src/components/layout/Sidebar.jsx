import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ScanLine, Map, FileText, CreditCard,
  ChevronLeft, ChevronRight, Leaf, Clock, Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import useTerraStore from '../../store/useTerraStore';

const NAV_ITEMS = [
  { to: '/',        icon: LayoutDashboard, label: 'Home' },
  { to: '/analyze', icon: ScanLine,        label: 'Analyze Land' },
  { to: '/pricing', icon: CreditCard,      label: 'Pricing' },
  { to: '/report',  icon: FileText,        label: 'My Report' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { userSession, resetAll } = useTerraStore();

  const handleNewAnalysis = () => {
    resetAll();
    navigate('/analyze');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-screen bg-white border-r border-terra-border flex-shrink-0 overflow-hidden"
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-terra-border flex-shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <span className="text-base font-bold text-terra-heading tracking-tight whitespace-nowrap">
                Terra <span className="text-terra-emerald">AI</span>
              </span>
              <p className="text-[10px] text-terra-muted font-medium tracking-wider uppercase whitespace-nowrap">
                Land Intelligence
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── New Analysis CTA ── */}
      <div className="px-3 py-4 border-b border-terra-border">
        <button
          onClick={handleNewAnalysis}
          className={clsx(
            'flex items-center gap-2 w-full rounded-xl px-3 py-2.5',
            'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
            'hover:from-emerald-600 hover:to-emerald-700',
            'transition-all duration-200 shadow-lg shadow-emerald-500/25',
            'font-semibold text-sm',
            collapsed ? 'justify-center' : ''
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                New Analysis
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-terra-muted uppercase tracking-widest px-2 mb-3">
            Navigation
          </p>
        )}
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-terra-emerald-light text-emerald-700'
                  : 'text-terra-body hover:bg-slate-50 hover:text-terra-heading',
                collapsed ? 'justify-center' : ''
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-emerald-600' : '')} />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}

        {/* ── Recent Projects ── */}
        {!collapsed && userSession.recentProjects.length > 0 && (
          <div className="pt-6">
            <p className="text-[10px] font-semibold text-terra-muted uppercase tracking-widest px-2 mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent
            </p>
            {userSession.recentProjects.slice(0, 5).map((proj) => (
              <div
                key={proj.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-terra-body hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <Map className="w-3 h-3 flex-shrink-0 text-terra-muted" />
                <span className="truncate">{proj.name || proj.id}</span>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[72px] z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-terra-border shadow-md text-terra-body hover:text-terra-heading transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
