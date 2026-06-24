import { createClient } from "@supabase/supabase-js";

// Works on both the Vercel app (NEXT_PUBLIC_*) and the standalone Render socket
// server (plain SUPABASE_*).
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL/SUPABASE_ANON_KEY (or NEXT_PUBLIC_ equivalents)."
  );
}

// Persistent quiz data only (per architecture: DB is for quiz management).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});
