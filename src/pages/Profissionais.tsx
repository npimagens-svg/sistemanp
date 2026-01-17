import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, Percent, User } from "lucide-react";
import { useProfessionals, Professional, ProfessionalInput } from "@/hooks/useProfessionals";
import { ProfessionalModal } from "@/components/modals/ProfessionalModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { ProfessionalCommissionsTab } from "@/components/professionals/ProfessionalCommissionsTab";

export function Profissionais() {
  const { professionals, isLoading, createProfessional, updateProfessional, deleteProfessional, isCreating, isUpdating, isDeleting } = useProfessionals();
  
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedForCommissions, setSelectedForCommissions] = useState<Professional | null>(null);

  const filteredProfessionals = professionals.filter((professional) =>
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

  const handleDelete = (professional: Professional) => {
    setSelectedProfessional(professional);
    setDeleteModalOpen(true);
  };

  const handleSubmit = (data: ProfessionalInput & { id?: string }) => {
    if (data.id) {
      updateProfessional(data as ProfessionalInput & { id: string });
    } else {
      createProfessional(data);
    }
  };

  const confirmDelete = () => {
    if (selectedProfessional) {
      deleteProfessional(selectedProfessional.id);
      setDeleteModalOpen(false);
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

  return (
    <AppLayout title="Profissionais">
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou especialidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
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
                  {search ? "Nenhum profissional encontrado." : "Nenhum profissional cadastrado."}
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
                      <TableRow key={professional.id}>
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
                          {professional.specialty ? (
                            <Badge variant="secondary">{professional.specialty}</Badge>
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
                              <DropdownMenuItem onClick={() => handleEdit(professional)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageCommissions(professional)}>
                                <Percent className="h-4 w-4 mr-2" />
                                Comissões por Serviço
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(professional)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
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
                      Especialidade: {selectedForCommissions.specialty || "Não definida"} • 
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

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Excluir Profissional"
        description={`Tem certeza que deseja excluir o profissional "${selectedProfessional?.name}"? Esta ação não pode ser desfeita.`}
        isLoading={isDeleting}
      />
    </AppLayout>
  );
}
