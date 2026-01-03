/**
 * Canvas Rendering Utilities
 * 
 * Extracted rendering functions for SmartDrawTool canvas.
 * Constitutional: Pure rendering logic, no ML/AI.
 */

export interface CanvasRenderingContext {
  ctx: CanvasRenderingContext2D;
  displayWidth: number;
  displayHeight: number;
  padding: number;
  frameWidth: number;
  frameHeight: number;
  scaleX: number;
}

/**
 * Render background (clear and fill)
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
}

/**
 * Render placeholder text when no project is loaded
 */
export function renderPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  message: string
): void {
  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, width / 2, height / 2);
}

/**
 * Render outer frame
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  padding: number,
  frameWidth: number,
  frameHeight: number
): void {
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, frameWidth, frameHeight);
}

/**
 * Render panel shading between mullions
 */
export function renderPanelShading(
  ctx: CanvasRenderingContext2D,
  positions: number[],
  padding: number,
  scaleX: number,
  frameHeight: number
): number[] {
  const panelWidthsMm: number[] = [];
  ctx.save();
  
  for (let i = 0; i < positions.length - 1; i += 1) {
    const leftMm = positions[i];
    const rightMm = positions[i + 1];
    const panelWidthMm = rightMm - leftMm;
    panelWidthsMm.push(panelWidthMm);
    
    const x = padding + leftMm * scaleX;
    const w = panelWidthMm * scaleX;
    
    ctx.fillStyle = i % 2 === 0 ? '#0f172a' : '#020617';
    ctx.fillRect(x, padding, w, frameHeight);
  }
  
  ctx.restore();
  return panelWidthsMm;
}

/**
 * Render panel width labels
 */
export function renderPanelLabels(
  ctx: CanvasRenderingContext2D,
  positions: number[],
  panelWidthsMm: number[],
  padding: number,
  scaleX: number,
  frameHeight: number,
  maxLabels: number = 8
): void {
  if (panelWidthsMm.length > maxLabels) return;
  
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < panelWidthsMm.length; i += 1) {
    const leftMm = positions[i];
    const rightMm = positions[i + 1];
    const centerX = padding + ((leftMm + rightMm) / 2) * scaleX;
    ctx.fillText(
      `${panelWidthsMm[i].toFixed(0)} mm`,
      centerX,
      padding + frameHeight / 2
    );
  }
}

/**
 * Render vertical mullions
 */
export function renderVerticalMullions(
  ctx: CanvasRenderingContext2D,
  mullionsMm: number[],
  padding: number,
  scaleX: number,
  frameHeight: number
): void {
  mullionsMm.forEach((posMm, index) => {
    const x = padding + posMm * scaleX;
    const isFirst = index === 0;
    const isLast = index === mullionsMm.length - 1;
    
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + frameHeight);
    ctx.lineWidth = isFirst || isLast ? 3 : 2;
    ctx.strokeStyle = isFirst || isLast ? '#f97316' : '#4b5563';
    ctx.stroke();
    
    // Draggable handle indicator
    if (isFirst || isLast) {
      ctx.beginPath();
      ctx.arc(x, padding + frameHeight / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
    }
  });
}

/**
 * Render horizontal transom
 */
export function renderHorizontalTransom(
  ctx: CanvasRenderingContext2D,
  horizontalPositionMm: number,
  overallHeight: number,
  padding: number,
  frameWidth: number,
  frameHeight: number
): void {
  const clampedPos = Math.max(0, Math.min(horizontalPositionMm, overallHeight));
  const yRatio = clampedPos / overallHeight;
  const y = padding + frameHeight * (1 - yRatio);
  
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(padding + frameWidth, y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#22c55e'; // green transom
  ctx.stroke();
}

/**
 * Render dimension label
 */
export function renderDimensionLabel(
  ctx: CanvasRenderingContext2D,
  overallWidth: number,
  padding: number,
  frameWidth: number,
  frameHeight: number
): void {
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `${overallWidth.toFixed(0)} mm`,
    padding + frameWidth / 2,
    padding + frameHeight + 6
  );
}

