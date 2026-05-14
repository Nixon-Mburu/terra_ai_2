import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import useTerraStore from '../../store/useTerraStore';

/**
 * Uploader — drag-and-drop image uploader.
 * CRITICAL: Stores BOTH the base64 preview URL (for CinematicScanner display)
 * AND the raw File object (for FormData submission to /api/vision/analyze).
 * The vision API requires multipart/form-data with an `image` file field.
 */
export default function Uploader({ onUploaded }) {
  const { setUploadedImage } = useTerraStore();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const processFile = useCallback(
    (file) => {
      setError(null);
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('Image too large. Maximum size is 20MB.');
        return;
      }

      // Generate preview URL via FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setPreview(dataUrl);
        setFileName(file.name);
        // Store both dataUrl (preview) AND the raw File object (for FormData)
        setUploadedImage(dataUrl, file.name, file);
        onUploaded?.(dataUrl, file.name, file);
      };
      reader.readAsDataURL(file);
    },
    [setUploadedImage, onUploaded]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleChange = (e) => processFile(e.target.files?.[0]);

  const clearImage = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-50"
          >
            <img
              src={preview}
              alt="Uploaded land image"
              className="w-full max-h-80 object-contain"
            />
            <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-terra-body">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium truncate max-w-[200px]">{fileName}</span>
              </div>
              <button
                onClick={clearImage}
                className="flex items-center gap-1.5 text-xs text-terra-muted hover:text-red-500 transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" /> Change
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              'flex flex-col items-center justify-center gap-4',
              'border-2 border-dashed rounded-2xl py-16 px-8',
              'cursor-pointer transition-all duration-200',
              dragging
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40'
            )}
          >
            <motion.div
              animate={{ scale: dragging ? 1.12 : 1 }}
              className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md"
            >
              {dragging
                ? <ImageIcon className="w-7 h-7 text-emerald-500" />
                : <UploadCloud className="w-7 h-7 text-slate-400" />}
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-terra-heading">
                {dragging ? 'Drop your image here' : 'Upload a land photo'}
              </p>
              <p className="text-xs text-terra-muted mt-1">
                Drag & drop or click to browse · JPG, PNG, WEBP · Max 20MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-2 text-xs text-red-500 font-medium flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        id="terra-image-uploader"
      />
    </div>
  );
}
