import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Non-fatal: dev can still render the PDF preview without Supabase wired up.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. Set them in .env.local to enable the list/editor pages.'
  );
}

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'anon');

export const isSupabaseConfigured = Boolean(url && anonKey);
