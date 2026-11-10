#!/usr/bin/env node
// Fusionne seed/manual.json et scraped/*.json → ../data/models.json, puis valide.
// Les valeurs collectées complètent la saisie manuelle sans écraser une valeur par « rien ».
// Usage : node build-data.js [--strict]   (--strict : code de sortie 1 si erreur de validation)
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeModel, validateModel, countMissing } from '../assets/schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'data');
const strict = process.argv.includes('--strict');

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

export function deepMerge(base, extra) {
  if (Array.isArray(extra)) return extra.length ? extra : base;
  if (extra && typeof extra === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const r = { ...base };
    for (const [k, v] of Object.entries(extra)) if (v !== null && v !== undefined) r[k] = deepMerge(base[k], v);
    return r;
  }
  return extra ?? base;
}

export async function build() {
  const seed = (await readJson(join(HERE, 'seed', 'manual.json'))).models;
  const byId = new Map(seed.map((m) => [m.id, m]));
  let scrapedCount = 0;
  try {
    for (const f of (await readdir(join(HERE, 'scraped'))).filter((f) => f.endsWith('.json'))) {
      for (const m of await readJson(join(HERE, 'scraped', f))) {
        scrapedCount++;
        byId.set(m.id, byId.has(m.id) ? deepMerge(byId.get(m.id), m) : m);
      }
    }
  } catch (e) { if (e.code !== 'ENOENT') throw e; }

  const brands = new Set((await readJson(join(DATA, 'brands.json'))).map((b) => b.id));
  const chassis = new Set((await readJson(join(DATA, 'chassis.json'))).map((c) => c.id));

  const models = [];
  const problems = [];
  const missing = {};
  for (const raw of byId.values()) {
    const m = normalizeModel(raw);
    const errs = validateModel(m);
    if (!brands.has(m.brand)) errs.push(`marque inconnue : ${m.brand}`);
    if (m.chassis && m.chassis !== 'na' && !chassis.has(m.chassis)) errs.push(`porteur inconnu : ${m.chassis}`);
    if (errs.length) { problems.push({ id: m.id, errs }); continue; }
    const miss = countMissing(m);
    (missing[m.brand] ??= { models: 0, nd: 0 }).models++;
    missing[m.brand].nd += miss.length;
    models.push(m);
  }
  models.sort((a, b) => a.brand.localeCompare(b.brand) || a.range.localeCompare(b.range) || a.model.localeCompare(b.model));
  return { models, problems, missing, scrapedCount, seedCount: seed.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { models, problems, missing, scrapedCount, seedCount } = await build();
  await writeFile(join(DATA, 'models.json'), JSON.stringify({ generated_at: new Date().toISOString(), models }, null, 1) + '\n');
  console.log(`✔ ${models.length} modèles écrits dans data/models.json (saisie : ${seedCount}, collectés : ${scrapedCount})`);
  if (problems.length) {
    console.warn(`✖ ${problems.length} modèle(s) rejeté(s) :`);
    problems.forEach((p) => console.warn(`  ${p.id} → ${p.errs.join(' ; ')}`));
  }
  console.log('\nChamps « N/D » (information non disponible) par marque :');
  for (const [b, s] of Object.entries(missing).sort((a, b) => b[1].nd / b[1].models - a[1].nd / a[1].models)) {
    console.log(`  ${b.padEnd(14)} ${String(s.models).padStart(3)} modèle(s)  ${(s.nd / s.models).toFixed(1).padStart(5)} N/D en moyenne`);
  }
  if (strict && problems.length) process.exit(1);
}
