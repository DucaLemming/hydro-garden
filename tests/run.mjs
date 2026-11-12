import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, geo, layers, waterTargets, mark } from '../js/geometry.js';
import { PLANTS, plantMap } from '../js/plants.js';
import { buildSchedule, milestones, SLOT_IDS } from '../js/schedule.js';
import { calendarItems, toICS } from '../js/ics.js';
import { CATS } from '../js/schedule.js';
import { addDays, diffDays } from '../js/util.js';

const s = structuredClone(DEFAULT_SETTINGS);
const g = geo(s);
assert.equal(g.min, 17.5); assert.equal(g.inMax, 21); assert.equal(g.inMin, 4.5);
const pm = plantMap();
const L = layers(s, pm.basil);
console.log('basil layers', L.base, L.plugTop, L.free, L.topDress, 'dip', L.dip, 'press', L.mustPress, L.jam);
assert.equal(L.base, 15); assert.ok(L.plugTop > 50 && L.plugTop < 60);
const T = layers(s, pm.thyme); console.log('thyme', T.base, T.plugTop, T.warnings);
assert.ok(T.base > g.inMax);
const O = layers(s, pm['spring-onion-root']); console.log('onion', O.seat, O.fillTop);
const wt = waterTargets(s); console.log('germ', wt.germ.fill.text, '|', wt.germ.low.text, '| grow', wt.grow.fill.text, '|', wt.grow.low.text, 'gap@min', wt.grow.gapAtMin);
assert.equal(wt.germ.fill.h, 34); assert.equal(wt.grow.low.h, 17.5);
for (const p of PLANTS) {
  assert.ok(p.germ[0] <= p.germ[1] && p.trueLeaves <= p.roots && p.how && p.tips, p.id);
  assert.ok(p.keep <= p.seeds[1] || p.keep >= p.seeds[1], p.id);
  if (p.life) assert.ok(p.life > p.harvest, p.id);
  layers(s, p);
}
assert.equal(new Set(PLANTS.map(p => p.id)).size, PLANTS.length);
const today = '2026-11-12';
const plan = { A1: 'chili', A2: 'basil', A3: 'parsley', A4: 'pak-choi', B1: 'basil', B2: 'chives', B3: 'spring-onion-root', C1: 'coriander', C2: 'lettuce', C3: 'rocket', C4: 'lettuce' };
const state = { settings: s, slots: Object.fromEntries(SLOT_IDS.map(id => [id, { plant: plan[id], sown: today }])), done: {}, tankLastChange: null };
const sch = buildSchedule(state, pm, today);
console.log(sch.tasks.length, 'tasks; tank', sch.tank.lowerDate, sch.tank.fertStart, sch.tank.fertHalf, sch.warnings);
assert.equal(new Set(sch.tasks.map(t => t.id)).size, sch.tasks.length);
for (const t of sch.tasks.slice(0, 400)) assert.ok(CATS[t.cat] && t.title && t.detail && /^\d{4}-\d\d-\d\d$/.test(t.date));
// entering an observed date shifts later tasks
const st2 = structuredClone(state); st2.slots.A2.sprouted = addDays(today, 14);
const h1 = sch.tasks.find(t => t.id === `A2:${today}:harvest`).date, h2 = buildSchedule(st2, pm, today).tasks.find(t => t.id === `A2:${today}:harvest`).date;
assert.ok(diffDays(h2, h1) > 0, 'late sprout delays harvest');
// late re-sow warns
const st3 = structuredClone(state); st3.slots.C1 = { plant: 'coriander', sown: addDays(today, 50) };
assert.ok(buildSchedule(st3, pm, addDays(today, 50)).warnings.length === 1);
const items = calendarItems(sch, state, today, CATS); const ics = toICS(items);
assert.ok(ics.includes('RRULE:FREQ=DAILY;INTERVAL=3') && ics.split('BEGIN:VEVENT').length - 1 === items.length);
for (const line of ics.split('\r\n')) assert.ok([...line].length <= 75, line);
console.log(items.length, 'calendar items');
console.log(sch.tasks.slice(0, 60).map(t => `${t.date} ${t.cat.padEnd(7)} ${t.title}`).join('\n'));
console.log('ALL TESTS PASSED');

