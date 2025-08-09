import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityQuestionsSetup } from './SecurityQuestionsSetup';

export function MfaSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMfaStatus();
  }, [user]);

  const checkMfaStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('security_questions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      setIsMfaEnabled((data?.length || 0) >= 2);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handleDisableMfa = async () => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('Not authenticated');

      const { error: qErr } = await supabase
        .from('security_questions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (qErr) throw qErr;

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ mfa_enabled: false, mfa_method: null })
        .eq('user_id', user.id);
      if (pErr) throw pErr;

      setIsMfaEnabled(false);
      await refreshProfile();
      toast({
        title: "MFA Disabled",
        description: "Security questions MFA has been disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable MFA",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSetupComplete = async () => {
    setShowSetup(false);
    setIsMfaEnabled(true);
    await refreshProfile();
    await checkMfaStatus();
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
          <Badge variant={isMfaEnabled ? "default" : "secondary"}>
            {isMfaEnabled ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Disabled
              </>
            )}
          </Badge>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {isMfaEnabled 
              ? "Your account is protected with two-factor authentication. You'll be asked to answer your security questions when signing in."
              : "Add an extra layer of security by enabling two-factor authentication with security questions."
            }
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          {!isMfaEnabled ? (
            <Button onClick={() => setShowSetup(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Enable MFA
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleDisableMfa}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable MFA
            </Button>
          )}
        </div>

        {backupCodes.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              MFA has been successfully enabled! Make sure to save your backup codes in a secure location.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-2xl">
          <SecurityQuestionsSetup
            onComplete={handleMfaSetupComplete}
            onCancel={() => setShowSetup(false)}
            userEmail={user.email || ''}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}