// @ts-nocheck
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, ArrowRight, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
}

export default function SetupSupabaseStep({ data, updateData, onNext }: Props) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [connected, setConnected] = useState(false);

  const handleTestConnection = async () => {
    if (!data.supabaseUrl.trim() || !data.supabaseAnonKey.trim() || !data.supabaseServiceRoleKey.trim()) {
      toast({ title: "Preencha todas as credenciais", variant: "destructive" });
      return;
    }

    setTesting(true);
    setStatusMsg("🔌 Testando conexão...");

    try {
      const client = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Test connection by trying to list users
      const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw new Error("Falha na conexão: " + error.message);

      // Check if schema exists
      setStatusMsg("🔍 Verificando schema...");
      const { error: schemaError } = await client.from("salons").select("id", { count: "exact", head: true });

      if (schemaError && (schemaError.code === "PGRST204" || schemaError.message?.includes("relation") || schemaError.message?.includes("Could not find"))) {
        toast({
          title: "⚠️ Schema não encontrado",
          description: "O banco de dados não possui as tabelas necessárias. Copie o SQL do schema e execute no SQL Editor do Supabase antes de continuar.",
          variant: "destructive",
        });
        setStatusMsg("⚠️ Execute o schema SQL no Supabase SQL Editor primeiro");
        setConnected(false);
        setTesting(false);
        return;
      }

      // Check if salon already exists
      const { count } = await client.from("salons").select("id", { count: "exact", head: true });
      if (count && count > 0) {
        toast({
          title: "⚠️ Banco já configurado",
          description: "Este banco de dados já possui um salão. O sistema vai conectar ao salão existente.",
        });
      }

      setConnected(true);
      setStatusMsg("✅ Conexão bem-sucedida!");
      toast({ title: "✅ Conexão com o banco de dados estabelecida!" });
    } catch (err: any) {
      console.error("Connection test error:", err);
      toast({ title: "Erro na conexão", description: err.message, variant: "destructive" });
      setStatusMsg("");
      setConnected(false);
    } finally {
      setTesting(false);
    }
  };

  const handleNext = () => {
    if (!connected) {
      toast({ title: "Teste a conexão primeiro", variant: "destructive" });
      return;
    }
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configurar Banco de Dados
        </CardTitle>
        <CardDescription>
          Conecte ao seu projeto Supabase para armazenar os dados do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Supabase URL *</Label>
            <Input
              value={data.supabaseUrl}
              onChange={(e) => { updateData({ supabaseUrl: e.target.value }); setConnected(false); }}
              placeholder="https://xxxxx.supabase.co"
            />
          </div>
          <div className="space-y-2">
            <Label>Anon Key (public) *</Label>
            <Input
              type="password"
              value={data.supabaseAnonKey}
              onChange={(e) => { updateData({ supabaseAnonKey: e.target.value }); setConnected(false); }}
              placeholder="eyJhbGciOiJIUz..."
            />
          </div>
          <div className="space-y-2">
            <Label>Service Role Key *</Label>
            <Input
              type="password"
              value={data.supabaseServiceRoleKey}
              onChange={(e) => { updateData({ supabaseServiceRoleKey: e.target.value }); setConnected(false); }}
              placeholder="eyJhbGciOiJIUz..."
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📋 Onde encontrar:</p>
          <p>
            1. Acesse{" "}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">
              supabase.com/dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p>2. Selecione seu projeto → <strong>Settings</strong> → <strong>API</strong></p>
          <p>3. Copie a <strong>Project URL</strong>, <strong>anon public</strong> key e <strong>service_role</strong> key</p>
        </div>

        {statusMsg && (
          <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-600' : 'text-muted-foreground'}`}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {statusMsg}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Testar Conexão
          </Button>
          <Button onClick={handleNext} disabled={!connected} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
