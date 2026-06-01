/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Undo, 
  Trash2, 
  Download, 
  Copy, 
  Sun, 
  Moon, 
  Check, 
  AlertCircle,
  FileSignature,
  FlipHorizontal,
  SquareDashed,
  Eye,
  X
} from 'lucide-react';
import { Stroke } from './types';
import SignatureCanvas, { INK_COLORS } from './components/SignatureCanvas';
import { getCroppedCanvas } from './utils/canvas';

const PEN_SIZES = [
  { id: 'thin' as const, width: 3, label: 'Thin', dotClass: 'w-1 h-1' },
  { id: 'medium' as const, width: 6, label: 'Medium', dotClass: 'w-2 h-2' },
  { id: 'thick' as const, width: 10, label: 'Thick', dotClass: 'w-3.5 h-3.5' },
];

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export default function App() {
  // Theme state persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('signity_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Signature States
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColorId, setCurrentColorId] = useState<'black' | 'navy' | 'red'>('black');
  const [currentWidth, setCurrentWidth] = useState<number>(6); // Default: Medium (6px)
  const [highPrecision, setHighPrecision] = useState<boolean>(false);
  const [includeBorder, setIncludeBorder] = useState<boolean>(false);

  // Overlay Preview Modal States
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Feedback State
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  });

  const [copied, setCopied] = useState(false);

  // Apply dark class to body element for Tailwind selectors
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('signity_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('signity_theme', 'light');
    }
  }, [isDark]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({
      message,
      type,
      visible: true,
    });
  };

  // Auto-hide toast notification after 4 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Undo standard list splice
  const handleUndo = () => {
    if (strokes.length === 0) return;
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Clear whiteboard
  const handleClear = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    showToast('Signature board cleared.', 'info');
  };

  // Horizontally flip the signature strokes relative to the canvas container width
  const handleFlipHorizontal = () => {
    if (strokes.length === 0) return;

    const container = document.getElementById('signature-whiteboard-container');
    const width = container ? container.getBoundingClientRect().width : 800;

    const flipped = strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((pt) => ({
        ...pt,
        x: width - pt.x,
      })),
    }));

    setStrokes(flipped);
    showToast('Signature flipped horizontally!', 'success');
  };

  // Generate cropped high-resistance canvas snapshot & open overlay modal preview
  const handleOpenPreview = () => {
    if (strokes.length === 0) {
      showToast('Please sign the board to preview.', 'error');
      return;
    }

    // Map drawing strokes to professional opaque export colors
    const exportStrokes = strokes.map((stroke) => {
      const colorObj = INK_COLORS.find((c) => c.id === stroke.color);
      return {
        ...stroke,
        color: colorObj ? colorObj.exportColor : stroke.color,
      };
    });

    // Create high-res physical canvas (3x rendering for crisp boundaries)
    const renderCanvas = getCroppedCanvas(exportStrokes, 3, highPrecision, includeBorder);
    if (!renderCanvas) {
      showToast('Could not calculate crop margins. Try drawing a larger signature.', 'error');
      return;
    }

    try {
      const dataUrl = renderCanvas.toDataURL('image/png');
      setPreviewDataUrl(dataUrl);
      setPreviewDimensions({
        width: renderCanvas.width,
        height: renderCanvas.height
      });
      setIsPreviewOpen(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to generate preview snapshot.', 'error');
    }
  };

  // Export signature as cropped transparent high-resolution PNG
  const handleDownload = () => {
    if (strokes.length === 0) {
      showToast('Please sign the board before downloading.', 'error');
      return;
    }

    // Map drawing strokes to their professional opaque export colors
    const exportStrokes = strokes.map((stroke) => {
      const colorObj = INK_COLORS.find((c) => c.id === stroke.color);
      return {
        ...stroke,
        color: colorObj ? colorObj.exportColor : stroke.color,
      };
    });

    // Create high-res physical canvas (3x rendering for crisp boundaries)
    const renderCanvas = getCroppedCanvas(exportStrokes, 3, highPrecision, includeBorder);
    if (!renderCanvas) {
      showToast('Could not calculate crop margins. Try drawing a larger signature.', 'error');
      return;
    }

    try {
      const dataUrl = renderCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = 'signature.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      showToast('Cropped transparent PNG downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PNG image.', 'error');
    }
  };

  // Copy transparent PNG directly into student clipboard
  const handleCopy = () => {
    if (strokes.length === 0) {
      showToast('Please sign the board before copying.', 'error');
      return;
    }

    // Map strokes to professional export colors
    const exportStrokes = strokes.map((stroke) => {
      const colorObj = INK_COLORS.find((c) => c.id === stroke.color);
      return {
        ...stroke,
        color: colorObj ? colorObj.exportColor : stroke.color,
      };
    });

    const renderCanvas = getCroppedCanvas(exportStrokes, 3, highPrecision, includeBorder);
    if (!renderCanvas) {
      showToast('Could not calculate crop margins.', 'error');
      return;
    }

    try {
      renderCanvas.toBlob((blob) => {
        if (!blob) {
          showToast('Failed to process image buffer.', 'error');
          return;
        }

        // Modern browser clipboard writing
        if ('write' in navigator.clipboard) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            setCopied(true);
            showToast('Transparent PNG copied to clipboard!', 'success');
            setTimeout(() => setCopied(false), 3000);
          }).catch((err) => {
            console.error(err);
            // Help student understand standard iframe restrictions
            showToast('Permission blocked. Standard browser sandboxing restricts iframe security. Download the PNG instead!', 'error');
          });
        } else {
          showToast('Clipboard writing not supported by your browser. Use Download instead.', 'error');
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('Failed to copy. Try downloading the PNG directly.', 'error');
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#f0f9ff] dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900" 
      id="app-root-container"
    >
      {/* Toast Announcement */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-sm font-sans ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
            }`}
            id="global-toast-banner"
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : toast.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : null}
            <span className="font-medium leading-normal">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-[960px] mx-auto px-6 py-10 md:py-16 flex flex-col justify-center" id="main-content-layout">
        {/* Minimal Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8" id="main-header">
          <div className="flex flex-col" id="brand-logo-title-container">
            <h1 className="text-4xl font-extrabold text-[#2563eb] dark:text-blue-500 tracking-tight mb-1 font-display">
              Signity
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Draw your signature below and download it as a transparent PNG.
            </p>
          </div>
          
          <div 
            className="flex items-center gap-2 bg-white dark:bg-[#151f32] p-1 rounded-full border border-slate-200 dark:border-[#1e293b] shadow-xs self-start sm:self-auto" 
            id="theme-toggle-container"
          >
            <button
              onClick={() => setIsDark(false)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                !isDark 
                  ? 'bg-[#f0f9ff] text-[#2563eb] shadow-2xs font-semibold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Light mode"
              title="Light theme"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDark(true)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isDark 
                  ? 'bg-slate-800 text-blue-400 shadow-2xs font-semibold' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Dark mode"
              title="Dark theme"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Signature Whiteboard Component */}
        <section className="mb-8" id="signature-whiteboard-section">
          <SignatureCanvas
            strokes={strokes}
            setStrokes={setStrokes}
            currentColorId={currentColorId}
            currentWidth={currentWidth}
            isDark={isDark}
            highPrecision={highPrecision}
            includeBorder={includeBorder}
          />
        </section>

        {/* Beautiful Simple Control Bar */}
        <footer 
          className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-[#1e293b] p-6 rounded-[24px] shadow-[0_4px_20px_rgba(37,99,235,0.02)] transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          id="control-bar-dock"
        >
          {/* Controls Layout Top Part: Colors & Pen Sizes */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10" id="style-adjustments-grid">
            
            {/* Color circles panel */}
            <div className="flex flex-col gap-2.5" id="color-selectors-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                Ink Color
              </span>
              <div className="flex gap-2.5" id="ink-color-buttons">
                {INK_COLORS.map((color) => {
                  const isActive = currentColorId === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => {
                        setCurrentColorId(color.id);
                        showToast(`Switched ink to ${color.name}.`, 'info');
                      }}
                      className={`w-8 h-8 rounded-full transition-all active:scale-90 ${
                        isActive 
                          ? 'border-4 border-[#2563eb] dark:border-blue-500 ring-2 ring-[#2563eb] dark:ring-blue-500 scale-105 shadow-xs' 
                          : 'border-4 border-slate-100 dark:border-[#1e293b] ring-2 ring-transparent hover:ring-[#2563eb] dark:hover:ring-blue-500'
                      }`}
                      style={{ backgroundColor: isDark ? color.darkColor : color.lightColor }}
                      aria-label={`Select ${color.name} color`}
                      id={`color-btn-${color.id}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Pen Line Weight Panel */}
            <div className="flex flex-col gap-2.5" id="pen-size-selectors-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                Pen Weight
              </span>
              <div className="flex gap-4 items-center h-8" id="pen-size-buttons">
                {PEN_SIZES.map((size) => {
                  const isActive = currentWidth === size.width;
                  return (
                    <button
                      key={size.id}
                      onClick={() => {
                        setCurrentWidth(size.width);
                        showToast(`Selected ${size.label} brush thickness.`, 'info');
                      }}
                      className={`rounded-full transition-all active:scale-95 cursor-pointer ${
                        isActive
                          ? 'bg-[#2563eb] dark:bg-blue-500 scale-125 shadow-xs'
                          : 'bg-slate-300 dark:bg-slate-600 hover:bg-[#2563eb] dark:hover:bg-blue-500'
                      }`}
                      style={{
                        width: `${size.width * 1.5 + 4}px`,
                        height: `${size.width * 1.5 + 4}px`,
                      }}
                      title={`Select ${size.label} weight`}
                      aria-label={`Select ${size.label} weight`}
                      id={`size-btn-${size.id}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* High Precision Mode Toggle */}
            <div className="flex flex-col gap-2.5" id="precision-toggle-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                Smoothing Mode
              </span>
              <div className="flex items-center h-8" id="precision-toggle-button-container">
                <button
                  onClick={() => {
                    const nextVal = !highPrecision;
                    setHighPrecision(nextVal);
                    showToast(
                      nextVal
                        ? 'High Precision smoothing enabled! Curves will look highly streamlined.'
                        : 'Standard precision drawing enabled.',
                      'info'
                    );
                  }}
                  className={`h-8 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    highPrecision
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563eb] dark:border-blue-500 text-[#2563eb] dark:text-blue-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/80'
                  }`}
                  id="high-precision-mode-toggle"
                  title="Toggle High Precision bezier curve smoothing"
                >
                  <div className={`w-2 h-2 rounded-full ${highPrecision ? 'bg-[#2563eb] dark:bg-blue-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span>High Precision</span>
                </button>
              </div>
            </div>

            {/* Outline Border Toggle */}
            <div className="flex flex-col gap-2.5" id="border-toggle-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                Canvas Border
              </span>
              <div className="flex items-center h-8" id="border-toggle-button-container">
                <button
                  onClick={() => {
                    const nextVal = !includeBorder;
                    setIncludeBorder(nextVal);
                    showToast(
                      nextVal
                        ? 'Subtle boundary frame enabled for the exported signature!'
                        : 'Canvas outline border disabled.',
                      'info'
                    );
                  }}
                  className={`h-8 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    includeBorder
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563eb] dark:border-blue-500 text-[#2563eb] dark:text-blue-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/80'
                  }`}
                  id="include-border-mode-toggle"
                  title="Toggle subtle border around signature crop group"
                >
                  <SquareDashed className={`w-3.5 h-3.5 ${includeBorder ? 'text-[#2563eb] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>Outline Frame</span>
                </button>
              </div>
            </div>

          </div>

          {/* Controls Layout Bottom Part: Quick Operations & Exports */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end" id="actions-group-container">
            
            {/* Quick Operations (Undo / Flip / Clear) */}
            <div className="flex items-center gap-2" id="historical-modifications">
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                title="Undo last stroke"
                id="undo-operation-button"
              >
                <Undo className="w-4 h-4" />
              </button>

              <button
                onClick={handleFlipHorizontal}
                disabled={strokes.length === 0}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                title="Flip signature horizontally"
                id="flip-horizontal-button"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleClear}
                disabled={strokes.length === 0}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center text-rose-600 dark:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 shadow-2xs cursor-pointer"
                title="Clear whiteboard canvas"
                id="clear-all-button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            {/* Ultimate Exports: Preview, Copy & Download */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial" id="export-actions">
              <button
                onClick={handleOpenPreview}
                disabled={strokes.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex-1 sm:flex-initial justify-center cursor-pointer shadow-2xs"
                title="Preview high-resolution cropped signature"
                id="preview-trigger-button"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={strokes.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex-1 sm:flex-initial justify-center"
                id="copy-clipboard-button"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500 animate-pulse" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={strokes.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-[0_8px_16px_rgba(37,99,235,0.15)] dark:shadow-[0_8px_16px_rgba(0,0,0,0.3)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex-1 sm:flex-initial justify-center"
                id="primary-download-button"
              >
                <Download className="w-4.5 h-4.5" />
                <span>Download PNG</span>
              </button>
            </div>

          </div>

        </footer>
      </main>

      <footer className="w-full text-center py-6 text-xs text-slate-400 dark:text-slate-600 font-sans tracking-wide mt-auto" id="application-credits">
        <p>Signity &bull; Student Signature Whiteboard &bull; Clean PNG Export</p>
      </footer>

      {/* Signature Preview Overlay Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="signature-preview-modal-system">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm cursor-pointer"
              id="preview-modal-backdrop"
            />

            {/* Modal Canvas Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col z-10"
              id="preview-modal-container"
            >
              {/* Header block with meta and status */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800" id="preview-modal-header">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-display">
                    Signature Preview
                  </h3>
                  <p className="text-[11px] text-[#2563eb] dark:text-blue-400 font-bold font-mono tracking-wide mt-0.5">
                    TRANSPARENT PNG &bull; {previewDimensions.width} &times; {previewDimensions.height} px
                  </p>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                  aria-label="Close preview modal"
                  id="preview-modal-close-icon"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Body: Checkered background representations */}
              <div className="p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0f1d] border-b border-slate-100 dark:border-slate-800" id="preview-modal-body">
                <div 
                  className="relative w-full h-[220px] rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
                      linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
                      linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
                    `,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                    backgroundColor: isDark ? '#111a2e' : '#ffffff'
                  }}
                  id="transparent-checkerboard-wrapper"
                >
                  {isDark && (
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                      backgroundImage: `
                        linear-gradient(45deg, #ffffff 25%, transparent 25%), 
                        linear-gradient(-45deg, #ffffff 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #ffffff 75%), 
                        linear-gradient(-45deg, transparent 75%, #ffffff 75%)
                      `,
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                    }} />
                  )}

                  <img 
                    src={previewDataUrl} 
                    alt="Signature preview representation" 
                    className="max-w-[85%] max-h-[85%] object-contain drop-shadow-sm select-none pointer-events-none"
                    id="preview-rendered-img"
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center mt-3 leading-relaxed">
                  The checkered background represents transparency. Your exported cropped signature will contain a transparent, alpha-channel background layer.
                </p>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-[#111a2e]" id="preview-modal-footer">
                <button
                  onClick={() => {
                    handleCopy();
                  }}
                  className="flex items-center gap-2 justify-center px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all flex-1 active:scale-95 cursor-pointer"
                  id="preview-modal-action-copy"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500 animate-pulse" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copied ? 'Copied!' : 'Copy PNG'}</span>
                </button>

                <button
                  onClick={() => {
                    handleDownload();
                    setIsPreviewOpen(false);
                  }}
                  className="flex items-center gap-2 justify-center px-4 py-3 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex-1 active:scale-95 cursor-pointer"
                  id="preview-modal-action-download"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
