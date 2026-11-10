// Hobby — pages modèles HTML (caravanes et camping-cars).
export default {
  brand: 'hobby',
  year: 2026,
  discover: [
    { url: 'https://www.hobby-caravan.de/fr/caravanes/', linkSelector: 'a[href*="/caravanes/"]', type: 'caravane', range: null, chassis: 'na' },
    { url: 'https://www.hobby-caravan.de/fr/camping-cars/', linkSelector: 'a[href*="/camping-cars/"]', type: 'profile', range: null, chassis: 'fiat-ducato' },
  ],
  contentSelector: 'main',
};
