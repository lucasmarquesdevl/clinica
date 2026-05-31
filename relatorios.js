import { u } from './utils.js';
import { state } from './state.js';
import { escapeHtml } from './security.js';

export function gerarRelatorio() {
  const { mes, ano, status } = {
    mes: u.$('rel-mes').value,
    ano: u.$('rel-ano').value,
    status: u.$('rel-status').value,
  };

  // Filtra as sessões baseadas no mês e ano (state.sessoes é populado no Financeiro)
  let lista = state.sessoes.filter(s => s.data && (() => {
    const [y, m] = s.data.split('-');
    return y === ano && m === mes;
  })());

  if (status) {
    lista = lista.filter(s => s.status === status);
  }

  // Ordena por data
  lista.sort((a, b) => a.data.localeCompare(b.data));

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  u.$('rel-titulo').textContent = `${meses[parseInt(mes) - 1]} / ${ano}`;

  const total = lista.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  u.$('rel-total').textContent = `Total: ${u.fmt(total, 'moeda')}`;

  const tbody = u.$('rel-tbody');
  if (!tbody) return;

  tbody.innerHTML = lista.length ? lista.map(s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    const cpfDecl = pac?.cpfResp || pac?.cpf || '—';
    return `<tr>
      <td>${escapeHtml(pac?.nome || '—')}</td>
      <td style="font-family:monospace;font-size:.85rem;">${escapeHtml(cpfDecl)}</td>
      <td>${u.fmt(s.data, 'data')}</td>
      <td style="font-weight:600;color:var(--primary);">${u.fmt(s.valor, 'moeda')}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:24px;">Nenhum registro para este período.</td></tr>';

  u.$('rel-resultado').style.display = 'block';
}

export function copiarTabela() {
  let text = '';
  const table = u.$('rel-table');
  if (!table) return;
  
  table.querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.querySelectorAll('th,td')).map(c => c.textContent.trim());
    text += cells.join('\t') + '\n';
  });
  navigator.clipboard.writeText(text).then(() => u.toast('Tabela copiada!'));
}

export function exportarExcel() {
  const table = u.$('rel-table');
  const tbody = u.$('rel-tbody');
  
  if (!table || !tbody || tbody.innerText.includes('Nenhum registro')) {
    u.toast('Gere um relatório com dados primeiro.');
    return;
  }

  const mesNome = u.$('rel-mes').options[u.$('rel-mes').selectedIndex].text;
  const ano = u.$('rel-ano').value;
  const rows = [];
  
  table.querySelectorAll('tr').forEach(tr => {
    const cols = Array.from(tr.querySelectorAll('th, td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
    rows.push(cols.join(';'));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Relatorio_${mesNome}_${ano}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}