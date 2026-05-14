import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/**
 * MainLayout — persistent shell for all authenticated/app pages.
 * Structure: [Sidebar | [TopBar / Main Stage]]
 * Uses CSS flexbox — sidebar drives its own width via framer-motion,
 * main area grows to fill the remaining space.
 */
export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-terra-bg">
      {/* ── Sidebar (self-sizing via framer-motion) ── */}
      <Sidebar />

      {/* ── Right Column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        {/* ── Main Stage ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
