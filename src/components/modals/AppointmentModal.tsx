import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Appointment, AppointmentInput } from "@/hooks/useAppointments";
import { Client } from "@/hooks/useClients";
import { Professional } from "@/hooks/useProfessionals";
import { Service } from "@/hooks/useServices";
import { DollarSign } from "lucide-react";

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  clients: Client[];
  professionals: Professional[];
  services: Service[];
  onSubmit: (data: AppointmentInput & { id?: string }) => void;
  isLoading?: boolean;
  defaultDate?: Date;
  defaultProfessionalId?: string;
  onOpenComanda?: (appointmentId: string) => void;
}

export function AppointmentModal({
  open,
  onOpenChange,
  appointment,
  clients,
  professionals,
  services,
  onSubmit,
  isLoading,
  defaultDate,
  defaultProfessionalId,
  onOpenComanda,
}: AppointmentModalProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AppointmentInput & { date: string; time: string }>({
    client_id: "",
    professional_id: "",
    service_id: "",
    scheduled_at: "",
    duration_minutes: 30,
    status: "scheduled",
    notes: "",
    price: 0,
    date: "",
    time: "",
  });

  useEffect(() => {
    if (appointment) {
      const date = new Date(appointment.scheduled_at);
      setFormData({
        client_id: appointment.client_id || "",
        professional_id: appointment.professional_id,
        service_id: appointment.service_id || "",
        scheduled_at: appointment.scheduled_at,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        notes: appointment.notes || "",
        price: Number(appointment.price) || 0,
        date: date.toISOString().split("T")[0],
        time: date.toTimeString().slice(0, 5),
      });
    } else {
      const date = defaultDate || new Date();
      setFormData({
        client_id: "",
        professional_id: defaultProfessionalId || "",
        service_id: "",
        scheduled_at: "",
        duration_minutes: 30,
        status: "scheduled",
        notes: "",
        price: 0,
        date: date.toISOString().split("T")[0],
        time: date.toTimeString().slice(0, 5),
      });
    }
  }, [appointment, open, defaultDate, defaultProfessionalId]);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setFormData({
        ...formData,
        service_id: serviceId,
        duration_minutes: service.duration_minutes,
        price: Number(service.price),
      });
    } else {
      setFormData({ ...formData, service_id: serviceId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scheduled_at = new Date(`${formData.date}T${formData.time}`).toISOString();
    
    const data: AppointmentInput = {
      client_id: formData.client_id || undefined,
      professional_id: formData.professional_id,
      service_id: formData.service_id || undefined,
      scheduled_at,
      duration_minutes: formData.duration_minutes,
      status: formData.status,
      notes: formData.notes || undefined,
      price: formData.price,
    };

    if (appointment) {
      onSubmit({ ...data, id: appointment.id });
    } else {
      onSubmit(data);
    }
    onOpenChange(false);
  };

  const selectedClient = appointment ? clients.find(c => c.id === appointment.client_id) : null;

  const handleOpenComanda = () => {
    if (appointment?.id) {
      navigate(`/comandas?appointment=${appointment.id}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
        </DialogHeader>
        
        {/* Client Info Header with Abrir Comanda button - only shows when editing */}
        {appointment && selectedClient && (
          <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-primary font-semibold">Cliente: {selectedClient.name.toUpperCase()}</p>
              {selectedClient.phone && (
                <p className="text-sm text-primary">Celular: {selectedClient.phone}</p>
              )}
            </div>
            <Button
              type="button"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleOpenComanda}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Abrir Comanda
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
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
            <Label>Profissional *</Label>
            <Select 
              value={formData.professional_id} 
              onValueChange={(v) => setFormData({ ...formData, professional_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.filter((p) => p.is_active).map((pro) => (
                  <SelectItem key={pro.id} value={pro.id}>
                    {pro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={formData.service_id} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.filter((s) => s.is_active).map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {Number(service.price).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                step={5}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v: any) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                <SelectItem value="completed">Finalizado</SelectItem>
                <SelectItem value="no_show">Não Compareceu</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.professional_id}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
