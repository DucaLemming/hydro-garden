import { load, save, defaults, emptySlot, encode, decode, normalise } from './store.js';
import { geo, layers, waterTargets, DEFAULT_SETTINGS } from './geometry.js';
import { allPlants, plantMap, CATS as PLANT_CATS, START_LABEL, sowText, short } from './plants.js';
import { buildSchedule, milestones, stageOf, doseText, CATS, SLOT_IDS } from './schedule.js';
import { calendarItems, toICS } from './ics.js';
import { sync, hasToken, hash } from './gcal.js';
import { crossSection, gauge, cutGlyph } from './diagrams.js';
import { today, addDays, diffDays, fmt, fmtLong, round, esc } from './util.js';
import { viewGuide } from './guide.js';
import { loadCfg, saveCfg, reconcile, pull, readJson, repoFromLocation, BRANCH } from './ghsync.js';

let state = load();
const ui = { sheet: null, cats: new Set(), showDone: false, q: '', sync: null, litres: '', sowDay: today(), open: {} };
const $ = sel => document.querySelector(sel);
const plants = () => plantMap(state.custom);
const sched = () => buildSchedule(state, plants(), today());
const persist = () => { state.updatedAt = Date.now(); save(state); schedulePush(); scheduleCal(); };

// ---------- keeping Google Calendar in step with the plan ----------
// What was last sent is remembered per reminder, so a ticked or shifted task shows up as "out of date".
const calNow = () => { const sc = sched(); return sc.tank ? calendarItems(sc, state, today(), CATS) : []; };
const calSig = items => Object.fromEntries(items.map(i => [i.key, hash(`${i.date}|${i.time}|${i.title}|${i.body}|${i.every || ''}`)]));
// When the calendar job on GitHub is set up, it reports here and the browser stays out of it.
const calAuto = () => { const a = ui.calAuto; return a && Date.now() - Date.parse(a.at) < 3 * 864e5 ? a : null; };
function calChanges() {
  if (calAuto()?.ok) return 0;
  if (!state.calSynced || !state.settings.gcalClientId) return 0;
  const was = state.calSynced, now = calSig(calNow()), d = today();
  let n = 0;
  for (const k of Object.keys(now)) if (was[k] !== now[k]) n++;
  for (const k of Object.keys(was)) if (!(k in now) && (k === 'tank:topup' || k.slice(0, 10) >= d)) n++;
  return n;
}
let calTimer = null;
function scheduleCal() { clearTimeout(calTimer); calTimer = setTimeout(() => { if (hasToken() && calChanges() && !ui.sync?.busy) runCalSync(true); }, 4000); }
async function runCalSync(quiet) {
  const s = state.settings;
  if (!s.gcalClientId) { ui.sync = { err: 'Add your Google client ID in Settings first. The steps are listed there.' }; return render(); }
  ui.sync = { busy: true, msg: quiet ? 'Updating Google Calendar...' : 'Waiting for Google sign-in...' }; if (!quiet) render();
  try {
    const items = calNow();
    const r = await sync({ clientId: s.gcalClientId.trim(), calendarId: s.gcalCalendarId, items, colors: CATS, today: today(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin', onProgress: (n, t) => { if (!quiet && (n % 5 === 0 || n === t)) { ui.sync = { busy: true, msg: `Sending ${n} of ${t}...` }; render(); } } });
    state.settings.gcalCalendarId = r.calendarId; state.lastSync = new Date().toISOString(); state.calSynced = calSig(items);
    ui.sync = { ok: `Calendar "Hydro Garden" is up to date: ${r.created} added, ${r.updated} changed, ${r.removed} removed.` };
    state.updatedAt = Date.now(); save(state); schedulePush(); render();
  } catch (e) { ui.sync = { err: `Google Calendar was not updated: ${e.message}` }; render(); }
}
const calBanner = () => { const n = calChanges(); return n && !ui.sync?.busy ? `<div class="warn calwarn"><span>Google Calendar still shows ${n} reminder${n > 1 ? 's' : ''} that changed or ${n > 1 ? 'are' : 'is'} done.</span><button class="btn small" data-action="gcal-sync">Update Google Calendar</button></div>` : ''; };
const commit = () => { persist(); render(); };

// ---------- saving to GitHub so all devices agree ----------
const SITE_REPO = repoFromLocation(location);
const gh = { cfg: loadCfg(), status: '', error: '', busy: false, timer: null, at: null,
  get repo() { return (this.cfg.repo || SITE_REPO).trim(); },
  get branch() { return this.repo.toLowerCase() === SITE_REPO.toLowerCase() ? BRANCH : null; } };
const connectLink = () => `${location.origin}${location.pathname}#/connect/${encodeURIComponent(gh.repo)}/${encodeURIComponent(gh.cfg.token)}`;
function qrSvg(text) { try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch { return ''; } }
const ghLine = () => (!gh.cfg.token ? 'Not connected. This device keeps its own copy.' : gh.error ? gh.error : gh.busy ? 'Saving to GitHub...' : gh.at ? `In sync with GitHub since ${gh.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.` : 'Connected.');
const SYNC_TXT = { off: 'Sync off', ok: 'Synced', busy: 'Syncing', pending: 'Changes waiting', err: 'Sync error' };
const ghState = () => (!gh.cfg.token ? 'off' : gh.busy ? 'busy' : gh.error ? 'err' : gh.pending ? 'pending' : 'ok');
const CLOUD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9z"/></svg>';
const syncBtn = top => `<button type="button" class="syncbtn sync-${ghState()} ${top ? 'top' : ''}" data-action="open-sync">${CLOUD}<span class="sync-t">${SYNC_TXT[ghState()]}</span></button>`;
function paintGh() {
  document.querySelectorAll('[data-gh]').forEach(el => { el.textContent = ghLine(); el.classList.toggle('bad', !!gh.error); });
  const st = ghState();
  document.querySelectorAll('.syncbtn').forEach(b => { b.className = `syncbtn sync-${st} ${b.classList.contains('top') ? 'top' : ''}`; b.title = st === 'err' ? `Sync error: ${gh.error}` : ghLine(); b.setAttribute('aria-label', `Sync: ${SYNC_TXT[st]}. Open sync settings`); b.querySelector('.sync-t').textContent = SYNC_TXT[st]; });
  const ban = $('#gh-banner'); if (ban) { ban.hidden = !gh.error; ban.textContent = gh.error ? `Not saved to GitHub: ${gh.error}` : ''; }
}
function schedulePush() { if (!gh.cfg.token) return; gh.pending = true; clearTimeout(gh.timer); gh.timer = setTimeout(syncNow, 1500); paintGh(); }
async function syncNow() {
  if (!gh.cfg.token || gh.busy) return;
  gh.busy = true; gh.pending = false; paintGh();
  try {
    const r = await reconcile({ token: gh.cfg.token, repo: gh.repo, branch: gh.branch, local: state });
    gh.cfg.sha = r.sha; saveCfg(gh.cfg); gh.error = ''; gh.at = new Date();
    if (gh.branch) readJson({ token: gh.cfg.token, repo: gh.repo, branch: gh.branch, file: 'calendar-status.json' }).then(a => { const was = JSON.stringify(ui.calAuto); ui.calAuto = a; if (JSON.stringify(a) !== was && /^#\/(plan|today|settings)?$/.test(location.hash || '#/') && !ui.sheet && !document.activeElement?.matches?.('input,select,textarea')) render(); });
    if (r.action === 'pulled') { state = normalise(r.state); save(state); gh.busy = false; return render(); }
  } catch (e) { gh.error = e.message; }
  gh.busy = false; paintGh();
}
async function connectGh(join = false) {
  gh.error = ''; gh.busy = true; paintGh();
  try {
    const remote = await pull({ token: gh.cfg.token, repo: gh.repo, branch: gh.branch });
    const has = remote.state && remote.state.updatedAt > 0;
    if (has && (join || confirm(`GitHub already holds a saved garden from ${new Date(remote.state.updatedAt).toLocaleString('en-GB')}. Use it on this device? Choose Cancel to keep this device's garden and overwrite the saved one.`))) { state = normalise(remote.state); save(state); }
    else { state.updatedAt = Date.now(); save(state); }
    gh.busy = false; await syncNow(); render();
  } catch (e) { gh.busy = false; gh.error = e.message; render(); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
setInterval(() => { if (!document.hidden) syncNow(); }, 60000);

// ---------- inputs with built-in explanations ----------
// Every field carries a help text that says what to enter and in which unit.
export function field({ id, label, help, unit = '', type = 'number', value, path, min, max, step, options, placeholder }) {
  const v = value ?? '';
  const attrs = `id="${id}" data-path="${path}" aria-describedby="${id}-help"`;
  let input;
  if (type === 'select') input = `<select ${attrs}>${options.map(([val, text]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select>`;
  else if (type === 'checkbox') input = `<input type="checkbox" ${attrs} ${v ? 'checked' : ''}>`;
  else input = `<input type="${type}" ${attrs} value="${esc(v)}" ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} ${step != null ? `step="${step}"` : ''} ${type === 'number' ? 'inputmode="decimal"' : ''} ${placeholder ? `placeholder="${esc(placeholder)}"` : ''}>`;
  return `<div class="field ${type === 'checkbox' ? 'field-check' : ''}">
    <div class="field-head"><label for="${id}">${esc(label)}</label><button type="button" class="tip" data-action="tip" aria-label="What to enter for ${esc(label)}" aria-expanded="false">?</button></div>
    <div class="input-wrap">${input}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</div>
    <p class="help" id="${id}-help" role="tooltip">${help}${unit ? ` <strong>Unit: ${esc(unit === 'L' ? 'litres' : unit === 'mm' ? 'millimetres' : unit)}.</strong>` : ''}</p>
  </div>`;
}
const setPath = (obj, path, val) => { const ks = path.split('.'); const last = ks.pop(); let o = obj; for (const k of ks) o = o[k] ??= {}; o[last] = val; };

// ---------- shared pieces ----------
const dots = n => `<span class="fit" title="${['', 'Possible, but not ideal in this tray', 'Works with some care', 'Thrives in this tray'][n]}">${'●'.repeat(n)}<span class="off">${'●'.repeat(3 - n)}</span></span>`;
const chip = cat => `<span class="chip" style="--c:${CATS[cat].color}">${CATS[cat].label}</span>`;

function taskRow(t, { showDate = false } = {}) {
  const done = !!state.done[t.id], late = !done && t.date < today();
  return `<li class="task ${done ? 'done' : ''}" style="--c:${CATS[t.cat].color}">
    <input type="checkbox" id="t-${esc(t.id)}" data-action="toggle" data-id="${esc(t.id)}" ${done ? 'checked' : ''} aria-label="Done: ${esc(t.title)}">
    <div class="task-body">
      <label for="t-${esc(t.id)}" class="task-title">${esc(t.title)}</label>
      <div class="task-meta">${chip(t.cat)}${showDate || late ? `<span class="${late ? 'late' : ''}">${late ? `since ${fmt(t.date)}` : fmt(t.date)}</span>` : ''}</div>
      <details class="task-how"><summary>How</summary><p class="task-detail">${esc(t.detail)}</p></details>
      ${t.observe && !done ? `<button class="btn small" data-action="observe" data-slot="${t.slot}" data-key="${t.observe}">Yes, I saw it today</button>` : ''}
      ${t.waterChange && !done ? `<button class="btn small" data-action="water-changed" data-id="${esc(t.id)}">Changed the water today</button>` : ''}
    </div></li>`;
}

function trayMap(compact = false) {
  const pm = plants(), d = today(), right = state.settings.funnelSide === 'right';
  const slot = id => {
    const sl = state.slots[id], p = pm[sl.plant], st = stageOf(sl, p, d);
    return `<button class="slot st-${st.key} ${p?.height === 'tall' ? 'tall' : ''}" data-action="open-slot" data-slot="${id}" aria-label="Slot ${id}: ${p ? esc(p.name) : 'empty'}, ${st.label}">
      <span class="slot-id">${id}</span><span class="slot-name">${p ? esc(short(p)) : 'Empty'}</span><span class="slot-stage">${st.label}</span></button>`;
  };
  const funnel = `<div class="funnel" aria-label="Funnel slit and fill indicator on the ${right ? 'right' : 'left'}"><span class="slit"></span><span class="ind"></span><span class="funnel-label">Funnel</span></div>`;
  return `<div class="tray ${compact ? 'compact' : ''}">
    <div class="lamp-post">Lamp post side</div>
    <div class="tray-body">${right ? '' : funnel}
      <div class="tray-grid">
        ${['A1', 'A2', 'A3', 'A4'].map(slot).join('')}
        <span class="sp"></span>${['B1', 'B2', 'B3'].map(slot).join('')}<span class="sp"></span>
        ${['C1', 'C2', 'C3', 'C4'].map(slot).join('')}
      </div>${right ? funnel : ''}</div>
    <div class="tray-front">Front</div></div>`;
}

function waterCard(sc) {
  const s = state.settings, wt = waterTargets(s), mode = sc.tank ? sc.tank.modeAt(today()) : 'germ', w = wt[mode];
  const strength = sc.tank ? sc.tank.strengthAt(today()) : 0, g = geo(s);
  const litres = parseFloat(ui.litres);
  const ml = s.fertDose && strength && litres > 0 ? round(s.fertDose * strength * litres, 1) : null;
  return `<section class="card water-card">
    <h2>Water and fertilizer right now</h2>
    <div class="water-row">${gauge(s, w.fill.h, w.low.h)}
      <div>
        <p class="lead">${mode === 'germ' ? 'Seeds are sprouting: keep the plugs in contact with the water.' : 'Roots are down: keep an air gap under the plugs.'}</p>
        <ul class="plain">
          <li><strong>Fill to</strong> ${w.fill.text} (${w.fill.h} mm above the tank floor).</li>
          <li><strong>Top up when</strong> the level is ${w.low.at}.</li>
          <li><strong>Fertilizer:</strong> ${doseText(s, strength)}</li>
        </ul>
      </div></div>
    <div class="calc">
      ${field({ id: 'calc-l', label: 'Water I am adding now', unit: 'L', value: ui.litres, path: 'ui.litres', min: 0, max: 20, step: 0.1, placeholder: 'e.g. 0.5', help: 'How much water is in the jug you are about to pour in. The fertilizer amount for exactly that much water appears next to it.' })}
      <p class="calc-out">${!strength ? 'No fertilizer needed yet.' : !s.fertDose ? `Enter the dose from your bottle in <a href="#/settings">Settings</a> to get millilitres.` : ml != null ? `Add <strong>${ml} ml</strong> of fertilizer to that jug.` : 'Enter the litres to get the millilitres of fertilizer.'}</p>
    </div>
    ${g.perMm ? `<p class="note">From MIN up to the fill level is about ${wt.litres(g.min, w.fill.h)} L.</p>` : ''}
  </section>`;
}

// ---------- views ----------
function viewToday() {
  const sc = sched(), d = today(), anySown = SLOT_IDS.some(id => state.slots[id].sown);
  const open = sc.tasks.filter(t => !state.done[t.id]);
  const due = open.filter(t => t.date <= d), soon = open.filter(t => t.date > d && t.date <= addDays(d, 7));
  const planted = SLOT_IDS.filter(id => state.slots[id].plant).length;
  const start = `<section class="card start">
      <h2>Pick your sowing day</h2>
      <p>${planted} of 11 slots have a plant chosen. Set the day you sow and every date in the plan follows from it. You can change single slots later.</p>
      ${field({ id: 'sow-day', label: 'Sowing day', type: 'date', value: ui.sowDay, path: 'ui.sowDay', help: 'The day you put the seeds into the plugs. Pick it from the calendar. It can be today or a day in the future.' })}
      <button class="btn primary" data-action="sow-all">Use this day for all ${planted} slots</button>
    </section>`;
  return `<header class="view-head"><h1>${fmtLong(d)}</h1><p class="sub">${anySown ? `${due.length ? `${due.length} thing${due.length > 1 ? 's' : ''} to do` : 'Nothing to do today'}, ${soon.length} coming up this week.` : 'Your tray is planned but not sown yet.'}</p></header>
  <div class="cols">
    <div class="col">
      ${anySown ? '' : start}
      <section class="card"><h2>Your tray</h2>${trayMap(true)}<p class="note">Tap a slot to change the plant or record what you see.</p></section>
      ${anySown ? waterCard(sc) : ''}
    </div>
    <div class="col">
      ${calBanner()}${sc.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('')}
      ${anySown ? `<section class="card"><h2>To do now</h2>${due.length ? `<ul class="tasks">${due.map(t => taskRow(t)).join('')}</ul>` : '<p class="empty">All done. Check the water level if you have not looked for two or three days.</p>'}</section>
      <section class="card"><h2>Next 7 days</h2>${soon.length ? `<ul class="tasks">${soon.map(t => taskRow(t, { showDate: true })).join('')}</ul>` : '<p class="empty">Nothing scheduled.</p>'}<p><a href="#/plan">See the whole plan</a></p></section>` : waterPreview()}
    </div>
  </div>`;
}
function waterPreview() {
  const s = state.settings, wt = waterTargets(s), L = layers(s, plants().basil);
  return `<section class="card"><h2>Before you sow</h2><ul class="plain">
    <li>Each basket gets <strong>${L.base} mm of pebbles</strong> first, then the soaked plug, which ends about ${L.free} mm below the rim.</li>
    <li>Fill the tank to <strong>${wt.germ.fill.text}</strong> so the plugs dip about ${L.dip} mm into the water.</li>
    <li>The exact layers for each plant are in its slot. Tap a slot on the tray.</li></ul>
    <p><a href="#/guide">Read the sowing day steps</a></p></section>`;
}

function layoutNotes() {
  const pm = plants(), right = state.settings.funnelSide === 'right', notes = [];
  const P = id => (id ? pm[state.slots[id].plant] : undefined);
  for (const id of right ? ['A4', 'B3', 'C4'] : ['A1', 'B1', 'C1']) if (P(id)?.height === 'tall') notes.push(`${P(id).name} in ${id} grows tall right next to the funnel and will hide the fill indicator. Move it to the far end.`);
  for (const row of [['A1', 'A2', 'A3', 'A4'], ['B1', 'B2', 'B3'], ['C1', 'C2', 'C3', 'C4']]) row.forEach((id, i) => {
    const a = P(id), b = P(row[i + 1]), prev = P(row[i - 1]);
    if (a?.spread === 'wide' && b?.spread === 'wide' && a.height !== 'tall' && b.height !== 'tall') notes.push(`${a.name} (${id}) and ${b.name} (${row[i + 1]}) both spread wide and sit side by side. Pick their outer leaves often, or put a narrow plant between them.`);
    if (a?.height === 'tall' && prev && b && prev.height === 'low' && b.height === 'low') notes.push(`${a.name} in ${id} stands between two low plants and will shade them. Group tall plants at the end away from the funnel.`);
  });
  for (const id of SLOT_IDS) { const p = P(id); if (p?.water === 'dry') notes.push(`${p.name} in ${id} wants a drier root zone than its neighbours. Its basket needs the thicker pebble bed shown in its planting drawing.`); else if (p?.fit === 1) notes.push(`${p.name} in ${id} is a poor match for this tray.`); }
  return notes;
}
function suggestArrangement() {
  const pm = plants(), right = state.settings.funnelSide === 'right';
  const X = { A1: 0, A2: 2, A3: 4, A4: 6, B1: 1, B2: 3, B3: 5, C1: 0, C2: 2, C3: 4, C4: 6 };
  const pos = SLOT_IDS.map(id => ({ id, score: (right ? 6 - X[id] : X[id]) * 10 + { A: 12, B: 8, C: -15 }[id[0]] })).sort((a, b) => b.score - a.score);
  const rank = p => (!p ? -1 : { tall: 30, mid: 20, low: 10 }[p.height] + (p.life && p.life < 80 ? -3 : 0) + (p.spread === 'narrow' ? 2 : 0));
  const items = SLOT_IDS.map(id => state.slots[id]).sort((a, b) => rank(pm[b.plant]) - rank(pm[a.plant]));
  const next = {}; pos.forEach((p, i) => { next[p.id] = items[i]; });
  return next;
}

function viewTray() {
  const notes = layoutNotes();
  return `<header class="view-head"><h1>Tray</h1><p class="sub">Seen from above. Tap a slot to choose its plant, see how to plant it and record dates.</p></header>
  <div class="cols"><div class="col wide">
    <section class="card">${trayMap()}
      <div class="row">
        ${field({ id: 'funnel-side', label: 'Funnel side', type: 'select', value: state.settings.funnelSide, path: 'settings.funnelSide', options: [['right', 'Funnel on the right'], ['left', 'Funnel on the left']], help: 'Which side the funnel slit and fill indicator are on when you stand in front of the tray. The part is reversible, so choose how yours is fitted.' })}
        <button class="btn" data-action="arrange">Suggest an arrangement</button>
      </div></section>
  </div><div class="col">
    <section class="card"><h2>Layout check</h2>${notes.length ? `<ul class="plain notes">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="empty">No problems found: tall plants are grouped away from the funnel and wide ones have room.</p>'}</section>
    <section class="card"><h2>Stages</h2><ul class="legend">${[['germ', 'Germinating'], ['seedling', 'Seedling'], ['young', 'Young plant'], ['grow', 'Growing'], ['harvest', 'Ready to harvest'], ['end', 'Due for replacing']].map(([k, l]) => `<li><span class="sw st-${k}"></span>${l}</li>`).join('')}<li><span class="sw tallsw"></span>Thick ring: grows tall</li></ul></section>
  </div></div>`;
}

function plantingSteps(p) {
  const s = state.settings, L = layers(s, p), wt = waterTargets(s);
  if (L.type === 'plug') return [
    p.prep ? `The evening before: ${p.prep}` : null,
    `Rinse the clay pebbles, then put a <strong>${L.base} mm</strong> bed of them into the basket (about ${L.base <= 10 ? 'one layer' : L.base <= 18 ? 'two layers' : 'three layers'} of 4 to 8 mm pebbles).`,
    `Soak the plug in lukewarm water for 10 to 15 minutes until fully swollen, then squeeze it gently.`,
    `Set the plug on the pebble bed${L.mustPress ? ' and press it down gently until it rests on the pebbles. The wet plug is soft and takes the shape of the tapered basket' : ''}. Its top should end up about <strong>${L.free} mm below the rim</strong>.`,
    `Sow: ${sowText(p)}.`,
    L.dry ? `This plant wants a drier root zone, so its plug sits ${round(L.base - geo(s).inMax)} mm above the MAX waterline. Drip water onto the plug with the syringe every day until roots reach the water.` : `Fill the tank to ${wt.germ.fill.text}. The bottom ${L.dip} mm of the plug then stands in water and keeps the seeds moist.`,
    `Put the lid on until the first green shows.`,
    p.keep < p.seeds[1] ? `At the first true leaves, thin to the ${p.keep} strongest${L.topDress ? ` and fill <strong>${L.topDress} mm</strong> of pebbles around the stems, leaving about 5 mm to the rim` : ''}.` : (L.topDress ? `Once the seedlings stand, fill <strong>${L.topDress} mm</strong> of pebbles around them, leaving about 5 mm to the rim.` : null),
  ].filter(Boolean);
  return [
    p.start === 'rootend' ? 'Cut the spring onion 4 to 5 cm above the roots and peel off any slimy outer layer.' : p.start === 'clove' ? 'Break off a firm clove and leave its skin on.' : 'Root fresh stems in a glass of water for 1 to 2 weeks, until the roots are 2 to 3 cm long.',
    `Put a <strong>${L.seat} mm</strong> bed of rinsed pebbles into the basket.`,
    `${sowText(p)} on the pebble bed. The root base then sits just under the MAX waterline.`,
    `Fill pebbles around it up to <strong>${L.free} mm below the rim</strong> (a ${L.fillTop - L.seat} mm layer) so it stands by itself.`,
    `No lid. Keep the tank between MIN and MAX.`,
  ];
}

function plantFacts(p) {
  const rows = [
    ['Start from', START_LABEL[p.start]],
    ['Per basket', sowText(p)],
    p.start === 'seed' ? ['Sprouts after', `${p.germ[0]} to ${p.germ[1]} days`] : ['Settles in', `${p.germ[0]} to ${p.germ[1]} days`],
    p.start === 'seed' && p.keep < p.seeds[1] ? ['Thin to', `${p.keep} plants`] : null,
    p.flower ? ['First flowers', `about day ${p.flower}`] : null,
    ['First harvest', `about day ${p.harvest} (week ${Math.ceil(p.harvest / 7)})`],
    ['Lasts', p.life ? `about ${p.life} days, then replace` : 'many months'],
    ['Height', `${p.height}${p.cm ? `, ${p.cm[0]} to ${p.cm[1]} cm` : ''}`],
    ['Water', { wet: 'loves wet roots', normal: 'normal', dry: 'prefers a drier root zone' }[p.water]],
  ].filter(Boolean);
  return `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function plantDetail(p) {
  const s = state.settings, L = layers(s, p);
  return `<div class="plant-detail">
    <div class="pd-main">
      ${plantFacts(p)}
      <p class="tipline">${esc(p.tips || '')}</p>
      <h3>How to plant it</h3>
      <ol class="steps">${plantingSteps(p).map(x => `<li>${x}</li>`).join('')}</ol>
      ${L.warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('')}
      <h3>How to harvest</h3>
      <div class="harvest">${cutGlyph(p.cut)}<p>${esc(p.how)}</p></div>
    </div>
    <figure class="pd-fig">${crossSection(s, p)}
      <figcaption>To scale, from your tray's measurements.</figcaption>
      <table class="layers"><thead><tr><th>Layer, bottom to top</th><th>Thickness</th></tr></thead><tbody>${L.stack.map(l => `<tr><td>${esc(l.label)}</td><td>${round(l.to - l.from)} mm</td></tr>`).join('')}</tbody></table>
    </figure></div>`;
}

function viewPlants(id) {
  const all = allPlants(state.custom), pm = plants();
  if (id && pm[id]) {
    const p = pm[id];
    return `<header class="view-head"><p class="crumb"><a href="#/plants">All plants</a></p><h1>${esc(p.name)}</h1><p class="sub">${p.de ? `${esc(p.de)}. ` : ''}${dots(p.fit)} ${['', 'Possible, but not ideal in this tray', 'Works with some care', 'Thrives in this tray'][p.fit]}</p></header>
    <section class="card">${plantDetail(p)}</section>
    <section class="card"><h2>Put it in the tray</h2><div class="row">${SLOT_IDS.map(sid => `<button class="btn small" data-action="assign" data-slot="${sid}" data-plant="${p.id}">${sid}${pm[state.slots[sid].plant] ? ` (now ${esc(short(pm[state.slots[sid].plant]))})` : ' (empty)'}</button>`).join('')}</div>
    ${p.custom ? `<p><button class="btn danger" data-action="del-custom" data-plant="${p.id}">Delete this plant</button></p>` : ''}</section>`;
  }
  const q = ui.q.trim().toLowerCase();
  const list = all.filter(p => !q || `${p.name} ${p.de}`.toLowerCase().includes(q));
  const cats = [...PLANT_CATS, 'My plants'];
  return `<header class="view-head"><h1>Plants</h1><p class="sub">${all.length} plants that suit small baskets without a pump. Open one for seed counts, layers and harvest.</p></header>
  <section class="card">
    ${field({ id: 'plant-q', label: 'Find a plant', type: 'search', value: ui.q, path: 'ui.q', placeholder: 'Basil, Rucola, ...', help: 'Type part of a plant name in English or German. The list below narrows as you type.' })}
    ${cats.map(c => { const ps = list.filter(p => p.cat === c); return ps.length ? `<h2 class="cat">${c}</h2><ul class="plant-list">${ps.map(p => `<li><a href="#/plants/${p.id}"><span class="pl-name">${esc(p.name)}${p.de ? `<small>${esc(p.de)}</small>` : ''}</span><span class="pl-meta">${dots(p.fit)}<span>${p.start === 'seed' ? `${p.seeds[0] === p.seeds[1] ? p.seeds[0] : `${p.seeds[0]} to ${p.seeds[1]}`} seeds` : START_LABEL[p.start].split(',')[0]}</span><span>harvest day ${p.harvest}</span></span></a></li>`).join('')}</ul>` : ''; }).join('')}
    ${list.length ? '' : '<p class="empty">No plant matches. Add it as your own plant below.</p>'}
  </section>
  <section class="card"><h2>Add your own plant</h2><p>For anything not in the list. Take the numbers from the seed packet.</p><form id="custom-form" class="grid2">
    ${field({ id: 'c-name', label: 'Name', type: 'text', path: 'form.name', placeholder: 'e.g. Shiso', help: 'What you want the plant to be called in the tray and the plan. Plain text.' })}
    ${field({ id: 'c-start', label: 'Started from', type: 'select', path: 'form.start', value: 'seed', options: Object.entries(START_LABEL), help: 'Seeds go into a seed plug. Root ends, cloves and cuttings stand directly in pebbles without a plug.' })}
    ${field({ id: 'c-seeds', label: 'Seeds per basket', path: 'form.seeds', min: 1, max: 40, step: 1, value: 4, unit: 'seeds', help: 'How many seeds (or cuttings) you put into one basket. Small herbs: 4 to 6. Large plants: 2.' })}
    ${field({ id: 'c-keep', label: 'Plants kept after thinning', path: 'form.keep', min: 1, max: 40, step: 1, value: 2, unit: 'plants', help: 'How many seedlings stay in the basket once you snip off the weakest. One for large plants, 2 to 4 for herbs.' })}
    ${field({ id: 'c-depth', label: 'Sowing depth', path: 'form.depth', min: 0, max: 30, step: 1, value: 5, unit: 'mm', help: 'How deep the seed sits in the plug. Enter 0 for seeds that need light and lie on the surface. The packet says "Lichtkeimer" (0) or gives a depth.' })}
    ${field({ id: 'c-g0', label: 'Sprouts after, earliest', path: 'form.g0', min: 1, max: 60, step: 1, value: 5, unit: 'days', help: 'The shorter number of the germination time on the seed packet, counted from sowing.' })}
    ${field({ id: 'c-g1', label: 'Sprouts after, latest', path: 'form.g1', min: 1, max: 90, step: 1, value: 10, unit: 'days', help: 'The longer number of the germination time on the seed packet, counted from sowing.' })}
    ${field({ id: 'c-harvest', label: 'First harvest', path: 'form.harvest', min: 5, max: 300, step: 1, value: 40, unit: 'days', help: 'Days from sowing until you can pick for the first time. Packets often give weeks: multiply by 7.' })}
    ${field({ id: 'c-life', label: 'Replace after', path: 'form.life', min: 0, max: 720, step: 1, value: 0, unit: 'days', help: 'Days from sowing until the plant is spent and gets re-sown. Enter 0 if it keeps going for many months.' })}
    ${field({ id: 'c-height', label: 'Height', type: 'select', path: 'form.height', value: 'mid', options: [['low', 'Low (under 15 cm)'], ['mid', 'Medium (15 to 25 cm)'], ['tall', 'Tall (over 25 cm)']], help: 'How tall the grown plant gets. Tall plants set the lamp height and belong at the end away from the funnel.' })}
    ${field({ id: 'c-water', label: 'Root moisture', type: 'select', path: 'form.water', value: 'normal', options: [['normal', 'Normal'], ['wet', 'Loves wet roots'], ['dry', 'Prefers it drier (Mediterranean herbs)']], help: 'Plants that prefer it drier get a thicker pebble bed, so their plug sits above the waterline.' })}
    <div class="form-actions"><button class="btn primary" type="submit">Add plant</button></div></form></section>`;
}

function viewPlan() {
  const sc = sched(), d = today();
  let ts = sc.tasks.filter(t => (ui.showDone || !state.done[t.id]) && (ui.showDone || t.date >= addDays(d, -21)));
  if (ui.cats.size) ts = ts.filter(t => ui.cats.has(t.cat));
  const groups = new Map();
  for (const t of ts) { const k = t.date < d && !state.done[t.id] ? 'late' : t.date; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
  const anySown = !!sc.tank;
  const items = anySown ? calendarItems(sc, state, d, CATS) : [];
  const sy = ui.sync;
  return `<header class="view-head"><h1>Plan</h1><p class="sub">${anySown ? `Everything due in the next 20 weeks. Dates shift when you record what you see in a slot.` : 'No dates yet. Set a sowing day on the Today page or in a slot.'}</p></header>
  ${anySown ? `<section class="card cal"><h2>Calendar reminders</h2>
    <p>${items.length} reminders at ${esc(state.settings.reminderTime)} on the days tasks are due, one per day and colour.${state.lastSync ? ` Last sent to Google Calendar: ${fmt(state.lastSync.slice(0, 10))}.` : ''}</p>
    <div class="row">${field({ id: 'plan-time', label: 'Calendar event time', type: 'time', path: 'settings.reminderTime', value: state.settings.reminderTime, help: 'The time of day at which garden events are put into your calendar and their reminders pop up. 24-hour format, for example 18:00. Events already in Google Calendar move to the new time at the next sync.' })}</div>
    ${calAuto() ? (calAuto().ok ? `<p class="okmsg">Google Calendar is updated automatically after every change. Last update ${new Date(calAuto().at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}: ${calAuto().reminders} reminders in the calendar.</p>` : `<p class="warn">The automatic calendar update failed: ${esc(calAuto().error)}</p>`) : `<p class="note">Want this to happen by itself after every change? <a href="#/settings" data-action="open-auto">Set up automatic updates</a> once.</p>`}
    <div class="row"><button class="btn primary" data-action="gcal-sync" ${sy?.busy ? 'disabled' : ''}>${sy?.busy ? esc(sy.msg || 'Working...') : 'Sync with Google Calendar'}</button>
    <button class="btn" data-action="ics">Download calendar file (.ics)</button></div>
    ${sy?.err ? `<p class="warn">${esc(sy.err)}</p>` : ''}${sy?.ok && !calChanges() ? `<p class="okmsg">${esc(sy.ok)}</p>` : ''}${calBanner()}
    ${state.calSynced && !calAuto()?.ok ? `<p class="note">Without the automatic setup, ticked or shifted tasks are taken out of Google Calendar by this device for about an hour after a sync. After that, Google wants a fresh sign-in, so the app shows an "Update Google Calendar" button instead.</p>` : ''}
    ${state.settings.gcalClientId ? '' : `<p class="note">Sync needs a one-time setup. <a href="#/settings">Open Settings, Google Calendar</a>. The calendar file works without setup: import it at calendar.google.com under Settings, Import.</p>`}
  </section>` : ''}
  <section class="card">
    <div class="filters" role="group" aria-label="Show only">${Object.entries(CATS).map(([k, c]) => `<button class="fchip ${ui.cats.has(k) ? 'on' : ''}" style="--c:${c.color}" data-action="cat" data-cat="${k}" aria-pressed="${ui.cats.has(k)}">${c.label}</button>`).join('')}
      <label class="inline"><input type="checkbox" data-action="show-done" ${ui.showDone ? 'checked' : ''}> Show done and older</label></div>
    ${groups.size ? [...groups.entries()].map(([k, list]) => `<h3 class="day ${k === 'late' ? 'late' : ''} ${k === d ? 'is-today' : ''}">${k === 'late' ? 'Still open' : k === d ? `Today, ${fmt(k)}` : fmt(k)}${k !== 'late' && k > d ? `<small>in ${diffDays(k, d)} day${diffDays(k, d) > 1 ? 's' : ''}</small>` : ''}</h3><ul class="tasks">${list.map(t => taskRow(t)).join('')}</ul>`).join('') : `<p class="empty">${anySown ? 'Nothing matches this filter.' : 'The plan appears once a slot has a sowing day.'}</p>`}
  </section>`;
}

function viewSettings() {
  const s = state.settings, g = geo(s), origin = location.origin;
  const f = (id, label, path, help, o = {}) => field({ id, label, path, help, unit: 'mm', value: path.split('.').reduce((a, k) => a?.[k], state), step: 0.5, min: 0, ...o });
  return `<header class="view-head"><h1>Settings</h1><p class="sub">Measurements drive every drawing, layer thickness and water level in the app.</p></header>
  <section class="card"><h2>Baskets</h2><div class="grid2">
    ${f('b-top', 'Basket diameter at the top', 'settings.basket.top', 'Outer width of a net basket at its rim, measured across the top.', { min: 20, max: 120 })}
    ${f('b-bot', 'Basket diameter at the bottom', 'settings.basket.bottom', 'Outer width of a net basket at its floor.', { min: 10, max: 120 })}
    ${f('b-h', 'Basket height', 'settings.basket.height', 'From the basket floor up to its rim.', { min: 20, max: 200 })}
    ${f('b-wall', 'Basket wall thickness', 'settings.basket.wall', 'Thickness of the plastic. About 1 mm for most net baskets. It only fine-tunes how the plug fits.', { max: 4 })}
  </div></section>
  <section class="card"><h2>Tank and fill indicator</h2><div class="grid2">
    ${f('t-clear', 'Space under the baskets', 'settings.tank.clearance', 'From the tank floor up to the underside of a basket that sits in its slot.', { max: 100 })}
    ${f('t-max', 'Water depth at the MAX mark', 'settings.tank.maxLevel', 'How deep the water is, measured from the tank floor, when the indicator shows MAX.', { min: 5, max: 200 })}
    ${f('t-span', 'Distance between MIN and MAX', 'settings.tank.markSpan', 'How far apart the two marks on the fill indicator are.', { min: 1, max: 100 })}
    ${f('t-len', 'Tank inside length', 'settings.tank.lengthMm', 'Optional. Inside length of the water tank. With length and width the app can tell you litres.', { min: 50, max: 1500, step: 1, placeholder: 'optional' })}
    ${f('t-wid', 'Tank inside width', 'settings.tank.widthMm', 'Optional. Inside width of the water tank.', { min: 30, max: 800, step: 1, placeholder: 'optional' })}
    ${field({ id: 't-vol', label: 'Tank volume up to MAX', unit: 'L', path: 'settings.tank.volumeL', value: s.tank.volumeL, min: 0.2, max: 30, step: 0.05, placeholder: 'optional', help: 'Optional, and more exact than length and width: fill the empty tank with a measuring jug up to the MAX mark, baskets in place, and count.' })}
  </div><p class="note">With these numbers the water stands ${round(g.inMax, 1)} mm up the baskets at MAX and ${round(g.inMin, 1)} mm at MIN.${g.volumeMax ? ` The tank holds about ${round(g.volumeMax, 1)} L at MAX.` : ''}</p></section>
  <section class="card"><h2>Plugs and pebbles</h2><div class="grid2">
    ${f('p-dia', 'Seed plug diameter, swollen', 'settings.plug.dia', 'Width of a seed plug after soaking, before you press it into the basket.', { min: 15, max: 80 })}
    ${f('p-h', 'Seed plug height, swollen', 'settings.plug.height', 'Height of a seed plug after soaking.', { min: 15, max: 80 })}
    ${f('p-base', 'Pebble bed under the plug', 'settings.baseLayer', `Thickness of the pebble layer under each plug. Keep it at ${round(g.inMax - 5)} mm or less so the plug still reaches the water at MAX.`, { max: 40, step: 1 })}
  </div></section>
  <section class="card"><h2>Fertilizer, water changes and reminders</h2><div class="grid2">
    ${field({ id: 'fert', label: 'Fertilizer dose on the label', unit: 'ml per litre', path: 'settings.fertDose', value: s.fertDose, min: 0.1, max: 50, step: 0.1, placeholder: 'e.g. 4', help: 'The full dose printed on your nutrient bottle for one litre of water. If the label says "5 ml per 2 litres", enter 2.5.' })}
    ${field({ id: 'wc', label: 'Full water change every', unit: 'days', path: 'settings.waterChangeDays', value: s.waterChangeDays, min: 5, max: 60, step: 1, help: 'How many days pass between complete water changes. 14 is a good start; go to 21 if the water stays clear.' })}
    ${field({ id: 'topup', label: 'Water level check every', unit: 'days', path: 'settings.topUpDays', value: s.topUpDays, min: 0, max: 14, step: 1, help: 'How often a "Check the water level" task appears in the plan and the calendar. Enter 0 to switch these tasks off.' })}
    ${field({ id: 'rem', label: 'Calendar event time', type: 'time', path: 'settings.reminderTime', value: s.reminderTime, help: 'The time of day at which garden events are put into your calendar and their reminders pop up. 24-hour format, for example 18:00. After changing it, sync or download the calendar again.' })}
    ${field({ id: 'light', label: 'Light starts at', type: 'time', path: 'settings.lightStart', value: s.lightStart, help: 'A note for you: the time of day you pressed the lamp timer. The 16-hour cycle repeats from then. After a power cut, press it again at this time.' })}
  </div></section>
  <section class="card" id="gcal"><h2>Google Calendar</h2>
    <p>The app creates its own calendar called "Hydro Garden" and can only see and change that one. Google needs a client ID that says the request comes from this site. You create it once, for free:</p>
    <ol class="steps">
      <li>Open <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">console.cloud.google.com</a>, signed in with the Google account whose calendar you use, and create a project (any name).</li>
      <li>In that project, search for "Google Calendar API" and press Enable.</li>
      <li>Open "Google Auth Platform" (also listed as OAuth consent screen). Enter an app name and your email, choose audience "External", and under Audience add your own Google address as a test user.</li>
      <li>Under Clients, create a client of type "Web application". Under "Authorized JavaScript origins" add exactly <code>${esc(origin)}</code></li>
      <li>Copy the client ID (it ends in .apps.googleusercontent.com) into the field below.</li>
    </ol>
    ${field({ id: 'gcid', label: 'Google client ID', type: 'text', path: 'settings.gcalClientId', value: s.gcalClientId, placeholder: '1234567890-abc.apps.googleusercontent.com', help: 'The OAuth client ID from step 5. It is not a password and can safely be stored here. Paste it on each device you use.' })}
    <p class="note">Then press "Sync with Google Calendar" on the <a href="#/plan">Plan</a> page. Google shows a notice that the app is unverified because you made it yourself: choose Continue.</p>
    <p class="note"><strong>"Error 403: access_denied" in the Google window?</strong> The app is in testing mode and the Google account you picked is not on its tester list. In the Google Cloud console open Google Auth Platform, Audience, and under "Test users" add the exact Google address you sign in with. Or press "Publish app" there, which lets any account through after the unverified-app notice.</p>
  </section>
  <section class="card" id="gcal-auto"><h2>Google Calendar, fully automatic</h2>
    ${calAuto() ? (calAuto().ok ? `<p class="okmsg">Working. Last update ${new Date(calAuto().at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}, ${calAuto().reminders} reminders in the calendar.</p>` : `<p class="warn">Last run failed: ${esc(calAuto().error)}</p>`) : ''}
    <p>A website can only write to your calendar for an hour after you sign in. To update the calendar without you, the job has to run on GitHub instead: every time the app saves the garden, GitHub works out the open tasks and corrects the calendar, usually within a minute. It also runs every morning. It signs in to Google as a "service account", a robot account that you allow to edit only the Hydro Garden calendar.</p>
    <p>This needs "Sync all devices" (below) to be connected, and one setup:</p>
    <ol class="steps">
      <li>In the <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener">Google Cloud console, Service accounts</a>, in the same project as before, press "Create service account". Name it "hydro-garden" and finish without adding roles.</li>
      <li>Open the new account, go to Keys, "Add key", "Create new key", type JSON. A file downloads.</li>
      <li>On GitHub open <a href="https://github.com/${esc(SITE_REPO)}/settings/secrets/actions/new" target="_blank" rel="noopener">${esc(SITE_REPO)}, Settings, Secrets and variables, Actions, New repository secret</a>. Name: <code>GOOGLE_SERVICE_ACCOUNT</code>. Value: the whole content of the downloaded file. Then delete the file.</li>
      <li>In Google Calendar on the web, open the settings of the "Hydro Garden" calendar, "Share with specific people", and add the service account's address (it ends in <code>.iam.gserviceaccount.com</code>) with "Make changes to events".</li>
      <li>Change anything in the app, or start the job by hand under <a href="https://github.com/${esc(SITE_REPO)}/actions/workflows/calendar.yml" target="_blank" rel="noopener">Actions, Update Google Calendar, Run workflow</a>. After about a minute this box turns green.</li>
    </ol>
    ${state.settings.gcalCalendarId ? '' : '<p class="warn">The Hydro Garden calendar does not exist yet. Press "Sync with Google Calendar" on the Plan page once first, so there is a calendar to share in step 4.</p>'}
    <p class="note">The secret is stored encrypted by GitHub and is not readable in the public repository. The service account can only touch calendars you share with it.</p>
  </section>
  <section class="card" id="ghsync"><h2>Sync all devices</h2>
    <p>Every change is saved to GitHub within a couple of seconds, and every connected device loads the newest version when you open it. Slots, dates, ticked tasks and all settings are included.</p>
    ${gh.cfg.token ? `
    <p class="ghstat" data-gh>${esc(ghLine())}</p>
    <h3>Add another device</h3>
    <p>Scan this code with the phone or tablet, or open the link on the other computer. That device is then connected. Nothing to type.</p>
    <div class="connect"><div class="qr">${qrSvg(connectLink())}</div>
      <div><button class="btn primary" data-action="copy-connect">Copy connection link</button>
      <p class="note">The link contains the access key. Give it only to people who may change the garden${gh.branch ? ', and note that this key can also change the website files. A separate data repository avoids that (field below)' : ''}.</p></div></div>
    <div class="row"><button class="btn" data-action="gh-now">Sync now</button><button class="btn danger" data-action="gh-off">Disconnect this device</button></div>` : `
    <p><strong>One-time setup, on one device only.</strong> GitHub needs a key that allows saving. You create it once here; every other device then just scans a QR code or opens a link.</p>
    <ol class="steps">
      <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub, new fine-grained token</a>. Name it "Hydro Garden" and set the expiry as long as you like.</li>
      <li>Repository access: "Only select repositories", then pick <strong>${esc(gh.repo.split('/')[1] || '')}</strong>.</li>
      <li>Repository permissions: set <strong>Contents</strong> to "Read and write". Nothing else.</li>
      <li>Generate the token and paste it below.</li>
    </ol>
    <p class="ghstat" data-gh>${esc(ghLine())}</p>`}
    <div class="grid2">
    ${field({ id: 'gh-token', label: 'GitHub access token', type: 'password', path: 'gh.token', value: gh.cfg.token, placeholder: 'github_pat_...', help: 'The fine-grained token, starting with github_pat_. It is stored only in this browser and in connection links you create. Other devices do not need you to type it: use the QR code or link that appears here after connecting.' })}
    ${field({ id: 'gh-repo', label: 'Repository for the saved garden', type: 'text', path: 'gh.repo', value: gh.cfg.repo, placeholder: SITE_REPO, help: `Leave empty to save into the website's own repository (${SITE_REPO}). To keep the saved garden private, or to share the connection link safely, enter a separate repository as owner/name, for example ${SITE_REPO}-data, and limit the token to it.` })}
    </div>
    ${gh.branch ? `<p class="note">Saved as <code>garden.json</code> on the <code>${BRANCH}</code> branch of the public repository <code>${esc(gh.repo)}</code>, so the file is readable by anyone who looks for it. It holds plants, dates and settings.</p>` : `<p class="note">Saved as <code>garden.json</code> in <code>${esc(gh.repo)}</code>.</p>`}
    <p class="note">If two devices change things within the same few seconds, the later change wins.</p>
  </section>
  <section class="card"><h2>Move data by hand</h2>
    <p>Without a token, each browser keeps its own copy. A transfer link or a backup file carries it across.</p>
    <div class="row"><button class="btn" data-action="share">Copy transfer link</button><button class="btn" data-action="export">Download backup file</button>
      <label class="btn">Load backup file<input type="file" accept="application/json,.json" data-action="import" hidden></label></div>
    ${ui.msg ? `<p class="okmsg">${esc(ui.msg)}</p>` : ''}
    <p><button class="btn danger" data-action="reset">Erase everything on this device</button></p>
  </section>`;
}

function slotSheet(id) {
  const sl = state.slots[id], pm = plants(), p = pm[sl.plant], m = milestones(sl, p), d = today();
  const opts = [['', 'Empty slot'], ...allPlants(state.custom).map(x => [x.id, `${x.name}${x.fit === 1 ? ' (poor match)' : ''}`])];
  const df = (key, label, help) => field({ id: `s-${key}`, label, type: 'date', path: `slots.${id}.${key}`, value: sl[key], max: addDays(d, 365), help });
  const st = stageOf(sl, p, d);
  return `<div class="sheet-back" data-action="close-sheet"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Slot ${id}">
    <div class="sheet-head"><h2>Slot ${id}${p ? `: ${esc(p.name)}` : ''}</h2><button class="btn small" data-action="close-sheet">Close</button></div>
    ${field({ id: 's-plant', label: 'Plant in this slot', type: 'select', path: `slots.${id}.plant`, value: sl.plant || '', options: opts, help: 'Choose what grows in this basket. Changing the plant clears the dates of the old one.' })}
    ${p ? `
    <p class="stage-line"><span class="sw st-${st.key}"></span>${st.label}${m && st.key !== 'planned' ? `, day ${diffDays(d, m.S)}` : ''}${m ? `. First harvest expected ${fmt(m.harvest)}${m.end ? `, replace around ${fmt(m.end)}` : ''}.` : ''}</p>
    <div class="row">${sl.sown ? `<button class="btn" data-action="resow" data-slot="${id}">Start a new sowing today</button>` : `<button class="btn primary" data-action="sow-today" data-slot="${id}">${p.start === 'seed' ? 'Sown' : 'Planted'} today</button>`}</div>
    <details class="dates" ${sl.sown ? 'open' : ''}><summary>Dates for this slot</summary><div class="grid2">
      ${df('sown', p.start === 'seed' ? 'Sown on' : 'Planted on', 'The day the seeds went into the plug (or the plant into the basket). Pick the date from the calendar. Every later date in the plan counts from it.')}
      ${p.start === 'seed' ? df('sprouted', 'First green seen on', 'The day you first saw a sprout in this basket. Leave empty until it happens. Later dates then follow your plant instead of the average.') : ''}
      ${p.start === 'seed' ? df('trueLeaves', 'First true leaves on', 'The day the second pair of leaves appeared, the ones that look like the real plant. Leave empty until it happens.') : ''}
      ${p.start === 'seed' ? df('rootsOut', 'Roots out of the plug on', 'The day you first saw white roots coming out under the plug or through the basket. Leave empty until it happens. This sets when the water level drops and the fertilizer rises.') : ''}
      ${p.flower ? df('flowers', 'First flower open on', 'The day the first flower opened. Leave empty until it happens. The ripening date follows from it.') : ''}
      ${p.start === 'seed' ? field({ id: 's-saucer', label: 'Started in a saucer, not in the tray', type: 'checkbox', path: `slots.${id}.saucer`, value: sl.saucer, help: 'Tick this if the plug germinates outside the tray in a saucer of water, as recommended when you re-sow into a running tray. The tank level then ignores this plug.' }) : ''}
    </div></details>
    ${plantDetail(p)}
    <p><a href="#/plants/${p.id}" data-action="close-sheet-link">Open ${esc(p.name)} in the plant list</a></p>` : '<p class="empty">Choose a plant to see how to plant it.</p>'}
  </div>`;
}

// ---------- shell ----------
const NAV = [['today', 'Today', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'], ['tray', 'Tray', 'M3 6h18v12H3zM8 10.5a1.5 1.5 0 1 0 .01 0M16 10.5a1.5 1.5 0 1 0 .01 0M12 13.5a1.5 1.5 0 1 0 .01 0'], ['plan', 'Plan', 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5'], ['plants', 'Plants', 'M12 21v-9M12 12c0-5 3-8 8-8 0 5-3 8-8 8zM12 15c0-4-2-6-7-6 0 4 2 6 7 6z'], ['guide', 'Guide', 'M5 4h10l4 4v12H5zM9 12h6M9 16h6'], ['settings', 'Settings', 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.5v5M8 14.5v5']];

function render() {
  const [, view = 'today', arg] = location.hash.split('/');
  const active = document.activeElement?.id;
  const body = view === 'tray' ? viewTray() : view === 'plan' ? viewPlan() : view === 'plants' ? viewPlants(arg) : view === 'guide' ? viewGuide(state, plants(), field) : view === 'settings' ? viewSettings() : viewToday();
  const cur = NAV.some(n => n[0] === view) ? view : 'today';
  $('#app').innerHTML = `<nav class="nav" aria-label="Main"><a class="brand" href="#/today">Hydro Garden</a>${NAV.map(([k, l, d]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}" ${k === cur ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${l}</span></a>`).join('')}<div class="nav-foot">${syncBtn(false)}</div></nav>${syncBtn(true)}
  <main id="main" class="view-${cur}"><p class="warn" id="gh-banner" hidden></p>${body}</main>${ui.sheet ? slotSheet(ui.sheet) : ''}`;
  document.body.classList.toggle('has-sheet', !!ui.sheet);
  paintGh();
  if (active) { const el = document.getElementById(active); if (el && el.focus) { el.focus({ preventScroll: true }); } }
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const actions = {
  tip(el) { const f = el.closest('.field'); const on = f.classList.toggle('open'); el.setAttribute('aria-expanded', on); },
  toggle(el) { if (el.checked) state.done[el.dataset.id] = today(); else delete state.done[el.dataset.id]; commit(); },
  'open-slot'(el) { ui.sheet = el.dataset.slot; render(); document.querySelector('.sheet')?.scrollTo(0, 0); },
  'close-sheet'() { ui.sheet = null; render(); },
  'close-sheet-link'() { ui.sheet = null; },
  observe(el) { state.slots[el.dataset.slot][el.dataset.key] = today(); commit(); },
  'water-changed'(el) { state.tankLastChange = today(); state.done[el.dataset.id] = today(); commit(); },
  'sow-all'() { const day = ui.sowDay || today(); for (const id of SLOT_IDS) if (state.slots[id].plant && !state.slots[id].sown) state.slots[id].sown = day; commit(); },
  'sow-today'(el) { state.slots[el.dataset.slot].sown = today(); commit(); },
  resow(el) { const id = el.dataset.slot; if (confirm(`Start a new sowing in ${id} today? The dates of the current plant in this slot are cleared.`)) { state.slots[id] = { ...emptySlot(state.slots[id].plant), sown: today() }; commit(); } },
  assign(el) { const id = el.dataset.slot; state.slots[id] = emptySlot(el.dataset.plant); ui.sheet = id; location.hash = '#/tray'; commit(); },
  arrange() { const next = suggestArrangement(); if (confirm('Rearrange the tray so tall plants stand at the end away from the funnel and low, often-picked plants sit in front? Baskets keep their dates; move the real baskets to match.')) { state.slots = next; commit(); } },
  cat(el) { const c = el.dataset.cat; ui.cats.has(c) ? ui.cats.delete(c) : ui.cats.add(c); render(); },
  'show-done'(el) { ui.showDone = el.checked; render(); },
  ics() { download('hydro-garden.ics', toICS(calendarItems(sched(), state, today(), CATS)), 'text/calendar'); },
  'gcal-sync'() { runCalSync(false); },
  async share() { const url = `${location.origin}${location.pathname}#/import/${encode(state)}`; try { await navigator.clipboard.writeText(url); ui.msg = 'Transfer link copied. Open it on the other device.'; } catch { prompt('Copy this link and open it on the other device:', url); } render(); },
  'gh-now'() { syncNow(); },
  'open-auto'() { setTimeout(() => document.getElementById('gcal-auto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); },
  'open-sync'() { ui.sheet = null; location.hash = '#/settings'; setTimeout(() => document.getElementById('ghsync')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); },
  'gh-off'() { if (confirm('Stop syncing on this device? The garden stays here as a local copy.')) { gh.cfg = { token: '', sha: null, repo: '' }; saveCfg(gh.cfg); gh.error = ''; render(); } },
  async 'copy-connect'() { try { await navigator.clipboard.writeText(connectLink()); ui.msg = 'Connection link copied.'; } catch { prompt('Copy this link and open it on the other device:', connectLink()); } render(); },
  export() { download(`hydro-garden-backup-${today()}.json`, JSON.stringify(state, null, 1), 'application/json'); },
  reset() { if (confirm('Erase all slots, dates and settings on this device? This cannot be undone.')) { state = defaults(); commit(); } },
  'del-custom'(el) { const id = el.dataset.plant; if (confirm('Delete this plant? Slots that use it become empty.')) { state.custom = state.custom.filter(c => c.id !== id); for (const s of SLOT_IDS) if (state.slots[s].plant === id) state.slots[s] = emptySlot(); location.hash = '#/plants'; commit(); } },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.matches('input,select')) return;
  const fn = actions[el.dataset.action]; if (fn) fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.action === 'import') {
    const file = el.files[0]; if (!file) return;
    file.text().then(t => { state = normalise(JSON.parse(t)); ui.msg = 'Backup loaded.'; commit(); }).catch(() => { ui.msg = 'That file is not a Hydro Garden backup.'; render(); });
    return;
  }
  if (el.dataset.action && actions[el.dataset.action]) return actions[el.dataset.action](el, e);
  const path = el.dataset.path; if (!path || path.startsWith('form.')) return;
  if (!el.checkValidity()) { el.closest('.field')?.classList.add('open', 'invalid'); return; }
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number') v = el.value === '' ? null : Number(el.value);
  if (el.type === 'date' || el.tagName === 'SELECT') v = el.value || null;
  if (path === 'gh.repo') { gh.cfg = { ...gh.cfg, repo: el.value.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, ''), sha: null }; saveCfg(gh.cfg); if (gh.cfg.token) connectGh(); else render(); return; }
  if (path === 'gh.token') { gh.cfg = { ...gh.cfg, token: el.value.trim(), sha: null }; saveCfg(gh.cfg); if (gh.cfg.token) connectGh(); else { gh.error = ''; render(); } return; }
  if (path.startsWith('ui.')) { ui[path.slice(3)] = el.value; return setTimeout(render); }
  if (path.startsWith('settings.') && v === null && !/lengthMm|widthMm|volumeL|fertDose/.test(path)) v = path.split('.').reduce((a, k) => a?.[k], { settings: DEFAULT_SETTINGS });
  if (/^slots\.\w+\.plant$/.test(path)) { state.slots[path.split('.')[1]] = emptySlot(v); }
  else setPath(state, path, v);
  persist(); setTimeout(render);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'plant-q') { ui.q = el.value; const pos = el.selectionStart; render(); const n = $('#plant-q'); n.focus(); n.setSelectionRange(pos, pos); }
  if (el.id === 'calc-l') { ui.litres = el.value; const s = state.settings, sc = sched(), st = sc.tank ? sc.tank.strengthAt(today()) : 0, l = parseFloat(el.value); const out = $('.calc-out'); if (out && s.fertDose && st) out.innerHTML = l > 0 ? `Add <strong>${round(s.fertDose * st * l, 1)} ml</strong> of fertilizer to that jug.` : 'Enter the litres to get the millilitres of fertilizer.'; }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'custom-form') return;
  e.preventDefault();
  const v = k => e.target.querySelector(`[data-path="form.${k}"]`).value, n = k => Number(v(k));
  const name = v('name').trim(); if (!name) { $('#c-name').closest('.field').classList.add('open', 'invalid'); return $('#c-name').focus(); }
  const g0 = Math.min(n('g0'), n('g1')), g1 = Math.max(n('g0'), n('g1')), start = v('start'), harvest = Math.max(n('harvest'), g1 + 3);
  const tl = start === 'seed' ? Math.min(harvest - 2, g1 + 7) : g1;
  state.custom.push({ id: `my-${Date.now().toString(36)}`, name, start, seeds: [n('seeds'), n('seeds')], keep: Math.min(n('keep'), n('seeds')), depth: n('depth'), light: n('depth') === 0 ? 'light' : 'dark', germ: [g0, g1], trueLeaves: tl, roots: Math.min(harvest - 1, tl + 7), harvest, life: n('life') > harvest ? n('life') : null, height: v('height'), water: v('water'), tips: 'Your own plant. Numbers as you entered them.' });
  commit();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) { ui.sheet = null; render(); } });
window.addEventListener('hashchange', () => { ui.msg = null; if (!handleImport()) { render(); window.scrollTo(0, 0); } });

function handleImport() {
  const c = location.hash.match(/^#\/connect\/([^/]+)\/(.+)$/);
  if (c) {
    history.replaceState(null, '', '#/today');   // take the key out of the address bar and history entry
    const repo = decodeURIComponent(c[1]);
    gh.cfg = { token: decodeURIComponent(c[2]), sha: null, repo: repo.toLowerCase() === SITE_REPO.toLowerCase() ? '' : repo }; saveCfg(gh.cfg);
    render(); connectGh(true);
    return true;
  }
  const m = location.hash.match(/^#\/import\/(.+)$/);
  if (!m) return false;
  try { const next = decode(m[1]); if (confirm('Replace the garden on this device with the one from the link?')) { state = next; persist(); } } catch { alert('This transfer link is damaged. Copy it again on the other device.'); }
  history.replaceState(null, '', '#/today'); render();
  return true;
}
if (!handleImport()) render();
syncNow();
