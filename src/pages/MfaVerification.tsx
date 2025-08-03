import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { authenticator } from 'otplib';
import CryptoJS from 'crypto-js';

// Configure otplib for browser compatibility
authenticator.options = {
  crypto: {
    createHmac: (algorithm: string, key: string | Buffer) => {
      const keyWordArray = typeof key === 'string' 
        ? CryptoJS.enc.Base32.parse(key)
        : CryptoJS.lib.WordArray.create(key);
      
      return {
        update: (data: string) => {
          const hmac = CryptoJS.HmacSHA1(data, keyWordArray);
          return {
            digest: () => {
              const hex = hmac.toString(CryptoJS.enc.Hex);
              const bytes = new Uint8Array(hex.length / 2);
              for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
              }
              return bytes;
            }
          };
        }
      };
    }
  }
};

export default function MfaVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { profile, updateProfile } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from || '/app';

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.mfa_secret) {
      toast({
        title: "Error",
        description: "MFA is not properly configured. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if it's a backup code first
      if (profile.backup_codes && profile.backup_codes.includes(verificationCode.toUpperCase())) {
        // Remove used backup code
        const updatedBackupCodes = profile.backup_codes.filter(
          code => code !== verificationCode.toUpperCase()
        );
        
        await updateProfile({
          backup_codes: updatedBackupCodes,
          mfa_verified_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "Backup code verified successfully"
        });
        navigate(from, { replace: true });
        return;
      }

      // Verify TOTP code
      const isValid = authenticator.verify({
        token: verificationCode,
        secret: profile.mfa_secret
      });

      if (!isValid) {
        toast({
          title: "Error",
          description: "Invalid verification code. Please try again.",
          variant: "destructive"
        });
        return;
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
        description: "Error verifying code. Please try again.",
        variant: "destructive"
      });
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
              Enter the code from your authenticator app or use a backup code
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