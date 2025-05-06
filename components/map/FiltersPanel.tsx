import React from "react";
import { Filter } from "lucide-react";

interface FiltersPanelProps {
  showTrashBins: boolean;
  toggleTrashBins: (value: boolean) => void;
  showPollution: boolean;
  togglePollution: (value: boolean) => void;
  show311: boolean;
  toggle311: (value: boolean) => void;
  showUserHeatmap: boolean;
  toggleUserHeatmap: (value: boolean) => void;
  show311Heatmap: boolean;
  toggle311Heatmap: (value: boolean) => void;
  currentZoom?: number;
}

export default function FiltersPanel({
  showTrashBins,
  toggleTrashBins,
  showPollution,
  togglePollution,
  show311,
  toggle311,
  showUserHeatmap,
  toggleUserHeatmap,
  show311Heatmap,
  toggle311Heatmap,
  currentZoom = 13,
}: FiltersPanelProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const pollutionZoomThreshold = 13;

  return (
    <div
      className="absolute left-4 z-30 bg-white rounded-md shadow-md"
      style={{ top: `calc(1.5rem + env(safe-area-inset-top, 0px))`, paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <button
        className="flex items-center gap-2 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-t-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-left"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
      >
        <Filter className="w-5 h-5 flex-shrink-0" />
        <span className="flex-grow">Filters</span>
      </button>
      {filtersOpen && (
        <div className="p-3 space-y-2 border-t border-gray-200">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPollution}
              onChange={(e) => togglePollution(e.target.checked)}
              className="form-checkbox h-4 w-4 text-red-600 accent-red-600"
              aria-label="Toggle user submitted litter layer"
              disabled={currentZoom < pollutionZoomThreshold}
            />
            <span className={`text-sm font-medium ${currentZoom < pollutionZoomThreshold ? 'text-gray-400' : ''}`}>
              User Submitted Litter
              {currentZoom < pollutionZoomThreshold && " (zoom in to view)"}
            </span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={show311}
              onChange={(e) => toggle311(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600 accent-blue-600"
              aria-label="Toggle 311 sourced litter layer"
              disabled={currentZoom < pollutionZoomThreshold}
            />
            <span className={`text-sm font-medium ${currentZoom < pollutionZoomThreshold ? 'text-gray-400' : ''}`}>
              311 Sourced Litter
              {currentZoom < pollutionZoomThreshold && " (zoom in to view)"}
            </span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTrashBins}
              onChange={(e) => toggleTrashBins(e.target.checked)}
              className="form-checkbox h-4 w-4 text-green-600 accent-green-600"
              aria-label="Toggle trash bins layer"
            />
            <span className="text-sm font-medium">
              Trash Bins
            </span>
          </label>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="text-sm font-medium text-gray-500 mb-1">Heatmap Layers</div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUserHeatmap}
              onChange={(e) => toggleUserHeatmap(e.target.checked)}
              className="form-checkbox h-4 w-4 text-red-600 accent-red-600"
              aria-label="Toggle user submitted heatmap"
            />
            <span className="text-sm font-medium">
              User Submitted Heatmap
            </span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={show311Heatmap}
              onChange={(e) => toggle311Heatmap(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600 accent-blue-600"
              aria-label="Toggle 311 sourced heatmap"
            />
            <span className="text-sm font-medium">
              311 Sourced Heatmap
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
 