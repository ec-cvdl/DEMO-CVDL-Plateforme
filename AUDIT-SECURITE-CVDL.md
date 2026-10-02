# Audit sécurité CVDL

28/09/2026 — mis à jour le 29/09/2026

L'audit a trouvé 8 failles critiques, dont 5 exploitables sans aucun identifiant. Toutes sont corrigées dans la livraison du 28/09, qui exige une configuration minimale avant le déploiement ; le jeton de session admin et la fin des partages Drive publics ont suivi le même jour. Il reste surtout à installer le site sur un domaine dédié.

> **Mise à jour du 01/10/2026 (2) — nettoyage.** Le lint a révélé 18 routes qui comparaient
> encore le mot de passe admin directement (avec l'ancienne valeur par défaut en repli) : elles
> étaient couvertes par `securite.js` (refus si la configuration est faible), mais passent
> désormais toutes par `verifierMotDePasse()`. L'admin de secours (copie figée, non maintenue)
> est supprimé, et le front ne contient plus de JavaScript dans les pages HTML.

> **Mise à jour du 01/10/2026 — revue de code humaine.** Le mode Google Sheets est retiré :
> PostgreSQL est le seul stockage des données (carte dans `DONNEES.md` du backend). Le client
> tec.tech est simplifié : URL en variable d'environnement (`TECTECH_URL`, plus modifiable depuis
> l'admin), token en mémoire. Restent signalés par la revue : couche d'authentification à
> remplacer par une librairie éprouvée (le mot de passe admin est stocké en clair dans la table
> `config` et réinjecté dans les requêtes par `securite.js`), séparation routes / métier /
> données, versionnement du code (git).

> **Mise à jour du 29/09/2026 — passage sur PostgreSQL.** Avec `STOCKAGE=postgres`, les données
> ne sont plus dans Google Sheets : l'injection de formules ne peut plus se produire côté base (la
> neutralisation reste active pour les fichiers Sheets encore utilisés : flottes des structures,
> numérotation). Dans la liste ci-dessous, « Onglet Config : `ADMIN_PASSWORD` » se fait désormais
> avec `npm run db:initialiser`, et le point « vérifier les cellules commençant par `=` » ne
> concerne que les anciens classeurs. Le mot de passe de la base est dans Secret Manager
> (voir `db/README.md`).

## Synthèse

8 failles critiques, 9 élevées et 14 moyennes ; 26 sont corrigées, 4 en partie et 1 reste à faire (livraisons du 28/09). La cause la plus grave est unique : les champs saisis étaient écrits dans Google Sheets comme des formules, qui pouvaient lire l'onglet Config (mot de passe admin) ou les données de toutes les structures.

