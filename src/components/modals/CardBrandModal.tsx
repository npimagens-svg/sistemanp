import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CardBrand, CardBrandInput } from "@/hooks/useCardBrands";

interface CardBrandModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CardBrandInput) => void;
  cardBrand?: CardBrand | null;
  isLoading?: boolean;
}

export function CardBrandModal({ open, onClose, onSave, cardBrand, isLoading }: CardBrandModalProps) {
  const [name, setName] = useState("");
  const [creditFeePercent, setCreditFeePercent] = useState("");
  const [debitFeePercent, setDebitFeePercent] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (cardBrand) {
      setName(cardBrand.name);
      setCreditFeePercent(String(cardBrand.credit_fee_percent));
      setDebitFeePercent(String(cardBrand.debit_fee_percent));
      setIsActive(cardBrand.is_active);
    } else {
      setName("");
      setCreditFeePercent("");
      setDebitFeePercent("");
      setIsActive(true);
    }
  }, [cardBrand, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      credit_fee_percent: parseFloat(creditFeePercent) || 0,
      debit_fee_percent: parseFloat(debitFeePercent) || 0,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {cardBrand ? "Editar Bandeira" : "Nova Bandeira de Cartão"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Bandeira</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Visa, Mastercard, Elo..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditFee">Taxa Crédito (%)</Label>
              <Input
                id="creditFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={creditFeePercent}
                onChange={(e) => setCreditFeePercent(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debitFee">Taxa Débito (%)</Label>
              <Input
                id="debitFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={debitFeePercent}
                onChange={(e) => setDebitFeePercent(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Bandeira Ativa</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
