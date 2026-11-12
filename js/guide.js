// The guide. It is written from the plants currently chosen in the tray and from the measurements in Settings.
import { geo, layers, waterTargets } from './geometry.js';
import { crossSection, cutGlyph } from './diagrams.js';
import { sowText, short } from './plants.js';
import { milestones, SLOT_IDS } from './schedule.js';
import { round, esc, fmt, today } from './util.js';

const sec = (title, body, open = false) => `<details class="card guide" ${open ? 'open' : ''}><summary><h2>${title}</h2></summary>${body}</details>`;
const table = (head, rows) => `<div class="tablewrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const list = a => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

export function viewGuide(state, plants) {
  const s = state.settings, g = geo(s), wt = waterTargets(s), d = today();
  const chosen = SLOT_IDS.map(id => ({ id, slot: state.slots[id], p: plants[state.slots[id].plant] })).filter(x => x.p);
  // one entry per plant kind, with the slots it sits in
  const kinds = [...new Map(chosen.map(x => [x.p.id, x.p])).values()].map(p => ({ p, slots: chosen.filter(x => x.p.id === p.id).map(x => x.id) }));
  const where = k => `${k.slots.join(', ')}`;
  const plugged = chosen.filter(x => x.p.start === 'seed'), bare = chosen.filter(x => x.p.start !== 'seed');
  const ref = plugged[0]?.p || plants.basil, L = layers(s, ref);
  const pebbleMl = round(chosen.reduce((sum, x) => { const l = layers(s, x.p); return sum + (l.type === 'plug' ? g.vol(0, l.base) + (l.topDress ? g.vol(l.plugTop, l.plugTop + l.topDress) * 0.6 : 0) : g.vol(0, l.fillTop) * 0.85); }, 0) / 1000 / 50) * 50;
  const prep = kinds.filter(k => k.p.prep), dry = kinds.filter(k => k.p.water === 'dry'), fruit = kinds.filter(k => k.p.pollinate);
  const resow = kinds.filter(k => k.p.life && k.p.life <= 130).sort((a, b) => a.p.life - b.p.life);
  const tall = kinds.filter(k => k.p.height === 'tall');
  const coolSprout = kinds.filter(k => ['lettuce', 'mini-romaine', 'butterhead', 'coriander', 'spinach', 'lambs-lettuce', 'chervil'].includes(k.p.id));

  if (!chosen.length) return `<header class="view-head"><h1>Guide</h1><p class="sub">The guide is written for the plants in your tray, and the tray is empty.</p></header><section class="card"><p>Choose plants on the <a href="#/tray">Tray</a> page first.</p></section>`;

  const slotRows = chosen.map(x => { const l = layers(s, x.p); return [`<strong>${x.id}</strong>`, `<a href="#/plants/${x.p.id}">${esc(x.p.name)}</a>`, esc(sowText(x.p)), `${l.base} mm`, l.type === 'plug' ? `plug, top ${l.free} mm below the rim` : `pebbles to ${l.free} mm below the rim`, l.type === 'plug' ? 'yes' : 'no']; });
  const lifeRows = [...kinds].sort((a, b) => a.p.germ[0] - b.p.germ[0]).map(k => [`${esc(k.p.name)} <small>(${where(k)})</small>`, k.p.start === 'seed' ? `day ${k.p.germ[0]} to ${k.p.germ[1]}` : 'no sprouting', k.p.start === 'seed' && k.p.keep < k.p.seeds[1] ? `${k.p.keep}` : 'no thinning', `day ${k.p.harvest}`, k.p.life ? `about day ${k.p.life}` : 'keeps going']);
  const due = chosen.map(x => ({ ...x, m: milestones(x.slot, x.p) })).filter(x => x.m?.end).sort((a, b) => (a.m.end < b.m.end ? -1 : 1));

  return `<header class="view-head"><h1>Guide</h1><p class="sub">Written for the ${chosen.length} plant${chosen.length > 1 ? 's' : ''} now in your tray and for your tray's measurements. It changes when you change a slot.</p></header>

  ${sec('How the water reaches the plants', `
    <div class="guide-fig">${crossSection(s, ref)}
    <div>
      <p>The baskets are ${s.basket.height} mm deep and hang ${g.floor} mm above the tank floor. The water never gets high inside them: ${round(g.inMax, 1)} mm at the MAX mark and ${round(g.inMin, 1)} mm at MIN. So a plug cannot sit at the rim. It sits low, on a thin bed of pebbles, where it reaches the water. The drawing shows ${esc(short(ref))}.</p>
      <ul class="plain">
        <li><strong>${L.base} mm pebble bed</strong> at the bottom of the basket.</li>
        <li><strong>The plug on top of it</strong>, pressed in gently. It ends about ${L.free} mm below the rim.</li>
        <li><strong>At MAX</strong> the lowest ${L.dip} mm of the plug stands in water and wicks it up to the seeds.</li>
        <li><strong>At MIN</strong> the water is ${wt.grow.gapAtMin} mm below the plug but still inside the basket, so roots that have grown through the pebbles keep drinking.</li>
      </ul>
      <p>There is no pump. Roots get oxygen from the moist air between the plug and the water, which is why the level drops on purpose once roots are out.</p>
      ${dry.length ? `<p class="warn">${list(dry.map(k => `${esc(k.p.name)} (${where(k)})`))} want${dry.length === 1 ? 's' : ''} a drier root zone than the rest. ${dry.length === 1 ? 'Its basket gets' : 'Their baskets get'} a ${layers(s, dry[0].p).base} mm pebble bed, so the plug stays above the water. Drip water onto ${dry.length === 1 ? 'that plug' : 'those plugs'} daily until roots reach down.</p>` : ''}
    </div></div>`, true)}

  ${sec('Sowing day for your tray', `
    <p>You need <strong>${plugged.length} seed plug${plugged.length === 1 ? '' : 's'}</strong> and about <strong>${Math.max(50, pebbleMl)} ml of clay pebbles</strong> (4 to 8 mm grain) for this selection.</p>
    <ol class="steps">
    ${prep.length ? `<li><strong>The evening before:</strong><ul class="plain">${prep.map(k => `<li>${esc(k.p.name)} (${where(k)}): ${esc(k.p.prep)}</li>`).join('')}</ul></li>` : ''}
    ${bare.some(x => x.p.start === 'cutting') ? `<li><strong>One to two weeks before:</strong> root the stems for ${list(kinds.filter(k => k.p.start === 'cutting').map(k => esc(short(k.p))))} in a glass of water.</li>` : ''}
    <li><strong>Rinse</strong> the tank and baskets with warm water, and the pebbles in a sieve until the water runs clear.</li>
    ${plugged.length ? `<li><strong>Soak the ${plugged.length} plugs</strong> for 10 to 15 minutes in lukewarm water, then squeeze gently.</li>` : ''}
    <li><strong>Fill each basket</strong> as in this table. Press plugs gently until they rest on their pebble bed.${table(['Slot', 'Plant', 'What goes in', 'Pebble bed', 'Then', 'Lid'], slotRows)}</li>
    <li><strong>Fill the tank</strong> through the funnel to ${wt.germ.fill.text}. Count the litres and enter them in Settings as the tank volume.</li>
    <li><strong>Lids</strong> on the seeded baskets${bare.length ? `; ${list(bare.map(x => x.id))} stay${bare.length === 1 ? 's' : ''} open` : ''}.</li>
    <li><strong>Lamp</strong> 10 to 15 cm above the baskets, timer on 16 hours.</li>
    <li><strong>Record the sowing day</strong> on the Today page.</li></ol>
    ${coolSprout.length ? `<p class="note">${list(coolSprout.map(k => esc(k.p.name)))} sprout${coolSprout.length === 1 ? 's' : ''} poorly above about 24 °C. Keep the tray away from the hob and radiators for the first week.</p>` : ''}
    <p class="note">No pebbles yet? Stand the plug on the basket floor and fill the tank only to about ${round(Math.max(1, 6 - g.inMin))} mm above the MIN mark, so about 6 mm of the plug is under water. Add the pebble bed within two weeks, before roots grow out.</p>`)}

  ${sec('What happens when', table(['Plant', 'Sprouts', 'Thin to', 'First harvest', 'Replace'], lifeRows) + `
    <h3>What to do at each stage</h3>` + table(['Stage', 'What you see', 'What you do', 'Water level'], [
    ['Germination', 'Nothing, then the first green', 'Check daily. Lid off for good when green shows. Record the date in the slot.', `Fill to ${wt.germ.fill.text}. Top up when it is ${wt.germ.low.at}.`],
    ['Seedling', 'Seed leaves, then the first true leaves', 'Thin to the number in the table above. Fill pebbles around the stems. Start fertilizer at a quarter of the label dose.', 'Same as germination.'],
    ['Young plant', 'White roots come out under the plug', 'Record "roots out". Fertilizer to half. Lamp 10 to 20 cm above the tallest leaves.', `Let it fall to MIN, refill only to ${wt.grow.fill.text}.`],
    ['Growing and harvest', 'Leaves to pick', 'Harvest weekly, never more than a third of a plant. Full water change on schedule.', `Between MIN and ${round(wt.grow.fill.aboveMin)} mm above MIN.`],
  ]))}

  ${sec('Re-sowing and replacing', `
    ${resow.length ? `<p>These plants in your tray are short-lived and get replaced on a cycle:</p>${table(['Plant', 'Slots', 'Replace about every', 'Sign that it is time'], resow.map(k => [esc(k.p.name), where(k), `${round(k.p.life / 7)} weeks`, k.p.start === 'rootend' ? 'New shoots come up thin after 4 to 6 cuts' : k.p.start === 'clove' ? 'The clove turns soft and shoots stop' : k.p.cut === 'whole' ? 'It has been harvested' : 'A centre stalk shoots up, flower buds, leaves turn bitter or thin']))}` : '<p>None of the plants in your tray needs regular re-sowing. Replace a plant when it flowers, turns woody or stops growing.</p>'}
    ${due.length ? `<p><strong>Your dates:</strong> ${due.map(x => `${esc(short(x.p))} in ${x.id} around ${fmt(x.m.end)}${x.m.end <= d ? ' (due now)' : ''}`).join('; ')}. The Plan page reminds you two weeks ahead.</p>` : ''}
    <h3>Why a new plug cannot simply go into the running tray</h3>
    <p>Once the first roots are out, the tank is kept low: refilled to ${wt.grow.fill.text}, which is ${wt.grow.gap} mm below the plugs. A fresh plug in that tray would sit dry and the seeds would not sprout. So the replacement starts outside the tray.</p>
    <h3>Re-sowing a plant grown from seed</h3>
    <ol class="steps">
      <li><strong>About two weeks before the old plant is due,</strong> soak a fresh plug and prepare the seeds as on sowing day (soak or crack them if that plant needs it).</li>
      <li><strong>Sow</strong> the same number of seeds at the same depth as shown in the slot.</li>
      <li><strong>Stand the plug in a saucer or small glass with about 5 mm of water.</strong> Cover it loosely with cling film or an upturned glass. Put it next to the tray so it gets lamp light.</li>
      <li><strong>Keep 5 mm of water in the saucer.</strong> Take the cover off when green shows.</li>
      <li><strong>When the old plant is finished,</strong> harvest what is left, lift its basket out, pull out the old plug and roots, and rinse the pebbles and basket. The pebbles can be used again.</li>
      <li><strong>Rebuild the basket:</strong> ${L.base} mm pebble bed, then the new plug pressed onto it. Handle it by the plug, never by the seedlings.</li>
      <li><strong>If roots already show under the plug,</strong> it can go straight in. If not, drip water onto the plug with the syringe once a day until they do.</li>
      <li><strong>In the app,</strong> open the slot and press "Start a new sowing today" on the day you sow the new plug, and tick "Started in a saucer". The plan then counts from the new date and the tank level ignores this plug.</li>
      <li><strong>Thin and add pebbles</strong> at the first true leaves, as before.</li>
    </ol>
    ${bare.length ? `<h3>Replacing ${list([...new Set(bare.map(x => esc(short(x.p))))])}</h3>
    <ol class="steps"><li>Lift the basket out and tip everything into a sieve. Throw the old plant away and rinse the pebbles.</li>
      <li>Put the ${layers(s, bare[0].p).seat} mm pebble bed back, stand the fresh ${bare[0].p.start === 'rootend' ? 'root end' : bare[0].p.start === 'clove' ? 'clove' : 'rooted cutting'} on it and fill pebbles around it to ${layers(s, bare[0].p).free} mm below the rim.</li>
      <li>Its roots reach the water at any level between MIN and MAX, so it needs no saucer and no dripping.</li>
      <li>Open the slot in the app and press "Start a new sowing today".</li></ol>` : ''}
    <h3>When a seed never came up</h3>
    <p>If a basket is still empty a week after the latest sprouting day in the table above, sow a fresh plug. In the first weeks the tank is still filled to MAX, so the new plug can go straight into the tray on its pebble bed. Check three things first: the plug touched the water, the seeds were at the right depth, and the tray was not too warm or too cold for that plant.</p>
    <h3>Staggering</h3>
    <p>For a steady supply of a fast plant, start its replacement before the old one is spent, or grow it in two slots and re-sow them a few weeks apart.</p>`)}

  ${sec('Harvesting your plants', `<div class="guide-harvest">${kinds.map(k => `<div class="harvest">${cutGlyph(k.p.cut)}<div><h3>${esc(k.p.name)}</h3><p>${esc(k.p.how)}</p></div></div>`).join('')}</div>
    <p class="note">For every plant: take at most a third at once, and cut with clean scissors.</p>`)}

  ${sec('Tips for your plants', `<ul class="plain">${kinds.map(k => `<li><strong>${esc(k.p.name)}:</strong> ${esc(k.p.tips)}</li>`).join('')}</ul>`)}

  ${sec('Fertilizer', `<ul class="plain">
    <li>Use a mineral liquid nutrient made for hydroponics. Organic fertilizer rots in the tank.</li>
    <li><strong>Always dose per litre you pour in.</strong> Mix it in the jug first. Water already in the tank has its fertilizer.</li>
    <li>Nothing until the first true leaves. Then a quarter of the label dose, half once roots are out, up to three quarters for big plants. Never the full dose.</li>
    <li>Brown leaf tips or a white crust on the pebbles mean too much: change the water and go one step down.</li>
    <li>Yellowing lower leaves after week 4 mean too little: go one step up.</li>
    ${fruit.length ? `<li>${list(fruit.map(k => esc(k.p.name)))} need${fruit.length === 1 ? 's' : ''} the stronger dose once fruit sets.</li>` : ''}</ul>
    <p>The Today page works out the millilitres for the jug you are about to pour.</p>`)}

  ${sec('Light', `<ul class="plain"><li>16 hours a day. The cycle starts when you press the timer, so press it at the time you want mornings to begin.</li>
    <li>Keep the lamp 10 to 20 cm above the tallest plant and raise it as they grow.</li>
    <li>Long, thin, leaning seedlings mean the lamp is too high.</li>
    ${tall.length ? `<li>${list(tall.map(k => `${esc(k.p.name)} (${where(k)})`))} set${tall.length === 1 ? 's' : ''} the lamp height in your tray. Keep ${tall.length === 1 ? 'it' : 'them'} trimmed and together at the end away from the funnel.</li>` : '<li>Nothing in your tray grows tall, so the lamp can stay low.</li>'}</ul>`)}

  ${fruit.length ? sec('Flowers and fruit', `<p>For ${list(fruit.map(k => `${esc(k.p.name)} (${where(k)})`))}:</p><ul class="plain"><li>Indoors there are no bees or wind. From the first open flower, touch the centre of every flower with a soft brush once a day, going from flower to flower.</li><li>Record the first flower in the slot. The ripening date follows from it.</li><li>Flowers that drop without setting fruit were not pollinated or stood too cold.</li><li>Cut ripe fruit off with scissors.</li></ul>`) : ''}

  ${sec('Roots: when they are crowded', `<p>Long white roots hanging in the water are healthy. Trim only when one of these happens:</p>` + table(['Sign', 'How you notice'], [
    ['Roots mat on the tank floor', `There are only ${g.floor} mm under the baskets, so look at every water change`],
    ['Neighbouring baskets have grown together', 'Baskets lift out together'],
    ['The fill indicator sticks', 'Roots have wrapped around its float'],
    ['The funnel slit is blocked', 'Water pools at the slit'],
    ['Brown, slimy or smelly roots', 'Always cut these off'],
  ]) + `<p>Trim during a water change: cut back to about half the length, keep the tips reaching the water at MIN, and do at most two plants per change.</p>`)}

  ${sec('When something looks wrong', table(['What you see', 'Likely cause', 'What to do'], [
    ['Seeds do not sprout', `Plug lost contact with the water, sown too deep, or the wrong temperature${coolSprout.length ? ` (too warm for ${list(coolSprout.map(k => esc(short(k.p))))})` : ''}`, `Check the level is ${wt.germ.fill.at}. Re-sow with a fresh plug.`],
    ['White fluff on a plug', 'Too humid under the lid', 'Lift the lid for a few hours a day. Usually harmless.'],
    ['Seedlings long and falling over', 'Lamp too far away', 'Lower it to about 10 cm above the leaves.'],
    ['Green film on plugs or pebbles', 'Light reaches wet surfaces', 'Fill pebbles around the stems, keep lids on empty baskets, wipe the tank at water changes.'],
    ['Plug stays soggy, stem base dark', 'Plug sits too deep in water after germination', `Let the level fall and refill only to ${wt.grow.fill.text}.`],
    ['Roots brown and slimy', 'No air at the roots', 'Lower the level, change the water, cut off mushy roots.'],
    ['Plant shoots up and flowers', 'End of life, sped up by 16 hours of light', 'Harvest it all and re-sow as described above.'],
    ['Tiny black flies', 'Fungus gnats in wet plug tops', 'Cover plug tops with pebbles. A yellow sticky trap catches the rest.'],
    ...(fruit.length ? [['Flowers drop without fruit', 'Not pollinated, or too cold', 'Brush every open flower daily. Move the tray somewhere warmer.']] : []),
  ]))}`;
}
