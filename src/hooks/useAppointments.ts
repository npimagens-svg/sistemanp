import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export interface Appointment {
  id: string;
  salon_id: string;
  client_id: string | null;
  professional_id: string;
  service_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; phone: string | null } | null;
  professionals?: { name: string } | null;
  services?: { name: string } | null;
}

export interface AppointmentInput {
  client_id?: string;
  professional_id: string;
  service_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  status?: AppointmentStatus;
  notes?: string;
  price?: number;
}

export function useAppointments(date?: Date) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["appointments", salonId, date?.toISOString().split("T")[0]],
    queryFn: async () => {
      if (!salonId) return [];
      
      let query = supabase
        .from("appointments")
        .select(`
          *,
          clients(name, phone),
          professionals(name),
          services(name)
        `)
        .eq("salon_id", salonId)
        .order("scheduled_at");
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte("scheduled_at", startOfDay.toISOString())
          .lte("scheduled_at", endOfDay.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: AppointmentInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
      toast({ title: "Agendamento criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<AppointmentInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
      toast({ title: "Agendamento atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar agendamento", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
      toast({ title: "Agendamento removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover agendamento", description: error.message, variant: "destructive" });
    },
  });

  return {
    appointments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createAppointment: createMutation.mutate,
    updateAppointment: updateMutation.mutate,
    deleteAppointment: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
