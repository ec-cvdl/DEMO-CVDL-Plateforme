// Décidé avant le rendu du <body> : si un mot de passe est déjà en mémoire pour cet onglet
// (reconnexion silencieuse, admin/99-demarrage.js), on n'affiche qu'un indicateur de
// chargement, jamais le formulaire.
try {
  if (sessionStorage.getItem('cvdl-admin-jeton')) document.documentElement.classList.add('rp-reconnexion');
} catch (e) {}

// Style de l'admin (admin-unifie.css, actif sous html.rp-unifie) et largeur mémorisée.
document.documentElement.classList.add('rp-unifie');
try {
  if (localStorage.getItem('cvdl-largeur') === 'pleine') document.documentElement.classList.add('rp-pleine');
} catch (e) {}
