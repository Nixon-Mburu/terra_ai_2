import React, { Suspense, lazy, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Download, ArrowLeft,
  MapPin, Zap, Droplets, Mountain, Shield, Building2,
  Sun, TreePine, Activity, DollarSign, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import ChatAssistant from '../components/results/ChatAssistant';
import useTerraStore from '../store/useTerraStore';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TerraReportDocument from '../components/pdf/TerraReportDocument';

/**
 * Report.jsx
 * ─────────────────────────────────────────────────────────────
 * Engine response schema (from /api/spatial/analyze):
 *   engineState.payload = {
 *     elevation_m, slope_percent, flood_history, nearest_waterway_m,
 *     nearest_road_m, distance_to_grid_m, aviation_risk, nearest_airport_km,
 *     riparian_breach, protected_land_risk, county, ward, place_name,
 *     ndvi_score, ndvi_interpretation, land_cover_label, soil_moisture,
 *     nearest_hospital_km, nearest_school_km, solar_available, annual_sunshine_hours,
 *     coordinates: { lat, lng }, ...
 *   }
 *   engineState.report = {
 *     overall_risk_score, overall_risk_label, executive_summary,
 *     investment_verdict, estimated_land_value_context,
 *     sections: [{ id, title, risk_level, body, estimated_foundation_cost_kes? }],
 *     key_flags: string[],
 *     cost_summary: {
 *       estimated_foundation_premium_kes, estimated_grid_connection_kes,
 *       title_search_cost_kes, recommended_survey_cost_kes,
 *       total_pre_purchase_due_diligence_kes
 *     },
 *     disclaimer: string
 *   }
 */

// ─── Risk level helpers ────────────────────────────────────────
function riskColor(score) {
  if (score >= 65) return { text: 'text-red-600',   bg: 'bg-red-50',    bar: 'bg-red-500' };
  if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50',  bar: 'bg-amber-500' };
  return               { text: 'text-emerald-600',  bg: 'bg-emerald-50', bar: 'bg-emerald-500' };
}

const SECTION_ICONS = {
  legal:          Shield,
  topography:     Mountain,
  environmental:  Droplets,
  infrastructure: Zap,
  zoning:         Building2,
  solar:          Sun,
  fraud_checklist: Shield,
  recommendation: ChevronRight,
};

const RISK_BADGE = {
  high:   'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low:    'bg-emerald-50 border-emerald-200 text-emerald-700',
  info:   'bg-blue-50 border-blue-200 text-blue-700',
};

function fmt(val, suffix = '') {
  if (val == null) return '—';
  return `${val}${suffix}`;
}

function fmtKes(val) {
  if (val == null || val === 0) return '—';
  return `KES ${Number(val).toLocaleString()}`;
}

// ─── Section Card ──────────────────────────────────────────────
function SectionCard({ section, index }) {
  const Icon = SECTION_ICONS[section.id] ?? Activity;
  const badgeClass = RISK_BADGE[section.risk_level] ?? RISK_BADGE.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className="bg-white rounded-2xl border border-terra-border p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-terra-body" />
          </div>
          <h3 className="font-bold text-terra-heading text-sm">{section.title}</h3>
        </div>
        <span className={clsx('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border', badgeClass)}>
          {section.risk_level}
        </span>
      </div>
      <p className="text-sm text-terra-body leading-relaxed">{section.body}</p>
      {section.estimated_foundation_cost_kes > 0 && (
        <p className="mt-2 text-xs font-semibold text-terra-heading">
          Est. Foundation Premium: {fmtKes(section.estimated_foundation_cost_kes)}
        </p>
      )}
      {section.estimated_grid_connection_cost_kes > 0 && (
        <p className="mt-2 text-xs font-semibold text-terra-heading">
          Est. Grid Connection: {fmtKes(section.estimated_grid_connection_cost_kes)}
        </p>
      )}
    </motion.div>
  );
}

