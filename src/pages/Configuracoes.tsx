import { useState, useEffect } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
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
import { Shield, Users, Settings, MoreHorizontal, Trash2, Loader2, Building2, CreditCard, Plus, Pencil, Landmark, ArrowRightLeft, Lock, Cog, UserCog, Save } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { useUserAccess, UserWithAccess } from "@/hooks/useUserAccess";
import { useCardBrands, CardBrand, CardBrandInput } from "@/hooks/useCardBrands";
import { useBankAccounts, BankAccount, BankAccountInput } from "@/hooks/useBankAccounts";
import { useAccessLevels, AccessLevelWithPermissions } from "@/hooks/useAccessLevels";
import { useProfessionals } from "@/hooks/useProfessionals";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { CardBrandModal } from "@/components/modals/CardBrandModal";
import { BankAccountModal } from "@/components/modals/BankAccountModal";
import { TransferMasterModal } from "@/components/modals/TransferMasterModal";
import { AccessLevelConfigModal } from "@/components/settings/AccessLevelConfigModal";
import { CreateAccessLevelModal } from "@/components/settings/CreateAccessLevelModal";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const SPECIALTIES = [
  { value: "cabeleireiro", label: "Cabeleireiro(a)" },
  { value: "manicure", label: "Manicure" },
  { value: "esteticista", label: "Esteticista" },
  { value: "maquiador", label: "Maquiador(a)" },
  { value: "barbeiro", label: "Barbeiro" },
  { value: "depilador", label: "Depilador(a)" },
  { value: "massagista", label: "Massagista" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "gerente", label: "Gerente" },
  { value: "outro", label: "Outro" },
];

