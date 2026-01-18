import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Pencil, Trash2, Printer, Eye, FileSpreadsheet, FileText, AlertTriangle } from "lucide-react";
import { ComandaModal } from "@/components/modals/ComandaModal";
import { DeleteComandaModal } from "@/components/modals/DeleteComandaModal";
import { ClientModal } from "@/components/modals/ClientModal";
import { ClientSearchSelect } from "@/components/shared/ClientSearchSelect";
import { useComandas, Comanda, ComandaInput } from "@/hooks/useComandas";
import { useClients } from "@/hooks/useClients";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { useCaixas } from "@/hooks/useCaixas";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const [comandaModalOpen, setComandaModalOpen] = useState(false);
  const [isProcessingAppointment, setIsProcessingAppointment] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [comandaToDelete, setComandaToDelete] = useState<Comanda | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingClosedComanda, setEditingClosedComanda] = useState(false);
  const [userOpenCaixaId, setUserOpenCaixaId] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  const { user, salonId } = useAuth();
  const queryClient = useQueryClient();
  const { comandas, isLoading, createComanda, findOrCreateTodayComanda, isCreating } = useComandas();
  const { clients, createClient } = useClients();
  const { professionals } = useProfessionals();
  const { services } = useServices();
  const { getCurrentUserOpenCaixa, openCaixas } = useCaixas();

  // Check for user's open caixa
  useEffect(() => {
    const checkCaixa = async () => {
      const caixa = await getCurrentUserOpenCaixa();
      setUserOpenCaixaId(caixa?.id || null);
    };
    checkCaixa();
  }, [openCaixas]);

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
      // Check if user has open caixa
      const userCaixa = await getCurrentUserOpenCaixa();
      if (!userCaixa) {
        toast({ 
          title: "Caixa não aberto", 
          description: "Você precisa abrir um caixa antes de criar comandas.",
          variant: "destructive" 
        });
        navigate("/financeiro");
        return;
      }

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

      // Link comanda to user's caixa if not already linked
      if (!comanda.caixa_id) {
        await supabase
          .from("comandas")
          .update({ caixa_id: userCaixa.id })
          .eq("id", comanda.id);
      }

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

      // Set as selected comanda and open modal
      setSelectedComanda(comanda);
      setComandaModalOpen(true);
      
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

  const today = startOfDay(new Date());
  
  // Open comandas from today
  const openComandas = filteredComandas.filter((c) => !c.closed_at);
  
  // Closed comandas
  const closedComandas = filteredComandas.filter((c) => c.closed_at);
  
  // Pending comandas - open but not from today
  const pendingComandas = filteredComandas.filter((c) => {
    if (c.closed_at) return false;
    const createdDate = startOfDay(new Date(c.created_at));
    return createdDate.getTime() < today.getTime();
  });
  
  // Today's open comandas only
  const todayOpenComandas = openComandas.filter((c) => {
    const createdDate = startOfDay(new Date(c.created_at));
    return createdDate.getTime() === today.getTime();
  });

  const handleCreate = async () => {
    // Check if user has open caixa
    const userCaixa = await getCurrentUserOpenCaixa();
    if (!userCaixa) {
      toast({ 
        title: "Caixa não aberto", 
        description: "Você precisa abrir um caixa antes de criar comandas.",
        variant: "destructive" 
      });
      navigate("/financeiro");
      return;
    }

    createComanda({ ...formData, caixa_id: userCaixa.id });
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

  const handleOpenComanda = (comanda: Comanda, isEditing = false) => {
    setEditingClosedComanda(isEditing && !!comanda.closed_at);
    setSelectedComanda(comanda);
    setComandaModalOpen(true);
  };

  const handleCloseComandaModal = () => {
    setSelectedComanda(null);
    setComandaModalOpen(false);
    setEditingClosedComanda(false);
  };

  const handleDeleteClick = (comanda: Comanda) => {
    // Only closed comandas can be deleted with reason
    if (!comanda.closed_at) {
      toast({
        title: "Não é possível excluir",
        description: "Somente comandas fechadas podem ser excluídas.",
        variant: "destructive",
      });
      return;
    }
    setComandaToDelete(comanda);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!comandaToDelete || !user?.id || !salonId) return;

    setIsDeleting(true);
    try {
      // Save deletion record for audit
      await supabase.from("comanda_deletions").insert({
        comanda_id: comandaToDelete.id,
        client_id: comandaToDelete.client_id,
        client_name: comandaToDelete.client?.name,
        professional_id: comandaToDelete.professional_id,
        professional_name: comandaToDelete.professional?.name,
        comanda_total: comandaToDelete.total,
        reason: reason,
        deleted_by: user.id,
        original_created_at: comandaToDelete.created_at,
        original_closed_at: comandaToDelete.closed_at,
      });

      // Delete comanda items first
      await supabase
        .from("comanda_items")
        .delete()
        .eq("comanda_id", comandaToDelete.id);

      // Delete payments
      await supabase
        .from("payments")
        .delete()
        .eq("comanda_id", comandaToDelete.id);

      // Delete the comanda
      await supabase
        .from("comandas")
        .delete()
        .eq("id", comandaToDelete.id);

      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      toast({ title: "Comanda excluída com sucesso" });
      setDeleteModalOpen(false);
      setComandaToDelete(null);
    } catch (error: any) {
      console.error("Error deleting comanda:", error);
      toast({
        title: "Erro ao excluir comanda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getDisplayComandas = () => {
    switch (activeTab) {
      case "abertas":
        return todayOpenComandas;
      case "fechadas":
        return closedComandas;
      case "pendentes":
        return pendingComandas;
      default:
        return todayOpenComandas;
    }
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

  return (
    <AppLayoutNew>
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setModalOpen(true)} disabled={!userOpenCaixaId}>
            <Plus className="h-4 w-4" />
            Abrir Comanda
          </Button>
          {!userOpenCaixaId && (
            <Badge variant="destructive" className="gap-1 px-3 py-1.5">
              <AlertTriangle className="h-3 w-3" />
              Abra um caixa para criar comandas
            </Badge>
          )}
          {pendingComandas.length > 0 && (
            <Badge 
              variant="outline" 
              className="gap-1 px-3 py-1.5 cursor-pointer border-orange-500 text-orange-600"
              onClick={() => setActiveTab("pendentes")}
            >
              Comandas Pendentes
              <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs ml-1">
                {pendingComandas.length}
              </span>
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="abertas">Abertas ({todayOpenComandas.length})</TabsTrigger>
            <TabsTrigger value="fechadas">Fechadas ({closedComandas.length})</TabsTrigger>
            {pendingComandas.length > 0 && (
              <TabsTrigger value="pendentes" className="text-orange-600">
                Pendentes ({pendingComandas.length})
              </TabsTrigger>
            )}
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
                {getDisplayComandas().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma comanda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  getDisplayComandas().map((comanda) => (
                    <TableRow 
                      key={comanda.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${activeTab === "pendentes" ? "bg-orange-50 dark:bg-orange-950/20" : ""}`}
                      onClick={() => handleOpenComanda(comanda)}
                    >
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
                          {activeTab === "fechadas" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleOpenComanda(comanda, true)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {activeTab === "fechadas" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(comanda)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
          <span>Mostrando 1 até {Math.min(10, getDisplayComandas().length)} de {getDisplayComandas().length} registros</span>
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
              <ClientSearchSelect
                clients={clients}
                value={formData.client_id || null}
                onSelect={(clientId) => setFormData({ ...formData, client_id: clientId })}
                onCreateNew={(name) => {
                  setNewClientName(name);
                  setClientModalOpen(true);
                }}
                placeholder="Digite para buscar cliente..."
              />
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
                  {professionals.filter(p => p.is_active).map((prof) => (
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
            <Button onClick={handleCreate} disabled={isCreating || !formData.client_id}>
              {isCreating ? "Criando..." : "Criar Comanda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Modal for quick registration */}
      <ClientModal
        open={clientModalOpen}
        onOpenChange={(open) => {
          setClientModalOpen(open);
          if (!open) setNewClientName("");
        }}
        client={newClientName ? { name: newClientName } as any : null}
        onSubmit={(data) => {
          // Create client and then select it
          createClient(data, {
            onSuccess: (newClient: any) => {
              if (newClient?.id) {
                setFormData({ ...formData, client_id: newClient.id });
              }
              setClientModalOpen(false);
              setNewClientName("");
            }
          } as any);
        }}
      />

      {/* Comanda Modal */}
      <ComandaModal
        comanda={selectedComanda}
        open={comandaModalOpen}
        onClose={handleCloseComandaModal}
        professionals={professionals}
        services={services}
        isEditingClosed={editingClosedComanda}
        userCaixaId={userOpenCaixaId}
      />

      {/* Delete Comanda Modal */}
      <DeleteComandaModal
        comanda={comandaToDelete}
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setComandaToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </AppLayoutNew>
  );
}
