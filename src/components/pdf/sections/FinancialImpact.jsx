import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { S, COLORS, fmtKes } from '../pdfStyles';

function PageHeader({ date }) {
  return (
    <View style={S.pageHeader}>
      <View style={S.brandRow}><View style={S.brandDot} /><Text style={S.brandName}>Terra AI · Financial Feasibility Analysis</Text></View>
      <Text style={S.headerRight}>{date}</Text>
    </View>
  );
}
function PageFooter({ n }) {
  return (
    <View style={S.pageFooter} fixed>
      <Text style={S.footerText}>Terra AI — Confidential</Text>
      <Text style={S.pageNum}>{n} / 8</Text>
    </View>
  );
}

function CostLine({ label, value, note, highlight }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: highlight ? COLORS.amber500 : COLORS.slate200,
      backgroundColor: highlight ? '#fffbeb' : 'transparent',
      paddingHorizontal: highlight ? 8 : 0,
      borderRadius: highlight ? 6 : 0,
      marginBottom: highlight ? 2 : 0,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontFamily: highlight ? 'Helvetica-Bold' : 'Helvetica', color: COLORS.slate900 }}>{label}</Text>
        {note && <Text style={{ fontSize: 7.5, color: COLORS.slate400, marginTop: 2 }}>{note}</Text>}
      </View>
      <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: highlight ? COLORS.amber600 : COLORS.slate900, marginLeft: 16 }}>
        {fmtKes(value)}
      </Text>
    </View>
  );
}
export default function FinancialImpact({ payload, report, date }) {
  const costSum = report?.cost_summary ?? {};

  const safe = (val, fallback = 0) =>
    typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : fallback;

  // ─ Due Diligence (pre-purchase mandatory costs) ───────────────────────
  const dueDiligence = [
    { label: 'Ardhisasa Title Search', value: safe(costSum.title_search_cost_kes, 500),
      note: 'Fixed government fee — ardhisasa.go.ke' },
    { label: 'Beacon Survey (ISK Surveyor)', value: safe(costSum.recommended_survey_cost_kes, 25000),
      note: 'Confirm beacons match title dimensions' },
    { label: 'Legal Conveyancing Fees', value: safe(costSum.legal_fees_kes, 15000),
      note: '1–2% of purchase price, min KES 10,000' },
    ...(safe(costSum.valuation_report_kes) > 0
      ? [{ label: 'Valuation Report', value: safe(costSum.valuation_report_kes),
           note: 'Required for mortgage financing' }]
      : []),
  ];
  const totalDueDiligence = dueDiligence.reduce((sum, item) => sum + item.value, 0);

  // ─ Development Costs ──────────────────────────────────────────────
  const development = [
    ...(safe(costSum.estimated_foundation_premium_kes) > 0
      ? [{ label: 'Foundation Premium', value: safe(costSum.estimated_foundation_premium_kes),
           note: 'Slope/soil condition premium above standard build cost' }]
      : []),
    ...(safe(costSum.estimated_grid_connection_kes) > 0
      ? [{ label: 'KPLC Grid Connection', value: safe(costSum.estimated_grid_connection_kes),
           note: 'Service connection + LV extension if applicable' }]
      : []),
  ];
  const totalDevelopment = development.reduce((sum, item) => sum + item.value, 0);
  const grandTotal = totalDueDiligence + totalDevelopment;

  return (
    <Page size="A4" style={S.page}>
      <PageHeader date={date} />
      <View style={S.body}>
        <Text style={S.sectionLabel}>Financial Feasibility &amp; Development Cost Index</Text>

        {/* Land value context */}
        {report?.estimated_land_value_context && (
          <View style={[S.card, { marginBottom: 16, backgroundColor: COLORS.slate900, borderColor: COLORS.slate900 }]}>
            <Text style={[S.cardLabel, { color: COLORS.slate400 }]}>Market Context (AI Assessment)</Text>
            <Text style={[S.bodyText, { color: COLORS.white, lineHeight: 1.7 }]}>{String(report.estimated_land_value_context)}</Text>
          </View>
        )}

        <View style={S.grid2}>
          {/* Pre-Purchase Due Diligence */}
          <View style={S.col}>
            <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Pre-Purchase Due Diligence</Text>
            {dueDiligence.map(({ label, value, note }) => (
              <CostLine key={label} label={label} value={value} note={note} />
            ))}
            <CostLine
              label="TOTAL Pre-Purchase Due Diligence"
              value={totalDueDiligence}
              highlight
              note="Minimum before making any offer"
            />
          </View>

          {/* Development Cost Flags */}
          <View style={S.col}>
            <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Development Cost Flags</Text>
            {development.length === 0 ? (
              <View style={S.goodItem}>
                <View style={S.goodBullet} />
                <Text style={S.goodText}>No major infrastructure cost flags. Standard municipal services expected for this zone.</Text>
              </View>
            ) : (
              development.map(({ label, value, note }) => (
                <CostLine key={label} label={label} value={value} note={note} />
              ))
            )}

            {/* Grand total */}
            {grandTotal > 0 && (
              <View style={[S.card, { marginTop: 10, backgroundColor: COLORS.slate900, borderColor: COLORS.slate900 }]}>
                <Text style={[S.cardLabel, { color: COLORS.slate400 }]}>Combined Estimate</Text>
                <Text style={[S.cardValue, { color: COLORS.emerald500 }]}>{fmtKes(grandTotal)}</Text>
                <Text style={[S.cardSub, { color: COLORS.slate400 }]}>Due diligence + known infrastructure costs</Text>
              </View>
            )}
          </View>
        </View>

        <View style={S.divider} />
        <Text style={[S.bodyText, { color: COLORS.slate400 }]}>
          All cost estimates are approximate heuristics derived from public infrastructure distance data and known Kenyan market rates.
          Actual costs depend on contractor rates, ground conditions, and KPLC/NCWSC utility pricing at time of connection.
          Terra AI accepts no liability for decisions made solely on the basis of these estimates.
        </Text>
      </View>
      <PageFooter n={8} />
    </Page>
  );
}
