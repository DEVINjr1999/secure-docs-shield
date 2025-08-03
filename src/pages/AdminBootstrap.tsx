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
      // First check if user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        return;
      }

      // Check if already admin
      if (profile.role === 'admin') {
        toast({
          title: "Info",
          description: "User is already an admin",
        });
        return;
      }

      // Direct update to admin role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        toast({
          title: "Error",
          description: `Failed to promote user: ${updateError.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User promoted to admin successfully!",
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