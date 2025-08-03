import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  documentId: string;
  originalDocumentId: string;
  version: number;
  title: string;
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with user auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { documentId, originalDocumentId, version, title, userEmail }: NotificationRequest = await req.json();
    
    // Validate request payload
    if (!documentId || !originalDocumentId || !title) {
      console.error('Missing required fields in request');
      return new Response(
        JSON.stringify({ error: 'Bad Request: Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing revision notification for document ${documentId}, version ${version}`);

    // Get the assigned reviewer for the original document
    const { data: originalDoc, error: docError } = await supabaseClient
      .from('documents')
      .select('assigned_reviewer_id, user_id')
      .eq('id', originalDocumentId)
      .single();

    if (docError) {
      console.error('Error fetching original document:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user has permission to send notifications for this document
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isDocumentOwner = originalDoc.user_id === user.id;
    const isAssignedReviewer = originalDoc.assigned_reviewer_id === user.id;

    if (!isAdmin && !isDocumentOwner && !isAssignedReviewer) {
      console.error('User lacks permission for this document');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all admin users for notification
    const { data: admins, error: adminError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin')
      .eq('account_status', 'active')
      .is('deleted_at', null);

    if (adminError) {
      console.error('Error fetching admins:', adminError);
    }

    // Log notifications in audit logs for tracking
    const notifications = [];

    // Notify assigned reviewer
    if (originalDoc.assigned_reviewer_id) {
      notifications.push({
        user_id: originalDoc.assigned_reviewer_id,
        event: 'document_revision_submitted',
        action_type: 'notification',
        document_id: documentId,
        metadata: {
          document_id: documentId,
          original_document_id: originalDocumentId,
          document_title: title,
          version: version,
          submitted_by: userEmail,
          message: `New revision (v${version}) of "${title}" has been submitted for review.`
        }
      });
    }

    // Notify admins
    if (admins) {
      for (const admin of admins) {
        notifications.push({
          user_id: admin.user_id,
          event: 'document_revision_submitted',
          action_type: 'notification',
          document_id: documentId,
          metadata: {
            document_id: documentId,
            original_document_id: originalDocumentId,
            document_title: title,
            version: version,
            submitted_by: userEmail,
            message: `New document revision (v${version}) of "${title}" requires review.`
          }
        });
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('audit_logs')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to send notifications' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log(`Successfully sent ${notifications.length} notifications for document ${documentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications sent successfully',
        notificationCount: notifications.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in send-revision-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);