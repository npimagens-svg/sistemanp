// Supabase Edge Function: create-salon
// Creates a salon + profile + admin role for the authenticated user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user via anon client + provided JWT
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("create-salon: auth.getUser failed", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName ?? "").trim();
    const salonName = String(body?.salonName ?? "").trim();

    if (fullName.length < 2 || salonName.length < 2) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Idempotency: if profile already exists, return its salon_id
    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("salon_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      console.error("create-salon: failed checking existing profile", existingProfileError);
      return new Response(JSON.stringify({ error: "Failed checking existing profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingProfile?.salon_id) {
      return new Response(JSON.stringify({ salonId: existingProfile.salon_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create salon
    const { data: salon, error: salonError } = await adminClient
      .from("salons")
      .insert({ name: salonName })
      .select("id")
      .single();

    if (salonError || !salon?.id) {
      console.error("create-salon: failed creating salon", salonError);
      return new Response(JSON.stringify({ error: "Failed creating salon" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: user.id,
      salon_id: salon.id,
      full_name: fullName,
    });

    if (profileError) {
      console.error("create-salon: failed creating profile", profileError);
      return new Response(JSON.stringify({ error: "Failed creating profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: user.id,
      salon_id: salon.id,
      role: "admin",
    });

    if (roleError) {
      console.error("create-salon: failed creating role", roleError);
      return new Response(JSON.stringify({ error: "Failed creating role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ salonId: salon.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-salon: unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
