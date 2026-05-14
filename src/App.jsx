import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Pricing from './pages/Pricing';
import Report from './pages/Report';

/**
 * App.jsx — Router Configuration
 * Route map mirrors the blueprint user flow:
 *   /           → Home (landing)
 *   /analyze    → Analyze (Vision vs Map split)
 *   /pricing    → Pricing (SaaS tiers)
 *   /report     → Report (web view before PDF download)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/analyze"  element={<Analyze />} />
        <Route path="/pricing"  element={<Pricing />} />
        <Route path="/report"   element={<Report />} />
        {/* Catch-all → home */}
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
