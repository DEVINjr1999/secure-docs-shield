import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AdminSecretTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testSecret = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-admin-secret', {});
      
      if (error) {
        console.error('Test function error:', error);
        toast({
          title: "Test Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('Test result:', data);
      setResult(data);
      
      toast({
        title: "Test Complete",
        description: `Secret exists: ${data.secretExists}`,
      });
    } catch (error) {
      console.error('Error testing secret:', error);
      toast({
        title: "Error",
        description: "Failed to test secret",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin Secret Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testSecret} disabled={loading}>
          {loading ? 'Testing...' : 'Test Admin Secret'}
        </Button>
        
        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Test Result:</h4>
            <div className="space-y-1 text-sm">
              <div>Secret Exists: {result.secretExists ? 'Yes' : 'No'}</div>
              <div>Secret Length: {result.secretLength}</div>
              <div>Secret Preview: {result.secretPreview}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}