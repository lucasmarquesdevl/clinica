import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// O objeto 'supabase' é injetado pelo CDN no index.html
export const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);