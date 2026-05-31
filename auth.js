import { _supabase } from './supabaseClient.js';
import { u } from './utils.js';
import { state } from './state.js';

export async function handleLogin(e) {
  e?.preventDefault?.();
  const email = u.$('login-email').value.trim();
  const senha = u.$('login-senha').value.trim();
  const erroEl = u.$('login-erro');

  if (!email || !senha) {
    u.toast("Preencha e-mail e senha.");
    return;
  }

  if (!_supabase) {
    u.toast("Erro: Cliente Supabase não inicializado.");
    return;
  }

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    let msg = "E-mail ou senha incorretos.";

    if (error.message.includes("Email not confirmed")) {
      msg = "Por favor, confirme seu e-mail no link enviado para sua caixa de entrada.";
    } else if (error.message.includes("Invalid API key")) {
      msg = "Erro de configuração: Chave de API inválida.";
    }
    
    erroEl.textContent = msg;
    erroEl.style.display = 'block';
    console.warn("Falha na autenticação:", error.message);
    return;
  }

  const { data: perfil, error: perfilError } = await _supabase
    .from('perfis').select('*').eq('id', data.user.id).maybeSingle();

  if (perfil) {
    state.currentUser = { ...perfil, avatar: '👩‍⚕️' };
    sessionStorage.setItem('psicare_active_user', email);
    window.dispatchEvent(new CustomEvent('auth:success'));
    u.toast('Bem-vinda!');
  } else {
    erroEl.textContent = "Login ok, mas perfil não encontrado na tabela 'perfis'.";
    erroEl.style.display = 'block';
    await _supabase.auth.signOut();
  }
}

export async function handleLogout() {
  await _supabase.auth.signOut();
  sessionStorage.removeItem('psicare_active_user');
  state.currentUser = null;
  window.location.reload();
}

export async function enviarEmailRecuperacao(e) {
  e.preventDefault();
  const email = u.$('recovery-email').value;
  const msgEl = u.$('recovery-msg');
  
  let baseUrl = window.location.href.split('?')[0].split('#')[0];
  if (baseUrl.endsWith('index.html')) baseUrl = baseUrl.replace('index.html', '');
  if (!baseUrl.endsWith('/')) baseUrl += '/';
  
  const { error } = await _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: baseUrl + 'redefinicao.html',
  });

  msgEl.style.display = 'block';
  if (error) {
    msgEl.textContent = "Erro: " + error.message;
    msgEl.style.color = "#c0392b";
  } else {
    msgEl.textContent = "Link enviado! Verifique seu e-mail.";
    msgEl.style.color = "var(--sage-dark)";
  }
}

export function mostrarRecuperarSenha() {
  u.$('login-form').style.display = 'none';
  u.$('recovery-form').style.display = 'block';
}

export function mostrarLogin() {
  u.$('login-form').style.display = 'block';
  u.$('recovery-form').style.display = 'none';
}