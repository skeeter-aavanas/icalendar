// Comparateur : jusqu'à 4 VDL côte à côte, différences surlignées.
import {
  loadData, esc, fullName, typeLabel, fmtField, rawValue, groupedFields, getCompare, setCompare,
  toast, renderHeader, renderFooter, qualityBadge, MAX_COMPARE,
} from './common.js';
import { usedEstimate, euro } from './estimate.js';

renderHeader('compare');
const data = await loadData();
renderFooter(data);
const byId = new Map(data.models.map((m) => [m.id, m]));
const $ = (id) => document.getElementById(id);

// Le lien partagé (?ids=) est prioritaire sur la sélection enregistrée.
const urlIds = new URLSearchParams(location.search).get('ids');
if (urlIds) setCompare(urlIds.split(',').map(decodeURIComponent).filter((id) => byId.has(id)));

function syncUrl(ids) {
  history.replaceState(null, '', ids.length ? `?ids=${ids.map(encodeURIComponent).join(',')}` : location.pathname);
}

// Indices des meilleures valeurs numériques d'une ligne.
function bestIdx(values, better) {
  if (!better || better === 'none') return [];
  const nums = values.map((v) => (typeof v === 'number' ? v : null));
  if (nums.filter((n) => n != null).length < 2) return [];
  const target = better === 'high' ? Math.max(...nums.filter((n) => n != null)) : Math.min(...nums.filter((n) => n != null));
  if (nums.every((n) => n == null || n === target)) return [];
  return nums.map((n, i) => (n === target ? i : -1)).filter((i) => i >= 0);
}

const same = (vals) => vals.every((v) => JSON.stringify(v ?? null) === JSON.stringify(vals[0] ?? null));

function row(label, cells, raws, better) {
  const best = bestIdx(raws, better);
  const diff = !same(raws);
  return { diff, html: `<tr class="${diff ? 'diff' : ''}"><th scope="row">${esc(label)}</th>${cells.map((c, i) => `<td class="${best.includes(i) ? 'best' : ''}">${c}</td>`).join('')}</tr>` };
}

function render() {
  const ids = getCompare().filter((id) => byId.has(id));
  syncUrl(ids);
  const ms = ids.map((id) => byId.get(id));

  const opts = data.models.filter((m) => !ids.includes(m.id))
    .sort((a, b) => fullName(data, a).localeCompare(fullName(data, b), 'fr'))
    .map((m) => `<option value="${esc(m.id)}">${esc(fullName(data, m))} (${esc(typeLabel(m.type))})</option>`).join('');
  $('add').innerHTML = ids.length >= MAX_COMPARE ? `<option value="">Maximum atteint (${MAX_COMPARE} véhicules)</option>` : `<option value="">Choisir…</option>${opts}`;
  $('add').disabled = ids.length >= MAX_COMPARE;

  if (!ms.length) {
    $('out').innerHTML = `<div class="empty card">Aucun véhicule sélectionné. Ajoutez-en depuis le <a href="index.html">catalogue</a> ou la liste ci-dessus.</div>`;
    return;
  }

  const onlyDiff = $('only-diff').checked;
  const age = Math.max(0, Number($('c-age').value || 0));
  const km = Math.max(0, Number($('c-km').value || 0));
  const thisYear = new Date().getFullYear();

  const head = `<thead><tr><th></th>${ms.map((m) => `<th class="vhead">
      <div class="badges"><span class="badge type">${esc(typeLabel(m.type))}</span>${qualityBadge(m)}</div>
      <h3><a href="vehicule.html?id=${encodeURIComponent(m.id)}">${esc(fullName(data, m))}</a></h3>
      <button type="button" data-remove="${esc(m.id)}" aria-label="Retirer ${esc(fullName(data, m))}">✕ Retirer</button></th>`).join('')}</tr></thead>`;

  const body = [];
  const push = (r) => { if (!onlyDiff || r.diff) body.push(r.html); };

  // Prix
  body.push(`<tr class="group"><th colspan="${ms.length + 1}">Prix</th></tr>`);
  push(row('Prix neuf (catalogue)', ms.map((m) => (m.price_new_eur != null ? euro(m.price_new_eur) : '<span class="nd">N/D</span>')), ms.map((m) => m.price_new_eur), 'low'));
  const ests = ms.map((m) => usedEstimate(m, data.models, { year: Math.min(m.year, thisYear) - age, km: m.type === 'caravane' ? null : km, condition: 'bon' }, data.depreciation));
  push(row(`Occasion estimée (${age} an${age > 1 ? 's' : ''}, bon état)`,
    ests.map((e) => (e ? `${euro(e.value)}<div class="note">${euro(e.low)} à ${euro(e.high)}</div>` : '<span class="nd">N/D</span>')),
    ests.map((e) => e?.value ?? null), 'low'));

  for (const [group, fields] of groupedFields()) {
    const rows = fields.map((f) => row(f.label, ms.map((m) => fmtField(data, m, f)), ms.map((m) => rawValue(m, f)), f.better));
    const visible = rows.filter((r) => !onlyDiff || r.diff);
    if (!visible.length) continue;
    body.push(`<tr class="group"><th colspan="${ms.length + 1}">${esc(group)}</th></tr>`, ...visible.map((r) => r.html));
  }

  $('out').innerHTML = `<div class="card cmp-wrap"><table class="cmp">${head}<tbody>${body.join('')}</tbody></table></div>
    ${ms.length < 2 ? '<p class="note">Ajoutez au moins un deuxième véhicule pour comparer.</p>' : ''}`;
}

$('out').addEventListener('click', (e) => {
  const b = e.target.closest('[data-remove]');
  if (b) { setCompare(getCompare().filter((id) => id !== b.dataset.remove)); render(); }
});
$('add').addEventListener('change', (e) => {
  const id = e.target.value;
  if (!id) return;
  const ids = getCompare();
  if (ids.length >= MAX_COMPARE) { toast(`Maximum ${MAX_COMPARE} véhicules.`); return; }
  setCompare([...ids, id]);
  render();
});
for (const id of ['only-diff', 'c-age', 'c-km']) $(id).addEventListener('input', render);
$('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Lien copié.'); }
  catch { toast(`Lien : ${location.href}`); }
});

render();
