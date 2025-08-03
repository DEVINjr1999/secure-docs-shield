import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  LogOut, 
  User,
  FileText,
  Upload,
  Settings,
  ArrowLeft,
  Home
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  title?: string;
}

export default function AppLayout({ children, showBackButton = false, title }: AppLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Link to="/app">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
              )}
              <Link to="/app" className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">SecureLegal</h1>
              </Link>
              {title && (
                <div className="hidden md:block">
                  <span className="text-muted-foreground mx-2">•</span>
                  <span className="font-medium">{title}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
                  <Badge variant={getRoleBadgeVariant(profile?.role || 'client')} className="text-xs">
                    {profile?.role}
                  </Badge>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="md:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleSignOut}
                className="shrink-0 font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span className="sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Link to="/app">
              <Button 
                variant={isActive('/app') ? 'default' : 'ghost'} 
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            {profile?.role === 'client' && (
              <>
                <Link to="/app/documents">
                  <Button 
                    variant={location.pathname.startsWith('/app/documents') ? 'default' : 'ghost'} 
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    My Documents
                  </Button>
                </Link>
                <Link to="/app/upload">
                  <Button 
                    variant={isActive('/app/upload') ? 'default' : 'ghost'} 
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </Link>
                <Link to="/app/templates">
                  <Button 
                    variant={isActive('/app/templates') ? 'default' : 'ghost'} 
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </Link>
              </>
            )}
            
            {profile?.role === 'legal_reviewer' && (
              <Link to="/reviewer/dashboard">
                <Button 
                  variant={location.pathname.startsWith('/reviewer') ? 'default' : 'ghost'} 
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Review Documents
                </Button>
              </Link>
            )}
            
            {profile?.role === 'admin' && (
              <Link to="/admin/audit-logs">
                <Button 
                  variant={location.pathname.startsWith('/admin') ? 'default' : 'ghost'} 
                  size="sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            
            <Link to="/app/settings">
              <Button 
                variant={isActive('/app/settings') ? 'default' : 'ghost'} 
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  );
}