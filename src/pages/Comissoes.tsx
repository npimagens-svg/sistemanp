import { useState, useMemo } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, DollarSign, Calendar } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useComandas } from "@/hooks/useComandas";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Comissoes() {
  const [dateStart, setDateStart] = useState(() => {
    const d = startOfMonth(new Date());
    return format(d, "yyyy-MM-dd");
  });
  const [dateEnd, setDateEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [selectedProfessionalsForPayment, setSelectedProfessionalsForPayment] = useState<string[]>([]);

  const { professionals, isLoading: loadingProfessionals } = useProfessionals();
  const { comandas, isLoading: loadingComandas } = useComandas();

  // Filter closed comandas within date range
  const filteredComandas = useMemo(() => {
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    end.setHours(23, 59, 59, 999);

    return comandas.filter(comanda => {
      if (!comanda.closed_at) return false;
      const closedDate = new Date(comanda.closed_at);
      return isWithinInterval(closedDate, { start, end });
    });
  }, [comandas, dateStart, dateEnd]);

  // Calculate commissions per professional
  const professionalCommissions = useMemo(() => {
    const commissionMap = new Map<string, {
      professional: typeof professionals[0];
      totalServices: number;
      commission: number;
      discounts: number;
      totalToPay: number;
      comandaCount: number;
    }>();

    professionals.forEach(prof => {
      commissionMap.set(prof.id, {
        professional: prof,
        totalServices: 0,
        commission: 0,
        discounts: 0,
        totalToPay: 0,
        comandaCount: 0,
      });
    });

    filteredComandas.forEach(comanda => {
      if (!comanda.professional_id) return;
      const profData = commissionMap.get(comanda.professional_id);
      if (!profData) return;

      const commissionPercent = profData.professional.commission_percent || 0;
      const serviceTotal = comanda.subtotal || 0;
      const commission = (serviceTotal * commissionPercent) / 100;

      profData.totalServices += serviceTotal;
      profData.commission += commission;
      profData.totalToPay += commission;
      profData.comandaCount += 1;
    });

    return Array.from(commissionMap.values());
  }, [professionals, filteredComandas]);

  // Filter by selected professional
  const displayedCommissions = selectedProfessional === "all" 
    ? professionalCommissions 
    : professionalCommissions.filter(c => c.professional.id === selectedProfessional);

  // Totals
  const totals = useMemo(() => {
    const selected = selectedProfessionalsForPayment.length > 0
      ? displayedCommissions.filter(c => selectedProfessionalsForPayment.includes(c.professional.id))
      : displayedCommissions;

    return {
      commission: selected.reduce((sum, c) => sum + c.commission, 0),
      discounts: selected.reduce((sum, c) => sum + c.discounts, 0),
      totalToPay: selected.reduce((sum, c) => sum + c.totalToPay, 0),
    };
  }, [displayedCommissions, selectedProfessionalsForPayment]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const toggleProfessionalSelection = (profId: string) => {
    setSelectedProfessionalsForPayment(prev => 
      prev.includes(profId) 
        ? prev.filter(id => id !== profId)
        : [...prev, profId]
    );
  };

  const isLoading = loadingProfessionals || loadingComandas;

  if (isLoading) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Comissões</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Data Início:</Label>
                <Input 
                  type="date" 
                  value={dateStart} 
                  onChange={e => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim:</Label>
                <Input 
                  type="date" 
                  value={dateEnd} 
                  onChange={e => setDateEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Profissionais:</Label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {professionals.filter(p => p.is_active).map(prof => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo:</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cabeleireiro">Cabeleireiro</SelectItem>
                    <SelectItem value="manicure">Manicure</SelectItem>
                    <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button className="gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Rateio</TableHead>
                      <TableHead className="text-right">Descontos e Bônus</TableHead>
                      <TableHead className="text-right">Total a Pagar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedCommissions.map((item) => (
                      <TableRow 
                        key={item.professional.id}
                        className={item.totalToPay > 0 ? "" : "opacity-60"}
                      >
                        <TableCell>
                          {item.totalToPay > 0 && (
                            <Checkbox
                              checked={selectedProfessionalsForPayment.includes(item.professional.id)}
                              onCheckedChange={() => toggleProfessionalSelection(item.professional.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={item.professional.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(item.professional.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{item.professional.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.comandaCount} comanda{item.comandaCount !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.professional.specialty || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.commission)}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {item.discounts > 0 ? `- ${formatCurrency(item.discounts)}` : formatCurrency(0)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(item.totalToPay)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {displayedCommissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum profissional com comissões no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Rateio:</span>
                  <span className="font-medium">{formatCurrency(totals.commission)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Descontos e Bônus:</span>
                  <span className="font-medium">{formatCurrency(totals.discounts)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Total a Pagar:</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(totals.totalToPay)}</span>
                  </div>
                </div>

                <Button className="w-full gap-2 mt-4" disabled={selectedProfessionalsForPayment.length === 0}>
                  <DollarSign className="h-4 w-4" />
                  Pagar Profissional Selecionado
                </Button>
                
                <button className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1">
                  Solicitar Recalculo
                  <span className="text-muted-foreground">ℹ</span>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayoutNew>
  );
}
