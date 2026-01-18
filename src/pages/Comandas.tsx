import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, MoreHorizontal, Loader2, Receipt, CheckCircle, Clock, Pencil, Trash2, Printer, Calendar, Eye, FileSpreadsheet, FileText } from "lucide-react";
import { useComandas, Comanda, ComandaInput, useComandaItems } from "@/hooks/useComandas";
import { useClients } from "@/hooks/useClients";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface AppointmentData {
  id: string;
  client_id: string | null;
  professional_id: string;
  service_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price: number | null;
  notes: string | null;
  clients?: { id: string; name: string; phone: string | null } | null;
  professionals?: { id: string; name: string } | null;
  services?: { id: string; name: string; price: number } | null;
}

export default function Comandas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("abertas");
  const [formData, setFormData] = useState<ComandaInput>({
    client_id: null,
    professional_id: null,
  });
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [isProcessingAppointment, setIsProcessingAppointment] = useState(false);

  const { comandas, isLoading, createComanda, closeComanda, findOrCreateTodayComanda, isCreating, isClosing } = useComandas();
  const { clients } = useClients();
  const { professionals } = useProfessionals();
  const { services } = useServices();
  const { items: comandaItems, addItem, isAdding } = useComandaItems(selectedComanda?.id || null);

  // Process appointment parameter from URL
  useEffect(() => {
    const appointmentId = searchParams.get("appointment");
    if (appointmentId && !isProcessingAppointment) {
      processAppointment(appointmentId);
    }
  }, [searchParams]);

  const processAppointment = async (appointmentId: string) => {
    setIsProcessingAppointment(true);
    
    try {
      // Fetch appointment data
      const { data: appointment, error } = await supabase
        .from("appointments")
        .select(`
          id,
          client_id,
          professional_id,
          service_id,
          scheduled_at,
          duration_minutes,
          price,
          notes,
          clients(id, name, phone),
          professionals(id, name),
          services(id, name, price)
        `)
        .eq("id", appointmentId)
        .single();

      if (error) throw error;
      if (!appointment) {
        toast({ title: "Agendamento não encontrado", variant: "destructive" });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      const appointmentData = appointment as unknown as AppointmentData;

      // Verify appointment is for today
      const appointmentDate = new Date(appointmentData.scheduled_at);
      const today = new Date();
      if (!isSameDay(appointmentDate, today)) {
        toast({ 
          title: "Não é possível abrir comanda", 
          description: "Só é possível abrir comandas para agendamentos de hoje.",
          variant: "destructive" 
        });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      // Check if client exists
      if (!appointmentData.client_id) {
        toast({ 
          title: "Cliente não definido", 
          description: "O agendamento precisa ter um cliente para abrir uma comanda.",
          variant: "destructive" 
        });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      // Find or create comanda for this client today
      const comanda = await findOrCreateTodayComanda(
        appointmentData.client_id,
        appointmentData.professional_id,
        appointmentData.id
      );

      // Check if service already exists in comanda items
      if (appointmentData.service_id && comanda.id) {
        const { data: existingItems } = await supabase
          .from("comanda_items")
          .select("*")
          .eq("comanda_id", comanda.id)
          .eq("service_id", appointmentData.service_id);

        // Only add service if it doesn't exist yet
        if (!existingItems || existingItems.length === 0) {
          const servicePrice = appointmentData.price ?? appointmentData.services?.price ?? 0;
          
          await supabase.from("comanda_items").insert({
            comanda_id: comanda.id,
            service_id: appointmentData.service_id,
            description: appointmentData.services?.name || "Serviço",
            item_type: "service",
            quantity: 1,
            unit_price: servicePrice,
            total_price: servicePrice,
          });

          // Update comanda totals
          await supabase
            .from("comandas")
            .update({
              subtotal: (comanda.subtotal || 0) + Number(servicePrice),
              total: (comanda.total || 0) + Number(servicePrice),
            })
            .eq("id", comanda.id);
        }
      }

      // Set as selected comanda
      setSelectedComanda(comanda);
      
      // Clear URL parameter
      searchParams.delete("appointment");
      setSearchParams(searchParams);

      toast({ title: "Comanda aberta", description: `Cliente: ${appointmentData.clients?.name}` });
      
    } catch (error: any) {
      console.error("Error processing appointment:", error);
      toast({ title: "Erro ao processar agendamento", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingAppointment(false);
    }
  };

  const filteredComandas = comandas.filter((comanda) => {
    const clientName = comanda.client?.name?.toLowerCase() || "";
    const professionalName = comanda.professional?.name?.toLowerCase() || "";
    return (
      clientName.includes(searchQuery.toLowerCase()) ||
      professionalName.includes(searchQuery.toLowerCase())
    );
  });

  const openComandas = filteredComandas.filter((c) => !c.closed_at);
  const closedComandas = filteredComandas.filter((c) => c.closed_at);

  const handleCreate = () => {
    createComanda(formData);
    setModalOpen(false);
    setFormData({ client_id: null, professional_id: null });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getComandaNumber = (comanda: Comanda) => {
    const date = new Date(comanda.created_at);
    const dateStr = format(date, "dd/MM/yyyy");
    return `Nº${comanda.id.slice(0, 4).toUpperCase()} (${dateStr})`;
  };

  const handleOpenComanda = (comanda: Comanda) => {
    setSelectedComanda(comanda);
  };

  if (isLoading || isProcessingAppointment) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          {isProcessingAppointment && (
            <span className="ml-2 text-muted-foreground">Processando agendamento...</span>
          )}
        </div>
      </AppLayoutNew>
    );
  }

  // If a comanda is selected, show detail view
  if (selectedComanda) {
    return (
      <AppLayoutNew>
        <ComandaDetailView 
          comanda={selectedComanda} 
          onClose={() => setSelectedComanda(null)}
          professionals={professionals}
          services={services}
        />
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Abrir Comanda
          </Button>
          <Badge variant="outline" className="gap-1 px-3 py-1.5">
            Comandas Pendentes
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs ml-1">
              {openComandas.length}
            </span>
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="abertas">Abertas ({openComandas.length})</TabsTrigger>
            <TabsTrigger value="fechadas">Fechadas ({closedComandas.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Table Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select defaultValue="10">
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <div className="relative">
              <span className="text-sm text-muted-foreground mr-2">Buscar:</span>
              <Input 
                placeholder="" 
                className="w-48 h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Comandas Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50">
                    Comanda ▼
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50">
                    Cliente ▼
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50">
                    Data de abertura ▼
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-right">
                    Valor ▼
                  </TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "abertas" ? openComandas : closedComandas).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma comanda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  (activeTab === "abertas" ? openComandas : closedComandas).map((comanda) => (
                    <TableRow key={comanda.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenComanda(comanda)}>
                      <TableCell className="font-medium">
                        {getComandaNumber(comanda)}
                      </TableCell>
                      <TableCell className="uppercase">
                        {comanda.client?.name || "Cliente não definido"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(comanda.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(comanda.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenComanda(comanda)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando 1 até {Math.min(10, (activeTab === "abertas" ? openComandas : closedComandas).length)} de {(activeTab === "abertas" ? openComandas : closedComandas).length} registros</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled>← Anterior</Button>
            <Button variant="default" size="sm">1</Button>
            <Button variant="outline" size="sm">Próximo →</Button>
          </div>
        </div>
      </div>

      {/* Modal Nova Comanda */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Comanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formData.client_id || ""}
                onValueChange={(value) => setFormData({ ...formData, client_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select
                value={formData.professional_id || ""}
                onValueChange={(value) => setFormData({ ...formData, professional_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Comanda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayoutNew>
  );
}

// Comanda Detail View Component
interface ComandaDetailViewProps {
  comanda: Comanda;
  onClose: () => void;
  professionals: any[];
  services: any[];
}

function ComandaDetailView({ comanda, onClose, professionals, services }: ComandaDetailViewProps) {
  const [activeTab, setActiveTab] = useState("itens");
  const { items, isLoading, addItem, removeItem, isAdding, isRemoving } = useComandaItems(comanda.id);
  const { closeComanda, isClosing } = useComandas();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getComandaNumber = () => {
    const date = new Date(comanda.created_at);
    return comanda.id.slice(0, 4).toUpperCase();
  };

  const handleAddService = (serviceId: string) => {
    const service = services.find((s: any) => s.id === serviceId);
    if (!service) return;

    addItem({
      comanda_id: comanda.id,
      service_id: serviceId,
      description: service.name,
      item_type: "service",
      quantity: 1,
      unit_price: Number(service.price),
      total_price: Number(service.price),
    });
  };

  const subtotal = items.reduce((acc, item) => acc + Number(item.total_price), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            ← Voltar
          </Button>
          <h1 className="text-xl font-semibold text-primary">
            Comanda {getComandaNumber()} - {comanda.client?.name || "Cliente"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Data da Comanda:</span>
            <span className="font-medium">{format(new Date(comanda.created_at), "dd/MM/yyyy")}</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm">Nº: <strong>{getComandaNumber()}</strong></span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
          <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="itens" className="space-y-4">
          {/* Client Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Label className="font-semibold">Cliente:</Label>
                  <span className="font-medium">{comanda.client?.name || "Não definido"}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="default" size="sm" className="bg-primary">
                    <Calendar className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">Desc. (%)</TableHead>
                    <TableHead className="text-right">Final (R$)</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum item adicionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select defaultValue={item.description}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={item.description}>{item.description}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select defaultValue={comanda.professional?.id}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {professionals.filter(p => p.is_active).map((prof) => (
                                <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(item.id)}
                              disabled={isRemoving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add Item Buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Receipt className="h-4 w-4" />
              Produto
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Serviço
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {services.filter((s: any) => s.is_active).map((service: any) => (
                  <DropdownMenuItem key={service.id} onClick={() => handleAddService(service.id)}>
                    {service.name} - {formatCurrency(service.price)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="gap-2">
              Pré-venda
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              Pacote
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              Caixinha
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              Vale Presente
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pagamento">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Funcionalidade de pagamento em desenvolvimento
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prontuario">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Prontuário do cliente em desenvolvimento
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="informacoes">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Informações adicionais em desenvolvimento
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" className="gap-2">
          <Clock className="h-4 w-4" />
          Atualizar Comanda
        </Button>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4">
            <div className="text-sm text-muted-foreground">Subtotal</div>
            <div className="text-lg font-semibold">{formatCurrency(subtotal)}</div>
          </div>
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline">Confirmar</Button>
          <Button 
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => closeComanda(comanda.id)}
            disabled={isClosing}
          >
            {isClosing ? "Finalizando..." : "Finalizar Comanda"}
          </Button>
        </div>
      </div>
    </div>
  );
}
