import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Loader2, Merge, FileText, Settings, MessageCircle } from "lucide-react";
import { useClients, Client, ClientInput } from "@/hooks/useClients";
import { ClientModal } from "@/components/modals/ClientModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Clientes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("nome");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { clients, isLoading, createClient, updateClient, deleteClient, isCreating, isUpdating, isDeleting } = useClients();

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    switch (searchField) {
      case "nome":
        return client.name.toLowerCase().includes(query);
      case "email":
        return client.email?.toLowerCase().includes(query);
      case "telefone":
        return client.phone?.includes(query);
      default:
        return client.name.toLowerCase().includes(query);
    }
  });

  const totalPages = Math.ceil(filteredClients.length / parseInt(itemsPerPage));
  const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
  const paginatedClients = filteredClients.slice(startIndex, startIndex + parseInt(itemsPerPage));

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteOpen(true);
  };

  const handleSubmit = (data: ClientInput & { id?: string }) => {
    if (data.id) {
      updateClient(data as ClientInput & { id: string });
    } else {
      createClient(data);
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const formatBirthday = (date: string | null) => {
    if (!date) return "";
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getGenderLabel = (gender: string | null) => {
    const genderMap: Record<string, string> = {
      feminino: "Feminino",
      masculino: "Masculino",
      outro: "Outro",
      nao_informar: "Prefiro não dizer",
    };
    return gender ? genderMap[gender] || "" : "";
  };

  const openWhatsApp = (client: Client) => {
    if (!client.phone) return;
    
    // Remove non-numeric characters
    const phoneNumber = client.phone.replace(/\D/g, "");
    const fullNumber = phoneNumber.startsWith("55") ? phoneNumber : `55${phoneNumber}`;
    
    // Creative pre-programmed message
    const firstName = client.name.split(" ")[0];
    const message = encodeURIComponent(
      `Olá ${firstName}! 👋\n\nTudo bem? Passando aqui para saber como você está! ✨\n\nEstamos com novidades incríveis por aqui e adoraríamos te ver novamente! 💇‍♀️\n\nPodemos agendar um horário para você? Estamos te esperando! 💕`
    );
    
    window.open(`https://wa.me/${fullNumber}?text=${message}`, "_blank");
  };

  if (isLoading) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-4">
        {/* Action buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              className="gap-2 bg-primary hover:bg-primary/90" 
              onClick={() => { setSelectedClient(null); setModalOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Adicionar Cliente
            </Button>
            <Button variant="outline" className="gap-2">
              <Merge className="h-4 w-4" />
              Unir cadastros duplicados
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Anamnese
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Prontuário
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome">Nome</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Input 
                placeholder="Pesquisar Cliente" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-[200px]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>Não encontramos nenhum resultado.</p>
                <Button variant="link" onClick={() => { setSelectedClient(null); setModalOpen(true); }}>
                  Adicionar primeiro cliente
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-primary font-semibold">
                      Nome ▼
                    </TableHead>
                    <TableHead className="text-primary font-semibold">
                      Contato ▼
                    </TableHead>
                    <TableHead className="text-primary font-semibold hidden md:table-cell">
                      Aniversário ▼
                    </TableHead>
                    <TableHead className="text-primary font-semibold hidden lg:table-cell">
                      Gênero ▼
                    </TableHead>
                    <TableHead className="text-primary font-semibold hidden xl:table-cell">
                      Observação ▼
                    </TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {client.avatar_url && (
                              <AvatarImage src={client.avatar_url} alt={client.name} />
                            )}
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-primary hover:underline cursor-pointer">
                            {client.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Cel:</span>
                              <span>{client.phone}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 bg-green-500 hover:bg-green-600 text-white rounded-full"
                                onClick={() => openWhatsApp(client)}
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {client.email && (
                            <div className="text-sm text-muted-foreground">
                              <span>E-mail: </span>
                              <span>{client.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatBirthday(client.birth_date)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getGenderLabel(client.gender)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[300px]">
                        <span className="text-sm text-muted-foreground truncate block">
                          {client.notes}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDelete(client)}
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

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {startIndex + 1} a {Math.min(startIndex + parseInt(itemsPerPage), filteredClients.length)} de {filteredClients.length} Registros
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              ← Anterior
            </Button>
            <span className="px-2">{currentPage}</span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Próximo →
            </Button>
          </div>
        </div>
      </div>

      <ClientModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        client={selectedClient} 
        onSubmit={handleSubmit} 
        isLoading={isCreating || isUpdating} 
      />
      <DeleteConfirmModal 
        open={deleteOpen} 
        onOpenChange={setDeleteOpen} 
        title="Excluir Cliente" 
        description={`Tem certeza que deseja excluir "${selectedClient?.name}"?`} 
        onConfirm={() => { 
          if (selectedClient) { 
            deleteClient(selectedClient.id); 
            setDeleteOpen(false); 
          } 
        }} 
        isLoading={isDeleting} 
      />
    </AppLayoutNew>
  );
}
