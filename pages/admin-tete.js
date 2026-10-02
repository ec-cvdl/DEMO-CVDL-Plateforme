// Décidé avant le rendu du <body> : si un mot de passe est déjà en mémoire pour cet onglet
// (reconnexion silencieuse : admin/99-demarrage.js), on affiche uniquement un spinner — jamais le
// formulaire, même un court instant, le temps que la vérification réponde.
try {
  if (sessionStorage.getItem('cvdl-admin-jeton')) document.documentElement.classList.add('rp-reconnexion');
} catch (e) {}

// Décidé avant le rendu du <body>, comme pour la reconnexion silencieuse plus haut : évite
// un flash clair→sombre au chargement pour qui a déjà choisi le mode sombre.
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
