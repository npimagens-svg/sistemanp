import { useEffect, useMemo, useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Clock, Search, Loader2, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { useAppointments, AppointmentInput, Appointment } from "@/hooks/useAppointments";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { AppointmentModal } from "@/components/modals/AppointmentModal";
import { BlockTimeModal, BlockTimeData } from "@/components/modals/BlockTimeModal";
import { AppointmentHoverCard } from "@/components/agenda/AppointmentHoverCard";
import { ClientModal } from "@/components/modals/ClientModal";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

const statusColors: Record<string, string> = {
  scheduled: "bg-red-500 text-white",
  confirmed: "bg-green-500 text-white",
  in_progress: "bg-amber-500 text-white",
  completed: "bg-emerald-600 text-white",
  no_show: "bg-gray-400 text-white",
  cancelled: "bg-gray-500 text-white",
  blocked: "bg-slate-700 text-white",
};

const professionalColors = [
  "bg-red-500", "bg-blue-500", "bg-purple-500", "bg-emerald-500", 
  "bg-pink-500", "bg-amber-500", "bg-cyan-500", "bg-indigo-500",
  "bg-rose-500", "bg-teal-500", "bg-orange-500", "bg-violet-500"
];

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchProfessional, setSearchProfessional] = useState("");
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ professionalId: string; time: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [pendingClientName, setPendingClientName] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);

  const { toast } = useToast();
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const { appointments, isLoading: appointmentsLoading, createAppointment, updateAppointment, isCreating, isUpdating } = useAppointments(currentDate);
  const { professionals, isLoading: professionalsLoading } = useProfessionals();
  const { clients, createClient } = useClients();
  const { services } = useServices();

  useEffect(() => {
    if (professionals.length > 0 && selectedProfessionalIds.length === 0) {
      setSelectedProfessionalIds(professionals.map((p) => p.id));
    }
  }, [professionals, selectedProfessionalIds.length]);

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleProfessional = (id: string) => {
    setSelectedProfessionalIds(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedProfessionalIds.length === professionals.length) {
      setSelectedProfessionalIds([]);
    } else {
      setSelectedProfessionalIds(professionals.map(p => p.id));
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getProfessionalColor = (index: number) => {
    return professionalColors[index % professionalColors.length];
  };

  const filteredProfessionals = professionals.filter(p => 
    p.is_active && 
    (selectedProfessionalIds.length === 0 || selectedProfessionalIds.includes(p.id)) &&
    p.name.toLowerCase().includes(searchProfessional.toLowerCase())
  );

  const getSlotIndex = (time: string) => {
    return timeSlots.indexOf(time);
  };

  const getAppointmentsAtSlot = (professionalId: string, timeSlot: string) => {
    return appointments.filter(a => {
      const appointmentTime = format(new Date(a.scheduled_at), "HH:mm");
      return a.professional_id === professionalId && appointmentTime === timeSlot;
    });
  };

  const handleSlotClick = (professionalId: string, time: string, appointment?: Appointment) => {
    if (appointment) {
      setSelectedAppointment(appointment);
    } else {
      setSelectedSlot({ professionalId, time });
      setSelectedAppointment(null);
    }
    setModalOpen(true);
  };

  const handleSubmit = (data: AppointmentInput & { id?: string }) => {
    if (data.id) {
      updateAppointment(data as AppointmentInput & { id: string });
    } else {
      createAppointment(data);
    }
  };

  const handleCreateClient = (name: string) => {
    setPendingClientName(name);
    setClientModalOpen(true);
  };

  const handleClientSubmit = (data: any) => {
    createClient(data, {
      onSuccess: () => {
        setClientModalOpen(false);
        setPendingClientName("");
      }
    });
  };

  const handleBlockTime = async (data: BlockTimeData) => {
    if (!salonId) return;
    
    setIsBlocking(true);
    try {
      const scheduled_at = new Date(`${data.date}T${data.time}`).toISOString();
      
      // Create a "blocked" appointment (no client, no service, with reason in notes)
      const { error } = await supabase
        .from("appointments")
        .insert({
          salon_id: salonId,
          professional_id: data.professional_id,
          scheduled_at,
          duration_minutes: data.duration_minutes,
          status: "cancelled", // Using cancelled status for blocked time
          notes: `🔒 BLOQUEADO: ${data.reason}`,
          client_id: null,
          service_id: null,
        });

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
      toast({ title: "Horário bloqueado com sucesso!" });
    } catch (error: any) {
      toast({ 
        title: "Erro ao bloquear horário", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const getDefaultDateWithTime = () => {
    if (selectedSlot) {
      const date = new Date(currentDate);
      const [hours, minutes] = selectedSlot.time.split(":");
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return currentDate;
  };

  const isLoading = appointmentsLoading || professionalsLoading;

  return (
    <AppLayoutNew>
      <div className="flex gap-4 h-full">
        {/* Left Sidebar - Calendar & Filters */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Mini Calendar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium capitalize">{formatMonthYear(currentDate)}</span>
                <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                locale={ptBR}
                className="w-full [&_.rdp-months]:flex [&_.rdp-months]:justify-center [&_.rdp-month]:w-full [&_.rdp-caption]:hidden [&_.rdp-table]:w-full"
              />
            </CardContent>
          </Card>

          {/* Professionals Filter */}
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="font-medium text-sm">Profissionais</div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar profissional" 
                  className="pl-8 h-8 text-sm"
                  value={searchProfessional}
                  onChange={(e) => setSearchProfessional(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedProfessionalIds.length === professionals.length}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-sm">Todos</span>
                  </div>
                  <button className="text-xs text-primary hover:underline">
                    Expandir Tudo
                  </button>
                </div>
                {professionals.filter(p => p.is_active && p.name.toLowerCase().includes(searchProfessional.toLowerCase())).map((prof, index) => (
                  <div key={prof.id} className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedProfessionalIds.includes(prof.id)}
                      onCheckedChange={() => toggleProfessional(prof.id)}
                    />
                    <div className={`w-3 h-3 rounded-full ${getProfessionalColor(index)}`} />
                    <span className="text-sm">{prof.name}</span>
                  </div>
                ))}
                {professionals.filter(p => p.is_active).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum profissional cadastrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Calendar Grid */}
        <div className="flex-1 space-y-4">
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedSlot(null);
                  setBlockModalOpen(true);
                }}
              >
                <Ban className="h-4 w-4 mr-1" />
                Bloquear Horário
              </Button>
              <Button size="sm" onClick={() => { setSelectedAppointment(null); setSelectedSlot(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Agendamento
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ajustar colunas:</span>
              <div className="flex gap-1">
                {[3, 5, 8, 10, 12].map(num => (
                  <Button 
                    key={num} 
                    variant={filteredProfessionals.length === num ? "default" : "outline"} 
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <Input placeholder="Pesquisar agendamento" className="w-48 h-8" />
            </div>
          </div>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProfessionals.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="mb-4">Nenhum profissional cadastrado para exibir na agenda.</p>
                  <Button onClick={() => window.location.href = '/profissionais'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Profissional
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    {/* Professionals Header */}
                    <div 
                      className="grid border-b" 
                      style={{ gridTemplateColumns: `60px repeat(${filteredProfessionals.length}, 1fr)` }}
                    >
                      <div className="p-2 border-r bg-muted/30">
                        <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                      </div>
                      {filteredProfessionals.map((professional, index) => (
                        <div key={professional.id} className="p-2 border-r last:border-r-0 bg-muted/30 text-center">
                          <Avatar className="h-10 w-10 mx-auto mb-1">
                            {professional.avatar_url && (
                              <AvatarImage src={professional.avatar_url} alt={professional.name} />
                            )}
                            <AvatarFallback className={`${getProfessionalColor(index)} text-white text-xs`}>
                              {getInitials(professional.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs block uppercase">{professional.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Time Slots */}
                    <div className="relative max-h-[600px] overflow-y-auto">
                      {timeSlots.map((time, timeIndex) => (
                        <div
                          key={time}
                          className="grid border-b last:border-b-0"
                          style={{ gridTemplateColumns: `60px repeat(${filteredProfessionals.length}, 1fr)` }}
                        >
                          <div className="p-1 border-r text-xs text-muted-foreground text-center bg-muted/10 flex items-center justify-center">
                            {time}
                          </div>
                          {filteredProfessionals.map((professional) => {
                            const slotAppointments = getAppointmentsAtSlot(professional.id, time);
                            const appointmentCount = slotAppointments.length;

                            return (
                              <div
                                key={`${professional.id}-${time}`}
                                className="relative border-r last:border-r-0 h-10 hover:bg-primary/10 transition-colors cursor-pointer"
                                onClick={() => handleSlotClick(professional.id, time)}
                              >
                                {appointmentCount > 0 && (
                                  <div className="absolute inset-0 flex gap-0.5 p-0.5">
                                    {slotAppointments.map((appointment, idx) => {
                                      const isBlocked = appointment.notes?.startsWith("🔒 BLOQUEADO:");
                                      const blockReason = isBlocked ? appointment.notes?.replace("🔒 BLOQUEADO: ", "") : null;
                                      
                                      return (
                                        <AppointmentHoverCard key={appointment.id} appointment={appointment}>
                                          <div
                                            className={`flex-1 rounded-sm p-0.5 z-10 cursor-pointer transition-shadow hover:shadow-md overflow-hidden ${isBlocked ? "bg-slate-700 text-white" : statusColors[appointment.status]}`}
                                            style={{
                                              height: `${Math.ceil(appointment.duration_minutes / 30) * 40 - 4}px`,
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isBlocked) {
                                                handleSlotClick(professional.id, time, appointment);
                                              }
                                            }}
                                          >
                                            {isBlocked ? (
                                              <>
                                                <div className="text-[9px] font-medium truncate flex items-center gap-1">
                                                  <Ban className="h-2 w-2" /> Bloqueado
                                                </div>
                                                <div className="text-[8px] opacity-90 truncate">
                                                  {blockReason}
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div className="text-[9px] font-medium truncate">
                                                  {appointmentCount > 1 ? "" : `${time} `}{appointment.clients?.name || "Cliente"}
                                                </div>
                                                {appointment.services?.name && (
                                                  <div className="text-[9px] opacity-90 truncate uppercase">
                                                    {appointment.services.name}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </AppointmentHoverCard>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AppointmentModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedSlot(null);
            setSelectedAppointment(null);
          }
        }}
        appointment={selectedAppointment}
        clients={clients}
        professionals={professionals.filter(p => p.is_active)}
        services={services.filter(s => s.is_active)}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
        defaultDate={getDefaultDateWithTime()}
        defaultProfessionalId={selectedSlot?.professionalId}
        onCreateClient={handleCreateClient}
      />

      <BlockTimeModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        professionals={professionals.filter(p => p.is_active)}
        onSubmit={handleBlockTime}
        isLoading={isBlocking}
        defaultDate={currentDate}
        defaultProfessionalId={selectedSlot?.professionalId}
        defaultTime={selectedSlot?.time}
      />

      <ClientModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        onSubmit={handleClientSubmit}
        initialName={pendingClientName}
      />
    </AppLayoutNew>
  );
}
