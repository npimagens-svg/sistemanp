import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  salonId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    salonName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createSalonForCurrentUser: (fullName: string, salonName: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching salon ID to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserSalonId(session.user.id);
          }, 0);
        } else {
          setSalonId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserSalonId(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserSalonId = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("salon_id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data?.salon_id) {
      setSalonId(data.salon_id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const createSalonForCurrentUser = async (fullName: string, salonName: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    // Create everything via backend function (bypasses RLS issues during onboarding)
    const { data, error } = await supabase.functions.invoke("create-salon", {
      body: { fullName, salonName },
    });

    if (error) return { error: error as unknown as Error };

    const newSalonId = (data as any)?.salonId as string | undefined;
    if (!newSalonId) return { error: new Error("Resposta inválida ao criar salão") };

    setSalonId(newSalonId);
    return { error: null };
  };

  const signUp = async (email: string, password: string, _fullName: string, _salonName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Create the user (salon creation happens after login, in /setup-salon)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (authError) return { error: authError as Error };
    if (!authData.user) return { error: new Error("Erro ao criar usuário") };

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSalonId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, salonId, signIn, signUp, signOut, createSalonForCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