| Gravité | Faille | Accès nécessaire à l'attaquant | Statut |
| --- | --- | --- | --- |
| Critique | Injection de formules Sheets (SAV, commande, flotte, lien flotte, listes, structures partenaires) : lecture du mot de passe admin, des codes et des données personnelles | Aucun (formulaire SAV public) | Corrigé |
| Critique | API `/api/v1` ouverte par défaut : toutes les commandes, avec les codes structure | Aucun | Corrigé |
| Critique | Catalogue modifiable ou supprimable (prix à 0, produits masqués) via les routes de tarifs partenaires | Aucun | Corrigé |
| Critique | Lien vidéo du SAV en `javascript:` exécuté chez l'admin au clic | Aucun | Corrigé |
| Critique | Mot de passe admin par défaut connu (dans le code) ou vide accepté si Config mal remplie | Aucun | Corrigé |
| Critique | Liaison de flotte vers n'importe quel classeur partagé avec le compte de service (lecture/écriture de la flotte d'une autre structure) | Un code structure | Corrigé |
| Critique | Adresse de l'API remplaçable via le stockage du navigateur : tous les appels admin, mot de passe compris, détournés | Une faille XSS sur le site | Corrigé |
| Critique | Réinitialisation « mode démo » disponible en production : efface toutes les données | Le mot de passe admin | Corrigé |
| Élevée | Force brute du mot de passe admin sans limite (hors écran de connexion) | Aucun | Corrigé |
| Élevée | Codes structure devinables (choisis à la main), essais illimités | Aucun | Partiel |
| Élevée | Mot de passe admin dans les URL (journaux Cloud Run, historique, liens passeport) | Accès aux journaux ou au poste | Corrigé |
| Élevée | Mot de passe admin conservé en clair dans le navigateur (sessionStorage) | Une faille XSS | Corrigé |
| Élevée | Tarifs dédiés d'une structure visibles et commandables par les autres | Un code structure | Corrigé |
| Élevée | Documents Drive (factures, bons, attestations avec date de naissance, photos) partagés « toute personne disposant du lien », sans expiration | Le lien (mail transféré) | Corrigé |
| Élevée | Dépôt de fichiers public sans contrôle (type, taille) dans le Drive | Aucun | Corrigé |
| Élevée | Envois publics sans limite : quotas Gmail, Sheets et tec.tech épuisables, classeur saturé par l'analytique | Aucun | Corrigé |
| Élevée | Site sur `ec-cvdl.github.io` : même origine que les autres dépôts de l'organisation (outil d'arbre de décision) | Une faille dans un autre dépôt | À faire |
| Moyenne | Liens des mails de confirmation fournis par le navigateur : hameçonnage signé par l'organisation | Un code structure | Corrigé |
| Moyenne | Plafond de quantité contournable (même produit sur plusieurs lignes) | Un code structure | Corrigé |
| Moyenne | Conditions de course sur le stock et les références (survente, références en double) | Aucun | Corrigé |
| Moyenne | Valeurs non échappées dans les modèles HTML (devis, factures, bons, attestations) | Un code structure | Corrigé |
| Moyenne | Suivi SAV public par numéro de série (photo, bon Colissimo avec adresse) | Un numéro de série | Corrigé |
| Moyenne | Passeport : donateurs tec.tech visibles par une ESN/Interne pour n'importe quel numéro | Un code ESN/Interne | Corrigé |
| Moyenne | Lien de paiement retrouvable en énumérant les références de commande | Aucun | Partiel |
| Moyenne | Adresse tec.tech modifiable depuis les Réglages : vol du secret client | Le mot de passe admin | Corrigé |
| Moyenne | Classeur actif et dossier Drive redirigeables vers un classeur externe | Le mot de passe admin | Corrigé |
| Moyenne | Pas de SRI sur la librairie QR (cdnjs), pas de politique CSP | Compromission du CDN | Partiel |
| Moyenne | Enquête de satisfaction remplissable par n'importe qui (référence prévisible) | Aucun | Corrigé |
| Moyenne | Clickjacking de l'admin et du passeport | Un site tiers | Corrigé |
| Moyenne | CORS ouvert à toutes les origines tant que `ORIGINE_AUTORISEE` n'est pas défini | Aucun | Partiel |
| Moyenne | Factures via Brevo : échec d'envoi silencieux mais facture marquée « envoyée » | — (fiabilité) | Corrigé |

Faibles, non traitées : messages d'erreur techniques renvoyés à l'admin, e-mails des destinataires dans les journaux, clé des tâches planifiées dans l'URL, fichier `mail_gmail.js` inutilisé, nom de structure non échappé sur la page de validation logistique.

## Avant la mise en production

Sans les deux premiers points, l'admin reste bloqué (réponse 503) : c'est voulu, le serveur refuse désormais de fonctionner avec un mot de passe faible.

- [ ] Onglet Config : `ADMIN_PASSWORD` d'au moins 12 caractères (20 aléatoires conseillés), jamais réutilisé ailleurs
- [ ] Variable d'environnement `ORIGINE_AUTORISEE` = l'adresse exacte du site public (CORS et liens des mails)
- [ ] Déployer avec `npm run deploy` (une seule instance : les écritures sensibles passent une par une et la limitation des essais est exacte)
- [ ] `CLE_TACHES_PLANIFIEES` d'au moins 16 caractères (sinon les tâches planifiées sont refusées)
- [ ] Ne pas définir `MODE_DEMO_AUTORISE` en production
- [ ] Après la mise en ligne : Réglages → « Retirer les partages publics », une fois
- [ ] Régénérer les codes structure courts ou choisis à la main (bouton « Un autre » : 16 caractères aléatoires)
- [ ] Retirer le partage « Toute personne disposant du lien » des classeurs flotte des structures ; partager seulement avec l'adresse du compte de service
- [ ] Vérifier qu'aucune cellule existante ne contient déjà une formule injectée (rechercher `=` en début de cellule dans Commandes, SAV, Structures, FlotteInterne)
- [ ] Si un outil externe lit l'API `/api/v1` : générer une clé dans Réglages (elle est fermée sans clé)
- [ ] Vérifier dans les journaux Cloud Run que l'IP cliente est bien la dernière valeur de X-Forwarded-For (sinon ajuster `trust proxy`)
- [ ] Facultatif : `JETON_SECRET` (secret aléatoire) pour signer sessions et liens de fichiers

## Chantiers restants

