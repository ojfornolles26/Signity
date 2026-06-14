/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Draw a single stroke with bezier smoothing using quadratic curve midpoints.
 */
export function drawStroke(ctx, stroke, highPrecision = false) {
  let points = stroke.points;
  if (points.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (highPrecision && points.length > 2) {
    const smoothed = [];
    smoothed.push(points[0]);
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      smoothed.push({
        x: (prev.x + 2 * curr.x + next.x) / 4,
        y: (prev.y + 2 * curr.y + next.y) / 4,
      });
    }
    smoothed.push(points[points.length - 1]);
    points = smoothed;
  }

  ctx.beginPath();
  
  if (points.length === 1) {
    // Single dot
    ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }

  // Draw smooth quadratic curves through midpoints of segments
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  // Link smoothly to the last point
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

/**
 * Draw all strokes sequentially on a target 2D context.
 */
export function drawAllStrokes(ctx, strokes, highPrecision = false) {
  strokes.forEach((stroke) => {
    drawStroke(ctx, stroke, highPrecision);
  });
}

/**
 * Find the tight bounding box containing all drawn strokes.
 * Includes stroke width and a fine padding to ensure nothing is clipped.
 */
export function getStrokesBounds(strokes, padding = 12) {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  strokes.forEach((stroke) => {
    stroke.points.forEach((p) => {
      const halfWidth = stroke.width / 2;
      if (p.x - halfWidth < minX) minX = p.x - halfWidth;
      if (p.y - halfWidth < minY) minY = p.y - halfWidth;
      if (p.x + halfWidth > maxX) maxX = p.x + halfWidth;
      if (p.y + halfWidth > maxY) maxY = p.y + halfWidth;
    });
  });

  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    return null;
  }

  // Pad the bounds slightly and ensure no negative boundaries
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = maxX + padding;
  maxY = maxY + padding;

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
  };
}

/**
 * Generate a transparent, cleanly-cropped high-resolution canvas element of the signature.
 */
export function getCroppedCanvas(
  strokes,
  scaleMultiplier = window.devicePixelRatio || 2,
  highPrecision = false,
  includeBorder = false
) {
  const bounds = getStrokesBounds(strokes);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = bounds.width * scaleMultiplier;
  cropCanvas.height = bounds.height * scaleMultiplier;

  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return null;

  // Clear background for perfect transparency
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  // Apply device scaling & translation factor
  ctx.scale(scaleMultiplier, scaleMultiplier);
  ctx.translate(-bounds.minX, -bounds.minY);

  // Redraw strokes offset to the top-left boundary
  drawAllStrokes(ctx, strokes, highPrecision);

  // Draw a subtle, sleek dotted/dashed crop border around the exact group margins
  if (includeBorder) {
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)'; // highly defined slate blue tint
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]); // sleek digital dash
    ctx.strokeRect(bounds.minX + 1, bounds.minY + 1, bounds.width - 2, bounds.height - 2);
    ctx.setLineDash([]); // clear dash state
  }

  return cropCanvas;
}

/**
 * Generate a transparent, cleanly-cropped high-resolution canvas element of the typed text.
 * It draws the text dynamically, scans pixels to find the bounding box, and crops it.
 */
export function getTextCroppedCanvas(
  text,
  fontFamily,
  fontSize,
  fontWeight,
  isItalic,
  color,
  scaleMultiplier = 3,
  padding = 12
) {
  if (!text) return null;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return null;

  // Set initial dimensions large enough to fit the text comfortably
  const initialWidth = Math.max(1600, text.length * fontSize * 2.5);
  const initialHeight = Math.max(500, fontSize * 4.5);

  tempCanvas.width = initialWidth * scaleMultiplier;
  tempCanvas.height = initialHeight * scaleMultiplier;

  tempCtx.scale(scaleMultiplier, scaleMultiplier);

  // Clear background for perfect transparency
  tempCtx.clearRect(0, 0, initialWidth, initialHeight);

  // Setup text styles
  const slantStyle = isItalic ? 'italic' : 'normal';
  tempCtx.font = `${slantStyle} ${fontWeight} ${fontSize}px "${fontFamily}", cursive, sans-serif`;
  tempCtx.fillStyle = color;
  tempCtx.textBaseline = 'middle';
  tempCtx.textAlign = 'center';

  // Draw the text in the exact center
  tempCtx.fillText(text, initialWidth / 2, initialHeight / 2);

  // Scan pixels for non-transparent boundaries
  const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imgData.data;

  let minX = tempCanvas.width;
  let minY = tempCanvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < tempCanvas.height; y++) {
    for (let x = 0; x < tempCanvas.width; x++) {
      const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasPixels = true;
      }
    }
  }

  if (!hasPixels) return null;

  // Apply padding in scaled pixels
  const scaledPadding = padding * scaleMultiplier;
  minX = Math.max(0, minX - scaledPadding);
  minY = Math.max(0, minY - scaledPadding);
  maxX = Math.min(tempCanvas.width, maxX + scaledPadding);
  maxY = Math.min(tempCanvas.height, maxY + scaledPadding);

  const cropWidth = maxX - minX;
  const cropHeight = maxY - minY;

  if (cropWidth <= 0 || cropHeight <= 0) return null;

  // Create the final cropped canvas
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return null;

  // Copy the cropped region from the temporary canvas
  cropCtx.drawImage(
    tempCanvas,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return cropCanvas;
}

