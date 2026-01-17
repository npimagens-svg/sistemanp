import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Professional, ProfessionalInput } from "@/hooks/useProfessionals";

interface ProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  onSubmit: (data: ProfessionalInput & { id?: string }) => void;
  isLoading?: boolean;
}

const ROLES = [
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

export function ProfessionalModal({ open, onOpenChange, professional, onSubmit, isLoading }: ProfessionalModalProps) {
  const [formData, setFormData] = useState<ProfessionalInput>({
    name: "",
    nickname: "",
    cpf: "",
    role: "",
    email: "",
    phone: "",
    specialty: "",
    commission_percent: 0,
    is_active: true,
    can_be_assistant: false,
    has_schedule: true,
    create_access: false,
  });

  useEffect(() => {
    if (professional) {
      setFormData({
        name: professional.name,
        nickname: (professional as any).nickname || "",
        cpf: (professional as any).cpf || "",
        role: (professional as any).role || "",
        email: professional.email || "",
        phone: professional.phone || "",
        specialty: professional.specialty || "",
        commission_percent: Number(professional.commission_percent) || 0,
        is_active: professional.is_active,
        can_be_assistant: (professional as any).can_be_assistant || false,
        has_schedule: (professional as any).has_schedule ?? true,
        create_access: (professional as any).create_access || false,
      });
    } else {
      setFormData({
        name: "",
        nickname: "",
        cpf: "",
        role: "",
        email: "",
        phone: "",
        specialty: "",
        commission_percent: 0,
        is_active: true,
        can_be_assistant: false,
        has_schedule: true,
        create_access: false,
      });
    }
  }, [professional, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (professional) {
      onSubmit({ ...formData, id: professional.id });
    } else {
      onSubmit(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl">
            {professional ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Nome e Apelido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Qual é o <span className="font-semibold">nome completo</span>? <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">
                Possui algum <span className="font-semibold">apelido</span>?
              </Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              />
            </div>
          </div>

          {/* Row 2: CPF e Cargo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">
                Qual é o <span className="font-semibold">CPF</span>? <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">
                Qual é o <span className="font-semibold">cargo</span>? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Email e Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Qual é o <span className="font-semibold">e-mail</span>?
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Qual é o <span className="font-semibold">telefone</span>?
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can_be_assistant"
                checked={formData.can_be_assistant}
                onCheckedChange={(checked) => setFormData({ ...formData, can_be_assistant: checked as boolean })}
              />
              <Label htmlFor="can_be_assistant" className="cursor-pointer">
                Esse profissional pode ser um assistente
              </Label>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_schedule"
                  checked={formData.has_schedule}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_schedule: checked as boolean })}
                />
                <Label htmlFor="has_schedule" className="cursor-pointer">
                  Esse profissional possui agenda
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="create_access"
                checked={formData.create_access}
                onCheckedChange={(checked) => setFormData({ ...formData, create_access: checked as boolean })}
              />
              <Label htmlFor="create_access" className="cursor-pointer">
                Criar acesso
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
