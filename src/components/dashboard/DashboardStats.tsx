import { DollarSign, Users, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, change, changeLabel, icon, loading }: StatCardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            <div className="flex items-center gap-1 text-sm">
              {isNeutral ? (
                <Minus className="h-4 w-4 text-muted-foreground" />
              ) : isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={isNeutral ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"}>
                {isPositive && "+"}{change}%
              </span>
              <span className="text-muted-foreground">{changeLabel}</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function DashboardStats() {
  const { salonId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", salonId],
    queryFn: async () => {
      if (!salonId) return null;

      const now = new Date();
      // This month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      // Last month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = monthStart;

      // This month revenue
      const { data: monthCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", monthStart)
        .lt("closed_at", monthEnd)
        .eq("is_paid", true);

      const monthRevenue = monthCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;

      // Last month revenue
      const { data: lastMonthCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", lastMonthStart)
        .lt("closed_at", lastMonthEnd)
        .eq("is_paid", true);

      const lastMonthRevenue = lastMonthCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;

      // This month appointments
      const { count: monthAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("scheduled_at", monthStart)
        .lt("scheduled_at", monthEnd);

      // Last month appointments
      const { count: lastMonthAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("scheduled_at", lastMonthStart)
        .lt("scheduled_at", lastMonthEnd);

      // This month ticket
      const monthCount = monthCom?.length ?? 0;
      const monthTicket = monthCount > 0 ? monthRevenue / monthCount : 0;

      // Last month ticket
      const lastMonthCount = lastMonthCom?.length ?? 0;
      const lastMonthTicket = lastMonthCount > 0 ? lastMonthRevenue / lastMonthCount : 0;

      // New clients this month
      const { count: newClientsMonth } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      // New clients last month
      const { count: newClientsLastMonth } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("created_at", lastMonthStart)
        .lt("created_at", lastMonthEnd);

      return {
        monthRevenue,
        revenueChange: calcChange(monthRevenue, lastMonthRevenue),
        monthAppts: monthAppts ?? 0,
        apptsChange: calcChange(monthAppts ?? 0, lastMonthAppts ?? 0),
        monthTicket,
        ticketChange: calcChange(monthTicket, lastMonthTicket),
        newClients: newClientsMonth ?? 0,
        clientsChange: calcChange(newClientsMonth ?? 0, newClientsLastMonth ?? 0),
      };
    },
    enabled: !!salonId,
    refetchInterval: 60000,
  });

  const stats = [
    {
      title: "Faturamento do Mês",
      value: formatCurrency(data?.monthRevenue ?? 0),
      change: data?.revenueChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: <DollarSign className="h-6 w-6" />,
    },
    {
      title: "Atendimentos do Mês",
      value: String(data?.monthAppts ?? 0),
      change: data?.apptsChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(data?.monthTicket ?? 0),
      change: data?.ticketChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      title: "Novos Clientes",
      value: String(data?.newClients ?? 0),
      change: data?.clientsChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: <Users className="h-6 w-6" />,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} loading={isLoading} />
      ))}
    </div>
  );
}
