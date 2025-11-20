// public/supabase-client.js — frontend safe client (uses anon key)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co"; // replace via templating if you want
export const SUPABASE_ANON_KEY = "sb_publishable_key_here";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export async function getCurrentUser(){ const { data } = await supabase.auth.getUser(); return data?.user || null; }
