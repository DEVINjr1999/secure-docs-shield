import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminReviewerPassword = Deno.env.get('ADMIN_REVIEWER_PASSWORD')!;
    
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_status', 'active')
      .is('deleted_at', null)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or legal_reviewer
    if (!['admin', 'legal_reviewer'].includes(profile.role)) {
      console.log('User role not authorized:', profile.role);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const isValidPassword = password === adminReviewerPassword;
    
    // Debug logging (remove in production)
    console.log('Password verification debug:', {
      providedPassword: password,
      storedPasswordExists: !!adminReviewerPassword,
      storedPasswordLength: adminReviewerPassword?.length || 0,
      passwordsMatch: isValidPassword
    });
    
    // Log the verification attempt
    await supabase.rpc('log_audit_event', {
      p_user_id: user.id,
      p_event: 'admin_password_verification',
      p_action_type: 'security',
      p_success: isValidPassword,
      p_metadata: {
        user_role: profile.role,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    console.log('Password verification:', { 
      userId: user.id, 
      role: profile.role, 
      success: isValidPassword 
    });

    return new Response(
      JSON.stringify({ 
        success: isValidPassword,
        error: isValidPassword ? null : 'Invalid password'
      }),
      { 
        status: isValidPassword ? 200 : 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-admin-password function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});