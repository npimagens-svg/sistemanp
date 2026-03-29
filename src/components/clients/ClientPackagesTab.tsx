import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Plus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useClientPackages, usePackages, ClientPackage } from "@/hooks/usePackages";
import { useProfessionals } from "@/hooks/useProfessionals";

interface ClientPackagesTabProps {
  clientId: string;
  clientName: string;
}

export function ClientPackagesTab({ clientId, clientName }: ClientPackagesTabProps) {
  const { clientPackages, isLoading, purchasePackage, registerUsage, cancelPackage, isPurchasing, isRegistering } = useClientPackages(clientId);
  const { packages } = usePackages();
  const { professionals } = useProfessionals();

  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [totalPaid, setTotalPaid] = useState(0);
  const [buyNotes, setBuyNotes] = useState("");

  const [activeClientPkg, setActiveClientPkg] = useState<ClientPackage | null>(null);
  const [useServiceId, setUseServiceId] = useState("");
  const [useProfessionalId, setUseProfessionalId] = useState("");

  const activePackages = packages.filter((p) => p.is_active);

  const handleBuy = () => {
    if (!selectedPkgId) return;
    purchasePackage(
      {
        client_id: clientId,
        package_id: selectedPkgId,
        total_paid: totalPaid,
        notes: buyNotes || undefined,
      },
      {
        onSuccess: () => {
          setBuyModalOpen(false);
          setSelectedPkgId("");
          setTotalPaid(0);
          setBuyNotes("");
        },
      }
    );
  };

  const handleUse = () => {
    if (!activeClientPkg || !useServiceId) return;
    registerUsage(
      {
        client_package_id: activeClientPkg.id,
        service_id: useServiceId,
        professional_id: useProfessionalId || undefined,
      },
      {
        onSuccess: () => {
          setUseModalOpen(false);
          setActiveClientPkg(null);
          setUseServiceId("");
          setUseProfessionalId("");
        },
      }
    );
  };

  const openUseModal = (cp: ClientPackage) => {
    setActiveClientPkg(cp);
    setUseServiceId("");
    setUseProfessionalId("");
    setUseModalOpen(true);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "completed":
        return <Badge variant="secondary">Concluido</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceUsage = (cp: ClientPackage) => {
    const pkg = cp.package;
    if (!pkg?.package_items) return [];

    return pkg.package_items.map((item) => {
      const usedCount = (cp.usage || []).filter((u) => u.service_id === item.service_id).length;
      return {
        service_id: item.service_id,
        service_name: item.service?.name || "Servico",
        total: item.quantity,
        used: usedCount,
        remaining: item.quantity - usedCount,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pacotes de {clientName}</h3>
        <Button className="gap-2" onClick={() => setBuyModalOpen(true)} disabled={activePackages.length === 0}>
          <Plus className="h-4 w-4" />
          Adquirir Pacote
        </Button>
      </div>

      {clientPackages.length === 0 ? (
        <Card className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum pacote adquirido</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {clientPackages.map((cp) => {
            const serviceUsage = getServiceUsage(cp);
            const allCompleted = serviceUsage.every((s) => s.remaining <= 0);

            return (
              <Card key={cp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{cp.package?.name || "Pacote"}</CardTitle>
                      {getStatusBadge(allCompleted && cp.status === "active" ? "completed" : cp.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {cp.status === "active" && !allCompleted && (
                        <Button size="sm" variant="default" className="gap-1" onClick={() => openUseModal(cp)}>
                          <CheckCircle2 className="h-3 w-3" />
                          Registrar uso
                        </Button>
                      )}
                      {cp.status === "active" && (
                        <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => cancelPackage(cp.id)}>
                          <XCircle className="h-3 w-3" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Pago: {formatCurrency(Number(cp.total_paid))}</span>
                    <span>Compra: {new Date(cp.purchase_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {cp.notes && <p className="text-sm text-muted-foreground italic">{cp.notes}</p>}

                  {/* Service usage breakdown */}
                  <div className="space-y-2">
                    {serviceUsage.map((su) => {
                      const percent = su.total > 0 ? (su.used / su.total) * 100 : 0;
                      return (
                        <div key={su.service_id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{su.service_name}</span>
                            <span className="text-muted-foreground">
                              {su.used}/{su.total} usados ({su.remaining} restantes)
                            </span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Buy Package Modal */}
      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adquirir Pacote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pacote *</Label>
              <Select value={selectedPkgId} onValueChange={(val) => {
                setSelectedPkgId(val);
                const pkg = activePackages.find((p) => p.id === val);
                if (pkg) setTotalPaid(Number(pkg.price));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pacote" />
                </SelectTrigger>
                <SelectContent>
                  {activePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {formatCurrency(Number(pkg.price))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Pago (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={totalPaid}
                onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Input
                value={buyNotes}
                onChange={(e) => setBuyNotes(e.target.value)}
                placeholder="Observacoes opcionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleBuy} disabled={!selectedPkgId || isPurchasing}>
              {isPurchasing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Confirmar Compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Package Modal */}
      <Dialog open={useModalOpen} onOpenChange={setUseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Uso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Servico *</Label>
              <Select value={useServiceId} onValueChange={setUseServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o servico utilizado" />
                </SelectTrigger>
                <SelectContent>
                  {activeClientPkg && getServiceUsage(activeClientPkg)
                    .filter((su) => su.remaining > 0)
                    .map((su) => (
                      <SelectItem key={su.service_id} value={su.service_id}>
                        {su.service_name} ({su.remaining} restantes)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Profissional (opcional)</Label>
              <Select value={useProfessionalId} onValueChange={setUseProfessionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUse} disabled={!useServiceId || isRegistering}>
              {isRegistering ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registrando...</> : "Registrar Uso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
