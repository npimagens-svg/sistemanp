import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useProfessionalCommissions, CommissionInput } from "@/hooks/useProfessionalCommissions";

interface ProfessionalCommissionsTabProps {
  professionalId: string;
  defaultCommission: number;
}

export function ProfessionalCommissionsTab({ professionalId, defaultCommission }: ProfessionalCommissionsTabProps) {
  const { services, isLoading: loadingServices } = useServices();
  const { commissions, isLoading: loadingCommissions, bulkUpsertCommissions, isUpserting } = useProfessionalCommissions(professionalId);
  
  const [localCommissions, setLocalCommissions] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || "Sem Categoria";
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  // Initialize local commissions from fetched data
  useEffect(() => {
    const initial: Record<string, number> = {};
    services.forEach((service) => {
      const existing = commissions.find((c) => c.service_id === service.id);
      initial[service.id] = existing ? existing.commission_percent : defaultCommission;
    });
    setLocalCommissions(initial);
    setHasChanges(false);
  }, [commissions, services, defaultCommission]);

  const handleCommissionChange = (serviceId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalCommissions((prev) => ({ ...prev, [serviceId]: Math.min(100, Math.max(0, numValue)) }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const inputs: CommissionInput[] = Object.entries(localCommissions).map(([serviceId, commission]) => ({
      professional_id: professionalId,
      service_id: serviceId,
      commission_percent: commission,
    }));
    bulkUpsertCommissions(inputs);
    setHasChanges(false);
  };

  const handleApplyToAll = (value: number) => {
    const updated: Record<string, number> = {};
    services.forEach((service) => {
      updated[service.id] = value;
    });
    setLocalCommissions(updated);
    setHasChanges(true);
  };

  if (loadingServices || loadingCommissions) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum serviço cadastrado. Cadastre serviços primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Aplicar a todos:</span>
          <Button variant="outline" size="sm" onClick={() => handleApplyToAll(defaultCommission)}>
            Padrão ({defaultCommission}%)
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleApplyToAll(0)}>
            0%
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleApplyToAll(50)}>
            50%
          </Button>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isUpserting}>
          {isUpserting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Comissões
        </Button>
      </div>

      {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
        <Card key={category}>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="secondary">{category}</Badge>
              <span className="text-muted-foreground text-sm">({categoryServices.length} serviços)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2">
              {categoryServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Preço: R$ {service.price.toFixed(2)} • Duração: {service.duration_minutes}min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={localCommissions[service.id] ?? defaultCommission}
                      onChange={(e) => handleCommissionChange(service.id, e.target.value)}
                      className="w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                    {localCommissions[service.id] !== undefined && (
                      <span className="text-sm text-muted-foreground w-24 text-right">
                        = R$ {((service.price * localCommissions[service.id]) / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
