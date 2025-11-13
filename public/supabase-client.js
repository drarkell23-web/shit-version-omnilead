// public/supabase-client.js
// Frontend Supabase client: safe to include in browser (uses anon key).
// Replace SUPABASE_ANON_KEY placeholder with your anon key (or set via templating / env injection).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://obmbklanktevawuymkbq.supabase.co"; // <-- replace if different
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibWJrbGFua3RldmF3dXlta2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTA5MTIsImV4cCI6MjA3ODU4NjkxMn0.Rwou0LAS4SITuJfWPTFzWnxUZTYlwVqLA0s-l4Qen_k"; // <-- replace with anon key (paste into file or inject)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true }
});

// helper: get current user
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

