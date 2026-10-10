# Mettre le site en ligne (Cloud Run, projet Google Cloud `cvdl-plateforme`)

Le site est statique : rien à construire. `Dockerfile` copie les fichiers dans un petit serveur
nginx (`nginx.conf` : en-têtes de sécurité, cache, fichiers cachés jamais servis), sans les
outils de développement, `CLAUDE.md` ni l'audit de sécurité. Même console et même région que
l'API (`europe-west1`). Adresse : `https://cvdl-front-163575456908.europe-west1.run.app` (affichée à la fin du
déploiement ; un domaine pourra être branché plus tard sans rien changer au site).

## Publier

Habituellement : déposer le zip du front dans le dossier `depot` du bucket
`cvdl-plateforme-deploiement` (console Cloud Storage) — Cloud Build le publie tout seul (mode
d'emploi et installation : `deploiement/README.md` du back).

À la main (Cloud Shell, depuis le dossier du front) :

```bash
gcloud run deploy cvdl-front --source . --region europe-west1 --allow-unauthenticated --project cvdl-plateforme
```

Retour arrière : console Cloud Run → `cvdl-front` → Révisions → diriger le trafic vers la
précédente.

## Une seule fois, après la première publication

1. **API (CORS)** — n'accepter que le site (adresses séparées par des virgules ; le `^@^`
   empêche gcloud de couper la valeur aux virgules) :
   `npm run deploy -- --update-env-vars='^@^ORIGINE_AUTORISEE=https://cvdl-front-163575456908.europe-west1.run.app,https://ec-cvdl.github.io'`
   depuis le dossier du back (garder GitHub tant que l'ancien site sert encore).
2. **Admin → Réglages → Adresse publique du site** : l'adresse `run.app` (liens des e-mails,
   QR codes).
3. **Connexion Google** (console → API et services → Identifiants → l'ID client OAuth) :
   ajouter l'adresse `run.app` aux « Origines JavaScript autorisées ».

## Cache

Pages HTML et `CHANGELOG-CVDL.md` : relus à chaque visite. Scripts et styles : gardés un jour,
d'où le `?v=N` à incrémenter à chaque modification (règle du dépôt). Images : une semaine.
