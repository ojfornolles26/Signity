/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, MouseEvent } from 'react';
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
  Eye,
  X,
  ChevronDown
} from 'lucide-react';
import { Stroke } from './types';
import SignatureCanvas, { INK_COLORS } from './components/SignatureCanvas';
import { getCroppedCanvas } from './utils/canvas';

const PEN_SIZES = [
  { id: 'thin' as const, width: 3, label: 'Thin', dotClass: 'w-1 h-1' },
  { id: 'medium' as const, width: 6, label: 'Medium', dotClass: 'w-2 h-2' },
  { id: 'thick' as const, width: 10, label: 'Thick', dotClass: 'w-3.5 h-3.5' },
];

const FAQS = [
  {
    question: "How does Signity protect my privacy?",
    answer: "Your privacy is our top priority. Everything you draw stays entirely on your own device. Signity does not send, upload, or save your signature or drawing data to any remote servers. It is completely private and secure."
  },
  {
    question: "What file format is exported, and what is its resolution?",
    answer: "We save your signature as a transparent PNG image. This means it has no background color and will blend perfectly into white, gray, or colored documents. We also export it in high quality (ultra-high resolution) so it looks crisp and sharp, even if you print the document."
  },
  {
    question: "What is the difference between Standard and High Precision smoothing?",
    answer: "When drawing with a mouse or trackpad, your hand can naturally shake. Standard mode draws exactly what your cursor tracks. High Precision mode automatically smooths out those shaky movements, turning wobbly lines into elegant, professional-looking curves."
  },
  {
    question: "Is the signature cropped automatically?",
    answer: "Yes, automatically! The app detects the edges of your signature and cuts away all the empty space around it. You can draw anywhere on the whiteboard (top, bottom, or corner)—your final file will be perfectly cropped to fit your signature with a tiny bit of breathing room."
  },
  {
    question: "How do I attach my signature to a document?",
    answer: "There are two easy ways: (1) Download the signature as an image file and insert it into your document editor (like Word, Google Docs, or PDF readers). (2) Click Copy to save the signature image directly to your clipboard, then simply paste it (Ctrl+V on Windows or Cmd+V on Mac) straight into your document."
  }
];

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

