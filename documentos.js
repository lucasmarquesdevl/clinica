import { _supabase } from './supabaseClient.js';
import { u } from './utils.js';
import { state } from './state.js';
import { escapeHtml } from './security.js';

const TEMPLATES = {
  declaracao: {
    titulo: 'Declaração de Comparecimento',
    texto: (p) => `Declaro para os devidos fins que o(a) paciente ${p.nome}, inscrito(a) no CPF sob o nº ${p.cpf}, compareceu à sessão de psicoterapia no dia ${new Date().toLocaleDateString('pt-BR')} no horário das ____:____ às ____:____.`
  },
  atestado: {
    titulo: 'Atestado Psicológico',
    texto: (p) => `Atesto, para fins de ________________, que o(a) Sr(a). ${p.nome}, portador(a) do CPF ${p.cpf}, encontra-se em acompanhamento psicológico nesta clínica, realizando sessões com frequência _______________.`
  },
  recibo: {
    titulo: 'Recibo de Pagamento',
    texto: (p) => `Recebi de ${p.cpfResp ? p.nome + ' (Responsável: ' + p.cpfResp + ')' : p.nome}, a importância de ${u.fmt(p.valor || 0, 'moeda')}, referente à sessão de psicoterapia realizada na data de ${new Date().toLocaleDateString('pt-BR')}.`
  }
};

export async function carregarDocumentos() {
  if (!state.currentUser) return;
  const { data, error } = await _supabase
    .from('documentos')
    .select('*')
    .eq('psicologa_id', state.currentUser.id);
  
  if (!error) {
    state.documentos = data || [];
    renderHistoricoDocumentos();
  }
}

export function renderHistoricoDocumentos() {
  const tbody = u.$('doc-historico-tbody');
  if (!tbody) return;

  if (!state.documentos || !state.documentos.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:24px;">Nenhum documento emitido.</td></tr>';
    return;
  }

  // Ordenar do mais novo para o mais antigo
  const lista = [...state.documentos].sort((a, b) => new Date(b.data_emissao) - new Date(a.data_emissao));

  tbody.innerHTML = lista.map(doc => {
    const pac = state.pacientes.find(p => p.id == doc.paciente_id);
    const dataFmt = u.fmt(doc.data_emissao, 'data-hora');
    const tipoFmt = TEMPLATES[doc.tipo]?.titulo || doc.tipo;

    return `<tr>
      <td>${dataFmt}</td>
      <td><strong>${escapeHtml(pac?.nome || '—')}</strong></td>
      <td><span class="badge badge-gray">${escapeHtml(tipoFmt)}</span></td>
      <td><button class="btn btn-secondary btn-sm" onclick="visualizarDocumento('${doc.id}')">Visualizar</button></td>
    </tr>`;
  }).join('');
}

export function carregarTemplate() {
  const tipo = u.$('doc-tipo').value;
  const pacId = u.$('doc-paciente').value;
  const editor = u.$('doc-editor');

  if (!tipo || !pacId) {
    editor.value = '';
    return;
  }

  const pac = state.pacientes.find(p => p.id == pacId);
  if (pac && TEMPLATES[tipo]) {
    editor.value = TEMPLATES[tipo].texto(pac);
  }
}

export function visualizarDocumento(id) {
  const doc = state.documentos.find(d => d.id === id);
  if (!doc) return;

  u.$('doc-paciente').value = doc.paciente_id;
  u.$('doc-tipo').value = doc.tipo;
  u.$('doc-editor').value = doc.conteudo;
  u.$('doc-editor').scrollIntoView({ behavior: 'smooth', block: 'center' });
  u.toast('Documento carregado no editor para consulta.');
}

export async function imprimirDocumento() {
  const tipo = u.$('doc-tipo').value;
  const pacId = u.$('doc-paciente').value;
  const conteudo = u.$('doc-editor').value;
  
  if (!tipo || !conteudo) {
    u.toast('Selecione o paciente e o tipo de documento primeiro.');
    return;
  }

  // Salva no banco de dados antes de abrir a impressão
  u.toast('Salvando documento...');
  const pac = state.pacientes.find(p => p.id == pacId);
  
  const { error } = await _supabase.from('documentos').insert([{
    paciente_id: pacId,
    psicologa_id: state.currentUser.id,
    tipo: tipo,
    conteudo: conteudo,
    nome: pac?.nome // Salvando o nome redundante aqui
  }]);

  if (!error) {
    await carregarDocumentos(); // Atualiza a lista local
  } else {
    console.error("Erro ao registrar no histórico:", error);
  }

  const profissional = state.currentUser;
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${TEMPLATES[tipo].titulo}</title>
        <style>
          body { font-family: 'Georgia', serif; color: #3a3530; padding: 50px; line-height: 1.8; }
          .header { text-align: center; border-bottom: 2px solid #e2d1c3; padding-bottom: 20px; margin-bottom: 50px; }
          .logo-img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; }
          .logo-text { font-size: 24px; color: #b5654a; font-family: serif; font-weight: bold; margin-top: 5px; }
          .tagline { font-size: 14px; color: #8e857d; font-style: italic; letter-spacing: 1px; }
          .title { text-align: center; font-size: 22px; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 2px; }
          .content { min-height: 350px; font-size: 18px; text-align: justify; white-space: pre-wrap; margin-bottom: 80px; }
          .footer { text-align: center; }
          .signature-line { border-top: 1px solid #3a3530; width: 350px; margin: 0 auto 10px; }
          .crp { font-size: 14px; color: #555; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="logo.png" class="logo-img" alt="Lugar de Ser">
          <div class="logo-text">Lugar de Ser</div>
          <div class="tagline">Espaço Terapêutico — Gestão Clínica</div>
        </div>
        <div class="title">${TEMPLATES[tipo].titulo}</div>
        <div class="content">${escapeHtml(conteudo)}</div>
        <div class="footer">
          <p>${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          <div style="margin-top: 100px;">
            <div class="signature-line"></div>
            <strong>${profissional.nome}</strong><br>
            <span class="crp">Psicóloga CRP ${profissional.crp}</span>
          </div>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}