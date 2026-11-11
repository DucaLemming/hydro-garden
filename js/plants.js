// Plant library for a small passive (no pump) hydroponic tray with 43 mm net baskets.
// Days count from the sowing day. Seed counts are per basket.
//
// fit: 3 = thrives, 2 = works with care, 1 = possible but not ideal here
// start: seed | rootend | clove | cutting
// depth: sowing depth in mm (0 = on the surface)
// light: 'light' needs light to sprout, 'dark' needs darkness, 'any'
// height: low | mid | tall     spread: narrow | mid | wide
// water: wet (happy with wet feet) | normal | dry (wants a drier root zone)
// cut: how it is harvested (tips | outer | base | whole | fruit | flowers)

const HOW = {
  tips: 'Cut stem tips just above a pair of leaves and keep at least two pairs below the cut. Two new shoots grow from that joint.',
  outer: 'Pick or cut the outer leaves at their base and leave the small centre leaves to keep growing.',
  base: 'Cut a bunch about 3 cm above the base. It grows back from the stump.',
  whole: 'Cut the whole plant about 2 cm above the plug when it is ready, then re-sow.',
  fruit: 'Cut ripe fruit off with scissors. Pulling can break the branch.',
};

const P = (id, name, de, cat, fit, o) => ({
  id, name, de, cat, fit, start: 'seed', light: 'any', height: 'low', spread: 'mid', water: 'normal',
  cut: 'outer', life: null, ...o, how: o.how || HOW[o.cut || 'outer'],
});

