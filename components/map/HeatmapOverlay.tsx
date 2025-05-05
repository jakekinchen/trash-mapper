import React, { useEffect, useRef, useCallback } from 'react';
import type { PollutionReport } from './types';
import type { Bounds } from 'pigeon-maps';
import {
  HEATMAP_CONSTANTS,
  severityToIntensity,
  hexToRgb,
  getColorForIntensity
} from './constants/heatmap';

interface HeatmapOverlayProps {
  reports: PollutionReport[];
  zoom: number;
  bounds: Bounds;
}

function latLonToPixel(lat: number, lon: number, bounds: Bounds, canvasWidth: number, canvasHeight: number): [number, number] {
  const { ne, sw } = bounds;
  const lonRange = ne[1] - sw[1];
  const latRange = ne[0] - sw[0];

  if (lonRange === 0 || latRange === 0) {
    return [-1, -1];
  }

  const x = ((lon - sw[1]) / lonRange) * canvasWidth;
  
  const y = ((ne[0] - lat) / latRange) * canvasHeight;

  return [x, y];
}

const HeatmapOverlay = ({ reports, zoom, bounds }: HeatmapOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  console.log('[HeatmapOverlay] Rendering with props:', { numReports: reports.length, zoom, bounds });

  const radius = Math.max(
    HEATMAP_CONSTANTS.MIN_RADIUS,
    Math.min(HEATMAP_CONSTANTS.MAX_RADIUS, zoom * HEATMAP_CONSTANTS.ZOOM_RADIUS_FACTOR)
  );

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[HeatmapOverlay] Canvas ref not found');
      return;
    }
    
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    console.log('[HeatmapOverlay] Canvas dimensions:', { canvasWidth, canvasHeight });

    if (canvasWidth <= 0 || canvasHeight <= 0) {
        console.warn('[HeatmapOverlay] Canvas dimensions are invalid, skipping draw.');
        return;
    }

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        console.log('[HeatmapOverlay] Resizing canvas internal resolution:', { width: canvasWidth, height: canvasHeight });
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[HeatmapOverlay] Failed to get 2D context');
      return;
    }

    console.log(`[HeatmapOverlay] Clearing canvas (${canvasWidth}x${canvasHeight}) and drawing ${reports.length} points with radius ${radius}`);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    let pointsDrawn = 0;
    reports.forEach((report, index) => {
      const [lon, lat] = report.location;
      const [x, y] = latLonToPixel(lat, lon, bounds, canvasWidth, canvasHeight);

      if (index < 5) {
          console.log(`[HeatmapOverlay] Report ${index}: lon=${lon}, lat=${lat} -> x=${x.toFixed(2)}, y=${y.toFixed(2)}`);
      }

      if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
          if (index < 5) {
              console.log(`[HeatmapOverlay] Report ${index} is outside canvas bounds.`);
          }
          return;
      }

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const pointIntensity = HEATMAP_CONSTANTS.BASE_INTENSITY * severityToIntensity(report.severity);
      
      gradient.addColorStop(0, `rgba(255, 0, 0, ${pointIntensity})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      pointsDrawn++;
    });
    console.log(`[HeatmapOverlay] Finished drawing loop. Points drawn within bounds: ${pointsDrawn}`);

    try {
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;
      let pixelsColored = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        if (alpha > 0) {
          const color = getColorForIntensity(alpha);
          const [r, g, b] = hexToRgb(color);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          pixelsColored++;
        }
      }
      console.log(`[HeatmapOverlay] Applying color mapping. Pixels colored: ${pixelsColored}`);
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
        console.error('[HeatmapOverlay] Error during color mapping (getImageData/putImageData): ', e);
    }
  }, [reports, radius, bounds]);

  useEffect(() => {
    if (!bounds) {
        console.log('[HeatmapOverlay] useEffect skipped: bounds not ready.');
        return;
    }
    console.log('[HeatmapOverlay] useEffect triggering drawHeatmap');
    drawHeatmap();
  }, [drawHeatmap, bounds]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        opacity: HEATMAP_CONSTANTS.OPACITY,
      }}
      width={HEATMAP_CONSTANTS.CANVAS_SIZE}
      height={HEATMAP_CONSTANTS.CANVAS_SIZE}
    />
  );
};

export default HeatmapOverlay; 