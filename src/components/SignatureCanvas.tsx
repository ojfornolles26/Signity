/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { Stroke, Point } from '../types';
import { drawStroke, drawAllStrokes, getStrokesBounds } from '../utils/canvas';

// Visual & Export mapped inks to handle light/dark whiteboards beautifully
export const INK_COLORS = [
  {
    id: 'black' as const,
    name: 'Black',
    lightColor: '#18181b',  // Onyx Black
    darkColor: '#f4f4f5',   // Crisp Zinc White
    exportColor: '#09090b', // Deep Onyx Black for export
    circleColor: 'bg-zinc-900 dark:bg-zinc-100',
  },
  {
    id: 'navy' as const,
    name: 'Royal Indigo',
    lightColor: '#4f46e5',  // Indigo-600 (matches brand light accent)
    darkColor: '#818cf8',   // Indigo-400 (matches brand dark accent)
    exportColor: '#1e1b4b', // Deep Royal Indigo for export
    circleColor: 'bg-indigo-600 dark:bg-indigo-400',
  },
  {
    id: 'red' as const,
    name: 'Crimson Red',
    lightColor: '#b91c1c',  // Deep Crimson Red
    darkColor: '#f87171',   // Soft Red
    exportColor: '#7f1d1d', // Solid Dark Crimson for export
    circleColor: 'bg-red-700 dark:bg-red-400',
  },
];

interface SignatureCanvasProps {
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  currentColorId: 'black' | 'navy' | 'red';
  currentWidth: number;
  isDark: boolean;
  highPrecision: boolean;
}

export default function SignatureCanvas({
  strokes,
  setStrokes,
  currentColorId,
  currentWidth,
  isDark,
  highPrecision,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);

  // Keep latest rendering parameters in refs so resize handler can access them without re-subscribing
  const paramsRef = useRef({ strokes, isDark, highPrecision });
  useEffect(() => {
    paramsRef.current = { strokes, isDark, highPrecision };
  }, [strokes, isDark, highPrecision]);

  // Initialize and handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeAndScale = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;

      // Set internal coordinates sized with device pixel ratio
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Set CSS visual space matches container bounding rect
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        
        // Re-draw all strokes after size update to prevent clearing
        const { strokes: currentStrokes, isDark: currentIsDark, highPrecision: currentHighPrecision } = paramsRef.current;
        const getVisualColor = (colorId: string) => {
          const colorObj = INK_COLORS.find((c) => c.id === colorId);
          if (!colorObj) return colorId;
          return currentIsDark ? colorObj.darkColor : colorObj.lightColor;
        };

        currentStrokes.forEach((stroke) => {
          const vStroke = { ...stroke, color: getVisualColor(stroke.color) };
          drawStroke(ctx, vStroke, currentHighPrecision);
        });
      }
    };

    // Run on initial load
    resizeAndScale();

    // ResizeObserver for reliable container tracking
    const observer = new ResizeObserver(() => {
      resizeAndScale();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Window resize fallback
    window.addEventListener('resize', resizeAndScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resizeAndScale);
    };
  }, []);

  // Synchronize rendering of strokes & active brush stroke
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    const getVisualColor = (colorId: string) => {
      const colorObj = INK_COLORS.find((c) => c.id === colorId);
      if (!colorObj) return colorId;
      return isDark ? colorObj.darkColor : colorObj.lightColor;
    };

    // Render historical strokes
    strokes.forEach((stroke) => {
      const visualStroke = {
        ...stroke,
        color: getVisualColor(stroke.color),
      };
      drawStroke(ctx, visualStroke, highPrecision);
    });

    // Render active drawing stroke
    if (activeStroke) {
      const visualStroke = {
        ...activeStroke,
        color: getVisualColor(activeStroke.color),
      };
      drawStroke(ctx, visualStroke, highPrecision);
    }
  }, [strokes, activeStroke, isDark, highPrecision]);

  // Handle Event drawing boundaries
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Direct input exclusively to this canvas even if coordinate leaves bounds
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      // standard fallback for restricted sandbox permissions
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    const newPoint: Point = { x, y };

    const newStroke: Stroke = {
      id: Math.random().toString(36).substring(2, 9),
      points: [newPoint],
      color: currentColorId,
      width: currentWidth,
    };

    setActiveStroke(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoint: Point = { x, y };

    setActiveStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, newPoint],
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeStroke) return;

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // safety guard
      }
    }

    setIsDrawing(false);

    // Commit if stroke has visible points
    if (activeStroke.points.length > 0) {
      setStrokes((prev) => [...prev, activeStroke]);
    }
    setActiveStroke(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-80 sm:h-96 rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] cursor-crosshair overflow-hidden touch-none transition-all duration-300"
      id="signature-whiteboard-container"
    >
      {/* Dynamic Grid Background Patterns for authentic feel */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none transition-all duration-300" 
        id="whiteboard-grid"
      />

      {/* Dotted Baseline guide for signing straight */}
      <div
        className="absolute bottom-[30%] left-[10%] right-[10%] border-b border-dashed border-zinc-200/80 dark:border-zinc-800/60 pointer-events-none transition-all duration-300"
        id="dotted-baseline-line"
      />

      {/* HTML5 drawing viewport */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 w-full h-full block touch-none select-none z-10"
        id="drawing-canvas-viewport"
      />

      {/* Placeholder guidance helper */}
      {strokes.length === 0 && !activeStroke && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none text-center p-4 gap-2.5"
          id="canvas-placeholder"
        >
          <FileSignature className="w-5 h-5 text-zinc-300 dark:text-zinc-700 stroke-[1.25] opacity-60 transition-all duration-300" />
          <p className="text-xs font-sans text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed tracking-wider font-normal transition-all duration-300">
            Draw your signature here
          </p>
        </div>
      )}
    </div>
  );
}
