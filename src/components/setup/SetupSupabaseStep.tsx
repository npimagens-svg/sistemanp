// @ts-nocheck
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, ArrowRight, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SETUP_SCHEMA_SQL } from "@/lib/setupSchemaSQL";
import { waitForExternalSchema } from "@/components/setup/setupSupabaseHelpers";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
}

function extractProjectRef(url: string): string {
  try { return new URL(url).hostname.split(".")[0]; } catch { return ""; }
}

async function runQueryViaPat(projectRef: string, pat: string, sql: string): Promise<string | null> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    const msg = (() => { try { const j = JSON.parse(body); return j?.message || j?.error || body; } catch { return body; } })();
    if (msg.includes("already exists") || msg.includes("duplicate")) return null;
    return msg;
  }
  return null;
}

async function createSchemaViaPat(
  projectRef: string,
  pat: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  // Split SQL into sections by "-- N." comments
  const sections = SETUP_SCHEMA_SQL
    .split(/(?=^-- \d+\.)/m)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const errors: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    const sectionName = sections[i].split("\n")[0].replace(/^--\s*/, "").trim();
    onProgress?.(`🔧 Criando: ${sectionName} (${i + 1}/${sections.length})`);
    const err = await runQueryViaPat(projectRef, pat, sections[i]);
    if (err) {
      console.error(`Schema section "${sectionName}" error:`, err);
      errors.push(`${sectionName}: ${err}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Erros ao criar schema:\n${errors.join("\n")}`);
  }
}

export default function SetupSupabaseStep({ data, updateData, onNext }: Props) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [connected, setConnected] = useState(false);

  const handleTestConnection = async () => {
    if (!data.supabaseUrl.trim() || !data.supabaseAnonKey.trim() || !data.supabaseServiceRoleKey.trim()) {
      toast({ title: "Preencha URL, Anon Key e Service Role Key", variant: "destructive" });
      return;
    }
    setTesting(true);
    setConnected(false);
    setStatusMsg("🔌 Testando conexão...");
    try {
      const client = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: authError } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (authError) throw new Error("Credenciais inválidas: " + authError.message);

      setStatusMsg("🔍 Verificando schema...");
      const { error: schemaError } = await client.from("salons").select("id", { count: "exact", head: true });
      const schemaMissing = schemaError && (
        schemaError.code === "PGRST204" ||
        schemaError.message?.includes("relation") ||
        schemaError.message?.includes("Could not find")
      );

      if (schemaMissing) {
        if (!data.supabasePat.trim()) {
          toast({ title: "Banco novo detectado", description: "Adicione o Personal Access Token para criar as tabelas automaticamente.", variant: "destructive" });
          setStatusMsg("⚠️ Banco novo — adicione o PAT para criar as tabelas");
          setTesting(false);
          return;
        }
        setStatusMsg("🔧 Criando tabelas no banco de dados...");
        await createSchemaViaPat(extractProjectRef(data.supabaseUrl.trim()), data.supabasePat.trim(), setStatusMsg);
        setStatusMsg("⏳ Aguardando tabelas ficarem disponíveis...");
        const schemaResult = await waitForExternalSchema(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), 12, 2000);
        if (schemaResult.status !== "success") {
          throw new Error("Tabelas foram criadas mas ainda não estão acessíveis. Aguarde alguns segundos e clique em 'Testar Conexão' novamente.");
        }
        toast({ title: "✅ Tabelas criadas com sucesso!" });
      }

      setConnected(true);
      setStatusMsg("✅ Banco de dados pronto!");
      toast({ title: "✅ Banco de dados configurado!" });
    } catch (err: any) {
      toast({ title: "Erro na conexão", description: err.message, variant: "destructive" });
      setStatusMsg("");
      setConnected(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Configurar Banco de Dados</CardTitle>
        <CardDescription>Conecte ao Supabase. As tabelas são criadas automaticamente se o banco for novo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Supabase URL *</Label>
            <Input value={data.supabaseUrl} onChange={(e) => { updateData({ supabaseUrl: e.target.value }); setConnected(false); }} placeholder="https://xxxxx.supabase.co" />
          </div>
          <div className="space-y-2">
            <Label>Anon Key *</Label>
            <Input type="password" value={data.supabaseAnonKey} onChange={(e) => { updateData({ supabaseAnonKey: e.target.value }); setConnected(false); }} placeholder="eyJhbGciOiJIUz..." />
          </div>
          <div className="space-y-2">
            <Label>Service Role Key *</Label>
            <Input type="password" value={data.supabaseServiceRoleKey} onChange={(e) => { updateData({ supabaseServiceRoleKey: e.target.value }); setConnected(false); }} placeholder="eyJhbGciOiJIUz..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Personal Access Token — cria tabelas automaticamente em bancos novos</Label>
            <Input type="password" value={data.supabasePat} onChange={(e) => { updateData({ supabasePat: e.target.value }); setConnected(false); }} placeholder="sbp_xxxxxxxxxxxxxxxxxxxx" />
            <p className="text-xs text-muted-foreground">
              Só necessário se o banco for novo.{" "}
              <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">Gerar token <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📋 Onde encontrar:</p>
          <p>Acesse <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">supabase.com/dashboard <ExternalLink className="h-3 w-3" /></a> → Seu projeto → <strong>Settings → API</strong></p>
          <p>Copie <strong>Project URL</strong>, <strong>anon public</strong> e <strong>service_role</strong></p>
        </div>
        {statusMsg && (
          <div className={`flex items-center gap-2 text-sm ${connected ? "text-green-600" : "text-muted-foreground"}`}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {statusMsg}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {testing ? "Verificando..." : "Testar Conexão"}
          </Button>
          <Button onClick={() => { if (!connected) { toast({ title: "Teste a conexão antes de continuar", variant: "destructive" }); return; } onNext(); }} disabled={!connected} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
