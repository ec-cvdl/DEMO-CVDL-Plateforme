// Décidé avant le rendu du <body> : si un mot de passe est déjà en mémoire pour cet onglet
// (reconnexion silencieuse, admin/99-demarrage.js), on n'affiche qu'un indicateur de
// chargement, jamais le formulaire.
try {
  if (sessionStorage.getItem('cvdl-admin-jeton')) document.documentElement.classList.add('rp-reconnexion');
} catch (e) {}

// décidé avant le rendu du <body> : pas d'éclair clair → sombre pour qui a choisi le mode sombre
try {
  if (localStorage.getItem('cvdl-theme') === 'dark') document.documentElement.classList.add('rp-dark');
  if (localStorage.getItem('cvdl-noel') === '1') document.documentElement.classList.add('rp-noel');
} catch (e) {}
// Style unifié (admin-unifie.css) actif par défaut ; « ancien » ramène l'ancien style en secours.
try {
  if (localStorage.getItem('cvdl-style') !== 'ancien') document.documentElement.classList.add('rp-unifie');
  if (localStorage.getItem('cvdl-largeur') === 'pleine') document.documentElement.classList.add('rp-pleine');
} catch (e) {
  document.documentElement.classList.add('rp-unifie');
}
