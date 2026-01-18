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
  Printer, Clock, Plus, Minus, CreditCard, Banknote, Smartphone, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComandaItems, ComandaItem, Comanda } from "@/hooks/useComandas";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { ServiceSearchSelect } from "@/components/shared/ServiceSearchSelect";

interface ComandaModalProps {
  comanda: Comanda | null;
  open: boolean;
  onClose: () => void;
  professionals: any[];
  services: any[];
  isEditingClosed?: boolean;
  userCaixaId?: string | null;
}

interface EditableItem extends ComandaItem {
  isEditing?: boolean;
  editQuantity?: number;
  editUnitPrice?: number;
  editDiscount?: number;
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

export function ComandaModal({ comanda, open, onClose, professionals, services, isEditingClosed = false, userCaixaId }: ComandaModalProps) {
  const { toast } = useToast();
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("itens");
  const { items, isLoading, addItem, removeItem, isAdding, isRemoving } = useComandaItems(comanda?.id || null);
  
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isClosing, setIsClosing] = useState(false);

  // Sync items to editable state
  useEffect(() => {
    if (items) {
      setEditableItems(items.map(item => ({
        ...item,
        isEditing: false,
        editQuantity: item.quantity,
        editUnitPrice: item.unit_price,
        editDiscount: 0,
      })));
    }
  }, [items]);

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

  const handleAddService = (serviceId: string) => {
    if (!comanda) return;
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

  const toggleEditItem = (itemId: string) => {
    setEditableItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, isEditing: !item.isEditing } : item
    ));
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

    // Validate user has open caixa
    if (!userCaixaId) {
      toast({ 
        title: "Caixa não aberto", 
        description: "Você precisa abrir um caixa para finalizar comandas.",
        variant: "destructive" 
      });
      return;
    }

    // Validate comanda is from today (can't close old comandas with current caixa)
    const comandaDate = new Date(comanda.created_at);
    const today = new Date();
    comandaDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (comandaDate.getTime() < today.getTime()) {
      toast({ 
        title: "Comanda de outro dia", 
        description: "Comandas de dias anteriores precisam ser tratadas como pendentes. Entre em contato com o gerente.",
        variant: "destructive" 
      });
      return;
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
        .eq("id", userCaixaId)
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
          .eq("id", userCaixaId);
      }

      // Close comanda and link to caixa
      await supabase
        .from("comandas")
        .update({ 
          closed_at: new Date().toISOString(), 
          is_paid: true,
          subtotal: subtotal,
          total: subtotal,
          caixa_id: userCaixaId,
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
                              <Select defaultValue={comanda.professional?.id}>
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
                                    >
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

              {/* Add Item Section */}
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
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-4 mt-4">
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
          <Button variant="outline" className="gap-2" onClick={updateComandaTotals}>
            <Clock className="h-4 w-4" />
            Atualizar Comanda
          </Button>
          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <div className="text-sm text-muted-foreground">Total a Pagar</div>
              <div className="text-lg font-semibold">{formatCurrency(subtotal)}</div>
            </div>
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-destructive">
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
    </Dialog>
  );
}
