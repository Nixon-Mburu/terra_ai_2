import React from 'react';
import { Document } from '@react-pdf/renderer';
import CoverPage from './sections/CoverPage';
import ExecutiveBrief from './sections/ExecutiveBrief';
import TopographySection from './sections/TopographySection';
import InfrastructureSection from './sections/InfrastructureSection';
import LegalConstraints from './sections/LegalConstraints';
import FinancialImpact from './sections/FinancialImpact';
import DisclaimerPage from './sections/DisclaimerPage';

/**
 * TerraReportDocument — Premium 8-Page Enterprise PDF Dossier
 *
 * Modular architecture: each section is a standalone component.
 * Page layout:
 *   Page 1  — CoverPage (brand, score, metadata)
 *   Page 2  — ExecutiveBrief: Gemini summary + score bar
 *   Page 3  — ExecutiveBrief: Red flags vs Green flags
 *   Page 4  — TopographySection: Terrain, slope, meters
 *   Page 5  — TopographySection: Environmental, flood, soil
 *   Page 6  — InfrastructureSection: Utilities, amenities, solar
 *   Page 7  — LegalConstraints: Riparian, aviation, zoning
 *   Page 8  — FinancialImpact: Cost index + hidden costs
 *   Page 9  — DisclaimerPage: Methodology + legal
 *
 * Props:
 *   payload     — raw engine geo data object
 *   report      — Gemini structured report object
 *   coordinates — { lat, lng }
 */
export default function TerraReportDocument({ payload = {}, report = {}, coordinates = {} }) {
  const date = new Date().toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document
      title="Terra AI Land Risk Report"
      author="Terra AI"
      subject="Geospatial Land Risk Assessment — Kenya"
      keywords="land risk, Nairobi, geospatial, Terra AI"
    >
      {/* Page 1: Cover */}
      <CoverPage
        payload={payload}
        report={report}
        coordinates={coordinates}
        date={date}
      />

      {/* Pages 2–3: Executive Brief + Flags */}
      <ExecutiveBrief
        payload={payload}
        report={report}
        date={date}
      />

      {/* Pages 4–5: Topography + Environmental */}
      <TopographySection
        payload={payload}
        report={report}
        date={date}
      />

      {/* Page 6: Infrastructure, Amenities, Solar */}
      <InfrastructureSection
        payload={payload}
        report={report}
        date={date}
      />

      {/* Page 7: Legal Constraints */}
      <LegalConstraints
        payload={payload}
        report={report}
        date={date}
      />

      {/* Page 8: Financial Impact */}
      <FinancialImpact
        payload={payload}
        report={report}
        date={date}
      />

      {/* Page 9: Methodology & Disclaimers */}
      <DisclaimerPage
        report={report}
        date={date}
      />
    </Document>
  );
}
