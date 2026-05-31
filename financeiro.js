import { _supabase } from './supabaseClient.js';
import { u } from './utils.js';
import { state } from './state.js';
import { escapeHtml } from './security.js';
import { escapeHtml } from './security.js';
import { escapeHtml } from './security.js';

export async function carregarSessoes() {
  if (!state.currentUser) return;
  const { data, error } = await _supabase
    .from('sessoes').select('*').eq('psicologa_id', state.currentUser.id).order('data', { ascending: false });

  if (!error) {
    state.sessoes = (data || []).map(s => ({
      id: s.id, pacienteId: s.paciente_id, data: s.data, valor: s.valor,
      status: s.status_pagamento ? 'Pago' : 'Pendente', receitaSaude: s.status_receita
    }));
    renderFinanceiro();
  }
}

export function abrirModalSessao() {
  u.$('sess-data').value = new Date().toISOString().split('T')[0];
  u.$('modal-overlay').style.display = 'flex';
}

export function fecharModal() {
  u.$('modal-overlay').style.display = 'none';
  ['sess-paciente', 'sess-valor', 'sess-data'].forEach(id => u.$(id).value = '');
}

export async function salvarSessao() {
  const pacId = u.$('sess-paciente').value;
  const data = u.$('sess-data').value;
  const valor = u.$('sess-valor').value;
  const status = u.$('sess-status').value;

  if (!pacId || !data || !valor) { u.toast('Preencha os campos obrigatórios.'); return; }

  const { error } = await _supabase.from('sessoes').insert([{
    paciente_id: pacId, psicologa_id: state.currentUser.id, data,
    valor: parseFloat(valor), status_pagamento: status === 'Pago', status_receita: false
  }]);

  if (!error) { fecharModal(); await carregarSessoes(); u.toast('Sessão registrada!'); }
}

export async function toggleStatus(id) {
  const sessao = state.sessoes.find(s => s.id === id);
  if (!sessao) return;
  const novoStatus = sessao.status !== 'Pago';
  const { error } = await _supabase.from('sessoes').update({ status_pagamento: novoStatus }).eq('id', id);
  if (!error) await carregarSessoes();
}

export async function toggleReceita(id) {
  const sessao = state.sessoes.find(s => s.id === id);
  if (!sessao) return;
  const { error } = await _supabase.from('sessoes').update({ status_receita: !sessao.receitaSaude }).eq('id', id);
  if (!error) await carregarSessoes();
}

export async function excluirSessao(id) {
  if(!confirm('Excluir esta sessão?')) return;
  const { error } = await _supabase.from('sessoes').delete().eq('id', id);
  if (!error) { await carregarSessoes(); u.toast('Sessão excluída.'); }
}

export function renderFinanceiro() {
  const filterPac = u.$('fin-filter-pac')?.value;
  const filterStatus = u.$('fin-filter-status')?.value;
  let lista = [...state.sessoes];

  if (filterPac) lista = lista.filter(s => s.pacienteId == filterPac);
  if (filterStatus && filterStatus !== "Todos" && filterStatus !== "") lista = lista.filter(s => s.status === filterStatus);

  const tbody = u.$('fin-tbody');
  if (!tbody) return;
  if (!lista.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:28px;">Nenhuma sessão registrada.</td></tr>'; return; }

  tbody.innerHTML = lista.map(s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    return `<tr><td><strong>${escapeHtml(pac?.nome || '—')}</strong></td><td>${u.fmt(s.data, 'data')}</td><td style="font-weight:600;">${u.fmt(s.valor, 'moeda')}</td>
      <td><button class="badge ${s.status === 'Pago' ? 'badge-green' : 'badge-amber'}" onclick="toggleStatus('${s.id}')" style="cursor:pointer;border:none;font-size:.75rem;padding:4px 12px;">${s.status}</button></td>
      <td><label class="toggle-wrap" style="cursor:pointer;"><label class="toggle"><input type="checkbox" ${s.receitaSaude ? 'checked' : ''} onchange="toggleReceita('${s.id}')"><span class="toggle-slider"></span></label><span style="font-size:.82rem;color:${s.receitaSaude ? 'var(--primary)' : 'var(--ink-soft)'};">${s.receitaSaude ? 'Emitido' : 'Pendente'}</span></label></td>
      <td><button class="btn btn-danger btn-sm" onclick="excluirSessao('${s.id}')">✕</button></td></tr>`;
  }).join('');
}