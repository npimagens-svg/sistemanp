import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Eye, Pencil } from "lucide-react";
import { Caixa } from "@/hooks/useCaixas";

interface CaixaCardProps {
  caixa: Caixa;
  userName?: string;
  onClose?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  showCloseButton?: boolean;
  showEditButton?: boolean;
}

export function CaixaCard({ caixa, userName, onClose, onView, onEdit, showCloseButton = false, showEditButton = false }: CaixaCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const totalReceived = 
    (caixa.total_cash || 0) + 
    (caixa.total_pix || 0) + 
    (caixa.total_credit_card || 0) + 
    (caixa.total_debit_card || 0) + 
    (caixa.total_other || 0);

  const displayName = userName || caixa.profile?.full_name || "Usuário";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={caixa.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{displayName}</h4>
              <p className="text-xs text-muted-foreground">
                Aberto: {format(new Date(caixa.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <Badge variant={caixa.closed_at ? "secondary" : "default"}>
            {caixa.closed_at ? "Fechado" : "Aberto"}
          </Badge>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abertura:</span>
              <span>{formatCurrency(caixa.opening_balance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dinheiro:</span>
              <span>{formatCurrency(caixa.total_cash || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PIX:</span>
              <span>{formatCurrency(caixa.total_pix || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crédito:</span>
              <span>{formatCurrency(caixa.total_credit_card || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Débito:</span>
              <span>{formatCurrency(caixa.total_debit_card || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outros:</span>
              <span>{formatCurrency(caixa.total_other || 0)}</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between font-medium">
              <span>Total Recebido:</span>
              <span className="text-primary">{formatCurrency(totalReceived)}</span>
            </div>
          </div>

          {caixa.closed_at && (
            <div className="border-t pt-3 text-sm text-muted-foreground">
              Fechado: {format(new Date(caixa.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {caixa.closing_balance !== null && (
                <div className="flex justify-between mt-1">
                  <span>Valor declarado:</span>
                  <span>{formatCurrency(caixa.closing_balance)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {(showCloseButton || onView || showEditButton) && (
          <div className="px-4 pb-4 flex gap-2">
            {showEditButton && onEdit && (
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
            {onView && (
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onView}>
                <Eye className="h-4 w-4" />
                Ver Detalhes
              </Button>
            )}
            {showCloseButton && onClose && !caixa.closed_at && (
              <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={onClose}>
                <X className="h-4 w-4" />
                Fechar Caixa
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
