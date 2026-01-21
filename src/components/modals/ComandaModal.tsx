import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Receipt, CheckCircle, Calendar, Eye, Pencil, Trash2, 
  Printer, Clock, Plus, Minus, CreditCard, Banknote, Smartphone, X, Wallet, RefreshCw
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComandaItems, ComandaItem, Comanda } from "@/hooks/useComandas";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { ServiceSearchSelect } from "@/components/shared/ServiceSearchSelect";
import { CaixaSelectModal } from "@/components/caixa/CaixaSelectModal";
import { Caixa } from "@/hooks/useCaixas";
import { useAllServiceProducts } from "@/hooks/useServiceProducts";

interface ComandaModalProps {
  comanda: Comanda | null;
  open: boolean;
  onClose: () => void;
  professionals: any[];
  services: any[];
  isEditingClosed?: boolean;
  userCaixaId?: string | null;
  onDelete?: (comanda: Comanda) => void;
  openCaixas?: Caixa[];
}

interface EditableItem extends ComandaItem {
  isEditing?: boolean;
  editQuantity?: number;
  editUnitPrice?: number;
  editDiscount?: number;
  editProfessionalId?: string | null;
}

interface Payment {
  id: string;
  method: string;
  amount: number;
  info?: string;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credit_card", label: "Cartão de Crédito", icon: CreditCard },
  { value: "debit_card", label: "Cartão de Débito", icon: CreditCard },
  { value: "other", label: "Outro", icon: Receipt },
];

