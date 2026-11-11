// SVG drawings generated from the measured geometry, so they stay to scale when settings change.
import { geo, layers, mark } from './geometry.js';
import { round, esc } from './util.js';

const C = { line: '#17251d', dim: '#5e6f65', water: '#2b74c7', waterFill: '#cfe2f6', pebble: '#c9966a', pebbleEdge: '#8f6238', plug: '#6f4b33', plugFill: '#a67c5b', leaf: '#2f8f4e', cut: '#c8433a' };

// To-scale cross-section of one basket in the tank, with every layer dimensioned.
export function crossSection(s, plant, level) {
  const g = geo(s), L = layers(s, plant), b = s.basket;
  const k = 3.3, W = 430, padT = 26, floorY = padT + (g.floor + b.height + 8) * k;
  const Hpx = floorY + 30, cx = 150;
  const Y = h => floorY - h * k;                       // h above tank floor
  const Yz = z => Y(g.floor + z);                      // z above basket floor
  const halfOut = z => (b.bottom / 2 + (b.top - b.bottom) / 2 * (z / b.height)) * k;
  const halfIn = z => g.rIn(z) * k;
  const lvl = level ?? g.max;
  let o = `<svg class="xsec" viewBox="0 0 ${W} ${round(Hpx)}" role="img" aria-label="Cross-section of a basket planted with ${esc(plant.name)}, with layer thicknesses in millimetres">`;
  o += `<defs><pattern id="peb" width="13" height="12" patternUnits="userSpaceOnUse"><rect width="13" height="12" fill="#f3e4d3"/><circle cx="4" cy="4" r="3.6" fill="${C.pebble}" stroke="${C.pebbleEdge}" stroke-width=".6"/><circle cx="10.5" cy="9.5" r="3.2" fill="${C.pebble}" stroke="${C.pebbleEdge}" stroke-width=".6"/></pattern>
  <clipPath id="inb"><polygon points="${cx - halfIn(0)},${Yz(0)} ${cx + halfIn(0)},${Yz(0)} ${cx + halfIn(b.height)},${Yz(b.height)} ${cx - halfIn(b.height)},${Yz(b.height)}"/></clipPath></defs>`;
  // water
  o += `<rect x="16" y="${Y(lvl)}" width="268" height="${lvl * k}" fill="${C.waterFill}"/>`;
  // layers
  o += `<g clip-path="url(#inb)">`;
  for (const l of L.stack) {
    if (l.key === 'free') continue;
    const fill = l.key === 'plug' ? C.plugFill : 'url(#peb)';
    o += `<rect x="${cx - 80}" y="${Yz(l.to)}" width="160" height="${(l.to - l.from) * k}" fill="${fill}"/>`;
  }
  o += `</g>`;
  // plant
  if (L.type === 'plug') {
    const top = Yz(L.plugTop), n = Math.min(5, plant.seeds[1]);
    for (let i = 0; i < n; i++) {
      const x = cx + (i - (n - 1) / 2) * 9;
      o += `<ellipse cx="${x}" cy="${top + (plant.depth || 0) * k + (plant.depth ? 0 : -1.5)}" rx="2.6" ry="1.8" fill="${C.line}"/>`;
    }
    o += `<line x1="${cx - halfIn(L.plugTop)}" x2="${cx + halfIn(L.plugTop)}" y1="${top}" y2="${top}" stroke="${C.plug}" stroke-width="1.2"/>`;
  } else {
    const seat = Yz(L.seat);
    if (L.type === 'rootend') o += `<rect x="${cx - 9}" y="${Yz(b.height) - 26}" width="18" height="${seat - Yz(b.height) + 26}" rx="6" fill="#f8f5ea" stroke="${C.dim}"/><rect x="${cx - 5}" y="${Yz(b.height) - 52}" width="10" height="30" rx="4" fill="#86c58f"/>`;
    else if (L.type === 'clove') o += `<path d="M${cx} ${seat - 62} C ${cx + 22} ${seat - 30}, ${cx + 16} ${seat}, ${cx} ${seat} C ${cx - 16} ${seat}, ${cx - 22} ${seat - 30}, ${cx} ${seat - 62}Z" fill="#f8f5ea" stroke="${C.dim}"/>`;
    else o += `<path d="M${cx - 6} ${seat} V ${Yz(b.height) - 50} M${cx + 6} ${seat} V ${Yz(b.height) - 40}" stroke="${C.leaf}" stroke-width="3" fill="none"/><ellipse cx="${cx - 16}" cy="${Yz(b.height) - 44}" rx="11" ry="4" fill="${C.leaf}"/><ellipse cx="${cx + 17}" cy="${Yz(b.height) - 34}" rx="11" ry="4" fill="${C.leaf}"/>`;
    for (const dx of [-7, -2, 3, 8]) o += `<line x1="${cx + dx * .5}" y1="${seat}" x2="${cx + dx * 1.6}" y2="${seat + 15 * k}" stroke="#b8a27a" stroke-width="1.2"/>`;
  }
  // basket outline, tank floor, tray deck
  o += `<polygon points="${cx - halfOut(0)},${Yz(0)} ${cx + halfOut(0)},${Yz(0)} ${cx + halfOut(b.height)},${Yz(b.height)} ${cx - halfOut(b.height)},${Yz(b.height)}" fill="none" stroke="${C.line}" stroke-width="1.6"/>`;
  o += `<line x1="16" x2="${cx - halfOut(b.height) - 1}" y1="${Yz(b.height)}" y2="${Yz(b.height)}" stroke="${C.line}" stroke-width="1.6"/><line x1="${cx + halfOut(b.height) + 1}" x2="284" y1="${Yz(b.height)}" y2="${Yz(b.height)}" stroke="${C.line}" stroke-width="1.6"/>`;
  o += `<line x1="16" x2="284" y1="${floorY}" y2="${floorY}" stroke="${C.line}" stroke-width="2.2"/>`;
  // water marks (left)
  for (const [h, name] of [[g.max, 'MAX'], [g.min, 'MIN']]) {
    o += `<line x1="16" x2="284" y1="${Y(h)}" y2="${Y(h)}" stroke="${C.water}" stroke-width="1.2" stroke-dasharray="5 3"/><text x="20" y="${Y(h) - 4}" class="dimw">${name} ${round(h, 1)}</text>`;
  }
  o += `<text x="20" y="${floorY + 16}" class="dim">tank floor 0</text><text x="20" y="${Yz(b.height) - 5}" class="dim">tray deck</text>`;
  // dimension chain (right)
  const x0 = 296, x1 = 306;
  const dimSeg = (zf, zt, label, strong) => {
    const ya = Yz(zt), yb = Yz(zf);
    o += `<line x1="${x0}" x2="${x1 + 4}" y1="${ya}" y2="${ya}" stroke="${C.dim}"/><line x1="${x0}" x2="${x1 + 4}" y1="${yb}" y2="${yb}" stroke="${C.dim}"/><line x1="${x1}" x2="${x1}" y1="${ya}" y2="${yb}" stroke="${C.dim}"/>`;
    o += `<text x="${x1 + 8}" y="${(ya + yb) / 2 + 4}" class="${strong ? 'dims' : 'dim'}">${label}</text>`;
  };
  for (const l of L.stack) dimSeg(l.from, l.to, `${round(l.to - l.from)} mm ${l.key === 'base' ? 'pebbles' : l.key === 'plug' ? 'plug' : l.key === 'fill' ? 'pebbles' : 'free'}`, l.key !== 'free');
  dimSeg(-g.floor, 0, `${round(g.floor)} mm gap`, false);
  o += `</svg>`;
  return o;
}

