import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, Percent, User, UserX, RotateCcw } from "lucide-react";
import { useProfessionals, Professional, ProfessionalInput } from "@/hooks/useProfessionals";
import { ProfessionalModal } from "@/components/modals/ProfessionalModal";
import { TransferAppointmentsModal } from "@/components/modals/TransferAppointmentsModal";
import { ProfessionalCommissionsTab } from "@/components/professionals/ProfessionalCommissionsTab";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function Profissionais() {
  const { 
    professionals, 
    isLoading, 
    createProfessional, 
    updateProfessional, 
    deactivateProfessional, 
    reactivateProfessional,
    isCreating, 
    isUpdating, 
    isDeactivating,
    isReactivating 
  } = useProfessionals();
  const { canDelete } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedForCommissions, setSelectedForCommissions] = useState<Professional | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Separate active and inactive professionals
  const activeProfessionals = professionals.filter((p) => p.is_active);
  const inactiveProfessionals = professionals.filter((p) => !p.is_active);

  const filteredProfessionals = (showInactive ? inactiveProfessionals : activeProfessionals).filter((professional) =>
    professional.name.toLowerCase().includes(search.toLowerCase()) ||
    professional.email?.toLowerCase().includes(search.toLowerCase()) ||
    professional.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedProfessional(null);
    setModalOpen(true);
  };

  const handleEdit = (professional: Professional) => {
    setSelectedProfessional(professional);
    setModalOpen(true);
  };

  const handleDeactivate = (professional: Professional) => {
    if (!canDelete) {
      toast({
        title: "Acesso negado",
        description: "Apenas o usuário master pode desativar profissionais.",
        variant: "destructive",
      });
      return;
    }
    setSelectedProfessional(professional);
    setTransferModalOpen(true);
  };

  const handleReactivate = (professional: Professional) => {
    if (!canDelete) {
      toast({
        title: "Acesso negado",
        description: "Apenas o usuário master pode reativar profissionais.",
        variant: "destructive",
      });
      return;
    }
    reactivateProfessional(professional.id);
  };

  const handleSubmit = (data: ProfessionalInput & { id?: string }) => {
    if (data.id) {
      updateProfessional(data as ProfessionalInput & { id: string });
    } else {
      createProfessional(data);
    }
  };

  const confirmDeactivate = (targetProfessionalId: string | null) => {
    if (selectedProfessional) {
      deactivateProfessional({ 
        id: selectedProfessional.id, 
        targetProfessionalId: targetProfessionalId || undefined 
      });
      setTransferModalOpen(false);
      setSelectedProfessional(null);
    }
  };

  const handleManageCommissions = (professional: Professional) => {
    setSelectedForCommissions(professional);
    setActiveTab("commissions");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const SPECIALTY_LABELS: Record<string, string> = {
    cabeleireiro: "Cabeleireiro(a)",
    manicure: "Manicure",
    esteticista: "Esteticista",
    maquiador: "Maquiador(a)",
    barbeiro: "Barbeiro",
    depilador: "Depilador(a)",
    massagista: "Massagista",
    recepcionista: "Recepcionista",
    gerente: "Gerente",
    outro: "Outro",
  };

  const getSpecialtyLabel = (role: string) => SPECIALTY_LABELS[role] || role;

  return (
    <AppLayoutNew>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Lista de Profissionais
            </TabsTrigger>
            {selectedForCommissions && (
              <TabsTrigger value="commissions" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Comissões: {selectedForCommissions.name}
              </TabsTrigger>
            )}
          </TabsList>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional
          </Button>
        </div>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou especialidade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showInactive ? "default" : "outline"}
                  onClick={() => setShowInactive(!showInactive)}
                  className="gap-2"
                >
                  <UserX className="h-4 w-4" />
                  {showInactive ? "Mostrando Inativos" : "Ver Inativos"}
                  {inactiveProfessionals.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {inactiveProfessionals.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProfessionals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search 
                    ? "Nenhum profissional encontrado." 
                    : showInactive 
                      ? "Nenhum profissional inativo." 
                      : "Nenhum profissional cadastrado."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Comissão Padrão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfessionals.map((professional) => (
                      <TableRow key={professional.id} className={!professional.is_active ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(professional.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{professional.name}</p>
                              {professional.email && (
                                <p className="text-sm text-muted-foreground">{professional.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(professional as any).role ? (
                            <Badge variant="secondary">{getSpecialtyLabel((professional as any).role)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {professional.phone || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{professional.commission_percent || 0}%</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={professional.is_active ? "default" : "secondary"}>
                            {professional.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {professional.is_active ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleEdit(professional)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleManageCommissions(professional)}>
                                    <Percent className="h-4 w-4 mr-2" />
                                    Comissões por Serviço
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeactivate(professional)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Desativar
                                    </DropdownMenuItem>
                                  )}
                                </>
                              ) : (
                                canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => handleReactivate(professional)}
                                    className="text-green-600"
                                    disabled={isReactivating}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reativar
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {selectedForCommissions && (
          <TabsContent value="commissions">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(selectedForCommissions.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedForCommissions.name}</h2>
                    <p className="text-muted-foreground">
                      Especialidade: {getSpecialtyLabel((selectedForCommissions as any).role) || "Não definida"} • 
                      Comissão Padrão: {selectedForCommissions.commission_percent || 0}%
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="ml-auto"
                    onClick={() => {
                      setActiveTab("list");
                      setSelectedForCommissions(null);
                    }}
                  >
                    Voltar para Lista
                  </Button>
                </div>

                <ProfessionalCommissionsTab
                  professionalId={selectedForCommissions.id}
                  defaultCommission={selectedForCommissions.commission_percent || 0}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <ProfessionalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        professional={selectedProfessional}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />

      <TransferAppointmentsModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        professional={selectedProfessional}
        professionals={professionals}
        onConfirm={confirmDeactivate}
        isLoading={isDeactivating}
      />
    </AppLayoutNew>
  );
}
