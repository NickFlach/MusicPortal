import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function WalletConnect() {
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
      toast({
        title: "Connected",
        description: "Wallet connected successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Disconnected",
        description: "Wallet disconnected successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      {!account.address ? (
        <Button onClick={handleConnect}>Connect Wallet</Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
          </span>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}