export const PLANTS = [
  // ---- Herbs
  P('basil', 'Basil (Genovese)', 'Basilikum', 'Herbs', 3, { seeds: [4, 5], keep: 2, depth: 0, light: 'light', germ: [5, 10], trueLeaves: 14, roots: 21, harvest: 35, life: 170, height: 'tall', cm: [25, 45], cut: 'tips', shape: 35,
    tips: 'Likes warmth (20 to 25 °C) and drinks a lot. Pinch off flower buds as soon as they show.' }),
  P('bush-basil', 'Bush basil (small-leaved)', 'Buschbasilikum', 'Herbs', 3, { seeds: [4, 5], keep: 3, depth: 0, light: 'light', germ: [5, 10], trueLeaves: 14, roots: 21, harvest: 38, life: 170, height: 'mid', cm: [15, 25], cut: 'tips',
    tips: 'Stays compact by itself, so it is the easiest basil under a low lamp.' }),
  P('thai-basil', 'Thai basil', 'Thai-Basilikum', 'Herbs', 3, { seeds: [4, 5], keep: 2, depth: 0, light: 'light', germ: [6, 12], trueLeaves: 16, roots: 23, harvest: 40, life: 170, height: 'tall', cm: [25, 45], cut: 'tips', shape: 38,
    tips: 'Needs it warm. Below 18 °C it sulks.' }),
  P('parsley', 'Parsley, flat-leaf', 'Glatte Petersilie', 'Herbs', 3, { seeds: [6, 8], keep: 3, depth: 5, light: 'dark', prep: 'Soak the seeds in lukewarm water for 12 to 24 hours.', germ: [14, 28], trueLeaves: 30, roots: 38, harvest: 63, life: 270, height: 'mid', cm: [20, 30],
    how: 'Cut the outermost stems at the base. New stems come from the middle.', tips: 'The slowest seed in the tray. Give it 4 weeks before you give up on it.' }),
  P('curly-parsley', 'Parsley, curly', 'Krause Petersilie', 'Herbs', 3, { seeds: [6, 8], keep: 3, depth: 5, light: 'dark', prep: 'Soak the seeds in lukewarm water for 12 to 24 hours.', germ: [14, 28], trueLeaves: 30, roots: 38, harvest: 65, life: 270, height: 'mid', cm: [15, 25],
    how: 'Cut the outermost stems at the base. New stems come from the middle.', tips: 'A little more compact than flat-leaf parsley.' }),
  P('coriander', 'Coriander (cilantro)', 'Koriander', 'Herbs', 2, { seeds: [4, 6], seedUnit: 'seed halves', keep: 4, depth: 7, light: 'dark', prep: 'Press each round husk gently with a spoon until it splits into two halves, then soak the halves for 12 to 24 hours.', germ: [7, 14], trueLeaves: 18, roots: 24, harvest: 32, life: 45, height: 'mid', cm: [15, 25],
    how: 'Cut the outer stems at the base. When the centre shoots up with thin feathery leaves it is about to flower: harvest it all and re-sow.', tips: 'Flowers fast under 16 hours of light and above 22 °C. Plan to re-sow every 6 weeks.' }),
  P('chives', 'Chives', 'Schnittlauch', 'Herbs', 3, { seeds: [10, 15], keep: 15, depth: 5, light: 'dark', germ: [10, 14], trueLeaves: 21, roots: 28, harvest: 49, height: 'mid', cm: [20, 30], spread: 'narrow', cut: 'base',
    tips: 'Sow thickly, it grows as a clump. Do not thin.' }),
  P('garlic-chives', 'Garlic chives', 'Schnittknoblauch', 'Herbs', 3, { seeds: [8, 12], keep: 12, depth: 5, light: 'dark', germ: [10, 20], trueLeaves: 24, roots: 30, harvest: 60, height: 'mid', cm: [20, 30], spread: 'narrow', cut: 'base',
    tips: 'Flat leaves with a mild garlic taste. Slower than chives.' }),
  P('dill', 'Dill (compact variety)', 'Dill', 'Herbs', 2, { seeds: [5, 6], keep: 3, depth: 3, light: 'light', germ: [7, 14], trueLeaves: 18, roots: 24, harvest: 35, life: 60, height: 'tall', cm: [25, 45], spread: 'narrow',
    how: 'Snip the feathery leaf tips as you need them. Take whole stems from the outside.', tips: 'Cover the seeds only very thinly. Choose a low variety such as Fernleaf, ordinary dill gets too tall.' }),
  P('mint', 'Mint', 'Minze', 'Herbs', 2, { start: 'cutting', seeds: [2, 3], seedUnit: 'rooted stems', keep: 3, germ: [7, 10], trueLeaves: 10, roots: 10, harvest: 28, height: 'mid', cm: [20, 35], spread: 'wide', water: 'wet', cut: 'tips',
    tips: 'Its roots take over the tank. Trim them at every water change.' }),
  P('lemon-balm', 'Lemon balm', 'Zitronenmelisse', 'Herbs', 2, { seeds: [5, 6], keep: 2, depth: 0, light: 'light', germ: [10, 21], trueLeaves: 26, roots: 34, harvest: 60, height: 'mid', cm: [20, 35], spread: 'wide', cut: 'tips',
    tips: 'Slow to start, then bushy. Cut it back hard when it gets leggy.' }),
  P('oregano', 'Oregano', 'Oregano', 'Herbs', 2, { seeds: [6, 8], keep: 3, depth: 0, light: 'light', germ: [7, 14], trueLeaves: 22, roots: 32, harvest: 60, height: 'low', cm: [10, 20], water: 'dry', cut: 'tips',
    tips: 'Dust-fine seed: sprinkle a pinch on the surface.' }),
  P('marjoram', 'Marjoram', 'Majoran', 'Herbs', 2, { seeds: [6, 8], keep: 3, depth: 0, light: 'light', germ: [7, 14], trueLeaves: 22, roots: 32, harvest: 60, height: 'low', cm: [10, 20], water: 'dry', cut: 'tips',
    tips: 'Likes it warm and bright.' }),
  P('thyme', 'Thyme', 'Thymian', 'Herbs', 2, { seeds: [6, 8], keep: 4, depth: 0, light: 'light', germ: [7, 21], trueLeaves: 28, roots: 40, harvest: 75, height: 'low', cm: [8, 15], water: 'dry', cut: 'tips',
    tips: 'Slow and it hates wet feet. It needs the thicker pebble bed shown in its planting drawing.' }),
  P('sage', 'Sage', 'Salbei', 'Herbs', 1, { seeds: [3, 4], keep: 1, depth: 5, germ: [10, 21], trueLeaves: 28, roots: 40, harvest: 80, height: 'mid', cm: [20, 35], spread: 'wide', water: 'dry', cut: 'tips',
    tips: 'Gets big and woody and rots easily in constant moisture. Better in a pot of soil.' }),
  P('rosemary', 'Rosemary', 'Rosmarin', 'Herbs', 1, { start: 'cutting', seeds: [1, 2], seedUnit: 'rooted cuttings', keep: 1, germ: [21, 42], trueLeaves: 42, roots: 42, harvest: 90, height: 'mid', cm: [20, 40], water: 'dry', cut: 'tips',
    tips: 'Roots slowly and dislikes constant moisture. Better in a pot of soil.' }),
  P('savory', 'Summer savory', 'Bohnenkraut', 'Herbs', 2, { seeds: [5, 6], keep: 3, depth: 0, light: 'light', germ: [10, 14], trueLeaves: 22, roots: 30, harvest: 50, life: 100, height: 'mid', cm: [15, 30], cut: 'tips',
    tips: 'Harvest before it flowers for the best taste.' }),
  P('chervil', 'Chervil', 'Kerbel', 'Herbs', 2, { seeds: [6, 8], keep: 4, depth: 2, light: 'light', germ: [7, 14], trueLeaves: 20, roots: 26, harvest: 40, life: 60, height: 'low', cm: [15, 25],
    tips: 'Prefers it cool (15 to 20 °C) and flowers quickly when warm.' }),
  P('leaf-celery', 'Leaf celery', 'Schnittsellerie', 'Herbs', 2, { seeds: [6, 8], keep: 3, depth: 0, light: 'light', germ: [14, 21], trueLeaves: 30, roots: 38, harvest: 70, life: 240, height: 'mid', cm: [20, 30], water: 'wet',
    how: 'Cut the outermost stems at the base. New stems come from the middle.', tips: 'Tiny seed, slow like parsley. Loves water.' }),
  P('watercress', 'Watercress', 'Brunnenkresse', 'Herbs', 3, { seeds: [8, 10], keep: 6, depth: 0, light: 'light', germ: [5, 10], trueLeaves: 14, roots: 20, harvest: 35, life: 120, height: 'low', cm: [10, 20], spread: 'wide', water: 'wet', cut: 'tips',
    tips: 'A water plant, so this tray suits it perfectly.' }),
  P('cress', 'Garden cress', 'Gartenkresse', 'Herbs', 3, { seeds: [25, 30], keep: 30, depth: 0, light: 'light', germ: [2, 4], trueLeaves: 7, roots: 8, harvest: 9, life: 14, height: 'low', cm: [5, 8], spread: 'narrow', cut: 'whole',
    how: 'Cut the whole tuft with scissors just above the plug after about 9 days, then sow a fresh plug.', tips: 'The fastest crop there is. No thinning, no fertilizer needed.' }),
  P('rau-ram', 'Vietnamese coriander', 'Vietnamesischer Koriander', 'Herbs', 3, { start: 'cutting', seeds: [2, 3], seedUnit: 'rooted stems', keep: 3, germ: [5, 10], trueLeaves: 10, roots: 10, harvest: 28, height: 'mid', cm: [15, 30], spread: 'wide', water: 'wet', cut: 'tips',
    tips: 'Root fresh stems in a glass of water for about a week first. It trails, so give it an edge slot.' }),

  // ---- Leafy greens
  P('lettuce', 'Lettuce, loose-leaf', 'Pflücksalat', 'Leafy greens', 3, { seeds: [3, 4], keep: 2, depth: 0, light: 'light', germ: [3, 7], trueLeaves: 12, roots: 18, harvest: 32, life: 75, height: 'low', cm: [12, 20], spread: 'wide',
    tips: 'Will not sprout above about 24 °C. Keep it cool for the first days.' }),
  P('mini-romaine', 'Lettuce, mini romaine', 'Mini-Romana', 'Leafy greens', 3, { seeds: [3, 3], keep: 1, depth: 0, light: 'light', germ: [3, 7], trueLeaves: 12, roots: 18, harvest: 45, life: 60, height: 'low', cm: [15, 20], spread: 'wide',
    how: 'Pick outer leaves from week 5, or cut the whole head about 2 cm above the plug at 7 to 8 weeks.', tips: 'One plant per basket. Little Gem types fit best.' }),
  P('butterhead', 'Lettuce, butterhead', 'Kopfsalat', 'Leafy greens', 2, { seeds: [3, 3], keep: 1, depth: 0, light: 'light', germ: [3, 7], trueLeaves: 12, roots: 18, harvest: 50, life: 60, height: 'low', cm: [12, 18], spread: 'wide', cut: 'whole',
    tips: 'Needs a neighbour slot left low or empty: a full head is wider than the basket spacing.' }),
  P('rocket', 'Rocket (arugula)', 'Rucola', 'Leafy greens', 3, { seeds: [5, 6], keep: 4, depth: 5, germ: [3, 6], trueLeaves: 10, roots: 16, harvest: 25, life: 55, height: 'low', cm: [12, 20],
    tips: 'Gets sharper and then bitter as it ages. Re-sow when it flowers.' }),
  P('pak-choi', 'Pak choi (baby)', 'Pak Choi', 'Leafy greens', 3, { seeds: [2, 3], keep: 1, depth: 5, germ: [3, 7], trueLeaves: 11, roots: 17, harvest: 32, life: 45, height: 'low', cm: [12, 18], spread: 'wide',
    how: 'Pick outer leaves, or cut the whole plant about 3 cm above the base at 10 to 15 cm tall. The stump may sprout again.', tips: 'Harvest it young. Long days make it flower early.' }),
  P('mizuna', 'Mizuna', 'Mizuna', 'Leafy greens', 3, { seeds: [4, 5], keep: 3, depth: 5, germ: [3, 6], trueLeaves: 10, roots: 16, harvest: 25, life: 60, height: 'low', cm: [15, 25],
    tips: 'Mild, feathery and very forgiving. Regrows well after cutting.' }),
  P('tatsoi', 'Tatsoi', 'Tatsoi', 'Leafy greens', 3, { seeds: [3, 4], keep: 2, depth: 5, germ: [3, 7], trueLeaves: 11, roots: 17, harvest: 30, life: 50, height: 'low', cm: [8, 15], spread: 'wide',
    tips: 'Flat rosette of spoon-shaped leaves.' }),
  P('mustard', 'Mustard greens (baby leaf)', 'Blattsenf', 'Leafy greens', 3, { seeds: [4, 5], keep: 3, depth: 5, germ: [3, 6], trueLeaves: 10, roots: 16, harvest: 25, life: 50, height: 'low', cm: [12, 20],
    tips: 'Peppery. Pick the leaves small.' }),
  P('kale', 'Kale (baby leaf)', 'Grünkohl', 'Leafy greens', 2, { seeds: [3, 3], keep: 1, depth: 5, germ: [4, 8], trueLeaves: 12, roots: 20, harvest: 35, life: 100, height: 'mid', cm: [15, 30], spread: 'wide',
    tips: 'Pick the leaves at hand size. A full-grown plant is too big for this tray.' }),
  P('chard', 'Swiss chard (baby leaf)', 'Mangold', 'Leafy greens', 2, { seeds: [2, 3], seedUnit: 'seed clusters', keep: 2, depth: 10, light: 'dark', prep: 'Soak the seed clusters for 12 hours.', germ: [5, 10], trueLeaves: 14, roots: 22, harvest: 40, life: 100, height: 'mid', cm: [15, 25],
    tips: 'Each knobbly "seed" is a cluster that gives 2 to 3 seedlings.' }),
  P('spinach', 'Spinach (baby leaf)', 'Spinat', 'Leafy greens', 2, { seeds: [4, 5], keep: 3, depth: 10, light: 'dark', germ: [6, 12], trueLeaves: 14, roots: 20, harvest: 35, life: 50, height: 'low', cm: [10, 18],
    tips: 'Wants it cool (below 20 °C) and flowers early under 16 hours of light. Pick it young.' }),
  P('lambs-lettuce', "Lamb's lettuce", 'Feldsalat', 'Leafy greens', 2, { seeds: [6, 8], keep: 5, depth: 5, germ: [7, 14], trueLeaves: 18, roots: 26, harvest: 50, life: 80, height: 'low', cm: [5, 10], spread: 'narrow', cut: 'whole',
    how: 'Cut whole rosettes just above the plug, the biggest first.', tips: 'A cool-season crop: fine in a cool kitchen, poor above 20 °C.' }),
  P('sorrel', 'Sorrel', 'Sauerampfer', 'Leafy greens', 2, { seeds: [4, 5], keep: 2, depth: 2, light: 'light', germ: [7, 14], trueLeaves: 18, roots: 26, harvest: 50, height: 'low', cm: [15, 25],
    tips: 'Lemony leaves, keeps going for many months.' }),

  // ---- Onion family
  P('spring-onion-root', 'Spring onion (root end)', 'Frühlingszwiebel (Wurzelende)', 'Onion family', 3, { start: 'rootend', seeds: [1, 2], seedUnit: 'root ends', keep: 2, germ: [2, 4], trueLeaves: 4, roots: 7, harvest: 14, life: 70, height: 'mid', cm: [20, 30], spread: 'narrow',
    how: 'Cut the green about 3 cm above the white part. Never cut into the white. It regrows 4 to 6 times.', tips: 'Cut a shop-bought spring onion 4 to 5 cm above the roots and replant the root end.' }),
  P('spring-onion', 'Spring onion (from seed)', 'Frühlingszwiebel (Saat)', 'Onion family', 2, { seeds: [8, 10], keep: 8, depth: 7, light: 'dark', germ: [7, 14], trueLeaves: 20, roots: 28, harvest: 65, life: 110, height: 'mid', cm: [20, 30], spread: 'narrow', cut: 'base',
    tips: 'Much slower than replanting a root end, but you get a whole bunch.' }),
  P('garlic-greens', 'Garlic greens (from a clove)', 'Knoblauchgrün', 'Onion family', 3, { start: 'clove', seeds: [1, 2], seedUnit: 'cloves', keep: 2, germ: [3, 7], trueLeaves: 7, roots: 7, harvest: 16, life: 45, height: 'mid', cm: [20, 30], spread: 'narrow',
    how: 'Cut the green shoots about 3 cm above the clove. You get 2 to 3 cuts before the clove is spent.', tips: 'You grow the green shoots, not a bulb. Use an unpeeled clove, pointed end up.' }),

  // ---- Fruiting
  P('chili', 'Dwarf chili', 'Zwergchili', 'Fruiting', 2, { seeds: [2, 2], keep: 1, depth: 5, light: 'dark', prep: 'Optional: soak the seeds in lukewarm water for 12 hours.', germ: [7, 21], trueLeaves: 25, roots: 35, harvest: 126, flower: 84, height: 'tall', cm: [25, 40], spread: 'wide', cut: 'fruit', pollinate: true,
    tips: 'Compact varieties only (Apache, Prairie Fire, Numex Twilight). Sprouts best at 25 to 28 °C. One plant per tray is plenty.' }),
  P('micro-tomato', 'Micro tomato', 'Mini-Tomate (Micro Tom)', 'Fruiting', 2, { seeds: [2, 2], keep: 1, depth: 5, germ: [5, 10], trueLeaves: 16, roots: 24, harvest: 90, flower: 50, life: 170, height: 'mid', cm: [15, 25], spread: 'wide', cut: 'fruit', pollinate: true,
    tips: 'Micro-dwarf varieties only (Micro Tom, Tiny Tim). Very thirsty once it carries fruit. Shake the plant daily when it flowers.' }),
  P('nasturtium', 'Nasturtium (dwarf)', 'Kapuzinerkresse', 'Fruiting', 2, { seeds: [1, 1], keep: 1, depth: 15, light: 'dark', prep: 'Soak the seed for 12 hours.', germ: [7, 12], trueLeaves: 16, roots: 22, harvest: 40, flower: 55, life: 120, height: 'mid', cm: [20, 30], spread: 'wide',
    how: 'Pick young leaves and open flowers. Both are edible and peppery.', tips: 'Trails over the edge, so give it a corner. Too much fertilizer gives leaves but no flowers.' }),
];

