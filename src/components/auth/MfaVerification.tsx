import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MfaVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
  userEmail: string;
}

export function MfaVerification({ onSuccess, onCancel, userEmail }: MfaVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const { toast } = useToast();

  const handleVerification = async () => {
    if (!verificationCode) return;

    setIsVerifying(true);
    try {
      console.log('MFA Verification: Starting verification process');
      
      // Get the user's MFA factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      console.log('MFA Verification: Factors response:', { factors, factorsError });
      
      if (factorsError) {
        console.error('MFA Verification: Error getting factors:', factorsError);
        throw factorsError;
      }
      
      const totpFactor = factors?.totp?.[0];
      console.log('MFA Verification: TOTP factor:', totpFactor);
      
      if (!totpFactor || !totpFactor.id) {
        console.error('MFA Verification: No valid TOTP factor found');
        throw new Error('No MFA factor found. Please set up 2FA first.');
      }

      // Create a challenge
      console.log('MFA Verification: Creating challenge for factor:', totpFactor.id);
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      console.log('MFA Verification: Challenge response:', { challengeData, challengeError });
      
      if (challengeError) {
        console.error('MFA Verification: Challenge error:', challengeError);
        throw challengeError;
      }

      if (!challengeData || !challengeData.id) {
        console.error('MFA Verification: Invalid challenge data:', challengeData);
        throw new Error('Failed to create authentication challenge. Please try again.');
      }

      console.log('MFA Verification: Challenge created successfully, ID:', challengeData.id);

      // Verify the code
      console.log('MFA Verification: Verifying code with challenge ID:', challengeData.id);
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: verificationCode
      });

      console.log('MFA Verification: Verify response:', { verifyData, verifyError });

      if (verifyError) {
        console.error('MFA Verification: Verify error:', verifyError);
        throw verifyError;
      }

      console.log('MFA Verification: Success!');
      onSuccess();
    } catch (error: any) {
      console.error('MFA Verification: Full error:', error);
      setAttemptsLeft(prev => prev - 1);
      
      let errorMessage = error.message || "Failed to verify code";
      
      // Provide better error messages for common issues
      if (errorMessage.includes('uuid: incorrect UUID length')) {
        errorMessage = "Authentication challenge failed. Please try again or contact support if this persists.";
      } else if (errorMessage.includes('Invalid TOTP code')) {
        errorMessage = "Invalid authentication code. Please check your authenticator app and try again.";
      } else if (errorMessage.includes('No MFA factor found')) {
        errorMessage = "Two-factor authentication is not set up. Please set up 2FA first.";
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerification();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enter your authentication code for {userEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attemptsLeft < 3 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {attemptsLeft} verification attempts remaining
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyPress={handleKeyPress}
            maxLength={6}
            className="text-center text-lg tracking-widest font-mono"
            autoComplete="off"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleVerification} 
            disabled={isVerifying || verificationCode.length !== 6}
            className="flex-1"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}