// ====== CONFIGURAÇÃO ======
const SUPABASE_URL = 'sb_publishable_Q_5d8n7AyzYjG3XofE0YnA_zXAcaUSv';
const SUPABASE_KEY = 'sb_secret_QtdYBg2kEtdGDfwAq77l5w_feruNog_';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const USERS = {
  // Adicione usuários aqui conforme necessário
};

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
function fazerLogin(e) {
  e?.preventDefault?.();
  const { email, senha, erroEl } = {
    email: u.$('login-email').value,
    senha: u.$('login-senha').value,
    erroEl: u.$('login-erro')
  };
  const user = USERS[email];

  if (user?.password === senha) {
    currentUser = user;
    sessionStorage.setItem('psicare_active_user', email);
    loadUserData();
    updateUI();
    u.$('login-screen').style.display = 'none';
    u.$('app-wrapper').style.display = 'flex';
    renderDashboard();
    u.toast('Login realizado com sucesso!');
  } else {
    erroEl.textContent = "E-mail ou senha incorretos.";
    erroEl.style.display = 'block';
  }
}

function fazerLogout() {
  sessionStorage.removeItem('psicare_active_user');
  currentUser = null;
  ['login-email', 'login-senha'].forEach(id => u.$(id).value = '');
  u.$('login-erro').style.display = 'none';
  u.$('app-wrapper').style.display = 'none';
  u.$('login-screen').style.display = 'flex';
  u.toast('Sessão encerrada.');
}

function updateUI() {
  u.$('user-nome').textContent = currentUser.name;
  u.$('user-crp').textContent = `Psicóloga CRP ${currentUser.crp}`;
  u.$('user-avatar').textContent = currentUser.avatar;
  u.$$('.page-header h2')[0].textContent = `Bom dia, Dra. ${currentUser.name.split(' ')[1]} ✿`;
}

function loadUserData() {
  if (!currentUser) return;
  const saved = localStorage.getItem(currentUser.storageKey);
  state = saved ? JSON.parse(saved) : { pacientes: [], consultas: [], sessoes: [], prontuarios: {}, anexos: {} };
  if (!state.prontuarios) state.prontuarios = {};
  if (!state.anexos) state.anexos = {};
  if (currentUser.storageKey === "psicare_data_naty") seedDemoData();
}

function save() {
  currentUser && localStorage.setItem(currentUser.storageKey, JSON.stringify(state));
}

