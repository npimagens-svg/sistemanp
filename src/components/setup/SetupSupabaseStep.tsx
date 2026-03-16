import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, ArrowRight, Loader2, CheckCircle2, XCircle, Download, Copy, AlertTriangle } from "lucide-react";
import type { SetupData } from "@/pages/SetupWizard";
import { SETUP_SCHEMA_SQL } from "@/lib/setupSchemaSQL";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
}

export default function SetupSupabaseStep({ data, updateData, onNext }: Props) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error" | "no_schema">("idle");
  const [showSchema, setShowSchema] = useState(false);

  const handleTest = async () => {
    if (!data.supabaseUrl.trim() || !data.supabaseAnonKey.trim() || !data.supabaseServiceRoleKey.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setTesting(true);
    setConnectionStatus("idle");

    try {
      // Use service role to bypass RLS for schema check
      const testClient = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
        auth: { persistSession: false },
      });

      // Test connection by checking if salons table exists
      const { error } = await testClient.from("salons").select("id", { count: "exact", head: true });

      if (error) {
        // Check if it's a "table not found" error
        if (error.message?.includes("schema cache") || error.message?.includes("relation") || error.code === "PGRST204") {
          setConnectionStatus("no_schema");
          setShowSchema(true);
          toast({
            title: "⚠️ Conexão OK, mas o schema não foi encontrado",
            description: "Você precisa executar o SQL do schema no SQL Editor do Supabase antes de continuar.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setConnectionStatus("success");
      toast({ title: "✅ Conexão e schema verificados com sucesso!" });
    } catch (err: any) {
      if (connectionStatus !== "no_schema") {
        setConnectionStatus("error");
        toast({
          title: "Falha na conexão",
          description: err.message || "Verifique as credenciais e tente novamente",
          variant: "destructive",
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([SETUP_SCHEMA_SQL], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "np-hair-studio-schema.sql";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Arquivo SQL baixado!" });
  };

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SCHEMA_SQL);
      toast({ title: "📋 SQL copiado para a área de transferência!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Conexão com o Banco de Dados
        </CardTitle>
        <CardDescription>
          Insira as credenciais do seu projeto Supabase para conectar o sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Supabase URL *</Label>
          <Input
            value={data.supabaseUrl}
            onChange={(e) => updateData({ supabaseUrl: e.target.value })}
            placeholder="https://xxxxx.supabase.co"
          />
        </div>
        <div className="space-y-2">
          <Label>Anon Key (Publishable) *</Label>
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
          <p className="text-xs text-muted-foreground">
            ⚠️ Essa chave será usada apenas durante a instalação e não será armazenada no frontend.
          </p>
        </div>

        {connectionStatus === "success" && (
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Conexão e Schema OK
          </div>
        )}
        {connectionStatus === "error" && (
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <XCircle className="h-4 w-4" /> Falha na conexão
          </div>
        )}
        {connectionStatus === "no_schema" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">Schema não encontrado</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  A conexão com o Supabase está funcionando, mas as tabelas do sistema ainda não foram criadas.
                  Você precisa executar o SQL abaixo no <strong>SQL Editor</strong> do seu projeto Supabase.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadSQL} className="gap-2">
                <Download className="h-4 w-4" /> Baixar SQL
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopySQL} className="gap-2">
                <Copy className="h-4 w-4" /> Copiar SQL
              </Button>
            </div>

            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-medium">📋 Como fazer:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Acesse o painel do Supabase → seu projeto</li>
                <li>Vá em <strong>SQL Editor</strong> (menu lateral)</li>
                <li>Cole o SQL baixado/copiado e clique em <strong>Run</strong></li>
                <li>Aguarde a execução (pode levar ~30 segundos)</li>
                <li>Volte aqui e clique em <strong>Testar Conexão</strong> novamente</li>
              </ol>
            </div>

            {showSchema && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-amber-600 dark:text-amber-400 hover:underline">
                  Ver SQL completo ({Math.round(SETUP_SCHEMA_SQL.length / 1024)}KB)
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-background border p-2 text-[10px] leading-tight font-mono whitespace-pre-wrap">
                  {SETUP_SCHEMA_SQL}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📋 Onde encontrar as credenciais:</p>
          <p>1. Acesse o painel do Supabase → Seu projeto → <strong>Settings</strong> → <strong>API</strong></p>
          <p>2. Copie a <strong>Project URL</strong>, <strong>anon public</strong> key e <strong>service_role</strong> key</p>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Testar Conexão
            </Button>
            {connectionStatus === "idle" && (
              <Button variant="ghost" size="sm" onClick={handleDownloadSQL} className="gap-2 text-xs">
                <Download className="h-3 w-3" /> Baixar Schema SQL
              </Button>
            )}
          </div>
          <Button onClick={onNext} disabled={connectionStatus !== "success"} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
