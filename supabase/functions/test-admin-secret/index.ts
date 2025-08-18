import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Get environment variables
    const adminReviewerPassword = Deno.env.get('ADMIN_REVIEWER_PASSWORD');
    
    console.log('Secret test:', {
      secretExists: !!adminReviewerPassword,
      secretLength: adminReviewerPassword?.length || 0,
      secretValue: adminReviewerPassword || '[NOT SET]'
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        secretExists: !!adminReviewerPassword,
        secretLength: adminReviewerPassword?.length || 0,
        // Only show first 3 chars for security
        secretPreview: adminReviewerPassword ? adminReviewerPassword.substring(0, 3) + '...' : '[NOT SET]'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in test-admin-secret function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});