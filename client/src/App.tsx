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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();

  if (!address) {
    return <Redirect to="/landing" />;
  }

  return <Component />;
}

function Router() {
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
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;