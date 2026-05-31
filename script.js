// =============================================================================
// 1. CONFIGURAÇÃO E CONSTANTES
// =============================================================================
const SUPABASE_URL = 'https://ezutgtfynlvbgbqmpqyb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dXRndGZ5bmx2YmdicW1wcXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDMyODcsImV4cCI6MjA5NDIxOTI4N30.t1VcyLhhfe8n_l_YDUgkx6u-YGm_PpDG7lALE52loaE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================================
// 2. ESTADO GLOBAL E UTILITÁRIOS
// =============================================================================
let currentUser = null;
let state = { pacientes: [], consultas: [], sessoes: [], prontuarios: {}, anexos: {} };

/** Objeto utilitário para manipulação de DOM e Formatação */
const u = {
  $: id => document.getElementById(id),
  $$: sel => document.querySelectorAll(sel),
  
  toast: msg => {
    const t = u.$('toast');
    if (!t) return console.log("Toast:", msg);
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  },
  
  fmt: (v, t) => {
    if (t === 'cpf') {
      let s = v.replace(/\D/g, '').slice(0, 11);
      return s.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    if (t === 'moeda') return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
    if (t === 'data') return v ? v.split('T')[0].split('-').reverse().join('/') : '—';
    return v;
  },
  
  hide: (id, v = true) => {
    const el = u.$(id);
    if (el) el.style.display = v ? 'none' : 'flex';
  },
  show: id => {
    const el = u.$(id);
    if (el) el.style.display = 'flex';
  },
};

/** Máscara de CPF em tempo real */
function maskCPF(el) { el.value = u.fmt(el.value, 'cpf'); }

// =============================================================================
// 3. SISTEMA DE AUTENTICAÇÃO
// =============================================================================
async function handleLogin(e) {
  e?.preventDefault?.();
  const email = u.$('login-email').value;
  const senha = u.$('login-senha').value;
  const erroEl = u.$('login-erro');

  // Login real no Supabase Auth
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    erroEl.textContent = "E-mail ou senha incorretos.";
    erroEl.style.display = 'block';
    return;
  }

  // Busca os dados do perfil na tabela 'perfis'
  console.log("Logado com sucesso! Buscando perfil para o ID:", data.user.id);
  
  const { data: perfil, error: perfilError } = await _supabase
    .from('perfis')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (perfilError) {
    console.error("Erro ao buscar perfil no Supabase:", perfilError);
  }

  if (perfil) {
    currentUser = { ...perfil, avatar: '👩‍⚕️' };
    sessionStorage.setItem('psicare_active_user', email);
    updateUI();
    u.$('login-screen').style.display = 'none';
    u.$('app-wrapper').style.display = 'flex';
    
    await carregarTudo();
    u.toast('Login realizado com sucesso!');
  } else {
    // Se o login no Auth deu certo mas não tem Perfil, avisamos o usuário
    const msgErro = perfilError 
      ? `Erro no banco: ${perfilError.message}` 
      : "Usuário autenticado, mas perfil não encontrado na tabela 'perfis'. Verifique se o registro do profissional foi criado.";
    
    erroEl.textContent = msgErro;
    erroEl.style.display = 'block';
    console.error("Detalhes do erro de perfil:", perfilError || "Registro faltando na tabela 'perfis'");
    
    // Opcional: Deslogar para não ficar em estado inconsistente
    await _supabase.auth.signOut();
  }
}

async function handleLogout() {
  await _supabase.auth.signOut();
  sessionStorage.removeItem('psicare_active_user');
  currentUser = null;
  ['login-email', 'login-senha'].forEach(id => u.$(id).value = '');
  u.$('login-erro').style.display = 'none';
  u.$('app-wrapper').style.display = 'none';
  u.$('login-screen').style.display = 'flex';
  mostrarLogin();
  u.toast('Sessão encerrada.');
}

function mostrarRecuperarSenha() {
  u.$('login-form').style.display = 'none';
  u.$('recovery-form').style.display = 'block';
  u.$('recovery-msg').style.display = 'none';
}

function mostrarLogin() {
  u.$('login-form').style.display = 'block';
  u.$('recovery-form').style.display = 'none';
}

