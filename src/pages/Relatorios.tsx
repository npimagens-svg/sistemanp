import { useState, useMemo } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, DollarSign, Users, TrendingUp, ShoppingBag, Loader2, BarChart3, PieChart, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { EmailReportsTab } from "@/components/reports/EmailReportsTab";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts";

type DateRange = { from: Date; to: Date };

const PRESET_RANGES = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Últimos 7 dias", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
];

const COLORS = ["hsl(217, 91%, 50%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)"];

export default function Relatorios() {
  const { salonId } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>(PRESET_RANGES[2].getValue());
  const [activePreset, setActivePreset] = useState("Últimos 30 dias");

  // Fetch comandas with payments for the period
  const { data: comandas, isLoading: loadingComandas } = useQuery({
    queryKey: ["report-comandas", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select("*, comanda_items(*, service_id, product_id, professional_id), payments(amount, payment_method), clients(name)")
        .eq("salon_id", salonId)
        .gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Fetch appointments
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["report-appointments", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name), professionals(name), clients(name)")
        .eq("salon_id", salonId)
        .gte("scheduled_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("scheduled_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Fetch new clients
  const { data: newClients } = useQuery({
    queryKey: ["report-new-clients", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, created_at")
        .eq("salon_id", salonId)
        .gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!comandas) return { totalRevenue: 0, totalComandas: 0, avgTicket: 0, newClients: 0 };
    const totalRevenue = comandas.reduce((sum, c) => sum + Number(c.total || 0), 0);
    const totalComandas = comandas.length;
    const avgTicket = totalComandas > 0 ? totalRevenue / totalComandas : 0;
    return { totalRevenue, totalComandas, avgTicket, newClients: newClients?.length || 0 };
  }, [comandas, newClients]);

  // Revenue by day chart data
  const revenueByDay = useMemo(() => {
    if (!comandas) return [];
    const byDay: Record<string, number> = {};
    comandas.forEach(c => {
      const day = format(new Date(c.created_at), "dd/MM");
      byDay[day] = (byDay[day] || 0) + Number(c.total || 0);
    });
    return Object.entries(byDay).map(([day, receita]) => ({ day, receita }));
  }, [comandas]);

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    if (!comandas) return [];
    const methods: Record<string, number> = {};
    comandas.forEach(c => {
      (c.payments as any[])?.forEach((p: any) => {
        const label = { cash: "Dinheiro", pix: "PIX", credit_card: "Crédito", debit_card: "Débito", other: "Outro" }[p.payment_method as string] || p.payment_method;
        methods[label] = (methods[label] || 0) + Number(p.amount || 0);
      });
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [comandas]);

  // Top services
  const topServices = useMemo(() => {
    if (!comandas) return [];
    const services: Record<string, { count: number; revenue: number }> = {};
    comandas.forEach(c => {
      (c.comanda_items as any[])?.forEach((item: any) => {
        if (item.item_type === "service") {
          const name = item.description || "Serviço";
          if (!services[name]) services[name] = { count: 0, revenue: 0 };
          services[name].count += item.quantity;
          services[name].revenue += Number(item.total_price || 0);
        }
      });
    });
    return Object.entries(services)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [comandas]);

  // Top professionals
  const topProfessionals = useMemo(() => {
    if (!comandas) return [];
    const profs: Record<string, { count: number; revenue: number }> = {};
    comandas.forEach(c => {
      (c.comanda_items as any[])?.forEach((item: any) => {
        const profId = item.professional_id || "unknown";
        if (!profs[profId]) profs[profId] = { count: 0, revenue: 0 };
        profs[profId].count += item.quantity;
        profs[profId].revenue += Number(item.total_price || 0);
      });
    });
    return Object.entries(profs)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [comandas]);

  const isLoading = loadingComandas || loadingAppointments;

  const handlePreset = (preset: typeof PRESET_RANGES[0]) => {
    setDateRange(preset.getValue());
    setActivePreset(preset.label);
  };

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada do desempenho do salão</p>
        </div>

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral" className="gap-2"><BarChart3 className="h-4 w-4" />Geral</TabsTrigger>
            <TabsTrigger value="emails" className="gap-2"><Mail className="h-4 w-4" />E-mails</TabsTrigger>
          </TabsList>

          <TabsContent value="emails">
            <EmailReportsTab />
          </TabsContent>

          <TabsContent value="geral" className="space-y-6">
        {/* Date filters */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_RANGES.map(preset => (
              <Button
                key={preset.label}
                variant={activePreset === preset.label ? "default" : "outline"}
                size="sm"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setActivePreset("");
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>



        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Faturamento Total</p>
                      <p className="text-2xl font-bold">R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DollarSign className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Comandas Fechadas</p>
                      <p className="text-2xl font-bold">{stats.totalComandas}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold">R$ {stats.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Novos Clientes</p>
                      <p className="text-2xl font-bold">{stats.newClients}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Faturamento por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {revenueByDay.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
                          <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado para o período selecionado</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Formas de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {paymentBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {paymentBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum pagamento no período</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Services Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Top Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {topServices.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topServices} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={100} />
                        <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum serviço no período</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appointments summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Resumo de Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total", count: appointments?.length || 0, color: "text-primary" },
                    { label: "Concluídos", count: appointments?.filter(a => a.status === "completed").length || 0, color: "text-green-600" },
                    { label: "Cancelados", count: appointments?.filter(a => a.status === "cancelled").length || 0, color: "text-destructive" },
                    { label: "No-show", count: appointments?.filter(a => a.status === "no_show").length || 0, color: "text-orange-500" },
                  ].map(item => (
                    <div key={item.label} className="text-center p-4 rounded-lg border">
                      <p className={cn("text-3xl font-bold", item.color)}>{item.count}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayoutNew>
  );
}
