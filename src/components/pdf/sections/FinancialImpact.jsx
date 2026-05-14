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
  const slope   = payload?.slope_percent;
  const gridDist = payload?.distance_to_grid_m;
  const waterDist = payload?.nearest_waterway_m;
  const roadDist  = payload?.nearest_road_m;

  // Derive hidden cost insights
  const slopeFlag  = slope != null && slope >= 12;
  const gridFar    = gridDist != null && gridDist >= 400;
  const waterFar   = waterDist != null && waterDist >= 100;
  const roadFar    = roadDist  != null && roadDist  >= 500;

  const hiddenCosts = [
    slopeFlag && `High slope (${slope}%) + ${gridFar ? 'distance to grid' : 'terrain works'} = estimated 15–25% site-prep premium on standard build cost.`,
    gridFar   && `Power grid is ${gridDist}m away — KPLC connection at ~KES 1,000/m = approx. ${fmtKes(gridDist * 1000)}.`,
    waterFar  && `Nearest waterway is ${waterDist}m — water supply likely requires borehole (est. KES 150,000–500,000).`,
    roadFar   && `Access road is ${roadDist}m away — earth road formation at ~KES 4,500/m = approx. ${fmtKes(roadDist * 4500)}.`,
  ].filter(Boolean);

  const totalEstimate = (costSum.total_pre_purchase_due_diligence_kes ?? 0)
    + (costSum.estimated_foundation_premium_kes ?? 0)
    + (costSum.estimated_grid_connection_kes ?? 0);

  return (
    <Page size="A4" style={S.page}>
      <PageHeader date={date} />
      <View style={S.body}>
        <Text style={S.sectionLabel}>Financial Feasibility & Development Cost Index</Text>

        {/* Land value context */}
        {report?.estimated_land_value_context && (
          <View style={[S.card, { marginBottom: 16, backgroundColor: COLORS.slate900, borderColor: COLORS.slate900 }]}>
            <Text style={[S.cardLabel, { color: COLORS.slate400 }]}>Market Context (AI Assessment)</Text>
            <Text style={[S.bodyText, { color: COLORS.white, lineHeight: 1.7 }]}>{String(report.estimated_land_value_context)}</Text>
          </View>
        )}

        <View style={S.grid2}>
          {/* Cost breakdown */}
          <View style={S.col}>
            <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Known Cost Estimates</Text>
            <CostLine label="Foundation Premium"      value={costSum.estimated_foundation_premium_kes} note="If slope ≥ 12% — retaining walls" />
            <CostLine label="KPLC Grid Connection"    value={costSum.estimated_grid_connection_kes}    note="Based on distance to nearest line" />
            <CostLine label="Title Search Fee"        value={costSum.title_search_cost_kes}            note="Ministry of Lands — mandatory" />
            <CostLine label="Physical Survey"         value={costSum.recommended_survey_cost_kes}      note="Beacon verification + report" />
            <CostLine
              label="TOTAL Pre-Purchase Due Diligence"
              value={costSum.total_pre_purchase_due_diligence_kes}
              highlight
              note="Minimum before any offer"
            />
          </View>

          {/* Hidden cost insights */}
          <View style={S.col}>
            <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Hidden Cost Flags</Text>
            {hiddenCosts.length === 0 ? (
              <View style={S.goodItem}>
                <View style={S.goodBullet} />
                <Text style={S.goodText}>No major hidden cost flags detected. Standard development costs apply.</Text>
              </View>
            ) : (
              hiddenCosts.map((item, i) => (
                <View key={i} style={S.flagItem}>
                  <View style={S.flagBullet} />
                  <Text style={S.flagText}>{item}</Text>
                </View>
              ))
            )}

            {/* Aggregate estimate */}
            {totalEstimate > 0 && (
              <View style={[S.card, { marginTop: 10, backgroundColor: COLORS.slate900, borderColor: COLORS.slate900 }]}>
                <Text style={[S.cardLabel, { color: COLORS.slate400 }]}>Combined Estimate</Text>
                <Text style={[S.cardValue, { color: COLORS.emerald500 }]}>{fmtKes(totalEstimate)}</Text>
                <Text style={[S.cardSub, { color: COLORS.slate400 }]}>Pre-purchase + known infrastructure costs</Text>
              </View>
            )}
          </View>
        </View>

        <View style={S.divider} />
        <Text style={[S.bodyText, { color: COLORS.slate400 }]}>
          All cost estimates are approximate heuristics derived from public infrastructure distance data.
          Actual costs depend on contractor rates, ground conditions, and KPLC/water utility pricing at time of connection.
          Terra AI accepts no liability for decisions made solely on the basis of these estimates.
        </Text>
      </View>
      <PageFooter n={8} />
    </Page>
  );
}
