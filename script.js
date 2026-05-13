// ====== CONFIGURAÇÃO ======
const SUPABASE_URL = 'https://ezutgtfynlvbgbqmpqyb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dXRndGZ5bmx2YmdicW1wcXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDMyODcsImV4cCI6MjA5NDIxOTI4N30.' + 't1VcyLhhfe8n_l_YDUgkx6u-YGm_PpDG7lALE52loaE';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// O USERS agora é opcional, pois usaremos o Supabase Auth para gerenciar os IDs e senhas.
const USERS = {};

// ====== STATE & UTILS ======
let currentUser = null;
let state = { pacientes: [], consultas: [], sessoes: [], prontuarios: {}, anexos: {} };

const u = {
  $: id => document.getElementById(id),
  $$: sel => document.querySelectorAll(sel),
  toast: msg => {
    const t = u.$('toast');
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
    if (t === 'data') return v ? v.split('-').reverse().join('/') : '';
  },
  hide: (id, v = true) => u.$(`${id}${v ? '' : '-not'}`)?.style?.display !== 'none' && (u.$(`${id}`)?.style.display = v ? 'none' : 'flex'),
  show: id => u.$(`${id}`)?.style && (u.$(`${id}`).style.display = 'flex'),
};

// ====== LOGIN ======
async function fazerLogin(e) {
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
  const { data: perfil, error: perfilError } = await _supabase
    .from('perfis')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (perfil) {
    currentUser = { ...perfil, avatar: '👩‍⚕️' };
    sessionStorage.setItem('psicare_active_user', email);
    updateUI();
    u.$('login-screen').style.display = 'none';
    u.$('app-wrapper').style.display = 'flex';
    
    await carregarTudo();
    renderDashboard();
    u.toast('Login realizado com sucesso!');
  } else {
    erroEl.textContent = "Perfil não configurado no banco.";
    erroEl.style.display = 'block';
  }
}

async function fazerLogout() {
  await _supabase.auth.signOut();
  sessionStorage.removeItem('psicare_active_user');
  currentUser = null;
  ['login-email', 'login-senha'].forEach(id => u.$(id).value = '');
  u.$('login-erro').style.display = 'none';
  u.$('app-wrapper').style.display = 'none';
  u.$('login-screen').style.display = 'flex';
  u.toast('Sessão encerrada.');
}

function updateUI() {
  if (!currentUser) return;
  u.$('user-nome').textContent = currentUser.nome;
  u.$('user-crp').textContent = `Psicóloga CRP ${currentUser.crp}`;
  u.$('user-avatar').textContent = currentUser.avatar || '👩‍⚕️';
  u.$$('.page-header h2')[0].textContent = `Bom dia, Dra. ${currentUser.nome.split(' ')[1] || currentUser.nome} ✿`;
}

function loadUserData() {
  if (!currentUser) return;
  const saved = localStorage.getItem(currentUser.storageKey);
  state = saved ? JSON.parse(saved) : { pacientes: [], consultas: [], sessoes: [], prontuarios: {}, anexos: {} };
  if (!state.prontuarios) state.prontuarios = {};
  if (!state.anexos) state.anexos = {};
}

function save() {
  currentUser && localStorage.setItem(currentUser.storageKey, JSON.stringify(state));
}

// ====== NAVIGATION ======
function navigate(page) {
  u.$$('.page').forEach(p => p.classList.remove('active'));
  u.$$('.nav-item').forEach(n => n.classList.remove('active'));
  u.$('page-' + page)?.classList.add('active');
  u.$$(`[data-page="${page}"]`)[0]?.classList.add('active');

  const renderMap = {
    dashboard: renderDashboard,
    pacientes: renderPacientes,
    agenda: () => { populatePacienteSelects(); renderConsultas(); },
    prontuario: populateProntSelect,
    financeiro: () => { populateFinanceiroSelects(); renderFinanceiro(); },
  };
  renderMap[page]?.();
}

u.$$('.nav-item').forEach(item => item.addEventListener('click', () => navigate(item.dataset.page)));

