// Fonctions partagées par les pages : chargement des données, formatage, comparateur.
import { FIELDS, ENUMS, TYPES, NA, get } from './schema.js';

export const MAX_COMPARE = 4;
const KEY = 'vdl-compare';

let cache;
export async function loadData() {
  if (cache) return cache;
  const load = (f) => fetch(`data/${f}`).then((r) => { if (!r.ok) throw new Error(`${f} : HTTP ${r.status}`); return r.json(); });
  const [models, brands, chassis, depreciation] = await Promise.all([
    load('models.json'), load('brands.json'), load('chassis.json'), load('depreciation.json'),
  ]);
  cache = {
    models: models.models,
    generatedAt: models.generated_at,
    brands: new Map(brands.map((b) => [b.id, b])),
    chassis: new Map(chassis.map((c) => [c.id, c])),
    depreciation,
  };
  return cache;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const brandName = (data, id) => data.brands.get(id)?.name || id;
export const fullName = (data, m) => `${brandName(data, m.brand)} ${m.range} ${m.model}`.replace(/\s+/g, ' ');
export const typeLabel = (t) => TYPES[t] || t;

export const ND_HTML = '<span class="nd" title="Information non communiquée par la source">N/D</span>';
export const NA_HTML = '<span class="na" title="Non applicable : absent sur ce véhicule">—</span>';

const nf = new Intl.NumberFormat('fr-FR');

export function bedsText(beds) {
  return beds.map((b) => `${b.count} × ${ENUMS.bed_type[b.type] || b.type}${b.dimensions ? ` (${b.dimensions})` : ''}`);
}

// Valeur brute comparable (pour repérer les différences et la meilleure valeur).
export function rawValue(m, f) {
  const v = get(m, f.path);
  if (f.fmt === 'beds' && Array.isArray(v)) return bedsText(v).join(' | ');
  return v;
}

// Rendu HTML d'un champ, avec la convention N/D (null) et — (non applicable).
export function fmtField(data, m, f) {
  const v = get(m, f.path);
  if (v === null || v === undefined) return ND_HTML;
  if (v === NA) return NA_HTML;
  switch (f.fmt) {
    case 'chassis': return esc(data.chassis.get(v)?.name || v);
    case 'enum': return esc(ENUMS[f.enum][v] || v);
    case 'bool': return v ? '<span class="yes">✓ Oui</span>' : '<span class="no">✗ Non</span>';
    case 'm': return `${(v / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
    case 'unit': return `${nf.format(v)} ${f.unit}`;
    case 'int': return nf.format(v);
    case 'beds': return v.length ? `<ul class="beds">${bedsText(v).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : NA_HTML;
    default: return esc(v);
  }
}

export function groupedFields() {
  const groups = new Map();
  for (const f of FIELDS) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group).push(f);
  }
  return groups;
}

// --- Comparateur (localStorage, avec repli en mémoire si indisponible) ---
let memory = [];
export function getCompare() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.slice(0, MAX_COMPARE) : []; }
  catch { return memory; }
}
export function setCompare(ids) {
  memory = ids.slice(0, MAX_COMPARE);
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* navigation privée */ }
  document.dispatchEvent(new CustomEvent('compare-change', { detail: memory }));
}
// Renvoie 'added' | 'removed' | 'full'
export function toggleCompare(id) {
  const ids = getCompare();
  if (ids.includes(id)) { setCompare(ids.filter((x) => x !== id)); return 'removed'; }
  if (ids.length >= MAX_COMPARE) return 'full';
  setCompare([...ids, id]);
  return 'added';
}

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 3200);
}

export function renderHeader(active) {
  const n = getCompare().length;
  const el = document.querySelector('header.site');
  el.innerHTML = `
    <a class="logo" href="index.html"><span aria-hidden="true">🚐</span> VDL Catalogue</a>
    <nav>
      <a href="index.html" ${active === 'catalogue' ? 'aria-current="page"' : ''}>Catalogue</a>
      <a href="comparer.html" ${active === 'compare' ? 'aria-current="page"' : ''}>Comparateur <span class="count" id="cmp-count">${n}/${MAX_COMPARE}</span></a>
    </nav>`;
  document.addEventListener('compare-change', (e) => {
    const c = document.getElementById('cmp-count');
    if (c) c.textContent = `${e.detail.length}/${MAX_COMPARE}`;
  });
}

export function renderFooter(data) {
  const el = document.querySelector('footer.site');
  const date = data?.generatedAt ? new Date(data.generatedAt).toLocaleDateString('fr-FR') : '';
  el.innerHTML = `
    <p><strong>Données fournies à titre indicatif.</strong> Les caractéristiques proviennent des documentations publiques des constructeurs (lien source sur chaque fiche) et peuvent comporter des erreurs ; seul le constructeur ou le concessionnaire fait foi. Les estimations d'occasion sont calculées par ce site et ne constituent pas une cote officielle.</p>
    <p>Légende : ${ND_HTML} information non disponible · ${NA_HTML} non applicable (absent sur ce véhicule)${date ? ` · Données générées le ${date}` : ''}</p>`;
}

export function qualityBadge(m) {
  if (m.data_quality === 'verified') return '<span class="badge ok">Vérifié</span>';
  if (m.data_quality === 'scraped') return '<span class="badge info" title="Extrait automatiquement de la fiche constructeur">Collecté</span>';
  return '<span class="badge warn" title="Saisie de départ approximative, à vérifier">À vérifier</span>';
}
