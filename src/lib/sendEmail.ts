import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  type: "cashback" | "expiring" | "birthday" | "welcome" | "campaign" | "return_reminder";
  salon_id: string;
  to_email: string;
  to_name: string;
  client_id?: string;
  variables?: Record<string, string>;
  campaign_id?: string;
  subject?: string;
  body?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: params,
  });
  if (error) throw error;
  return data;
}
