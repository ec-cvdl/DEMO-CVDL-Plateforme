/* Adresse de l'API. Démo : site publié dans un dossier « …demo… » (ex. /cvdl-demo/), ou repère
   posé par demo.html → cvdl-api-demo. */
const API = (function () {
  var prod = 'https://europe-west1-cvdl-plateforme.cloudfunctions.net/cvdl-api';
  try {
    var dossier = location.pathname.split('/')[1] || '';
    if (/demo/i.test(dossier) && !/\.html$/i.test(dossier)) return prod + '-demo';
    var d = JSON.parse(localStorage.getItem('cvdl-mode-demo') || 'null');
    if (d && d.jusqua > Date.now()) return prod + '-demo';
  } catch (e) {}
  return prod;
})();

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
    fetch(API + '?action=site-public')
      .then(function (r) {
        return r.json();
      })
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