async function enviarEmailRecuperacao(e) {
  e.preventDefault();
  const email = u.$('recovery-email').value;
  const msgEl = u.$('recovery-msg');
  
  // Captura a URL base atual (ex: https://meusite.vercel.app/ ou http://127.0.0.1:5500/)
  // Remove o index.html se ele estiver presente na URL
  let baseUrl = window.location.href.split('?')[0].split('#')[0];
  if (baseUrl.endsWith('index.html')) {
    baseUrl = baseUrl.replace('index.html', '');
  }
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }
  
  const redirectUrl = baseUrl + 'redefinicao.html';
  
  console.log("Solicitando redefinição. O link levará para:", redirectUrl);

  const { error } = await _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  msgEl.style.display = 'block';
  if (error) {
    msgEl.textContent = "Erro: " + error.message;
    msgEl.style.color = "#c0392b";
  } else {
    msgEl.textContent = "Link enviado! Verifique seu e-mail (inclusive o SPAM).";
    msgEl.style.color = "var(--sage-dark)";
    u.$('recovery-email').value = '';
  }
}

// =============================================================================
// 4. NAVEGAÇÃO E UI GERAL
// =============================================================================
const RENDER_PAGES = {
  dashboard: renderDashboard,
  pacientes: renderPacientes,
  agenda: () => { populatePacienteSelects(); renderConsultas(); },
  prontuario: populateProntSelect,
  financeiro: () => { populateFinanceiroSelects(); renderFinanceiro(); },
};

function navigate(page) {
  u.$$('.page').forEach(p => p.classList.remove('active'));
  u.$$('.nav-item').forEach(n => n.classList.remove('active'));
  u.$('page-' + page)?.classList.add('active');
  u.$$(`[data-page="${page}"]`)[0]?.classList.add('active');

  sessionStorage.setItem('psicare_last_page', page);

  RENDER_PAGES[page]?.();
}

function updateUI() {
  if (!currentUser) return;
  u.$('user-nome').textContent = currentUser.nome;
  u.$('user-crp').textContent = `Psicóloga CRP ${currentUser.crp}`;
  u.$('user-avatar').textContent = (currentUser.nome || 'P')[0].toUpperCase();
  u.$$('.page-header h2')[0].textContent = `Bom dia, Dra. ${currentUser.nome.split(' ')[0] || 'Colega'} ✿`;
}

// =============================================================================
// 5. MÓDULO: DASHBOARD
// =============================================================================
function renderDashboard() {
  const hoje = new Date();
  const semStart = new Date(hoje); semStart.setDate(hoje.getDate() - hoje.getDay());
  const semEnd = new Date(semStart); semEnd.setDate(semStart.getDate() + 6);
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
  const anoAtual = hoje.getFullYear().toString();

  u.$('stat-pacientes').textContent = state.pacientes.length;
  u.$('stat-semana').textContent = state.consultas.filter(c => {
    const d = new Date(c.data + 'T12:00');
    return d >= semStart && d <= semEnd;
  }).length;

  let recMes = 0, pendMes = 0;
  state.sessoes.forEach(s => {
    if (!s.data) return;
    const [y, m] = s.data.split('-');
    if (y === anoAtual && m === mesAtual) {
      const valor = parseFloat(s.valor) || 0;
      if (s.status === 'Pago') recMes += valor;
      else pendMes += valor;
    }
  });
  u.$('stat-recebido').textContent = u.fmt(recMes, 'moeda');
  u.$('stat-pendente').textContent = u.fmt(pendMes, 'moeda');

  renderList('dash-proximas', state.consultas
    .filter(c => new Date(c.data + 'T' + c.hora) >= new Date())
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(0, 4), c => {
      const pac = state.pacientes.find(p => p.id == c.pacienteId);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);">
        <div><div style="font-size:.88rem;font-weight:500;">${pac?.nome || '—'}</div>
        <div style="font-size:.78rem;color:var(--ink-soft);">${u.fmt(c.data, 'data')} às ${c.hora}</div></div>
        <span class="badge badge-blue">${c.obs || 'Consulta'}</span></div>`;
    }, 'Nenhuma consulta agendada.');

  renderList('dash-pendentes', state.sessoes.filter(s => s.status === 'Pendente').slice(0, 5), s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);">
      <div><div style="font-size:.88rem;font-weight:500;">${pac?.nome || '—'}</div>
      <div style="font-size:.78rem;color:var(--ink-soft);">${u.fmt(s.data, 'data')}</div></div>
      <span style="font-weight:600;color:#c0392b;font-size:.88rem;">${u.fmt(s.valor, 'moeda')}</span></div>`;
  }, 'Nenhum pagamento pendente. ✓');
}

