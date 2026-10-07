/* Fonctions communes aux pages publiques. Chargé après api.js, avant pages/<page>.js. */
const $ = (id) => document.getElementById(id);

/** Texte sûr à insérer dans du HTML (contenu ou attribut). */
function echapper(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

/** Lecture : GET avec les paramètres dans l'adresse. */
function jsonp(params) {
  return fetch(API + '?' + new URLSearchParams(params)).then((r) => r.json());
}

/** Écriture : POST en text/plain (pas de requête préalable CORS). */
function poster(data) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

/** « 2026-10-07 » → « 07/10/2026 » ; '' si la date est incomplète. */
function isoVersDateFr(iso) {
  if (!iso) return '';
  const [a, m, j] = iso.split('-');
  if (!a || !m || !j) return '';
  return `${j}/${m}/${a}`;
}

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    montant,
  );
}
