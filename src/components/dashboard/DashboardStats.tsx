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
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      // Today's revenue (closed comandas)
      const { data: todayCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", todayStart)
        .lt("closed_at", todayEnd)
        .eq("is_paid", true);

      const todayRevenue = todayCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;

      // Yesterday's revenue
      const { data: yesterdayCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", yesterdayStart)
        .lt("closed_at", todayStart)
        .eq("is_paid", true);

      const yesterdayRevenue = yesterdayCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;

      // Today's appointments
      const { count: todayAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("scheduled_at", todayStart)
        .lt("scheduled_at", todayEnd);

      // Yesterday's appointments
      const { count: yesterdayAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("scheduled_at", yesterdayStart)
        .lt("scheduled_at", todayStart);

      // This week ticket
      const { data: weekCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", weekStart.toISOString())
        .eq("is_paid", true);

      const weekRevenue = weekCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;
      const weekCount = weekCom?.length ?? 0;
      const weekTicket = weekCount > 0 ? weekRevenue / weekCount : 0;

      // Last week ticket
      const { data: lastWeekCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", lastWeekStart.toISOString())
        .lt("closed_at", weekStart.toISOString())
        .eq("is_paid", true);

      const lastWeekRevenue = lastWeekCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;
      const lastWeekCount = lastWeekCom?.length ?? 0;
      const lastWeekTicket = lastWeekCount > 0 ? lastWeekRevenue / lastWeekCount : 0;

      // New clients today
      const { count: newClientsToday } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      // New clients yesterday
      const { count: newClientsYesterday } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("created_at", yesterdayStart)
        .lt("created_at", todayStart);

      const todayTicket = (todayAppts ?? 0) > 0 ? todayRevenue / (todayAppts ?? 1) : 0;

      return {
        todayRevenue,
        revenueChange: calcChange(todayRevenue, yesterdayRevenue),
        todayAppts: todayAppts ?? 0,
        apptsChange: calcChange(todayAppts ?? 0, yesterdayAppts ?? 0),
        weekTicket,
        ticketChange: calcChange(weekTicket, lastWeekTicket),
        newClients: newClientsToday ?? 0,
        clientsChange: calcChange(newClientsToday ?? 0, newClientsYesterday ?? 0),
      };
    },
    enabled: !!salonId,
    refetchInterval: 60000,
  });

  const stats = [
    {
      title: "Faturamento Hoje",
      value: formatCurrency(data?.todayRevenue ?? 0),
      change: data?.revenueChange ?? 0,
      changeLabel: "vs ontem",
      icon: <DollarSign className="h-6 w-6" />,
    },
    {
      title: "Atendimentos Hoje",
      value: String(data?.todayAppts ?? 0),
      change: data?.apptsChange ?? 0,
      changeLabel: "vs ontem",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(data?.weekTicket ?? 0),
      change: data?.ticketChange ?? 0,
      changeLabel: "vs semana",
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      title: "Novos Clientes",
      value: String(data?.newClients ?? 0),
      change: data?.clientsChange ?? 0,
      changeLabel: "vs ontem",
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
