/**
 * Auth Provider
 *
 * Real Supabase authentication with Apple, Google, and Email sign-in.
 * Uses expo-apple-authentication for native Apple Sign-In,
 * expo-auth-session + expo-web-browser for Google OAuth,
 * and Supabase email/password for email auth.
 *
 * When Supabase is not configured (no .env credentials), the provider
 * enters "mock mode" — isAuthenticated is true, all auth methods are
 * no-ops, and the app goes straight to tabs (preserves dev workflow).
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Platform } from "react-native";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Only show loading spinner when Supabase is configured (need to check session)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const isAuthenticated = isSupabaseConfigured
    ? !!session?.user
    : true; // Mock mode: always authenticated → app goes straight to tabs

  // ─── Initialize session + subscribe to auth changes ────────────────────

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    // 1. Restore persisted session from SecureStore
    supabase.auth.getSession().then(({ data: { session: restored } }) => {
      setSession(restored);
      setUser(restored?.user ?? null);
      setIsLoading(false);
    });

    // 2. Listen for auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ─── Apple Sign-In ─────────────────────────────────────────────────────

  const signInWithApple = useCallback(async () => {
    if (!supabase) throw new Error("Supabase not configured");
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign-In is only available on iOS");
    }

    // Lazy require to avoid crash on Android / web
    const AppleAuthentication = require("expo-apple-authentication");
    const Crypto = require("expo-crypto");

    // Generate nonce for security
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error("No identity token returned from Apple");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) throw error;
  }, []);

  // ─── Google Sign-In ────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase not configured");

    const WebBrowser = require("expo-web-browser");
    const { makeRedirectUri } = require("expo-auth-session");

    // Ensure any previous browser auth session is completed
    WebBrowser.maybeCompleteAuthSession();

    // Build redirect URI — Expo Go uses exp:// , standalone uses kinship://
    const redirectTo = makeRedirectUri({
      scheme: "kinship",
      path: "auth/callback",
    });

    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("No OAuth URL returned");

    // Open in-app browser for Google OAuth consent
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === "success" && result.url) {
      // Extract tokens from the redirect URL fragment (#access_token=...&refresh_token=...)
      const resultUrl = result.url;
      const hashIndex = resultUrl.indexOf("#");
      if (hashIndex === -1) throw new Error("No tokens in redirect URL");

      const fragment = resultUrl.substring(hashIndex + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      } else {
        throw new Error("Missing tokens in OAuth redirect");
      }
    }
    // If user cancelled/dismissed, silently return (no error)
  }, []);

  // ─── Email Sign-In ─────────────────────────────────────────────────────

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase not configured");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    },
    []
  );

  // ─── Email Sign-Up ─────────────────────────────────────────────────────

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase not configured");

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) throw error;

      // Supabase returns no error but also no session when the email already exists
      // (security measure to prevent email enumeration). Detect this and give a
      // helpful message instead of silently failing.
      if (!data.session) {
        throw new Error(
          "This email may already be registered. Try signing in instead."
        );
      }
    },
    []
  );

  // ─── Sign Out ──────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    if (!supabase) {
      // Mock mode: clear local state
      setUser(null);
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // State is updated by the onAuthStateChange listener
  }, []);

  // ─── Reset Password ───────────────────────────────────────────────────

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Supabase not configured");

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  // ─── Context Value ─────────────────────────────────────────────────────

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
    }),
    [
      user,
      session,
      isLoading,
      isAuthenticated,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
    ]
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
