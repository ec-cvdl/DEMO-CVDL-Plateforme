/* Structure déjà identifiée dans cet onglet : masque l'écran de saisie du code dès le rendu. */
try {
  if (sessionStorage.getItem('cvdl-code-structure')) document.documentElement.classList.add('deja-identifie');
} catch (e) {}
