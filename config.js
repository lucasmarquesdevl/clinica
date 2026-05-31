// ⚠️ IMPORTANTE: Para produção, use variáveis de ambiente no Vercel.
// O front-end pode buscar essas variáveis via /api/env ou usar window.__ENV__.
const fallbackConfig = {
  SUPABASE_URL: 'https://ezutgtfynlvbgbqmpqyb.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzYSIsInJlZiI6ImV6dXRndGZ5bmx2YmdicW1wcXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDMyODcsImV4cCI6MjA5NDIxOTI4N30.t1VcyLhhfe8n_l_YDUgkx6u-YGm_PpDG7lALE52loaE'
};

export async function getSupabaseConfig() {
  const runtime = window.__ENV__ || null;
  if (runtime?.SUPABASE_URL && runtime?.SUPABASE_KEY) {
    return runtime;
  }

  // Apenas tenta buscar /api/env se não estivermos em localhost para evitar ruído no console
  if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    try {
      const resp = await fetch('/api/env');
      if (resp.ok) {
        const env = await resp.json();
        if (env?.SUPABASE_URL && env?.SUPABASE_KEY) return env;
      }
    } catch (err) {
      // Silencioso
    }
  }

  return fallbackConfig;
}

export const APP_CONFIG = { name: 'Lugar de Ser', tagline: 'Espaço Terapêutico' };