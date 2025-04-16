import { FC, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useIntl } from "react-intl";

// Interface for visualization options
interface VisualizationOptions {
  showHeatmap: boolean;
  showMarkers: boolean;
  showPaths: boolean;
  markerSize: number;
  pathColor: string;
}

// Props for the toolkit component
interface GpsVisualizationToolkitProps {
  data: Array<[number, number]>;
  onOptionChange: (options: VisualizationOptions) => void;
}

// HeatmapLayer component
export const HeatmapLayer: FC<{ data: Array<[number, number]> }> = ({ data }) => {
  const map = useMap();

  // Initialize heatmap layer
  useState(() => {
    if (!data.length) return;

    if (typeof (L as any).heatLayer === 'function') {
      const heatLayer = (L as any).heatLayer(data, {
        radius: 20,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.4: 'blue',
          0.6: 'cyan',
          0.7: 'lime',
          0.8: 'yellow',
          1.0: 'red'
        }
      }).addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    } else {
      console.error('L.heatLayer is not defined');
    }
  });

  return null;
};

// MarkerLayer component
export const MarkerLayer: FC<{ 
  data: Array<[number, number]>; 
  options: VisualizationOptions 
}> = ({ data, options }) => {
  const map = useMap();

  // Initialize marker layer
  useState(() => {
    if (!data.length) return;

    const markers = L.layerGroup();
    
    data.forEach(([lat, lng]) => {
      if (lat !== 0 || lng !== 0) { // Skip NULL_ISLAND
        const marker = L.circleMarker([lat, lng], {
          radius: options.markerSize,
          fillColor: '#4299e1',
          color: '#3182ce',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        });
        
        markers.addLayer(marker);
      }
    });
    
    markers.addTo(map);
    
    return () => {
      map.removeLayer(markers);
    };
  });

  return null;
};

// PathLayer component
export const PathLayer: FC<{ 
  coordinates: Array<{ lat: number; lng: number }>; 
  options: VisualizationOptions 
}> = ({ coordinates, options }) => {
  const map = useMap();

  // Initialize path layer
  useState(() => {
    if (!coordinates.length) return;

    const nullIsland = coordinates.find(coord => coord.lat === 0 && coord.lng === 0);
    if (!nullIsland) return;

    const paths = L.layerGroup();
    
    coordinates.forEach(coord => {
      if (coord.lat !== 0 || coord.lng !== 0) {
        const line = L.polyline([
          [nullIsland.lat, nullIsland.lng],
          [coord.lat, coord.lng]
        ], {
          color: options.pathColor,
          weight: 1,
          opacity: 0.5,
          smoothFactor: 1,
          dashArray: '5, 10'
        });
        
        paths.addLayer(line);
      }
    });
    
    paths.addTo(map);
    
    return () => {
      map.removeLayer(paths);
    };
  });

  return null;
};

// Main toolkit component
export const GpsVisualizationToolkit: FC<GpsVisualizationToolkitProps> = ({
  data,
  onOptionChange
}) => {
  const intl = useIntl();
  const [options, setOptions] = useState<VisualizationOptions>({
    showHeatmap: true,
    showMarkers: false,
    showPaths: false,
    markerSize: 8,
    pathColor: "#3b82f6"
  });

  // Handle option changes
  const handleOptionChange = (key: keyof VisualizationOptions, value: any) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    onOptionChange(newOptions);
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <Card className="p-4 bg-background/95 backdrop-blur shadow-lg max-w-xs">
        <h3 className="text-sm font-medium mb-3">
          {intl.formatMessage({ id: 'map.visualizationOptions' }) || 'Visualization Options'}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="showHeatmap" className="text-xs">
              {intl.formatMessage({ id: 'map.showHeatmap' }) || 'Heatmap'}
            </Label>
            <Switch
              id="showHeatmap"
              checked={options.showHeatmap}
              onCheckedChange={(checked) => handleOptionChange('showHeatmap', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="showMarkers" className="text-xs">
              {intl.formatMessage({ id: 'map.showMarkers' }) || 'Markers'}
            </Label>
            <Switch
              id="showMarkers"
              checked={options.showMarkers}
              onCheckedChange={(checked) => handleOptionChange('showMarkers', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="showPaths" className="text-xs">
              {intl.formatMessage({ id: 'map.showPaths' }) || 'Connection Paths'}
            </Label>
            <Switch
              id="showPaths"
              checked={options.showPaths}
              onCheckedChange={(checked) => handleOptionChange('showPaths', checked)}
            />
          </div>
          
          {options.showMarkers && (
            <div className="space-y-2">
              <Label htmlFor="markerSize" className="text-xs">
                {intl.formatMessage({ id: 'map.markerSize' }) || 'Marker Size'}
              </Label>
              <Slider
                id="markerSize"
                min={2}
                max={15}
                step={1}
                value={[options.markerSize]}
                onValueChange={(value) => handleOptionChange('markerSize', value[0])}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GpsVisualizationToolkit;