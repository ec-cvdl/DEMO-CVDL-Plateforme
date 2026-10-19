/* Admin CVDL — onglet « Projet » : rétroplanning, journal des mises à jour et démarche. Le
   contenu est projet.html (pages/projet.js, projet-a-faire.js, projet-comprendre.js), affiché dans un cadre : ses
   styles et son outil de planning restent isolés du reste de l'admin. Même origine et même
   onglet : le cadre reprend la session admin (jeton de sessionStorage). */
function vueProjet() {
  // Pas de titre ici : le contenu du cadre a le sien, avec le bouton « Mode édition ».
  return '<iframe id="pj-cadre" class="pj-cadre-admin" src="projet.html?v=17" allow="fullscreen" title="Projet : rétroplanning, journal, à faire et Comprendre CVDL"></iframe>';
}
