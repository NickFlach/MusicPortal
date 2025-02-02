import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig } from 'wagmi';
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/web3";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Treasury from "@/pages/Treasury";
import Admin from "@/pages/Admin";
import Landing from "@/pages/Landing";
import { useAccount } from 'wagmi';
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!address) {
      setLocation('/');
    }
  }, [address, setLocation]);

  if (!address) {
    return null;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If we have an address and we're on the landing page, redirect to home
    if (address && window.location.pathname === '/') {
      setLocation('/home');
    }
  }, [address, setLocation]);

  // Don't redirect away from landing if already here
  if (address && window.location.pathname === '/') return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicRoute component={Landing} />
      </Route>
      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/treasury">
        <ProtectedRoute component={Treasury} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <MusicPlayerProvider>
          <Router />
          <Toaster />
        </MusicPlayerProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;