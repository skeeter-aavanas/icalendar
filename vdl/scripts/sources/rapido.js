// Rapido — pages modèles HTML du site constructeur.
// Les sélecteurs CSS sont à ajuster si le site change (vérifier avec --dry-run).
export default {
  brand: 'rapido',
  year: 2026,
  discover: [
    { url: 'https://www.rapido-camping-car.fr/profiles/', linkSelector: 'a[href*="/profiles/"]', type: 'profile', range: 'Profilés', chassis: 'fiat-ducato' },
    { url: 'https://www.rapido-camping-car.fr/integraux/', linkSelector: 'a[href*="/integraux/"]', type: 'integral', range: 'Intégraux', chassis: 'fiat-ducato' },
    { url: 'https://www.rapido-camping-car.fr/vans/', linkSelector: 'a[href*="/vans/"]', type: 'fourgon', range: 'Vans', chassis: 'fiat-ducato' },
  ],
  contentSelector: 'main',
};
