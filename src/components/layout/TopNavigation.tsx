import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Calendar,
  DollarSign,
  Package,
  Users,
  BarChart3,
  Settings,
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
    ]
  },
  { 
    title: "Estoque", 
    url: "/estoque", 
    icon: Package,
    subItems: [
      { title: "Produtos", url: "/estoque" },
      { title: "Fornecedores", url: "/estoque/fornecedores" },
    ]
  },
  { 
    title: "Clientes", 
    url: "/clientes", 
    icon: Users,
    subItems: [
      { title: "Lista de Clientes", url: "/clientes" },
      { title: "Avisos", url: "/clientes/avisos" },
      { title: "Fidelidade", url: "/clientes/fidelidade" },
    ]
  },
  { 
    title: "Relatórios", 
    url: "/relatorios", 
    icon: BarChart3,
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
    ]
  },
];

export function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeNavItem = navItems.find(item => {
    if (location.pathname === item.url) return true;
    if (item.subItems) {
      return item.subItems.some(sub => location.pathname.startsWith(sub.url));
    }
    return location.pathname.startsWith(item.url);
  });

  return (
    <div className="border-b border-border bg-card">
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
