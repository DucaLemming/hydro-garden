// Turns "what is planted where, and when" into dated tasks. Pure functions, no DOM.
import { addDays, diffDays, round } from './util.js';
import { sowText, short } from './plants.js';
import { waterTargets, layers, geo } from './geometry.js';

export const CATS = {
  harvest: { label: 'Harvest', color: '#2f8f4e', gcal: '10' },
  water: { label: 'Water', color: '#2b74c7', gcal: '9' },
  sow: { label: 'Sow and replace', color: '#c8433a', gcal: '11' },
  care: { label: 'Care', color: '#d07a1f', gcal: '6' },
  feed: { label: 'Fertilizer', color: '#b8960a', gcal: '5' },
  fruit: { label: 'Flowers and fruit', color: '#7d55b0', gcal: '3' },
};
export const SLOT_IDS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4'];
export const HORIZON = 140;

export function milestones(slot, p) {
  if (!slot || !slot.sown || !p) return null;
  const S = slot.sown;
  const germMid = Math.round((p.germ[0] + p.germ[1]) / 2);
  const sprout = slot.sprouted || addDays(S, germMid);
  const tl = slot.trueLeaves || (slot.sprouted ? addDays(slot.sprouted, Math.max(3, p.trueLeaves - germMid)) : addDays(S, p.trueLeaves));
  const ro = slot.rootsOut || addDays(tl, Math.max(2, p.roots - p.trueLeaves));
  const delay = diffDays(ro, addDays(S, p.roots));
  const flower = p.flower ? (slot.flowers || addDays(S, p.flower + delay)) : null;
  const harvest = p.cut === 'fruit' && flower ? addDays(flower, p.harvest - p.flower) : addDays(S, p.harvest + delay);
  const end = p.life ? addDays(S, p.life + delay) : null;
  return { S, sprout, tl, ro, delay, flower, harvest, end, sproutFrom: addDays(S, p.germ[0]), sproutBy: addDays(S, p.germ[1]) };
}

export function stageOf(slot, p, d) {
  const m = milestones(slot, p);
  if (!m) return { key: 'empty', label: p ? 'Not planted yet' : 'Empty' };
  if (d < m.S) return { key: 'planned', label: 'Planned' };
  if (m.end && d >= m.end) return { key: 'end', label: 'Due for replacing' };
  if (p.start === 'seed' && !slot.sprouted && d < m.tl) return { key: 'germ', label: 'Germinating' };
  if (d < m.tl) return { key: 'seedling', label: p.start === 'seed' ? 'Seedling' : 'Settling in' };
  if (d < m.ro) return { key: 'young', label: 'Young plant' };
  if (d < m.harvest) return { key: 'grow', label: 'Growing' };
  return { key: 'harvest', label: 'Ready to harvest' };
}

const frac = f => ({ 0.25: 'a quarter', 0.5: 'half', 0.75: 'three quarters' }[f] || `${f * 100} %`);
export function doseText(s, strength) {
  if (!strength) return 'No fertilizer yet.';
  if (!s.fertDose) return `Use ${frac(strength)} of the dose on the bottle label.`;
  const perL = round(s.fertDose * strength, 2);
  const g = geo(s);
  const full = g.volumeMax ? ` A full tank (${round(g.volumeMax, 1)} L) takes ${round(perL * g.volumeMax, 1)} ml.` : '';
  return `${perL} ml per litre of water (${frac(strength)} of the label dose).${full}`;
}

