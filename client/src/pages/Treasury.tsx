import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { getBalance } from "@/lib/web3";

export default function Treasury() {
  const { data: treasuryBalance } = useQuery({
    queryKey: ["/api/treasury/balance"],
  });

  return (
    <Layout>
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
          <CardHeader>
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
    </Layout>
  );
}