// Vertical fill-indicator gauge with the target band.
export function gauge(s, fillH, lowH) {
  const g = geo(s), H = 120, y = h => 14 + (1 - (h - g.min) / g.span) * (H - 28);
  const yf = y(Math.min(g.max, fillH)), yl = y(Math.max(g.min, lowH));
  return `<svg class="gauge" viewBox="0 0 92 ${H}" role="img" aria-label="Fill indicator: keep the level between ${esc(mark(s, lowH).text)} and ${esc(mark(s, fillH).text)}">
  <rect x="34" y="8" width="18" height="${H - 16}" rx="9" fill="#fff" stroke="${C.dim}"/>
  <rect x="35" y="${yf}" width="16" height="${Math.max(3, yl - yf)}" fill="${C.water}" opacity=".85"/>
  <line x1="26" x2="60" y1="${y(g.max)}" y2="${y(g.max)}" stroke="${C.line}" stroke-width="1.5"/><line x1="26" x2="60" y1="${y(g.min)}" y2="${y(g.min)}" stroke="${C.line}" stroke-width="1.5"/>
  <text x="64" y="${y(g.max) + 4}" class="dims">MAX</text><text x="64" y="${y(g.min) + 4}" class="dims">MIN</text>
  <path d="M30 ${yf} l-9 -5 v10z" fill="${C.water}"/><text x="2" y="${yf - 8}" class="dimw">fill to</text></svg>`;
}

// Where to cut, by harvest style.
export function cutGlyph(kind) {
  const leaf = (x, y, rx = 12, ry = 4.5, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.leaf}" transform="rotate(${rot} ${x} ${y})"/>`;
  const cut = (x1, x2, y) => `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${C.cut}" stroke-width="2" stroke-dasharray="4 3"/>`;
  const pot = `<path d="M38 104 h44 l-4 12 h-36z" fill="${C.pebble}" stroke="${C.pebbleEdge}"/>`;
  let body = '';
  if (kind === 'tips') body = `<line x1="60" x2="60" y1="104" y2="20" stroke="${C.leaf}" stroke-width="3"/>${[86, 62, 38].map(y => leaf(46, y) + leaf(74, y)).join('')}${leaf(60, 16, 5, 9)}${cut(34, 86, 50)}`;
  else if (kind === 'base' || kind === 'whole') body = `${[-20, -12, -4, 4, 12, 20].map(d => `<line x1="${60 + d * .3}" y1="104" x2="${60 + d * 1.5}" y2="${22 + Math.abs(d)}" stroke="${C.leaf}" stroke-width="2.6"/>`).join('')}${cut(30, 90, kind === 'whole' ? 96 : 88)}`;
  else if (kind === 'fruit') body = `<line x1="14" x2="106" y1="24" y2="28" stroke="${C.leaf}" stroke-width="3"/><line x1="60" x2="60" y1="26" y2="52" stroke="${C.leaf}" stroke-width="2.4"/><path d="M52 52 h16 l2 22 -10 34 -10 -34z" fill="${C.cut}"/>${leaf(30, 38, 12, 5)}${leaf(92, 40, 12, 5)}${cut(46, 74, 40)}`;
  else body = `${[[-34, 60, -28], [34, 60, 28], [-22, 34, -55], [22, 34, 55]].map(([dx, y, r]) => `<ellipse cx="${60 + dx}" cy="${y}" rx="20" ry="9" fill="#9ed3a8" stroke="${C.cut}" stroke-width="1.6" stroke-dasharray="4 3" transform="rotate(${r} ${60 + dx} ${y})"/>`).join('')}${leaf(52, 78, 12, 6, -60)}${leaf(68, 78, 12, 6, 60)}${leaf(60, 64, 6, 13)}`;
  return `<svg class="cutg" viewBox="0 0 120 120" role="img" aria-label="Where to cut">${body}${pot}</svg>`;
}
