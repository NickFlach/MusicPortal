import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";

export function WalletConnect() {
  const { address, isConnected, connect, disconnect } = useWallet();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        window.open('https://metamask.io/download/', '_blank');
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask to connect your wallet",
          variant: "destructive",
        });
        return;
      }

      await connect();
      
      toast({
        title: "Connected",
        description: "Wallet connected successfully!",
      });
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully!",
    });
  };

  return (
    <div>
      {!isConnected ? (
        <Button onClick={handleConnect}>Connect Wallet</Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}
