import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair } from 'lucide-react';
import useTerraStore from '../../store/useTerraStore';
import AnnotationPins from './AnnotationPins';

/**
 * CinematicScanner — updated to pass image dimensions to AnnotationPins
 * so the SVG overlay can correctly map engine box_xyxy coordinates
 * (which are in image-pixel space) to the rendered image space.
 */
export default function CinematicScanner() {
  const { visionState } = useTerraStore();
  const { uploadedImageBlob, scanStatus, annotations, rawVisionPayload } = visionState;
  const imgRef = useRef(null);
  const [imgDims, setImgDims] = React.useState({ width: 0, height: 0 });

  // Capture the natural dimensions once the image loads
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  if (!uploadedImageBlob) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
      {/* ── Base Image ── */}
      <img
        ref={imgRef}
        src={uploadedImageBlob}
        alt="Land scan"
        onLoad={handleImageLoad}
        className="w-full max-h-[520px] object-contain"
        draggable={false}
      />

      {/* ── Scanning Overlay ── */}
      <AnimatePresence>
        {scanStatus === 'scanning' && (
          <motion.div
            key="scanner-overlay"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-900/20" />

            {/* Glowing scan line */}
            <motion.div
              className="absolute left-0 right-0 h-[3px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, #10B981, #34D399, #10B981, transparent)',
                boxShadow: '0 0 18px 6px rgba(16,185,129,0.55)',
              }}
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
            />

            {/* Corner brackets */}
            {[
              { pos: 'top-3 left-3', borderTop: true, borderLeft: true },
              { pos: 'top-3 right-3', borderTop: true, borderRight: true },
              { pos: 'bottom-3 left-3', borderBottom: true, borderLeft: true },
              { pos: 'bottom-3 right-3', borderBottom: true, borderRight: true },
            ].map(({ pos, borderTop, borderLeft, borderRight, borderBottom }) => (
              <div
                key={pos}
                className={`absolute ${pos} w-6 h-6`}
                style={{
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: 'transparent',
                  ...(borderTop    && { borderTopColor: '#10B981' }),
                  ...(borderLeft   && { borderLeftColor: '#10B981' }),
                  ...(borderRight  && { borderRightColor: '#10B981' }),
                  ...(borderBottom && { borderBottomColor: '#10B981' }),
                }}
              />
            ))}

            {/* Status badge */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold tracking-widest uppercase">Scanning</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Annotation Pins (complete state) ── */}
      <AnimatePresence>
        {scanStatus === 'complete' && annotations.length > 0 && (
          <AnnotationPins
            annotations={annotations}
            imageWidth={imgDims.width}
            imageHeight={imgDims.height}
          />
        )}
      </AnimatePresence>

      {/* ── Complete badge ── */}
      <AnimatePresence>
        {scanStatus === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600/90 backdrop-blur-sm px-4 py-1.5 rounded-full pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-white text-xs font-semibold tracking-widest uppercase">
              Scan Complete · {annotations.length} detected
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
