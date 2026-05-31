import { _supabase } from '../supabaseClient.js';
import { u } from '../utils.js';
import { state } from '../state.js';

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
    renderPacientes();
    // Dispara evento para outros módulos que dependem da lista de pacientes
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
      <td><strong>${p.nome}</strong></td>
      <td>${p.cpf}</td>
      <td style="font-weight:600;">${u.fmt(p.valor, 'moeda')}</td>
      <td>${p.tel || '—'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editarPaciente(${state.pacientes.indexOf(p)})">Editar</button>
      </td>
    </tr>
  `).join('');
}

export async function salvarPaciente() {
  const nome = u.$('pac-nome').value.trim();
  const cpf = u.$('pac-cpf').value.trim();
  const valor = u.$('pac-valor').value;
  const idx = u.$('pac-edit-idx').value;

  const dados = {
    nome, cpf, valor_sessao: parseFloat(valor),
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
  ['pac-nome', 'pac-cpf', 'pac-valor'].forEach(id => u.$(id).value = '');
  u.$('pac-edit-idx').value = '';
  u.$('pac-form-title').textContent = 'Novo Paciente';
}

export function editarPaciente(idx) {
  const p = state.pacientes[idx];
  u.$('pac-nome').value = p.nome;
  u.$('pac-edit-idx').value = idx;
}