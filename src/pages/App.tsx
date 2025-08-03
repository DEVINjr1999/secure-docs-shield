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
      {/* Optimized Header with better mobile layout */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title - Optimized for mobile */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Shield className="h-6 w-6 text-primary flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">SecureLegal</h1>
            </div>
            
            {/* User Info and Actions - Optimized layout */}
            <div className="flex items-center gap-3">
              {/* Desktop User Info */}
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium truncate max-w-32">
                    {profile?.full_name || user?.email}
                  </p>
                  <Badge variant={getRoleBadgeVariant(profile?.role || 'client')} className="text-xs">
                    {profile?.role || 'client'}
                  </Badge>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              {/* Mobile Avatar Only */}
              <div className="md:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              {/* Logout Button - More visible */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="shrink-0 bg-background border-border hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Optimized Main Content with better spacing */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border">
          <Button variant="default" size="sm" className="flex-1 sm:flex-none">
            <User className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          {profile?.role === 'client' && (
            <>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                New Document
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                Upload File
              </Button>
            </>
          )}
        </div>

        {/* Welcome Card - Simplified and mobile-optimized */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <User className="h-5 w-5 mr-2" />
              Welcome back, {profile?.full_name || 'User'}
            </CardTitle>
            <CardDescription>
              Secure legal document platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Account Status - Simplified */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Account Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={profile?.account_status === 'active' ? 'default' : 'destructive'}>
                      {profile?.account_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">MFA:</span>
                    <Badge variant={profile?.mfa_enabled ? 'default' : 'secondary'}>
                      {profile?.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Security Info - Simplified */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Security</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Login:</span>
                    <span className="text-xs text-muted-foreground">
                      {profile?.last_login_at 
                        ? new Date(profile.last_login_at).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sessions:</span>
                    <span className="text-xs text-muted-foreground">
                      {profile?.session_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Selection for Clients - Optimized */}
        {profile?.role === 'client' && (
          <div className="animate-fade-in">
            <TemplateSelector />
          </div>
        )}

        {/* Role-based Dashboard - Optimized */}
        <div className="animate-fade-in">
          {renderDashboard()}
        </div>
      </main>
    </div>
  );
}