// minimal supabase client for browser usage
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = window.SUPABASE_URL || "https://obmbklanktevawuymkbq.supabase.co"; // if you embed set in html or config
const SUPABASE_ANON = window.SUPABASE_ANON || "sb_publishable_s6K6pqGLGCwm56Fragf4wQ_KnDUDnQv";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