export default function App() {
  // Theme state persistence (defaults to light mode for first-time visitors)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('signity_theme');
      if (saved) return saved === 'dark';
    }
    return false;
  });

  // Signature States
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColorId, setCurrentColorId] = useState<'black' | 'navy' | 'red'>('black');
  const [currentWidth, setCurrentWidth] = useState<number>(6); // Default: Medium (6px)
  const [highPrecision, setHighPrecision] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);

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
    const renderCanvas = getCroppedCanvas(exportStrokes, 3, highPrecision);
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
    const renderCanvas = getCroppedCanvas(exportStrokes, 3, highPrecision);
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

    const renderCanvas = getCroppedCanvas(exportStrokes, 3, highPrecision);
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
      className="min-h-screen bg-[#faf8f5] dark:bg-[#09090b] text-zinc-800 dark:text-zinc-100 transition-colors duration-300 flex flex-col font-sans selection:bg-indigo-100 dark:selection:bg-zinc-800" 
      id="app-root-container"
    >
      {/* Toast Announcement */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-xl border text-xs font-sans ${
              toast.type === 'success'
                ? 'bg-indigo-50 dark:bg-indigo-950/90 border-indigo-200/80 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-250'
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
                : 'bg-zinc-900 dark:bg-zinc-100 border-transparent text-zinc-100 dark:text-zinc-900'
            }`}
            id="global-toast-banner"
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : toast.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            ) : null}
            <span className="font-semibold leading-normal">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-[960px] mx-auto px-6 py-10 md:py-16 flex flex-col justify-center" id="main-content-layout">
        {/* Minimal Header */}
        <header className="flex flex-col gap-2.5 mb-8" id="main-header">
          <div className="flex items-center justify-between w-full" id="brand-logo-row">
            <div className="flex items-center gap-2.5" id="logo-brand-header">
              <svg 
                className="w-8 h-8 text-indigo-600 dark:text-indigo-400 stroke-current transition-colors duration-300 shrink-0"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M8 22 C10 14, 14 8, 18 8 C22 8, 24 12, 22 18 C20 24, 16 26, 12 24 C9 22.5, 11 17, 16 15 C21 13, 24 17, 26 21" 
                  strokeWidth="2.75" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <circle cx="26" cy="21" r="2" fill="currentColor" stroke="none" />
              </svg>
              <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50 tracking-tight transition-colors duration-300">
                Signity
              </h1>
            </div>
            
            <div 
              className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/60 p-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-800/85 shadow-2xs transition-all duration-300" 
              id="theme-toggle-container"
            >
              <button
                onClick={() => setIsDark(false)}
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  !isDark 
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                aria-label="Light mode"
                title="Light theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsDark(true)}
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-800 text-zinc-100 shadow-2xs font-semibold' 
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
                aria-label="Dark mode"
                title="Dark theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium tracking-wide leading-relaxed transition-colors duration-300 max-w-xl">
            Draw with your mouse, stylus, or trackpad. The exported PNG will be cropped to your signature bounds automatically.
          </p>
        </header>

        {/* Signature Whiteboard Component with Floating Toolbar */}
        <section className="relative mb-8" id="signature-whiteboard-section">
          <SignatureCanvas
            strokes={strokes}
            setStrokes={setStrokes}
            currentColorId={currentColorId}
            currentWidth={currentWidth}
            isDark={isDark}
            highPrecision={highPrecision}
          />
          
          {/* Floating Quick Operations (Undo / Mirror / Clear) */}
          <div 
            className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1 border border-zinc-200/50 dark:border-zinc-800/60 rounded-xl shadow-xs transition-all duration-300"
            id="floating-operations-bar"
          >
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg active:scale-90 transition-all cursor-pointer flex items-center justify-center"
              title="Undo last stroke"
              id="undo-operation-button"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFlipHorizontal}
              disabled={strokes.length === 0}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg active:scale-90 transition-all cursor-pointer flex items-center justify-center"
              title="Mirror signature horizontally"
              id="flip-horizontal-button"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-zinc-250 dark:bg-zinc-800 mx-0.5"></div>

            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-1.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg active:scale-90 transition-all cursor-pointer flex items-center justify-center"
              title="Clear signature canvas"
              id="clear-all-button"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Beautiful Simple Control Bar */}
        <div 
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col gap-6"
          id="control-bar-dock"
        >
          {/* Top Section: Formatting options in structured responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end" id="style-adjustments-grid">
            
            {/* Color circles panel */}
            <div className="flex flex-col gap-2" id="color-selectors-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">
                Ink Color
              </span>
              <div className="flex gap-2" id="ink-color-buttons">
                {INK_COLORS.map((color) => {
                  const isActive = currentColorId === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => {
                        setCurrentColorId(color.id);
                        showToast(`Switched ink to ${color.name}.`, 'info');
                      }}
                      className={`w-7 h-7 rounded-full transition-all duration-300 border border-zinc-200/20 dark:border-zinc-700/20 active:scale-90 cursor-pointer ${
                        isActive 
                          ? 'ring-2 ring-offset-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-white dark:ring-offset-zinc-900 scale-105 shadow-sm' 
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
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
            <div className="flex flex-col gap-2" id="pen-size-selectors-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">
                Pen Weight
              </span>
              <div className="flex bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl h-8 items-center self-start" id="pen-size-buttons">
                {PEN_SIZES.map((size) => {
                  const isActive = currentWidth === size.width;
                  return (
                    <button
                      key={size.id}
                      onClick={() => {
                        setCurrentWidth(size.width);
                        showToast(`Selected ${size.label} brush thickness.`, 'info');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                      title={`Select ${size.label} weight`}
                      aria-label={`Select ${size.label} weight`}
                      id={`size-btn-${size.id}`}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* High Precision Mode Toggle */}
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1" id="precision-toggle-group">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">
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
                  className={`h-8 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all duration-300 active:scale-95 cursor-pointer self-start ${
                    highPrecision
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  id="high-precision-mode-toggle"
                  title="Smoothes curves to remove trackpad or mouse hand-jitters"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${highPrecision ? 'bg-indigo-600 dark:bg-indigo-400 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                  <span>High Precision</span>
                </button>
              </div>
            </div>

          </div>

          {/* Separation Divider */}
          <hr className="border-zinc-200/50 dark:border-zinc-800/40" />

          {/* Bottom Section: Helper Text & Export Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="actions-group-container">
            
            {/* Left-aligned helper for visual balance */}
            <div className="hidden sm:flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-medium">
              <FileSignature className="w-3.5 h-3.5" />
              <span>Draw your signature and export instantly</span>
            </div>

            {/* Ultimate Exports: Preview, Copy & Download */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 sm:flex-initial w-full sm:w-auto" id="export-actions">
              <button
                onClick={handleOpenPreview}
                disabled={strokes.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 flex-1 sm:flex-initial justify-center cursor-pointer shadow-2xs"
                title="Preview cropped signature with transparency details"
                id="preview-trigger-button"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={strokes.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 flex-1 sm:flex-initial justify-center cursor-pointer"
                id="copy-clipboard-button"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={strokes.length === 0}
                className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl font-bold text-xs shadow-sm transition-all duration-300 w-full sm:w-auto justify-center cursor-pointer"
                id="primary-download-button"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            </div>

          </div>
        </div>

        {/* Sleek Minimalist FAQ Section */}
        <section 
          className="mt-16 border-t border-zinc-200/60 dark:border-zinc-800/80 pt-10"
          id="faq-section"
        >
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-display tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 font-medium">
              Everything you need to know about Signity signature tools.
            </p>
          </div>

          <div className="max-w-2xl mx-auto flex flex-col gap-3" id="faq-accordion-container">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/80 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className={`w-full px-5 py-4 flex items-center justify-between text-left font-semibold hover:text-zinc-900 dark:hover:text-white transition-all duration-200 gap-4 cursor-pointer text-xs sm:text-sm select-none ${
                      isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform duration-300 shrink-0 ${
                        isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'
                      }`} 
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100/50 dark:border-zinc-800/30">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-zinc-200/50 dark:border-zinc-900 mt-16 pb-12 pt-8 text-zinc-400 dark:text-zinc-500 font-sans transition-colors duration-300" id="application-footer">
        <div className="max-w-[960px] mx-auto px-6 flex flex-col items-center justify-center gap-2.5">
          <div className="flex items-center gap-1.5 mb-1" id="logo-brand-footer">
            <svg 
              className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-current transition-colors duration-300 shrink-0"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M8 22 C10 14, 14 8, 18 8 C22 8, 24 12, 22 18 C20 24, 16 26, 12 24 C9 22.5, 11 17, 16 15 C21 13, 24 17, 26 21" 
                strokeWidth="2.75" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <circle cx="26" cy="21" r="2" fill="currentColor" stroke="none" />
            </svg>
            <span className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-50 tracking-tight transition-colors duration-300">
              Signity
            </span>
          </div>
          <p className="text-[11px] font-medium tracking-wide transition-colors duration-300 text-center">
            © {new Date().getFullYear()} Signity. Beautiful digital signature creation & export.
          </p>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500" id="footer-legal-links">
            <button 
              onClick={() => setActiveLegalModal('privacy')}
              className="hover:text-zinc-700 dark:hover:text-zinc-350 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button 
              onClick={() => setActiveLegalModal('terms')}
              className="hover:text-zinc-700 dark:hover:text-zinc-350 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
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
              className="absolute inset-0 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
              id="preview-modal-backdrop"
            />

            {/* Modal Canvas Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col z-10 max-h-[calc(100vh-2rem)]"
              id="preview-modal-container"
            >
              {/* Header block with meta and status */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-900 shrink-0" id="preview-modal-header">
                <div>
                  <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white font-display">
                    Signature Preview
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold font-mono tracking-wide mt-0.5 uppercase">
                    TRANSPARENT PNG &bull; {previewDimensions.width} &times; {previewDimensions.height} px
                  </p>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-90 transition-all cursor-pointer"
                  aria-label="Close preview modal"
                  id="preview-modal-close-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Checkered background representations */}
              <div className="p-6 flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#0c0c0e] border-b border-zinc-100 dark:border-zinc-900 overflow-y-auto flex-1" id="preview-modal-body">
                <div 
                  className="relative w-full h-[220px] rounded-2xl border border-zinc-200/60 dark:border-zinc-900/60 flex items-center justify-center overflow-hidden shrink-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #f4f4f5 25%, transparent 25%), 
                      linear-gradient(-45deg, #f4f4f5 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f4f4f5 75%), 
                      linear-gradient(-45deg, transparent 75%, #f4f4f5 75%)
                    `,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                    backgroundColor: '#ffffff'
                  }}
                  id="transparent-checkerboard-wrapper"
                >
                  <img 
                    src={previewDataUrl} 
                    alt="Signature preview representation" 
                    className="max-w-[85%] max-h-[85%] object-contain drop-shadow-sm select-none pointer-events-none"
                    id="preview-rendered-img"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium text-center mt-3 leading-relaxed">
                  The checkered background represents transparency. Your exported cropped signature will contain a transparent, alpha-channel background layer.
                </p>
              </div>

              {/* Action buttons footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800/60 shrink-0" id="preview-modal-footer">
                <button
                  onClick={() => {
                    handleCopy();
                  }}
                  className="flex items-center gap-2 justify-center px-4 py-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-all flex-1 active:scale-95 cursor-pointer"
                  id="preview-modal-action-copy"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied!' : 'Copy PNG'}</span>
                </button>

                <button
                  onClick={() => {
                    handleDownload();
                    setIsPreviewOpen(false);
                  }}
                  className="flex items-center gap-2 justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white dark:text-white font-bold text-xs rounded-xl shadow-xs transition-all flex-1 active:scale-95 cursor-pointer"
                  id="preview-modal-action-download"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Legal Overlay Modal (Privacy / Terms) */}
      <AnimatePresence>
        {activeLegalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="legal-modal-system">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLegalModal(null)}
              className="absolute inset-0 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
              id="legal-modal-backdrop"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col z-10 max-h-[calc(100vh-2rem)]"
              id="legal-modal-container"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-900 shrink-0" id="legal-modal-header">
                <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white font-display">
                  {activeLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
                <button
                  onClick={() => setActiveLegalModal(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-90 transition-all cursor-pointer"
                  aria-label="Close legal modal"
                  id="legal-modal-close-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto flex-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans" id="legal-modal-body">
                {activeLegalModal === 'privacy' ? (
                  <div className="flex flex-col gap-4">
                    <p>
                      <strong>Signity is private-by-design.</strong> We believe that your digital signature is highly sensitive personal data and should never be collected or exposed.
                    </p>
                    <hr className="border-zinc-200/40 dark:border-zinc-900" />
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">1. Zero Data Collection</h4>
                      <p>We do not collect, save, or share any of your drawings, coordinates, images, or personal metadata. We have no backend databases and do not store signature files.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">2. Local Browser Processing</h4>
                      <p>All processing, smoothing, cropping, and file compilation are done locally in your browser sandbox. Your signature data never leaves your device.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">3. No Cookies or Beacons</h4>
                      <p>We do not use trackers, analytics beacons, or advertising cookies. The application is completely free of third-party monitoring.</p>
                    </div>
                    <hr className="border-zinc-200/40 dark:border-zinc-900" />
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Last updated: June 2026. For questions regarding code security, you can view the open-source repository files directly.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p>
                      Please read these Terms of Service carefully before utilizing the Signity signature generator tool.
                    </p>
                    <hr className="border-zinc-200/40 dark:border-zinc-900" />
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">1. Usage License</h4>
                      <p>Signity is free to use for both personal and commercial document-signing tasks. You own all intellectual property rights and copyright to any signature files generated using this application.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">2. Legal Disclaimer</h4>
                      <p>Signity compiles graphic signatures "as-is". We do not guarantee the legal enforceability, validity, or compliance of the exported images with electronic signature acts (such as ESIGN or eIDAS) in your country or jurisdiction. Check your local regulations for official contracts.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">3. Prohibited Misuse</h4>
                      <p>You agree not to use this drawing canvas to replicate, forge, or impersonate signatures of other individuals without their explicit authorization. Any fraudulent use is strictly prohibited.</p>
                    </div>
                    <hr className="border-zinc-200/40 dark:border-zinc-900" />
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Last updated: June 2026. By using the app, you agree to these simplified terms.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Action */}
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100/60 dark:border-zinc-800/60 shrink-0 flex justify-end" id="legal-modal-footer">
                <button
                  onClick={() => setActiveLegalModal(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white dark:text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                  id="legal-modal-close-button"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
