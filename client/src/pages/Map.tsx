import { FC, useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Layout } from "@/components/Layout";
import { useIntl } from "react-intl";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { GpsVisualizationToolkit, MarkerLayer, PathLayer, HeatmapLayer } from "@/components/GpsVisualizationToolkit";
import { SINetStatus } from "@/components/SINetStatus";

// NULL_ISLAND coordinates [0,0]
const NULL_ISLAND_COORDS: [number, number] = [0, 0];

interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;
      listenerCount: number;
      anonCount: number;
    };
  };
  totalListeners: number;
  allLocations: Array<[number, number]>;
  sinetInfo?: {
    nullIslandStatus: 'online' | 'syncing' | 'offline';
    connectedNodes: number;
    syncPercentage: number;
  };
}

interface VisualizationOptions {
  showHeatmap: boolean;
  showMarkers: boolean;
  showPaths: boolean;
  markerSize: number;
  pathColor: string;
}

// Component to handle NULL_ISLAND special marker
const NullIslandMarker: FC = () => {
  const map = useMap();

  useEffect(() => {
    // Center the map on NULL_ISLAND on initial load
    map.setView(NULL_ISLAND_COORDS, 2);
  }, [map]);

  // Custom icon for NULL_ISLAND
  const nullIslandIcon = L.divIcon({
    html: `<div class="pulse-marker">
      <div class="marker-core"></div>
      <div class="marker-pulse"></div>
    </div>`,
    className: 'null-island-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <Marker 
      position={NULL_ISLAND_COORDS} 
      icon={nullIslandIcon}
      zIndexOffset={1000} // Ensure it's above other markers
    >
      <Tooltip permanent direction="top" offset={[0, -10]}>
        <div className="font-bold text-primary">NULL_ISLAND</div>
        <div className="text-xs">SINet Central Node</div>
      </Tooltip>
    </Marker>
  );
};

const MapPage: FC = () => {
  const { address } = useAccount();
  const { isSynced } = useMusicPlayer();
  const intl = useIntl();
  const [mapError, setMapError] = useState<string | null>(null);
  const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>({
    showHeatmap: true,
    showMarkers: false,
    showPaths: false,
    markerSize: 8,
    pathColor: "#3b82f6"
  });

  // Fetch map data with polling
  const { data: mapData, isLoading, error } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 15000, // Poll every 15 seconds
    queryFn: async () => {
      const headers: Record<string, string> = address
        ? { 'x-wallet-address': address }
        : { 'x-internal-token': 'landing-page' };

      const response = await fetch('/api/music/map', { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch map data: ${response.statusText}`);
      }
      return response.json();
    }
  });

  // Process locations for heatmap and markers
  const locationData = useMemo(() => {
    if (!mapData?.allLocations || !isSynced) return [];

    // Always include NULL_ISLAND in location data
    const locations = [...mapData.allLocations];
    if (!locations.some(loc => loc[0] === 0 && loc[1] === 0)) {
      locations.push(NULL_ISLAND_COORDS);
    }
    return locations;
  }, [mapData, isSynced]);

  const hasNoData = !isLoading && (!mapData || mapData.totalListeners === 0);

  // Check for leaflet.heat availability
  useEffect(() => {
    if (typeof (L as any).heatLayer !== 'function') {
      setMapError('Heatmap functionality not available');
      console.error('L.heatLayer is not defined');
    }

    // Add CSS for NULL_ISLAND pulse marker
    const style = document.createElement('style');
    style.innerHTML = `
      .pulse-marker {
        position: relative;
      }
      .marker-core {
        width: 12px;
        height: 12px;
        background: #FF5252;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        margin: -6px 0 0 -6px;
        z-index: 2;
        box-shadow: 0 0 8px rgba(255, 82, 82, 0.8);
      }
      .marker-pulse {
        width: 40px;
        height: 40px;
        background: rgba(255, 82, 82, 0.3);
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        margin: -20px 0 0 -20px;
        z-index: 1;
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% {
          transform: scale(0.5);
          opacity: 0.5;
        }
        70% {
          transform: scale(1.5);
          opacity: 0;
        }
        100% {
          transform: scale(0.5);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleVisualizationOptionsChange = (newOptions: VisualizationOptions) => {
    setVisualizationOptions(newOptions);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:py-6 max-w-full">
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold">
              {intl.formatMessage({ id: 'map.title' })}
            </h1>

            <div className="text-sm text-muted-foreground mt-1">
              {!isSynced ? (
                intl.formatMessage({ id: 'map.noActivity' })
              ) : error ? (
                <span className="text-red-500">
                  {intl.formatMessage(
                    { id: 'map.error' },
                    { error: (error as Error).message }
                  )}
                </span>
              ) : hasNoData ? (
                intl.formatMessage({ id: 'map.noData' })
              ) : (
                intl.formatMessage(
                  { id: 'map.totalListeners' },
                  { count: mapData.totalListeners }
                )
              )}
            </div>
          </div>

          {/* SINet Status Component */}
          <div className="w-full md:w-64">
            <SINetStatus />
          </div>
        </div>

        <Card className="p-2 md:p-4 bg-background">
          <div 
            className="relative w-full rounded-lg overflow-hidden"
            style={{ height: 'calc(100vh - 200px)' }}
          >
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 p-4 text-center">
                {mapError}
              </div>
            ) : (
              <MapContainer
                center={NULL_ISLAND_COORDS}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                minZoom={2}
                maxZoom={7}
                maxBounds={[[-90, -180], [90, 180]]}
                className="z-0"
                zoomControl={false}
              >
                <div className="absolute top-2 right-2 z-[1000]">
                  <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg">
                    <div className="leaflet-control-zoom leaflet-bar">
                      <button 
                        className="leaflet-control-zoom-in"
                        title="Zoom in"
                        aria-label="Zoom in"
                        onClick={() => {
                          const map = document.querySelector('.leaflet-container') as HTMLElement;
                          if (map && (map as any)._leaflet_map) {
                            (map as any)._leaflet_map.zoomIn();
                          }
                        }}
                      >+</button>
                      <button 
                        className="leaflet-control-zoom-out"
                        title="Zoom out"
                        aria-label="Zoom out"
                        onClick={() => {
                          const map = document.querySelector('.leaflet-container') as HTMLElement;
                          if (map && (map as any)._leaflet_map) {
                            (map as any)._leaflet_map.zoomOut();
                          }
                        }}
                      >−</button>
                    </div>
                  </div>
                </div>

                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  className="dark-tiles"
                />

                {/* Always show NULL_ISLAND marker */}
                <NullIslandMarker />

                {isSynced && locationData.length > 0 && (
                  <>
                    {visualizationOptions.showHeatmap && (
                      <HeatmapLayer data={locationData} />
                    )}

                    {visualizationOptions.showMarkers && (
                      <MarkerLayer 
                        data={locationData}
                        options={visualizationOptions}
                      />
                    )}

                    {visualizationOptions.showPaths && (
                      <PathLayer 
                        coordinates={locationData.map(([lat, lng]) => ({ lat, lng }))} 
                        options={visualizationOptions}
                      />
                    )}

                    <GpsVisualizationToolkit
                      data={locationData}
                      onOptionChange={handleVisualizationOptionsChange}
                    />
                  </>
                )}
              </MapContainer>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;