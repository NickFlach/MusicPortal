import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from 'wagmi';
import { Coins, Send } from "lucide-react";
import { useState } from "react";
import { getTreasuryContract, getPFORKTokenContract } from "@/lib/contracts";
import { config } from "@/config";

interface TreasuryData {
  address: string;
  pforkBalance: string;
  gasBalance: string;
  isCurrentManager: boolean;
}

export default function Treasury() {
  const { toast } = useToast();
  const { address } = useAccount();
  const [newTreasuryAddress, setNewTreasuryAddress] = useState("");

  // Get contract instances
  const treasuryContract = getTreasuryContract();
  const pforkContract = getPFORKTokenContract();

  // Fetch treasury data
  const { data: treasury } = useQuery<TreasuryData>({
    queryKey: ["/api/treasury"],
    queryFn: async () => {
      if (!address) throw new Error("No wallet connected");

      const [pforkBalance, gasBalance, owner] = await Promise.all([
        pforkContract.read.balanceOf([treasuryContract.address]),
        config.publicClient.getBalance({ address: treasuryContract.address }),
        treasuryContract.read.owner(),
      ]);

      return {
        address: treasuryContract.address,
        pforkBalance: (Number(pforkBalance) / 1e18).toString(),
        gasBalance: (Number(gasBalance) / 1e18).toString(),
        isCurrentManager: address === owner,
      };
    },
    enabled: !!address,
  });

  // Mutation for updating treasury address
  const updateTreasuryMutation = useMutation({
    mutationFn: async (newAddress: string) => {
      if (!address) throw new Error("No wallet connected");
      const { request } = await treasuryContract.simulate.transferTreasury([newAddress], {
        account: address,
      });
      return config.publicClient.writeContract(request);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Treasury address updated successfully",
      });
      setNewTreasuryAddress("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Treasury Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Treasury</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground break-all">
                {treasury?.address || "Loading..."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PFORK Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{treasury?.pforkBalance || "0"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GAS Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{treasury?.gasBalance || "0"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Treasury Management - Only visible to current treasury manager */}
        {treasury?.isCurrentManager && (
          <Card>
            <CardHeader>
              <CardTitle>Treasury Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">New Treasury Address</label>
                  <Input
                    value={newTreasuryAddress}
                    onChange={(e) => setNewTreasuryAddress(e.target.value)}
                    placeholder="Enter new treasury address"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to transfer treasury control?")) {
                      updateTreasuryMutation.mutate(newTreasuryAddress);
                    }
                  }}
                  disabled={!newTreasuryAddress || updateTreasuryMutation.isPending}
                >
                  Transfer Control
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PFORK Distribution Rules */}
        <Card>
          <CardHeader>
            <CardTitle>PFORK Token Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">One-time Rewards:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Upload a Song: 1 PFORK</li>
                <li>Create a Playlist: 2 PFORK</li>
                <li>Mint Playlist NFT: 3 PFORK</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Note: These rewards are one-time only per wallet address.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}