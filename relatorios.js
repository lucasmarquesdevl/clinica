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

  const totalPago = lista.filter(s => s.status === 'Pago').reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  const totalPendente = lista.filter(s => s.status === 'Pendente').reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  
  u.$('rel-total').innerHTML = `
    <span style="color:var(--mint-deep)">Pago: ${u.fmt(totalPago, 'moeda')}</span> | 
    <span style="color:#c0392b">Pendente: ${u.fmt(totalPendente, 'moeda')}</span>
  `;

  const tbody = u.$('rel-tbody');
  if (!tbody) return;

  tbody.innerHTML = lista.length ? lista.map(s => {
    const pac = state.pacientes.find(p => p.id == s.pacienteId);
    const cpfDecl = pac?.cpfResp || pac?.cpf || '—';
    return `<tr>
      <td>${escapeHtml(pac?.nome || '—')}</td>
      <td style="font-family:monospace;font-size:.85rem;">${escapeHtml(cpfDecl)}</td>
      <td>${u.fmt(s.data, 'data')}</td>
      <td><span class="badge ${s.status === 'Pago' ? 'badge-green' : 'badge-amber'}" style="font-size:.7rem; padding: 2px 8px;">${s.status}</span></td>
      <td style="font-weight:600;color:var(--primary);">${u.fmt(s.valor, 'moeda')}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:24px;">Nenhum registro para este período.</td></tr>';

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

  // Criar um novo livro (Workbook) a partir da tabela HTML
  const wb = XLSX.utils.table_to_book(table, { sheet: "Relatório Mensal" });

  // Ajustar a largura das colunas automaticamente para ficar profissional
  const ws = wb.Sheets["Relatório Mensal"];
  ws['!cols'] = [
    { wch: 35 }, // Nome do Paciente
    { wch: 20 }, // CPF
    { wch: 15 }, // Data
    { wch: 12 }, // Status
    { wch: 15 }  // Valor
  ];

  // Gerar e baixar o arquivo .xlsx real
  XLSX.writeFile(wb, `Relatorio_${mesNome}_${ano}.xlsx`);
}