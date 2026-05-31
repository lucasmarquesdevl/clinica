import { _supabase } from './supabaseClient.js';
import { u } from './utils.js';
import { state } from './state.js';
import { escapeHtml, validateFile } from './security.js';

export async function carregarProntuarios(pid) {
  if (!pid) return;
  const { data, error } = await _supabase.from('prontuarios').select('*').eq('paciente_id', pid).order('data', { ascending: false });
  if (!error) {
    state.prontuarios[pid] = (data || []).map(h => ({ data: h.data, texto: h.texto, ts: h.id }));
    renderHistoricoProntuario(pid);
  }
}

export async function carregarAnexos(pid) {
  if (!pid) return;
  const { data, error } = await _supabase.storage.from('documentos-pacientes').list(pid);
  if (error) return;
  const arquivosValidos = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
  const anexosPromessas = arquivosValidos.map(async f => {
    const { data: urlData } = await _supabase.storage.from('documentos-pacientes').createSignedUrl(`${pid}/${f.name}`, 3600);
    return { nome: f.name.includes('__') ? f.name.split('__')[1] : f.name, nomeReal: f.name, url: urlData?.signedUrl || '#' };
  });
  state.anexos[pid] = await Promise.all(anexosPromessas);
  const listaEl = u.$('anexos-lista');
  if (listaEl) {
    listaEl.innerHTML = state.anexos[pid].map((a, idx) => `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--blush);border-radius:6px;padding:4px 10px;font-size:.78rem;margin:3px;" data-nome="${escapeHtml(a.nomeReal)}">
      <a href="${a.url}" target="_blank" style="text-decoration:none;color:inherit;">📎 ${escapeHtml(a.nome)}</a>
      <button class="delete-anexo" data-nome="${escapeHtml(a.nomeReal)}" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:.9rem;display:flex;align-items:center;">✕</button>
    </div>`).join('');

    // Event listeners para segurança
    document.querySelectorAll('.delete-anexo').forEach(btn => {
      btn.addEventListener('click', function() {
        excluirAnexo(this.dataset.nome);
      });
    });
  }
}

export async function excluirAnexo(nomeArquivo) {
  const pid = u.$('pront-paciente').value;
  if (!pid || !confirm('Deseja excluir este documento?')) return;
  const { error } = await _supabase.storage.from('documentos-pacientes').remove([`${pid}/${nomeArquivo}`]);
  if (!error) { u.toast('Documento excluído.'); await carregarAnexos(pid); }
}

export async function fazerUploadAnexo(input) {
  const pid = u.$('pront-paciente').value;
  if (!pid || input.files.length === 0) return;

  const invalidFiles = [];
  for (const file of input.files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      invalidFiles.push(validation.error);
    }
  }

  if (invalidFiles.length > 0) {
    u.toast('Erros: ' + invalidFiles.join(', '));
    return;
  }

  u.toast('Iniciando upload...');
  for (const file of input.files) {
    const path = `${pid}/${Date.now()}__${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
    const { error } = await _supabase.storage.from('documentos-pacientes').upload(path, file);
    if (error) {
      u.toast(`Erro ao fazer upload de ${file.name}`);
      console.error('Upload error:', error);
    }
  }
  await carregarAnexos(pid);
  u.toast('Arquivo(s) salvos!');
  input.value = '';
}

export function carregarProntuario() {
  const pid = u.$('pront-paciente').value;
  if (!pid) { u.hide('pront-area'); u.hide('pront-info'); return; }
  const pac = state.pacientes.find(p => p.id == pid);
  u.show('pront-info'); u.show('pront-area');
  u.$('pront-info-text').innerHTML = `<strong>${escapeHtml(pac.nome)}</strong> · CPF: ${escapeHtml(pac.cpf)}`;
  u.$('pront-texto').value = '';
  u.$('pront-data-sessao').value = new Date().toISOString().split('T')[0];
  u.$('pront-edit-id').value = '';
  carregarProntuarios(pid);
  carregarAnexos(pid);
}

export async function salvarProntuario() {
  const pid = u.$('pront-paciente').value;
  const txt = u.$('pront-texto').value.trim();
  const editId = u.$('pront-edit-id').value;
  const dataSessao = u.$('pront-data-sessao').value || new Date().toISOString().split('T')[0];

  if (!pid || !txt) return;
  let res;
  if (editId) {
    res = await _supabase.from('prontuarios').update({ data: dataSessao, texto: txt }).eq('id', editId);
  } else {
    res = await _supabase.from('prontuarios').insert([{ paciente_id: pid, psicologa_id: state.currentUser.id, data: dataSessao, texto: txt }]);
  }

  if (!res.error) {
    u.$('pront-texto').value = ''; u.$('pront-edit-id').value = '';
    await carregarProntuarios(pid);
    u.toast(editId ? 'Anotação atualizada!' : 'Anotação salva!');
  }
}

export function editarAnotacao(pid, id) {
  const anotacao = state.prontuarios[pid]?.find(h => h.ts == id);
  if (!anotacao) return;
  u.$('pront-texto').value = anotacao.texto;
  u.$('pront-data-sessao').value = anotacao.data;
  u.$('pront-edit-id').value = id;
  u.$('pront-texto').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function renderHistoricoProntuario(pid) {
  const hist = state.prontuarios[pid] || [];
  const el = u.$('pront-historico');
  if (!el) return;
  el.innerHTML = hist.length ? hist.map(h => `<div style="border-bottom:1px solid var(--border);padding:14px 0;" data-pid="${pid}" data-ts="${h.ts}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
      <div style="font-size:.78rem;font-weight:600;color:var(--primary);">📅 ${u.fmt(h.data, 'data')}</div>
      <button class="btn btn-secondary btn-sm edit-anotacao" data-pid="${pid}" data-ts="${h.ts}">Editar</button>
    </div>
    <p style="font-size:.88rem;line-height:1.6;white-space:pre-wrap;">${escapeHtml(h.texto)}</p></div>`).join('')
    : '<p style="color:var(--ink-soft);font-size:.85rem;">Nenhuma anotação registrada.</p>';

  // Event listeners para segurança
  document.querySelectorAll('.edit-anotacao').forEach(btn => {
    btn.addEventListener('click', function() {
      editarAnotacao(this.dataset.pid, this.dataset.ts);
    });
  });
}