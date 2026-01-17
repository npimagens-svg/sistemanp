import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Professional {
  id: string;
  salon_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  specialty: string | null;
  commission_percent: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalInput {
  name: string;
  nickname?: string;
  cpf?: string;
  role?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  commission_percent?: number;
  is_active?: boolean;
  can_be_assistant?: boolean;
  has_schedule?: boolean;
  create_access?: boolean;
}

export function useProfessionals() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["professionals", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProfessionalInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      const { data, error } = await supabase
        .from("professionals")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      toast({ title: "Profissional criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar profissional", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ProfessionalInput & { id: string }) => {
      const { data, error } = await supabase
        .from("professionals")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      toast({ title: "Profissional atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar profissional", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professionals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      toast({ title: "Profissional removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover profissional", description: error.message, variant: "destructive" });
    },
  });

  return {
    professionals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProfessional: createMutation.mutate,
    updateProfessional: updateMutation.mutate,
    deleteProfessional: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
