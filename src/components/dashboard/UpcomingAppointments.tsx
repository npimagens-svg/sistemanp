import { Clock, User, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "status-scheduled" },
  confirmed: { label: "Confirmado", className: "status-confirmed" },
  in_progress: { label: "Em atendimento", className: "status-in-progress" },
  completed: { label: "Finalizado", className: "status-completed" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
  }
  return `${minutes}min`;
}

export function UpcomingAppointments() {
  const { salonId } = useAuth();
  const navigate = useNavigate();

  const { data: appointments = [] } = useQuery({
    queryKey: ["dashboard-upcoming", salonId],
    queryFn: async () => {
      if (!salonId) return [];

      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const { data } = await supabase
        .from("appointments")
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          status,
          client:clients(name),
          professional:professionals(name),
          service:services(name)
        `)
        .eq("salon_id", salonId)
        .gte("scheduled_at", now.toISOString())
        .lt("scheduled_at", todayEnd)
        .in("status", ["scheduled", "confirmed", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(8);

      return (data ?? []).map((a: any) => ({
        id: a.id,
        clientName: a.client?.name ?? "Cliente não informado",
        clientInitials: getInitials(a.client?.name ?? "CI"),
        service: a.service?.name ?? "Serviço",
        professional: a.professional?.name ?? "Profissional",
        time: new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        duration: formatDuration(a.duration_minutes),
        status: a.status as string,
      }));
    },
    enabled: !!salonId,
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Próximos Atendimentos</CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
          Ver Agenda Completa
        </Button>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum atendimento pendente para hoje
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {appointment.clientInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{appointment.clientName}</p>
                    {statusConfig[appointment.status] && (
                      <Badge variant="secondary" className={statusConfig[appointment.status].className}>
                        {statusConfig[appointment.status].label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{appointment.service}</p>
                </div>

                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{appointment.professional}</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{appointment.time}</span>
                  </div>
                  <span className="text-muted-foreground hidden sm:inline">
                    {appointment.duration}
                  </span>
                </div>

                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
