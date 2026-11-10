// Schéma commun des VDL — partagé par le site (navigateur) et les scripts Node.
// Convention des valeurs :
//   valeur renseignée
//   null  → information non disponible (affichée « N/D »)
//   "na"  → non applicable : l'élément n'existe pas sur ce VDL (affiché « — »)

export const NA = 'na';

export const TYPES = {
  van: 'Van (toit relevable)',
  fourgon: 'Fourgon aménagé',
  profile: 'Profilé',
  integral: 'Intégral',
  capucine: 'Capucine',
  caravane: 'Caravane',
};

export const TYPE_FAMILY = {
  van: 'motorise', fourgon: 'motorise', profile: 'motorise',
  integral: 'motorise', capucine: 'motorise', caravane: 'tracte',
};

export const ENUMS = {
  fuel: { diesel: 'Gazole', essence: 'Essence', hybride: 'Hybride', electrique: 'Électrique' },
  gearbox: { manuelle: 'Manuelle', auto: 'Automatique' },
  heating_energy: {
    gaz: 'Gaz', gazole: 'Gazole', electrique: 'Électrique',
    gaz_electrique: 'Gaz + électrique', gazole_electrique: 'Gazole + électrique',
  },
  heating_system: { air: 'Air pulsé', eau: 'Eau chaude (chauffage central)', combi: 'Combiné air + eau chaude', convecteur: 'Convecteur' },
  fridge_type: { absorption: 'Absorption trimixte (12 V / 230 V / gaz)', compresseur: 'Compresseur 12 V', glaciere: 'Glacière à compresseur' },
  hot_water_source: { combi: 'Intégrée au chauffage', boiler: 'Chauffe-eau séparé' },
  bed_type: {
    central: 'Lit central / île',
    jumeaux: 'Lits jumeaux',
    transversal: 'Lit transversal',
    pavillon: 'Lit de pavillon (électrique)',
    capucine: 'Lit de capucine',
    toit: 'Lit dans le toit relevable',
    dinette: 'Dînette transformable',
    superposes: 'Lits superposés',
    banquette: 'Banquette-lit',
    francais: 'Lit à la française',
  },
};

// Champs du schéma : chemin, libellé, groupe, format et applicabilité.
// `naFor` : types pour lesquels le champ est non applicable par nature.
export const FIELDS = [
  { path: 'chassis', label: 'Porteur', group: 'Porteur et moteur', fmt: 'chassis', naFor: ['caravane'] },
  { path: 'engine.power_ch', label: 'Puissance', group: 'Porteur et moteur', fmt: 'unit', unit: 'ch', naFor: ['caravane'] },
  { path: 'engine.fuel', label: 'Carburant', group: 'Porteur et moteur', fmt: 'enum', enum: 'fuel', naFor: ['caravane'] },
  { path: 'engine.gearbox', label: 'Boîte de vitesses', group: 'Porteur et moteur', fmt: 'enum', enum: 'gearbox', naFor: ['caravane'] },

  { path: 'dimensions.length_cm', label: 'Longueur', group: 'Dimensions et poids', fmt: 'm' },
  { path: 'dimensions.width_cm', label: 'Largeur', group: 'Dimensions et poids', fmt: 'm' },
  { path: 'dimensions.height_cm', label: 'Hauteur', group: 'Dimensions et poids', fmt: 'm' },
  { path: 'dimensions.wheelbase_cm', label: 'Empattement', group: 'Dimensions et poids', fmt: 'm', naFor: ['caravane'] },
  { path: 'weights.ptac_kg', label: 'PTAC', group: 'Dimensions et poids', fmt: 'unit', unit: 'kg', better: 'none' },
  { path: 'weights.empty_kg', label: 'Masse en ordre de marche', group: 'Dimensions et poids', fmt: 'unit', unit: 'kg', better: 'low' },
  { path: 'weights.payload_kg', label: 'Charge utile', group: 'Dimensions et poids', fmt: 'unit', unit: 'kg', better: 'high' },

  { path: 'seats.travel', label: 'Places carte grise', group: 'Habitabilité', fmt: 'int', naFor: ['caravane'], better: 'high' },
  { path: 'seats.sleep', label: 'Couchages (total)', group: 'Habitabilité', fmt: 'int', better: 'high' },
  { path: 'beds', label: 'Détail des couchages', group: 'Habitabilité', fmt: 'beds' },
  { path: 'layout', label: 'Implantation', group: 'Habitabilité', fmt: 'text' },
  { path: 'tanks.fresh_l', label: 'Réservoir eau propre', group: 'Habitabilité', fmt: 'unit', unit: 'L', better: 'high' },
  { path: 'tanks.grey_l', label: 'Réservoir eaux usées', group: 'Habitabilité', fmt: 'unit', unit: 'L', better: 'high' },

  { path: 'equipment.heating.energy', label: 'Chauffage : énergie', group: 'Équipements', fmt: 'enum', enum: 'heating_energy' },
  { path: 'equipment.heating.system', label: 'Chauffage : système', group: 'Équipements', fmt: 'enum', enum: 'heating_system' },
  { path: 'equipment.heating.model', label: 'Chauffage : modèle', group: 'Équipements', fmt: 'text' },
  { path: 'equipment.fridge.type', label: 'Réfrigérateur : type', group: 'Équipements', fmt: 'enum', enum: 'fridge_type' },
  { path: 'equipment.fridge.volume_l', label: 'Réfrigérateur : volume', group: 'Équipements', fmt: 'unit', unit: 'L', better: 'high' },
  { path: 'equipment.fridge.freezer', label: 'Compartiment congélation', group: 'Équipements', fmt: 'bool' },
  { path: 'equipment.hot_water.present', label: 'Eau chaude', group: 'Équipements', fmt: 'bool' },
  { path: 'equipment.hot_water.source', label: 'Eau chaude : production', group: 'Équipements', fmt: 'enum', enum: 'hot_water_source' },
  { path: 'equipment.hot_water.volume_l', label: 'Eau chaude : ballon', group: 'Équipements', fmt: 'unit', unit: 'L' },
  { path: 'equipment.roof.pop_top', label: 'Toit relevable', group: 'Toit et ouvertures', fmt: 'bool', naFor: ['profile', 'integral', 'capucine', 'caravane'] },
  { path: 'equipment.roof.skylights', label: 'Lanterneaux / baies de toit', group: 'Toit et ouvertures', fmt: 'int' },
  { path: 'equipment.roof.skylight_types', label: 'Type de lanterneaux', group: 'Toit et ouvertures', fmt: 'text' },
  { path: 'equipment.roof.panoramic', label: 'Toit / baie panoramique', group: 'Toit et ouvertures', fmt: 'bool' },
  { path: 'equipment.roof.cab_skylight', label: 'Lanterneau de cabine', group: 'Toit et ouvertures', fmt: 'bool', naFor: ['caravane', 'capucine'] },
];

