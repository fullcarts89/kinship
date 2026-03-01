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

// ─── Client ──────────────────────────────────────────────────────────────────

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Required for React Native
      },
    })
  : null;

export default supabase;
