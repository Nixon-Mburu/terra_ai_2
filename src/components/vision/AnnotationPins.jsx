import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { getAnnotationDescription } from '../../utils/annotation_descriptions';
import { getInstanceLabel, getInstanceConfidence, polygonToPath, MAX_VISIBLE_ANNOTATIONS } from '../../utils/analyzeUtils';
import { pickInstanceAtImagePoint } from '../../utils/click_inspector';

/**
 * AnnotationPins — Enhanced engine-aware annotation overlay.
 *
 * Uses the actual engine output schema:
 *   instance: { class_name, confidence, box_xyxy: [x1,y1,x2,y2], mask_polygon: [[x,y],...], source }
 *
 * Features:
 *  - SVG polygon overlays for segmentation masks (when available)
 *  - Bbox rectangles as fallback
 *  - Click-to-inspect via pickInstanceAtImagePoint from click_inspector.js
 *  - Rich descriptions from annotation_descriptions.js
 *  - Floating tooltip card on selected instance
 *  - Respects MAX_VISIBLE_ANNOTATIONS cap from analyzeUtils
 */

const SOURCE_COLORS = {
  yolo:    { stroke: '#f43f5e', fill: 'rgba(244,63,94,0.12)', dot: 'bg-rose-500', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
  semantic:{ stroke: '#4f46e5', fill: 'rgba(79,70,229,0.10)',  dot: 'bg-indigo-500',  badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  default: { stroke: '#64748b', fill: 'rgba(100,116,139,0.10)',dot: 'bg-slate-500',   badge: 'bg-slate-50 border-slate-200 text-slate-600' },
};

function getColors(instance) {
  const src = String(instance?.source || '').toLowerCase();
  return SOURCE_COLORS[src] ?? SOURCE_COLORS.default;
}

export default function AnnotationPins({ annotations = [], imageWidth = 0, imageHeight = 0 }) {
  const svgRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Cap at engine max
  const visible = annotations.slice(0, MAX_VISIBLE_ANNOTATIONS);

  // Click handler: use pickInstanceAtImagePoint for precision hit-testing
  const handleSvgClick = useCallback((e) => {
    if (!svgRef.current || !imageWidth || !imageHeight) return;
    const rect = svgRef.current.getBoundingClientRect();
    // Convert screen coords to image coords
    const scaleX = imageWidth / rect.width;
    const scaleY = imageHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hit = pickInstanceAtImagePoint({ instances: visible, x, y });
    if (hit) {
      // Tooltip position in % of container
      setTooltipPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
      setSelected(hit);
    } else {
      setSelected(null);
    }
  }, [visible, imageWidth, imageHeight]);

  if (!visible.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-auto">
      {/* ── SVG overlay for polygons + bboxes ── */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        viewBox={imageWidth && imageHeight ? `0 0 ${imageWidth} ${imageHeight}` : undefined}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
      >
        {visible.map((inst, i) => {
          const colors = getColors(inst);
          const label = getInstanceLabel(inst);
          const poly = inst?.mask_polygon;
          const box = inst?.box_xyxy;
          const isSelected = selected === inst;

          return (
            <g key={i}>
              {/* Segmentation polygon (preferred) */}
              {Array.isArray(poly) && poly.length >= 3 && (
                <path
                  d={polygonToPath(poly)}
                  fill={isSelected ? colors.fill.replace('0.12', '0.28') : colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeOpacity={isSelected ? 1 : 0.7}
                />
              )}

              {/* Bounding box fallback */}
              {!poly && Array.isArray(box) && box.length === 4 && (
                <rect
                  x={Math.min(box[0], box[2])}
                  y={Math.min(box[1], box[3])}
                  width={Math.abs(box[2] - box[0])}
                  height={Math.abs(box[3] - box[1])}
                  fill={isSelected ? colors.fill.replace('0.12', '0.22') : colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeOpacity={isSelected ? 1 : 0.6}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Floating annotation badges (top-N by confidence) ── */}
      {visible.slice(0, 12).map((inst, i) => {
        const box = inst?.box_xyxy;
        if (!Array.isArray(box) || !imageWidth || !imageHeight) return null;
        const cx = ((box[0] + box[2]) / 2 / imageWidth) * 100;
        const cy = (Math.min(box[1], box[3]) / imageHeight) * 100;
        const colors = getColors(inst);
        const label = getInstanceLabel(inst);
        const conf = getInstanceConfidence(inst);

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
            className="absolute pointer-events-none"
            style={{ left: `${cx}%`, top: `${Math.max(cy - 4, 2)}%`, transform: 'translate(-50%, -100%)' }}
          >
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap shadow-md backdrop-blur-sm bg-white/90 ${colors.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
              <span className="capitalize">{label}</span>
              {conf > 0 && <span className="opacity-60 font-normal">{Math.round(conf * 100)}%</span>}
            </div>
          </motion.div>
        );
      })}

      {/* ── Click-to-inspect tooltip ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-30 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: `${Math.min(tooltipPos.x, 60)}%`,
              top: `${Math.min(tooltipPos.y + 3, 70)}%`,
            }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 ${getColors(selected).badge}`}>
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-bold capitalize">{getInstanceLabel(selected)}</span>
                {getInstanceConfidence(selected) > 0 && (
                  <span className="text-xs opacity-70">{Math.round(getInstanceConfidence(selected) * 100)}%</span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                className="p-0.5 rounded hover:bg-black/10 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {/* Description */}
            <div className="px-3 py-2.5">
              <p className="text-xs text-terra-body leading-relaxed">
                {getAnnotationDescription(getInstanceLabel(selected))}
              </p>
            </div>
            {/* Source */}
            <div className="px-3 pb-2.5">
              <span className="text-[10px] text-terra-muted font-medium uppercase tracking-wider">
                Source: {selected?.source ?? 'vision model'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Annotation count badge ── */}
      <div className="absolute top-3 right-3 z-10 pointer-events-none">
        <div className="bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
          {visible.length} detection{visible.length !== 1 ? 's' : ''} · click to inspect
        </div>
      </div>
    </div>
  );
}
