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
import { initializeWeb3, subscribeToAccountChanges, Web3State } from "./lib/web3";

function useWalletConnection() {
  const [web3State, setWeb3State] = useState<Web3State | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const state = await initializeWeb3();
        setWeb3State(state);
      } catch (error) {
        console.error('Failed to initialize web3:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    const unsubscribe = subscribeToAccountChanges(async (accounts) => {
      setWeb3State(prev => ({
        ...prev!,
        isConnected: accounts.length > 0,
        address: accounts[0] || null
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected: web3State?.isConnected ?? false,
    isInitializing,
    address: web3State?.address
  };
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