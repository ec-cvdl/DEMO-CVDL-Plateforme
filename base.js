/* Fonctions de base, chargées en premier sur toutes les pages (juste après anti-cadre.js) et
   utilisées par tous les autres scripts : admin, pages publiques et modules autonomes. */

/** Élément de la page par son id. */
function $(id) {
  return document.getElementById(id);
}

/** Texte sûr à insérer dans du HTML (contenu ou attribut). */
function echapper(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
