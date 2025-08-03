import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function MfaSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { updateProfile } = useAuth();
  const [step, setStep] = useState<'generate' | 'verify'>('generate');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string>('');

  const from = location.state?.from || '/app';

  const generateTOTPSecret = async () => {
    try {
      setIsLoading(true);
      
      // Use Supabase native MFA enrollment
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'LegalDoc Authenticator'
      });

      if (error) {
        throw error;
      }

      if (data) {
        setQrCodeUrl(data.totp.qr_code);
        setFactorId(data.id);
      }
    } catch (error) {
      console.error('Error generating TOTP secret:', error);
      toast({
        title: "Error",
        description: "Failed to generate MFA setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    if (step === 'generate') {
      await generateTOTPSecret();
      setStep('verify');
    } else {
      if (!verificationCode || verificationCode.length !== 6) {
        toast({
          title: "Error",
          description: "Please enter a valid 6-digit code",
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);
      try {
        console.log('Verifying MFA enrollment with factorId:', factorId, 'code length:', verificationCode.length);
        
        // Verify the enrollment with Supabase - use challengeId as factorId for enrollment
        const { data, error } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: factorId,
          code: verificationCode
        });

        if (error) {
          console.error('MFA verification error:', error);
          throw error;
        }

        console.log('MFA verification successful:', data);

        // Update profile to track MFA status
        await updateProfile({
          mfa_enabled: true,
          mfa_verified_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "MFA has been successfully configured!"
        });
        navigate(from, { replace: true });
      } catch (error) {
        console.error('MFA setup error:', error);
        toast({
          title: "Error",
          description: "Invalid verification code. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
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
            Set up two-factor authentication to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'generate' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the button below to generate your MFA setup
              </p>
              <Button 
                onClick={handleSetup}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Generating..." : "Generate QR Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* QR Code Display */}
              <div className="flex flex-col items-center space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use your authenticator app to scan this QR code
                  </p>
                </div>
                
                {qrCodeUrl && (
                  <div className="p-4 bg-white rounded-lg border">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              {/* Verification */}
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
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              
              <Button 
                onClick={handleSetup}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full"
              >
                {isLoading ? "Verifying..." : "Complete Setup"}
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
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