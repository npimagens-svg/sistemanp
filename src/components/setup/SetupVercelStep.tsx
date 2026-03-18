import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rocket, ArrowLeft, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onDone: () => void;
  onBack: () => void;
  toast: any;
}

function extractProjectRef(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}

/** Create admin-level Supabase client (service role) */
function makeServiceClient(url: string, serviceRoleKey: string) {
  return createClient(url.trim(), serviceRoleKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Create anon-level Supabase client */
function makeAnonClient(url: string, anonKey: string) {
  return createClient(url.trim(), anonKey.trim(), {
    auth: { persistSession: false },
  });
}

export default function SetupVercelStep({ data, updateData, onDone, onBack, toast }: Props) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleFinish = async () => {
    if (!data.vercelToken.trim() || !data.vercelProjectId.trim()) {
      toast({ title: "Preencha o Token e o Project ID da Vercel", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStatusMsg("");

    try {
      const serviceClient = makeServiceClient(data.supabaseUrl, data.supabaseServiceRoleKey);
      const anonClient = makeAnonClient(data.supabaseUrl, data.supabaseAnonKey);

      // ── 1. Create or find master user (idempotent) ──
      setStatusMsg("Criando usuário master...");
      let userId: string;

      const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
        email: data.masterEmail,
        password: data.masterPassword,
        options: { data: { full_name: data.masterName } },
      });

      if (signUpError) {
        // If user already exists, try to sign in
        if (signUpError.message?.includes("already") || signUpError.message?.includes("User already registered")) {
          const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
            email: data.masterEmail,
            password: data.masterPassword,
          });
          if (signInError) throw new Error(`Usuário já existe mas não foi possível logar: ${signInError.message}`);
          userId = signInData.user.id;
        } else {
          throw signUpError;
        }
      } else {
        if (!signUpData.user) throw new Error("Erro ao criar usuário");
        userId = signUpData.user.id;
      }

      // ── 2. Create or find salon (idempotent) ──
      setStatusMsg("Criando salão...");
      let salonId: string;

      const { data: existingSalon } = await serviceClient
        .from("salons")
        .select("id")
        .eq("name", data.salonName)
        .maybeSingle();

      if (existingSalon?.id) {
        salonId = existingSalon.id;
      } else {
        const { data: newSalon, error: salonError } = await serviceClient
          .from("salons")
          .insert({
            name: data.salonName,
            trade_name: data.tradeName || data.salonName,
            phone: data.salonPhone || null,
            email: data.salonEmail || null,
            cnpj: data.salonCnpj || null,
          })
          .select("id")
          .single();
        if (salonError || !newSalon?.id) throw salonError || new Error("Erro ao criar salão");
        salonId = newSalon.id;
      }

      // ── 3. Create profile (idempotent) ──
      setStatusMsg("Configurando perfil...");
      const { data: existingProfile } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("salon_id", salonId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await serviceClient.from("profiles").insert({
          user_id: userId,
          salon_id: salonId,
          full_name: data.masterName,
        });
        if (profileError && !profileError.message?.includes("duplicate")) throw profileError;
      }

      // ── 4. Create admin role (idempotent) ──
      setStatusMsg("Configurando permissões...");
      const { data: existingRole } = await serviceClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("salon_id", salonId)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await serviceClient.from("user_roles").insert({
          user_id: userId,
          salon_id: salonId,
          role: "admin",
        });
        if (roleError && !roleError.message?.includes("duplicate")) throw roleError;
      }

      // ── 5. Seed system_config with master email ──
      setStatusMsg("Salvando configurações...");
      await serviceClient.from("system_config").upsert(
        { key: "master_user_email", value: data.masterEmail },
        { onConflict: "key" }
      );

      // ── 6. Seed default access levels ──
      setStatusMsg("Criando níveis de acesso...");
      const defaultLevels = [
        { name: "Administrador", system_key: "admin", is_system: true, color: "#22c55e", description: "Acesso total ao sistema", salon_id: salonId },
        { name: "Gerente", system_key: "manager", is_system: true, color: "#3b82f6", description: "Gestão operacional", salon_id: salonId },
        { name: "Recepcionista", system_key: "receptionist", is_system: true, color: "#f59e0b", description: "Atendimento e agenda", salon_id: salonId },
        { name: "Financeiro", system_key: "financial", is_system: true, color: "#8b5cf6", description: "Acesso financeiro", salon_id: salonId },
        { name: "Profissional", system_key: "professional", is_system: true, color: "#ec4899", description: "Apenas sua agenda", salon_id: salonId },
      ];

      for (const level of defaultLevels) {
        const { data: existing } = await serviceClient
          .from("access_levels")
          .select("id")
          .eq("salon_id", salonId)
          .eq("system_key", level.system_key)
          .maybeSingle();

        if (!existing) {
          await serviceClient.from("access_levels").insert(level);
        }
      }

      // ── 7. Set Vercel env vars ──
      setStatusMsg("Configurando variáveis na Vercel...");
      const projectRef = extractProjectRef(data.supabaseUrl);
      const envVars = [
        { key: "VITE_SUPABASE_URL", value: data.supabaseUrl.trim() },
        { key: "VITE_SUPABASE_PUBLISHABLE_KEY", value: data.supabaseAnonKey.trim() },
        { key: "VITE_SUPABASE_PROJECT_ID", value: projectRef },
      ];

      for (const env of envVars) {
        await upsertVercelEnv(data.vercelToken, data.vercelProjectId, env.key, env.value);
      }

      // ── 8. Trigger Vercel redeploy ──
      setStatusMsg("Fazendo redeploy na Vercel...");
      await triggerVercelRedeploy(data.vercelToken, data.vercelProjectId);

      toast({ title: "🎉 Setup concluído! Redeploy em andamento." });
      onDone();
    } catch (err: any) {
      console.error("Setup error:", err);
      toast({ title: "Erro no setup", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Deploy na Vercel
        </CardTitle>
        <CardDescription>
          Configure a Vercel para conectar o frontend ao banco de dados e fazer o redeploy automático
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Vercel Token *</Label>
          <Input
            type="password"
            value={data.vercelToken}
            onChange={(e) => updateData({ vercelToken: e.target.value })}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>
        <div className="space-y-2">
          <Label>Vercel Project ID *</Label>
          <Input
            value={data.vercelProjectId}
            onChange={(e) => updateData({ vercelProjectId: e.target.value })}
            placeholder="prj_xxxxxxxxxxxxxxxxxxxxx"
          />
        </div>

        <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📋 Onde encontrar:</p>
          <p>
            1. Acesse{" "}
            <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">
              vercel.com/account/tokens <ExternalLink className="h-3 w-3" />
            </a>{" "}
            → <strong>Create Token</strong>
          </p>
          <p>2. Para o Project ID, vá em <strong>Settings</strong> → <strong>General</strong> do seu projeto na Vercel</p>
        </div>

        {data.resendKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-medium">⚠️ Lembrete sobre Resend:</p>
            <p>Após o deploy, configure a variável <strong>RESEND_API_KEY</strong> nos Secrets do Supabase.</p>
          </div>
        )}

        <div className="rounded-lg border bg-primary/5 p-3 text-sm text-foreground">
          <p className="font-medium mb-1">🚀 O que vai acontecer:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
            <li>Criar (ou reutilizar) o usuário master</li>
            <li>Criar o salão e permissões</li>
            <li>Configurar variáveis de ambiente na Vercel</li>
            <li>Fazer o redeploy automático</li>
          </ol>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMsg}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleFinish} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Instalar e Fazer Deploy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Vercel helpers ───

async function upsertVercelEnv(token: string, projectId: string, key: string, value: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const target = ["production", "preview", "development"];

  // Try create
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, target, type: "plain" }),
  });

  if (res.ok) return;

  const body = await res.json().catch(() => ({}));

  // If already exists, find and patch
  if (body?.error?.code === "ENV_ALREADY_EXISTS") {
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, { headers });
    const listData = await listRes.json();
    const existing = listData?.envs?.find((e: any) => e.key === key);
    if (existing) {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ value, target, type: "plain" }),
      });
    }
  }
}

async function triggerVercelRedeploy(token: string, projectId: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Get latest deployment for this project
  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&state=READY`,
    { headers }
  );

  if (!listRes.ok) {
    throw new Error("Não foi possível listar deployments da Vercel. Verifique o Token e Project ID.");
  }

  const listData = await listRes.json();
  const latestDeployment = listData?.deployments?.[0];

  if (!latestDeployment) {
    throw new Error("Nenhum deployment encontrado. Faça um deploy inicial na Vercel primeiro.");
  }

  // 2. Redeploy using the latest deployment
  const redeployRes = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: latestDeployment.name,
      deploymentId: latestDeployment.uid,
      meta: { redeployedBy: "setup-wizard" },
      target: "production",
    }),
  });

  if (!redeployRes.ok) {
    const err = await redeployRes.json().catch(() => ({}));
    console.error("Redeploy error:", err);
    throw new Error(
      `Redeploy falhou (${redeployRes.status}): ${err?.error?.message || "Erro desconhecido"}. Faça o redeploy manualmente na Vercel.`
    );
  }
}
