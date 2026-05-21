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
  testId?: string;
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

const HeatmapOverlay = ({ reports, zoom, bounds, testId }: HeatmapOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const radius = Math.max(
    HEATMAP_CONSTANTS.MIN_RADIUS,
    Math.min(HEATMAP_CONSTANTS.MAX_RADIUS, zoom * HEATMAP_CONSTANTS.ZOOM_RADIUS_FACTOR)
  );

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    if (canvasWidth <= 0 || canvasHeight <= 0) {
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const scaledWidth = Math.round(canvasWidth * pixelRatio);
    const scaledHeight = Math.round(canvasHeight * pixelRatio);

    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    reports.forEach((report) => {
      const [lat, lon] = report.location;
      const [x, y] = latLonToPixel(lat, lon, bounds, canvasWidth, canvasHeight);

      if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
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
    });

    try {
      const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        if (alpha > 0) {
          const color = getColorForIntensity(alpha);
          const [r, g, b] = hexToRgb(color);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
        console.error('[HeatmapOverlay] Error during color mapping (getImageData/putImageData): ', e);
    }
  }, [reports, radius, bounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => drawHeatmap());
    resizeObserver.observe(canvas);
    drawHeatmap();

    return () => resizeObserver.disconnect();
  }, [drawHeatmap, bounds]);

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
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
