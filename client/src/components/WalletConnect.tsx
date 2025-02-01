import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from 'wouter';

export function WalletConnect() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const handleConnect = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        window.open('https://metamask.io/download/', '_blank');
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask to connect your wallet",
          variant: "destructive",
        });
        return;
      }

      // First connect the wallet and wait for it to complete
      await connect({ 
        connector: injected({
          target: 'metaMask'
        })
      });

      // Wait a brief moment for the wallet address to be available
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Try to register user after connection
        const response = await apiRequest("POST", "/api/users/register");
        const userData = await response.json();
        console.log('User registered:', userData);

        // Redirect to home page if on landing
        if (location === '/landing') {
          setLocation('/');
        }

        toast({
          title: "Connected",
          description: "Wallet connected successfully!",
        });
      } catch (error) {
        console.error('User registration error:', error);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      if (error instanceof Error && !error.message.includes('Failed to get wallet address')) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      // Redirect to landing page on disconnect
      setLocation('/landing');
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
      {!address ? (
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