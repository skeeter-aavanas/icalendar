// Extraction générique des caractéristiques à partir du texte d'une fiche technique
// (page HTML ou PDF converti en texte), en français, allemand ou anglais.
// Ne renvoie que ce qui est trouvé : le reste devient « N/D » à la normalisation.

const NUM = '(\\d{1,3}(?:[ .\\u00a0]\\d{3})*(?![\\d])(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?)';

export function toNumber(s) {
  if (s == null) return null;
  const t = String(s).replace(/[\s ]/g, '');
  // « 3.500 » ou « 3 500 » = milliers ; « 6,99 » ou « 6.99 » = décimales
  if (/^\d{1,3}([.]\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t.replace(',', '.'));
}

// Convertit une longueur en cm selon l'unité indiquée (ou devinée).
export function toCm(value, unit) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return null;
  const u = (unit || '').toLowerCase();
  if (u === 'mm') return Math.round(n / 10);
  if (u === 'cm') return Math.round(n);
  if (u === 'm') return Math.round(n * 100);
  if (n < 20) return Math.round(n * 100); // 6,99 → m
  if (n > 1000) return Math.round(n / 10); // 6990 → mm
  return Math.round(n);
}

const LABELS = {
  length: ['longueur(?: hors tout)?', 'gesamtlänge', 'länge', 'overall length', 'length'],
  width: ['largeur(?: hors tout)?', 'gesamtbreite', 'breite', 'overall width', 'width'],
  height: ['hauteur(?: hors tout)?', 'gesamthöhe', 'höhe', 'overall height', 'height'],
  wheelbase: ['empattement', 'radstand', 'wheelbase'],
  ptac: ['ptac', 'masse maximale techniquement admissible', 'technisch zulässige gesamtmasse', 'zulässiges gesamtgewicht', 'gross vehicle weight', 'mtplm', 'maximum technically permissible'],
  empty: ['masse en ordre de marche', 'poids à vide', 'masse à vide', 'masse im fahrbereiten zustand', 'leergewicht', 'mass in running order', 'mro'],
  payload: ['charge utile', 'zuladung', 'payload'],
  travel: ['places carte grise', 'places assises(?: homologuées)?', 'places homologuées', 'sitzplätze(?: mit gurt)?', 'zugelassene sitzplätze', 'travel seats', 'seats with belts'],
  sleep: ['couchages', 'places couchage', 'schlafplätze', 'berths', 'sleeping places'],
  fresh: ['réservoir d\'eau propre', 'eau propre', 'eau potable', 'frischwasser(?:tank)?', 'fresh water'],
  grey: ['eaux usées', 'eaux grises', 'abwasser(?:tank)?', 'grauwasser', 'waste water', 'grey water'],
  power: ['puissance', 'leistung', 'power'],
  fridge: ['réfrigérateur', 'frigo', 'kühlschrank', 'refrigerator', 'fridge'],
};

function rx(keys, tail) {
  return new RegExp(`(?:${keys.join('|')})[^\\d\\n]{0,40}?${tail}`, 'i');
}

function findNumber(text, keys, unitRe = '') {
  const m = text.match(rx(keys, NUM + (unitRe ? `\\s*(${unitRe})?` : '')));
  return m ? { value: m[1], unit: m[2] } : null;
}

