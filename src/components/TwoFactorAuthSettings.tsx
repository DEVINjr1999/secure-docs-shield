import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TwoFactorAuthSettingsProps {
  profile: any;
}

export default function TwoFactorAuthSettings({ profile }: TwoFactorAuthSettingsProps) {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(profile?.mfa_enabled || false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [factorId, setFactorId] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle2FA = (checked: boolean) => {
    if (checked && !isEnabled) {
      setShowEnableDialog(true);
      setStep('setup');
    } else if (!checked && isEnabled) {
      setShowDisableDialog(true);
    }
  };

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
        setStep('verify');
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

  const handleVerifyAndEnable = async () => {
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
      // Verify the enrollment with Supabase
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        code: verificationCode,
        challengeId: '', // For enrollment, challengeId is not needed
      });

      if (error) {
        throw error;
      }

      // Update profile to track MFA status
      await updateProfile({
        mfa_enabled: true,
        mfa_verified_at: new Date().toISOString()
      });

      setIsEnabled(true);
      setShowEnableDialog(false);
      setVerificationCode('');
      setQrCodeUrl('');
      setFactorId('');

      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled!"
      });
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
  };

  const createDisableChallenge = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        toast({
          title: "Error",
          description: "No MFA factor found.",
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
      console.error('Error creating disable challenge:', error);
      toast({
        title: "Error",
        description: "Failed to initialize MFA verification.",
        variant: "destructive"
      });
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
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
        description: "MFA challenge not initialized. Please try again.",
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

      // Verify the code first
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId,
        code: disableCode
      });

      if (verifyError) {
        throw verifyError;
      }

      // Unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id
      });

      if (unenrollError) {
        throw unenrollError;
      }

      // Update profile
      await updateProfile({
        mfa_enabled: false,
        mfa_verified_at: null
      });

      setIsEnabled(false);
      setShowDisableDialog(false);
      setDisableCode('');
      setChallengeId('');

      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled."
      });
    } catch (error) {
      console.error('MFA disable error:', error);
      toast({
        title: "Error",
        description: "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">2FA Status</p>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle2FA}
            disabled={isLoading}
          />
        </div>

        {/* Enable MFA Dialog */}
        <Dialog open={showEnableDialog} onOpenChange={(open) => {
          setShowEnableDialog(open);
          if (open && step === 'setup') {
            generateTOTPSecret();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                {step === 'setup' 
                  ? "Scan the QR code with your authenticator app"
                  : "Enter the code from your authenticator app to complete setup"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {step === 'setup' ? (
                <div className="flex flex-col items-center space-y-4">
                  {qrCodeUrl && (
                    <div className="p-4 bg-white rounded-lg border">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  )}
                </div>
              ) : (
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
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnableDialog(false);
                    setStep('setup');
                    setVerificationCode('');
                    setQrCodeUrl('');
                    setFactorId('');
                  }}
                >
                  Cancel
                </Button>
                {step === 'setup' ? (
                  <Button onClick={() => setStep('verify')} disabled={!qrCodeUrl}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    onClick={handleVerifyAndEnable}
                    disabled={isLoading || verificationCode.length !== 6}
                  >
                    {isLoading ? "Enabling..." : "Enable 2FA"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Disable MFA Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={(open) => {
          setShowDisableDialog(open);
          if (open) {
            createDisableChallenge();
          } else {
            setChallengeId('');
            setDisableCode('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Disable Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Enter your current verification code to disable 2FA. This will make your account less secure.
              </DialogDescription>
            </DialogHeader>
            
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
                <p className="text-sm text-muted-foreground">
                  Enter the code from your authenticator app
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDisableDialog(false);
                    setDisableCode('');
                    setChallengeId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisable2FA}
                  disabled={isLoading || disableCode.length !== 6}
                >
                  {isLoading ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}