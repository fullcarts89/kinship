// Supabase Edge Function: delete-account (P0-05; SET-05 for the 2.0 tables)
//
// Deletes the calling user's account and all of their data. Uses the
// service role (provided by the platform as SUPABASE_SERVICE_ROLE_KEY) only
// after the caller's own token has been verified, and only for that user.
//
// Deploy: supabase functions deploy delete-account   (keep JWT verification on)
// Needs migration 20261001120000_delete_user_account.sql. The database
// function finds every public table with a user_id at run time, so the 2.0
// tables (people, captures, memory items and sources, facets, reasons,
// conversations, consents, flags, usage logs, the merge journal, the
// residence report rows that hang off the user's items) are covered without
// listing them; pgTAP 40 and 72 prove it.

import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { realDeps } from "./deps.ts";
import { createDeleteAccountHandler } from "./handler.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

Deno.serve(createDeleteAccountHandler(realDeps(admin)));
