// 아주 작은 DOM 도우미
export function el(tag, attrs = {}, children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  add(e, children);
  return e;
}

function add(e, children) {
  if (children === undefined || children === null || children === false) return;
  if (Array.isArray(children)) for (const c of children) add(e, c);
  else if (children instanceof Node) e.appendChild(children);
  else e.appendChild(document.createTextNode(String(children)));
}

export function clear(e) {
  while (e.firstChild) e.removeChild(e.firstChild);
}

export function starsText(n, max = 3) {
  const s = el('span', { class: 'stars' });
  for (let i = 0; i < max; i++) s.appendChild(el('span', { class: i < n ? '' : 'off' }, '★'));
  return s;
}

export function toast(msg) {
  const box = document.getElementById('toast');
  if (!box) return;
  const t = el('div', { class: 'toast' }, msg);
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

export function escapeText(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
