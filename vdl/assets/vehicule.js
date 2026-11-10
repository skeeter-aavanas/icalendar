// Fiche détaillée d'un VDL + estimation neuf / occasion.
import {
  loadData, esc, fullName, brandName, typeLabel, fmtField, groupedFields, toggleCompare, getCompare,
  toast, renderHeader, renderFooter, qualityBadge, MAX_COMPARE,
} from './common.js';
import { usedEstimate, referenceNewPrice, euro } from './estimate.js';

renderHeader();
const main = document.getElementById('main');
const data = await loadData();
renderFooter(data);

const id = new URLSearchParams(location.search).get('id');
const m = data.models.find((x) => x.id === id);
if (!m) {
  main.innerHTML = `<div class="empty card"><p>Véhicule introuvable.</p><a class="btn" href="index.html">Retour au catalogue</a></div>`;
  throw new Error('modèle introuvable');
}

const name = fullName(data, m);
document.title = `${name} | VDL Catalogue`;
const brand = data.brands.get(m.brand);
const motorised = m.type !== 'caravane';
const thisYear = new Date().getFullYear();
const ref = referenceNewPrice(m, data.models);
const basisLabel = { catalogue: 'prix catalogue constructeur', gamme: 'estimé d\'après la gamme', marque: 'estimé d\'après la marque', type: 'estimé d\'après le type de véhicule' };

const q = encodeURIComponent(`${brandName(data, m.brand)} ${m.range} ${m.model}`);
const links = [
  motorised && brand?.cote_slug ? [`https://www.camping-car.com/occasion/cote/marque/${brand.cote_slug}/`, `Cote officielle de l'occasion : ${brand.name}`] : null,
  [`https://www.leboncoin.fr/recherche?text=${q}`, 'Annonces sur Leboncoin'],
  [`https://www.google.com/search?q=${q}+occasion+annonce`, 'Autres annonces (recherche web)'],
].filter(Boolean);

const yearOptions = Array.from({ length: 26 }, (_, i) => thisYear - i)
  .map((y) => `<option value="${y}" ${y === Math.min(m.year, thisYear) - 3 ? 'selected' : ''}>${y}</option>`).join('');
const condOptions = Object.entries(data.depreciation.condition)
  .map(([k, c]) => `<option value="${k}" ${k === 'bon' ? 'selected' : ''}>${esc(c.label)}</option>`).join('');

const groups = [...groupedFields()].map(([g, fields]) => `
  <section class="card"><h2>${esc(g)}</h2>
    <table class="kv"><tbody>${fields.map((f) => `<tr><th scope="row">${esc(f.label)}</th><td>${fmtField(data, m, f)}</td></tr>`).join('')}</tbody></table>
  </section>`).join('');

main.innerHTML = `
  <p><a href="index.html">← Catalogue</a></p>
  <div class="card hero">
    <div>
      <div class="badges"><span class="badge type">${esc(typeLabel(m.type))}</span><span class="badge">Millésime ${m.year}</span>${qualityBadge(m)}</div>
      <h1 style="margin-top:8px">${esc(name)}</h1>
      <p class="meta">${esc(brand?.name || m.brand)}${brand?.group ? ` (${esc(brand.group)})` : ''}${brand?.country ? ` · ${esc(brand.country)}` : ''}
        ${motorised ? ` · Porteur : ${fmtField(data, m, { path: 'chassis', fmt: 'chassis' })}` : ''}</p>
      ${m.layout ? `<p>${esc(m.layout)}</p>` : ''}
      <p><button type="button" id="cmp" aria-pressed="false"></button>
         <a class="btn" href="comparer.html">Voir le comparateur</a></p>
      ${m.data_quality === 'seed' ? `<div class="warnbox">Fiche issue de la saisie de départ : valeurs approximatives à vérifier auprès du constructeur.</div>` : ''}
      <p class="note">Sources : ${m.specs_source_url ? `<a href="${esc(m.specs_source_url)}" rel="noopener" target="_blank">caractéristiques</a>` : 'N/D'}
        · ${m.price_source_url ? `<a href="${esc(m.price_source_url)}" rel="noopener" target="_blank">prix</a>` : 'prix N/D'}
        ${m.updated_at ? ` · mis à jour le ${new Date(m.updated_at).toLocaleDateString('fr-FR')}` : ''}</p>
    </div>
    <aside class="estimate" aria-labelledby="est-title">
      <h2 id="est-title">Prix et estimation</h2>
      <div class="note">Neuf (${m.year})</div>
      <div class="big">${ref ? euro(ref.value) : 'N/D'}</div>
      <div class="range">${ref ? (ref.basis === 'catalogue' ? basisLabel.catalogue : `${basisLabel[ref.basis]} : ${euro(ref.low)} à ${euro(ref.high)}`) : 'Aucun prix de référence disponible'}</div>
      <form id="est-form">
        <div><label for="e-year">Année du véhicule</label><select id="e-year">${yearOptions}</select></div>
        <div><label for="e-km">Kilométrage</label>${motorised ? '<input id="e-km" type="number" min="0" step="1000" value="30000">' : '<input id="e-km" type="text" value="Non applicable (caravane)" disabled>'}</div>
        <div class="full"><label for="e-cond">État</label><select id="e-cond">${condOptions}</select></div>
      </form>
      <div class="note">Occasion estimée</div>
      <div class="big" id="e-val">…</div>
      <div class="range" id="e-range"></div>
      <p class="note" id="e-detail"></p>
      <div class="links"><strong style="font-size:.85rem">Vérifier sur le marché :</strong>
        ${links.map(([u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div>
      <p class="note">Estimation indicative calculée par ce site (décote selon l'âge, le kilométrage et l'état). Ce n'est pas une cote officielle.</p>
    </aside>
  </div>
  <div class="specs">${groups}</div>`;

function updateEstimate() {
  const year = Number(document.getElementById('e-year').value);
  const kmEl = document.getElementById('e-km');
  const km = motorised ? Number(kmEl.value || 0) : null;
  const cond = document.getElementById('e-cond').value;
  const e = usedEstimate(m, data.models, { year, km, condition: cond }, data.depreciation);
  const val = document.getElementById('e-val');
  if (!e) { val.textContent = 'N/D'; document.getElementById('e-range').textContent = 'Prix neuf inconnu : estimation impossible.'; return; }
  val.textContent = euro(e.value);
  document.getElementById('e-range').textContent = `Fourchette : ${euro(e.low)} à ${euro(e.high)}`;
  document.getElementById('e-detail').textContent =
    `Prix neuf ${year} estimé ${euro(e.newPrice.value)} · âge ${e.age.toLocaleString('fr-FR')} an(s) · valeur conservée ${Math.round(e.factors.retention * 100)} %` +
    (motorised ? ` · kilométrage ×${e.factors.mileage.toFixed(2)}` : '') + ` · état ×${e.factors.condition.toFixed(2)}`;
}
document.getElementById('est-form').addEventListener('input', updateEstimate);
updateEstimate();

const btn = document.getElementById('cmp');
const syncBtn = () => {
  const on = getCompare().includes(m.id);
  btn.setAttribute('aria-pressed', on);
  btn.textContent = on ? '✓ Dans le comparateur' : '+ Ajouter au comparateur';
  btn.classList.toggle('primary', !on);
};
btn.addEventListener('click', () => {
  if (toggleCompare(m.id) === 'full') toast(`Le comparateur est limité à ${MAX_COMPARE} véhicules.`);
  syncBtn();
});
syncBtn();
