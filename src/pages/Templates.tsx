import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import TemplateSelector from '@/components/TemplateSelector';
import { 
  Shield, 
  LogOut, 
  User,
  FileText,
  Upload,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Templates() {
  const { user, profile, signOut } = useAuth();

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Templates">
      <div className="container mx-auto px-4 py-4">

        {/* Page Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <FileText className="h-6 w-6 mr-3" />
              Document Templates
            </CardTitle>
            <CardDescription>
              Choose from professionally crafted legal document templates. Select a template to get started with secure document creation.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Template Selector */}
        <TemplateSelector />
      </div>
    </AppLayout>
  );
}