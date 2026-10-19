/* Adresse de l'API. Les pages servies sous /demo/ (même site, voir nginx.conf) parlent toujours
   à la fonction de démonstration, toutes les autres à la production : aucun repère dans le
   navigateur, la barre d'adresse dit où l'on est. */
const API = (function () {
  var prod = 'https://europe-west1-cvdl-plateforme.cloudfunctions.net/cvdl-api';
  try {
    var dossier = location.pathname.split('/')[1] || '';
    if (/demo/i.test(dossier) && !/\.html$/i.test(dossier)) return prod + '-demo';
  } catch (e) {}
  return prod;
})();

/* Une route de l'API par chemin : `urlApi('suivi', { code })` → `${API}/suivi?code=…`. `base` :
   une autre adresse d'API que celle de la page (accueil, démo). */
function urlApi(route, params, base) {
  var q = params ? new URLSearchParams(params).toString() : '';
  return (base || API) + '/' + encodeURIComponent(route) + (q ? '?' + q : '');
}
/* Appel d'une route : `{ action, …données }` → GET `${API}/${action}?données`, ou POST JSON avec
   `{ methode: 'POST' }`. opts : { methode, entetes, base, keepalive }. Renvoie la réponse JSON
   ({ ok, erreur… }), y compris pour une erreur (statut 4xx). */
function appelApi(donnees, opts) {
  var o = opts || {};
  var reste = Object.assign({}, donnees);
  var route = reste.action;
  delete reste.action;
  var requete =
    o.methode === 'POST'
      ? fetch(urlApi(route, null, o.base), {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, o.entetes),
          body: JSON.stringify(reste),
          keepalive: !!o.keepalive,
        })
      : fetch(urlApi(route, reste, o.base), { headers: o.entetes || {} });
  return requete.then(function (r) {
    return r.json();
  });
}
/* Envoi à la fermeture de la page (navigator.sendBeacon) : en text/plain, seul type envoyé sans
   requête CORS préalable ; le serveur lit le corps en JSON quel que soit son type. */
function baliseApi(donnees, base) {
  var reste = Object.assign({}, donnees);
  var route = reste.action;
  delete reste.action;
  return navigator.sendBeacon(
    urlApi(route, null, base),
    new Blob([JSON.stringify(reste)], { type: 'text/plain;charset=utf-8' }),
  );
}

/* Démo : la plateforme de démonstration s'endort quand personne ne l'utilise. Une requête vers
   elle qui tarde affiche « La démo démarre… » au lieu d'une page qui semble figée (posé ici,
   chargé en premier sur toutes les pages, pour couvrir aussi les premiers appels). */
(function () {
  if (!window.fetch) return;
  var origine = window.fetch.bind(window);
  var enCours = 0;
  var minuteur = null;
  var bandeau = null;
  function montrer() {
    minuteur = null;
    if (!document.body) return;
    bandeau = document.createElement('div');
    bandeau.setAttribute('role', 'status');
    bandeau.textContent = 'La démo démarre, un instant… (jusqu’à une minute la première fois)';
    bandeau.style.cssText =
      'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483000;max-width:calc(100vw - 32px);padding:12px 18px;border:1.5px solid #002743;border-radius:999px;background:#fff;color:#002743;font:600 14px Inter,system-ui,sans-serif;box-shadow:4px 4px 0 rgba(0,39,67,.18)';
    document.body.appendChild(bandeau);
  }
  function fin() {
    enCours--;
    if (enCours) return;
    clearTimeout(minuteur);
    minuteur = null;
    if (bandeau) bandeau.remove();
    bandeau = null;
  }
  window.fetch = function (requete, options) {
    if (String((requete && requete.url) || requete).indexOf('cvdl-api-demo') === -1) return origine(requete, options);
    enCours++;
    if (!minuteur && !bandeau) minuteur = setTimeout(montrer, 4000);
    var p = origine(requete, options);
    p.then(fin, fin);
    return p;
  };
})();

/* Adresse publique d'une page (réglage « Adresse publique du site », sinon l'adresse actuelle),
   pour tout ce qui est imprimé ou envoyé (QR codes, liens à copier) : reste valable si le site
   change d'adresse ou en a plusieurs. Renvoie une promesse. */
var adresseSitePromesse;
var adresseSiteConnue = '';
function urlPublique(page) {
  adresseSitePromesse =
    adresseSitePromesse ||
    appelApi({ action: 'site-public' })
      .then(function (r) {
        adresseSiteConnue = (r && r.ok && r.url) || '';
        return adresseSiteConnue;
      })
      .catch(function () {
        return '';
      });
  return adresseSitePromesse.then(function (base) {
    return base ? base + '/' + page : new URL(page, location.href).href;
  });
}
/** Même chose, tout de suite (pour un affichage) : adresse publique si déjà connue, sinon actuelle. */
function urlPubliqueImmediate(page) {
  urlPublique('');
  return adresseSiteConnue ? adresseSiteConnue + '/' + page : new URL(page, location.href).href;
}
