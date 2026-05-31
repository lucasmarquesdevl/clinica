import { _supabase } from './supabaseClient.js';
import { state } from './state.js';
import { u, maskCPF } from './utils.js';
import * as Auth from './auth.js';
import * as Pacientes from './pacientes.js';
import * as Dashboard from './dashboard.js';

// --- BRIDGE (Ponte para o escopo global) ---
// Isso garante que o HTML index.html encontre as funções
window.fazerLogin = Auth.handleLogin;
window.fazerLogout = Auth.handleLogout;
window.mostrarRecuperarSenha = Auth.mostrarRecuperarSenha;
window.mostrarLogin = Auth.mostrarLogin;
window.enviarEmailRecuperacao = Auth.enviarEmailRecuperacao;
window.maskCPF = maskCPF;
window.salvarPaciente = Pacientes.salvarPaciente;
window.editarPaciente = Pacientes.editarPaciente;
window.limparFormPaciente = Pacientes.limparFormPaciente;
window.renderPacientes = Pacientes.renderPacientes;

// Mapa de funções de renderização por página
const RENDER_PAGES = {
  dashboard: Dashboard.renderDashboard,
  pacientes: Pacientes.renderPacientes,
  // Adicione os outros módulos aqui conforme criá-los (Agenda, Financeiro, etc.)
};

// --- LOGICA DE INICIALIZAÇÃO ---
async function initApp() {
  const { data: { session } } = await _supabase.auth.getSession();

  if (session) {
    const { data: perfil } = await _supabase
      .from('perfis').select('*').eq('id', session.user.id).single();

    if (perfil) {
      state.currentUser = { ...perfil, avatar: '👩‍⚕️' };
      updateHeaderUI();
      await carregarDadosIniciais();
      
      const lastPage = sessionStorage.getItem('psicare_last_page') || 'dashboard';
      navigate(lastPage);

      u.$('login-screen').style.display = 'none';
      u.$('app-wrapper').style.display = 'flex';
    }
  } else {
    u.$('login-screen').style.display = 'flex';
  }
}

async function carregarDadosIniciais() {
  u.toast('Carregando consultório...');
  await Promise.all([
    Pacientes.carregarPacientes(),
    // Agenda.carregarConsultas(),
    // Financeiro.carregarSessoes()
  ]);
}

function navigate(page) {
  u.$$('.page').forEach(p => p.classList.remove('active'));
  u.$$('.nav-item').forEach(n => n.classList.remove('active'));
  u.$('page-' + page)?.classList.add('active');
  u.$$(`[data-page="${page}"]`)[0]?.classList.add('active');
  sessionStorage.setItem('psicare_last_page', page);

  // CHAVE DA SOLUÇÃO: Executa a função que desenha os dados na tela
  console.log(`Navegando para: ${page}`);
  RENDER_PAGES[page]?.();
}

function updateHeaderUI() {
  if (!state.currentUser) return;
  u.$('user-nome').textContent = state.currentUser.nome;
  u.$('user-crp').textContent = `Psicóloga CRP ${state.currentUser.crp}`;
  u.$('user-avatar').textContent = (state.currentUser.nome || 'P')[0].toUpperCase();
  u.$$('.page-header h2')[0].textContent = `Bom dia, Dra. ${state.currentUser.nome.split(' ')[0]} ✿`;
}

// Event Listeners Programáticos
u.$$('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

window.addEventListener('auth:success', initApp);

// Start
initApp();
window.navigate = navigate; // Expõe para o global caso use no HTML