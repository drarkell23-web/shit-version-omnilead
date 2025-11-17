
// public/supabase-client.js
// Small helper — replace with your own keys in production.
// For security: never expose service role key in browser.
// This file is only used by client pages that need anon access.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://obmbklanktevawuymkbq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_s6K6pqGLGCwm56Fragf4wQ_KnDUDnQv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
