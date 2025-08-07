import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Shield, Lock, AlertTriangle } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { MfaVerification } from '@/components/auth/MfaVerification';

export default function Auth() {
  const { user, signIn, signUp, resetPassword, loading, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // MFA state
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from || '/app';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    Object.values(checks).forEach(check => check && score++);

    if (score < 3) return { strength: 'Weak', color: 'text-destructive', bgColor: 'bg-destructive' };
    if (score < 5) return { strength: 'Medium', color: 'text-orange-500', bgColor: 'bg-orange-500' };
    return { strength: 'Strong', color: 'text-green-500', bgColor: 'bg-green-500' };
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn(email, password, rememberMe);
      
      if (result.error) {
        setError(result.error.message);
        toast({
          title: "Sign In Failed",
          description: result.error.message,
          variant: "destructive",
        });
      } else if (result.requiresMfa) {
        setPendingUser(result.user);
        setShowMfaVerification(true);
        toast({
          title: "MFA Required",
          description: "Please enter your authentication code.",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    setShowMfaVerification(false);
    setPendingUser(null);
    toast({
      title: "Success",
      description: "Authentication completed successfully!",
    });
  };

  const handleMfaCancel = () => {
    setShowMfaVerification(false);
    setPendingUser(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('You must accept the terms and privacy policy to continue');
      setIsLoading(false);
      return;
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, fullName, captchaToken);
      
      if (error) {
        setError(error.message);
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        // Reset captcha on error
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      } else {
        setSuccessMessage('Please check your email to verify your account before signing in.');
        setActiveTab('signin');
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account.",
        });
        // Reset form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch (err: any) {
      setError(err.message);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSuccessMessage('Password reset instructions have been sent to your email.');
        toast({
          title: "Reset Email Sent",
          description: "Check your email for password reset instructions.",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (showMfaVerification && pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <MfaVerification
          onSuccess={handleMfaSuccess}
          onCancel={handleMfaCancel}
          userEmail={pendingUser.email || ''}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold">SecureLegal</h1>
          </div>
          <p className="text-muted-foreground">
            Your one and only secured Legal Document Platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="mt-4" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="mt-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label htmlFor="remember-me" className="text-sm">
                        Remember me for 30 days
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:underline p-0 h-auto"
                      onClick={() => setActiveTab('reset')}
                    >
                      Forgot Password?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {password && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Password strength:</span>
                          <span className={getPasswordStrength(password).color}>
                            {getPasswordStrength(password).strength}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getPasswordStrength(password).bgColor}`}
                            style={{
                              width: `${(Object.values({
                                length: password.length >= 12,
                                uppercase: /[A-Z]/.test(password),
                                lowercase: /[a-z]/.test(password),
                                numbers: /\d/.test(password),
                                symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
                              }).filter(Boolean).length / 5) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm">
                        I accept the{' '}
                        <a href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </a>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="privacy"
                        checked={privacyAccepted}
                        onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                      />
                      <Label htmlFor="privacy" className="text-sm">
                        I consent to the{' '}
                        <a href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </a>{' '}
                        and GDPR compliance
                      </Label>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test site key
                      onChange={(token) => setCaptchaToken(token)}
                      onExpired={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !termsAccepted || !privacyAccepted || !captchaToken}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="flex items-center justify-center">
                <Shield className="h-4 w-4 mr-1" />
                Secured with enterprise-grade encryption
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}