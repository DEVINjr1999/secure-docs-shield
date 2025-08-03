import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, captchaToken?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  isRole: (role: string | string[]) => boolean;
  requiresMFA: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security headers and CSRF protection
const getSecurityHeaders = () => ({
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json',
});

// Get client info for audit logging
const getClientInfo = () => ({
  userAgent: navigator.userAgent,
  language: navigator.language,
  platform: navigator.platform,
  cookieEnabled: navigator.cookieEnabled,
  onLine: navigator.onLine,
  screen: {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

// Password strength validation
const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /123|234|345|456|567|678|789/, // Sequential numbers
    /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns and may be vulnerable');
      break;
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// Audit logging function
const logAuditEvent = async (
  event: string,
  actionType: 'auth' | 'profile' | 'security' | 'mfa',
  success: boolean = true,
  errorDetails?: string,
  metadata?: any
) => {
  try {
    const clientInfo = getClientInfo();
    
    await supabase.rpc('log_audit_event', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
      p_event: event,
      p_action_type: actionType,
      p_user_agent: clientInfo.userAgent,
      p_device_info: clientInfo,
      p_success: success,
      p_error_details: errorDetails,
      p_metadata: metadata,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile using secure function with fallback
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('fetchProfile: Attempting to fetch profile for userId:', userId);
      
      // Try RPC call with timeout
      const rpcPromise = supabase.rpc('get_user_profile', { p_user_id: userId });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 3000)
      );
      
      const result = await Promise.race([rpcPromise, timeoutPromise]);
      const { data, error } = result as any;

      if (error) throw error;

      const profile = data && data.length > 0 ? data[0] : null;
      if (profile) {
        console.log('fetchProfile: Profile data received via RPC:', profile);
        return profile;
      }
    } catch (error) {
      console.warn('RPC failed, using fallback profile:', error);
    }

    // Fallback: Create basic profile from user data
    const fallbackProfile: Profile = {
      id: crypto.randomUUID(),
      user_id: userId,
      full_name: user?.email || 'User',
      role: 'client',
      account_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      session_count: 0,
      last_activity_at: null,
      last_login_at: new Date().toISOString(),
      gdpr_consent_at: null,
      privacy_consent_at: null,
      mfa_enabled: false,
      locale: 'en',
      username: null,
      avatar_url: null,
      phone: null,
      recovery_email: null,
      terms_accepted_at: null,
      mfa_method: null,
      email_verified_at: null,
      is_compromised: false,
      account_locked_until: null,
      last_failed_login_at: null,
      timezone: 'UTC',
      failed_login_attempts: 0,
      mfa_verified_at: null
    };
    
    console.log('fetchProfile: Using fallback profile');
    return fallbackProfile;
  };

  // Check account security status
  const checkAccountSecurity = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_account_locked', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error checking account security:', error);
        return false;
      }

      return !data; // Return true if account is NOT locked
    } catch (error) {
      console.error('Error checking account security:', error);
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('Auth initialization starting...');
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, 'session exists:', !!session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('User found, fetching profile for:', session.user.id);
          // Check account security
          const isSecure = await checkAccountSecurity(session.user.id);
          if (!isSecure) {
            toast({
              title: "Account Security Alert",
              description: "Your account has been temporarily restricted due to security concerns.",
              variant: "destructive",
            });
            await signOut();
            return;
          }

          // Fetch profile using secure function
          const userProfile = await fetchProfile(session.user.id);
          console.log('Profile fetched:', userProfile);
          setProfile(userProfile);

          // Log successful authentication
          if (event === 'SIGNED_IN') {
            await logAuditEvent('login_success', 'auth', true, undefined, {
              method: 'email_password',
              session_id: session.access_token,
            });
            
            // Reset failed login attempts
            await supabase.rpc('reset_failed_login_attempts', {
              p_user_id: session.user.id,
            });
          }
        } else {
          console.log('No user, clearing profile');
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    console.log('Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Existing session check:', !!session, 'error:', error);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Existing session found, fetching profile...');
        fetchProfile(session.user.id).then((profile) => {
          console.log('Profile from existing session:', profile);
          setProfile(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Activity tracking
  useEffect(() => {
    if (!user) return;

    const updateActivity = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    };

    // Update activity every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);
    
    // Update activity on page focus
    const handleFocus = () => updateActivity();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Inactivity timeout (30 minutes)
  useEffect(() => {
    if (!user) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        toast({
          title: "Session Expired",
          description: "You have been automatically logged out due to inactivity.",
        });
        await logAuditEvent('session_expired', 'security', true, undefined, {
          reason: 'inactivity_timeout',
        });
        await signOut();
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };
  }, [user]);

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Check for rate limiting here (could be implemented with a service)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        await logAuditEvent('login_failure', 'auth', false, error.message, {
          email,
          method: 'email_password',
        });

        // Increment failed login attempts if user exists
        if (data?.user) {
          await supabase.rpc('increment_failed_login', {
            p_user_id: data.user.id,
          });
        }

        return { error };
      }

      return { error: null };
    } catch (error: any) {
      await logAuditEvent('login_error', 'auth', false, error.message);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, captchaToken?: string) => {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return {
          error: {
            message: passwordValidation.errors.join('. '),
          },
        };
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
          captchaToken,
        },
      });

      if (error) {
        await logAuditEvent('signup_failure', 'auth', false, error.message, {
          email,
          method: 'email_password',
        });
        return { error };
      }

      await logAuditEvent('signup_success', 'auth', true, undefined, {
        email,
        method: 'email_password',
        user_id: data.user?.id,
      });

      return { error: null };
    } catch (error: any) {
      await logAuditEvent('signup_error', 'auth', false, error.message);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting signOut process...');
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      console.log('Local state cleared, calling supabase signOut...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      console.log('SignOut successful');
      
      // Try to log audit event but don't block on it
      try {
        await logAuditEvent('logout', 'auth', true);
      } catch (auditError) {
        console.warn('Failed to log audit event:', auditError);
      }
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still clear local state even if signOut failed
      setUser(null);
      setSession(null);
      setProfile(null);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        await logAuditEvent('password_reset_failure', 'auth', false, error.message, { email });
        return { error };
      }

      await logAuditEvent('password_reset_requested', 'auth', true, undefined, { email });
      return { error: null };
    } catch (error: any) {
      await logAuditEvent('password_reset_error', 'auth', false, error.message);
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        await logAuditEvent('profile_update_failure', 'profile', false, error.message);
        return { error };
      }

      await logAuditEvent('profile_update_success', 'profile', true, undefined, {
        updated_fields: Object.keys(updates),
      });

      // Refresh profile
      await refreshProfile();
      return { error: null };
    } catch (error: any) {
      await logAuditEvent('profile_update_error', 'profile', false, error.message);
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const userProfile = await fetchProfile(user.id);
    setProfile(userProfile);
  };

  const isRole = (role: string | string[]): boolean => {
    if (!profile) return false;
    
    if (Array.isArray(role)) {
      return role.includes(profile.role);
    }
    
    return profile.role === role;
  };

  const requiresMFA = (): boolean => {
    if (!profile) return false;
    
    // Admin and legal_reviewer roles require MFA
    if (['admin', 'legal_reviewer'].includes(profile.role)) {
      return true;
    }
    
    // Check if user has explicitly enabled MFA
    return profile.mfa_enabled;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
    isRole,
    requiresMFA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}