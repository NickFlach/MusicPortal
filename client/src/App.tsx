import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Treasury from "@/pages/Treasury";
import Admin from "@/pages/Admin";
import Landing from "@/pages/Landing";
import { useWallet } from '@/hooks/use-wallet';

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isConnected } = useWallet();

  if (!isConnected) {
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
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;