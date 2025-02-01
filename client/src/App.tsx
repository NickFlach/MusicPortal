import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Treasury from "@/pages/Treasury";
import Admin from "@/pages/Admin";
import Landing from "@/pages/Landing";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

function useWalletConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Wait for ethereum object to be injected
        if (typeof window.ethereum === 'undefined') {
          setIsInitializing(false);
          return;
        }

        const connected = window.ethereum.selectedAddress;
        setIsConnected(!!connected);
      } catch (error) {
        console.error('Wallet check error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setIsConnected(accounts.length > 0);
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  return { isConnected, isInitializing };
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isConnected, isInitializing } = useWalletConnection();

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return <Redirect to="/landing" />;
  }

  return <Component />;
}

function Router() {
  const { isConnected, isInitializing } = useWalletConnection();

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to landing if not on landing page and wallet is not connected
  if (!isConnected && window.location.pathname !== '/landing') {
    return <Redirect to="/landing" />;
  }

  return (
    <Switch>
      <Route path="/landing" component={Landing} />
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/treasury">
        <ProtectedRoute component={Treasury} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MusicPlayerProvider>
        <Router />
        <Toaster />
      </MusicPlayerProvider>
    </QueryClientProvider>
  );
}

export default App;