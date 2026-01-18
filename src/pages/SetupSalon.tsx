import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  salonName: z.string().min(2, "Nome do salão deve ter pelo menos 2 caracteres"),
});

export default function SetupSalon() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createSalonForCurrentUser, salonId, loading, user } = useAuth();

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [data, setData] = useState({ fullName: "", salonName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!loading && salonId) {
      navigate("/", { replace: true });
    }
  }, [loading, salonId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (loading || !user) {
      toast({
        title: "Sessão ainda carregando",
        description: "Aguarde alguns segundos e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setLoadingSubmit(true);
    const { error } = await createSalonForCurrentUser(data.fullName, data.salonName);
    setLoadingSubmit(false);

    if (error) {
      toast({ title: "Erro ao cadastrar salão", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Salão configurado com sucesso!" });
    navigate("/", { replace: true });
  };

  return (
    <AppLayoutNew>
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configurar Salão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Antes de liberar cadastros e agenda, precisamos criar o seu salão e vincular ao seu usuário.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input
                  id="fullName"
                  value={data.fullName}
                  onChange={(e) => setData((prev) => ({ ...prev, fullName: e.target.value }))}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salonName">Nome do salão</Label>
                <Input
                  id="salonName"
                  value={data.salonName}
                  onChange={(e) => setData((prev) => ({ ...prev, salonName: e.target.value }))}
                />
                {errors.salonName && <p className="text-sm text-destructive">{errors.salonName}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={loadingSubmit || loading} className="flex-1">
                  {loadingSubmit ? "Salvando..." : "Criar salão e continuar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayoutNew>
  );
}