function MasterProfessionalProfile() {
  const { user, salonId } = useAuth();
  const { professionals, createProfessional, updateProfessional, isCreating, isUpdating } = useProfessionals();
  const { toast } = useToast();

  // Find if master user already has a professional record linked
  const masterProfessional = professionals.find(
    (p) => p.user_id === user?.id || p.email === user?.email
  );

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    cpf: "",
    role: "",
    phone: "",
    specialty: "",
    commission_percent: 0,
    can_be_assistant: false,
    has_schedule: true,
    avatar_url: null as string | null,
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (masterProfessional) {
      setFormData({
        name: masterProfessional.name,
        nickname: masterProfessional.nickname || "",
        cpf: masterProfessional.cpf || "",
        role: masterProfessional.role || "",
        phone: masterProfessional.phone || "",
        specialty: masterProfessional.specialty || "",
        commission_percent: Number(masterProfessional.commission_percent) || 0,
        can_be_assistant: masterProfessional.can_be_assistant || false,
        has_schedule: masterProfessional.has_schedule ?? true,
        avatar_url: masterProfessional.avatar_url || null,
      });
    }
  }, [masterProfessional]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (masterProfessional) {
      updateProfessional({
        id: masterProfessional.id,
        ...formData,
        email: user?.email || "",
        is_active: true,
      });
    } else {
      createProfessional({
        ...formData,
        email: user?.email || "",
        is_active: true,
        create_access: false,
        user_id: user?.id || null,
      });
    }
    setIsEditing(false);
  };

  const showForm = isEditing || !masterProfessional;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Meu Perfil Profissional</CardTitle>
        </div>
        <CardDescription>
          Configure seus dados como profissional do salão. Isso permite que você apareça na agenda, receba agendamentos e comissões.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!masterProfessional && !isEditing ? (
          <div className="text-center py-6 space-y-4">
            <UserCog className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground">Você ainda não está cadastrado como profissional do salão.</p>
              <p className="text-sm text-muted-foreground">Cadastre-se para aparecer na agenda e receber agendamentos.</p>
            </div>
            <Button onClick={() => {
              setFormData(prev => ({ ...prev, name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "" }));
              setIsEditing(true);
            }} className="gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar como Profissional
            </Button>
          </div>
        ) : showForm ? (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={formData.avatar_url}
                name={formData.name}
                onAvatarChange={(url) => setFormData({ ...formData, avatar_url: url })}
                folder="professionals"
                size="lg"
              />
            </div>

            {/* Row 1: Nome e Apelido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Apelido</Label>
                <Input
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: CPF e Especialidade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidade <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Telefone e Comissão */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Comissão Padrão (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commission_percent}
                  onChange={(e) => setFormData({ ...formData, commission_percent: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="master_has_schedule"
                  checked={formData.has_schedule}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_schedule: checked as boolean })}
                />
                <Label htmlFor="master_has_schedule" className="cursor-pointer">
                  Possuo agenda (aparecer na agenda do salão)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="master_can_be_assistant"
                  checked={formData.can_be_assistant}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_be_assistant: checked as boolean })}
                />
                <Label htmlFor="master_can_be_assistant" className="cursor-pointer">
                  Posso ser assistente
                </Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {masterProfessional && (
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave} disabled={isCreating || isUpdating} className="gap-2">
                <Save className="h-4 w-4" />
                {isCreating || isUpdating ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          /* Display mode */
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {masterProfessional.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{masterProfessional.name}</h3>
                {masterProfessional.nickname && (
                  <p className="text-sm text-muted-foreground">"{masterProfessional.nickname}"</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {masterProfessional.role && (
                    <Badge variant="secondary">
                      {SPECIALTIES.find(s => s.value === masterProfessional.role)?.label || masterProfessional.role}
                    </Badge>
                  )}
                  <Badge variant={masterProfessional.has_schedule ? "default" : "outline"}>
                    {masterProfessional.has_schedule ? "Com agenda" : "Sem agenda"}
                  </Badge>
                  <Badge variant="outline">{masterProfessional.commission_percent || 0}% comissão</Badge>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ROLE_LABELS: Record<AppRole, { label: string; description: string; color: string }> = {
  admin: { label: "Administrador", description: "Acesso total ao sistema", color: "bg-red-500" },
  manager: { label: "Gerente", description: "Acesso completo exceto configurações do salão", color: "bg-orange-500" },
  receptionist: { label: "Recepcionista", description: "Agenda, clientes, comandas e caixa", color: "bg-blue-500" },
  financial: { label: "Financeiro", description: "Relatórios financeiros, caixa e comandas", color: "bg-green-500" },
  professional: { label: "Profissional", description: "Visualiza agenda pessoal e comandas", color: "bg-purple-500" },
};

export default function Configuracoes() {
  const { isMaster, user } = useAuth();
  const { users, isLoading, updateRole, updateCanOpenCaixa, deleteAccess, isUpdating, isDeleting } = useUserAccess();
  const { 
    cardBrands, 
    isLoading: isLoadingBrands, 
    createCardBrand, 
    updateCardBrand, 
    deleteCardBrand,
    isCreating: isCreatingBrand,
    isUpdating: isUpdatingBrand,
    isDeleting: isDeletingBrand 
  } = useCardBrands();
  const {
    bankAccounts,
    isLoading: isLoadingBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
  } = useBankAccounts();
  const {
    accessLevels,
    isLoading: isLoadingAccessLevels,
    createAccessLevel,
    updateAccessLevel,
    updatePermission,
    deleteAccessLevel,
    isCreating: isCreatingAccessLevel,
    isUpdating: isUpdatingAccessLevel,
    isDeleting: isDeletingAccessLevel,
  } = useAccessLevels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);
  
  // Card brand states
  const [cardBrandModalOpen, setCardBrandModalOpen] = useState(false);
  const [selectedCardBrand, setSelectedCardBrand] = useState<CardBrand | null>(null);
  const [deleteCardBrandModalOpen, setDeleteCardBrandModalOpen] = useState(false);
  const [cardBrandToDelete, setCardBrandToDelete] = useState<CardBrand | null>(null);

  // Bank account states
  const [bankAccountModalOpen, setBankAccountModalOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [deleteBankAccountModalOpen, setDeleteBankAccountModalOpen] = useState(false);
  const [bankAccountToDelete, setBankAccountToDelete] = useState<BankAccount | null>(null);

  // Master transfer states
  const [transferMasterModalOpen, setTransferMasterModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Access level states
  const [accessLevelConfigModalOpen, setAccessLevelConfigModalOpen] = useState(false);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<AccessLevelWithPermissions | null>(null);
  const [createAccessLevelModalOpen, setCreateAccessLevelModalOpen] = useState(false);
  const [deleteAccessLevelModalOpen, setDeleteAccessLevelModalOpen] = useState(false);
  const [accessLevelToDelete, setAccessLevelToDelete] = useState<AccessLevelWithPermissions | null>(null);

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

  const handleToggleCanOpenCaixa = (userId: string, currentValue: boolean) => {
    if (!isMaster) {
      toast({
        title: "Acesso negado",
        description: "Apenas o usuário master pode alterar permissões.",
        variant: "destructive",
      });
      return;
    }
    updateCanOpenCaixa({ userId, canOpenCaixa: !currentValue });
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

  // Card brand handlers
  const handleCreateCardBrand = () => {
    setSelectedCardBrand(null);
    setCardBrandModalOpen(true);
  };

  const handleEditCardBrand = (brand: CardBrand) => {
    setSelectedCardBrand(brand);
    setCardBrandModalOpen(true);
  };

  const handleSaveCardBrand = (data: CardBrandInput) => {
    if (selectedCardBrand) {
      updateCardBrand({ id: selectedCardBrand.id, ...data });
    } else {
      createCardBrand(data);
    }
    setCardBrandModalOpen(false);
    setSelectedCardBrand(null);
  };

  const handleDeleteCardBrandClick = (brand: CardBrand) => {
    setCardBrandToDelete(brand);
    setDeleteCardBrandModalOpen(true);
  };

  const confirmDeleteCardBrand = () => {
    if (cardBrandToDelete) {
      deleteCardBrand(cardBrandToDelete.id);
      setDeleteCardBrandModalOpen(false);
      setCardBrandToDelete(null);
    }
  };

  // Bank account handlers
  const handleCreateBankAccount = () => {
    setSelectedBankAccount(null);
    setBankAccountModalOpen(true);
  };

  const handleEditBankAccount = (account: BankAccount) => {
    setSelectedBankAccount(account);
    setBankAccountModalOpen(true);
  };

  const handleSaveBankAccount = (data: BankAccountInput) => {
    if (selectedBankAccount) {
      updateBankAccount.mutate({ id: selectedBankAccount.id, ...data });
    } else {
      createBankAccount.mutate(data);
    }
    setBankAccountModalOpen(false);
    setSelectedBankAccount(null);
  };

  const handleDeleteBankAccountClick = (account: BankAccount) => {
    setBankAccountToDelete(account);
    setDeleteBankAccountModalOpen(true);
  };

  const confirmDeleteBankAccount = () => {
    if (bankAccountToDelete) {
      deleteBankAccount.mutate(bankAccountToDelete.id);
      setDeleteBankAccountModalOpen(false);
      setBankAccountToDelete(null);
    }
  };

  const handleTransferMaster = async (newMasterUserId: string) => {
    setIsTransferring(true);
    try {
      const { error } = await supabase.functions.invoke("transfer-master-access", {
        body: { newMasterUserId },
      });

      if (error) throw error;

      toast({
        title: "Acesso master transferido!",
        description: "Você agora é administrador. Faça login novamente para aplicar as alterações.",
      });

      // Invalidate queries to refetch master email
      queryClient.invalidateQueries({ queryKey: ["master-email"] });
      
      setTransferMasterModalOpen(false);
      
      // Sign out to force refresh
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erro ao transferir acesso",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Get other users for master transfer (exclude current user and admins)
  const eligibleUsersForMaster = users.filter(
    u => u.user_id !== user?.id && u.role !== "admin"
  );

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
            <TabsTrigger value="financeiro" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="sistema" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4">
            {/* Master Professional Profile */}
            <MasterProfessionalProfile />

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
                        <TableHead>Nível de Acesso</TableHead>
                        <TableHead className="text-center">Abrir Caixa</TableHead>
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
                            <TableCell className="text-center">
                              {isMaster && !isAdmin ? (
                                <Switch
                                  checked={userAccess.can_open_caixa}
                                  onCheckedChange={() => handleToggleCanOpenCaixa(userAccess.user_id, userAccess.can_open_caixa)}
                                  disabled={isUpdating}
                                />
                              ) : (
                                <Badge variant={userAccess.can_open_caixa ? "default" : "secondary"}>
                                  {userAccess.can_open_caixa ? "Sim" : "Não"}
                                </Badge>
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

            {/* Access Levels Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Configuração dos Níveis de Acesso</CardTitle>
                    <CardDescription>
                      Configure as permissões de cada nível ou crie níveis personalizados.
                    </CardDescription>
                  </div>
                  {isMaster && (
                    <Button onClick={() => setCreateAccessLevelModalOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Novo Nível
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAccessLevels ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : accessLevels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum nível de acesso configurado.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {accessLevels.map((level) => {
                      const enabledCount = Object.values(level.permissions).filter(Boolean).length;
                      const totalCount = Object.keys(level.permissions).length;
                      
                      return (
                        <div
                          key={level.id}
                          className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedAccessLevel(level);
                            setAccessLevelConfigModalOpen(true);
                          }}
                        >
                          <div
                            className="h-4 w-4 rounded-full mt-0.5 shrink-0"
                            style={{ backgroundColor: level.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{level.name}</p>
                              {level.is_system && (
                                <Badge variant="secondary" className="text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Sistema
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {level.description || "Sem descrição"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {enabledCount} de {totalCount} permissões ativas
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Cog className="h-4 w-4" />
                            </Button>
                            {!level.is_system && isMaster && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAccessLevelToDelete(level);
                                  setDeleteAccessLevelModalOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4">
            {/* Card Brands */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Bandeiras de Cartão</CardTitle>
                    <CardDescription>
                      Cadastre as bandeiras de cartão e suas taxas para descontar do valor pago antes de calcular comissões.
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateCardBrand} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Bandeira
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingBrands ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : cardBrands.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma bandeira cadastrada.</p>
                    <p className="text-sm">Adicione bandeiras de cartão para controlar as taxas.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bandeira</TableHead>
                        <TableHead className="text-center">Taxa Crédito</TableHead>
                        <TableHead className="text-center">Taxa Débito</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardBrands.map((brand) => (
                        <TableRow key={brand.id}>
                          <TableCell className="font-medium">{brand.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{brand.credit_fee_percent.toFixed(2)}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{brand.debit_fee_percent.toFixed(2)}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={brand.is_active ? "default" : "secondary"}>
                              {brand.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCardBrand(brand)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCardBrandClick(brand)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Info about card fees */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">Como funcionam as taxas</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Ao finalizar uma comanda com pagamento em cartão, o sistema descontará a taxa da bandeira 
                      do valor pago. A comissão do profissional será calculada sobre o valor líquido (após o desconto da taxa).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Accounts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Landmark className="h-5 w-5" />
                      Contas Bancárias (PIX)
                    </CardTitle>
                    <CardDescription>
                      Cadastre as contas bancárias para destinar pagamentos via PIX.
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateBankAccount} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Conta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingBankAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Landmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma conta bancária cadastrada.</p>
                    <p className="text-sm">Adicione contas para selecionar o destino dos pagamentos PIX.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Banco</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={account.is_active ? "default" : "secondary"}>
                              {account.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditBankAccount(account)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteBankAccountClick(account)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Info about bank accounts */}
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Landmark className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 dark:text-green-100">Como funcionam as contas</h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Ao receber um pagamento via PIX na comanda, você poderá selecionar para qual conta bancária 
                      o valor está sendo destinado, facilitando o controle financeiro.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sistema" className="space-y-4">
            {/* Salon Data */}
            <Card>
              <CardHeader>
                <CardTitle>Dados do Salão</CardTitle>
                <CardDescription>Informações básicas do estabelecimento.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em breve: configuração de nome, endereço, logo, CNPJ e dados do salão.</p>
              </CardContent>
            </Card>

            {/* Master Transfer Section - Only visible to master user */}
            {isMaster && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <CardTitle className="text-lg text-red-600 dark:text-red-400">
                      Transferir Acesso Master
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Transfira seu acesso master para outro usuário. Esta ação é irreversível.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Atenção:</strong> Ao transferir o acesso master, você perderá as permissões exclusivas de:
                      </p>
                      <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                        <li>Excluir registros do sistema</li>
                        <li>Alterar permissões de outros usuários</li>
                        <li>Remover acessos de usuários</li>
                        <li>Transferir acesso master novamente</li>
                      </ul>
                    </div>
                    
                    {eligibleUsersForMaster.length > 0 ? (
                      <Button
                        variant="destructive"
                        onClick={() => setTransferMasterModalOpen(true)}
                        className="gap-2"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Transferir Acesso Master
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Não há outros usuários disponíveis para receber o acesso master. 
                        Cadastre novos profissionais com acesso ao sistema primeiro.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
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

      <DeleteConfirmModal
        open={deleteCardBrandModalOpen}
        onOpenChange={setDeleteCardBrandModalOpen}
        onConfirm={confirmDeleteCardBrand}
        title="Excluir Bandeira"
        description={`Tem certeza que deseja excluir a bandeira "${cardBrandToDelete?.name}"? Esta ação não poderá ser desfeita.`}
        isLoading={isDeletingBrand}
      />

      <CardBrandModal
        open={cardBrandModalOpen}
        onClose={() => {
          setCardBrandModalOpen(false);
          setSelectedCardBrand(null);
        }}
        onSave={handleSaveCardBrand}
        cardBrand={selectedCardBrand}
        isLoading={isCreatingBrand || isUpdatingBrand}
      />

      <BankAccountModal
        isOpen={bankAccountModalOpen}
        onClose={() => {
          setBankAccountModalOpen(false);
          setSelectedBankAccount(null);
        }}
        onSave={handleSaveBankAccount}
        bankAccount={selectedBankAccount}
        isLoading={createBankAccount.isPending || updateBankAccount.isPending}
      />

      <DeleteConfirmModal
        open={deleteBankAccountModalOpen}
        onOpenChange={setDeleteBankAccountModalOpen}
        onConfirm={confirmDeleteBankAccount}
        title="Excluir Conta Bancária"
        description={`Tem certeza que deseja excluir a conta "${bankAccountToDelete?.name}"? Esta ação não poderá ser desfeita.`}
        isLoading={deleteBankAccount.isPending}
      />

      <TransferMasterModal
        open={transferMasterModalOpen}
        onOpenChange={setTransferMasterModalOpen}
        users={eligibleUsersForMaster}
        onConfirm={handleTransferMaster}
        isLoading={isTransferring}
      />

      <AccessLevelConfigModal
        open={accessLevelConfigModalOpen}
        onOpenChange={setAccessLevelConfigModalOpen}
        accessLevel={selectedAccessLevel}
        onUpdatePermission={updatePermission}
        onUpdateAccessLevel={updateAccessLevel}
        isUpdating={isUpdatingAccessLevel}
      />

      <CreateAccessLevelModal
        open={createAccessLevelModalOpen}
        onOpenChange={setCreateAccessLevelModalOpen}
        onCreate={createAccessLevel}
        isCreating={isCreatingAccessLevel}
      />

      <DeleteConfirmModal
        open={deleteAccessLevelModalOpen}
        onOpenChange={setDeleteAccessLevelModalOpen}
        onConfirm={() => {
          if (accessLevelToDelete) {
            deleteAccessLevel(accessLevelToDelete.id);
            setDeleteAccessLevelModalOpen(false);
            setAccessLevelToDelete(null);
          }
        }}
        title="Excluir Nível de Acesso"
        description={`Tem certeza que deseja excluir o nível "${accessLevelToDelete?.name}"? Esta ação não poderá ser desfeita.`}
        isLoading={isDeletingAccessLevel}
      />
    </AppLayoutNew>
  );
}
