import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Caixa } from "@/hooks/useCaixas";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CloseCaixaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (closingBalance: number, notes?: string) => void;
  caixa: Caixa | null;
  isLoading?: boolean;
}

export function CloseCaixaModal({ open, onClose, onConfirm, caixa, isLoading }: CloseCaixaModalProps) {
  const [closingBalance, setClosingBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [openComandasCount, setOpenComandasCount] = useState(0);
  const [checkingComandas, setCheckingComandas] = useState(false);
  const { salonId } = useAuth();

  // Check for open comandas linked to this caixa
  useEffect(() => {
    if (open && caixa?.id && salonId) {
      checkOpenComandas();
    }
  }, [open, caixa?.id, salonId]);

  const checkOpenComandas = async () => {
    if (!caixa?.id || !salonId) return;
    
    setCheckingComandas(true);
    try {
      const { data, error } = await supabase
        .from("comandas")
        .select("id", { count: "exact" })
        .eq("salon_id", salonId)
        .eq("caixa_id", caixa.id)
        .is("closed_at", null);

      if (!error) {
        setOpenComandasCount(data?.length || 0);
      }
    } catch (error) {
      console.error("Error checking open comandas:", error);
    } finally {
      setCheckingComandas(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const handleConfirm = () => {
    if (openComandasCount > 0) return; // Block if there are open comandas
    
    const balance = parseFloat(closingBalance.replace(",", ".")) || 0;
    onConfirm(balance, notes || undefined);
    setClosingBalance("");
    setNotes("");
  };

  if (!caixa) return null;

  const totalReceived = 
    (caixa.total_cash || 0) + 
    (caixa.total_pix || 0) + 
    (caixa.total_credit_card || 0) + 
    (caixa.total_debit_card || 0) + 
    (caixa.total_other || 0);

  const expectedCash = (caixa.opening_balance || 0) + (caixa.total_cash || 0);

  const hasOpenComandas = openComandasCount > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Warning for open comandas */}
          {checkingComandas ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Verificando comandas...</span>
            </div>
          ) : hasOpenComandas && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Existem <strong>{openComandasCount} comanda{openComandasCount > 1 ? "s" : ""} aberta{openComandasCount > 1 ? "s" : ""}</strong> vinculada{openComandasCount > 1 ? "s" : ""} a este caixa. 
                Feche todas as comandas antes de fechar o caixa.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-medium text-sm">Resumo do Caixa</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Abertura:</span>
                <span className="text-right">{formatCurrency(caixa.opening_balance || 0)}</span>
                
                <span className="text-muted-foreground">Dinheiro:</span>
                <span className="text-right">{formatCurrency(caixa.total_cash || 0)}</span>
                
                <span className="text-muted-foreground">PIX:</span>
                <span className="text-right">{formatCurrency(caixa.total_pix || 0)}</span>
                
                <span className="text-muted-foreground">Cartão Crédito:</span>
                <span className="text-right">{formatCurrency(caixa.total_credit_card || 0)}</span>
                
                <span className="text-muted-foreground">Cartão Débito:</span>
                <span className="text-right">{formatCurrency(caixa.total_debit_card || 0)}</span>
                
                <span className="text-muted-foreground">Outros:</span>
                <span className="text-right">{formatCurrency(caixa.total_other || 0)}</span>
                
                <span className="font-medium border-t pt-2">Total Recebido:</span>
                <span className="text-right font-medium border-t pt-2">{formatCurrency(totalReceived)}</span>
                
                <span className="font-medium text-primary">Dinheiro Esperado:</span>
                <span className="text-right font-medium text-primary">{formatCurrency(expectedCash)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="closingBalance">Valor em Dinheiro no Caixa (R$)</Label>
            <Input
              id="closingBalance"
              type="text"
              placeholder="0,00"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              disabled={hasOpenComandas}
            />
            <p className="text-xs text-muted-foreground">
              Conte o dinheiro no caixa e informe o valor total
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre o fechamento do caixa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={hasOpenComandas}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading || hasOpenComandas || checkingComandas}
          >
            {isLoading ? "Fechando..." : "Fechar Caixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
