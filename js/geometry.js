// Everything that depends on the measured basket and tank. All lengths in mm.
// z = height above the basket floor (inside the basket). h = height above the tank floor.
import { clamp, round } from './util.js';

export const DEFAULT_SETTINGS = {
  funnelSide: 'right',
  basket: { top: 43, bottom: 32, height: 68, wall: 1 },
  tank: { clearance: 13, maxLevel: 34, markSpan: 16.5, lengthMm: null, widthMm: null, volumeL: null },
  plug: { dia: 36, height: 40 },
  baseLayer: 15,
  fertDose: null,          // ml per litre, from the bottle label
  waterChangeDays: 14,
  topUpDays: 3,
  lightStart: '07:00',
  reminderTime: '18:00',
  gcalClientId: '',
  gcalCalendarId: '',
};

export function geo(s) {
  const b = s.basket, t = s.tank;
  const rIn = z => (b.bottom / 2 - b.wall) + ((b.top - b.bottom) / 2) * (z / b.height);
  const vol = (z1, z2) => { const r1 = rIn(z1), r2 = rIn(z2); return Math.PI / 3 * (z2 - z1) * (r1 * r1 + r1 * r2 + r2 * r2); };
  const max = t.maxLevel, min = t.maxLevel - t.markSpan, floor = t.clearance;
  const areaL = t.lengthMm && t.widthMm ? t.lengthMm * t.widthMm / 1e6 : null; // litres per mm of water
  const volumeMax = t.volumeL || (areaL ? areaL * max : null);
  const perMm = areaL || (t.volumeL ? t.volumeL / max : null);
  return { rIn, vol, max, min, floor, span: t.markSpan, inMax: max - floor, inMin: min - floor, H: b.height, perMm, volumeMax };
}

// Where a level sits on the fill indicator.
export function mark(s, h) {
  const g = geo(s);
  const aboveMin = round(h - g.min, 1);
  const frac = clamp((h - g.min) / g.span, 0, 1);
  let text;
  if (h >= g.max - 0.75) text = 'the MAX mark';
  else if (h <= g.min + 0.75) text = 'the MIN mark';
  else text = `${round(aboveMin)} mm above the MIN mark (about ${frac < 0.38 ? 'one third' : frac < 0.62 ? 'halfway' : 'two thirds'} up the scale)`;
  return { h: round(h, 1), aboveMin, frac, text, at: /^the M/.test(text) ? `at ${text}` : text };
}

// Layer stack inside one basket for a given plant.
export function layers(s, plant) {
  const g = geo(s), H = g.H;
  const start = plant.start || 'seed';
  if (start !== 'seed') {
    // No plug: the plant stands on a pebble bed so its root base sits just under the MAX waterline.
    const seat = clamp(round(g.inMax - (start === 'clove' ? 2 : 5)), 5, H - 30);
    const fillTop = H - 8;
    return {
      type: start, base: seat, seat, fillTop, free: H - fillTop, warnings: [],
      stack: [
        { key: 'base', label: 'Pebble bed', from: 0, to: seat },
        { key: 'fill', label: 'Pebbles around the plant', from: seat, to: fillTop },
        { key: 'free', label: 'Free to the rim', from: fillTop, to: H },
      ],
    };
  }
  const warnings = [];
  let base = s.baseLayer;
  const dry = plant.water === 'dry';
  if (dry) base = Math.max(base, round(g.inMax + 3));
  const plugVol = Math.PI * (s.plug.dia / 2) ** 2 * s.plug.height;
  // The wet plug is soft: pressed into the tapered basket it keeps its volume and takes the basket's shape.
  let lo = base, hi = H + 60;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; (g.vol(base, mid) < plugVol ? (lo = mid) : (hi = mid)); }
  let plugTop = round(lo, 0);
  if (plugTop > H - 4) {
    warnings.push(`This plug is too big for the basket above a ${base} mm pebble bed. Use a thinner bed or trim the plug.`);
    plugTop = H - 4;
  }
  const jam = (s.plug.dia / 2 - (s.basket.bottom / 2 - s.basket.wall)) / ((s.basket.top - s.basket.bottom) / 2) * H;
  const mustPress = jam > base + 1;
  const dip = round(g.inMax - base, 1); // how deep the plug bottom sits in water at MAX
  if (!dry && dip < 3) warnings.push(`With a ${base} mm pebble bed the plug barely reaches the water at MAX. Keep the bed at ${round(g.inMax - 5)} mm or less.`);
  if (!dry && dip > 12) warnings.push('The plug sits deep in the water at MAX. During germination fill only until about 5 mm of the plug is under water.');
  const free = H - plugTop;
  const topDress = free - 5 >= 3 ? round(free - 5) : 0;
  return {
    type: 'plug', base, plugBottom: base, plugTop, free: round(free), topDress, dip, dry, mustPress, jam: round(jam), warnings,
    stack: [
      { key: 'base', label: 'Pebble bed', from: 0, to: base },
      { key: 'plug', label: 'Seed plug', from: base, to: plugTop },
      { key: 'free', label: topDress ? `Free now, ${topDress} mm of pebbles after thinning` : 'Free to the rim', from: plugTop, to: H },
    ],
  };
}

// Water targets for the two tank modes, as heights above the tank floor.
export function waterTargets(s) {
  const g = geo(s);
  const plugBottom = g.floor + s.baseLayer;
  const germFill = clamp(plugBottom + 6, g.min + 2, g.max);       // about 6 mm of plug under water
  const germLow = clamp(plugBottom + 1, g.min, germFill - 1);     // top up before the plug loses contact
  const growFill = clamp(plugBottom - 1, g.min + 3, g.max);       // just under the plugs: air gap above
  const growLow = g.min;                                          // baskets still dip in at MIN
  return {
    germ: { fill: mark(s, germFill), low: mark(s, germLow) },
    grow: { fill: mark(s, growFill), low: mark(s, growLow), gap: round(plugBottom - growFill + 0, 0), gapAtMin: round(plugBottom - g.min, 1) },
    litres: (from, to) => (g.perMm ? round(g.perMm * Math.max(0, to - from), 2) : null),
  };
}