1. **Domaine dédié** (seul point « à faire ») : servir le site sur son propre domaine (CNAME), idéalement l'admin sur un sous-domaine séparé des portails.
2. **CSP plus stricte** : elle est en place, mais tolère encore les scripts écrits dans les pages ; les sortir dans des fichiers permettrait de l'interdire.
3. **Lien de paiement** : signé par le serveur plutôt que construit à partir de la référence (aujourd'hui limité à 60 essais par heure).
4. **Codes structure existants** : régénérer ceux qui sont courts ou choisis à la main (les nouveaux codes partenaires font 12 caractères minimum).
5. **Journaux** : masquer les e-mails des destinataires dans les journaux d'envoi.

## Flotte : accéder aux données sans les héberger

À implémenter plus tard (décision du 28/09 : garder la piste, ne pas la développer maintenant).

Proposition : séparer les deux moitiés de la flotte. CVDL garde seulement l'appareil (numéro de série, modèle, statut, garantie), sans nom ; qui a quel appareil reste dans un classeur appartenant à la structure, que seul son navigateur lit.

```
 CVDL (serveur)                         Structure (son propre Google Drive)
 ─────────────────────────              ───────────────────────────────────
 Appareil : n° de série, modèle,        Classeur « Personnes » :
 statut, garantie — SANS nom            n° de série ↔ nom, date de naissance
            │                                        │
            └──────────── assemblés par n° de série ─┘
                  dans le navigateur de la personne connectée
```

Le serveur n'a aucun accès au classeur « Personnes » : la jonction se fait dans le navigateur de la personne connectée.

**Comment ça marche**

1. La structure crée (ou copie depuis un modèle) un classeur « Personnes » dans son propre Google Drive.
2. Sur le portail, un bouton « Connecter mon classeur » ouvre la connexion Google de la structure, avec le droit le plus étroit (`drive.file` : uniquement le fichier choisi dans le sélecteur Google).
3. Le navigateur lit et écrit ce classeur directement chez Google, reçoit les appareils sans nom depuis le serveur CVDL, et assemble les deux par numéro de série.
4. Les attestations (nom, date de naissance) sont générées en PDF dans le navigateur, sans passer par le serveur ni par Drive CVDL.

**Ce que ça change pour Emmaüs Connect**

- Aucun nom ni date de naissance de la flotte ne transite ni ne reste chez CVDL : ni classeur, ni journaux, ni copie Drive.
- Le compte de service CVDL n'a plus accès aux classeurs des structures (fin des partages « éditeur » actuels).
- La structure reste propriétaire et responsable de ses données ; CVDL fournit l'outil. À valider avec le DPO ou un juriste : je ne suis pas juriste, et la qualification exacte (éditeur de logiciel vs sous-traitant) dépend du contrat et des accès réels.

**Ce qu'il faut**

- Un identifiant client OAuth Google (projet Cloud existant) et l'API Google Picker ; le droit `drive.file` est classé non sensible, la validation de l'écran de consentement est légère.
- Front : connexion Google, sélecteur, lecture et écriture du classeur, génération PDF côté navigateur. Back : retirer les colonnes nominatives de FlotteInterne et la lecture des classeurs externes.
- Une migration : exporter les noms actuels vers le classeur de chaque structure, puis les effacer côté CVDL.

**Limites**

- Chaque personne qui consulte la flotte doit pouvoir se connecter au compte Google qui a accès au classeur. Pour une structure sans Google, variante : un fichier Excel ou CSV ouvert localement dans le navigateur, jamais envoyé.
- L'admin CVDL ne voit plus les noms (c'est le but) : le support se fait sur le numéro de série.
- Les personnes saisies dans les commandes des structures BO (attestations) sont une autre donnée, que CVDL traite aujourd'hui ; le même principe peut s'y appliquer ensuite.

## Plus tard : noms des personnes BO et Salesforce

Les noms saisis dans les commandes BO servent aux futures saisies Salesforce, notamment pour la garantie : Emmaüs Connect en est donc responsable, mais CVDL peut ne les garder que le temps du transit.

1. **Purge après saisie** : un bouton « Saisie Salesforce faite » sur la commande BO efface noms et dates de naissance dans CVDL et ne garde que l'identifiant Salesforce de chaque personne.
2. **Envoi automatique, ensuite** : les noms partent vers Salesforce par son API à la commande, sans jamais être stockés dans le classeur CVDL.
3. **Minimiser** : pour la garantie, l'appareil (numéro de série + date d'achat) suffit souvent ; ne pas pousser la date de naissance dans Salesforce si elle ne sert qu'aux attestations.
4. **Cadrage avec le DPO** : finalité et durée de conservation au registre, mention d'information sur le bon d'orientation ou l'attestation, clause avec les structures BO qui collectent pour le compte d'Emmaüs Connect.

Ce chantier et la séparation de la flotte (section précédente) peuvent se faire ensemble : le même bouton de purge couvre les attestations générées depuis les commandes BO.
