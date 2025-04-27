// Color-blind-safe five-step palette (YlOrRd variant, HSL lightened, plus user assignments)
export const ALT_HEATMAP_PALETTE: { [severity: number]: string } = {
  1: '#d0f4f7', // light blue
  2: '#91d4f1', // blue
  3: '#3fa7f5', // medium blue
  4: '#ffb347', // orange
  5: '#ff5c5c'  // red
}

// For leaflet.heat gradient, map severity/5 to color stops
export const ALT_HEATMAP_GRADIENT: { [key: number]: string } = {
  0.2: '#d0f4f7', // Severity 1
  0.4: '#91d4f1', // Severity 2
  0.6: '#3fa7f5', // Severity 3
  0.8: '#ffb347', // Severity 4
  1.0: '#ff5c5c', // Severity 5
}
