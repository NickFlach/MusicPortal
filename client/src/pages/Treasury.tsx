import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletConnect } from "@/components/WalletConnect";
import { getBalance } from "@/lib/web3";

export default function Treasury() {
  const { data: treasuryBalance } = useQuery({
    queryKey: ["/api/treasury/balance"],
    queryFn: async () => {
      const res = await fetch("/api/treasury/balance");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Treasury
          </h1>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto pt-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>PFORK Token Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{treasuryBalance?.pfork || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <img 
                src="/neo_token_logo_flaukowski.png" 
                alt="NEO Token"
                className="w-8 h-8 rounded-full"
              />
              <CardTitle>NEO Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{treasuryBalance?.neo || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Vote Weight</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-3xl font-bold">{treasuryBalance?.voteWeight || 0}</p>
                <p className="text-sm text-muted-foreground">
                  Based on PFORK token holdings
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}