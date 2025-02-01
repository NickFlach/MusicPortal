import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { connectWallet } from "@/lib/web3";
import { useLocation } from 'wouter';
import { useState, useEffect } from "react";

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setAddress(null);
          setLocation('/landing');
          toast({
            title: "Disconnected",
            description: "Wallet disconnected",
          });
        } else {
          setAddress(accounts[0]);
        }
      });
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', () => {
          console.log('Cleaned up account changes listener');
        });
      }
    };
  }, [setLocation, toast]);

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

      // Connect wallet
      const { address: userAddress } = await connectWallet();
      setAddress(userAddress);

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
      if (error instanceof Error) {
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
      // Clear local state
      setAddress(null);

      // Redirect to landing page
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