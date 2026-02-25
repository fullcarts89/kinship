import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!user && !!session;

  const signIn = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true);
    try {
      // TODO: Connect to Supabase auth
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log("[Auth] signIn placeholder — connect Supabase in Phase 2");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true);
    try {
      // TODO: Connect to Supabase auth
      console.log("[Auth] signUp placeholder — connect Supabase in Phase 2");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Connect to Supabase auth
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, isLoading, isAuthenticated, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthProvider;