export function extractSpecs(rawText) {
  const text = rawText.replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const lower = text.toLowerCase();
  const out = { dimensions: {}, weights: {}, seats: {}, tanks: {}, engine: {}, equipment: { heating: {}, fridge: {}, hot_water: {}, roof: {} } };

  for (const [k, field] of [['length', 'length_cm'], ['width', 'width_cm'], ['height', 'height_cm'], ['wheelbase', 'wheelbase_cm']]) {
    const f = findNumber(text, LABELS[k], 'mm|cm|m\\b');
    if (f) out.dimensions[field] = toCm(f.value, f.unit);
  }
  for (const [k, field] of [['ptac', 'ptac_kg'], ['empty', 'empty_kg'], ['payload', 'payload_kg']]) {
    const f = findNumber(text, LABELS[k], 'kg|t\\b');
    if (f) {
      let n = toNumber(f.value);
      if ((f.unit || '').toLowerCase() === 't' || n < 10) n = Math.round(n * 1000);
      out.weights[field] = n;
    }
  }
  for (const [k, field] of [['travel', 'travel'], ['sleep', 'sleep']]) {
    const f = findNumber(text, LABELS[k]);
    if (f) { const n = toNumber(f.value); if (n > 0 && n < 12) out.seats[field] = n; }
  }
  for (const [k, field] of [['fresh', 'fresh_l'], ['grey', 'grey_l']]) {
    const f = findNumber(text, LABELS[k], 'l\\b|litres?|liter');
    if (f) out.tanks[field] = Math.round(toNumber(f.value));
  }
  const p = text.match(new RegExp(`${NUM}\\s*(?:ch|cv|ps|hp)\\b`, 'i')) || null;
  const pk = findNumber(text, LABELS.power, 'kw|ch|cv|ps|hp');
  if (p) out.engine.power_ch = Math.round(toNumber(p[1]));
  else if (pk) out.engine.power_ch = /kw/i.test(pk.unit || '') ? Math.round(toNumber(pk.value) * 1.36) : Math.round(toNumber(pk.value));

  if (/boîte automatique|bva|automatikgetriebe|9g-tronic|9-gang-automatik|automatic gearbox|dsg/i.test(text)) out.engine.gearbox = 'auto';
  else if (/boîte manuelle|bvm|schaltgetriebe|manual gearbox/i.test(text)) out.engine.gearbox = 'manuelle';
  if (/diesel|gazole|multijet|ecoblue|tdi\b|cdi\b|\b\d{3} d\b/i.test(text)) out.engine.fuel = 'diesel';

  // Chauffage
  const heat = text.match(/(truma combi d ?\d(?: e)?|truma combi ?\d(?: e)?|truma vario ?heat|truma s ?\d{4}|alde(?: compact)? ?\d{0,4}|webasto[\w -]{0,20}|eberspächer[\w -]{0,20}|autoterm[\w -]{0,15})/i);
  if (heat) {
    const h = heat[1].trim();
    out.equipment.heating.model = h.replace(/\s+/g, ' ');
    if (/combi d|webasto|eberspächer|autoterm/i.test(h)) out.equipment.heating.energy = /\be\b$/i.test(h) ? 'gazole_electrique' : 'gazole';
    else out.equipment.heating.energy = /combi ?\d e$/i.test(h) ? 'gaz_electrique' : 'gaz';
    out.equipment.heating.system = /alde/i.test(h) ? 'eau' : /combi/i.test(h) ? 'combi' : /truma s/i.test(h) ? 'convecteur' : 'air';
  } else if (/chauffage (?:au )?gazole|dieselheizung|diesel heater/i.test(text)) out.equipment.heating.energy = 'gazole';
  else if (/chauffage (?:au )?gaz|gasheizung/i.test(text)) out.equipment.heating.energy = 'gaz';

  // Réfrigérateur
  const fr = text.match(rx(LABELS.fridge, `${NUM}\\s*(?:l\\b|litres?|liter)`));
  if (fr) out.equipment.fridge.volume_l = Math.round(toNumber(fr[1]));
  if (/compresseur|kompressor|compressor/i.test(text)) out.equipment.fridge.type = 'compresseur';
  else if (/absorption|trimixte|3-wege|3-way/i.test(text)) out.equipment.fridge.type = 'absorption';
  if (/congélat|freezer|gefrierfach|tiefkühl/i.test(lower)) out.equipment.fridge.freezer = true;

  // Eau chaude
  if (/truma combi|alde|chauffe-eau|boiler|warmwasser|hot water|eau chaude/i.test(text)) {
    out.equipment.hot_water.present = true;
    if (/truma combi|alde/i.test(text)) out.equipment.hot_water.source = 'combi';
    else if (/chauffe-eau|boiler/i.test(text)) out.equipment.hot_water.source = 'boiler';
  }

  // Toit
  if (/toit relevable|aufstelldach|hubdach|pop-?top|elevating roof/i.test(text)) out.equipment.roof.pop_top = true;
  const sky = [...new Set((text.match(/(midi-heki|mini-heki|micro-heki|heki ?\d|skyroof|maxxfan|fiamma vent|remitop)/gi) || []).map((s) => s.trim()))];
  if (sky.length) out.equipment.roof.skylight_types = sky.join(' + ');
  if (/toit panoramique|baie panoramique|panoramadach|panoramic roof|skyroof/i.test(text)) out.equipment.roof.panoramic = true;

  // Couchages
  const beds = [];
  const bedRules = [
    ['central', /lit central|lit (?:en )?île|queensbett|island bed/i],
    ['jumeaux', /lits jumeaux|einzelbetten|twin beds|single beds/i],
    ['transversal', /lit transversal|querbett|transverse bed/i],
    ['pavillon', /lit (?:de )?pavillon|hubbett|drop-?down bed/i],
    ['capucine', /lit (?:de )?capucine|alkovenbett|overcab bed/i],
    ['toit', /lit (?:de |dans le )?toit|dachbett|roof bed/i],
    ['superposes', /lits superposés|etagenbett|stockbett|bunk beds?/i],
    ['dinette', /dînette transformable|dinette convertible|sitzgruppe umbau|umbaubar/i],
  ];
  for (const [type, re] of bedRules) if (re.test(text)) beds.push({ type, count: type === 'dinette' ? 1 : 2 });
  if (beds.length) out.beds = beds;

  return prune(out);
}

function prune(o) {
  if (Array.isArray(o)) return o;
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      const p = prune(v);
      if (p == null || (typeof p === 'number' && !Number.isFinite(p))) continue;
      if (typeof p === 'object' && !Array.isArray(p) && !Object.keys(p).length) continue;
      r[k] = p;
    }
    return r;
  }
  return o;
}
