import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rocket, ArrowLeft, Loader2, CheckCircle2, ExternalLink, Database } from "lucide-react";
import { SETUP_SCHEMA_SQL } from "@/lib/setupSchemaSQL";
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


export default function SetupDeployStep({ data, updateData, onDone, onBack, toast }: Props) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleFinish = async () => {
    // Validate required fields
    if (!data.supabaseUrl.trim() || !data.supabaseAnonKey.trim() || !data.supabaseServiceRoleKey.trim() || !data.supabaseDbPassword.trim()) {
      toast({ title: "Preencha todas as credenciais do Supabase externo", variant: "destructive" });
      return;
    }
    if (!data.vercelToken.trim() || !data.vercelProjectId.trim()) {
      toast({ title: "Preencha o Token e o Project ID da Vercel", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStatusMsg("");

    try {
      // ── PHASE 1: Save to Lovable Cloud (local DB) via edge function ──
      setStatusMsg("💾 Criando usuário master...");

      // 1a. Create or sign in master user on Lovable Cloud
      let localSession: any;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.masterEmail,
        password: data.masterPassword,
        options: { data: { full_name: data.masterName } },
      });

      if (signUpError) {
        if (signUpError.message?.includes("already") || signUpError.message?.includes("User already registered")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: data.masterEmail,
            password: data.masterPassword,
          });
          if (signInError) throw new Error(`Usuário já existe mas não foi possível logar: ${signInError.message}`);
          localSession = signInData.session;
        } else {
          throw signUpError;
        }
      } else {
        if (!signUpData.user) throw new Error("Erro ao criar usuário");
        localSession = signUpData.session;
        // If no session (email confirmation required), sign in
        if (!localSession) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: data.masterEmail,
            password: data.masterPassword,
          });
          if (signInError) throw new Error(`Usuário criado mas não foi possível logar: ${signInError.message}`);
          localSession = signInData.session;
        }
      }

      // 1b. Create salon, profile, role via edge function (bypasses RLS)
      setStatusMsg("💾 Criando salão e configurações...");
      const { data: salonResult, error: salonFnError } = await supabase.functions.invoke("create-salon", {
        body: {
          fullName: data.masterName,
          salonName: data.salonName,
          tradeName: data.tradeName || data.salonName,
          salonPhone: data.salonPhone || "",
          salonEmail: data.salonEmail || "",
          salonCnpj: data.salonCnpj || "",
        },
      });

      if (salonFnError || !salonResult?.salonId) {
        throw new Error(salonResult?.error || salonFnError?.message || "Erro ao criar salão");
      }

      toast({ title: "✅ Dados salvos localmente com sucesso!" });

      // ── PHASE 2: Create schema on external Supabase ──
      setStatusMsg("🔧 Criando tabelas no Supabase externo...");
      const { data: schemaResult, error: schemaError } = await supabase.functions.invoke("setup-schema", {
        body: {
          supabaseUrl: data.supabaseUrl.trim(),
          dbPassword: data.supabaseDbPassword.trim(),
          schemaSql: SETUP_SCHEMA_SQL,
        },
      });

      if (schemaError || !schemaResult?.success) {
        throw new Error(schemaResult?.error || schemaError?.message || "Erro ao criar schema externo");
      }

      // ── PHASE 3: Migrate data to external Supabase ──
      setStatusMsg("📤 Migrando dados para Supabase externo...");
      const extServiceClient = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 3a. Create master user on external Supabase
      setStatusMsg("📤 Criando usuário master no Supabase externo...");
      let extUserId: string;

      const { data: extUserList } = await extServiceClient.auth.admin.listUsers();
      const existingExtUser = extUserList?.users?.find((u: any) => u.email === data.masterEmail);

      if (existingExtUser) {
        extUserId = existingExtUser.id;
      } else {
        const { data: extNewUser, error: extUserError } = await extServiceClient.auth.admin.createUser({
          email: data.masterEmail,
          password: data.masterPassword,
          email_confirm: true,
          user_metadata: { full_name: data.masterName },
        });
        if (extUserError || !extNewUser?.user) throw extUserError || new Error("Erro ao criar usuário externo");
        extUserId = extNewUser.user.id;
      }

      // 3b. Create salon on external Supabase
      setStatusMsg("📤 Migrando salão...");
      let extSalonId: string;
      const { data: extExistingSalon } = await extServiceClient
        .from("salons")
        .select("id")
        .eq("name", data.salonName)
        .maybeSingle();

      if (extExistingSalon?.id) {
        extSalonId = extExistingSalon.id;
      } else {
        const { data: extNewSalon, error: extSalonError } = await extServiceClient
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
        if (extSalonError || !extNewSalon?.id) throw extSalonError || new Error("Erro ao criar salão externo");
        extSalonId = extNewSalon.id;
      }

      // 3c. Create profile on external Supabase
      setStatusMsg("📤 Migrando perfil...");
      const { data: extExistingProfile } = await extServiceClient
        .from("profiles")
        .select("id")
        .eq("user_id", extUserId)
        .maybeSingle();

      if (!extExistingProfile) {
        await extServiceClient.from("profiles").insert({
          user_id: extUserId,
          salon_id: extSalonId,
          full_name: data.masterName,
        });
      }

      // 3d. Create admin role on external Supabase
      const { data: extExistingRole } = await extServiceClient
        .from("user_roles")
        .select("id")
        .eq("user_id", extUserId)
        .maybeSingle();

      if (!extExistingRole) {
        await extServiceClient.from("user_roles").insert({
          user_id: extUserId,
          salon_id: extSalonId,
          role: "admin",
        });
      }

      // 3e. System config on external
      await extServiceClient.from("system_config").upsert(
        { key: "master_user_email", value: data.masterEmail },
        { onConflict: "key" }
      );

      // 3f. Access levels on external
      setStatusMsg("📤 Migrando níveis de acesso...");
      const defaultAccessLevels = [
        { name: "Administrador", system_key: "admin", is_system: true, color: "#22c55e", description: "Acesso total ao sistema" },
        { name: "Gerente", system_key: "manager", is_system: true, color: "#3b82f6", description: "Gestão operacional" },
        { name: "Recepcionista", system_key: "receptionist", is_system: true, color: "#f59e0b", description: "Atendimento e agenda" },
        { name: "Financeiro", system_key: "financial", is_system: true, color: "#8b5cf6", description: "Acesso financeiro" },
        { name: "Profissional", system_key: "professional", is_system: true, color: "#ec4899", description: "Apenas sua agenda" },
      ];
      for (const level of defaultAccessLevels) {
        const { data: extExisting } = await extServiceClient
          .from("access_levels")
          .select("id")
          .eq("salon_id", extSalonId)
          .eq("system_key", level.system_key)
          .maybeSingle();
        if (!extExisting) {
          await extServiceClient.from("access_levels").insert({ ...level, salon_id: extSalonId });
        }
      }

      // 3g. Scheduling settings on external
      const { data: extExistingSched } = await extServiceClient
        .from("scheduling_settings")
        .select("id")
        .eq("salon_id", extSalonId)
        .maybeSingle();
      if (!extExistingSched) {
        await extServiceClient.from("scheduling_settings").insert({ salon_id: extSalonId });
      }

      // 3h. Commission settings on external
      const { data: extExistingComm } = await extServiceClient
        .from("commission_settings")
        .select("id")
        .eq("salon_id", extSalonId)
        .maybeSingle();
      if (!extExistingComm) {
        await extServiceClient.from("commission_settings").insert({ salon_id: extSalonId });
      }

      // ── PHASE 4: Set Vercel env vars ──
      setStatusMsg("⚙️ Configurando variáveis na Vercel...");
      const projectRef = extractProjectRef(data.supabaseUrl);
      const envVars = [
        { key: "VITE_SUPABASE_URL", value: data.supabaseUrl.trim() },
        { key: "VITE_SUPABASE_PUBLISHABLE_KEY", value: data.supabaseAnonKey.trim() },
        { key: "VITE_SUPABASE_PROJECT_ID", value: projectRef },
      ];

      for (const env of envVars) {
        await upsertVercelEnv(data.vercelToken, data.vercelProjectId, env.key, env.value);
      }

      // ── PHASE 5: Trigger Vercel redeploy ──
      setStatusMsg("🚀 Fazendo redeploy na Vercel...");
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
          Deploy para Produção
        </CardTitle>
        <CardDescription>
          Os dados serão salvos localmente primeiro, depois migrados para o Supabase externo e feito o deploy na Vercel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* External Supabase Section */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Supabase Externo (Produção)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Supabase URL *</Label>
              <Input
                value={data.supabaseUrl}
                onChange={(e) => updateData({ supabaseUrl: e.target.value })}
                placeholder="https://xxxxx.supabase.co"
              />
            </div>
            <div className="space-y-2">
              <Label>Anon Key *</Label>
              <Input
                type="password"
                value={data.supabaseAnonKey}
                onChange={(e) => updateData({ supabaseAnonKey: e.target.value })}
                placeholder="eyJhbGciOiJIUz..."
              />
            </div>
            <div className="space-y-2">
              <Label>Service Role Key *</Label>
              <Input
                type="password"
                value={data.supabaseServiceRoleKey}
                onChange={(e) => updateData({ supabaseServiceRoleKey: e.target.value })}
                placeholder="eyJhbGciOiJIUz..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Senha do Banco de Dados *</Label>
              <Input
                type="password"
                value={data.supabaseDbPassword}
                onChange={(e) => updateData({ supabaseDbPassword: e.target.value })}
                placeholder="A senha definida na criação do projeto Supabase"
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">📋 Onde encontrar:</p>
            <p>1. Acesse o painel do Supabase → Seu projeto → <strong>Settings</strong> → <strong>API</strong></p>
            <p>2. Copie a <strong>Project URL</strong>, <strong>anon public</strong> key e <strong>service_role</strong> key</p>
            <p>3. A senha do banco está em <strong>Settings</strong> → <strong>Database</strong></p>
          </div>
        </div>

        {/* Vercel Section */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Vercel (Deploy)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              1.{" "}
              <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">
                vercel.com/account/tokens <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → <strong>Create Token</strong>
            </p>
            <p>2. Project ID em <strong>Settings</strong> → <strong>General</strong></p>
          </div>
        </div>

        {/* What will happen */}
        <div className="rounded-lg border bg-primary/5 p-3 text-sm text-foreground">
          <p className="font-medium mb-1">🚀 O que vai acontecer:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
            <li>Salvar salão, usuário e permissões <strong>localmente</strong> (Lovable Cloud)</li>
            <li>Criar tabelas no <strong>Supabase externo</strong></li>
            <li>Migrar todos os dados para o Supabase externo</li>
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

  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, target, type: "plain" }),
  });

  if (res.ok) return;

  const body = await res.json().catch(() => ({}));

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
    throw new Error(
      `Redeploy falhou (${redeployRes.status}): ${err?.error?.message || "Erro desconhecido"}`
    );
  }
}
