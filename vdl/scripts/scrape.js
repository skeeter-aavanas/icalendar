#!/usr/bin/env node
// Collecte des fiches techniques constructeurs → scraped/<marque>.json
// Usage : node scrape.js [--brand rapido] [--dry-run] [--force] [--limit 20]
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPolite } from './lib/http.js';
import { htmlToText, htmlLinks, pdfToText, splitByModels } from './lib/text.js';
import { extractSpecs } from './lib/extract.js';
import { makeId, titleFromUrl } from './sources/_helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const onlyBrand = opt('brand');
const dryRun = !!opt('dry-run');
const force = !!opt('force');
const limit = Number(opt('limit') || 50);

async function loadAdapters() {
  const files = (await readdir(join(HERE, 'sources'))).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  const list = [];
  for (const f of files) list.push((await import(`./sources/${f}`)).default);
  return onlyBrand ? list.filter((a) => a.brand === onlyBrand) : list;
}

function record(adapter, meta, specs, url) {
  const model = meta.model;
  const range = meta.range || model.split(' ')[0];
  return {
    id: meta.id || makeId(adapter.brand, range, model, adapter.year),
    brand: adapter.brand, range, model, year: adapter.year,
    type: meta.type, chassis: meta.chassis,
    ...specs,
    specs_source_url: url,
    data_quality: 'scraped',
    updated_at: new Date().toISOString().slice(0, 10),
  };
}

async function scrapeAdapter(a) {
  const out = [];
  const errors = [];

  for (const cat of a.catalogs || []) {
    try {
      const text = await pdfToText(await fetchPolite(cat.url, { binary: true, force }));
      for (const block of splitByModels(text, cat.models)) {
        const type = cat.typeOf ? cat.typeOf(block.model) : cat.type;
        out.push(record(a, { model: block.model, range: cat.range, type, chassis: cat.chassis }, extractSpecs(block.text), cat.url));
      }
    } catch (e) { errors.push(`${cat.url} : ${e.message}`); }
  }

  for (const d of a.discover || []) {
    let links = [];
    try {
      links = htmlLinks(await fetchPolite(d.url, { force }), d.url, d.linkSelector)
        .filter((u) => u !== d.url && new URL(u).host === new URL(d.url).host)
        .slice(0, limit);
    } catch (e) { errors.push(`${d.url} : ${e.message}`); continue; }
    if (dryRun) { console.log(`  ${d.url} → ${links.length} pages modèles`); links.forEach((l) => console.log('   ', l)); continue; }
    for (const url of links) {
      try {
        const text = htmlToText(await fetchPolite(url, { force }), a.contentSelector);
        const specs = extractSpecs(text);
        if (Object.keys(specs).length < 2) continue; // page sans fiche technique
        const title = titleFromUrl(url);
        out.push(record(a, { model: title, range: d.range, type: d.type, chassis: d.chassis }, specs, url));
      } catch (e) { errors.push(`${url} : ${e.message}`); }
    }
  }
  return { out, errors };
}

const adapters = await loadAdapters();
if (!adapters.length) { console.error(`Aucun adaptateur pour « ${onlyBrand} »`); process.exit(1); }
await mkdir(join(HERE, 'scraped'), { recursive: true });
let failed = 0;
for (const a of adapters) {
  console.log(`▶ ${a.brand}`);
  const { out, errors } = await scrapeAdapter(a);
  errors.forEach((e) => console.warn(`  ⚠ ${e}`));
  if (errors.length && !out.length) failed++;
  if (!dryRun) {
    if (out.length) await writeFile(join(HERE, 'scraped', `${a.brand}.json`), JSON.stringify(out, null, 2) + '\n');
    console.log(`  ${out.length} modèle(s) extrait(s)`);
  }
}
process.exit(failed === adapters.length ? 1 : 0);
