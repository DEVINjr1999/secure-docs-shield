import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function MfaVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { updateProfile } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string>('');

  const from = location.state?.from || '/app';

  const createChallenge = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        toast({
          title: "Error",
          description: "MFA is not properly configured. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (error) {
        throw error;
      }

      setChallengeId(data.id);
    } catch (error) {
      console.error('Error creating MFA challenge:', error);
      toast({
        title: "Error",
        description: "Failed to initialize MFA verification. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create challenge on component mount
  useState(() => {
    createChallenge();
  });

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    if (!challengeId) {
      toast({
        title: "Error",
        description: "MFA challenge not initialized. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        throw new Error('No TOTP factor found');
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId,
        code: verificationCode
      });

      if (error) {
        throw error;
      }

      // Update MFA verification timestamp
      await updateProfile({
        mfa_verified_at: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "MFA verification successful"
      });
      navigate(from, { replace: true });
    } catch (error) {
      console.error('MFA verification error:', error);
      toast({
        title: "Error",
        description: "Invalid verification code. Please try again.",
        variant: "destructive"
      });
      // Create a new challenge for retry
      createChallenge();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // For now, allow skipping MFA (this should be configurable)
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Enter your 6-digit authentication code to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Verification Code</Label>
            <InputOTP value={verificationCode} onChange={setVerificationCode} maxLength={6}>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-sm text-muted-foreground">
              Enter the code from your authenticator app
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleVerify}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
            
            <Button 
              onClick={handleSkip}
              variant="outline"
              className="w-full"
            >
              Skip for Now
            </Button>
            
            <Button 
              onClick={() => navigate('/auth')}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}