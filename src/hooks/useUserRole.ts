import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "receptionist" | "financial" | "professional";

interface UserRoleData {
  role: AppRole | null;
  isAdmin: boolean;
  isMaster: boolean;
  canDelete: boolean;
  isLoading: boolean;
}

// Master user email - only this user can delete records
const MASTER_USER_EMAIL = "vanieri_2006@hotmail.com";

export function useUserRole(): UserRoleData {
  const { user, salonId } = useAuth();

  const query = useQuery({
    queryKey: ["user-role", user?.id, salonId],
    queryFn: async () => {
      if (!user?.id || !salonId) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("salon_id", salonId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role as AppRole | null;
    },
    enabled: !!user?.id && !!salonId,
  });

  const isMaster = user?.email === MASTER_USER_EMAIL;
  const isAdmin = query.data === "admin";
  
  // Only the master user can delete
  const canDelete = isMaster;

  return {
    role: query.data ?? null,
    isAdmin,
    isMaster,
    canDelete,
    isLoading: query.isLoading,
  };
}
