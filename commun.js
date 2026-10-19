/* Fonctions communes aux pages publiques (`$` et `echapper` : base.js). Chargé après api.js,
   avant pages/<page>.js. */

/** Lecture : GET sur la route `params.action`, les autres paramètres dans l'adresse. */
function lireApi(params) {
  return appelApi(params).then(controlerSession);
}

/** Écriture : POST JSON sur la route `data.action`. */
function poster(data) {
  return appelApi(data, { methode: 'POST' }).then(controlerSession);
}

/** « 2026-10-07 » → « 07/10/2026 » ; '' si la date est incomplète. */
function isoVersDateFr(iso) {
  if (!iso) return '';
  const [a, m, j] = iso.split('-');
  if (!a || !m || !j) return '';
  return `${j}/${m}/${a}`;
}

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    montant,
  );
}

/* ── Session structure ──
   Le code structure (ou un jeton qui le remplace : j3 conseiller, j4 « Rester connecté », j6
   personne connectée par e-mail) est
   gardé pour l'onglet dans sessionStorage « cvdl-code-structure ». « Rester connecté sur cet
   appareil » (j4) et la connexion par e-mail (j6) gardent en plus le jeton dans localStorage,
   repris à l'ouverture d'un nouvel onglet jusqu'à son expiration (fixée par le serveur : 30 ou
   90 jours, prolongée à chaque visite pour j6). Lié à l'API qui l'a émis (production ou démo). */
const CLE_SESSION_STRUCTURE = 'cvdl-session-structure';

/** Mémorise le jeton j4 ou j6 sur cet appareil pour `jours` jours. */
function garderSessionStructure(jeton, jours) {
  try {
    localStorage.setItem(
      CLE_SESSION_STRUCTURE,
      JSON.stringify({ jeton, api: API, jusqua: Date.now() + jours * 864e5 }),
    );
  } catch (e) {}
}

/** Jeton à la place du code (j3 conseiller, j4 connexion mémorisée, j6 personne) : jamais affiché. */
const estJetonAcces = (code) => /^j[346]\./.test(String(code || ''));

/** Connexion mémorisée refusée par le serveur (expirée, code changé) : oubliée sur l'appareil. */
function controlerSession(r) {
  try {
    if (r && r.sessionExpiree && /^j[46]\./.test(sessionStorage.getItem('cvdl-code-structure') || ''))
      oublierCodeStructure();
  } catch (e) {}
  return r;
}

/** Déconnexion (ou code refusé) : oublie le code de l'onglet et la connexion mémorisée. */
function oublierCodeStructure() {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
    localStorage.removeItem(CLE_SESSION_STRUCTURE);
  } catch (e) {}
}

/** Connexion mémorisée sur cet appareil et encore valable : { jusqua } ; sinon null. */
function sessionStructureMemorisee() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE_SESSION_STRUCTURE) || 'null');
    if (d && d.api === API && d.jusqua > Date.now() && d.jeton) return d;
  } catch (e) {}
  return null;
}

// Nouvel onglet : reprend la connexion mémorisée ; structure déjà identifiée → l'écran de saisie
// du code est masqué dès le rendu (html.deja-identifie).
try {
  if (!sessionStorage.getItem('cvdl-code-structure')) {
    const d = sessionStructureMemorisee();
    if (d) sessionStorage.setItem('cvdl-code-structure', d.jeton);
  }
  if (sessionStorage.getItem('cvdl-code-structure')) document.documentElement.classList.add('deja-identifie');
} catch (e) {}
