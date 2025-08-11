
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, message: "Server not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const getClientInfo = () => ({
      ip: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    // Helper to return OK with a failure payload for expected errors
    const okFail = (message: string, extra: Record<string, unknown> = {}) =>
      new Response(JSON.stringify({ success: false, message, ...extra }), {
        status: 200,
        headers: corsHeaders,
      });

    if (action === "init") {
      const email = (body.email || "").toString().trim().toLowerCase();

      // Return 200 with failure for invalid email so client gets a proper payload
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return okFail("Please provide a valid email.");
      }

      // Use admin.generateLink to get user details without sending an email
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      if (linkError || !linkData?.user?.id) {
        // Avoid user enumeration
        return okFail("Security questions are not available for this account.");
      }

      const userId = linkData.user.id as string;

      const { data: questions, error: qErr } = await supabase
        .from("security_questions")
        .select("id, question")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(2);

      if (qErr || !questions || questions.length < 2) {
        return okFail("Security questions are not available for this account.");
      }

      // Log audit event
      await supabase.from("audit_logs").insert({
        event: "password_reset_questions_init",
        action_type: "security",
        success: true,
        metadata: { email, questions_returned: questions.length, client: getClientInfo() },
      });

      return new Response(
        JSON.stringify({ success: true, user_id: userId, questions }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (action === "reset") {
      const user_id = (body.user_id || "").toString();
      const answers = Array.isArray(body.answers) ? body.answers : [];
      const new_password = (body.new_password || "").toString();

      if (!user_id || answers.length < 2) {
        return okFail("Invalid request.");
      }

      if (new_password.length < 12) {
        return okFail("Password must be at least 12 characters.");
      }

      // Verify answers using secure RPC
      const { data: verified, error: vErr } = await supabase.rpc("verify_security_answers", {
        p_user_id: user_id,
        p_answers: answers.map((a: any) => ({ id: a.id, answer: String(a.answer || "") })),
      });

      if (vErr || !verified) {
        // Log failed attempt
        await supabase.from("audit_logs").insert({
          user_id,
          event: "password_reset_questions_failed",
          action_type: "security",
          success: false,
          metadata: { reason: vErr?.message || "verification_failed", client: getClientInfo() },
        });

        return okFail("Verification failed. Please check your answers.");
      }

      // Update password via Admin API
      const { error: updErr } = await supabase.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (updErr) {
        await supabase.from("audit_logs").insert({
          user_id,
          event: "password_reset_questions_update_failed",
          action_type: "security",
          success: false,
          metadata: { error: updErr.message, client: getClientInfo() },
        });

        // Treat as expected failure for client UX
        return okFail("Could not update password. Try again later.");
      }

      // Invalidate existing sessions
      await supabase.rpc("invalidate_user_sessions", {
        p_user_id: user_id,
        p_reason: "password_reset_questions",
      });

      // Log success
      await supabase.from("audit_logs").insert({
        user_id,
        event: "password_reset_questions_success",
        action_type: "security",
        success: true,
        metadata: { client: getClientInfo() },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully." }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Unsupported action as a handled failure (200)
    return okFail("Unsupported action");
  } catch (e) {
    // Unexpected server error
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
