import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import Servicos from "./pages/Servicos";
import AuthNew from "./pages/AuthNew";
import { Profissionais } from "./pages/Profissionais";
import Comandas from "./pages/Comandas";
import Financeiro from "./pages/Financeiro";
import Comissoes from "./pages/Comissoes";
import Estoque from "./pages/Estoque";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import Marketing from "./pages/Marketing";
import ClientAlerts from "./pages/ClientAlerts";
import ClientLoyalty from "./pages/ClientLoyalty";
import NotFound from "./pages/NotFound";
import SetupWizard from "./pages/SetupWizard";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  // Check if any salon exists in the database
  const { data: hasSalon, isLoading: checkingSalon } = useQuery({
    queryKey: ["setup-check"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("salons")
        .select("id", { count: "exact", head: true });
      if (error) return true; // assume setup done on error
      return (count ?? 0) > 0;
    },
    staleTime: 60000,
  });

  if (loading || checkingSalon)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );

  // If no salon exists, force setup wizard
  if (!hasSalon && !user) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/setup" element={hasSalon ? <Navigate to="/" replace /> : <SetupWizard />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthNew />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/agenda/*" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/clientes/avisos" element={<ProtectedRoute><ClientAlerts /></ProtectedRoute>} />
      <Route path="/clientes/fidelidade" element={<ProtectedRoute><ClientLoyalty /></ProtectedRoute>} />
      <Route path="/clientes/*" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
      <Route path="/profissionais" element={<ProtectedRoute><Profissionais /></ProtectedRoute>} />
      <Route path="/comandas" element={<ProtectedRoute><Comandas /></ProtectedRoute>} />
      <Route path="/comandas/*" element={<ProtectedRoute><Comandas /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
      <Route path="/financeiro/*" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
      <Route path="/comissoes" element={<ProtectedRoute><Comissoes /></ProtectedRoute>} />
      <Route path="/financeiro/comissoes" element={<ProtectedRoute><Comissoes /></ProtectedRoute>} />
      <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
      <Route path="/estoque/*" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
      <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
      <Route path="/marketing/*" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/relatorios/*" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
      <Route path="/configuracoes/*" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
