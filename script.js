// ======= CONFIGURAÇÃO DE USUÁRIOS =======
const USERS = {
  "psi.naty@gmail.com": {
    password: "1234",
    name: "Dra. Natália Trindade",
    crp: "05/75997",
    avatar: "N",
    storageKey: "psicare_data_naty"
  },
  // Você pode adicionar as outras psicólogas aqui seguindo o mesmo modelo:
  /*
  "email2@gmail.com": {
    password: "senha",
    name: "Dra. Nome Sobrenome",
    crp: "00/00000",
    avatar: "I",
    storageKey: "psicare_data_user2"
  }
  */
};

// ======= STATE =======
let state = {
  pacientes: [],
  consultas: [],
  sessoes: [],
  prontuarios: {},
  anexos: {}
};

let currentUser = null;

// ======= LOGIN / LOGOUT =======
function fazerLogin(event) {
  if (event) event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');
  
  const user = USERS[email];
  
  if (user && user.password === senha) {
    currentUser = user;
    sessionStorage.setItem('psicare_active_user', email);
    
    // Carregar dados específicos do usuário
    loadUserData();
    
    // Atualizar UI
    document.getElementById('user-nome').textContent = user.name;
    document.getElementById('user-crp').textContent = `Psicóloga CRP ${user.crp}`;
    document.getElementById('user-avatar').textContent = user.avatar;
    document.querySelector('.page-header h2').textContent = `Bom dia, Dra. ${user.name.split(' ')[1]} ✿`;
    
    // Trocar telas
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    
    renderDashboard();
    toast('Login realizado com sucesso!');
  } else {
    erroEl.textContent = "E-mail ou senha incorretos.";
    erroEl.style.display = 'block';
  }
}

function fazerLogout() {
  sessionStorage.removeItem('psicare_active_user');
  currentUser = null;
  
  // Limpar campos de login
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
  document.getElementById('login-erro').style.display = 'none';
  
  // Trocar telas
  document.getElementById('app-wrapper').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  
  toast('Sessão encerrada.');
}

function loadUserData() {
  if (!currentUser) return;
  
  const saved = localStorage.getItem(currentUser.storageKey);
  if (saved) {
    state = JSON.parse(saved);
  } else {
    // Resetar estado se não houver dados salvos para este usuário
    state = {
      pacientes: [],
      consultas: [],
      sessoes: [],
      prontuarios: {},
      anexos: {}
    };
    // Opcional: Adicionar dados demo apenas se for o primeiro login da Dra. Natália
    if (currentUser.storageKey === "psicare_data_naty") seedDemoData();
  }
  
  // Garantir que as propriedades existem
  if (!state.prontuarios) state.prontuarios = {};
  if (!state.anexos) state.anexos = {};
}

function save() {
  if (currentUser) {
    try { 
      localStorage.setItem(currentUser.storageKey, JSON.stringify(state)); 
    } catch(e) {
      console.error("Erro ao salvar dados:", e);
    }
  }
}

function seedDemoData() {
  state.pacientes = [
    { id: 1001, nome: 'Mariana Oliveira', cpf: '123.456.789-00', cpfResp: '', valor: 200, tel: '(11) 98765-4321' },
    { id: 1002, nome: 'Pedro Henrique Costa', cpf: '987.654.321-00', cpfResp: '111.222.333-44', valor: 180, tel: '(11) 91234-5678' },
    { id: 1003, nome: 'Sofia Ramos', cpf: '456.789.123-00', cpfResp: '', valor: 220, tel: '' },
  ];
  const hoje = new Date();
  const fmt  = d => d.toISOString().split('T')[0];
  const d1   = new Date(hoje); d1.setDate(hoje.getDate()+1);
  const d2   = new Date(hoje); d2.setDate(hoje.getDate()+3);
  state.consultas = [
    { id: 201, pacienteId: 1001, data: fmt(d1), hora: '09:00', obs: 'Online' },
    { id: 202, pacienteId: 1002, data: fmt(d2), hora: '14:30', obs: 'Presencial' },
    { id: 203, pacienteId: 1003, data: fmt(hoje), hora: '11:00', obs: 'Presencial' },
  ];
  const m = (hoje.getMonth()+1).toString().padStart(2,'0');
  const y = hoje.getFullYear();
  state.sessoes = [
    { id: 301, pacienteId: 1001, data: `${y}-${m}-02`, valor: 200, status: 'Pago',     receitaSaude: true },
    { id: 302, pacienteId: 1002, data: `${y}-${m}-05`, valor: 180, status: 'Pago',     receitaSaude: false },
    { id: 303, pacienteId: 1003, data: `${y}-${m}-08`, valor: 220, status: 'Pendente', receitaSaude: false },
    { id: 304, pacienteId: 1001, data: `${y}-${m}-10`, valor: 200, status: 'Pendente', receitaSaude: false },
  ];
}

