import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import SetupProgress from "@/components/setup/SetupProgress";
import SetupSalonStep from "@/components/setup/SetupSalonStep";
import SetupMasterStep from "@/components/setup/SetupMasterStep";
import SetupIntegrationsStep from "@/components/setup/SetupIntegrationsStep";
import SetupDeployStep from "@/components/setup/SetupDeployStep";
import SetupDoneStep from "@/components/setup/SetupDoneStep";
import { Building2, User, Key, CheckCircle2, Rocket } from "lucide-react";

export type SetupStep = "salon" | "master" | "integrations" | "deploy" | "done";

export const SETUP_STEPS: { key: SetupStep; label: string; icon: any }[] = [
  { key: "salon", label: "Salão", icon: Building2 },
  { key: "master", label: "Usuário Master", icon: User },
  { key: "integrations", label: "Integrações", icon: Key },
  { key: "deploy", label: "Deploy", icon: Rocket },
  { key: "done", label: "Pronto!", icon: CheckCircle2 },
];

export interface SetupData {
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
  // External Supabase (for production deploy)
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseDbPassword: string;
  // Vercel
  vercelToken: string;
  vercelProjectId: string;
}

export default function SetupWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SetupStep>("salon");
  const [data, setData] = useState<SetupData>({
    salonName: "",
    tradeName: "",
    salonPhone: "",
    salonEmail: "",
    salonCnpj: "",
    masterName: "",
    masterEmail: "",
    masterPassword: "",
    resendKey: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    supabaseDbPassword: "",
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

        {currentStep === "salon" && (
          <SetupSalonStep data={data} updateData={updateData} onNext={() => setCurrentStep("master")} />
        )}
        {currentStep === "master" && (
          <SetupMasterStep data={data} updateData={updateData} onNext={() => setCurrentStep("integrations")} onBack={() => setCurrentStep("salon")} />
        )}
        {currentStep === "integrations" && (
          <SetupIntegrationsStep data={data} updateData={updateData} onNext={() => setCurrentStep("deploy")} onBack={() => setCurrentStep("master")} />
        )}
        {currentStep === "deploy" && (
          <SetupDeployStep data={data} updateData={updateData} onDone={() => setCurrentStep("done")} onBack={() => setCurrentStep("integrations")} toast={toast} />
        )}
        {currentStep === "done" && <SetupDoneStep />}
      </div>
    </div>
  );
}
