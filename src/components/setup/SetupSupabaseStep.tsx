import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, ArrowRight, Loader2, CheckCircle2, XCircle, AlertTriangle, Wand2 } from "lucide-react";
import type { SetupData } from "@/pages/SetupWizard";
import { SETUP_SCHEMA_SQL } from "@/lib/setupSchemaSQL";
import { supabase } from "@/integrations/supabase/client";
import { checkExternalSchema, waitForExternalSchema } from "@/components/setup/setupSupabaseHelpers";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
}

export default function SetupSupabaseStep({ data, updateData, onNext }: Props) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [creatingSchema, setCreatingSchema] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error" | "no_schema">("idle");

  const handleTest = async () => {
    if (!data.supabaseUrl.trim() || !data.supabaseAnonKey.trim() || !data.supabaseServiceRoleKey.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setTesting(true);
    setConnectionStatus("idle");

    try {
      const result = await checkExternalSchema(data.supabaseUrl, data.supabaseServiceRoleKey);

      if (result.status === "no_schema") {
        setConnectionStatus("no_schema");
        toast({
          title: "⚠️ Conexão OK, mas as tabelas ainda não estão disponíveis",
          description: "Informe a senha do banco e clique em 'Criar Schema Automaticamente'",
          variant: "destructive",
        });
        return;
      }

      setConnectionStatus("success");
      toast({ title: "✅ Conexão e schema verificados com sucesso!" });
    } catch (err: any) {
      setConnectionStatus("error");
      toast({
        title: "Falha na conexão",
        description: err.message || "Verifique as credenciais e tente novamente",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAutoCreateSchema = async () => {
    if (!data.supabaseDbPassword.trim()) {
      toast({ title: "Informe a senha do banco de dados", variant: "destructive" });
      return;
    }

    setCreatingSchema(true);
    setConnectionStatus("idle");

    try {
      const { data: result, error } = await supabase.functions.invoke("setup-schema", {
        body: {
          supabaseUrl: data.supabaseUrl.trim(),
          dbPassword: data.supabaseDbPassword.trim(),
          schemaSql: SETUP_SCHEMA_SQL,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao criar o schema");
      }

      if (!result?.success) {
        throw new Error(result?.error || "Erro ao criar o schema");
      }

      const validation = await waitForExternalSchema(data.supabaseUrl, data.supabaseServiceRoleKey);

      if (validation.status !== "success") {
        setConnectionStatus("no_schema");
        toast({
          title: "Schema criado, aguardando sincronização",
          description: "As tabelas foram criadas, mas a API do projeto externo ainda está atualizando. Tente 'Testar Conexão' em alguns segundos.",
        });
        return;
      }

      setConnectionStatus("success");
      toast({ title: "✅ Schema criado e sincronizado com sucesso!" });
    } catch (err: any) {
      setConnectionStatus("error");
      toast({
        title: "Erro ao criar o schema",
        description: err.message || "Verifique a senha do banco e tente novamente",
        variant: "destructive",
      });
    } finally {
      setCreatingSchema(false);
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
        </div>
        <div className="space-y-2">
          <Label>Senha do Banco de Dados *</Label>
          <Input
            type="password"
            value={data.supabaseDbPassword}
            onChange={(e) => updateData({ supabaseDbPassword: e.target.value })}
            placeholder="A senha definida na criação do projeto Supabase"
          />
          <p className="text-xs text-muted-foreground">
            📍 Encontre em: Supabase → Settings → Database → Database password
          </p>
        </div>

        {connectionStatus === "success" && (
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Conexão e Schema OK
          </div>
        )}
        {connectionStatus === "error" && (
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <XCircle className="h-4 w-4" /> Falha na conexão — verifique as credenciais
          </div>
        )}
        {connectionStatus === "no_schema" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">Tabelas não encontradas</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  A conexão está funcionando, mas as tabelas do sistema ainda não foram criadas.
                  Informe a senha do banco acima e clique no botão abaixo para criar automaticamente.
                </p>
              </div>
            </div>

            <Button
              onClick={handleAutoCreateSchema}
              disabled={creatingSchema || !data.supabaseDbPassword.trim()}
              className="gap-2 w-full"
              variant="default"
            >
              {creatingSchema ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando schema... (pode levar até 30s)
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Criar Schema Automaticamente
                </>
              )}
            </Button>
          </div>
        )}

        <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📋 Onde encontrar as credenciais:</p>
          <p>1. Acesse o painel do Supabase → Seu projeto → <strong>Settings</strong> → <strong>API</strong></p>
          <p>2. Copie a <strong>Project URL</strong>, <strong>anon public</strong> key e <strong>service_role</strong> key</p>
          <p>3. A senha do banco está em <strong>Settings</strong> → <strong>Database</strong> → <strong>Database password</strong></p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Testar Conexão
          </Button>
          <Button onClick={onNext} disabled={connectionStatus !== "success"} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
