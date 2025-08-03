import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AdminBootstrap() {
  const [userId, setUserId] = useState('5797da1c-10a1-46cb-af5d-16ea802948b0');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    setLoading(true);
    try {
      // Use secure RPC function instead of direct database update
      const { data, error } = await supabase.rpc('promote_to_admin', {
        p_user_id: userId
      });

      if (error) {
        console.error('Promotion error:', error);
        toast({
          title: "Error",
          description: `Failed to promote user: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to promote user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: result.message || "User promoted successfully",
      });

    } catch (error) {
      console.error('Bootstrap error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bootstrap Admin</CardTitle>
          <CardDescription>
            Create the first admin user for the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID to promote"
            />
          </div>
          <Button 
            onClick={handleCreateAdmin} 
            disabled={loading || !userId}
            className="w-full"
          >
            {loading ? "Creating Admin..." : "Create Admin"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}