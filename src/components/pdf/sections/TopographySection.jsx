import React from 'react';
import { Page, View, Text, StyleSheet, Svg, Rect } from '@react-pdf/renderer';
import { S, COLORS, fmt } from '../pdfStyles';

function PageHeader({ date }) {
  return (
    <View style={S.pageHeader}>
      <View style={S.brandRow}><View style={S.brandDot} /><Text style={S.brandName}>Terra AI · Topography & Environmental Analysis</Text></View>
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

function MeterBar({ label, value, max, color, unit, warning }) {
  const pct = Math.min((value / max) * 220, 220);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 8.5, color: COLORS.slate600 }}>{label}</Text>
        <Text style={{ fontSize: 8.5, fontFamily: warning ? 'Helvetica-Bold' : 'Helvetica', color: warning ? COLORS.red600 : COLORS.slate900 }}>
          {value != null ? `${value}${unit}` : '—'}
          {warning ? '  ⚠' : ''}
        </Text>
      </View>
      <Svg width="220" height="8">
        <Rect x="0" y="0" width="220" height="8" rx="4" fill={COLORS.slate100} />
        {value != null && <Rect x="0" y="0" width={pct} height="8" rx="4" fill={color} />}
      </Svg>
    </View>
  );
}

function DataCard({ label, value, sub }) {
  return (
    <View style={S.card}>
      <Text style={S.cardLabel}>{label}</Text>
      <Text style={S.cardValue}>{value}</Text>
      {sub && <Text style={S.cardSub}>{sub}</Text>}
    </View>
  );
}

export default function TopographySection({ payload, report, date }) {
  const elevation    = payload?.elevation_m     ?? null;
  const slope        = payload?.slope_percent   ?? null;
  const floodHistory = payload?.flood_history   ?? null;
  const seasonalWater = payload?.seasonal_water ?? null;
  const wetlandRisk  = payload?.wetland_risk    ?? null;
  const ndvi         = payload?.ndvi_score      ?? null;
  const ndviInterp   = String(payload?.ndvi_interpretation ?? payload?.land_cover_label ?? 'Not classified');
  const soilMoisture = payload?.soil_moisture   ?? null;
  const highMoisture = payload?.high_moisture_risk ?? false;
  const aspect       = payload?.aspect_degrees  ?? null;

  const sections      = Array.isArray(report?.sections) ? report.sections : [];
  const topoSection   = sections.find((s) => s.id === 'topography') ?? null;
  const envSection    = sections.find((s) => s.id === 'environmental') ?? null;

  const slopeWarning = slope != null && slope >= 12;

  return (
    <>
      {/* Page 4: Terrain */}
      <Page size="A4" style={S.page}>
        <PageHeader date={date} />
        <View style={S.body}>
          <Text style={S.sectionLabel}>Terrain & Slope Analysis</Text>
          <View style={S.grid2}>
            <View style={S.col}>
              <DataCard
                label="Elevation Above Sea Level"
                value={elevation != null ? `${elevation}m` : '—'}
                sub="Sourced via Google Maps Elevation API"
              />
              <DataCard
                label="Terrain Slope"
                value={slope != null ? `${slope}%` : '—'}
                sub={slopeWarning ? '⚠ Exceeds 12% — Engineering works likely needed' : 'Within standard construction limits'}
              />
              {aspect != null && (
                <DataCard
                  label="Aspect (Slope Direction)"
                  value={`${aspect}°`}
                  sub="Solar orientation and drainage direction indicator"
                />
              )}
            </View>
            <View style={S.col}>
              <Text style={[S.sectionLabel, { marginBottom: 10 }]}>Visual Meters</Text>
              <MeterBar label="Elevation" value={elevation} max={2200} color={COLORS.indigo600} unit="m" />
              <MeterBar label="Slope %" value={slope} max={30} color={slopeWarning ? COLORS.red500 : COLORS.emerald500} unit="%" warning={slopeWarning} />
              {ndvi != null && <MeterBar label="NDVI Vegetation Index" value={Math.round(ndvi * 100)} max={100} color={COLORS.emerald600} unit="" />}
            </View>
          </View>

          {topoSection && (
            <>
              <View style={S.divider} />
              <Text style={[S.sectionLabel, { marginBottom: 8 }]}>AI Terrain Assessment</Text>
              <Text style={S.bodyText}>{String(topoSection.body ?? '')}</Text>
            </>
          )}

          {slopeWarning && (
            <View style={[S.flagItem, { marginTop: 12 }]}>
              <View style={S.flagBullet} />
              <Text style={S.flagText}>
                Slope of {slope}% exceeds the 12% construction threshold. Retaining walls, cut-and-fill operations,
                or specialised foundations will likely be required. Estimated additional cost: KES 500,000 – 2,000,000.
              </Text>
            </View>
          )}
        </View>
        <PageFooter n={4} />
      </Page>

      {/* Page 5: Environmental */}
      <Page size="A4" style={S.page}>
        <PageHeader date={date} />
        <View style={S.body}>
          <Text style={S.sectionLabel}>Environmental & Flood Risk</Text>
          <View style={S.grid3}>
            <DataCard
              label="Flood History"
              value={floodHistory === true ? 'DETECTED' : floodHistory === false ? 'Clear' : '—'}
              sub="JRC / GEE historical flood dataset"
            />
            <DataCard
              label="Seasonal Water"
              value={seasonalWater === true ? 'Yes' : seasonalWater === false ? 'No' : '—'}
              sub="Seasonal surface water presence"
            />
            <DataCard
              label="Wetland Risk"
              value={wetlandRisk === true ? 'Flagged' : wetlandRisk === false ? 'Clear' : '—'}
              sub="GEE land cover wetland class"
            />
          </View>

          <View style={S.divider} />

          <View style={S.grid2}>
            <View style={S.col}>
              <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Soil & Moisture</Text>
              <DataCard
                label="Soil Moisture Index"
                value={soilMoisture != null ? soilMoisture.toString() : '—'}
                sub={highMoisture ? '⚠ High moisture — drainage system likely required' : 'Normal moisture levels'}
              />
              <DataCard
                label="Vegetation Cover (NDVI)"
                value={ndvi != null ? ndvi.toFixed(3) : '—'}
                sub={ndviInterp}
              />
            </View>
            <View style={S.col}>
              <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Risk Indicators</Text>
              {[
                { label: 'Flood History',     val: floodHistory },
                { label: 'Seasonal Water',    val: seasonalWater },
                { label: 'Wetland Risk',      val: wetlandRisk },
                { label: 'High Soil Moisture',val: highMoisture },
              ].map(({ label, val }) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.slate200 }}>
                  <Text style={{ fontSize: 8.5, color: COLORS.slate600 }}>{label}</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: val ? COLORS.red600 : COLORS.emerald600 }}>
                    {val === true ? '⚠ Yes' : val === false ? '✓ No' : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {envSection && (
            <>
              <View style={S.divider} />
              <Text style={[S.sectionLabel, { marginBottom: 8 }]}>AI Environmental Assessment</Text>
              <Text style={S.bodyText}>{String(envSection.body ?? '')}</Text>
            </>
          )}
        </View>
        <PageFooter n={5} />
      </Page>
    </>
  );
}
