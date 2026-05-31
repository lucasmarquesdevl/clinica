// ⚠️ IMPORTANTE: Use variáveis de ambiente para as chaves!
// .env.local (local) ou Environment Variables no Vercel
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ezutgtfynlvbgbqmpqyb.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

if (!import.meta.env.VITE_SUPABASE_KEY && import.meta.env.MODE === 'production') {
  console.error('⚠️ ERRO: VITE_SUPABASE_KEY não configurada nas Environment Variables!');
}

export const APP_CONFIG = { name: 'Lugar de Ser', tagline: 'Espaço Terapêutico' };