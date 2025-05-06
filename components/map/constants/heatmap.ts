// Color-blind-safe gradient for heatmap visualization
export const HEATMAP_GRADIENT: { [key: number]: string } = {
  0.2: '#d0f4f7', // light blue - lowest intensity
  0.4: '#91d4f1', // blue
  0.6: '#3fa7f5', // medium blue
  0.8: '#ffb347', // orange
  1.0: '#ff5c5c'  // red - highest intensity
};

// Convert severity (1-5) to intensity (0-1)
export const severityToIntensity = (severity: number): number => {
  return Math.max(0, Math.min(1, severity / 5)); // normalize and clamp to 0-1
};

// Convert hex color to RGB components
export const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

// Get color for intensity value
export const getColorForIntensity = (alpha: number): string => {
  if (alpha < 0.2) return HEATMAP_GRADIENT[0.2];
  if (alpha < 0.4) return HEATMAP_GRADIENT[0.4];
  if (alpha < 0.6) return HEATMAP_GRADIENT[0.6];
  if (alpha < 0.8) return HEATMAP_GRADIENT[0.8];
  return HEATMAP_GRADIENT[1.0];
};

// Constants for heatmap rendering
export const HEATMAP_CONSTANTS = {
  BASE_INTENSITY: 1.2,
  MIN_RADIUS: 40,
  MAX_RADIUS: 70,
  ZOOM_RADIUS_FACTOR: 2,
  CANVAS_SIZE: 1000,
  OPACITY: 0.6
} as const; 