export const CATS = ['Herbs', 'Leafy greens', 'Onion family', 'Fruiting'];
export const START_LABEL = { seed: 'Seed in a plug', rootend: 'Root end, no plug', clove: 'Clove, no plug', cutting: 'Rooted cutting, no plug' };

export function allPlants(custom = []) { return [...PLANTS, ...custom.map(c => P(c.id, c.name, '', 'My plants', c.fit || 2, { ...c, custom: true }))]; }
export function plantMap(custom = []) { return Object.fromEntries(allPlants(custom).map(p => [p.id, p])); }

export function short(p) {
  let n = p.name.replace(/ \(.*\)/, '');
  if (n.includes(', ')) { const [a, b] = n.split(', '); n = `${b} ${a}`; }
  return n.toLowerCase();
}

export function sowText(p) {
  if (p.start === 'rootend') return `Stand ${p.seeds[0] === p.seeds[1] ? p.seeds[0] : p.seeds.join(' to ')} root end${p.seeds[1] > 1 ? 's' : ''} upright, roots down`;
  if (p.start === 'clove') return `Set ${p.seeds.join(' to ')} unpeeled cloves, pointed end up`;
  if (p.start === 'cutting') return `Plant ${p.seeds[0] === p.seeds[1] ? p.seeds[0] : p.seeds.join(' to ')} ${p.seedUnit || 'rooted cuttings'}`;
  const n = p.seeds[0] === p.seeds[1] ? p.seeds[0] : `${p.seeds[0]} to ${p.seeds[1]}`;
  const d = p.depth === 0 ? 'on the surface, pressed on lightly, not covered' : `${p.depth} mm deep, hole pinched shut`;
  return `${n} ${p.seedUnit || 'seeds'}, ${d}`;
}
