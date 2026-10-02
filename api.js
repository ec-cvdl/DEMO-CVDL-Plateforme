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
