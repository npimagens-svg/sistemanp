import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <AppLayout title={title}>
      <Card className="flex items-center justify-center min-h-[400px]">
        <CardContent className="text-center">
          <Construction className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-muted-foreground">Esta página será implementada em breve.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

export const Comandas = () => <PlaceholderPage title="Comandas" />;
export const Financeiro = () => <PlaceholderPage title="Financeiro" />;
export const Estoque = () => <PlaceholderPage title="Estoque" />;
export const Marketing = () => <PlaceholderPage title="Marketing" />;
export const Relatorios = () => <PlaceholderPage title="Relatórios" />;
export const Configuracoes = () => <PlaceholderPage title="Configurações" />;
