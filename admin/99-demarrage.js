/* Démarrage de l'admin — chargé APRÈS tous les autres scripts de l'admin (admin.html),
   pour que toutes les fonctions soient définies avant le premier rendu. */
render();
majLabelTheme();
majLabelStyle();
majLabelLargeur();
decorerElementsUnifies(document.body);
// Reconnexion silencieuse si un mot de passe a déjà été saisi dans cet onglet — sans ça,
// n'importe quel rechargement de page (F5, lien externe...) redemandait le mot de passe, chose
// que les pages publiques n'imposent jamais une fois identifié.
(async () => {
  let mdpStocke = '';
  try {
    mdpStocke = sessionStorage.getItem('cvdl-admin-jeton') || '';
    sessionStorage.removeItem('cvdl-admin-password');
  } catch (e) {}
  preparerGoogleAdmin(!mdpStocke);
  if (!mdpStocke) return;
  await connecter(mdpStocke); // le jeton est renouvelé à chaque reconnexion
})();
