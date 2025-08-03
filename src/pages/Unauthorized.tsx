import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  useEffect(() => {
    console.error('403 Error: User attempted to access unauthorized resource');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto text-center p-6">
        <div className="mb-6">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}