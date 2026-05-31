import { _supabase } from './supabaseClient.js';
import { u } from './utils.js';
import { state } from './state.js';
import { escapeHtml } from './security.js';

export async function carregarConsultas() {
  if (!state.currentUser) return;
  const { data, error } = await _supabase
    .from('consultas')
    .select('*')
    .eq('psicologa_id', state.currentUser.id)
    .order('data', { ascending: true });

  if (!error) {
    state.consultas = (data || []).map(c => ({
      id: c.id, pacienteId: c.paciente_id, data: c.data, hora: c.hora, obs: c['observacao'], status: c.status || 'Agendada'
    }));
    renderConsultas();
  }
}

export async function salvarConsulta() {
  const pacId = u.$('ag-paciente').value;
  const data = u.$('ag-data').value;
  const hora = u.$('ag-hora').value;
  const obs = u.$('ag-obs').value.trim();
  const status = u.$('ag-status').value;

  if (!pacId || !data || !hora) { u.toast('Preencha todos os campos.'); return; }

  const { error } = await _supabase.from('consultas').insert([{
    paciente_id: pacId, psicologa_id: state.currentUser.id, data, hora, observacao: obs, status
  }]);

  if (!error) {
    ['ag-paciente', 'ag-data', 'ag-hora', 'ag-obs'].forEach(id => u.$(id).value = '');
    await carregarConsultas();
    u.toast('Consulta agendada!');
  }
}

export async function alterarStatusConsulta(id, novoStatus) {
  const { error } = await _supabase.from('consultas').update({ status: novoStatus }).eq('id', id);
  if (!error) { await carregarConsultas(); u.toast('Status atualizado!'); }
}

export async function excluirConsulta(id) {
  if(!confirm('Excluir esta consulta?')) return;
  const { error } = await _supabase.from('consultas').delete().eq('id', id);
  if (!error) { await carregarConsultas(); u.toast('Consulta excluída.'); }
}

export function renderConsultas() {
  const filter = u.$('ag-filter')?.value;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let lista = [...state.consultas].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  if (filter === 'today') lista = lista.filter(c => c.data === hoje.toISOString().split('T')[0]);
  if (filter === 'week') {
    const semEnd = new Date(hoje); semEnd.setDate(hoje.getDate() + 7);
    lista = lista.filter(c => { const d = new Date(c.data + 'T12:00'); return d >= hoje && d <= semEnd; });
  }

  const el = u.$('ag-lista');
  if (!el) return;
  if (!lista.length) { el.innerHTML = '<p style="color:var(--ink-soft);font-size:.85rem;padding:10px 0;">Nenhuma consulta encontrada.</p>'; return; }

  el.innerHTML = lista.map(c => {
    const pac = state.pacientes.find(p => p.id == c.pacienteId);
    const past = new Date(c.data + 'T' + c.hora) < new Date();
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `<div class="appointment-card" style="${past ? 'opacity:.55;' : ''}" data-id="${c.id}">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="background:var(--sand-light);border-radius:8px;padding:8px 12px;text-align:center;min-width:52px;">
          <div style="font-size:.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${dias[new Date(c.data + 'T12:00').getDay()]}</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--ink);line-height:1.1;">${c.data.split('-')[2]}</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:.93rem;">${escapeHtml(pac?.nome || '—')}</div>
          <div style="font-size:.8rem;color:var(--ink-soft);">${c.hora} · ${escapeHtml(c.obs || 'Consulta')}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;">
        <select class="status-select" data-id="${c.id}" style="font-size:.75rem;padding:4px;border-radius:6px;border:1.5px solid var(--border);background:var(--card);">
          <option value="Agendada" ${c.status === 'Agendada' ? 'selected' : ''}>Agendada</option>
          <option value="Realizada" ${c.status === 'Realizada' ? 'selected' : ''}>Realizada</option>
          <option value="Pendente" ${c.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
          <option value="Atrasada" ${c.status === 'Atrasada' ? 'selected' : ''}>Atrasada</option>
        </select>
        <button class="btn btn-danger btn-sm delete-consulta" data-id="${c.id}">✕</button>
      </div>
    </div>`;
  }).join('');

  // Adicionar event listeners para segurança
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', function() {
      alterarStatusConsulta(this.dataset.id, this.value);
    });
  });

  document.querySelectorAll('.delete-consulta').forEach(btn => {
    btn.addEventListener('click', function() {
      excluirConsulta(this.dataset.id);
    });
  });
}