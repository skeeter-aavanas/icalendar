// Page catalogue : filtres (conservés dans l'URL), tri, pagination, sélection pour comparaison.
import { TYPES, ENUMS, NA, get } from './schema.js';
import {
  loadData, esc, fullName, brandName, typeLabel, fmtField, getCompare, setCompare, toggleCompare,
  toast, renderHeader, renderFooter, qualityBadge, MAX_COMPARE,
} from './common.js';
import { euro } from './estimate.js';

const PAGE_SIZE = 24;
const form = document.getElementById('filters');
const $ = (id) => document.getElementById(id);

renderHeader('catalogue');

let data;
try {
  data = await loadData();
} catch (e) {
  $('summary').textContent = `Impossible de charger les données (${e.message}). Ouvrez le site via un serveur web (voir README).`;
  throw e;
}
renderFooter(data);

const models = data.models;
const used = (path) => new Set(models.map((m) => get(m, path)).filter((v) => v != null && v !== NA));

// Remplissage des listes à partir des valeurs réellement présentes.
const addOptions = (sel, entries) => sel.insertAdjacentHTML('beforeend', entries.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''));
$('types').innerHTML = Object.entries(TYPES).filter(([t]) => models.some((m) => m.type === t))
  .map(([t, l]) => `<label><input type="checkbox" name="type" value="${t}"> ${esc(l)}</label>`).join('');
addOptions($('brand'), [...new Set(models.map((m) => m.brand))].map((b) => [b, brandName(data, b)]).sort((a, b) => a[1].localeCompare(b[1], 'fr')));
addOptions($('chassis'), [...used('chassis')].map((c) => [c, data.chassis.get(c)?.name || c]).sort((a, b) => a[1].localeCompare(b[1], 'fr')));
addOptions($('heat'), [...used('equipment.heating.energy')].map((v) => [v, ENUMS.heating_energy[v]]));
addOptions($('fridge'), [...used('equipment.fridge.type')].map((v) => [v, ENUMS.fridge_type[v]]));
const bedTypes = new Set(models.flatMap((m) => (Array.isArray(m.beds) ? m.beds.map((b) => b.type) : [])));
addOptions($('bed'), [...bedTypes].map((v) => [v, ENUMS.bed_type[v]]));

const brandsCount = new Set(models.map((m) => m.brand)).size;
$('summary').textContent = `${models.length} modèles · ${brandsCount} marques · camping-cars, fourgons, vans et caravanes. Sélectionnez jusqu'à ${MAX_COMPARE} véhicules à comparer.`;

// --- État <-> URL ---
function readForm() {
  const fd = new FormData(form);
  const s = { types: fd.getAll('type') };
  for (const k of ['q', 'brand', 'chassis', 'lmin', 'lmax', 'pmin', 'pmax', 'travel', 'sleep', 'heat', 'fridge', 'bed', 'ptac35', 'hotwater', 'poptop']) {
    const v = fd.get(k);
    if (v) s[k] = String(v).trim();
  }
  return s;
}

function stateToUrl(s, sort, page) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(s)) {
    if (Array.isArray(v)) v.forEach((x) => p.append(k === 'types' ? 'type' : k, x));
    else if (v) p.set(k, v);
  }
  if (sort !== 'name') p.set('sort', sort);
  if (page > 1) p.set('page', page);
  history.replaceState(null, '', `${location.pathname}${p.size ? '?' + p : ''}`);
}

function urlToForm() {
  const p = new URLSearchParams(location.search);
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') el.checked = el.name === 'type' ? p.getAll('type').includes(el.value) : p.get(el.name) === el.value;
    else if (p.has(el.name)) el.value = p.get(el.name);
  }
  $('sort').value = p.get('sort') || 'name';
  return Number(p.get('page') || 1);
}

