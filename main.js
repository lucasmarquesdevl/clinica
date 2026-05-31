import { _supabase, initSupabase } from './supabaseClient.js';
import { state } from './state.js';
import { u, maskCPF } from './utils.js';
import * as Auth from './auth.js';
import * as Pacientes from './pacientes.js';
import * as Dashboard from './dashboard.js';
import * as Agenda from './agenda.js';
import * as Financeiro from './financeiro.js';
import * as Prontuario from './prontuario.js';

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

// Agenda & Prontuário Bridge
window.salvarConsulta = Agenda.salvarConsulta;
window.alterarStatusConsulta = Agenda.alterarStatusConsulta;
window.excluirConsulta = Agenda.excluirConsulta;
window.carregarProntuario = Prontuario.carregarProntuario;
window.salvarProntuario = Prontuario.salvarProntuario;
window.editarAnotacao = Prontuario.editarAnotacao;
window.fazerUploadAnexo = Prontuario.fazerUploadAnexo;
window.excluirAnexo = Prontuario.excluirAnexo;

// Financeiro Bridge
window.abrirModalSessao = Financeiro.abrirModalSessao;
window.fecharModal = Financeiro.fecharModal;
window.salvarSessao = Financeiro.salvarSessao;
window.toggleStatus = Financeiro.toggleStatus;
window.toggleReceita = Financeiro.toggleReceita;
window.excluirSessao = Financeiro.excluirSessao;

/** Popula todos os menus de seleção de pacientes do sistema */
function populatePacienteSelects() {
  const selectors = ['ag-paciente', 'sess-paciente', 'pront-paciente', 'fin-filter-pac'];
  selectors.forEach(id => {
    const el = u.$(id); if (!el) return;
    const isFilter = id.includes('filter');
    el.innerHTML = `<option value="">${isFilter ? 'Todos os' : 'Selecione um'} paciente${isFilter ? 's' : ''}…</option>`;
    state.pacientes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nome;
      el.appendChild(opt);
    });
  });
}
window.populatePacienteSelects = populatePacienteSelects;

// Mapa de funções de renderização por página
const RENDER_PAGES = {
  dashboard: Dashboard.renderDashboard,
  pacientes: Pacientes.renderPacientes,
  agenda: () => { populatePacienteSelects(); Agenda.renderConsultas(); },
  prontuario: () => { populatePacienteSelects(); },
  financeiro: () => { populatePacienteSelects(); Financeiro.renderFinanceiro(); },
};

// --- LOGICA DE INICIALIZAÇÃO ---
async function initApp() {
  try {
    await initSupabase();
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
      // Usamos maybeSingle para não disparar erro se o perfil ainda não existir
      const { data: perfil, error: perfilError } = await _supabase
        .from('perfis').select('*').eq('id', session.user.id).maybeSingle();

      if (!perfilError && perfil) {
        state.currentUser = { ...perfil, avatar: '👩‍⚕️' };
        updateHeaderUI();
        await carregarDadosIniciais();

        const lastPage = sessionStorage.getItem('psicare_last_page') || 'dashboard';
        navigate(lastPage);

        u.$('login-screen').style.display = 'none';
        u.$('app-wrapper').style.display = 'flex';
      } else {
        console.error("Perfil não encontrado ou erro de permissão (RLS):", perfilError);
        u.toast('Perfil não carregado. Verifique as permissões no banco.');
        u.$('login-screen').style.display = 'flex';
        u.$('app-wrapper').style.display = 'none';
      }
    } else {
      u.$('login-screen').style.display = 'flex';
      u.$('app-wrapper').style.display = 'none';
    }
  } catch (err) {
    console.error("Erro crítico ao iniciar:", err);
    u.$('login-screen').style.display = 'flex';
  }
}

async function carregarDadosIniciais() {
  u.toast('Carregando consultório...');
  await Promise.all([
    Pacientes.carregarPacientes(),
    Agenda.carregarConsultas(),
    Financeiro.carregarSessoes()
  ]);
  populatePacienteSelects();
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

// Ouvir quando pacientes são carregados para atualizar selects
window.addEventListener('data:pacientes-loaded', () => {
  populatePacienteSelects();
});

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