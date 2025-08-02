import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, originalDocumentId, version, title, userEmail }: NotificationRequest = await req.json();

    console.log(`Processing revision notification for document ${documentId}, version ${version}`);

    // Get the assigned reviewer for the original document
    const { data: originalDoc, error: docError } = await supabaseClient
      .from('documents')
      .select('assigned_reviewer_id, user_id')
      .eq('id', originalDocumentId)
      .single();

    if (docError) {
      console.error('Error fetching original document:', docError);
      throw docError;
    }

    // Get reviewer profile
    let reviewerEmail = null;
    if (originalDoc.assigned_reviewer_id) {
      const { data: reviewerProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', originalDoc.assigned_reviewer_id)
        .single();

      if (reviewerProfile) {
        // Get reviewer's email from auth.users (this would need admin access)
        // For now, we'll just log the notification
        console.log(`Would notify reviewer ${originalDoc.assigned_reviewer_id} about revision`);
      }
    }

    // Get all admin users for notification
    const { data: admins, error: adminError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin')
      .eq('account_status', 'active');

    if (adminError) {
      console.error('Error fetching admins:', adminError);
    }

    // Log notifications in audit logs for tracking
    const notifications = [];

    // Notify assigned reviewer
    if (originalDoc.assigned_reviewer_id) {
      notifications.push({
        user_id: originalDoc.assigned_reviewer_id,
        event: 'document_revision_notification',
        action_type: 'notification',
        document_id: documentId,
        metadata: {
          notification_type: 'revision_submitted',
          version,
          original_document_id: originalDocumentId,
          title,
          user_email: userEmail
        }
      });
    }

    // Notify admins
    if (admins) {
      for (const admin of admins) {
        notifications.push({
          user_id: admin.user_id,
          event: 'document_revision_notification',
          action_type: 'notification',
          document_id: documentId,
          metadata: {
            notification_type: 'revision_submitted',
            version,
            original_document_id: originalDocumentId,
            title,
            user_email: userEmail
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
        throw insertError;
      }
    }

    // TODO: In a real implementation, you would integrate with an email service
    // like Resend to send actual email notifications to reviewers and admins
    
    console.log(`Successfully processed ${notifications.length} notifications for document revision`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        message: 'Revision notifications processed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-revision-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);