// =============================================================================
// 6. MÓDULO: PACIENTES (API & LÓGICA)
// =============================================================================
async function carregarPacientes() {
  if (!currentUser) return;

  const { data, error } = await _supabase
    .from('pacientes')
    .select('*')
    .eq('psicologa_id', currentUser.id)
    .order('nome', { ascending: true });

  if (error) {
    console.error("Erro ao carregar pacientes:", error);
    u.toast('Erro ao carregar pacientes.');
  } else {
    state.pacientes = (data || []).map(p => ({
      id: p.id,
      nome: p.nome,
      cpf: p.cpf,
      cpfResp: p.cpf_responsavel,
      valor: p.valor_sessao,
      tel: p.telefone
    }));
    renderPacientes();
    populatePacienteSelects();
  }
}

async function salvarPaciente() {
  const nome = u.$('pac-nome').value.trim();
  const cpf = u.$('pac-cpf').value.trim();
  const cpfR = u.$('pac-cpf-resp').value.trim();
  const valor = u.$('pac-valor').value;
  const tel = u.$('pac-tel').value.trim();
  const idx = u.$('pac-edit-idx').value;

  if (!nome || !cpf || !valor) {
    u.toast('Preencha os campos obrigatórios.');
    return;
  }

  const dadosPaciente = {
    nome: nome,
    cpf: cpf,
    cpf_responsavel: cpfR,
    valor_sessao: parseFloat(valor),
    telefone: tel,
    psicologa_id: currentUser.id
  };

  let error;
  if (idx !== '') {
    const idDoBanco = state.pacientes[parseInt(idx)].id;
    const { error: updateError } = await _supabase
      .from('pacientes')
      .update(dadosPaciente)
      .eq('id', idDoBanco);
    error = updateError;
  } else {
    const { error: insertError } = await _supabase
      .from('pacientes')
      .insert([dadosPaciente]);
    error = insertError;
  }

  if (error) {
    console.error("Erro ao salvar paciente:", error);
    u.toast('Erro ao salvar no banco: ' + error.message);
  } else {
    u.toast(idx !== '' ? 'Paciente atualizado!' : 'Paciente cadastrado!');
    limparFormPaciente();
    await carregarPacientes();
  }
}

function limparFormPaciente() {
  ['pac-nome', 'pac-cpf', 'pac-cpf-resp', 'pac-valor', 'pac-tel'].forEach(id => u.$(id).value = '');
  u.$('pac-edit-idx').value = '';
  u.$('pac-form-title').textContent = 'Novo Paciente';
}

function editarPaciente(idx) {
  const p = state.pacientes[idx];
  u.$('pac-nome').value = p.nome;
  u.$('pac-cpf').value = p.cpf;
  u.$('pac-cpf-resp').value = p.cpfResp || '';
  u.$('pac-valor').value = p.valor;
  u.$('pac-tel').value = p.tel || '';
  u.$('pac-edit-idx').value = idx;
  u.$('pac-form-title').textContent = 'Editar Paciente';
  window.scrollTo(0, 0);
}

async function excluirPaciente(idx) {
  if (!confirm('Excluir este paciente?')) return;

  const idDoBanco = state.pacientes[idx].id;
  const { error } = await _supabase
    .from('pacientes')
    .delete()
    .eq('id', idDoBanco);

  if (error) {
    console.error("Erro ao excluir:", error);
    u.toast('Erro ao excluir do banco.');
  } else {
    u.toast('Paciente excluído!');
    await carregarPacientes();
  }
}

