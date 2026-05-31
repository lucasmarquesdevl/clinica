import { getSupabaseConfig } from './config.js';

export let _supabase = null;

export async function initSupabase() {
  const { SUPABASE_URL, SUPABASE_KEY } = await getSupabaseConfig();
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
