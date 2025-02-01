import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Ban, Coins } from "lucide-react";
import { Layout } from "@/components/Layout";

interface AdminUser {
  address: string;
  username: string;
  isAdmin: boolean;
}

interface TreasuryData {
  address: string | null;
  totalRewards: number;
  rewardedUsers: number;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: treasury } = useQuery<TreasuryData>({
    queryKey: ["/api/admin/treasury"],
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (address: string) => {
      await apiRequest("POST", `/api/admin/toggle/${address}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Admin status updated successfully",
      });
    },
  });

  const setTreasuryMutation = useMutation({
    mutationFn: async (address: string) => {
      await apiRequest("POST", "/api/admin/treasury", { address });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/treasury"] });
      toast({
        title: "Success",
        description: "Treasury address set successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetTreasury = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const address = formData.get("treasuryAddress") as string;

    if (!address) {
      toast({
        title: "Error",
        description: "Please enter a treasury address",
        variant: "destructive",
      });
      return;
    }

    setTreasuryMutation.mutate(address);
    e.currentTarget.reset();
  };

  return (
    <Layout>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Treasury Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Current Treasury Address</p>
              <p className="text-sm text-muted-foreground break-all">
                {treasury?.address || "Not set"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{treasury?.rewardedUsers || 0}</p>
              <p className="text-sm text-muted-foreground">Users Rewarded</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Coins className="h-4 w-4" />
                <p className="font-medium">{treasury?.totalRewards || 0}</p>
              </div>
              <p className="text-sm text-muted-foreground">Total PFORK Distributed</p>
            </div>
          </div>

          <form onSubmit={handleSetTreasury} className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Set Treasury Address
                </label>
                <Input
                  name="treasuryAddress"
                  placeholder="Enter NEO X address"
                  required
                />
              </div>
              <Button type="submit" disabled={setTreasuryMutation.isPending}>
                Set Treasury
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => (
              <div key={user.address} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{user.username || "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">{user.address}</p>
                </div>
                <Button
                  variant={user.isAdmin ? "destructive" : "outline"}
                  onClick={() => toggleAdminMutation.mutate(user.address)}
                >
                  {user.isAdmin ? (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Remove Admin
                    </>
                  ) : (
                    "Make Admin"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}