// ======= NAVIGATION =======
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  if(page === 'dashboard') renderDashboard();
  if(page === 'pacientes') renderPacientes();
  if(page === 'agenda') { populatePacienteSelects(); renderConsultas(); }
  if(page === 'prontuario') { populateProntSelect(); }
  if(page === 'financeiro') { populateFinanceiroSelects(); renderFinanceiro(); }
  if(page === 'relatorios') {}
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// ======= UTILS =======
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function maskCPF(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  v = v.replace(/(\d{3})(\d)/,'$1.$2');
  v = v.replace(/(\d{3})(\d)/,'$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  el.value = v;
}

function fmtMoeda(v) {
  return 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',');
}

function fmtData(d) {
  if(!d) return '';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

// ======= DASHBOARD =======
function renderDashboard() {
  const hoje = new Date();
  const semStart = new Date(hoje); semStart.setDate(hoje.getDate() - hoje.getDay());
  const semEnd   = new Date(semStart); semEnd.setDate(semStart.getDate() + 6);

  document.getElementById('stat-pacientes').textContent = state.pacientes.length;

  const sesSemana = state.consultas.filter(c => {
    const d = new Date(c.data + 'T12:00');
    return d >= semStart && d <= semEnd;
  }).length;
  document.getElementById('stat-semana').textContent = sesSemana;

  const mesAtual = (hoje.getMonth()+1).toString().padStart(2,'0');
  const anoAtual = hoje.getFullYear().toString();

  let recMes = 0, pendMes = 0;
  state.sessoes.forEach(s => {
    if(!s.data) return;
    const [y,m] = s.data.split('-');
    if(y === anoAtual && m === mesAtual) {
      if(s.status === 'Pago') recMes += parseFloat(s.valor)||0;
      else pendMes += parseFloat(s.valor)||0;
    }
  });
  document.getElementById('stat-recebido').textContent = fmtMoeda(recMes);
  document.getElementById('stat-pendente').textContent = fmtMoeda(pendMes);

  // Próximas consultas
  const proximas = [...state.consultas]
    .filter(c => new Date(c.data + 'T' + c.hora) >= new Date())
    .sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora))
    .slice(0,4);

  const dpEl = document.getElementById('dash-proximas');
  if(proximas.length === 0) {
    dpEl.innerHTML = '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhuma consulta agendada.</p>';
  } else {
    dpEl.innerHTML = proximas.map(c => {
      const pac = state.pacientes.find(p => p.id == c.pacienteId);
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:.88rem;font-weight:500;">${pac ? pac.nome : '—'}</div>
          <div style="font-size:.78rem;color:var(--ink-soft);">${fmtData(c.data)} às ${c.hora}</div>
        </div>
        <span class="badge badge-blue">${c.obs || 'Consulta'}</span>
      </div>`;
    }).join('');
  }

  // Pagamentos pendentes
  const pendentes = state.sessoes.filter(s => s.status === 'Pendente').slice(0,5);
  const ppEl = document.getElementById('dash-pendentes');
  if(pendentes.length === 0) {
    ppEl.innerHTML = '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhum pagamento pendente. ✓</p>';
  } else {
    ppEl.innerHTML = pendentes.map(s => {
      const pac = state.pacientes.find(p => p.id == s.pacienteId);
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:.88rem;font-weight:500;">${pac ? pac.nome : '—'}</div>
          <div style="font-size:.78rem;color:var(--ink-soft);">${fmtData(s.data)}</div>
        </div>
        <span style="font-weight:600;color:#c0392b;font-size:.88rem;">${fmtMoeda(s.valor)}</span>
      </div>`;
    }).join('');
  }
}

