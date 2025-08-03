import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, LogOut } from 'lucide-react';

export default function Suspended() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    console.error('Account suspended: User account has been suspended');
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto text-center p-6">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been temporarily suspended. Please contact support for assistance or try again later.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleSignOut} 
            variant="outline"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}