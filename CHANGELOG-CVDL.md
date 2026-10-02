# CHANGELOG CVDL

> ⚠️ L'historique antérieur de ce fichier a été tronqué lors d'un export précédent.
> Recoller ici les anciennes sections depuis votre copie d'origine.

## Pilotage du projet : une seule source, la production (02/10/2026)

Catégories : Front, Démo

- `projet.html` lit toujours le back de **production**, y compris depuis le site démo : le
  rétroplanning et les corrections du journal sont ceux du projet réel, conservés en base (la
  démo, en mémoire, perdait tout à chaque redéploiement ou mise en veille).
- Sur le site démo, la page est en lecture seule (le jeton de l'admin démo n'est jamais envoyé
  à la production) ; la modification se fait depuis l'admin de production.
- Prérequis : back de production déployé avec la migration 011 (`npm run db:migrer`).
- `pages/projet.js?v=4`.

## Pilotage du projet : journal sur GitHub Pages (02/10/2026)

Catégories : Front, Démo

- Fichier `.nojekyll` ajouté à la racine du front : sans lui, GitHub Pages (Jekyll) ne publie
  pas `CHANGELOG-CVDL.md` tel quel et le journal de `projet.html` restait vide.
- Si le changelog est introuvable, le journal l'indique au lieu de rester vide.
  `pages/projet.js?v=3`.

## Pilotage du projet : bouton « Pleine largeur » (02/10/2026)

Catégories : Front

- Bouton « Pleine largeur » / « Largeur limitée » dans la barre du rétroplanning et du journal :
  la page occupe tout l'écran (utile pour voir plus de mois). Choix mémorisé dans le navigateur.
- `projet.css?v=2`, `pages/projet.js?v=2`.

## Pilotage du projet : page publique rétroplanning + journal (02/10/2026)

Catégories : Front, Back, Données

- **Nouvelle page `projet.html`**, publique en lecture, dans le style du site. Lien
  « Pilotage du projet » dans le menu de l'admin.
- **Rétroplanning** : couloirs, tâches et jalons sur une ligne de temps (échelle mois ou
  semaines), repère « Aujourd'hui », jalon principal avec compte à rebours, liens « doit être
  fini avant » (en rouge si l'ordre n'est pas respecté), tâches en retard signalées.
- **Mode édition** (admin connecté, même onglet ; sinon « Connexion équipe » renvoie à l'admin
  puis revient) : glisser une tâche la déplace, son bord l'allonge, les tâches liées suivent
  (bouton « Annuler » après chaque glissement) ; ajout / modification / suppression des
  tâches, jalons et **couloirs** (nom, couleur, ordre par glisser-déposer).
- **Journal des mises à jour alimenté automatiquement** par ce fichier `CHANGELOG-CVDL.md`
  (une section `## Titre (JJ/MM/AAAA)` = une entrée). Étiquettes : ligne `Catégories : …`
  dans la section, sinon déduites du texte. En mode édition : corriger une entrée (titre,
  date, texte, étiquettes), la masquer, la mettre « À la une », ou ajouter une entrée à la main.
- Back : `src/routes/projet.js`, règles `src/regles/projet.js` (+ tests), migration
  `011_pilotage_projet.sql` (tables `projet_couloirs`, `projet_taches`, `projet_journal`),
  contenu de départ du rétroplanning `src/projetInitial.js` (dates proposées, à ajuster).
