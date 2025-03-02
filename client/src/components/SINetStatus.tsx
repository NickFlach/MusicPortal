import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, Activity } from 'lucide-react';

interface SINetInfo {
  nullIslandStatus: 'online' | 'syncing' | 'offline';
  connectedNodes: number;
  syncPercentage: number;
}

interface MapData {
  sinetInfo?: SINetInfo;
  countries: Record<string, any>;
  totalListeners: number;
  allLocations: Array<[number, number]>;
}

export function SINetStatus() {
  const { data: mapData, isLoading, error } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 10000, // Poll every 10 seconds
    queryFn: async () => {
      const response = await fetch('/api/music/map');
      if (!response.ok) {
        throw new Error(`Failed to fetch SINet data: ${response.statusText}`);
      }
      return response.json();
    }
  });

  // Status badge component with appropriate color and icon
  const StatusBadge = ({ status }: { status: 'online' | 'syncing' | 'offline' }) => {
    switch (status) {
      case 'online':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <Wifi className="h-3 w-3 mr-1" /> Online
          </Badge>
        );
      case 'syncing':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Activity className="h-3 w-3 mr-1 animate-pulse" /> Syncing
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <WifiOff className="h-3 w-3 mr-1" /> Offline
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full bg-card/60 backdrop-blur-sm border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <span className="mr-2">SINet Status</span>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !mapData?.sinetInfo) {
    return (
      <Card className="w-full bg-card/60 backdrop-blur-sm border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <span className="mr-2">SINet Status</span>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              <WifiOff className="h-3 w-3 mr-1" /> Disconnected
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const { nullIslandStatus, connectedNodes, syncPercentage } = mapData.sinetInfo;

  return (
    <Card className="w-full bg-card/60 backdrop-blur-sm border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>SINet Status</span>
          <StatusBadge status={nullIslandStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">NULL_ISLAND Sync</span>
            <span className="font-medium">{syncPercentage}%</span>
          </div>
          <Progress value={syncPercentage} className="h-1" />
          
          <div className="flex justify-between items-center text-xs pt-1">
            <span className="text-muted-foreground">Connected Nodes</span>
            <span className="font-medium">{connectedNodes}</span>
          </div>

          <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <span className="font-mono">SIN://0.0.0.0</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
