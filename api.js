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