// ─── Cost Breakdown Component (Bulletproof Math) ──────────────────────────
// Totals are ALWAYS computed from the rendered line items.
// It is mathematically impossible for a hidden cost to exist in the total.
function CostBreakdown({ costSum, payload }) {
  const { dueDiligence, development, totalDueDiligence, totalDevelopment, grandTotal } = useMemo(() => {
    const s = (val, fallback = 0) =>
      typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : fallback;

    // ─ Due Diligence (pre-purchase mandatory costs) ─────────────────────────
    const dueDiligence = [
      { label: 'Ardhisasa Title Search', amount: s(costSum.title_search_cost_kes, 500),
        note: 'Fixed government fee — ardhisasa.go.ke' },
      { label: 'Beacon Survey (ISK Surveyor)', amount: s(costSum.recommended_survey_cost_kes, 25000),
        note: 'Confirm beacons match title dimensions' },
      { label: 'Legal Conveyancing Fees', amount: s(costSum.legal_fees_kes, 15000),
        note: '1–2% of purchase price, min KES 10,000' },
      ...(s(costSum.valuation_report_kes) > 0
        ? [{ label: 'Valuation Report', amount: s(costSum.valuation_report_kes),
             note: 'Required if using mortgage financing' }]
        : []),
    ];
    const totalDueDiligence = dueDiligence.reduce((sum, item) => sum + item.amount, 0);

    // ─ Development Costs (construction phase) ──────────────────────────────
    const development = [
      ...(s(costSum.estimated_foundation_premium_kes) > 0
        ? [{ label: 'Foundation Premium', amount: s(costSum.estimated_foundation_premium_kes),
             note: 'Slope/soil condition premium above standard cost' }]
        : []),
      ...(s(costSum.estimated_grid_connection_kes) > 0
        ? [{ label: 'KPLC Grid Connection', amount: s(costSum.estimated_grid_connection_kes),
             note: 'Service connection + LV extension if applicable' }]
        : []),
    ];
    const totalDevelopment = development.reduce((sum, item) => sum + item.amount, 0);
    const grandTotal = totalDueDiligence + totalDevelopment;

    return { dueDiligence, development, totalDueDiligence, totalDevelopment, grandTotal };
  }, [costSum]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-white border border-terra-border rounded-2xl p-6 mb-6"
    >
      <h2 className="text-base font-black text-terra-heading mb-5 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-500" /> Estimated Cost Breakdown
      </h2>
      <div className="grid md:grid-cols-2 gap-6">

        {/* ─ Due Diligence ───────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-terra-muted uppercase tracking-widest mb-3">Pre-Purchase Due Diligence</p>
          <div className="space-y-0">
            {dueDiligence.map(({ label, amount, note }) => (
              <div key={label} className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0 gap-3">
                <div>
                  <p className="text-sm text-terra-body">{label}</p>
                  {note && <p className="text-[11px] text-terra-muted mt-0.5">{note}</p>}
                </div>
                <span className="text-sm font-bold text-terra-heading whitespace-nowrap">{fmtKes(amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-terra-heading">
            <span className="text-sm font-black text-terra-heading">Total Due Diligence</span>
            <span className="text-sm font-black text-terra-heading">{fmtKes(totalDueDiligence)}</span>
          </div>
        </div>

        {/* ─ Development Costs ────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-terra-muted uppercase tracking-widest mb-3">Development Cost Flags</p>
          {development.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700">No major infrastructure cost flags detected for this zone.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {development.map(({ label, amount, note }) => (
                <div key={label} className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0 gap-3">
                  <div>
                    <p className="text-sm text-terra-body">{label}</p>
                    {note && <p className="text-[11px] text-terra-muted mt-0.5">{note}</p>}
                  </div>
                  <span className="text-sm font-bold text-terra-heading whitespace-nowrap">{fmtKes(amount)}</span>
                </div>
              ))}
            </div>
          )}
          {totalDevelopment > 0 && (
            <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-terra-heading">
              <span className="text-sm font-black text-terra-heading">Total Development</span>
              <span className="text-sm font-black text-terra-heading">{fmtKes(totalDevelopment)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grand Total */}
      <div className="mt-5 pt-4 border-t border-slate-200 bg-slate-50 rounded-xl px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-sm font-black text-terra-heading">Combined Estimate</p>
          <p className="text-[11px] text-terra-muted">Due diligence + known infrastructure costs</p>
        </div>
        <span className="text-xl font-black text-emerald-600">{fmtKes(grandTotal)}</span>
      </div>
    </motion.div>
  );
}

// ─── Stat Block ────────────────────────────────────────────────
function StatBlock({ icon: Icon, label, value, highlight }) {
  return (
    <div className={clsx('bg-white rounded-2xl border p-4 flex flex-col gap-1', highlight ? 'border-amber-200' : 'border-terra-border')}>
      <div className="flex items-center gap-2 text-terra-muted mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-black text-terra-heading">{value}</p>
    </div>
  );
}

