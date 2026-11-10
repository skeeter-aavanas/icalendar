import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { usedEstimate, referenceNewPrice, retention, mileageFactor } from '../../assets/estimate.js';

const params = JSON.parse(readFileSync(new URL('../../data/depreciation.json', import.meta.url)));
const base = { id: 'a', brand: 'rapido', range: 'M', model: 'M66', year: 2025, type: 'profile', price_new_eur: 80000 };
const now = new Date('2026-07-01');

test('décote monotone et plancher', () => {
  let prev = 1;
  for (let a = 0; a <= 30; a += 0.5) { const r = retention('profile', a, params); assert.ok(r <= prev + 1e-9); prev = r; }
  assert.equal(retention('profile', 40, params), params.curves.profile.floor);
});

test('kilométrage : pénalité et bonus plafonnés', () => {
  assert.ok(mileageFactor(200000, 5, params) >= 1 - params.mileage.max_penalty);
  assert.ok(mileageFactor(0, 5, params) <= 1 + params.mileage.max_bonus);
  assert.equal(mileageFactor(50000, 5, params), 1);
});

test('estimation 5 ans / 60 000 km', () => {
  const e = usedEstimate(base, [base], { year: 2021, km: 60000, condition: 'bon' }, params, now);
  assert.ok(e.newPrice.value < 80000, 'prix neuf 2021 déflaté');
  assert.ok(e.value > 30000 && e.value < 60000, `valeur plausible : ${e.value}`);
  assert.ok(e.low < e.value && e.value < e.high);
});

test('caravane : kilométrage ignoré', () => {
  const c = { ...base, type: 'caravane', price_new_eur: 25000 };
  const a = usedEstimate(c, [c], { year: 2020, km: 0 }, params, now);
  const b = usedEstimate(c, [c], { year: 2020, km: 300000 }, params, now);
  assert.equal(a.value, b.value);
});

test('prix manquant : repli sur la gamme puis le type', () => {
  const other = { ...base, id: 'b', model: 'M70', price_new_eur: 90000 };
  const noPrice = { ...base, id: 'c', model: 'M80', price_new_eur: null };
  assert.equal(referenceNewPrice(noPrice, [other, noPrice]).basis, 'gamme');
  const lone = { ...noPrice, brand: 'x', range: 'y' };
  assert.equal(referenceNewPrice(lone, [other, lone]).basis, 'type');
  assert.equal(referenceNewPrice({ ...lone, type: 'van' }, [other]), null);
});