export function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null || o === NA ? o : o[k]), obj);
}

export function set(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  o[keys.at(-1)] = value;
}

// Complète un modèle : champs absents → null (N/D), champs non applicables → "na",
// dépendances (pas d'eau chaude → production/ballon "na"), couchages totaux.
export function normalizeModel(input) {
  const m = structuredClone(input);
  for (const f of FIELDS) {
    const v = get(m, f.path);
    if (f.naFor?.includes(m.type)) set(m, f.path, NA);
    else if (v === undefined) set(m, f.path, null);
  }
  if (get(m, 'equipment.hot_water.present') === false) {
    set(m, 'equipment.hot_water.source', NA);
    set(m, 'equipment.hot_water.volume_l', NA);
  }
  if (get(m, 'equipment.fridge.type') === NA) {
    set(m, 'equipment.fridge.volume_l', NA);
    set(m, 'equipment.fridge.freezer', NA);
  }
  if (get(m, 'equipment.heating.energy') === NA) {
    set(m, 'equipment.heating.system', NA);
    set(m, 'equipment.heating.model', NA);
  }
  if (get(m, 'equipment.roof.skylights') === 0) set(m, 'equipment.roof.skylight_types', NA);
  if (Array.isArray(m.beds) && m.seats.sleep == null) {
    m.seats.sleep = m.beds.reduce((s, b) => s + (b.count || 0), 0) || null;
  }
  if (m.price_new_eur === undefined) m.price_new_eur = null;
  m.data_quality ??= 'seed';
  return m;
}

const REQUIRED = ['id', 'brand', 'range', 'model', 'year', 'type'];

// Renvoie la liste des erreurs (vide si valide).
export function validateModel(m) {
  const errors = [];
  for (const k of REQUIRED) if (m[k] == null || m[k] === '') errors.push(`${k} manquant`);
  if (m.type && !TYPES[m.type]) errors.push(`type inconnu : ${m.type}`);
  for (const f of FIELDS) {
    const v = get(m, f.path);
    if (v === undefined) { errors.push(`${f.path} absent (attendu : valeur, null ou "na")`); continue; }
    if (v === null || v === NA) continue;
    if (f.fmt === 'enum' && !ENUMS[f.enum][v]) errors.push(`${f.path} : valeur « ${v} » hors liste`);
    if ((f.fmt === 'int' || f.fmt === 'unit' || f.fmt === 'm') && typeof v !== 'number') errors.push(`${f.path} doit être un nombre`);
    if (f.fmt === 'bool' && typeof v !== 'boolean') errors.push(`${f.path} doit être true/false`);
    if (f.fmt === 'beds') {
      if (!Array.isArray(v)) errors.push('beds doit être une liste');
      else v.forEach((b, i) => { if (!ENUMS.bed_type[b.type]) errors.push(`beds[${i}].type inconnu : ${b.type}`); });
    }
  }
  return errors;
}

// Statistiques N/D pour le rapport de build.
export function countMissing(m) {
  return FIELDS.filter((f) => get(m, f.path) === null).map((f) => f.path);
}
