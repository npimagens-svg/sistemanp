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
import { Shield, Users, Settings, MoreHorizontal, Trash2, Loader2, Building2, CreditCard, Plus, Pencil, Landmark, ArrowRightLeft } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { useUserAccess, UserWithAccess } from "@/hooks/useUserAccess";
import { useCardBrands, CardBrand, CardBrandInput } from "@/hooks/useCardBrands";
import { useBankAccounts, BankAccount, BankAccountInput } from "@/hooks/useBankAccounts";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { CardBrandModal } from "@/components/modals/CardBrandModal";
import { BankAccountModal } from "@/components/modals/BankAccountModal";
import { TransferMasterModal } from "@/components/modals/TransferMasterModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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

          <TabsContent value="sistema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>Preferências gerais do sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em breve: configurações de notificações, horários, integrações.</p>
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
    </AppLayoutNew>
  );
}