// ====== DASHBOARD ======
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
      (s.status === 'Pago' ? recMes : pendMes) += parseFloat(s.valor) || 0;
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

function renderList(id, items, render, emptyMsg) {
  const el = u.$(id);
  el.innerHTML = items.length ? items.map(render).join('') : `<p style="color:var(--ink-soft);font-size:.85rem;">${emptyMsg}</p>`;
}

async function carregarTudo() {
  if (!currentUser) return;
  await carregarPacientes();
  await Promise.all([
    carregarConsultas(),
    carregarSessoes()
  ]);
}

// ====== PACIENTES ======
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
    console.error("Erro ao salvar:", error);
    u.toast('Erro ao salvar no banco.');
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

// ====== AGENDA ======
async function carregarConsultas() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from('consultas')
    .select('*')
    .eq('psicologa_id', currentUser.id)
    .order('dados', { ascending: true });

  if (!error) {
    state.consultas = (data || []).map(c => ({
      id: c.id,
      pacienteId: c.paciente_id,
      data: c.dados,
      hora: c.hora,
      obs: c['observação']
    }));
    renderConsultas();
  }
}

async function salvarConsulta() {
  const pacId = u.$('ag-paciente').value;
  const data = u.$('ag-data').value;
  const hora = u.$('ag-hora').value;
  const obs = u.$('ag-obs').value.trim();

  if (!pacId || !data || !hora) { u.toast('Preencha todos os campos.'); return; }

  const { error } = await _supabase.from('consultas').insert([{
    paciente_id: pacId,
    psicologa_id: currentUser.id,
    dados: data,
    hora: hora,
    'observação': obs
  }]);

  if (error) {
    u.toast('Erro ao agendar.');
  } else {
    ['ag-paciente', 'ag-data', 'ag-hora', 'ag-obs'].forEach(id => u.$(id).value = '');
    await carregarConsultas();
    u.toast('Consulta agendada!');
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

function populatePacienteSelects() {
  ['ag-paciente', 'sess-paciente', 'pront-paciente', 'fin-filter-pac'].forEach(id => {
    const el = u.$(id);
    if (!el) return;
    const isFilter = id === 'fin-filter-pac';
    el.innerHTML = `<option value="">${isFilter ? 'Todos os' : 'Selecione um'} paciente${isFilter ? 's' : ''}…</option>`;
    state.pacientes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nome;
      el.appendChild(opt);
    });
  });
}

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
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="badge ${past ? 'badge-gray' : 'badge-green'}">${past ? 'Realizada' : 'Agendada'}</span>
        <button class="btn btn-danger btn-sm" onclick="excluirConsulta(${c.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ====== PRONTUÁRIO ======
function populateProntSelect() { populatePacienteSelects(); }

async function carregarProntuarios(pid) {
  if (!pid) return;
  const { data, error } = await _supabase
    .from('prontuários')
    .select('*')
    .eq('paciente_id', pid)
    .order('data_sessao', { ascending: false });

  if (!error) {
    state.prontuarios[pid] = (data || []).map(h => ({
      data: h.data_sessao,
      texto: h.texto,
      ts: h.id
    }));
    renderHistoricoProntuario(pid);
  }
}

async function carregarAnexos(pid) {
  if (!pid) return;
  const { data, error } = await _supabase.storage.from('DOCUMENTOS-PACIENTES').list(pid);
  
  if (!error) {
    state.anexos[pid] = (data || []).map(f => ({
      nome: f.name,
      url: _supabase.storage.from('DOCUMENTOS-PACIENTES').getPublicUrl(`${pid}/${f.name}`).data.publicUrl
    }));
    
    u.$('anexos-lista').innerHTML = state.anexos[pid]
      .map(a => `<a href="${a.url}" target="_blank" class="file-link" style="display:inline-flex;align-items:center;gap:6px;background:var(--blush);border-radius:6px;padding:4px 10px;font-size:.78rem;margin:3px;text-decoration:none;color:inherit;">📎 ${a.nome}</a>`)
      .join('');
  }
}