- Front : `projet.html`, `projet.css?v=1`, `pages/projet.js?v=1` ; `admin.html`
  (lien), `admin/04-etat-navigation.js?v=2` (retour après connexion), `cvdl-ui.js?v=12`
  (logo de l'en-tête → projet.html sur cette page ; version incrémentée sur toutes les pages).
- Déploiement : `npm run db:migrer` avant de déployer le back.

## Nettoyage « vibe-coding » : outillage, front réorganisé, admin de secours retiré (01/10/2026)

Suite à la revue de code humaine. Aucun changement fonctionnel voulu (vérifié en mode démo :
mêmes écrans, aucune erreur), sauf le retrait de l'admin de secours.

**Règles et outillage**
- `CLAUDE.md` (identique back / front) : architecture, règles de travail, dette connue.
- ESLint + Prettier dans les deux dépôts : `npm run verifier` (format, lint, tests). Tout le
  code JS / CSS a été reformaté (Prettier, largeur 120).

**Backend**
- `src/google.js` : seul endroit où sont créés les clients Google (Drive, Sheets), au lieu de
  8 copies. Remplace `src/googleSheets.js`.
- Supprimés : `src/mail_gmail.js` (inutilisé), route `tectech-diagnostiquer-filtre`
  (diagnostic temporaire), imports et variables inutilisés.
- **Corrections trouvées par le lint** : `mail.js` (envoi via Brevo) plantait sur
  `sansPaiement` non défini ; 18 routes comparaient encore le mot de passe admin « en ligne »
  avec l'ancienne valeur par défaut `change-moi-tout-de-suite` → toutes passent par
  `verifierMotDePasse()` (comparaison en temps constant, mot de passe faible refusé) ; mot de
  passe compta comparé en temps constant.
- Commentaires historiques (« Port de …() », « côté Apps Script ») réécrits ou supprimés.

**Front**
- **Admin de secours supprimé** (`admin-secours.html`, `app-secours.js`, `reparc-secours.css`)
  et son bloc dans Réglages → Plan de secours. Retour arrière : version précédente du site.
- **Plus de JavaScript dans les pages HTML** : chaque page charge `pages/<page>.js`.
  Communs extraits : `api.js` (adresse de l'API, auparavant copiée dans 19 pages),
  `anti-cadre.js`, `deja-identifie.js`.
- **`app.js` (8 000 lignes) découpé par écran** dans `admin/01-socle.js` … `admin/30-…js`,
  chargés dans l'ordre par `admin.html`. Les modules `*-admin.js` rejoignent `admin/`
  (`31-depannage.js` … `37-liens.js`). Le démarrage est dans `admin/99-demarrage.js`, chargé en
  dernier.
- Code mort retiré (variables calculées jamais affichées, signalées par ESLint).
- `package.json`, `eslint.config.js`, `.prettierrc.json` : outils de développement seulement
  (rien à installer pour servir le site).

## Stockage : PostgreSQL uniquement, carte « où est la donnée » (01/10/2026)

Suite à la revue de code humaine (« ne pas faire coexister plusieurs lieux de stockage »).
- **Le mode Google Sheets est retiré** : toutes les données de l'application sont dans
  PostgreSQL. La variable `STOCKAGE` ne sert plus qu'au mode démo (`STOCKAGE=demo`) ;
  `STOCKAGE=postgres`, `CLASSEUR_PRINCIPAL_ID` et `CLASSEUR_ACTIF_ID` peuvent être retirés du
  déploiement. Plus de repli vers Sheets : le retour arrière se fait par révision de la fonction.
- `src/sheets.js` → remplacé par **`src/stockage.js`** (accès aux données, 30 lignes, base ou
  mémoire démo) et **`src/googleSheets.js`** (client Google pour les seuls fichiers externes :
  flottes des structures, numérotation, modèles).
- Supprimés : `src/colonnesParNom.js` (correspondance des colonnes Sheets par en-tête) et son
  test, la bascule annuelle de classeur (`basculer-classeur`, `reparer-onglets-classeur-actif`,
  création d'onglets), les réglages `BASCULE_*` / `ARCHIVES_CLASSEURS`. La tâche
  `taches/rappel-bascule` répond « sans objet » (gardée pour ne pas casser une tâche planifiée).
- `CLASSEUR_ACTIF()` / `CLASSEUR_PRINCIPAL_ID` restent (noms hérités, appelés par ~200 routes)
  mais désignent toujours la base.
- **Nouveau `DONNEES.md`** (backend) : où est chaque donnée, lesquelles sont personnelles, qui y
  accède. `db/README.md` mis à jour.
- Front : bloc « Plan de secours » des Réglages sans la variante Google Sheets (`app.js?v=104`).

## tec.tech : client simplifié, token en mémoire (01/10/2026)

Suite à la revue de code humaine.
- **Token en mémoire du process** (plus dans Config / la base) : c'est une valeur volatile.
  Une seule instance (`--max-instances=1`) : un démarrage à froid redemande un token, une seule
  demande à la fois. Les clés `TECTECH_TOKEN_CACHE` / `TECTECH_TOKEN_EXPIRE` ne servent plus
  (peuvent être supprimées de Config).
- **URL de l'API en variable d'environnement `TECTECH_URL`** (défaut
  `https://tec-tech.osc-fr1.scalingo.io`), plus modifiable depuis Réglages (champ en lecture
  seule). Comme l'adresse n'est plus saisissable, les garde-fous anti-SSRF / liste d'hôtes /
  `.scalingo.io` / contrôle des noms de fonctions sont retirés : `TECTECH_HOTES` et la clé
  Config `TECTECH_URL_BASE` ne servent plus.
- `src/tectech.js` : 420 → 150 lignes. Un seul GET (`getTecTech`), redirections refusées,
  délai de 10 s, nouvel essai unique si le token est refusé (401). Fonctions exportées
  inchangées.
- Front : `app.js?v=104`, `app-secours.js?v=5`.

## Démo : barre d'outils fixe en bas, place réservée, repliable (01/10/2026)

- La barre démo devient une **barre pleine largeur en bas de l'écran, toujours visible**, qui
  fait partie de la page : la place est réservée (marge en bas) et toute fenêtre fixe (modales,
  fiches commande / SAV, assistants, voiles, menu latéral, boutons flottants) est remontée
  d'autant. Rien ne passe dessous et la barre n'apparaît jamais dans une modale (remplace le
  masquage de la version précédente).
- Bouton **« Replier »** : barre fine (« Démo » + « Afficher la barre ») ; l'état est mémorisé.
- Mobile : une seule ligne (« Démo », outils défilants, ▾).
- La carte « Sur cette page » et le panneau Tutoriels se placent au-dessus de la barre, et la
  carte reste masquée tant qu'une fenêtre est ouverte.
- `portail-ui.js?v=24` (toutes les pages), `explications.js?v=4`, `explications.css?v=2`.

## Démo : le bandeau s'efface quand une fenêtre est ouverte (01/10/2026)

- Le bandeau « Démo · Explications · Tutoriels » (en bas à gauche) se posait sur les modales,
  fiches commande / SAV et assistants. Il s'efface désormais pendant qu'une fenêtre est ouverte
  (admin : zone `#rp-modal-zone` ; portail : voiles de modale, visite guidée) et revient à la
  fermeture. Idem pour la carte « Sur cette page ».
- `portail-ui.js?v=23` (toutes les pages), `explications.js?v=3`.

## Démo : pastilles « ? » masquées sous les fenêtres (01/10/2026)

- Une pastille d'aide ne s'affiche plus quand son bouton est recouvert (modale, fiche commande /
  SAV, assistant de création, voile) : on vérifie ce qui est réellement au premier plan, et on
  revérifie après l'ouverture ou la fermeture d'une fenêtre. Les pastilles reviennent dès que la
  fenêtre est fermée. `explications.js?v=2`.

## Démo : mode « Explications » et tutoriels (01/10/2026)

- **Interrupteur « Explications »** dans le bandeau démo (en bas à gauche, sur toutes les pages),
  activé par défaut, mémorisé dans le navigateur. Bouton **« Tutoriels »** à côté quand c'est
  activé.
- **Carte « Sur cette page »** à l'arrivée sur chaque écran (une fois par écran et par session) :
  à quoi sert l'écran, en mots simples, avec les tutoriels qui s'y rapportent. « Revoir
  l'explication de cette page » depuis le panneau Tutoriels.
- **Pastilles « ? »** sur les boutons importants de chaque écran (admin : chaque onglet ;
  portail structure, commande, flotte, partenaires ; support SAV) : un clic = une explication.
- **12 tutoriels pas à pas** (la zone est mise en lumière, une bulle explique, Suivant /
  Précédent / Échap ; ils passent d'un onglet ou d'une page à l'autre et ouvrent les fenêtres
  nécessaires) :
  · admin : découvrir le menu (chaque onglet expliqué), traiter une commande, créer une
    structure, ajouter un produit au stock, suivre un SAV, devis / factures / paiements, lire
    les finances (seuls ces deux derniers pour le rôle Comptabilité) ;
  · structure : découvrir mon espace, passer une commande, gérer ma flotte, travailler avec
    ses partenaires (Interne) ;
  · support SAV : traiter un ticket.
- Fichiers : `explications.js` et `explications.css` (nouveaux, chargés UNIQUEMENT en mode démo
  par `portail-ui.js` : rien ne change sur la vraie plateforme), `portail-ui.js` (bandeau).

## Page d'accueil de la démo refaite (01/10/2026)

- `demo.html` : un seul menu déroulant (style de la charte, clavier compris : flèches, Entrée,
  Échap) au lieu de toutes les cartes. Vues, par groupe :
  · Équipe CVDL — Administration (chargé·e de distribution), Finances (comptabilité), Gestion SAV
    (chargé·e de logistique) ;
  · Structures — Interne (responsable de territoire), Interne (conseiller·ère numérique), ESN
    (responsable ESN), Projets (grande distribution), partenaire (bon d'orientation), vente
    solidaire (RNum), dépôt-vente ;
  · Public — personne accompagnée (n° de série et référence de suivi affichés).
- La vue choisie s'affiche en une courte fiche (à quoi elle sert, qui on est, 2-3 choses à
  essayer) avec un bouton « Entrer dans la démo ». Chiffres, réinitialisation et sortie en pied
  de page, discrets.
- Message clair si le serveur de démo n'est pas à jour (au lieu de « Profil inconnu »).
- Aucun changement côté back.

## Site de démo sur GitHub Pages (30/09/2026)

- **Site de démo dédié** : publié dans un dépôt GitHub dont le nom contient « demo » (ex.
  `cvdl-demo` → `https://<compte>.github.io/cvdl-demo/`), le front est TOUJOURS en mode démo :
  toutes les pages parlent à `cvdl-api-demo`, même ouvertes directement (lien partagé, favori),
  sans passer par demo.html ; bandeau affiché partout, sans bouton « Quitter ».
  ⚠️ Le dépôt de PRODUCTION ne doit donc pas avoir « demo » dans son nom.
- **`index.html`** (nouveau) : page d'arrivée du site — sur le site de démo, ouvre `demo.html` ;
  ailleurs, l'accueil public `portail.html`.
- Constante `API` des 19 pages et `portail-ui.js` / `demo.html` adaptés.

## Correctif : coche des produits invisible dans le formulaire de commande (30/09/2026)

- Un produit dont le nom contient un guillemet (ex. `PC portable 14"`) ne se cochait pas : la
  fonction `echapper()` de 10 pages publiques n'échappait pas les guillemets, le nom était donc
  coupé dans l'attribut `data-produit` (sélection enregistrée sous « PC portable 14 »).
  `echapper()` échappe désormais `"` et `'` partout (commande, suivi des partenaires, portail,
  attestations, passeport, projets, structures et tarifs partenaires, enquête, demo.html).
- Vu grâce aux produits de la démo, mais le problème concernait aussi la vraie plateforme.

## Finances : rôle Comptabilité, tableau de bord, territoires, impayés et relances (30/09/2026)

- **Rôle « Comptabilité »** (onglet Équipe, compte Google) : ouvre l'admin sur les seuls onglets
  **Finances** et **Devis / Factures**. Côté serveur (`securite.js`, `ACTIONS_COMPTA`) : lecture
  des commandes, structures, devis, factures ; écritures limitées aux factures (statut, envoi,
  annulation, PDF, factures mensuelles), au rapprochement (champs `statutComptable`,
  `numeroDepot`, `statutPaiement` de `update`, rien d'autre) et aux relances. Pas de SAV, pas de
  réglages, pas de flotte. Les comptes Comptabilité n'apparaissent pas dans la liste
  d'assignation des SAV.
- **Onglet Finances** (admin et Comptabilité), filtres année / territoire / département / type :
  · indicateurs : facturé (+ évolution vs année précédente), encaissé et taux, reste à encaisser
    et retards (toutes années), facture moyenne, structures facturées ;
  · mois par mois : encaissé / en attente, repère pointillé de l'année précédente ;
  · impayés par ancienneté (non échu, 1-30, 31-60, 61-90, +90 j), par structure, dépliable
    facture par facture : « Relancer » (par facture, par structure, ou toutes les factures dues)
    et « Marquer payée » (facture + commande) ;
  · par territoire (région → départements, reste dû toutes années) et par type de structure ;
  · exports CSV (factures filtrées, territoires) : séparateur « ; », s'ouvrent dans Excel.
- **Rattachement des factures** : par la commande ; sinon par le marqueur des factures
  mensuelles / dépôt-vente ; sinon par le nom de la structure. Payée = statut « Payée » ou
  commande « Payé ». Échéance = date + délai de paiement (réglage, 30 j par défaut).
- **Relances** : mail sobre (1er rappel, puis rappels suivants, proposition d'échéancier à la 3e),
  à l'adresse de facturation ; tracées dans l'historique de la facture ET de la commande
  (onglet Historique, aucune migration). Réglages dans l'onglet : délai de paiement, relances
  automatiques (oui/non), 1re relance X j après l'échéance, intervalle, nombre maximum.
  Relances automatiques : tâche planifiée **`taches/relances-impayes`** (même clé que les autres
  tâches, ex. chaque lundi 9 h) — à créer dans Cloud Scheduler si on les active.
- **Back** : `src/regles/finance.js` (+ `test/finance.test.js`), `src/routes/finance.js`
  (`finance-tableau`, `finance-relancer`, `finance-reglages`, `taches/relances-impayes`),
  `index.js`, `securite.js`, `routes/comptes.js` (rôle `compta`).
- **Front** : `finance-admin.js`, `finance.css` (nouveaux, compatibles mode sombre), `admin.html`,
  `app.js?v=103` (onglet, rôle Comptabilité).
- **Démo** : profil « Comptabilité » sur `demo.html` (Nadia Belkacem), relances déjà envoyées
  sur les vieilles factures, factures mensuelles réservées aux structures facturables.
- Aucune migration. Réglages (Config) créés au premier enregistrement : `DELAI_PAIEMENT_JOURS`,
  `RELANCES_AUTO`, `RELANCE_PREMIER_DELAI`, `RELANCE_INTERVALLE`, `RELANCE_MAX`.

## Plateforme de démonstration « miroir », sans Google (30/09/2026)

- **Principe** : une 2ᵉ fonction Cloud, `cvdl-api-demo`, qui fait tourner le MÊME code avec
  `STOCKAGE=demo` : données fictives générées en mémoire au démarrage, aucune base, aucun
  classeur, aucun secret. Google (Sheets, Drive, Gmail, connexion) est remplacé par des clients
  factices ; aucun e-mail ni appel réseau sortant (tec.tech, Brevo…) ne part.
- **Entrée** : `demo.html` (front). On choisit un profil, sans Google ni mot de passe :
  Administration, Support SAV, Responsable de territoire (Interne), Conseiller numérique,
  une structure de chaque type (vente solidaire, BO partenaire d'une Interne, relais BO, ESN,
  projet, dépôt-vente, Interne, structure sans type), personne accompagnée (n° de série et
  référence SAV affichés), accueil public (code à saisir affiché).
- **Bascule** : `demo.html` pose un repère (8 h) ; toutes les pages parlent alors à
  `cvdl-api-demo` (adresse écrite en dur, jamais lue du stockage). Bandeau « Mode démo ·
  données fictives » sur chaque page, avec « Changer de profil » et « Quitter » (efface le
  repère et les accès).
- **Données** (reproductibles, dates recalculées par rapport au jour) : 37 structures sur
  7 régions ; 5 Internes avec leur équipe (responsables + conseillers, comptes Google) et 7
  partenaires BO ; ~150 commandes sur 18 mois, à tous les statuts (urgentes, doublon, annulées
  avec motif, commande oubliée, dématérialisées, Colissimo / retrait / livraison EC, paiement
  séparé, devis demandé, transférées à l'admin…) ; devis, factures (payées, envoyées, en
  retard, annulée), factures mensuelles de recharges ; ~650 appareils en flotte centralisée
  (remis, en stock > 2 mois, SAV, D3E, attribués aux partenaires, rattachés aux projets,
  rapprochements) et 18 flottes « Sheets » externes ; 34 SAV avec historique, fil d'échanges,
  notes internes, adresses ; 4 programmes de distribution (auto / proposé / lien / archivé),
  7 projets de structure, 2 grandes distributions, catalogue de 18 produits (rupture, tarif
  convention, tarif partenaires, recharges), arbres de dépannage + 90 parcours, enquêtes,
  statistiques des formulaires, retours, tâches, journal.
- **Réinitialiser** : bouton sur `demo.html`, ou Réglages → mode démo (même bouton qu'avant,
  qui régénère tout en démo). Les modifications faites pendant une démo sont gardées jusque-là
  — et perdues si la fonction s'endort (inactivité) : chaque démo repart d'un jeu propre.
- **Back** : `src/demo/` (index, stockageMemoire, googleFactice, donnees, modeles/), routes
  `demo-infos`, `demo-connexion`, `demo-reinitialiser` (montées UNIQUEMENT en mode démo),
  `sheets.js` (MODE_DEMO), `routes/modeDemo.js`, `routes/comptes.js` (export lireComptes),
  test `test/demo.test.js`. Scripts : `npm run start:demo` (local), `npm run deploy:demo`.
- **Front** : `demo.html` (nouveau), constante `API` des 19 pages (bascule démo),
  bandeau dans `portail-ui.js`.
- **À faire une fois** : `npm run deploy:demo`, puis publier le front (demo.html). Aucune
  variable secrète à fournir, aucune migration.

## Connexion Google : admin + connexion automatique des structures (30/09/2026)

- **Admin** : bouton « Se connecter avec Google » (comptes « Admin » de l'onglet Équipe, domaine
  autorisé) ; le mot de passe reste l'accès de secours. Connexion **automatique** (Google One Tap,
  `auto_select`) si le navigateur a déjà une session Google autorisée. Un compte « Support SAV »
  est renvoyé vers support.html. Jeton de compte (j2) conservé et revalidé par `auth-moi`.
- **Portail structure (Internes uniquement)** : connexion Google automatique, sans bouton, pour
  les comptes du domaine autorisé. Aucune fenêtre Google pour les autres (One Tap limité par `hd`) :
  code comme avant. Plusieurs structures : choix. La déconnexion coupe la connexion automatique.
- **Rôles de l'équipe d'une structure Interne** :
  · **Responsable de territoire** (e-mail de contact de la fiche, ou ajouté comme tel) : tout,
    comme avec le code (il reçoit le vrai code) ; gère l'équipe depuis la carte « Accès de l'équipe ».
  · **Conseiller numérique** : jeton `j3` (12 h) à la place du code, qu'il ne connaît jamais ;
    flotte et ventes, attestations, projets de distribution et rapport d'impact en consultation.
    Refusé côté serveur pour le reste (commandes, SAV, partenaires, tarifs, équipe) ; éléments
    `data-role="responsable"` masqués (`cvdl-ui.js?v=11`).
  · Code structure = droits responsable (inchangé).
  · Fiche structure (admin) : champ « Équipe (comptes Google) » —
    `paul@emmaus-connect.org (conseiller), anne@emmaus-connect.org (responsable)`.
- **Back** : routes `auth-google-structure` (publique, 30/h par IP), `equipe-structure`,
  `equipe-structure-enregistrer` ; jeton `j3` vérifié dans `securite.js` (`ACTIONS_CONSEILLER`), colonne 27
  « Comptes Google » (`comptes_google`, **migration 010** — `npm run db:migrer`),
  `src/regles/comptesGoogleStructure.js` + tests.
- CSP de `admin.html` et `portail-structure.html` ouvertes à `accounts.google.com/gsi/`.

## Retouches visuelles + « déjà distribués avant le suivi » (30/09/2026)

- **Portail structure** : accès rapides « Commander / Suivre mes commandes » en turquoise,
  « Signaler une panne / Mes demandes SAV » en magenta (lien « Ouvrir » et aplat des
  illustrations).
- **Titres des pages publiques sans sous-titre** (déclaration SAV notamment) : l'illustration
  est centrée sur le titre au lieu de paraître flotter au-dessus (`cvdl-ui.css?v=32`).
- **Commande — personne prescriptrice** : pastille d'initiales pleine (plus de disque décalé
  derrière), initiales centrées.
- **Programmes (admin) et projets de distribution (portail Interne)** : section « Déjà
  distribués avant le suivi » (produit ou « sans produit précisé » + quantité), comptée dans le
  livré dès la date de début ; ligne « Avant le suivi » dans le détail d'un programme, mention
  « dont N avant le suivi » dans le détail d'un projet.
- **À faire au déploiement** : `npm run db:migrer` (migration **009**, colonnes
  `deja_distribues`). Mode Sheets : colonne N (14) « Déjà distribués (JSON) » de
  ProgrammesDistribution et de ProjetsStructure (en-têtes écrits au premier enregistrement).
- Versions : `app.js?v=100`, `cvdl-ui.css?v=32` (toutes les pages publiques).

## Arbres de dépannage prêts à l'emploi + symptôme en double (30/09/2026)

- **18 arbres de dépannage publiés, un par symptôme** (200 étapes) : allumage, charge,
  clavier, souris/pavé tactile, son, Internet, virus et arnaques, mises à jour, lenteur, chauffe
  et bruit, écran cassé, mot de passe/compte, caméra/micro, ports, application, chute/liquide,
  impression, autre problème. Parcours ordinateur / smartphone-tablette, gestes concrets
  (Windows, Android, Linux Mint), consignes de sécurité (batterie gonflée, liquide, arnaques),
  sorties « Problème réglé » et « Déclarer un SAV » avec la bonne consigne.
  Fichier : `db/arbres-depannage-cvdl.json` (back). **Import** : admin → Dépannage →
  « Importer (.json) ». Réimporter le fichier met les arbres à jour sans doublon.
- L'import accepte maintenant le **format CVDL** (`"format": "cvdl-depannage"`) : symptômes,
  statut et identifiant conservés (l'ancien format de l'outil externe reste accepté, en brouillon).
- **Symptôme en double retiré** : « Mon clavier ne fonctionne pas » (= « Le clavier ne fonctionne
  plus ou mal »), aussi retiré d'une liste personnalisée ; il reste rattaché à l'arbre clavier
  pour les anciens SAV. Les symptômes des données de démo (« Très lent, presque inutilisable »…)
  sont rattachés aux arbres correspondants.
- Aucune migration.

## Mode sombre refait de zéro + thème de Noël (30/09/2026)

**Mode sombre (admin)**
- L'ancien mode sombre est supprimé (bloc `html.rp-dark` de reparc.css, règles `rp-dark` de
  admin-unifie.css et fiche-commande.css).
- Nouveau principe : chaque couleur écrite en dur dans les feuilles de l'admin et dans les
  styles générés par app.js est devenue un jeton `var(--th-<rôle>-<couleur>, <couleur>)`
  (rôles : fond, texte, trait, ombre, accent). En clair, la couleur d'origine s'applique : rendu
  identique au pixel près (vérifié écran par écran). En sombre, **theme-sombre.css** redéfinit
  chaque jeton selon des règles fixes (bleu nuit de la marque, textes inversés, pastels
  assombris, couleurs vives conservées, texte blanc jamais converti).
- Contraste vérifié automatiquement sur 27 écrans (onglets, fiches commande/SAV/structure,
  assistants, modales, notifications) : plus aucun texte illisible, hors éléments volontairement
  estompés (boutons désactivés, jours hors mois du calendrier).
- Fond des modales assombri, sur-titres et contours roses éclaircis. Fonctionne aussi avec
  « Ancien style ».
- Limite connue : la flotte d'une structure ouverte dans l'admin (page du portail intégrée)
  reste en clair.

**Thème de Noël** : bouton « Thème de Noël » dans la barre latérale, combinable avec clair ou
sombre. Rouge et vert sapin à la place du magenta et du turquoise (mêmes contrastes), guirlande
lumineuse, bonnet sur le logo, neige légère (coupée si le système demande moins d'animations),
fond crème en clair. Choix mémorisé par navigateur. Fichiers `theme-noel.css`, `theme-noel.js`.

**Versions** : `app.js?v=99`, `admin-unifie.css?v=45`, `reparc.css?v=41`, `portail.css?v=10`,
`sav-fil.css?v=2`, `fiche-commande.css?v=2`, `depannage.css?v=2`, nouveaux
`theme-sombre.css?v=1`, `theme-noel.css?v=1`, `theme-noel.js?v=1`. Aucun changement côté back.

## Liens utiles, projets de distribution (Interne), assistant partenaire, stock bas (30/09/2026)

**Admin**
- **Réglages → « Liens utiles »** : des fichiers (Drive, Sheets, SharePoint… en https://) à ouvrir
  d'un clic, avec pour chacun où l'afficher : **Nouvelle facture**, **Nouveau devis**, **fiche
  commande** (étapes « Générer la facture » / « Générer le devis »). Boutons avec l'icône du type
  de fichier. Config `LIENS_RACCOURCIS` (JSON) — **aucune migration**. Fichier `liens-admin.js`.
- **Réglages** : toutes les sections reprennent l'en-tête du « Plan de secours » (pastille
  d'icône teintée + titre + explication) ; modèles de documents en tuiles ; nouvelle section
  **« Commandes »** : maximum par produit et par commande par défaut (normal / ESN et Interne).
- **Stock** : « Ajouter un produit » à droite du titre, outils (Mode stock bas, Synchroniser
  tec.tech, Organiser le catalogue) regroupés dans une barre sous le titre.
- **Produit** : champ **« Quantité maximale par commande »** (assistant et modification). Vide =
  réglage par défaut. Avant, 5 était écrit d'office dans chaque produit créé.
- **Fiche structure (Interne)** : bloc « Projets de distribution » (lecture seule : avancement,
  rythme, appareils remis sans projet) + « Voir la flotte » ; la flotte intégrée affiche le
  projet de chaque appareil remis.

**Portail structure**
- **Projets de distribution** (structures Interne uniquement), nouvelle carte dans « Aller plus
  loin » → `projets-distribution.html` : même modèle que les programmes de l'admin (financeur,
  référence, période, objectif global et/ou par produit, points d'étape), cartes avec anneau
  d'avancement, reste, J-x, alerte de rythme et projection ; détail, export CSV, archivage.
  Création / modification en assistant par étapes.
- **Ma flotte** : sur chaque appareil **« Remis »**, choix du projet (seulement les projets qui
  comptent ce produit). Un appareil qui quitte « Remis » est détaché automatiquement.
- **Nouvelle structure partenaire (BO)** : assistant en étapes comme l'admin (Identité, Contacts,
  Commandes & paiement, Convention, Récapitulatif), code généré par défaut, contrôle de
  robustesse ; la modification utilise le même assistant. Fichiers réutilisables
  `assistant-portail.js` / `assistant-portail.css`.
- **Commande — mode stock bas** : grand panneau « Attention · Stock bas » (limites par commande
  et par produit, message) ; à l'étape **Quantités**, compteur « x / max articles », boutons « + »
  bloqués au maximum, « Continuer » bloqué en cas de dépassement (plus seulement à l'envoi).
  Trop de produits cochés à l'étape Matériel : message et blocage.
- **Limite de 5** : le formulaire plafonnait chaque produit à 5 en dur (`Math.min(5, …)`) —
  supprimé ; il suit maintenant le maximum calculé par le serveur (produit / réglage par défaut,
  stock, mode stock bas, stock restreint).

**Back**
- `src/regles/projetsStructure.js` (règles pures, testées : `test/projetsStructure.test.js`),
  `src/routes/projetsStructure.js` : `/projets-structure`, `/projets-structure-admin`,
  `/projet-structure-enregistrer`, `/projet-structure-archiver`, `/flotte-rattacher-projet`.
- `donnees-commande` renvoie aussi `maxParProduit` du mode stock bas et applique le maximum par
  défaut aux produits sans maximum propre.

**À faire au déploiement**
- `npm run db:migrer` : migration **008** (table `projets_structure`, colonne
  `flotte_interne.projet_distribution`) avant le back.
- Mode Google Sheets uniquement : onglet `ProjetsStructure` créé au premier enregistrement ;
  ajouter l'en-tête « Projet de distribution » en colonne **Y** (25) de FlotteInterne.
- Front : `app.js?v=98`, `admin-unifie.css?v=44`, nouveaux `liens-admin.js?v=1`,
  `assistant-portail.js?v=1`, `assistant-portail.css?v=1`, page `projets-distribution.html`.

## Comptes équipe (Google Workspace) + outil Support SAV (30/09/2026)

- **Connexion « Se connecter avec Google »** pour l'équipe, limitée au domaine
  (`AUTH_DOMAINE`, défaut emmaus-connect.org) **et** aux comptes ajoutés dans le nouvel onglet
  admin **« Équipe »**. Rôles : **Support SAV** (outil support.html uniquement) et **Admin**.
  Le serveur vérifie le rôle à chaque action (securite.js) et revérifie le compte : désactiver
  quelqu'un coupe son accès immédiatement. Session 12 h (jeton signé, clé `SESSION_SECRET`
  créée automatiquement dans Config). Le mot de passe admin reste valable (accès de secours).
- **Outil Support SAV** (`support.html`) : files (à traiter, en attente de réponse, mes tickets,
  ouverts, par étape, colis, clos 30 j), recherche, fil d'échanges, **notes internes** (jamais
  visibles côté public), **assignation**, changement de statut (y compris « après envoi »),
  colis (demande d'adresse, adresse masquée/affichage tracé, dépôt du bon PDF, lien de suivi),
  contact masqué, autres passages de l'appareil. Adapté au téléphone.
  Style CVDL modernisé pour un outil de travail : traits fins, hiérarchie par taille/poids/gris,
  statut en pastille colorée, panneau latéral en sections, bulles allégées.
- Réponses, notes et affichages d'identité **signés au nom du compte** (journal compris).
- Migration **007** (`comptes`, colonne `sav.assigne`) à appliquer.
- Mise en place : console Google Cloud → API et services → Identifiants → « ID client OAuth »
  de type Application Web, origine JavaScript autorisée = adresse du site (GitHub Pages) ;
  écran de consentement en « Interne ». Puis `GOOGLE_CLIENT_ID` dans env-vars.yaml (ou Config).

## Échanges SAV (fil de messages) (30/09/2026)

- **Fil d'échanges sur chaque SAV**, entre l'équipe et la personne accompagnée **ou** la
  structure : sur les pages de suivi SAV (personne : numéro de série + référence/e-mail ;
  structure : code) et dans la fiche SAV de l'admin. Historique conservé, changements de statut
  intégrés au fil, photo jointe possible côté personne/structure. Pas de réponses types.
- **E-mails** : la personne / la structure est prévenue d'une réponse (lien vers la page de
  suivi, jamais le contenu) ; l'équipe est prévenue d'un nouveau message. Côté admin, pastille
  « non lu » sur les cartes SAV.
- **Anonymat côté personne** : l'équipe répond depuis l'admin sans jamais voir l'adresse e-mail.
  Côté public, l'équipe signe « Équipe SAV CVDL ». Le mail d'alerte « nouveau SAV » masque aussi
  désormais les coordonnées d'une personne qui déclare elle-même.
- **Bon Colissimo** : « Demander l'adresse d'envoi » → formulaire sur la page de suivi (pré-rempli
  avec l'adresse de la structure). Adresse d'une personne masquée dans l'admin (« Afficher
  l'adresse », tracé, pour créer l'étiquette sur le site Colissimo) ; **effacée dès que le PDF
  du bon est déposé**, qui apparaît alors dans le fil (« Imprimer le bon ») avec un e-mail.
  Sans API Colissimo : dépôt du PDF à la main (déjà en place). Avec l'API plus tard : même
  parcours, étiquette générée automatiquement.
- Migration **006** (`sav_messages`, `sav_adresses`) à appliquer. Config facultative `URL_SITE`
  (adresse du site public pour les liens des e-mails ; sinon la première de `ORIGINE_AUTORISEE`).

## Identités pseudonymisées dans l'admin (30/09/2026)

- **Commandes, SAV** : l'admin ne reçoit plus l'identité des personnes accompagnées. Chaque
  personne y apparaît sous un **pseudonyme stable** (ex. `P-72D3B`), le même partout pour une
  même personne. Masquage fait **côté serveur**, comme la vue matériel de la flotte (déjà en place).
- L'identité **reste en base** : attestations, bons, mails et flotte de la structure continuent
  de l'utiliser, sans l'afficher à l'admin. Quand l'admin associe les numéros de série, les
  pseudonymes renvoyés sont remplacés par l'identité réelle avant l'écriture.
- **SAV déclaré par la personne elle-même** (pas de responsable côté structure) : nom, e-mail et
  téléphone masqués, avec un indice (`p•••@mail.fr`, `•• 78`). « Écrire » demande d'abord
  l'affichage des coordonnées (motif « Contacter la personne »). SAV de structure : le contact
  de la structure reste visible, seule la personne accompagnée est pseudonymisée.
- **« Afficher l'identité »** : motif obligatoire + nom de l'admin, **journalisé**
  (table `journal_identite`, route `/identite-journal`) ; l'identité se masque de nouveau
  après 5 minutes. Pas de journal = pas d'affichage.
- Migration **005** à appliquer (`npm run db:migrer`). Nouvelle clé Config `PSEUDONYME_SEL`
  créée automatiquement au premier usage (ne pas la modifier : les pseudonymes changeraient).

## Retours utilisateurs + visite guidée complétée (30/09/2026)

**Retours** (nouvel onglet admin « Retours »)
- **« Était-ce simple ? »** (3 visages : difficile / moyen / facile) juste après une commande
  ou une déclaration de panne (structure et personne accompagnée), une fois par dossier, avec
  un mot facultatif ensuite. Une seule question, jamais au milieu d’une tâche.
- **« Donner mon avis »** dans le bloc d’aide de l’espace structure (fenêtre courte).
- **Erreurs rencontrées**, sans rien demander : messages d’erreur affichés aux utilisateurs
  (toutes les pages publiques), erreurs techniques des pages, exceptions du serveur — regroupées
  par message avec le nombre sur 30 jours et les pages concernées.
- Onglet admin : taux « facile » par parcours, avis écrits à lire (« Traité »), erreurs, et les
  **abandons des formulaires** sur 90 jours (données déjà collectées mais jamais affichées).
- RGPD : anonyme (code structure seulement s’il est connu, jamais de nom, e-mail ni date de
  naissance ; e-mails et téléphones masqués dans les textes), conservé 13 mois (purge
  automatique), aucun outil tiers, donc pas de bandeau de consentement nécessaire. Ajouter une
  ligne dans les mentions légales.
- Fichiers : `retours.js`, `retours.css` (pages publiques), `retours-admin.js` ;
  back : `src/regles/retours.js` (testé), `src/routes/retours.js`
  (`/retour-enregistrer` 30/h par IP, `/retours-admin`, `/retour-traiter`).

**Visite guidée** : 5 étapes — commander et suivre, SAV, flotte **et impact écologique**,
**catalogue**, puis « Une question, un avis ? » (bloc d’aide, avec « Donner mon avis »).

**À faire au déploiement** : `npm run db:migrer` (migration `004_retours.sql`) avant le back.

**Versions** : `app.js?v=94`, `admin-unifie.css?v=40`, `retours.js?v=1`, `retours.css?v=1`.

## Visite guidée de l’espace structure (30/09/2026)

- À la **première connexion** d’une structure à son espace (par appareil) : 3 secondes pour
  découvrir la page (pastille « Petite visite guidée dans 3 s · Passer »), puis tout se floute
  sauf la zone expliquée, avec une bulle courte — **3 étapes** : commander puis suivre, signaler
  une panne / suivre ses SAV, la flotte. Précédent / Suivant, flèches du clavier, Échap ou
  « Passer » à tout moment ; bulle en bas d’écran sur téléphone ; animations coupées si
  l’animation réduite est demandée.
- « Revoir la visite guidée » dans le bloc « Besoin d’aide ? ».
- Fichiers : `visite-guidee.js`, `visite-guidee.css` (réutilisables sur d’autres pages).
  L’astuce existante après la première commande / le premier SAV (`?tuto=…`) reste inchangée
  et prend la priorité.

## Mode stock bas (29/09/2026, suite)

- Onglet **Stock** : bouton **« Mode stock bas »** (jaune, bien visible ; « · actif » quand il
  est en route) et bandeau récapitulatif quand il est actif. Une fenêtre règle tout :
  activer, **articles max. par commande**, **max. par produit** (tous produits), un maximum
  propre à chaque produit (stock EC affiché à côté) et un message pour les structures.
- S’applique à **toutes les commandes passées par les structures sur le portail**, quel que
  soit leur type : quantités proposées réduites dans le formulaire, bandeau « Stock bas en ce
  moment » (avec le message), refus côté serveur en cas de dépassement. Les commandes saisies
  dans l’admin ne sont pas limitées.
- Le formulaire affiche aussi le **stock restreint** d’une structure en dépôt-vente (« vous
  pouvez encore commander N appareils »).
- Back : `src/regles/stockBas.js` (règles, testées), `src/routes/modeStockBas.js`
  (`/mode-stock-bas`), appliqué dans `/create` et `/donnees-commande`. Réglage dans Config
  (`MODE_STOCK_BAS`) : **aucune migration**.
- Versions : `app.js?v=93`, `admin-unifie.css?v=39`.

## Stock restreint, menu prescripteur, corrections (29/09/2026, suite)

**Dépôt-vente — « Stock restreint »** (bouton sur la fiche 360° et sur la carte de l’onglet Stock)
- Une fenêtre par structure : activer, **plafond global** (appareils en dépôt + commandés non
  livrés), **seuil de stock bas** global, et pour chaque produit un plafond et un seuil.
- Plafond atteint : le formulaire de commande ne propose que ce qui reste possible (produit
  grisé « Stock restreint » s’il n’en reste plus) et le serveur refuse toute commande au-delà,
  avec un message clair.
- Stock bas : pastilles sur la fiche et la carte Stock, alerte dans le fil des priorités / la
  cloche, e-mail via la tâche `/taches/depot-vente-alertes` (une fois par alerte).
- Réglages enregistrés dans Config (`DEPOT_VENTE_LIMITES`) : **aucune migration**.
- Statut « Retourné » retiré (et son effet sur le stock catalogue) ; formulation « propriété
  d’Emmaüs Connect » retirée : le dépôt-vente = suivi du matériel, sans paiement à la commande.

**Commande — personne prescriptrice** : menu déroulant illustré (pastille d’initiales,
« Responsable de la structure », nombre de commandes et date de la dernière), « Quelqu’un
d’autre… » en dernière ligne ; utilisable au clavier (↑ ↓ Entrée Échap).

**Corrections**
- Fiche 360° : le bouton « Gérer la flotte » (et le nouveau « Stock restreint ») est centré
  verticalement dans le bloc Dépôt-vente.
- Fiche 360° : la fenêtre plantait dès que la structure avait un SAV (fonction de couleur de
  statut SAV introuvable hors de l’onglet SAV).

**Back** : `src/regles/depotVente.js` (règles du stock restreint, testées),
`src/routes/depotVente.js` (`/depot-vente-limites`, occupation du dépôt, alertes stock bas),
`/create` et `/donnees-commande` appliquent les plafonds ; `/donnees-commande` renvoie
`prescripteursDetails`.

**Versions** : `app.js?v=92`, `admin-unifie.css?v=38`.

## Dépôt-vente redéfini + dépannage avant SAV (29/09/2026)

**Dépôt-vente : suivi du matériel confié, sans paiement à la commande**
(auparavant l’option ne faisait qu’ouvrir la flotte « plateforme » + 2 alertes de stock)
- Commande d’une structure en dépôt-vente = **mise en dépôt** : rien à payer, ni devis ni
  facture à la commande (moyen « Dépôt-vente (payé à la vente) », fixé côté serveur), pas
  comptée dans les impayés. E-mail de confirmation : « matériel confié en dépôt-vente ».
- Flotte : statuts **En stock · Vendu · SAV · D3E**. « Vendu » pose la date de vente si elle
  est vide.
- **Facturation des ventes, au choix par structure** (assistant structure, étape Options) :
  « Pas de facturation automatique » (défaut, organisation à définir) ou « Une facture à chaque
  vente » : dès qu’un appareil passe en « Vendu », une facture du **prix de cession** (prix de
  la flotte, à défaut prix catalogue) est émise, numérotée `DV-{ANNEE}-{NUM}` (Config
  `FACTURE_DEPOT_VENTE_MODELE`), une seule par appareil, visible dans Devis / Factures (PDF et
  envoi comme les autres). Sans prix connu : pas de facture à 0 €, message à la structure.
- Admin : onglet Stock, fiche 360°, modale Flotte → « vendus » au lieu de « remis »,
  mode de facturation affiché ; nouvelle commande admin : « Mise en dépôt ».
- Portail « Ma flotte » : bandeau d’explication, statuts et compteurs « Vendu ».

**Dépannage avant SAV (arbres de décision)**
- Après le choix du symptôme (sav.html et sav-beneficiaire.html), si un arbre **publié** est
  rattaché à ce symptôme, une étape « Dépannage » s’insère : questions / réponses, astuces,
  image ou lien vidéo. « C’est réglé » → rien n’est envoyé ; « Déclarer le SAV » → la demande
  continue normalement et **le parcours suivi est ajouté à la description du SAV**
  (« [Dépannage en ligne tenté — …] étape → étape → … »). Possibilité de passer directement.
- Admin : nouvel onglet **Dépannage** — liste des arbres (statut, symptômes, taux de résolution),
  symptômes encore sans arbre (un clic pour en créer un), derniers parcours ; éditeur en 3
  colonnes : plan de l’arbre, étape (titre, explication, astuce, image réduite automatiquement
  ou vidéo, type Question / Fin réglé / Fin SAV, réponses), **aperçu exact** de la page publique.
  Points d’attention (étape jamais atteinte, pas de fin « réglé »…). Ctrl+S enregistre.
- **Import** du fichier .json de l’ancien outil d’arbres de décision (sauvegarde complète ou
  export) : arbres importés en brouillon, arbres de démonstration ignorés.
- Fichiers : `depannage.js` + `depannage.css` (parcours, communs pages SAV et aperçu admin),
  `depannage-admin.js` (onglet admin).
- Téléphone : la frise d’étapes tient maintenant en largeur même avec 6 étapes.

**Back**
- Migration `db/migrations/003_depot_vente_et_depannage.sql` : colonne
  `structures.facturation_depot_vente`, tables `arbres_depannage` et `parcours_depannage`.
- `src/regles/politique.js` : règles dépôt-vente (`paiementALaCommande`, `facturationDepotVente`,
  `politique.depotVente`, `politique.paiement.aLaVente`).
- `src/depotVenteFacturation.js` (facture d’une vente), `src/regles/depannage.js` (règles pures,
  testées), `src/routes/depannage.js` : `depannage-arbres` (public), `depannage-admin`,
  `depannage-enregistrer`, `depannage-supprimer`, `depannage-importer`, `depannage-parcours`
  (public, 60/h par IP). `sav-create` accepte `parcoursDepannage`.

**À faire au déploiement**
1. `npm run db:migrer` (depuis Cloud Shell, comme pour l’initialisation) **avant** de déployer.
2. Déployer le back, puis le front.
3. Mode Google Sheets (retour arrière uniquement) : Structures colonne **Z** « Facturation
   dépôt-vente » ; onglets « ArbresDepannage » et « ParcoursDepannage » (en-têtes dans
   `src/stockageSchema.js`).

**Versions** : `app.js?v=91`, `cvdl-ui.css?v=31`, `depannage.js?v=1`, `depannage.css?v=1`,
`depannage-admin.js?v=1`.

## Retours du 29/09/2026 (prescripteur, produits, flotte, commandes partenaires)

**Commande (portail structure)**
- Étape « Envoi » : **personne prescriptrice** choisie dans un menu déroulant (avec illustration)
  parmi les noms déjà connus de la structure (responsable habituel + prescripteurs de ses
  commandes précédentes). « Ce n’est pas moi — ajouter une autre personne » (ou « + Quelqu’un
  d’autre… » dans la liste) pour en saisir un nouveau : il est retenu pour les commandes
  suivantes. Aucun changement de base de données (le nom reste enregistré sur la commande).
- Libellés « Prescripteur » dans l’admin (fiche commande, nouvelle commande) et le suivi.

**Admin**
- **Ajout d’un produit en assistant par étapes** (comme nouvelle commande / nouveau SAV) :
  Catégorie (cartes illustrées) → Prix et stock → Caractéristiques (selon la catégorie) →
  Comportement → Récapitulatif. La modification d’un produit garde le formulaire complet.
- **Bug corrigé** : à la création d’un produit, RAM, disque, système et message d’indisponibilité
  étaient remis à vide (ils n’apparaissaient dans le catalogue qu’après une seconde modification).
- SAV : l’illustration « Aucun dossier » est centrée sur toute la largeur, comme les commandes.
- Structures : le nom complet est toujours lisible (plus de coupure) ; région et e-mail masqués
  sur écran étroit.

**Flotte : identité et compta réservées à la structure**
- Flotte ouverte depuis l’admin (modale « Flotte ») : **vue matériel** — n° de série, produit,
  statut, lieu, dates, garantie, passeport… mais ni nom/prénom, ni date de naissance, ni
  comptabilité (prix, paiement, rapprochement, Salesforce). Onglet Comptabilité, tarifs de revente
  et montant distribué masqués. Ces données ne sont plus renvoyées par le serveur dans ce mode
  (paramètre `vue=materiel`) ; les champs correspondants et l’attestation y sont refusés.
- Structure Interne : les appareils **transférés à une structure partenaire** ne montrent plus
  l’identité des personnes ni la compta (gérées par le partenaire) — retiré côté serveur.
- Les compteurs (personnes équipées, statistiques) restent calculés sur les données complètes.

**Commandes des structures partenaires (espace Interne) — refonte**
- Une consigne claire par étape : Valider la demande → Préparer le matériel → Remettre ou
  expédier → Confirmer la remise.
- **Bugs corrigés** :
  - la validation d’une commande « Reçue » était impossible tant que le matériel n’était pas
    attribué (rien ne l’exige) : le choix du matériel se fait maintenant à l’étape « Validée » ;
  - Colissimo : aucun champ pour saisir le numéro de suivi, la commande restait bloquée à
    « Préparée » — champ ajouté (enregistré sur la commande, visible dans le suivi) ;
  - la fenêtre se fermait après chaque action : elle reste ouverte, rechargée, avec un message ;
  - attribution : une personne déjà déclarée à la commande était ajoutée une seconde fois
    (doublon dans la liste des personnes) ; sa ligne est maintenant complétée.
- Mots coupés corrigés (référence, numéros de série, noms) ; fenêtre plein écran sur mobile ;
  moins d’encadrés imbriqués ; compteur « x sélectionnés sur y à attribuer » ; section
  « Qui a reçu quoi » toujours visible.
- Liste : chaque carte montre l’avancement (5 étapes) et la prochaine action
  (« À valider », « Matériel à choisir (0/2) », « À remettre ou expédier »…).

**Versions** : `app.js?v=90`, `admin-unifie.css?v=37` ; styles intégrés à `commande.html`,
`flotte-structure.html`, `commandes-partenaires.html`, `suivi.html`.

## Connexion admin : message d'erreur réel (29/09/2026)

- Écran de connexion (admin et admin de secours) : affiche la vraie raison d'un refus au lieu
  de toujours « Mot de passe incorrect » — mot de passe admin non configuré ou trop court
  (moins de 12 caractères : **aucun** mot de passe n'est alors accepté), trop de tentatives
  (8 essais ratés en 10 min : attendre 10 min). `app.js?v=89`, `app-secours.js?v=4`.
- Back : en mode PostgreSQL, le message indique de lancer `npm run db:initialiser`.

## Passage sur PostgreSQL — base neuve, prête pour la production (29/09/2026)

Les données quittent Google Sheets pour une base **PostgreSQL (Google Cloud SQL)** : sauvegarde
quotidienne, restauration à la minute près sur 7 jours, plus de quotas Sheets. Démarrage **à
vide** (aucun import). Écrans, adresses et fonctionnement inchangés pour les utilisateurs.

**À faire pour la mise en production** — pas à pas dans `db/README.md`
1. Créer l'instance Cloud SQL `cvdl-db` et le secret `cvdl-db-password` (commandes fournies).
2. Donner au compte de service de la fonction les rôles « Client Cloud SQL » et « Accesseur de
   secrets ».
3. Depuis Cloud Shell : `npm run db:initialiser` (tables, statuts SAV, mot de passe admin).
4. Déployer avec `STOCKAGE=postgres`, `INSTANCE_CONNECTION_NAME`, `DB_USER`, `DB_NAME` et
   `--set-secrets=DB_PASSWORD=cvdl-db-password:latest`.
5. Créer le catalogue produits puis les structures depuis l'administration.
Retour arrière : redéployer sans `STOCKAGE` (retour sur Google Sheets).

**Back**
- `src/stockagePg.js` + `src/stockageSchema.js` : stockage PostgreSQL branché sous les mêmes
  fonctions que Sheets (`src/sheets.js`) ; routes inchangées. Une table par ancien onglet,
  mêmes colonnes. Les numéros de ligne ne se décalent plus après une suppression et un numéro
  de commande / SAV supprimé n'est jamais réattribué.
- Suppressions (commande, ligne produit, statut SAV) et mode démo passent par ces fonctions
  (plus d'appel direct à l'API Sheets) ; suppression d'un statut SAV vérifiée.
- Mode PostgreSQL : bascule annuelle de classeur, rappel de bascule et création d'onglets
  désactivés (sans objet) ; Réglages indiquent où sont les données.
- `db/connexion.js` : connecteur officiel Cloud SQL (chiffré, autorisé par IAM, aucune IP à
  ouvrir) ou `DATABASE_URL`. Nouvelle dépendance `@google-cloud/cloud-sql-connector`.
- `db/migrations/001_schema_initial.sql` (20 tables) et `002_donnees_initiales.sql` (5 statuts
  SAV) ; `db/initialiser.js` (script `db:initialiser`) ; scripts d'import supprimés.
- Schéma « rangé » visé ensuite conservé dans `db/cible/schema-normalise.sql` (non appliqué).
- Nombre de commandes (tableau de bord) : compte les commandes réelles.
- Tests : `test/stockage.test.js` (colonnes du code présentes dans les migrations ; adaptateur
  testé sur une base jetable si `TEST_DATABASE_URL`).

**Front**
- Réglages → « Si l'admin ne marche plus » : texte adapté quand les données sont dans la base
  (`app.js?v=88`).

**Corrections de données (trouvées par l'inventaire, indépendantes de la migration)**
- La tâche d'enquête de satisfaction écrivait « Oui » dans la colonne du **mode de livraison**
  (AH) de chaque commande livrée : elle utilise désormais sa propre colonne (AM). Les commandes
  déjà touchées sont repérées par l'import (mode vidé, à ressaisir si besoin).
- SAV créé à la main : la ligne était décalée d'une colonne à partir de U (e-mail rangé en
  « lien vidéo »…) ; corrigé, et les anciens tickets sont réalignés à l'import.
- Dates jj/mm/aaaa lues à l'envers (5 août pris pour le 8 mai) : alerte garantie de la flotte,
  dépôt-vente, enquête ; date cible du calendrier jamais calculée (date ISO mal découpée).
- Date de naissance qui apparaissait dans le bon d'orientation et le mail de paiement
  (format « Nom — date ») ; recherche de date de naissance valable pour les deux formats.
- Retrait d'une ligne produit : vérifie qu'elle appartient bien à la commande et recalcule le
  résumé et la quantité totale.
- Devis / factures multi-produits : modifier la quantité ne remet plus le montant à 0.
- Nouveau classeur actif : en-têtes complets pour toutes les colonnes utilisées.

## Sécurité — protections complémentaires (28/09/2026, suite)

**À faire au déploiement**
- Déployer avec `npm run deploy` : désormais **une seule instance** (`--max-instances=1
  --concurrency=40 --cpu=1 --memory=512Mi`) — les écritures sensibles passent une par une.
- `CLE_TACHES_PLANIFIEES` : 16 caractères minimum ; Cloud Scheduler peut l'envoyer dans l'en-tête
  `X-CVDL-Cle-Taches` (le paramètre `?cle=` reste accepté).
- Facultatif : `JETON_SECRET` (secret aléatoire) pour signer sessions et liens de fichiers ;
  `TECTECH_HOTES` si l'adresse de tec.tech change (défaut `tec-tech.osc-fr1.scalingo.io`) ;
  `URL_API_PUBLIQUE` si l'adresse de l'API change.
- Après la mise en ligne : Réglages → « Retirer les partages publics » (une fois).

**Back**
- Session admin par **jeton signé** (12 h, révoqué si le mot de passe change) : le mot de passe
  n'est envoyé qu'à la connexion. Session expirée → retour à l'écran de connexion.
- **Documents Drive non publics** : plus de partage « toute personne disposant du lien » ; les
  liens renvoyés par l'API sont des liens signés valables 24 h (route `fichier`, documents Google
  servis en PDF). Devis et factures envoyés par mail en **PDF joint** (plus de lien) ; un échec
  d'envoi ne marque plus le document « envoyé ». Route admin `securite-retirer-partages`.
- Écritures qui numérotent ou touchent au stock exécutées une par une (plus de référence en
  double ni de survente simultanée).
- Suivi SAV public par numéro de série : l'avancement reste visible, mais photo, notes, suivi
  et bon Colissimo demandent la référence du dossier ou l'e-mail de la demande.
- Passeport : le donateur tec.tech d'un appareil hors CVDL n'est plus visible que de l'admin.
- Enquête de satisfaction : lien signé (`&t=`) dans le mail ; sans lui, réponse refusée.
- tec.tech : jeton et secret envoyés uniquement à l'hôte exact autorisé.
- Réglages sensibles (dossier Drive, e-mail des alertes, adresse tec.tech, e-mail logistique) :
  mail d'alerte à l'ancienne adresse à chaque changement ; bascule de classeur limitée au même
  Drive partagé, avec mail d'alerte. La clé API n'est plus renvoyée au navigateur.
- Codes des structures partenaires (créés par une Interne) : 12 caractères minimum.
- Modèles Google Sheets (bons, factures, attestations) : une valeur commençant par `= + - @`
  ne peut plus devenir une formule dans le document généré.
- Page de validation logistique échappée, quantités bornées ; clé des tâches comparée en temps
  constant ; détails d'erreurs internes retirés des réponses publiques de la flotte.

**Front**
- Admin, admin de secours et passeport : jeton de session à la place du mot de passe.
- Politique CSP sur toutes les pages ; librairie QR hébergée avec le site (`qrcode.min.js`,
  nouveau fichier à la racine, au lieu de cdnjs).
- Suivi SAV bénéficiaire : champ facultatif « référence ou e-mail » pour voir les documents.
- Enquête : transmet le jeton du lien. Réglages : bouton « Retirer les partages publics ».
- Versions : `app.js?v=87`, `app-secours.js?v=3`.

## Sécurité — avant mise en production (28/09/2026)

**À faire au déploiement (obligatoire)**
- Onglet **Config** : `ADMIN_PASSWORD` d'au moins 12 caractères (idéalement 20+, aléatoire).
  Tant qu'il est absent, vide, trop court ou égal à l'ancienne valeur par défaut, **aucune
  connexion admin n'est acceptée** (réponse 503).
- Variable d'environnement **`ORIGINE_AUTORISEE`** = l'adresse exacte du site public (ex.
  `https://cvdl.emmaus-connect.org`, plusieurs séparées par des virgules). Sert au CORS et aux
  liens insérés dans les mails (les liens envoyés par le navigateur ne sont plus repris sinon).
- **Ne pas** définir `MODE_DEMO_AUTORISE` en production (la réinitialisation démo y est bloquée).
- API publique `/api/v1` : désormais **fermée par défaut** ; générer une clé dans Réglages si
  un outil externe doit s'en servir.
- Déploiement avec `--max-instances=3` (ajouté au script `deploy`) : la limitation des essais
  est tenue en mémoire par instance.

**Back**
- Injection de formules Google Sheets neutralisée pour toutes les écritures (`sheets.js`, écritures
  directes de `flotte.js`) : une valeur saisie commençant par `= + - @` est stockée comme texte.
  Auparavant, un simple champ public (SAV, commande, flotte, lien flotte…) permettait de lire le
  mot de passe admin, les codes structure et les données personnelles de toutes les structures.
- Nouveau `securite.js` (appliqué à toutes les actions) : mot de passe admin accepté dans l'en-tête
  `X-CVDL-Admin` ; limitation des essais par IP (8 mots de passe faux / 25 codes inconnus par
  10 min) ; limitation horaire des envois publics (SAV, commande, analytique, enquête…).
- `auth.js` : comparaison en temps constant, refus si le mot de passe n'est pas configuré.
- `trust proxy` = 1 (l'IP ne peut plus être falsifiée par l'en-tête X-Forwarded-For).
- `/api/v1` : fermée sans clé (≥ 24 caractères), plus de code structure, d'e-mail ni de nom de
  personne dans les réponses.
- `/flotte-lier` : seul un identifiant de classeur valide est accepté et stocké (URL reconstruite),
  refus des classeurs internes et d'un classeur déjà lié à une autre structure ; le message
  demande un partage nominatif avec le compte de service (plus « toute personne disposant du lien »).
- `/flotte-liste-perso-ajouter` : code structure exigé, 60 caractères et 200 entrées max.
- `produit-partenaire-update` / `-supprimer` : réservés à l'Interne créatrice du tarif
  (auparavant, sans code, tout le catalogue pouvait être modifié ou supprimé).
- Commande portail (`create`) : tarif dédié et groupe de catalogue vérifiés, plafond de quantité
  vérifié sur le total par produit, moyen de paiement et date souhaitée contrôlés ;
  `produits-public` ne montre plus les tarifs dédiés des autres structures.
- Liens des mails de confirmation : seulement vers le site autorisé (`ORIGINE_AUTORISEE`).
- `sav-create` : longueurs bornées, lien vidéo en `https://` uniquement, une seule photo
  (JPEG/PNG/WebP/HEIC vérifiés par leur contenu, 8 Mo max).
- Modèles HTML (devis, factures, bons, attestations) : valeurs échappées.
- Analytique : taille bornée, le code structure n'y est plus enregistré.
- Réinitialisation démo : bloquée sauf `MODE_DEMO_AUTORISE=1`, confirmation exigée.
- Corrigé au passage : dépôt du fichier de répartition Projets (arguments inversés).

**Front**
- Le mot de passe admin ne passe plus dans les URL (en-tête `X-CVDL-Admin`) ; liens vers le
  passeport en `admin=1`, le passeport reprend la session admin du navigateur.
- Adresse de l'API figée (suppression de la substitution via `localStorage`).
- `urlSure()` sur tous les liens dynamiques (plus de `javascript:` possible).
- admin, admin de secours, passeport : `referrer` désactivé et protection anti-clickjacking.
- Versions : `app.js?v=86`, `portail-ui.js?v=22` (toutes les pages), `app-secours.js?v=2`.

## Retours du 28/09/2026 (4e lot)

Aucune action manuelle dans le classeur. Back inchangé (seul ce CHANGELOG est mis à jour).

**Admin**
- **Nouveau SAV** saisi à la main : assistant en 5 étapes comme la nouvelle commande — Demandeur
  (structure avec recherche, ou « sans structure » ; nom, e-mail et téléphone préremplis depuis la
  fiche ; personne accompagnée, responsable) → Problème (mêmes cartes symptôme illustrées que le
  portail, ou « Autre problème ») → Appareil (n° de série avec suggestions parmi les appareils
  livrés à la structure, commande d'origine détectée, marque, modèle, date d'achat, facture) →
  Précisions (commentaire, vidéo, photo) → Récapitulatif. Le dossier créé s'ouvre directement.
- **Nouvelle commande** : pictogrammes des moyens de paiement identiques à ceux du portail
  (carte, chèque, espèces, comptoir, virement) — aussi dans la création de structure.
- **Fiche SAV** : commande d'origine sous le numéro de SAV, cliquable (ouvre la commande) ;
  passeport remonté en haut (sans la ligne « Historique, garantie… »), origine de l'appareil juste
  en dessous ; ligne « Appareil » retirée (modèle et garantie affichés seulement s'ils sont connus) ;
  symptôme présenté avec la carte illustrée du formulaire SAV.

**Portail structure**
- **En chiffres** remonté entre les accès rapides (commandes / SAV) et la rangée Ma flotte / Notre
  impact, sur toute la largeur ; « Aller plus loin » prend sa place dans la colonne de droite (et
  toute la largeur quand il n'y a pas d'activité récente).
- **Besoin d'aide ?** sur toute la largeur, en bas de page.
- Front : `app.js?v=85`, `admin-unifie.css?v=36`.

## Retours du 28/09/2026 (3e lot)

**Actions manuelles dans le classeur (avant déploiement)**
- Onglet **Produits** : ajouter l'en-tête « Prix de revente maximal » en colonne **AF** (32).
- Onglet **SAV** : ajouter l'en-tête « BonColissimo » en colonne **AB** (28).

**Admin**
- **Nouvelle commande** saisie à la main : assistant en 5 étapes comme la création de structure
  (Structure avec recherche → Produits avec prix et montant estimé → Personnes accompagnées & mode
  de livraison & échéance/urgence & responsable → Moyen/statut de paiement, lien par personne,
  statut de départ, devis demandé, e-mail de confirmation → Récapitulatif modifiable).
  Côté serveur, la commande manuelle remplit désormais les mêmes colonnes que le portail
  (personnes, date souhaitée, paiement séparé, mode de livraison, responsable — le responsable
  tombait auparavant dans la colonne du mode de livraison) ; la date n'est plus source d'erreur ;
  une structure Projets peut commander au-delà du stock.
- **Modale flotte dépôt-vente** : ~90 % de la largeur de l'écran. Bouton « Gérer la flotte »
  centré verticalement.
- **Produit** : champ « Prix de revente maximal » (facultatif, ex. Relais Numériques) qui plafonne
  les tarifs de revente fixés par les structures.
- **Fiche structure** : statuts SAV en couleur (comme les commandes) ; icône sur « Rapport d'impact ».
- **SAV** : un seul passeport (rouge) avec le numéro de série dedans (copiable) ; à l'étape
  Colissimo, lien de suivi + dépôt du **bon Colissimo (PDF)**, visible ensuite dans le suivi SAV
  de la structure et de la personne.
- **Nouveau devis** : alignement des éléments corrigé.
- Libellés « RN » → **RNum** (types, tarifs, moyen de paiement « Virement (RNum uniquement) »).

**Portail**
- **Ma flotte** : onglet Comptabilité calé à droite (Liste / Fiches à gauche) ; même largeur en
  liste et en fiches ; badges de numéro de série de même longueur, numéro centré.
- **Prix de revente** : les structures payantes voient le prix (colonne Prix, ligne Prix des
  fiches) ; les flottes gérées dans la plateforme (dont BO partenaires) ont « € Tarifs de revente »
  pour fixer un tarif personnalisé par produit, plafonné par le prix de revente maximal.
- **Modale personne (flotte)** : bouton « Enregistrer » à la place d'« Annuler » ; rien n'est envoyé
  avant l'enregistrement (prénom + NOM et dates vérifiés).
- **Suivi des commandes** : plusieurs liens de paiement (un par personne) ou plusieurs colis →
  un seul bouton qui ouvre une modale listant chaque lien avec son bouton ; personnes accompagnées
  avec l'illustration habituelle et le numéro de série associé quand il est connu.
- Front : `app.js?v=84`, `admin-unifie.css?v=35` (autres fichiers inchangés : `portail-ui.js?v=21`,
  `cvdl-ui.css?v=30`, `cvdl-ui.js?v=10`).

## Retours du 28/09/2026 (2e lot)

**Admin**
- **Mode de livraison** (fiche commande) : trois cartes illustrées (Colissimo, Livraison Emmaüs
  Connect, Retrait) avec une ligne d'explication et une case cochée, à la place des petits boutons.
- **Barre latérale** plus compacte : les tailles suivent la hauteur de la fenêtre, tout tient en
  1080p, 900p et presque en 768p (défilement discret en dernier recours).
- **Bandeau « À traiter en priorité »** : formes aux couleurs de la charte qui dérivent doucement,
  reflet lumineux qui passe, éclair qui « pulse » (désactivé si l'animation réduite est demandée).
- **Programmes de distribution** : cartes refaites — anneau d'avancement (livré / engagé), nom et
  financeur, période, 4 chiffres (livrés, engagés, à distribuer, objectif), 3 produits max avec
  barre, puis périmètre, mode de rattachement, J-x et rythme en pied de carte.
- **Flotte d'une structure (dépôt-vente)** : la modale affiche désormais la page flotte de la
  structure elle-même (même design, mêmes vues et outils), moins large que la page plein écran ;
  stock / réassort / alertes restent en en-tête. Le stock est rafraîchi à la fermeture.

**Portail**
- **Boutons « ← Portail / Retour »** : toujours au même endroit, dans l'en-tête à droite du logo,
  sur toutes les pages (icône seule sur mobile). La frise d'étapes (commande, SAV) occupe
  maintenant toute la ligne et n'est plus décalée par le bouton.
- **Copie d'un numéro de série** : retour visuel court (halo vert 0,6 s + coche), le survol reste actif.
- **Suivi des commandes** : infos rangées en 3 blocs — Livraison (mode + date), Paiement (montant,
  statut, moyen, bouton Régler), Responsable. Accordéon numéros de série / personnes inchangé.
- **Ma flotte** : onglets d'affichage Liste / Fiches / Comptabilité en grand, sur leur propre
  ligne, distincts des filtres (« Statut ») et des tris (« Trier ») ; fiches refaites (produit +
  date, n° de série + statut, marque · modèle · catégorie côte à côte, personne / lieu / paiement,
  bordure colorée selon le statut, alerte en pastille) ; en vue Liste, marque · modèle · catégorie
  sur une seule ligne sous le nom du produit.
- **Statistiques de la flotte** : tuiles illustrées, anneaux en SVG au style de la charte (par statut
  et par produit) avec légende à barres.
- Les structures en **dépôt-vente** ont l'interface de flotte « plateforme » (statuts Remis / SAV / D3E).
- Front : `app.js?v=83`, `admin-unifie.css?v=34`, `portail-ui.js?v=21`, `cvdl-ui.css?v=30`, `cvdl-ui.js?v=10`.

## Retours du 28/09/2026

**Admin — visuel**
- **Calendrier** : refait au design du calendrier « Livraisons » du tableau de bord — grandes
  cases arrondies, repères colorés (livrée = point vert, prévue = carré ambre, programme =
  losange violet, factures mensuelles = rond magenta), filtres avec compteurs, jour choisi et
  « 30 prochains jours » dans un panneau à droite, événements en cartes (icône, sous-titre, état).
- **Menu** : l'alternance turquoise / magenta des icônes est garantie quel que soit le dessin
  (Distribution et Calendrier cassaient l'alternance) — même teinte dans l'en-tête de la page.
- **Pastille d'état** (bas à droite) environ deux fois plus grande.
- **Badges garantie** (SAV, commandes, passeport) : pastille teintée vert / ambre / rouge avec son
  repère de forme, qui passe à la ligne au lieu d'être tronquée (règles CSS en conflit supprimées).
- **Cartes SAV** : l'anneau d'avancement est dessiné en SVG (traits nets au survol, plus de
  « vibration » des contours), léger zoom de l'illustration au survol.
- **Dossier SAV** : chaque colonne défile de nouveau (le bas de la fiche était coupé).
- **Annuler un devis / une facture** : un seul pictogramme (celui refait), plus de doublon.

**Création / modification d'une structure : assistant en 6 étapes**
- Type (cartes expliquant tarif, paiement, documents, flotte) → Identité → Contacts →
  Commandes & paiement (moyens de paiement expliqués un par un pour les BO ; explication du
  paiement imposé / fixé / absent pour les autres types) → Options → Récapitulatif (chaque bloc
  « Modifier »). Vérification à chaque étape en création ; en modification, toutes les étapes
  sont accessibles et « Enregistrer » est disponible partout (seuls les champs modifiés sont envoyés).
- **Code d'accès** : « Générer un code » (recommandé) ou « Choisir mon code » (mot de passe libre)
  avec indicateur de robustesse et recommandation ; en modification, possibilité de saisir un
  nouveau code (confirmation, l'ancien cesse de fonctionner).
- **Lien vers la convention** (facultatif) — bouton « Convention » sur la fiche 360° ; aussi
  dans la création / modification d'une structure partenaire côté portail Interne.

**Dépôt-vente** (nouvelle option de structure, quel que soit son type)
- Sa flotte est gérée dans la plateforme (feuille FlotteInterne) et **aussi depuis l'admin** :
  section « Dépôt-vente » de l'onglet Stock (stock restant par structure, barre depuis le dernier
  réassort), pastille « Dépôt-vente · N » dans la liste des structures, bloc sur la fiche 360°.
- Modale « Flotte » : appareils livrés ajoutés automatiquement à l'ouverture, filtres
  (en stock, + de 2 mois, remis, SAV), recherche, modification en direct du statut, de la
  personne, de la date de vente et du lieu de stockage — répercutée aussitôt chez la structure.
- **Alertes** dans le fil des priorités / la cloche : appareil en stock depuis 2 mois ou plus,
  stock divisé par deux depuis le dernier réassort. E-mail à l'adresse d'alerte via la tâche
  planifiée `/taches/depot-vente-alertes` (une seule fois par alerte).
- Back : `src/routes/depotVente.js` (`/depot-vente-etat`, `/taches/depot-vente-alertes`),
  `src/regles/depotVente.js` (règles pures, testées), `flotteCentralisee` étendu au dépôt-vente,
  `flotte-lister-admin` accepte `synchroniser=oui`.

**Tarifs personnalisés** (portail Interne)
- Interrupteur **« Remplacer le produit de base dans le formulaire »** à la création et sur chaque
  tarif : les structures concernées ne voient plus le produit d'origine, le tarif prend sa place
  (même rang). Un tarif masqué ne remplace rien.

**Portail**
- Choix du moyen de paiement : case cochée turquoise + trait plein + fond teinté + « Sélectionné »,
  les autres choix s'effacent (même repère que la sélection d'un produit) ; idem pour le choix
  « un règlement par personne ».
- Toutes les modales du portail ont une croix de fermeture (collée en haut, reste visible au
  défilement) et se ferment avec Échap.
- Clé de l'écran de connexion structure un peu plus grande.

**Actions manuelles (Sheets)**
- Classeur principal, onglet **Structures** : en-têtes **« Dépôt-vente »** en colonne **X** (24)
  et **« Convention »** en colonne **Y** (25).
- Classeur principal, onglet **Produits** : en-têtes **« Produit de base »** en colonne **AD** (30)
  et **« Remplace le produit de base »** en colonne **AE** (31).
- Cloud Scheduler (facultatif, pour les e-mails) : appeler chaque jour
  `…/cvdl-api?action=taches/depot-vente-alertes&cle=<CLE_TACHES_PLANIFIEES>`.
- Front : `app.js?v=82`, `admin-unifie.css?v=33`, `portail-ui.js?v=20`, `cvdl-ui.css?v=29`.

## Programmes de distribution

- **Objectif global** (tous produits confondus) à la création d'un programme, en plus ou à la
  place des objectifs par produit. Avec un objectif global, une ligne produit sans quantité limite
  seulement les produits comptés ; sans ligne, tous les produits comptent. Affichage : barre
  « Total » puis détail par produit. Nouvelle colonne **M « Objectif global »** de l'onglet
  ProgrammesDistribution (en-tête écrit automatiquement au premier enregistrement).

- **Nouvel onglet admin « Distribution »** : programmes avec période (début → date butoir),
  financeur, référence, périmètre (régions analytiques, départements, types de structure ou
  liste précise de structures), objectifs par produit, points d'étape. Cartes avec barres
  livré / engagé / reste, alerte de rythme (« En retard : ~X/sem. à livrer ») et projection.
- **Détail d'un programme** : avancement, commandes rattachées, répartition par département
  et par structure, points d'étape, export CSV, archivage, lien de commande dédié (mode « lien »).
- **Rattachement par produit** (un produit compte pour un seul programme) — 3 modes :
  « Proposé à la livraison » (question Oui/Non dans l'étape « Confirmer la livraison », qui bloque
  « Marquer livrée » tant qu'elle n'a pas de réponse), « Automatique », « Lien dédié »
  (`commande.html?programme=ID`). Une structure peut être liée à des programmes depuis sa fiche :
  ses commandes y sont rattachées d'office. Le rattachement auto est figé au passage « Livrée ».
- **Onglet « Calendrier »** global : livraisons prévues / effectuées, débuts, points d'étape et
  dates butoir des programmes, envois des factures mensuelles ; filtres + 30 prochains jours.
- **Statistiques** : filtres programme / région / département / type de structure appliqués à
  toutes les stats ; section programmes (tuiles, courbe livré vs trajectoire, par département,
  tableau comparatif).
- Back : `src/distributions.js` (logique pure, testée), `src/routes/distributions.js`
  (`/distributions`, `/distribution-enregistrer`, `/distribution-archiver`, `/commande-programmes`),
  prérequis « programme » dans `regles/prerequis.js`.

**Actions manuelles**
- Classeur actif, onglet **Commandes** : ajouter l'en-tête **« Programmes »** en colonne **AL** (38).
- Classeur principal, onglet **Structures** : ajouter l'en-tête **« Programmes »** en colonne **W** (23).
- L'onglet **ProgrammesDistribution** est créé automatiquement dans le classeur principal au
  premier enregistrement.
- Les anciennes routes GrandesDistributions / LotsDistribution ne sont plus utilisées par le front.

## Portail structure

- **Portail structure** : « Ma flotte » sort de « Aller plus loin » et passe sur la même rangée
  que « Notre impact » — flotte à gauche sur 3 colonnes, impact en carte compacte sur 1 colonne
  (empilés sur mobile).
