# CVDL — règles de travail (humains et IA)

Plateforme Emmaüs Connect de gestion des dons de matériel informatique reconditionné aux
structures partenaires. Ce fichier est identique dans les dépôts back et front.

## Architecture

**Backend** (Node 20, Cloud Functions, Express) :
- `src/index.js` point d'entrée ; `src/routes/*.js` routes HTTP ; `src/regles/*.js` règles
  métier pures (testées dans `test/`) ; `src/securite.js` contrôle d'accès de toutes les routes.
- Données : **PostgreSQL uniquement**, via `src/stockage.js` → `src/stockagePg.js`. Schéma :
  `db/migrations/` (une migration par changement, jamais modifier une migration livrée) et
  `src/stockageSchema.js`. Carte « où est la donnée » : `DONNEES.md`.
- Google (Drive, Sheets externes) : uniquement via `src/google.js`. tec.tech : `src/tectech.js`
  (lecture seule).
- Mode démo : `STOCKAGE=demo` (`npm run start:demo`), données fictives en mémoire.

**Front** (site statique, scripts classiques sans build) :
- Une page = un `.html` + son script `pages/<page>.js`. Aucun JavaScript dans les `.html`.
- Admin : `admin.html` charge `admin/NN-*.js` dans l'ordre (fonctions globales partagées) ;
  `admin/99-demarrage.js` est chargé en dernier. Nouvel écran admin = nouveau fichier `admin/NN-nom.js`.
- Communs : `api.js` (adresse de l'API), `anti-cadre.js`, `portail-ui.js`, `cvdl-ui.js`.
- Chaque `<script>`/`<link>` porte `?v=N` : l'incrémenter quand le fichier change.

## Règles

1. **Simple d'abord.** Corriger la cause, pas empiler un contournement. Si une correction propre
   demande de toucher plusieurs fichiers, le faire (et le dire) plutôt que d'ajouter une rustine.
2. **Pas de duplication.** Réutiliser l'existant (`src/google.js`, `src/auth.js`,
   `src/regles/`…) ; une logique utilisée deux fois va dans une fonction partagée.
3. **Commentaires courts** : ce que fait le code et pourquoi s'il n'est pas évident. Pas
   d'historique (« avant… », « porté depuis… », « demande du … ») : l'historique est dans git
   et `CHANGELOG-CVDL.md`.
4. **Pas de code mort ni « temporaire ».** Supprimer ce qui ne sert plus ; ne pas laisser de
   route de diagnostic.
5. **Sécurité** : toute route passe par `src/securite.js` ; mot de passe admin vérifié
   uniquement par `verifierMotDePasse()` ; jamais de secret dans le code ni dans `config` lisible
   par l'admin ; échapper toute donnée injectée dans du HTML (`echapper()`).
6. **Données personnelles** : en ajouter une = mettre à jour `DONNEES.md`.
7. **Avant de livrer** : `npm run verifier` (format Prettier, ESLint, tests) dans chaque dépôt ;
   ajouter un test dans `test/` pour toute règle métier modifiée ; tester en mode démo.
8. **Traçabilité** : une entrée en tête de `CHANGELOG-CVDL.md` au format
   `## Titre (JJ/MM/AAAA)`, suivie d'une ligne `Catégories : …` (parmi Sécurité, Données, Back,
   Front, Démo), puis quoi, pourquoi, fichiers et versions `?v=` changés. Ce fichier alimente
   automatiquement le journal public de `projet.html`. Mettre à jour `AUDIT-SECURITE-CVDL.md`
   si la sécurité change.
9. **Langue** : code, commentaires et messages en français, comme l'existant.

## Dette connue (à traiter, ne pas aggraver)

- Les routes manipulent des lignes positionnelles (`l[11]`, colonne 38…) héritées de Google
  Sheets → passage prévu à un ORM (Prisma) avec des champs nommés.
- Authentification maison (`src/auth.js`, `src/securite.js` qui réinjecte le mot de passe dans
  `req.body`) et mot de passe admin en clair dans `config` → remplacement prévu par une
  librairie éprouvée.
- Front : fonctions dupliquées entre pages (`$`, `echapper`, garantie SAV…) → à regrouper dans
  un fichier commun.
