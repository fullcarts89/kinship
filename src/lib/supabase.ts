/**
 * Supabase Client
 *
 * Initializes the Supabase JS client with:
 * - expo-secure-store for encrypted session persistence (React Native has no localStorage)
 * - react-native-url-polyfill for fetch compatibility
 * - Database typing from src/types/database.ts
 *
 * If EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are not set,
 * the client is null and the app falls back to mock data via isSupabaseConfigured.
 */

import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "@/types/database";

// ─── Environment ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Whether Supabase is properly configured with real credentials.
 * When false, the app gracefully falls back to mock data.
 */
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project")
);

// ─── Secure Storage Adapter ──────────────────────────────────────────────────

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ─── Requests never hang ─────────────────────────────────────────────────────

/**
 * Every request gives up after this long (stabilization Gate A). Understanding
 * runs one pass at a time, so a single request that never answers (a dropped
 * connection the OS didn't report) used to hold every later note: the server
 * had the answer and the phone never asked again. A timeout turns that into an
 * ordinary "offline" pass that the next one retries. Requests that pass their
 * own signal (the gateway, with its own 30 s) keep it.
 */
export const REQUEST_TIMEOUT_MS = 20_000;

export function fetchWithTimeout(timeoutMs = REQUEST_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    if (init?.signal) return fetch(input, init);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

// ─── Client ──────────────────────────────────────────────────────────────────

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Required for React Native
      },
      global: { fetch: fetchWithTimeout() },
    })
  : null;

export default supabase;