async function fazerUploadAnexo(input) {
  const pid = u.$('pront-paciente').value;
  if (!pid) { u.toast('Selecione o paciente primeiro.'); return; }

  const files = input.files;
  for (const file of files) {
    const path = `${pid}/${file.name}`;
    const { error } = await _supabase.storage.from('DOCUMENTOS-PACIENTES').upload(path, file, {
      upsert: true
    });
    if (error) console.error("Erro no upload:", error);
  }

  await carregarAnexos(pid);
  u.toast('Arquivo(s) anexado(s)!');
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
  u.$('pront-data-sessao').value = '';
  carregarProntuarios(pid);
  carregarAnexos(pid);
}

async function salvarProntuario() {
  const pid = u.$('pront-paciente').value;
  const txt = u.$('pront-texto').value.trim();
  const data = u.$('pront-data-sessao').value.trim();

  if (!pid || !txt) { u.toast('Selecione o paciente e escreva a anotação.'); return; }

  const { error } = await _supabase.from('prontuários').insert([{
    paciente_id: pid,
    psicologa_id: currentUser.id,
    data_sessao: data || new Date().toISOString().split('T')[0],
    texto: txt
  }]);

  if (!error) {
    u.$('pront-texto').value = '';
    u.$('pront-data-sessao').value = '';
    await carregarProntuarios(pid);
    u.toast('Anotação salva!');
  }
}

function renderHistoricoProntuario(pid) {
  const hist = state.prontuarios[pid] || [];
  const el = u.$('pront-historico');

  el.innerHTML = hist.length ? hist.map(h => `<div style="border-bottom:1px solid var(--border);padding:14px 0;">
    <div style="font-size:.78rem;font-weight:600;color:var(--primary);margin-bottom:5px;">📅 ${u.fmt(h.data, 'data')}</div>
    <p style="font-size:.88rem;line-height:1.6;white-space:pre-wrap;">${h.texto}</p></div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhuma anotação registrada.</p>';
}

// ====== FINANCEIRO ======
async function carregarSessoes() {
  if (!currentUser) return;
  const { data, error } = await _supabase
    .from('sessoes')
    .select('*')
    .eq('psicologa_id', currentUser.id)
    .order('dados', { ascending: false });

  if (!error) {
    state.sessoes = (data || []).map(s => ({
      id: s.id,
      pacienteId: s.paciente_id,
      data: s.dados,
      valor: s.valentia,
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
    dados: data,
    valentia: parseFloat(valor),
    status_pagamento: status === 'Pago',
    status_receita: false
  }]);

  if (!error) {
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

function populateFinanceiroSelects() {
  populatePacienteSelects();
}

function renderFinanceiro() {
  const filterPac = u.$('fin-filter-pac')?.value;
  const filterStatus = u.$('fin-filter-status')?.value;
  let lista = [...state.sessoes];

  if (filterPac) lista = lista.filter(s => s.pacienteId == filterPac);
  if (filterStatus) lista = lista.filter(s => s.status === filterStatus);

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

// ====== RELATÓRIOS ======
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

// ====== INIT ======
(async () => {
  // Verifica se existe uma sessão ativa no Supabase
  const { data: { session } } = await _supabase.auth.getSession();

  if (session) {
    // Busca o perfil vinculado a esta conta
    const { data: perfil } = await _supabase
      .from('perfis')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (perfil) {
      currentUser = { ...perfil, avatar: '👩‍⚕️' };
      updateUI();
      u.$('login-screen').style.display = 'none';
      u.$('app-wrapper').style.display = 'flex';
      await carregarTudo();
      renderDashboard();
    }
  }
})();

u.$('modal-overlay').addEventListener('click', e => e.target === e.currentTarget && fecharModal());
u.$('sess-paciente').addEventListener('change', function () {
  const pac = state.pacientes.find(p => p.id == this.value);
  pac && (u.$('sess-valor').value = parseFloat(pac.valor).toFixed(2));
});
u.$$('input[data-mask="cpf"]').forEach(el => el.addEventListener('input', () => el.value = u.fmt(el.value, 'cpf')));