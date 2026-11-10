// Utilitaires communs aux adaptateurs constructeurs.
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const makeId = (brand, range, model, year) => slug(`${brand} ${range} ${model} ${year}`);

// Devine la gamme / le modèle à partir du titre d'une page (« Rapido M66 — Profilé »).
export function titleFromUrl(url) {
  const last = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
  return last.replace(/[-_]+/g, ' ').replace(/\.(html?|php)$/i, '').trim();
}
