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
import Rooms from "@/pages/Rooms";
import Room from "@/pages/Room";
import { useAccount } from 'wagmi';
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();

  if (!address) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const { address } = useAccount();

  // Only redirect if we're not already on the landing page
  if (!address && window.location.pathname !== '/') {
    window.location.href = '/';
    return null;
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
      <Route path="/rooms">
        <ProtectedRoute component={Rooms} />
      </Route>
      <Route path="/rooms/:id">
        <ProtectedRoute component={Room} />
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