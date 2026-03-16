import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth via x-webhook-key header
    const webhookKey = req.headers.get("x-webhook-key");
    if (!webhookKey) {
      return new Response(JSON.stringify({ error: "Missing x-webhook-key header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate webhook key
    const { data: configData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "webhook_api_key")
      .maybeSingle();

    if (!configData?.value || configData.value !== webhookKey) {
      return new Response(JSON.stringify({ error: "Invalid webhook key" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get salon_id (first salon)
    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .limit(1)
      .single();

    if (!salon) {
      return new Response(JSON.stringify({ error: "No salon found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const salonId = salon.id;
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ===== LIST SERVICES =====
      case "list_services": {
        const { data, error } = await supabase
          .from("services")
          .select("id, name, duration_minutes, price, category, is_active")
          .eq("salon_id", salonId)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        return json({ services: data });
      }

      // ===== LIST PROFESSIONALS =====
      case "list_professionals": {
        const { data, error } = await supabase
          .from("professionals")
          .select("id, name, nickname, specialty, is_active, has_schedule")
          .eq("salon_id", salonId)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        return json({ professionals: data });
      }

      // ===== SEARCH CLIENT =====
      case "search_client": {
        const { phone, name, email } = body;
        let query = supabase
          .from("clients")
          .select("id, name, phone, email")
          .eq("salon_id", salonId);

        if (phone) query = query.eq("phone", phone);
        else if (email) query = query.eq("email", email);
        else if (name) query = query.ilike("name", `%${name}%`);
        else return json({ error: "Provide phone, name or email" }, 400);

        const { data, error } = await query;
        if (error) throw error;
        return json({ clients: data });
      }

      // ===== CREATE CLIENT =====
      case "create_client": {
        const { name, phone, email, notes, tags } = body;
        if (!name) return json({ error: "name is required" }, 400);

        const { data, error } = await supabase
          .from("clients")
          .insert({
            salon_id: salonId,
            name,
            phone: phone || null,
            email: email || null,
            notes: notes || null,
            tags: tags || [],
          })
          .select("id, name, phone, email")
          .single();

        if (error) throw error;
        return json({ client: data });
      }

      // ===== CREATE APPOINTMENT =====
      case "create_appointment": {
        const { client_id, professional_id, service_id, scheduled_at, duration_minutes, notes, price } = body;

        if (!professional_id) return json({ error: "professional_id is required" }, 400);
        if (!scheduled_at) return json({ error: "scheduled_at is required (ISO 8601)" }, 400);

        // If service_id provided, fetch defaults
        let finalDuration = duration_minutes || 30;
        let finalPrice = price;
        if (service_id && !duration_minutes) {
          const { data: svc } = await supabase
            .from("services")
            .select("duration_minutes, price")
            .eq("id", service_id)
            .single();
          if (svc) {
            finalDuration = svc.duration_minutes;
            if (finalPrice === undefined) finalPrice = svc.price;
          }
        }

        const { data, error } = await supabase
          .from("appointments")
          .insert({
            salon_id: salonId,
            client_id: client_id || null,
            professional_id,
            service_id: service_id || null,
            scheduled_at,
            duration_minutes: finalDuration,
            notes: notes || null,
            price: finalPrice ?? null,
            status: "scheduled",
          })
          .select("id, scheduled_at, duration_minutes, status, notes, price")
          .single();

        if (error) throw error;
        return json({ appointment: data });
      }

      // ===== ADD CREDIT =====
      case "add_credit": {
        const { client_id, credit_amount, min_purchase_amount, expires_in_days } = body;
        if (!client_id) return json({ error: "client_id is required" }, 400);
        if (!credit_amount || credit_amount <= 0) return json({ error: "credit_amount must be > 0" }, 400);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 90));

        const { data, error } = await supabase
          .from("client_credits")
          .insert({
            salon_id: salonId,
            client_id,
            credit_amount,
            min_purchase_amount: min_purchase_amount || 0,
            expires_at: expiresAt.toISOString(),
          })
          .select("id, credit_amount, expires_at")
          .single();

        if (error) throw error;
        return json({ credit: data });
      }

      // ===== LIST AVAILABLE SLOTS =====
      case "list_available_slots": {
        const { professional_id, date } = body;
        if (!professional_id || !date) return json({ error: "professional_id and date required" }, 400);

        // Get scheduling settings
        const { data: settings } = await supabase
          .from("scheduling_settings")
          .select("*")
          .eq("salon_id", salonId)
          .single();

        if (!settings) return json({ error: "Scheduling settings not configured" }, 400);

        // Get existing appointments for the day
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: appointments } = await supabase
          .from("appointments")
          .select("scheduled_at, duration_minutes")
          .eq("salon_id", salonId)
          .eq("professional_id", professional_id)
          .in("status", ["scheduled", "confirmed", "in_progress"])
          .gte("scheduled_at", startOfDay)
          .lte("scheduled_at", endOfDay);

        // Generate available slots
        const openTime = settings.opening_time.slice(0, 5);
        const closeTime = settings.closing_time.slice(0, 5);
        const interval = settings.slot_interval_minutes;
        const [openH, openM] = openTime.split(":").map(Number);
        const [closeH, closeM] = closeTime.split(":").map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        const busySlots = (appointments || []).map(a => {
          const start = new Date(a.scheduled_at);
          return {
            startMin: start.getHours() * 60 + start.getMinutes(),
            endMin: start.getHours() * 60 + start.getMinutes() + a.duration_minutes,
          };
        });

        const availableSlots: string[] = [];
        for (let min = openMinutes; min < closeMinutes; min += interval) {
          const isBusy = busySlots.some(b => min >= b.startMin && min < b.endMin);
          if (!isBusy) {
            const h = String(Math.floor(min / 60)).padStart(2, "0");
            const m = String(min % 60).padStart(2, "0");
            availableSlots.push(`${h}:${m}`);
          }
        }

        return json({ date, professional_id, available_slots: availableSlots });
      }

      default:
        return json({ error: `Unknown action: ${action}. Available: list_services, list_professionals, search_client, create_client, create_appointment, add_credit, list_available_slots` }, 400);
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-key",
      "Content-Type": "application/json",
    },
  });
}
