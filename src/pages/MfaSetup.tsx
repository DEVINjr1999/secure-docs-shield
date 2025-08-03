import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft, Smartphone, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
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

const generateSecureSecret = () => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    
    while (bits >= 5) {
      result += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += base32Chars[(value << (5 - bits)) & 31];
  }
  
  return result;
};

export default function MfaSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { updateProfile, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'generate' | 'verify'>('generate');
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const from = location.state?.from || '/app';

  const generateTOTPSecret = async () => {
    try {
      const secret = generateSecureSecret();
      const userEmail = profile?.user_id || 'user@example.com';
      const appName = 'SecureLegal';
      
      const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
      const qrCode = await QRCode.toDataURL(otpauth);
      
      setTotpSecret(secret);
      setQrCodeUrl(qrCode);
      
      const codes = Array.from({ length: 8 }, () => {
        const bytes = new Uint8Array(3);
        crypto.getRandomValues(bytes);
        return Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      });
      setBackupCodes(codes);
    } catch (error) {
      console.error('Error generating TOTP secret:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    toast({
      title: "MFA Setup Skipped",
      description: "You can set up MFA later in your settings.",
    });
    navigate(from, { replace: true });
  };

  const handleSetup = async () => {
    if (step === 'generate') {
      setIsLoading(true);
      await generateTOTPSecret();
      setStep('verify');
      setIsLoading(false);
    } else {
      if (!verificationCode || verificationCode.length !== 6) {
        toast({
          title: "Error",
          description: "Please enter a valid 6-digit code",
          variant: "destructive"
        });
        return;
      }

      try {
        const isValid = authenticator.verify({
          token: verificationCode,
          secret: totpSecret
        });

        if (!isValid) {
          toast({
            title: "Error",
            description: "Invalid verification code. Please try again.",
            variant: "destructive"
          });
          return;
        }

        setIsLoading(true);
        const { error } = await updateProfile({
          mfa_enabled: true,
          mfa_method: 'totp',
          mfa_verified_at: new Date().toISOString(),
          mfa_secret: totpSecret,
          backup_codes: backupCodes
        });

        if (error) {
          toast({
            title: "Error",
            description: error.message || "Failed to enable MFA",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success",
            description: "Multi-factor authentication has been enabled successfully"
          });
          navigate(from, { replace: true });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard"
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>
            {step === 'generate' ? 'Set Up Multi-Factor Authentication' : 'Verify Your Setup'}
          </CardTitle>
          <CardDescription>
            {step === 'generate' 
              ? "Enhance your account security with two-factor authentication"
              : "Enter the code from your authenticator app to complete setup"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'generate' ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Multi-factor authentication adds an extra layer of security to your account by requiring a second form of verification.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleSetup}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Generating..." : "Generate QR Code"}
                </Button>
                
                <Button 
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full"
                >
                  Skip for Now
                </Button>
                
                <Button 
                  onClick={() => navigate(-1)}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </>
          ) : (
            <>
              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeUrl} alt="QR Code" className="border rounded-lg" />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Manual Entry Key</Label>
                <div className="flex items-center gap-2">
                  <Input value={totpSecret} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(totpSecret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {backupCodes.length > 0 && (
                <div className="space-y-2">
                  <Label>Backup Codes</Label>
                  <p className="text-sm text-muted-foreground">
                    Save these backup codes in a secure location.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                    {backupCodes.map((code, index) => (
                      <code key={index} className="text-sm font-mono">{code}</code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    className="w-full"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All Backup Codes
                  </Button>
                </div>
              )}

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
              
              <div className="space-y-3">
                <Button 
                  onClick={handleSetup}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {isLoading ? "Verifying..." : "Enable MFA"}
                </Button>
                
                <Button 
                  onClick={() => setStep('generate')}
                  variant="outline"
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}