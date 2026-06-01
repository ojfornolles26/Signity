/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Stroke, Point } from '../types';
import { drawStroke, drawAllStrokes, getStrokesBounds } from '../utils/canvas';

// Visual & Export mapped inks to handle light/dark whiteboards beautifully
export const INK_COLORS = [
  {
    id: 'black' as const,
    name: 'Black',
    lightColor: '#0f172a',  // Rich Slate Black
    darkColor: '#f8fafc',   // Crisp Slate White
    exportColor: '#090d16', // Deep Solid Black for export
    circleColor: 'bg-black dark:bg-white',
  },
  {
    id: 'navy' as const,
    name: 'Navy Blue',
    lightColor: '#1d4ed8',  // Royal Blue
    darkColor: '#60a5fa',   // Glowing Blue
    exportColor: '#0b2265', // Standard Dark Navy for export
    circleColor: 'bg-[#1e3a8a] dark:bg-[#60a5fa]',
  },
  {
    id: 'red' as const,
    name: 'Dark Red',
    lightColor: '#b91c1c',  // Deep Crimson Red
    darkColor: '#f87171',   // Soft Red
    exportColor: '#7f1d1d', // Solid Dark Crimson for export
    circleColor: 'bg-[#991b1b] dark:bg-[#f87171]',
  },
];

interface SignatureCanvasProps {
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  currentColorId: 'black' | 'navy' | 'red';
  currentWidth: number;
  isDark: boolean;
  highPrecision: boolean;
  includeBorder: boolean;
}

export default function SignatureCanvas({
  strokes,
  setStrokes,
  currentColorId,
  currentWidth,
  isDark,
  highPrecision,
  includeBorder,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);

  // Clearing fade animation state tracking
  const [fadingStrokes, setFadingStrokes] = useState<Stroke[]>([]);
  const [isFading, setIsFading] = useState(false);
  const lastNonEmptyStrokes = useRef<Stroke[]>([]);

  useEffect(() => {
    if (strokes.length > 0) {
      lastNonEmptyStrokes.current = strokes;
    } else if (strokes.length === 0 && lastNonEmptyStrokes.current.length > 0) {
      // Clear or trailing Undo to empty was triggered! Set up visual fade loop
      setFadingStrokes(lastNonEmptyStrokes.current);
      setIsFading(true);

      const timer = setTimeout(() => {
        setIsFading(false);
        setFadingStrokes([]);
        lastNonEmptyStrokes.current = [];
      }, 300); // 300ms matching transition CSS animation

      return () => clearTimeout(timer);
    }
  }, [strokes]);

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
        const getVisualColor = (colorId: string) => {
          const colorObj = INK_COLORS.find((c) => c.id === colorId);
          if (!colorObj) return colorId;
          return isDark ? colorObj.darkColor : colorObj.lightColor;
        };

        const strokesToRender = isFading ? fadingStrokes : strokes;

        strokesToRender.forEach((stroke) => {
          const vStroke = { ...stroke, color: getVisualColor(stroke.color) };
          drawStroke(ctx, vStroke, highPrecision);
        });

        // Live visual representation of export boundaries block
        if (includeBorder && strokesToRender.length > 0) {
          const bounds = getStrokesBounds(strokesToRender);
          if (bounds) {
            ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(bounds.minX + 0.5, bounds.minY + 0.5, bounds.width - 1, bounds.height - 1);
            ctx.setLineDash([]);
          }
        }
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
  }, [strokes, fadingStrokes, isFading, isDark, highPrecision, includeBorder]);

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

    const strokesToRender = isFading ? fadingStrokes : strokes;

    // Render historical strokes or transitioning fading strokes
    strokesToRender.forEach((stroke) => {
      const visualStroke = {
        ...stroke,
        color: getVisualColor(stroke.color),
      };
      drawStroke(ctx, visualStroke, highPrecision);
    });

    // Render active drawing stroke
    if (activeStroke && !isFading) {
      const visualStroke = {
        ...activeStroke,
        color: getVisualColor(activeStroke.color),
      };
      drawStroke(ctx, visualStroke, highPrecision);
    }

    // Live visual representation of export boundaries block
    if (includeBorder && strokesToRender.length > 0) {
      const bounds = getStrokesBounds(strokesToRender);
      if (bounds) {
        ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bounds.minX + 0.5, bounds.minY + 0.5, bounds.width - 1, bounds.height - 1);
        ctx.setLineDash([]);
      }
    }
  }, [strokes, fadingStrokes, isFading, activeStroke, isDark, highPrecision, includeBorder]);

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
      className="relative w-full h-80 sm:h-96 rounded-[32px] bg-white dark:bg-[#151f32] border border-slate-200 dark:border-[#1e293b] shadow-[0_4px_24px_rgba(37,99,235,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-crosshair overflow-hidden touch-none"
      id="signature-whiteboard-container"
    >
      {/* Dynamic Grid Background Patterns for authentic feel */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" 
        id="whiteboard-grid"
      />

      {/* Dotted Baseline guide for signing straight */}
      <div
        className="absolute bottom-[30%] left-[10%] right-[10%] border-b-2 border-dashed border-slate-200 dark:border-slate-800 pointer-events-none"
        id="dotted-baseline-line"
      />

      {/* HTML5 drawing viewport */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute inset-0 w-full h-full block touch-none select-none z-10 transition-all duration-300 ease-out ${
          isFading ? 'opacity-0 scale-[0.985] blur-[1px]' : 'opacity-100 scale-100 blur-0'
        }`}
        id="drawing-canvas-viewport"
      />

      {/* Placeholder guidance helper */}
      {strokes.length === 0 && !activeStroke && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none text-center p-4"
          id="canvas-placeholder"
        >
          <p className="text-sm font-sans text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed font-light">
            Sign inside this board.
          </p>
        </div>
      )}
    </div>
  );
}