// --- Google Calendar sync against a fake API
import { sync } from '../js/gcal.js';
{
  const db = new Map(); let seq = 0; const log = [];
  const fake = async (url, o) => {
    const u = new URL(url), p = u.pathname.replace('/calendar/v3', ''); log.push(`${o.method} ${p}`);
    const ok = (j, status = 200) => ({ ok: true, status, json: async () => j });
    if (o.method === 'GET' && /^\/calendars\/[^/]+$/.test(p)) return p.endsWith('gone') ? { ok: false, status: 404, json: async () => ({ error: { message: 'Not Found' } }) } : ok({ id: 'cal1' });
    if (o.method === 'POST' && p === '/calendars') return ok({ id: 'cal1' });
    if (o.method === 'GET') return ok({ items: [...db.values()] });
    if (o.method === 'POST') { const ev = { ...JSON.parse(o.body), id: `e${++seq}` }; db.set(ev.id, ev); return ok(ev); }
    if (o.method === 'PUT') { const id = p.split('/').pop(); db.set(id, { ...JSON.parse(o.body), id }); return ok(db.get(id)); }
    if (o.method === 'DELETE') { db.delete(p.split('/').pop()); return { ok: true, status: 204 }; }
  };
  const base = { clientId: 'x', tz: 'Europe/Berlin', colors: CATS, today, fetchFn: fake, tokenFn: async () => 't' };
  const r1 = await sync({ ...base, calendarId: 'gone', items });
  assert.equal(r1.created, items.length); assert.equal(r1.calendarId, 'cal1');
  const r2 = await sync({ ...base, calendarId: 'cal1', items });
  assert.deepEqual([r2.created, r2.updated, r2.removed, r2.kept], [0, 0, 0, items.length]);
  const changed = items.slice(2).map((it, i) => (i === 0 ? { ...it, title: 'changed' } : it));
  const r3 = await sync({ ...base, calendarId: 'cal1', items: changed });
  assert.deepEqual([r3.created, r3.updated, r3.removed], [0, 1, 2]);
  assert.equal(db.size, items.length - 2);
  console.log('SYNC TESTS PASSED');
}

// --- GitHub sync against a fake API
import { reconcile, repoFromLocation } from '../js/ghsync.js';
{
  let file = { sha: 's0', content: Buffer.from('{"updatedAt":0}').toString('base64') }, n = 0;
  const fake = async (url, o) => {
    if (o.method === 'GET') return { ok: true, status: 200, json: async () => file };
    const b = JSON.parse(o.body);
    if (b.sha !== file.sha) return { ok: false, status: 409, json: async () => ({ message: 'conflict' }) };
    file = { sha: `s${++n}`, content: b.content };
    return { ok: true, status: 200, json: async () => ({ content: { sha: file.sha } }) };
  };
  const base = { token: 't', repo: 'a/b', fetchFn: fake };
  assert.equal((await reconcile({ ...base, local: { updatedAt: 0 } })).action, 'same');
  const a = await reconcile({ ...base, local: { updatedAt: 5, x: 'Räm' } }); assert.equal(a.action, 'pushed');
  const b = await reconcile({ ...base, local: { updatedAt: 0 } }); assert.equal(b.action, 'pulled'); assert.equal(b.state.x, 'Räm');
  assert.equal((await reconcile({ ...base, local: { updatedAt: 5 } })).action, 'same');
  assert.equal(repoFromLocation({ hostname: 'ducalemming.github.io', pathname: '/hydro-garden/' }), 'ducalemming/hydro-garden');
  console.log('GITHUB SYNC TESTS PASSED');
}
