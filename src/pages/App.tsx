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
  User,
  FileText,
  Upload,
  Settings,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

  // Simple loading state - no infinite loading
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Fixed Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">SecureLegal</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{profile.full_name || user?.email}</p>
                  <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                    {profile.role}
                  </Badge>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="md:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                </Avatar>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Simplified Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-card rounded-lg border">
          <Link to="/app" className="flex-1 sm:flex-none">
            <Button variant="default" size="sm" className="w-full">
              <User className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          
          {profile.role === 'client' && (
            <>
              <Link to="/app/documents" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  My Documents
                </Button>
              </Link>
              <Link to="/app/upload" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </Link>
              <Link to="/app/documents/new" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  New Document
                </Button>
              </Link>
            </>
          )}
          
          <Link to="/app/settings" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Welcome Section - Simplified */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="h-5 w-5 mr-2" />
              Welcome back, {profile.full_name || 'User'}
            </CardTitle>
            <CardDescription>
              Account Status: <Badge variant={profile.account_status === 'active' ? 'default' : 'destructive'}>
                {profile.account_status}
              </Badge>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Templates Preview for Clients */}
        {profile.role === 'client' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Document Templates
              </CardTitle>
              <CardDescription>
                Quick access to legal document templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => window.location.href = '/app/upload?template=contract'}>
                  <h4 className="font-medium">Contract Template</h4>
                  <p className="text-sm text-muted-foreground">Legal contract forms</p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => window.location.href = '/app/upload?template=agreement'}>
                  <h4 className="font-medium">Agreement Template</h4>
                  <p className="text-sm text-muted-foreground">Service agreements</p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => window.location.href = '/app/upload?template=nda'}>
                  <h4 className="font-medium">NDA Template</h4>
                  <p className="text-sm text-muted-foreground">Non-disclosure agreements</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/app/upload" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </Link>
                <Link to="/app/documents" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View All Documents
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role-Based Content */}
        {profile.role === 'client' && <ClientDashboard />}
        {profile.role === 'legal_reviewer' && <LegalReviewerDashboard />}
        {profile.role === 'admin' && <AdminDashboard />}
      </div>
    </div>
  );
}