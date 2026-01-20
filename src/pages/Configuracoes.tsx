import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Users, Settings, MoreHorizontal, Trash2, Loader2, Building2 } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { useUserAccess, UserWithAccess } from "@/hooks/useUserAccess";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<AppRole, { label: string; description: string; color: string }> = {
  admin: { label: "Administrador", description: "Acesso total ao sistema", color: "bg-red-500" },
  manager: { label: "Gerente", description: "Acesso completo exceto configurações do salão", color: "bg-orange-500" },
  receptionist: { label: "Recepcionista", description: "Agenda, clientes, comandas e caixa", color: "bg-blue-500" },
  financial: { label: "Financeiro", description: "Relatórios financeiros, caixa e comandas", color: "bg-green-500" },
  professional: { label: "Profissional", description: "Visualiza agenda pessoal e comandas", color: "bg-purple-500" },
};

export default function Configuracoes() {
  const { isMaster, user } = useAuth();
  const { users, isLoading, updateRole, deleteAccess, isUpdating, isDeleting } = useUserAccess();
  const { toast } = useToast();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    if (!isMaster) {
      toast({
        title: "Acesso negado",
        description: "Apenas o usuário master pode alterar permissões.",
        variant: "destructive",
      });
      return;
    }
    updateRole({ userId, newRole });
  };

  const handleDeleteAccess = (userAccess: UserWithAccess) => {
    if (!isMaster) {
      toast({
        title: "Acesso negado",
        description: "Apenas o usuário master pode remover acessos.",
        variant: "destructive",
      });
      return;
    }
    setSelectedUser(userAccess);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteAccess(selectedUser.user_id);
      setDeleteModalOpen(false);
      setSelectedUser(null);
    }
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
    <AppLayoutNew>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema e acessos de usuários.</p>
        </div>

        <Tabs defaultValue="usuarios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários e Acessos
            </TabsTrigger>
            <TabsTrigger value="salao" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dados do Salão
            </TabsTrigger>
            <TabsTrigger value="sistema" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4">
            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Sobre os níveis de acesso</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Os acessos são criados ao cadastrar um profissional com "Criar acesso ao sistema" habilitado. 
                      Aqui você pode alterar o nível de permissão de cada usuário.
                    </p>
                    {!isMaster && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 font-medium">
                        ⚠️ Apenas o usuário master pode alterar permissões.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuários com Acesso ao Sistema</CardTitle>
                <CardDescription>
                  Lista de todos os usuários que podem acessar o sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Profissional Vinculado</TableHead>
                        <TableHead>Nível de Acesso</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userAccess) => {
                        const roleInfo = ROLE_LABELS[userAccess.role];
                        const isCurrentUser = userAccess.user_id === user?.id;
                        const isAdmin = userAccess.role === "admin";
                        
                        return (
                          <TableRow key={userAccess.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(userAccess.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {userAccess.full_name}
                                    {isCurrentUser && (
                                      <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {userAccess.professional_name ? (
                                <Badge variant="secondary">{userAccess.professional_name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isMaster && !isAdmin ? (
                                <Select
                                  value={userAccess.role}
                                  onValueChange={(value) => handleRoleChange(userAccess.user_id, value as AppRole)}
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ROLE_LABELS)
                                      .filter(([key]) => key !== "admin")
                                      .map(([key, value]) => (
                                        <SelectItem key={key} value={key}>
                                          <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${value.color}`} />
                                            {value.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${roleInfo.color}`} />
                                  <span>{roleInfo.label}</span>
                                  {isAdmin && (
                                    <Badge variant="destructive" className="text-xs">Master</Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isMaster && !isAdmin && !isCurrentUser && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteAccess(userAccess)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remover Acesso
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Roles Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição dos Níveis de Acesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(ROLE_LABELS).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className={`h-3 w-3 rounded-full ${value.color} mt-1`} />
                      <div>
                        <p className="font-medium">{value.label}</p>
                        <p className="text-sm text-muted-foreground">{value.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salao">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Salão</CardTitle>
                <CardDescription>Informações básicas do estabelecimento.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em breve: configuração de nome, endereço, logo e dados do salão.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sistema">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>Preferências gerais do sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em breve: configurações de notificações, horários, integrações.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Remover Acesso"
        description={`Tem certeza que deseja remover o acesso de "${selectedUser?.full_name}"? Esta ação irá desativar o login do usuário no sistema.`}
        isLoading={isDeleting}
      />
    </AppLayoutNew>
  );
}
