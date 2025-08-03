import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, Key, Copy, RefreshCw } from "lucide-react";
import * as OTPAuth from "otplib";
import QRCode from "qrcode";

interface TwoFactorAuthSettingsProps {
  profile: any;
}

export default function TwoFactorAuthSettings({ profile }: TwoFactorAuthSettingsProps) {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupStep, setSetupStep] = useState<'generate' | 'verify'>('generate');
  
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const generateTOTPSecret = async () => {
    const secret = OTPAuth.authenticator.generateSecret();
    const userEmail = profile?.user_id || 'user@example.com';
    const appName = 'Legal Document Manager';
    
    const otpauth = OTPAuth.authenticator.keyuri(userEmail, appName, secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    
    setTotpSecret(secret);
    setQrCodeUrl(qrCode);
    
    // Generate backup codes
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
    setBackupCodes(codes);
  };

  const handleEnable2FA = async () => {
    if (!showSetupDialog) {
      setShowSetupDialog(true);
      setSetupStep('generate');
      await generateTOTPSecret();
      return;
    }

    if (setupStep === 'generate') {
      setSetupStep('verify');
      return;
    }

    // Verify the code
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    const isValid = OTPAuth.authenticator.verify({
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

    setIsEnabling(true);
    try {
      const { error } = await updateProfile({
        mfa_enabled: true,
        mfa_method: 'totp',
        mfa_verified_at: new Date().toISOString()
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to enable 2FA",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Two-factor authentication has been enabled successfully"
        });
        setShowSetupDialog(false);
        setSetupStep('generate');
        setVerificationCode('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!showDisableDialog) {
      setShowDisableDialog(true);
      return;
    }

    if (!disableCode || disableCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code to disable 2FA",
        variant: "destructive"
      });
      return;
    }

    setIsDisabling(true);
    try {
      const { error } = await updateProfile({
        mfa_enabled: false,
        mfa_method: null,
        mfa_verified_at: null
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to disable 2FA",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Two-factor authentication has been disabled"
        });
        setShowDisableDialog(false);
        setDisableCode('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsDisabling(false);
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-medium">2FA Status</p>
          <p className="text-sm text-muted-foreground">
            {profile.mfa_enabled 
              ? "Two-factor authentication is enabled for enhanced security" 
              : "Add an extra layer of security to your account"}
          </p>
          {profile.mfa_method && (
            <p className="text-sm text-muted-foreground">
              Method: {profile.mfa_method.toUpperCase()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={profile.mfa_enabled ? "default" : "secondary"}>
            {profile.mfa_enabled ? "Enabled" : "Disabled"}
          </Badge>
          
          <Switch
            checked={profile.mfa_enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                handleEnable2FA();
              } else {
                handleDisable2FA();
              }
            }}
            disabled={isEnabling || isDisabling}
          />
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {setupStep === 'generate' ? 'Set Up Two-Factor Authentication' : 'Verify Your Setup'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'generate' 
                ? "Scan the QR code with your authenticator app or enter the secret key manually."
                : "Enter the 6-digit code from your authenticator app to complete setup."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {setupStep === 'generate' ? (
              <>
                {qrCodeUrl && (
                  <div className="flex justify-center">
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

                <div className="space-y-2">
                  <Label>Backup Codes</Label>
                  <p className="text-sm text-muted-foreground">
                    Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
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
              </>
            ) : (
              <div className="space-y-4">
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
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-start">
            {setupStep === 'generate' ? (
              <>
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEnable2FA}>
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSetupStep('generate')}>
                  Back
                </Button>
                <Button onClick={handleEnable2FA} disabled={isEnabling}>
                  {isEnabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enable 2FA
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra security layer from your account. Enter your current 2FA code to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <InputOTP value={disableCode} onChange={setDisableCode} maxLength={6}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}