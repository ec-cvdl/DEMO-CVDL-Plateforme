/* Admin CVDL — utilitaires, appels API, session. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */

/** Lien sûr pour un href : seulement http(s), mailto, un chemin relatif ou un document généré en data: (PDF/HTML) —
 *  tout le reste (javascript:, data:text/html…) est remplacé par « # ». */
function urlSure(u) {
  const v = String(u == null ? '' : u).trim();
  if (!v) return '#';
  if (/^(https?:|mailto:)/i.test(v) || /^data:(application\/pdf|text\/html)[;,]/i.test(v)) return v;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^\/\//.test(v)) return v; // relatif (même site)
  return '#';
}
/**
 * Le mot de passe admin passe dans l'en-tête X-CVDL-Admin, jamais dans l'URL (encodé : un
 * en-tête HTTP n'accepte pas tous les caractères).
 */
function enteteAdmin(mdp) {
  return mdp ? { 'X-CVDL-Admin': encodeURIComponent(mdp) } : {};
}
function jsonp(params) {
  const p = { ...params };
  const mdp = p.password;
  delete p.password;
  return fetch(API + '?' + new URLSearchParams(p), { headers: enteteAdmin(mdp) })
    .then((r) => r.json())
    .then(verifierSession);
}
/** Session admin expirée (jeton de plus de 12 h, ou mot de passe changé) : retour à l'écran de connexion. */
function verifierSession(r) {
  if (r && r.sessionExpiree) {
    try {
      sessionStorage.removeItem('cvdl-admin-jeton');
    } catch (e) {}
    if (!verifierSession.enCours) {
      verifierSession.enCours = true;
      location.reload();
    }
  }
  return r;
}
function poster(data) {
  const d = { ...data };
  const mdp = d.password || motDePasse;
  delete d.password;
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', ...enteteAdmin(mdp) },
    body: JSON.stringify(d),
  })
    .then((r) => r.json())
    .then(verifierSession);
}
/** Emballe poster() avec la pastille d'état : spinner pendant l'appel, succès/erreur ensuite.
 *  Utilisé pour toute action d'écriture déclenchée par une saisie utilisateur. */
async function posterEtat(donnees, libelleEnCours, libelleSucces) {
  etat(libelleEnCours || 'Enregistrement…', 'chargement');
  try {
    const r = await poster(donnees);
    if (r && r.ok) etat(libelleSucces || 'Enregistré', 'succes');
    else etat((r && r.erreur) || 'Enregistrement impossible', 'erreur');
    return r;
  } catch (e) {
    etat('Enregistrement impossible', 'erreur');
    return { ok: false };
  }
}
function $(id) {
  return document.getElementById(id);
}
function echapper(v) {
  return String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

/** Pastille d'état en bas à droite (chargement / succès / erreur) — 'chargement' reste
 *  affichée tant qu'elle n'est pas remplacée, les deux autres se referment seules. */
let rpEtatTimer = null;
function etat(message, type, duree) {
  const zone = $('rp-etat');
  if (!zone) return;
  clearTimeout(rpEtatTimer);
  zone.className = `rp-etat rp-etat-visible${type === 'succes' ? ' rp-etat-succes' : type === 'erreur' ? ' rp-etat-erreur' : ''}`;
  zone.innerHTML = `${type === 'chargement' ? '<span class="rp-spin"></span>' : type === 'succes' ? icon('check', 21) : type === 'erreur' ? icon('alert', 21) : ''}<span>${echapper(message)}</span>`;
  if (type !== 'chargement') rpEtatTimer = setTimeout(() => zone.classList.remove('rp-etat-visible'), duree || 2600);
}

let motDePasse = '';
