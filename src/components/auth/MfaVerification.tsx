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
    if (!verificationCode || (useBackupCode ? verificationCode.length !== 8 : verificationCode.length !== 6)) {
      toast({
        title: "Invalid Code",
        description: useBackupCode ? "Please enter an 8-character backup code" : "Please enter a 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.rpc('verify_mfa_code', {
        p_code: verificationCode,
        p_is_backup_code: useBackupCode
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string };

      if (!response.success) {
        setAttemptsLeft(prev => prev - 1);
        
        if (attemptsLeft <= 1) {
          toast({
            title: "Too Many Attempts",
            description: "Account temporarily locked. Please try again later.",
            variant: "destructive"
          });
          onCancel();
          return;
        }

        toast({
          title: "Invalid Code",
          description: `${response.error}. ${attemptsLeft - 1} attempts remaining.`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Verification Successful",
        description: "You have been successfully authenticated",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify code",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
      setVerificationCode('');
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
          <Label htmlFor="verification-code">
            {useBackupCode ? 'Backup Code' : 'Verification Code'}
          </Label>
          <Input
            id="verification-code"
            placeholder={useBackupCode ? "Enter 8-character backup code" : "Enter 6-digit code"}
            value={verificationCode}
            onChange={(e) => {
              const value = useBackupCode 
                ? e.target.value.toLowerCase().slice(0, 8)
                : e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
            }}
            onKeyPress={handleKeyPress}
            maxLength={useBackupCode ? 8 : 6}
            className="text-center text-lg tracking-widest font-mono"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center justify-center">
          <Button
            variant="link"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setVerificationCode('');
            }}
            className="text-sm"
          >
            {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleVerification} 
            disabled={isVerifying || verificationCode.length < (useBackupCode ? 8 : 6)}
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