// Eura Mobil — PDF « Équipement et caractéristiques techniques » (édition FR).
export default {
  brand: 'eura-mobil',
  year: 2026,
  catalogs: [
    {
      url: 'https://www.euramobil.de/it/storage/2025/09/EURA_Ausstattung_2026_FR_EXP_Screen.pdf',
      type: 'profile', range: 'Profila', chassis: 'fiat-ducato',
      models: ['Profila T 676 EB', 'Profila T 695 EB', 'Profila T 720 EF', 'Profila RS 720 EF', 'Integra Line 720 EF', 'Integra Line 730 EB'],
      typeOf: (name) => (/integra/i.test(name) ? 'integral' : 'profile'),
    },
  ],
};
