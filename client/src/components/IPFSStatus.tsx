import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudOff, CloudCog, Check, AlertTriangle } from "lucide-react";

interface IPFSStatusResponse {
  status: 'ok' | 'partial' | 'error';
  message: string;
  fallbackMode?: boolean;
  publicGateways?: boolean;
  authenticated?: boolean;
  customGateway?: string;
  connectionStatus?: {
    connected: boolean;
    lastConnected: string | null;
    retryCount: number;
  };
}

export function IPFSStatus() {
  const { data, isLoading, error } = useQuery<IPFSStatusResponse>({
    queryKey: ['/api/ipfs/health'],
    retry: false,
    refetchInterval: 30000, // Check every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-4 flex items-center gap-2">
          <CloudCog size={18} className="text-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">Checking IPFS connection...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4 border-destructive/20 bg-destructive/5">
        <CardContent className="pt-4 flex items-center gap-2">
          <CloudOff size={18} className="text-destructive" />
          <span className="text-sm text-destructive">IPFS connection unavailable</span>
        </CardContent>
      </Card>
    );
  }

  // Determine status and display accordingly
  let statusUI;
  if (data?.status === 'ok') {
    statusUI = (
      <div className="flex items-center gap-2">
        <Check size={18} className="text-green-500" />
        <span className="text-sm">IPFS: Connected to Pinata</span>
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Authenticated</Badge>
      </div>
    );
  } else if (data?.status === 'partial' && data?.fallbackMode) {
    statusUI = (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <span className="text-sm">IPFS: Using custom gateway</span>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">Fallback Mode</Badge>
        </div>
        {data?.customGateway && (
          <div className="text-xs text-muted-foreground ml-6">
            Gateway: {data.customGateway}
          </div>
        )}
      </div>
    );
  } else {
    statusUI = (
      <div className="flex items-center gap-2">
        <CloudOff size={18} className="text-destructive" />
        <span className="text-sm text-destructive">IPFS: Configuration issue</span>
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        {statusUI}
      </CardContent>
    </Card>
  );
}