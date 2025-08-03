import TemplateSelector from '@/components/TemplateSelector';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { ClientDashboard } from '@/components/dashboards/ClientDashboard';
import { LegalReviewerDashboard } from '@/components/dashboards/LegalReviewerDashboard';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { 
  Shield, 
  LogOut, 
  User
} from 'lucide-react';

export default function App() {
  const { user, profile, signOut, isRole } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'legal_reviewer':
        return 'default';
      case 'client':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderDashboard = () => {
    if (!profile) return null;
    
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'legal_reviewer':
        return <LegalReviewerDashboard />;
      case 'client':
      default:
        return <ClientDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-semibold truncate">SecureLegal Platform</h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium truncate max-w-32">{profile?.full_name || user?.email}</p>
                  <Badge variant={getRoleBadgeVariant(profile?.role || 'client')} className="text-xs">
                    {profile?.role || 'client'}
                  </Badge>
                </div>
              </div>
              
              {/* Mobile user info */}
              <div className="sm:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Welcome back, {profile?.full_name || 'User'}
                </CardTitle>
                <CardDescription>
                  Secure cybersecurity-focused legal document platform
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Account Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Account Status:</span>
                        <Badge variant={profile?.account_status === 'active' ? 'default' : 'destructive'}>
                          {profile?.account_status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Email Verified:</span>
                        <Badge variant={profile?.email_verified_at ? 'default' : 'destructive'}>
                          {profile?.email_verified_at ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">MFA Enabled:</span>
                        <Badge variant={profile?.mfa_enabled ? 'default' : 'secondary'}>
                          {profile?.mfa_enabled ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Security Info</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Last Login:</span>
                        <span className="text-sm text-muted-foreground">
                          {profile?.last_login_at 
                            ? new Date(profile.last_login_at).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Session Count:</span>
                        <span className="text-sm text-muted-foreground">
                          {profile?.session_count || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Failed Attempts:</span>
                        <span className="text-sm text-muted-foreground">
                          {profile?.failed_login_attempts || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Template Selection for Clients */}
          {profile?.role === 'client' && (
            <div className="space-y-4 sm:space-y-6">
              <TemplateSelector />
            </div>
          )}

            {/* Role-based Dashboard */}
            {renderDashboard()}
        </div>
      </main>
    </div>
  );
}