export function ComandaModal({ comanda, open, onClose, professionals, services, isEditingClosed = false, userCaixaId, onDelete, openCaixas = [] }: ComandaModalProps) {
  const { toast } = useToast();
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("itens");
  const { items, isLoading, addItem, removeItem, isAdding, isRemoving } = useComandaItems(comanda?.id || null);
  const { calculateServiceCost } = useAllServiceProducts();
  
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCaixaId, setSelectedCaixaId] = useState<string | null>(null);
  const [caixaSelectModalOpen, setCaixaSelectModalOpen] = useState(false);

  // Determine if comanda is from today
  const comandaDate = comanda ? new Date(comanda.created_at) : new Date();
  const today = new Date();
  const isFromToday = isSameDay(comandaDate, today);

  // Check if comanda's caixa is closed (locked state)
  const comandaCaixa = comanda?.caixa_id ? openCaixas.find(c => c.id === comanda.caixa_id) : null;
  const isCaixaClosed = comanda?.caixa_id ? !comandaCaixa : false;
  const isComandaLocked = comanda?.closed_at && isCaixaClosed;

  // Get available caixas for the comanda date
  const availableCaixas = openCaixas.filter(c => {
    const caixaDate = new Date(c.opened_at);
    return !c.closed_at && isSameDay(caixaDate, comandaDate);
  });

  // Set initial caixa - prefer user's caixa if from today, otherwise require selection
  useEffect(() => {
    if (isFromToday && userCaixaId) {
      setSelectedCaixaId(userCaixaId);
    } else if (availableCaixas.length === 1) {
      setSelectedCaixaId(availableCaixas[0].id);
    } else {
      setSelectedCaixaId(null);
    }
  }, [isFromToday, userCaixaId, availableCaixas.length]);

  // Get selected caixa info
  const selectedCaixa = openCaixas.find(c => c.id === selectedCaixaId);

  // Sync items to editable state
  useEffect(() => {
    if (items) {
      setEditableItems(items.map(item => ({
        ...item,
        isEditing: false,
        editQuantity: item.quantity,
        editUnitPrice: item.unit_price,
        editDiscount: 0,
        editProfessionalId: (item as any).professional_id || comanda?.professional_id || null,
      })));
    }
  }, [items, comanda?.professional_id]);

  // Load existing payments
  useEffect(() => {
    if (comanda?.id) {
      loadPayments();
    }
  }, [comanda?.id]);

  const loadPayments = async () => {
    if (!comanda?.id) return;
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("comanda_id", comanda.id);
    if (data) {
      setPayments(data.map(p => ({
        id: p.id,
        method: p.payment_method,
        amount: Number(p.amount),
        info: p.notes || "",
      })));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getComandaNumber = () => {
    if (!comanda) return "";
    return comanda.id.slice(0, 4).toUpperCase();
  };

  const handleAddService = async (serviceId: string) => {
    if (!comanda || !salonId) return;
    const service = services.find((s: any) => s.id === serviceId);
    if (!service) return;

    // Calculate product cost for this service
    const productCost = calculateServiceCost(serviceId);

    // Add item to comanda with product cost
    addItem({
      comanda_id: comanda.id,
      service_id: serviceId,
      description: service.name,
      item_type: "service",
      quantity: 1,
      unit_price: Number(service.price),
      total_price: Number(service.price),
      product_cost: productCost,
    });

    // Create appointment for this service if comanda has a professional
    const professionalId = comanda.professional_id;
    if (professionalId) {
      try {
        // Schedule for current time today
        const now = new Date();
        
        const { error } = await supabase
          .from("appointments")
          .insert({
            salon_id: salonId,
            client_id: comanda.client_id,
            professional_id: professionalId,
            service_id: serviceId,
            scheduled_at: now.toISOString(),
            duration_minutes: service.duration_minutes || 30,
            price: Number(service.price),
            status: "in_progress",
            notes: `Criado via comanda ${comanda.id.slice(0, 4).toUpperCase()}`,
          });

        if (error) {
          console.error("Error creating appointment:", error);
        } else {
          queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
        }
      } catch (error) {
        console.error("Error creating appointment:", error);
      }
    }
  };

  const toggleEditItem = (itemId: string) => {
    setEditableItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, isEditing: !item.isEditing } : item
    ));
  };

  const updateItemProfessional = async (itemId: string, professionalId: string) => {
    // Update local state immediately
    setEditableItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, editProfessionalId: professionalId, professional_id: professionalId } : item
    ));

    // Save to database
    const { error } = await supabase
      .from("comanda_items")
      .update({ professional_id: professionalId })
      .eq("id", itemId);

    if (error) {
      toast({ title: "Erro ao atualizar profissional", variant: "destructive" });
      return;
    }

    // Record in client history
    if (comanda?.client_id && salonId) {
      const user = (await supabase.auth.getUser()).data.user;
      const professional = professionals.find(p => p.id === professionalId);
      const item = editableItems.find(i => i.id === itemId);
      if (user && professional && item) {
        await supabase.from("client_history").insert({
          client_id: comanda.client_id,
          salon_id: salonId,
          action_type: "professional_change",
          description: `Profissional alterado para "${professional.name}" no serviço "${item.description}"`,
          new_value: { professional_id: professionalId, professional_name: professional.name },
          performed_by: user.id,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["comanda_items", comanda?.id] });
    toast({ title: "Profissional atualizado!" });
  };

  const updateItemField = (itemId: string, field: string, value: number) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [field]: value };
      // Recalculate total
      const quantity = field === 'editQuantity' ? value : item.editQuantity || item.quantity;
      const unitPrice = field === 'editUnitPrice' ? value : item.editUnitPrice || item.unit_price;
      const discount = field === 'editDiscount' ? value : item.editDiscount || 0;
      updated.total_price = (quantity * unitPrice) * (1 - discount / 100);
      return updated;
    }));
  };

  const saveItemChanges = async (item: EditableItem) => {
    const newQuantity = item.editQuantity || item.quantity;
    const newUnitPrice = item.editUnitPrice || item.unit_price;
    const discount = item.editDiscount || 0;
    const newTotalPrice = (newQuantity * newUnitPrice) * (1 - discount / 100);

    const oldValues = {
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    };

    const { error } = await supabase
      .from("comanda_items")
      .update({
        quantity: newQuantity,
        unit_price: newUnitPrice,
        total_price: newTotalPrice,
      })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
      return;
    }

    // Record change in client history if editing closed comanda
    if (isEditingClosed && comanda?.client_id && salonId) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from("client_history").insert({
          client_id: comanda.client_id,
          salon_id: salonId,
          action_type: "comanda_edit",
          description: `Item "${item.description}" editado na comanda ${comanda.id.slice(0, 4).toUpperCase()}`,
          old_value: oldValues,
          new_value: { quantity: newQuantity, unit_price: newUnitPrice, total_price: newTotalPrice },
          performed_by: user.id,
        });
      }
    }

    // Update comanda totals
    await updateComandaTotals();
    toggleEditItem(item.id);
    toast({ title: "Item atualizado!" });
  };

  const updateComandaTotals = async () => {
    if (!comanda) return;
    const newSubtotal = editableItems.reduce((acc, item) => acc + Number(item.total_price), 0);
    await supabase
      .from("comandas")
      .update({
        subtotal: newSubtotal,
        total: newSubtotal - (comanda.discount || 0),
      })
      .eq("id", comanda.id);
    queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
    queryClient.invalidateQueries({ queryKey: ["comanda_items", comanda.id] });
  };

  // Sync comanda with appointments from agenda
  const handleSyncComanda = async () => {
    if (!comanda || !salonId) return;
    
    setIsUpdating(true);
    try {
      // Get the comanda's original date range (start to end of that day)
      const comandaDate = new Date(comanda.created_at);
      const startOfDay = new Date(comandaDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(comandaDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch all appointments for this client on the comanda's date
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          services(name, price, duration_minutes)
        `)
        .eq("salon_id", salonId)
        .eq("client_id", comanda.client_id)
        .gte("scheduled_at", startOfDay.toISOString())
        .lte("scheduled_at", endOfDay.toISOString())
        .neq("status", "cancelled");

      if (appointmentsError) throw appointmentsError;

      // Get current comanda items
      const { data: currentItems } = await supabase
        .from("comanda_items")
        .select("*")
        .eq("comanda_id", comanda.id);

      // Track changes made
      let itemsAdded = 0;
      let itemsUpdated = 0;

      // Check each appointment
      for (const appointment of appointments || []) {
        if (!appointment.service_id || !appointment.services) continue;

        // Find if this service already exists in comanda items
        const existingItem = currentItems?.find(
          item => item.service_id === appointment.service_id && 
                  item.professional_id === appointment.professional_id
        );

        if (existingItem) {
          // Update existing item with appointment data
          const newPrice = appointment.price ?? appointment.services.price ?? 0;
          if (existingItem.unit_price !== newPrice) {
            await supabase
              .from("comanda_items")
              .update({
                unit_price: newPrice,
                total_price: newPrice * existingItem.quantity,
              })
              .eq("id", existingItem.id);
            itemsUpdated++;
          }
        } else {
          // Add new item from appointment
          await supabase
            .from("comanda_items")
            .insert({
              comanda_id: comanda.id,
              service_id: appointment.service_id,
              professional_id: appointment.professional_id,
              description: appointment.services.name,
              item_type: "service",
              quantity: 1,
              unit_price: appointment.price ?? appointment.services.price ?? 0,
              total_price: appointment.price ?? appointment.services.price ?? 0,
            });
          itemsAdded++;
        }
      }

      // Update comanda date to today
      const now = new Date();
      await supabase
        .from("comandas")
        .update({ 
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", comanda.id);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      queryClient.invalidateQueries({ queryKey: ["comanda_items", comanda.id] });

      const messages = [];
      if (itemsAdded > 0) messages.push(`${itemsAdded} serviço(s) adicionado(s)`);
      if (itemsUpdated > 0) messages.push(`${itemsUpdated} serviço(s) atualizado(s)`);
      messages.push("Data atualizada para hoje");

      toast({ 
        title: "Comanda atualizada!", 
        description: messages.join(". ") 
      });
    } catch (error: any) {
      console.error("Error syncing comanda:", error);
      toast({ 
        title: "Erro ao atualizar comanda", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Payment functions
  const addPaymentRow = () => {
    setPayments(prev => [...prev, {
      id: `temp_${Date.now()}`,
      method: "cash",
      amount: 0,
      info: "",
    }]);
  };

  const removePaymentRow = (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const updatePayment = (paymentId: string, field: string, value: string | number) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, [field]: value } : p
    ));
  };

  const subtotal = editableItems.reduce((acc, item) => acc + Number(item.total_price), 0);
  const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0);
  const difference = subtotal - totalPayments;

  const handleFinalizeComanda = async () => {
    if (!comanda || !salonId) return;

    // Determine which caixa to use
    const caixaToUse = selectedCaixaId;
    
    // Validate caixa is selected
    if (!caixaToUse) {
      // Show caixa selection modal if there are available caixas
      if (availableCaixas.length > 0) {
        toast({ 
          title: "Selecione um caixa", 
          description: "Escolha um caixa aberto para finalizar esta comanda.",
          variant: "destructive" 
        });
        setCaixaSelectModalOpen(true);
        return;
      } else {
        toast({ 
          title: "Nenhum caixa disponível", 
          description: `Não há caixas abertos para a data ${format(comandaDate, "dd/MM/yyyy")}. Contate um gerente.`,
          variant: "destructive" 
        });
        return;
      }
    }

    // Validate payments
    if (difference > 0.01) {
      toast({ 
        title: "Pagamento incompleto", 
        description: `Falta pagar ${formatCurrency(difference)}`,
        variant: "destructive" 
      });
      setActiveTab("pagamento");
      return;
    }

    if (difference < -0.01) {
      toast({ 
        title: "Pagamento excede o total", 
        description: `Troco: ${formatCurrency(Math.abs(difference))}`,
        variant: "destructive" 
      });
      return;
    }

    setIsClosing(true);

    try {
      // Calculate payment totals by method for caixa update
      const paymentTotals = {
        cash: 0,
        pix: 0,
        credit_card: 0,
        debit_card: 0,
        other: 0,
      };

      // Save new payments and track totals
      for (const payment of payments) {
        if (payment.id.startsWith("temp_")) {
          await supabase.from("payments").insert({
            comanda_id: comanda.id,
            salon_id: salonId,
            payment_method: payment.method as any,
            amount: payment.amount,
            notes: payment.info,
          });
        }
        // Track totals for all payments (new and existing)
        if (payment.method in paymentTotals) {
          paymentTotals[payment.method as keyof typeof paymentTotals] += payment.amount;
        }
      }

      // Update caixa totals
      const { data: currentCaixa } = await supabase
        .from("caixas")
        .select("*")
        .eq("id", caixaToUse)
        .single();

      if (currentCaixa) {
        await supabase
          .from("caixas")
          .update({
            total_cash: (currentCaixa.total_cash || 0) + paymentTotals.cash,
            total_pix: (currentCaixa.total_pix || 0) + paymentTotals.pix,
            total_credit_card: (currentCaixa.total_credit_card || 0) + paymentTotals.credit_card,
            total_debit_card: (currentCaixa.total_debit_card || 0) + paymentTotals.debit_card,
            total_other: (currentCaixa.total_other || 0) + paymentTotals.other,
          })
          .eq("id", caixaToUse);
      }

      // Close comanda and link to caixa
      await supabase
        .from("comandas")
        .update({ 
          closed_at: new Date().toISOString(), 
          is_paid: true,
          subtotal: subtotal,
          total: subtotal,
          caixa_id: caixaToUse,
        })
        .eq("id", comanda.id);

      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      queryClient.invalidateQueries({ queryKey: ["caixas", salonId] });
      toast({ title: "Comanda finalizada com sucesso!" });
      onClose();
    } catch (error: any) {
      toast({ title: "Erro ao finalizar comanda", description: error.message, variant: "destructive" });
    } finally {
      setIsClosing(false);
    }
  };

  if (!comanda) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-primary text-lg">
              Comanda {getComandaNumber()} - {comanda.client?.name || "Cliente"}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(comanda.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
              <TabsTrigger value="informacoes">Informações</TabsTrigger>
            </TabsList>

            <TabsContent value="itens" className="space-y-4 mt-4">
              {/* Locked Comanda Warning */}
              {isComandaLocked && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <X className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Comanda Bloqueada</p>
                        <p className="text-sm text-muted-foreground">
                          Esta comanda está fechada e o caixa associado foi encerrado. 
                          Para editar, reabra o caixa na página Financeiro → Histórico.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Client Info */}
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <Label className="font-semibold">Cliente:</Label>
                    <span className="font-medium">{comanda.client?.name || "Não definido"}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
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
                        <TableHead className="text-center w-20">Qtd.</TableHead>
                        <TableHead className="text-right w-28">Valor (R$)</TableHead>
                        <TableHead className="text-right w-24">Desc. (%)</TableHead>
                        <TableHead className="text-right w-28">Final (R$)</TableHead>
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
                      ) : editableItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum item adicionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        editableItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>
                              <Select 
                                value={item.editProfessionalId || item.professional_id || comanda.professional_id || ""}
                                onValueChange={(value) => updateItemProfessional(item.id, value)}
                              >
                                <SelectTrigger className="w-36 h-8">
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {professionals.filter(p => p.is_active).map((prof) => (
                                    <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {item.isEditing ? (
                                <Input 
                                  type="number" 
                                  min="1"
                                  className="w-16 h-8 text-center"
                                  value={item.editQuantity}
                                  onChange={(e) => updateItemField(item.id, 'editQuantity', parseInt(e.target.value) || 1)}
                                />
                              ) : (
                                <div className="text-center">{item.quantity}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.isEditing ? (
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  className="w-24 h-8 text-right"
                                  value={item.editUnitPrice}
                                  onChange={(e) => updateItemField(item.id, 'editUnitPrice', parseFloat(e.target.value) || 0)}
                                />
                              ) : (
                                <div className="text-right">{formatCurrency(item.unit_price)}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.isEditing ? (
                                <Input 
                                  type="number" 
                                  min="0"
                                  max="100"
                                  className="w-20 h-8 text-right"
                                  value={item.editDiscount || 0}
                                  onChange={(e) => updateItemField(item.id, 'editDiscount', parseFloat(e.target.value) || 0)}
                                />
                              ) : (
                                <div className="text-right">{item.editDiscount || 0}%</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total_price)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {item.isEditing ? (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-green-600"
                                      onClick={() => saveItemChanges(item)}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => toggleEditItem(item.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-primary"
                                      onClick={() => toggleEditItem(item.id)}
                                      disabled={isComandaLocked}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => removeItem(item.id)}
                                      disabled={isRemoving || isComandaLocked}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Add Item Section - disabled when locked */}
              {!isComandaLocked && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <Label className="text-sm font-medium">Adicionar Serviço</Label>
                    <ServiceSearchSelect
                      services={services}
                      value={null}
                      onSelect={(serviceId, service) => {
                        if (serviceId && service) {
                          handleAddService(serviceId);
                        }
                      }}
                      placeholder="Buscar serviço..."
                      showPrice
                    />
                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Produto
                      </Button>
                      <Button variant="outline" size="sm">Pacote</Button>
                      <Button variant="outline" size="sm">Caixinha</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-4 mt-4">
              {/* Caixa Selection - for pending comandas */}
              {!isFromToday && (
                <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-orange-800 dark:text-orange-200">Caixa para Fechamento</p>
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            {selectedCaixa ? `${selectedCaixa.profile?.full_name || 'Usuário'}` : 'Nenhum selecionado'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCaixaSelectModalOpen(true)}
                        className="border-orange-400 text-orange-700"
                      >
                        {selectedCaixa ? 'Alterar' : 'Selecionar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-xs text-muted-foreground">Total do Serviço:</Label>
                    <p className="text-xl font-semibold">{formatCurrency(subtotal)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-xs text-muted-foreground">Total do Produto:</Label>
                    <p className="text-xl font-semibold">{formatCurrency(0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-xs text-muted-foreground">Saldo do Cliente:</Label>
                    <p className="text-xl font-semibold">0</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-xs text-muted-foreground">Diferença:</Label>
                    <p className={`text-xl font-semibold ${difference < 0 ? 'text-destructive' : difference > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                      {formatCurrency(-difference)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Total to Pay */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold">Total a Cobrar:</Label>
                    <Badge variant="outline" className="cursor-pointer">ℹ</Badge>
                  </div>
                  <p className={`text-2xl font-bold ${difference > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(subtotal)}
                  </p>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <span></span>
                    <span>Forma de Pagamento</span>
                    <span>Informações</span>
                    <span>Valor (R$)</span>
                  </div>
                  
                  {payments.map((payment, index) => (
                    <div key={payment.id} className="grid grid-cols-4 gap-4 items-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => removePaymentRow(payment.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Select 
                        value={payment.method} 
                        onValueChange={(v) => updatePayment(payment.id, 'method', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Observações"
                        value={payment.info}
                        onChange={(e) => updatePayment(payment.id, 'info', e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          step="0.01"
                          value={payment.amount || ""}
                          onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updatePayment(payment.id, 'amount', subtotal - totalPayments + payment.amount)}
                        >
                          Dif
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" className="gap-2" onClick={addPaymentRow}>
                    <Plus className="h-4 w-4" />
                    Adicionar Forma de Pagamento
                  </Button>
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
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-4 flex-shrink-0">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleSyncComanda}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
            {isUpdating ? "Atualizando..." : "Atualizar Comanda"}
          </Button>
          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <div className="text-sm text-muted-foreground">Total a Pagar</div>
              <div className="text-lg font-semibold">{formatCurrency(subtotal)}</div>
            </div>
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (comanda && onDelete) {
                  onDelete(comanda);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onClose}>Confirmar</Button>
            <Button 
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleFinalizeComanda}
              disabled={isClosing}
            >
              {isClosing ? "Finalizando..." : "Finalizar Comanda"}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Caixa Selection Modal */}
      <CaixaSelectModal
        open={caixaSelectModalOpen}
        onClose={() => setCaixaSelectModalOpen(false)}
        onSelect={setSelectedCaixaId}
        caixas={openCaixas}
        comandaDate={comandaDate}
        selectedCaixaId={selectedCaixaId}
      />
    </Dialog>
  );
}
