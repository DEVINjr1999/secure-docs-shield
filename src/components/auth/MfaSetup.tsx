import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MfaSetupProps {
  onComplete: (backupCodes: string[]) => void;
  onCancel: () => void;
  userEmail: string;
}

export function MfaSetup({ onComplete, onCancel, userEmail }: MfaSetupProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const { toast } = useToast();

  const generateSecret = async () => {
    setIsGenerating(true);
    try {
      // Enroll a new TOTP factor
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (enrollError) throw enrollError;

      setFactorId(enrollData.id);
      setQrCodeUrl(enrollData.totp.qr_code);
      setSecret(enrollData.totp.secret);
      setStep('verify');
    } catch (error: any) {
      console.error('MFA Enrollment Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate MFA secret",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyAndSetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the TOTP code and complete enrollment
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: '', // Not needed for TOTP verification during enrollment
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      // Update profile to mark MFA as enabled
      await supabase
        .from('profiles')
        .update({ mfa_enabled: true })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      // Generate mock backup codes (Supabase doesn't provide these automatically)
      const mockBackupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      
      setBackupCodes(mockBackupCodes);
      setStep('complete');
      
      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully enabled",
      });
    } catch (error: any) {
      console.error('MFA Verification Error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup MFA",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast({
      title: "Copied",
      description: "Secret key copied to clipboard",
    });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });
  };

  if (step === 'generate') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center gap-2 justify-center">
            <Shield className="h-5 w-5" />
            Setup Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              We'll generate a secure secret that you can use with authenticator apps like Google Authenticator, Authy, or 1Password.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button 
              onClick={generateSecret} 
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Secret
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan the QR code or enter the secret manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />}
          </div>
          
          <div className="space-y-2">
            <Label>Manual Entry Secret</Label>
            <div className="flex gap-2">
              <Input value={secret} readOnly className="font-mono text-sm" />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copySecret}
                className="flex-shrink-0"
              >
                {copiedSecret ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={verifyAndSetup} 
              disabled={isVerifying || verificationCode.length !== 6}
              className="flex-1"
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">MFA Successfully Enabled!</CardTitle>
          <CardDescription>
            Save your backup codes in a secure location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              These backup codes can be used to access your account if you lose your authenticator device. Store them securely!
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Backup Codes</Label>
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes.map((code, index) => (
                <Badge key={index} variant="secondary" className="font-mono justify-center">
                  {code}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={() => onComplete(backupCodes)} className="w-full">
            Complete Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}