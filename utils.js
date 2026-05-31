export const u = {
  $: id => document.getElementById(id),
  $$: sel => document.querySelectorAll(sel),
  
  toast: msg => {
    const t = u.$('toast');
    if (!t) return console.log("Toast:", msg);
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  },
  
  fmt: (v, t) => {
    if (t === 'cpf') {
      let s = v.replace(/\D/g, '').slice(0, 11);
      return s.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    if (t === 'moeda') return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
    if (t === 'data') return v ? v.split('T')[0].split('-').reverse().join('/') : '—';
    return v;
  },
  
  hide: (id, v = true) => {
    const el = u.$(id);
    if (el) el.style.display = v ? 'none' : 'flex';
  },
  show: id => {
    const el = u.$(id);
    if (el) el.style.display = 'flex';
  },
  renderList: (id, items, render, emptyMsg) => {
    const el = u.$(id);
    if (!el) return;
    el.innerHTML = items.length ? items.map(render).join('') : `<p style="color:var(--ink-soft);font-size:.85rem;">${emptyMsg}</p>`;
  },
};

export function maskCPF(el) { el.value = u.fmt(el.value, 'cpf'); }