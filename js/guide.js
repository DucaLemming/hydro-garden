// The reference guide. Numbers are computed from the tray measurements in Settings.
import { geo, layers, waterTargets } from './geometry.js';
import { crossSection } from './diagrams.js';
import { round } from './util.js';

const sec = (title, body, open = false) => `<details class="card guide" ${open ? 'open' : ''}><summary><h2>${title}</h2></summary>${body}</details>`;
const table = (head, rows) => `<div class="tablewrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function viewGuide(state, plants) {
  const s = state.settings, g = geo(s), wt = waterTargets(s), L = layers(s, plants.basil), O = layers(s, plants['spring-onion-root']);
  return `<header class="view-head"><h1>Guide</h1><p class="sub">How the tray works and what to do at each stage. All millimetres come from your measurements.</p></header>

  ${sec('How the water reaches the plants', `
    <div class="guide-fig">${crossSection(s, plants.basil)}
    <div>
      <p>The baskets are ${s.basket.height} mm deep and hang ${g.floor} mm above the tank floor. The water never gets high inside them: ${round(g.inMax, 1)} mm at the MAX mark and ${round(g.inMin, 1)} mm at MIN. So the plug cannot sit at the rim. It has to sit low, on a thin bed of pebbles, where it reaches the water.</p>
      <ul class="plain">
        <li><strong>${L.base} mm pebble bed</strong> at the bottom of each basket.</li>
        <li><strong>The plug on top of it</strong>, pressed in gently. It ends about ${L.free} mm below the rim.</li>
        <li><strong>At MAX</strong> the lowest ${L.dip} mm of the plug stands in water and wicks it up to the seeds.</li>
        <li><strong>At MIN</strong> the water is ${wt.grow.gapAtMin} mm below the plug but still inside the basket, so roots that have grown through the pebbles keep drinking.</li>
      </ul>
      <p>There is no pump. Roots get their oxygen from the moist air between the plug and the water, which is why the level drops on purpose once roots are out.</p>
    </div></div>`, true)}

  ${sec('Sowing day, step by step', `<ol class="steps">
    <li><strong>The evening before:</strong> soak parsley seeds, crack and soak coriander, soak chili seeds if you like. Each plant's page lists its own preparation.</li>
    <li><strong>Rinse the tank and baskets</strong> with warm water, no soap.</li>
    <li><strong>Rinse the clay pebbles</strong> (4 to 8 mm grain) in a sieve until the water runs clear.</li>
    <li><strong>Pebble bed:</strong> ${L.base} mm in every basket that gets a plug. For a spring onion root end: ${O.seat} mm.</li>
    <li><strong>Soak the plugs</strong> for 10 to 15 minutes in lukewarm water, squeeze gently.</li>
    <li><strong>Seat the plugs</strong> on the pebble beds. Press gently until they rest on the pebbles. The top ends about ${L.free} mm below the rim, which also leaves room for the seedlings under the lid.</li>
    <li><strong>Sow</strong> the number of seeds at the depth shown in each slot. Seeds that need light lie on the surface.</li>
    <li><strong>Fill the tank</strong> through the funnel to ${wt.germ.fill.text}. Count the litres as you pour and enter them in Settings as the tank volume.</li>
    <li><strong>Lids on</strong> every seeded basket. Root ends and cuttings stay open.</li>
    <li><strong>Lamp</strong> 10 to 15 cm above the baskets, timer on 16 hours.</li>
    <li><strong>Record the sowing day</strong> on the Today page.</li></ol>
    <p class="note">No pebbles yet? Stand the plug directly on the basket floor and fill the tank only to about ${round(Math.max(1, 6 - g.inMin))} mm above the MIN mark, so about 6 mm of the plug is under water. Add the pebble bed within two weeks, before roots grow out.</p>`)}

  ${sec('From seed to harvest', table(['Stage', 'What you see', 'What you do', 'Water level'], [
    ['Germination', 'Nothing, then the first green', 'Check daily. Lid off for good when green shows. Record the date in the slot.', `Fill to ${wt.germ.fill.text}. Top up when it is ${wt.germ.low.text}.`],
    ['Seedling', 'Seed leaves, then the first true leaves', 'Thin to the strongest. Fill pebbles around the stems. Start fertilizer at a quarter of the label dose.', 'Same as germination.'],
    ['Young plant', 'White roots come out under the plug', 'Record "roots out". Fertilizer to half. Keep the lamp 10 to 20 cm above the tallest leaves.', `Let it fall to MIN, refill only to ${wt.grow.fill.text}.`],
    ['Growing and harvest', 'Leaves to pick', 'Harvest weekly, never more than a third of a plant. Full water change on schedule.', `Between MIN and ${round(wt.grow.fill.aboveMin)} mm above MIN.`],
  ]) + `<p class="note">Re-sowing into a running tray: the level is now kept below the plugs, so a fresh plug would stay dry. Start it in a saucer with 5 mm of water under cling film and move it into the basket once roots show.</p>`)}

  ${sec('Fertilizer', `<ul class="plain">
    <li>Use a mineral liquid nutrient made for hydroponics. Organic fertilizer rots in the tank.</li>
    <li><strong>Always dose per litre you pour in.</strong> Mix it in the jug first. Water already in the tank has its fertilizer.</li>
    <li>Nothing until the first true leaves. Then a quarter of the label dose, half once roots are out, up to three quarters for big plants. Never the full dose.</li>
    <li>Brown leaf tips or a white crust on the pebbles mean too much: change the water and go one step down.</li>
    <li>Yellowing lower leaves after week 4 mean too little: go one step up.</li></ul>
    <p>The Today page works out the millilitres for the jug you are about to pour.</p>`)}

  ${sec('Light', `<ul class="plain"><li>16 hours a day. The cycle starts when you press the timer, so press it at the time you want mornings to begin.</li>
    <li>Keep the lamp 10 to 20 cm above the tallest plant and raise it as they grow.</li>
    <li>Long, thin, leaning seedlings mean the lamp is too high.</li>
    <li>Tall plants stand together at the end away from the funnel, so the lamp can stay close to everything else.</li></ul>`)}

  ${sec('Roots: when they are crowded', `<p>Long white roots hanging in the water are healthy. Trim only when one of these happens:</p>` + table(['Sign', 'How you notice'], [
    ['Roots mat on the tank floor', `There are only ${g.floor} mm under the baskets, so look at every water change`],
    ['Neighbouring baskets have grown together', 'Baskets lift out together'],
    ['The fill indicator sticks', 'Roots have wrapped around its float'],
    ['The funnel slit is blocked', 'Water pools at the slit'],
    ['Brown, slimy or smelly roots', 'Always cut these off'],
  ]) + `<p>Trim during a water change: cut back to about half the length, keep the tips reaching the water at MIN, and do at most two plants per change.</p>`)}

  ${sec('When something looks wrong', table(['What you see', 'Likely cause', 'What to do'], [
    ['Seeds do not sprout', 'Plug lost contact with the water, sown too deep, too cold (or too warm for lettuce and coriander)', `Check the level is ${wt.germ.fill.text}. Re-sow with a fresh plug.`],
    ['White fluff on a plug', 'Too humid under the lid', 'Lift the lid for a few hours a day. Usually harmless.'],
    ['Seedlings long and falling over', 'Lamp too far away', 'Lower it to about 10 cm above the leaves.'],
    ['Green film on plugs or pebbles', 'Light reaches wet surfaces', 'Fill pebbles around the stems, keep lids on empty baskets, wipe the tank at water changes.'],
    ['Plug stays soggy, stem base dark', 'Plug sits too deep in water after germination', `Let the level fall and refill only to ${wt.grow.fill.text}.`],
    ['Roots brown and slimy', 'No air at the roots', 'Lower the level, change the water, cut off mushy roots.'],
    ['Plant shoots up and flowers', 'End of life, sped up by 16 hours of light', 'Harvest it all and re-sow.'],
    ['Tiny black flies', 'Fungus gnats in wet plug tops', 'Cover plug tops with pebbles. A yellow sticky trap catches the rest.'],
    ['Chili flowers drop', 'Not pollinated, or too cold', 'Brush every open flower daily. Move the tray somewhere warmer.'],
  ]))}`;
}
