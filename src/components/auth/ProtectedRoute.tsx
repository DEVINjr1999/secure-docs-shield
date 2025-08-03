import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireMFA?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  requireMFA = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, isRole, requiresMFA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute: loading=', loading, 'user=', !!user, 'profile=', !!profile);
    if (loading) return;

    // Redirect to auth if not authenticated
    if (!user) {
      console.log('ProtectedRoute: No user, redirecting to auth');
      navigate('/auth', { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    // Wait for profile to load
    if (!profile) return;

    // Check if account is active
    if (profile.account_status !== 'active') {
      navigate('/auth/suspended', { replace: true });
      return;
    }

    // Check role requirements
    if (requiredRole && !isRole(requiredRole)) {
      navigate('/unauthorized', { replace: true });
      return;
    }

    // Check MFA requirements
    const needsMFA = requireMFA || requiresMFA();
    if (needsMFA && !profile.mfa_verified_at) {
      navigate('/mfa/setup', { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }
  }, [user, profile, loading, navigate, location, requiredRole, requireMFA, isRole, requiresMFA]);

  // Show loading state
  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show content if all checks pass
  if (user && profile.account_status === 'active') {
    const needsMFA = requireMFA || requiresMFA();
    if (!needsMFA || profile.mfa_verified_at) {
      const hasRequiredRole = !requiredRole || isRole(requiredRole);
      if (hasRequiredRole) {
        return <>{children}</>;
      }
    }
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    </div>
  );
}