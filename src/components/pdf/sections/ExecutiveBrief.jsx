import React from 'react';
import { Page, View, Text, StyleSheet, Svg, Rect } from '@react-pdf/renderer';
import { S, COLORS, riskColors, sectionRiskColor } from '../pdfStyles';

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 6 },
  scoreNum: { fontSize: 68, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  scoreOf: { fontSize: 20, color: COLORS.slate400, marginBottom: 10 },
  verdictBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  verdictText: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  summaryText: { fontSize: 10, color: COLORS.slate600, lineHeight: 1.75, marginBottom: 4 },
  landValueText: { fontSize: 9, color: COLORS.slate400, lineHeight: 1.6 },
  flagsTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 9, marginBottom: 7 },
  flagBullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.amber500, marginTop: 4, marginRight: 8, flexShrink: 0 },
  flagText: { fontSize: 8.5, color: '#78350f', lineHeight: 1.6, flex: 1 },
  greenRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.emerald50, borderWidth: 1, borderColor: COLORS.emerald100, borderRadius: 8, padding: 9, marginBottom: 7 },
  greenBullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.emerald500, marginTop: 4, marginRight: 8, flexShrink: 0 },
  greenText: { fontSize: 8.5, color: '#065f46', lineHeight: 1.6, flex: 1 },
});

function PageHeader({ date }) {
  return (
    <View style={S.pageHeader}>
      <View style={S.brandRow}>
        <View style={S.brandDot} />
        <Text style={S.brandName}>Terra AI · Land Intelligence Report</Text>
      </View>
      <Text style={S.headerRight}>{date}</Text>
    </View>
  );
}

function PageFooter({ pageNum }) {
  return (
    <View style={S.pageFooter} fixed>
      <Text style={S.footerText}>Terra AI — Confidential</Text>
      <Text style={S.pageNum}>{pageNum} / 8</Text>
    </View>
  );
}

// Derive green flags from payload (genuine positives)
function getGreenFlags(payload) {
  const flags = [];
  if (payload?.flood_history === false)          flags.push('No flood history detected at this coordinate.');
  if (payload?.riparian_breach === false)         flags.push('Plot appears outside the 30m riparian buffer zone.');
  if (payload?.aviation_risk === false)           flags.push('No aviation height restrictions flagged for this area.');
  if (payload?.protected_land_risk === false)     flags.push('No protected land or conservation zone overlap detected.');
  if (payload?.road_reserve_risk === false)       flags.push('No road reserve encroachment flagged.');
  if ((payload?.solar_available || payload?.annual_sunshine_hours > 1800))
    flags.push(`Strong solar resource: ~${payload?.annual_sunshine_hours ?? 2007} sunshine hours/year.`);
  if (payload?.water_connection_nearby)          flags.push('Water connection point detected within serviceable range.');
  return flags.slice(0, 4);
}

export default function ExecutiveBrief({ payload, report, date }) {
  const score   = typeof report?.overall_risk_score === 'number' ? report.overall_risk_score : 0;
  const label   = String(report?.overall_risk_label  ?? '—');
  const summary = String(report?.executive_summary   ?? 'Analysis complete.');
  const verdict = report?.investment_verdict ? String(report.investment_verdict) : null;
  const flags   = Array.isArray(report?.key_flags) ? report.key_flags.map(String) : [];
  const landVal = report?.estimated_land_value_context ? String(report.estimated_land_value_context) : null;
  const { fg, bar } = riskColors(score);
  const greenFlags = getGreenFlags(payload);

  const verdictBg = score >= 65 ? COLORS.red50 : score >= 40 ? '#fffbeb' : COLORS.emerald50;
  const verdictFg = score >= 65 ? COLORS.red600 : score >= 40 ? COLORS.amber600 : COLORS.emerald600;

  return (
    <>
      {/* Page 2: Score + Summary */}
      <Page size="A4" style={S.page}>
        <PageHeader date={date} />
        <View style={S.body}>
          <Text style={S.sectionLabel}>Executive Brief</Text>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: fg }]}>{score}</Text>
            <Text style={styles.scoreOf}>/100</Text>
          </View>

          {/* Visual score bar */}
          <Svg width="300" height="10" style={{ marginBottom: 12 }}>
            <Rect x="0" y="0" width="300" height="10" rx="5" fill={COLORS.slate100} />
            <Rect x="0" y="0" width={score * 3} height="10" rx="5" fill={bar} />
          </Svg>

          {verdict && (
            <View style={[styles.verdictBadge, { backgroundColor: verdictBg }]}>
              <Text style={[styles.verdictText, { color: verdictFg }]}>{verdict}</Text>
            </View>
          )}

          <View style={S.divider} />

          <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Gemini AI Executive Summary</Text>
          <Text style={styles.summaryText}>{summary}</Text>
          {landVal && <Text style={styles.landValueText}>{landVal}</Text>}
        </View>
        <PageFooter pageNum={2} />
      </Page>

      {/* Page 3: Flags */}
      <Page size="A4" style={S.page}>
        <PageHeader date={date} />
        <View style={S.body}>
          <View style={S.grid2}>
            {/* Red flags */}
            <View style={S.col}>
              <Text style={[S.sectionLabel, { marginBottom: 10 }]}>⚠ Risk Flags ({flags.length})</Text>
              {flags.length === 0
                ? <Text style={styles.summaryText}>No critical flags identified.</Text>
                : flags.map((f, i) => (
                  <View key={i} style={styles.flagRow}>
                    <View style={styles.flagBullet} />
                    <Text style={styles.flagText}>{f}</Text>
                  </View>
                ))
              }
            </View>
            {/* Green flags */}
            <View style={S.col}>
              <Text style={[S.sectionLabel, { marginBottom: 10 }]}>✓ Positive Indicators</Text>
              {greenFlags.length === 0
                ? <Text style={styles.summaryText}>Insufficient data for positive indicators.</Text>
                : greenFlags.map((f, i) => (
                  <View key={i} style={styles.greenRow}>
                    <View style={styles.greenBullet} />
                    <Text style={styles.greenText}>{f}</Text>
                  </View>
                ))
              }
            </View>
          </View>
        </View>
        <PageFooter pageNum={3} />
      </Page>
    </>
  );
}
