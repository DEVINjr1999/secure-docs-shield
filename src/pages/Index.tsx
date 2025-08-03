import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, FileText, Users, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import TemplateSelector from '@/components/TemplateSelector';

const Index = () => {
  const { user, profile } = useAuth();
  
  // Debug logging
  console.log('Index page - User:', !!user);
  console.log('Index page - Profile:', profile);
  console.log('Index page - Role:', profile?.role);
  console.log('Index page - Should show template selector:', user && profile?.role === 'client');

  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Military-grade encryption and comprehensive audit trails for all document activities."
    },
    {
      icon: FileText,
      title: "Legal Document Management",
      description: "Specialized tools for legal professionals with version control and compliance tracking."
    },
    {
      icon: Lock,
      title: "Multi-Factor Authentication",
      description: "TOTP, WebAuthn, and SMS-based 2FA with role-based access control."
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Granular permissions for clients, legal reviewers, and administrators."
    },
    {
      icon: Activity,
      title: "Comprehensive Auditing",
      description: "Full audit trails for compliance with GDPR and Australian Privacy Principles."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold">SecureLegal</h1>
          </div>
          
          <h2 className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Cybersecurity-Focused Legal Document Platform with Enterprise-Grade Authentication
          </h2>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Built for legal professionals who need the highest levels of security, compliance, 
            and audit capabilities for sensitive document management.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/app">
                <Button size="lg" className="w-full sm:w-auto">
                  <Activity className="mr-2 h-5 w-5" />
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Lock className="mr-2 h-5 w-5" />
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {user && profile && (
            <div className="mt-8 p-4 bg-card rounded-lg border max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">Welcome back,</p>
              <p className="font-medium">{profile.full_name || user.email}</p>
              <Badge variant={profile.role === 'admin' ? 'destructive' : 'default'} className="mt-2">
                {profile.role}
              </Badge>
            </div>
          )}
        </div>
      </section>

      {/* Template Selection - Available to All Visitors */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Available Document Templates</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from our professionally crafted legal document templates. Sign up to get started with secure document management.
            </p>
          </div>
          <TemplateSelector />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Enterprise-Grade Security Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Designed specifically for cybersecurity-conscious legal professionals
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Uncompromising Security
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">HTTPS/SSL Enforcement</h3>
                    <p className="text-muted-foreground">End-to-end encryption for all data transmission</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Lock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">OWASP Protection</h3>
                    <p className="text-muted-foreground">Protection against XSS, CSRF, SQL injection, and other vulnerabilities</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Activity className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Comprehensive Auditing</h3>
                    <p className="text-muted-foreground">Complete audit trails for all user activities and system events</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Compliance Ready</h3>
                    <p className="text-muted-foreground">GDPR and Australian Privacy Principles compliance built-in</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Card className="p-8">
              <CardHeader className="text-center pb-6">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-2xl">Security Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Multi-Factor Authentication</span>
                  <Badge>Required</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Account Lockout Protection</span>
                  <Badge>Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Management</span>
                  <Badge>Secure</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Password Strength</span>
                  <Badge>Enforced</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Logging</span>
                  <Badge>Complete</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <span className="font-semibold">SecureLegal Platform</span>
          </div>
          <p className="text-muted-foreground">
            Cybersecurity-focused legal document management with enterprise-grade security
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
