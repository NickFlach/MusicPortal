import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Ban } from "lucide-react";
import { Layout } from "@/components/Layout";

interface AdminUser {
  address: string;
  username: string;
  isAdmin: boolean;
}

export default function Admin() {
  const { toast } = useToast();
  
  const { data: users } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (address: string) => {
      await apiRequest("POST", `/api/admin/toggle/${address}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin status updated successfully",
      });
    },
  });

  return (
    <Layout>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Treasury Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              placeholder="Amount"
              className="max-w-xs"
            />
            <Button>Transfer PFORK</Button>
          </div>
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