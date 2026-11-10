// Estimation du prix neuf et d'occasion — fonctions pures (navigateur et Node).
// Les paramètres viennent de data/depreciation.json.

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const round = (n, step = 100) => Math.round(n / step) * step;

// Prix neuf de référence du modèle au millésime catalogue.
// Si le prix catalogue manque : médiane des modèles de la même gamme, sinon de la
// même marque et du même type, sinon du même type, avec une fourchette plus large.
export function referenceNewPrice(model, all) {
  if (typeof model.price_new_eur === 'number') {
    return { value: model.price_new_eur, low: model.price_new_eur, high: model.price_new_eur, basis: 'catalogue', year: model.year };
  }
  const priced = all.filter((m) => typeof m.price_new_eur === 'number' && m.id !== model.id);
  const tiers = [
    ['gamme', priced.filter((m) => m.brand === model.brand && m.range === model.range), 0.1],
    ['marque', priced.filter((m) => m.brand === model.brand && m.type === model.type), 0.15],
    ['type', priced.filter((m) => m.type === model.type), 0.3],
  ];
  for (const [basis, list, spread] of tiers) {
    if (list.length) {
      const v = median(list.map((m) => m.price_new_eur));
      return { value: round(v), low: round(v * (1 - spread)), high: round(v * (1 + spread)), basis, year: model.year };
    }
  }
  return null;
}

// Prix neuf ramené à un autre millésime (inflation annuelle des prix des VDL).
export function newPriceForYear(ref, vehicleYear, params) {
  if (!ref) return null;
  const k = Math.pow(1 + params.price_inflation, vehicleYear - ref.year);
  return { ...ref, value: round(ref.value * k), low: round(ref.low * k), high: round(ref.high * k), year: vehicleYear };
}

export function retention(type, age, params) {
  const c = params.curves[type] || params.curves.profile;
  if (age <= 0) return 1;
  const last = c.retention.length - 1;
  if (age <= last) {
    const lo = Math.floor(age);
    const hi = Math.min(lo + 1, last);
    return c.retention[lo] + (c.retention[hi] - c.retention[lo]) * (age - lo);
  }
  return Math.max(c.floor, c.retention[last] - c.annual_after * (age - last));
}

export function mileageFactor(km, age, params) {
  if (km == null || Number.isNaN(km)) return 1;
  const p = params.mileage;
  const expected = p.expected_km_per_year * Math.max(age, 0.5);
  const diff = (km - expected) / 1000;
  if (diff > 0) return 1 - Math.min(p.max_penalty, diff * p.penalty_per_1000km_over);
  return 1 + Math.min(p.max_bonus, -diff * p.bonus_per_1000km_under);
}

// Estimation d'occasion : prix neuf du millésime × décote(âge) × km × état.
// Renvoie une fourchette, ou null si aucun prix neuf n'est disponible.
export function usedEstimate(model, all, { year, km, condition = 'bon' }, params, now = new Date()) {
  const ref = referenceNewPrice(model, all);
  if (!ref) return null;
  const vehicleYear = year || model.year;
  const newP = newPriceForYear(ref, vehicleYear, params);
  const age = Math.max(0, now.getFullYear() + now.getMonth() / 12 - (vehicleYear + 0.5));
  const motorised = model.type !== 'caravane';
  const r = retention(model.type, age, params);
  const kmF = motorised ? mileageFactor(km, age, params) : 1;
  const condF = (params.condition[condition] || params.condition.bon).factor;
  const central = newP.value * r * kmF * condF;
  const u = params.uncertainty + (ref.basis === 'catalogue' ? 0 : 0.07);
  return {
    value: round(central),
    low: round(newP.low * r * kmF * condF * (1 - u)),
    high: round(newP.high * r * kmF * condF * (1 + u)),
    newPrice: newP,
    age: Math.round(age * 10) / 10,
    factors: { retention: r, mileage: kmF, condition: condF },
    basis: ref.basis,
  };
}

export const euro = (n) => (n == null ? null : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
