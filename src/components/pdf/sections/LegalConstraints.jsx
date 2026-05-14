import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { S, COLORS } from '../pdfStyles';

function PageHeader({ date }) {
  return (
    <View style={S.pageHeader}>
      <View style={S.brandRow}>
        <View style={S.brandDot} />
        <Text style={S.brandName}>Terra AI · Legal & Zoning Constraints</Text>
      </View>
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

// ── Safe string builder helpers (NO nested template literals) ──
function riparianDesc(triggered, waterway) {
  const dist = waterway != null ? String(waterway) + 'm away' : 'data unavailable';
  if (triggered) {
    return 'Plot may be within 30m of a waterway (' + dist + '). Construction within this buffer is prohibited under EMCA Cap 387.';
  }
  return 'No riparian encroachment detected. Nearest waterway: ' + dist + '. Plot appears outside the legally protected 30m buffer.';
}

function aviationDesc(triggered, airport) {
  const dist = airport != null ? String(airport) + 'km' : 'data unavailable';
  if (triggered) {
    return 'Plot is within a flight path zone. Nearest airport: ' + dist + '. Height limits may apply under KCAA regulations — verify before multi-storey construction.';
  }
  return 'No aviation height restriction flagged. Nearest airport: ' + dist + '. Standard building height rules apply.';
}

function cliffDesc(meters) {
  const dist = String(meters) + 'm';
  if (meters < 50) {
    return 'Nearest cliff or escarpment: ' + dist + '. Proximity may create structural and safety risks.';
  }
  return 'Nearest cliff or escarpment: ' + dist + '. Distance appears adequate.';
}

// ── Risk Row Component ──────────────────────────────────────────
function RiskRow({ label, triggered, description }) {
  // Ensure description is always a plain string for PDF Text node
  const safeDesc = typeof description === 'string' ? description : String(description ?? '');
  const isTriggered = Boolean(triggered);

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.slate200,
      gap: 12,
    }}>
      <View style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isTriggered ? COLORS.red50 : COLORS.emerald50,
        borderWidth: 1,
        borderColor: isTriggered ? '#fca5a5' : COLORS.emerald100,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
      }}>
        <Text style={{ fontSize: 10, color: isTriggered ? COLORS.red600 : COLORS.emerald600, fontFamily: 'Helvetica-Bold' }}>
          {isTriggered ? 'X' : 'OK'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 }}>
            {String(label)}
          </Text>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: isTriggered ? COLORS.red600 : COLORS.emerald600 }}>
            {isTriggered ? 'FLAGGED' : 'CLEAR'}
          </Text>
        </View>
        <Text style={{ fontSize: 8.5, color: COLORS.slate600, lineHeight: 1.6 }}>
          {safeDesc}
        </Text>
      </View>
    </View>
  );
}

export default function LegalConstraints({ payload, report, date }) {
  // Safely extract all values with explicit null checks
  const riparianBreach  = payload?.riparian_breach    ?? false;
  const roadReserve     = payload?.road_reserve_risk  ?? false;
  const protectedLand   = payload?.protected_land_risk ?? false;
  const aviationRisk    = payload?.aviation_risk       ?? false;
  const nearestWaterway = payload?.nearest_waterway_m  ?? null;
  const nearestAirport  = payload?.nearest_airport_km  ?? null;
  const landuse         = String(payload?.landuse_zone ?? 'Not mapped');
  const nearestCliff    = payload?.nearest_cliff_m     ?? null;

  // Safely extract sections — guard against non-array
  const sections = Array.isArray(report?.sections) ? report.sections : [];
  const legalSection  = sections.find((s) => s.id === 'legal')          ?? null;
  const zoningSection = sections.find((s) => s.id === 'zoning')         ?? null;
  const fraudSection  = sections.find((s) => s.id === 'fraud_checklist') ?? null;
  const nextSection   = sections.find((s) => s.id === 'recommendation') ?? null;

  return (
    <Page size="A4" style={S.page}>
      <PageHeader date={date} />
      <View style={S.body}>
        <Text style={S.sectionLabel}>Legal, Zoning & Regulatory Constraints</Text>

        <RiskRow
          label="Riparian Buffer Zone (30m)"
          triggered={riparianBreach}
          description={riparianDesc(riparianBreach, nearestWaterway)}
        />
        <RiskRow
          label="Road Reserve Encroachment"
          triggered={roadReserve}
          description={
            roadReserve
              ? 'Plot may overlap with a designated road reserve. Structures within road reserves risk demolition orders under the Kenya Roads Act.'
              : 'No road reserve overlap detected. The plot appears clear of the designated carriageway and road reserves.'
          }
        />
        <RiskRow
          label="Protected Land / Conservation Zone"
          triggered={protectedLand}
          description={
            protectedLand
              ? 'Land cover analysis or OSM boundary data suggests proximity to a protected or conservation area. Confirm with KWS and county government before any development.'
              : 'No protected land or conservation zone overlap detected via OSM boundaries and GEE land cover data.'
          }
        />
        <RiskRow
          label="Aviation Height Restriction (KCAA)"
          triggered={aviationRisk}
          description={aviationDesc(aviationRisk, nearestAirport)}
        />
        {nearestCliff != null && (
          <RiskRow
            label="Cliff / Escarpment Hazard"
            triggered={nearestCliff < 50}
            description={cliffDesc(nearestCliff)}
          />
        )}

        <View style={S.divider} />

        <View style={S.grid2}>
          <View style={S.col}>
            <View style={S.card}>
              <Text style={S.cardLabel}>OSM Land Use Zone</Text>
              <Text style={[S.cardValue, { fontSize: 14 }]}>{landuse}</Text>
              <Text style={S.cardSub}>From OpenStreetMap land-use layer</Text>
            </View>
            {zoningSection && (
              <Text style={S.bodyText}>{String(zoningSection.body ?? '')}</Text>
            )}
          </View>
          <View style={S.col}>
            {fraudSection && (
              <>
                <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Fraud Risk Checklist</Text>
                <Text style={[S.bodyText, { lineHeight: 1.9 }]}>{String(fraudSection.body ?? '')}</Text>
              </>
            )}
            {nextSection && (
              <>
                <View style={{ height: 10 }} />
                <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Recommended Next Steps</Text>
                <Text style={[S.bodyText, { lineHeight: 1.9 }]}>{String(nextSection.body ?? '')}</Text>
              </>
            )}
          </View>
        </View>

        {legalSection && (
          <>
            <View style={S.divider} />
            <Text style={[S.sectionLabel, { marginBottom: 6 }]}>AI Legal Assessment</Text>
            <Text style={S.bodyText}>{String(legalSection.body ?? '')}</Text>
          </>
        )}
      </View>
      <PageFooter n={7} />
    </Page>
  );
}
