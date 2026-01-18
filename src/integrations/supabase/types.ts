export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          price: number | null
          professional_id: string
          salon_id: string
          scheduled_at: string
          service_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number | null
          professional_id: string
          salon_id: string
          scheduled_at: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number | null
          professional_id?: string
          salon_id?: string
          scheduled_at?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas: {
        Row: {
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number
          salon_id: string
          total_cash: number | null
          total_credit_card: number | null
          total_debit_card: number | null
          total_other: number | null
          total_pix: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          salon_id: string
          total_cash?: number | null
          total_credit_card?: number | null
          total_debit_card?: number | null
          total_other?: number | null
          total_pix?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          salon_id?: string
          total_cash?: number | null
          total_credit_card?: number | null
          total_debit_card?: number | null
          total_other?: number | null
          total_pix?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixas_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          action_type: string
          client_id: string
          created_at: string
          description: string
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string
          salon_id: string
        }
        Insert: {
          action_type: string
          client_id: string
          created_at?: string
          description: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by: string
          salon_id: string
        }
        Update: {
          action_type?: string
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_history_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          add_cpf_invoice: boolean | null
          address: string | null
          address_complement: string | null
          address_number: string | null
          allow_ai_service: boolean | null
          allow_email_campaigns: boolean | null
          allow_online_booking: boolean | null
          allow_sms_campaigns: boolean | null
          allow_whatsapp_campaigns: boolean | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          gender: string | null
          how_met: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          phone_landline: string | null
          profession: string | null
          rg: string | null
          salon_id: string
          state: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          add_cpf_invoice?: boolean | null
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          allow_ai_service?: boolean | null
          allow_email_campaigns?: boolean | null
          allow_online_booking?: boolean | null
          allow_sms_campaigns?: boolean | null
          allow_whatsapp_campaigns?: boolean | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          how_met?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_landline?: string | null
          profession?: string | null
          rg?: string | null
          salon_id: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          add_cpf_invoice?: boolean | null
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          allow_ai_service?: boolean | null
          allow_email_campaigns?: boolean | null
          allow_online_booking?: boolean | null
          allow_sms_campaigns?: boolean | null
          allow_whatsapp_campaigns?: boolean | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          how_met?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_landline?: string | null
          profession?: string | null
          rg?: string | null
          salon_id?: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_deletions: {
        Row: {
          client_id: string | null
          client_name: string | null
          comanda_id: string
          comanda_total: number
          deleted_at: string
          deleted_by: string
          id: string
          original_closed_at: string | null
          original_created_at: string | null
          professional_id: string | null
          professional_name: string | null
          reason: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          comanda_id: string
          comanda_total?: number
          deleted_at?: string
          deleted_by: string
          id?: string
          original_closed_at?: string | null
          original_created_at?: string | null
          professional_id?: string | null
          professional_name?: string | null
          reason: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          comanda_id?: string
          comanda_total?: number
          deleted_at?: string
          deleted_by?: string
          id?: string
          original_closed_at?: string | null
          original_created_at?: string | null
          professional_id?: string | null
          professional_name?: string | null
          reason?: string
        }
        Relationships: []
      }
      comanda_items: {
        Row: {
          comanda_id: string
          created_at: string
          description: string
          id: string
          item_type: string
          product_id: string | null
          professional_id: string | null
          quantity: number
          service_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          comanda_id: string
          created_at?: string
          description: string
          id?: string
          item_type?: string
          product_id?: string | null
          professional_id?: string | null
          quantity?: number
          service_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          comanda_id?: string
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          product_id?: string | null
          professional_id?: string | null
          quantity?: number
          service_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_items_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          appointment_id: string | null
          caixa_id: string | null
          client_id: string | null
          closed_at: string | null
          created_at: string
          discount: number | null
          id: string
          is_paid: boolean | null
          professional_id: string | null
          salon_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          caixa_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          is_paid?: boolean | null
          professional_id?: string | null
          salon_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          caixa_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          is_paid?: boolean | null
          professional_id?: string | null
          salon_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comandas_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          payment_id: string | null
          salon_id: string
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          payment_id?: string | null
          salon_id: string
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          payment_id?: string | null
          salon_id?: string
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          comanda_id: string
          created_at: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          salon_id: string
        }
        Insert: {
          amount: number
          comanda_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          salon_id: string
        }
        Update: {
          amount?: number
          comanda_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          min_stock: number | null
          name: string
          sale_price: number | null
          salon_id: string
          sku: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name: string
          sale_price?: number | null
          salon_id: string
          sku?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name?: string
          sale_price?: number | null
          salon_id?: string
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_service_commissions: {
        Row: {
          assistant_commission_percent: number | null
          commission_percent: number
          created_at: string
          duration_minutes: number | null
          id: string
          professional_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          assistant_commission_percent?: number | null
          commission_percent?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          professional_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          assistant_commission_percent?: number | null
          commission_percent?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          professional_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_service_commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_service_commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          can_be_assistant: boolean | null
          commission_percent: number | null
          cpf: string | null
          create_access: boolean | null
          created_at: string
          email: string | null
          has_schedule: boolean | null
          id: string
          is_active: boolean | null
          name: string
          nickname: string | null
          phone: string | null
          role: string | null
          salon_id: string
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_be_assistant?: boolean | null
          commission_percent?: number | null
          cpf?: string | null
          create_access?: boolean | null
          created_at?: string
          email?: string | null
          has_schedule?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          nickname?: string | null
          phone?: string | null
          role?: string | null
          salon_id: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_be_assistant?: boolean | null
          commission_percent?: number | null
          cpf?: string | null
          create_access?: boolean | null
          created_at?: string
          email?: string | null
          has_schedule?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          nickname?: string | null
          phone?: string | null
          role?: string | null
          salon_id?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          salon_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          salon_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          salon_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          commission_percent: number | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          quantity: number
          salon_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          notes?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          salon_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_salon_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "receptionist"
        | "financial"
        | "professional"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "no_show"
        | "cancelled"
      payment_method: "cash" | "pix" | "credit_card" | "debit_card" | "other"
      stock_movement_type: "entry" | "exit" | "adjustment"
      transaction_type: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "receptionist",
        "financial",
        "professional",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "no_show",
        "cancelled",
      ],
      payment_method: ["cash", "pix", "credit_card", "debit_card", "other"],
      stock_movement_type: ["entry", "exit", "adjustment"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
