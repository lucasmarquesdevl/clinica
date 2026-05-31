import { _supabase } from './supabaseClient.js';
import { u } from './utils.js';
import { state } from './state.js';
import { escapeHtml } from './security.js';

export async function carregarPacientes() {
  if (!state.currentUser) return;
  const { data, error } = await _supabase
    .from('pacientes')
    .select('*')
    .eq('psicologa_id', state.currentUser.id)
    .order('nome', { ascending: true });

  if (!error) {
    state.pacientes = (data || []).map(p => ({
      id: p.id, nome: p.nome, cpf: p.cpf, cpfResp: p.cpf_responsavel, 
      valor: p.valor_sessao, tel: p.telefone
    }));
    if (typeof window.renderPacientes === 'function') window.renderPacientes();
    window.dispatchEvent(new CustomEvent('data:pacientes-loaded'));
  }
}

export function renderPacientes() {
  const q = (u.$('pac-search')?.value || '').toLowerCase();
  const filtered = state.pacientes.filter(p => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  const tbody = u.$('pac-tbody');
  if (!tbody) return;

  tbody.innerHTML = filtered.map((p, i) => `
    <tr>
      <td><strong>${escapeHtml(p.nome)}</strong></td>
      <td>${escapeHtml(p.cpf)}</td>
      <td style="font-weight:600;">${u.fmt(p.valor, 'moeda')}</td>
      <td>${escapeHtml(p.tel || '—')}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editarPaciente(${state.pacientes.indexOf(p)})">Editar</button>
      </td>
    </tr>
  `).join('');
}

export async function salvarPaciente() {
  const nome = u.$('pac-nome').value.trim();
  const cpf = u.$('pac-cpf').value.trim();
  const cpfResp = u.$('pac-cpf-resp').value.trim();
  const valor = u.$('pac-valor').value;
  const tel = u.$('pac-tel').value.trim();
  const idx = u.$('pac-edit-idx').value;

  const dados = {
    nome, cpf, 
    cpf_responsavel: cpfResp,
    valor_sessao: parseFloat(valor),
    telefone: tel,
    psicologa_id: state.currentUser.id
  };

  let res;
  if (idx !== '') {
    res = await _supabase.from('pacientes').update(dados).eq('id', state.pacientes[idx].id);
  } else {
    res = await _supabase.from('pacientes').insert([dados]);
  }

  if (!res.error) {
    u.toast('Salvo com sucesso!');
    limparFormPaciente();
    await carregarPacientes();
  }
}

export function limparFormPaciente() {
  ['pac-nome', 'pac-cpf', 'pac-cpf-resp', 'pac-valor', 'pac-tel'].forEach(id => u.$(id).value = '');
  u.$('pac-edit-idx').value = '';
  u.$('pac-form-title').textContent = 'Novo Paciente';
}

export function editarPaciente(idx) {
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