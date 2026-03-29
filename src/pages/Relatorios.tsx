// @ts-nocheck
import { useState, useMemo, lazy, Suspense } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, DollarSign, Users, TrendingUp, ShoppingBag, Loader2,
  BarChart3, PieChart, Mail, FileText, UserCog, Scissors, CreditCard, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { EmailReportsTab } from "@/components/reports/EmailReportsTab";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts";

// Report components
import { Report0004 } from "@/components/reports/Report0004";
import { Report0008 } from "@/components/reports/Report0008";
import { Report0010 } from "@/components/reports/Report0010";
import { Report0015 } from "@/components/reports/Report0015";
import { Report0020 } from "@/components/reports/Report0020";
import { Report0021 } from "@/components/reports/Report0021";
import { Report0024 } from "@/components/reports/Report0024";
import { Report0028 } from "@/components/reports/Report0028";
import { Report1128 } from "@/components/reports/Report1128";
import { Report0033 } from "@/components/reports/Report0033";
import { Report0085 } from "@/components/reports/Report0085";
import { Report0175 } from "@/components/reports/Report0175";
import { Report0180 } from "@/components/reports/Report0180";
import { Report0281 } from "@/components/reports/Report0281";

type DateRange = { from: Date; to: Date };

const PRESET_RANGES = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Últimos 7 dias", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
];

const COLORS = ["hsl(217, 91%, 50%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)"];

// Report catalog
const REPORT_CATEGORIES = [
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    reports: [
      { id: "0004", label: "Lista de dados cadastrais de clientes", needsDate: false },
      { id: "0008", label: "Clientes que fizeram um serviço específico", needsDate: true },
      { id: "0010", label: "Clientes com celulares duplicados", needsDate: false },
      { id: "0015", label: "Clientes por perfil de compra", needsDate: true, hasChart: true },
      { id: "0020", label: "Clientes com retorno atrasado", needsDate: false },
    ],
  },
  {
    id: "profissionais",
    label: "Profissionais",
    icon: UserCog,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    reports: [
      { id: "0021", label: "Faturamento e ticket médio por profissional", needsDate: true, hasChart: true },
      { id: "0024", label: "Serviços por profissional", needsDate: true, hasChart: true },
      { id: "0028", label: "Comissões pagas no período", needsDate: true },
      { id: "1128", label: "Vendas por categoria de um profissional", needsDate: true, hasChart: true },
    ],
  },
  {
    id: "servicos",
    label: "Serviços",
    icon: Scissors,
    color: "text-green-600",
    bgColor: "bg-green-50",
    reports: [
      { id: "0033", label: "Tabela de preços dos serviços", needsDate: false },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    reports: [
      { id: "0085", label: "Evolução do faturamento mensal", needsDate: false, hasChart: true },
      { id: "0175", label: "Faturamento de serviço por profissional", needsDate: true },
      { id: "0180", label: "Serviços e produtos vendidos no período", needsDate: true },
      { id: "0281", label: "Entradas por forma de pagamento", needsDate: true, hasChart: true },
    ],
  },
];

function ReportSelector({ onSelect }: { onSelect: (reportId: string) => void }) {
  return (
    <div className="space-y-6">
      {REPORT_CATEGORIES.map(cat => (
        <div key={cat.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <cat.icon className={cn("h-5 w-5", cat.color)} />
            <h3 className="text-lg font-semibold">{cat.label}</h3>
            <Badge variant="secondary">{cat.reports.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.reports.map(report => (
              <Card
                key={report.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => onSelect(report.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium text-sm leading-tight">{report.label}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">#{report.id}</Badge>
                        {report.hasChart && (
                          <Badge variant="secondary" className="text-xs">
                            <BarChart3 className="h-3 w-3 mr-1" />Gráfico
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cat.bgColor)}>
                      <cat.icon className={cn("h-4 w-4", cat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveReport({ reportId, dateRange }: { reportId: string; dateRange: DateRange }) {
  switch (reportId) {
    case "0004": return <Report0004 />;
    case "0008": return <Report0008 dateRange={dateRange} />;
    case "0010": return <Report0010 />;
    case "0015": return <Report0015 dateRange={dateRange} />;
    case "0020": return <Report0020 />;
    case "0021": return <Report0021 dateRange={dateRange} />;
    case "0024": return <Report0024 dateRange={dateRange} />;
    case "0028": return <Report0028 dateRange={dateRange} />;
    case "1128": return <Report1128 dateRange={dateRange} />;
    case "0033": return <Report0033 />;
    case "0085": return <Report0085 />;
    case "0175": return <Report0175 dateRange={dateRange} />;
    case "0180": return <Report0180 dateRange={dateRange} />;
    case "0281": return <Report0281 dateRange={dateRange} />;
    default: return <div className="text-center py-8 text-muted-foreground">Relatório não encontrado</div>;
  }
}

function getReportInfo(reportId: string) {
  for (const cat of REPORT_CATEGORIES) {
    const report = cat.reports.find(r => r.id === reportId);
    if (report) return { ...report, category: cat };
  }
  return null;
}

export default function Relatorios() {
  const { salonId } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>(PRESET_RANGES[2].getValue());
  const [activePreset, setActivePreset] = useState("Últimos 30 dias");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Fetch comandas with payments for the period (used by Geral tab)
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

  const reportInfo = selectedReport ? getReportInfo(selectedReport) : null;

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada do desempenho do salão</p>
        </div>

        <Tabs defaultValue="relatorios" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral" className="gap-2"><BarChart3 className="h-4 w-4" />Geral</TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-2"><FileText className="h-4 w-4" />Relatórios</TabsTrigger>
            <TabsTrigger value="emails" className="gap-2"><Mail className="h-4 w-4" />E-mails</TabsTrigger>
          </TabsList>

          {/* ===== RELATÓRIOS TAB ===== */}
          <TabsContent value="relatorios" className="space-y-6">
            {selectedReport ? (
              <>
                {/* Back button + date range */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />Voltar
                  </Button>

                  {reportInfo?.needsDate && (
                    <>
                      <div className="h-6 w-px bg-border" />
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
                    </>
                  )}
                </div>

                {/* Report breadcrumb */}
                {reportInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <reportInfo.category.icon className={cn("h-4 w-4", reportInfo.category.color)} />
                    <span>{reportInfo.category.label}</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">#{reportInfo.id} — {reportInfo.label}</span>
                  </div>
                )}

                {/* Active report */}
                <ActiveReport reportId={selectedReport} dateRange={dateRange} />
              </>
            ) : (
              <ReportSelector onSelect={setSelectedReport} />
            )}
          </TabsContent>

          {/* ===== E-MAILS TAB ===== */}
          <TabsContent value="emails">
            <EmailReportsTab />
          </TabsContent>

          {/* ===== GERAL TAB ===== */}
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
