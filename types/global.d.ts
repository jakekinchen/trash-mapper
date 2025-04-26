// Add Leaflet types to the global Window interface
interface Window {
  L: {
    map: (element: HTMLElement, options?: any) => any
    tileLayer: (url: string, options?: any) => any
    marker: (latLng: [number, number] | any, options?: any) => any
    divIcon: (options?: any) => any
    heatLayer?: (data: any[], options?: any) => any
    control: {
      zoom: (options?: any) => any
      attribution: (options?: any) => any
    }
  }
}
