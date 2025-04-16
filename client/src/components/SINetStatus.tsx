import { FC, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SINetStatusData {
  nullIslandStatus: 'online' | 'syncing' | 'offline';
  connectedNodes: number;
  syncPercentage: number;
}

export const SINetStatus: FC = () => {
  const intl = useIntl();
  const [animate, setAnimate] = useState(false);

  // Fetch SINet status
  const { data, isLoading } = useQuery<SINetStatusData>({
    queryKey: ['/api/music/sinet-status'],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Trigger animation when data changes
  useEffect(() => {
    if (data) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.connectedNodes, data?.syncPercentage]);

  // Helper function to get status color
  const getStatusColor = (status: 'online' | 'syncing' | 'offline') => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'syncing': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Helper function to get status text
  const getStatusText = (status: 'online' | 'syncing' | 'offline') => {
    switch (status) {
      case 'online': return intl.formatMessage({ id: 'sinet.online' }) || 'Online';
      case 'syncing': return intl.formatMessage({ id: 'sinet.syncing' }) || 'Syncing';
      case 'offline': return intl.formatMessage({ id: 'sinet.offline' }) || 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="bg-background/80 backdrop-blur shadow-md">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {intl.formatMessage({ id: 'sinet.status' }) || 'SINet Status'}
        </h3>
        
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded w-full mt-2"></div>
          </div>
        ) : data ? (
          <div className={`space-y-3 ${animate ? 'animate-flash' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs">NULL_ISLAND</span>
              <Badge className={`${getStatusColor(data.nullIslandStatus)} text-white`}>
                {getStatusText(data.nullIslandStatus)}
              </Badge>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>{intl.formatMessage({ id: 'sinet.connectedNodes' }, { count: data.connectedNodes }) || `${data.connectedNodes} Nodes`}</span>
                <span>{data.syncPercentage}%</span>
              </div>
              <Progress value={data.syncPercentage} className="h-1" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'sinet.noData' }) || 'No data available'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SINetStatus;