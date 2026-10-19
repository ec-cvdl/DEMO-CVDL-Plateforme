/* projet.html n'existe plus comme page : c'est le contenu de l'onglet « Projet » de l'admin,
   affiché dans un cadre. Ouverte directement, elle renvoie vers cet onglet. */
(function () {
  if (window.top === window.self) location.replace('admin.html#projet');
  else document.documentElement.classList.add('pj-dans-admin');
})();
