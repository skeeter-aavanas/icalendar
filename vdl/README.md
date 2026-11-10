# VDL Catalogue : véhicules de loisirs en Europe

Site statique (HTML/JS, sans build) qui liste les camping-cars, fourgons aménagés, vans et caravanes vendus en Europe :

- **Catalogue** filtrable par type, marque, porteur, longueur, PTAC, places, prix, énergie du chauffage, type de réfrigérateur, type de couchage, eau chaude et toit relevable. Les filtres sont conservés dans l'URL.
- **Fiche détaillée** : porteur et moteur, dimensions et poids, habitabilité (détail des couchages), équipements (chauffage, réfrigérateur, eau chaude), toit et ouvertures, sources.
- **Comparateur** de 1 à 4 véhicules, avec lien partageable, différences surlignées et meilleure valeur mise en évidence.
- **Estimation** du prix neuf (prix catalogue) et d'occasion (décote selon l'âge, le kilométrage et l'état), avec des liens vers la cote officielle et les annonces pour vérifier.

## Convention des valeurs

| Donnée JSON | Affichage | Signification |
|---|---|---|
| valeur | valeur | information connue |
| `null` (ou champ absent dans la saisie) | `N/D` | information non disponible dans la source |
| `"na"` | `—` | non applicable : l'élément n'existe pas sur ce véhicule (porteur d'une caravane, eau chaude absente…) |

Les règles « non applicable » automatiques (porteur et moteur d'une caravane, toit relevable d'un profilé, production d'eau chaude quand il n'y a pas d'eau chaude, etc.) sont dans `assets/schema.js`.

## Lancer le site en local

Les pages chargent les JSON avec `fetch`, il faut donc un serveur web (l'ouverture directe du fichier ne marche pas) :

```bash
cd vdl && python3 -m http.server 8000   # puis http://localhost:8000
```

En production, il suffit de déposer le dossier `vdl/` sur n'importe quel hébergement statique (GitHub Pages, OVH, Netlify…).

## Données

```
data/brands.json        marques (pays, groupe, site, identifiant cote)
data/chassis.json       porteurs
data/depreciation.json  paramètres de l'estimation d'occasion (courbes de décote, km, état)
data/models.json        GÉNÉRÉ par scripts/build-data.js, ne pas éditer à la main
scripts/seed/manual.json  saisie manuelle
scripts/scraped/*.json    données collectées par les scripts
```

**Important :** les 36 modèles de `seed/manual.json` sont une saisie de départ **approximative** (badge « À vérifier » sur le site). Corrigez-les à partir des fiches constructeurs, puis passez `data_quality` à `"verified"`.

### Ajouter ou corriger un modèle

1. Éditer `scripts/seed/manual.json`. Omettre un champ inconnu (il deviendra N/D) ; mettre `"na"` pour un élément absent du véhicule.
2. `cd scripts && node build-data.js` : le script valide le schéma, rejette les erreurs et affiche le nombre de N/D par marque.

### Collecte automatique (scraping)

```bash
cd vdl/scripts
npm install
node scrape.js --brand rapido --dry-run   # liste les pages trouvées sans les analyser
node scrape.js                            # toutes les marques → scraped/<marque>.json
node build-data.js                        # fusion seed + collecte → data/models.json
npm test                                  # tests de l'extracteur, de robots.txt et de l'estimation
```

- `lib/http.js` respecte robots.txt, attend 2,5 s entre deux requêtes sur un même site, s'identifie par son User-Agent et garde un cache de 7 jours (`cache/`).
- `lib/extract.js` repère les caractéristiques dans le texte d'une page ou d'un PDF, en français, allemand ou anglais.
- Un adaptateur par constructeur dans `sources/` (Rapido, LMC, Eura Mobil, Hobby, Adria). Il décrit soit des catalogues PDF à découper par modèle (`catalogs`), soit des pages de liste à parcourir (`discover`, avec un sélecteur CSS). Les URL et les sélecteurs doivent être vérifiés avec `--dry-run` : les sites changent régulièrement.
- Une valeur collectée complète la saisie manuelle mais ne l'efface jamais avec une valeur vide.
- Le workflow `.github/workflows/vdl-data.yml` lance la collecte chaque mois (ou à la demande) et ouvre une PR avec les données mises à jour.

## Cadre légal (site public)

- Seules des **données factuelles** issues des documentations publiques des constructeurs sont collectées, et la source est citée sur chaque fiche.
- Les cotes (Cote officielle de l'occasion, DICA…) et les annonces ne sont **ni aspirées ni republiées** : le site propose des liens vers ces sources. L'estimation d'occasion est calculée par le site à partir de `depreciation.json`. Pour afficher une cote officielle, il faut un accès sous licence auprès de son éditeur.
- Aucune base ouverte ni API publique des VDL n'existe à ce jour (recherche de novembre 2026).
