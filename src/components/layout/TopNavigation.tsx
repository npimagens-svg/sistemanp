import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Calendar,
  DollarSign,
  Package,
  Sparkles,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  CreditCard,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  subItems?: { title: string; url: string }[];
}

const navItems: NavItem[] = [
  { 
    title: "Agenda", 
    url: "/agenda", 
    icon: Calendar,
    subItems: [
      { title: "Agenda", url: "/agenda" },
      { title: "Atendimento em Casa", url: "/agenda/atendimento-casa" },
    ]
  },
  { 
    title: "Financeiro", 
    url: "/financeiro", 
    icon: DollarSign,
    subItems: [
      { title: "Caixas Abertos", url: "/financeiro" },
      { title: "Histórico de Caixas", url: "/financeiro/historico" },
      { title: "Comandas", url: "/comandas" },
      { title: "Comissões", url: "/financeiro/comissoes" },
      { title: "Entradas e Saídas", url: "/financeiro/entradas-saidas" },
      { title: "Notas Fiscais", url: "/financeiro/notas" },
    ]
  },
  { 
    title: "Estoque", 
    url: "/estoque", 
    icon: Package,
    subItems: [
      { title: "Produtos", url: "/estoque" },
      { title: "Fornecedores", url: "/estoque/fornecedores" },
      { title: "Pedidos de Compra", url: "/estoque/pedidos" },
      { title: "Inventário", url: "/estoque/inventario" },
      { title: "Solicitações de Saída", url: "/estoque/solicitacoes" },
    ]
  },
  { 
    title: "IA", 
    url: "/ia", 
    icon: Sparkles,
  },
  { 
    title: "Clientes", 
    url: "/clientes", 
    icon: Users,
    subItems: [
      { title: "Lista de Clientes", url: "/clientes" },
      { title: "Avisos", url: "/clientes/avisos" },
    ]
  },
  { 
    title: "Marketing", 
    url: "/marketing", 
    icon: Megaphone,
    subItems: [
      { title: "Promoções", url: "/marketing" },
      { title: "Agendamento Online", url: "/marketing/agendamento" },
      { title: "Campanhas de E-mail", url: "/marketing/email" },
      { title: "Campanhas de SMS", url: "/marketing/sms" },
      { title: "Fidelidade", url: "/marketing/fidelidade" },
    ]
  },
  { 
    title: "Relatórios", 
    url: "/relatorios", 
    icon: BarChart3,
    subItems: [
      { title: "Dashboard", url: "/relatorios" },
      { title: "Favoritos", url: "/relatorios/favoritos" },
      { title: "Todos", url: "/relatorios/todos" },
      { title: "Mapa de Calor", url: "/relatorios/mapa-calor" },
    ]
  },
  { 
    title: "Configurações", 
    url: "/configuracoes", 
    icon: Settings,
    subItems: [
      { title: "Agendamento", url: "/configuracoes" },
      { title: "Serviços", url: "/servicos" },
      { title: "Profissionais", url: "/profissionais" },
      { title: "Salão", url: "/configuracoes/salao" },
      { title: "Integrações", url: "/configuracoes/integracoes" },
    ]
  },
  { 
    title: "Pagamentos", 
    url: "/pagamentos", 
    icon: CreditCard,
  },
];

export function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Find active nav item based on current path
  const activeNavItem = navItems.find(item => {
    if (location.pathname === item.url) return true;
    if (item.subItems) {
      return item.subItems.some(sub => location.pathname.startsWith(sub.url));
    }
    return location.pathname.startsWith(item.url);
  });

  return (
    <div className="border-b border-border bg-card">
      {/* Main navigation - scrollable on mobile */}
      <nav className="flex items-center gap-1 px-2 md:px-4 py-2 overflow-x-auto scrollbar-hide md:justify-center">
        {navItems.map((item) => {
          const isActive = activeNavItem?.url === item.url;
          const Icon = item.icon;
          
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 md:px-4 py-2 rounded-lg transition-all duration-200 min-w-[60px] md:min-w-[80px] shrink-0",
                "hover:bg-primary/10 hover:text-primary",
                isActive && "text-primary border-b-2 border-primary bg-primary/5"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 md:h-6 md:w-6 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] md:text-xs font-medium transition-colors whitespace-nowrap",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.title}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Sub navigation - scrollable on mobile */}
      {activeNavItem?.subItems && (
        <div className="flex items-center gap-0 px-2 md:px-4 bg-muted/20 border-t border-border overflow-x-auto scrollbar-hide">
          {activeNavItem.subItems.map((subItem) => {
            const isSubActive = location.pathname === subItem.url;
            
            return (
              <button
                key={subItem.url}
                onClick={() => navigate(subItem.url)}
                className={cn(
                  "px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap shrink-0",
                  isSubActive 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {subItem.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
