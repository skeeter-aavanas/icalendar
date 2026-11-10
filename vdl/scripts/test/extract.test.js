import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractSpecs, toCm, toNumber } from '../lib/extract.js';
import { parseRobots, isAllowed } from '../lib/http.js';
import { splitByModels } from '../lib/text.js';
import { normalizeModel, validateModel, NA } from '../../assets/schema.js';
import { deepMerge } from '../build-data.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('nombres et longueurs', () => {
  assert.equal(toNumber('3 500'), 3500);
  assert.equal(toNumber('3.500'), 3500);
  assert.equal(toNumber('6,99'), 6.99);
  assert.equal(toCm('6,99', 'm'), 699);
  assert.equal(toCm('5.931', 'mm'), 593);
  assert.equal(toCm('2 850', 'mm'), 285);
});

test('fiche française', () => {
  const s = extractSpecs(fx('fiche-fr.txt'));
  assert.deepEqual(s.dimensions, { length_cm: 699, width_cm: 230, height_cm: 285, wheelbase_cm: 404 });
  assert.equal(s.weights.ptac_kg, 3500);
  assert.equal(s.weights.empty_kg, 2980);
  assert.deepEqual(s.seats, { travel: 4, sleep: 4 });
  assert.deepEqual(s.tanks, { fresh_l: 125, grey_l: 110 });
  assert.equal(s.engine.power_ch, 140);
  assert.equal(s.engine.gearbox, 'manuelle');
  assert.equal(s.engine.fuel, 'diesel');
  assert.equal(s.equipment.heating.energy, 'gaz_electrique');
  assert.equal(s.equipment.heating.system, 'combi');
  assert.equal(s.equipment.fridge.type, 'absorption');
  assert.equal(s.equipment.fridge.volume_l, 142);
  assert.equal(s.equipment.fridge.freezer, true);
  assert.equal(s.equipment.hot_water.source, 'combi');
  assert.equal(s.equipment.roof.panoramic, true);
  assert.match(s.equipment.roof.skylight_types, /Midi-Heki/);
  assert.deepEqual(s.beds.map((b) => b.type).sort(), ['jumeaux', 'pavillon']);
});

test('fiche allemande', () => {
  const s = extractSpecs(fx('fiche-de.txt'));
  assert.equal(s.dimensions.length_cm, 593);
  assert.equal(s.weights.ptac_kg, 3880);
  assert.equal(s.engine.power_ch, 170);
  assert.equal(s.engine.gearbox, 'auto');
  assert.equal(s.equipment.heating.energy, 'gazole');
  assert.equal(s.equipment.fridge.type, 'compresseur');
  assert.equal(s.equipment.fridge.volume_l, 70);
  assert.equal(s.equipment.roof.pop_top, true);
  assert.deepEqual(s.beds.map((b) => b.type).sort(), ['toit', 'transversal']);
});

test('robots.txt', () => {
  const rules = parseRobots('User-agent: *\nDisallow: /admin\nDisallow: /*.pdf$\nAllow: /admin/public\n');
  assert.equal(isAllowed(rules, '/profiles/m66'), true);
  assert.equal(isAllowed(rules, '/admin/x'), false);
  assert.equal(isAllowed(rules, '/admin/public/a'), true);
  assert.equal(isAllowed(rules, '/doc/fiche.pdf'), false);
});

test('découpage PDF multi-modèles', () => {
  const blocks = splitByModels('intro Tourer H 630 long 6,99 m Tourer H 730 G long 7,41 m', ['Tourer H 730 G', 'Tourer H 630']);
  assert.deepEqual(blocks.map((b) => b.model), ['Tourer H 630', 'Tourer H 730 G']);
  assert.match(blocks[1].text, /7,41/);
});

test('normalisation : N/D et non applicable', () => {
  const caravane = normalizeModel({ id: 'x', brand: 'hobby', range: 'r', model: 'm', year: 2025, type: 'caravane', equipment: { hot_water: { present: false } } });
  assert.equal(caravane.chassis, NA);
  assert.equal(caravane.engine.power_ch, NA);
  assert.equal(caravane.seats.travel, NA);
  assert.equal(caravane.equipment.hot_water.source, NA);
  assert.equal(caravane.equipment.fridge.type, null);
  assert.equal(caravane.dimensions.length_cm, null);
  assert.deepEqual(validateModel(caravane), []);
  const bad = normalizeModel({ id: 'y', brand: 'b', range: 'r', model: 'm', year: 2025, type: 'van', equipment: { fridge: { type: 'glacon' } } });
  assert.ok(validateModel(bad).some((e) => e.includes('hors liste')));
});

test('fusion : une valeur collectée ne remplace pas une valeur par null', () => {
  const r = deepMerge({ a: 1, b: { c: 2, d: 3 } }, { a: null, b: { c: 5 } });
  assert.deepEqual(r, { a: 1, b: { c: 5, d: 3 } });
});