// --- Filtrage ---
const num = (v) => (typeof v === 'number' ? v : null);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function matches(m, s) {
  if (s.types.length && !s.types.includes(m.type)) return false;
  if (s.brand && m.brand !== s.brand) return false;
  if (s.chassis && m.chassis !== s.chassis) return false;
  if (s.q) {
    const hay = norm(`${fullName(data, m)} ${m.layout || ''} ${typeLabel(m.type)} ${data.chassis.get(m.chassis)?.name || ''}`);
    if (!norm(s.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  const len = num(m.dimensions.length_cm);
  if (s.lmin && !(len != null && len >= s.lmin * 100)) return false;
  if (s.lmax && !(len != null && len <= s.lmax * 100)) return false;
  const price = num(m.price_new_eur);
  if (s.pmin && !(price != null && price >= +s.pmin)) return false;
  if (s.pmax && !(price != null && price <= +s.pmax)) return false;
  if (s.travel && !(num(m.seats.travel) >= +s.travel)) return false;
  if (s.sleep && !(num(m.seats.sleep) >= +s.sleep)) return false;
  if (s.ptac35 && !(num(m.weights.ptac_kg) != null && m.weights.ptac_kg <= 3500)) return false;
  if (s.heat && get(m, 'equipment.heating.energy') !== s.heat) return false;
  if (s.fridge && get(m, 'equipment.fridge.type') !== s.fridge) return false;
  if (s.bed && !(Array.isArray(m.beds) && m.beds.some((b) => b.type === s.bed))) return false;
  if (s.hotwater && get(m, 'equipment.hot_water.present') !== true) return false;
  if (s.poptop && get(m, 'equipment.roof.pop_top') !== true) return false;
  return true;
}

const sorters = {
  name: (a, b) => fullName(data, a).localeCompare(fullName(data, b), 'fr'),
  'price-asc': (a, b) => (num(a.price_new_eur) ?? Infinity) - (num(b.price_new_eur) ?? Infinity),
  'price-desc': (a, b) => (num(b.price_new_eur) ?? -Infinity) - (num(a.price_new_eur) ?? -Infinity),
  'length-asc': (a, b) => (num(a.dimensions.length_cm) ?? Infinity) - (num(b.dimensions.length_cm) ?? Infinity),
  'length-desc': (a, b) => (num(b.dimensions.length_cm) ?? -Infinity) - (num(a.dimensions.length_cm) ?? -Infinity),
  'sleep-desc': (a, b) => (num(b.seats.sleep) ?? -1) - (num(a.seats.sleep) ?? -1),
};

const F = (path, fmt, extra = {}) => ({ path, fmt, ...extra });
const CARD_FIELDS = [
  ['Porteur', F('chassis', 'chassis')],
  ['Longueur', F('dimensions.length_cm', 'm')],
  ['PTAC', F('weights.ptac_kg', 'unit', { unit: 'kg' })],
  ['Places / couchages', null],
  ['Chauffage', F('equipment.heating.energy', 'enum', { enum: 'heating_energy' })],
  ['Eau chaude', F('equipment.hot_water.present', 'bool')],
];

function card(m) {
  const inCmp = getCompare().includes(m.id);
  const rows = CARD_FIELDS.map(([label, f]) => {
    const val = f ? fmtField(data, m, f)
      : `${fmtField(data, m, F('seats.travel', 'int'))} / ${fmtField(data, m, F('seats.sleep', 'int'))}`;
    return `<dt>${label}</dt><dd>${val}</dd>`;
  }).join('');
  return `<article class="card vcard">
    <div class="badges"><span class="badge type">${esc(typeLabel(m.type))}</span><span class="badge">${m.year}</span>${qualityBadge(m)}</div>
    <h3><a href="vehicule.html?id=${encodeURIComponent(m.id)}">${esc(fullName(data, m))}</a></h3>
    ${m.layout ? `<div class="sub">${esc(m.layout)}</div>` : ''}
    <dl>${rows}</dl>
    <div class="price">${m.price_new_eur != null ? `${euro(m.price_new_eur)} <span class="note">neuf, prix catalogue</span>` : '<span class="note">Prix neuf N/D</span>'}</div>
    <div class="actions">
      <a class="btn" href="vehicule.html?id=${encodeURIComponent(m.id)}">Fiche</a>
      <button type="button" data-cmp="${esc(m.id)}" aria-pressed="${inCmp}">${inCmp ? '✓ Comparé' : '+ Comparer'}</button>
    </div>
  </article>`;
}

let page = urlToForm();

function render(resetPage = false) {
  if (resetPage) page = 1;
  const s = readForm();
  const sort = $('sort').value;
  const list = models.filter((m) => matches(m, s)).sort(sorters[sort]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(page, pages);
  stateToUrl(s, sort, page);

  const active = Object.keys(s).filter((k) => k !== 'types').length + (s.types.length ? 1 : 0);
  $('active-count').textContent = active ? active : '';
  $('result-count').textContent = `${list.length} véhicule${list.length > 1 ? 's' : ''}`;
  $('results').innerHTML = list.length
    ? list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(card).join('')
    : '<div class="empty card">Aucun véhicule ne correspond à ces critères.</div>';
  $('pager').innerHTML = pages > 1
    ? Array.from({ length: pages }, (_, i) => `<button type="button" data-page="${i + 1}" ${i + 1 === page ? 'aria-current="page" class="primary"' : ''}>${i + 1}</button>`).join('')
    : '';
  renderBar();
}

function renderBar() {
  const ids = getCompare();
  const bar = $('cmpbar');
  bar.hidden = !ids.length;
  const byId = new Map(models.map((m) => [m.id, m]));
  $('cmp-names').textContent = `${ids.length}/${MAX_COMPARE} : ` + ids.map((id) => (byId.has(id) ? fullName(data, byId.get(id)) : id)).join(' · ');
  $('cmp-go').href = `comparer.html?ids=${ids.map(encodeURIComponent).join(',')}`;
}

let debounce;
form.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => render(true), 150); });
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('reset', () => setTimeout(() => render(true)));
$('sort').addEventListener('change', () => render(true));
$('pager').addEventListener('click', (e) => {
  const b = e.target.closest('[data-page]');
  if (b) { page = Number(b.dataset.page); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
$('results').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cmp]');
  if (!b) return;
  const r = toggleCompare(b.dataset.cmp);
  if (r === 'full') { toast(`Le comparateur est limité à ${MAX_COMPARE} véhicules. Retirez-en un pour en ajouter un autre.`); return; }
  b.setAttribute('aria-pressed', r === 'added');
  b.textContent = r === 'added' ? '✓ Comparé' : '+ Comparer';
  renderBar();
});
$('cmp-clear').addEventListener('click', () => { setCompare([]); render(); });
if (matchMedia('(max-width: 860px)').matches) $('filters-box').open = false;

render();
