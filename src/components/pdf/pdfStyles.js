// src/components/pdf/pdfStyles.js
// Shared design system for all PDF section components
//
// FONT STRATEGY: Use built-in Helvetica (zero network requests, CORS-safe).
// react-pdf bundles Helvetica, Helvetica-Bold, Helvetica-Oblique, Helvetica-BoldOblique.
// NO Font.register() needed — these work offline and in web workers.
import { StyleSheet } from '@react-pdf/renderer';

// ─── Color Tokens ─────────────────────────────────────────────
export const COLORS = {
  slate900:   '#0f172a',
  slate700:   '#334155',
  slate600:   '#475569',
  slate400:   '#94a3b8',
  slate200:   '#e2e8f0',
  slate100:   '#f1f5f9',
  slate50:    '#f8fafc',
  emerald600: '#059669',
  emerald500: '#10b981',
  emerald100: '#d1fae5',
  emerald50:  '#f0fdf4',
  indigo600:  '#4f46e5',
  indigo100:  '#e0e7ff',
  amber600:   '#d97706',
  amber500:   '#f59e0b',
  amber50:    '#fffbeb',
  red600:     '#dc2626',
  red500:     '#ef4444',
  red50:      '#fef2f2',
  white:      '#ffffff',
};

export function riskColors(score) {
  if (score >= 65) return { fg: COLORS.red600,     bg: COLORS.red50,     bar: COLORS.red500 };
  if (score >= 40) return { fg: COLORS.amber600,   bg: COLORS.amber50,   bar: COLORS.amber500 };
  return               { fg: COLORS.emerald600, bg: COLORS.emerald50, bar: COLORS.emerald500 };
}

export function sectionRiskColor(risk_level) {
  switch (risk_level) {
    case 'high':   return { fg: COLORS.red600,     bg: COLORS.red50     };
    case 'medium': return { fg: COLORS.amber600,   bg: COLORS.amber50   };
    case 'low':    return { fg: COLORS.emerald600, bg: COLORS.emerald50 };
    default:       return { fg: COLORS.indigo600,  bg: COLORS.indigo100 };
  }
}

export function fmt(val, suffix = '') {
  if (val == null || val === '') return '—';
  return String(val) + suffix;
}

export function fmtKes(val) {
  if (val == null || val === 0) return '—';
  return 'KES ' + Number(val).toLocaleString();
}

// ─── Shared Stylesheet ────────────────────────────────────────
// All fontFamily references use Helvetica (built-in, no download).
// For bold: Helvetica-Bold
// For italic: Helvetica-Oblique (avoid — use normal weight instead)
export const S = StyleSheet.create({
  // Page
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.slate50,
    padding: 0,
  },

  // Page header bar (dark)
  pageHeader: {
    backgroundColor: COLORS.slate900,
    paddingHorizontal: 36,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.emerald500,
    borderRadius: 3,
  },
  brandName: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerRight: {
    color: COLORS.slate400,
    fontSize: 7,
    textAlign: 'right',
  },

  // Body
  body: {
    padding: 36,
    flex: 1,
  },

  // Section title
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
    marginVertical: 18,
  },

  // Data card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 14,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate900,
    lineHeight: 1.1,
  },
  cardSub: {
    fontSize: 8,
    color: COLORS.slate600,
    marginTop: 3,
    lineHeight: 1.5,
  },

  // Grid
  grid2: { flexDirection: 'row', gap: 12 },
  grid3: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },

  // Body text
  bodyText: {
    fontSize: 9.5,
    color: COLORS.slate600,
    lineHeight: 1.7,
  },

  // Flag item (amber warning)
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.amber50,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  flagBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber500,
    marginTop: 3,
    marginRight: 8,
    flexShrink: 0,
  },
  flagText: {
    fontSize: 8.5,
    color: '#78350f',
    lineHeight: 1.6,
    flex: 1,
  },

  // Good item (green positive)
  goodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emerald50,
    borderWidth: 1,
    borderColor: COLORS.emerald100,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  goodBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald500,
    marginRight: 8,
    flexShrink: 0,
  },
  goodText: {
    fontSize: 8.5,
    color: '#065f46',
    lineHeight: 1.6,
    flex: 1,
  },

  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: COLORS.slate400,
  },
  pageNum: {
    fontSize: 7,
    color: COLORS.slate400,
    fontFamily: 'Helvetica-Bold',
  },
});
