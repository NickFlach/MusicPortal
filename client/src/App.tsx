import { Switch, Route, Redirect } from "wouter";
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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();

  // Redirect to landing if no wallet connected
  if (!address) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const { address } = useAccount();

  // If on a protected route and wallet disconnects, redirect to landing
  if (!address && window.location.pathname !== '/') {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home">
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