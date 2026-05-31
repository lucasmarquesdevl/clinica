import { state } from './state.js';
import { u } from './utils.js';
import { escapeHtml } from './security.js';

export function renderDashboard() {
  const hoje = new Date();
  const semStart = new Date(hoje); semStart.setDate(hoje.getDate() - hoje.getDay());
  const semEnd = new Date(semStart); semEnd.setDate(semStart.getDate() + 6);
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
  const anoAtual = hoje.getFullYear().toString();

  // Atualiza os contadores no topo
  if (u.$('stat-pacientes')) u.$('stat-pacientes').textContent = state.pacientes.length;
  if (u.$('stat-semana')) u.$('stat-semana').textContent = state.consultas.filter(c => {
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
  if (u.$('stat-recebido')) u.$('stat-recebido').textContent = u.fmt(recMes, 'moeda');
  if (u.$('stat-pendente')) u.$('stat-pendente').textContent = u.fmt(pendMes, 'moeda');

  // Renderiza as listas
  u.renderList('dash-proximas', state.consultas
    .filter(c => new Date(c.data + 'T' + c.hora) >= new Date())
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(0, 4), c => {
      const pac = state.pacientes.find(p => p.id == c.pacienteId);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);">
        <div><div style="font-size:.88rem;font-weight:500;">${escapeHtml(pac?.nome || '—')}</div>
        <div style="font-size:.78rem;color:var(--ink-soft);">${u.fmt(c.data, 'data')} às ${c.hora}</div></div>
        <span class="badge badge-blue">${escapeHtml(c.obs || 'Consulta')}</span></div>`;
    }, 'Nenhuma consulta agendada.');

  u.renderList('dash-pendentes', state.sessoes.filter(s => s.status === 'Pendente').slice(0, 5), s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);">
      <div><div style="font-size:.88rem;font-weight:500;">${escapeHtml(pac?.nome || '—')}</div>
      <div style="font-size:.78rem;color:var(--ink-soft);">${u.fmt(s.data, 'data')}</div></div>
      <span style="font-weight:600;color:#c0392b;font-size:.88rem;">${u.fmt(s.valor, 'moeda')}</span></div>`;
  }, 'Nenhum pagamento pendente. ✓');
}