// ======= PACIENTES =======
function salvarPaciente() {
  const nome  = document.getElementById('pac-nome').value.trim();
  const cpf   = document.getElementById('pac-cpf').value.trim();
  const cpfR  = document.getElementById('pac-cpf-resp').value.trim();
  const valor = document.getElementById('pac-valor').value;
  const tel   = document.getElementById('pac-tel').value.trim();
  const idx   = document.getElementById('pac-edit-idx').value;

  if(!nome || !cpf || !valor) { toast('Preencha os campos obrigatórios.'); return; }

  if(idx !== '') {
    state.pacientes[parseInt(idx)] = { ...state.pacientes[parseInt(idx)], nome, cpf, cpfResp: cpfR, valor, tel };
    toast('Paciente atualizado!');
  } else {
    state.pacientes.push({ id: Date.now(), nome, cpf, cpfResp: cpfR, valor, tel });
    toast('Paciente cadastrado!');
  }
  save(); limparFormPaciente(); renderPacientes();
}

function limparFormPaciente() {
  ['pac-nome','pac-cpf','pac-cpf-resp','pac-valor','pac-tel'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pac-edit-idx').value = '';
  document.getElementById('pac-form-title').textContent = 'Novo Paciente';
}

function editarPaciente(idx) {
  const p = state.pacientes[idx];
  document.getElementById('pac-nome').value   = p.nome;
  document.getElementById('pac-cpf').value    = p.cpf;
  document.getElementById('pac-cpf-resp').value = p.cpfResp || '';
  document.getElementById('pac-valor').value  = p.valor;
  document.getElementById('pac-tel').value    = p.tel || '';
  document.getElementById('pac-edit-idx').value = idx;
  document.getElementById('pac-form-title').textContent = 'Editar Paciente';
  window.scrollTo(0,0);
}

function excluirPaciente(idx) {
  if(!confirm('Excluir este paciente?')) return;
  state.pacientes.splice(idx,1);
  save(); renderPacientes();
}

function renderPacientes() {
  const q = (document.getElementById('pac-search')?.value || '').toLowerCase();
  const filtered = state.pacientes.filter(p => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  const tbody = document.getElementById('pac-tbody');
  if(filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:28px;">Nenhum paciente encontrado.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((p,i) => {
    const realIdx = state.pacientes.indexOf(p);
    return `<tr>
      <td><strong style="font-weight:500;">${p.nome}</strong>${p.cpfResp ? '<br><small style="color:var(--ink-soft);">Resp. cadastrado</small>' : ''}</td>
      <td style="font-size:.82rem;">${p.cpf}</td>
      <td style="font-weight:600;color:var(--primary);">${fmtMoeda(p.valor)}</td>
      <td style="font-size:.82rem;color:var(--ink-soft);">${p.tel || '—'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editarPaciente(${realIdx})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="excluirPaciente(${realIdx})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ======= AGENDA =======
function populatePacienteSelects() {
  ['ag-paciente','sess-paciente','pront-paciente','fin-filter-pac'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const isFilter = id === 'fin-filter-pac';
    el.innerHTML = isFilter
      ? '<option value="">Todos os pacientes</option>'
      : '<option value="">Selecione um paciente…</option>';
    state.pacientes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nome;
      el.appendChild(opt);
    });
  });
}

function salvarConsulta() {
  const pacId = document.getElementById('ag-paciente').value;
  const data  = document.getElementById('ag-data').value;
  const hora  = document.getElementById('ag-hora').value;
  const obs   = document.getElementById('ag-obs').value.trim();
  if(!pacId || !data || !hora) { toast('Preencha todos os campos.'); return; }
  state.consultas.push({ id: Date.now(), pacienteId: parseInt(pacId), data, hora, obs });
  save(); renderConsultas(); toast('Consulta agendada!');
  document.getElementById('ag-paciente').value = '';
  document.getElementById('ag-data').value = '';
  document.getElementById('ag-hora').value = '';
  document.getElementById('ag-obs').value = '';
}

function excluirConsulta(id) {
  state.consultas = state.consultas.filter(c => c.id !== id);
  save(); renderConsultas();
}

function renderConsultas() {
  const filter = document.getElementById('ag-filter')?.value;
  const hoje   = new Date(); hoje.setHours(0,0,0,0);
  let lista = [...state.consultas].sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
  if(filter === 'today') lista = lista.filter(c => c.data === hoje.toISOString().split('T')[0]);
  if(filter === 'week') {
    const semEnd = new Date(hoje); semEnd.setDate(hoje.getDate()+7);
    lista = lista.filter(c => { const d = new Date(c.data+'T12:00'); return d >= hoje && d <= semEnd; });
  }
  const el = document.getElementById('ag-lista');
  if(lista.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:.85rem;padding:10px 0;">Nenhuma consulta encontrada.</p>';
    return;
  }
  el.innerHTML = lista.map(c => {
    const pac = state.pacientes.find(p => p.id == c.pacienteId);
    const past = new Date(c.data + 'T' + c.hora) < new Date();
    return `<div class="appointment-card" style="${past ? 'opacity:.55;' : ''}">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="background:var(--sand-light);border-radius:8px;padding:8px 12px;text-align:center;min-width:52px;">
          <div style="font-size:.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(c.data+'T12:00').getDay()]}</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--ink);line-height:1.1;">${c.data.split('-')[2]}</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:.93rem;">${pac ? pac.nome : '—'}</div>
          <div style="font-size:.8rem;color:var(--ink-soft);">${c.hora} · ${c.obs || 'Consulta'}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${past ? '<span class="badge badge-gray">Realizada</span>' : '<span class="badge badge-green">Agendada</span>'}
        <button class="btn btn-danger btn-sm" onclick="excluirConsulta(${c.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ======= PRONTUÁRIO =======
function populateProntSelect() {
  populatePacienteSelects();
  const el = document.getElementById('pront-paciente');
  if(!el) return;
  el.innerHTML = '<option value="">Selecione um paciente…</option>';
  state.pacientes.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nome;
    el.appendChild(opt);
  });
}

function carregarProntuario() {
  const pid = document.getElementById('pront-paciente').value;
  const area = document.getElementById('pront-area');
  const info = document.getElementById('pront-info');
  if(!pid) { area.style.display='none'; info.style.display='none'; return; }
  const pac = state.pacientes.find(p => p.id == pid);
  info.style.display = 'block';
  document.getElementById('pront-info-text').innerHTML = `<strong>${pac.nome}</strong> &nbsp;·&nbsp; CPF: ${pac.cpf}${pac.cpfResp ? ` &nbsp;·&nbsp; Resp: ${pac.cpfResp}` : ''} &nbsp;·&nbsp; Sessão: ${fmtMoeda(pac.valor)}`;
  area.style.display = 'block';
  document.getElementById('pront-texto').value = '';
  document.getElementById('pront-data-sessao').value = '';
  renderHistoricoProntuario(pid);
}

function salvarProntuario() {
  const pid  = document.getElementById('pront-paciente').value;
  const txt  = document.getElementById('pront-texto').value.trim();
  const data = document.getElementById('pront-data-sessao').value.trim();
  if(!pid || !txt) { toast('Selecione o paciente e escreva a anotação.'); return; }
  if(!state.prontuarios[pid]) state.prontuarios[pid] = [];
  state.prontuarios[pid].push({ data: data || new Date().toLocaleDateString('pt-BR'), texto: txt, ts: Date.now() });
  save();
  document.getElementById('pront-texto').value = '';
  document.getElementById('pront-data-sessao').value = '';
  renderHistoricoProntuario(pid);
  toast('Anotação salva!');
}

function renderHistoricoProntuario(pid) {
  const hist = (state.prontuarios[pid] || []).slice().reverse();
  const el = document.getElementById('pront-historico');
  if(hist.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhuma anotação registrada.</p>';
    return;
  }
  el.innerHTML = hist.map(h => `
    <div style="border-bottom:1px solid var(--border);padding:14px 0;">
      <div style="font-size:.78rem;font-weight:600;color:var(--primary);margin-bottom:5px;">📅 ${h.data}</div>
      <p style="font-size:.88rem;line-height:1.6;white-space:pre-wrap;">${h.texto}</p>
    </div>
  `).join('');
}

function simularAnexo(input) {
  const pid = document.getElementById('pront-paciente').value;
  if(!pid) { toast('Selecione o paciente primeiro.'); return; }
  if(!state.anexos[pid]) state.anexos[pid] = [];
  Array.from(input.files).forEach(f => {
    state.anexos[pid].push({ nome: f.name, size: f.size, data: new Date().toLocaleDateString('pt-BR') });
  });
  save();
  const el = document.getElementById('anexos-lista');
  el.innerHTML = (state.anexos[pid] || []).map(a =>
    `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--blush);border-radius:6px;padding:4px 10px;font-size:.78rem;margin:3px;">
      📎 ${a.nome}
    </div>`
  ).join('');
  toast('Arquivo(s) anexado(s)!');
  input.value = '';
}

// ======= FINANCEIRO =======
function abrirModalSessao() {
  populatePacienteSelects();
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('sess-data').value = new Date().toISOString().split('T')[0];
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function salvarSessao() {
  const pid   = document.getElementById('sess-paciente').value;
  const data  = document.getElementById('sess-data').value;
  const valor = document.getElementById('sess-valor').value;
  const stat  = document.getElementById('sess-status').value;
  if(!pid || !data || !valor) { toast('Preencha todos os campos.'); return; }
  state.sessoes.push({ id: Date.now(), pacienteId: parseInt(pid), data, valor: parseFloat(valor), status: stat, receitaSaude: false });
  save(); fecharModal(); renderFinanceiro();
  // auto-fill valor from patient
  toast('Sessão registrada!');
}

function toggleStatus(id) {
  const s = state.sessoes.find(s => s.id === id);
  if(s) { s.status = s.status === 'Pago' ? 'Pendente' : 'Pago'; save(); renderFinanceiro(); }
}

function toggleReceita(id) {
  const s = state.sessoes.find(s => s.id === id);
  if(s) { s.receitaSaude = !s.receitaSaude; save(); renderFinanceiro(); }
}

function excluirSessao(id) {
  state.sessoes = state.sessoes.filter(s => s.id !== id);
  save(); renderFinanceiro();
}

function populateFinanceiroSelects() {
  populatePacienteSelects();
}

function renderFinanceiro() {
  const filterPac    = document.getElementById('fin-filter-pac')?.value;
  const filterStatus = document.getElementById('fin-filter-status')?.value;

  let lista = [...state.sessoes].sort((a,b) => b.data.localeCompare(a.data));
  if(filterPac)    lista = lista.filter(s => s.pacienteId == filterPac);
  if(filterStatus) lista = lista.filter(s => s.status === filterStatus);

  const tbody = document.getElementById('fin-tbody');
  if(lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:28px;">Nenhuma sessão registrada.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    return `<tr>
      <td><strong style="font-weight:500;">${pac ? pac.nome : '—'}</strong></td>
      <td style="white-space:nowrap;">${fmtData(s.data)}</td>
      <td style="font-weight:600;">${fmtMoeda(s.valor)}</td>
      <td>
        <button class="badge ${s.status === 'Pago' ? 'badge-green' : 'badge-amber'}"
          onclick="toggleStatus(${s.id})" style="cursor:pointer;border:none;font-size:.75rem;padding:4px 12px;">
          ${s.status}
        </button>
      </td>
      <td>
        <label class="toggle-wrap" style="cursor:pointer;">
          <label class="toggle">
            <input type="checkbox" ${s.receitaSaude ? 'checked' : ''} onchange="toggleReceita(${s.id})">
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:.82rem;color:${s.receitaSaude ? 'var(--primary)' : 'var(--ink-soft)'};">
            ${s.receitaSaude ? 'Emitido' : 'Pendente'}
          </span>
        </label>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="excluirSessao(${s.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ======= RELATÓRIOS =======
function gerarRelatorio() {
  const mes    = document.getElementById('rel-mes').value;
  const ano    = document.getElementById('rel-ano').value;
  const status = document.getElementById('rel-status').value;

  let lista = state.sessoes.filter(s => {
    if(!s.data) return false;
    const [y,m] = s.data.split('-');
    return y === ano && m === mes;
  });
  if(status) lista = lista.filter(s => s.status === status);
  lista.sort((a,b) => a.data.localeCompare(b.data));

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('rel-titulo').textContent = `${meses[parseInt(mes)-1]} / ${ano}`;

  const total = lista.reduce((acc,s) => acc + (parseFloat(s.valor)||0), 0);
  document.getElementById('rel-total').textContent = `Total: ${fmtMoeda(total)}`;

  const tbody = document.getElementById('rel-tbody');
  if(lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:24px;">Nenhum registro para este período.</td></tr>';
  } else {
    tbody.innerHTML = lista.map(s => {
      const pac = state.pacientes.find(p => p.id == s.pacienteId);
      const cpfDecl = (pac && pac.cpfResp) ? pac.cpfResp : (pac ? pac.cpf : '—');
      return `<tr>
        <td>${pac ? pac.nome : '—'}</td>
        <td style="font-family:monospace;font-size:.85rem;">${cpfDecl}</td>
        <td>${fmtData(s.data)}</td>
        <td style="font-weight:600;color:var(--primary);">${fmtMoeda(s.valor)}</td>
      </tr>`;
    }).join('');
  }

  document.getElementById('rel-resultado').style.display = 'block';
}

function copiarTabela() {
  const table = document.getElementById('rel-table');
  let text = '';
  table.querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.querySelectorAll('th,td')).map(c => c.textContent.trim());
    text += cells.join('\t') + '\n';
  });
  navigator.clipboard.writeText(text).then(() => toast('Tabela copiada para a área de transferência!'));
}

// ======= INIT =======
(function init() {
  const activeEmail = sessionStorage.getItem('psicare_active_user');
  if (activeEmail && USERS[activeEmail]) {
    currentUser = USERS[activeEmail];
    loadUserData();
    
    // Atualizar UI
    document.getElementById('user-nome').textContent = currentUser.name;
    document.getElementById('user-crp').textContent = `Psicóloga CRP ${currentUser.crp}`;
    document.getElementById('user-avatar').textContent = currentUser.avatar;
    document.querySelector('.page-header h2').textContent = `Bom dia, Dra. ${currentUser.name.split(' ')[1]} ✿`;
    
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    renderDashboard();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-wrapper').style.display = 'none';
  }
})();

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if(e.target === this) fecharModal();
});

// Auto-fill valor from patient in session modal
document.getElementById('sess-paciente').addEventListener('change', function() {
  const pac = state.pacientes.find(p => p.id == this.value);
  if(pac) document.getElementById('sess-valor').value = parseFloat(pac.valor).toFixed(2);
});