export function buildSchedule(state, plants, today) {
  const s = state.settings, wt = waterTargets(s);
  const tasks = [], warnings = [];
  const add = t => tasks.push(t);
  const active = SLOT_IDS.map(id => ({ id, slot: state.slots[id], p: plants[state.slots[id]?.plant] }))
    .filter(x => x.p && x.slot.sown).map(x => ({ ...x, m: milestones(x.slot, x.p) }));
  const end = addDays(today, HORIZON);
  if (!active.length) return { tasks, warnings, tank: null };

  const firstSow = active.map(x => x.m.S).sort()[0];
  const batch = active.filter(x => x.p.start === 'seed' && !x.slot.saucer && diffDays(x.m.S, firstSow) <= 21);
  let lowerDate = batch.length ? batch.map(x => x.m.ro).sort().pop() : firstSow;
  if (diffDays(lowerDate, firstSow) > 42) lowerDate = addDays(firstSow, 42);
  const feeders = active.filter(x => x.p.start === 'seed' && x.p.harvest > 20);
  const earliest = (list, k, fallback) => (list.length ? list.map(x => x.m[k]).sort()[0] : fallback);
  let fertStart = earliest(feeders, 'tl', addDays(firstSow, 14));
  if (diffDays(fertStart, firstSow) < 10) fertStart = addDays(firstSow, 10);
  let fertHalf = earliest(feeders, 'ro', addDays(fertStart, 10));
  if (diffDays(fertHalf, fertStart) < 7) fertHalf = addDays(fertStart, 7);
  const strengthAt = d => (d < fertStart ? 0 : d < fertHalf ? 0.25 : 0.5);
  const modeAt = d => (d < lowerDate ? 'germ' : 'grow');
  const tank = { firstSow, lowerDate, fertStart, fertHalf, strengthAt, modeAt };

  for (const { id, slot, p, m } of active) {
    const S = m.S, name = short(p), tag = `${name} in ${id}`, key = `${id}:${S}`;
    const plug = p.start === 'seed';
    const L = layers(s, p);
    if (S >= today) {
      if (p.prep) add({ id: `${key}:prep`, date: addDays(S, -1), cat: 'care', slot: id, title: `Prepare ${name} seeds for ${id}`, detail: p.prep });
      const how = plug
        ? `Pebble bed ${L.base} mm, then the soaked plug (top ends up about ${L.free} mm below the rim). ${sowText(p)}. Lid on.`
        : `Pebble bed ${L.seat} mm, set the plant on it, fill pebbles around it to ${L.free} mm below the rim. ${sowText(p)}.`;
      add({ id: `${key}:sow`, date: S, cat: 'sow', slot: id, title: `${plug ? 'Sow' : 'Plant'} ${tag}`, detail: how });
    }
    if (plug && !slot.sprouted) {
      add({ id: `${key}:sprout`, date: m.sproutFrom, cat: 'care', slot: id, observe: 'sprouted', title: `Sprouts expected from today: ${tag}`, detail: `Check daily until about ${p.germ[1]} days after sowing. Take the lid off for good as soon as green shows, then record the date.` });
      add({ id: `${key}:noshow`, date: addDays(m.sproutBy, 7), cat: 'sow', slot: id, title: `Nothing up yet? Re-sow ${tag}`, detail: 'Use a fresh plug. Check that the plug touches the water and that the seeds sit at the right depth.' });
    }
    if (plug && !slot.saucer && diffDays(S, firstSow) > 21 && S >= lowerDate) {
      warnings.push(`${tag} is sown into a tank that is already kept low. Start the plug in a saucer of water instead, or drip water on it daily until its roots reach the water.`);
      add({ id: `${key}:drip`, date: S, cat: 'water', slot: id, title: `Keep the new plug wet: ${tag}`, detail: 'The tank level now stays below the plugs. Drip water onto this plug daily with the syringe until roots grow out of it, or raise it in a saucer of water until then.' });
    }
    if (plug && p.keep < p.seeds[1]) {
      add({ id: `${key}:thin`, date: m.tl, cat: 'care', slot: id, observe: slot.trueLeaves ? null : 'trueLeaves', title: `Thin ${tag} to ${p.keep}`, detail: `When the first true leaves show, snip the weakest seedlings off at the base and keep the ${p.keep} strongest.${L.topDress ? ` Then fill ${L.topDress} mm of pebbles around the stems to keep light off the plug.` : ''}` });
    } else if (plug) {
      add({ id: `${key}:tl`, date: m.tl, cat: 'care', slot: id, observe: slot.trueLeaves ? null : 'trueLeaves', title: `First true leaves expected: ${tag}`, detail: `No thinning needed.${L.topDress ? ` Fill ${L.topDress} mm of pebbles around the stems to keep light off the plug.` : ''}` });
    }
    if (plug && !slot.rootsOut) add({ id: `${key}:roots`, date: m.ro, cat: 'care', slot: id, observe: 'rootsOut', title: `Roots out of the plug? ${tag}`, detail: 'Lift the basket and look underneath. White roots coming through the pebbles or the basket holes count. Record the date so the water and fertilizer plan can follow.' });
    if (p.shape) add({ id: `${key}:shape`, date: addDays(S, p.shape + m.delay), cat: 'care', slot: id, title: `Shape ${tag} for the first time`, detail: 'When it has 3 to 4 pairs of true leaves, cut the top just above the second pair from the bottom.' });
    if (p.flower) {
      if (!slot.flowers) add({ id: `${key}:flower`, date: m.flower, cat: 'fruit', slot: id, observe: 'flowers', title: `First flowers expected: ${tag}`, detail: p.pollinate ? 'From now on, touch the centre of every open flower with a soft brush once a day. Record the date of the first flower.' : 'Record the date of the first flower.' });
    }
    add({ id: `${key}:harvest`, date: m.harvest, cat: p.cut === 'fruit' ? 'fruit' : 'harvest', slot: id, title: `First ${p.cut === 'fruit' ? 'ripe fruit' : 'harvest'}: ${tag}`, detail: p.how });
    if (m.end) {
      if (plug) add({ id: `${key}:pre`, date: addDays(m.end, -Math.min(14, p.germ[1] + 4)), cat: 'sow', slot: id, title: `Start a new ${name} plug for ${id}`, detail: `Sow a fresh plug and stand it in a saucer with 5 mm of water under cling film. It replaces the old plant in ${id} in about two weeks.` });
      add({ id: `${key}:end`, date: m.end, cat: 'sow', slot: id, title: `Replace ${tag}`, detail: plug ? 'Harvest what is left, lift out the old plug, rinse the pebbles and set in the new plug. Then record the new sowing date for this slot.' : 'Harvest what is left and plant a fresh one. Then record the new date for this slot.' });
    }
  }

  // Tank-wide tasks
  const g = geo(s);
  add({ id: `tank:${fertStart}:feed1`, date: fertStart, cat: 'feed', title: 'Start fertilizer at a quarter of the label dose', detail: `${doseText(s, 0.25)} Mix it into the jug before pouring, never pour concentrate into the tank.` });
  add({ id: `tank:${fertHalf}:feed2`, date: fertHalf, cat: 'feed', title: 'Raise fertilizer to half of the label dose', detail: doseText(s, 0.5) });
  add({ id: `tank:${fertHalf}:feed3`, date: addDays(fertHalf, 21), cat: 'feed', title: 'Fertilizer: go up to three quarters if growth is strong', detail: `${doseText(s, 0.75)} Stay at half if leaf tips turn brown.` });
  add({ id: `tank:${lowerDate}:lower`, date: lowerDate, cat: 'water', title: 'Lower the water level', detail: `Stop refilling to the top. From now on let the level fall to the MIN mark, then refill only to ${wt.grow.fill.text}. That leaves air between the plugs and the water.` });
  const wcStart = state.tankLastChange && state.tankLastChange > fertStart ? state.tankLastChange : fertStart;
  for (let d = addDays(wcStart, s.waterChangeDays); d <= end; d = addDays(d, s.waterChangeDays)) {
    const mode = modeAt(d), fill = mode === 'germ' ? wt.germ.fill : wt.grow.fill;
    const older = diffDays(d, firstSow) >= 70;
    add({ id: `tank:wc:${d}`, date: d, cat: 'water', waterChange: true, title: 'Full water change', detail: `Lift the baskets out, pour the old water away, wipe the tank and refill to ${fill.text}. ${doseText(s, strengthAt(d))}${older ? ' Check the roots while the baskets are out and trim any that mat on the tank floor.' : ''}` });
  }
  // Water level checks are ordinary tasks, so the plan and the calendar always list the same things.
  if (s.topUpDays > 0) {
    const changeDays = new Set(tasks.filter(t => t.waterChange).map(t => t.date));
    let d = addDays(firstSow, s.topUpDays);
    if (d < today) d = addDays(d, Math.ceil(diffDays(today, d) / s.topUpDays) * s.topUpDays);
    for (; d <= end; d = addDays(d, s.topUpDays)) {
      if (changeDays.has(d)) continue;
      const w = wt[modeAt(d)];
      add({ id: `tank:check:${d}`, date: d, cat: 'water', title: 'Check the water level', detail: `Look at the fill indicator. Top up when the level is ${w.low.at}, and fill to ${w.fill.text}. ${doseText(s, strengthAt(d))}` });
    }
  }
  const firstHarvest = active.map(x => x.m.harvest).sort()[0];
  for (let d = addDays(firstHarvest, 7); d <= end; d = addDays(d, 7)) {
    const ready = active.filter(x => d >= x.m.harvest && (!x.m.end || d < x.m.end));
    if (!ready.length) continue;
    const names = [...new Set(ready.map(x => short(x.p)))];
    add({ id: `tank:hv:${d}`, date: d, cat: 'harvest', title: `Weekly harvest: ${names.join(', ')}`, detail: 'Take up to a third of each plant. Pinch off flower buds on basil and herbs.' });
  }
  const from = addDays(today, -21);
  const out = tasks.filter(t => t.date >= from && t.date <= end).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { tasks: out, warnings, tank };
}