// --- VIEW: PACIENTES ---
function renderPacientes() {
  const q = (u.$('pac-search')?.value || '').toLowerCase();
  const filtered = state.pacientes.filter(p => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  const tbody = u.$('pac-tbody');

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:28px;">Nenhum paciente encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => {
    const realIdx = state.pacientes.indexOf(p);
    return `<tr>
      <td><strong>${p.nome}</strong>${p.cpfResp ? '<br><small style="color:var(--ink-soft);">Resp. cadastrado</small>' : ''}</td>
      <td style="font-size:.82rem;">${p.cpf}</td>
      <td style="font-weight:600;color:var(--primary);">${u.fmt(p.valor, 'moeda')}</td>
      <td style="font-size:.82rem;color:var(--ink-soft);">${p.tel || '—'}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="editarPaciente(${realIdx})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirPaciente(${realIdx})">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// =============================================================================
// 7. MÓDULO: AGENDA
// =============================================================================
async function carregarConsultas() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from('consultas')
    .select('*')
    .eq('psicologa_id', currentUser.id)
    .order('data', { ascending: true });

  if (!error) {
    state.consultas = (data || []).map(c => ({
      id: c.id,
      pacienteId: c.paciente_id,
      data: c.data,
      hora: c.hora,
      obs: c['observacao'],
      status: c.status || 'Agendada'
    }));
    renderConsultas();
  }
}

async function salvarConsulta() {
  const pacId = u.$('ag-paciente').value;
  const data = u.$('ag-data').value;
  const hora = u.$('ag-hora').value;
  const obs = u.$('ag-obs').value.trim();
  const status = u.$('ag-status').value;

  if (!pacId || !data || !hora) { u.toast('Preencha todos os campos.'); return; }

  const { error } = await _supabase.from('consultas').insert([{
    paciente_id: pacId,
    psicologa_id: currentUser.id,
    data: data,
    hora: hora,
    'observacao': obs,
    status: status
  }]);

  if (error) {
    console.error("Erro ao agendar:", error);
    u.toast('Erro ao agendar: ' + error.message);
  } else {
    ['ag-paciente', 'ag-data', 'ag-hora', 'ag-obs'].forEach(id => u.$(id).value = '');
    u.$('ag-status').value = 'Agendada';
    await carregarConsultas();
    u.toast('Consulta agendada!');
  }
}

async function alterarStatusConsulta(id, novoStatus) {
  const { error } = await _supabase
    .from('consultas')
    .update({ status: novoStatus })
    .eq('id', id);

  if (!error) {
    await carregarConsultas();
    u.toast('Status atualizado!');
  }
}

async function excluirConsulta(id) {
  if(!confirm('Excluir esta consulta?')) return;
  const { error } = await _supabase.from('consultas').delete().eq('id', id);
  if (!error) {
    await carregarConsultas();
    u.toast('Consulta excluída.');
  }
}

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

// --- VIEW: AGENDA ---
function renderConsultas() {
  const filter = u.$('ag-filter')?.value;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let lista = [...state.consultas].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  if (filter === 'today') lista = lista.filter(c => c.data === hoje.toISOString().split('T')[0]);
  if (filter === 'week') {
    const semEnd = new Date(hoje); semEnd.setDate(hoje.getDate() + 7);
    lista = lista.filter(c => { const d = new Date(c.data + 'T12:00'); return d >= hoje && d <= semEnd; });
  }

  const el = u.$('ag-lista');
  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:.85rem;padding:10px 0;">Nenhuma consulta encontrada.</p>';
    return;
  }

  el.innerHTML = lista.map(c => {
    const pac = state.pacientes.find(p => p.id == c.pacienteId);
    const past = new Date(c.data + 'T' + c.hora) < new Date();
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const statusClasses = {
      'Agendada': 'badge-green',
      'Realizada': 'badge-gray',
      'Pendente': 'badge-amber',
      'Atrasada': 'btn-danger' // Reaproveitando a cor vermelha do sistema
    };

    return `<div class="appointment-card" style="${past ? 'opacity:.55;' : ''}">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="background:var(--sand-light);border-radius:8px;padding:8px 12px;text-align:center;min-width:52px;">
          <div style="font-size:.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${dias[new Date(c.data + 'T12:00').getDay()]}</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--ink);line-height:1.1;">${c.data.split('-')[2]}</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:.93rem;">${pac?.nome || '—'}</div>
          <div style="font-size:.8rem;color:var(--ink-soft);">${c.hora} · ${c.obs || 'Consulta'}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;">
        <select onchange="alterarStatusConsulta('${c.id}', this.value)" 
                style="font-size:.75rem;padding:4px;border-radius:6px;border:1.5px solid var(--border);outline:none;background:var(--card);">
          <option value="Agendada" ${c.status === 'Agendada' ? 'selected' : ''}>Agendada</option>
          <option value="Realizada" ${c.status === 'Realizada' ? 'selected' : ''}>Realizada</option>
          <option value="Pendente" ${c.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
          <option value="Atrasada" ${c.status === 'Atrasada' ? 'selected' : ''}>Atrasada</option>
        </select>
        <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="excluirConsulta('${c.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ====== PRONTUÁRIO ======
function populateProntSelect() { populatePacienteSelects(); }

async function carregarProntuarios(pid) {
  if (!pid) return;
  const { data, error } = await _supabase
    .from('prontuarios')
    .select('*')
    .eq('paciente_id', pid)
    .order('data', { ascending: false });

  if (!error) {
    state.prontuarios[pid] = (data || []).map(h => ({
      data: h.data,
      texto: h.texto,
      ts: h.id
    }));
    renderHistoricoProntuario(pid);
  }
}

async function carregarAnexos(pid) {
  if (!pid) return;
  const { data, error } = await _supabase.storage.from('documentos-pacientes').list(pid);
  
  if (error) {
    console.error("Erro ao carregar anexos:", error);
    return;
  }

  const arquivosValidos = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
  const anexosPromessas = arquivosValidos.map(async f => {
    const { data: urlData } = await _supabase.storage
      .from('documentos-pacientes')
      .createSignedUrl(`${pid}/${f.name}`, 3600);
    return {
      nome: f.name.includes('__') ? f.name.split('__')[1] : f.name,
      nomeReal: f.name,
      url: urlData ? urlData.signedUrl : '#'
    };
  });

  state.anexos[pid] = await Promise.all(anexosPromessas);
  
  const listaEl = u.$('anexos-lista');
  if (listaEl) {
    listaEl.innerHTML = state.anexos[pid]
      .map(a => `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--blush);border-radius:6px;padding:4px 10px;font-size:.78rem;margin:3px;">
        <a href="${a.url}" target="_blank" style="text-decoration:none;color:inherit;">📎 ${a.nome}</a>
        <button onclick="excluirAnexo('${a.nomeReal}')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:.9rem;padding:0 2px;display:flex;align-items:center;">✕</button>
      </div>`)
      .join('');
  }
}

async function excluirAnexo(nomeArquivo) {
  const pid = u.$('pront-paciente').value;
  if (!pid || !confirm('Deseja excluir este documento?')) return;

  const { error } = await _supabase.storage.from('documentos-pacientes').remove([`${pid}/${nomeArquivo}`]);
  
  if (error) {
    u.toast('Erro ao excluir: ' + error.message);
  } else {
    u.toast('Documento excluído.');
    await carregarAnexos(pid);
  }
}

async function fazerUploadAnexo(input) {
  const pid = u.$('pront-paciente').value;
  if (!pid) { u.toast('Selecione o paciente primeiro.'); return; }

  const files = input.files;
  if (files.length === 0) return;

  u.toast(`Iniciando upload de ${files.length} arquivo(s)...`);

  for (const file of files) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const path = `${pid}/${timestamp}__${safeName}`;
    
    const { error } = await _supabase.storage.from('documentos-pacientes').upload(path, file);
    
    if (error) {
      console.error("Erro no upload:", error);
      u.toast('Erro no upload: ' + error.message);
      continue;
    }
  }

  await carregarAnexos(pid);
  u.toast('Arquivo(s) salvos com sucesso!');
  input.value = '';
}

function carregarProntuario() {
  const pid = u.$('pront-paciente').value;
  const area = u.$('pront-area');
  const info = u.$('pront-info');

  if (!pid) { area.style.display = 'none'; info.style.display = 'none'; return; }

  const pac = state.pacientes.find(p => p.id == pid);
  info.style.display = 'block';
  u.$('pront-info-text').innerHTML = `<strong>${pac.nome}</strong> · CPF: ${pac.cpf}${pac.cpfResp ? ` · Resp: ${pac.cpfResp}` : ''} · Sessão: ${u.fmt(pac.valor, 'moeda')}`;
  area.style.display = 'block';
  u.$('pront-texto').value = '';
  u.$('pront-data-sessao').value = new Date().toISOString().split('T')[0];
  u.$('pront-edit-id').value = '';
  carregarProntuarios(pid);
  carregarAnexos(pid);
}

async function salvarProntuario() {
  const pid = u.$('pront-paciente').value;
  const txt = u.$('pront-texto').value.trim();
  let dataSessao = u.$('pront-data-sessao').value;
  const editId = u.$('pront-edit-id').value;

  if (!pid || !txt) { u.toast('Selecione o paciente e escreva a anotação.'); return; }

  if (!dataSessao) dataSessao = new Date().toISOString().split('T')[0];

  let res;
  if (editId) {
    res = await _supabase.from('prontuarios')
      .update({ data: dataSessao, texto: txt })
      .eq('id', editId);
  } else {
    res = await _supabase.from('prontuarios').insert([{
      paciente_id: pid,
      psicologa_id: currentUser.id,
      data: dataSessao,
      texto: txt
    }]);
  }

  if (res.error) {
    console.error("Erro ao salvar prontuario:", res.error);
    u.toast('Erro ao salvar anotação: ' + res.error.message);
  } else {
    u.$('pront-texto').value = '';
    u.$('pront-data-sessao').value = '';
    u.$('pront-edit-id').value = '';
    await carregarProntuarios(pid);
    u.toast(editId ? 'Anotação atualizada!' : 'Anotação salva!');
  }
}

function editarAnotacao(pid, id) {
  const anotacao = state.prontuarios[pid]?.find(h => h.ts == id);
  if (!anotacao) return;

  u.$('pront-texto').value = anotacao.texto;
  u.$('pront-data-sessao').value = anotacao.data;
  u.$('pront-edit-id').value = id;
  
  u.$('pront-texto').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// --- VIEW: PRONTUÁRIO ---
function renderHistoricoProntuario(pid) {
  const hist = state.prontuarios[pid] || [];
  const el = u.$('pront-historico');

  el.innerHTML = hist.length ? hist.map(h => `<div style="border-bottom:1px solid var(--border);padding:14px 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
      <div style="font-size:.78rem;font-weight:600;color:var(--primary);">📅 ${u.fmt(h.data, 'data')}</div>
      <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="editarAnotacao('${pid}', '${h.ts}')">Editar</button>
    </div>
    <p style="font-size:.88rem;line-height:1.6;white-space:pre-wrap;">${h.texto}</p></div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhuma anotação registrada.</p>';
}

// =============================================================================
// 9. MÓDULO: FINANCEIRO
// =============================================================================
async function carregarSessoes() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from('sessoes')
    .select('*')
    .eq('psicologa_id', currentUser.id)
    .order('data', { ascending: false });

  if (!error) {
    state.sessoes = (data || []).map(s => ({
      id: s.id,
      pacienteId: s.paciente_id,
      data: s.data,
      valor: s.valor,
      status: s.status_pagamento ? 'Pago' : 'Pendente',
      receitaSaude: s.status_receita
    }));
    renderFinanceiro();
  }
}

function abrirModalSessao() {
  u.$('sess-data').value = new Date().toISOString().split('T')[0];
  u.$('modal-overlay').style.display = 'flex';
}

function fecharModal() {
  u.$('modal-overlay').style.display = 'none';
  ['sess-paciente', 'sess-valor', 'sess-data'].forEach(id => u.$(id).value = '');
}

async function salvarSessao() {
  const { pacId, data, valor, status } = {
    pacId: u.$('sess-paciente').value,
    data: u.$('sess-data').value,
    valor: u.$('sess-valor').value,
    status: u.$('sess-status').value,
  };

  if (!pacId || !data || !valor) { u.toast('Preencha os campos obrigatórios.'); return; }

  const { error } = await _supabase.from('sessoes').insert([{
    paciente_id: pacId,
    psicologa_id: currentUser.id,
    data: data,
    valor: parseFloat(valor),
    status_pagamento: status === 'Pago',
    status_receita: false
  }]);

  if (error) {
    console.error("Erro ao salvar sessao:", error);
    u.toast('Erro ao registrar sessão: ' + error.message);
  } else {
    fecharModal();
    await carregarSessoes();
    u.toast('Sessão registrada!');
  }
}

async function toggleStatus(id) {
  const sessao = state.sessoes.find(s => s.id === id);
  if (!sessao) return;

  const novoStatus = sessao.status === 'Pago' ? false : true;
  const { error } = await _supabase
    .from('sessoes')
    .update({ status_pagamento: novoStatus })
    .eq('id', id);

  if (!error) await carregarSessoes();
}

async function toggleReceita(id) {
  const sessao = state.sessoes.find(s => s.id === id);
  if (!sessao) return;

  const novoRec = !sessao.receitaSaude;
  const { error } = await _supabase
    .from('sessoes')
    .update({ status_receita: novoRec })
    .eq('id', id);

  if (!error) await carregarSessoes();
}

async function excluirSessao(id) {
  if(!confirm('Excluir esta sessão?')) return;
  const { error } = await _supabase.from('sessoes').delete().eq('id', id);
  if (!error) {
    await carregarSessoes();
    u.toast('Sessão excluída.');
  }
}

function populateFinanceiroSelects() { populatePacienteSelects(); }

// --- VIEW: FINANCEIRO ---
function renderFinanceiro() {
  const filterPac = u.$('fin-filter-pac')?.value;
  const filterStatus = u.$('fin-filter-status')?.value;
  let lista = [...state.sessoes];

  if (filterPac) lista = lista.filter(s => s.pacienteId == filterPac);
  // Fix: Só filtra se o status for específico (Pago/Pendente), se for "Todos" mostra tudo
  if (filterStatus && filterStatus !== "Todos" && filterStatus !== "") {
    lista = lista.filter(s => s.status === filterStatus);
  }

  const tbody = u.$('fin-tbody');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:28px;">Nenhuma sessão registrada.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    return `<tr>
      <td><strong>${pac?.nome || '—'}</strong></td>
      <td style="white-space:nowrap;">${u.fmt(s.data, 'data')}</td>
      <td style="font-weight:600;">${u.fmt(s.valor, 'moeda')}</td>
      <td><button class="badge ${s.status === 'Pago' ? 'badge-green' : 'badge-amber'}" onclick="toggleStatus('${s.id}')" style="cursor:pointer;border:none;font-size:.75rem;padding:4px 12px;">${s.status}</button></td>
      <td><label class="toggle-wrap" style="cursor:pointer;"><label class="toggle"><input type="checkbox" ${s.receitaSaude ? 'checked' : ''} onchange="toggleReceita('${s.id}')"><span class="toggle-slider"></span></label><span style="font-size:.82rem;color:${s.receitaSaude ? 'var(--primary)' : 'var(--ink-soft)'};">${s.receitaSaude ? 'Emitido' : 'Pendente'}</span></label></td>
      <td><button class="btn btn-danger btn-sm" onclick="excluirSessao('${s.id}')">✕</button></td>
    </tr>`;
  }).join('');
}

// =============================================================================
// 10. MÓDULO: RELATÓRIOS E PERFIL
// =============================================================================
function gerarRelatorio() {
  const { mes, ano, status } = {
    mes: u.$('rel-mes').value,
    ano: u.$('rel-ano').value,
    status: u.$('rel-status').value,
  };

  let lista = state.sessoes.filter(s => s.data && (() => {
    const [y, m] = s.data.split('-');
    return y === ano && m === mes;
  })());

  if (status) lista = lista.filter(s => s.status === status);
  lista.sort((a, b) => a.data.localeCompare(b.data));

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  u.$('rel-titulo').textContent = `${meses[parseInt(mes) - 1]} / ${ano}`;

  const total = lista.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  u.$('rel-total').textContent = `Total: ${u.fmt(total, 'moeda')}`;

  const tbody = u.$('rel-tbody');
  tbody.innerHTML = lista.length ? lista.map(s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    const cpfDecl = pac?.cpfResp || pac?.cpf || '—';
    return `<tr><td>${pac?.nome || '—'}</td><td style="font-family:monospace;font-size:.85rem;">${cpfDecl}</td><td>${u.fmt(s.data, 'data')}</td><td style="font-weight:600;color:var(--primary);">${u.fmt(s.valor, 'moeda')}</td></tr>`;
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:24px;">Nenhum registro para este período.</td></tr>';

  u.$('rel-resultado').style.display = 'block';
}

function copiarTabela() {
  let text = '';
  u.$('rel-table').querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.querySelectorAll('th,td')).map(c => c.textContent.trim());
    text += cells.join('\t') + '\n';
  });
  navigator.clipboard.writeText(text).then(() => u.toast('Tabela copiada!'));
}

function abrirModalPerfil() {
  if (!currentUser) return;
  u.$('perfil-nome').value = currentUser.nome;
  u.$('perfil-crp').value = currentUser.crp;
  u.$('modal-perfil').style.display = 'flex';
}

function fecharModalPerfil() {
  u.$('modal-perfil').style.display = 'none';
}

async function salvarPerfil() {
  const nome = u.$('perfil-nome').value.trim();
  const crp = u.$('perfil-crp').value.trim();

  if (!nome || !crp) {
    u.toast('Preencha seu nome e CRP.');
    return;
  }

  const { error } = await _supabase
    .from('perfis')
    .update({ nome, crp })
    .eq('id', currentUser.id);

  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    u.toast('Erro ao atualizar: ' + error.message);
  } else {
    currentUser.nome = nome;
    currentUser.crp = crp;
    updateUI();
    fecharModalPerfil();
    u.toast('Perfil atualizado com sucesso!');
  }
}

// =============================================================================
// 11. INICIALIZAÇÃO E EVENTOS
// =============================================================================

/** Auxiliar para carregar todos os dados iniciais do banco */
async function carregarTudo() {
  if (!currentUser) return;
  u.toast('Carregando dados...');
  await Promise.all([
    carregarPacientes(),
    carregarConsultas(),
    carregarSessoes()
  ]);
  renderDashboard();
}

/** Auxiliar para renderizar listas simples no dashboard */
function renderList(id, items, render, emptyMsg) {
  const el = u.$(id);
  if (!el) return;
  el.innerHTML = items.length ? items.map(render).join('') : `<p style="color:var(--ink-soft);font-size:.85rem;">${emptyMsg}</p>`;
}

/** Ponto de Entrada da Aplicação (IIFE) */
(async () => {
  const hash = window.location.hash;
  if (hash && (hash.includes('type=recovery') || hash.includes('type=invite') || hash.includes('type=signup'))) {
    
    // Captura o caminho da pasta atual para evitar erro 404
    let currentPath = window.location.pathname;
    let folderPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    
    // Se for recuperação de senha
    if (hash.includes('type=recovery')) {
      window.location.href = folderPath + 'redefinicao.html' + hash;
      return;
    }
    
    // Se for convite (signup/invite)
    if (hash.includes('type=invite') || hash.includes('type=signup')) {
      window.location.href = folderPath + 'finalizar-cadastro.html' + hash;
      return;
    }
  }

  const { data: { session } } = await _supabase.auth.getSession();

  if (session) {
    const { data: perfil } = await _supabase
      .from('perfis')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (perfil) {
      currentUser = { ...perfil, avatar: '👩‍⚕️' };
      updateUI();
      
      await carregarTudo();
      
      const lastPage = sessionStorage.getItem('psicare_last_page') || 'dashboard';
      navigate(lastPage);

      u.$('login-screen').style.display = 'none';
      u.$('app-wrapper').style.display = 'flex';
    }
  } else {
    u.$('login-screen').style.display = 'flex';
  }
})();

// EVENT LISTENERS GLOBAIS
u.$$('.nav-item').forEach(item => item.addEventListener('click', () => navigate(item.dataset.page)));
u.$('modal-overlay').addEventListener('click', e => e.target === e.currentTarget && fecharModal());

// Eventos de Login/Logout
u.$('login-form')?.addEventListener('submit', handleLogin);
u.$('recovery-form')?.addEventListener('submit', enviarEmailRecuperacao);

u.$('sess-paciente')?.addEventListener('change', function () {
  const pac = state.pacientes.find(p => p.id == this.value);
  pac && (u.$('sess-valor').value = parseFloat(pac.valor).toFixed(2));
});