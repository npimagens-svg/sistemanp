// @ts-nocheck
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { saveExternalCredentials } from "@/lib/dynamicSupabaseClient";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
  isInstaller?: boolean;
}

export default function SetupMasterStep({ data, updateData, onNext, onBack, isInstaller }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleNext = async () => {
    if (!data.masterName.trim() || !data.masterEmail.trim() || !data.masterPassword.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (data.masterPassword.length < 8) {
      toast({ title: "A senha deve ter pelo menos 8 caracteres", variant: "destructive" });
      return;
    }

    // If this is the installer mode, create everything on the external Supabase
    if (isInstaller && data.supabaseUrl && data.supabaseServiceRoleKey) {
      setLoading(true);
      try {
        const extClient = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Create master user
        setStatusMsg("👤 Criando usuário master...");
        let userId: string;
        const { data: userList } = await extClient.auth.admin.listUsers();
        const existingUser = userList?.users?.find((u: any) => u.email === data.masterEmail);

        if (existingUser) {
          userId = existingUser.id;
          // Update password if user exists
          await extClient.auth.admin.updateUserById(userId, { password: data.masterPassword });
        } else {
          const { data: newUser, error: userError } = await extClient.auth.admin.createUser({
            email: data.masterEmail,
            password: data.masterPassword,
            email_confirm: true,
            user_metadata: { full_name: data.masterName },
          });
          if (userError || !newUser?.user) throw userError || new Error("Erro ao criar usuário");
          userId = newUser.user.id;
        }

        // Create salon
        setStatusMsg("🏪 Criando salão...");
        let salonId: string;
        const { data: existingSalon } = await extClient
          .from("salons")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existingSalon?.id) {
          salonId = existingSalon.id;
          // Update salon data
          await extClient.from("salons").update({
            name: data.salonName,
            trade_name: data.tradeName || data.salonName,
            phone: data.salonPhone || null,
            email: data.salonEmail || null,
            cnpj: data.salonCnpj || null,
          }).eq("id", salonId);
        } else {
          const { data: newSalon, error: salonError } = await extClient
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

        // Create profile
        setStatusMsg("📋 Criando perfil...");
        const { data: existingProfile } = await extClient
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!existingProfile) {
          await extClient.from("profiles").insert({
            user_id: userId,
            salon_id: salonId,
            full_name: data.masterName,
          });
        }

        // Create admin role
        const { data: existingRole } = await extClient
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!existingRole) {
          await extClient.from("user_roles").insert({
            user_id: userId,
            salon_id: salonId,
            role: "admin",
          });
        }

        // System config - master email
        setStatusMsg("⚙️ Configurando sistema...");
        await extClient.from("system_config").upsert(
          { key: "master_user_email", value: data.masterEmail },
          { onConflict: "key" }
        );

        // Seed access levels
        setStatusMsg("🔐 Criando níveis de acesso...");
        const defaultAccessLevels = [
          { name: "Administrador", system_key: "admin", is_system: true, color: "#22c55e", description: "Acesso total ao sistema" },
          { name: "Gerente", system_key: "manager", is_system: true, color: "#3b82f6", description: "Gestão operacional" },
          { name: "Recepcionista", system_key: "receptionist", is_system: true, color: "#f59e0b", description: "Atendimento e agenda" },
          { name: "Financeiro", system_key: "financial", is_system: true, color: "#8b5cf6", description: "Acesso financeiro" },
          { name: "Profissional", system_key: "professional", is_system: true, color: "#ec4899", description: "Apenas sua agenda" },
        ];
        for (const level of defaultAccessLevels) {
          const { data: existing } = await extClient
            .from("access_levels")
            .select("id")
            .eq("salon_id", salonId)
            .eq("system_key", level.system_key)
            .maybeSingle();
          if (!existing) {
            await extClient.from("access_levels").insert({ ...level, salon_id: salonId });
          }
        }

        // Scheduling settings
        const { data: existingSched } = await extClient
          .from("scheduling_settings")
          .select("id")
          .eq("salon_id", salonId)
          .maybeSingle();
        if (!existingSched) {
          await extClient.from("scheduling_settings").insert({ salon_id: salonId });
        }

        // Commission settings
        const { data: existingComm } = await extClient
          .from("commission_settings")
          .select("id")
          .eq("salon_id", salonId)
          .maybeSingle();
        if (!existingComm) {
          await extClient.from("commission_settings").insert({ salon_id: salonId });
        }

        // Save credentials to localStorage so the app uses external Supabase
        saveExternalCredentials(data.supabaseUrl.trim(), data.supabaseAnonKey.trim());

        toast({ title: "🎉 Instalação concluída com sucesso!" });
        setStatusMsg("");
        onNext();
      } catch (err: any) {
        console.error("Installation error:", err);
        toast({ title: "Erro na instalação", description: err.message, variant: "destructive" });
        setStatusMsg("");
      } finally {
        setLoading(false);
      }
    } else {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Usuário Master
        </CardTitle>
        <CardDescription>Crie a conta de administrador principal do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome Completo *</Label>
            <Input value={data.masterName} onChange={(e) => updateData({ masterName: e.target.value })} placeholder="Seu nome completo" />
          </div>
          <div className="space-y-2">
            <Label>E-mail de Login *</Label>
            <Input type="email" value={data.masterEmail} onChange={(e) => updateData({ masterEmail: e.target.value })} placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Senha *</Label>
            <Input type="password" value={data.masterPassword} onChange={(e) => updateData({ masterPassword: e.target.value })} placeholder="Mínimo 8 caracteres" />
          </div>
        </div>
        <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>⚠️ <strong>Importante:</strong> Este será o único usuário com acesso total ao sistema (Master). Outros usuários podem ser criados depois via cadastro de profissionais.</p>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMsg}
          </div>
        )}

        {isInstaller && (
          <div className="rounded-lg border bg-primary/5 p-3 text-sm text-foreground">
            <p className="font-medium mb-1">🚀 O que vai acontecer ao clicar em "Instalar":</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
              <li>Criar usuário master no banco de dados</li>
              <li>Criar salão, perfil e permissões</li>
              <li>Configurar níveis de acesso padrão</li>
              <li>Conectar este navegador ao banco externo</li>
            </ol>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={loading} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleNext} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isInstaller ? "Instalar Sistema" : "Próximo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
