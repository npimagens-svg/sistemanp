import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Comanda {
  id: string;
  salon_id: string;
  client_id: string | null;
  professional_id: string | null;
  appointment_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  is_paid: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
  };
  professional?: {
    id: string;
    name: string;
  };
}

export interface ComandaItem {
  id: string;
  comanda_id: string;
  service_id: string | null;
  product_id: string | null;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface ComandaInput {
  client_id?: string | null;
  professional_id?: string | null;
  appointment_id?: string | null;
  discount?: number;
}

export interface ComandaItemInput {
  comanda_id: string;
  service_id?: string | null;
  product_id?: string | null;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function useComandas() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comandas", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select(`
          *,
          client:clients(id, name),
          professional:professionals(id, name)
        `)
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Comanda[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ComandaInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      const { data, error } = await supabase
        .from("comandas")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      toast({ title: "Comanda criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar comanda", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ComandaInput & { id: string }) => {
      const { data, error } = await supabase
        .from("comandas")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      toast({ title: "Comanda atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar comanda", description: error.message, variant: "destructive" });
    },
  });

  const closeComandaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("comandas")
        .update({ closed_at: new Date().toISOString(), is_paid: true })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      toast({ title: "Comanda fechada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao fechar comanda", description: error.message, variant: "destructive" });
    },
  });

  return {
    comandas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createComanda: createMutation.mutate,
    updateComanda: updateMutation.mutate,
    closeComanda: closeComandaMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isClosing: closeComandaMutation.isPending,
  };
}

export function useClientComandas(clientId: string | null) {
  const { salonId } = useAuth();

  const query = useQuery({
    queryKey: ["client_comandas", clientId, salonId],
    queryFn: async () => {
      if (!clientId || !salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select(`
          *,
          professional:professionals(id, name),
          items:comanda_items(
            id,
            description,
            item_type,
            quantity,
            unit_price,
            total_price,
            service_id,
            product_id
          )
        `)
        .eq("salon_id", salonId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!salonId,
  });

  return {
    comandas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useComandaItems(comandaId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comanda_items", comandaId],
    queryFn: async () => {
      if (!comandaId) return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("*")
        .eq("comanda_id", comandaId)
        .order("created_at");
      if (error) throw error;
      return data as ComandaItem[];
    },
    enabled: !!comandaId,
  });

  const addItemMutation = useMutation({
    mutationFn: async (input: ComandaItemInput) => {
      const { data, error } = await supabase
        .from("comanda_items")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comanda_items", comandaId] });
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      toast({ title: "Item adicionado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar item", description: error.message, variant: "destructive" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("comanda_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comanda_items", comandaId] });
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      toast({ title: "Item removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover item", description: error.message, variant: "destructive" });
    },
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    isAdding: addItemMutation.isPending,
    isRemoving: removeItemMutation.isPending,
  };
}
