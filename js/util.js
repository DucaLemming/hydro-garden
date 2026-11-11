// Small date helpers. Dates are ISO strings (YYYY-MM-DD), handled at local noon to dodge DST.
export const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const today = () => toISO(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + Math.round(n)); return toISO(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5); // a - b
export const fmt = s => parse(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtLong = s => parse(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
export const round = (x, p = 0) => { const f = 10 ** p; return Math.round(x * f) / f; };
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
