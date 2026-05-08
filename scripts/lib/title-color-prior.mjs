/**
 * Title → color family prior.
 *
 * Owner names items color-first ("Brown Cognac Leather Lumbar"). The first
 * matched color word in the title is treated as the dominant tone.
 *
 * Returns { primaryFamily, secondaryFamily, primaryWord, isPattern, confidence }.
 *
 * Families align with the 16-family taxonomy used in inventory_items.color_family:
 *   black | charcoal | grey | brown | tan | cream | white |
 *   red | orange | yellow | green | blue | purple | pink |
 *   metallic-warm | metallic-cool | multi
 */

// Order matters: longer/more specific phrases first so they tokenize before
// generic single words (e.g. "mud cloth" before "cloth").
const LEXICON = [
  // multi-word first
  ['mud cloth',     null],          // pattern only
  ['wild bird',     null],
  ['wild lynx',     null],
  ['wild leopard',  null],
  ['ticking stripe',null],

  // creams / whites
  ['ivory',         'cream'],
  ['oatmeal',       'cream'],
  ['cream',         'cream'],
  ['white',         'white'],

  // tans / beiges / champagnes
  ['champagne',     'tan'],
  ['beige',         'tan'],
  ['sand',          'tan'],
  ['greige',        'tan'],
  ['tan',           'tan'],
  ['camel',         'tan'],
  ['natural',       'tan'],

  // browns
  ['cognac',        'brown'],
  ['chocolate',     'brown'],
  ['mink',          'brown'],
  ['walnut',        'brown'],
  ['mahogany',      'brown'],
  ['brown',         'brown'],

  // black / charcoal / grey / silver
  ['charcoal',      'charcoal'],
  ['black',         'black'],
  ['silver',        'metallic-cool'],
  ['platinum',      'metallic-cool'],
  ['grey',          'grey'],
  ['gray',          'grey'],

  // blues
  ['denim',         'blue'],
  ['turquoise',     'blue'],
  ['navy',          'blue'],
  ['indigo',        'blue'],
  ['teal',          'blue'],
  ['blue',          'blue'],

  // greens
  ['sage',          'green'],
  ['olive',         'green'],
  ['emerald',       'green'],
  ['forest',        'green'],
  ['breen',         'green'],          // owner-known typo for "green"
  ['green',         'green'],

  // golds / yellows
  ['gold',          'metallic-warm'],
  ['mustard',       'yellow'],
  ['yellow',        'yellow'],

  // reds
  ['maroon',        'red'],
  ['burgundy',      'red'],
  ['crimson',       'red'],
  ['red',           'red'],

  // oranges / coppers / rusts
  ['copper',        'orange'],
  ['rust',          'orange'],
  ['terracotta',    'orange'],
  ['orange',        'orange'],

  // pinks / purples
  ['rose',          'pink'],
  ['blush',         'pink'],
  ['pink',          'pink'],
  ['plum',          'purple'],
  ['lavender',      'purple'],
  ['purple',        'purple'],
];

// Words that mean "this is multi-color / patterned" — they don't override the
// first color word, but they tell the reconciler to expect a 2-color outcome
// and to weight AI more heavily for which tone dominates.
const PATTERN_WORDS = [
  'leopard','zebra','plaid','stripe','striped','patchwork','abstract',
  'native','mud cloth','geo','geometric','brocade','wild bird','wild lynx',
  'wild leopard','print','fleck','dotted','ticking','ombre','fringe',
];

// Modifier hints that tweak shade but don't change family.
// (Not used directly yet — kept for future expansion.)
// const MODIFIERS = ['light','dark','deep','bright','pale','dusty','warm','cool'];

/**
 * Parse a product title into a color prior.
 * @param {string} title
 * @returns {{primaryFamily: string|null, secondaryFamily: string|null, primaryWord: string|null, isPattern: boolean, confidence: number}}
 */
export function titleColorPrior(title) {
  if (!title || typeof title !== 'string') {
    return { primaryFamily: null, secondaryFamily: null, primaryWord: null, isPattern: false, confidence: 0 };
  }
  const lower = ' ' + title.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ') + ' ';

  // Find all color-word matches with their positions.
  const hits = [];
  for (const [word, family] of LEXICON) {
    const padded = ` ${word} `;
    let idx = lower.indexOf(padded);
    while (idx !== -1) {
      if (family) hits.push({ pos: idx, word, family });
      idx = lower.indexOf(padded, idx + 1);
    }
  }
  hits.sort((a, b) => a.pos - b.pos);

  // Detect pattern flag.
  let isPattern = false;
  for (const pw of PATTERN_WORDS) {
    if (lower.includes(` ${pw} `)) { isPattern = true; break; }
  }

  if (hits.length === 0) {
    return { primaryFamily: null, secondaryFamily: null, primaryWord: null, isPattern, confidence: 0 };
  }

  const primary = hits[0];
  // Secondary = next hit with a different family.
  const secondary = hits.slice(1).find(h => h.family !== primary.family) || null;

  // Confidence: 1.0 if exactly one color word, 0.85 if multiple (still primary
  // wins by position), 0.7 if pattern flag also present (more ambiguity).
  let confidence = hits.length === 1 ? 1.0 : 0.85;
  if (isPattern && hits.length > 1) confidence = 0.75;

  return {
    primaryFamily: primary.family,
    secondaryFamily: secondary?.family || null,
    primaryWord: primary.word,
    isPattern,
    confidence,
  };
}
