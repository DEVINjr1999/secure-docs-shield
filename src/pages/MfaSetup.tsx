import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MfaSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from || '/app';

  const handleSkip = () => {
    toast({
      title: "MFA Setup Skipped",
      description: "You can set up MFA later in your settings.",
    });
    navigate(from, { replace: true });
  };

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement MFA setup logic
      toast({
        title: "MFA Setup",
        description: "MFA setup is not yet implemented. Continuing without MFA.",
      });
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up MFA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Set Up Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Enhance your account security with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Multi-factor authentication adds an extra layer of security to your account by requiring a second form of verification.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleSetup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Setting up..." : "Set Up MFA"}
            </Button>
            
            <Button 
              onClick={handleSkip}
              variant="outline"
              className="w-full"
            >
              Skip for Now
            </Button>
            
            <Button 
              onClick={() => navigate(-1)}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}