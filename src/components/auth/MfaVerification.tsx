import { useEffect, useState } from 'react';
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
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const prepareChallenge = async () => {
      try {
        setInitError('');
        // List factors and pick the first verified TOTP factor
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const totp = (factors?.totp || []).find((f: any) => f.status === 'verified') || factors?.totp?.[0];
        if (!totp?.id) {
          setInitError('Two-factor authentication is not set up for this account.');
          return;
        }
        setFactorId(totp.id);

        // Create a challenge once on mount and reuse it
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (challengeError) throw challengeError;
        if (!challengeData?.id) {
          setInitError('Failed to start authentication challenge. Please try again.');
          return;
        }
        setChallengeId(challengeData.id);
      } catch (e: any) {
        console.error('MFA init failed:', e);
        setInitError(e.message || 'Failed to initialize MFA. Please try again.');
      }
    };
    prepareChallenge();
  }, []);

  const verifyWithCode = async () => {
    if (!verificationCode || !factorId) return;
    setIsVerifying(true);
    try {
      let cid = challengeId;
      if (!cid) {
        // Re-create challenge if missing/expired
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;
        cid = challengeData?.id || null;
        setChallengeId(cid);
      }
      if (!cid) throw new Error('Unable to create verification challenge.');

      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: cid, code: verificationCode });
      if (verifyError) throw verifyError;

      toast({ title: 'MFA Verified', description: 'Authentication completed successfully.' });
      onSuccess();
    } catch (error: any) {
      console.error('MFA verify error:', error);
      setAttemptsLeft((n) => n - 1);
      let msg = error?.message || 'Failed to verify code';
      if (msg.includes('uuid: incorrect UUID length')) {
        msg = 'Challenge failed. We refreshed it — please enter your code again.';
        setChallengeId(null); // force refresh on next attempt
      }
      if (msg.toLowerCase().includes('invalid totp')) {
        msg = 'Invalid authentication code. Please check your authenticator app.';
      }
      toast({ title: 'Verification Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') verifyWithCode();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Enter your authentication code for {userEmail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(attemptsLeft < 3 || initError) && (
          <Alert variant={initError ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {initError ? initError : `${attemptsLeft} verification attempts remaining`}
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
            autoComplete="one-time-code"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={verifyWithCode} disabled={isVerifying || verificationCode.length !== 6 || !!initError} className="flex-1">
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