export default function Report() {
  const navigate = useNavigate();
  const { engineState } = useTerraStore();

  // No data yet
  if (engineState.status !== 'done' || !engineState.payload) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <MapPin className="w-16 h-16 text-slate-200" />
          <div className="text-center">
            <h2 className="text-2xl font-black text-terra-heading mb-2">No Analysis Yet</h2>
            <p className="text-terra-body mb-6">Run a spatial analysis first to generate your report.</p>
            <Button variant="primary" onClick={() => navigate('/analyze')}>Go to Analysis</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const payload  = engineState.payload;
  const report   = engineState.report ?? {};
  const coords   = payload.coordinates ?? {};

  // From report (Gemini structured output)
  const score    = typeof report.overall_risk_score === 'number' ? report.overall_risk_score : 0;
  const label    = String(report.overall_risk_label ?? '—');
  const rawSummary = String(report.executive_summary ?? '');
  // Detect fallback report (Gemini API failure) — don't dump raw JSON
  const isFallback = rawSummary.startsWith('Basic report only');
  const summary  = isFallback
    ? 'Gemini AI synthesis is temporarily unavailable. The risk score and geospatial data below are computed directly from satellite and mapping APIs and remain fully accurate.'
    : rawSummary || 'Analysis complete.';
  const verdict  = report.investment_verdict ? String(report.investment_verdict) : null;
  const sections = Array.isArray(report.sections) ? report.sections : [];
  const flags    = Array.isArray(report.key_flags) ? report.key_flags.map(String) : [];
  const costSum  = report.cost_summary ?? {};
  const disclaimer = report.disclaimer ? String(report.disclaimer) : null;
  const landValue  = (!isFallback && report.estimated_land_value_context)
    ? String(report.estimated_land_value_context) : null;

  // From payload (raw geo data)
  const { text: scoreText, bar: scoreBar } = riskColor(score);

  const place    = [payload.place_name, payload.ward, payload.county].filter(Boolean).join(', ') || '—';
  const elevation = fmt(payload.elevation_m, 'm');
  const slope     = fmt(payload.slope_percent, '%');
  const floodStr  = payload.flood_history ? 'Yes — Detected' : payload.flood_history === false ? 'Clear' : '—';
  const waterDist = payload.nearest_waterway_m != null ? `${payload.nearest_waterway_m}m` : '—';
  const roadDist  = payload.nearest_road_m     != null ? `${payload.nearest_road_m}m`     : '—';
  const gridDist  = payload.distance_to_grid_m != null ? `${payload.distance_to_grid_m}m` : '—';
  const airportKm = payload.nearest_airport_km != null ? `${payload.nearest_airport_km}km` : '—';
  const ndvi      = payload.ndvi_interpretation ?? payload.land_cover_label ?? '—';
  const moisture  = payload.soil_moisture != null ? `${payload.soil_moisture}` : '—';
  const sunshine  = payload.annual_sunshine_hours != null ? `${payload.annual_sunshine_hours} hrs/yr` : '~2007 hrs/yr';
  const hospital  = payload.nearest_hospital_km != null ? `${payload.nearest_hospital_km}km` : '—';
  const school    = payload.nearest_school_km   != null ? `${payload.nearest_school_km}km`   : '—';

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/analyze')} className="text-terra-muted hover:text-terra-heading transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-terra-heading">Risk Assessment Report</h1>
              {place !== '—' && (
                <div className="flex items-center gap-1.5 text-terra-muted text-sm mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{place}</span>
                  {coords.lat && <span className="font-mono text-xs ml-1">({coords.lat?.toFixed(5)}, {coords.lng?.toFixed(5)})</span>}
                </div>
              )}
            </div>
          </div>
          <PDFDownloadLink
            document={<TerraReportDocument payload={payload} report={report} coordinates={coords} />}
            fileName={`terra-ai-report-${Date.now()}.pdf`}
          >
            {({ loading }) => (
              <Button variant="primary" size="md" icon={Download} loading={loading}>
                {loading ? 'Generating PDF…' : 'Download Full PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>

        {/* ── Score Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-terra-border shadow-md p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-end gap-4">
              <div className="flex items-end gap-2">
                <span className={clsx('text-7xl font-black leading-none', scoreText)}>{score}</span>
                <span className="text-terra-muted text-2xl mb-2">/100</span>
              </div>
              <div className="mb-1">
                <span className={clsx('text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border',
                  score >= 65 ? 'bg-red-50 border-red-200 text-red-700'
                  : score >= 40 ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700')}>
                  {label}
                </span>
              </div>
            </div>
            {/* Score bar */}
            <div className="flex-1 max-w-xs">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={clsx('h-full rounded-full', scoreBar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
              {verdict && <p className="text-xs text-terra-body font-semibold mt-2">{verdict}</p>}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-terra-muted uppercase tracking-widest mb-2">Executive Summary</p>
            {isFallback && (
              <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Gemini synthesis unavailable — data-only report</span>
              </div>
            )}
            <p className="text-terra-body text-sm leading-relaxed">{summary}</p>
            {landValue && <p className="text-xs text-terra-muted mt-2">{landValue}</p>}
          </div>
        </motion.div>

        {/* ── Key Flags ── */}
        {flags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6"
          >
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Key Risk Flags ({flags.length})
            </p>
            <div className="space-y-2">
              {flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-amber-900 leading-snug">{flag}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Raw Geo Stats Grid ── */}
        <div className="mb-6">
          <h2 className="text-base font-black text-terra-heading mb-4">Satellite &amp; Mapping Data</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatBlock icon={Mountain}  label="Elevation"     value={elevation} />
            <StatBlock icon={Mountain}  label="Slope"         value={slope} highlight={parseFloat(payload.slope_percent) >= 12} />
            <StatBlock icon={Droplets}  label="Flood Risk"    value={floodStr} highlight={payload.flood_history} />
            <StatBlock icon={Droplets}  label="Water Dist"    value={waterDist} highlight={payload.riparian_breach} />
            <StatBlock icon={Activity}  label="Road Dist"     value={roadDist} />
            <StatBlock icon={Zap}       label="Grid Dist"     value={gridDist} />
            <StatBlock icon={Shield}    label="Airport"       value={airportKm} highlight={payload.aviation_risk} />
            <StatBlock icon={Building2} label="Hospital"      value={hospital} />
            <StatBlock icon={Building2} label="School"        value={school} />
            {payload.nearest_market_km != null && (
              <StatBlock icon={Building2} label="Market"      value={`${payload.nearest_market_km}km`} />
            )}
            <StatBlock icon={TreePine}  label="Vegetation"    value={ndvi} />
            <StatBlock icon={Droplets}  label="Soil Moisture" value={moisture} />
            <StatBlock icon={Sun}       label="Sunshine"      value={sunshine} />
            {payload.land_cover_label && (
              <StatBlock icon={TreePine} label="Land Cover"   value={String(payload.land_cover_label)} />
            )}
            {payload.ndvi_score != null && (
              <StatBlock icon={Activity} label="NDVI Score"   value={`${payload.ndvi_score}`} highlight={payload.ndvi_score < 0.1} />
            )}
            <StatBlock icon={Shield} label="Riparian"
              value={payload.riparian_breach ? '⚠ Breach' : 'Clear'}
              highlight={payload.riparian_breach} />
            <StatBlock icon={Shield} label="Protected Land"
              value={payload.protected_land_risk ? '⚠ Risk' : 'Clear'}
              highlight={payload.protected_land_risk} />
            {payload.landuse_zone && payload.landuse_zone !== 'Not mapped' && (
              <StatBlock icon={Building2} label="Land Use" value={String(payload.landuse_zone)} />
            )}
            {payload._zone_tier_label && (
              <StatBlock icon={MapPin} label="Zone Tier"
                value={String(payload._zone_tier_label).replace('Tier 1 (Hyper-Urban)','Urban').replace('Tier 2 (Peri-Urban)','Peri-Urban').replace('Tier 3 (Rural)','Rural')} />
            )}
            {payload.water_connection_nearby != null && (
              <StatBlock icon={Droplets} label="Water Supply"
                value={payload.water_connection_nearby ? 'Nearby' : 'Not mapped'} />
            )}
          </div>
        </div>

        {/* ── Analysis Sections ── */}
        {sections.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-black text-terra-heading mb-4">Detailed Analysis</h2>
            <div className="grid md:grid-cols-2 gap-4">
            {sections
              .filter(s => typeof s.body === 'string' && s.body.length > 0)
              .map((section, i) => (
                <SectionCard key={section.id ?? i} section={section} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Cost Breakdown ── */}
        {Object.keys(costSum).length > 0 && (
          <CostBreakdown costSum={costSum} payload={payload} />
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <p className="text-xs text-terra-muted italic leading-relaxed border-t border-terra-border pt-4">
            ⚠ {disclaimer}
          </p>
        )}
      </div>

      <ChatAssistant />
    </MainLayout>
  );
}
