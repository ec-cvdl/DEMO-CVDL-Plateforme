/* Espace bénéficiaires fermé (admin → Réglages → Périmètre du lancement) : renvoi vers le portail
   structure. Page masquée le temps de la réponse ; affichée si l'API ne répond pas. */
(function () {
  var racine = document.documentElement;
  var montrer = function () {
    racine.style.visibility = '';
  };
  racine.style.visibility = 'hidden';
  setTimeout(montrer, 3000);
  fetch(API + '?action=perimetre')
    .then(function (r) {
      return r.json();
    })
    .then(function (p) {
      if (p && p.ok && !p.beneficiaires) location.replace('portail-structure.html');
      else montrer();
    })
    .catch(montrer);
})();
