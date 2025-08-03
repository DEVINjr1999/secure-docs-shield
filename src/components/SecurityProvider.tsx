import { createContext, useContext, useEffect, ReactNode } from 'react';
import { sanitizeInput, detectSuspiciousActivity, SecurityEventTypes } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SecurityContextType {
  sanitizeInput: typeof sanitizeInput;
  reportSuspiciousActivity: (input: string, context: string) => void;
  validateInput: (input: string) => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Monitor for suspicious activity
  const reportSuspiciousActivity = async (input: string, context: string) => {
    if (detectSuspiciousActivity(input)) {
      try {
        await supabase.rpc('log_audit_event', {
          p_user_id: user?.id || null,
          p_event: SecurityEventTypes.SUSPICIOUS_ACTIVITY,
          p_action_type: 'security',
          p_success: false,
          p_error_details: 'Suspicious input detected',
          p_metadata: {
            input_context: context,
            input_length: input.length,
            detected_patterns: 'XSS/SQL injection attempt'
          }
        });

        toast({
          title: "Security Alert",
          description: "Suspicious activity detected and logged.",
          variant: "destructive",
        });
      } catch (error) {
        console.error('Failed to log security event:', error);
      }
    }
  };

  // Validate input for security
  const validateInput = (input: string): boolean => {
    const isSuspicious = detectSuspiciousActivity(input);
    if (isSuspicious) {
      reportSuspiciousActivity(input, 'input_validation');
      return false;
    }
    return true;
  };

  // Set up global error monitoring
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Log potential security-related errors
      if (event.error?.message?.includes('script') || 
          event.error?.message?.includes('eval') ||
          event.error?.message?.includes('XSS')) {
        reportSuspiciousActivity(event.error.message, 'global_error_handler');
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [user]);

  const value = {
    sanitizeInput,
    reportSuspiciousActivity,
    validateInput,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}