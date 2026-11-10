// Adria — pages modèles HTML (vans, camping-cars, caravanes).
export default {
  brand: 'adria',
  year: 2026,
  discover: [
    { url: 'https://www.adria-mobil.com/fr/vans', linkSelector: 'a[href*="/fr/vans/"]', type: 'fourgon', range: null, chassis: 'fiat-ducato' },
    { url: 'https://www.adria-mobil.com/fr/camping-cars', linkSelector: 'a[href*="/fr/camping-cars/"]', type: 'profile', range: null, chassis: 'fiat-ducato' },
    { url: 'https://www.adria-mobil.com/fr/caravanes', linkSelector: 'a[href*="/fr/caravanes/"]', type: 'caravane', range: null, chassis: 'na' },
  ],
  contentSelector: 'main',
};
