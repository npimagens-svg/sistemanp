import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface UserWithAccess {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: AppRole;
  professional_id: string | null;
  professional_name: string | null;
  created_at: string;
}

export function useUserAccess() {
  const { salonId, isMaster } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-access", salonId],
    queryFn: async () => {
      if (!salonId) return [];

      // Get all user roles for the salon
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role, salon_id")
        .eq("salon_id", salonId);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // Get profiles for these users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Get professionals linked to users
      const { data: professionals, error: profError } = await supabase
        .from("professionals")
        .select("id, user_id, name")
        .eq("salon_id", salonId)
        .not("user_id", "is", null);

      if (profError) throw profError;

      // Combine data
      const usersWithAccess: UserWithAccess[] = [];
      
      for (const role of roles) {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        const professional = professionals?.find(p => p.user_id === role.user_id);
        
        // Get email from auth (we'll use the profile name for now)
        usersWithAccess.push({
          id: role.id,
          user_id: role.user_id,
          full_name: profile?.full_name || "Usuário",
          email: "", // Will be fetched separately if needed
          role: role.role as AppRole,
          professional_id: professional?.id || null,
          professional_name: professional?.name || null,
          created_at: new Date().toISOString(),
        });
      }

      return usersWithAccess;
    },
    enabled: !!salonId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      if (!salonId) throw new Error("Salão não encontrado");
      if (!isMaster) throw new Error("Apenas o usuário master pode alterar permissões");

      // Cannot change to admin (only one admin per salon)
      if (newRole === "admin") {
        throw new Error("Não é permitido definir um usuário como admin");
      }

      const { error } = await supabase.functions.invoke("update-user-role", {
        body: { userId, salonId, newRole },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-access", salonId] });
      toast({ title: "Permissão atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!salonId) throw new Error("Salão não encontrado");
      if (!isMaster) throw new Error("Apenas o usuário master pode remover acessos");

      const { error } = await supabase.functions.invoke("delete-user-access", {
        body: { userId, salonId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-access", salonId] });
      toast({ title: "Acesso removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover acesso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateRole: updateRoleMutation.mutate,
    deleteAccess: deleteAccessMutation.mutate,
    isUpdating: updateRoleMutation.isPending,
    isDeleting: deleteAccessMutation.isPending,
  };
}