function seedDemoData() {
  const hoje = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const m = (hoje.getMonth() + 1).toString().padStart(2, '0');
  const y = hoje.getFullYear();

  state.pacientes = [
    { id: 1001, nome: 'Mariana Oliveira', cpf: '123.456.789-00', cpfResp: '', valor: 200, tel: '(11) 98765-4321' },
    { id: 1002, nome: 'Pedro Henrique Costa', cpf: '987.654.321-00', cpfResp: '111.222.333-44', valor: 180, tel: '(11) 91234-5678' },
    { id: 1003, nome: 'Sofia Ramos', cpf: '456.789.123-00', cpfResp: '', valor: 220, tel: '' },
  ];

  const d1 = new Date(hoje); d1.setDate(hoje.getDate() + 1);
  const d2 = new Date(hoje); d2.setDate(hoje.getDate() + 3);
  state.consultas = [
    { id: 201, pacienteId: 1001, data: fmt(d1), hora: '09:00', obs: 'Online' },
    { id: 202, pacienteId: 1002, data: fmt(d2), hora: '14:30', obs: 'Presencial' },
    { id: 203, pacienteId: 1003, data: fmt(hoje), hora: '11:00', obs: 'Presencial' },
  ];

  state.sessoes = [
    { id: 301, pacienteId: 1001, data: `${y}-${m}-02`, valor: 200, status: 'Pago', receitaSaude: true },
    { id: 302, pacienteId: 1002, data: `${y}-${m}-05`, valor: 180, status: 'Pago', receitaSaude: false },
    { id: 303, pacienteId: 1003, data: `${y}-${m}-08`, valor: 220, status: 'Pendente', receitaSaude: false },
    { id: 304, pacienteId: 1001, data: `${y}-${m}-10`, valor: 200, status: 'Pendente', receitaSaude: false },
  ];
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

// ====== PACIENTES ======
function salvarPaciente() {
  const form = { nome, cpf, cpfResp: cpfR, valor, tel } = {
    nome: u.$('pac-nome').value.trim(),
    cpf: u.$('pac-cpf').value.trim(),
    cpfR: u.$('pac-cpf-resp').value.trim(),
    valor: u.$('pac-valor').value,
    tel: u.$('pac-tel').value.trim(),
  };
  const idx = u.$('pac-edit-idx').value;

  if (!form.nome || !form.cpf || !form.valor) { u.toast('Preencha os campos obrigatórios.'); return; }

  if (idx) {
    state.pacientes[parseInt(idx)] = { ...state.pacientes[parseInt(idx)], ...form };
    u.toast('Paciente atualizado!');
  } else {
    state.pacientes.push({ id: Date.now(), ...form });
    u.toast('Paciente cadastrado!');
  }
  save(); limparFormPaciente(); renderPacientes();
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

function excluirPaciente(idx) {
  confirm('Excluir este paciente?') && (state.pacientes.splice(idx, 1), save(), renderPacientes());
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

function salvarConsulta() {
  const { pacId, data, hora, obs } = {
    pacId: u.$('ag-paciente').value,
    data: u.$('ag-data').value,
    hora: u.$('ag-hora').value,
    obs: u.$('ag-obs').value.trim(),
  };
  if (!pacId || !data || !hora) { u.toast('Preencha todos os campos.'); return; }

  state.consultas.push({ id: Date.now(), pacienteId: parseInt(pacId), data, hora, obs });
  save();
  ['ag-paciente', 'ag-data', 'ag-hora', 'ag-obs'].forEach(id => u.$(id).value = '');
  renderConsultas();
  u.toast('Consulta agendada!');
}

function excluirConsulta(id) {
  state.consultas = state.consultas.filter(c => c.id !== id);
  save();
  renderConsultas();
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
function populateProntSelect() {
  populatePacienteSelects();
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
  renderHistoricoProntuario(pid);
}

function salvarProntuario() {
  const pid = u.$('pront-paciente').value;
  const txt = u.$('pront-texto').value.trim();
  const data = u.$('pront-data-sessao').value.trim();

  if (!pid || !txt) { u.toast('Selecione o paciente e escreva a anotação.'); return; }

  if (!state.prontuarios[pid]) state.prontuarios[pid] = [];
  state.prontuarios[pid].push({ data: data || new Date().toLocaleDateString('pt-BR'), texto: txt, ts: Date.now() });
  save();
  u.$('pront-texto').value = '';
  u.$('pront-data-sessao').value = '';
  renderHistoricoProntuario(pid);
  u.toast('Anotação salva!');
}

function renderHistoricoProntuario(pid) {
  const hist = (state.prontuarios[pid] || []).slice().reverse();
  const el = u.$('pront-historico');

  el.innerHTML = hist.length ? hist.map(h => `<div style="border-bottom:1px solid var(--border);padding:14px 0;">
    <div style="font-size:.78rem;font-weight:600;color:var(--primary);margin-bottom:5px;">📅 ${h.data}</div>
    <p style="font-size:.88rem;line-height:1.6;white-space:pre-wrap;">${h.texto}</p></div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhuma anotação registrada.</p>';
}

function simularAnexo(input) {
  const pid = u.$('pront-paciente').value;
  if (!pid) { u.toast('Selecione o paciente primeiro.'); return; }

  if (!state.anexos[pid]) state.anexos[pid] = [];
  Array.from(input.files).forEach(f => {
    state.anexos[pid].push({ nome: f.name, size: f.size, data: new Date().toLocaleDateString('pt-BR') });
  });
  save();

  u.$('anexos-lista').innerHTML = (state.anexos[pid] || [])
    .map(a => `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--blush);border-radius:6px;padding:4px 10px;font-size:.78rem;margin:3px;">📎 ${a.nome}</div>`)
    .join('');
  u.toast('Arquivo(s) anexado(s)!');
  input.value = '';
}

// ====== FINANCEIRO ======
function abrirModalSessao() {
  populatePacienteSelects();
  u.$('modal-overlay').style.display = 'flex';
  u.$('sess-data').value = new Date().toISOString().split('T')[0];
}

function fecharModal() {
  u.$('modal-overlay').style.display = 'none';
}

function salvarSessao() {
  const { pid, data, valor, stat } = {
    pid: u.$('sess-paciente').value,
    data: u.$('sess-data').value,
    valor: u.$('sess-valor').value,
    stat: u.$('sess-status').value,
  };
  if (!pid || !data || !valor) { u.toast('Preencha todos os campos.'); return; }

  state.sessoes.push({ id: Date.now(), pacienteId: parseInt(pid), data, valor: parseFloat(valor), status: stat, receitaSaude: false });
  save();
  fecharModal();
  renderFinanceiro();
  u.toast('Sessão registrada!');
}

function toggleStatus(id) {
  const s = state.sessoes.find(s => s.id === id);
  s && (s.status = s.status === 'Pago' ? 'Pendente' : 'Pago', save(), renderFinanceiro());
}

function toggleReceita(id) {
  const s = state.sessoes.find(s => s.id === id);
  s && (s.receitaSaude = !s.receitaSaude, save(), renderFinanceiro());
}

function excluirSessao(id) {
  state.sessoes = state.sessoes.filter(s => s.id !== id);
  save();
  renderFinanceiro();
}

function populateFinanceiroSelects() {
  populatePacienteSelects();
}

function renderFinanceiro() {
  const filterPac = u.$('fin-filter-pac')?.value;
  const filterStatus = u.$('fin-filter-status')?.value;
  let lista = [...state.sessoes].sort((a, b) => b.data.localeCompare(a.data));

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
      <td><button class="badge ${s.status === 'Pago' ? 'badge-green' : 'badge-amber'}" onclick="toggleStatus(${s.id})" style="cursor:pointer;border:none;font-size:.75rem;padding:4px 12px;">${s.status}</button></td>
      <td><label class="toggle-wrap" style="cursor:pointer;"><label class="toggle"><input type="checkbox" ${s.receitaSaude ? 'checked' : ''} onchange="toggleReceita(${s.id})"><span class="toggle-slider"></span></label><span style="font-size:.82rem;color:${s.receitaSaude ? 'var(--primary)' : 'var(--ink-soft)'};">${s.receitaSaude ? 'Emitido' : 'Pendente'}</span></label></td>
      <td><button class="btn btn-danger btn-sm" onclick="excluirSessao(${s.id})">✕</button></td>
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
(() => {
  const activeEmail = sessionStorage.getItem('psicare_active_user');
  if (activeEmail && USERS[activeEmail]) {
    currentUser = USERS[activeEmail];
    loadUserData();
    updateUI();
    u.$('login-screen').style.display = 'none';
    u.$('app-wrapper').style.display = 'flex';
    renderDashboard();
  }
})();

u.$('modal-overlay').addEventListener('click', e => e.target === e.currentTarget && fecharModal());
u.$('sess-paciente').addEventListener('change', function () {
  const pac = state.pacientes.find(p => p.id == this.value);
  pac && (u.$('sess-valor').value = parseFloat(pac.valor).toFixed(2));
});
u.$$('input[data-mask="cpf"]').forEach(el => el.addEventListener('input', () => el.value = u.fmt(el.value, 'cpf')));