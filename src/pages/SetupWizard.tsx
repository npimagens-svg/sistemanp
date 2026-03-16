import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import SetupProgress from "@/components/setup/SetupProgress";
import SetupSupabaseStep from "@/components/setup/SetupSupabaseStep";
import SetupSalonStep from "@/components/setup/SetupSalonStep";
import SetupMasterStep from "@/components/setup/SetupMasterStep";
import SetupIntegrationsStep from "@/components/setup/SetupIntegrationsStep";
import SetupVercelStep from "@/components/setup/SetupVercelStep";
import SetupDoneStep from "@/components/setup/SetupDoneStep";
import { Building2, User, Key, CheckCircle2, Database, Rocket } from "lucide-react";

export type SetupStep = "supabase" | "salon" | "master" | "integrations" | "vercel" | "done";

export const SETUP_STEPS: { key: SetupStep; label: string; icon: any }[] = [
  { key: "supabase", label: "Banco de Dados", icon: Database },
  { key: "salon", label: "Salão", icon: Building2 },
  { key: "master", label: "Usuário Master", icon: User },
  { key: "integrations", label: "Integrações", icon: Key },
  { key: "vercel", label: "Deploy", icon: Rocket },
  { key: "done", label: "Pronto!", icon: CheckCircle2 },
];

export interface SetupData {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseDbPassword: string;
  // Salon
  salonName: string;
  tradeName: string;
  salonPhone: string;
  salonEmail: string;
  salonCnpj: string;
  // Master
  masterName: string;
  masterEmail: string;
  masterPassword: string;
  // Integrations
  resendKey: string;
  // Vercel
  vercelToken: string;
  vercelProjectId: string;
}

export default function SetupWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SetupStep>("supabase");
  const [data, setData] = useState<SetupData>({
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    supabaseDbPassword: "",
    salonName: "",
    tradeName: "",
    salonPhone: "",
    salonEmail: "",
    salonCnpj: "",
    masterName: "",
    masterEmail: "",
    masterPassword: "",
    resendKey: "",
    vercelToken: "",
    vercelProjectId: "",
  });

  const updateData = (partial: Partial<SetupData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const stepIndex = SETUP_STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <SetupProgress steps={SETUP_STEPS} currentIndex={stepIndex} />

        {currentStep === "supabase" && (
          <SetupSupabaseStep data={data} updateData={updateData} onNext={() => setCurrentStep("salon")} />
        )}
        {currentStep === "salon" && (
          <SetupSalonStep data={data} updateData={updateData} onNext={() => setCurrentStep("master")} onBack={() => setCurrentStep("supabase")} />
        )}
        {currentStep === "master" && (
          <SetupMasterStep data={data} updateData={updateData} onNext={() => setCurrentStep("integrations")} onBack={() => setCurrentStep("salon")} />
        )}
        {currentStep === "integrations" && (
          <SetupIntegrationsStep data={data} updateData={updateData} onNext={() => setCurrentStep("vercel")} onBack={() => setCurrentStep("master")} />
        )}
        {currentStep === "vercel" && (
          <SetupVercelStep data={data} updateData={updateData} onDone={() => setCurrentStep("done")} onBack={() => setCurrentStep("integrations")} toast={toast} />
        )}
        {currentStep === "done" && <SetupDoneStep />}
      </div>
    </div>
  );
}
