import React from 'react';
import { Page, View, Text, StyleSheet, Svg, Rect } from '@react-pdf/renderer';
import { S, COLORS, fmt, fmtKes } from '../pdfStyles';

function PageHeader({ date }) {
  return (
    <View style={S.pageHeader}>
      <View style={S.brandRow}><View style={S.brandDot} /><Text style={S.brandName}>Terra AI · Infrastructure Analysis</Text></View>
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

function ProximityBar({ label, valueM, warningThreshold, maxM = 2000 }) {
  const pct   = valueM != null ? Math.min((valueM / maxM) * 200, 200) : 0;
  const warn  = valueM != null && valueM >= warningThreshold;
  const color = warn ? COLORS.red500 : valueM != null && valueM < warningThreshold * 0.5 ? COLORS.emerald500 : COLORS.amber500;
  const severity = warn ? 'HIGH COST' : valueM != null ? 'MODERATE' : '—';
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate700 }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 }}>
            {valueM != null ? `${valueM}m` : '—'}
          </Text>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: warn ? COLORS.red50 : COLORS.amber50, borderRadius: 4 }}>
            {severity}
          </Text>
        </View>
      </View>
      <Svg width="200" height="8">
        <Rect x="0" y="0" width="200" height="8" rx="4" fill={COLORS.slate100} />
        {valueM != null && <Rect x="0" y="0" width={pct} height="8" rx="4" fill={color} />}
      </Svg>
      <Text style={{ fontSize: 7, color: COLORS.slate400, marginTop: 3 }}>
        {warn ? `⚠ Distance exceeds threshold — connection costs likely elevated` : valueM != null ? 'Within serviceable range' : 'Data unavailable'}
      </Text>
    </View>
  );
}

function AmenityRow({ label, km }) {
  const rating = km == null ? '—' : km < 1 ? 'Excellent' : km < 3 ? 'Good' : km < 8 ? 'Fair' : 'Remote';
  const ratingColor = km == null ? COLORS.slate400 : km < 1 ? COLORS.emerald600 : km < 3 ? COLORS.emerald500 : km < 8 ? COLORS.amber600 : COLORS.red600;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.slate200 }}>
      <Text style={{ fontSize: 9, color: COLORS.slate600 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 }}>
          {km != null ? `${km} km` : '—'}
        </Text>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: ratingColor }}>{rating}</Text>
      </View>
    </View>
  );
}

export default function InfrastructureSection({ payload, report, date }) {
  const waterDist = payload?.nearest_waterway_m;
  const roadDist  = payload?.nearest_road_m;
  const gridDist  = payload?.distance_to_grid_m;
  const solar     = payload?.annual_sunshine_hours;
  const maxPanels = payload?.max_panels;
  const solarAvail = payload?.solar_available;

  const hospital = payload?.nearest_hospital_km;
  const school   = payload?.nearest_school_km;
  const police   = payload?.nearest_police_km;
  const market   = payload?.nearest_market_km;

  const sections     = Array.isArray(report?.sections) ? report.sections : [];
  const infraSection = sections.find((s) => s.id === 'infrastructure') ?? null;
  const solarSection = sections.find((s) => s.id === 'solar')          ?? null;
  const costSum      = report?.cost_summary ?? {};

  return (
    <Page size="A4" style={S.page}>
      <PageHeader date={date} />
      <View style={S.body}>
        <Text style={S.sectionLabel}>Infrastructure & Utility Proximity</Text>

        <View style={S.grid2}>
          {/* Left: Distance bars */}
          <View style={S.col}>
            <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Utility Distances</Text>
            <ProximityBar label="Nearest Waterway" valueM={waterDist} warningThreshold={30} maxM={500} />
            <ProximityBar label="Nearest Road" valueM={roadDist} warningThreshold={500} maxM={2000} />
            <ProximityBar label="Power Grid (KPLC)" valueM={gridDist} warningThreshold={400} maxM={2000} />
          </View>

          {/* Right: Cost estimates */}
          <View style={S.col}>
            <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Estimated Connection Costs</Text>
            {[
              { label: 'Grid Connection (KPLC)',   val: costSum.estimated_grid_connection_kes,    note: `${gridDist ?? '?'}m to nearest line` },
              { label: 'Foundation Premium',        val: costSum.estimated_foundation_premium_kes, note: 'If slope ≥ 12%' },
              { label: 'Title Search',              val: costSum.title_search_cost_kes,            note: 'Mandatory legal check' },
              { label: 'Physical Survey',           val: costSum.recommended_survey_cost_kes,      note: 'Surveyor + beacons' },
              { label: 'Total Due Diligence',       val: costSum.total_pre_purchase_due_diligence_kes, note: 'Minimum recommended' },
            ].map(({ label, val, note }) => (
              <View key={label} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.slate200 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 8.5, color: COLORS.slate600 }}>{label}</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 }}>{fmtKes(val)}</Text>
                </View>
                <Text style={{ fontSize: 7, color: COLORS.slate400, marginTop: 1 }}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.divider} />

        {/* Amenities */}
        <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Proximity Matrix — Social Amenities</Text>
        <AmenityRow label="Nearest Hospital / Clinic" km={hospital} />
        <AmenityRow label="Nearest School" km={school} />
        <AmenityRow label="Nearest Police Station" km={police} />
        <AmenityRow label="Nearest Market / Shopping" km={market} />

        <View style={S.divider} />

        {/* Solar */}
        <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Solar Energy Potential</Text>
        <View style={S.grid2}>
          <View style={S.card}>
            <Text style={S.cardLabel}>Annual Sunshine Hours</Text>
            <Text style={S.cardValue}>{solar != null ? solar : 2007}</Text>
            <Text style={S.cardSub}>{solarAvail ? 'Google Solar API data' : 'Kenya equatorial estimate (5.5 h/day)'}</Text>
          </View>
          {maxPanels != null && (
            <View style={S.card}>
              <Text style={S.cardLabel}>Max Solar Panels (Rooftop)</Text>
              <Text style={S.cardValue}>{maxPanels}</Text>
              <Text style={S.cardSub}>Google Solar API building insight</Text>
            </View>
          )}
        </View>

        {(infraSection || solarSection) && (
          <Text style={[S.bodyText, { marginTop: 8 }]}>
            {infraSection ? String(infraSection.body ?? '') : ''}
            {infraSection && solarSection ? ' ' : ''}
            {solarSection ? String(solarSection.body ?? '') : ''}
          </Text>
        )}
      </View>
      <PageFooter n={6} />
    </Page>
  );
}
