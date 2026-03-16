import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  type: "cashback" | "expiring" | "birthday" | "welcome" | "campaign" | "return_reminder";
  salon_id: string;
  to_email: string;
  to_name: string;
  client_id?: string;
  variables?: Record<string, string>;
  campaign_id?: string;
  // For campaign type
  subject?: string;
  body?: string;
}

function generateHtml(
  logoUrl: string | null,
  salonName: string,
  title: string,
  bodyContent: string,
  primaryColor: string = "#6366f1"
): string {
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${salonName}" style="max-height:60px;margin-bottom:16px;" />`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <tr><td style="background:${primaryColor};padding:24px;text-align:center;">
    ${logoBlock}
    <h1 style="color:#ffffff;margin:0;font-size:22px;">${salonName}</h1>
  </td></tr>
  <tr><td style="padding:32px 24px;">
    <h2 style="color:#18181b;margin:0 0 16px 0;font-size:20px;">${title}</h2>
    <div style="color:#3f3f46;font-size:15px;line-height:1.7;">
      ${bodyContent}
    </div>
  </td></tr>
  <tr><td style="padding:16px 24px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="color:#a1a1aa;font-size:12px;margin:0;">
      Você recebeu este e-mail porque é cliente do ${salonName}.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildEmailContent(
  type: string,
  vars: Record<string, string>,
  salonName: string,
  logoUrl: string | null,
  customSubject?: string,
  customBody?: string
): { subject: string; html: string } {
  const name = vars.client_name || "Cliente";

  switch (type) {
    case "cashback": {
      const subject = `🎉 Você ganhou R$ ${vars.credit_amount} de cashback no ${salonName}!`;
      const body = `
        <p>Olá <strong>${name}</strong>!</p>
        <p>Obrigado por sua visita! Você ganhou <strong>R$ ${vars.credit_amount}</strong> de cashback.</p>
        <p>📅 <strong>Válido até:</strong> ${vars.expires_at}</p>
        <p>💰 <strong>Valor mínimo de compra:</strong> R$ 100,00</p>
        <p>Aproveite esse desconto na sua próxima visita!</p>
        <p>Com carinho, <strong>${salonName}</strong></p>`;
      return { subject, html: generateHtml(logoUrl, salonName, "Cashback Gerado! 🎉", body) };
    }

    case "expiring": {
      const subject = `⏰ Seu cashback de R$ ${vars.credit_amount} expira em ${vars.days_left} dias!`;
      const body = `
        <p>Olá <strong>${name}</strong>!</p>
        <p>Seu crédito de <strong>R$ ${vars.credit_amount}</strong> está prestes a expirar em <strong>${vars.expires_at}</strong>.</p>
        <p>Não deixe esse desconto escapar! Agende seu horário e aproveite.</p>
        <p><strong>${salonName}</strong></p>`;
      return { subject, html: generateHtml(logoUrl, salonName, "Cashback Expirando ⏰", body) };
    }

    case "birthday": {
      const subject = `🎂 Feliz Aniversário, ${name}! Temos um presente pra você`;
      const body = `
        <p>Olá <strong>${name}</strong>!</p>
        <p>Hoje é um dia especial e queremos celebrar com você! 🎉</p>
        <p>Passe no <strong>${salonName}</strong> e aproveite nosso carinho especial de aniversário.</p>
        <p>Parabéns! 🥳</p>`;
      return { subject, html: generateHtml(logoUrl, salonName, "Feliz Aniversário! 🎂", body) };
    }

    case "welcome": {
      const subject = `Bem-vindo(a) ao ${salonName}! 💇‍♀️`;
      const body = `
        <p>Olá <strong>${name}</strong>!</p>
        <p>Que bom ter você como nosso cliente! Estamos prontos para cuidar de você.</p>
        <p>Nosso programa de fidelidade te dá <strong>7% de cashback</strong> em cada visita!</p>
        <p>Até breve! <strong>${salonName}</strong></p>`;
      return { subject, html: generateHtml(logoUrl, salonName, "Bem-vindo(a)! 💇‍♀️", body) };
    }

    case "return_reminder": {
      const subject = `💇 Hora de cuidar do seu ${vars.service_name}, ${name}!`;
      const customMsg = vars.custom_message || `Que tal agendar seu retorno? Estamos te esperando!`;
      const body = `
        <p>Olá <strong>${name}</strong>!</p>
        <p>Já faz <strong>${vars.days} dias</strong> desde o seu último <strong>${vars.service_name}</strong>.</p>
        <p>${customMsg}</p>
        <p>Esperamos você! <strong>${salonName}</strong></p>`;
      return { subject, html: generateHtml(logoUrl, salonName, "Hora de Retornar! 💇", body) };
    }

    case "campaign": {
      const subject = customSubject || "Novidades do " + salonName;
      const body = `<div style="white-space:pre-wrap;">${customBody || ""}</div>`;
      return { subject, html: generateHtml(logoUrl, salonName, subject, body) };
    }

    default:
      return { subject: "Mensagem do " + salonName, html: generateHtml(logoUrl, salonName, "Mensagem", "<p>Olá!</p>") };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EmailRequest = await req.json();
    const { type, salon_id, to_email, to_name, client_id, variables = {}, campaign_id, subject: customSubject, body: customBody } = payload;

    if (!to_email || !salon_id || !type) {
      throw new Error("Campos obrigatórios: type, salon_id, to_email");
    }

    // Get salon info
    const { data: salon } = await supabase
      .from("salons")
      .select("name, trade_name, logo_url, email")
      .eq("id", salon_id)
      .single();

    const salonName = salon?.trade_name || salon?.name || "Salão";
    const logoUrl = salon?.logo_url || null;
    const fromEmail = salon?.email || "noreply@resend.dev";

    // Build email
    const { subject, html } = buildEmailContent(
      type,
      { ...variables, client_name: to_name },
      salonName,
      logoUrl,
      customSubject,
      customBody
    );

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${salonName} <${fromEmail}>`,
        to: [to_email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    const status = resendRes.ok ? "sent" : "failed";
    const errorMessage = resendRes.ok ? null : JSON.stringify(resendData);

    // Log email
    await supabase.from("email_logs").insert({
      salon_id,
      client_id: client_id || null,
      email_type: type,
      subject,
      status,
      error_message: errorMessage,
      campaign_id: campaign_id || null,
    });

    if (!resendRes.ok) {
      throw new Error(`Resend error: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("send-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
