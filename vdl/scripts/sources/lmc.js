// LMC — catalogue PDF « Données techniques » (un PDF pour toute la gamme).
// `models` liste les intitulés à repérer dans le PDF pour découper un bloc par modèle.
export default {
  brand: 'lmc',
  year: 2026,
  catalogs: [
    {
      url: 'https://www.lmc-caravan.com/lmc/kataloge/mj26/mj-26-fr/wohnmobile-f.pdf',
      type: 'profile', range: 'Tourer', chassis: 'fiat-ducato',
      models: ['Tourer H 630', 'Tourer H 660', 'Tourer H 730 G', 'Tourer Lift H 730 G', 'Cruiser T 662 G', 'Cruiser T 732 G'],
    },
  ],
};
