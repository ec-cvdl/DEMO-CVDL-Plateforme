/* ============================================================
   CVDL — app.js
   Réécriture complète, calquée sur maquette/Canvas.dc.html.
   Rien n'est repris des anciens front/js/*.js pour l'affichage :
   seuls le mot de passe, l'URL de l'API et les actions du backend
   (déjà existantes côté serveur) sont réutilisés.

   État d'avancement (branché au fur et à mesure) :
   - Dashboard, Commandes, SAV, Devis/Factures, Structures : lecture
     réelle (données chargées depuis le vrai backend).
   - Changement de statut d'une commande (clic sur une étape dans la
     fiche) : écrit réellement sur le backend.
   - Stock, création de commande/SAV/structure, autres actions
     d'écriture : pas encore branchés (placeholders), à faire dans
     les prochaines passes.
   ============================================================ */

/** Lien sûr pour un href : seulement http(s), mailto, un chemin relatif ou un document généré en data: (PDF/HTML) —
 *  tout le reste (javascript:, data:text/html…) est remplacé par « # ». */
function urlSure(u){
  const v = String(u == null ? '' : u).trim();
  if(!v) return '#';
  if(/^(https?:|mailto:)/i.test(v) || /^data:(application\/pdf|text\/html)[;,]/i.test(v)) return v;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^\/\//.test(v)) return v; // relatif (même site)
  return '#';
}
const API = (function(){ var prod = 'https://europe-west1-cvdl-plateforme.cloudfunctions.net/cvdl-api'; try{ var dossier = location.pathname.split('/')[1] || ''; if(/demo/i.test(dossier) && !/\.html$/i.test(dossier)) return prod + '-demo'; var d = JSON.parse(localStorage.getItem('cvdl-mode-demo') || 'null'); if(d && d.jusqua > Date.now()) return prod + '-demo'; }catch(e){} return prod; })(); // démo : site publié dans un dossier « …demo… » (ex. /cvdl-demo/), ou repère posé par demo.html → cvdl-api-demo
// L'adresse de l'API est fixe : plus aucune substitution libre depuis le localStorage (un script
// malveillant aurait pu y rediriger tous les appels, mot de passe compris). Seule exception : le
// mode démo (demo.html) bascule vers la fonction jumelle « cvdl-api-demo », adresse elle aussi
// écrite en dur ici, jamais lue du stockage — et le bandeau « Mode démo » le signale partout.
function urlApiActive(){ return API; }
/** Le mot de passe admin ne voyage plus dans l'URL (journaux, historique) mais dans l'en-tête
 *  X-CVDL-Admin (encodé : un en-tête HTTP n'accepte pas tous les caractères). */
function enteteAdmin(mdp){ return mdp ? { 'X-CVDL-Admin': encodeURIComponent(mdp) } : {}; }
function jsonp(params){
  const p = { ...params }; const mdp = p.password; delete p.password;
  return fetch(API + '?' + new URLSearchParams(p), { headers: enteteAdmin(mdp) }).then(r => r.json()).then(verifierSession);
}
/** Session admin expirée (jeton de plus de 12 h, ou mot de passe changé) : retour à l'écran de connexion. */
function verifierSession(r){
  if(r && r.sessionExpiree){
    try{ sessionStorage.removeItem('cvdl-admin-jeton'); }catch(e){}
    if(!verifierSession.enCours){ verifierSession.enCours = true; location.reload(); }
  }
  return r;
}
function poster(data){
  const d = { ...data }; const mdp = d.password || motDePasse; delete d.password;
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', ...enteteAdmin(mdp) },
    body: JSON.stringify(d)
  }).then(r => r.json()).then(verifierSession);
}
/** Emballe poster() avec la pastille d'état : spinner pendant l'appel, succès/erreur ensuite.
 *  Utilisé pour toute action d'écriture déclenchée par une saisie utilisateur. */
async function posterEtat(donnees, libelleEnCours, libelleSucces){
  etat(libelleEnCours || 'Enregistrement…', 'chargement');
  try{
    const r = await poster(donnees);
    if(r && r.ok) etat(libelleSucces || 'Enregistré', 'succes');
    else etat((r && r.erreur) || 'Enregistrement impossible', 'erreur');
    return r;
  }catch(e){ etat('Enregistrement impossible', 'erreur'); return { ok:false }; }
}
function $(id){ return document.getElementById(id); }
function echapper(v){
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/** Pastille d'état en bas à droite (chargement / succès / erreur) — 'chargement' reste
 *  affichée tant qu'elle n'est pas remplacée, les deux autres se referment seules. */
let rpEtatTimer = null;
function etat(message, type, duree){
  const zone = $('rp-etat');
  if(!zone) return;
  clearTimeout(rpEtatTimer);
  zone.className = `rp-etat rp-etat-visible${type === 'succes' ? ' rp-etat-succes' : type === 'erreur' ? ' rp-etat-erreur' : ''}`;
  zone.innerHTML = `${type === 'chargement' ? '<span class="rp-spin"></span>' : type === 'succes' ? icon('check', 21) : type === 'erreur' ? icon('alert', 21) : ''}<span>${echapper(message)}</span>`;
  if(type !== 'chargement') rpEtatTimer = setTimeout(() => zone.classList.remove('rp-etat-visible'), duree || 2600);
}

let motDePasse = '';
/** Trajectoires aléatoires pour les formes décoratives du tableau de bord ("À décider
 *  maintenant") — direction, distance et vitesse tirées au sort une seule fois par session
 *  (pas à chaque rendu, sinon les formes changeraient de trajectoire à chaque re-rendu du
 *  tableau de bord). Un vrai tirage aléatoire plutôt qu'un jeu figé de préréglages horizontal/
 *  vertical/diagonal — n'importe quel angle est possible, pas seulement ces 3-là. */
const KPI_FORMES_TRAJECTOIRES = Array.from({ length: 4 }, () => ({
  x0: Math.round(Math.random() * 240 - 120), y0: Math.round(Math.random() * 240 - 120),
  x1: Math.round(Math.random() * 240 - 120), y1: Math.round(Math.random() * 240 - 120),
  duree: (14 + Math.random() * 14).toFixed(1), delai: (-Math.random() * 15).toFixed(1),
}));

/* ── Icônes (mêmes tracés que Canvas.dc.html, portés en SVG statique) ── */
const ICONES = {
  copie: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  calendrier: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  check: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  validation: '<path d="M9 11.5 11 13.5 15 9"/><rect x="3.5" y="4" width="17" height="17" rx="2.5"/><path d="M8 2v3"/><path d="M16 2v3"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="M3.3 7 12 12l8.7-5"/><path d="m7.5 4.27 9 5.15"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  loupe_diagnostic: '<circle cx="10" cy="10" r="6.5"/><path d="m20.5 20.5-4.6-4.6"/><path d="M10 7.2v5.6M7.2 10h5.6" opacity=".6"/>',
  colis_livraison: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8" opacity=".6"/>',
  boite_pieces: '<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 8l3.5-5h11L21 8"/><path d="M9 12h6" opacity=".6"/>',
  reparation_cours: '<path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="4"/>',
  bouclier_garantie: '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z"/><path d="m9 12 2 2 4-4" opacity=".8"/>',
  croix_irreparable: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  building: '<rect x="8" y="2" width="8" height="20" rx="1"/><rect x="3" y="10" width="5" height="12" rx="1"/><rect x="16" y="10" width="5" height="12" rx="1"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  eclair: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r="0.5" fill="currentColor"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M13 16H8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
  package2: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="M3.3 7 12 12l8.7-5"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  stats: '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.42H5.12"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  portable: '<rect x="3" y="4" width="18" height="11" rx="1.3"/><path d="M2 18.5h20l-1.4-3.5H3.4z"/>',
  fixe: '<rect x="4" y="4" width="16" height="11" rx="1.3"/><path d="M9 19h6M12 15v4"/>',
  feuille: '<path d="M4 20c9 0 15-6 16-16C10 5 4 11 4 20Z"/><path d="M6 18C10 12 13 9 20 4"/>',
  sim: '<path d="M7 2h8l4 4v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V3.5A1.5 1.5 0 0 1 6.5 2Z"/><rect x="9" y="9" width="6" height="7" rx="1"/>',
  passeport: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="15" y="15" width="4" height="4" rx="0.8"/>',
  // Ticket/coupon — pour un code de produit dématérialisé (recharge, licence...), volontairement
  // distinct du QR code utilisé pour un numéro de série d'appareil réel (voir "passeport").
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M10 7.5v9" stroke-dasharray="2.2 2.2"/>',
  lien_externe: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  telephone_touches: '<rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8.5" y="5" width="7" height="4" rx="0.6"/><circle cx="9.6" cy="12.5" r="0.9"/><circle cx="12" cy="12.5" r="0.9"/><circle cx="14.4" cy="12.5" r="0.9"/><circle cx="9.6" cy="15.5" r="0.9"/><circle cx="12" cy="15.5" r="0.9"/><circle cx="14.4" cy="15.5" r="0.9"/>',
  telephone: '<rect x="6.5" y="2" width="11" height="20" rx="2.2"/><path d="M11 18.5h2"/>',
  tablette: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M11.5 19h1"/>',
  atelier: '<circle cx="8.5" cy="8" r="3"/><path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M14.7 20c.3-2.7 2.2-4.8 4.8-5.3"/>',
  recharge: '<path d="M9 7V3M15 7V3"/><rect x="6" y="7" width="12" height="7" rx="2"/><path d="M9 14v2a3 3 0 0 0 6 0v-2"/><path d="M12 16v5"/><path d="M9 21h6"/>',
  souris: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v7"/>',
  personne: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 7 9-7"/>',
  bulle: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  refresh: '<path d="M21 3v6h-6" opacity=".9"/><path d="M3 12a9 9 0 0 1 15-6.7L21 9"/><path d="M3 21v-6h6" opacity=".9"/><path d="M21 12a9 9 0 0 1-15 6.7L3 15"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5"/><path d="M12 8h.01"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5 5 14 14"/>',
  remboursement: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5a4 4 0 1 0 0 7"/><path d="M7 10.5h6M7 13.5h5"/>',
  nettoyage: '<path d="M12 2c3 4 6 7.5 6 11.5a6 6 0 1 1-12 0C6 9.5 9 6 12 2Z"/>',
  carte_paiement: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
};
const ICONES_UNIFIE = {
  check: ['', '<path d="M4.5 12.8c1.6 1.3 3 2.8 4.3 4.4C11.5 12.6 15 8.9 19.5 6"/>'],
  wrench: ['<circle cx="16.5" cy="8.5" r="5"/>', '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>'],
  loupe_diagnostic: ['<circle cx="12" cy="12" r="7"/>', '<circle cx="10.5" cy="10.5" r="7"/><path d="m21 21-5.5-5.5M6.5 10.5h2l1-2 1.5 4 1-2h2"/>'],
  boite_pieces: ['<rect x="5" y="9" width="17" height="12" rx="2"/>', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M10 7V4h4v3M8 15h3"/>'],
  colis_livraison: ['<path d="M5 9l8-4 8 4v9l-8 4-8-4z"/>', '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/>'],
  truck: ['<rect x="3.5" y="7.5" width="12.5" height="10" rx="1.5"/>', '<path d="M2 6h12v10H2zM14 9h4l3 3.5V16h-7"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>'],
  reparation_cours: ['<rect x="4" y="6" width="15" height="10.5" rx="2"/>', '<rect x="2.5" y="4.5" width="15" height="10.5" rx="2"/><path d="M6 19h8"/><path d="M21.5 15.8a3 3 0 0 1-3.9 2.9l-2.7 2.7a1 1 0 0 1-1.5-1.5l2.7-2.7a3 3 0 0 1 2.9-3.9l-1.4 1.4.4 1.2 1.2.4z"/>'],
  bouclier_garantie: ['<path d="M13.5 3.5 20.5 6v6c0 5-7 9-7 9s-7-4-7-9V6z"/>', '<path d="M12 2 19 4.5v6c0 5-7 9-7 9s-7-4-7-9v-6z"/><path d="m9 11 2 2 4-4"/>'],
  croix_irreparable: ['<circle cx="13.5" cy="13.5" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>'],
  telephone: ['<rect x="8" y="3.5" width="11" height="18" rx="2.5"/>', '<rect x="6.5" y="2" width="11" height="18" rx="2.5"/><path d="M10.5 16.5h3"/>'],
  personne: ['<circle cx="13.5" cy="9" r="4"/><path d="M6 21.5a7.5 7.5 0 0 1 15 0z"/>', '<circle cx="12" cy="7.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'],
  nettoyage: ['<path d="M13.5 4c3 4 5.5 7 5.5 10.5a5.5 5.5 0 1 1-11 0C8 11 10.5 8 13.5 4z"/>', '<path d="M12 2.5c3 4 5.5 7 5.5 10.5a5.5 5.5 0 1 1-11 0C6.5 9.5 9 6.5 12 2.5z"/><path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5"/>'],
  remboursement: ['<circle cx="13.5" cy="13.5" r="8"/>', '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2a3.2 3.2 0 1 0 0 5.6M8.5 11h5M8.5 13h4.5"/>'],
  ban: ['<circle cx="13.5" cy="13.5" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>'],
  receipt: ['<path d="M7 4h13v17l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5L9 19.5 7 21z"/>', '<path d="M5 2.5h13v17l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5L7 18l-2 1.5z"/><path d="M8.5 7h6M8.5 10.5h6M8.5 14h3.5"/>'],
  file: ['<path d="M7 4h9l4.5 4.5V21H7z"/>', '<path d="M5 2.5h9l4.5 4.5v13.5H5z"/><path d="M14 2.5V7h4.5M8.5 12h6.5M8.5 15.5h4.5"/>'],
  clock: ['<circle cx="13.5" cy="13.5" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
  alert: ['<path d="M13.5 5 22 20H5z"/>', '<path d="M12 3.5 20.5 18.5h-17z"/><path d="M12 9.5v4M12 16.2v.3"/>'],
  inbox: ['<rect x="4.5" y="6" width="17" height="15" rx="2"/>', '<rect x="3" y="4.5" width="17" height="15" rx="2"/><path d="M3 12.5h4.5l1.5 2.5h5l1.5-2.5H20"/>'],
  validation: ['<rect x="5.5" y="5.5" width="16" height="16" rx="3"/>', '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12.5 3 3 5-6"/>'],
  mail: ['<rect x="4.5" y="6.5" width="18" height="13" rx="2"/>', '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m3.5 6 8.5 6.5L20.5 6"/>'],
  eclair: ['<path d="M14.5 3.5 6 14.5h7l-1 7.5 8.5-11h-7z"/>', '<path d="M13 2 4.5 13h7l-1 7.5L19 9.5h-7z"/>'],
  passeport: ['<rect x="6.5" y="4" width="14" height="18" rx="2"/>', '<rect x="5" y="2.5" width="14" height="18" rx="2"/><circle cx="12" cy="9.5" r="3"/><path d="M9 9.5h6M9 15h6M10 17.5h4"/>'],
  package: ['<path d="M5 9l8-4 8 4v9l-8 4-8-4z"/>', '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/>'],
  package2: ['<path d="M5 9l8-4 8 4v9l-8 4-8-4z"/>', '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/>']
};
function icon(name, size){
  size = size || 20;
  if(estUnifie() && ICONES_UNIFIE[name]){
    const [fond, trait] = ICONES_UNIFIE[name];
    return `<svg class="ic-u" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${fond ? `<g class="ic-u-fond" fill="currentColor" stroke="none">${fond}</g>` : ''}<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${trait}</g></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${ICONES[name] || ICONES.package}</svg>`;
}
/** Ouvre le document généré (bon de livraison, devis, facture...) dans un nouvel onglet — un
 *  lien data: ouvert directement en target="_blank"/window.open est bloqué en silence par les
 *  navigateurs récents (Chrome/Edge) : l'onglet s'ouvre une fraction de seconde puis se
 *  referme, sans erreur JS. On le convertit en Blob + URL objet, qui n'est pas concerné par
 *  cette restriction ; un vrai lien (modèle Google Sheets historique) s'ouvre tel quel. */
function ouvrirDocumentGenere(url){
  const correspondance = String(url || '').match(/^data:([^;]+);[^,]*base64,(.+)$/s);
  if(correspondance){
    const octets = atob(correspondance[2]);
    const tampon = new Uint8Array(octets.length);
    for(let i = 0; i < octets.length; i++) tampon[i] = octets.charCodeAt(i);
    const blob = new Blob([tampon], { type: correspondance[1] });
    window.open(URL.createObjectURL(blob), '_blank');
  }else{
    window.open(url, '_blank', 'noopener');
  }
}
/** Transforme un bloc de liens (un par ligne) en pilules cliquables, avec l'icône "lien
 *  externe" — même traitement que dans le suivi de commande public, pour rester cohérent.
 *  `libelles` est soit un libellé unique (répété), soit un tableau (un par lien, ex. noms des
 *  bénéficiaires pour un paiement séparé). */
/** Base commune à pilulesColis()/pilulesPaiement() ci-dessous — un lien (ou plusieurs, un par
 *  ligne) rendu dans la pilule de la couleur/icône demandée. */
function pilulesGenerique(texteLiens, libellePluriel, libelleSingulier, classeCss, nomIcone){
  const liens = String(texteLiens || '').split('\n').map(s => s.trim()).filter(Boolean);
  if(!liens.length) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">${liens.map((l, i) => {
    const libelle = Array.isArray(libellePluriel)
      ? (libellePluriel[i] || `Lien ${i + 1}`)
      : (liens.length > 1 ? `${libellePluriel} ${i + 1}` : (libelleSingulier || libellePluriel));
    return `<a href="${echapper(urlSure(l))}" target="_blank" rel="noopener" class="${classeCss}">${icon(nomIcone, 14)}${echapper(libelle)}<span style="opacity:0.75;font-size:11px">↗</span></a>`;
  }).join('')}</div>`;
}
/** Lien(s) de suivi Colissimo — pilule verte, icône camion. */
function pilulesColis(texteLiens){
  return pilulesGenerique(texteLiens, 'Colis', 'Suivi Colissimo', 'rp-pilule-jaune', 'truck');
}
/** Lien(s) de paiement — pilule bleue, icône carte bancaire. */
function pilulesPaiement(texteLiens, libellePluriel, libelleSingulier){
  return pilulesGenerique(texteLiens, libellePluriel, libelleSingulier, 'rp-pilule-orange', 'carte_paiement');
}
/** Numéro(s) de série confirmé(s) — pastille violette, lien direct vers le passeport numérique
 *  de l'appareil. Design unique dans tout l'admin (récap commande, modale SAV...) : à réutiliser
 *  plutôt que redupliquer le style à chaque endroit. Accepte aussi bien un seul numéro qu'une
 *  liste multiligne. */
function pilulesNumerosSerie(texteNumeros){
  // Composant commun admin / public (portail-ui.js) : pilule unique, passeport ouvert en modale.
  return window.pilulesSeriesCvdl ? window.pilulesSeriesCvdl(texteNumeros, { query: '&admin=1' }) : '';
}
/** Équivalent pour un code de produit dématérialisé (recharge...) — pastille rouge, jamais de
 *  lien (un code n'a pas de passeport numérique) : juste affiché, sélectionnable au clic. */
function pilulesCodes(texteCodes){
  return window.pilulesSeriesCvdl ? window.pilulesSeriesCvdl(texteCodes, { code: true }) : '';
}
/** Infos de contact (personne/téléphone/email) regroupées en une seule pilule, séparées par
 *  des "|" — plutôt que 3 pilules .tag distinctes de taille différente des pilules violette/
 *  rouge ci-dessus. Segments absents simplement omis (jamais de "|" en trop). */
function piluleContact(nom, telephone, email){
  const segments = [];
  if(nom) segments.push(`<span style="display:inline-flex;align-items:center;gap:6px">${icon('personne', 13)}${echapper(nom)}</span>`);
  if(telephone) segments.push(`<span style="display:inline-flex;align-items:center;gap:6px">${icon('telephone_touches', 13)}${echapper(telephone)}</span>`);
  if(email) segments.push(`<span style="display:inline-flex;align-items:center;gap:6px">${icon('mail', 13)}${echapper(email)}</span>`);
  if(!segments.length) return '';
  return `<span class="rp-pilule-neutre">${segments.join('<span style="opacity:0.35">|</span>')}</span>`;
}
// Groupes de commande : chaque produit appartient à l'un des trois ; une structure peut être
// limitée à un sous-ensemble (plusieurs cochés = profil "Mixte" dans les formulaires).
const GROUPES_COMMANDE = ['Connexion', 'Équipement', 'Accompagnement'];
const TECTECH_TYPES = ['ORDINATEUR_FIXE', 'ORDINATEUR_PORTABLE', 'SMARTPHONE', 'TABLETTE', 'TELEPHONE_A_TOUCHES'];
const TECTECH_CATEGORIES = ['PREMIUM', 'A', 'B', 'C', 'D'];

/** Sélecteur "Groupe(s) de commande" réutilisé pour une structure (accès catalogue) — un select
 *  Tout/un groupe précis/Mixte, avec des cases à cocher qui apparaissent seulement sur Mixte.
 *  `valeurActuelle` est la liste CSV existante (ex. "Connexion,Équipement" ou "" pour Tout). */
function selecteurGroupesCommande(idPrefixe, valeurActuelle){
  const groupesActifs = (valeurActuelle || '').split(',').map(g => g.trim()).filter(Boolean);
  const estMixte = groupesActifs.length > 1;
  const modeInitial = !groupesActifs.length ? 'tout' : (estMixte ? 'mixte' : groupesActifs[0]);
  return `
    <select class="input" id="${idPrefixe}-mode" data-groupes-mode="${idPrefixe}">
      <option value="tout" ${modeInitial === 'tout' ? 'selected' : ''}>Tout le catalogue</option>
      ${GROUPES_COMMANDE.map(g => `<option value="${echapper(g)}" ${modeInitial === g ? 'selected' : ''}>${echapper(g)} uniquement</option>`).join('')}
      <option value="mixte" ${modeInitial === 'mixte' ? 'selected' : ''}>Mixte (plusieurs groupes)</option>
    </select>
    <div id="${idPrefixe}-mixte" style="display:${modeInitial === 'mixte' ? 'flex' : 'none'};flex-direction:column;gap:6px;margin-top:8px">
      ${GROUPES_COMMANDE.map(g => `<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" class="${idPrefixe}-case" value="${echapper(g)}" ${groupesActifs.includes(g) ? 'checked' : ''}>${echapper(g)}</label>`).join('')}
    </div>`;
}
/** Lit la valeur courante du sélecteur, sous forme de CSV prête à envoyer au backend. */
function lireGroupesCommande(idPrefixe){
  const mode = $(`${idPrefixe}-mode`).value;
  if(mode === 'tout') return '';
  if(mode === 'mixte') return Array.from(document.querySelectorAll(`.${idPrefixe}-case:checked`)).map(c => c.value).join(',');
  return mode;
}
const MOYENS_PAIEMENT_STRUCTURE = ['Paiement en ligne (CB)', 'Chèque', 'Espèces', 'Comptoir solidaire'];
/** Moyens de paiement autorisés (surtout pertinent pour les structures BO) — simples cases à
 *  cocher, aucune cochée = tous, même principe que côté self-service Interne. */
function selecteurMoyensPaiement(idPrefixe, valeurActuelle){
  const actifs = (valeurActuelle || '').split(',').map(m => m.trim()).filter(Boolean);
  return MOYENS_PAIEMENT_STRUCTURE.map(m => `<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" class="${idPrefixe}-case" value="${echapper(m)}" ${actifs.includes(m) ? 'checked' : ''}>${echapper(m)}</label>`).join('');
}
function lireMoyensPaiement(idPrefixe){
  return Array.from(document.querySelectorAll(`.${idPrefixe}-case:checked`)).map(c => c.value).join(',');
}

const ICONES_PRODUIT_OPTIONS = [
  { value: '', label: 'Automatique (déduite du nom)' },
  { value: 'portable', label: 'Ordinateur portable' },
  { value: 'fixe', label: 'Ordinateur fixe' },
  { value: 'feuille', label: 'Écologie / sensibilisation' },
  { value: 'sim', label: 'Carte SIM' },
  { value: 'telephone_touches', label: 'Téléphone basique (à touches)' },
  { value: 'telephone', label: 'Smartphone' },
  { value: 'tablette', label: 'Tablette' },
  { value: 'atelier', label: "Atelier d'accompagnement" },
  { value: 'recharge', label: 'Recharge téléphone' },
  { value: 'souris', label: 'Souris' }
];
// Listes utilisées pour les champs techniques du formulaire produit — menus déroulants plutôt
// que texte libre, pour éviter les fautes de saisie et les formats différents d'un produit à
// l'autre (ex. "8go" / "8 Go" / "8Go"). Les valeurs de RAM sont de simples nombres, le "Go" est
// rajouté automatiquement à l'enregistrement (voir enregistrerProduit()).
const SYSTEMES_OPTIONS = ['Windows 11', 'macOS', 'Linux', 'ChromeOS', 'Android', 'iOS'];
const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 64];
const DISQUE_OPTIONS = ['32 Go', '64 Go', '128 Go', '256 Go', '500 Go', '512 Go', '1 To', '2 To'];
const DONNEES_MOBILES_OPTIONS = [1, 2, 5, 10, 20, 50, 'Illimitées'];
/** Construit un <select> à partir d'une liste d'options simples (valeur = libellé), en ajoutant
 *  la valeur actuellement enregistrée si elle n'y figure pas déjà (une saisie plus ancienne ou
 *  inhabituelle ne doit jamais être silencieusement remplacée/perdue à l'ouverture du formulaire). */
function selectSimple(id, options, valeurActuelle, videLabel){
  const valeurs = options.map(o => String(o));
  const extra = valeurActuelle && !valeurs.includes(String(valeurActuelle)) ? [valeurActuelle] : [];
  return `<select class="input" id="${id}">
    <option value="">${echapper(videLabel || '—')}</option>
    ${[...options, ...extra].map(o => `<option value="${echapper(String(o))}" ${String(valeurActuelle) === String(o) ? 'selected' : ''}>${echapper(String(o))}</option>`).join('')}
  </select>`;
}
/** Variante pour un champ numérique suivi d'une unité (RAM en Go, données mobiles en Go) — la
 *  valeur stockée inclut déjà l'unité ("8 Go"), donc on la retire pour retrouver le nombre à
 *  présélectionner, et on ne la réaffiche qu'en libellé (la valeur du <select> reste le nombre
 *  seul). Toute entrée non numérique de la liste (ex. "Illimitées") est affichée telle quelle,
 *  sans suffixe. */
function selectAvecUnite(id, options, unite, valeurActuelle){
  const brut = valeurActuelle && valeurActuelle.endsWith(' ' + unite) ? valeurActuelle.slice(0, -(unite.length + 1)) : valeurActuelle;
  const valeurs = options.map(o => String(o));
  const extra = brut && !valeurs.includes(String(brut)) ? [brut] : [];
  return `<select class="input" id="${id}">
    <option value="">—</option>
    ${[...options, ...extra].map(o => `<option value="${echapper(String(o))}" ${String(brut) === String(o) ? 'selected' : ''}>${echapper(String(o))}${/^\d+$/.test(String(o)) ? ' ' + echapper(unite) : ''}</option>`).join('')}
  </select>`;
}

/** Champ de recherche avec petite croix pour vider — n'apparaît que si le champ contient
 *  déjà du texte. */
function champRecherche(id, placeholder, valeur){
  return `
    <div class="field" style="max-width:340px;margin-bottom:var(--space-6);position:relative">
      <input class="input" id="${id}" placeholder="${echapper(placeholder)}" value="${echapper(valeur)}" style="${valeur ? 'padding-right:36px' : ''}">
      ${valeur ? `<button type="button" data-vider-recherche="${id}" style="all:unset;position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--color-neutral-500);display:flex;padding:4px" title="Vider">${icon('x', 14)}</button>` : ''}
    </div>`;
}
/** Icône par mot-clé pour un statut SAV (diagnostic, réparation, pièces, livraison,
 *  garantie...) — à défaut de correspondance, l'icône générique reste la clé anglaise. */
const ICONES_STATUT_SAV_OPTIONS = [
  { value: '', label: 'Automatique (déduite du nom)' },
  { value: 'wrench', label: 'Clé (générique)' },
  { value: 'loupe_diagnostic', label: 'Diagnostic' },
  { value: 'boite_pieces', label: 'Pièces / approvisionnement' },
  { value: 'colis_livraison', label: 'Livraison / expédition' },
  { value: 'reparation_cours', label: 'Réparation en cours' },
  { value: 'bouclier_garantie', label: 'Garantie' },
  { value: 'croix_irreparable', label: 'Irréparable / hors service' },
  { value: 'telephone', label: 'Appel / contact client' },
  { value: 'personne', label: 'Prise en charge / accueil' },
  { value: 'nettoyage', label: 'Nettoyage' },
  { value: 'package2', label: 'Emballage / retour colis' },
  { value: 'truck', label: 'Retour transporteur' },
  { value: 'remboursement', label: 'Remboursement' },
  { value: 'ban', label: 'Refusé / annulé' },
  { value: 'receipt', label: 'Facturation SAV' },
  { value: 'check', label: 'Terminé' },
];
function iconeStatutSav(nom, iconeChoisie){
  if(iconeChoisie && ICONES[iconeChoisie]) return iconeChoisie;
  const n = String(nom || '').toLowerCase();
  if (/diagnostic|analyse|expertise/.test(n)) return 'loupe_diagnostic';
  if (/(pi[eè]ce|attente.*commande|approvisionn)/.test(n)) return 'boite_pieces';
  if (/(livr|exp[ée]di|retour.*structure|retour.*b[ée]n[ée]ficiaire)/.test(n)) return 'colis_livraison';
  if (/garantie|assurance/.test(n)) return 'bouclier_garantie';
  if (/(irr[ée]parable|abandon|hors service|hs\b|rebut)/.test(n)) return 'croix_irreparable';
  if (/(r[ée]par|atelier|en cours)/.test(n)) return 'reparation_cours';
  if (/rembours/.test(n)) return 'remboursement';
  if (/(refus|annul)/.test(n)) return 'ban';
  if (/(appel|contact|rappel)/.test(n)) return 'telephone';
  if (/(accueil|prise en charge)/.test(n)) return 'personne';
  if (/nettoy/.test(n)) return 'nettoyage';
  if (/(embal|transporteur)/.test(n)) return 'package2';
  if (/factur/.test(n)) return 'receipt';
  return 'wrench';
}
/** Illustration produit du kit (portail-ui.js) — même style que le portail public ; repli sur
 *  l'icône au trait si le script n'est pas chargé. */
function illustrationProduitAdmin(nom, icone, taille){
  if(window.illustrationCvdl && window.cleIllustrationProduit) return window.illustrationCvdl(window.cleIllustrationProduit(nom, icone), taille);
  return icon(iconeProduit(nom, icone), Math.round(taille / 2));
}
function iconeProduit(nom, icone){
  if(icone && ICONES[icone]) return icone;
  const n = String(nom || '').toLowerCase();
  if (/(sensibilisation|[ée]cologi|environnement)/.test(n)) return 'feuille';
  if (/(atelier|animation)/.test(n)) return 'atelier';
  if (/\bsim\b|carte sim/.test(n)) return 'sim';
  if (/recharge|forfait/.test(n)) return 'recharge';
  if (/souris/.test(n)) return 'souris';
  if (/touches?/.test(n)) return 'telephone_touches';
  if (/(smartphone|t[ée]l[ée]phone|mobile)/.test(n)) return 'telephone';
  if (/tablet/.test(n)) return 'tablette';
  if (/(portable|laptop)/.test(n)) return 'portable';
  if (/(fixe|bureau|desktop|tour)/.test(n)) return 'fixe';
  return 'package';
}
/** iconeCentrale (optionnel) : glyphe affiché au centre de l'anneau — html d'un icon(...),
 *  utilisé pour les cartes SAV du kanban (icône du statut, comme les cartes commandes qui
 *  affichent déjà l'icône de leur étape). Laissé à null ailleurs (ex. anneaux de stats) : rien
 *  ne change pour ces usages-là. */
function ring(fraction, color, size, iconeCentrale, epaisseur){
  size = size || 32;
  epaisseur = epaisseur || 4;
  // Marge inchangée (size/2 - 4) pour l'épaisseur par défaut — ne pas casser le rendu des
  // usages existants (cartes kanban) — un peu plus de marge en plus au-delà de 4px de trait,
  // pour qu'un trait plus épais (nouvelle carte "Vue du jour") ne déborde pas du viewBox.
  const r = (size / 2) - 4 - Math.max(0, epaisseur - 4), c = 2 * Math.PI * r, offset = c * (1 - fraction);
  const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="flex:none">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--color-neutral-200)" stroke-width="${epaisseur}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${epaisseur}" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
  </svg>`;
  if(!iconeCentrale) return svg;
  return `<span style="position:relative;display:inline-flex;flex:none;width:${size}px;height:${size}px">${svg}<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${color}">${iconeCentrale}</span></span>`;
}

/* ── Référentiel de statuts (mêmes valeurs que le reste de la plateforme) ── */
const BADGE = {
  'tag-accent': { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)' },
  'tag-accent-2': { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' },
  'tag-warn': { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)' },
  'tag-neutral': { bg: 'var(--color-neutral-200)', fg: 'var(--color-neutral-700)' },
  'tag-bleu': { bg: 'var(--color-bleu-100)', fg: 'var(--color-bleu-700)' },
  'tag-violet': { bg: 'var(--color-violet-100)', fg: 'var(--color-violet-700)' },
  'tag-orange': { bg: 'var(--color-orange-100)', fg: 'var(--color-orange-700)' },
  'tag-vert': { bg: 'var(--color-vert-100)', fg: 'var(--color-vert-700)' }
};
const BAR_COLOR = {
  'tag-accent': 'var(--color-accent)', 'tag-accent-2': 'var(--color-accent-2)',
  'tag-warn': 'var(--color-warn-700)', 'tag-neutral': 'var(--color-neutral-500)',
  'tag-bleu': 'var(--color-bleu-700)', 'tag-violet': 'var(--color-violet-700)', 'tag-orange': 'var(--color-orange-700)', 'tag-vert': 'var(--color-vert-700)'
};
const ORDER_META = {
  'Reçue': { cls: 'tag-warn', ic: 'inbox' },
  'Validée': { cls: 'tag-bleu', ic: 'validation' },
  'Préparée': { cls: 'tag-violet', ic: 'package' },
  'En cours de livraison': { cls: 'tag-orange', ic: 'truck' },
  'Livrée': { cls: 'tag-vert', ic: 'check' }
};
const ORDER_STATUSES = Object.keys(ORDER_META);
const DOC_META = {
  'En attente': { cls: 'tag-neutral', ic: 'clock' },
  'Émis': { cls: 'tag-neutral', ic: 'clock' },
  'Émise': { cls: 'tag-neutral', ic: 'clock' },
  'Envoyé': { cls: 'tag-warn', ic: 'file' },
  'Envoyée': { cls: 'tag-warn', ic: 'file' },
  'Accepté': { cls: 'tag-accent-2', ic: 'check' },
  'Accepté sans réserve': { cls: 'tag-accent-2', ic: 'check' },
  'Payé': { cls: 'tag-accent-2', ic: 'check' },
  'Payée': { cls: 'tag-accent-2', ic: 'check' },
  'En retard': { cls: 'tag-accent', ic: 'alert' },
  'Non payé': { cls: 'tag-accent', ic: 'alert' },
  'Annulé': { cls: 'tag-neutral', ic: 'ban' },
  'Annulée': { cls: 'tag-neutral', ic: 'ban' }
};
function metaDoc(statut){ return DOC_META[statut] || DOC_META['En attente']; }
/* Icônes de statut : style simple, un seul trait, sans aplat ni remplissage. */
const ICONES_STATUT_SIMPLES = {
  inbox: '<path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20"/><path d="M6.5 5.5h11L20 13.5V19H4v-5.5z"/>',
  validation: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  package: '<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5l8 3.5 8-3.5M12 11v9"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h3.5l3 3v3H14"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  check: '<path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M9 15l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>',
  file: '<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4"/>',
};
function iconeStatutSimple(nom, t){
  const d = ICONES_STATUT_SIMPLES[nom];
  if(!d) return icon(nom, t);
  return `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
function mkTag(statut, meta){
  const m = meta[statut] || { cls: 'tag-neutral', ic: 'inbox' };
  const b = BADGE[m.cls];
  return { icon: iconeStatutSimple(m.ic, 17), tagCls: m.cls, badgeBg: b.bg, badgeFg: b.fg };
}

/* ── Couleurs des statuts SAV (mêmes clés que COULEURS_SAV_DISPONIBLES côté back) ── */
const COULEURS_SAV_DISPONIBLES = ['t-ambre', 't-orange', 't-bleu', 't-violet', 't-turquoise', 't-vert', 't-rouge', 't-gris'];
const TEINTES_SAV = {
  't-ambre': { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)', vif: 'var(--color-warn-700)' },
  't-orange': { bg: 'var(--color-orange-100)', fg: 'var(--color-orange-700)', vif: 'var(--color-orange)' },
  't-bleu': { bg: 'var(--color-bleu-100)', fg: 'var(--color-bleu-700)', vif: 'var(--color-bleu)' },
  't-violet': { bg: 'var(--color-violet-100)', fg: 'var(--color-violet-700)', vif: 'var(--color-violet)' },
  't-turquoise': { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)', vif: 'var(--color-accent-2)' },
  't-vert': { bg: 'var(--color-vert-100)', fg: 'var(--color-vert-700)', vif: 'var(--color-vert)' },
  't-rouge': { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)', vif: 'var(--color-accent)' },
  't-gris': { bg: 'var(--color-neutral-200)', fg: 'var(--color-neutral-700)', vif: 'var(--color-neutral-500)' }
};
function teinteSav(couleur){ return TEINTES_SAV[couleur] || TEINTES_SAV['t-gris']; }

const TYPE_COLORS = {
  'RNum': { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' },
  'Interne': { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)' },
  'ESN': { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)' },
  'BO': { bg: 'var(--color-neutral-200)', fg: 'var(--color-neutral-700)' },
  'Projets': { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' }
};
function typeStructure(s){
  return s.esn ? 'ESN' : s.interne ? 'Interne' : s.bo ? 'BO' : s.projets ? 'Projets' : 'RNum';
}
/* Type unique (colonne « Type ») : une structure sans type enregistré et avec zéro ou plusieurs
   anciennes cases cochées doit être tranchée à la main (le changer modifierait son tarif). */
const TYPES_STRUCTURE = [
  { cle: 'rn', libelle: 'Vente solidaire (RNum)', aide: 'Tarif RNum, paiement par virement, devis et facture, rapprochement comptable.' },
  { cle: 'projets', libelle: 'Projets', aide: 'Prix masqués, paiement fixé par l’équipe, facture, flotte gérée dans la plateforme.' },
  { cle: 'bo', libelle: 'Bon d’orientation (BO)', aide: 'Personnes nominatives et attestations, jamais de devis ni de facture.' },
  { cle: 'interne', libelle: 'Interne', aide: 'Sans paiement ni facture, flotte gérée dans la plateforme, peut créer des partenaires.' },
  { cle: 'esn', libelle: 'ESN', aide: 'Sans paiement ni facture, quantités ESN.' }
];
function typeAChoisir(s){ return !!s && !s.typeDefini && (s.casesCochees || []).length !== 1; }

/* ============================================================
   État applicatif
   ============================================================ */
const state = {
  activeTab: 'dashboard',
  commandes: [], sav: [], statutsSav: [], structures: [], devis: [], factures: [], produits: [],
  commandeSearch: '', savSearch: '', savFiltreStatut: '', savVue: 'liste', docSearch: '',
  // Mini calendrier des livraisons (tableau de bord) — décalage en mois par rapport au mois
  // actuel, et jour ISO sélectionné pour l'aperçu (null = choisi automatiquement au premier
  // rendu, sur la prochaine date qui a une livraison).
  calendrierDecalageMois: 0, calendrierJourChoisi: null,
  revealedCodes: {},
  role: 'admin',
  modal: null, // { kind:'commande'|'sav'|'creer-structure'|'creer-commande'|'creer-produit', ref? }
  highlightRef: null,
  confirmSubEtapes: {}, // { [ligneCommande]: { series:bool, colissimo:bool } } — en mémoire seulement, comme côté back
  etapeCommandeOuverte: null, // étape déjà passée actuellement dépliée pour consultation/modification, dans la modale commande
  accordeonTerminalOuvert: false, // section "Clôturer le dossier" (SAV), repliée par défaut
  commandesVue: 'liste', // 'liste' (par défaut, dense) ou 'kanban'
  docsVue: 'colonne', // 'colonne' (empilé par dossier, par défaut) ou 'ligne' (aligné horizontalement)
  docsFiltre: '', // '' (tous), 'devis-attente', 'facture-impayee'
  commandesPage: 0,
  commandesFiltreStatut: 'ACTION', commandesFiltreType: '', groupesCommandesOuverts: {},
  ncLignes: [], // lignes produit en cours de saisie pour la modale "Nouvelle commande"
  ndLignes: [], // lignes produit/prestation en cours de saisie pour la modale "Nouveau devis" (devis libre)
  ndStructureNom: '', ndEmail: '', ndAdresse: '', // idem pour les champs texte du devis libre — sans ça, perdus à chaque re-rendu (ajout/retrait de ligne)
  documentGenere: null, // état du panneau "voir/générer/envoyer" ouvert sur un devis ou une facture — { type, ref, chargement, url, erreur, envoiChargement, envoiOk }
  ncCode: '', // structure choisie dans cette même modale
  reglages: {}, // chargé au démarrage (action:'reglages'), utilisé par la page Réglages
  tectechOrigine: {}, // { [referenceSav]: 'chargement' | { ok, reconditionneur, donateur, structureDonatrice } } — chargé à la demande, pas systématiquement (voir sav-origine-tectech)
  passeportRecherche: '', passeportResultat: null, passeportChargement: false, // onglet Passeport matériel (admin) — recherche par numéro de série, accès complet (pas de restriction structure), inclut tec.tech
  structuresFiltreRegion: '',
  distributions: [], rattachements: [], distFiltre: 'cours', distRegion: '', // programmes de distribution
  depotVente: [], // structures en dépôt-vente (routes/depotVente.js)
  calMois: '', calJour: '', calFiltres: { livraisons: true, programmes: true, factures: true }, // calendrier global
  statsFiltres: { programme: '', region: '', departement: '', type: '' }, // filtres de l'onglet Statistiques // filtre « Région analytique » de la liste des structures
  notifOuverte: false, // panneau de la cloche de notifications (sidebar), fermé par défaut
};

/* ============================================================
   Connexion
   ============================================================ */
$('btn-connexion').addEventListener('click', connecter);

/** « Se connecter avec Google » (comptes admin de l'onglet Équipe) + connexion automatique :
 *  si le navigateur a déjà une session Google autorisée (et un premier consentement donné),
 *  One Tap (auto_select) connecte sans clic. Le mot de passe reste l'accès de secours. */
async function preparerGoogleAdmin(automatique){
  const masquer = () => { $('rp-google').remove(); $('rp-google-ou').remove(); };
  const c = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'auth-config' }) }).then(r => r.json()).catch(() => ({}));
  if(!c.clientId) return masquer();
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onerror = masquer;
  s.onload = () => {
    $('rp-google').style.display = 'flex'; $('rp-google-ou').style.display = 'flex';
    google.accounts.id.initialize({ client_id: c.clientId, hd: c.domaine, auto_select: true, ux_mode: 'popup', cancel_on_tap_outside: false, callback: async rep => {
      $('retour-connexion').innerHTML = '';
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'auth-google', credential: rep.credential }) }).then(x => x.json()).catch(() => ({ ok: false, erreur: 'Connexion au serveur impossible.' }));
      if(r.ok && r.compte && ['admin', 'compta'].includes(r.compte.role)) return connecter(r.jeton);
      const msg = r.ok ? 'Ce compte a le rôle « Support SAV » : utilisez l’outil Support SAV (support.html).' : (r.erreur || 'Connexion refusée.');
      $('retour-connexion').innerHTML = '<div class="msg msg-erreur">' + echapper(msg) + '</div>';
    } });
    google.accounts.id.renderButton($('rp-google'), { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'fr', width: 280 });
    if(automatique) google.accounts.id.prompt();
  };
  document.head.appendChild(s);
}
$('mdp').addEventListener('keydown', e => { if(e.key === 'Enter') connecter(); });

async function connecter(valeurForcee){
  const mdp = (typeof valeurForcee === 'string' ? valeurForcee : $('mdp').value).trim();
  if(!mdp) return;
  $('btn-connexion').disabled = true;
  $('btn-connexion').textContent = 'Connexion…';
  $('retour-connexion').innerHTML = '';
  try{
    // Jeton de compte Google (j2) : on garde l'identité, validée par auth-moi (réservé aux admins).
    const estCompte = mdp.startsWith('j2.');
    let r = await jsonp(estCompte ? { action: 'auth-moi', password: mdp } : { action: 'login', password: mdp });
    if(estCompte && r && r.ok && (!r.compte || !['admin', 'compta'].includes(r.compte.role))) r = { ok: false, erreur: 'Ce compte a le rôle « Support SAV » : utilisez l’outil Support SAV (support.html).' };
    if(!r || !r.ok){
      // Reconnexion silencieuse ratée (mot de passe changé entre-temps, session expirée...) :
      // le formulaire doit réapparaître avec l'erreur — sinon la page reste bloquée sur le
      // spinner de reconnexion, sans aucun moyen de ressaisir un mot de passe.
      document.documentElement.classList.remove('rp-reconnexion');
      try{ sessionStorage.removeItem('cvdl-admin-jeton'); sessionStorage.removeItem('cvdl-admin-password'); }catch(e){}
      // Message réel du serveur (mot de passe admin non configuré ou trop court, trop de tentatives…) :
      // « Mot de passe incorrect » seulement quand c'est vraiment le cas.
      const raison = (r && r.erreur && !/mot de passe incorrect/i.test(r.erreur)) ? r.erreur : 'Mot de passe incorrect.';
      $('retour-connexion').innerHTML = '<div class="msg msg-erreur">' + echapper(raison) + '</div>';
      $('btn-connexion').disabled = false;
      $('btn-connexion').textContent = 'Ouvrir le suivi';
      return;
    }
    // Jeton de session signé (12 h) : c'est lui qui est gardé et renvoyé, jamais le mot de passe.
    motDePasse = estCompte ? mdp : (r.jeton || mdp);
    $('mdp').value = '';
    try{ sessionStorage.removeItem('cvdl-admin-password'); sessionStorage.setItem('cvdl-admin-jeton', motDePasse); }catch(e){}
    state.role = estCompte ? r.compte.role : (r.role || 'admin');
    state.compte = estCompte ? r.compte : null;
    // La fenêtre de connexion (et son flou) reste affichée pendant tout le chargement des
    // données — la masquer avant laissait voir l'appli vide un court instant.
    $('btn-connexion').textContent = 'Chargement des données…';
    await chargerTout();
    const snDepart = lireHash().sn;
    const ongletDepart = lireHash().onglet || (state.role !== 'admin' ? ONGLETS_COMPTA[0] : 'dashboard');
    state.activeTab = (state.role === 'admin' || ONGLETS_COMPTA.includes(ongletDepart)) ? ongletDepart : ONGLETS_COMPTA[0];
    history.replaceState({ onglet: state.activeTab }, '', '#' + state.activeTab);
    $('connexion').hidden = true;
    render();
    if(state.activeTab === 'passeport' && snDepart) rechercherPasseportMateriel(snDepart);
  }catch(e){
    // Panne réseau pendant la reconnexion silencieuse : mot de passe gardé (rien ne prouve
    // qu'il soit invalide), mais le formulaire doit redevenir visible pour ne pas laisser
    // tourner le spinner indéfiniment — l'admin peut alors retenter (bouton "Ouvrir le suivi").
    document.documentElement.classList.remove('rp-reconnexion');
    $('retour-connexion').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Vérifiez l\'URL du script.</div>';
    $('btn-connexion').disabled = false;
    $('btn-connexion').textContent = 'Ouvrir le suivi';
  }
}

async function chargerTout(){
  etat('Chargement…', 'chargement');
  // limite:-1 (commandes) / limite:0 (sav, devis, factures) → tout l'historique, pas une page :
  // c'est le vrai comportement du back (voir routes/*.js), pas une limite de 500 qu'on s'était
  // fixée à tort — nécessaire pour que les statistiques portent sur l'ensemble des données.
  const compta = state.role === 'compta'; // rôle Comptabilité : ni SAV ni réglages
  const [rc, rs, rss, rst, rd, rf, rp, rr, rdi] = await Promise.all([
    jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }).catch(() => null),
    compta ? null : jsonp({ action: 'sav-list', password: motDePasse, limite: 0 }).catch(() => null),
    compta ? null : jsonp({ action: 'sav-statuts-list', password: motDePasse }).catch(() => null),
    jsonp({ action: 'structures', password: motDePasse }).catch(() => null),
    jsonp({ action: 'devis', password: motDePasse, limite: 0 }).catch(() => null),
    jsonp({ action: 'factures', password: motDePasse, limite: 0 }).catch(() => null),
    jsonp({ action: 'produits', password: motDePasse }).catch(() => null),
    compta ? null : jsonp({ action: 'reglages', password: motDePasse }).catch(() => null),
    jsonp({ action: 'distributions', password: motDePasse }).catch(() => null)
  ]);
  if(rc && rc.ok) state.commandes = rc.commandes || [];
  if(rs && rs.ok) state.sav = rs.tickets || [];
  if(rss && rss.ok) state.statutsSav = rss.statuts || [];
  if(rst && rst.ok) state.structures = (rst.structures || []).slice().sort((a, b) => b.ligne - a.ligne);
  if(rd && rd.ok) state.devis = rd.devis || [];
  if(rf && rf.ok) state.factures = rf.factures || [];
  if(rp && rp.ok) state.produits = rp.produits || [];
  if(rr && rr.ok) state.reglages = rr;
  if(rdi && rdi.ok){ state.distributions = rdi.programmes || []; state.rattachements = rdi.rattachements || []; }
  if(!compta){
    chargerDepotVente(); // non bloquant : alimente l'onglet Stock, les fiches et la cloche
    chargerModeStockBas(); // non bloquant : bouton / bandeau « Mode stock bas » de l'onglet Stock
  }
  if(typeof fin !== 'undefined') fin.d = null; // l'onglet Finances se recharge avec les nouvelles données
  etat('À jour', 'succes');
}

/** Rôle « Comptabilité » (compte Google) : seuls ces onglets, le premier à l'ouverture. */
const ONGLETS_COMPTA = ['finance', 'factures'];

/* ============================================================
   Rendu — nav + shell
   ============================================================ */
const NAV_DEFS = [
  { key: 'dashboard', label: 'Tableau de bord', ic: 'dashboard' },
  { key: 'commandes', label: 'Commandes', ic: 'cart' },
  { key: 'sav', label: 'SAV', ic: 'wrench' },
  { key: 'depannage', label: 'Dépannage', ic: 'loupe_diagnostic' }, // arbres de décision avant SAV (depannage-admin.js)
  { key: 'factures', label: 'Devis / Factures', ic: 'receipt' },
  { key: 'finance', label: 'Finances', ic: 'carte_paiement' }, // facturé / encaissé, territoires, impayés, relances (finance-admin.js)
  { key: 'stock', label: 'Stock', ic: 'package' },
  { key: 'passeport', label: 'Passeport matériel', ic: 'passeport' },
  { key: 'structures', label: 'Structures', ic: 'building' },
  { key: 'distribution', label: 'Distribution', ic: 'truck' },
  { key: 'calendrier', label: 'Calendrier', ic: 'calendrier' },
  { key: 'bilan', label: 'Statistiques', ic: 'stats' },
  { key: 'retours', label: 'Retours', ic: 'bulle' }, // avis et erreurs des utilisateurs (retours-admin.js)
  { key: 'equipe', label: 'Équipe', ic: 'personne' }, // comptes Google de l'équipe, rôles (equipe-admin.js)
  { key: 'reglages', label: 'Réglages', ic: 'gear' }
];

/** Navigation entre onglets synchronisée avec l'historique du navigateur — bouton retour/
 *  avant du navigateur fonctionne comme changer d'onglet, sans recharger la page ni perdre
 *  les données déjà chargées. */
/** Onglet + paramètres lus dans l'ancre (#passeport?sn=XXX). */
function lireHash(){
  const [onglet, qs] = location.hash.slice(1).split('?');
  return { onglet: onglet || '', sn: new URLSearchParams(qs || '').get('sn') || '' };
}
function naviguerVersOnglet(cle, remplacer){
  state.activeTab = cle;
  state.highlightRef = null;
  state.modal = null;
  const url = '#' + cle;
  if(remplacer) history.replaceState({ onglet: cle }, '', url);
  else history.pushState({ onglet: cle }, '', url);
  render();
}
window.addEventListener('popstate', e => {
  const cle = (e.state && e.state.onglet) || lireHash().onglet || 'dashboard';
  if(state.role === 'compta' && !ONGLETS_COMPTA.includes(cle)) return; // rôle Comptabilité : onglets financiers seulement
  if(NAV_DEFS.some(n => n.key === cle) || cle === 'dashboard'){
    state.activeTab = cle; state.highlightRef = null; state.modal = null; render();
    const sn = lireHash().sn;
    if(cle === 'passeport' && sn && sn !== state.passeportRecherche) rechercherPasseportMateriel(sn, true);
  }
});
/* En-tête des onglets au format du kit : illustration au-dessus du titre (portail-ui.js). */
const ILLUSTRATION_ONGLET = { finance: 'tarifs', dashboard: 'tableau', commandes: 'commandes', sav: 'suiviSav', depannage: 'aide', retours: 'enquete', equipe: 'structure', factures: 'facture', stock: 'stock', passeport: 'passeport', structures: 'structures', distribution: 'distribution', calendrier: 'calendrier', bilan: 'stats', reglages: 'reglages' };
/** Sur-titres des en-têtes de page (maquette admin : illustration + sur-titre + titre). */
const SURTITRE_ONGLET = { finance: 'Comptabilité', dashboard: 'Pilotage', commandes: 'Gestion', sav: 'Après-vente', depannage: 'Après-vente', retours: 'Utilisateurs', equipe: 'Accès', factures: 'Comptabilité', stock: 'Matériel',
  passeport: 'Traçabilité', structures: 'Partenaires', distribution: 'Pilotage', calendrier: 'Planning', bilan: 'Pilotage', stats: 'Pilotage', reglages: 'Plateforme' };
function decorerEnTeteOnglet(main, onglet){
  const h1 = main.querySelector('h1');
  if(!h1 || h1.closest('.rp-titre-bloc') || (h1.previousElementSibling && h1.previousElementSibling.classList.contains('rp-titre-ill'))) return;
  const ill = document.createElement('span');
  ill.className = 'ill xl rp-titre-ill';
  ill.dataset.ill = ILLUSTRATION_ONGLET[onglet] || 'tableau';
  // Style unifié : bloc « illustration à gauche + sur-titre + titre + sous-titre » (maquette).
  if(estUnifie()){
    const sous = (h1.nextElementSibling && h1.nextElementSibling.tagName === 'P') ? h1.nextElementSibling : null;
    const bloc = document.createElement('div'); bloc.className = 'rp-titre-bloc';
    const txt = document.createElement('div'); txt.className = 'rp-titre-txt';
    const sur = document.createElement('div'); sur.className = 'rp-surtitre rp-titre-sur'; sur.textContent = SURTITRE_ONGLET[onglet] || '';
    h1.before(bloc);
    bloc.append(ill, txt);
    if(sur.textContent) txt.append(sur);
    txt.append(h1);
    if(sous) txt.append(sous);
  }else{
    h1.parentNode.insertBefore(ill, h1);
  }
  if(window.portailIllustrations) window.portailIllustrations(ill.parentNode);
  if(NAV_DEFS.some(n => n.key === onglet)){ ill.classList.remove('m', 't'); ill.classList.add(teinteOnglet(onglet)); }
}
/** Teinte de l'icône d'un onglet : turquoise / magenta en alternance dans l'ordre du menu. */
function teinteOnglet(cle){ const i = NAV_DEFS.findIndex(n => n.key === cle); return i % 2 ? 'm' : 't'; }
let derniereCleModale = '';
let derniereCleVue = '';
function render(){
  const navsVisibles = state.role === 'admin' ? NAV_DEFS : NAV_DEFS.filter(n => ONGLETS_COMPTA.includes(n.key));
  const nbUrgentes = commandesUrgentes().length;
  const nbSavOuverts = savOuvertsListe().length;
  $('rp-nav').innerHTML = navsVisibles.map(n => `
    <button type="button" class="${state.activeTab === n.key ? 'rp-actif' : ''}" data-nav="${n.key}" title="${echapper(n.label)}">
      ${icon(n.ic, 18)}<span class="rp-nav-ill" data-ill="${ILLUSTRATION_ONGLET[n.key] || 'tableau'}" style="display:none"></span><span class="rp-label">${echapper(n.label)}</span>
      ${(n.key === 'commandes' && nbUrgentes) ? `<span class="rp-pastille-nav">${nbUrgentes > 99 ? '99+' : nbUrgentes}</span>` : ''}
      ${(n.key === 'sav' && nbSavOuverts) ? `<span class="rp-pastille-nav">${nbSavOuverts > 99 ? '99+' : nbSavOuverts}</span>` : ''}
    </button>`).join('');
  // Icônes illustrées du menu (visibles seulement avec le style unifié, admin-unifie.css).
  if(window.portailIllustrations) window.portailIllustrations($('rp-nav'));
  // Alternance turquoise / magenta garantie dans le menu, quel que soit le dessin choisi pour
  // chaque onglet (les nouvelles icônes Distribution/Calendrier cassaient l'alternance).
  $('rp-nav').querySelectorAll('[data-nav] .rp-nav-ill').forEach(el => { const t = teinteOnglet(el.closest('[data-nav]').dataset.nav); el.classList.remove('m', 't'); el.classList.add(t); });
  if(state.role === 'admin' && $('rp-cloche-bouton')) rendreClocheNotifications();

  const main = $('rp-main');
  if(state.activeTab === 'dashboard') main.innerHTML = vueDashboard();
  else if(state.activeTab === 'commandes') main.innerHTML = vueCommandes();
  else if(state.activeTab === 'sav') main.innerHTML = vueSav();
  else if(state.activeTab === 'depannage') main.innerHTML = (typeof vueDepannage === 'function') ? vueDepannage() : '';
  else if(state.activeTab === 'retours') main.innerHTML = (typeof vueRetours === 'function') ? vueRetours() : '';
  else if(state.activeTab === 'equipe') main.innerHTML = (typeof vueEquipe === 'function') ? vueEquipe() : '';
  else if(state.activeTab === 'factures') main.innerHTML = vueFactures();
  else if(state.activeTab === 'finance') main.innerHTML = (typeof vueFinance === 'function') ? vueFinance() : '';
  else if(state.activeTab === 'stock') main.innerHTML = vueStock();
  else if(state.activeTab === 'passeport') main.innerHTML = vuePasseportMateriel();
  else if(state.activeTab === 'structures') main.innerHTML = vueStructures();
  else if(state.activeTab === 'bilan') main.innerHTML = vueBilan();
  else if(state.activeTab === 'distribution') main.innerHTML = vueDistribution();
  else if(state.activeTab === 'calendrier') main.innerHTML = vueCalendrierGlobal();
  else if(state.activeTab === 'reglages') main.innerHTML = vueReglages();
  decorerEnTeteOnglet(main, state.activeTab);
  if(state.activeTab === 'depannage' && typeof apresRenduDepannage === 'function') apresRenduDepannage();
  // Animations d'entrée (chiffres, barres) jouées une seule fois par onglet : un simple
  // rafraîchissement (fermeture de modale, clic, mise à jour) ne les rejoue plus.
  main.classList.toggle('rp-vue-stable', state.activeTab === derniereCleVue);
  derniereCleVue = state.activeTab;

  const cleModale = state.modal ? `${state.modal.kind}|${state.modal.ref || ''}|${state.modal.ligne || ''}` : '';
  const zoneModale = $('rp-modal-zone');
  zoneModale.classList.toggle('rp-modal-stable', !!cleModale && cleModale === derniereCleModale);
  derniereCleModale = cleModale;
  zoneModale.innerHTML = state.modal ? vueModal() : '';
}

document.addEventListener('click', async e => {
  const nav = e.target.closest('[data-nav]');
  if(nav){ state.notifOuverte = false; naviguerVersOnglet(nav.dataset.nav); if(nav.dataset.passeportSn) rechercherPasseportMateriel(nav.dataset.passeportSn); return; }

  const clocheBouton = e.target.closest('#rp-cloche-bouton');
  if(clocheBouton){ state.notifOuverte = !state.notifOuverte; render(); return; }
  if(state.notifOuverte && !e.target.closest('#rp-cloche-panel') && !e.target.closest('#rp-cloche-bouton')){
    state.notifOuverte = false; render();
  }

  const feedRow = e.target.closest('[data-feed-goto]');
  if(feedRow){
    state.activeTab = feedRow.dataset.feedGoto;
    state.highlightRef = feedRow.dataset.highlightDoc || null;
    state.modal = null;
    state.notifOuverte = false;
    render();
    // Le clignotement ne doit jouer qu'une fois — sans ça, toute interaction ultérieure sur
    // l'onglet (recherche, etc.) déclenche un nouveau rendu qui le rejouerait indéfiniment.
    const ref = state.highlightRef;
    if(ref) setTimeout(() => { if(state.highlightRef === ref){ state.highlightRef = null; render(); } }, 2400);
    return;
  }

  const kanbanCarte = e.target.closest('[data-commande-ouvrir]');
  if(kanbanCarte){ state.modal = { kind: 'commande', ref: kanbanCarte.dataset.commandeOuvrir, modalParent: modalParentPour('commande') }; state.etapeCommandeOuverte = null; state.notifOuverte = false; render(); return; }
  const kanbanSav = e.target.closest('[data-sav-ouvrir]');
  if(kanbanSav){ state.modal = { kind: 'sav', ref: kanbanSav.dataset.savOuvrir, modalParent: modalParentPour('sav') }; state.accordeonTerminalOuvert = false; state.notifOuverte = false; render(); return; }
  const livrerProduit = e.target.closest('[data-livrer-produit]');
  if(livrerProduit){ state.modal = { kind: 'a-livrer', produit: livrerProduit.dataset.livrerProduit }; render(); return; }

  const modifierProduit = e.target.closest('[data-produit-modifier]');
  if(modifierProduit){ state.modal = { kind: 'creer-produit', ligne: parseInt(modifierProduit.dataset.produitModifier, 10) }; render(); return; }
  const supprimerProduit = e.target.closest('[data-supprimer-produit]');
  if(supprimerProduit){
    if(await confirmerCvdl(`Supprimer le produit « ${supprimerProduit.dataset.nomProduit} » ? Il ne sera plus proposé, mais l'historique des commandes le mentionnant reste inchangé.`)){
      supprimerProduitAction(parseInt(supprimerProduit.dataset.supprimerProduit, 10));
    }
    return;
  }
  const supprimerStructure = e.target.closest('[data-supprimer-structure]');
  if(supprimerStructure){
    if(await confirmerCvdl(`Supprimer la structure « ${supprimerStructure.dataset.nomStructure} » ?\n\nSon code d'accès cessera de fonctionner, mais toutes les commandes, tickets SAV et documents déjà liés à cette structure sont conservés tels quels — rien n'est supprimé côté historique.`)){
      supprimerStructureAction(parseInt(supprimerStructure.dataset.supprimerStructure, 10));
    }
    return;
  }

  const reveal = e.target.closest('[data-reveal-code]');
  if(reveal){ state.revealedCodes[reveal.dataset.revealCode] = !state.revealedCodes[reveal.dataset.revealCode]; render(); return; }
  const modifierStructure = e.target.closest('[data-structure-modifier]');
  if(modifierStructure){ state.modal = { kind: 'creer-structure', ligne: parseInt(modifierStructure.dataset.structureModifier, 10), modalParent: modalParentPour('creer-structure') }; render(); return; }

  const ouvrirReglagesStatuts = e.target.closest('[data-ouvrir-reglages-statuts]');
  if(ouvrirReglagesStatuts){ state.modal = { kind: 'reglages-sav' }; render(); return; }
  const ouvrirModeleBon = e.target.closest('[data-ouvrir-modele-bon]');
  if(ouvrirModeleBon){ state.modal = { kind: 'modele-bon' }; chargerInfoModeleBon(); render(); return; }
  const ouvrirModeleDevis = e.target.closest('[data-ouvrir-modele-devis]');
  if(ouvrirModeleDevis){ state.modal = { kind: 'modele-doc', type: 'devis' }; chargerInfoModeleDoc('devis'); render(); return; }
  const ouvrirModeleFacture = e.target.closest('[data-ouvrir-modele-facture]');
  if(ouvrirModeleFacture){ state.modal = { kind: 'modele-doc', type: 'facture' }; chargerInfoModeleDoc('facture'); render(); return; }
  const ouvrirModeleAttestation = e.target.closest('[data-ouvrir-modele-attestation]');
  if(ouvrirModeleAttestation){ state.modal = { kind: 'modele-attestation' }; chargerInfoModeleAttestation(); render(); return; }
  const copierLien = e.target.closest('[data-copier-lien-portail]');
  if(copierLien){ copierLienPortail(); return; }
  const copierJeton = e.target.closest('[data-copier-jeton]');
  if(copierJeton){ copierTexte(copierJeton.dataset.copierJeton, `${copierJeton.dataset.copierJeton} copié`); return; }
  const monter = e.target.closest('[data-statut-monter]');
  if(monter){ deplacerStatutSav(parseInt(monter.dataset.statutMonter, 10), 'haut'); return; }
  const descendre = e.target.closest('[data-statut-descendre]');
  if(descendre){ deplacerStatutSav(parseInt(descendre.dataset.statutDescendre, 10), 'bas'); return; }
  const supprimerStatut = e.target.closest('[data-statut-supprimer]');
  if(supprimerStatut){ supprimerStatutSav(parseInt(supprimerStatut.dataset.statutSupprimer, 10), supprimerStatut.dataset.statutNom); return; }
  const ajouterStatut = e.target.closest('[data-ajouter-statut]');
  if(ajouterStatut){ ajouterStatutSav(); return; }

  const ouvrirCreationCommandeDepuisDevis = e.target.closest('[data-generer-commande-depuis-devis]');
  if(ouvrirCreationCommandeDepuisDevis){
    state.modal = { kind: 'creer-commande', rattacherDevisLigne: parseInt(ouvrirCreationCommandeDepuisDevis.dataset.genererCommandeDepuisDevis, 10) };
    state.ncLignes = []; state.ncCode = '';
    render();
    return;
  }
  const ouvrirCreation = e.target.closest('[data-ouvrir-creation]');  if(ouvrirCreation){
    const kind = ouvrirCreation.dataset.ouvrirCreation;
    state.modal = { kind: 'creer-' + kind };
    if(kind === 'commande'){ state.ncLignes = []; state.ncCode = ''; }
    if(kind === 'devis'){ state.ndLignes = []; state.ndStructureNom = ''; state.ndEmail = ''; state.ndAdresse = ''; state.modal.libre = false; }
    render();
    return;
  }
  if(e.target.closest('[data-info-types-structure]')){ state.modal = { kind: 'info-types-structure', modalParent: state.modal }; render(); return; }
  if(e.target.closest('[data-organiser-materiel]')){ ouvrirOrganisationMateriel(); return; }
  if(e.target.id === 'materiel-enregistrer'){ enregistrerOrganisationMateriel(); return; }
  const masquerMateriel = e.target.closest('[data-materiel-masquer]');
  if(masquerMateriel){
    const p = state.produits.find(x => x.ligne === parseInt(masquerMateriel.dataset.materielMasquer, 10));
    if(p) p.masqueCategorieMateriel = !p.masqueCategorieMateriel;
    render();
    return;
  }

  if(e.target.closest('[data-modal-fermer]') || e.target.matches('.dialog-backdrop') || e.target.matches('.rp-drawer-backdrop')){
    // Cas particulier de la modale "types de structure" (ouverte par-dessus la fiche
    // structure) : la refermer doit revenir à la modale d'origine, pas tout fermer d'un coup.
    state.modal = (state.modal && state.modal.modalParent) || null;
    state.ncLignes = []; state.ndLignes = []; render(); return;
  }

  // Capture les champs texte du devis libre AVANT tout re-rendu déclenché par cette même
  // modale (ajout/retrait de ligne) — sinon ils repartaient à vide à chaque fois, puisque leur
  // contenu ne vivait que dans le DOM, jamais dans state (voir ndStructureNom et consorts).
  if(state.modal && state.modal.kind === 'devis' && state.modal.libre && $('cdl-structure')){
    state.ndStructureNom = $('cdl-structure').value;
    state.ndEmail = $('cdl-email').value;
    state.ndAdresse = $('cdl-adresse').value;
  }
  if(e.target.closest('[data-nd-ajouter-ligne]')){
    const select = $('nd-produit-select');
    const produit = select.value;
    const quantite = parseInt($('nd-produit-qte').value, 10) || 1;
    const option = select.selectedOptions[0];
    const prixUnitaire = option ? parseFloat(option.dataset.prix) || 0 : 0;
    if(produit){ state.ndLignes.push({ produit, quantite, prixUnitaire }); render(); }
    return;
  }
  const ndRetirerLigne = e.target.closest('[data-nd-retirer-ligne]');
  if(ndRetirerLigne){ state.ndLignes.splice(parseInt(ndRetirerLigne.dataset.ndRetirerLigne, 10), 1); render(); return; }

  if(e.target.closest('[data-nc-ajouter-ligne]')){
    const produit = $('nc-produit-select').value;
    const quantite = parseInt($('nc-produit-qte').value, 10) || 1;
    if(produit){ state.ncLignes.push({ produit, quantite }); render(); }
    return;
  }
  const retirerLigne = e.target.closest('[data-nc-retirer-ligne]');
  if(retirerLigne){ state.ncLignes.splice(parseInt(retirerLigne.dataset.ncRetirerLigne, 10), 1); render(); return; }

  const etape = e.target.closest('[data-changer-statut]');
  if(etape && !etape.disabled){ changerStatutCommande(etape.dataset.ref, etape.dataset.changerStatut); return; }
  const marquerLivree = e.target.closest('[data-marquer-livree]');
  if(marquerLivree){ marquerCommandeLivree(marquerLivree.dataset.marquerLivree); return; }

  const demandeValidation = e.target.closest('[data-demander-validation]');
  if(demandeValidation){ demanderValidationCommande(demandeValidation.dataset.demanderValidation); return; }
  const renvoiValidation = e.target.closest('[data-renvoyer-validation]');
  if(renvoiValidation){ demanderValidationCommande(renvoiValidation.dataset.renvoyerValidation); return; }
  const enregSeries = e.target.closest('[data-confirmer-series]');
  if(enregSeries){ confirmerSeriesCommande(enregSeries.dataset.confirmerSeries); return; }
  const modifierSeries = e.target.closest('[data-modifier-series]');
  if(modifierSeries){ const c = state.commandes.find(x => x.reference === modifierSeries.dataset.modifierSeries); if(c){ (state.confirmSubEtapes[c.ligne] ||= {}).series = false; render(); } return; }
  const confirmColissimo = e.target.closest('[data-confirmer-colissimo]');
  if(confirmColissimo){ confirmerColissimoPreparation(confirmColissimo.dataset.confirmerColissimo); return; }
  const modifierColissimo = e.target.closest('[data-modifier-colissimo]');
  if(modifierColissimo){ const c = state.commandes.find(x => x.reference === modifierColissimo.dataset.modifierColissimo); if(c){ (state.confirmSubEtapes[c.ligne] ||= {}).colissimo = false; render(); } return; }
  const enregEmailAdmin = e.target.closest('[data-enregistrer-email-admin]');
  if(enregEmailAdmin){
    const valeur = ($('rg-email-admin').value || '').trim();
    if(valeur && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur)){ $('rg-secours-retour').innerHTML = '<div class="msg msg-erreur">Adresse e-mail invalide.</div>'; return; }
    posterEtat({ action: 'reglages-set', emailAdmin: valeur }, 'Enregistrement…', 'Adresse enregistrée').then(r => {
      if(r && r.ok){ state.reglages = Object.assign({}, state.reglages, { emailAdmin: valeur }); render(); }
    });
    return;
  }
  const testerAlertes = e.target.closest('[data-tester-alertes]');
  if(testerAlertes){
    testerAlertes.disabled = true;
    posterEtat({ action: 'reglages-tester-alertes' }, 'Envoi…', 'E-mail de test envoyé').then(r => {
      const z = $('rg-secours-retour'); if(!z) return;
      z.innerHTML = r && r.ok ? `<div class="msg msg-succes">E-mail envoyé à ${echapper(r.destinataire)} — vérifiez la boîte de réception (et les indésirables).</div>`
        : `<div class="msg msg-erreur">${echapper((r && r.erreur) || 'Envoi impossible')}</div>`;
      testerAlertes.disabled = false;
    });
    return;
  }
  const genDevis = e.target.closest('[data-generer-devis]');
  if(genDevis){ genererDocumentCommande(genDevis.dataset.genererDevis, 'devis'); return; }
  const genFactureLivree = e.target.closest('[data-generer-facture-livree]');
  if(genFactureLivree){ genererFactureDepuisLivree(genFactureLivree.dataset.genererFactureLivree); return; }
  const enregLienPaiement = e.target.closest('[data-enregistrer-lien-paiement]');
  if(enregLienPaiement){ enregistrerLienPaiement(enregLienPaiement.dataset.enregistrerLienPaiement); return; }
  const enregLiensPaiementPersonnes = e.target.closest('[data-enregistrer-liens-paiement-personnes]');
  if(enregLiensPaiementPersonnes){ enregistrerLiensPaiementPersonnes(enregLiensPaiementPersonnes.dataset.enregistrerLiensPaiementPersonnes); return; }
  const choixMode = e.target.closest('[data-choisir-mode-livraison]');
  if(choixMode){ state.etRouvrirMode = null; choisirModeLivraison(choixMode.dataset.ref, choixMode.dataset.choisirModeLivraison); return; }
  const enregColissimo = e.target.closest('[data-enregistrer-colissimo]');
  if(enregColissimo){ enregistrerColissimoCommande(enregColissimo.dataset.enregistrerColissimo); return; }
  const validerPrep = e.target.closest('[data-valider-preparation]');
  if(validerPrep && !validerPrep.disabled){
    if(await confirmerCvdl('Passer la commande « En livraison » ?\n\nLa structure voit alors le mode de livraison et le suivi dans son espace. Cette étape ne peut pas être annulée ensuite.')){
      validerPreparationCommande(validerPrep.dataset.validerPreparation, validerPrep);
    }
    return;
  }
  const enregDateLivraison = e.target.closest('[data-enregistrer-date-livraison]');
  if(enregDateLivraison){ enregistrerDateLivraisonCommande(enregDateLivraison.dataset.enregistrerDateLivraison); return; }
  const enregDateCible = e.target.closest('[data-enregistrer-date-cible]');
  if(enregDateCible){ enregistrerDateCibleCommande(enregDateCible.dataset.enregistrerDateCible); return; }
  const annuler = e.target.closest('[data-annuler-commande]');
  if(annuler){ annulerCommande(annuler.dataset.annulerCommande); return; }
  const toggleEtapePassee = e.target.closest('[data-toggle-etape-passee]');
  if(toggleEtapePassee){
    const s = toggleEtapePassee.dataset.toggleEtapePassee;
    state.ongletCommande = 'faire';
    state.etapeCommandeOuverte = state.etapeCommandeOuverte === s ? null : s;
    render();
    return;
  }
  const toggleEtapeCourante = e.target.closest('[data-toggle-etape-courante]');
  if(toggleEtapeCourante){
    const s = toggleEtapeCourante.dataset.toggleEtapeCourante;
    state.etapeCommandeOuverte = state.etapeCommandeOuverte === ('replier:' + s) ? null : ('replier:' + s);
    render();
    return;
  }
  const toggleDevisPaiement = e.target.closest('[data-toggle-devis-paiement]');
  if(toggleDevisPaiement){
    state.etapeCommandeOuverte = state.etapeCommandeOuverte === 'devis-paiement' ? null : 'devis-paiement';
    render();
    return;
  }
  const corrigerSeries = e.target.closest('[data-corriger-series]');
  if(corrigerSeries){ corrigerSeriesCommande(corrigerSeries.dataset.corrigerSeries); return; }
  const corrigerColissimo = e.target.closest('[data-corriger-colissimo]');
  if(corrigerColissimo){ corrigerColissimoCommande(corrigerColissimo.dataset.corrigerColissimo); return; }

  const etapeSav = e.target.closest('[data-changer-statut-sav]');
  if(etapeSav && !etapeSav.dataset.verrou){ changerStatutSav(etapeSav.dataset.ref, etapeSav.dataset.changerStatutSav); return; }
  const etapeSavTerminal = e.target.closest('[data-changer-statut-sav-terminal]');
  if(etapeSavTerminal){
    const statut = etapeSavTerminal.dataset.changerStatutSavTerminal;
    const raison = await demanderCvdl(`Clôturer ce dossier avec le statut « ${statut} » ? Cette action est définitive.\n\nMotif (visible par la structure/la personne accompagnée dans son suivi) :`);
    if(raison === null) return; // annulé
    if(!raison.trim()){ etat('Un motif est obligatoire pour clôturer le dossier.', 'erreur'); return; }
    clotureSavAvecMotif(etapeSavTerminal.dataset.ref, statut, raison.trim());
    return;
  }
  const annulSav = e.target.closest('[data-annuler-sav]');
  if(annulSav){ annulerSav(annulSav.dataset.annulerSav); return; }
  const toggleAccTerminal = e.target.closest('[data-toggle-accordeon-terminal]');
  if(toggleAccTerminal){ state.accordeonTerminalOuvert = !state.accordeonTerminalOuvert; render(); return; }
  const ongletCmd = e.target.closest('[data-onglet-commande]');
  if(ongletCmd){ state.ongletCommande = ongletCmd.dataset.ongletCommande; state.etapeCommandeOuverte = null; render(); return; }
  const vueCommandesToggle = e.target.closest('[data-commandes-vue]');
  if(vueCommandesToggle){ state.commandesVue = vueCommandesToggle.dataset.commandesVue; state.commandesPage = 0; render(); return; }
  const vueDocsToggle = e.target.closest('[data-docs-vue]');
  if(vueDocsToggle){ state.docsVue = vueDocsToggle.dataset.docsVue; render(); return; }
  const toggleDevisLibre = e.target.closest('[data-toggle-devis-libre]');
  if(toggleDevisLibre){ state.modal.libre = toggleDevisLibre.dataset.toggleDevisLibre === '1'; render(); return; }
  const filtrerDocs = e.target.closest('[data-filtrer-docs]');
  if(filtrerDocs){ state.docsFiltre = filtrerDocs.dataset.filtrerDocs; render(); return; }
  const annulerDevis = e.target.closest('[data-annuler-devis]');
  if(annulerDevis){
    const motif = await demanderCvdl(`Annuler le devis « ${annulerDevis.dataset.refDevis} » ? Cette action est irréversible.\n\nMotif (interne, non visible par la structure) :`);
    if(motif !== null && motif.trim()) annulerDocumentAction('devis', parseInt(annulerDevis.dataset.annulerDevis, 10), motif.trim());
    return;
  }
  const annulerFacture = e.target.closest('[data-annuler-facture]');
  if(annulerFacture){
    const motif = await demanderCvdl(`Annuler la facture « ${annulerFacture.dataset.refFacture} » ? Cette action est irréversible.\n\nMotif (interne, non visible par la structure) :`);
    if(motif !== null && motif.trim()) annulerDocumentAction('facture', parseInt(annulerFacture.dataset.annulerFacture, 10), motif.trim());
    return;
  }
  const docOuvrir = e.target.closest('[data-doc-ouvrir]');
  if(docOuvrir){
    const [type, ref] = docOuvrir.dataset.docOuvrir.split(':');
    state.modal = { kind: 'document-genere', type, ref };
    state.documentGenere = { type, ref, chargement: false, url: null, erreur: null };
    render();
    return;
  }
  if(e.target.closest('[data-doc-generer]')){ genererDocumentPdf(); return; }
  if(e.target.closest('[data-doc-envoyer]')){ envoyerDocumentGenere(); return; }
  if(e.target.closest('[data-toggle-envoi-doc]')){
    if(state.documentGenere) state.documentGenere.envoiOuvert = !state.documentGenere.envoiOuvert;
    render();
    return;
  }
  const ouvrirDocGenere = e.target.closest('[data-ouvrir-doc-genere]');
  if(ouvrirDocGenere){ ouvrirDocumentGenere(ouvrirDocGenere.dataset.ouvrirDocGenere); return; }
  const filtrerStatutCommande = e.target.closest('[data-filtrer-statut-commande]');
  if(filtrerStatutCommande){ state.commandesFiltreStatut = filtrerStatutCommande.dataset.filtrerStatutCommande; state.commandesPage = 0; render(); return; }
  const filtrerTypeCommande = e.target.closest('[data-filtrer-type-commande]');
  if(filtrerTypeCommande){ state.commandesFiltreType = filtrerTypeCommande.dataset.filtrerTypeCommande; state.commandesPage = 0; render(); return; }
  const filtrerStatutSav = e.target.closest('[data-filtrer-statut-sav]');
  if(filtrerStatutSav){ state.savFiltreStatut = filtrerStatutSav.dataset.filtrerStatutSav; render(); return; }
  const savVue = e.target.closest('[data-sav-vue]');
  if(savVue){ state.savVue = savVue.dataset.savVue; render(); return; }
  const calendrierMois = e.target.closest('[data-calendrier-mois]');
  if(calendrierMois){ state.calendrierDecalageMois += parseInt(calendrierMois.dataset.calendrierMois, 10); render(); return; }
  if(e.target.closest('[data-calendrier-aujourdhui]')){ const a = new Date(); state.calendrierDecalageMois = 0; state.calendrierJourChoisi = `${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,'0')}-${String(a.getDate()).padStart(2,'0')}`; render(); return; }
  const calendrierJour = e.target.closest('[data-calendrier-jour]');
  if(calendrierJour){ state.calendrierJourChoisi = calendrierJour.dataset.calendrierJour; render(); return; }
  if(e.target.closest('#rp-toggle-theme')){ basculerTheme(); return; }
  if(e.target.closest('#rp-toggle-style')){ basculerStyle(); return; }
  if(e.target.closest('#rp-toggle-largeur')){ basculerLargeur(); return; }
  const pageCommandes = e.target.closest('[data-page-commandes]');
  if(pageCommandes && !pageCommandes.disabled){ state.commandesPage = parseInt(pageCommandes.dataset.pageCommandes, 10); render(); return; }

  const ouvrirRappro = e.target.closest('[data-ouvrir-rapprochement]');
  if(ouvrirRappro){ state.modal = { kind: 'rapprochement', refFacture: ouvrirRappro.dataset.ouvrirRapprochement }; render(); return; }
  const ouvrirRattachement = e.target.closest('[data-rattacher-devis]');
  if(ouvrirRattachement){ state.modal = { kind: 'rattacher-devis', ligneDevis: parseInt(ouvrirRattachement.dataset.rattacherDevis, 10) }; render(); return; }
  const kpiListing = e.target.closest('[data-kpi-listing]');
  if(kpiListing){ state.modal = { kind: 'kpi-listing', quoi: kpiListing.dataset.kpiListing }; render(); return; }
  const viderRecherche = e.target.closest('[data-vider-recherche]');
  if(viderRecherche){
    const cle = CHAMPS_RECHERCHE[viderRecherche.dataset.viderRecherche];
    if(cle){ state[cle] = ''; if(cle === 'commandeSearch') state.commandesPage = 0; render(); }
    return;
  }
  const genererCode = e.target.closest('[data-generer-code-structure]');
  if(genererCode){
    if(state.modal && state.modal.kind === 'creer-structure' && state.modal.v){ state.modal.v.code = genererCodeStructure(); state.modal.v.codeMode = 'generer'; render(); }
    return;
  }
  const regenererCode = e.target.closest('[data-regenerer-code-structure]');
  if(regenererCode){
    if(!await confirmerCvdl('Régénérer le code de cette structure ? L\'ancien code cessera de fonctionner immédiatement (liens déjà partagés, portail, suivi de commande...).')) return;
    (async () => {
      const ligne = parseInt(regenererCode.dataset.regenererCodeStructure, 10);
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const groupe = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const nouveauCode = `${groupe()}-${groupe()}-${groupe()}-${groupe()}`;
      regenererCode.disabled = true;
      try{
        const r = await poster({ action: 'structure-update', ligne, champ: 'code', valeur: nouveauCode, password: motDePasse });
        if(r.ok){
          const st = state.structures.find(x => x.ligne === ligne);
          if(st) st.code = nouveauCode;
          etat('Code régénéré', 'succes');
          render();
        }else{
          etat(r.erreur || 'Régénération impossible', 'erreur');
          regenererCode.disabled = false;
        }
      }catch(err){ etat('Régénération impossible', 'erreur'); regenererCode.disabled = false; }
    })();
    return;
  }
});
// Recherche : on ne re-rend qu'après une courte pause de frappe (pas à chaque lettre), et on
// restaure le focus + la position du curseur ensuite — sinon le re-rendu complet du HTML
// recrée le champ et fait perdre le focus à chaque caractère tapé.
let rechercheDebounce = null;
const CHAMPS_RECHERCHE = { 'rp-recherche-commandes': 'commandeSearch', 'rp-recherche-sav': 'savSearch', 'rp-recherche-docs': 'docSearch' };
/** Même règle de casse que commande.html/flotte-structure.html (dupliquée ici, pas de module
 *  commun dans ce projet) : le prénom ne prend une majuscule qu'en début de chaque mot (gère
 *  les prénoms composés, tiret ou espace), le nom de famille passe entièrement en majuscule. */
function capitaliserPrenom(valeur){
  let resultat = '', debutMot = true;
  for(const car of valeur){
    if(car === ' ' || car === '-'){ resultat += car; debutMot = true; }
    else if(debutMot){ resultat += car.toUpperCase(); debutMot = false; }
    else resultat += car.toLowerCase();
  }
  return resultat;
}
document.addEventListener('compositionend', e => {
  if(e.target.id === 'cs-responsable-prenom' || e.target.id === 'cs-responsable-facturation-prenom'){ const p = e.target.selectionStart; e.target.value = capitaliserPrenom(e.target.value); e.target.setSelectionRange(p, p); }
  if(e.target.id === 'cs-responsable-nom' || e.target.id === 'cs-responsable-facturation-nom'){ const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); }
});
document.addEventListener('input', e => {
  if(e.target.id === 'rg-demo-confirmation'){
    const bouton = $('rg-demo-lancer');
    if(bouton) bouton.disabled = e.target.value.trim() !== 'RÉINITIALISER';
    return;
  }
  if((e.target.id === 'cs-responsable-prenom' || e.target.id === 'cs-responsable-facturation-prenom') && !e.isComposing){
    const position = e.target.selectionStart;
    e.target.value = capitaliserPrenom(e.target.value);
    e.target.setSelectionRange(position, position);
    return;
  }
  if((e.target.id === 'cs-responsable-nom' || e.target.id === 'cs-responsable-facturation-nom') && !e.isComposing){
    const position = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(position, position);
    return;
  }
  if(e.target.matches && e.target.matches('[data-serie-index]')){ synchroSeriesDepuisLignes(); return; }
  if(e.target.id === 'pn-series'){
    const attendu = parseInt(e.target.dataset.quantiteAttendue, 10) || 0;
    const n = e.target.value.split('\n').map(s => s.trim()).filter(Boolean).length;
    const compteur = $('pn-series-compteur');
    if(compteur) compteur.textContent = `${n}/${attendu} saisi${n > 1 ? 's' : ''}`;
    return;
  }
  const cle = CHAMPS_RECHERCHE[e.target.id];
  if(!cle) return;
  state[cle] = e.target.value;
  if(cle === 'commandeSearch') state.commandesPage = 0;
  const id = e.target.id, curseur = e.target.selectionStart;
  clearTimeout(rechercheDebounce);
  rechercheDebounce = setTimeout(() => {
    render();
    const champ = $(id);
    if(champ){ champ.focus(); champ.setSelectionRange(curseur, curseur); }
  }, 300);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-statut-config]');
  if(el){ modifierStatutSav(parseInt(el.dataset.statutConfig, 10), el.dataset.champ, el.type === 'checkbox' ? el.checked : el.value); return; }
  if(e.target.id === 'pn-series-csv'){ importerCsvSeries(e.target.files[0]); return; }
  if(e.target.id === 'nc-code'){ state.ncCode = e.target.value; render(); return; }
  if(e.target.id === 'nd-structure-select'){
    const st = state.structures.find(x => x.code === e.target.value);
    state.ndStructureNom = st ? st.nom : '';
    state.ndEmail = st ? (st.email || '') : '';
    state.ndAdresse = st ? (st.adresse || '') : '';
    $('cdl-structure').value = state.ndStructureNom;
    $('cdl-email').value = state.ndEmail;
    $('cdl-adresse').value = state.ndAdresse;
    return;
  }
  const ndPrixLigne = e.target.closest('[data-nd-prix-ligne]');
  if(ndPrixLigne){
    const i = parseInt(ndPrixLigne.dataset.ndPrixLigne, 10);
    if(state.ndLignes[i]) state.ndLignes[i].prixUnitaire = parseFloat(ndPrixLigne.value) || 0;
    render();
    return;
  }
  if(e.target.dataset.groupesMode){ $(`${e.target.dataset.groupesMode}-mixte`).style.display = e.target.value === 'mixte' ? 'flex' : 'none'; return; }
  if(e.target.id === 'bilan-annee'){ state.bilanAnnee = parseInt(e.target.value, 10); render(); return; }
  if(e.target.id === 'sav-stats-annee'){ state.savStatsAnnee = parseInt(e.target.value, 10); render(); return; }
  if(e.target.id === 'cp-icone'){
    const v = e.target.value;
    const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(v);
    const estTablette = v === 'tablette';
    const zoneMateriel = $('cp-tech-materiel');
    if(zoneMateriel) zoneMateriel.style.display = (estOrdiOuTelephone || estTablette) ? 'grid' : 'none';
    const zoneProcesseur = $('cp-champ-processeur');
    if(zoneProcesseur) zoneProcesseur.style.display = estOrdiOuTelephone ? 'block' : 'none';
    const zoneRecharge = $('cp-tech-recharge');
    if(zoneRecharge) zoneRecharge.style.display = v === 'recharge' ? 'grid' : 'none';
    return;
  }
});
/** Import CSV tec.tech : le numéro de série est toujours en colonne G (7ᵉ colonne), à partir
 *  de la 2ᵉ ligne (la 1ʳᵉ est l'en-tête) — jamais la 1ʳᵉ colonne, contrairement à ce qui était
 *  fait avant. Parsing minimal mais gère les champs entre guillemets et le séparateur , ou ;. */
function parserLigneCsv(ligne, separateur){
  const champs = [];
  let champ = '', dansGuillemets = false;
  for(let i = 0; i < ligne.length; i++){
    const car = ligne[i];
    if(car === '"'){
      if(dansGuillemets && ligne[i + 1] === '"'){ champ += '"'; i++; }
      else dansGuillemets = !dansGuillemets;
    }else if(car === separateur && !dansGuillemets){
      champs.push(champ); champ = '';
    }else champ += car;
  }
  champs.push(champ);
  return champs.map(c => c.trim());
}
/* Saisie « un appareil = une ligne » : le champ #pn-series (source envoyée au serveur) est
   reconstruit à partir des lignes ; l'import CSV remplit les lignes dans l'ordre. */
function synchroSeriesDepuisLignes(){
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  const zone = $('pn-series');
  if(!zone || !champs.length) return;
  zone.value = champs.map(x => x.value.trim()).join('\n').replace(/\n+$/, '');
  const prets = champs.filter(x => x.value.trim()).length;
  champs.forEach(x => x.closest('.ul-ligne').classList.toggle('ok', !!x.value.trim()));
  const compteur = $('pn-series-compteur'); const total = champs.length;
  if(compteur) compteur.textContent = `${prets} / ${total} prêt${prets > 1 ? 's' : ''}`;
  const barre = $('ul-barre'); if(barre) barre.style.width = `${total ? Math.round(prets / total * 100) : 0}%`;
  // Enregistrement automatique dès que toutes les lignes sont remplies (plus de bouton « Confirmer »).
  clearTimeout(synchroSeriesDepuisLignes.t);
  if(total && prets === total && zone.dataset.ref){
    const c = state.commandes.find(x => x.reference === zone.dataset.ref);
    if(c && zone.value !== String(c.numerosSerie || '').replace(/\n+$/, '')) synchroSeriesDepuisLignes.t = setTimeout(() => confirmerSeriesCommande(zone.dataset.ref), 700);
  }
}
function remplirLignesSeries(numeros){
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  let k = 0;
  champs.forEach(x => { if(!x.value.trim() && k < numeros.length) x.value = numeros[k++]; });
  synchroSeriesDepuisLignes();
  return k;
}
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' || !e.target.matches || !e.target.matches('[data-serie-index]')) return;
  e.preventDefault();
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  const suivant = champs[champs.indexOf(e.target) + 1];
  if(suivant) suivant.focus(); else { const b = document.querySelector('.et-principal'); if(b) b.focus(); }
});
/* ── Import CSV tec.tech : chaque numéro va sur la ligne du BON produit ──
   Export réel (26/09/2026) : ID, Type de matériel, …, Numero de serie (G), IMEI 1, IMEI 2, …,
   Modèle, Marque, …, Catégorie, … — tout est lu par nom d'en-tête.
   Les fiches produit portent leur « Type tec.tech » (ORDINATEUR_PORTABLE, SMARTPHONE…) et leur
   « Catégorie tec.tech » (PREMIUM, A…D). Pour chaque numéro du CSV, on connaît son type et sa
   catégorie : par les colonnes du CSV si elles existent (en-têtes reconnus), sinon en
   interrogeant tec.tech. Placement : type + catégorie identiques, puis type seul, puis (si
   rien n'est configuré sur le produit) dans l'ordre. Ce qui ne correspond à rien est signalé. */
const normTT = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
function typeTecTech(v){
  const n = normTT(v);
  if(!n) return '';
  if(/PORTABLE|LAPTOP|NOTEBOOK/.test(n)) return 'ORDINATEUR_PORTABLE';
  if(/FIXE|DESKTOP|UNITE_CENTRALE|TOUR/.test(n)) return 'ORDINATEUR_FIXE';
  if(/SMARTPHONE|TELEPHONE|MOBILE/.test(n)) return 'SMARTPHONE';
  if(/TABLETTE|TABLET/.test(n)) return 'TABLETTE';
  return n;
}
function categorieTecTech(v){
  const n = normTT(v);
  if(!n) return '';
  if(/PREMIUM/.test(n)) return 'PREMIUM';
  const m = n.match(/(?:^|_)(?:CAT(?:EGORIE)?|GRADE)?_?([A-D])$/);
  return m ? m[1] : n;
}
function lireCsvTecTech(texte){
  const lignes = String(texte || '').split(/\r?\n/).filter(l => l.trim());
  if(lignes.length < 2) return null;
  const sep = lignes[0].includes(';') ? ';' : ',';
  const entetes = parserLigneCsv(lignes[0], sep).map(normTT);
  const col = motifs => entetes.findIndex(h => motifs.some(m => m.test(h)));
  const iSerie = (() => { const k = col([/NUMERO_?DE_?SERIE/, /^N_?SERIE/, /SERIAL/, /^SN$/]); return k >= 0 ? k : 6; })(); // défaut : colonne G
  const iType = col([/TYPE_?(DE_?)?MATERIEL/, /^TYPE$/]);
  const iCat = col([/CATEGORIE/, /GRADE/]);
  const iMarque = col([/MARQUE/, /BRAND/]);
  const iModele = col([/MODELE/, /MODEL/]);
  const iImei = col([/^IMEI_?1$/, /^IMEI$/]); // smartphones sans n° de série : l'IMEI 1 en tient lieu
  return lignes.slice(1).map(l => {
    const c = parserLigneCsv(l, sep);
    return { numeroSerie: ((c[iSerie] || '').trim() || (iImei >= 0 ? (c[iImei] || '').trim() : '')), type: iType >= 0 ? typeTecTech(c[iType]) : '', categorie: iCat >= 0 ? categorieTecTech(c[iCat]) : '',
      marque: iMarque >= 0 ? c[iMarque] || '' : '', modele: iModele >= 0 ? c[iModele] || '' : '' };
  }).filter(x => x.numeroSerie);
}
/** Place les appareils du CSV sur les lignes vides, produit par produit. Renvoie le bilan. */
function placerSeriesParProduit(c, appareils){
  const champs = [...document.querySelectorAll('[data-serie-index]')];
  const unites = unitesSeriePersonnes(c);
  const deja = new Set(champs.map(x => x.value.trim()).filter(Boolean));
  const restants = appareils.filter(a => !deja.has(a.numeroSerie));
  const places = [], pris = new Set();
  const produitDe = i => state.produits.find(p => p.nom === (unites[i] || {}).produit) || {};
  const tenter = (critere) => champs.forEach((ch, i) => {
    if(ch.value.trim()) return;
    const p = produitDe(i);
    const a = restants.find(x => !pris.has(x.numeroSerie) && critere(p, x));
    if(a){ ch.value = a.numeroSerie; pris.add(a.numeroSerie); places.push({ ...a, produit: (unites[i] || {}).produit }); }
  });
  const tt = p => typeTecTech(p.tectechType), ct = p => categorieTecTech(p.tectechCategorie);
  tenter((p, a) => tt(p) && a.type && tt(p) === a.type && ct(p) && a.categorie && ct(p) === a.categorie); // type + catégorie
  tenter((p, a) => tt(p) && a.type && tt(p) === a.type && (!ct(p) || !a.categorie));                    // type seul (catégorie inconnue)
  tenter((p, a) => !tt(p) && !a.type);                                                                   // rien de configuré : dans l'ordre
  tenter((p, a) => !a.type);                                                                             // type inconnu (tec.tech indisponible) : dans l'ordre
  const nonPlaces = restants.filter(a => !pris.has(a.numeroSerie));
  synchroSeriesDepuisLignes();
  return { places, nonPlaces, lignesVides: champs.filter(x => !x.value.trim()).length };
}
function importerCsvSeries(fichier){
  if(!fichier) return;
  const c = state.modal && state.commandes.find(x => x.reference === state.modal.ref);
  const lecteur = new FileReader();
  lecteur.onload = async () => {
    const appareils = lireCsvTecTech(lecteur.result);
    if(!appareils){ etat('CSV vide ou sans ligne de données (2ᵉ ligne).', 'erreur'); return; }
    if(!appareils.length){ etat('Aucun numéro de série trouvé dans le CSV.', 'erreur'); return; }
    if(!c || !document.querySelector('[data-serie-index]')){
      const zone = $('pn-series'); if(zone) zone.value = appareils.map(a => a.numeroSerie).join('\n');
      etat(`${appareils.length} numéro${appareils.length > 1 ? 's' : ''} importé${appareils.length > 1 ? 's' : ''}`, 'succes'); return;
    }
    // Type / catégorie absents du CSV : demandés à tec.tech (un seul appel groupé).
    const aCompleter = appareils.filter(a => !a.type);
    if(aCompleter.length){
      etat('Recherche des appareils chez tec.tech…', 'chargement');
      try{
        const r = await poster({ action: 'tectech-classer-series', numeros: aCompleter.map(a => a.numeroSerie) });
        if(r && r.ok) r.resultats.forEach(x => { const a = appareils.find(y => y.numeroSerie === x.numeroSerie); if(a){ a.type = typeTecTech(x.type); a.categorie = a.categorie || categorieTecTech(x.categorie); a.marque = a.marque || x.marque; a.modele = a.modele || x.modele; } });
      }catch(e){ /* tec.tech indisponible : placement dans l'ordre pour ce qui n'est pas typé */ }
    }
    const bilan = placerSeriesParProduit(c, appareils);
    const n = bilan.places.length;
    const hors = bilan.nonPlaces.length ? ` · ${bilan.nonPlaces.length} hors commande (${bilan.nonPlaces.slice(0, 3).map(a => a.numeroSerie).join(', ')}${bilan.nonPlaces.length > 3 ? '…' : ''})` : '';
    etat(n ? `${n} numéro${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''} sur le bon produit${hors}` : 'Aucun numéro ne correspond aux produits de la commande', n ? 'succes' : 'erreur', hors ? 12000 : undefined);
    const z = $('pn-erreur-series');
    if(z) z.innerHTML = bilan.nonPlaces.length ? `<div class="msg msg-warn">${bilan.nonPlaces.length} numéro${bilan.nonPlaces.length > 1 ? 's' : ''} du CSV ne correspond${bilan.nonPlaces.length > 1 ? 'ent' : ''} à aucune ligne restante : ${bilan.nonPlaces.slice(0, 8).map(a => `${echapper(a.numeroSerie)}${a.type ? ` (${echapper([a.type.replace(/_/g, ' ').toLowerCase(), a.categorie].filter(Boolean).join(' · '))})` : ''}`).join(', ')}${bilan.nonPlaces.length > 8 ? '…' : ''}. Vérifiez le Type / la Catégorie tec.tech des fiches produit.</div>` : '';
  };
  lecteur.readAsText(fichier);
}
/** Marquer livrée avec une date choisie explicitement — évite que le back complète tout seul
 *  la date du jour (il ne le fait que si le champ est vide, donc l'envoyer nous-mêmes suffit à
 *  éviter cet auto-remplissage). */
async function marquerCommandeLivree(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const iso = $('pn-date-livraison-directe').value;
  if(!iso) return;
  const [y, mo, d] = iso.split('-');
  const dateFr = `${d}/${mo}/${y}`;
  etat('Enregistrement…', 'chargement');
  try{
    const rDate = await poster({ action: 'update', ligne: c.ligne, champ: 'dateLivraison', valeur: dateFr });
    if(!rDate.ok){ etat(rDate.erreur || 'Enregistrement impossible', 'erreur'); return; }
    c.dateLivraison = dateFr;
    const rStatut = await poster({ action: 'update', ligne: c.ligne, champ: 'statutCommande', valeur: 'Livrée' });
    if(rStatut.ok){ c.statutCommande = 'Livrée'; etat('Commande livrée', 'succes'); render(); }
    else etat(rStatut.erreur || 'Enregistrement impossible', 'erreur');
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
}
async function changerStatutCommande(ref, nouveauStatut){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const avant = c.statutCommande;
  c.statutCommande = nouveauStatut; // optimiste
  render();
  try{
    const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'statutCommande', valeur: nouveauStatut }, 'Changement de statut…', 'Statut mis à jour');
    if(!r || !r.ok){ c.statutCommande = avant; render(); afficherErreurModale(r && r.erreur); }
  }catch(e){ c.statutCommande = avant; render(); afficherErreurModale('Une erreur est survenue.'); }
}

async function changerStatutSav(ref, nouveauStatut){
  const s = state.sav.find(x => x.reference === ref);
  if(!s) return;
  const avant = s.statut;
  s.statut = nouveauStatut; // optimiste
  render();
  try{
    const r = await posterEtat({ action: 'sav-update', ligne: s.ligne, champ: 'statut', valeur: nouveauStatut }, 'Changement de statut…', 'Statut mis à jour');
    if(!r || !r.ok){ s.statut = avant; render(); }
  }catch(e){ s.statut = avant; render(); }
}
/** Clôture d'un dossier SAV (via un statut Terminal existant, "Annulé" y compris) avec motif
 *  obligatoire — enregistré dans "notes", déjà affiché sur les pages de suivi public
 *  (bénéficiaire et structure), donc rien à modifier côté back pour que ça s'y voie. */
async function clotureSavAvecMotif(ref, statut, raison){
  const s = state.sav.find(x => x.reference === ref);
  if(!s) return;
  etat('Clôture du dossier…', 'chargement');
  try{
    const [rs, rn] = await Promise.all([
      poster({ action: 'sav-update', ligne: s.ligne, champ: 'statut', valeur: statut }),
      poster({ action: 'sav-update', ligne: s.ligne, champ: 'notes', valeur: raison })
    ]);
    if(rs.ok && rn.ok){ s.statut = statut; s.notes = raison; etat('Dossier clôturé', 'succes'); render(); }
    else etat((rs.erreur || rn.erreur) || 'Clôture impossible', 'erreur');
  }catch(e){ etat('Clôture impossible', 'erreur'); }
}
/** "Annuler ce SAV" — crée un statut Terminal "Annulé" à la volée s'il n'existe pas encore
 *  (même mécanisme que les autres statuts, juste ajouté une fois pour toutes), puis clôture
 *  dessus avec le motif obligatoire. */
async function annulerSav(ref){
  const s = state.sav.find(x => x.reference === ref);
  if(!s) return;
  const raison = await demanderCvdl('Annuler ce dossier SAV ? Cette action est définitive.\n\nMotif (visible par la structure/la personne accompagnée dans son suivi) :');
  if(raison === null) return;
  if(!raison.trim()){ etat('Un motif est obligatoire pour annuler le dossier.', 'erreur'); return; }
  let statutAnnule = state.statutsSav.find(x => x.terminal && x.statut.toLowerCase().includes('annul'));
  if(!statutAnnule){
    etat('Création du statut « Annulé »…', 'chargement');
    const rAjout = await poster({ action: 'sav-statut-ajouter', statut: 'Annulé' });
    if(!rAjout.ok){ etat(rAjout.erreur || 'Création du statut impossible', 'erreur'); return; }
    await rechargerStatutsSav();
    const cree = state.statutsSav.find(x => x.statut === 'Annulé');
    if(cree) await poster({ action: 'sav-statut-modifier', ligne: cree.ligne, champ: 'terminal', valeur: true });
    await rechargerStatutsSav();
    statutAnnule = state.statutsSav.find(x => x.statut === 'Annulé');
  }
  if(!statutAnnule){ etat('Impossible de créer le statut « Annulé »', 'erreur'); return; }
  clotureSavAvecMotif(ref, statutAnnule.statut, raison.trim());
}

/** Rapprochement bancaire : le statut vit sur la commande liée (statutComptable), pas sur la
 *  facture elle-même — jointure par référence, comme partout ailleurs dans l'appli. */
const STATUTS_COMPTABLES = ['Non rapproché', 'Rapproché', 'Clôturé'];
function vueRattacherDevis(){
  const ligneDevis = state.modal.ligneDevis;
  const d = state.devis.find(x => x.ligne === ligneDevis);
  if(!d) return '';
  const eligibles = state.commandes.filter(c => !c.referenceDevis && !structureExclueDevisFacture(c));
  return dialogShell(`Rattacher ${d.referenceDevis} à une commande`, `
    ${eligibles.length
      ? champ('Commande *', `<select class="input" id="rd-ligne">${eligibles.map(c => `<option value="${c.ligne}">${echapper(c.reference)} — ${echapper(c.nom)}</option>`).join('')}</select>`)
      : '<p style="opacity:0.6;font-size:13px;margin-top:var(--space-2)">Aucune commande sans devis à rattacher.</p>'}
  `, 'rd-enregistrer');
}
async function enregistrerRattachementDevis(){
  const select = $('rd-ligne');
  if(!select){ state.modal = null; render(); return; }
  const ligneCommande = parseInt(select.value, 10);
  const ligneDevis = state.modal.ligneDevis;
  $('rd-enregistrer').disabled = true;
  try{
    const r = await posterEtat({ action: 'devis-rattacher-commande', ligneDevis, ligneCommande }, 'Rattachement…', 'Devis rattaché');
    if(r.ok){
      const [rc, rd] = await Promise.all([
        jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
        jsonp({ action: 'devis', password: motDePasse, limite: 0 })
      ]);
      if(rc.ok) state.commandes = rc.commandes;
      if(rd.ok) state.devis = rd.devis;
      state.modal = null; render();
    }else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('rd-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Rattachement impossible.</div>'; $('rd-enregistrer').disabled = false; }
}
function vueRapprochement(){
  const c = state.commandes.find(x => x.referenceFacture === state.modal.refFacture);
  if(!c) return '';
  return dialogShell(`Rapprochement — ${c.reference}`, `
    ${champ('Statut', `<select class="input" id="rp-statut-comptable">
      ${STATUTS_COMPTABLES.map(s => `<option value="${s}" ${c.statutComptable === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>`)}
    ${champ('Note', `<textarea class="input" id="rp-note-depot" rows="2" placeholder="Numéro de dépôt bancaire, reçu Zettle etc.">${echapper(c.numeroDepot || '')}</textarea>`)}
    <p style="font-size:12.5px;opacity:0.6;margin:0">Passer en "Rapproché" ou "Clôturé" marque aussi la commande et sa facture comme payées.</p>
  `, 'rp-enregistrer-rappro');
}
async function enregistrerRapprochement(){
  const c = state.commandes.find(x => x.referenceFacture === state.modal.refFacture);
  if(!c) return;
  const statut = $('rp-statut-comptable').value;
  const note = $('rp-note-depot').value.trim();
  const f = state.factures.find(x => x.referenceFacture === c.referenceFacture);
  // Rapproché ou Clôturé = la commande a été confrontée au relevé bancaire et son montant y
  // figure bien : ça VEUT DIRE qu'elle est payée, qu'elle soit passée par le lien de paiement en
  // ligne ou réglée autrement (virement, chèque...). Avant ce correctif, rien dans l'admin ne
  // permettait de marquer une commande "Payée" en dehors du paiement en ligne — un règlement
  // par un autre moyen restait donc invisible partout (tableau de bord inclus).
  const marquerPaye = statut === 'Rapproché' || statut === 'Clôturé';
  $('rp-enregistrer-rappro').disabled = true;
  try{
    const appels = [
      poster({ action: 'update', ligne: c.ligne, champ: 'statutComptable', valeur: statut }),
      poster({ action: 'update', ligne: c.ligne, champ: 'numeroDepot', valeur: note })
    ];
    if(marquerPaye) appels.push(poster({ action: 'update', ligne: c.ligne, champ: 'statutPaiement', valeur: 'Payé' }));
    if(marquerPaye && f) appels.push(poster({ action: 'facture-update', ligne: f.ligne, champ: 'statut', valeur: 'Payée' }));
    const reponses = await Promise.all(appels);
    if(!reponses.find(r => !r.ok)){
      c.statutComptable = statut; c.numeroDepot = note;
      if(marquerPaye) c.statutPaiement = 'Payé';
      if(marquerPaye && f) f.statut = 'Payée';
      etat('Rapprochement mis à jour', 'succes');
      state.modal = null; render();
    }else{ etat('Enregistrement impossible', 'erreur'); $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>'; $('rp-enregistrer-rappro').disabled = false; }
  }catch(e){ etat('Enregistrement impossible', 'erreur'); $('rp-enregistrer-rappro').disabled = false; }
}

/* ============================================================
   Dashboard
   ============================================================ */
function commandesUrgentes(){
  // Volontairement limité aux étapes où une action reste à faire (Reçue/Validée/Préparée) —
  // une fois "En cours de livraison" ou "Livrée", ce n'est plus une notification actionnable :
  // le fil des priorités doit rester un centre de notifs des VRAIS trucs à vérifier, pas un
  // rappel permanent de tout ce qui a été marqué urgent un jour.
  return state.commandes.filter(c => c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande));
}
function savOuvertsListe(){
  // Un statut "Fin de cycle" ferme l'anneau de progression à 100% même sans être coché
  // "Terminal" — dans les deux cas, le dossier est résolu et n'a plus rien à surveiller, donc
  // les deux drapeaux sortent le ticket du centre de notifs.
  return state.sav.filter(s => {
    const def = state.statutsSav.find(st => st.statut === s.statut);
    return !(def && (def.terminal || def.finCycle));
  });
}
function docsEnAttenteListe(){
  return [
    ...state.devis.filter(d => d.statut === 'En attente' || d.statut === 'En retard').map(d => ({ ...d, type: 'Devis' })),
    ...state.factures.filter(f => f.statut === 'En attente' || f.statut === 'En retard').map(f => ({ ...f, type: 'Facture' }))
  ];
}
function commandesPaiementEnAttente(){
  return state.commandes.filter(c => c.dernierClicLienPaiement && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé');
}
function commandesLivraisonDepassee(){
  const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
  return state.commandes.filter(c => {
    if(c.statutCommande !== 'En cours de livraison' || !c.dateLivraisonCible) return false;
    const iso = dateVersISO(c.dateLivraisonCible);
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) && d < aujourdhui;
  });
}
/** Renommé mentalement "à clôturer" (le statut comptable final visé) — un dossier facturé pas
 *  encore clôturé, qu'il ait été payé en ligne ou autrement (l'ancienne version exigeait
 *  `statutPaiement === 'Payé'`, qui ne devient vrai que via le paiement en ligne — un règlement
 *  par virement ou chèque, marqué "payé" uniquement au moment du rapprochement lui-même,
 *  n'aurait donc jamais pu apparaître ici). */
function commandesARapprocher(){
  return state.commandes.filter(c => c.referenceFacture && c.statutComptable !== 'Clôturé');
}
/** Regroupe les commandes par date de livraison — la date CONFIRMÉE (dateLivraison, remplie à
 *  "Marquer livrée", quel que soit le mode) prime sur la date ESTIMÉE (dateLivraisonCible,
 *  facultative, disponible pour les 3 modes) : une fois livrée, la case du calendrier doit
 *  refléter la réalité, pas l'ancienne estimation qui a pu être dépassée ou fausse. */
function commandesParDateLivraison(){
  const parDate = new Map();
  state.commandes.forEach(c => {
    const isoConfirme = dateVersISO(c.dateLivraison);
    const isoEstime = dateVersISO(c.dateLivraisonCible);
    const iso = isoConfirme || isoEstime;
    if(!iso) return;
    if(!parDate.has(iso)) parDate.set(iso, []);
    parDate.get(iso).push({ commande: c, confirme: !!isoConfirme });
  });
  return parDate;
}
const JOURS_SEMAINE_CAL = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MOIS_CAL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
/** Mini calendrier des livraisons — volontairement "grossier" (grandes cases, un ou deux points
 *  par jour au plus, jamais de texte dans la grille) : le but est de repérer une date en un coup
 *  d'œil, pas d'afficher le détail dans la case elle-même — le détail vient dans la liste juste
 *  en dessous, au clic sur un jour. Point vert = livraison confirmée, point magenta = encore
 *  au stade de l'estimation. */
function carteCalendrierLivraisonsContenu(){
  const parDate = commandesParDateLivraison();
  const auj = new Date(); auj.setHours(0,0,0,0);
  const isoDe = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const isoAuj = isoDe(auj);
  const moisRef = new Date(auj.getFullYear(), auj.getMonth() + state.calendrierDecalageMois, 1);

  if(!state.calendrierJourChoisi){
    const prochaines = [...parDate.keys()].filter(iso => iso >= isoAuj).sort();
    state.calendrierJourChoisi = prochaines[0] || isoAuj;
  }

  const premierJourSemaine = (new Date(moisRef.getFullYear(), moisRef.getMonth(), 1).getDay() + 6) % 7; // lundi = 0
  const nbJours = new Date(moisRef.getFullYear(), moisRef.getMonth() + 1, 0).getDate();
  const isoJour = j => `${moisRef.getFullYear()}-${String(moisRef.getMonth()+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`;
  let totalMois = 0;

  const cellules = Array(premierJourSemaine).fill(null).concat(Array.from({ length: nbJours }, (_, i) => i + 1));
  const grille = cellules.map((j, k) => {
    if(!j) return `<span class="cal2-vide" aria-hidden="true"></span>`;
    const iso = isoJour(j);
    const entrees = parDate.get(iso) || [];
    totalMois += entrees.length;
    const nbConf = entrees.filter(e => e.confirme).length, nbEst = entrees.length - nbConf;
    const choisi = iso === state.calendrierJourChoisi;
    const classes = ['cal2-jour', choisi ? 'choisi' : '', iso === isoAuj ? 'auj' : '', iso < isoAuj ? 'passe' : '', (k % 7) >= 5 ? 'weekend' : '', entrees.length ? 'avec' : ''].filter(Boolean).join(' ');
    const libelle = `${j} ${MOIS_CAL[moisRef.getMonth()]}${entrees.length ? ` : ${entrees.length} livraison${entrees.length > 1 ? 's' : ''}` : ''}`;
    return `<button type="button" class="${classes}" data-calendrier-jour="${iso}" ${choisi ? 'data-choisi aria-pressed="true"' : 'aria-pressed="false"'} ${iso === isoAuj ? 'data-auj aria-current="date"' : ''} aria-label="${echapper(libelle)}">
      <span class="cal2-num">${j}</span>
      ${entrees.length ? `<span class="cal2-marques">${nbConf ? '<i class="conf"></i>' : ''}${nbEst ? '<i class="est"></i>' : ''}${entrees.length > 1 ? `<b>${entrees.length}</b>` : ''}</span>` : ''}
    </button>`;
  }).join('');

  const entreesDuJour = parDate.get(state.calendrierJourChoisi) || [];
  const dateChoisie = new Date(state.calendrierJourChoisi + 'T00:00:00');
  const libelleJourChoisi = state.calendrierJourChoisi === isoAuj ? "Aujourd'hui" : dateChoisie.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const moisCourant = state.calendrierDecalageMois === 0;

  return `
      <div class="cal2">
        <div class="cal2-tete">
          <div><div class="cal2-titre">Livraisons</div><div class="cal2-sous">${totalMois ? `${totalMois} prévue${totalMois > 1 ? 's' : ''} ce mois-ci` : 'Aucune livraison ce mois-ci'}</div></div>
          ${moisCourant ? '' : '<button type="button" class="cal2-auj" data-calendrier-aujourdhui>Aujourd’hui</button>'}
        </div>
        <div class="cal2-nav">
          <button type="button" class="cal2-fleche" data-calendrier-mois="-1" aria-label="Mois précédent">‹</button>
          <span class="cal2-mois" aria-live="polite">${MOIS_CAL[moisRef.getMonth()]} ${moisRef.getFullYear()}</span>
          <button type="button" class="cal2-fleche" data-calendrier-mois="1" aria-label="Mois suivant">›</button>
        </div>
        <div class="cal2-semaine" aria-hidden="true">${JOURS_SEMAINE_CAL.map(j => `<span>${j}</span>`).join('')}</div>
        <div class="cal2-grille" role="group" aria-label="Jours de ${MOIS_CAL[moisRef.getMonth()]}">${grille}</div>
        <div class="cal2-legende"><span><i class="conf"></i>Livrée / confirmée</span><span><i class="est"></i>Estimée</span></div>
        <div class="cal2-jourchoisi">
          <div class="cal2-jourchoisi-titre"><span>${echapper(libelleJourChoisi)}</span>${entreesDuJour.length ? `<b>${entreesDuJour.length}</b>` : ''}</div>
          ${entreesDuJour.length ? entreesDuJour.map(({ commande: c, confirme }) => {
            const nbArticles = (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
            const modeInfo = MODES_LIVRAISON.find(m => m.valeur === c.modeLivraison);
            return `
            <div class="cal2-livraison ${confirme ? 'conf' : 'est'}" data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0">
              <i aria-hidden="true"></i>
              <div class="cal2-livraison-txt"><b>${echapper(c.nom)}</b><small>${echapper(c.reference)} · ${nbArticles} article${nbArticles > 1 ? 's' : ''}${modeInfo ? ` · ${echapper(modeInfo.label)}` : ''}</small></div>
              <span class="cal2-etat">${confirme ? 'Livrée' : 'Estimée'}</span>
            </div>`;
          }).join('') : `<p class="cal2-rien">Aucune livraison prévue ce jour-là.</p>`}
        </div>
      </div>`;
}

/** Fil des priorités partagé entre le tableau de bord et la cloche de notifications (sidebar) —
 *  toutes les sources déjà calculées ailleurs (commandes urgentes, SAV ouverts, devis/factures
 *  en attente, liens de paiement cliqués mais non réglés, livraisons dépassées, rapprochement),
 *  triées par urgence puis par date la plus récente. */
/* ── Nouvelles sources du fil des priorités (audit) ── */
function joursDepuis(dateFr){ const iso = dateVersISO(dateFr); if(!iso) return 0; const d = new Date(iso); return Math.floor((Date.now() - d.getTime()) / 86400000); }
const COMMANDE_ACTIVE = c => !['Livrée', 'Annulée'].includes(c.statutCommande);
/** Devis demandé par la structure, pas encore généré (hors Interne/ESN/BO). */
/** Petites pastilles « Devis demandé » / « Transférée » sur les lignes et cartes de commandes. */
function badgesCommandeListe(c){
  const devis = c.devisDemande === 'Oui' && !c.referenceDevis && COMMANDE_ACTIVE(c) && !structureExclueDevisFacture(c);
  return (devis ? ` <span class="rp-mini-badge rp-mb-devis" title="Devis demandé par la structure, pas encore généré">Devis demandé</span>` : '')
    + (c.transfereAdmin ? ` <span class="rp-mini-badge rp-mb-transfert" title="Transférée par une structure Interne">Transférée</span>` : '');
}
function commandesDevisDemande(){
  return state.commandes.filter(c => COMMANDE_ACTIVE(c) && c.devisDemande === 'Oui' && !c.referenceDevis && !structureExclueDevisFacture(c));
}
/** Commandes transférées par une structure Interne (matériel manquant chez elle), encore à traiter. */
function commandesTransferees(){ return state.commandes.filter(c => c.transfereAdmin && c.statutCommande === 'Reçue'); }
/** Nouvelles commandes non urgentes (reçues), avec leur ancienneté — « en attente » au-delà de 3 jours. */
function commandesNouvelles(){ return state.commandes.filter(c => c.statutCommande === 'Reçue' && c.dateLivraisonSouhaitee !== 'ASAP' && !c.transfereAdmin); }
/** Date souhaitée par la structure dépassée alors que la commande n'est pas encore partie. */
function commandesDateSouhaiteeDepassee(){
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  return state.commandes.filter(c => {
    if(!['Reçue', 'Validée', 'Préparée'].includes(c.statutCommande)) return false;
    const iso = dateVersISO(c.dateLivraisonSouhaitee); if(!iso) return false;
    return new Date(iso) < auj;
  });
}
/** Commandes livrées, non réglées (hors structures sans paiement) — même sans clic sur le lien. */
function commandesLivreesNonPayees(){
  return state.commandes.filter(c => c.statutCommande === 'Livrée' && c.moyenPaiement && !structureExclueDevisFacture(c)
    && !['Payé', 'Remboursé'].includes(c.statutPaiement) && !c.dernierClicLienPaiement);
}
function construireFeedPriorites(limite){
  const urgentes = commandesUrgentes();
  const savOuverts = savOuvertsListe();
  const docsEnAttente = docsEnAttenteListe();
  const paiementsEnAttente = commandesPaiementEnAttente();
  const livraisonsDepassees = commandesLivraisonDepassee();
  const aRapprocher = commandesARapprocher();
  const dateItem = v => { const iso = dateVersISO(v); const d = iso ? new Date(iso) : null; return (d && !Number.isNaN(d.getTime())) ? d : new Date(0); };
  const feedBrut = [
    ...urgentes.map(c => { const t = mkTag(c.statutCommande, ORDER_META); return { ...t, type: 'Commande', id: c.reference, structure: c.nom, statut: c.statutCommande, urgent: true, date: dateItem(c.date), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` }; }),
    ...savOuverts.map(s => {
      const def = state.statutsSav.find(d => d.statut === s.statut);
      const t = teinteSav(def ? def.couleur : 't-gris');
      return { icon: icon(iconeStatutSav(s.statut, def && def.icone), 15), badgeBg: t.bg, badgeFg: t.fg, tagCls: '', tagStyle: `background:${t.bg};color:${t.fg}`, type: 'SAV', id: s.reference, structure: s.structureNom || '', statut: s.statut, urgent: false, date: dateItem(s.date), attrs: `data-sav-ouvrir="${echapper(s.reference)}"` };
    }),
    ...docsEnAttente.map(d => { const t = mkTag(d.statut, DOC_META); return { ...t, type: d.type, id: d.referenceDevis || d.referenceFacture, structure: d.nomStructure || '', statut: d.statut, urgent: d.statut === 'En retard', date: dateItem(d.date), attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(d.referenceDevis || d.referenceFacture)}"` }; }),
    ...paiementsEnAttente.map(c => ({ icon: icon('receipt', 15), badgeBg: 'var(--color-accent-100)', badgeFg: 'var(--color-accent-700)', tagCls: 'tag-accent', type: 'Paiement', id: c.reference, structure: c.nom, statut: 'Lien de paiement consulté', urgent: true, date: dateItem(c.date), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` })),
    ...livraisonsDepassees.map(c => ({ icon: icon('eclair', 15), badgeBg: 'var(--color-accent-100)', badgeFg: 'var(--color-accent-700)', tagCls: 'tag-accent', type: 'Livraison', id: c.reference, structure: c.nom, statut: 'Date dépassée, à vérifier', urgent: true, date: dateItem(c.dateLivraisonCible), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` })),
    ...commandesDevisDemande().map(c => ({ icon: icon('file', 15), badgeBg: 'var(--th-bg-fbe3ecff, #FBE3EC)', badgeFg: 'var(--th-tx-c2185bff, #C2185B)', tagCls: '', tagStyle: 'background:var(--th-bg-fbe3ecff, #FBE3EC);color:var(--th-tx-c2185bff, #C2185B)', type: 'Devis', id: c.reference, structure: c.nom, statut: 'Devis demandé, à générer', urgent: joursDepuis(c.date) >= 2, date: dateItem(c.date), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` })),
    ...commandesTransferees().map(c => ({ icon: icon('arrow', 15), badgeBg: 'var(--color-accent-100)', badgeFg: 'var(--color-accent-700)', tagCls: 'tag-accent', type: 'Transfert', id: c.reference, structure: c.nom, statut: 'Transférée par une Interne', urgent: true, date: dateItem(c.date), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` })),
    ...commandesNouvelles().map(c => { const j = joursDepuis(c.date); return { icon: icon('inbox', 15), badgeBg: j >= 3 ? '#FFF3CC' : 'var(--color-neutral-100)', badgeFg: j >= 3 ? '#7A5A00' : 'var(--color-neutral-700)', tagCls: '', tagStyle: j >= 3 ? 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)' : '', type: 'Commande', id: c.reference, structure: c.nom, statut: j >= 3 ? `Reçue depuis ${j} jours` : 'Nouvelle commande', urgent: false, date: dateItem(c.date), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` }; }),
    ...commandesDateSouhaiteeDepassee().map(c => ({ icon: icon('clock', 15), badgeBg: 'var(--th-bg-fbe4e4ff, #FBE4E4)', badgeFg: 'var(--th-tx-c62828ff, #c62828)', tagCls: '', tagStyle: 'background:var(--th-bg-fbe4e4ff, #FBE4E4);color:var(--th-tx-c62828ff, #c62828)', type: 'Délai', id: c.reference, structure: c.nom, statut: `Date souhaitée dépassée (${c.dateLivraisonSouhaitee})`, urgent: true, date: dateItem(c.dateLivraisonSouhaitee), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` })),
    ...commandesLivreesNonPayees().map(c => ({ icon: icon('receipt', 15), badgeBg: 'var(--th-bg-fff3ccff, #FFF3CC)', badgeFg: 'var(--th-tx-7a5a00ff, #7A5A00)', tagCls: '', tagStyle: 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)', type: 'Paiement', id: c.reference, structure: c.nom, statut: `Livrée, ${String(c.statutPaiement || 'non payée').toLowerCase()}`, urgent: false, date: dateItem(c.dateLivraison || c.date), attrs: `data-commande-ouvrir="${echapper(c.reference)}"` })),
    ...feedDepotVente(),
    ...aRapprocher.map(c => { const cloture3 = c.statutComptable === 'Rapproché'; const t3 = cloture3 ? { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' } : { bg: 'var(--color-corail-100)', fg: 'var(--color-corail-700)' }; return { icon: icon(cloture3 ? 'check' : 'clock', 15), badgeBg: t3.bg, badgeFg: t3.fg, tagCls: '', tagStyle: `background:${t3.bg};color:${t3.fg}`, type: 'Facture', id: c.reference, structure: c.nom, statut: cloture3 ? 'Rapproché, à clôturer' : 'Non rapproché', urgent: !cloture3, date: dateItem(c.date), attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}"` }; })
  ];
  // Une commande peut remonter plusieurs fois (urgente + devis demandé…) : on garde la
  // première occurrence (la plus prioritaire, les urgentes étant listées en tête).
  // Motifs supplémentaires ajoutés au libellé de la première occurrence (ex. « Reçue · Devis
  // demandé, à générer ») plutôt que de répéter la même commande plusieurs fois.
  const parId = new Map();
  const feedUnique = [];
  feedBrut.forEach(f => {
    const deja = parId.get(f.id);
    if(deja){ if(!String(deja.statut).includes(f.statut)) deja.statut = `${deja.statut} · ${f.statut}`; deja.urgent = deja.urgent || f.urgent; return; }
    const copie = { ...f }; parId.set(f.id, copie); feedUnique.push(copie);
  });
  return feedUnique.sort((a, b) => (b.urgent - a.urgent) || (b.date - a.date)).slice(0, limite || 20);
}
/** Rendu HTML d'une ligne de fil des priorités — partagé entre le tableau de bord et la cloche. */
function ligneFeedPriorite(f){
  if(estUnifie()) return `<div class="rp-fil-ligne${f.urgent ? ' urgent' : ''}" ${f.attrs} role="button" tabindex="0">
    <span class="rp-fil-ic" style="--fb:${f.badgeBg};--ff:${f.badgeFg}">${f.icon}</span>
    <span class="rp-fil-txt"><b>${echapper(f.id)}</b><small>${echapper(f.type)} · ${echapper(f.structure)}</small></span>
    <span class="rp-fil-statut"><span class="tag ${f.tagCls || ''}" style="${f.tagStyle || ''}">${echapper(f.statut)}</span>${f.urgent ? '<span class="rp-fil-urgent">Urgent</span>' : ''}</span>
    <span class="rp-fil-fleche">${icon('arrow', 15)}</span>
  </div>`;
  // Une seule colonne flexible sous l'icône (au lieu de 4 blocs flex:none en concurrence sur la
  // largeur) — le tag de statut, potentiellement long ("Date dépassée, à vérifier"), a sa propre
  // ligne plutôt que de forcer tout le reste à se tasser dans un panneau étroit (340px).
  return `<div ${f.attrs} style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);cursor:pointer;${f.urgent ? `background:color-mix(in srgb, ${f.badgeBg} 45%, var(--color-surface))` : ''}">
    <span style="width:34px;height:34px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:${f.badgeBg};color:${f.badgeFg}">${f.icon}</span>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(f.id)}${f.urgent ? ` <span style="color:${f.badgeFg};font-size:11px;font-weight:800;letter-spacing:0.04em">· URGENT</span>` : ''}</div>
      <div style="font-size:11.5px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(f.type)} · ${echapper(f.structure)}</div>
      <span class="tag ${f.tagCls || ''}" style="align-self:flex-start;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${f.tagStyle || ''}">${echapper(f.statut)}</span>
    </div>
  </div>`;
}
/** Cloche de notifications (sidebar) — mêmes données que le fil des priorités du tableau de
 *  bord, mais accessibles depuis n'importe quel onglet plutôt qu'en revenant au dashboard. */
/* Notifications masquées par l'équipe (mémorisées dans le navigateur) : une notification
   réapparaît si son statut change. */
function cleNotif(f){ return `${f.id}|${f.statut}`; }
function notifsMasquees(){ try{ return new Set(JSON.parse(localStorage.getItem('cvdl-notifs-masquees') || '[]')); }catch(e){ return new Set(); } }
function masquerNotifs(cles){
  const m = notifsMasquees(); cles.forEach(k => m.add(k));
  try{ localStorage.setItem('cvdl-notifs-masquees', JSON.stringify([...m].slice(-500))); }catch(e){}
}
document.addEventListener('click', e => {
  const x = e.target.closest('[data-masquer-notif]');
  if(x){ e.stopPropagation(); masquerNotifs([x.dataset.masquerNotif]); rendreClocheNotifications(); return; }
  if(e.target.closest('[data-masquer-toutes-notifs]')){ e.stopPropagation(); masquerNotifs(construireFeedPriorites(20).map(cleNotif)); rendreClocheNotifications(); }
}, true);
function rendreClocheNotifications(){
  const masquees = notifsMasquees();
  const feed = construireFeedPriorites(20).filter(f => !masquees.has(cleNotif(f)));
  const nbUrgent = feed.filter(f => f.urgent).length;
  $('rp-cloche-badge').textContent = nbUrgent > 99 ? '99+' : nbUrgent;
  $('rp-cloche-badge').hidden = !nbUrgent;
  const panneau = $('rp-cloche-panel');
  panneau.hidden = !state.notifOuverte;
  if(state.notifOuverte){
    // Panneau sorti du rail latéral dans le DOM (voir admin.html) car .rp-aside a
    // overflow:hidden pour l'animation de largeur au survol — un enfant positionné en
    // absolute par rapport au rail se retrouvait donc totalement rogné/invisible. En
    // position:fixed, calculé ici depuis la position réelle du bouton, il s'affiche
    // toujours au-dessus du contenu, qu'importe l'état (réduit/étendu) du rail.
    const rect = $('rp-cloche-bouton').getBoundingClientRect();
    panneau.style.top = Math.round(rect.top) + 'px';
    panneau.style.left = Math.round(rect.right + 8) + 'px';
    panneau.innerHTML = `
      ${estUnifie() ? `<div class="rp-cloche-tete"><span data-ill="tableau" class="ill s"></span><div><div class="rp-surtitre">Fil des priorités</div><b>Notifications</b></div><span class="rp-cloche-nb">${feed.length}</span></div>${legendeFormes()}` : '<div style="padding:var(--space-4) var(--space-4) var(--space-3);border-bottom:1px solid var(--color-divider);font-weight:700;font-size:14px">Notifications</div>'}
      <div style="max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:var(--space-2)">
        ${feed.length ? feed.map(f => `<div class="notif-ligne">${ligneFeedPriorite(f)}<button type="button" class="notif-x" data-masquer-notif="${echapper(cleNotif(f))}" aria-label="Supprimer cette notification" title="Supprimer">✕</button></div>`).join('') : '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Rien à traiter — tout est à jour.</p>'}
      </div>
      ${feed.length ? '<div class="notif-pied"><button type="button" class="btn-lien" data-masquer-toutes-notifs>Tout effacer</button></div>' : ''}`;
    if(window.portailIllustrations) window.portailIllustrations(panneau);
  }
}
window.addEventListener('resize', () => { if(state.notifOuverte){ state.notifOuverte = false; render(); } });

function vueDashboard(){
  const urgentes = commandesUrgentes();
  const savOuverts = savOuvertsListe();
  const aRapprocher = commandesARapprocher();

  // Données du bento (mêmes couleurs que la charte : navy #002743, turquoise, magenta, jaune)
  const aDecider = state.commandes.filter(c => c.statutCommande === 'Reçue');
  const enPreparation = state.commandes.filter(c => c.statutCommande === 'Validée');
  const plusUrgente = urgentes[0] || null;
  const joursAttente = plusUrgente ? Math.max(0, Math.round((new Date() - (new Date(dateVersISO(plusUrgente.date) || Date.now()))) / 86400000)) : 0;
  const materielUrgent = plusUrgente ? Object.entries((plusUrgente.lignes || []).reduce((acc, l) => { acc[l.produit] = (acc[l.produit] || 0) + (parseInt(l.quantite, 10) || 0); return acc; }, {})).map(([nom, q]) => `${q} ${nom}`).join(', ') : '';
  const montantARapprocher = aRapprocher.reduce((s, c) => { const f = state.factures.find(x => x.referenceFacture === c.referenceFacture); return s + (f ? (parseFloat(f.montantTotal) || 0) : 0); }, 0);
  const enRetardRapprochement = aRapprocher.filter(c => {
    const f = state.factures.find(x => x.referenceFacture === c.referenceFacture);
    if(!f) return false;
    const d = dateVersISO(f.date); const dt = d ? new Date(d) : null;
    return dt && !Number.isNaN(dt.getTime()) && (new Date() - dt) / 86400000 > 30;
  }).length;
  const avancementMoyenSav = savOuverts.length ? Math.round(savOuverts.reduce((s, t) => {
    const ordre = state.statutsSav.filter(d => !d.terminal).map(d => d.statut);
    const idx = ordre.indexOf(t.statut);
    return s + (idx >= 0 ? (idx + 1) / Math.max(1, ordre.length) : 0);
  }, 0) / savOuverts.length * 100) : 0;
  const fileAttente = [
    ...urgentes.slice(0, 3).map(c => ({ ref: c.reference, structure: c.nom, statut: c.statutCommande, dot: 'var(--color-accent)' })),
    ...savOuverts.slice(0, 2).map(s => ({ ref: s.reference, structure: s.structureNom || '', statut: `SAV ${s.statut}`, dot: 'var(--color-accent-2)' }))
  ].slice(0, 5);

  // Fil des priorités : toutes les sources mélangées (commandes urgentes, SAV ouverts, devis/
  // factures en attente, liens de paiement cliqués mais non réglés, factures payées à
  // rapprocher), triées par urgence d'abord puis par date la plus récente. Même fil que celui
  // de la cloche de notifications (voir construireFeedPriorites), pour rester cohérent partout.
  const feed = construireFeedPriorites(14);

  return `
    <h1 style="font-size:32px;margin-bottom:var(--space-2)">Tableau de bord</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Vue d'ensemble de l'activité du parc informatique reconditionné.</p>
    <div class="rp-banniere ${plusUrgente ? 'urgente' : ''}" ${plusUrgente ? `data-commande-ouvrir="${echapper(plusUrgente.reference)}"` : 'data-kpi-listing="a-decider"'} role="button" tabindex="0">
      <span class="rp-banniere-deco" aria-hidden="true"><i class="d1"></i><i class="d2"></i><i class="d3"></i><i class="d4"></i><i class="brille"></i></span>
      <div class="rp-banniere-txt">
        <span class="rp-banniere-k">${plusUrgente ? `${icon('eclair', 12)}À traiter en priorité` : 'Aujourd’hui'}</span>
        <b>${plusUrgente ? `${echapper(plusUrgente.reference)} · ${echapper(plusUrgente.nom)}` : (aDecider.length ? `${aDecider.length} commande${aDecider.length > 1 ? 's attendent' : ' attend'} votre décision` : 'Tout est à jour')}</b>
        <span>${plusUrgente ? `${echapper(materielUrgent || '')} · ${joursAttente} jour${joursAttente > 1 ? 's' : ''} d’attente` : `${savOuverts.length} SAV ouvert${savOuverts.length > 1 ? 's' : ''} · ${commandesDevisDemande().length} devis à préparer`}</span>
      </div>
      <span class="rp-banniere-btn">${plusUrgente ? 'Ouvrir la commande' : 'Voir les commandes'} ${icon('arrow', 15)}</span>
    </div>
    <div class="rp-kpis">
      ${[
        { ill: 'commandes', k: 'À décider', v: aDecider.length, d: 'commande' + (aDecider.length > 1 ? 's' : '') + ' reçue' + (aDecider.length > 1 ? 's' : ''), attr: 'data-kpi-listing="a-decider"' },
        { ill: 'facture', k: 'Devis à préparer', v: commandesDevisDemande().length, d: 'demandés par les structures', attr: 'data-nav="factures"' },
        { ill: 'stock', k: 'En préparation', v: enPreparation.length, d: 'commande' + (enPreparation.length > 1 ? 's' : '') + ' validée' + (enPreparation.length > 1 ? 's' : ''), attr: 'data-kpi-listing="en-preparation"' },
        { ill: 'suiviSav', k: 'SAV ouverts', v: savOuverts.length, d: `avancement moyen ${avancementMoyenSav} %`, attr: 'data-nav="sav"' },
        { ill: 'attestations', k: 'À clôturer', v: formaterMontant(montantARapprocher), d: `${aRapprocher.length} facture${aRapprocher.length > 1 ? 's' : ''}${enRetardRapprochement ? `, ${enRetardRapprochement} en retard` : ''}`, attr: 'data-kpi-listing="facturation"', alerte: enRetardRapprochement > 0 },
      ].map(k => `<div class="rp-kpi ${k.alerte ? 'alerte' : ''}" ${k.attr} role="button" tabindex="0"><span data-ill="${k.ill}" class="ill"></span><span class="rp-kpi-txt"><span class="rp-kpi-k">${k.k}</span><b>${k.v}</b><small>${k.d}</small></span></div>`).join('')}
    </div>
    ${estUnifie() ? blocFilEtCalendrierUnifie(feed) : `<div class="card elev-sm" style="padding:var(--space-6);min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:var(--space-6)">
      <div style="min-width:0">
      <div class="card-title" style="font-size:18px;margin-bottom:var(--space-3)">Fil des priorités</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${feed.length ? feed.map(ligneFeedPriorite).join('') : '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Rien à traiter — tout est à jour.</p>'}
      </div>
      </div>
      <div style="border-left:1px solid var(--color-divider);padding-left:var(--space-6);margin:calc(var(--space-6) * -1) 0;padding-top:var(--space-6);padding-bottom:var(--space-6)">
        ${carteCalendrierLivraisonsContenu()}
      </div>
    </div>`}`;
}
/** Tableau de bord, style unifié : fil des priorités en liste de cartes (urgent / à suivre) +
 *  calendrier dans sa propre carte à droite. */
function blocFilEtCalendrierUnifie(feed){
  const urgents = feed.filter(f => f.urgent), autres = feed.filter(f => !f.urgent);
  const groupe = (titre, liste) => liste.length ? `<div class="rp-fil-groupe"><div class="rp-surtitre">${titre} · ${liste.length}</div>${liste.map(ligneFeedPriorite).join('')}</div>` : '';
  return `<div class="rp-dash-grille">
    <section class="card rp-fil">
      <div class="rp-fil-tete"><span data-ill="tableau" class="ill s"></span><h2>Fil des priorités</h2>${legendeFormes()}</div>
      ${feed.length ? groupe('Urgent', urgents) + groupe('À suivre', autres) : '<div class="pk-etat"><span data-ill="vide" class="ill"></span>Rien à traiter — tout est à jour.</div>'}
    </section>
    <section class="card rp-cal">${carteCalendrierLivraisonsContenu()}</section>
  </div>`;
}
/** Légende des formes de statut (style unifié). */
function legendeFormes(){
  return `<div class="rp-legende"><span data-forme="losange">En attente de décision</span><span data-forme="carre">En cours</span><span data-forme="rond">Terminé</span></div>`;
}

/* ============================================================
   Commandes — kanban + "à livrer" + recherche
   ============================================================ */
function commentaireReel(c){
  return !!(c.commentaire && !c.commentaire.startsWith('##LOGISTIQUE_QUANTITES##'));
}
/* ── Rendu commun des commandes (liste + kanban) au format du kit ── */
const COULEUR_STATUT_COMMANDE = { 'Reçue': '#FECC38', 'Validée': '#E62460', 'Préparée': '#00ACB0', 'En cours de livraison': '#00777A', 'Livrée': '#1F9D55', 'Annulée': '#8FA3B3' };
function pastilleStatutCommande(statut){
  const coul = COULEUR_STATUT_COMMANDE[statut] || '#8FA3B3';
  return `<span class="rp-statut" style="--st:${coul}">${echapper(statut === 'En cours de livraison' ? 'En livraison' : statut)}</span>`;
}
function articlesIllustres(c, max){
  const lignes = c.lignes || [];
  const tout = lignes.map(l => { const p = state.produits.find(x => x.nom === l.produit); return `<span class="rp-art" title="${echapper(l.quantite + ' × ' + l.produit)}">${illustrationProduitAdmin(l.produit, p ? p.icone : '', 24)}<b>${parseInt(l.quantite, 10) || 0}</b></span>`; });
  return tout.slice(0, max || 4).join('') + (tout.length > (max || 4) ? `<span class="rp-art-plus">+${tout.length - (max || 4)}</span>` : '');
}
/** Badge « Urgent » (commande ASAP) : magenta tant qu'elle n'est pas livrée, vert une fois livrée. */
function badgeUrgentCommande(c){
  if(c.dateLivraisonSouhaitee !== 'ASAP' || c.statutCommande === 'Annulée') return '';
  const livree = c.statutCommande === 'Livrée';
  return `<span class="rp-badge-urgent${livree ? ' ok' : ''}" title="${livree ? 'Commande urgente — bien livrée' : 'Commande urgente (dès que possible)'}">Urgent${livree ? ' · livrée' : ''}</span>`;
}
/** Produit le plus nombreux d'une commande (illustration en tête de ligne). */
function produitPrincipalCommande(c){
  const lignes = (c.lignes || []).slice().sort((a, b) => (parseInt(b.quantite, 10) || 0) - (parseInt(a.quantite, 10) || 0));
  return lignes[0] ? lignes[0].produit : '';
}
/** Détail texte des articles (« 3 × PC portable · 1 × Souris »), à la place des icônes. */
function detailArticlesCommande(c){
  const lignes = (c.lignes || []).slice().sort((a, b) => (parseInt(b.quantite, 10) || 0) - (parseInt(a.quantite, 10) || 0));
  if(!lignes.length) return '<small>—</small>';
  return `<span class="rp-arts-detail">${lignes.map(l => `<span title="${echapper(l.produit)}"><b>${parseInt(l.quantite, 10) || 0} ×</b> ${echapper(l.produit)}</span>`).join('')}</span>`;
}
function indicateursCommande(c, opts = {}){
  return (opts.urgent ? ' ' + badgeUrgentCommande(c) : '')
    + (commentaireReel(c) ? `<span class="rp-ind" title="Commentaire de la structure">${icon('bulle', 12)}</span>` : '')
    + badgesCommandeListe(c);
}

/** « Prochaine action » d'une commande dans les listes (règles serveur, voir resumeRegles). */
function prochaineActionCommande(c){
  const r = c.regles;
  if(!r || !r.etapeSuivante) return '';
  if(r.peutAvancer) return `<small class="rp-prochain ok">Prête pour « ${echapper(r.etapeSuivante)} »</small>`;
  const m = r.manquants || [];
  return `<small class="rp-prochain" title="${echapper(m.join(' · '))}">À faire : ${echapper(m[0] || r.etapeSuivante)}${m.length > 1 ? ` (+${m.length - 1})` : ''}</small>`;
}
/** Liste regroupée par action (maquette « Commandes — refonte », planche 3). */
function commandesParAction(liste){
  const il30j = Date.now() - 30 * 86400000;
  const dateIso = d => { const m = String(d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime() : 0; };
  const GROUPES = [
    { cle: 'valider', titre: 'À valider', forme: 'losange', couleur: '#E62460', filtre: c => c.statutCommande === 'Reçue' },
    { cle: 'preparer', titre: 'À préparer', forme: 'carre', couleur: '#00ACB0', filtre: c => c.statutCommande === 'Validée' },
    { cle: 'expedier', titre: 'À expédier', forme: 'carre', couleur: '#00ACB0', filtre: c => c.statutCommande === 'Préparée' },
    { cle: 'livraison', titre: 'En livraison', forme: 'carre', couleur: '#00777A', filtre: c => c.statutCommande === 'En cours de livraison' },
    { cle: 'livrees', titre: 'Livrées ces 30 jours', forme: 'rond', couleur: '#1F9D55', ferme: true, filtre: c => c.statutCommande === 'Livrée' && dateIso(c.dateLivraison) >= il30j },
  ];
  const urgentesDabord = (a, b) => ((b.dateLivraisonSouhaitee === 'ASAP') - (a.dateLivraisonSouhaitee === 'ASAP')) || (b.ligne - a.ligne);
  const html = GROUPES.map(g => {
    const membres = liste.filter(g.filtre).sort(urgentesDabord);
    if(!membres.length) return '';
    const ouvert = state.groupesCommandesOuverts[g.cle] !== undefined ? state.groupesCommandesOuverts[g.cle] : !g.ferme;
    return `<section class="cg-groupe">
      <button type="button" class="cg-tete" data-groupe-commandes="${g.cle}" aria-expanded="${ouvert}">
        <span class="tag" data-forme="${g.forme}" style="--forme:${g.couleur};--st:${g.couleur}"></span><b>${g.titre}</b><span class="cg-n">${membres.length}</span>
        <span class="cg-chevron">${ouvert ? '▾' : '▸ afficher'}</span>
      </button>
      ${ouvert ? tableauCommandes(membres, { tout: true }) : ''}
    </section>`;
  }).join('');
  return html || `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucune commande en cours.</div>`;
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-groupe-commandes]');
  if(!g) return;
  const cle = g.dataset.groupeCommandes;
  state.groupesCommandesOuverts[cle] = g.getAttribute('aria-expanded') !== 'true';
  render();
});
function tableauCommandes(liste, opts = {}){
  const parPage = opts.tout ? Math.max(1, liste.length) : 25;
  const page = opts.tout ? 0 : (state.commandesPage || 0);
  const total = liste.length;
  const debut = page * parPage;
  const pageListe = liste.slice(debut, debut + parPage);
  const nbPages = Math.max(1, Math.ceil(total / parPage));
  return `
    <div class="rp-liste">
      <div class="rp-liste-tete"><span class="rp-col-ill" aria-hidden="true"></span><span>Commande</span><span>Articles</span><span class="rp-col-m">Paiement</span><span class="rp-col-m">Livraison</span><span>Statut</span></div>
      ${pageListe.length ? pageListe.map(c => {
        const montant = c.montantFacture != null ? c.montantFacture : c.montantEstime;
        const exempte = structureExclueDevisFacture(c);
        const payee = c.statutPaiement === 'Payé';
        return `
        <div class="rp-ligne ${c.statutCommande === 'Annulée' ? 'annulee' : ''} ${c.statutCommande === 'Livrée' ? 'livree' : ''}" data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0" style="--st:${COULEUR_STATUT_COMMANDE[c.statutCommande] || 'var(--th-ac-8fa3b3ff, #8FA3B3)'}">
          <span class="rp-col-ill" aria-hidden="true">${(() => { const pp = produitPrincipalCommande(c); if(!pp) return ''; const p = state.produits.find(x => x.nom === pp); return illustrationProduitAdmin(pp, p ? p.icone : '', 34); })()}</span>
          <span class="rp-ligne-id"><b>${echapper(c.reference)}</b>${indicateursCommande(c)}<small>${(() => { const st = state.structures.find(x => x.code === c.code); return st ? `<button type="button" class="lien-structure" data-structure-vue="${st.ligne}" title="Ouvrir la fiche 360° de la structure">${echapper(c.nom)}</button>` : echapper(c.nom); })()} · ${echapper(c.date)}</small>${c.regles ? `<span class="rp-type-cmd">${echapper(c.regles.libelleType)}${c.regles.circuit === 'interne' ? ' · circuit Interne' : ''}</span>` : ''}</span>
          <span class="rp-ligne-arts">${detailArticlesCommande(c)}</span>
          <span class="rp-col-m rp-ligne-pay">${exempte ? '<small>—</small>' : `${montant != null ? `<b>${formaterMontant(montant)}</b>` : ''}<small class="${payee ? 'ok' : ''}">${echapper(c.statutPaiement || (c.moyenPaiement ? 'Non payé' : '—'))}</small>`}</span>
          <span class="rp-col-m rp-ligne-liv"><small>${echapper(c.modeLivraison === 'Livraison EC' ? 'Livraison EC' : (c.modeLivraison || '—'))}</small>${c.dateLivraisonSouhaitee === 'ASAP' ? badgeUrgentCommande(c) : (c.dateLivraisonSouhaitee ? `<small>Souhaitée ${echapper(c.dateLivraisonSouhaitee)}</small>` : '')}</span>
          <span class="rp-ligne-statut">${pastilleStatutCommande(c.statutCommande)}${prochaineActionCommande(c)}</span>
        </div>`;
      }).join('') : `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucune commande.</div>`}
    </div>
    ${nbPages > 1 ? `
    <div class="rp-pagination">
      <button type="button" class="btn btn-secondary btn-icon" data-page-commandes="${page - 1}" ${page === 0 ? 'disabled' : ''} aria-label="Page précédente">${icon('chevron', 14)}</button>
      <span>Page ${page + 1} / ${nbPages} · ${total} commande${total > 1 ? 's' : ''}</span>
      <button type="button" class="btn btn-secondary btn-icon" data-page-commandes="${page + 1}" ${page >= nbPages - 1 ? 'disabled' : ''} style="transform:rotate(180deg)" aria-label="Page suivante">${icon('chevron', 14)}</button>
    </div>` : ''}`;
}

function vueCommandes(){
  const q = state.commandeSearch.trim().toLowerCase();
  let liste = q ? state.commandes.filter(c => c.reference.toLowerCase().includes(q) || c.nom.toLowerCase().includes(q)) : state.commandes;
  const listeAvantFiltreStatut = liste;
  if(state.commandesFiltreStatut === 'URGENT') liste = liste.filter(c => c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande));
  else if(state.commandesFiltreStatut === 'PRETES') liste = liste.filter(c => c.regles && c.regles.peutAvancer);
  else if(state.commandesFiltreStatut && state.commandesFiltreStatut !== 'ACTION') liste = liste.filter(c => c.statutCommande === state.commandesFiltreStatut);
  // Filtre par type de structure (règles de la commande, calculées par le serveur)
  const typesPresents = [...new Map(state.commandes.filter(c => c.regles).map(c => [c.regles.type, c.regles.libelleType])).entries()];
  if(state.commandesFiltreType) liste = liste.filter(c => c.regles && c.regles.type === state.commandesFiltreType);

  // "À livrer" reste un résumé global, indépendant du filtre de statut affiché juste en
  // dessous (sinon il disparaît dès qu'un filtre est actif) — seule la recherche s'applique.
  const aLivrer = listeAvantFiltreStatut.filter(c => c.statutCommande !== 'Livrée' && c.statutCommande !== 'Annulée');
  const parProduit = {};
  aLivrer.forEach(c => (c.lignes || []).forEach(l => { parProduit[l.produit] = (parProduit[l.produit] || 0) + parseInt(l.quantite, 10); }));
  const resume = Object.keys(parProduit).map(nom => ({ label: nom, qty: parProduit[nom] })).sort((a, b) => b.qty - a.qty);
  const totalArticles = resume.reduce((s, m) => s + m.qty, 0);
  const nbUrgentesListe = listeAvantFiltreStatut.filter(c => c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande)).length;

  const vueListe = true; // vue kanban retirée (liste seule)

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Commandes</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Une commande par ligne, avec sa prochaine action.</p>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button type="button" class="btn btn-primary" data-ouvrir-creation="commande">${icon('plus', 15)}Nouvelle commande</button>
      </div>
    </div>
    ${champRecherche('rp-recherche-commandes', 'Rechercher par nom ou n° de commande...', state.commandeSearch)}
    <div style="margin-bottom:var(--space-6)">
      <div class="card-title" style="font-size:16px;margin-bottom:var(--space-3)">À livrer <span style="opacity:0.5;font-weight:400">· ${totalArticles} article${totalArticles > 1 ? 's' : ''}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3)">
        ${resume.length ? resume.map(m => `
          <div class="card elev-sm" style="min-width:0;padding:var(--space-4);gap:var(--space-2);cursor:pointer" data-livrer-produit="${echapper(m.label)}">
            <span style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex:none">${illustrationProduitAdmin(m.label, (state.produits.find(p => p.nom === m.label) || {}).icone, 38)}</span>
            <div style="font-family:var(--font-heading);font-size:24px;line-height:1">${m.qty}</div>
            <div style="font-size:12px;opacity:0.6">${echapper(m.label)}</div>
          </div>`).join('') : '<p style="opacity:0.5;font-size:13px">Rien à livrer.</p>'}
      </div>
    </div>
    <div class="rp-filtres">
      <button type="button" class="rp-filtre ${state.commandesFiltreStatut === 'ACTION' ? 'actif' : ''}" data-filtrer-statut-commande="ACTION">Par action</button>
      <button type="button" class="rp-filtre ${!state.commandesFiltreStatut ? 'actif' : ''}" data-filtrer-statut-commande="">Toutes<span class="n">${listeAvantFiltreStatut.length}</span></button>
      <button type="button" class="rp-filtre urg ${state.commandesFiltreStatut === 'URGENT' ? 'actif' : ''}" data-filtrer-statut-commande="URGENT">${icon('eclair', 13)}Urgentes<span class="n">${nbUrgentesListe}</span></button>
      <button type="button" class="rp-filtre ${state.commandesFiltreStatut === 'PRETES' ? 'actif' : ''}" data-filtrer-statut-commande="PRETES">${icon('check', 13)}Prêtes à avancer<span class="n">${listeAvantFiltreStatut.filter(c => c.regles && c.regles.peutAvancer).length}</span></button>
      ${ORDER_STATUSES.map(st => {
        const n = listeAvantFiltreStatut.filter(c => c.statutCommande === st).length;
        return `<button type="button" class="rp-filtre ${state.commandesFiltreStatut === st ? 'actif' : ''}" style="--st:${COULEUR_STATUT_COMMANDE[st] || 'var(--th-ac-8fa3b3ff, #8FA3B3)'}" data-filtrer-statut-commande="${echapper(st)}"><span class="rp-point"></span>${echapper(st === 'En cours de livraison' ? 'En livraison' : st)}<span class="n">${n}</span></button>`;
      }).join('')}
    </div>
    ${typesPresents.length > 1 ? `<div class="rp-filtres rp-filtres-type">
      <span class="rp-surtitre">Type</span>
      <button type="button" class="rp-filtre ${!state.commandesFiltreType ? 'actif' : ''}" data-filtrer-type-commande="">Tous</button>
      ${typesPresents.map(([t, lib]) => `<button type="button" class="rp-filtre ${state.commandesFiltreType === t ? 'actif' : ''}" data-filtrer-type-commande="${echapper(t)}">${echapper(lib)}</button>`).join('')}
    </div>` : ''}
    ${state.commandesFiltreStatut === 'ACTION' ? commandesParAction(liste) : tableauCommandes(liste)}`;
}
function kanbanCommandes(liste){
  return `
    <div class="rp-kanban">
      ${ORDER_STATUSES.map(statut => {
        const items = liste.filter(c => c.statutCommande === statut);
        const coul = COULEUR_STATUT_COMMANDE[statut] || '#8FA3B3';
        return `
        <div class="rp-kb-col" style="--st:${coul}">
          <div class="rp-kb-tete"><span class="rp-kb-point"></span><b>${echapper(statut === 'En cours de livraison' ? 'En livraison' : statut)}</b><span>${items.length}</span></div>
          <div class="rp-kanban-zone rp-kb-zone" data-kanban-colonne="${echapper(statut)}">
          ${items.map(c => {
            const idx = ORDER_STATUSES.indexOf(c.statutCommande);
            const montant = c.montantFacture != null ? c.montantFacture : c.montantEstime;
            return `
            <div class="rp-kb-carte" draggable="true" data-commande-ouvrir="${echapper(c.reference)}" data-kanban-carte="${echapper(c.reference)}">
              <div class="rp-kb-l1"><b>${echapper(c.reference)}</b>${indicateursCommande(c, { urgent: true })}</div>
              <small class="rp-kb-struct">${echapper(c.nom)}</small>
              <div class="rp-kb-arts">${articlesIllustres(c, 3)}</div>
              <div class="rp-kb-l2"><small>${echapper(c.date)}</small>${montant != null && !structureExclueDevisFacture(c) ? `<b>${formaterMontant(montant)}</b>` : ''}</div>
              <div class="rp-kb-barres">${ORDER_STATUSES.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>
            </div>`;
          }).join('') || '<div class="rp-kb-vide">Aucune</div>'}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
let ligneCommandeEnGlisse = null;
let ligneSavEnGlisse = null;
let materielDragLigne = null;
let materielDragCat = null;
document.addEventListener('dragstart', e => {
  const carte = e.target.closest('[data-kanban-carte]');
  if(carte){ ligneCommandeEnGlisse = carte.dataset.kanbanCarte; carte.style.opacity = '.4'; return; }
  const carteSav = e.target.closest('[data-kanban-sav-carte]');
  if(carteSav){ ligneSavEnGlisse = carteSav.dataset.kanbanSavCarte; carteSav.style.opacity = '.4'; }
});
document.addEventListener('dragend', e => {
  const carte = e.target.closest('[data-kanban-carte]');
  if(carte) carte.style.opacity = '';
  const carteSav = e.target.closest('[data-kanban-sav-carte]');
  if(carteSav) carteSav.style.opacity = '';
});
document.addEventListener('dragover', e => {
  const zone = e.target.closest('[data-kanban-colonne], [data-kanban-sav-colonne]');
  if(!zone) return;
  e.preventDefault();
  zone.style.background = 'var(--color-neutral-200)';
});
document.addEventListener('dragleave', e => {
  const zone = e.target.closest('[data-kanban-colonne], [data-kanban-sav-colonne]');
  if(zone) zone.style.background = '';
});
document.addEventListener('drop', e => {
  const zoneSav = e.target.closest('[data-kanban-sav-colonne]');
  if(zoneSav && ligneSavEnGlisse){
    e.preventDefault();
    zoneSav.style.background = '';
    const s = state.sav.find(x => x.reference === ligneSavEnGlisse);
    ligneSavEnGlisse = null;
    if(s && s.statut !== zoneSav.dataset.kanbanSavColonne) changerStatutSav(s.reference, zoneSav.dataset.kanbanSavColonne);
    return;
  }
  const zone = e.target.closest('[data-kanban-colonne]');
  if(!zone || !ligneCommandeEnGlisse) return;
  e.preventDefault();
  zone.style.background = '';
  const c = state.commandes.find(x => x.reference === ligneCommandeEnGlisse);
  ligneCommandeEnGlisse = null;
  if(!c) return;
  const idxActuel = ORDER_STATUSES.indexOf(c.statutCommande);
  const idxCible = ORDER_STATUSES.indexOf(zone.dataset.kanbanColonne);
  if(idxCible === idxActuel) return; // déposée dans sa colonne d'origine, rien à faire
  if(zone.dataset.kanbanColonne === 'Validée'){
    etat('Le passage à "Validée" se fait uniquement via la validation logistique (ouvre la fiche).', 'erreur');
    return;
  }
  if(idxCible !== idxActuel + 1){
    etat('Les étapes s\'enchaînent une par une, impossible de sauter une étape.', 'erreur');
    return;
  }
  changerStatutCommande(c.reference, zone.dataset.kanbanColonne);
  state.modal = { kind: 'commande', ref: c.reference };
  render();
});
/** Réordonnancement des produits pour la page "Catégories de matériel" — glisser-déposer au
 *  sein d'une même catégorie uniquement (l'ordre entre catégories n'a pas de sens ici). Le
 *  réarrangement se fait localement (data.materielGroupes) et n'est envoyé au serveur qu'au
 *  clic sur "Enregistrer l'ordre", pas à chaque drop. */
document.addEventListener('dragstart', e => {
  const carte = e.target.closest('[data-materiel-carte]');
  if(carte){ materielDragLigne = parseInt(carte.dataset.materielCarte, 10); materielDragCat = carte.dataset.materielCat; carte.style.opacity = '.4'; }
});
document.addEventListener('dragend', e => {
  const carte = e.target.closest('[data-materiel-carte]');
  if(carte) carte.style.opacity = '';
});
document.addEventListener('dragover', e => {
  if(e.target.closest('[data-materiel-carte]')) e.preventDefault();
});
document.addEventListener('drop', e => {
  const cible = e.target.closest('[data-materiel-carte]');
  if(!cible || materielDragLigne == null || cible.dataset.materielCat !== materielDragCat) return;
  e.preventDefault();
  const liste = state.materielGroupes[materielDragCat];
  const depuis = liste.indexOf(materielDragLigne);
  const vers = parseInt(cible.dataset.materielIndex, 10);
  if(depuis !== -1 && depuis !== vers){
    liste.splice(depuis, 1);
    liste.splice(vers, 0, materielDragLigne);
    render();
  }
  materielDragLigne = null; materielDragCat = null;
});

/* ============================================================
   SAV — kanban dynamique + recherche
   ============================================================ */
/** Modale "À livrer" — commandes non livrées contenant ce produit précisément, chacune
 *  cliquable pour ouvrir sa fiche détaillée (même modale que partout ailleurs). */
/** Listing derrière les cartes KPI du tableau de bord — mêmes filtres que le fil des
 *  priorités, juste sans la limite d'affichage à 4 pour le SAV. */
function vueKpiListing(quoi){
  const defs = {
    urgentes: { titre: 'Commandes urgentes', liste: commandesUrgentes(), rendre: c => {
      const t = mkTag(c.statutCommande, ORDER_META);
      return { id: c.reference, structure: c.nom, statutTag: t, statut: c.statutCommande, attrs: `data-commande-ouvrir="${echapper(c.reference)}"` };
    }},
    'a-decider': { titre: 'À décider maintenant', liste: state.commandes.filter(c => c.statutCommande === 'Reçue'), rendre: c => {
      const t = mkTag(c.statutCommande, ORDER_META);
      return { id: c.reference, structure: c.nom, statutTag: t, statut: c.statutCommande, attrs: `data-commande-ouvrir="${echapper(c.reference)}"` };
    }},
    'en-preparation': { titre: 'Commandes validées, à préparer', liste: state.commandes.filter(c => c.statutCommande === 'Validée'), rendre: c => {
      const t = mkTag(c.statutCommande, ORDER_META);
      return { id: c.reference, structure: c.nom, statutTag: t, statut: c.statutCommande, attrs: `data-commande-ouvrir="${echapper(c.reference)}"` };
    }},
    'sav-en-cours': { titre: 'SAV en cours', liste: savOuvertsListe(), rendre: s => {
      const t = mkTag(s.statut, {});
      return { id: s.reference, structure: s.structureNom || '', statutTag: t, statut: s.statut, attrs: `data-sav-ouvrir="${echapper(s.reference)}"` };
    }},
    // Bug corrigé : cette liste utilisait docsEnAttenteListe() (devis/factures au statut "En
    // attente"), une donnée totalement différente du montant/nombre affiché sur la case "À
    // clôturer" du tableau de bord (qui vient de commandesARapprocher(), les factures à
    // rapprocher/clôturer) — la carte annonçait un nombre non nul, mais cliquer dessus ouvrait
    // une liste vide ou sans rapport, puisqu'elle interrogeait une tout autre donnée.
    facturation: { titre: 'Factures à clôturer', liste: commandesARapprocher(), rendre: c => {
      const cloture = c.statutComptable === 'Rapproché';
      const statutTag = { icon: icon(cloture ? 'check' : 'clock', 15), tagCls: '', badgeBg: cloture ? BADGE['tag-accent-2'].bg : 'var(--color-corail-100)', badgeFg: cloture ? BADGE['tag-accent-2'].fg : 'var(--color-corail-700)' };
      return { id: c.reference, structure: c.nom, statutTag, statut: c.statutComptable || 'Non rapproché', attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}" data-modal-fermer` };
    }},
    'toutes-taches': { titre: 'Tâches restantes', liste: [
      ...commandesUrgentes().map(c => { const t = mkTag(c.statutCommande, ORDER_META); return { id: c.reference, structure: `Commande · ${c.nom}`, statutTag: t, statut: c.statutCommande, attrs: `data-commande-ouvrir="${echapper(c.reference)}"` }; }),
      ...savOuvertsListe().map(s => { const t = mkTag(s.statut, {}); return { id: s.reference, structure: `SAV · ${s.structureNom || ''}`, statutTag: t, statut: s.statut, attrs: `data-sav-ouvrir="${echapper(s.reference)}"` }; }),
      ...docsEnAttenteListe().map(d => { const t = mkTag(d.statut, DOC_META); return { id: d.referenceDevis || d.referenceFacture, structure: `${d.type} · ${d.nomStructure || ''}`, statutTag: t, statut: d.statut, attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(d.referenceDevis || d.referenceFacture)}" data-modal-fermer` }; })
    ], rendre: r => r }
  };
  const def = defs[quoi];
  if(!def) return '';
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(520px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(def.titre)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.65;margin:0">${def.liste.length} élément${def.liste.length > 1 ? 's' : ''}.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${def.liste.length ? def.liste.map(item => {
            const r = def.rendre(item);
            return `
            <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius-md);background:var(--color-neutral-100);cursor:pointer" ${r.attrs}>
              <span class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${r.statutTag.badgeBg};color:${r.statutTag.badgeFg}">${r.statutTag.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700">${echapper(r.id)}</div>
                <div style="font-size:12px;opacity:0.6">${echapper(r.structure)}</div>
              </div>
              <span class="tag ${r.statutTag.tagCls}">${echapper(r.statut)}</span>
            </div>`;
          }).join('') : '<p style="opacity:0.5;font-size:13px">Rien à traiter — tout est à jour.</p>'}
        </div>
        
      </div>
    </div>`;
}

function vueALivrer(produit){
  const concernees = state.commandes.filter(c => c.statutCommande !== 'Livrée' && c.statutCommande !== 'Annulée'
    && (c.lignes || []).some(l => l.produit === produit));
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(520px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(produit)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.65;margin:0">${concernees.length} commande${concernees.length > 1 ? 's' : ''} à livrer avec ce matériel.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${concernees.length ? concernees.map(c => {
            const qte = (c.lignes || []).filter(l => l.produit === produit).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
            const t = mkTag(c.statutCommande, ORDER_META);
            return `
            <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius-md);background:var(--color-neutral-100);cursor:pointer" data-commande-ouvrir="${echapper(c.reference)}">
              <span class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${t.badgeBg};color:${t.badgeFg}">${t.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700">${echapper(c.reference)}</div>
                <div style="font-size:12px;opacity:0.6">${echapper(c.nom)}</div>
              </div>
              <span class="tag tag-outline">${qte}×</span>
              <span class="tag ${t.tagCls}">${echapper(c.statutCommande)}</span>
            </div>`;
          }).join('') : '<p style="opacity:0.5;font-size:13px">Aucune commande.</p>'}
        </div>
        
      </div>
    </div>`;
}

/** Clé d'illustration de symptôme SAV à partir du texte libre (mêmes illustrations que le portail). */
/** Anneau d'avancement des cartes SAV, dessiné en SVG (traits nets même pendant l'effet de
 *  survol de la carte — l'ancien dégradé conique + contours en box-shadow « vibrait »). */
function anneauSavSvg(pourcent){
  const p = Math.max(0, Math.min(100, pourcent || 0));
  return `<svg class="sv2-anneau-svg" viewBox="0 0 58 58" width="58" height="58" aria-hidden="true">
    <circle class="piste" cx="29" cy="29" r="25.25"/>
    ${p ? `<circle class="prog" cx="29" cy="29" r="25.25" pathLength="100" stroke-dasharray="${p} 100" transform="rotate(-90 29 29)"/>` : ''}
    <circle class="bord" cx="29" cy="29" r="28.1"/>
    <circle class="coeur" cx="29" cy="29" r="22.4"/>
  </svg>`;
}
function cleSymptomeAdmin(texte){
  if(window.cleSymptomeCvdl) return window.cleSymptomeCvdl(texte);
  const t = String(texte || '').toLowerCase();
  if(/allum|d[ée]marr|power|mort/.test(t)) return 'alimentation';
  if(/[ée]cran|affich|cass/.test(t)) return 'ecran';
  if(/batter|charg/.test(t)) return 'batterie';
  if(/clavier|touche/.test(t)) return 'clavier';
  if(/souris|pav[ée]|trackpad/.test(t)) return 'souris';
  if(/son|audio|haut-parleur|micro/.test(t)) return 'son';
  if(/wi-?fi|internet|r[ée]seau|connexion/.test(t)) return 'internet';
  if(/virus|pirat|malveill/.test(t)) return 'virus';
  if(/mise [àa] jour|update/.test(t)) return 'mise_a_jour';
  if(/lent|rame|bloqu/.test(t)) return 'lenteur';
  return 'generique_sav';
}
function vueSav(){
  const q = state.savSearch.trim().toLowerCase();
  const listeAvantFiltreStatut = q ? state.sav.filter(s => s.reference.toLowerCase().includes(q) || (s.structureNom || '').toLowerCase().includes(q) || (s.numeroSerie || '').toLowerCase().includes(q) || (s.nom || '').toLowerCase().includes(q)) : state.sav;
  const liste = state.savFiltreStatut ? listeAvantFiltreStatut.filter(s => s.statut === state.savFiltreStatut) : listeAvantFiltreStatut;

  const ordreComplet = state.statutsSav.length ? state.statutsSav : [...new Set(listeAvantFiltreStatut.map(s => s.statut))].map(statut => ({ statut, couleur: 't-gris' }));
  const nonTerminauxOrdre = ordreComplet.filter(d => !d.terminal);

  // Couleur par rôle dans le cycle de vie plutôt que par la teinte propre à chaque statut
  // (réglable une à une dans "Réglages statuts") : jaune pour la toute première étape, bleu
  // pour les étapes intermédiaires, vert pour une clôture réussie (le statut terminal encore
  // colorié "vert" dans les réglages), magenta pour toute autre clôture (annulé, refusé...).
  const couleurRole = (def) => {
    if(!def) return BADGE['tag-neutral'].fg;
    if(def.terminal) return def.couleur === 't-vert' ? COULEUR_VERT_GARANTIE : 'var(--color-accent)';
    const pos = nonTerminauxOrdre.findIndex(d => d.statut === def.statut);
    return pos === 0 ? 'var(--color-warn)' : 'var(--color-accent-2)';
  };
  const fractionPour = (def) => {
    if(!def) return 0;
    if(def.terminal) return 1;
    const pos = nonTerminauxOrdre.findIndex(d => d.statut === def.statut);
    return (pos + 1) / Math.max(1, nonTerminauxOrdre.length);
  };

  const couleurHex = (def) => {
    if(!def) return '#8FA3B3';
    if(def.terminal) return def.couleur === 't-vert' ? '#1F9D55' : '#E62460';
    const pos = nonTerminauxOrdre.findIndex(d => d.statut === def.statut);
    return pos === 0 ? '#FECC38' : '#00ACB0';
  };
  const pilulesFiltre = `
    <div class="rp-filtres">
      <button type="button" class="rp-filtre ${!state.savFiltreStatut ? 'actif' : ''}" data-filtrer-statut-sav="">Tous<span class="n">${listeAvantFiltreStatut.length}</span></button>
      ${ordreComplet.map(def => {
        const n = listeAvantFiltreStatut.filter(x => x.statut === def.statut).length;
        return `<button type="button" class="rp-filtre ${state.savFiltreStatut === def.statut ? 'actif' : ''}" style="--st:${couleurHex(def)}" data-filtrer-statut-sav="${echapper(def.statut)}"><span class="rp-point"></span>${echapper(def.statut)}<span class="n">${n}</span></button>`;
      }).join('')}
    </div>`;
  const ordreIndex = new Map(ordreComplet.map((d, i) => [d.statut, i]));
  const listeTriee = [...liste].sort((a, b) => (ordreIndex.get(a.statut) ?? 999) - (ordreIndex.get(b.statut) ?? 999));
  const cartes = listeTriee.map(t => {
    const def = ordreComplet.find(d => d.statut === t.statut);
    const coul = couleurHex(def);
    const frac = fractionPour(def);
    const nbBarres = Math.max(3, Math.min(6, nonTerminauxOrdre.length));
    const pleines = def && def.terminal ? nbBarres : Math.max(1, Math.round(frac * nbBarres));
    return `
    <div class="rp-sav-carte sv2 ${def && def.terminal ? 'clos' : ''}" style="--st:${coul}" data-sav-ouvrir="${echapper(t.reference)}" role="button" tabindex="0">
      <div class="sv2-haut">
        <span class="sv2-anneau" title="Avancement : ${pleines} étape${pleines > 1 ? 's' : ''} sur ${nbBarres}">${anneauSavSvg(nbBarres ? Math.round(pleines / nbBarres * 100) : 0)}<span class="sv2-anneau-in">${window.illustrationCvdl ? window.illustrationCvdl('sym-' + cleSymptomeAdmin(t.symptome), 34) : ''}</span></span>
        <span class="sv2-id"><b>${echapper(t.reference)}${typeof pastilleFilSav === 'function' ? pastilleFilSav(t) : ''}</b><small>${echapper(t.structureNom || t.nom || '')}</small></span>
      </div>
      <div class="sv2-corps">
        <b>${echapper([t.marque, t.modele].filter(Boolean).join(' ') || 'Appareil')}</b>
        <span>${echapper(t.symptome || 'Symptôme non précisé')}</span>
      </div>
      <div class="sv2-pied">
        <span class="rp-statut" style="--st:${coul}">${echapper(t.statut)}</span>
        <small>${echapper(t.date || '')}</small>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">SAV</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Dossiers de retour (statuts personnalisables).</p>
      </div>
      <div style="display:flex;gap:var(--space-3);align-items:center">
        <div class="rp-seg">
          <button type="button" class="${state.savVue === 'stats' ? '' : 'actif'}" data-sav-vue="liste">Dossiers</button>
          <button type="button" class="${state.savVue === 'stats' ? 'actif' : ''}" data-sav-vue="stats">Statistiques</button>
        </div>
        <button type="button" class="btn btn-secondary" data-ouvrir-reglages-statuts>${icon('wrench', 15)}Réglages statuts</button>
        <button type="button" class="btn btn-primary" data-ouvrir-creation="sav">${icon('plus', 15)}Nouveau SAV</button>
      </div>
    </div>
    ${state.savVue === 'stats' ? vueSavStatistiques() : `
    ${champRecherche('rp-recherche-sav', 'Rechercher par nom ou n° de série...', state.savSearch)}
    ${pilulesFiltre}
    <div class="rp-sav-grille">
      ${cartes || '<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucun dossier SAV.</div>'}
    </div>`}`;
}

/** Statistiques SAV — même base que l'onglet Statistiques général (anneauUnique,
 *  barreClassement, graphique en barres par mois) : par motif, par reconditionneur, par
 *  statut actuel, par structure, et quelques indicateurs de délai de traitement. */
function vueSavStatistiques(){
  const tickets = state.sav;
  const anneeCourante = new Date().getFullYear();
  const anneesDispo = new Set([anneeCourante]);
  tickets.forEach(s => { const iso = dateVersISO(s.date); if(iso) anneesDispo.add(new Date(iso).getFullYear()); });
  const anneeSelectionnee = state.savStatsAnnee || anneeCourante;
  anneesDispo.add(anneeSelectionnee);
  const listeAnnees = [...anneesDispo].sort((a, b) => b - a);

  const ticketsAnnee = tickets.filter(s => { const iso = dateVersISO(s.date); return iso && new Date(iso).getFullYear() === anneeSelectionnee; });

  const grouperPar = (champ, libelleVide) => {
    const compte = {};
    ticketsAnnee.forEach(s => { const v = (s[champ] || '').trim() || libelleVide; compte[v] = (compte[v] || 0) + 1; });
    return Object.keys(compte).map(label => ({ label, valeur: compte[label] })).sort((a, b) => b.valeur - a.valeur);
  };
  const parMotif = grouperPar('symptome', 'Non renseigné').slice(0, 8);
  const parReconditionneur = grouperPar('reconditionneur', 'Inconnu / non renseigné').slice(0, 8);
  const parStatut = grouperPar('statut', '—');
  const parMarque = grouperPar('marque', 'Non renseignée').slice(0, 8);

  const parStructure = {};
  ticketsAnnee.forEach(s => { const nom = s.structureNom || 'Sans structure'; parStructure[nom] = (parStructure[nom] || 0) + 1; });
  const topStructures = Object.keys(parStructure).map(nom => ({ label: nom, valeur: parStructure[nom] })).sort((a, b) => b.valeur - a.valeur).slice(0, 8);

  // Délai moyen de résolution (jours entre l'ouverture et dateResolution) — uniquement les
  // dossiers effectivement résolus dans l'année sélectionnée, sinon la moyenne n'aurait aucun
  // sens (un dossier encore ouvert n'a pas de délai à mesurer).
  const resolus = ticketsAnnee.filter(s => s.dateResolution);
  const delais = resolus.map(s => {
    const debut = dateVersISO(s.date), fin = dateVersISO(s.dateResolution);
    if(!debut || !fin) return null;
    return Math.max(0, Math.round((new Date(fin) - new Date(debut)) / 86400000));
  }).filter(n => n != null);
  const delaiMoyen = delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : null;

  const statutsTerminaux = new Set((state.statutsSav || []).filter(d => d.terminal).map(d => d.statut));
  const nbOuverts = ticketsAnnee.filter(s => !statutsTerminaux.has(s.statut)).length;
  const tauxResolu = ticketsAnnee.length ? Math.round((ticketsAnnee.length - nbOuverts) / ticketsAnnee.length * 100) : 0;

  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const parMois = new Array(12).fill(0);
  ticketsAnnee.forEach(s => { const iso = dateVersISO(s.date); if(iso) parMois[new Date(iso).getMonth()]++; });
  const maxMois = Math.max(1, ...parMois);

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-4)">
      <select class="input" id="sav-stats-annee" style="width:auto;flex:none">
        ${listeAnnees.map(a => `<option value="${a}" ${a === anneeSelectionnee ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${ticketsAnnee.length}</div>
        <div style="font-size:12.5px;opacity:0.6">dossiers ouverts en ${anneeSelectionnee}</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${nbOuverts}</div>
        <div style="font-size:12.5px;opacity:0.6">encore en cours</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${tauxResolu}%</div>
        <div style="font-size:12.5px;opacity:0.6">clôturés</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${delaiMoyen != null ? `${delaiMoyen} j` : '—'}</div>
        <div style="font-size:12.5px;opacity:0.6">délai moyen de résolution</div>
      </div>
    </div>

    <div class="card elev-sm" style="padding:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Dossiers par mois — ${anneeSelectionnee}</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px">
        ${parMois.map((n, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">
            <span style="font-size:11px;opacity:0.6">${n || ''}</span>
            <div class="rp-histo-barre" style="width:100%;border-radius:6px 6px 0 0;background:var(--color-accent-2);height:${Math.max(2, Math.round(n / maxMois * 100))}%"></div>
            <span style="font-size:11px;opacity:0.5">${MOIS[i]}</span>
          </div>`).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par motif</div>
        ${anneauUnique(parMotif)}
      </div>
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par reconditionneur</div>
        ${anneauUnique(parReconditionneur)}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par statut actuel</div>
        ${anneauUnique(parStatut)}
      </div>
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Par marque</div>
        ${anneauUnique(parMarque)}
      </div>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Structures avec le plus de dossiers SAV</div>
      ${barreClassement(topStructures)}
    </div>`;
}

/* ============================================================
   Devis / Factures
   ============================================================ */
function vueFactures(){
  const q = state.docSearch.trim().toLowerCase();

  // Un "dossier" = une commande qui a un devis, une facture, un état de rapprochement, ou qui a
  // demandé un devis pas encore généré (sinon ces commandes-là restaient invisibles ici alors
  // que c'est justement une tâche à faire) — les 3 blocs sont alignés sur cette même commande.
  let dossiers = state.commandes
    .filter(c => c.referenceDevis || c.referenceFacture || c.statutComptable || (c.devisDemande === 'Oui' && !structureExclueDevisFacture(c)))
    .map(c => ({
      c,
      d: state.devis.find(x => x.referenceDevis === c.referenceDevis),
      f: state.factures.find(x => x.referenceFacture === c.referenceFacture)
    }));
  if(q) dossiers = dossiers.filter(({ c, d, f }) =>
    c.nom.toLowerCase().includes(q) ||
    (d && d.referenceDevis.toLowerCase().includes(q)) ||
    (f && f.referenceFacture.toLowerCase().includes(q)));
  // Un devis "en attente" est un devis pas encore généré pour une commande qui en a demandé un
  // — pas un devis déjà émis (qui restait compté indéfiniment tant que son statut ne progresse
  // jamais au-delà de "Émis" côté back, ce qui revenait à compter TOUS les devis existants).
  const nbDevisAttente = dossiers.filter(({ c, d }) => !d && c.devisDemande === 'Oui').length;
  const nbFactureImpayee = dossiers.filter(({ f }) => f && f.statut !== 'Payée' && f.statut !== 'Annulée').length;
  if(state.docsFiltre === 'devis-attente') dossiers = dossiers.filter(({ c, d }) => !d && c.devisDemande === 'Oui');
  if(state.docsFiltre === 'facture-impayee') dossiers = dossiers.filter(({ f }) => f && f.statut !== 'Payée' && f.statut !== 'Annulée');

  // Couleur de fond calquée sur le statut réel de chaque pièce (via DOC_META/BADGE), plutôt
  // que sur une teinte fixe par colonne — un dossier entièrement soldé (devis accepté, facture
  // payée, rapproché) ressort donc visuellement tout en vert/turquoise, alors qu'avant les 3
  // blocs gardaient toujours la même couleur qu'ils soient réglés ou non, ce qui ne donnait
  // aucune impression de "clôturé". `vert` (paiement reçu) recolore TOUT — icône, référence et
  // libellé de statut compris, pas seulement le fond — sinon l'icône et le texte gardaient la
  // couleur de l'ancien statut malgré un fond vert, contradictoire à l'œil.
  const infosDevis = (d, vert) => d ? { present: true, type: 'devis', ref: d.referenceDevis, bg: vert ? BADGE['tag-accent-2'].bg : (d.dateEnvoiEmail ? BADGE['tag-warn'].bg : mkTag(d.statut, DOC_META).badgeBg), html: (() => {
    // Étape intermédiaire "envoyé par email" (jaune pâle, comme le vert pour "tout clôturé")
    // — n'écrase l'affichage du statut que si le dossier n'est pas déjà totalement clôturé.
    const envoye = !vert && !!d.dateEnvoiEmail;
    const fg = vert ? BADGE['tag-accent-2'].fg : envoye ? BADGE['tag-warn'].fg : mkTag(d.statut, DOC_META).badgeFg;
    const ic = vert ? icon('check', 15) : envoye ? icon('mail', 15) : mkTag(d.statut, DOC_META).icon;
    const titreEnvoi = envoye ? ` title="Envoyé à ${echapper(d.destinataireEnvoiEmail)} le ${echapper(d.dateEnvoiEmail)}"` : '';
    return `<span${titreEnvoi} class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 18%, var(--color-surface));color:${fg}">${ic}</span>
      <span style="font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${fg}">${echapper(d.referenceDevis)}</span>
      <span class="tag" style="flex:none;background:var(--color-surface);color:${fg}">${echapper(vert ? 'Accepté' : envoye ? 'Envoyé' : d.statut)}</span>
      <div style="font-size:13px;font-weight:600;flex:1;text-align:right;white-space:nowrap;color:${fg}">${echapper(formaterMontant(d.montantTotal))}</div>`;
  })() } : { present: false, bg: vert ? BADGE['tag-accent-2'].bg : null, html: vert
    ? `<span style="font-size:12.5px;color:${BADGE['tag-accent-2'].fg}">Pas de devis</span>`
    : `<span style="font-size:12.5px">Pas de devis</span>` };

  const infosFacture = (f, vert) => f ? { present: true, type: 'facture', ref: f.referenceFacture, bg: vert ? BADGE['tag-accent-2'].bg : (f.dateEnvoiEmail ? BADGE['tag-warn'].bg : mkTag(f.statut, DOC_META).badgeBg), html: (() => {
    const envoye = !vert && !!f.dateEnvoiEmail;
    const fg = vert ? BADGE['tag-accent-2'].fg : envoye ? BADGE['tag-warn'].fg : mkTag(f.statut, DOC_META).badgeFg;
    const ic = vert ? icon('check', 15) : envoye ? icon('mail', 15) : mkTag(f.statut, DOC_META).icon;
    const titreEnvoi = envoye ? ` title="Envoyé à ${echapper(f.destinataireEnvoiEmail)} le ${echapper(f.dateEnvoiEmail)}"` : '';
    return `<span${titreEnvoi} class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 18%, var(--color-surface));color:${fg}">${ic}</span>
      <span style="font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${fg}">${echapper(f.referenceFacture)}</span>
      <span class="tag" style="flex:none;background:var(--color-surface);color:${fg}">${echapper(vert ? 'Payée' : envoye ? 'Envoyée' : f.statut)}</span>
      <div style="font-size:13px;font-weight:600;flex:1;text-align:right;white-space:nowrap;color:${fg}">${echapper(formaterMontant(f.montantTotal))}</div>`;
  })() } : { present: false, bg: vert ? BADGE['tag-accent-2'].bg : null, html: vert
    ? `<span style="font-size:12.5px;color:${BADGE['tag-accent-2'].fg}">Pas de facture</span>`
    : `<span style="font-size:12.5px">Pas de facture</span>` };

  const infosRappro = (c, f) => {
    if(!f) return { present: false, bg: null, html: `<span style="font-size:12.5px">—</span>` };
    // Trois niveaux, pas deux : Non rapproché (rouge, rien fait) → Rapproché (jaune, pointé
    // mais pas clos) → Clôturé (vert, terminé). Avant ce changement, "Rapproché" et "Clôturé"
    // partageaient la même couleur verte — plus de distinction visuelle entre "en cours" et
    // "vraiment terminé".
    const b = c.statutComptable === 'Clôturé' ? BADGE['tag-accent-2']
      : c.statutComptable === 'Rapproché' ? BADGE['tag-warn']
      : { bg: 'var(--color-corail-100)', fg: 'var(--color-corail-700)' };
    const icone = c.statutComptable === 'Clôturé' ? 'check' : c.statutComptable === 'Rapproché' ? 'clock' : 'alert';
    // Ajustement optique : un triangle (alerte) ou une aiguille d'horloge, même parfaitement
    // centrés géométriquement dans leur cadre, paraissent visuellement décalés — correction
    // manuelle d'un pixel, absente pour "check" qui n'a pas ce problème.
    const decalageIcone = icone === 'alert' ? '-1px' : icone === 'clock' ? '0.5px' : '0px';
    return { present: true, bg: b.bg, html: `
      <span class="rp-doc-ic" style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;line-height:0;background:color-mix(in srgb, ${b.fg} 18%, var(--color-surface));color:${b.fg}"><span style="display:block;position:relative;top:${decalageIcone}">${icon(icone, 15)}</span></span>
      <div style="flex:1;min-width:0;color:${b.fg}">
        <div style="font-size:13px">${echapper(c.nom)}</div>
        ${c.numeroDepot ? `<div style="font-size:11.5px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(c.numeroDepot)}</div>` : ''}
      </div>
      <button type="button" class="tag" style="border:none;cursor:pointer;flex:none;background:var(--color-surface);color:${b.fg}" data-ouvrir-rapprochement="${echapper(f.referenceFacture)}">${echapper(c.statutComptable || 'Non rapproché')}</button>`, rappro: f.referenceFacture };
  };

  const cellule = (info, hauteurPleine) => `
    <div class="rp-doc-cel${info.present ? ' plein' : ''}" style="min-width:0;padding:var(--space-3);border-radius:var(--radius-md);display:flex;align-items:center;gap:var(--space-3);${hauteurPleine ? 'height:100%;' : ''}background:${info.bg || 'transparent'};border:${(info.present || info.bg) ? 'none' : '2.5px dashed var(--color-neutral-400)'};opacity:${(info.present || info.bg) ? '1' : '0.55'};overflow:hidden${(info.type || info.rappro) ? ';cursor:pointer' : ''}" ${info.type ? `data-doc-ouvrir="${info.type}:${echapper(info.ref)}"` : ''}${info.rappro ? ` data-ouvrir-rapprochement="${echapper(info.rappro)}" role="button" tabindex="0" title="Ouvrir la clôture"` : ''}>
      ${info.html}
    </div>`;
  const traitVertical = present => `<div class="rp-doc-trait${present ? ' ok' : ''}" style="width:2px;height:12px;margin-left:26px;background:${present ? 'var(--color-accent-2)' : 'var(--color-divider)'}"></div>`;
  const traitHorizontal = present => `<div class="rp-doc-trait h${present ? ' ok' : ''}" style="align-self:center;height:2px;background:${present ? 'var(--color-accent-2)' : 'var(--color-divider)'};min-width:20px"></div>`;

  const vueColonne = state.docsVue !== 'ligne';

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Devis / Factures</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">${vueColonne ? 'Devis, facture et rapprochement de chaque commande, empilés dossier par dossier.' : 'Devis, facture et rapprochement de chaque commande, alignés sur une même ligne.'}</p>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <div class="rp-seg">
          <button type="button" class="${vueColonne ? 'actif' : ''}" data-docs-vue="colonne">Colonne</button>
          <button type="button" class="${vueColonne ? '' : 'actif'}" data-docs-vue="ligne">Ligne</button>
        </div>
        <button type="button" class="btn btn-secondary" data-factures-mensuelles title="Produits payés en fin de mois (recharges…) : une facture par structure et par mois">${icon('calendrier', 15)}Factures mensuelles</button>
        <button type="button" class="btn btn-secondary" data-ouvrir-creation="devis">${icon('plus', 15)}Nouveau devis</button>
        <button type="button" class="btn btn-primary" data-ouvrir-creation="facture">${icon('plus', 15)}Nouvelle facture</button>
      </div>
    </div>
    ${champRecherche('rp-recherche-docs', 'Rechercher par nom de facture/devis...', state.docSearch)}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:var(--space-3) 0 var(--space-5)">
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${!state.docsFiltre ? 'var(--color-neutral-900)' : 'var(--color-surface)'};color:${!state.docsFiltre ? 'var(--th-tx-ffffffff, #fff)' : 'var(--color-text)'};border:1.5px solid ${!state.docsFiltre ? 'var(--color-neutral-900)' : 'var(--color-divider)'}" data-filtrer-docs="">
        Tous
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.docsFiltre === 'devis-attente' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.docsFiltre === 'devis-attente' ? 'var(--th-tx-ffffffff, #fff)' : 'var(--color-text)'};border:1.5px solid ${state.docsFiltre === 'devis-attente' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-docs="devis-attente">
        Devis en attente <span style="opacity:0.65;font-weight:600">${nbDevisAttente}</span>
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.docsFiltre === 'facture-impayee' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.docsFiltre === 'facture-impayee' ? 'var(--th-tx-ffffffff, #fff)' : 'var(--color-text)'};border:1.5px solid ${state.docsFiltre === 'facture-impayee' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-docs="facture-impayee">
        Facture impayée <span style="opacity:0.65;font-weight:600">${nbFactureImpayee}</span>
      </button>
    </div>
    ${dossiers.length ? (vueColonne ? `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4)">
      ${dossiers.map(({ c, d, f }) => {
        const surligne = state.highlightRef && (state.highlightRef === (d && d.referenceDevis) || state.highlightRef === (f && f.referenceFacture));
        // Clôturé = les 3 cases passent en vert ensemble (icône, référence et libellé compris,
        // pas juste le fond), plutôt que chacune sa propre couleur de statut individuel — un
        // dossier soldé doit se voir d'un coup d'œil, sans avoir à lire le détail de chaque case.
        const toutClôture = c.statutComptable === 'Clôturé';
        const iD = infosDevis(d, toutClôture), iF = infosFacture(f, toutClôture), iR = infosRappro(c, f);
        return `
        <div class="card elev-sm ${surligne ? 'rp-surligne' : ''}" style="padding:var(--space-4);gap:0">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.5;padding:0 4px 8px">${echapper(c.reference)} · ${echapper(c.nom)}</div>
          <div style="display:flex;flex-direction:column">
            ${cellule(iD)}
            ${traitVertical(iD.present && iF.present)}
            ${cellule(iF)}
            ${traitVertical(iF.present)}
            ${cellule(iR)}
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:var(--space-5)">
      ${dossiers.map(({ c, d, f }) => {
        const surligne = state.highlightRef && (state.highlightRef === (d && d.referenceDevis) || state.highlightRef === (f && f.referenceFacture));
        const toutClôture = c.statutComptable === 'Clôturé';
        const iD = infosDevis(d, toutClôture), iF = infosFacture(f, toutClôture), iR = infosRappro(c, f);
        return `
        <div class="card elev-sm ${surligne ? 'rp-surligne' : ''}" style="padding:var(--space-3);display:grid;grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr) 24px minmax(0,1fr);align-items:stretch;gap:0">
          ${cellule(iD, true)}
          ${traitHorizontal(iD.present && iF.present)}
          ${cellule(iF, true)}
          ${traitHorizontal(iF.present)}
          ${cellule(iR, true)}
        </div>`;
      }).join('')}
    </div>`) : '<p style="opacity:0.5;font-size:13px;padding:var(--space-6)">Aucun dossier devis/facture.</p>'}
    ${(() => {
      // Devis créés "libres" (sans commande rattachée) — la liste des dossiers ci-dessus se
      // construit à partir des commandes, elle ne les verrait donc jamais.
      const devisLibres = state.devis.filter(d => !d.referenceCommande);
      if(!devisLibres.length) return '';
      return `
      <div style="margin-top:var(--space-6)">
        <div class="card-title" style="font-size:16px;margin-bottom:var(--space-3)">Devis libres <span style="opacity:0.5;font-weight:400">· pas encore rattachés à une commande</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${devisLibres.map(d => `
            <div class="card elev-sm" style="padding:var(--space-3) var(--space-4);flex-direction:row;align-items:center;gap:var(--space-3)">
              <span style="font-size:13px;font-weight:700;flex:none">${echapper(d.referenceDevis)}</span>
              <span style="font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(d.nomStructure)} — ${echapper(d.produit)}</span>
              <span style="font-size:13px;font-weight:600;flex:none">${echapper(formaterMontant(d.montantTotal))}</span>
              <button type="button" class="btn btn-secondary" style="flex:none" data-rattacher-devis="${d.ligne}">Rattacher une commande</button>
            </div>`).join('')}
        </div>
      </div>`;
    })()}`;
}
function formaterMontant(v){
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') + ' €' : (v || '—');
}

/* ============================================================
   Stock — pas encore branché
   ============================================================ */
const SEUIL_STOCK_FAIBLE = 3;
function vueStock(){
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Stock</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Matériel reconditionné disponible.</p>
      </div>
      <button type="button" class="btn btn-primary" data-ouvrir-creation="produit">${icon('plus', 15)}Ajouter un produit</button>
    </div>
    <div class="stk-outils" role="toolbar" aria-label="Outils du stock">
      <button type="button" class="btn msb-bouton${msbActif() ? ' actif' : ''}" data-mode-stock-bas title="Limiter toutes les commandes des structures">${icon('alert', 15)}${msbActif() ? 'Mode stock bas · actif' : 'Mode stock bas'}</button>
      <span class="stk-sep" aria-hidden="true"></span>
      <button type="button" class="btn btn-secondary" id="btn-synchroniser-tectech" title="Mettre à jour les quantités depuis tec.tech">${icon('refresh', 15)}Synchroniser tec.tech</button>
      <button type="button" class="btn btn-secondary" data-organiser-materiel title="Ordre et couleurs de la page « Catégories de matériel » du portail">${icon('grip', 15)}Organiser le catalogue</button>
    </div>
    ${bandeauModeStockBas()}
    ${sectionDepotVenteStock()}
    ${(state.depotVente || []).length ? '<h2 class="dv-titre-catalogue">Catalogue</h2>' : ''}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:var(--space-6)">
      ${state.produits.length ? state.produits.map(p => {
        const stock = parseInt(p.stock, 10) || 0;
        const faible = stock > 0 && stock < SEUIL_STOCK_FAIBLE;
        const epuise = stock <= 0;
        const tagCls = epuise ? 'tag-accent' : faible ? 'tag-warn' : 'tag-accent-2';
        const tagLabel = epuise ? 'Épuisé' : faible ? 'Stock faible' : 'Disponible';
        return `
        <div class="card elev-sm" style="min-width:0;padding:var(--space-6);gap:var(--space-4);cursor:pointer" data-produit-modifier="${p.ligne}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="width:52px;height:52px;flex:none;display:flex;align-items:center;justify-content:center">${illustrationProduitAdmin(p.nom, p.icone, 50)}</span>
            <span class="tag ${tagCls}">${tagLabel}</span>
          </div>
          <div>
            <div style="font-weight:700;font-size:16px;margin-bottom:6px">${echapper(p.nom)}</div>
          </div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:var(--space-3);padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
            <span style="font-size:13px;opacity:0.7">${stock} en stock</span>
            <span style="font-family:var(--font-heading);font-size:22px">${formaterMontant(p.prixStandard)}</span>
          </div>
        </div>`;
      }).join('') : '<p style="opacity:0.5;font-size:13px">Aucun produit.</p>'}
    </div>`;
}

/* ============================================================
   Statistiques — calculées côté client à partir des données déjà
   chargées (commandes, factures, structures) : pas d'action back
   dédiée pour l'instant, donc portée aux ~500 dernières lignes de
   chaque liste (comme le reste de l'appli).
   ============================================================ */
function barreClassement(lignes, formatValeur){
  const max = Math.max(1, ...lignes.map(l => l.valeur));
  return `<div style="display:flex;flex-direction:column;gap:10px">
    ${lignes.length ? lignes.map(l => `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
          <span style="font-weight:600">${echapper(l.label)}</span>
          <span style="opacity:0.65">${echapper(formatValeur ? formatValeur(l.valeur) : l.valeur)}</span>
        </div>
        <div class="rp-barre-piste" style="height:8px;border-radius:999px;background:var(--color-neutral-200);overflow:hidden">
          <div class="rp-barre-val" style="height:100%;border-radius:999px;width:${Math.max(3, Math.round(l.valeur / max * 100))}%;background:var(--color-accent-2)"></div>
        </div>
      </div>`).join('') : '<p style="opacity:0.5;font-size:13px">Aucune donnée.</p>'}
  </div>`;
}
const PALETTE_ANNEAUX = ['var(--color-accent-2)', 'var(--color-accent)', 'var(--color-bleu)', 'var(--color-violet)', 'var(--color-orange)', 'var(--color-warn-700)', 'var(--color-vert)', 'var(--color-neutral-500)'];
/** Anneau unique segmenté — répartition de tous les éléments dans un seul donut (plutôt qu'un
 *  anneau par ligne), avec légende à côté. */
function anneauUnique(lignes, formatValeur, taille){
  taille = taille || 180;
  const total = lignes.reduce((s, l) => s + l.valeur, 0) || 1;
  // conic-gradient CSS plutôt que des arcs SVG en stroke-dasharray : la dernière étape est
  // forcée à 100% pile, donc aucun trou d'arrondi flottant possible entre segments — contraste
  // avec l'ancienne version en SVG qui pouvait laisser un fin espace gris visible.
  let cumulPct = 0;
  const stops = lignes.map((l, i) => {
    const debut = cumulPct;
    cumulPct += (l.valeur / total) * 100;
    const fin = i === lignes.length - 1 ? 100 : cumulPct;
    return `${PALETTE_ANNEAUX[i % PALETTE_ANNEAUX.length]} ${debut}% ${fin}%`;
  }).join(', ');
  const epaisseur = 16;
  const fond = lignes.length ? `conic-gradient(${stops})` : 'var(--color-neutral-200)';
  return `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <div class="rp-anneau" style="position:relative;width:${taille}px;height:${taille}px;flex:none;border-radius:50%;background:${fond}">
        <div class="rp-anneau-trou" style="position:absolute;inset:${epaisseur}px;border-radius:50%;background:var(--color-surface);display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-family:var(--font-heading);font-size:26px;color:var(--color-text);line-height:1">${total}</span>
          <span style="font-size:11px;color:var(--color-text);opacity:0.55">total</span>
        </div>
      </div>
      <div style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:8px">
        ${lignes.length ? lignes.map((l, i) => `
          <div style="display:flex;align-items:center;gap:8px">
            <span class="rp-leg-pt" style="width:10px;height:10px;border-radius:999px;flex:none;background:${PALETTE_ANNEAUX[i % PALETTE_ANNEAUX.length]}"></span>
            <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(l.label)}</span>
            <span style="font-size:11.5px;opacity:0.6;flex:none">${echapper(formatValeur ? formatValeur(l.valeur) : l.valeur)} · ${Math.round(l.valeur / total * 100)}%</span>
          </div>`).join('') : '<p style="opacity:0.5;font-size:13px">Aucune donnée.</p>'}
      </div>
    </div>`;
}
function classementAnneaux(lignes, formatValeur){
  const total = lignes.reduce((s, l) => s + l.valeur, 0) || 1;
  return `<div style="display:flex;flex-direction:column;gap:12px">
    ${lignes.length ? lignes.map((l, i) => `
      <div style="display:flex;align-items:center;gap:12px">
        ${ring(l.valeur / total, PALETTE_ANNEAUX[i % PALETTE_ANNEAUX.length], 32)}
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(l.label)}</div>
          <div style="font-size:11.5px;opacity:0.6">${echapper(formatValeur ? formatValeur(l.valeur) : l.valeur)} · ${Math.round(l.valeur / total * 100)}%</div>
        </div>
      </div>`).join('') : '<p style="opacity:0.5;font-size:13px">Aucune donnée.</p>'}
  </div>`;
}
/* ============================================================
   Réglages
   ============================================================ */
function urlPortailPublic(){
  // Résolution relative "comme un vrai lien" (même algorithme que suivrait un <a href="portail.html">
  // cliqué depuis cette page) — fonctionne quel que soit l'hébergement, y compris avec une URL
  // sans extension, un sous-dossier, ou un slash de fin.
  return new URL('portail.html', location.href).href;
}
async function copierTexte(texte, libelleSucces){
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(texte);
      etat(libelleSucces || 'Copié dans le presse-papier', 'succes');
      return;
    }
    throw new Error('contexte non sécurisé');
  }catch(e){
    try{
      const zone = document.createElement('textarea');
      zone.value = texte;
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.focus(); zone.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(zone);
      if(ok){ etat(libelleSucces || 'Copié dans le presse-papier', 'succes'); return; }
    }catch(e2){ /* tombe dans le message d'erreur ci-dessous */ }
    etat(`Copie impossible — voici le texte : ${texte}`, 'erreur');
  }
}
async function copierLienPortail(){
  await copierTexte(urlPortailPublic(), 'Lien copié dans le presse-papier');
}
function vueReglages(){
  const r = state.reglages || {};
  return `
    <h1 style="font-size:32px;margin-bottom:var(--space-2)">Réglages</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-6);font-size:15px">Paramètres généraux de la plateforme.</p>

    <div class="card elev-sm rg-secours">
      <div class="rg-secours-tete">
        <span class="rg-secours-ico">${icon('bouclier_garantie', 22)}</span>
        <div><div class="card-title">Plan de secours</div>
        <p style="margin:2px 0 0;opacity:.7;font-size:13.5px">Ce qu'il faut savoir si l'admin ne fonctionne plus. Rien n'est perdu : les commandes et demandes SAV continuent d'arriver.</p></div>
      </div>
      <div class="rg-secours-grille">
        <div class="rg-secours-bloc">
          <b>1. Les alertes par e-mail</b>
          <p>Chaque <b>nouvelle commande</b> et chaque <b>nouvelle demande SAV</b> envoie un e-mail à cette adresse, même si l'admin est en panne.</p>
          ${champ('Adresse qui reçoit les alertes', `<input class="input" id="rg-email-admin" type="email" value="${echapper(r.emailAdmin || '')}" placeholder="equipe@exemple.org">`)}
          ${r.emailAdmin ? `<div class="rg-etat ok">${icon('check', 14)}Alertes actives</div>` : `<div class="rg-etat ko">${icon('alert', 14)}Aucune adresse : aucune alerte n'est envoyée</div>`}
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-primary" data-enregistrer-email-admin>Enregistrer</button>
            <button type="button" class="btn btn-secondary" data-tester-alertes ${r.emailAdmin ? '' : 'disabled'}>Envoyer un e-mail de test</button>
          </div>
          <div id="rg-secours-retour"></div>
        </div>
        ${r.stockage === 'postgres' ? `<div class="rg-secours-bloc">
          <b>2. Les données sont dans une base PostgreSQL</b>
          <p>Commandes, demandes SAV, structures, produits… sont enregistrés dans une base de données Google Cloud SQL, <b>sauvegardée chaque jour</b> et restaurable à la minute près sur les 7 derniers jours (console Google Cloud → SQL → Sauvegardes).</p>
        </div>` : `<div class="rg-secours-bloc">
          <b>2. Les données sont dans Google Sheets</b>
          <p>Toutes les commandes (onglet <b>Commandes</b>) et demandes SAV (onglet <b>SAV</b>) y sont enregistrées directement. En cas d'erreur de manipulation : <i>Fichier → Historique des versions</i>.</p>
          ${r.classeurActifUrl ? `<a class="btn btn-secondary" href="${echapper(urlSure(r.classeurActifUrl))}" target="_blank" rel="noopener">${icon('lien_externe', 14)}Ouvrir le classeur</a>` : ''}
        </div>`}
        <div class="rg-secours-bloc">
          <b>3. L'admin de secours</b>
          <p>Une <b>copie figée</b> de l'ancien admin, qui fonctionnait avant la refonte. Même serveur, mêmes données : à utiliser le temps qu'une panne de l'admin principal soit corrigée.</p>
          <a class="btn btn-secondary" href="admin-secours.html" target="_blank" rel="noopener">${icon('lien_externe', 14)}Ouvrir l'admin de secours</a>
          <p style="font-size:12px;opacity:.65;margin:6px 0 0">Adresse à garder en favori : ${echapper(location.origin + location.pathname.replace(/[^/]*$/, ''))}admin-secours.html</p>
        </div>
      </div>
      <details class="rg-secours-procedure">
        <summary>Que faire si l'admin ne marche plus ?</summary>
        <ol>
          <li>Pas de panique : les structures peuvent toujours commander et signaler une panne, et vous recevez les e-mails d'alerte.</li>
          <li>Ouvrez l'<b>admin de secours</b> (lien ci-dessus) pour continuer à traiter les commandes.</li>
          ${r.stockage === 'postgres' ? '<li>Si lui non plus ne répond pas, les données restent intactes dans la base : les alertes e-mail donnent le détail de chaque nouvelle commande et demande SAV.</li>' : '<li>Si lui non plus ne répond pas, consultez directement le <b>classeur Google Sheets</b>.</li>'}
          <li>Prévenez la personne qui gère la technique : elle peut remettre la version précédente du serveur en un clic (Google Cloud → la fonction → Révisions).</li>
        </ol>
      </details>
    </div>


    ${sectionReglages({ ic: 'lien_externe', teinte: 'bleu', titre: 'Liens utiles', desc: 'Des fichiers à ouvrir d’un clic là où vous en avez besoin (numérotation des factures, tableau de suivi…), sans aller les chercher dans le Drive.',
      corps: window.sectionLiensUtiles ? window.sectionLiensUtiles() : '' })}

    ${sectionReglages({ ic: 'file', teinte: 'violet', titre: 'Documents', desc: 'Les modèles utilisés pour générer les bons de livraison, devis, factures et attestations.',
      corps: `
      <div class="rg-tuiles">
        ${[['data-ouvrir-modele-bon', 'Bon de livraison', 'À chaque préparation de commande'], ['data-ouvrir-modele-devis', 'Devis', 'Vente solidaire, Projets'], ['data-ouvrir-modele-facture', 'Facture', 'Après livraison ou en fin de mois'], ['data-ouvrir-modele-attestation', 'Attestation', 'Paiement des personnes accompagnées']]
          .map(([attr, nom, aide]) => `<button type="button" class="rg-tuile" ${attr}><span class="rg-tuile-ic">${icon('file', 18)}</span><span class="rg-tuile-txt"><b>${nom}</b><small>${aide}</small></span><span class="rg-tuile-go">Modifier ${icon('arrow', 13)}</span></button>`).join('')}
      </div>
      <details class="rg-details">
        <summary>Utiliser un modèle Google Sheets/Docs à la place (repli historique)</summary>
        <p class="rg-aide">Colle l'ID (ou le lien complet) du classeur/document modèle — ignoré si un modèle HTML est téléversé ci-dessus pour le même document.</p>
        <div class="rg-grille">
          ${champ("ID modèle — Bon de livraison", `<input class="input" id="rg-modele-bon-livraison" value="${echapper(r.modeleBonLivraison || '')}" placeholder="ID ou lien du classeur modèle">`)}
          ${champ("ID modèle — Bon d'orientation", `<input class="input" id="rg-modele-bon-orientation" value="${echapper(r.modeleBonOrientation || '')}" placeholder="ID ou lien du classeur modèle">`)}
          ${champ("ID modèle — Attestation de paiement", `<input class="input" id="rg-modele-attestation" value="${echapper(r.modeleAttestationPaiement || '')}" placeholder="ID ou lien du document modèle">`)}
          ${champ("ID modèle — Facturation", `<input class="input" id="rg-modele-facturation" value="${echapper(r.modeleFacturation || '')}" placeholder="ID ou lien du classeur modèle">`)}
        </div>
        <div class="rg-actions"><button type="button" class="btn btn-primary" id="rg-modeles-sheets-enregistrer">Enregistrer les modèles Sheets</button></div>
        <div id="rg-modeles-sheets-retour"></div>
      </details>` })}

    ${sectionReglages({ ic: 'cart', teinte: 'turquoise', titre: 'Commandes', desc: 'Quantité maximale d’un produit dans une commande, quand le produit n’a pas son propre maximum (fiche produit).',
      corps: `
      <div class="rg-grille">
        ${champ('Maximum par produit et par commande', `<input class="input" id="rg-qte-max" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${echapper(String(r.quantiteMaxDefaut || 5))}">`)}
        ${champ('Maximum pour les structures ESN et Interne', `<input class="input" id="rg-qte-max-esn" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${echapper(String(r.quantiteMaxDefautEsn || 5))}">`)}
      </div>
      <p class="rg-aide">Le « Mode stock bas » (onglet Stock) peut abaisser ces limites temporairement.</p>
      <div class="rg-actions"><button type="button" class="btn btn-primary" id="rg-qte-enregistrer">Enregistrer</button></div>` })}

    ${sectionReglages({ ic: 'refresh', teinte: 'turquoise', titre: 'Connexion à l’API tec.tech', desc: 'Reconditionneur partenaire — synchro stock, donateur/reconditionneur d’origine.',
      corps: `
      <div class="rg-grille">
        ${champ("URL de base", `<input class="input" id="rg-tectech-url" value="${echapper(r.tectechUrlBase || '')}" placeholder="https://tec-tech.osc-fr1.scalingo.io">`)}
        ${champ("ID de stock suivi", `<input class="input" id="rg-tectech-stock" value="${echapper(r.tectechIdStock || '')}" placeholder="S-0454">`)}
        <div class="rg-large">${champ("Statuts comptant comme \"disponible\" (séparés par une virgule)", `<input class="input" id="rg-tectech-statuts" value="${echapper(r.tectechStatuts || '')}" placeholder="PRET_A_COMMANDER,A_DISTRIBUER">`)}</div>
      </div>
      <div class="rg-actions">
        <button type="button" class="btn btn-secondary" id="rg-tectech-tester">${icon('refresh', 15)}Tester la connexion</button>
        <button type="button" class="btn btn-primary" id="rg-tectech-enregistrer">Enregistrer</button>
      </div>
      <div id="rg-tectech-retour"></div>` })}

    ${sectionReglages({ ic: 'bouclier_garantie', teinte: 'vert', titre: 'Sécurité — partages Drive publics', desc: 'Les documents (bons, attestations, factures, bons Colissimo) ne sont plus partagés « à toute personne disposant du lien » : la plateforme les ouvre par des liens signés valables 24 h. À lancer une fois après la mise à jour, pour les fichiers créés avant ce changement.',
      corps: `
      <div class="rg-actions"><button type="button" class="btn btn-secondary" id="rg-retirer-partages">${icon('refresh', 15)}Retirer les partages publics</button></div>
      <div id="rg-partages-retour"></div>` })}

    ${sectionReglages({ ic: 'alert', teinte: 'rouge', cls: 'rg-danger', titre: 'Mode démo — réinitialisation complète', desc: 'Efface toutes les Structures, Commandes, Devis, Factures, SAV et la flotte interne (jamais le catalogue Produits ni ces réglages), puis les repeuple avec un jeu de démonstration réaliste (~15 structures, ~70 commandes, SAV, devis/factures).',
      corps: `
      <p class="rg-aide">Réutilisable à volonté (avant chaque démo par exemple), mais <b>irréversible</b> à chaque lancement. Prend normalement moins d'une minute ; si ça échoue en cours de route, relancer est sans risque : tout est effacé avant d'être régénéré.</p>
      <div class="rg-grille">${champ('Tape RÉINITIALISER pour confirmer', `<input class="input" id="rg-demo-confirmation" placeholder="RÉINITIALISER" autocomplete="off">`)}</div>
      <div class="rg-actions"><button type="button" class="btn btn-primary rg-bouton-danger" id="rg-demo-lancer" disabled>${icon('refresh', 15)}Réinitialiser en mode démo</button></div>
      <div id="rg-demo-retour"></div>` })}`;
}
/** Section de l'écran Réglages : même en-tête que « Plan de secours » (pastille d'icône
 *  teintée + titre + phrase d'explication), puis le contenu. */
function sectionReglages({ ic, teinte, titre, desc, corps, cls }){
  return `
    <section class="card elev-sm rg-section rg-${teinte || 'bleu'}${cls ? ' ' + cls : ''}">
      <div class="rg-secours-tete">
        <span class="rg-secours-ico">${icon(ic, 20)}</span>
        <div><div class="card-title">${echapper(titre)}</div>
        ${desc ? `<p class="rg-desc">${echapper(desc)}</p>` : ''}</div>
      </div>
      <div class="rg-corps">${corps}</div>
    </section>`;
}
async function enregistrerQuantitesMax(){
  const qte = parseInt($('rg-qte-max').value, 10), esn = parseInt($('rg-qte-max-esn').value, 10);
  if(!(qte >= 1 && qte <= 1000) || !(esn >= 1 && esn <= 1000)){ etat('Indiquez un nombre entre 1 et 1000', 'erreur'); return; }
  const r = await poster({ action: 'reglages-set', quantiteMaxDefaut: qte, quantiteMaxDefautEsn: esn });
  if(r.ok){ Object.assign(state.reglages, { quantiteMaxDefaut: qte, quantiteMaxDefautEsn: esn }); etat('Réglages enregistrés', 'succes'); }
  else etat(r.erreur || 'Enregistrement impossible', 'erreur');
}
/** Accepte aussi bien un ID brut qu'un lien Google complet (Sheets/Docs) — la copie de modèle
 *  (copierModele côté backend) attend un ID nu, jamais une URL. */
function extraireIdDepuisLien(valeur){
  const v = String(valeur || '').trim();
  const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}
/** Retire le partage public des anciens fichiers Drive, par lots de 100, jusqu'au bout. */
async function retirerPartagesPublics(){
  const bouton = $('rg-retirer-partages'); if(bouton) bouton.disabled = true;
  let total = 0;
  try{
    for(let tour = 0; tour < 200; tour++){
      $('rg-partages-retour').innerHTML = `<div class="msg msg-info">${total} fichier(s) traité(s)…</div>`;
      const r = await poster({ action: 'securite-retirer-partages' });
      if(!r.ok){ $('rg-partages-retour').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Échec')}</div>`; break; }
      total += r.traites || 0;
      if(!r.reste){ $('rg-partages-retour').innerHTML = `<div class="msg msg-succes">Terminé : ${total} fichier(s) ne sont plus publics.</div>`; break; }
    }
  }catch(e){ $('rg-partages-retour').innerHTML = '<div class="msg msg-erreur">Échec — réessaie.</div>'; }
  if(bouton) bouton.disabled = false;
}
/** Mode démo : bouton désactivé tant que le mot de confirmation exact n'est pas tapé — filet de
 *  sécurité minimal avant une action destructrice qui efface toutes les données réelles. */
async function lancerReinitialisationDemo(){
  if($('rg-demo-confirmation').value.trim() !== 'RÉINITIALISER') return;
  if(!await confirmerCvdl("Dernière confirmation : ceci efface définitivement toutes les Structures, Commandes, Devis, Factures, SAV et la flotte interne actuelles, pour les remplacer par des données de démonstration. Le catalogue Produits n'est pas touché. Continuer ?")) return;
  const bouton = $('rg-demo-lancer');
  bouton.disabled = true;
  bouton.textContent = 'Génération en cours…';
  $('rg-demo-retour').innerHTML = `
    <div style="margin-top:8px">
      <div style="height:8px;border-radius:999px;background:var(--color-neutral-200);overflow:hidden">
        <div id="rg-demo-barre" style="height:100%;width:0%;background:var(--color-accent);transition:width .4s ease"></div>
      </div>
      <div id="rg-demo-etape" style="font-size:12.5px;opacity:0.65;margin-top:6px">Démarrage…</div>
    </div>`;

  // Sondage régulier de la progression pendant que la génération tourne côté serveur (peut
  // prendre plusieurs minutes, débit d'écriture volontairement limité — voir modeDemo.js).
  const sondage = setInterval(async () => {
    try{
      const p = await poster({ action: 'mode-demo-progression', password: motDePasse });
      if(p.ok && p.progression){
        const barre = $('rg-demo-barre'), etape = $('rg-demo-etape');
        if(barre) barre.style.width = `${p.progression.pourcentage}%`;
        if(etape) etape.textContent = p.progression.erreur ? `Erreur : ${p.progression.erreur}` : (p.progression.etape || '');
      }
    }catch(e){ /* un sondage manqué n'est pas grave, le suivant réessaiera */ }
  }, 2500);

  try{
    const r = await poster({ action: 'reset-donnees-test', password: motDePasse, confirmation: 'RÉINITIALISER' });
    clearInterval(sondage);
    if(r.ok){
      const res = r.resume || {};
      $('rg-demo-retour').innerHTML = `<div class="msg msg-succes">Terminé : ${res.structures || 0} structures, ${res.commandes || 0} commandes, ${res.devis || 0} devis, ${res.factures || 0} factures, ${res.sav || 0} tickets SAV, ${res.flotteInterneAjoutes || 0} appareils en flotte interne. Recharge la page pour tout revoir à jour.</div>`;
    }else{
      $('rg-demo-retour').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Échec de la génération.')}</div>`;
    }
  }catch(e){
    clearInterval(sondage);
    $('rg-demo-retour').innerHTML = '<div class="msg msg-erreur">Connexion impossible — réessaie.</div>';
  }
  bouton.disabled = $('rg-demo-confirmation').value.trim() !== 'RÉINITIALISER';
  bouton.textContent = 'Réinitialiser en mode démo';
}
async function enregistrerModelesSheets(){
  const bouton = $('rg-modeles-sheets-enregistrer');
  bouton.disabled = true;
  const champs = {
    modeleBonLivraison: extraireIdDepuisLien($('rg-modele-bon-livraison').value),
    modeleBonOrientation: extraireIdDepuisLien($('rg-modele-bon-orientation').value),
    modeleAttestationPaiement: extraireIdDepuisLien($('rg-modele-attestation').value),
    modeleFacturation: extraireIdDepuisLien($('rg-modele-facturation').value),
  };
  const reponses = await Promise.all(Object.keys(champs).map(c => poster({ action: 'reglages-set', champ: c, valeur: champs[c] })));
  const ok = !reponses.find(r => !r.ok);
  const retour = $('rg-modeles-sheets-retour');
  if(ok){
    Object.assign(state.reglages, champs);
    retour.innerHTML = '<div class="msg msg-succes">Modèles enregistrés.</div>';
  }else{
    retour.innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  bouton.disabled = false;
}
async function enregistrerReglagesTecTech(){
  const bouton = $('rg-tectech-enregistrer');
  bouton.disabled = true;
  const champs = {
    tectechUrlBase: $('rg-tectech-url').value.trim(),
    tectechIdStock: $('rg-tectech-stock').value.trim(),
    tectechStatuts: $('rg-tectech-statuts').value.trim(),
  };
  const reponses = await Promise.all(Object.keys(champs).map(c => poster({ action: 'reglages-set', champ: c, valeur: champs[c] })));
  const ok = !reponses.find(r => !r.ok);
  if(ok){
    Object.assign(state.reglages, champs);
    etat('Réglages enregistrés', 'succes');
  }else{
    etat('Enregistrement impossible', 'erreur');
  }
  bouton.disabled = false;
}
async function testerConnexionTecTech(){
  const bouton = $('rg-tectech-tester');
  const retour = $('rg-tectech-retour');
  bouton.disabled = true;
  retour.innerHTML = '<div class="msg msg-info">Vérification…</div>';
  try{
    const r = await jsonp({ action: 'tectech-tester-connexion', password: motDePasse });
    retour.innerHTML = r.ok
      ? `<div class="msg msg-succes">${echapper(r.message)}</div>`
      : `<div class="msg msg-erreur">${echapper(r.erreur || 'Connexion impossible.')}</div>`;
  }catch(e){
    retour.innerHTML = '<div class="msg msg-erreur">Connexion impossible — réessaie.</div>';
  }
  bouton.disabled = false;
}
document.addEventListener('click', e => {
  if(e.target.closest('#rg-tectech-enregistrer')) enregistrerReglagesTecTech();
  if(e.target.closest('#rg-tectech-tester')) testerConnexionTecTech();
  if(e.target.closest('#rg-modeles-sheets-enregistrer')) enregistrerModelesSheets();
  if(e.target.closest('#rg-demo-lancer')) lancerReinitialisationDemo();
  if(e.target.closest('#rg-retirer-partages')) retirerPartagesPublics();
  if(e.target.closest('#rg-qte-enregistrer')) enregistrerQuantitesMax();
});

function vuePasseportMateriel(){
  const r = state.passeportResultat;
  return `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:32px;margin-bottom:var(--space-2)">Passeport matériel</h1>
      <p style="opacity:0.65;margin:0;font-size:15px">Retrouver le parcours complet d'un appareil par son numéro de série — accès complet, toutes structures.</p>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6);gap:var(--space-4);margin-bottom:var(--space-6)">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input class="input" id="pm-numero-serie" style="flex:1;min-width:220px" placeholder="Numéro de série" value="${echapper(state.passeportRecherche)}">
        <button type="button" class="btn btn-primary" id="pm-rechercher">${icon('search', 15)}Rechercher</button>
      </div>
    </div>
    ${state.passeportChargement ? `<p style="opacity:0.6;font-size:13px">Recherche…</p>` : ''}
    ${(r && !r.ok) ? `<div class="card elev-sm" style="padding:var(--space-4) var(--space-5);background:var(--color-accent-100);color:var(--color-accent-700);font-size:13.5px">${echapper(r.erreur || 'Numéro de série introuvable.')}</div>` : ''}
    ${(r && r.ok) ? (() => {
      // Une seule carte pour tout, comme la page passeport.html standalone — avant, ces mêmes
      // informations étaient éparpillées sur jusqu'à 4 cartes séparées (info, origine tec.tech,
      // tickets SAV, historique), ce qui rendait la page difficile à parcourir d'un coup d'œil.
      const infosCompletes = r.reconditionneurOriginal !== undefined || !!r.tectech;
      const lignes = [
        !r.sourceTecTechUniquement ? ['N° de commande', echapper(r.referenceCommande), true] : null,
        r.structure ? ['Remis par', echapper(r.structure)] : null,
        r.dateLivraison ? ['Livré le', echapper(r.dateLivraison)] : null,
        r.nomPersonne ? ['Utilisé par', echapper(r.nomPersonne)] : null,
        ['Marque et modèle', ([r.marqueTecTech, r.modeleTecTech].filter(Boolean).map(echapper).join(' ') || '—') + ' <span style="opacity:0.5;font-weight:400">(tec.tech)</span>'],
        ['Système d\'exploitation', r.systemeTecTech ? echapper(r.systemeTecTech) : '—'],
        r.typeMateriel ? ['Type de matériel', echapper(r.typeMateriel) + (r.categorieMateriel ? ` · ${echapper(r.categorieMateriel)}` : '')] : null,
        r.statutAppareil ? ['Statut', echapper(r.statutAppareil)] : null,
        r.statutTecTech ? ['Statut tec.tech', echapper(r.statutTecTech)] : null,
        infosCompletes ? ['Reconditionneur', (r.tectech && r.tectech.reconditionneur) ? echapper(r.tectech.reconditionneur) : (r.reconditionneurOriginal ? echapper(r.reconditionneurOriginal) : '—')] : null,
        infosCompletes ? ['Donateur', (r.tectech && r.tectech.donateur) ? echapper(r.tectech.donateur) + (r.tectech.structureDonatrice ? ` (${echapper(r.tectech.structureDonatrice)})` : '') : '—'] : null,
      ].filter(Boolean);
      if(estUnifie()) return passeportUnifie(r, lignes);
      return `
      <div class="card elev-sm" style="padding:var(--space-6);gap:var(--space-4)">
        ${r.sourceTecTechUniquement ? `<div style="padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-warn-100);color:var(--color-warn-800);font-size:13px">Aucune commande CVDL associée à cet appareil — informations issues uniquement de tec.tech.</div>` : ''}
        <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap">
          <span style="width:52px;height:52px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon('passeport', 24)}</span>
          <div style="flex:1;min-width:180px">
            <div class="card-title" style="font-size:19px">${echapper(r.caracteristiques || r.numeroSerie)}</div>
          </div>
          ${badgeGarantie(r.dateLivraison)}
          ${!r.sourceTecTechUniquement ? `<a href="passeport.html?sn=${encodeURIComponent(r.numeroSerie)}&admin=1" target="_blank" class="btn btn-secondary">${icon('lien_externe', 14)}Passeport public</a>` : ''}
        </div>
        <div style="display:grid;gap:0;padding-top:var(--space-3);border-top:1px solid var(--color-divider)">
          ${lignes.map(([cle, valeur]) => `
            <div class="rp-ligne-info">
              <span class="cle">${cle}</span>
              <span class="valeur">${valeur}</span>
            </div>`).join('')}
        </div>

        ${r.ticketsSav && r.ticketsSav.length ? `
        <div style="padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:var(--space-3)">Tickets SAV (${r.ticketsSav.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${r.ticketsSav.map(t => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-md);background:var(--color-neutral-100);cursor:pointer" data-sav-ouvrir="${echapper(t.reference)}">
                <span style="font-size:12.5px;font-weight:700">${echapper(t.reference)}</span>
                <span style="font-size:12px;opacity:0.6;flex:1">${echapper(t.date)}${t.reconditionneur ? ` · ${echapper(t.reconditionneur)}` : ''}</span>
                <span class="tag tag-neutral">${echapper(t.statut)}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}

        ${(!r.sourceTecTechUniquement && r.historique && r.historique.length) ? `
        <div style="padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:var(--space-3)">Historique de l'appareil</div>
          <div style="display:grid;gap:var(--space-3)">
            ${r.historique.map(h => `
              <div class="rp-ligne-historique">
                <span class="icone" style="background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon('check', 16)}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:700">${echapper(h.label)}</div>
                </div>
                <span style="font-size:12px;opacity:0.5;flex:none">${echapper(h.date)}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;
    })() : ''}`;
}
/** Passeport matériel, style unifié — même composition que passeport.html (en-tête illustré,
 *  caractéristiques + historique côte à côte), plus les tickets SAV propres à l'admin. */
function passeportUnifie(r, lignes){
  const histo = (!r.sourceTecTechUniquement && r.historique) ? r.historique : [];
  const tickets = r.ticketsSav || [];
  return `
    ${r.sourceTecTechUniquement ? `<div class="msg msg-info" style="margin-bottom:14px">Aucune commande CVDL associée : informations issues de tec.tech uniquement.</div>` : ''}
    <div class="card pp-hero">
      ${(window.illustrationCvdl && window.cleIllustrationProduit) ? `<span class="pp-appareil" aria-hidden="true">${window.illustrationCvdl(window.cleIllustrationProduit(r.produit || r.categorieMateriel || r.caracteristiques || '', r.icone), 96)}</span>` : '<span data-ill="flotte" class="ill xxl"></span>'}
      <div class="pp-id">
        <div class="rp-surtitre">Passeport de l'appareil${r.produit ? ` · ${echapper(r.produit)}` : ''}</div>
        <h2 class="pp-nom">${echapper(r.caracteristiques || r.numeroSerie)}</h2>
        <div class="pp-pastilles">
          <span class="pk-sn">${echapper(r.numeroSerie)}</span>
          ${badgeGarantie(r.dateLivraison)}
          ${r.statutAppareil ? `<span class="tag">${echapper(r.statutAppareil)}</span>` : ''}
        </div>
      </div>
      ${!r.sourceTecTechUniquement ? `<a href="passeport.html?sn=${encodeURIComponent(r.numeroSerie)}&admin=1" target="_blank" class="btn btn-secondary">${icon('lien_externe', 14)}Page publique</a>` : ''}
    </div>
    <div class="pp-grille${(histo.length || tickets.length) ? '' : ' seule'}">
      <div class="card pp-bloc">
        <div class="rp-surtitre">Caractéristiques</div>
        <div class="pp-lignes">${lignes.map(([cle, valeur]) => `<div class="rp-ligne-info"><span class="cle">${cle}</span><span class="valeur">${valeur}</span></div>`).join('')}</div>
      </div>
      ${(histo.length || tickets.length) ? `<div class="pp-colonne">
        ${histo.length ? `<div class="card pp-bloc">
          <div class="rp-surtitre">Historique</div>
          <ol class="pp-frise">${histo.map((h, k) => `<li class="${k === histo.length - 1 ? 'dernier' : ''}"><i></i><span>${echapper(h.label)}</span><small>${echapper(h.date)}</small></li>`).join('')}</ol>
        </div>` : ''}
        ${tickets.length ? `<div class="card pp-bloc">
          <div class="rp-surtitre">Tickets SAV · ${tickets.length}</div>
          ${tickets.map(t => `<div class="pp-ticket" data-sav-ouvrir="${echapper(t.reference)}" role="button" tabindex="0"><b>${echapper(t.reference)}</b><small>${echapper(t.date)}${t.reconditionneur ? ` · ${echapper(t.reconditionneur)}` : ''}</small><span class="tag">${echapper(t.statut)}</span></div>`).join('')}
        </div>` : ''}
      </div>` : ''}
    </div>`;
}
async function rechercherPasseportMateriel(snImpose, sansHistorique){
  const numeroSerie = String(snImpose != null ? snImpose : ($('pm-numero-serie') ? $('pm-numero-serie').value : '')).trim();
  state.passeportRecherche = numeroSerie;
  if(!sansHistorique) history.replaceState({ onglet: 'passeport' }, '', '#passeport' + (numeroSerie ? '?sn=' + encodeURIComponent(numeroSerie) : ''));
  if(!numeroSerie){ state.passeportResultat = { ok: false, erreur: 'Saisis un numéro de série.' }; render(); return; }
  state.passeportChargement = true;
  state.passeportResultat = null;
  render();
  try{
    state.passeportResultat = await poster({ action: 'passeport-materiel', numeroSerie });
  }catch(e){
    state.passeportResultat = { ok: false, erreur: 'Connexion impossible — réessaie.' };
  }
  state.passeportChargement = false;
  render();
  const champ = $('pm-numero-serie');
  if(champ){ champ.focus(); champ.setSelectionRange(numeroSerie.length, numeroSerie.length); }
}
document.addEventListener('click', e => {
  if(e.target.closest('#pm-rechercher')) rechercherPasseportMateriel();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Enter' && e.target.id === 'pm-numero-serie') rechercherPasseportMateriel();
});

function vueBilan(){
  const anneeCourante = new Date().getFullYear();
  // Les années proposées viennent des dates réellement présentes dans les commandes, plus
  // l'année en cours et la suivante systématiquement (pour pouvoir préparer l'année prochaine
  // même avant d'y avoir la moindre commande).
  const anneesDispo = new Set([anneeCourante, anneeCourante + 1]);
  state.commandes.forEach(c => {
    const iso = dateVersISO(c.date);
    if(iso) anneesDispo.add(new Date(iso).getFullYear());
  });
  const anneeSelectionnee = state.bilanAnnee || anneeCourante;
  anneesDispo.add(anneeSelectionnee);
  const listeAnnees = [...anneesDispo].sort((a, b) => b - a);

  const actives = state.commandes.filter(c => {
    if(c.statutCommande === 'Annulée') return false;
    const iso = dateVersISO(c.date);
    return iso && new Date(iso).getFullYear() === anneeSelectionnee && commandeDansFiltresStats(c);
  });
  const fs = state.statsFiltres;
  const facturesAnnee = state.factures.filter(f => {
    const iso = dateVersISO(f.date);
    if(!(iso && new Date(iso).getFullYear() === anneeSelectionnee)) return false;
    if(!fs.region && !fs.type && !fs.departement) return true;
    const st = state.structures.find(x => x.nom === f.nomStructure);
    return !!st && (!fs.region || st.region === fs.region) && (!fs.type || (st.type || 'standard') === fs.type) && (!fs.departement || departementDeAdresse(st.adresse) === fs.departement);
  });

  // Produits les plus distribués
  const parProduit = {};
  actives.forEach(c => (c.lignes || []).forEach(l => { parProduit[l.produit] = (parProduit[l.produit] || 0) + (parseInt(l.quantite, 10) || 0); }));
  const topProduits = Object.keys(parProduit).map(nom => ({ label: nom, valeur: parProduit[nom] })).sort((a, b) => b.valeur - a.valeur).slice(0, 8);

  // Structures qui commandent le plus
  const parStructureCmd = {};
  actives.forEach(c => { parStructureCmd[c.nom] = (parStructureCmd[c.nom] || 0) + 1; });
  const topStructuresCmd = Object.keys(parStructureCmd).map(nom => ({ label: nom, valeur: parStructureCmd[nom] })).sort((a, b) => b.valeur - a.valeur).slice(0, 8);

  // Argent rapporté par structure (sur les factures)
  const parStructureMontant = {};
  facturesAnnee.forEach(f => { parStructureMontant[f.nomStructure] = (parStructureMontant[f.nomStructure] || 0) + (parseFloat(f.montantTotal) || 0); });
  const topStructuresMontant = Object.keys(parStructureMontant).map(nom => ({ label: nom, valeur: parStructureMontant[nom] })).sort((a, b) => b.valeur - a.valeur).slice(0, 8);
  const totalFacture = facturesAnnee.reduce((s, f) => s + (parseFloat(f.montantTotal) || 0), 0);

  // Répartition des commandes par catégorie de structure (Collège/Université, École, etc.)
  const parCategorie = {};
  actives.forEach(c => {
    const structure = state.structures.find(s => s.nom === c.nom);
    const cat = (structure && structure.categorie) || 'Non renseignée';
    parCategorie[cat] = (parCategorie[cat] || 0) + 1;
  });
  const topCategories = Object.keys(parCategorie).map(nom => ({ label: nom, valeur: parCategorie[nom] })).sort((a, b) => b.valeur - a.valeur);

  // Répartition des commandes sur l'année sélectionnée
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const parMois = new Array(12).fill(0);
  actives.forEach(c => {
    const iso = dateVersISO(c.date);
    if(!iso) return;
    parMois[new Date(iso).getMonth()]++;
  });
  const maxMois = Math.max(1, ...parMois);

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Statistiques</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Vue d'ensemble de l'activité, calculée sur les commandes et factures chargées.</p>
      </div>
      <select class="input" id="bilan-annee" style="width:auto;flex:none">
        ${listeAnnees.map(a => `<option value="${a}" ${a === anneeSelectionnee ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div>
    ${barreFiltresStats()}
    ${state.statsFiltres.programme && state.statsFiltres.programme !== '__hors' ? sectionProgrammesStats() : ''}

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${actives.length}</div>
        <div style="font-size:12.5px;opacity:0.6">commandes (hors annulées)</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${Object.keys(parStructureCmd).length}</div>
        <div style="font-size:12.5px;opacity:0.6">structures actives</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${formaterMontant(totalFacture)}</div>
        <div style="font-size:12.5px;opacity:0.6">facturé au total</div>
      </div>
    </div>

    <div class="card elev-sm" style="padding:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Commandes par mois — ${anneeSelectionnee}</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px">
        ${parMois.map((n, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">
            <span style="font-size:11px;opacity:0.6">${n || ''}</span>
            <div class="rp-histo-barre" style="width:100%;border-radius:6px 6px 0 0;background:var(--color-accent-2);height:${Math.max(2, Math.round(n / maxMois * 100))}%"></div>
            <span style="font-size:11px;opacity:0.5">${MOIS[i]}</span>
          </div>`).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Produits les plus distribués</div>
        ${anneauUnique(topProduits)}
      </div>
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Structures qui commandent le plus</div>
        ${anneauUnique(topStructuresCmd)}
      </div>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Répartition des commandes par catégorie de structure</div>
      ${anneauUnique(topCategories)}
    </div>
    <div class="card elev-sm" style="padding:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Argent rapporté par structure</div>
      ${barreClassement(topStructuresMontant, formaterMontant)}
    </div>
    ${state.statsFiltres.programme && state.statsFiltres.programme !== '__hors' ? '' : sectionProgrammesStats()}`;
}

/* ============================================================
   Structures
   ============================================================ */
/** Explications courtes des 5 types de structure — reflètent les règles réellement appliquées
 *  côté back (exemption devis/facture, qui peut créer des structures partenaires...), pas une
 *  définition métier à part que le code ne suivrait pas. */
function vueInfoTypesStructure(){
  const items = [
    ['RNum', 'Réseau national', 'Structure standard : un devis puis une facture sont générés pour chaque commande, avec paiement demandé à la personne accompagnée.'],
    ['ESN', 'Entreprise du numérique solidaire', 'Structure partenaire : ni devis ni facture ne sont générés, les commandes sont exemptées de paiement.'],
    ['Interne', 'Structure Emmaüs Connect', 'Ni devis ni facture non plus ; peut en plus créer et gérer ses propres structures partenaires ("BO").'],
    ['BO', 'Structure partenaire', 'Créée par une structure Interne — rejoint le suivi général sans pouvoir passer commande elle-même comme RNum/ESN/Interne ; gérée depuis l\'espace de la structure Interne qui l\'a créée.'],
    ['Projets', 'Structure liée à un projet dédié', 'Mêmes règles qu\'une structure RNum : devis, facture et paiement s\'appliquent normalement.'],
  ];
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(540px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Types de structure</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
          ${items.map(([code, titre, desc]) => `
            <div style="display:flex;gap:var(--space-3);align-items:flex-start">
              <span class="tag tag-outline" style="flex:none;margin-top:2px">${echapper(code)}</span>
              <div>
                <div style="font-weight:700;font-size:13.5px">${echapper(titre)}</div>
                <div style="font-size:12.5px;opacity:0.7;margin-top:2px">${echapper(desc)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}
function vueStructures(){
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="display:flex;align-items:center;gap:8px;font-size:32px;margin-bottom:var(--space-2)">Structures
          <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-info-types-structure title="Qu'est-ce que les différents types de structure signifient ?">${icon('info', 15)}</button>
        </h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Annuaire des organismes partenaires.</p>
      </div>
      <button type="button" class="btn btn-primary" data-ouvrir-creation="structure">${icon('plus', 15)}Nouvelle structure</button>
    </div>
    ${state.structures.some(x => !x.typeDefini) ? `<div class="msg msg-warn st-migration">
      <span style="flex:1">${state.structures.filter(x => !x.typeDefini).length} structure(s) n’ont pas encore de type enregistré${state.structures.some(typeAChoisir) ? `, dont ${state.structures.filter(typeAChoisir).length} à trancher à la main` : ''}.</span>
      <button type="button" class="btn btn-secondary" data-migrer-types>Voir et appliquer</button>
    </div>` : ''}
    ${(() => { const regions = [...new Set(state.structures.map(x => x.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
      return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:var(--space-4)">
        <label for="st-filtre-region" style="font-size:13px;font-weight:600">Région analytique</label>
        <select class="input" id="st-filtre-region" style="width:auto;min-width:220px">
          <option value="">Toutes (${state.structures.length})</option>
          ${regions.map(r => `<option value="${echapper(r)}" ${state.structuresFiltreRegion === r ? 'selected' : ''}>${echapper(r)} (${state.structures.filter(x => x.region === r).length})</option>`).join('')}
          <option value="__aucune" ${state.structuresFiltreRegion === '__aucune' ? 'selected' : ''}>Non rattachées (${state.structures.filter(x => !x.region).length})</option>
        </select>
      </div>`; })()}
    <div class="card elev-sm" style="padding:0;overflow:hidden">
      ${state.structures.filter(s => !state.structuresFiltreRegion || (state.structuresFiltreRegion === '__aucune' ? !s.region : s.region === state.structuresFiltreRegion)).map(s => {
        const type = typeStructure(s);
        const c = TYPE_COLORS[type];
        const revealed = !!state.revealedCodes[s.ligne];
        return `
        <div class="st-ligne" style="display:grid;grid-template-columns:38px minmax(240px, 2.2fr) 140px minmax(0, 1fr) auto;align-items:center;gap:var(--space-4);padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-divider);min-width:0;cursor:pointer;min-height:70px" data-structure-vue="${s.ligne}" role="button" tabindex="0" aria-label="Ouvrir la fiche 360 de ${echapper(s.nom)}">
          <span style="width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:${c.bg};color:${c.fg}">${icon('building', 18)}</span>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-width:0;min-height:38px">
            <span style="font-weight:700;font-size:14px;line-height:1.3;overflow-wrap:anywhere" title="${echapper(s.nom)}">${echapper(s.nom)}</span>
            ${typeAChoisir(s) ? '<span class="tag" data-forme="losange" style="flex:none">Type à définir</span>' : `<span class="tag tag-outline" style="flex:none">${echapper(type)}</span>`}
            ${s.depotVente ? `<button type="button" class="dv-tag" data-flotte-structure="${echapper(s.code)}" title="Gérer la flotte en dépôt-vente">${icon('package', 13)}Dépôt-vente${(() => { const d = etatDepotVente(s.code); return d ? ` · ${d.enStock}` : ''; })()}</button>` : ''}
          </div>
          <div style="min-width:0">${s.region ? `<span class="tag" title="Région analytique" style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(s.region)}</span>` : '<span style="font-size:12px;opacity:.45">Sans région</span>'}</div>
          <div style="min-width:0;font-size:13px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(s.email || '')}</div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--color-neutral-100);padding:6px 10px;border-radius:var(--radius-md)">
            <span style="font-family:ui-monospace,monospace;font-size:13px">${revealed ? echapper(s.code) : '••••••••••'}</span>
            <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px;flex:none" data-reveal-code="${s.ligne}" aria-label="${revealed ? 'Masquer' : 'Afficher'} le code">${icon(revealed ? 'eyeoff' : 'eye', 15)}</button>
            <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px;flex:none" data-structure-modifier="${s.ligne}" aria-label="Modifier ${echapper(s.nom)}">${icon('gear', 15)}</button>
          </div>
        </div>`;
      }).join('') || '<p style="opacity:0.5;font-size:13px;padding:var(--space-6)">Aucune structure.</p>'}
    </div>`;
}

/* ============================================================
   Modale de détail (commande / SAV)
   ============================================================ */
/** Statut de garantie à 3 paliers, calculé côté serveur à partir de la date d'achat/livraison
 *  — même logique que passeport-materiel (routes/commandes.js), dupliquée ici plutôt que
 *  partagée entre les deux fichiers (pas de module commun pour ce genre de petit calcul dans
 *  ce projet). en_cours (< 1 an), bientot (entre 1 et 2 ans), expiree (> 2 ans). */
function statutGarantiePourDate(dateAchatFormatee){
  const [j, m, a] = String(dateAchatFormatee || '').split('/').map((n) => parseInt(n, 10));
  if(!j || !m || !a) return { statut: null, dateFinGarantie: '' };
  const dateAchat = new Date(a, m - 1, j);
  const dateMiGarantie = new Date(a + 1, m - 1, j);
  const dateFinGarantie = new Date(a + 2, m - 1, j);
  const maintenant = new Date();
  const statut = maintenant >= dateFinGarantie ? 'expiree' : maintenant >= dateMiGarantie ? 'bientot' : 'en_cours';
  return { statut, dateFinGarantie: dateFinGarantie.toLocaleDateString('fr-FR') };
}
// Vert dédié "garantie en cours" / clôture SAV réussie — pas var(--color-accent-2), qui est
// le turquoise déjà réservé aux infos/succès génériques ailleurs dans l'admin (coche
// "Terminée", étapes intermédiaires SAV, etc.) ; ce vert reste propre à ces deux usages précis
// pour rester identifiable au premier coup d'œil.
const COULEUR_VERT_GARANTIE = 'var(--color-vert-garantie)';
function badgeGarantie(dateAchatFormatee){
  const { statut, dateFinGarantie } = statutGarantiePourDate(dateAchatFormatee);
  if(statut === 'en_cours') return `<span class="rp-garantie g-ok" style="display:inline-flex;align-items:center;gap:6px;background:${COULEUR_VERT_GARANTIE};color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('bouclier_garantie', 13)}Garantie en cours (jusqu'au ${echapper(dateFinGarantie)})</span>`;
  if(statut === 'bientot') return `<span class="rp-garantie g-att" style="display:inline-flex;align-items:center;gap:6px;background:var(--color-warn-700);color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('bouclier_garantie', 13)}Garantie bientôt expirée (jusqu'au ${echapper(dateFinGarantie)})</span>`;
  if(statut === 'expiree') return `<span class="rp-garantie g-ko" style="display:inline-flex;align-items:center;gap:6px;background:var(--th-bg-e5484dff, #E5484D);color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('x', 13)}Hors garantie (${echapper(dateFinGarantie)})</span>`;
  return '';
}
function vueModal(){
  const m = state.modal;
  if(m.kind === 'distribution-form') return vueDistributionForm();
  if(m.kind === 'distribution-detail') return vueDistributionDetail();
  if(m.kind === 'creer-structure') return vueCreerStructure();
  if(m.kind === 'flotte-structure') return vueFlotteStructure();
  if(m.kind === 'stock-restreint') return vueStockRestreint();
  if(m.kind === 'mode-stock-bas') return vueModeStockBas();
  if(m.kind === 'factures-mensuelles') return vueFacturesMensuelles();
  if(m.kind === 'creer-commande') return vueCreerCommande();
  if(m.kind === 'creer-produit') return vueCreerProduit();
  if(m.kind === 'creer-devis') return vueCreerDevis();
  if(m.kind === 'creer-facture') return vueCreerFacture();
  if(m.kind === 'reglages-sav') return vueReglagesStatutsSav();
  if(m.kind === 'info-types-structure') return vueInfoTypesStructure();
  if(m.kind === 'migration-types') return vueMigrationTypes();
  if(m.kind === 'structure-360') return vueStructure360();
  if(m.kind === 'coefficients-impact') return vueCoefficientsImpact();
  if(m.kind === 'tectech-resultats'){
    const okCount = m.resultats.filter(r => r.ok).length;
    return `
      <div class="dialog-backdrop">
        <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,100%)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
            <div class="dialog-title">Synchronisation tec.tech</div>
            <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
          </div>
          <p style="font-size:13px;opacity:0.7;margin:0">${okCount}/${m.resultats.length} produit(s) synchronisé(s).</p>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto">
            ${m.resultats.map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:var(--radius-md);background:${r.ok ? 'var(--color-accent-2-100)' : 'var(--color-accent-100)'}">
                <span style="font-size:13px;font-weight:600">${echapper(r.nom)}</span>
                <span style="font-size:12.5px;color:${r.ok ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)'}">${r.ok ? `${r.ancienStock} → ${r.nouveauStock}` : echapper(r.erreur || 'Erreur')}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }
  if(m.kind === 'document-genere'){
    const dg = state.documentGenere || {};
    const estDevis = m.type === 'devis';
    const doc = estDevis ? state.devis.find(x => x.referenceDevis === m.ref) : state.factures.find(x => x.referenceFacture === m.ref);
    if(!doc) return '';
    const referenceAffichee = `${estDevis ? 'devis' : 'facture'} ${estDevis ? doc.referenceDevis : doc.referenceFacture}`;
    const sujetParDefaut = `Votre ${referenceAffichee}${doc.referenceCommande ? ` — commande ${doc.referenceCommande}` : ''} — Emmaüs Connect`;
    const texteParDefaut = `Bonjour,\n\nVeuillez trouver votre ${referenceAffichee} en pièce jointe.\n\nCordialement,\nEmmaüs Connect`;
    return `
      <div class="dialog-backdrop">
        <div class="dialog" role="dialog" aria-modal="true" style="width:min(480px,100%)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
            <div class="dialog-title">${estDevis ? echapper(doc.referenceDevis) : echapper(doc.referenceFacture)}</div>
            <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
          </div>
          <div style="font-size:13px;opacity:0.7">${echapper(doc.nomStructure)} · ${echapper(formaterMontant(doc.montantTotal))}</div>
          ${doc.dateEnvoiEmail ? `<div style="font-size:12px;opacity:0.55;display:flex;align-items:center;gap:6px">${icon('mail', 12)}Envoyé à ${echapper(doc.destinataireEnvoiEmail)} le ${echapper(doc.dateEnvoiEmail)}</div>` : ''}
          ${dg.erreur ? `<div class="msg msg-erreur">${echapper(dg.erreur)}</div>` : ''}
          ${dg.url ? `
            <div class="card elev-sm" style="padding:var(--space-4);gap:10px;background:var(--color-accent-2-100)">
              <button type="button" class="btn btn-secondary" style="width:fit-content" data-ouvrir-doc-genere="${echapper(dg.url)}">${icon('lien_externe', 14)}Ouvrir le document</button>
            </div>
            ${dg.envoiOk ? `<div class="msg msg-succes">Email envoyé.</div>` : !dg.envoiOuvert ? `
              <button type="button" class="btn btn-ghost" style="width:fit-content;margin-top:var(--space-2)" data-toggle-envoi-doc>${icon('mail', 14)}Envoyer par email <span style="opacity:0.5;font-weight:400">— facultatif</span></button>
            ` : `
              <div style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:8px">
                <div class="field"><label>Destinataire</label><input class="input" id="dg-email" type="email" value="${echapper(dg.email != null ? dg.email : (doc.email || ''))}"></div>
                <div class="field"><label>Objet</label><input class="input" id="dg-sujet" value="${echapper(dg.sujet != null ? dg.sujet : sujetParDefaut)}"></div>
                <div class="field"><label>Message</label><textarea class="input" id="dg-texte" rows="5">${echapper(dg.texte != null ? dg.texte : texteParDefaut)}</textarea></div>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <button type="button" class="btn btn-ghost" data-toggle-envoi-doc>Annuler</button>
                  <button type="button" class="btn btn-primary" style="flex:1" data-doc-envoyer ${dg.envoiChargement ? 'disabled' : ''}>${dg.envoiChargement ? 'Envoi…' : 'Envoyer'}</button>
                </div>
              </div>
            `}
          ` : `<button type="button" class="btn btn-primary btn-block" style="margin-top:var(--space-3)" data-doc-generer ${dg.chargement ? 'disabled' : ''}>${dg.chargement ? 'Génération…' : 'Générer le document'}</button>`}
          ${(estDevis && !doc.referenceCommande && doc.statut !== 'Annulé') ? `<div style="margin-top:var(--space-3)"><button type="button" class="btn btn-secondary btn-block" data-generer-commande-depuis-devis="${doc.ligne}">${icon('plus', 14)}Générer la commande liée</button></div>` : ''}
          ${doc.statut === 'Annulé'
            ? `<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-divider);font-size:12.5px;opacity:0.7;display:flex;align-items:center;gap:6px">${iconeAnnuler(15)} Annulé — motif : ${echapper(doc.motifAnnulation || '—')}</div>`
            : `<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-divider)"><button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-annuler-${estDevis ? 'devis' : 'facture'}="${doc.ligne}" data-ref-${estDevis ? 'devis' : 'facture'}="${echapper(estDevis ? doc.referenceDevis : doc.referenceFacture)}">${iconeAnnuler(18)}Annuler ${estDevis ? 'ce devis' : 'cette facture'}</button></div>`}
        </div>
      </div>`;
  }
  if(m.kind === 'modele-bon') return vueModeleBon();
  if(m.kind === 'modele-doc') return vueModeleDoc();
  if(m.kind === 'modele-attestation') return vueModeleAttestation();
  if(m.kind === 'rapprochement') return vueRapprochement();
  if(m.kind === 'rattacher-devis') return vueRattacherDevis();
  if(m.kind === 'organiser-materiel') return vueOrganiserMateriel();
  if(m.kind === 'kpi-listing') return vueKpiListing(m.quoi);
  if(m.kind === 'creer-sav') return vueCreerSav();
  if(m.kind === 'a-livrer') return vueALivrer(m.produit);
  if(m.kind === 'commande'){
    const c = state.commandes.find(x => x.reference === m.ref);
    if(!c) return '';
    return vueDossierCommande(c);
  }
  if(m.kind === 'sav'){
    const s = state.sav.find(x => x.reference === m.ref);
    if(!s) return '';
    return vueDossierSav(s);
  }
  return '';
}

/** Panneau donateur/reconditionneur d'origine (tec.tech) — chargé à la demande (bouton), pas
 *  automatiquement à l'ouverture du ticket : évite un appel tec.tech par ticket ouvert quand
 *  la plupart du temps l'admin n'a pas besoin de cette info. */
function blocOrigineTecTech(s){
  const etatOrigine = state.tectechOrigine[s.reference];
  if(!etatOrigine){
    return `<button type="button" class="btn btn-secondary" style="width:fit-content" data-charger-origine-tectech="${echapper(s.reference)}" data-ns="${echapper(s.numeroSerie)}">${icon('refresh', 14)}Voir l'origine (tec.tech)</button>`;
  }
  if(etatOrigine === 'chargement'){
    return `<div style="font-size:13px;opacity:0.6">Recherche chez tec.tech…</div>`;
  }
  if(!etatOrigine.ok){
    return `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-100);color:var(--color-accent-700);font-size:12.5px">${echapper(etatOrigine.erreur || 'Origine introuvable.')}</div>`;
  }
  return `<div class="card elev-sm" style="padding:var(--space-4);gap:6px;background:var(--color-neutral-100)">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;font-weight:700">Origine (tec.tech)</div>
    ${(etatOrigine.marque || etatOrigine.modele) ? `<div style="font-size:13px"><strong>Marque et modèle</strong> · ${echapper([etatOrigine.marque, etatOrigine.modele].filter(Boolean).join(' '))}</div>` : ''}
    <div style="font-size:13px"><strong>Reconditionneur</strong> · ${etatOrigine.reconditionneur ? echapper(etatOrigine.reconditionneur) : '—'}</div>
    <div style="font-size:13px"><strong>Donateur</strong> · ${etatOrigine.donateur ? echapper(etatOrigine.donateur) : '—'}${etatOrigine.structureDonatrice ? ` (${echapper(etatOrigine.structureDonatrice)})` : ''}</div>
  </div>`;
}
document.addEventListener('click', async e => {
  const btn = e.target.closest('[data-charger-origine-tectech]');
  if(!btn) return;
  const ref = btn.dataset.chargerOrigineTectech;
  const numeroSerie = btn.dataset.ns;
  state.tectechOrigine[ref] = 'chargement';
  render();
  try{
    const r = await poster({ action: 'sav-origine-tectech', numeroSerie });
    state.tectechOrigine[ref] = r;
  }catch(err){
    state.tectechOrigine[ref] = { ok: false, erreur: 'Connexion impossible.' };
  }
  render();
});

/* ============================================================
   Panneau "étape suivante" de la commande — mêmes conditions
   bloquantes que conditionBloquanteEtapeSuivante() côté back.
   ============================================================ */
/** Devis & Paiement — étape à part, sous le déroulé des statuts de livraison, pour les
 *  structures RN/Projets (Interne/BO/ESN n'ont ni devis ni facture). Le devis reste généré
 *  depuis l'étape "Validée" (il conditionne le passage à "Préparée"), cette section n'en
 *  affiche que le statut ; la facture, elle, n'est bloquante nulle part, donc entièrement
 *  gérée ici, disponible dès que la commande existe. */
/** Noms des bénéficiaires associés à une commande, dans l'ordre — pour étiqueter chaque lien
 *  de paiement séparé avec le bon nom (même format pipe "nom|genre|produit|série" que le
 *  suivi public, ou "nom — date" tant que l'association n'a pas encore réécrit la ligne). */
/** Reconstruit, dans l'ordre des lignes de la commande (c.lignes), quelle unité de quel produit
 *  correspond à quel bénéficiaire — utilisé pour BO uniquement (seule structure à nommer un
 *  bénéficiaire par unité). Un produit peut avoir besoin de l'un sans l'autre (une recharge
 *  demande un code mais jamais de nom ; un atelier l'inverse) : on ne suppose donc jamais que
 *  la liste des personnes et celle des numéros de série avancent au même rythme — chacune
 *  n'avance que pour les produits qui la concernent (sansPersonne / sansNumeroSerie).
 *  Sans ça, avec une commande mélangeant par exemple ordinateurs (série + nom) et recharges
 *  (code, pas de nom), rien n'indiquait quel numéro de série revenait à quel bénéficiaire. */
function unitesSeriePersonnes(c){
  const lignesPersonnes = String(c.personnes || '').split('\n').map(s => s.trim()).filter(Boolean);
  let idxPersonne = 0;
  const unites = [];
  (c.lignes || []).forEach(l => {
    const p = state.produits.find(x => x.nom === l.produit) || {};
    const qte = parseInt(l.quantite, 10) || 0;
    for(let i = 0; i < qte; i++){
      let nom = null, dateNaissance = '';
      if(!p.sansPersonne){
        const ligneBrute = lignesPersonnes[idxPersonne++] || '';
        const separateur = ligneBrute.includes('|') ? '|' : (ligneBrute.includes(' — ') ? ' — ' : null);
        nom = (separateur ? ligneBrute.split(separateur)[0] : ligneBrute).trim() || null;
        dateNaissance = separateur ? (ligneBrute.split(separateur)[1] || '').trim() : '';
      }
      if(!p.sansNumeroSerie) unites.push({ produit: l.produit, nom, dateNaissance, dematerialise: !!p.dematerialise });
    }
  });
  return unites;
}
/** Appareils de la commande avec leur numéro de série (ou code) et la personne associée,
 *  dans l'ordre de saisie de la préparation — affiché dans la fiche commande. */
function blocAppareilsCommande(c, titre = true){
  const valeurs = String(c.numerosSerie || '').split('\n').map(x => x.trim());
  const unites = unitesSeriePersonnes(c);
  if(!unites.length && !valeurs.some(Boolean)) return '';
  const saisis = valeurs.filter(Boolean).length;
  const lignes = unites.map((u, i) => ({ ...u, valeur: valeurs[i] || '' }));
  valeurs.slice(unites.length).filter(Boolean).forEach(v => lignes.push({ produit: '', nom: null, dematerialise: !!c.dematerialisee, valeur: v }));
  const libelle = c.dematerialisee ? 'Codes' : 'Numéros de série';
  return `<section class="fc2-bloc fc2-appareils">
    ${titre ? `<div class="fc2-k">${libelle} · ${saisis} / ${Math.max(unites.length, saisis)}</div>` : ''}
    <div class="fc2-app-liste">${lignes.map(l => {
      const p = state.produits.find(x => x.nom === l.produit);
      return `<div class="fc2-app"><span class="rpd-ill">${l.produit ? illustrationProduitAdmin(l.produit, p ? p.icone : '', 28) : ''}</span>
        <span class="fc2-app-t"><b title="${echapper(l.produit || '')}">${echapper(l.produit || 'Appareil')}</b>${l.nom ? `<small>${icon('personne', 12)}${echapper(c.identiteMasquee ? nomPersonneAdmin('commande', c.ligne, l.nom) : l.nom)}</small>` : ''}</span>
        <span class="fc2-app-v">${l.valeur ? (l.dematerialise ? pilulesCodes(l.valeur) : pilulesNumerosSerie(l.valeur)) : `<em>${l.dematerialise ? 'Code' : 'N° de série'} à saisir</em>`}</span></div>`;
    }).join('')}</div>
  </section>`;
}
function nomsPersonnesCommande(c){
  return String(c.personnes || '').split('\n').map(s => s.trim()).filter(Boolean).map(ligne => {
    const separateur = ligne.includes('|') ? '|' : (ligne.includes('—') ? '—' : null);
    return separateur ? ligne.split(separateur)[0].trim() : ligne;
  });
}
/** Vrai si cette structure n'a jamais ni devis ni facture (Interne/ESN/BO) — même règle que le
 *  back (commande-devis-direct, commande-facturer-direct), à appliquer partout où l'admin choisit
 *  une commande à facturer ou à devis, pour ne jamais lister une commande que le back refusera
 *  de toute façon. */
function structureExclueDevisFacture(c){
  const structure = state.structures.find(s => s.code === c.code);
  // Dépôt-vente : mise en dépôt, jamais facturée à la commande (seules les ventes peuvent l'être).
  return !!(structure && (structure.interne || structure.esn || structure.bo || structure.depotVente));
}
/* ════════════════════════════════════════════════════════════════════════════════════════
   Dossier commande (maquette B) — grande fenêtre en deux colonnes :
   · à gauche la FICHE (qui, quoi, combien, contact) toujours visible ;
   · à droite le PARCOURS en check-list : raccourcis documents, puis les étapes à la verticale.
     L'étape en cours affiche ses tâches cochées / à faire, puis les actions existantes
     (carteEtapeCommande) ; les étapes passées se déplient (panneauEtapePasseeCommande).
   Toutes les actions réutilisent les data-attributs et gestionnaires déjà en place.
   ════════════════════════════════════════════════════════════════════════════════════════ */
/** État serveur d'une commande (action commande-etat, regles/prerequis.js) : étape suivante et
 *  checklist de ce qui manque — la MÊME règle que celle qui bloque le changement de statut.
 *  Rechargé dès qu'un champ qui compte pour les prérequis change. */
const cacheEtatsCommandes = {};
function signatureEtatCommande(c){
  return [c.statutCommande, c.numerosSerie, c.referenceDevis, c.referenceFacture, c.pasDeFacture, c.modeLivraison, c.colissimo, c.livraisonSansEnvoi, c.statutPaiement].join('|');
}
function etatServeurCommande(c){
  const sig = signatureEtatCommande(c);
  const entree = cacheEtatsCommandes[c.reference];
  if(!entree || (entree.sig !== sig && !entree.enCours)){
    cacheEtatsCommandes[c.reference] = { sig, enCours: true, etat: entree ? entree.etat : null };
    jsonp({ action: 'commande-etat', password: motDePasse, ligne: c.ligne }).then(r => {
      cacheEtatsCommandes[c.reference] = { sig, enCours: false, etat: r.ok ? r.etat : null };
      if(state.modal && state.modal.kind === 'commande' && state.modal.ref === c.reference) render();
    }).catch(() => { cacheEtatsCommandes[c.reference] = { sig, enCours: false, etat: null }; });
  }
  return cacheEtatsCommandes[c.reference];
}
/* Carte d'étape : menu « Autres actions », réouverture d'une tâche faite, enregistrements
   automatiques (Colissimo, date estimée), bouton principal bloqué tant qu'il manque quelque chose. */
document.addEventListener('click', e => {
  const bloque = e.target.closest('.et-principal[data-et-bloque]');
  if(bloque){ e.preventDefault(); e.stopImmediatePropagation(); rappelCalepin(); return; }
  const m = e.target.closest('[data-et-menu]');
  document.querySelectorAll('.et-menu-l').forEach(l => { if(!m || l !== m.nextElementSibling){ l.hidden = true; const b = l.previousElementSibling; if(b) b.setAttribute('aria-expanded', 'false'); } });
  if(m){ const l = m.nextElementSibling; l.hidden = !l.hidden; m.setAttribute('aria-expanded', String(!l.hidden)); return; }
  const r = e.target.closest('[data-et-rouvrir]');
  if(r && state.modal){ if(r.dataset.etRouvrir === 'mode') state.etRouvrirMode = state.modal.ref; else state.etRouvrirDate = state.modal.ref; render(); }
}, true);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && document.querySelector('.et-menu-l:not([hidden])')){ e.stopPropagation(); document.querySelectorAll('.et-menu-l').forEach(l => { l.hidden = true; }); }
}, true);
document.addEventListener('change', e => {
  const col = e.target.closest && e.target.closest('[data-auto-colissimo]');
  if(col && col.value.trim()){ confirmerColissimoPreparation(col.dataset.autoColissimo); return; }
  const dc = e.target.closest && e.target.closest('[data-auto-date-cible]');
  if(dc){ state.etRouvrirDate = null; enregistrerDateCibleCommande(dc.dataset.autoDateCible); }
});

/** Petite animation quand on essaie d'avancer alors que des tâches du calepin ne sont pas faites. */
function rappelCalepin(){
  const el = document.querySelector('.fc2-manque');
  if(!el) return;
  el.classList.remove('rappel'); void el.offsetWidth; el.classList.add('rappel');
  setTimeout(() => el.classList.remove('rappel'), 1200);
}

document.addEventListener('click', e => {
  const b = e.target.closest(':is(.rpd, .fc2) :is([data-changer-statut], [data-valider-preparation], [data-marquer-livree], [data-demander-validation])');
  if(!b) return;
  const ref = state.modal && state.modal.ref;
  const cache = ref && cacheEtatsCommandes[ref];
  if(cache && cache.etat && !cache.etat.peutAvancer) rappelCalepin();
}, true);
function blocPrerequisCommande(c, statut){
  const e = etatServeurCommande(c);
  const etat = e && e.etat;
  if(!etat || etat.statut !== statut || !etat.etapeSuivante || !window.FicheCommande) return '';
  // Composant partagé avec l'espace partenaire (fiche-commande.js)
  return `<div class="rpd-prerequis">${window.FicheCommande.checklist(etat)}</div>`;
}

/** Historique d'une commande (onglet « Historique » côté serveur) — mis en cache, rechargé si
 *  plus vieux de 20 s (le dossier se ré-affiche après chaque action). */
const cacheHistoriqueCommandes = {};
function historiqueCommande(c){
  const ref = c.reference;
  const entree = cacheHistoriqueCommandes[ref];
  if(!entree || (!entree.enCours && Date.now() - entree.t > 20000)){
    cacheHistoriqueCommandes[ref] = { t: Date.now(), enCours: true, evenements: entree ? entree.evenements : null };
    jsonp({ action: 'commande-historique', password: motDePasse, reference: ref }).then(r => {
      cacheHistoriqueCommandes[ref] = { t: Date.now(), enCours: false, evenements: (r && r.ok) ? (r.evenements || []) : [], ongletAbsent: !!(r && r.ongletAbsent) };
      if(state.modal && state.modal.kind === 'commande' && state.modal.ref === ref) render();
    }).catch(() => { cacheHistoriqueCommandes[ref] = { t: Date.now(), enCours: false, evenements: [] }; });
  }
  return cacheHistoriqueCommandes[ref];
}
/** Date d'une étape, déduite de l'historique (ou des dates connues de la commande). */
function dateEtapeCommande(c, statut, evenements){
  const jour = e => String(e.date || '').split(' ')[0];
  const trouve = motif => { const e = (evenements || []).filter(x => motif.test(x.evenement)).pop(); return e ? jour(e) : ''; };
  if(statut === 'Reçue') return c.date || trouve(/Commande (passée|créée)/);
  if(statut === 'Validée') return trouve(/^Validée/);
  if(statut === 'Livrée') return c.dateLivraison || trouve(/« Livrée »/);
  return trouve(new RegExp('« ' + statut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' »'));
}
function vueDossierCommande(c){
  const histo = historiqueCommande(c);
  const evenements = histo && histo.evenements ? histo.evenements : [];
  const statuts = c.dematerialisee ? ORDER_STATUSES.filter(s => s !== 'En cours de livraison') : ORDER_STATUSES;
  const annulee = c.statutCommande === 'Annulée';
  const idx = statuts.indexOf(c.statutCommande);
  const livree = c.statutCommande === 'Livrée';
  const exempte = structureExclueDevisFacture(c);
  const structure = state.structures.find(x => x.code === c.code);
  const urgente = c.dateLivraisonSouhaitee === 'ASAP';
  const devisAttendu = !exempte && c.devisDemande === 'Oui' && !c.referenceDevis;
  const montant = c.montantFacture != null ? c.montantFacture : c.montantEstime;
  const personnes = nomsPersonnesCommande(c);
  const couleurStatut = { 'Reçue': '#FECC38', 'Validée': '#E62460', 'Préparée': '#00ACB0', 'En cours de livraison': '#00777A', 'Livrée': '#1F9D55', 'Annulée': '#8FA3B3' }[c.statutCommande] || '#00ACB0';
  const copie = v => v ? `<button type="button" class="rpd-copie" data-copier-jeton="${echapper(v)}" title="Copier">${icon('copie', 12)}</button>` : '';
  const devis = c.referenceDevis ? state.devis.find(d => d.referenceDevis === c.referenceDevis) : null;
  const facture = c.referenceFacture ? state.factures.find(f => f.referenceFacture === c.referenceFacture) : null;
  const liensColis = String(c.colissimo || '').split('\n').map(x => x.trim()).filter(Boolean);
  const docs = [
    exempte ? null : (c.referenceDevis ? { cls: 'vio', ic: 'file', t: 'Devis', s: `${c.referenceDevis}${devis && devis.statut ? ' · ' + devis.statut : ''}`, goto: 'factures' } : (c.devisDemande === 'Oui' ? { cls: 'vio', ic: 'file', t: 'Devis', s: 'demandé — à générer', vide: 1 } : null)),
    exempte ? null : (c.referenceFacture ? { cls: 'mag', ic: 'receipt', t: 'Facture', s: `${c.referenceFacture}${facture && facture.statut ? ' · ' + facture.statut : ''}`, goto: 'factures' } : { cls: 'mag', ic: 'receipt', t: 'Facture', s: 'pas encore générée', vide: 1 }),
    c.bonLivraison ? { cls: 'tur', ic: 'file', t: 'Bon de livraison', s: 'ouvrir', lien: c.bonLivraison } : { cls: 'tur', ic: 'file', t: 'Bon de livraison', s: 'à la préparation', vide: 1 },
    ...liensColis.map((l, i) => ({ cls: 'amb', ic: 'truck', t: liensColis.length > 1 ? `Colis ${i + 1}` : 'Suivi colis', s: 'Colissimo', lien: l })),
    (c.lienPaiement || '').trim() ? { cls: 'mag', ic: 'receipt', t: 'Lien de paiement', s: c.paiementSepare ? 'un par personne' : 'envoyé' } : null,
  ].filter(Boolean);
  // ── Fiche commande (modèle « Commandes — refonte ») : en-tête compact + frise, onglets,
  //    « À faire maintenant » (panneau de l'étape + pense-bête + en bref), pied d'actions.
  if(state.ficheCommandeRef !== c.reference){ state.ficheCommandeRef = c.reference; state.ongletCommande = 'faire'; }
  const onglet = state.ongletCommande || 'faire';
  const serveur = etatServeurCommande(c);
  const infoType = serveur && serveur.etat && serveur.etat.libelleType ? `${serveur.etat.libelleType}${serveur.etat.circuit === 'interne' ? ' · circuit Interne' : ''}` : (structure ? typeStructure(structure) : '');
  const nbArticles = (c.lignes || []).reduce((n, l) => n + (parseInt(l.quantite, 10) || 0), 0);
  const TITRES_ETAPE = { 'Reçue': 'Faire valider la commande', 'Validée': 'Préparer la commande', 'Préparée': 'Organiser la livraison', 'En cours de livraison': 'Confirmer la livraison' };
  const frise = annulee ? '<div class="fc2-annulee">Commande annulée</div>' : `<ol class="fc2-frise">${statuts.map((s, i) => {
    const fait = livree ? i <= idx : i < idx, cours = !livree && i === idx;
    const date = (fait || cours) ? dateEtapeCommande(c, s, evenements) : '';
    const ouverte = state.etapeCommandeOuverte === s;
    return `<li class="${fait ? 'fait' : cours ? 'cours' : 'avenir'}${ouverte ? ' ouverte' : ''}">${fait
      ? `<button type="button" data-toggle-etape-passee="${echapper(s)}" title="Revoir l’étape « ${echapper(s)} »"><i></i><span>${echapper(s === 'En cours de livraison' ? 'En livraison' : s)}</span>${date ? `<small>${echapper(date)}</small>` : ''}</button>`
      : `<div><i></i><span>${echapper(s === 'En cours de livraison' ? 'En livraison' : s)}</span>${date ? `<small>${echapper(date)}</small>` : ''}</div>`}</li>`;
  }).join('')}</ol>`;
  const etapeOuverte = statuts.includes(state.etapeCommandeOuverte) && (livree ? statuts.indexOf(state.etapeCommandeOuverte) <= idx : statuts.indexOf(state.etapeCommandeOuverte) < idx) ? state.etapeCommandeOuverte : null;
  const manquants = serveur && serveur.etat && serveur.etat.statut === c.statutCommande ? serveur.etat.prerequis.filter(p => !p.ok) : [];
  let panneau;
  if(annulee){
    panneau = `<div class="fc2-panneau fc2-fin"><div class="fc2-k">Commande annulée</div><h2>Cette commande a été annulée</h2>${commentaireReel(c) ? `<p>« ${echapper(c.commentaire)} »</p>` : ''}</div>`;
  }else if(etapeOuverte){
    panneau = `<div class="fc2-panneau fc2-passe et-carte">
      <div class="fc2-k">Étape terminée · ${echapper(etapeOuverte === 'En cours de livraison' ? 'En livraison' : etapeOuverte)}</div>
      <h2>Revoir ou corriger « ${echapper(etapeOuverte)} »</h2>
      <div class="rpd-actions">${panneauEtapePasseeCommande(c, etapeOuverte)}</div>
      <div class="et-pied"><span class="et-manque"></span><button type="button" class="btn btn-secondary" data-toggle-etape-passee="${echapper(etapeOuverte)}">← Revenir à l’étape en cours</button></div>
    </div>`;
  }else if(livree){
    panneau = carteCommandeLivree(c, personnes, nbArticles);
  }else{
    panneau = carteEtapeCommande(c, statuts, manquants, serveur);
  }
  const enBref = `<div class="fc2-bref">
    <div class="fc2-k">En bref</div>
    <div class="fc2-bref-l"><span>Articles</span><b>${nbArticles} article${nbArticles > 1 ? 's' : ''}</b></div>
    ${(() => { const n = String(c.numerosSerie || '').split('\n').filter(x => x.trim()).length; const att = c.quantiteAvecNumeroSerie != null ? c.quantiteAvecNumeroSerie : n; return (n || att) ? `<div class="fc2-bref-l"><span>${c.dematerialisee ? 'Codes' : 'N° de série'}</span><b>${n} / ${Math.max(att, n)}${n ? ` · <button type="button" class="lien-structure" data-onglet-commande="commande">voir</button>` : ''}</b></div>` : ''; })()}
    ${c.moyenPaiement && !exempte ? `<div class="fc2-bref-l"><span>Paiement</span><b>${echapper(c.moyenPaiement)}${c.statutPaiement ? ` · <em class="${c.statutPaiement === 'Payé' ? 'ok' : 'ko'}">${echapper(c.statutPaiement)}</em>` : ''}</b></div>` : ''}
    ${montant != null && !exempte ? `<div class="fc2-bref-l"><span>Total</span><b>${formaterMontant(montant)}</b></div>` : ''}
    <div class="fc2-bref-l"><span>Livraison</span><b>${echapper(c.modeLivraison || 'à définir')}${urgente ? ' · <em class="ko">urgente</em>' : (c.dateLivraisonSouhaitee ? ` · souhaitée ${echapper(c.dateLivraisonSouhaitee)}` : '')}</b></div>
    ${(c.responsableCommande || c.telephone) ? `<div class="fc2-bref-l"><span>Prescripteur · contact</span><b>${echapper([c.responsableCommande, c.telephone].filter(Boolean).join(' · '))}</b></div>` : ''}
  </div>`;
  const ongletCommande = `<div class="fc2-grille2">
      <section class="fc2-bloc"><div class="fc2-k">Articles</div>
        ${(c.lignes || []).map(l => { const p = state.produits.find(x => x.nom === l.produit); return `<div class="fc2-art"><span class="rpd-ill">${illustrationProduitAdmin(l.produit, p ? p.icone : '', 34)}</span><span><b>${parseInt(l.quantite, 10)} ×</b> ${echapper(l.produit)}</span></div>`; }).join('') || '<p class="rpd-apercu">Aucun article</p>'}
        ${montant != null && !exempte ? `<div class="fc2-bref-l fc2-total"><span>Total</span><b>${formaterMontant(montant)}</b></div>` : ''}
      </section>
      <section class="fc2-bloc"><div class="fc2-k">Livraison</div>
        ${c.modeLivraison ? `<div class="rpd-row">${icon('truck', 14)}${echapper(c.modeLivraison)}</div>` : '<div class="rpd-row">Mode à définir à la préparation</div>'}
        ${c.dateLivraisonSouhaitee ? `<div class="rpd-row">${icon(urgente ? 'eclair' : 'calendrier', 14)}Souhaitée : ${urgente ? 'dès que possible' : echapper(c.dateLivraisonSouhaitee)}</div>` : ''}
        ${c.dateLivraisonCible ? `<div class="rpd-row">${icon('clock', 14)}Prévue : ${echapper(c.dateLivraisonCible)}</div>` : ''}
        ${c.adresse ? `<div class="rpd-row">${icon('pin', 14)}${echapper(c.adresse)}</div>` : ''}
        <div class="fc2-k" style="margin-top:14px">Contact</div>
        ${c.responsableCommande ? `<div class="rpd-row">${icon('personne', 14)}${echapper(c.responsableCommande)}</div>` : ''}
        ${c.email ? `<div class="rpd-row">${icon('mail', 14)}<a href="mailto:${echapper(c.email)}">${echapper(c.email)}</a>${copie(c.email)}</div>` : ''}
        ${c.telephone ? `<div class="rpd-row">${icon('telephone', 14)}${echapper(c.telephone)}${copie(c.telephone)}</div>` : ''}
      </section>
    </div>
    ${personnes.length ? `<section class="fc2-bloc"><div class="fc2-k">Personnes accompagnées · ${personnes.length}${c.identiteMasquee ? boutonIdentite('commande', c.ligne) : ''}</div><div class="fc2-personnes">${personnes.map(n => `<span>${icon('personne', 13)}${echapper(c.identiteMasquee ? nomPersonneAdmin('commande', c.ligne, n) : n)}</span>`).join('')}</div>${c.identiteMasquee && !identiteRevelee('commande', c.ligne) ? '<p class="idr-note">Pseudonymes : l’identité reste utilisée pour les attestations et bons, sans être affichée.</p>' : ''}</section>` : ''}
    ${blocAppareilsCommande(c)}
    ${commentaireReel(c) ? `<section class="fc2-bloc"><div class="fc2-k">Commentaire de la structure</div><p class="fc2-comm">« ${echapper(c.commentaire)} »</p></section>` : ''}
    ${panneauDevisPaiementCommande(c)}`;
  const ongletDocuments = `<div class="rpd-docs fc2-docs">${docs.map(d => {
      const inner = `<span class="rpd-di ${d.cls}">${icon(d.ic, 14)}</span><span>${echapper(d.t)}<small>${echapper(d.s)}</small></span>`;
      return d.lien ? `<a class="rpd-doc" href="${echapper(urlSure(d.lien))}" target="_blank" rel="noopener">${inner}</a>`
        : d.goto ? `<button type="button" class="rpd-doc" data-nav="${d.goto}">${inner}</button>`
        : `<span class="rpd-doc ${d.vide ? 'vide' : ''}">${inner}</span>`;
    }).join('')}</div>`;
  const ongletHistorique = `<div class="rpd-historique">
      ${evenements.length ? `<ol class="rpd-hist">${evenements.slice().reverse().map(e => `<li><i></i><span>${echapper(e.evenement)}${e.auteur ? `<small>${echapper(e.auteur)}</small>` : ''}</span><small>${echapper(e.date)}</small></li>`).join('')}</ol>`
        : `<p class="rpd-apercu">${histo && histo.ongletAbsent ? "L'onglet « Historique » n'existe pas encore dans le classeur — créez-le pour garder la trace des actions." : (histo && histo.enCours ? 'Chargement…' : 'Aucun événement enregistré pour cette commande.')}</p>`}
    </div>`;
  const ong = (cle, lib) => `<button type="button" role="tab" class="fc2-onglet${onglet === cle ? ' actif' : ''}" aria-selected="${onglet === cle}" data-onglet-commande="${cle}">${lib}</button>`;
  return `
    <div class="rp-drawer-backdrop rpd-voile fc2-voile">
      <div class="fc2" role="dialog" aria-modal="true" aria-label="Commande ${echapper(c.reference)}">
        <header class="fc2-tete">
          <span data-ill="commandes" class="ill xl"></span>
          <div class="fc2-id">
            <div class="fc2-sur">${echapper(c.reference)} · commandée le ${echapper(c.date)}</div>
            <div class="fc2-nom">${(() => { const st = structure; return st ? `<button type="button" class="lien-structure" data-structure-vue="${st.ligne}" title="Ouvrir la fiche 360° de la structure">${echapper(c.nom)}</button>` : echapper(c.nom); })()}</div>
            <div class="fc2-puces">${infoType ? `<span class="tag">${echapper(infoType)}</span>` : ''}${badgeUrgentCommande(c)}${c.transfereAdmin ? '<span class="tag">Transférée</span>' : ''}</div>
          </div>
          ${frise}
          <button type="button" class="rpd-fermer" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <nav class="fc2-onglets" role="tablist" aria-label="Sections de la commande">
          ${ong('faire', 'À faire maintenant')}${ong('commande', 'Commande')}${ong('documents', `Documents · ${docs.filter(d => !d.vide).length}`)}${ong('historique', 'Historique')}
        </nav>
        <div class="fc2-corps">
          ${onglet === 'faire' ? `<div class="fc2-faire">${panneau}<aside class="fc2-cote">${enBref}</aside></div>`
            : onglet === 'commande' ? ongletCommande
            : onglet === 'documents' ? ongletDocuments
            : ongletHistorique}
          <div id="rp-retour-modale"></div>
        </div>
        <footer class="fc2-pied">
          <span class="fc2-espace"></span>
          <div class="et-menu">
            <button type="button" class="btn btn-secondary" data-et-menu aria-expanded="false" aria-haspopup="true">Autres actions <span aria-hidden="true">▾</span></button>
            <div class="et-menu-l" role="menu" hidden>
              ${c.email ? `<a role="menuitem" href="mailto:${echapper(c.email)}?subject=${encodeURIComponent('Votre commande ' + c.reference)}">${icon('mail', 14)}Écrire à la structure</a>` : ''}
              ${structure ? `<button type="button" role="menuitem" data-structure-vue="${structure.ligne}">${icon('building', 14)}Fiche 360° de la structure</button>` : ''}
              ${livree ? `<button type="button" role="menuitem" data-rapport-commande="${echapper(c.reference)}">${icon('file', 14)}Rapport d’impact</button>` : ''}
              ${(!livree && !annulee) ? `<button type="button" role="menuitem" class="danger" data-annuler-commande="${echapper(c.reference)}">${iconeAnnuler()}Annuler la commande…</button>` : ''}
            </div>
          </div>
        </footer>
      </div>
    </div>`;
}



/* Dossier SAV — même disposition que le dossier commande : fiche à gauche, parcours à droite.
   Les actions (changement de statut, clôture, annulation, origine tec.tech) réutilisent les
   gestionnaires existants (data-changer-statut-sav, data-changer-statut-sav-terminal…). */
/** Carte symptôme — même carte que le formulaire SAV du portail (illustration + couleur par famille). */
function familleCouleurSymptomeAdmin(texte){
  const t = String(texte || '').toLowerCase();
  if(/[ée]cran/.test(t) || /virus|malware|infect[ée]/.test(t)) return { bg: 'var(--th-bg-fdececff, #FDECEC)', fg: 'var(--th-tx-b42318ff, #B42318)' };
  if(/(charge|batterie|alimentation|allum)/.test(t) || /internet|wifi|wi-fi|r[ée]seau|connexion/.test(t)) return { bg: 'var(--th-bg-fff4d6ff, #FFF4D6)', fg: 'var(--th-tx-7a5a00ff, #7A5A00)' };
  if(/mise.{0,3}[àa].{0,3}jour|update/.test(t) || /lent|lenteur|rame|bloque|fige|plante/.test(t)) return { bg: 'var(--th-bg-e8f0feff, #E8F0FE)', fg: 'var(--th-tx-1d4ed8ff, #1D4ED8)' };
  if(/clavier/.test(t) || /souris/.test(t) || /\bsons?\b|audio|hauts?[-\s]?parleurs?|micro/.test(t)) return { bg: 'var(--th-bg-fce7efff, #FCE7EF)', fg: 'var(--th-tx-b0164aff, #B0164A)' };
  return { bg: 'var(--th-bg-eef2f5ff, #EEF2F5)', fg: 'var(--th-tx-002743ff, #002743)' };
}
function carteSymptomeSav(texte){
  const f = familleCouleurSymptomeAdmin(texte);
  const cle = window.cleSymptomeCvdl ? window.cleSymptomeCvdl(texte) : 'generique_sav';
  const ill = window.illustrationCvdl ? (window.illustrationCvdl('sym-' + cle, 52) || window.illustrationCvdl('sym-generique_sav', 52)) : icon('alert', 26);
  return `<div class="rpd-sym" style="--c-bg:${f.bg};--c-fg:${f.fg}"><span class="rpd-sym-ill">${ill}</span><b>${echapper(texte || 'Non précisé')}</b></div>`;
}
function vueDossierSav(s){
  const defs = state.statutsSav.length ? state.statutsSav : [{ statut: s.statut, terminal: false }];
  const nonTerminaux = defs.filter(d => !d.terminal);
  const terminaux = defs.filter(d => d.terminal);
  const idx = Math.max(0, nonTerminaux.findIndex(d => d.statut === s.statut));
  const estSurTerminal = terminaux.some(d => d.statut === s.statut);
  const structureSav = state.structures.find(x => x.code === s.code);
  const suivant = !estSurTerminal ? nonTerminaux[idx + 1] : null;
  const dateStatut = st => { const h = (s.historique || []).filter(x => x.statut === st).pop(); return h ? h.date : ''; };
  const copie = v => v ? `<button type="button" class="rpd-copie" data-copier-jeton="${echapper(v)}" title="Copier">${icon('copie', 12)}</button>` : '';
  const autresTickets = s.numeroSerie ? state.sav.filter(x => x.numeroSerie === s.numeroSerie && x.reference !== s.reference) : [];
  const couleur = estSurTerminal ? '#1F9D55' : '#E5484D';
  const etapes = nonTerminaux.map((d, i) => {
    const fait = i < idx || estSurTerminal, enCours = i === idx && !estSurTerminal;
    const verrou = estSurTerminal || i > idx + 1;
    const date = dateStatut(d.statut);
    return `
      <div class="rpd-etape ${fait ? 'fait' : ''} ${enCours ? 'cours' : ''} ${(!fait && !enCours) ? 'avenir' : ''}">
        <span class="rpd-point">${fait ? icon('check', 15) : icon(iconeStatutSav(d.statut, d.icone), 15)}</span>
        <div class="rpd-etape-corps">
          <div class="rpd-etape-titre"><b>${echapper(d.statut)}</b><small>${enCours ? 'en cours' : ''}${date ? `${enCours ? ' · depuis le ' : ''}${echapper(date)}` : ''}</small></div>
          ${enCours ? `<div class="rpd-bloc-cours">
            ${suivant ? `<button type="button" class="btn btn-primary btn-block" data-changer-statut-sav="${echapper(suivant.statut)}" data-ref="${echapper(s.reference)}">${icon('arrow', 15)}Passer à « ${echapper(suivant.statut)} »</button>`
              : `<p class="rpd-apercu">Dernière étape avant la clôture — choisissez l'issue du dossier ci-dessous.</p>`}
            ${d.colissimo ? blocColissimoSav(s) : ''}
          </div>` : ''}
          ${(!fait && !enCours && !verrou && !estSurTerminal) ? '' : ''}
        </div>
      </div>`;
  }).join('');
  return `
    <div class="rp-drawer-backdrop rpd-voile">
      <div class="rpd" role="dialog" aria-modal="true" aria-label="SAV ${echapper(s.reference)}" style="--rpd-statut:${couleur}">
        <aside class="rpd-fiche">
          <div class="rpd-fiche-haut"><span class="rpd-k">SAV${structureSav ? ' · ' + echapper(typeStructure(structureSav)) : ''}</span><span class="rpd-statut">${echapper(s.statut || '')}</span><button type="button" class="rpd-fermer rpd-fermer-mobile" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
          <div class="rpd-id">
            <span data-ill="suiviSav" class="ill xl"></span>
            <div><div class="rpd-ref">${echapper(s.reference)}</div>
            ${s.referenceCommande ? (state.commandes.some(c => c.reference === s.referenceCommande)
              ? `<button type="button" class="rpd-cmd-lien" data-commande-ouvrir="${echapper(s.referenceCommande)}" title="Ouvrir la commande d’origine">${icon('package', 13)}${echapper(s.referenceCommande)}<span aria-hidden="true">→</span></button>`
              : `<span class="rpd-cmd-lien inactif">${icon('package', 13)}${echapper(s.referenceCommande)}</span>`) : ''}
            <div class="rpd-structure">${(() => { const st = state.structures.find(x => x.code === s.code); const n = s.structureNom || s.nom || ''; return st ? `<button type="button" class="lien-structure" data-structure-vue="${st.ligne}" title="Ouvrir la fiche 360° de la structure">${echapper(n)}</button>` : echapper(n); })()}<small>Ouvert le ${echapper(s.date)}${s.dateResolution ? ' · clos le ' + echapper(s.dateResolution) : ''}</small></div></div>
          </div>
          <div class="rpd-badges">
            ${s.inactifDepuisUnMois && !estSurTerminal ? `<span class="rpd-b urg">${icon('clock', 11)}Inactif depuis 1 mois</span>` : ''}
            ${estSurTerminal ? `<span class="rpd-b ok">${icon('check', 11)}Dossier clos</span>` : ''}
            ${autresTickets.length ? `<span class="rpd-b dev">${icon('refresh', 11)}${autresTickets.length} autre${autresTickets.length > 1 ? 's' : ''} passage${autresTickets.length > 1 ? 's' : ''}</span>` : ''}
          </div>
          ${s.numeroSerie ? `<button type="button" class="rpd-passeport rpd-passeport-haut" data-passeport-url="passeport.html?sn=${encodeURIComponent(s.numeroSerie)}&admin=1" data-sn="${echapper(s.numeroSerie)}"><span data-ill="passeport" class="ill s"></span><span><b>Passeport de l’appareil</b><span class="rpd-passeport-sn">${echapper(s.numeroSerie)}<span class="rpd-passeport-cp" role="button" tabindex="0" data-copier-sn="${echapper(s.numeroSerie)}" title="Copier le numéro de série" aria-label="Copier le numéro de série">${icon('copie', 12)}</span></span></span><span aria-hidden="true">→</span></button>` : ''}
          ${s.numeroSerie ? `<div class="rpd-sec rpd-origine"><span class="rpd-k">Origine de l’appareil</span>${blocOrigineTecTech(s)}</div>` : ''}
          ${(() => { const g = s.numeroSerie ? badgeGarantie(s.dateAchat) : ''; return (s.marque || s.modele || g) ? `<div class="rpd-somme">
            ${(s.marque || s.modele) ? `<div class="rpd-l"><span>Modèle</span><b>${echapper([s.marque, s.modele].filter(Boolean).join(' '))}</b></div>` : ''}
            ${g ? `<div class="rpd-l"><span>Garantie</span><b>${g}</b></div>` : ''}
          </div>` : ''; })()}
          <div class="rpd-sec"><span class="rpd-k">Symptôme</span>${carteSymptomeSav(s.symptome)}
            ${s.problemeEffectif ? `<div class="rpd-row">${icon('wrench', 14)}Constaté : ${echapper(s.problemeEffectif)}</div>` : ''}</div>
          ${(() => {
            // Identité pseudonymisée par le serveur ; révélation tracée (identite-admin.js).
            const rv = s.identiteMasquee ? identiteRevelee('sav', s.ligne) : null;
            const email = s.email || (rv && rv.contact && rv.contact.email) || '';
            const tel = s.telephone || (rv && rv.contact && rv.contact.telephone) || '';
            const nomPers = p => p ? nomPersonneAdmin('sav', s.ligne, p) : '';
            return `<div class="rpd-sec"><span class="rpd-k">Contact${s.contactPersonnel ? ' · la personne directement' : ''}</span>
            ${s.nomBeneficiaire ? `<div class="rpd-row">${icon('personne', 14)}${echapper(nomPers(s.nomBeneficiaire))}</div>` : ''}
            ${s.nom ? `<div class="rpd-row">${icon(s.code ? 'building' : 'personne', 14)}${echapper(s.code ? s.nom : nomPers(s.nom))}</div>` : ''}
            ${email ? `<div class="rpd-row">${icon('mail', 14)}<a href="mailto:${echapper(email)}">${echapper(email)}</a>${copie(email)}</div>` : (s.emailIndice ? `<div class="rpd-row idr-indice">${icon('mail', 14)}${echapper(s.emailIndice)}</div>` : '')}
            ${tel ? `<div class="rpd-row">${icon('telephone', 14)}${echapper(tel)}${copie(tel)}</div>` : (s.telephoneIndice ? `<div class="rpd-row idr-indice">${icon('telephone', 14)}${echapper(s.telephoneIndice)}</div>` : '')}
            ${s.identiteMasquee ? `<div class="rpd-row">${boutonIdentite('sav', s.ligne, s.contactPersonnel ? 'Afficher les coordonnées' : 'Afficher l’identité')}</div>` : ''}
          </div>`; })()}
          ${s.commentaire ? `<div class="rpd-comm">« ${echapper(s.commentaire)} »</div>` : ''}
          <div class="rpd-menu rpd-menu-v2">
            ${!estSurTerminal ? `<button type="button" class="btn-annuler" data-annuler-sav="${echapper(s.reference)}">${iconeAnnuler()}Annuler ce SAV</button>` : ''}
            ${s.email ? `<a class="rpd-mbtn" href="mailto:${echapper(s.email)}?subject=${encodeURIComponent('Votre demande SAV ' + s.reference)}">${icon('mail', 13)}Écrire</a>` : ''}
            ${!s.email && s.aEmail ? `<button type="button" class="rpd-mbtn" data-idr-ecrire="sav|${s.ligne}|${echapper(s.reference)}">${icon('mail', 13)}Écrire</button>` : ''}
          </div>
        </aside>
        <section class="rpd-parcours">
          <div class="rpd-ph"><h2>Parcours</h2><span>${estSurTerminal ? `Dossier clos · ${echapper(s.statut)}` : `Étape ${idx + 1} sur ${nonTerminaux.length} · ${echapper(s.statut)}`}</span>
            <button type="button" class="rpd-fermer" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
          <div class="rpd-docs">
            ${s.bonColissimo ? `<a class="rpd-doc" href="${echapper(urlSure(s.bonColissimo))}" target="_blank" rel="noopener"><span class="rpd-di amb">${icon('file', 14)}</span><span>Bon Colissimo<small>PDF déposé</small></span></a>` : ''}
            ${s.photo ? `<a class="rpd-doc" href="${echapper(urlSure(s.photo))}" target="_blank" rel="noopener"><span class="rpd-di tur">${icon('eye', 14)}</span><span>Photo<small>jointe par la structure</small></span></a>` : ''}
            ${s.lienVideo ? `<a class="rpd-doc" href="${echapper(urlSure(s.lienVideo))}" target="_blank" rel="noopener"><span class="rpd-di vio">${icon('eye', 14)}</span><span>Vidéo<small>lien fourni</small></span></a>` : ''}
            ${String(s.colissimo || '').split('\n').map(x => x.trim()).filter(Boolean).map((l, i, t) => `<a class="rpd-doc" href="${echapper(urlSure(l))}" target="_blank" rel="noopener"><span class="rpd-di amb">${icon('truck', 14)}</span><span>${t.length > 1 ? 'Colis ' + (i + 1) : 'Suivi colis'}<small>Colissimo</small></span></a>`).join('')}
          </div>
          <div class="rpd-etapes">${etapes}</div>
          ${terminaux.length ? `
          <div class="rpd-bloc-cloture">
            <button type="button" class="rpd-cloture-titre" data-toggle-accordeon-terminal>${icon('alert', 15)}<b>${estSurTerminal ? 'Issue du dossier' : 'Clôturer le dossier'}</b><span class="rpd-chevron ${state.accordeonTerminalOuvert ? 'ouvert' : ''}">${icon('chevron', 15)}</span></button>
            ${state.accordeonTerminalOuvert ? `<p class="rpd-apercu">Ces statuts ferment définitivement le ticket, sans retour en arrière.</p>
            <div class="rpd-docs">${terminaux.map(d => `<button type="button" class="rpd-doc" data-changer-statut-sav-terminal="${echapper(d.statut)}" data-ref="${echapper(s.reference)}"><span class="rpd-di ${d.statut === s.statut ? 'tur' : 'mag'}">${icon(d.statut === s.statut ? 'check' : 'alert', 14)}</span><span>${echapper(d.statut)}<small>${d.statut === s.statut ? 'statut actuel' : 'clôturer'}</small></span></button>`).join('')}</div>` : ''}
          </div>` : ''}
          ${autresTickets.length ? `<div class="rpd-historique"><div class="rpd-hist-titre">${icon('refresh', 15)}<b>Autres passages de cet appareil</b></div>
            <div class="rpd-docs">${autresTickets.map(t => `<button type="button" class="rpd-doc" data-sav-ouvrir="${echapper(t.reference)}"><span class="rpd-di vio">${icon('wrench', 14)}</span><span>${echapper(t.reference)}<small>${echapper(t.date)} · ${echapper(t.statut)}</small></span></button>`).join('')}</div></div>` : ''}
          <div class="rpd-historique">
            <div class="rpd-hist-titre">${icon('clock', 15)}<b>Historique</b></div>
            ${(s.historique || []).length ? `<ol class="rpd-hist">${s.historique.slice().reverse().map(h => `<li><i></i><span>${echapper(h.statut)}</span><small>${echapper(h.date)}</small></li>`).join('')}</ol>` : '<p class="rpd-apercu">Aucun changement de statut enregistré.</p>'}
          </div>
          ${typeof blocFilSavAdmin === 'function' ? blocFilSavAdmin(s) : ''}
          <div id="rp-retour-modale"></div>
        </section>
      </div>
    </div>`;
}

function panneauDevisPaiementCommande(c){
  const structure = state.structures.find(s => s.code === c.code);
  const exempte = !!(structure && (structure.interne || structure.esn));
  if(exempte) return '';
  const devisEligible = c.devisDemande === 'Oui' && !structureExclueDevisFacture(c);
  const factureEligible = !structureExclueDevisFacture(c);
  const paiementCB = c.moyenPaiement === 'Paiement en ligne (CB)';
  const paiementEnAttente = c.dernierClicLienPaiement && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé';
  if(!devisEligible && !factureEligible && !paiementCB) return '';
  const ligneDoc = (cls, ic, titre, detail, action, fait) => `
    <div class="rpd-docligne ${fait ? 'fait' : ''}"><span class="rpd-di ${cls}">${icon(ic, 15)}</span><span class="rpd-docligne-txt"><b>${titre}</b><small>${detail}</small></span>${action || ''}</div>`;
  return `
    <section class="rpd-section">
      <div class="rpd-section-titre"><span data-ill="facture" class="ill s"></span><b>Devis, facture &amp; paiement</b></div>
      ${devisEligible ? ligneDoc('vio', 'file', c.referenceDevis ? `Devis ${echapper(c.referenceDevis)}` : 'Devis demandé',
          c.referenceDevis ? 'Généré — ouvrir dans Devis / Factures' : 'Pas encore généré',
          c.referenceDevis ? `<button type="button" class="btn btn-secondary btn-sm" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceDevis)}">Ouvrir</button>`
            : `<button type="button" class="btn btn-primary btn-sm" data-generer-devis="${echapper(c.reference)}">Générer</button>`, !!c.referenceDevis) : ''}
      ${factureEligible && c.factureMensuelle && !c.referenceFacture ? ligneDoc('mag', 'calendrier', 'Facture mensuelle', 'Produits payés en fin de mois : facture regroupée envoyée au début du mois suivant.', '') : ''}
      ${factureEligible && !(c.factureMensuelle && !c.referenceFacture) ? (c.referenceFacture
          ? ligneDoc('mag', 'receipt', `Facture ${echapper(c.referenceFacture)}`, echapper(c.statutComptable || 'Générée'), `<button type="button" class="btn btn-secondary btn-sm" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Ouvrir</button>`, true)
          : `${ligneDoc('mag', 'receipt', 'Facture', 'Pas encore générée', '')}
             <div class="rpd-form-ligne"><input class="input" id="pn-numero-facture" placeholder="Numéro de facture (FAC-…)"><button type="button" class="btn btn-secondary" data-generer-facture-livree="${echapper(c.reference)}">Générer</button></div>
             <div id="pn-erreur-facture"></div>`) : ''}
      ${(devisEligible && !c.referenceDevis) || (factureEligible && !c.referenceFacture && !c.factureMensuelle) ? liensRaccourcis('commande') : ''}
      ${paiementEnAttente ? `<div class="rpd-alerte">${icon('alert', 14)}Lien de paiement cliqué, pas encore réglé</div>` : ''}
      ${paiementCB ? (() => {
        const noms = nomsPersonnesCommande(c);
        const actuel = (c.lienPaiement || '').trim();
        const entete = ligneDoc('amb', 'lien_externe', c.paiementSepare && noms.length > 1 ? 'Liens de paiement (un par personne)' : 'Lien de paiement en ligne',
          actuel ? 'Visible dans le suivi de la structure' : 'Aucun lien pour l’instant', '', !!actuel);
        if(c.paiementSepare && noms.length > 1){
          const liens = String(c.lienPaiement || '').split('\n');
          return `${entete}
            <div class="rpd-liens">${noms.map((nom, i) => `<label class="rpd-lien-perso"><span title="${echapper(nom)}">${echapper(nom || 'Personne ' + (i + 1))}</span><input class="input" data-lien-paiement-personne="${i}" placeholder="https://…" value="${echapper(liens[i] || '')}"></label>`).join('')}</div>
            <button type="button" class="btn btn-secondary" data-enregistrer-liens-paiement-personnes="${echapper(c.reference)}">Enregistrer les liens</button>
            <div id="pn-erreur-lien-paiement"></div>`;
        }
        return `${entete}
          <div class="rpd-form-ligne"><input class="input" id="pn-lien-paiement" placeholder="https://…" value="${echapper(actuel)}"><button type="button" class="btn btn-secondary" data-enregistrer-lien-paiement="${echapper(c.reference)}">Enregistrer</button></div>
          <div id="pn-erreur-lien-paiement"></div>`;
      })() : ''}
    </section>`;
}
const MODES_LIVRAISON = [
  { valeur: 'Colissimo', label: 'Colissimo', ic: 'truck', aide: 'Envoi postal suivi — un lien par colis.' },
  { valeur: 'Livraison EC', label: 'Livraison Emmaüs Connect', ic: 'package', aide: 'Livrée par l’équipe, à une date estimée.' },
  { valeur: 'Retrait', label: 'Retrait', ic: 'building', aide: 'La structure vient récupérer sur place.' }
];
/* Illustrations des modes de livraison — même dessin que le reste de l'appli (aplat décalé
   + trait bleu nuit), en grand dans les cartes de choix. */
const ILL_MODE_LIVRAISON = {
  'Colissimo': ['#F5A3BC', '<path d="M10 17 25 10l15 7v17l-15 7-15-7z"/>', '<path d="M8 15 23 8l15 7v17l-15 7-15-7z"/><path d="M8 15l15 7 15-7M23 22v17"/><path d="M15.5 11.5 30.5 18.5v6"/><path d="M2 27h4M1 32h5"/>'],
  'Livraison EC': ['#9FE0E1', '<rect x="5" y="15" width="24" height="17" rx="2"/><path d="M29 20h7l5 6v6H29z"/>', '<rect x="3" y="13" width="24" height="17" rx="2"/><path d="M27 18h7l5 6v6H27z"/><circle cx="11" cy="32" r="3.5" fill="#fff"/><circle cx="33" cy="32" r="3.5" fill="#fff"/><path d="M29 22h4l2.5 3"/>'],
  'Retrait': ['#F5A3BC', '<path d="M9 21h32v19H9z"/>', '<path d="M7 19h32v19H7z"/><path d="M5 19l4-10h28l4 10"/><path d="M5 19a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0"/><path d="M18 38v-9h10v9"/>'],
};
function illustrationModeLivraison(valeur, t){
  const d = ILL_MODE_LIVRAISON[valeur]; if(!d) return icon('truck', t || 20);
  return `<svg viewBox="0 0 48 48" width="${t || 44}" height="${t || 44}" aria-hidden="true" style="overflow:visible;flex:none"><g fill="${d[0]}" stroke="none">${d[1]}</g><g fill="none" stroke="#002743" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d[2]}</g></svg>`;
}
/** Cartes de choix du mode de livraison (fiche commande admin). */
function cartesModeLivraison(mode, ref){
  return `<div class="ml-cartes" role="radiogroup" aria-label="Mode de livraison">${MODES_LIVRAISON.map(m => `
    <button type="button" role="radio" class="ml-carte${mode === m.valeur ? ' choisi' : ''}" aria-checked="${mode === m.valeur}" data-choisir-mode-livraison="${echapper(m.valeur)}" data-ref="${ref}">
      <span class="ml-ill">${illustrationModeLivraison(m.valeur, 54)}</span>
      <b>${echapper(m.label)}</b><small>${echapper(m.aide)}</small>
      <span class="coche-choix-admin" aria-hidden="true">✓</span>
    </button>`).join('')}</div>`;
}
/* ════════════════════════════════════════════════════════════════════════════════════
   Carte « étape en cours » de la fiche commande (maquette « Déroulé d'une commande »).
   Une étape = une courte liste de tâches numérotées : faites (✓, repliées, résumé + Modifier),
   en cours (ouverte), à venir (grisées). UN seul bouton principal en bas (« Passer à … »),
   grisé tant que le serveur dit qu'il manque quelque chose, avec la ligne « Il manque… ».
   Les saisies s'enregistrent d'elles-mêmes (numéros complets, lien Colissimo, dates).
   Les gestionnaires existants sont réutilisés (mêmes data-attributs / ids).
   ════════════════════════════════════════════════════════════════════════════════════ */
/** États des tâches au rendu précédent (par commande) : sert à n'animer QUE ce qui vient de
 *  changer — une tâche qui apparaît se déplie, une tâche qui vient d'être faite fait « pop ». */
const etatsTachesPrecedents = {};
function tacheEtape(n, t){
  // t = { etat:'ok'|'cours'|'avenir'|'info', titre, detail, action, contenu, facultatif, anim }
  const num = t.etat === 'ok' ? icon('check', 13) : t.etat === 'info' ? '!' : n;
  return `<li class="et-tache ${t.etat}${t.facultatif ? ' fac' : ''}${t.anim ? ' ' + t.anim : ''}">
    <div class="et-tache-l"><span class="et-num" aria-hidden="true">${num}</span>
      <div class="et-tache-t"><b>${t.titre}${t.facultatif ? ' <span class="et-fac">facultatif</span>' : ''}</b>${t.detail ? `<small>${t.detail}</small>` : ''}</div>
      ${t.action ? `<div class="et-tache-a">${t.action}</div>` : ''}</div>
    ${t.contenu && t.etat !== 'ok' && t.etat !== 'avenir' ? `<div class="et-tache-c">${t.contenu}</div>` : ''}
  </li>`;
}
function editeurSeriesCommande(c, quantiteAttendue){
  const structure = state.structures.find(s => s.code === c.code);
  const avecNoms = !!(structure && structure.bo) || unitesSeriePersonnes(c).some(u => u.nom);
  const unitesAssoc = unitesSeriePersonnes(c);
  const valeurs = (c.numerosSerie || '').split('\n').map(x => x.trim());
  const accessoires = (c.lignes || []).filter(l => (state.produits.find(x => x.nom === l.produit) || {}).sansNumeroSerie);
  const illu = nom => illustrationProduitAdmin(nom, (state.produits.find(p => p.nom === nom) || {}).icone, 28);
  return `
    <div class="ul-liste${avecNoms ? '' : ' sans-pers'}" role="list">
      ${unitesAssoc.map((u, i) => `<div class="ul-ligne${(valeurs[i] || '').trim() ? ' ok' : ''}" role="listitem">
        <span class="ul-num">${i + 1}</span>
        <span class="ul-app">${illu(u.produit)}<b title="${echapper(u.produit)}">${echapper(u.produit)}</b></span>
        <label class="ul-champ"><span class="sr-only">${u.dematerialise ? 'Code' : 'Numéro de série'} de l’appareil ${i + 1} (${echapper(u.produit)})</span>
          <input class="input" data-serie-index="${i}" value="${echapper(valeurs[i] || '')}" placeholder="${u.dematerialise ? 'Code de recharge…' : 'Scannez ou saisissez…'}" autocomplete="off" spellcheck="false"></label>
        <span class="ul-pers">${avecNoms ? (u.nom ? `${icon('personne', 13)}${echapper(u.nom)}` : '<em>non nominatif</em>') : ''}</span>
      </div>`).join('')}
      ${accessoires.map(l => `<div class="ul-ligne rien" role="listitem"><span class="ul-num">—</span><span class="ul-app">${illu(l.produit)}<b>${echapper(l.produit)}${parseInt(l.quantite, 10) > 1 ? ` ×${parseInt(l.quantite, 10)}` : ''}</b></span><span class="ul-rien">Rien à saisir</span><span></span></div>`).join('')}
    </div>
    <p class="ul-aide">Entrée = ligne suivante (douchette). Enregistré automatiquement dès que les ${quantiteAttendue} lignes sont remplies.</p>
    <textarea id="pn-series" data-quantite-attendue="${quantiteAttendue}" data-ref="${echapper(c.reference)}" hidden aria-hidden="true">${echapper(c.numerosSerie || '')}</textarea>
    <div id="pn-erreur-series"></div>`;
}
function carteEtapeCommande(c, statuts, manquants, serveur){
  const idx = statuts.indexOf(c.statutCommande);
  const structure = state.structures.find(s => s.code === c.code);
  const exempte = structureExclueDevisFacture(c);
  const ref = echapper(c.reference);
  const quantiteAttendue = typeof c.quantiteAvecNumeroSerie === 'number' ? c.quantiteAvecNumeroSerie
    : (c.lignes || []).reduce((t, l) => t + (parseInt(l.quantite, 10) || 0), 0);
  const nbSeries = String(c.numerosSerie || '').split('\n').map(x => x.trim()).filter(Boolean).length;
  const seriesOk = quantiteAttendue === 0 || nbSeries === quantiteAttendue;
  const conf = state.confirmSubEtapes[c.ligne] || {};
  const motSeries = c.dematerialisee ? 'Codes' : 'Numéros de série';
  const resumeSeries = () => (c.dematerialisee ? pilulesCodes(c.numerosSerie) : pilulesNumerosSerie(c.numerosSerie));
  const t = [];
  let titre = '', bouton = '', note = '';

  if(c.statutCommande === 'Reçue'){
    titre = 'Faire valider la commande';
    if(c.transfereAdmin) t.push({ etat: 'info', titre: 'Transférée par la structure Interne', detail: 'Le partenaire n’avait pas le matériel en stock.' });
    if(!exempte && c.devisDemande === 'Oui') t.push(c.referenceDevis
      ? { etat: 'ok', titre: 'Devis envoyé', detail: `Devis ${echapper(c.referenceDevis)}` }
      : { etat: 'cours', titre: 'Envoyer le devis demandé', detail: 'La structure attend un prix avant de confirmer.', action: `<button type="button" class="btn btn-secondary btn-sm" data-generer-devis="${ref}">${icon('file', 14)}Générer le devis</button>`, contenu: liensRaccourcis('commande', false) || undefined });
    t.push(c.validationLogistiqueEnAttente
      ? { etat: 'cours', titre: 'Validation par la logistique', detail: 'Mail envoyé : la commande passera « Validée » quand la logistique aura cliqué.', action: `<button type="button" class="et-lien" data-renvoyer-validation="${ref}">Renvoyer le mail</button>` }
      : { etat: t.some(x => x.etat === 'cours') ? 'avenir' : 'cours', titre: 'Validation par la logistique', detail: 'Un lien est envoyé par mail à la logistique.' });
    bouton = c.validationLogistiqueEnAttente ? '' : `<button type="button" class="btn btn-primary et-principal" data-demander-validation="${ref}">Envoyer à la logistique</button>`;
    if(c.validationLogistiqueEnAttente) note = 'En attente de la validation logistique.';
  }

  else if(c.statutCommande === 'Validée'){
    titre = 'Préparer la commande';
    const noteLog = extraireNoteLogistique(c.commentaire);
    if(noteLog && noteLog.changements.length) t.push({ etat: 'info', titre: 'La logistique a ajusté les quantités',
      detail: noteLog.changements.map(ch => `${echapper(ch.produit)} : <s>${echapper(ch.ancienne)}</s> → <b>${echapper(ch.nouvelle)}</b>`).join(' · ') + (noteLog.message ? ` — « ${echapper(noteLog.message)} »` : '') });
    if(quantiteAttendue > 0){
      const ouvert = !seriesOk || conf.series === false;
      t.push(ouvert
        ? { etat: 'cours', titre: motSeries, detail: `${Math.min(nbSeries, quantiteAttendue)} / ${quantiteAttendue} saisi${quantiteAttendue > 1 ? 's' : ''}`,
            action: c.dematerialisee ? '' : `<label class="et-lien">Importer un CSV tec.tech<input type="file" accept=".csv,text/csv" id="pn-series-csv" hidden></label>`,
            contenu: editeurSeriesCommande(c, quantiteAttendue) }
        : { etat: 'ok', titre: motSeries, detail: resumeSeries(), action: `<button type="button" class="et-lien" data-modifier-series="${ref}">Modifier</button>` });
    }
    if(!exempte){
      if(c.factureMensuelle) t.push({ etat: 'ok', titre: 'Facturée en fin de mois', detail: 'Incluse dans la facture mensuelle de la structure.' });
      else if(c.referenceDevis || c.referenceFacture || c.pasDeFacture) t.push({ etat: 'ok', titre: 'Devis ou facture', detail: echapper(c.referenceFacture ? `Facture ${c.referenceFacture}` : c.referenceDevis ? `Devis ${c.referenceDevis}` : 'Sans facture') });
      else t.push({ etat: t.some(x => x.etat === 'cours') ? 'avenir' : 'cours', titre: 'Devis ou facture', detail: 'Obligatoire avant la préparation.',
        action: `<button type="button" class="btn btn-secondary btn-sm" data-generer-devis="${ref}">${icon('file', 14)}Générer un devis</button>`, contenu: liensRaccourcis('commande', false) || undefined });
    }
    bouton = `<button type="button" class="btn btn-primary et-principal" data-changer-statut="Préparée" data-ref="${ref}">Passer à « Préparée »</button>`;
  }

  else if(c.statutCommande === 'Préparée' && c.dematerialisee){
    titre = 'Remettre les codes';
    if(quantiteAttendue > 0) t.push({ etat: 'ok', titre: motSeries, detail: resumeSeries() });
    t.push({ etat: 'cours', titre: 'Date de remise', detail: 'Pas de livraison physique : la commande passe directement à « Livrée ».',
      contenu: `<input type="date" class="input et-date" id="pn-date-livraison-directe" value="${dateVersISO(c.dateLivraison) || new Date().toISOString().slice(0, 10)}" aria-label="Date de remise">` });
    const tpd = tacheProgrammeCommande(c); if(tpd) t.push(tpd);
    bouton = `<button type="button" class="btn btn-primary et-principal" data-marquer-livree="${ref}">Marquer livrée</button>`;
  }

  else if(c.statutCommande === 'Préparée'){
    titre = 'Organiser la livraison';
    if(quantiteAttendue > 0) t.push({ etat: 'ok', titre: motSeries, detail: resumeSeries(), action: `<button type="button" class="et-lien" data-toggle-etape-passee="Validée">Modifier</button>` });
    const mode = c.modeLivraison;
    t.push({ etat: mode ? 'ok' : 'cours', titre: 'Mode de livraison', detail: mode ? echapper(mode === 'Livraison EC' ? 'Livraison Emmaüs Connect' : mode) : '',
      action: mode ? `<button type="button" class="et-lien" data-et-rouvrir="mode">Modifier</button>` : '',
      contenu: cartesModeLivraison(mode, ref) });
    if(state.etRouvrirMode === c.reference && mode) t[t.length - 1].etat = 'cours';
    if(mode === 'Colissimo') t.push({ etat: (c.colissimo || '').trim() ? 'ok' : 'cours', titre: 'Suivi Colissimo',
      detail: (c.colissimo || '').trim() ? pilulesColis(c.colissimo) : 'Un lien par colis — enregistré dès que vous quittez le champ.',
      action: (c.colissimo || '').trim() ? `<button type="button" class="et-lien" data-modifier-colissimo="${ref}">Modifier</button>` : '',
      contenu: `<textarea class="input" rows="2" id="pn-colissimo" data-auto-colissimo="${ref}" placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code=…">${echapper(c.colissimo || '')}</textarea><div id="pn-erreur-colissimo"></div>` });
    if(conf.colissimo === false && (c.colissimo || '').trim()) t[t.length - 1].etat = 'cours';
    if(!mode) t.push({ etat: 'avenir', titre: 'Suivi du colis ou date de livraison' });
    if(mode) t.push({ etat: c.dateLivraisonCible ? 'ok' : 'cours', facultatif: true, titre: mode === 'Retrait' ? 'Retrait disponible à partir du' : 'Date estimée de livraison',
      detail: c.dateLivraisonCible ? echapper(c.dateLivraisonCible) : 'Affichée dans le suivi de la structure.',
      action: c.dateLivraisonCible ? `<button type="button" class="et-lien" data-et-rouvrir="date">Modifier</button>` : '',
      contenu: `<input type="date" class="input et-date" id="pn-date-cible" data-auto-date-cible="${ref}" value="${dateVersISO(c.dateLivraisonCible)}" aria-label="Date estimée">` });
    if(state.etRouvrirDate === c.reference && c.dateLivraisonCible) t[t.length - 1].etat = 'cours';
    bouton = `<button type="button" class="btn btn-primary et-principal" data-valider-preparation="${ref}">Passer à « En livraison »</button>`;
  }

  else if(c.statutCommande === 'En cours de livraison'){
    titre = 'Confirmer la livraison';
    if(c.modeLivraison) t.push({ etat: 'ok', titre: echapper(c.modeLivraison === 'Livraison EC' ? 'Livraison Emmaüs Connect' : c.modeLivraison),
      detail: c.modeLivraison === 'Colissimo' && c.colissimo ? pilulesColis(c.colissimo) : (c.dateLivraisonCible ? `Prévue le ${echapper(c.dateLivraisonCible)}` : '') });
    t.push({ etat: 'cours', titre: 'Date de livraison', detail: 'La structure est prévenue quand la commande passe « Livrée ».',
      contenu: `<input type="date" class="input et-date" id="pn-date-livraison-directe" value="${dateVersISO(c.dateLivraison) || new Date().toISOString().slice(0, 10)}" aria-label="Date de livraison">` });
    const tp = tacheProgrammeCommande(c); if(tp) t.push(tp);
    bouton = `<button type="button" class="btn btn-primary et-principal" data-marquer-livree="${ref}">Marquer livrée</button>`;
  }

  // Ligne « Il manque… » : les prérequis serveur (même règle que celle qui bloque l'écriture).
  const pret = serveur && serveur.etat && serveur.etat.statut === c.statutCommande ? !!serveur.etat.peutAvancer : null;
  if(bouton && pret === false) bouton = bouton.replace('class="btn btn-primary et-principal"', 'class="btn btn-primary et-principal" aria-disabled="true" data-et-bloque="1"');
  const ligneManque = note ? `<span class="fc2-manque et-manque">${echapper(note)}</span>`
    : (manquants.length ? `<span class="fc2-manque et-manque">Il manque : ${manquants.map(m => echapper(m.libelle.charAt(0).toLowerCase() + m.libelle.slice(1))).join(' · ')}.</span>`
    : (pret ? '<span class="et-manque pret">Tout est prêt.</span>' : '<span class="et-manque"></span>'));
  // Apparition progressive : les tâches à venir n'existent pas encore à l'écran — seule une
  // ligne « Ensuite : … » les annonce. Elles apparaissent (la carte s'agrandit) quand la
  // précédente est faite.
  const cle = x => String(x.titre).replace(/<[^>]+>/g, '');
  const avant = etatsTachesPrecedents[c.reference] || null;
  const visibles = t.filter(x => x.etat !== 'avenir');
  const aVenir = t.filter(x => x.etat === 'avenir');
  // La fiche se redessine souvent (réponse serveur, saisie…) : une animation déjà lancée est
  // reprise là où elle en est (délai négatif) au lieu d'être coupée ou rejouée.
  const maintenant = Date.now();
  const lancees = (avant && avant.statut === c.statutCommande && avant.lancees) || {};
  if(avant && avant.statut === c.statutCommande) visibles.forEach(x => {
    const e = avant.taches[cle(x)];
    if(!e || e === 'avenir') lancees[cle(x)] = { anim: 'apparait', t: maintenant, duree: 1300 };
    else if(e !== 'ok' && x.etat === 'ok') lancees[cle(x)] = { anim: 'pop', t: maintenant, duree: 700 };
  });
  visibles.forEach(x => {
    const l = lancees[cle(x)];
    if(l && maintenant - l.t < l.duree) x.anim = `${l.anim}" style="--et-decal:-${maintenant - l.t}ms`;
    else if(l) delete lancees[cle(x)];
  });
  etatsTachesPrecedents[c.reference] = { statut: c.statutCommande, lancees, taches: Object.fromEntries(t.map(x => [cle(x), x.etat])) };
  let n = 0;
  return `<div class="fc2-panneau et-carte">
    <div class="fc2-k">Étape ${idx + 1} sur ${statuts.length}</div>
    <h2>${titre}</h2>
    <ol class="et-taches">${visibles.map(x => tacheEtape(x.etat === 'info' ? '' : ++n, x)).join('')}</ol>
    ${aVenir.length ? `<div class="et-ensuite">Ensuite : ${aVenir.map(x => cle(x).toLowerCase() + (x.facultatif ? ' (facultatif)' : '')).join(' · ')}</div>` : ''}
    ${bouton || note ? `<div class="et-pied">${ligneManque}${bouton}</div>` : ''}
  </div>`;
}
/** Commande livrée : ce qui reste à suivre (facture, paiement, rapprochement) + appareils. */
function carteCommandeLivree(c, personnes, nbArticles){
  const exempte = structureExclueDevisFacture(c);
  const ref = echapper(c.reference);
  const t = [];
  if(!exempte){
    if(c.referenceFacture) t.push({ etat: 'ok', titre: 'Facture', detail: `${echapper(c.referenceFacture)}${c.factureMensuelle ? ' (mensuelle)' : ''}`, action: `<button type="button" class="et-lien" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Ouvrir</button>` });
    else if(c.factureMensuelle) t.push({ etat: 'ok', titre: 'Facture', detail: 'Incluse dans la facture mensuelle de la structure.' });
    else if(!c.pasDeFacture) t.push({ etat: 'cours', titre: 'Générer la facture',
      contenu: `<div class="rpd-form-ligne"><input class="input" id="pn-numero-facture" placeholder="Numéro de facture (FAC-…)" aria-label="Numéro de facture"><button type="button" class="btn btn-secondary" data-generer-facture-livree="${ref}">Générer</button></div><div id="pn-erreur-facture"></div>${liensRaccourcis('commande', false)}` });
    if(c.moyenPaiement) t.push({ etat: c.statutPaiement === 'Payé' ? 'ok' : 'cours', titre: 'Paiement', detail: echapper(`${c.moyenPaiement} · ${c.statutPaiement || 'Non payé'}`) });
    if(c.referenceFacture) t.push({ etat: c.statutComptable === 'Clôturé' ? 'ok' : 'cours', titre: 'Rapprochement comptable', detail: echapper(c.statutComptable || 'Non rapproché'), action: c.statutComptable === 'Clôturé' ? '' : `<button type="button" class="et-lien" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Rapprocher</button>` });
  }
  const tpl = tacheProgrammeCommande(c); if(tpl) t.push(tpl);
  let n = 0;
  return `<div class="fc2-panneau fc2-fin et-carte">
    <div class="fc2-k">Commande terminée</div>
    <h2>Livrée${c.dateLivraison ? ` le ${echapper(c.dateLivraison)}` : ''}</h2>
    <p class="et-resume">${nbArticles} article${nbArticles > 1 ? 's' : ''} remis${personnes.length ? ` · ${personnes.length} personne${personnes.length > 1 ? 's' : ''} équipée${personnes.length > 1 ? 's' : ''}` : ''}.</p>
    ${t.length ? `<div class="fc2-k" style="margin-top:6px">Après la livraison</div><ol class="et-taches">${t.map(x => tacheEtape(++n, x)).join('')}</ol>` : ''}
    ${blocAppareilsCommande(c)}
  </div>`;
}
/** Contenu affiché quand on replie/déplie une étape déjà passée — consultation, et pour les
 *  étapes qui portent des données modifiables (série, mode de livraison, colissimo), une
 *  modification reste possible sans repasser par le statut lui-même (le back l'autorise déjà :
 *  ces champs sont éditables via /update indépendamment du statutCommande). */
function panneauEtapePasseeCommande(c, statut){
  if(statut === 'Validée'){
    return `
      <div class="field">
        <label>${c.dematerialisee ? 'Codes' : 'Numéros de série'}</label>
        <textarea class="input" rows="3" id="pn-series-passee">${echapper(c.numerosSerie || '')}</textarea>
        <button type="button" class="btn btn-secondary btn-block" data-corriger-series="${echapper(c.reference)}">Enregistrer</button>
      </div>`;
  }
  if(statut === 'Préparée'){
    if(c.dematerialisee){
      return `<p style="font-size:13px;opacity:0.6;margin:0">Produit(s) dématérialisé(s) — pas de mode de livraison pour cette commande.</p>`;
    }
    return `
      <div class="field">
        <label>Mode de livraison</label>
        ${cartesModeLivraison(c.modeLivraison, echapper(c.reference))}
        ${c.bonLivraison ? `<button type="button" data-ouvrir-doc-genere="${echapper(c.bonLivraison)}" style="all:unset;box-sizing:border-box;cursor:pointer;font-size:12.5px;color:var(--color-accent-700);text-decoration:underline">Bon de livraison ↗</button>` : ''}
      </div>`;
  }
  if(statut === 'En cours de livraison'){
    return `
      <div class="field">
        <label>Lien(s) de suivi Colissimo</label>
        <textarea class="input" rows="2" id="pn-colissimo-passee" placeholder="Un lien par colis">${echapper(c.colissimo || '')}</textarea>
        <button type="button" class="btn btn-secondary btn-block" data-corriger-colissimo="${echapper(c.reference)}">Enregistrer</button>
      </div>`;
  }
  if(statut === 'Livrée'){
    return `<div style="font-size:13px;color:var(--color-accent-2-700)">${icon('check', 14)} Commande livrée le ${echapper(c.dateLivraison || '—')}. Cette étape n'est plus modifiable.</div>`;
  }
  return `<p style="font-size:13px;opacity:0.6;margin:0">Rien à modifier pour cette étape.</p>`;
}
function dateVersISO(v){
  if(!v) return '';
  const m = String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if(m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
async function corrigerSeriesCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const valeur = $('pn-series-passee').value;
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'numerosSerie', valeur }, 'Enregistrement…', 'Numéros mis à jour');
  if(r.ok){ c.numerosSerie = valeur; render(); }
}
async function corrigerColissimoCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const valeur = $('pn-colissimo-passee').value;
  const liens = valeur.split('\n').map(l => l.trim()).filter(Boolean);
  const invalide = liens.find(l => !/^https?:\/\/.+/i.test(l));
  if(invalide){ afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`); return; }
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'colissimo', valeur }, 'Enregistrement…', 'Lien(s) mis à jour');
  if(r.ok){ c.colissimo = valeur; render(); }
}
/** Note laissée par la logistique dans le commentaire quand elle ajuste les quantités
 *  demandées — même format que côté back (##LOGISTIQUE_QUANTITES##...##FIN##). */
function extraireNoteLogistique(commentaire){
  const texte = String(commentaire || '');
  if(!texte.startsWith('##LOGISTIQUE_QUANTITES##')) return null;
  const finIndex = texte.indexOf('##FIN##\n');
  if(finIndex === -1) return null;
  const bloc = texte.slice('##LOGISTIQUE_QUANTITES##\n'.length, finIndex);
  const [quantitesTexte, messageTexte] = bloc.split('##LOGISTIQUE_MESSAGE##\n');
  return {
    changements: (quantitesTexte || '').split('\n').filter(Boolean).map(l => {
      const [produit, valeurs] = l.split(' : ');
      const [ancienne, nouvelle] = (valeurs || '').split(' → ');
      return { produit, ancienne, nouvelle };
    }),
    message: (messageTexte || '').trim()
  };
}

async function demanderValidationCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  try{
    const r = await posterEtat({ action: 'demander-validation-logistique', ligne: c.ligne }, 'Envoi…', 'Demande envoyée');
    if(r.ok){ c.validationLogistiqueEnAttente = !r.valideDirectement; if(r.valideDirectement) c.statutCommande = 'Validée'; render(); }
  }catch(e){}
}
async function confirmerColissimoPreparation(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const valeur = $('pn-colissimo').value;
  const liens = valeur.split('\n').map(l => l.trim()).filter(Boolean);
  if(!liens.length){ afficherErreurModale('Renseigne au moins un lien.', 'pn-erreur-colissimo'); return; }
  const invalide = liens.find(l => !/^https?:\/\/.+/i.test(l));
  if(invalide){ afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`, 'pn-erreur-colissimo'); return; }
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'colissimo', valeur }, 'Enregistrement…', 'Lien(s) confirmé(s)');
  if(r.ok){ c.colissimo = valeur; (state.confirmSubEtapes[c.ligne] ||= {}).colissimo = true; render(); }
}
async function confirmerSeriesCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const champ = $('pn-series');
  const valeur = champ.value;
  const attendu = parseInt(champ.dataset.quantiteAttendue, 10) || 0;
  const n = valeur.split('\n').map(s => s.trim()).filter(Boolean).length;
  if(n !== attendu){ afficherErreurModale(`${n}/${attendu} numéro${attendu > 1 ? 's' : ''} saisi${n > 1 ? 's' : ''} — il en faut exactement ${attendu}.`, 'pn-erreur-series'); return; }
  etat('Enregistrement…', 'chargement');
  try{
    const r = await poster({ action: 'update', ligne: c.ligne, champ: 'numerosSerie', valeur });
    if(r.ok){
      c.numerosSerie = valeur;
      (state.confirmSubEtapes[c.ligne] ||= {}).series = true;
      // BO uniquement : réécrit "personnes" pour associer chaque bénéficiaire à son numéro —
      // même format pipe (nom|dateNaissance|produit|numeroSerie) que lisent déjà le suivi public,
      // les attestations et la flotte structure, jusqu'ici jamais rempli en pratique faute
      // d'écran pour le faire.
      const structure = state.structures.find(s => s.code === c.code);
      if(structure && structure.bo){
        const unitesAssoc = unitesSeriePersonnes(c);
        const numeros = valeur.split('\n').map(s => s.trim()).filter(Boolean);
        // Ré-association précise, unité par unité : l'ordre de unitesSeriePersonnes() correspond
        // déjà exactement à l'ordre des lignes attendu dans le champ numérosSerie (voir la légende
        // affichée juste au-dessus du champ de saisie).
        const lignesFinales = [];
        let curseurSerie = 0;
        unitesAssoc.forEach(u => {
          const numeroDeCetteUnite = numeros[curseurSerie++] || '';
          if(u.nom) lignesFinales.push(`${u.nom}|${u.dateNaissance}|${u.produit}|${numeroDeCetteUnite}`);
        });
        const valeurPersonnes = lignesFinales.join('\n');
        const rp = await poster({ action: 'update', ligne: c.ligne, champ: 'personnes', valeur: valeurPersonnes });
        if(rp.ok) c.personnes = valeurPersonnes;
      }
      etat('Numéros confirmés', 'succes'); render(); return;
    }
    if(r.conflits && r.conflits.length){
      const detail = r.conflits.map(x => `${x.numeroSerie} (déjà sur ${x.referenceCommande})`).join(', ');
      afficherErreurModale(`Numéro${r.conflits.length > 1 ? 's' : ''} déjà utilisé${r.conflits.length > 1 ? 's' : ''} : ${detail}`, 'pn-erreur-series');
      etat(`Numéro${r.conflits.length > 1 ? 's' : ''} déjà utilisé${r.conflits.length > 1 ? 's' : ''} : ${detail}`, 'erreur', 15000);
    }else{
      afficherErreurModale(r.erreur || 'Enregistrement impossible', 'pn-erreur-series');
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(e){ afficherErreurModale('Enregistrement impossible', 'pn-erreur-series'); etat('Enregistrement impossible', 'erreur'); }
}
async function genererDocumentCommande(ref, type){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const action = type === 'devis' ? 'commande-devis-direct' : 'commande-facturer-direct';
  const donnees = { action, ligne: c.ligne };
  if(type === 'facture'){
    const numero = await demanderCvdl('Numéro de facture :');
    if(!numero) return;
    donnees.numeroFacture = numero;
  }
  const r = await posterEtat(donnees, 'Génération…', type === 'devis' ? 'Devis généré' : 'Facture générée');
  if(r.ok){
    const [rc, rd, rf] = await Promise.all([
      jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
      jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
      jsonp({ action: 'factures', password: motDePasse, limite: 0 })
    ]);
    if(rc.ok) state.commandes = rc.commandes;
    if(rd.ok) state.devis = rd.devis;
    if(rf.ok) state.factures = rf.factures;
    render();
  }
}
async function choisirModeLivraison(ref, mode){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'modeLivraison', valeur: mode }, 'Enregistrement…', 'Mode de livraison enregistré');
  if(r.ok){ c.modeLivraison = mode; render(); }
}
async function enregistrerColissimoCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const valeur = $('pn-colissimo').value;
  const liens = valeur.split('\n').map(l => l.trim()).filter(Boolean);
  const invalide = liens.find(l => !/^https?:\/\/.+/i.test(l));
  if(invalide){ afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`); return; }
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'colissimo', valeur }, 'Enregistrement…', 'Lien(s) enregistré(s)');
  if(r.ok){ c.colissimo = valeur; render(); }
}
async function genererBonLivraisonCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const r = await posterEtat({ action: 'commande-generer-bon-livraison', ligne: c.ligne }, 'Génération du bon…', 'Bon de livraison généré');
  if(r.ok){ c.bonLivraison = r.url; render(); }
}
/** Valide l'étape "Préparée" : enregistre les numéros de série, génère le bon de livraison,
 *  l'envoie par mail à la structure, puis fait avancer le statut — même enchaînement que
 *  côté back (juste regroupé en un seul clic ici). */
async function validerPreparationCommande(ref, btn){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  if(btn) btn.disabled = true;
  try{
    // Bon de livraison désactivé temporairement (demande explicite) : on passe directement au
    // statut suivant, sans tenter de le générer ni de l'envoyer.
    const rStatut = await poster({ action: 'update', ligne: c.ligne, champ: 'statutCommande', valeur: 'En cours de livraison' });
    if(rStatut.ok){ c.statutCommande = 'En cours de livraison'; etat('Commande en livraison', 'succes'); render(); }
    else { etat(rStatut.erreur || 'Enregistrement impossible', 'erreur'); afficherErreurModale(rStatut.erreur); if(btn) btn.disabled = false; }
  }catch(e){ etat('Une erreur est survenue', 'erreur'); afficherErreurModale('Une erreur est survenue.'); if(btn) btn.disabled = false; }
}
function afficherErreurModale(msg, cible){
  const z = $(cible || 'rp-retour-modale');
  if(!z) return;
  z.innerHTML = `<div class="msg msg-erreur">${echapper(msg || 'Action impossible.')}</div>`;
  // Le message d'erreur peut apparaître en bas d'un long panneau (modale commande notamment) —
  // sans ça, il passe facilement inaperçu, surtout depuis un bouton tout en haut de la modale.
  z.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function genererFactureDepuisLivree(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const numero = $('pn-numero-facture') ? $('pn-numero-facture').value.trim() : '';
  if(!numero){ afficherErreurModale('Le numéro de facture est obligatoire.', 'pn-erreur-facture'); return; }
  const r = await posterEtat({ action: 'commande-facturer-direct', ligne: c.ligne, numeroFacture: numero }, 'Génération…', 'Facture générée');
  if(r.ok){
    const [rc, rf] = await Promise.all([
      jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
      jsonp({ action: 'factures', password: motDePasse, limite: 0 })
    ]);
    if(rc.ok) state.commandes = rc.commandes;
    if(rf.ok) state.factures = rf.factures;
    render();
  }else afficherErreurModale(r.erreur);
}
async function enregistrerLienPaiement(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const valeur = $('pn-lien-paiement').value;
  const liens = valeur.split('\n').map(l => l.trim()).filter(Boolean);
  const invalide = liens.find(l => !/^https?:\/\/.+/i.test(l));
  if(invalide){ afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`, 'pn-erreur-lien-paiement'); return; }
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'lienPaiement', valeur }, 'Enregistrement…', 'Lien(s) de paiement enregistré(s)');
  if(r.ok){ c.lienPaiement = valeur; render(); }
}
/** Variante par bénéficiaire du champ ci-dessus (paiement séparé, ≥2 personnes) — un champ par
 *  nom plutôt qu'une zone de texte unique. Les lignes vides sont conservées à leur position tant
 *  que tous les liens ne sont pas encore saisis, pour que chaque ligne reste à l'index du bon
 *  bénéficiaire (voir nomsPersonnesCommande) au lieu de décaler les suivants. */
async function enregistrerLiensPaiementPersonnes(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const champs = [...document.querySelectorAll('[data-lien-paiement-personne]')]
    .sort((a, b) => parseInt(a.dataset.lienPaiementPersonne, 10) - parseInt(b.dataset.lienPaiementPersonne, 10));
  const valeurs = champs.map(inp => inp.value.trim());
  const invalide = valeurs.filter(Boolean).find(l => !/^https?:\/\/.+/i.test(l));
  if(invalide){ afficherErreurModale(`« ${invalide} » n'est pas un lien http(s) valide.`, 'pn-erreur-lien-paiement'); return; }
  const valeur = valeurs.join('\n');
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'lienPaiement', valeur }, 'Enregistrement…', 'Lien(s) de paiement enregistré(s)');
  if(r.ok){ c.lienPaiement = valeur; render(); }
  else afficherErreurModale(r.erreur || 'Enregistrement impossible', 'pn-erreur-lien-paiement');
}
async function enregistrerDateLivraisonCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const iso = $('pn-date-livraison').value;
  if(!iso) return;
  const [y, mo, d] = iso.split('-');
  const valeur = `${d}/${mo}/${y}`;
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'dateLivraison', valeur }, 'Enregistrement…', 'Date enregistrée');
  if(r.ok){ c.dateLivraison = valeur; render(); }
}
async function enregistrerDateCibleCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  const iso = $('pn-date-cible').value;
  if(!iso) return;
  const [y, mo, d] = iso.split('-');
  const valeur = `${d}/${mo}/${y}`;
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'dateLivraisonCible', valeur }, 'Enregistrement…', 'Date estimée enregistrée');
  if(r.ok){ c.dateLivraisonCible = valeur; render(); }
}
async function annulerCommande(ref){
  const c = state.commandes.find(x => x.reference === ref);
  if(!c) return;
  if(!await confirmerCvdl(`Annuler la commande ${c.reference} ?`)) return;
  const r = await posterEtat({ action: 'update', ligne: c.ligne, champ: 'statutCommande', valeur: 'Annulée' }, 'Annulation…', 'Commande annulée');
  if(r.ok){ c.statutCommande = 'Annulée'; render(); }
}

/* ============================================================
   Réglages des statuts SAV — même principe que l'ancienne
   modale (couleur, drapeaux colissimo/diagnostic/départ délai/
   terminal/fin de cycle), toggles réels, réordonnable.
   ============================================================ */
function vueReglagesStatutsSav(){
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(640px,94vw);max-height:88vh;overflow-y:auto">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Statuts SAV</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.7;margin:0">Ajoute, renomme, réordonne, colore ou supprime les statuts selon le déroulé de ton territoire. Les drapeaux pilotent l'apparition progressive des champs sur chaque ticket, et le calcul du délai.</p>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${state.statutsSav.map((s, i) => `
            <div class="card elev-sm" style="padding:var(--space-4);gap:14px">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="display:flex;flex-direction:column;gap:2px">
                  <button type="button" class="btn btn-ghost btn-icon" style="width:22px;height:22px" data-statut-monter="${s.ligne}" ${i === 0 ? 'disabled' : ''} title="Monter"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg></button>
                  <button type="button" class="btn btn-ghost btn-icon" style="width:22px;height:22px" data-statut-descendre="${s.ligne}" ${i === state.statutsSav.length - 1 ? 'disabled' : ''} title="Descendre"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"/></svg></button>
                </div>
                <input class="input" style="flex:1;min-width:100px" value="${echapper(s.statut)}" data-statut-config="${s.ligne}" data-champ="statut">
                <span class="tag rs-apercu" style="flex:none;color:${teinteSav(s.couleur).fg}" title="Aperçu de la pastille">${echapper(s.statut)}</span>
                <select class="input" style="width:120px;flex:none" data-statut-config="${s.ligne}" data-champ="couleur">
                  ${COULEURS_SAV_DISPONIBLES.map(c => `<option value="${c}" ${c === s.couleur ? 'selected' : ''}>${c.replace('t-', '')}</option>`).join('')}
                </select>
                <span style="width:32px;height:32px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${teinteSav(s.couleur).bg};color:${teinteSav(s.couleur).fg}">${icon(iconeStatutSav(s.statut, s.icone), 15)}</span>
                <select class="input" style="width:170px;flex:none" data-statut-config="${s.ligne}" data-champ="icone">
                  ${ICONES_STATUT_SAV_OPTIONS.map(o => `<option value="${o.value}" ${o.value === (s.icone || '') ? 'selected' : ''}>${echapper(o.label)}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-ghost btn-icon" style="color:var(--color-accent-700)" data-statut-supprimer="${s.ligne}" data-statut-nom="${echapper(s.statut)}" title="Supprimer">${icon('x', 15)}</button>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px 16px;padding-top:12px;border-top:1px solid var(--color-divider)">
                <label class="rp-switch" title="Affiche le champ et la pilule de suivi Colissimo"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="colissimo" ${s.colissimo ? 'checked' : ''}><span class="rp-switch-piste"></span>Colissimo</label>
                <label class="rp-switch" title="Phase de diagnostic technique"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="diagnostic" ${s.diagnostic ? 'checked' : ''}><span class="rp-switch-piste"></span>Diagnostic</label>
                <label class="rp-switch" title="Point de départ du décompte du délai"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="departDelai" ${s.departDelai ? 'checked' : ''}><span class="rp-switch-piste"></span>Départ délai</label>
                <label class="rp-switch" title="Clôture le ticket"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="terminal" ${s.terminal ? 'checked' : ''}><span class="rp-switch-piste"></span>Terminal</label>
                <label class="rp-switch" title="Ferme l'anneau de progression à 100%"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="finCycle" ${s.finCycle ? 'checked' : ''}><span class="rp-switch-piste"></span>Fin de cycle</label>
              </div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:var(--space-2)">
          <input class="input" id="rs-nouveau-nom" placeholder="Nom du nouveau statut" style="flex:1">
          <button type="button" class="btn btn-secondary" data-ajouter-statut>${icon('plus', 15)}Ajouter</button>
        </div>
        <div id="rp-retour-modale"></div>
        
      </div>
    </div>`;
}
async function rechargerStatutsSav(){
  const r = await jsonp({ action: 'sav-statuts-list', password: motDePasse });
  if(r.ok) state.statutsSav = r.statuts;
}
async function modifierStatutSav(ligne, champ, valeur){
  const r = await posterEtat({ action: 'sav-statut-modifier', ligne, champ, valeur }, 'Enregistrement…', 'Statut mis à jour');
  if(r.ok){ await rechargerStatutsSav(); render(); }
}
async function deplacerStatutSav(ligne, direction){
  const r = await posterEtat({ action: 'sav-statut-deplacer', ligne, direction }, 'Déplacement…', 'Ordre mis à jour');
  if(r.ok){ await rechargerStatutsSav(); render(); }
}
async function supprimerStatutSav(ligne, nom){
  if(!await confirmerCvdl(`Supprimer le statut « ${nom} » ?`)) return;
  const r = await posterEtat({ action: 'sav-statut-supprimer', ligne }, 'Suppression…', 'Statut supprimé');
  if(r.ok){ await rechargerStatutsSav(); render(); }
  else if($('rp-retour-modale')) $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
}
async function ajouterStatutSav(){
  const nom = $('rs-nouveau-nom').value.trim();
  if(!nom) return;
  const r = await posterEtat({ action: 'sav-statut-ajouter', statut: nom }, 'Ajout…', 'Statut ajouté');
  if(r.ok){ await rechargerStatutsSav(); render(); }
  else $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
}

/* ============================================================
   Modèle de bon de livraison — HTML téléversé, hors Google
   Workspace (remplace le modèle Google Sheets historique dès
   qu'un modèle est présent).
   ============================================================ */
const JETONS_MODELE_BON = [
  'STRUCTURE', 'ADRESSE', 'EMAIL', 'TELEPHONE', 'REFERENCE_COMMANDE', 'DATE', 'NUMEROS_SERIE',
  'RESPONSABLE_NOM', 'RESPONSABLE_TELEPHONE', 'RESPONSABLE_EMAIL',
  'PRODUIT_1', 'QUANTITE_1', 'PRIX_UNITAIRE_1', 'TOTAL_LIGNE_1', '… jusqu\'à _10',
  'NUMERO_SERIE_1', 'MARQUE_MODELE_1', '… jusqu\'à _15'
];
let infoModeleBon = null;
async function chargerInfoModeleBon(){
  infoModeleBon = null;
  const r = await jsonp({ action: 'modele-bon-livraison-info', password: motDePasse });
  if(r.ok) infoModeleBon = r;
  if(state.modal && state.modal.kind === 'modele-bon') render();
}
function vueModeleBon(){
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Modèle de bon de livraison</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.7;margin:0">Fichier HTML avec des jetons à remplacer (ex. <code>{{STRUCTURE}}</code>). Une fois téléversé, il remplace le modèle Google Sheets pour toutes les prochaines générations — rien à ouvrir ni gérer côté Google.</p>
        ${infoModeleBon
          ? (infoModeleBon.present
            ? `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:13px">${icon('check', 14)} Modèle actif (${infoModeleBon.taille.toLocaleString('fr-FR')} caractères).</div>`
            : `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-neutral-100);font-size:13px;opacity:0.7">Aucun modèle téléversé — génération sur l'ancien modèle Google Sheets (Réglages), si configuré.</div>`)
          : `<div style="font-size:13px;opacity:0.5">Chargement…</div>`}
        <div class="field">
          <label>Nouveau modèle (.html)</label>
          <input type="file" class="input" id="mb-fichier" accept=".html,text/html">
        </div>
        <details style="font-size:12.5px;opacity:0.7">
          <summary style="cursor:pointer;font-weight:600">Jetons disponibles</summary>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${JETONS_MODELE_BON.map(j => j.includes('…')
              ? `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;opacity:0.6">${j}</code>`
              : `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;cursor:pointer" data-copier-jeton="{{${j}}}" title="Cliquer pour copier">{{${j}}}</code>`
            ).join('')}
          </div>
        </details>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${infoModeleBon && infoModeleBon.present ? 'space-between' : 'flex-end'}">
          ${infoModeleBon && infoModeleBon.present ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-bon>Retirer le modèle</button>` : ''}
          <button type="button" class="btn btn-primary" id="mb-enregistrer">Téléverser</button>
        </div>
      </div>
    </div>`;
}
async function enregistrerModeleBon(){
  const fichier = $('mb-fichier').files[0];
  if(!fichier){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .html.</div>'; return; }
  $('mb-enregistrer').disabled = true;
  try{
    const html = await fichier.text();
    const r = await posterEtat({ action: 'modele-bon-livraison-televerser', html }, 'Envoi…', 'Modèle enregistré');
    if(r.ok){ await chargerInfoModeleBon(); }
    else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('mb-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>'; $('mb-enregistrer').disabled = false; }
}
async function supprimerModeleBon(){
  if(!await confirmerCvdl('Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.')) return;
  const r = await posterEtat({ action: 'modele-bon-livraison-supprimer' }, 'Suppression…', 'Modèle retiré');
  if(r.ok) await chargerInfoModeleBon();
}

/* ============================================================
   Modèle de devis / facture — même principe que le bon de
   livraison : HTML téléversé, aucun appel Drive donc jamais
   concerné par un souci de quota ou de partage. Devis et facture
   sont deux documents différents : un modèle distinct pour chacun.
   ============================================================ */
const JETONS_MODELE_FACTURATION = [
  'STRUCTURE', 'ADRESSE', 'EMAIL', 'TELEPHONE', 'NUMERO_DEVIS', 'NUMERO_FACTURE', 'DATE', 'PRIX_TOTAL_HT',
  'RESPONSABLE_NOM', 'RESPONSABLE_TELEPHONE', 'RESPONSABLE_EMAIL',
  'PRODUIT_1', 'QUANTITE_1', 'PRIX_UNITAIRE_1', 'TOTAL_LIGNE_1', '… jusqu\'à _10',
];
const infosModeleDoc = { devis: null, facture: null };
async function chargerInfoModeleDoc(type){
  infosModeleDoc[type] = null;
  const r = await jsonp({ action: `modele-${type}-info`, password: motDePasse });
  if(r.ok) infosModeleDoc[type] = r;
  if(state.modal && state.modal.kind === 'modele-doc' && state.modal.type === type) render();
}
function vueModeleDoc(){
  const type = state.modal.type;
  const info = infosModeleDoc[type];
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Modèle de ${type}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.7;margin:0">Fichier HTML avec des jetons à remplacer (ex. <code>{{STRUCTURE}}</code>). Une fois téléversé, il remplace le modèle Google Sheets pour toutes les prochaines générations de ${type === 'devis' ? 'devis' : 'factures'} — rien à ouvrir ni gérer côté Google, donc aucun risque de quota Drive.</p>
        ${info
          ? (info.present
            ? `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:13px">${icon('check', 14)} Modèle actif (${info.taille.toLocaleString('fr-FR')} caractères).</div>`
            : `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-neutral-100);font-size:13px;opacity:0.7">Aucun modèle téléversé — génération sur l'ancien modèle Google Sheets (Réglages), si configuré.</div>`)
          : `<div style="font-size:13px;opacity:0.5">Chargement…</div>`}
        <div class="field">
          <label>Nouveau modèle (.html)</label>
          <input type="file" class="input" id="md-fichier" accept=".html,text/html">
        </div>
        <details style="font-size:12.5px;opacity:0.7">
          <summary style="cursor:pointer;font-weight:600">Jetons disponibles</summary>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${JETONS_MODELE_FACTURATION.map(j => j.includes('…')
              ? `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;opacity:0.6">${j}</code>`
              : `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;cursor:pointer" data-copier-jeton="{{${j}}}" title="Cliquer pour copier">{{${j}}}</code>`
            ).join('')}
          </div>
        </details>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${info && info.present ? 'space-between' : 'flex-end'}">
          ${info && info.present ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-doc="${type}">Retirer le modèle</button>` : ''}
          <button type="button" class="btn btn-primary" id="md-enregistrer">Téléverser</button>
        </div>
      </div>
    </div>`;
}
async function enregistrerModeleDoc(){
  const type = state.modal.type;
  const fichier = $('md-fichier').files[0];
  if(!fichier){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .html.</div>'; return; }
  $('md-enregistrer').disabled = true;
  try{
    const html = await fichier.text();
    const r = await posterEtat({ action: `modele-${type}-televerser`, html }, 'Envoi…', 'Modèle enregistré');
    if(r.ok){ await chargerInfoModeleDoc(type); }
    else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('md-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>'; $('md-enregistrer').disabled = false; }
}
async function supprimerModeleDoc(type){
  if(!await confirmerCvdl('Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.')) return;
  const r = await posterEtat({ action: `modele-${type}-supprimer` }, 'Suppression…', 'Modèle retiré');
  if(r.ok) await chargerInfoModeleDoc(type);
}

/* ============================================================
   Modèle d'attestation de paiement — même principe que le modèle de bon de livraison
   ci-dessus (HTML téléversé, hors Google Workspace).
   ============================================================ */
const JETONS_MODELE_ATTESTATION = [
  'NOM_COMPLET', 'DATE_NAISSANCE', 'STRUCTURE', 'REFERENCE_COMMANDE', 'PRIX', 'PRODUIT',
  'MARQUE_MODELE', 'DATE_VENTE', 'NUMERO_SERIE', 'RESPONSABLE_NOM', 'RESPONSABLE_TELEPHONE', 'RESPONSABLE_EMAIL',
];
let infoModeleAttestation = null;
async function chargerInfoModeleAttestation(){
  infoModeleAttestation = null;
  const r = await jsonp({ action: 'modele-attestation-info', password: motDePasse });
  if(r.ok) infoModeleAttestation = r;
  if(state.modal && state.modal.kind === 'modele-attestation') render();
}
function vueModeleAttestation(){
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Modèle d'attestation de paiement</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>

        <div class="card elev-sm" style="padding:var(--space-5);gap:10px">
          <div style="font-weight:600;font-size:13.5px">Modèle PDF (formulaire) — recommandé</div>
          <p style="font-size:12.5px;opacity:0.7;margin:0">Un PDF avec de vrais champs de formulaire, nommés comme les jetons (ex. un champ <code>NOM_COMPLET</code>). Rempli directement en mémoire — aucun service externe, la solution la plus simple et la plus fiable. À créer une fois avec LibreOffice Writer ou un éditeur PDF qui gère les formulaires.</p>
          ${infoModeleAttestation
            ? (infoModeleAttestation.presentPdf
              ? `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12.5px">${icon('check', 14)} Modèle actif (${Math.round(infoModeleAttestation.taillePdf / 1024).toLocaleString('fr-FR')} ko).</div>`
              : `<div style="font-size:12.5px;opacity:0.55">Aucun modèle PDF téléversé.</div>`)
            : ''}
          <input type="file" class="input" id="ma-fichier-pdf" accept=".pdf">
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-primary" id="ma-pdf-enregistrer">Téléverser</button>
            ${infoModeleAttestation && infoModeleAttestation.presentPdf ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-attestation-pdf>Retirer</button>` : ''}
          </div>
        </div>

        <details style="margin-top:4px">
          <summary style="cursor:pointer;font-size:12.5px;font-weight:600;opacity:0.7">Autres options (repli, si pas de modèle PDF)</summary>
          <div class="card elev-sm" style="padding:var(--space-5);gap:10px;margin-top:8px">
            <div style="font-weight:600;font-size:13px">Modèle Excel (.xlsx)</div>
            <p style="font-size:12px;opacity:0.7;margin:0">Nécessite un dossier dans un Drive partagé pour la conversion en PDF (voir Réglages) — sinon la génération échoue.</p>
            ${infoModeleAttestation
              ? (infoModeleAttestation.presentXlsx
                ? `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12px">${icon('check', 14)} Modèle actif (${Math.round(infoModeleAttestation.tailleXlsx / 1024).toLocaleString('fr-FR')} ko).</div>`
                : '')
              : ''}
            <input type="file" class="input" id="ma-fichier-xlsx" accept=".xlsx">
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-secondary" id="ma-xlsx-enregistrer">Téléverser</button>
              ${infoModeleAttestation && infoModeleAttestation.presentXlsx ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-attestation-xlsx>Retirer</button>` : ''}
            </div>
          </div>

          <p style="font-size:12.5px;opacity:0.6;margin:12px 0 8px">Ou un modèle HTML :</p>
          ${infoModeleAttestation
            ? (infoModeleAttestation.present
              ? `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12.5px;margin-bottom:8px">${icon('check', 14)} Modèle actif (${infoModeleAttestation.taille.toLocaleString('fr-FR')} caractères).</div>`
              : '')
            : ''}
          <input type="file" class="input" id="ma-fichier" accept=".html,text/html">
          <div style="display:flex;gap:8px;margin-top:8px">
            <button type="button" class="btn btn-secondary" id="ma-enregistrer">Téléverser</button>
            ${infoModeleAttestation && infoModeleAttestation.present ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-attestation>Retirer</button>` : ''}
          </div>
        </details>

        <details style="font-size:12.5px;opacity:0.7">
          <summary style="cursor:pointer;font-weight:600">Jetons disponibles</summary>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${JETONS_MODELE_ATTESTATION.map(j => `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;cursor:pointer" data-copier-jeton="{{${j}}}" title="Cliquer pour copier">{{${j}}}</code>`).join('')}
          </div>
        </details>
        <div id="rp-retour-modale"></div>
      </div>
    </div>`;
}
async function enregistrerModeleAttestationPdf(){
  const fichier = $('ma-fichier-pdf').files[0];
  if(!fichier){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .pdf.</div>'; return; }
  $('ma-pdf-enregistrer').disabled = true;
  try{
    const buffer = await fichier.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((s, o) => s + String.fromCharCode(o), ''));
    const r = await posterEtat({ action: 'modele-attestation-pdf-televerser', pdfBase64: base64 }, 'Envoi…', 'Modèle enregistré');
    if(r.ok){ await chargerInfoModeleAttestation(); }
    else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('ma-pdf-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>'; $('ma-pdf-enregistrer').disabled = false; }
}
async function supprimerModeleAttestationPdf(){
  if(!await confirmerCvdl('Retirer le modèle PDF téléversé ?')) return;
  const r = await posterEtat({ action: 'modele-attestation-pdf-supprimer' }, 'Suppression…', 'Modèle retiré');
  if(r.ok) await chargerInfoModeleAttestation();
}
async function enregistrerModeleAttestationXlsx(){
  const fichier = $('ma-fichier-xlsx').files[0];
  if(!fichier){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .xlsx.</div>'; return; }
  $('ma-xlsx-enregistrer').disabled = true;
  try{
    const buffer = await fichier.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((s, o) => s + String.fromCharCode(o), ''));
    const r = await posterEtat({ action: 'modele-attestation-xlsx-televerser', xlsxBase64: base64 }, 'Envoi…', 'Modèle enregistré');
    if(r.ok){ await chargerInfoModeleAttestation(); }
    else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('ma-xlsx-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>'; $('ma-xlsx-enregistrer').disabled = false; }
}
async function supprimerModeleAttestationXlsx(){
  if(!await confirmerCvdl('Retirer le modèle .xlsx téléversé ?')) return;
  const r = await posterEtat({ action: 'modele-attestation-xlsx-supprimer' }, 'Suppression…', 'Modèle retiré');
  if(r.ok) await chargerInfoModeleAttestation();
}
async function enregistrerModeleAttestation(){
  const fichier = $('ma-fichier').files[0];
  if(!fichier){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .html.</div>'; return; }
  $('ma-enregistrer').disabled = true;
  try{
    const html = await fichier.text();
    const r = await posterEtat({ action: 'modele-attestation-televerser', html }, 'Envoi…', 'Modèle enregistré');
    if(r.ok){ await chargerInfoModeleAttestation(); }
    else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('ma-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>'; $('ma-enregistrer').disabled = false; }
}
async function supprimerModeleAttestation(){
  if(!await confirmerCvdl('Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.')) return;
  const r = await posterEtat({ action: 'modele-attestation-supprimer' }, 'Suppression…', 'Modèle retiré');
  if(r.ok) await chargerInfoModeleAttestation();
}

/* ============================================================
   Modales de création — Structure / Commande / Produit
   ============================================================ */
/* ══════════════ Factures mensuelles (produits payés en fin de mois) ══════════════
   Aperçu par mois et par structure ; émission + envoi à la main, en plus de l'envoi
   automatique le 1er du mois (tâche planifiée /taches/factures-mensuelles). */
let factMens = { mois: '', chargement: false, donnees: null };
function moisCourantIso(decalage = 0){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + decalage); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
async function chargerFacturesMensuelles(mois){
  factMens = { mois: mois || factMens.mois || moisCourantIso(-1), chargement: true, donnees: null };
  render();
  const r = await jsonp({ action: 'factures-mensuelles-apercu', password: motDePasse, mois: factMens.mois });
  factMens.chargement = false;
  factMens.donnees = r;
  if(state.modal && state.modal.kind === 'factures-mensuelles') render();
}
function vueFacturesMensuelles(){
  const d = factMens.donnees;
  const liste = d && d.ok ? d.structures : [];
  const total = liste.reduce((t, x) => t + (x.montant || 0), 0);
  const aEmettre = liste.filter(x => !x.factureExistante || !x.factureExistante.envoyeeLe).length;
  const corps = `
    <p style="margin:0 0 var(--space-3);font-size:13.5px;opacity:.75">Produits marqués « payé en fin de mois » (fiche produit), regroupés par structure sur les commandes passées dans le mois.
      ${d && d.ok ? (d.envoiAutomatique ? 'Envoi automatique par mail le 1<sup>er</sup> du mois suivant.' : '<b>Envoi automatique désactivé</b> (Config FACTURES_MENSUELLES_AUTO).') : ''}</p>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:var(--space-4)">
      <label for="fm-mois" style="font-weight:600;font-size:13px">Mois</label>
      <input type="month" class="input" id="fm-mois" value="${echapper(factMens.mois)}" style="width:auto">
      ${d && d.ok ? `<span class="tag">${liste.length} structure${liste.length > 1 ? 's' : ''} · ${echapper(formaterMontant(total))}</span>` : ''}
    </div>
    ${factMens.chargement ? '<p style="opacity:.6">Chargement…</p>' : !d ? '' : !d.ok ? `<div class="msg msg-erreur">${echapper(d.erreur || 'Chargement impossible.')}</div>`
      : !liste.length ? `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucun produit « fin de mois » commandé en ${echapper(d.libelleMois)}.</div>`
      : `<div class="fm-liste">${liste.map(x => {
        const f = x.factureExistante;
        return `<div class="fm-ligne">
          <div class="fm-id"><b>${echapper(x.nom)}</b><small>${echapper(x.email || 'Pas d’email de facturation')}${x.region ? ' · ' + echapper(x.region) : ''}</small></div>
          <div class="fm-arts">${x.lignes.map(l => `<span><b>${l.quantite} ×</b> ${echapper(l.produit)}</span>`).join('')}<small>${x.commandes.length} commande${x.commandes.length > 1 ? 's' : ''} : ${echapper(x.commandes.join(', '))}</small></div>
          <div class="fm-montant"><b>${echapper(formaterMontant(x.montant))}</b></div>
          <div class="fm-etat">${f ? `<span class="tag" data-forme="rond" style="--forme:var(--th-ac-1f9d55ff, #1F9D55)">${echapper(f.numero)}</span><small>${f.envoyeeLe ? `Envoyée le ${echapper(f.envoyeeLe)}` : 'Émise, pas encore envoyée'}</small>` : '<span class="tag" data-forme="losange" style="--forme:var(--th-ac-e62460ff, #E62460)">À émettre</span>'}</div>
          <div class="fm-act"><button type="button" class="btn btn-secondary" data-fm-emettre="${echapper(x.code)}" ${f && f.envoyeeLe ? 'data-fm-renvoyer="1"' : ''} ${x.email ? '' : 'disabled title="Renseigne un email de facturation sur la structure"'}>${icon('mail', 14)}${f ? (f.envoyeeLe ? 'Renvoyer' : 'Envoyer') : 'Émettre et envoyer'}</button></div>
        </div>`; }).join('')}</div>`}`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="fm-titre" style="width:min(980px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title" id="fm-titre">Factures mensuelles${d && d.ok ? ` — ${echapper(d.libelleMois)}` : ''}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </div>
        <div class="dialog-corps"><div style="grid-column:1 / -1;min-width:0">${corps}</div></div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          <button type="button" class="btn btn-primary" data-fm-tout ${aEmettre ? '' : 'disabled'}>${icon('mail', 15)}Émettre et envoyer tout (${aEmettre})</button>
        </div>
      </div>
    </div>`;
}
document.addEventListener('click', async e => {
  if(e.target.closest('[data-factures-mensuelles]')){ state.modal = { kind: 'factures-mensuelles' }; chargerFacturesMensuelles(factMens.mois || moisCourantIso(-1)); return; }
  const un = e.target.closest('[data-fm-emettre]');
  const tout = e.target.closest('[data-fm-tout]');
  if(!un && !tout) return;
  const renvoyer = !!(un && un.dataset.fmRenvoyer);
  const nom = un ? ((factMens.donnees.structures || []).find(x => x.code === un.dataset.fmEmettre) || {}).nom : '';
  if(!await confirmerCvdl(un ? `${renvoyer ? 'Renvoyer' : 'Envoyer'} la facture mensuelle de ${nom} ?\n\nElle part par mail à l’adresse de facturation de la structure.` : 'Envoyer toutes les factures mensuelles du mois ?\n\nChaque structure reçoit sa facture par mail ; celles déjà envoyées ne sont pas renvoyées.')) return;
  (un || tout).disabled = true;
  const r = await posterEtat({ action: 'facture-mensuelle-emettre', mois: factMens.mois, code: un ? un.dataset.fmEmettre : '', renvoyer }, 'Envoi…', 'Facture(s) envoyée(s)');
  if(r && !r.ok){
    const echecs = (r.resultats || []).filter(x => !x.ok).map(x => `${x.nom} : ${x.erreur}`);
    afficherErreurModale(echecs.length ? echecs.join(' · ') : r.erreur);
  }
  const rf = await jsonp({ action: 'factures', password: motDePasse, limite: 0 });
  if(rf.ok) state.factures = rf.factures;
  chargerFacturesMensuelles(factMens.mois);
});
document.addEventListener('change', e => {
  if(e.target.id === 'fm-mois' && /^\d{4}-\d{2}$/.test(e.target.value)) chargerFacturesMensuelles(e.target.value);
});

function dialogShell(titre, corps, idFormulaire, boutonGauche){
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" style="width:min(900px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(titre)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <div class="dialog-corps">${corps}</div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${boutonGauche ? 'space-between' : 'flex-end'}">
          ${boutonGauche || ''}
          <button type="button" class="btn btn-primary" id="${idFormulaire}">Enregistrer</button>
        </div>
      </div>
    </div>`;
}
/** Liens utiles des Réglages pour ce contexte (liens-admin.js) — '' si aucun ou module absent. */
function liensRaccourcis(contexte, titre){
  return typeof window.boutonsLiensRaccourcis === 'function' ? window.boutonsLiensRaccourcis(contexte, titre) : '';
}
function champ(label, html){
  return `<div class="field" style="margin-top:var(--space-2)"><label>${echapper(label)}</label>${html}</div>`;
}

const CATEGORIES_STRUCTURE = ['Collège/Université', 'École', 'Collectivité', 'Entreprise privée', 'Association', 'Structure sociale'];
/** Régions analytiques (territoires EC) — rattachement d'une structure pour ventiler l'activité.
 *  Liste à ajuster ici si besoin ; une valeur déjà enregistrée hors liste reste affichée. */
const REGIONS_ANALYTIQUE = ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
  'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d’Azur', 'Outre-mer', 'National'];
/** Sépare la valeur "Prénom NOM" stockée en base (un seul champ côté back) en deux morceaux
 *  pour préremplir les deux champs du formulaire — repère le NOM via la même convention que
 *  la règle de casse (mot(s) entièrement en majuscules en fin de chaîne). Si rien ne matche
 *  (ancienne donnée saisie librement), tout part dans "prénom" plutôt que de perdre l'info. */
function separerResponsable(valeur){
  const mots = String(valeur || '').trim().split(/\s+/).filter(Boolean);
  const idx = mots.findIndex(m => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase());
  if(idx === -1) return { prenom: mots.join(' '), nom: '' };
  return { prenom: mots.slice(0, idx).join(' '), nom: mots.slice(idx).join(' ') };
}
/* Migration vers le type unique : rapport (rien n'est écrit), puis application aux structures
   qui n'ont qu'une seule case cochée. Les autres s'ouvrent une par une pour choisir leur type. */
async function ouvrirMigrationTypes(){
  state.modal = { kind: 'migration-types', rapport: null }; render();
  const r = await poster({ action: 'structures-migrer-type' });
  if(state.modal && state.modal.kind === 'migration-types'){ state.modal.rapport = r.ok ? r.rapport : { erreur: r.erreur || 'Rapport impossible.' }; render(); }
}
function vueMigrationTypes(){
  const r = state.modal.rapport;
  const libelle = cle => (TYPES_STRUCTURE.find(t => t.cle === cle) || {}).libelle || cle;
  const ligneStructure = x => `<div class="mt-ligne"><span><b>${echapper(x.nom)}</b><small>${x.cases && x.cases.length ? echapper(x.cases.join(' + ')) : 'aucune case'}</small></span><button type="button" class="btn btn-secondary v1-btn" data-editer-structure-migration="${x.ligne}">Choisir le type</button></div>`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(640px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Un type par structure</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        ${!r ? '<div class="pk-etat">Analyse des structures…</div>' : r.erreur ? `<div class="msg msg-erreur">${echapper(r.erreur)}</div>` : `
          <p style="margin:0;font-size:14px">${r.dejaTypees} structure(s) ont déjà un type. Rien n’est modifié tant que tu n’appliques pas.</p>
          ${r.aMigrer.length ? `<div class="mt-bloc"><div class="rp-surtitre">Type évident · ${r.aMigrer.length}</div>
            ${r.aMigrer.map(x => `<div class="mt-ligne"><span><b>${echapper(x.nom)}</b></span><span class="tag" data-forme="rond">${echapper(libelle(x.type))}</span></div>`).join('')}
          </div>` : ''}
          ${r.plusieursCases.length ? `<div class="mt-bloc"><div class="rp-surtitre">Plusieurs types cochés · ${r.plusieursCases.length}</div>${r.plusieursCases.map(ligneStructure).join('')}</div>` : ''}
          ${r.aucuneCase.length ? `<div class="mt-bloc"><div class="rp-surtitre">Aucun type coché · ${r.aucuneCase.length}</div>${r.aucuneCase.map(ligneStructure).join('')}</div>` : ''}
          ${r.ecrites ? `<div class="msg msg-succes">${r.ecrites} type(s) enregistré(s).</div>` : ''}`}
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          ${r && !r.erreur && r.aMigrer.length && !r.ecrites ? `<button type="button" class="btn btn-primary" data-appliquer-types>Enregistrer les ${r.aMigrer.length} type(s) évident(s)</button>` : ''}
        </div>
      </div>
    </div>`;
}
async function appliquerMigrationTypes(){
  etat('Enregistrement des types…', 'chargement');
  const r = await poster({ action: 'structures-migrer-type', appliquer: true });
  if(!r.ok){ etat('Migration impossible', 'erreur'); return; }
  const rst = await jsonp({ action: 'structures', password: motDePasse });
  if(rst.ok) state.structures = rst.structures.slice().sort((a, b) => b.ligne - a.ligne);
  etat(`${r.rapport.ecrites} type(s) enregistré(s)`, 'succes');
  if(state.modal && state.modal.kind === 'migration-types'){ state.modal.rapport = r.rapport; }
  render();
}
document.addEventListener('click', e => {
  if(e.target.closest('[data-migrer-types]')){ ouvrirMigrationTypes(); return; }
  if(e.target.closest('[data-appliquer-types]')){ appliquerMigrationTypes(); return; }
  const ed = e.target.closest('[data-editer-structure-migration]');
  if(ed){ state.modal = { kind: 'creer-structure', ligne: parseInt(ed.dataset.editerStructureMigration, 10) }; render(); }
});
/* ════════════════════════════════════════════════════════════════════════════════════
   Création / modification d'une structure — assistant en étapes
   Une étape à la fois (type → identité → contacts → commandes & paiement → options →
   récapitulatif), avec les explications là où la décision se prend (type, moyens de
   paiement, dépôt-vente). Les saisies vivent dans state.modal.v : on peut revenir en
   arrière, ouvrir l'aide des types, changer d'étape sans rien perdre.
   En modification, toutes les étapes sont accessibles directement et « Enregistrer » reste
   disponible partout ; en création, on avance étape par étape (vérification à chaque pas).
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_STRUCTURE = [
  { cle: 'type', titre: 'Type', ill: 'structures', h: 'Quel type de structure ?', p: 'Le type décide du tarif appliqué, du paiement et des documents (devis, facture, attestations). Un seul type par structure.' },
  { cle: 'identite', titre: 'Identité', ill: 'cle', h: 'Qui est-elle ?', p: 'Son nom, son code d’accès au portail et ses repères administratifs.' },
  { cle: 'contacts', titre: 'Contacts', ill: 'personne', h: 'Qui contacter ?', p: 'Le responsable habituel reçoit les échanges courants ; la facturation peut être adressée à quelqu’un d’autre.' },
  { cle: 'commande', titre: 'Commandes & paiement', ill: 'commander', h: 'Comment commande-t-elle ?', p: 'Ce qu’elle peut commander et comment ses commandes sont réglées.' },
  { cle: 'options', titre: 'Options', ill: 'flotte', h: 'Options', p: 'Dépôt-vente et convention : facultatif, modifiable à tout moment.' },
  { cle: 'recap', titre: 'Récapitulatif', ill: 'attestations', h: 'Tout est bon ?', p: 'Relisez avant d’enregistrer — chaque bloc se modifie d’un clic.' },
];
const DETAILS_TYPE_STRUCTURE = {
  rn: { ic: 'receipt', points: ['Tarif « vente solidaire »', 'Paiement par virement, imposé', 'Devis puis facture à chaque commande', 'Rapprochement comptable'] },
  projets: { ic: 'clipboard', points: ['Prix masqués pour la structure', 'Paiement fixé par l’équipe', 'Facture émise', 'Flotte gérée dans la plateforme'] },
  bo: { ic: 'file', points: ['Personnes nominatives et attestations', 'Jamais de devis ni de facture', 'Moyens de paiement au choix (étape 4)'] },
  interne: { ic: 'building', points: ['Aucun paiement, aucune facture', 'Flotte gérée dans la plateforme', 'Crée ses propres structures partenaires (BO)'] },
  esn: { ic: 'package', points: ['Aucun paiement, aucune facture', 'Quantités ESN', 'Prix masqués'] },
};
const AIDE_MOYENS_PAIEMENT = {
  'Paiement en ligne (CB)': { ic: 'receipt', txt: 'Un lien de paiement est envoyé : la personne règle par carte, avec son smartphone et l’application de sa banque (double authentification).' },
  'Chèque': { ic: 'file', txt: 'Chèque remis à la structure, qui le transmet — le rapprochement se fait à réception.' },
  'Espèces': { ic: 'package', txt: 'Réglé en espèces auprès de la structure, qui reverse ensuite le montant.' },
  'Comptoir solidaire': { ic: 'building', txt: 'Paiement en direct au comptoir solidaire du partenaire (propre aux structures BO).' },
};
/** Pictogrammes des moyens de paiement — les mêmes que les cartes du formulaire de commande du portail. */
function iconeMoyenPaiementAdmin(m, t){
  const x = String(m || '').toLowerCase();
  const d = x.includes('chèque') || x.includes('cheque') ? '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 16h4"/><path d="M14 16h4"/>'
    : x.includes('espèce') || x.includes('espece') ? '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>'
    : x.includes('virement') ? '<path d="M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M2 20h20M12 3l9 5H3z"/>'
    : x.includes('comptoir') ? '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-4a3 3 0 0 1 6 0v4"/>'
    : '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>';
  return `<svg viewBox="0 0 24 24" width="${t || 18}" height="${t || 18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
const ALPHABET_CODE_STRUCTURE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (0/O, 1/I/l)
function genererCodeStructure(){
  const groupe = () => Array.from({ length: 4 }, () => ALPHABET_CODE_STRUCTURE[Math.floor(Math.random() * ALPHABET_CODE_STRUCTURE.length)]).join('');
  return `${groupe()}-${groupe()}-${groupe()}-${groupe()}`;
}
/** Robustesse d'un code saisi librement — simple repère, jamais bloquant. */
function robustesseCode(code){
  const c = String(code || '');
  if(!c) return null;
  const familles = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(r => r.test(c)).length;
  if(c.length >= 14 && familles >= 2) return { niveau: 'fort', txt: 'Code robuste.' };
  if(c.length >= 10 && familles >= 2) return { niveau: 'moyen', txt: 'Correct, mais un code généré (16 caractères aléatoires) est plus sûr.' };
  return { niveau: 'faible', txt: 'Code facile à deviner : quiconque le trouve peut commander au nom de la structure. Mieux vaut le générer.' };
}
/** Valeurs de départ de l'assistant (structure existante, ou vide). */
function valeursInitialesStructure(s){
  const resp = separerResponsable(s ? s.responsable : '');
  const respF = separerResponsable(s ? s.responsableFacturation : '');
  const groupes = String((s && s.groupesCommande) || '').split(',').map(x => x.trim()).filter(Boolean);
  return {
    type: s ? (s.type || (typeAChoisir(s) ? '' : typeStructure(s).toLowerCase().replace('rnum', 'rn'))) : '',
    codeMode: 'generer', code: s ? '' : genererCodeStructure(), nouveauCode: '',
    nom: s ? s.nom || '' : '', siret: s ? s.siret || '' : '', categorie: s ? s.categorie || '' : '', region: s ? s.region || '' : '',
    responsablePrenom: resp.prenom, responsableNom: resp.nom,
    email: s ? s.email || '' : '', telephone: s ? s.telephone || '' : '', adresse: s ? s.adresse || '' : '',
    respFactPrenom: respF.prenom, respFactNom: respF.nom, emailFacturation: s ? s.emailFacturation || '' : '',
    groupesMode: !groupes.length ? 'tout' : groupes.length > 1 ? 'mixte' : groupes[0], groupes,
    moyensPaiement: String((s && s.moyensPaiement) || '').split(',').map(x => x.trim()).filter(Boolean),
    typePublic: s ? s.typePublic || '' : '',
    programmes: String((s && s.programmes) || '').split(',').map(x => x.trim()).filter(Boolean),
    depotVente: !!(s && s.depotVente), lienConvention: s ? s.lienConvention || '' : '',
    comptesGoogle: s ? s.comptesGoogle || '' : '',
    facturationDepotVente: (s && s.facturationDepotVente === 'chaque-vente') ? 'chaque-vente' : 'aucune',
  };
}
function vueCreerStructure(){
  const m = state.modal;
  const s = m.ligne ? state.structures.find(x => x.ligne === m.ligne) : null;
  if(!m.v) m.v = valeursInitialesStructure(s);
  if(m.etape == null) m.etape = 0;
  if(m.vues == null) m.vues = s ? ETAPES_STRUCTURE.length - 1 : 0;
  const v = m.v;
  const et = ETAPES_STRUCTURE[m.etape];
  const derniere = m.etape === ETAPES_STRUCTURE.length - 1;
  const frise = ETAPES_STRUCTURE.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-cs-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = { type: etapeStructureType, identite: etapeStructureIdentite, contacts: etapeStructureContacts, commande: etapeStructureCommande, options: etapeStructureOptions, recap: etapeStructureRecap }[et.cle](v, s);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw" role="dialog" aria-modal="true" aria-labelledby="csw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">${s ? 'Modifier la structure' : 'Nouvelle structure'} · étape ${m.etape + 1} sur ${ETAPES_STRUCTURE.length}</div>
            <h2 class="csw-titre" id="csw-titre">${s ? echapper(s.nom) : (v.nom ? echapper(v.nom) : 'Nouvelle structure')}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <ol class="csw-frise fc2-frise">${frise}</ol>
        <div class="csw-corps">
          <div class="csw-intro"><span data-ill="${et.ill}" class="ill xl"></span><div><h3>${echapper(et.h)}</h3><p>${echapper(et.p)}</p></div></div>
          ${corps}
        </div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions csw-pied">
          ${s ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-structure="${s.ligne}" data-nom-structure="${echapper(s.nom)}">Supprimer</button>` : ''}
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-cs-precedent>← Précédent</button>' : ''}
          ${!derniere ? `<button type="button" class="btn ${s ? 'btn-secondary' : 'btn-primary'}" data-cs-suivant>Suivant →</button>` : ''}
          ${(s || derniere) ? `<button type="button" class="btn btn-primary" id="cs-enregistrer">${s ? 'Enregistrer' : 'Créer la structure'}</button>` : ''}
        </div>
      </div>
    </div>`;
}
function etapeStructureType(v, s){
  return `
    ${s && typeAChoisir(s) ? `<div class="msg msg-warn">Type à définir : ${(s.casesCochees || []).length ? 'plusieurs types étaient cochés (' + echapper(s.casesCochees.join(', ')) + ')' : 'aucun type n’était coché'}. Choisissez-en un seul.</div>` : ''}
    ${s && v.type && s.type && v.type !== s.type ? '<div class="msg msg-warn">Changer le type modifie le tarif et la facturation des prochaines commandes de cette structure (les commandes passées ne changent pas).</div>' : ''}
    <div class="csw-types" role="radiogroup" aria-label="Type de structure">
      ${TYPES_STRUCTURE.map(t => { const d = DETAILS_TYPE_STRUCTURE[t.cle] || { ic: 'building', points: [] }; return `
      <label class="csw-type${v.type === t.cle ? ' choisi' : ''}">
        <input type="radio" name="cs-type" value="${t.cle}" ${v.type === t.cle ? 'checked' : ''}>
        <span class="csw-type-ic" aria-hidden="true">${icon(d.ic, 20)}</span>
        <span class="csw-type-txt"><b>${echapper(t.libelle)}</b><ul>${d.points.map(p => `<li>${echapper(p)}</li>`).join('')}</ul></span>
        <span class="coche-choix-admin" aria-hidden="true">✓</span>
      </label>`; }).join('')}
    </div>`;
}
function etapeStructureIdentite(v, s){
  const force = robustesseCode(v.codeMode === 'libre' ? v.code : '');
  const blocCode = s
    ? `<div class="field"><label>Code d’accès</label>
        <div class="csw-code-actuel"><span class="pk-sn">${state.revealedCodes[s.ligne] ? echapper(s.code) : '••••••••••'}</span>
          <button type="button" class="btn btn-ghost btn-icon" style="width:28px;height:28px" data-reveal-code="${s.ligne}" aria-label="Afficher le code">${icon(state.revealedCodes[s.ligne] ? 'eyeoff' : 'eye', 15)}</button>
          <button type="button" class="btn btn-secondary" data-regenerer-code-structure="${s.ligne}">Régénérer</button></div>
        <label class="csw-sous-champ" for="cs-nouveau-code">Ou choisir un nouveau code <em>(l’ancien cessera de fonctionner)</em></label>
        <input class="input" id="cs-nouveau-code" data-cs="nouveauCode" autocomplete="off" value="${echapper(v.nouveauCode)}" placeholder="Laisser vide pour garder le code actuel">
        ${v.nouveauCode ? (() => { const f = robustesseCode(v.nouveauCode); return `<div class="csw-force ${f.niveau}"><i></i>${echapper(f.txt)}</div>`; })() : ''}
      </div>`
    : `<div class="field"><label>Code d’accès au portail *</label>
        <div class="csw-seg" role="radiogroup" aria-label="Mode de choix du code">
          <label class="${v.codeMode === 'generer' ? 'on' : ''}"><input type="radio" name="cs-code-mode" value="generer" ${v.codeMode === 'generer' ? 'checked' : ''}>Générer un code <em>recommandé</em></label>
          <label class="${v.codeMode === 'libre' ? 'on' : ''}"><input type="radio" name="cs-code-mode" value="libre" ${v.codeMode === 'libre' ? 'checked' : ''}>Choisir mon code</label>
        </div>
        ${v.codeMode === 'generer'
          ? `<div class="csw-code-actuel"><span class="pk-sn" id="cs-code-affiche">${echapper(v.code)}</span><button type="button" class="btn btn-secondary" data-generer-code-structure>${icon('refresh', 14)}Un autre</button></div>
             <p class="csw-aide">16 caractères aléatoires, sans lettres ambiguës : impossible à deviner. C’est ce code que la structure saisira sur le portail.</p>`
          : `<input class="input" id="cs-code" data-cs="code" autocomplete="off" value="${echapper(v.code)}" placeholder="Ex : un mot de passe facile à transmettre">
             ${force ? `<div class="csw-force ${force.niveau}"><i></i>${echapper(force.txt)}</div>` : '<p class="csw-aide">Pour la sécurité, un code généré reste préférable : ce code suffit pour commander au nom de la structure.</p>'}`}
      </div>`;
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label for="cs-nom">Nom de la structure *</label><input class="input" id="cs-nom" data-cs="nom" value="${echapper(v.nom)}" placeholder="Ex : Épicerie solidaire du Loiret"></div>
      <div class="csw-large">${blocCode}</div>
      <div class="field"><label for="cs-siret">SIRET <em>(14 chiffres, facultatif)</em></label><input class="input" id="cs-siret" data-cs="siret" inputmode="numeric" maxlength="17" placeholder="123 456 789 00012" value="${echapper(v.siret)}"></div>
      <div class="field"><label for="cs-categorie">Catégorie</label><select class="input" id="cs-categorie" data-cs="categorie"><option value="">—</option>${CATEGORIES_STRUCTURE.map(c => `<option value="${echapper(c)}" ${v.categorie === c ? 'selected' : ''}>${echapper(c)}</option>`).join('')}</select></div>
      <div class="field csw-large"><label for="cs-region">Région analytique <em>(territoire EC, pour ventiler l’activité)</em></label><select class="input" id="cs-region" data-cs="region"><option value="">—</option>${[...REGIONS_ANALYTIQUE, ...(v.region && !REGIONS_ANALYTIQUE.includes(v.region) ? [v.region] : [])].map(r => `<option value="${echapper(r)}" ${v.region === r ? 'selected' : ''}>${echapper(r)}</option>`).join('')}</select></div>
    </div>`;
}
function etapeStructureContacts(v){
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label>Responsable habituel *</label><div class="csw-deux">
        <input class="input" id="cs-responsable-prenom" data-cs="responsablePrenom" placeholder="Prénom" value="${echapper(v.responsablePrenom)}">
        <input class="input" id="cs-responsable-nom" data-cs="responsableNom" placeholder="NOM" value="${echapper(v.responsableNom)}"></div></div>
      <div class="field"><label for="cs-email">E-mail</label><input class="input" id="cs-email" data-cs="email" type="email" value="${echapper(v.email)}" placeholder="contact@structure.fr"></div>
      <div class="field"><label for="cs-tel">Téléphone</label><input class="input" id="cs-tel" data-cs="telephone" value="${echapper(v.telephone)}" placeholder="02 38 00 00 00"></div>
      <div class="field csw-large"><label for="cs-adresse">Adresse</label><textarea class="input" id="cs-adresse" data-cs="adresse" rows="2">${echapper(v.adresse)}</textarea></div>
      <div class="field csw-large"><label>Responsable facturation <em>(si différent du responsable habituel)</em></label><div class="csw-deux">
        <input class="input" id="cs-responsable-facturation-prenom" data-cs="respFactPrenom" placeholder="Prénom" value="${echapper(v.respFactPrenom)}">
        <input class="input" id="cs-responsable-facturation-nom" data-cs="respFactNom" placeholder="NOM" value="${echapper(v.respFactNom)}"></div></div>
      <div class="field csw-large"><label for="cs-email-facturation">E-mail de facturation <em>(si différent)</em></label><input class="input" id="cs-email-facturation" data-cs="emailFacturation" type="email" value="${echapper(v.emailFacturation)}"></div>
    </div>`;
}
function etapeStructureCommande(v){
  const t = v.type;
  const info = (ic, titre, txt) => `<div class="csw-info"><span class="csw-type-ic">${ic === '__virement' ? iconeMoyenPaiementAdmin('Virement', 20) : icon(ic, 18)}</span><span><b>${titre}</b><small>${txt}</small></span></div>`;
  const paiement = t === 'bo'
    ? `<div class="csw-moyens">${MOYENS_PAIEMENT_STRUCTURE.map(mp => { const a = AIDE_MOYENS_PAIEMENT[mp] || { ic: 'receipt', txt: '' }; const on = v.moyensPaiement.includes(mp); return `
        <label class="csw-moyen${on ? ' choisi' : ''}"><input type="checkbox" class="cs-paiement-case" value="${echapper(mp)}" ${on ? 'checked' : ''}>
          <span class="csw-type-ic">${iconeMoyenPaiementAdmin(mp, 20)}</span><span><b>${echapper(mp)}</b><small>${echapper(a.txt)}</small></span><span class="coche-choix-admin" aria-hidden="true">✓</span></label>`; }).join('')}</div>
       <p class="csw-aide">${v.moyensPaiement.length ? `${v.moyensPaiement.length} moyen${v.moyensPaiement.length > 1 ? 's' : ''} proposé${v.moyensPaiement.length > 1 ? 's' : ''} à la structure au moment de commander.` : 'Aucune case cochée : les 4 moyens seront proposés.'}</p>`
    : t === 'rn' ? info('__virement', 'Virement (RNum uniquement)', 'Imposé pour ce type : rien à choisir. Un devis puis une facture sont émis à chaque commande.')
    : t === 'projets' ? info('clipboard', 'Fixé par l’équipe', 'Le règlement est défini par l’équipe EC pour chaque projet : la structure ne choisit rien au moment de commander.')
    : (t === 'interne' || t === 'esn') ? info('check', 'Aucun paiement', 'Les commandes de ce type ne sont ni payées ni facturées.')
    : info('info', 'Choisissez d’abord le type', 'Les moyens de paiement dépendent du type de structure (étape 1).');
  const progs = (state.distributions || []).filter(p => p.statut !== 'archive');
  return `
    <section class="csw-section"><h4>Paiement</h4>${paiement}</section>
    <section class="csw-section"><h4>Catalogue accessible</h4>
      <div class="field"><select class="input" id="cs-groupes-mode" data-cs="groupesMode">
        <option value="tout" ${v.groupesMode === 'tout' ? 'selected' : ''}>Tout le catalogue</option>
        ${GROUPES_COMMANDE.map(g => `<option value="${echapper(g)}" ${v.groupesMode === g ? 'selected' : ''}>${echapper(g)} uniquement</option>`).join('')}
        <option value="mixte" ${v.groupesMode === 'mixte' ? 'selected' : ''}>Mixte (plusieurs groupes)</option></select>
      ${v.groupesMode === 'mixte' ? `<div class="csw-cases">${GROUPES_COMMANDE.map(g => `<label><input type="checkbox" class="cs-groupes-case" value="${echapper(g)}" ${v.groupes.includes(g) ? 'checked' : ''}>${echapper(g)}</label>`).join('')}</div>` : ''}</div>
    </section>
    ${t === 'bo' ? `<section class="csw-section"><h4>Public visé <em>(facultatif)</em></h4><div class="field"><input class="input" id="cs-type-public" data-cs="typePublic" value="${echapper(v.typePublic)}" placeholder="Ex : Étudiants, Familles, Seniors…"><p class="csw-aide">Repère pour choisir les tarifs personnalisés à proposer.</p></div></section>` : ''}
    ${progs.length ? `<section class="csw-section"><h4>Programmes de distribution <em>(ses commandes y sont rattachées automatiquement)</em></h4>
      <div class="csw-cases">${progs.map(p => `<label><input type="checkbox" class="cs-programme" value="${echapper(p.id)}" ${v.programmes.includes(p.id) ? 'checked' : ''}>${echapper(p.nom)} <small>jusqu’au ${frDate(p.butoir)}</small></label>`).join('')}</div></section>` : ''}`;
}
function etapeStructureOptions(v){
  return `
    <label class="csw-option${v.depotVente ? ' choisi' : ''}">
      <span class="rp-switch"><input type="checkbox" id="cs-depot-vente" data-cs="depotVente" ${v.depotVente ? 'checked' : ''}><span class="rp-switch-piste"></span></span>
      <span class="csw-option-txt"><b>Dépôt-vente</b>
        <small>Le matériel est <strong>confié en dépôt</strong> : rien à payer à la commande (ni devis ni facture). La structure déclare chaque vente dans sa flotte (« Vendu ») et <strong>vous suivez tout depuis l’admin</strong>, sans les données des personnes : stock restant, ventes, alertes (appareil en stock depuis 2 mois, stock divisé par deux, stock bas) et « Stock restreint » (plafonds global et par produit).</small>
      </span>
    </label>
    ${v.depotVente ? `<div class="csw-section" style="margin-top:12px"><h4>Facturation des ventes</h4>
      <div class="csw-types">
        <label class="csw-type${v.facturationDepotVente !== 'chaque-vente' ? ' choisi' : ''}"><input type="radio" name="cs-fact-dv" value="aucune" data-cs="facturationDepotVente" ${v.facturationDepotVente !== 'chaque-vente' ? 'checked' : ''}><span class="csw-option-txt"><b>Pas de facturation automatique</b><small>Les ventes sont suivies ; la facturation se règle à part (organisation à définir).</small></span></label>
        <label class="csw-type${v.facturationDepotVente === 'chaque-vente' ? ' choisi' : ''}"><input type="radio" name="cs-fact-dv" value="chaque-vente" data-cs="facturationDepotVente" ${v.facturationDepotVente === 'chaque-vente' ? 'checked' : ''}><span class="csw-option-txt"><b>Une facture à chaque vente</b><small>Dès qu’un appareil passe en « Vendu », une facture de son prix de cession est émise (onglet Devis / Factures).</small></span></label>
      </div></div>` : ''}
    <div class="field" style="margin-top:14px"><label for="cs-convention">Lien vers la convention <em>(facultatif)</em></label>
      <input class="input" id="cs-convention" data-cs="lienConvention" type="url" value="${echapper(v.lienConvention)}" placeholder="https://… (Drive, SharePoint…)">
      <p class="csw-aide">Collez le lien du document signé : il sera accessible depuis la fiche de la structure.</p></div>
    ${v.type === 'interne' ? `<div class="field" style="margin-top:14px"><label for="cs-google">Équipe (comptes Google) <em>(facultatif)</em></label>
      <input class="input" id="cs-google" data-cs="comptesGoogle" type="text" value="${echapper(v.comptesGoogle)}" placeholder="paul@emmaus-connect.org (conseiller), anne@emmaus-connect.org (responsable)">
      <p class="csw-aide">L’e-mail de contact ouvre déjà l’espace <strong>sans code</strong>, en responsable de territoire. Ajoutez d’autres adresses séparées par des virgules, suivies de <strong>(responsable)</strong> ou <strong>(conseiller)</strong> — conseiller par défaut : flotte et ventes, attestations, projets et rapport en consultation. Le responsable peut aussi gérer cette liste depuis son espace.</p></div>` : ''}`;
}
function etapeStructureRecap(v){
  const typeLib = (TYPES_STRUCTURE.find(t => t.cle === v.type) || {}).libelle || '—';
  const groupes = v.groupesMode === 'tout' ? 'Tout le catalogue' : v.groupesMode === 'mixte' ? (v.groupes.join(', ') || 'Aucun groupe coché') : v.groupesMode;
  const paiement = v.type === 'bo' ? (v.moyensPaiement.join(', ') || 'Les 4 moyens') : v.type === 'rn' ? 'Virement (imposé)' : v.type === 'projets' ? 'Fixé par l’équipe' : 'Aucun paiement';
  const bloc = (i, titre, lignes) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-cs-aller="${i}">Modifier</button></div>
    ${lignes.filter(l => l).map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`).join('')}</section>`;
  const nomComplet = (p, n) => [p, n].filter(Boolean).join(' ');
  return `<div class="csw-recap">
    ${bloc(0, 'Type', [['Type', typeLib]])}
    ${bloc(1, 'Identité', [['Nom', v.nom], ...(state.modal.ligne ? (v.nouveauCode ? [['Nouveau code', v.nouveauCode]] : []) : [['Code d’accès', v.code]]), ['SIRET', v.siret], ['Catégorie', v.categorie], ['Région', v.region]])}
    ${bloc(2, 'Contacts', [['Responsable', nomComplet(v.responsablePrenom, v.responsableNom)], ['E-mail', v.email], ['Téléphone', v.telephone], ['Adresse', v.adresse], ['Facturation', [nomComplet(v.respFactPrenom, v.respFactNom), v.emailFacturation].filter(Boolean).join(' · ')]])}
    ${bloc(3, 'Commandes & paiement', [['Paiement', paiement], ['Catalogue', groupes], v.type === 'bo' ? ['Public visé', v.typePublic] : null, v.programmes.length ? ['Programmes', v.programmes.map(id => ((state.distributions || []).find(p => p.id === id) || {}).nom || id).join(', ')] : null])}
    ${bloc(4, 'Options', [['Dépôt-vente', v.depotVente ? (v.facturationDepotVente === 'chaque-vente' ? 'Oui — une facture à chaque vente' : 'Oui — sans facturation automatique') : 'Non'], ['Convention', v.lienConvention], v.type === 'interne' ? ['Comptes Google', [v.email, v.comptesGoogle].filter(Boolean).join(', ')] : null])}
  </div>`;
}
/** Vérifie l'étape affichée ; renvoie un message d'erreur, ou '' si tout va bien. */
function verifierEtapeStructure(i){
  const v = state.modal.v;
  const cle = ETAPES_STRUCTURE[i].cle;
  if(cle === 'type' && !v.type) return 'Choisissez le type de la structure.';
  if(cle === 'identite'){
    if(!v.nom.trim()) return 'Le nom est obligatoire.';
    if(!state.modal.ligne && !String(v.code).trim()) return 'Le code d’accès est obligatoire.';
    const siret = v.siret.replace(/\s+/g, '');
    if(siret && !/^\d{14}$/.test(siret)) return 'Le SIRET doit comporter exactement 14 chiffres.';
    const codeSaisi = state.modal.ligne ? v.nouveauCode.trim() : String(v.code).trim();
    if(codeSaisi && state.structures.some(x => x.code === codeSaisi && x.ligne !== state.modal.ligne)) return 'Ce code est déjà utilisé par une autre structure.';
  }
  if(cle === 'contacts'){
    if(!v.responsablePrenom.trim() && !v.responsableNom.trim()) return 'Le responsable habituel est obligatoire.';
    const mailOk = x => !x || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
    if(!mailOk(v.email) || !mailOk(v.emailFacturation)) return 'Une adresse e-mail n’est pas valide.';
  }
  if(cle === 'options' && v.lienConvention.trim() && !/^https?:\/\/\S+$/i.test(v.lienConvention.trim())) return 'Le lien vers la convention doit commencer par https://';
  return '';
}
function allerEtapeStructure(cible){
  const m = state.modal;
  // En création, on ne saute pas une étape non vérifiée.
  if(!m.ligne && cible > m.etape){
    for(let i = m.etape; i < cible; i++){ const err = verifierEtapeStructure(i); if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; } }
  }
  m.etape = Math.max(0, Math.min(ETAPES_STRUCTURE.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps'); if(corps) corps.scrollTop = 0;
}
/* Saisie : chaque champ [data-cs] alimente state.modal.v (pas de re-rendu, sauf pour les
   choix qui changent l'affichage de l'étape : type, mode du code, cases, groupes). */
function lireSaisieStructure(el){
  const m = state.modal; if(!m || m.kind !== 'creer-structure' || !m.v) return false;
  const v = m.v;
  if(el.dataset && el.dataset.cs){ v[el.dataset.cs] = el.type === 'checkbox' ? el.checked : el.value; return true; }
  if(el.name === 'cs-type'){ v.type = el.value; return 'rendre'; }
  if(el.name === 'cs-code-mode'){ v.codeMode = el.value; v.code = el.value === 'generer' ? genererCodeStructure() : ''; return 'rendre'; }
  if(el.classList.contains('cs-paiement-case')){ v.moyensPaiement = [...document.querySelectorAll('.cs-paiement-case:checked')].map(x => x.value); return 'rendre'; }
  if(el.classList.contains('cs-groupes-case')){ v.groupes = [...document.querySelectorAll('.cs-groupes-case:checked')].map(x => x.value); return true; }
  if(el.classList.contains('cs-programme')){ v.programmes = [...document.querySelectorAll('.cs-programme:checked')].map(x => x.value); return true; }
  return false;
}
document.addEventListener('input', e => {
  const r = lireSaisieStructure(e.target);
  if(!r) return;
  // Indicateur de robustesse mis à jour en direct, sans perdre le focus.
  if(e.target.dataset.cs === 'code' || e.target.dataset.cs === 'nouveauCode'){
    const f = robustesseCode(e.target.value);
    let zone = e.target.parentNode.querySelector('.csw-force, .csw-aide');
    if(f){ if(!zone || !zone.classList.contains('csw-force')){ const d = document.createElement('div'); if(zone) zone.replaceWith(d); else e.target.after(d); zone = d; } zone.className = `csw-force ${f.niveau}`; zone.innerHTML = `<i></i>${echapper(f.txt)}`; }
  }
});
document.addEventListener('change', e => {
  const r = lireSaisieStructure(e.target);
  if(r === 'rendre' || e.target.dataset.cs === 'groupesMode' || e.target.dataset.cs === 'depotVente' || e.target.dataset.cs === 'facturationDepotVente') render();
  if(e.target.id === 'st-filtre-region'){ state.structuresFiltreRegion = e.target.value; render(); }
});
document.addEventListener('click', e => {
  if(!state.modal || state.modal.kind !== 'creer-structure') return;
  const aller = e.target.closest('[data-cs-aller]');
  if(aller){ allerEtapeStructure(parseInt(aller.dataset.csAller, 10)); return; }
  if(e.target.closest('[data-cs-suivant]')){ allerEtapeStructure(state.modal.etape + 1); return; }
  if(e.target.closest('[data-cs-precedent]')){ allerEtapeStructure(state.modal.etape - 1); return; }
});
document.addEventListener('click', e => {
  if(e.target.id === 'cs-enregistrer') enregistrerStructure();
  if(e.target.id === 'cc-enregistrer') enregistrerCommande();
  if(e.target.id === 'cp-enregistrer') enregistrerProduit();
  if(e.target.id === 'cd-enregistrer') enregistrerDevis();
  if(e.target.id === 'cf-enregistrer') enregistrerFacture();
  if(e.target.id === 'mb-enregistrer') enregistrerModeleBon();
  if(e.target.id === 'md-enregistrer') enregistrerModeleDoc();
  if(e.target.id === 'ma-enregistrer') enregistrerModeleAttestation();
  if(e.target.id === 'ma-xlsx-enregistrer') enregistrerModeleAttestationXlsx();
  if(e.target.id === 'ma-pdf-enregistrer') enregistrerModeleAttestationPdf();
  if(e.target.id === 'rp-enregistrer-rappro') enregistrerRapprochement();
  if(e.target.id === 'rd-enregistrer') enregistrerRattachementDevis();
  if(e.target.id === 'ns-enregistrer') enregistrerSav();
  if(e.target.closest('[data-supprimer-modele-bon]')) supprimerModeleBon();
  const supprimerModeleDocBtn = e.target.closest('[data-supprimer-modele-doc]');
  if(supprimerModeleDocBtn) supprimerModeleDoc(supprimerModeleDocBtn.dataset.supprimerModeleDoc);
  if(e.target.closest('[data-supprimer-modele-attestation]')) supprimerModeleAttestation();
  if(e.target.closest('[data-supprimer-modele-attestation-xlsx]')) supprimerModeleAttestationXlsx();
  if(e.target.closest('[data-supprimer-modele-attestation-pdf]')) supprimerModeleAttestationPdf();
});
async function enregistrerStructure(){
  const m = state.modal;
  const ligne = m.ligne;
  const v = m.v;
  // Toutes les étapes sont vérifiées avant d'écrire quoi que ce soit (on revient sur la
  // première étape en défaut, avec son message).
  for(let i = 0; i < ETAPES_STRUCTURE.length - 1; i++){
    const err = verifierEtapeStructure(i);
    if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; }
  }
  // "code" n'est modifiable qu'à la création (ou via le champ « nouveau code » en modification,
  // envoyé à part avec sa propre vérification d'unicité côté serveur).
  const champsCommuns = {
    nom: v.nom.trim(), email: v.email.trim(), telephone: v.telephone.trim(), adresse: v.adresse.trim(), categorie: v.categorie,
    // Reconcaténé depuis les deux champs Prénom/NOM — la colonne back reste un seul champ texte.
    responsable: [v.responsablePrenom.trim(), v.responsableNom.trim()].filter(Boolean).join(' '),
    responsableFacturation: [v.respFactPrenom.trim(), v.respFactNom.trim()].filter(Boolean).join(' '),
    emailFacturation: v.emailFacturation.trim(),
    groupesCommande: v.groupesMode === 'tout' ? '' : v.groupesMode === 'mixte' ? v.groupes.join(',') : v.groupesMode,
    typePublic: v.type === 'bo' ? v.typePublic.trim() : (v.typePublic || '').trim(),
    moyensPaiement: v.type === 'bo' ? v.moyensPaiement.join(',') : '',
    siret: v.siret.replace(/\s+/g, ''), region: v.region,
    ...((state.distributions || []).some(p => p.statut !== 'archive') ? { programmes: v.programmes.join(',') } : {}),
    depotVente: v.depotVente ? 'TRUE' : 'FALSE', lienConvention: v.lienConvention.trim(),
    comptesGoogle: v.comptesGoogle.trim(),
    facturationDepotVente: v.depotVente ? v.facturationDepotVente : 'aucune',
    type: v.type,
  };
  const bouton = $('cs-enregistrer'); if(bouton) bouton.disabled = true;
  const echec = msg => { etat('Enregistrement impossible', 'erreur'); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(msg || 'Enregistrement impossible.')}</div>`; const b = $('cs-enregistrer'); if(b) b.disabled = false; };
  try{
    etat(ligne ? 'Enregistrement…' : 'Création…', 'chargement');
    if(ligne){
      const s = state.structures.find(x => x.ligne === ligne) || {};
      // Seuls les champs réellement modifiés sont envoyés (un appel par champ côté API).
      const avant = { ...valeursInitialesStructure(s) };
      const initiaux = { nom: s.nom || '', email: s.email || '', telephone: s.telephone || '', adresse: s.adresse || '', categorie: s.categorie || '', responsable: s.responsable || '', responsableFacturation: s.responsableFacturation || '', emailFacturation: s.emailFacturation || '', groupesCommande: s.groupesCommande || '', typePublic: s.typePublic || '', moyensPaiement: s.moyensPaiement || '', siret: s.siret || '', region: s.region || '', programmes: s.programmes || '', depotVente: s.depotVente ? 'TRUE' : 'FALSE', lienConvention: s.lienConvention || '', comptesGoogle: s.comptesGoogle || '', facturationDepotVente: s.facturationDepotVente === 'chaque-vente' ? 'chaque-vente' : 'aucune', type: avant.type };
      const aEnvoyer = Object.keys(champsCommuns).filter(c => String(champsCommuns[c]) !== String(initiaux[c] ?? ''));
      const nouveauCode = v.nouveauCode.trim();
      if(nouveauCode && nouveauCode !== s.code){
        if(!await confirmerCvdl(`Remplacer le code de « ${s.nom} » ? L'ancien code cessera de fonctionner immédiatement (liens déjà partagés, portail, suivi de commande...).`)){ const b = $('cs-enregistrer'); if(b) b.disabled = false; etat('Annulé', 'succes'); return; }
        const rc = await poster({ action: 'structure-update', ligne, champ: 'code', valeur: nouveauCode });
        if(!rc.ok) return echec(rc.erreur);
      }
      const reponses = await Promise.all(aEnvoyer.map(c => poster({ action: 'structure-update', ligne, champ: c, valeur: champsCommuns[c] })));
      const ko = reponses.find(r => !r.ok);
      if(ko) return echec(ko.erreur);
    }else{
      const r = await poster({ action: 'structure-create', code: String(v.code).trim(), ...champsCommuns });
      if(!r.ok) return echec(r.erreur);
    }
    etat(ligne ? 'Structure mise à jour' : 'Structure créée', 'succes');
    const rst = await jsonp({ action: 'structures', password: motDePasse });
    if(rst.ok) state.structures = rst.structures.slice().sort((a, b) => b.ligne - a.ligne);
    if(champsCommuns.depotVente === 'TRUE') chargerDepotVente();
    state.modal = null; render();
  }catch(e){ echec(); }
}

/* ════════════════════════════════════════════════════════════════════════════════════
   Nouvelle commande (saisie par l'équipe) — assistant en étapes, même principe que la
   création de structure : Structure → Produits → Personnes & livraison → Paiement & suivi
   → Récapitulatif. Les champs du portail qui manquaient (personnes, mode de livraison, date
   souhaitée/urgence, responsable, moyen de paiement, devis, notification) y sont repris.
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_COMMANDE = [
  { cle: 'structure', titre: 'Structure', ill: 'structures', h: 'Pour quelle structure ?', p: 'Son type fixe le tarif, le paiement et les documents de la commande.' },
  { cle: 'produits', titre: 'Produits', ill: 'commander', h: 'Que commande-t-elle ?', p: 'Ajoutez chaque produit avec sa quantité. Le prix suit la grille tarifaire de la structure.' },
  { cle: 'livraison', titre: 'Personnes & livraison', ill: 'personne', h: 'Pour qui, et comment livrer ?', p: 'Les personnes accompagnées (bons d’orientation), le mode de livraison et l’échéance.' },
  { cle: 'paiement', titre: 'Paiement & suivi', ill: 'facture', h: 'Comment est-elle réglée ?', p: 'Moyen et statut de paiement, statut de départ, commentaire interne.' },
  { cle: 'recap', titre: 'Récapitulatif', ill: 'attestations', h: 'Tout est bon ?', p: 'Relisez avant de créer — chaque bloc se modifie d’un clic.' },
];
const MOYENS_PAIEMENT_ADMIN = ['Paiement en ligne (CB)', 'Chèque', 'Espèces', 'Comptoir solidaire', 'Virement'];
function structureNc(){ const v = state.modal && state.modal.v; return v ? state.structures.find(s => s.code === v.code) : null; }
function typeNc(s){ return s ? typeStructure(s) : ''; }
function sansPaiementNc(s){ const t = typeNc(s); return t === 'Interne' || t === 'ESN' || !!(s && s.depotVente); }
function prixUnitaireNc(p, s){
  if(!p || !s || sansPaiementNc(s)) return null;
  const v = parseFloat(typeNc(s) === 'RNum' ? p.prixRN : p.prixStandard);
  return isNaN(v) ? null : v;
}
function moyensNc(s){
  const t = typeNc(s);
  if(t === 'RNum') return ['Virement (RNum uniquement)'];
  if(t === 'BO'){ const l = String(s.moyensPaiement || '').split(',').map(x => x.trim()).filter(Boolean); return l.length ? l : Object.keys(AIDE_MOYENS_PAIEMENT); }
  if(t === 'Projets') return MOYENS_PAIEMENT_ADMIN;
  return [];
}
function valeursInitialesCommande(){
  return { code: state.ncCode || '', personnes: [], paiementSepare: false, modeLivraison: '', urgent: false, dateSouhaitee: '',
    responsable: '', moyenPaiement: '', statutPaiement: 'Non payé', statutCommande: 'Reçue', demandeDevis: false, commentaire: '', notifier: true };
}
function vueCreerCommande(){
  const m = state.modal;
  if(!m.v) m.v = valeursInitialesCommande();
  if(m.etape == null) m.etape = 0;
  if(m.vues == null) m.vues = 0;
  const v = m.v, s = structureNc();
  const et = ETAPES_COMMANDE[m.etape];
  const derniere = m.etape === ETAPES_COMMANDE.length - 1;
  const frise = ETAPES_COMMANDE.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-nc-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = { structure: etapeNcStructure, produits: etapeNcProduits, livraison: etapeNcLivraison, paiement: etapeNcPaiement, recap: etapeNcRecap }[et.cle](v, s);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw ncw" role="dialog" aria-modal="true" aria-labelledby="ncw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">Nouvelle commande · étape ${m.etape + 1} sur ${ETAPES_COMMANDE.length}</div>
            <h2 class="csw-titre" id="ncw-titre">${s ? echapper(s.nom) : 'Nouvelle commande'}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <ol class="csw-frise fc2-frise">${frise}</ol>
        <div class="csw-corps">
          <div class="csw-intro"><span data-ill="${et.ill}" class="ill xl"></span><div><h3>${echapper(et.h)}</h3><p>${echapper(et.p)}</p></div></div>
          ${corps}
        </div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions csw-pied">
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-nc-precedent>← Précédent</button>' : ''}
          ${!derniere ? '<button type="button" class="btn btn-primary" data-nc-suivant>Suivant →</button>' : '<button type="button" class="btn btn-primary" id="cc-enregistrer">Créer la commande</button>'}
        </div>
      </div>
    </div>`;
}
function etapeNcStructure(v){
  const liste = state.structures.slice().sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
  const q = String(v.recherche || '').trim().toLowerCase();
  const texte = s => (s.nom + ' ' + s.code + ' ' + typeStructure(s) + ' ' + (s.region || '')).toLowerCase();
  return `
    <input class="input" id="nc-recherche" type="search" placeholder="Rechercher une structure (nom, code, type, région)…" autocomplete="off" value="${echapper(v.recherche || '')}">
    <div class="ncw-structures" role="radiogroup" aria-label="Structure">
      ${liste.map(s => { const t = typeStructure(s); return `
      <label class="csw-moyen ncw-structure${v.code === s.code ? ' choisi' : ''}" data-texte="${echapper(texte(s))}" ${q && !texte(s).includes(q) ? 'hidden' : ''}>
        <input type="radio" name="nc-structure" value="${echapper(s.code)}" ${v.code === s.code ? 'checked' : ''}>
        <span class="csw-type-ic" aria-hidden="true">${icon('building', 18)}</span>
        <span><b>${echapper(s.nom)}</b><small>${echapper(t)}${s.region ? ' · ' + echapper(s.region) : ''}${s.depotVente ? ' · dépôt-vente' : ''}</small></span>
        <span class="coche-choix-admin" aria-hidden="true">✓</span>
      </label>`; }).join('') || '<p class="csw-aide">Aucune structure enregistrée.</p>'}
    </div>
    <p class="csw-aide ncw-aucune" ${q && !liste.some(s => texte(s).includes(q)) ? '' : 'hidden'}>Aucune structure ne correspond à cette recherche.</p>`;
}
function etapeNcProduits(v, s){
  const t = typeNc(s);
  const optionsProduits = state.produits.map(p => { const pu = prixUnitaireNc(p, s); return `<option value="${echapper(p.nom)}">${echapper(p.nom)}${pu != null ? ' — ' + formaterMontant(pu) : ''} · stock ${parseInt(p.stock, 10) || 0}</option>`; }).join('');
  let total = 0, totalConnu = true;
  const lignes = state.ncLignes.map((l, i) => {
    const p = state.produits.find(x => x.nom === l.produit);
    const stock = p ? parseInt(p.stock, 10) || 0 : null;
    const insuffisant = stock !== null && l.quantite > stock;
    const pu = prixUnitaireNc(p, s);
    if(pu == null) totalConnu = false; else total += pu * l.quantite;
    return `<tr class="${insuffisant ? 'ko' : ''}"><td><b>${echapper(l.produit)}</b>${insuffisant ? `<small>Stock disponible : ${stock}</small>` : ''}</td>
      <td class="num">${l.quantite}</td><td class="num">${pu != null ? formaterMontant(pu) : '—'}</td><td class="num">${pu != null ? formaterMontant(pu * l.quantite) : '—'}</td>
      <td><button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-nc-retirer-ligne="${i}" aria-label="Retirer">${icon('x', 14)}</button></td></tr>`;
  }).join('');
  return `
    <div class="ncw-ajout">
      <select class="input" id="nc-produit-select" aria-label="Produit">${optionsProduits}</select>
      <input class="input" id="nc-produit-qte" type="number" min="1" value="1" aria-label="Quantité">
      <button type="button" class="btn btn-secondary" data-nc-ajouter-ligne>${icon('plus', 15)}Ajouter</button>
    </div>
    ${state.ncLignes.length ? `<table class="ncw-lignes"><thead><tr><th>Produit</th><th class="num">Qté</th><th class="num">Prix unit.</th><th class="num">Total</th><th></th></tr></thead><tbody>${lignes}</tbody>
      ${sansPaiementNc(s) ? '' : `<tfoot><tr><td colspan="3">Montant estimé${totalConnu ? '' : ' (partiel)'}</td><td class="num">${formaterMontant(total)}</td><td></td></tr></tfoot>`}</table>`
      : '<div class="csw-info"><span class="csw-type-ic">' + icon('package', 18) + '</span><span><b>Aucun produit ajouté</b><small>Choisissez un produit et sa quantité, puis « Ajouter ».</small></span></div>'}
    ${t === 'Projets' ? `<div class="csw-info"><span class="csw-type-ic">${icon('alert', 18)}</span><span><b>Structure Projets</b><small>Une quantité supérieure au stock est autorisée (commande par prévision).</small></span></div>` : ''}
    ${sansPaiementNc(s) ? `<p class="csw-aide">${echapper(t)} : aucun paiement ni prix pour cette structure.</p>` : `<p class="csw-aide">Tarif ${t === 'RNum' ? 'vente solidaire (RNum)' : 'standard'} de base — un tarif personnalisé éventuel s’applique au calcul final.</p>`}`;
}
function etapeNcLivraison(v, s){
  const t = typeNc(s);
  const nbUnites = state.ncLignes.reduce((n, l) => n + (parseInt(l.quantite, 10) || 0), 0);
  const personnes = v.personnes;
  const blocPersonnes = `
    <section class="csw-section">
      <h4>Personnes accompagnées ${t === 'BO' ? '*' : '<em>(facultatif)</em>'}</h4>
      ${t === 'BO' ? `<p class="csw-aide" style="margin:0">Une personne par appareil${nbUnites ? ` — ${nbUnites} attendue${nbUnites > 1 ? 's' : ''}` : ''}. La date de naissance sert aux attestations.</p>` : ''}
      <div class="ncw-personnes">
        ${personnes.map((p, i) => `
        <div class="ncw-personne">
          <span data-ill="personne" class="ill"></span>
          <input class="input" data-nc-pers="${i}" data-champ="prenom" placeholder="Prénom" value="${echapper(p.prenom)}" aria-label="Prénom">
          <input class="input" data-nc-pers="${i}" data-champ="nom" placeholder="NOM" value="${echapper(p.nom)}" aria-label="Nom">
          <input class="input" data-nc-pers="${i}" data-champ="naissance" placeholder="jj/mm/aaaa" inputmode="numeric" maxlength="10" value="${echapper(p.naissance)}" aria-label="Date de naissance">
          <button type="button" class="btn btn-ghost btn-icon" style="width:28px;height:28px" data-nc-pers-retirer="${i}" aria-label="Retirer">${icon('x', 14)}</button>
        </div>`).join('')}
      </div>
      <div><button type="button" class="btn btn-secondary" data-nc-pers-ajouter>${icon('plus', 14)}Ajouter une personne</button></div>
    </section>`;
  return `
    ${blocPersonnes}
    <section class="csw-section">
      <h4>Mode de livraison <em>(peut être choisi plus tard, à la préparation)</em></h4>
      <div class="ml-cartes" role="radiogroup" aria-label="Mode de livraison">${MODES_LIVRAISON.map(md => `
        <button type="button" role="radio" class="ml-carte${v.modeLivraison === md.valeur ? ' choisi' : ''}" aria-checked="${v.modeLivraison === md.valeur}" data-nc-mode="${echapper(md.valeur)}">
          <span class="ml-ill">${illustrationModeLivraison(md.valeur, 54)}</span>
          <b>${echapper(md.label)}</b><small>${echapper(md.aide)}</small>
          <span class="coche-choix-admin" aria-hidden="true">✓</span>
        </button>`).join('')}</div>
    </section>
    <section class="csw-section">
      <h4>Échéance</h4>
      <div class="csw-grille">
        <label class="csw-option${v.urgent ? ' choisi' : ''} csw-large" style="padding:12px 14px"><span class="rp-switch"><input type="checkbox" data-nc="urgent" ${v.urgent ? 'checked' : ''}><span class="rp-switch-piste"></span></span><span class="csw-option-txt"><b>Urgente — dès que possible</b><small>La commande apparaît en tête, avec le badge « Urgent ».</small></span></label>
        ${v.urgent ? '' : `<div class="field"><label for="nc-date-souhaitee">Date de livraison souhaitée <em>(facultatif)</em></label><input class="input" type="date" id="nc-date-souhaitee" data-nc="dateSouhaitee" value="${echapper(v.dateSouhaitee)}"></div>`}
        <div class="field"><label for="nc-responsable">Personne prescriptrice</label><input class="input" id="nc-responsable" data-nc="responsable" value="${echapper(v.responsable)}" placeholder="${echapper((s && s.responsable) || 'Prénom NOM')}"></div>
      </div>
    </section>`;
}
function etapeNcPaiement(v, s){
  const t = typeNc(s);
  const moyens = moyensNc(s);
  let blocMoyen = '';
  if(s && s.depotVente) blocMoyen = `<div class="csw-info"><span class="csw-type-ic">${icon('check', 18)}</span><span><b>Mise en dépôt</b><small>Structure en dépôt-vente : rien à payer à la commande, le matériel reste à Emmaüs Connect jusqu’à sa vente.</small></span></div>`;
  else if(sansPaiementNc(s)) blocMoyen = `<div class="csw-info"><span class="csw-type-ic">${icon('check', 18)}</span><span><b>Aucun paiement</b><small>Structure ${echapper(t)} : ni paiement, ni facture.</small></span></div>`;
  else if(t === 'RNum') blocMoyen = `<div class="csw-info"><span class="csw-type-ic">${iconeMoyenPaiementAdmin('Virement', 20)}</span><span><b>Virement (RNum uniquement)</b><small>Moyen imposé pour la vente solidaire : devis puis facture.</small></span></div>`;
  else blocMoyen = `
    <div class="csw-moyens" role="radiogroup" aria-label="Moyen de paiement">
      ${t === 'Projets' ? `<label class="csw-moyen${!v.moyenPaiement ? ' choisi' : ''}"><input type="radio" name="nc-moyen" value="" ${!v.moyenPaiement ? 'checked' : ''}><span class="csw-type-ic">${icon('clock', 18)}</span><span><b>À définir plus tard</b><small>Fixé par l’équipe à la validation.</small></span><span class="coche-choix-admin" aria-hidden="true">✓</span></label>` : ''}
      ${moyens.map(mo => { const a = AIDE_MOYENS_PAIEMENT[mo] || { ic: 'receipt', txt: '' }; return `
      <label class="csw-moyen${v.moyenPaiement === mo ? ' choisi' : ''}"><input type="radio" name="nc-moyen" value="${echapper(mo)}" ${v.moyenPaiement === mo ? 'checked' : ''}><span class="csw-type-ic">${iconeMoyenPaiementAdmin(mo, 20)}</span><span><b>${echapper(mo)}</b>${a.txt ? `<small>${echapper(a.txt)}</small>` : ''}</span><span class="coche-choix-admin" aria-hidden="true">✓</span></label>`; }).join('')}
    </div>`;
  const nbPersonnes = v.personnes.filter(p => (p.prenom + p.nom).trim()).length;
  return `
    <section class="csw-section"><h4>Moyen de paiement${t === 'BO' ? ' *' : ''}</h4>${blocMoyen}
      ${t === 'BO' && v.moyenPaiement === 'Paiement en ligne (CB)' && nbPersonnes > 1 ? `<label class="csw-option${v.paiementSepare ? ' choisi' : ''}" style="padding:12px 14px"><span class="rp-switch"><input type="checkbox" data-nc="paiementSepare" ${v.paiementSepare ? 'checked' : ''}><span class="rp-switch-piste"></span></span><span class="csw-option-txt"><b>Un lien de paiement par personne</b><small>Chaque personne règle sa part ; sinon un seul lien pour toute la commande.</small></span></label>` : ''}
    </section>
    <section class="csw-section"><h4>Suivi</h4>
      <div class="csw-grille">
        ${sansPaiementNc(s) ? '' : `<div class="field"><label for="nc-statut-paiement">Statut du paiement</label><select class="input" id="nc-statut-paiement" data-nc="statutPaiement">${['Non payé', 'Payé'].map(x => `<option ${v.statutPaiement === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`}
        <div class="field"><label for="nc-statut">Statut de départ</label><select class="input" id="nc-statut" data-nc="statutCommande">${ORDER_STATUSES.map(x => `<option value="${echapper(x)}" ${v.statutCommande === x ? 'selected' : ''}>${echapper(x)}</option>`).join('')}</select></div>
        <div class="field csw-large"><label for="nc-commentaire">Commentaire <em>(facultatif)</em></label><textarea class="input" id="nc-commentaire" data-nc="commentaire" rows="3">${echapper(v.commentaire)}</textarea></div>
      </div>
      <div class="csw-cases">
        ${(t === 'RNum' || t === 'Projets') ? `<label><input type="checkbox" data-nc="demandeDevis" ${v.demandeDevis ? 'checked' : ''}>Devis demandé par la structure</label>` : ''}
        <label><input type="checkbox" data-nc="notifier" ${v.notifier ? 'checked' : ''}>Envoyer l’e-mail de confirmation à la structure</label>
      </div>
    </section>`;
}
function libellePersonneNc(p){ return [p.prenom.trim(), p.nom.trim().toUpperCase()].filter(Boolean).join(' ') + (p.naissance.trim() ? ' — ' + p.naissance.trim() : ''); }
function etapeNcRecap(v, s){
  const bloc = (i, titre, lignes) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-nc-aller="${i}">Modifier</button></div>
    ${lignes.filter(l => l).map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`).join('')}</section>`;
  const total = state.ncLignes.reduce((n, l) => { const pu = prixUnitaireNc(state.produits.find(x => x.nom === l.produit), s); return pu == null ? n : n + pu * l.quantite; }, 0);
  const personnes = v.personnes.filter(p => (p.prenom + p.nom).trim());
  const mode = MODES_LIVRAISON.find(md => md.valeur === v.modeLivraison);
  const moyen = (s && s.depotVente) ? 'Mise en dépôt (payé à la vente)' : sansPaiementNc(s) ? 'Aucun paiement' : typeNc(s) === 'RNum' ? 'Virement (RNum uniquement)' : (v.moyenPaiement || 'À définir');
  return `<div class="csw-recap">
    ${bloc(0, 'Structure', [['Nom', s && s.nom], ['Type', typeNc(s)], ['E-mail', s && s.email]])}
    ${bloc(1, 'Produits', [...state.ncLignes.map(l => [l.produit, '× ' + l.quantite]), sansPaiementNc(s) ? null : ['Montant estimé', formaterMontant(total)]])}
    ${bloc(2, 'Personnes & livraison', [['Personnes', personnes.length ? personnes.map(p => libellePersonneNc(p).split(' — ')[0]).join(', ') : ''], ['Livraison', mode ? mode.label : 'À définir'], ['Échéance', v.urgent ? 'Urgente' : (v.dateSouhaitee ? isoVersFrNc(v.dateSouhaitee) : '')], ['Prescripteur', v.responsable || (s && s.responsable)]])}
    ${bloc(3, 'Paiement & suivi', [['Moyen', moyen], sansPaiementNc(s) ? null : ['Paiement', v.statutPaiement + (v.paiementSepare ? ' · un lien par personne' : '')], ['Statut', v.statutCommande], v.demandeDevis ? ['Devis', 'Demandé'] : null, ['E-mail structure', v.notifier ? 'Envoyé' : 'Non'], ['Commentaire', v.commentaire]])}
  </div>`;
}
function isoVersFrNc(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ''); }
function verifierEtapeCommande(i){
  const v = state.modal.v, s = structureNc();
  const cle = ETAPES_COMMANDE[i].cle;
  if(cle === 'structure' && !s) return 'Choisissez une structure.';
  if(cle === 'produits'){
    if(!state.ncLignes.length) return 'Ajoutez au moins un produit.';
    if(typeNc(s) !== 'Projets'){
      const insuffisantes = state.ncLignes.filter(l => { const p = state.produits.find(x => x.nom === l.produit); return p && l.quantite > (parseInt(p.stock, 10) || 0); });
      if(insuffisantes.length) return `Stock insuffisant pour : ${insuffisantes.map(l => l.produit).join(', ')}. Seules les structures Projets peuvent commander au-delà du stock.`;
    }
  }
  if(cle === 'livraison'){
    const remplies = v.personnes.filter(p => (p.prenom + p.nom + p.naissance).trim());
    if(remplies.some(p => !p.prenom.trim() || !p.nom.trim())) return 'Chaque personne doit avoir un prénom et un nom.';
    if(remplies.some(p => p.naissance.trim() && !/^\d{2}\/\d{2}\/\d{4}$/.test(p.naissance.trim()))) return 'Date de naissance au format jj/mm/aaaa.';
    if(typeNc(s) === 'BO' && !remplies.length) return 'Ajoutez au moins une personne accompagnée (bon d’orientation).';
  }
  if(cle === 'paiement' && typeNc(s) === 'BO' && !v.moyenPaiement) return 'Choisissez un moyen de paiement.';
  return '';
}
function allerEtapeCommande(cible){
  const m = state.modal;
  if(cible > m.etape){
    for(let i = m.etape; i < cible; i++){ const err = verifierEtapeCommande(i); if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; } }
  }
  m.etape = Math.max(0, Math.min(ETAPES_COMMANDE.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps'); if(corps) corps.scrollTop = 0;
}
document.addEventListener('click', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-commande' || !m.v) return;
  const aller = e.target.closest('[data-nc-aller]');
  if(aller){ allerEtapeCommande(parseInt(aller.dataset.ncAller, 10)); return; }
  if(e.target.closest('[data-nc-suivant]')){ allerEtapeCommande(m.etape + 1); return; }
  if(e.target.closest('[data-nc-precedent]')){ allerEtapeCommande(m.etape - 1); return; }
  const mode = e.target.closest('[data-nc-mode]');
  if(mode){ m.v.modeLivraison = m.v.modeLivraison === mode.dataset.ncMode ? '' : mode.dataset.ncMode; render(); return; }
  if(e.target.closest('[data-nc-pers-ajouter]')){
    m.v.personnes.push({ prenom: '', nom: '', naissance: '' }); render();
    const champs = document.querySelectorAll('[data-nc-pers][data-champ="prenom"]'); if(champs.length) champs[champs.length - 1].focus();
    return;
  }
  const retirer = e.target.closest('[data-nc-pers-retirer]');
  if(retirer){ m.v.personnes.splice(parseInt(retirer.dataset.ncPersRetirer, 10), 1); render(); return; }
});
document.addEventListener('input', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-commande' || !m.v) return;
  const el = e.target;
  if(el.id === 'nc-recherche'){
    m.v.recherche = el.value;
    const q = el.value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll('.ncw-structure').forEach(l => { const ok = !q || l.dataset.texte.includes(q); l.hidden = !ok; if(ok) n++; });
    const vide = document.querySelector('.ncw-aucune'); if(vide) vide.hidden = n > 0;
    return;
  }
  if(el.dataset.ncPers != null){
    const p = m.v.personnes[parseInt(el.dataset.ncPers, 10)]; if(!p) return;
    if(el.dataset.champ === 'prenom'){ const pos = el.selectionStart; el.value = capitaliserPrenom(el.value); el.setSelectionRange(pos, pos); }
    if(el.dataset.champ === 'nom'){ const pos = el.selectionStart; el.value = el.value.toUpperCase(); el.setSelectionRange(pos, pos); }
    if(el.dataset.champ === 'naissance'){ const ch = el.value.replace(/\D/g, '').slice(0, 8); el.value = [ch.slice(0, 2), ch.slice(2, 4), ch.slice(4)].filter(Boolean).join('/'); }
    p[el.dataset.champ] = el.value;
    return;
  }
  if(el.dataset.nc && el.type !== 'checkbox') m.v[el.dataset.nc] = el.value;
});
document.addEventListener('change', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-commande' || !m.v) return;
  const el = e.target;
  if(el.name === 'nc-structure'){
    if(m.v.code !== el.value){ m.v.code = el.value; state.ncCode = el.value; m.v.moyenPaiement = ''; m.v.paiementSepare = false; m.vues = 0; }
    render(); return;
  }
  if(el.name === 'nc-moyen'){ m.v.moyenPaiement = el.value; if(el.value !== 'Paiement en ligne (CB)') m.v.paiementSepare = false; render(); return; }
  if(el.dataset.nc){ m.v[el.dataset.nc] = el.type === 'checkbox' ? el.checked : el.value; if(el.type === 'checkbox' || el.tagName === 'SELECT') render(); }
});
async function enregistrerCommande(){
  const m = state.modal, v = m.v;
  for(let i = 0; i < ETAPES_COMMANDE.length - 1; i++){
    const err = verifierEtapeCommande(i);
    if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; }
  }
  const s = structureNc();
  const t = typeNc(s);
  const personnes = v.personnes.filter(p => (p.prenom + p.nom).trim()).map(libellePersonneNc);
  const donnees = {
    action: 'commande-create-manuelle',
    code: s.code,
    lignes: state.ncLignes,
    statutCommande: v.statutCommande,
    statutPaiement: sansPaiementNc(s) ? '' : v.statutPaiement,
    moyenPaiement: sansPaiementNc(s) ? '' : (t === 'RNum' ? 'Virement (RNum uniquement)' : v.moyenPaiement),
    paiementSepare: !!(v.paiementSepare && personnes.length > 1 && v.moyenPaiement === 'Paiement en ligne (CB)'),
    personnes,
    modeLivraison: v.modeLivraison,
    dateLivraisonSouhaitee: v.urgent ? 'ASAP' : isoVersFrNc(v.dateSouhaitee),
    responsableCommande: (v.responsable || '').trim(),
    demandeDevis: !!v.demandeDevis,
    notifierStructure: !!v.notifier,
    commentaire: (v.commentaire || '').trim(),
    urlSuivi: '', urlPortail: ''
  };
  $('cc-enregistrer').disabled = true;
  try{
    const r = await posterEtat(donnees, 'Création…', 'Commande créée');
    if(r.ok){
      const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
      if(rc.ok) state.commandes = rc.commandes;
      // Créée depuis un devis libre (bouton "Générer la commande liée") : rattache
      // automatiquement le nouveau devis à cette commande fraîchement créée.
      if(m.rattacherDevisLigne){
        const nouvelleCommande = state.commandes.find(c => c.reference === r.reference);
        if(nouvelleCommande){
          await poster({ action: 'devis-rattacher-commande', ligneDevis: m.rattacherDevisLigne, ligneCommande: nouvelleCommande.ligne });
          const rd = await jsonp({ action: 'devis', password: motDePasse, limite: 0 });
          if(rd.ok) state.devis = rd.devis;
        }
      }
      state.modal = null; state.ncLignes = []; state.ncCode = ''; render();
    }else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('cc-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>'; const b = $('cc-enregistrer'); if(b) b.disabled = false; }
}

/* ════════════════════════════════════════════════════════════════════════════════════
   Nouveau SAV (saisi par l'équipe) — même assistant en étapes que la nouvelle commande, et
   mêmes étapes que le formulaire SAV du portail : Demandeur → Problème (cartes symptôme) →
   Appareil → Précisions → Récapitulatif.
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_SAV = [
  { cle: 'demandeur', titre: 'Demandeur', ill: 'structures', h: 'Qui fait la demande ?', p: 'La structure concernée (ou une personne sans structure), et comment la joindre.' },
  { cle: 'probleme', titre: 'Problème', ill: 'panne', h: 'Quel est le problème ?', p: 'Les mêmes cartes que le formulaire SAV du portail.' },
  { cle: 'appareil', titre: 'Appareil', ill: 'passeport', h: 'Quel appareil ?', p: 'Le numéro de série relie le dossier à sa commande d’origine et à son passeport.' },
  { cle: 'precisions', titre: 'Précisions', ill: 'aide', h: 'Des précisions ?', p: 'Commentaire, photo ou vidéo : tout ce qui aide au diagnostic. Facultatif.' },
  { cle: 'recap', titre: 'Récapitulatif', ill: 'attestations', h: 'Tout est bon ?', p: 'Relisez avant de créer — chaque bloc se modifie d’un clic.' },
];
function valeursInitialesSav(){
  return { code: '', sansStructure: false, recherche: '', nom: '', nomBeneficiaire: '', responsableSav: '', email: '', telephone: '',
    symptome: '', symptomeAutre: '', numeroSerie: '', marque: '', modele: '', dateAchat: '', referenceFacture: '',
    commentaire: '', lienVideo: '', photo: null };
}
function chargerSymptomesSav(){
  if(state.symptomesSav || state.symptomesSavEnCours) return;
  state.symptomesSavEnCours = true;
  jsonp({ action: 'sav-symptomes' }).then(r => { state.symptomesSav = r.ok ? r.symptomes : []; }).catch(() => { state.symptomesSav = []; })
    .finally(() => { state.symptomesSavEnCours = false; if(state.modal && state.modal.kind === 'creer-sav') render(); });
}
function numerosSerieStructureSav(code){
  if(!code) return [];
  const liste = [];
  (state.commandes || []).filter(c => c.code === code && c.statutCommande === 'Livrée').forEach(c => String(c.numerosSerie || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(sn => liste.push({ sn, ref: c.reference, date: c.dateLivraison || c.date })));
  return liste;
}
function vueCreerSav(){
  const m = state.modal;
  if(!m.v) m.v = valeursInitialesSav();
  if(m.etape == null) m.etape = 0;
  if(m.vues == null) m.vues = 0;
  chargerSymptomesSav();
  const v = m.v, s = state.structures.find(x => x.code === v.code);
  const et = ETAPES_SAV[m.etape];
  const derniere = m.etape === ETAPES_SAV.length - 1;
  const frise = ETAPES_SAV.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-ns-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = { demandeur: etapeNsDemandeur, probleme: etapeNsProbleme, appareil: etapeNsAppareil, precisions: etapeNsPrecisions, recap: etapeNsRecap }[et.cle](v, s);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw ncw" role="dialog" aria-modal="true" aria-labelledby="nsw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">Nouveau SAV · étape ${m.etape + 1} sur ${ETAPES_SAV.length}</div>
            <h2 class="csw-titre" id="nsw-titre">${s ? echapper(s.nom) : (v.nom ? echapper(v.nom) : 'Nouveau SAV')}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <ol class="csw-frise fc2-frise">${frise}</ol>
        <div class="csw-corps">
          <div class="csw-intro"><span data-ill="${et.ill}" class="ill xl"></span><div><h3>${echapper(et.h)}</h3><p>${echapper(et.p)}</p></div></div>
          ${corps}
        </div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions csw-pied">
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-ns-precedent>← Précédent</button>' : ''}
          ${!derniere ? '<button type="button" class="btn btn-primary" data-ns-suivant>Suivant →</button>' : '<button type="button" class="btn btn-primary" id="ns-enregistrer">Créer le SAV</button>'}
        </div>
      </div>
    </div>`;
}
function etapeNsDemandeur(v, s){
  const liste = state.structures.slice().sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
  const q = String(v.recherche || '').trim().toLowerCase();
  const texte = x => (x.nom + ' ' + x.code + ' ' + typeStructure(x) + ' ' + (x.region || '')).toLowerCase();
  return `
    <section class="csw-section">
      <h4>Structure</h4>
      <label class="csw-option${v.sansStructure ? ' choisi' : ''}" style="padding:12px 14px"><span class="rp-switch"><input type="checkbox" data-ns="sansStructure" ${v.sansStructure ? 'checked' : ''}><span class="rp-switch-piste"></span></span><span class="csw-option-txt"><b>Sans structure</b><small>Une personne qui s’adresse directement à Emmaüs Connect.</small></span></label>
      ${v.sansStructure ? '' : `
      <input class="input" id="ns-recherche" type="search" placeholder="Rechercher une structure (nom, code, type, région)…" autocomplete="off" value="${echapper(v.recherche || '')}">
      <div class="ncw-structures ncw-structures-court" role="radiogroup" aria-label="Structure">
        ${liste.map(x => `
        <label class="csw-moyen ncw-structure${v.code === x.code ? ' choisi' : ''}" data-texte="${echapper(texte(x))}" ${q && !texte(x).includes(q) ? 'hidden' : ''}>
          <input type="radio" name="ns-structure" value="${echapper(x.code)}" ${v.code === x.code ? 'checked' : ''}>
          <span class="csw-type-ic" aria-hidden="true">${icon('building', 18)}</span>
          <span><b>${echapper(x.nom)}</b><small>${echapper(typeStructure(x))}${x.region ? ' · ' + echapper(x.region) : ''}</small></span>
          <span class="coche-choix-admin" aria-hidden="true">✓</span>
        </label>`).join('')}
      </div>`}
    </section>
    <section class="csw-section">
      <h4>Contact</h4>
      <div class="csw-grille">
        <div class="field"><label for="ns-nom">${v.sansStructure ? 'Nom de la personne *' : 'Nom affiché (structure) *'}</label><input class="input" id="ns-nom" data-ns="nom" value="${echapper(v.nom)}" placeholder="${v.sansStructure ? 'Prénom NOM' : echapper((s && s.nom) || '')}"></div>
        ${v.sansStructure ? '' : `<div class="field"><label for="ns-beneficiaire">Personne accompagnée <em>(facultatif)</em></label><input class="input" id="ns-beneficiaire" data-ns="nomBeneficiaire" value="${echapper(v.nomBeneficiaire)}" placeholder="Prénom NOM"></div>`}
        ${v.sansStructure ? '' : `<div class="field"><label for="ns-responsable">Responsable du SAV <em>(facultatif)</em></label><input class="input" id="ns-responsable" data-ns="responsableSav" value="${echapper(v.responsableSav)}" placeholder="${echapper((s && s.responsable) || 'Prénom NOM')}"></div>`}
        <div class="field"><label for="ns-email">E-mail *</label><input class="input" id="ns-email" type="email" data-ns="email" value="${echapper(v.email)}"></div>
        <div class="field"><label for="ns-telephone">Téléphone <em>(facultatif)</em></label><input class="input" id="ns-telephone" data-ns="telephone" value="${echapper(v.telephone)}"></div>
      </div>
    </section>`;
}
function etapeNsProbleme(v){
  if(!state.symptomesSav) return '<p class="csw-aide"><span class="spinner-inline"></span>Chargement des symptômes…</p>';
  const cartes = state.symptomesSav.map(sy => { const f = familleCouleurSymptomeAdmin(sy); const cle = window.cleSymptomeCvdl ? window.cleSymptomeCvdl(sy) : 'generique_sav'; return `
    <label class="nsw-sym${v.symptome === sy ? ' choisi' : ''}" style="--c-bg:${f.bg};--c-fg:${f.fg}">
      <input type="radio" name="ns-symptome" value="${echapper(sy)}" ${v.symptome === sy ? 'checked' : ''}>
      <span class="rpd-sym-ill">${window.illustrationCvdl ? window.illustrationCvdl('sym-' + cle, 52) : icon('alert', 26)}</span>
      <span>${echapper(sy)}</span>
      <span class="coche-choix-admin" aria-hidden="true">✓</span>
    </label>`; }).join('');
  return `
    <div class="nsw-syms" role="radiogroup" aria-label="Symptôme">${cartes}
      <label class="nsw-sym${v.symptome === '__autre' ? ' choisi' : ''}" style="--c-bg:var(--th-bg-eef2f5ff, #EEF2F5);--c-fg:var(--th-tx-002743ff, #002743)">
        <input type="radio" name="ns-symptome" value="__autre" ${v.symptome === '__autre' ? 'checked' : ''}>
        <span class="rpd-sym-ill">${window.illustrationCvdl ? window.illustrationCvdl('sym-generique_sav', 52) : icon('wrench', 26)}</span>
        <span>Autre problème</span>
        <span class="coche-choix-admin" aria-hidden="true">✓</span>
      </label>
    </div>
    ${v.symptome === '__autre' ? `<div class="field" style="margin:0"><label for="ns-symptome-autre">Décrire le problème *</label><input class="input" id="ns-symptome-autre" data-ns="symptomeAutre" value="${echapper(v.symptomeAutre)}"></div>` : ''}`;
}
function etapeNsAppareil(v, s){
  const suggestions = numerosSerieStructureSav(v.code);
  const cmd = v.numeroSerie ? (state.commandes || []).find(c => String(c.numerosSerie || '').split('\n').map(x => x.trim().toLowerCase()).includes(v.numeroSerie.trim().toLowerCase())) : null;
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label for="ns-numero-serie">Numéro de série <em>(recommandé)</em></label>
        <input class="input" id="ns-numero-serie" data-ns="numeroSerie" value="${echapper(v.numeroSerie)}" autocomplete="off" spellcheck="false" ${suggestions.length ? 'list="ns-sn-liste"' : ''} placeholder="${suggestions.length ? 'Saisir ou choisir parmi les appareils livrés à la structure' : 'Ex : PF3XK2A1'}">
        ${suggestions.length ? `<datalist id="ns-sn-liste">${suggestions.map(x => `<option value="${echapper(x.sn)}">${echapper(x.ref)}</option>`).join('')}</datalist>` : ''}
        <div class="nsw-cmd">${cmd ? `${icon('package', 13)}Commande d’origine : <b>${echapper(cmd.reference)}</b>${cmd.statutCommande !== 'Livrée' ? ` <span class="ko">— pas encore livrée : le SAV sera refusé</span>` : ''}` : (v.numeroSerie ? 'Aucune commande trouvée pour ce numéro — le dossier sera créé sans lien.' : '')}</div>
      </div>
      <div class="field"><label for="ns-marque">Marque <em>(sinon reprise de tec.tech)</em></label><input class="input" id="ns-marque" data-ns="marque" value="${echapper(v.marque)}"></div>
      <div class="field"><label for="ns-modele">Modèle</label><input class="input" id="ns-modele" data-ns="modele" value="${echapper(v.modele)}"></div>
      <div class="field"><label for="ns-date-achat">Date d’achat <em>(pour la garantie)</em></label><input class="input" type="date" id="ns-date-achat" data-ns="dateAchat" value="${echapper(v.dateAchat)}"></div>
      <div class="field"><label for="ns-facture">Référence facture <em>(facultatif)</em></label><input class="input" id="ns-facture" data-ns="referenceFacture" value="${echapper(v.referenceFacture)}"></div>
    </div>`;
}
function etapeNsPrecisions(v){
  return `
    <div class="csw-grille">
      <div class="field csw-large"><label for="ns-commentaire">Commentaire</label><textarea class="input" id="ns-commentaire" data-ns="commentaire" rows="3" placeholder="Depuis quand, dans quelles circonstances…">${echapper(v.commentaire)}</textarea></div>
      <div class="field"><label for="ns-video">Lien vers une vidéo</label><input class="input" id="ns-video" data-ns="lienVideo" value="${echapper(v.lienVideo)}" placeholder="https://…"></div>
      <div class="field"><label for="ns-photo">Photo</label>
        ${v.photo ? `<div class="nsw-photo">${icon('eye', 14)}<span>${echapper(v.photo.nom)}</span><button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-ns-photo-retirer aria-label="Retirer la photo">${icon('x', 14)}</button></div>`
          : '<input class="input" type="file" id="ns-photo" accept="image/*">'}</div>
    </div>`;
}
function symptomeNs(v){ return v.symptome === '__autre' ? v.symptomeAutre.trim() : v.symptome; }
function etapeNsRecap(v, s){
  const bloc = (i, titre, lignes) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-ns-aller="${i}">Modifier</button></div>
    ${lignes.filter(l => l).map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`).join('')}</section>`;
  return `<div class="csw-recap">
    ${bloc(0, 'Demandeur', [['Structure', v.sansStructure ? 'Sans structure' : (s && s.nom)], ['Nom', v.nom], v.sansStructure ? null : ['Personne', v.nomBeneficiaire], ['E-mail', v.email], ['Téléphone', v.telephone]])}
    <section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>Problème</h4><button type="button" class="et-lien" data-ns-aller="1">Modifier</button></div>${carteSymptomeSav(symptomeNs(v))}</section>
    ${bloc(2, 'Appareil', [['N° de série', v.numeroSerie], ['Modèle', [v.marque, v.modele].filter(Boolean).join(' ')], ['Date d’achat', v.dateAchat ? isoVersFrNc(v.dateAchat) : ''], ['Facture', v.referenceFacture]])}
    ${bloc(3, 'Précisions', [['Commentaire', v.commentaire], ['Vidéo', v.lienVideo], ['Photo', v.photo ? v.photo.nom : '']])}
  </div>`;
}
function verifierEtapeSav(i){
  const v = state.modal.v;
  const cle = ETAPES_SAV[i].cle;
  if(cle === 'demandeur'){
    if(!v.sansStructure && !v.code) return 'Choisissez la structure (ou « Sans structure »).';
    if(!v.nom.trim()) return 'Le nom est obligatoire.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return 'Une adresse e-mail valide est obligatoire.';
  }
  if(cle === 'probleme' && !symptomeNs(v)) return v.symptome === '__autre' ? 'Décrivez le problème.' : 'Choisissez un symptôme.';
  if(cle === 'precisions' && v.lienVideo.trim() && !/^https?:\/\/\S+$/i.test(v.lienVideo.trim())) return 'Le lien vidéo doit commencer par https://';
  return '';
}
function allerEtapeSav(cible){
  const m = state.modal;
  if(cible > m.etape){
    for(let i = m.etape; i < cible; i++){ const err = verifierEtapeSav(i); if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; } }
  }
  m.etape = Math.max(0, Math.min(ETAPES_SAV.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps'); if(corps) corps.scrollTop = 0;
}
document.addEventListener('click', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-sav' || !m.v) return;
  const aller = e.target.closest('[data-ns-aller]');
  if(aller){ allerEtapeSav(parseInt(aller.dataset.nsAller, 10)); return; }
  if(e.target.closest('[data-ns-suivant]')){ allerEtapeSav(m.etape + 1); return; }
  if(e.target.closest('[data-ns-precedent]')){ allerEtapeSav(m.etape - 1); return; }
  if(e.target.closest('[data-ns-photo-retirer]')){ m.v.photo = null; render(); return; }
});
document.addEventListener('input', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-sav' || !m.v) return;
  const el = e.target;
  if(el.id === 'ns-recherche'){
    m.v.recherche = el.value;
    const q = el.value.trim().toLowerCase();
    document.querySelectorAll('.ncw-structure').forEach(l => { l.hidden = !!q && !l.dataset.texte.includes(q); });
    return;
  }
  if(el.dataset.ns && el.type !== 'checkbox' && el.type !== 'file') m.v[el.dataset.ns] = el.value;
});
document.addEventListener('change', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-sav' || !m.v) return;
  const el = e.target, v = m.v;
  if(el.name === 'ns-structure'){
    const st = state.structures.find(x => x.code === el.value);
    const ancienne = state.structures.find(x => x.code === v.code);
    v.code = el.value;
    // Préremplissage depuis la fiche structure (sans écraser une saisie différente).
    if(st){
      if(!v.nom || (ancienne && v.nom === ancienne.nom)) v.nom = st.nom || '';
      if(!v.email || (ancienne && v.email === ancienne.email)) v.email = st.email || '';
      if(!v.telephone || (ancienne && v.telephone === ancienne.telephone)) v.telephone = st.telephone || '';
    }
    render(); return;
  }
  if(el.name === 'ns-symptome'){ v.symptome = el.value; render(); return; }
  if(el.id === 'ns-photo' && el.files && el.files[0]){
    const f = el.files[0];
    if(f.size > 10 * 1024 * 1024){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">La photo dépasse 10 Mo.</div>'; el.value = ''; return; }
    const lecteur = new FileReader();
    lecteur.onload = () => { v.photo = { nom: f.name, type: f.type, base64: String(lecteur.result).split(',')[1] || '' }; render(); };
    lecteur.readAsDataURL(f);
    return;
  }
  if(el.dataset.ns === 'sansStructure'){ v.sansStructure = el.checked; if(el.checked){ v.code = ''; v.nomBeneficiaire = ''; v.responsableSav = ''; } render(); return; }
  if(el.dataset.ns === 'numeroSerie'){ v.numeroSerie = el.value.trim(); render(); }
});
async function enregistrerSav(){
  const m = state.modal, v = m.v;
  for(let i = 0; i < ETAPES_SAV.length - 1; i++){
    const err = verifierEtapeSav(i);
    if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; }
  }
  $('ns-enregistrer').disabled = true;
  const echec = msg => { etat(msg || 'Création impossible', 'erreur'); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(msg || 'Création impossible.')}</div>`; const b = $('ns-enregistrer'); if(b) b.disabled = false; };
  try{
    etat('Création…', 'chargement');
    const r = await poster({
      action: 'sav-create', nom: v.nom.trim(), email: v.email.trim(), symptome: symptomeNs(v),
      code: v.sansStructure ? '' : v.code, telephone: v.telephone.trim(),
      numeroSerie: v.numeroSerie.trim(), commentaire: v.commentaire.trim(),
      nomBeneficiaire: v.nomBeneficiaire.trim(), responsableSav: v.responsableSav.trim(),
      dateAchat: v.dateAchat ? isoVersFrNc(v.dateAchat) : '', referenceFacture: v.referenceFacture.trim(), lienVideo: v.lienVideo.trim(),
      fichiers: v.photo ? [v.photo] : []
    });
    if(!r.ok) return echec(r.erreur);
    // Marque/modèle ne sont pas acceptés à la création (sav-create) — renseignés juste après
    // via sav-update, sur le ticket qui vient d'être créé.
    const marque = v.marque.trim(), modele = v.modele.trim();
    if(marque || modele){
      const rl = await jsonp({ action: 'sav-list', password: motDePasse, limite: 1, recherche: r.reference });
      const ligne = rl.ok && rl.tickets && rl.tickets[0] ? rl.tickets[0].ligne : null;
      if(ligne){
        if(marque) await poster({ action: 'sav-update', ligne, champ: 'marque', valeur: marque });
        if(modele) await poster({ action: 'sav-update', ligne, champ: 'modele', valeur: modele });
      }
    }
    etat('Ticket créé', 'succes');
    const rs = await jsonp({ action: 'sav-list', password: motDePasse, limite: 0 });
    if(rs.ok) state.sav = rs.tickets;
    state.modal = { kind: 'sav', ref: r.reference }; state.accordeonTerminalOuvert = false; render();
  }catch(e){ echec(); }
}

/** Regroupement par catégorie déduit de l'icône du produit — même logique que la page publique
 *  categories-materiel.html, dupliquée ici volontairement (pas de module JS partagé entre
 *  l'admin et les pages publiques dans ce projet). */
const MATERIEL_CATEGORIES = [
  { id: 'ordinateurs', titre: 'Ordinateurs', icones: ['portable', 'fixe'] },
  { id: 'smartphones', titre: 'Smartphones', icones: ['telephone', 'telephone_touches'] },
  { id: 'tablettes', titre: 'Tablettes', icones: ['tablette'] },
  { id: 'ateliers', titre: 'Ateliers & accompagnement', icones: ['atelier', 'feuille'] },
  { id: 'autres', titre: 'Autres', icones: null },
];
function ouvrirOrganisationMateriel(){
  const dejaClasses = new Set();
  const groupes = {};
  MATERIEL_CATEGORIES.forEach(cat => {
    const items = cat.icones
      ? state.produits.filter(p => cat.icones.includes(p.icone))
      : state.produits.filter(p => !dejaClasses.has(p.nom));
    items.forEach(p => dejaClasses.add(p.nom));
    groupes[cat.id] = items.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(p => p.ligne);
  });
  state.materielGroupes = groupes;
  state.modal = { kind: 'organiser-materiel' };
  render();
}
function vueOrganiserMateriel(){
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(680px,94vw);max-height:88vh;overflow-y:auto">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Organiser la page "Catégories de matériel"</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:12.5px;opacity:0.6;margin:0 0 var(--space-4)">Glisser-déposer pour changer l'ordre au sein d'une catégorie. L'œil masque un produit de cette page uniquement — il reste commandable normalement.</p>
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          ${MATERIEL_CATEGORIES.map(cat => {
            const refs = state.materielGroupes[cat.id] || [];
            if(!refs.length) return '';
            return `
            <div>
              <div class="card-kicker" style="margin-bottom:8px">${echapper(cat.titre)} (${refs.length})</div>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${refs.map((ligne, i) => {
                  const p = state.produits.find(x => x.ligne === ligne);
                  if(!p) return '';
                  return `
                  <div class="card elev-sm" draggable="true" style="flex-direction:row;align-items:center;gap:10px;padding:10px 12px;cursor:grab;${p.masqueCategorieMateriel ? 'opacity:0.5' : ''}" data-materiel-carte="${ligne}" data-materiel-cat="${cat.id}" data-materiel-index="${i}">
                    <span style="opacity:0.4;display:flex;flex:none">${icon('grip', 16)}</span>
                    <span style="flex:1;font-size:13.5px;font-weight:600">${echapper(p.nom)}</span>
                    <button type="button" class="btn btn-ghost btn-icon" style="width:30px;height:30px;flex:none" data-materiel-masquer="${ligne}" title="${p.masqueCategorieMateriel ? 'Masqué de la page catégories — cliquer pour afficher' : 'Visible sur la page catégories — cliquer pour masquer'}">${icon(p.masqueCategorieMateriel ? 'eyeoff' : 'eye', 16)}</button>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
        <button type="button" class="btn btn-primary btn-block" style="margin-top:var(--space-5)" id="materiel-enregistrer">Enregistrer l'ordre</button>
      </div>
    </div>`;
}
async function enregistrerOrganisationMateriel(){
  const btn = $('materiel-enregistrer');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try{
    const appels = [];
    Object.values(state.materielGroupes).forEach(liste => {
      liste.forEach((ligne, index) => {
        const p = state.produits.find(x => x.ligne === ligne);
        if(!p) return;
        appels.push(poster({ action: 'produit-update', ligne, champ: 'ordre', valeur: index }).then(r => { p.ordre = index; return r; }));
        appels.push(poster({ action: 'produit-update', ligne, champ: 'masqueCategorieMateriel', valeur: !!p.masqueCategorieMateriel }));
      });
    });
    const reponses = await Promise.all(appels);
    if(reponses.find(r => !r.ok)){ etat('Certains changements n\'ont pas pu être enregistrés', 'erreur'); btn.disabled = false; btn.textContent = "Enregistrer l'ordre"; return; }
    etat('Ordre et couleurs enregistrés', 'succes');
    state.modal = null; render();
  }catch(e){ etat('Enregistrement impossible', 'erreur'); btn.disabled = false; btn.textContent = "Enregistrer l'ordre"; }
}
/* ════════════════════════════════════════════════════════════════════════════════════
   Nouveau produit — assistant en étapes (même principe que nouvelle commande / nouveau SAV).
   La modification d'un produit existant garde le formulaire complet (vueCreerProduit).
   Les champs gardent les mêmes identifiants (cp-…) : enregistrerProduit() lit les valeurs
   mémorisées dans state.modal.v quand l'assistant est utilisé.
   ════════════════════════════════════════════════════════════════════════════════════ */
const ETAPES_PRODUIT = [
  { cle: 'categorie', titre: 'Catégorie', ill: 'categories', h: 'Quel produit ?', p: 'Son nom, sa catégorie (elle choisit l’illustration et les caractéristiques proposées) et son groupe de commande.' },
  { cle: 'prix', titre: 'Prix et stock', ill: 'facture', h: 'Prix et stock', p: 'Le prix standard et le prix Vente solidaire / RNum, le stock de départ.' },
  { cle: 'caracteristiques', titre: 'Caractéristiques', ill: 'passeport', h: 'Caractéristiques', p: 'Ce que les structures verront dans le catalogue au moment de commander.' },
  { cle: 'comportement', titre: 'Comportement', ill: 'reglages', h: 'Comment se comporte-t-il dans une commande ?', p: 'Visibilité, numéro de série, dématérialisé, facturation en fin de mois.' },
  { cle: 'recap', titre: 'Récapitulatif', ill: 'attestations', h: 'Tout est bon ?', p: 'Relisez avant de créer — chaque bloc se modifie d’un clic.' },
];
/** Maximum par commande appliqué aux produits qui n'ont pas le leur (Réglages → Commandes). */
function quantiteMaxDefautAffiche(){ return (state.reglages && state.reglages.quantiteMaxDefaut) || 5; }
function valeursInitialesProduit(){
  return { 'cp-nom': '', 'cp-icone': '', 'cp-groupe': GROUPES_COMMANDE[0], 'cp-prix-standard': '', 'cp-prix-rn': '', 'cp-prix-revente-max': '', 'cp-stock': '0', 'cp-quantite-max': '',
    'cp-message-rupture': '', 'cp-systeme': '', 'cp-ram': '', 'cp-processeur': '', 'cp-disque': '', 'cp-donnees-mobiles': '', 'cp-sms': '', 'cp-appels': '',
    'cp-visible': true, 'cp-sans-suivi': false, 'cp-dematerialise': false, 'cp-facturation-mensuelle': false, 'cp-tectech-type': '', 'cp-tectech-categorie': '' };
}
/** Recopie dans state.modal.v ce qui est saisi à l'étape affichée. */
function memoriserEtapeProduit(){
  const m = state.modal; if(!m || !m.v) return;
  document.querySelectorAll('.cpw [id^="cp-"]').forEach(el => {
    if(!(el.id in m.v)) return;
    m.v[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
}
function categorieProduitCp(icone){
  return {
    materiel: ['portable', 'fixe', 'telephone', 'tablette'].includes(icone),
    processeur: ['portable', 'fixe', 'telephone'].includes(icone),
    recharge: icone === 'recharge',
  };
}
function vueAssistantProduit(){
  const m = state.modal;
  if(!m.v) m.v = valeursInitialesProduit();
  if(m.etape == null) m.etape = 0;
  if(m.vues == null) m.vues = 0;
  const v = m.v, et = ETAPES_PRODUIT[m.etape], derniere = m.etape === ETAPES_PRODUIT.length - 1;
  const frise = ETAPES_PRODUIT.map((e, i) => {
    const etat = i < m.etape ? 'fait' : i === m.etape ? 'cours' : 'avenir';
    const cliquable = i !== m.etape && i <= m.vues;
    return `<li class="${etat}">${cliquable ? `<button type="button" data-cpw-aller="${i}">` : '<div>'}<i>${i < m.etape ? '✓' : i + 1}</i><span>${echapper(e.titre)}</span>${cliquable ? '</button>' : '</div>'}</li>`;
  }).join('');
  const corps = { categorie: etapeCpCategorie, prix: etapeCpPrix, caracteristiques: etapeCpCaracteristiques, comportement: etapeCpComportement, recap: etapeCpRecap }[et.cle](v);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large csw ncw cpw" role="dialog" aria-modal="true" aria-labelledby="cpw-titre">
        <header class="csw-tete">
          <div class="csw-tete-txt">
            <div class="rp-surtitre">Nouveau produit · étape ${m.etape + 1} sur ${ETAPES_PRODUIT.length}</div>
            <h2 class="csw-titre" id="cpw-titre">${v['cp-nom'].trim() ? echapper(v['cp-nom'].trim()) : 'Nouveau produit'}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <ol class="csw-frise fc2-frise">${frise}</ol>
        <div class="csw-corps">
          <div class="csw-intro"><span data-ill="${et.ill}" class="ill xl"></span><div><h3>${echapper(et.h)}</h3><p>${echapper(et.p)}</p></div></div>
          ${corps}
        </div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions csw-pied">
          <span style="flex:1"></span>
          ${m.etape > 0 ? '<button type="button" class="btn btn-secondary" data-cpw-precedent>← Précédent</button>' : ''}
          ${!derniere ? '<button type="button" class="btn btn-primary" data-cpw-suivant>Suivant →</button>' : '<button type="button" class="btn btn-primary" id="cp-enregistrer">Créer le produit</button>'}
        </div>
      </div>
    </div>`;
}
function etapeCpCategorie(v){
  const cartes = ICONES_PRODUIT_OPTIONS.map(o => `
    <label class="csw-moyen cpw-cat${v['cp-icone'] === o.value ? ' choisi' : ''}">
      <input type="radio" name="cpw-icone" value="${echapper(o.value)}" ${v['cp-icone'] === o.value ? 'checked' : ''}>
      <span class="cpw-cat-ill" aria-hidden="true">${o.value ? illustrationProduitAdmin(o.label, o.value, 40) : `<span class="csw-type-ic">${icon('package', 18)}</span>`}</span>
      <span><b>${echapper(o.label)}</b>${o.value ? '' : '<small>D’après le nom du produit</small>'}</span>
      <span class="coche-choix-admin" aria-hidden="true">✓</span>
    </label>`).join('');
  return `
    <section class="csw-section">
      <h4>Nom</h4>
      <div class="field"><label for="cp-nom">Nom du produit *</label><input class="input" id="cp-nom" value="${echapper(v['cp-nom'])}" placeholder="Ex. Ordinateur portable 14″" autocomplete="off"></div>
    </section>
    <section class="csw-section">
      <h4>Catégorie</h4>
      <div class="cpw-cats" role="radiogroup" aria-label="Catégorie">${cartes}</div>
    </section>
    <section class="csw-section">
      <h4>Groupe de commande</h4>
      <div class="cpw-groupes" role="radiogroup" aria-label="Groupe de commande">
        ${GROUPES_COMMANDE.map(g => `<label class="csw-option${v['cp-groupe'] === g ? ' choisi' : ''}"><input type="radio" name="cpw-groupe" value="${echapper(g)}" ${v['cp-groupe'] === g ? 'checked' : ''}><span class="csw-option-txt"><b>${echapper(g)}</b></span></label>`).join('')}
      </div>
    </section>`;
}
function etapeCpPrix(v){
  return `
    <section class="csw-section">
      <h4>Prix</h4>
      <div class="csw-grille">
        <div class="field"><label for="cp-prix-standard">Prix standard (€) *</label><input class="input" id="cp-prix-standard" type="number" step="0.01" min="0" inputmode="decimal" value="${echapper(v['cp-prix-standard'])}"></div>
        <div class="field"><label for="cp-prix-rn">Prix Vente solidaire / RNum (€) *</label><input class="input" id="cp-prix-rn" type="number" step="0.01" min="0" inputmode="decimal" value="${echapper(v['cp-prix-rn'])}"></div>
        <div class="field"><label for="cp-prix-revente-max">Prix de revente maximal (€) <em>(facultatif)</em></label><input class="input" id="cp-prix-revente-max" type="number" step="0.01" min="0" inputmode="decimal" value="${echapper(v['cp-prix-revente-max'])}" placeholder="Pas de plafond"><small class="cpw-aide">Plafond du prix auquel une structure peut revendre l’appareil (ex. Relais Numériques).</small></div>
      </div>
    </section>
    <section class="csw-section">
      <h4>Stock</h4>
      <div class="csw-grille">
        <div class="field"><label for="cp-stock">Stock de départ *</label><input class="input" id="cp-stock" type="number" step="1" min="0" inputmode="numeric" value="${echapper(v['cp-stock'])}"></div>
        <div class="field"><label for="cp-message-rupture">Message si indisponible <em>(facultatif)</em></label><textarea class="input" id="cp-message-rupture" rows="2" placeholder="Ce produit est temporairement indisponible.">${echapper(v['cp-message-rupture'])}</textarea></div>
      </div>
    </section>
    <section class="csw-section">
      <h4>Commande</h4>
      <div class="csw-grille">
        <div class="field"><label for="cp-quantite-max">Quantité maximale par commande <em>(facultatif)</em></label><input class="input" id="cp-quantite-max" type="number" step="1" min="1" max="1000" inputmode="numeric" value="${echapper(v['cp-quantite-max'])}" placeholder="Par défaut : ${quantiteMaxDefautAffiche()}"><small class="cpw-aide">Vide = le réglage par défaut (Réglages → Commandes).</small></div>
      </div>
    </section>`;
}
function etapeCpCaracteristiques(v){
  const c = categorieProduitCp(v['cp-icone']);
  if(!c.materiel && !c.recharge){
    return `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Rien à renseigner pour cette catégorie.<br><small style="opacity:.7">Système, RAM et disque concernent ordinateurs, smartphones et tablettes ; données et appels, les recharges.</small></div>`;
  }
  if(c.recharge){
    return `<section class="csw-section"><h4>Forfait</h4><div class="csw-grille">
      <div class="field"><label for="cp-donnees-mobiles">Données mobiles</label>${selectAvecUnite('cp-donnees-mobiles', DONNEES_MOBILES_OPTIONS, 'Go', v['cp-donnees-mobiles'])}</div>
      <div class="field"><label for="cp-sms">SMS</label><input class="input" id="cp-sms" placeholder="Illimités" value="${echapper(v['cp-sms'])}"></div>
      <div class="field"><label for="cp-appels">Appels</label><input class="input" id="cp-appels" placeholder="Illimités" value="${echapper(v['cp-appels'])}"></div>
    </div></section>`;
  }
  return `<section class="csw-section"><h4>Fiche technique</h4><div class="csw-grille">
    <div class="field"><label for="cp-systeme">Système</label>${selectSimple('cp-systeme', SYSTEMES_OPTIONS, v['cp-systeme'])}</div>
    <div class="field"><label for="cp-ram">Mémoire (RAM)</label>${selectAvecUnite('cp-ram', RAM_OPTIONS, 'Go', v['cp-ram'])}</div>
    <div class="field"><label for="cp-disque">Stockage (disque)</label>${selectSimple('cp-disque', DISQUE_OPTIONS, v['cp-disque'])}</div>
    ${c.processeur ? `<div class="field"><label for="cp-processeur">Processeur</label><input class="input" id="cp-processeur" placeholder="Intel Core i5" value="${echapper(v['cp-processeur'])}"></div>` : ''}
  </div></section>`;
}
function etapeCpComportement(v){
  const sw = (id, titre, aide) => `<label class="rp-switch"><input type="checkbox" id="${id}" ${v[id] ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>${titre}</b><small>${aide}</small></span></label>`;
  return `
    <section class="csw-section">
      <div class="cp-effets">
        ${sw('cp-visible', 'Visible dans le formulaire de commande', 'Sinon, le produit reste en stock mais personne ne peut le commander.')}
        ${sw('cp-sans-suivi', 'Sans numéro de série ni personne', 'Carte SIM, accessoire… : aucun numéro exigé à la préparation, pas de passeport, pas de personne à renseigner.')}
        ${sw('cp-dematerialise', 'Dématérialisé', 'Recharge, code… : pas de livraison, des codes au lieu des numéros de série.')}
        ${sw('cp-facturation-mensuelle', 'Payé en fin de mois (facture mensuelle)', 'Regroupé chaque mois dans une facture par structure, envoyée automatiquement.')}
      </div>
    </section>
    <details class="csw-section cp-avance"${v['cp-tectech-type'] || v['cp-tectech-categorie'] ? ' open' : ''}><summary class="rp-surtitre">Synchronisation tec.tech (avancé)</summary>
      <div class="csw-grille">
        <div class="field"><label for="cp-tectech-type">Type tec.tech</label><select class="input" id="cp-tectech-type"><option value="">—</option>${TECTECH_TYPES.map(t => `<option value="${t}" ${v['cp-tectech-type'] === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="cp-tectech-categorie">Catégorie tec.tech</label><select class="input" id="cp-tectech-categorie"><option value="">—</option>${TECTECH_CATEGORIES.map(c => `<option value="${c}" ${v['cp-tectech-categorie'] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
    </details>`;
}
function etapeCpRecap(v){
  const c = categorieProduitCp(v['cp-icone']);
  const cat = (ICONES_PRODUIT_OPTIONS.find(o => o.value === v['cp-icone']) || {}).label || '';
  const go = x => x && /^\d+$/.test(x) ? `${x} Go` : x;
  const euros = x => x === '' ? '' : formaterMontant(parseFloat(x) || 0);
  const oui = b => b ? 'Oui' : 'Non';
  const bloc = (i, titre, lignes) => `<section class="csw-recap-bloc"><div class="csw-recap-tete"><h4>${titre}</h4><button type="button" class="et-lien" data-cpw-aller="${i}">Modifier</button></div>
    ${lignes.filter(l => l).map(([k, val]) => `<div class="csw-recap-l"><span>${k}</span><b>${val ? echapper(val) : '<em>—</em>'}</b></div>`).join('')}</section>`;
  const tech = c.materiel ? [['Système', v['cp-systeme']], ['RAM', go(v['cp-ram'])], ['Disque', v['cp-disque']], c.processeur ? ['Processeur', v['cp-processeur']] : null]
    : c.recharge ? [['Données', go(v['cp-donnees-mobiles'])], ['SMS', v['cp-sms']], ['Appels', v['cp-appels']]] : [['—', 'Rien pour cette catégorie']];
  return `<div class="csw-recap">
    <section class="csw-recap-bloc cpw-apercu"><span aria-hidden="true">${illustrationProduitAdmin(v['cp-nom'], v['cp-icone'], 56)}</span><div><b>${echapper(v['cp-nom'])}</b><small>${echapper(cat)} · ${echapper(v['cp-groupe'])}</small></div></section>
    ${bloc(0, 'Produit', [['Nom', v['cp-nom']], ['Catégorie', cat], ['Groupe', v['cp-groupe']]])}
    ${bloc(1, 'Prix et stock', [['Prix standard', euros(v['cp-prix-standard'])], ['Prix RNum', euros(v['cp-prix-rn'])], ['Revente max.', v['cp-prix-revente-max'] ? euros(v['cp-prix-revente-max']) : 'Pas de plafond'], ['Stock', v['cp-stock']], ['Si indisponible', v['cp-message-rupture']], ['Max. par commande', v['cp-quantite-max'] || `Par défaut (${quantiteMaxDefautAffiche()})`]])}
    ${bloc(2, 'Caractéristiques', tech)}
    ${bloc(3, 'Comportement', [['Visible', oui(v['cp-visible'])], ['Sans n° de série ni personne', oui(v['cp-sans-suivi'])], ['Dématérialisé', oui(v['cp-dematerialise'])], ['Facture mensuelle', oui(v['cp-facturation-mensuelle'])]])}
  </div>`;
}
function verifierEtapeProduit(i){
  const v = state.modal.v, cle = ETAPES_PRODUIT[i].cle;
  if(cle === 'categorie'){
    const nom = v['cp-nom'].trim();
    if(!nom) return 'Le nom du produit est obligatoire.';
    if(state.produits.some(p => String(p.nom).trim().toLowerCase() === nom.toLowerCase())) return 'Un produit porte déjà ce nom.';
  }
  if(cle === 'prix'){
    if(v['cp-prix-standard'] === '' || v['cp-prix-rn'] === '') return 'Les deux prix sont obligatoires (0 si gratuit).';
    if(v['cp-stock'] === '') return 'Indiquez le stock de départ (0 si aucun).';
    if([v['cp-prix-standard'], v['cp-prix-rn'], v['cp-stock']].some(x => parseFloat(x) < 0)) return 'Les prix et le stock ne peuvent pas être négatifs.';
    const qm = String(v['cp-quantite-max'] || '').trim();
    if(qm && !(parseInt(qm, 10) >= 1 && parseInt(qm, 10) <= 1000)) return 'La quantité maximale doit être entre 1 et 1000 (ou vide).';
  }
  return '';
}
function allerEtapeProduit(cible){
  const m = state.modal;
  memoriserEtapeProduit();
  if(cible > m.etape){
    for(let i = m.etape; i < cible; i++){ const err = verifierEtapeProduit(i); if(err){ m.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; } }
  }
  m.etape = Math.max(0, Math.min(ETAPES_PRODUIT.length - 1, cible));
  m.vues = Math.max(m.vues || 0, m.etape);
  render();
  const corps = document.querySelector('.csw-corps'); if(corps) corps.scrollTop = 0;
  const premier = document.querySelector('.cpw .csw-corps input:not([type=radio]):not([type=checkbox]), .cpw .csw-corps select');
  if(premier && m.etape < ETAPES_PRODUIT.length - 1) premier.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-produit' || !m.v) return;
  const aller = e.target.closest('[data-cpw-aller]');
  if(aller){ allerEtapeProduit(parseInt(aller.dataset.cpwAller, 10)); return; }
  if(e.target.closest('[data-cpw-suivant]')){ allerEtapeProduit(m.etape + 1); return; }
  if(e.target.closest('[data-cpw-precedent]')){ allerEtapeProduit(m.etape - 1); return; }
});
document.addEventListener('change', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-produit' || !m.v) return;
  const el = e.target;
  if(el.name === 'cpw-icone' || el.name === 'cpw-groupe'){
    memoriserEtapeProduit();
    m.v[el.name === 'cpw-icone' ? 'cp-icone' : 'cp-groupe'] = el.value;
    document.querySelectorAll(`input[name="${el.name}"]`).forEach(r => r.closest('label').classList.toggle('choisi', r.checked));
  }
});
document.addEventListener('keydown', e => {
  const m = state.modal; if(!m || m.kind !== 'creer-produit' || !m.v || e.key !== 'Enter') return;
  if(e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
  if(m.etape < ETAPES_PRODUIT.length - 1){ e.preventDefault(); allerEtapeProduit(m.etape + 1); }
});

function vueCreerProduit(){
  const ligne = state.modal.ligne;
  if(!ligne) return vueAssistantProduit();
  const p = ligne ? state.produits.find(x => x.ligne === ligne) : null;
  const icone = p ? p.icone : '';
  const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(icone);
  const estTablette = icone === 'tablette';
  const estRecharge = icone === 'recharge';
  return dialogShell(p ? `Modifier ${p.nom}` : 'Nouveau produit', `
    <div class="cp-section"><div class="rp-surtitre">Produit</div>
    ${champ('Nom *', `<input class="input" id="cp-nom" value="${p ? echapper(p.nom) : ''}">`)}
    ${champ('Icône (détermine la catégorie et les caractéristiques ci-dessous)', `<select class="input" id="cp-icone">${ICONES_PRODUIT_OPTIONS.map(o => `<option value="${o.value}" ${p && p.icone === o.value ? 'selected' : ''}>${echapper(o.label)}</option>`).join('')}</select>`)}
    ${champ('Groupe de commande *', `<select class="input" id="cp-groupe">${GROUPES_COMMANDE.map(g => `<option value="${echapper(g)}" ${p && p.groupe === g ? 'selected' : ''}>${echapper(g)}</option>`).join('')}</select>`)}
    </div>
    <div class="cp-section"><div class="rp-surtitre">Prix et stock</div>
    <div class="cp-grille2">
    ${champ('Prix standard (€) *', `<input class="input" id="cp-prix-standard" type="number" step="0.01" value="${p ? echapper(p.prixStandard) : ''}">`)}
    ${champ('Prix Vente solidaire / RNum (€) *', `<input class="input" id="cp-prix-rn" type="number" step="0.01" value="${p ? echapper(p.prixRN) : ''}">`)}
    <div class="field" style="margin-top:var(--space-2)"><label for="cp-prix-revente-max">Prix de revente maximal (€) <em style="font-weight:400">— ex. Relais Numériques, facultatif</em></label>
      <input class="input" id="cp-prix-revente-max" type="number" step="0.01" min="0" value="${p && p.prixReventeMax != null ? echapper(p.prixReventeMax) : ''}" placeholder="Pas de plafond">
      <p style="margin:4px 0 0;font-size:12px;opacity:.65">Plafond du prix auquel une structure peut revendre cet appareil à la personne accompagnée (tarifs de revente dans sa flotte).</p></div>
    </div>
    ${champ('Stock *', `<input class="input" id="cp-stock" type="number" step="1" value="${p ? echapper(p.stock) : ''}">`)}
    ${champ(`Quantité maximale par commande (vide = par défaut : ${quantiteMaxDefautAffiche()})`, `<input class="input" id="cp-quantite-max" type="number" step="1" min="1" max="1000" value="${p && p.quantiteMax ? echapper(p.quantiteMax) : ''}" placeholder="Par défaut">`)}
    ${champ('Message d\'indisponibilité', `<textarea class="input" id="cp-message-rupture" rows="2" placeholder="Ce produit est temporairement indisponible.">${p ? echapper(p.messageRupture || '') : ''}</textarea>`)}
    </div>
    <div class="cp-section"><div class="rp-surtitre">Caractéristiques</div>
    <div id="cp-tech-materiel" style="display:${(estOrdiOuTelephone || estTablette) ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:var(--space-3)">
      ${champ('Système', selectSimple('cp-systeme', SYSTEMES_OPTIONS, p ? p.systeme : ''))}
      ${champ('RAM', selectAvecUnite('cp-ram', RAM_OPTIONS, 'Go', p ? p.ram : ''))}
      <div id="cp-champ-processeur" style="display:${estOrdiOuTelephone ? 'block' : 'none'}">
        ${champ('Processeur', `<input class="input" id="cp-processeur" placeholder="Intel Core i5" value="${p ? echapper(p.processeur || '') : ''}">`)}
      </div>
      ${champ('Disque', selectSimple('cp-disque', DISQUE_OPTIONS, p ? p.disque : ''))}
    </div>
    <div id="cp-tech-recharge" style="display:${estRecharge ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:var(--space-3)">
      ${champ('Données mobiles', selectAvecUnite('cp-donnees-mobiles', DONNEES_MOBILES_OPTIONS, 'Go', p ? p.donneesMobiles : ''))}
      ${champ('SMS', `<input class="input" id="cp-sms" placeholder="Illimités" value="${p ? echapper(p.sms || '') : ''}">`)}
      ${champ('Appels', `<input class="input" id="cp-appels" placeholder="Illimités" value="${p ? echapper(p.appels || '') : ''}">`)}
    </div>
    <p style="font-size:11.5px;opacity:0.55;margin:2px 0 0">Système/RAM/disque : ordinateur, smartphone ou tablette (processeur en plus pour ordinateur et smartphone). Données mobiles/SMS/appels : recharge uniquement. Rien pour les autres catégories.</p>
    </div>
    <div class="cp-section"><div class="rp-surtitre">Comportement dans une commande</div>
    <div class="cp-effets">
      <label class="rp-switch"><input type="checkbox" id="cp-visible" ${!p || p.visible ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Visible dans le formulaire de commande</b><small>Sinon, le produit reste en stock mais personne ne peut le commander.</small></span></label>
      <label class="rp-switch"><input type="checkbox" id="cp-sans-suivi" ${p && p.sansPersonne && p.exclureDuPasseport ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Sans numéro de série ni personne</b><small>Carte SIM, accessoire… : aucun numéro exigé à la préparation, pas de passeport, pas de personne à renseigner.</small></span></label>
      <label class="rp-switch"><input type="checkbox" id="cp-dematerialise" ${p && p.dematerialise ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Dématérialisé</b><small>Recharge, code… : pas de livraison, des codes au lieu des numéros de série ; la commande peut passer de « Préparée » à « Livrée ».</small></span></label>
      <label class="rp-switch"><input type="checkbox" id="cp-facturation-mensuelle" ${p && p.facturationMensuelle ? 'checked' : ''}><span class="rp-switch-piste"></span><span class="cp-effet"><b>Payé en fin de mois (facture mensuelle)</b><small>Recharges… : jamais sur la facture de la commande ; regroupé chaque mois dans une facture par structure, envoyée automatiquement par mail.</small></span></label>
    </div>
    </div>
    <details class="cp-section cp-avance"><summary class="rp-surtitre">Synchronisation tec.tech (avancé)</summary>
    <div class="cp-grille2">
    ${champ('Type tec.tech', `<select class="input" id="cp-tectech-type"><option value="">—</option>${TECTECH_TYPES.map(t => `<option value="${t}" ${p && p.tectechType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
    ${champ('Catégorie tec.tech', `<select class="input" id="cp-tectech-categorie"><option value="">—</option>${TECTECH_CATEGORIES.map(c => `<option value="${c}" ${p && p.tectechCategorie === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}
    </div>
    </details>
  `, 'cp-enregistrer', p ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-produit="${p.ligne}" data-nom-produit="${echapper(p.nom)}">Supprimer</button>` : null);
}
async function synchroniserStockTecTech(){
  etat('Synchronisation tec.tech…', 'chargement');
  try{
    const r = await poster({ action: 'stock-synchroniser-tectech' });
    if(r.ok){
      state.produits = r.produits || state.produits;
      etat('Synchronisation terminée', 'succes');
      state.modal = { kind: 'tectech-resultats', resultats: r.resultats || [] };
      render();
    }else{
      etat(r.erreur || 'Synchronisation impossible', 'erreur');
    }
  }catch(e){ etat('Synchronisation impossible', 'erreur'); }
}
document.addEventListener('click', e => {
  if(e.target.closest('#btn-synchroniser-tectech')) synchroniserStockTecTech();
});

async function supprimerProduitAction(ligne){
  const r = await posterEtat({ action: 'produit-supprimer', ligne }, 'Suppression…', 'Produit supprimé');
  if(r.ok){
    const rp = await jsonp({ action: 'produits', password: motDePasse });
    if(rp.ok) state.produits = rp.produits;
    state.modal = null; render();
  }
}
async function supprimerStructureAction(ligne){
  const r = await posterEtat({ action: 'structure-delete', ligne }, 'Suppression…', 'Structure supprimée');
  if(r.ok){
    const rst = await jsonp({ action: 'structures', password: motDePasse });
    if(rst.ok) state.structures = rst.structures.slice().sort((a, b) => b.ligne - a.ligne);
    state.modal = null; render();
  }
}
async function enregistrerProduit(){
  const ligne = state.modal.ligne;
  // Assistant (nouveau produit) : les valeurs viennent de state.modal.v, pas des champs
  // (seule l'étape affichée est dans la page). Formulaire complet (modification) : les champs.
  const assistant = !ligne && state.modal.v;
  if(assistant){
    for(let i = 0; i < ETAPES_PRODUIT.length - 1; i++){
      const err = verifierEtapeProduit(i);
      if(err){ state.modal.etape = i; render(); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(err)}</div>`; return; }
    }
  }
  const lire = id => assistant ? String(state.modal.v[id] == null ? '' : state.modal.v[id]) : $(id).value;
  const coche = id => assistant ? !!state.modal.v[id] : $(id).checked;
  const nom = lire('cp-nom').trim();
  const prixStandard = lire('cp-prix-standard'), prixRN = lire('cp-prix-rn'), stock = lire('cp-stock');
  if(!nom || prixStandard === '' || prixRN === '' || stock === ''){
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Nom, prix standard, prix RNum et stock sont obligatoires.</div>';
    return;
  }
  { const b = $('cp-enregistrer'); if(b) b.disabled = true; }
  // Le toggle "sans suivi" pilote deux drapeaux (nominatif, passeport) — le troisième (sans
  // numéro de série) est forcé à faux si le produit est dématérialisé : un code reste requis
  // par unité dans ce cas (voir "Codes" à l'étape Validée), même si l'ancien toggle "sans
  // suivi" est aussi coché sur ce produit (ex. une recharge qui avait déjà ce toggle avant
  // l'ajout du concept "dématérialisé").
  const sansSuivi = coche('cp-sans-suivi');
  const dematerialise = coche('cp-dematerialise');
  // Système/RAM/disque : ordinateur, smartphone ou tablette. Processeur : ordinateur/smartphone
  // uniquement (pas tablette). Données mobiles/SMS/appels : recharge uniquement. Ailleurs, tout
  // est envoyé vide plutôt que de garder ce qui traîne dans des champs masqués (utile si le
  // produit change de catégorie). RAM et données mobiles arrivent en nombre nu depuis leur
  // <select> — le "Go" est rajouté ici, pas dans le formulaire.
  const icone = lire('cp-icone');
  const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(icone);
  const estTablette = icone === 'tablette';
  const estMaterielTechnique = estOrdiOuTelephone || estTablette;
  const estRecharge = icone === 'recharge';
  const avecGo = valeur => valeur && /^\d+$/.test(valeur) ? `${valeur} Go` : valeur;
  const champsCommuns = {
    nom, prixStandard, prixRN, stock, icone, prixReventeMax: lire('cp-prix-revente-max').trim(),
    quantiteMax: lire('cp-quantite-max').trim(),
    visible: coche('cp-visible'), sansPersonne: sansSuivi,
    exclureDuPasseport: sansSuivi, sansNumeroSerie: sansSuivi && !dematerialise, groupe: lire('cp-groupe'),
    tectechType: lire('cp-tectech-type'), tectechCategorie: lire('cp-tectech-categorie'),
    dematerialise, messageRupture: lire('cp-message-rupture').trim(),
    facturationMensuelle: coche('cp-facturation-mensuelle'),
    systeme: estMaterielTechnique ? lire('cp-systeme').trim() : '',
    ram: estMaterielTechnique ? avecGo(lire('cp-ram').trim()) : '',
    processeur: estOrdiOuTelephone ? lire('cp-processeur').trim() : '',
    disque: estMaterielTechnique ? lire('cp-disque').trim() : '',
    donneesMobiles: estRecharge ? avecGo(lire('cp-donnees-mobiles').trim()) : '',
    sms: estRecharge ? lire('cp-sms').trim() : '',
    appels: estRecharge ? lire('cp-appels').trim() : '',
  };
  try{
    etat(ligne ? 'Enregistrement…' : 'Création…', 'chargement');
    let ok, reponses, r;
    if(ligne){
      // Chaque appel est isolé dans son propre catch : sans ça, un seul des ~20 champs qui
      // renvoie une réponse invalide (erreur réseau, réponse HTML au lieu de JSON...) fait
      // rejeter tout le Promise.all d'un coup — alors que les autres appels, déjà partis, ont
      // très bien pu réussir côté serveur entre-temps. D'où l'impression contradictoire
      // "erreur interne" à l'écran alors que le reste s'enregistre bel et bien.
      reponses = await Promise.all(Object.keys(champsCommuns).map(c =>
        poster({ action: 'produit-update', ligne, champ: c, valeur: champsCommuns[c] })
          .then(res => ({ ...res, champ: c }))
          .catch(err => ({ ok: false, champ: c, erreur: err && err.message ? `${c} : ${err.message}` : `${c} : erreur réseau` }))
      ));
      // "Champ non modifiable" = le back ne connaît pas encore cette colonne (front redéployé
      // avant le back, par ex. juste après l'ajout d'un nouveau champ) — pas une vraie erreur
      // d'enregistrement, tous les AUTRES champs de cette même sauvegarde ont bien été écrits.
      // Sans cette distinction, un seul champ "en avance" faisait échouer tout l'enregistrement
      // aux yeux de l'utilisateur alors que le reste avait bien été pris en compte.
      const echecsReels = reponses.filter(x => !x.ok && x.erreur !== 'Champ non modifiable');
      ok = echecsReels.length === 0;
    }else{
      r = await poster({
        // Tous les champs saisis sont envoyés dès la création (RAM, disque, système, message de
        // rupture… étaient auparavant remis à vide ici : ils n'apparaissaient qu'après une
        // seconde modification du produit).
        action: 'produit-create', ...champsCommuns, structureDediee: ''
      });
      ok = r.ok;
    }
    if(ok){
      etat(ligne ? 'Produit mis à jour' : 'Produit créé', 'succes');
      const rp = await jsonp({ action: 'produits', password: motDePasse });
      if(rp.ok) state.produits = rp.produits;
      // Les commandes déjà chargées portent des champs calculés à partir de la config produit du
      // moment (dematerialisee, quantiteAvecNumeroSerie) — sans ce rafraîchissement, corriger un
      // toggle produit (ex. "dématérialisé") pendant que l'onglet Commandes est déjà ouvert
      // laissait ces commandes figées sur l'ancienne config : l'étape de saisie affichait "aucun
      // code requis" au lieu du champ Codes, jusqu'au prochain rechargement complet de la page.
      if(ligne){
        const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
        if(rc.ok) state.commandes = rc.commandes;
      }
      state.modal = null; render();
    }else{
      const echecTrouve = ligne ? reponses.find(x => !x.ok && x.erreur !== 'Champ non modifiable') : null;
      const messageErreur = ligne
        ? (echecTrouve ? `${echecTrouve.champ} : ${echecTrouve.erreur}` : null)
        : r.erreur;
      etat(messageErreur || 'Enregistrement impossible', 'erreur');
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(messageErreur || 'Enregistrement impossible.')}</div>`;
      $('cp-enregistrer').disabled = false;
    }
  }catch(e){
    console.error('enregistrerProduit', e);
    etat('Enregistrement impossible', 'erreur');
    $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">Enregistrement impossible — ${echapper(e.message || 'erreur inconnue')}.</div>`;
    $('cp-enregistrer').disabled = false;
  }
}

/* ============================================================
   Devis / Facture directs, depuis une commande existante
   ============================================================ */
function vueCreerDevis(){
  const libre = state.modal.libre;
  const eligibles = state.commandes.filter(c => !c.referenceDevis && !structureExclueDevisFacture(c));
  const options = eligibles.map(c => `<option value="${c.ligne}">${echapper(c.reference)} — ${echapper(c.nom)}</option>`).join('');
  const optionsStructures = '<option value="">— Non listée / saisie libre —</option>' + state.structures.map(s => `<option value="${echapper(s.code)}">${echapper(s.nom)}</option>`).join('');
  const optionsProduitsDevis = state.produits.map(p => `<option value="${echapper(p.nom)}" data-prix="${p.prixStandard}">${echapper(p.nom)} (${p.prixStandard}€)</option>`).join('');
  const total = state.ndLignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  return dialogShell('Nouveau devis', `
    <div class="rp-seg" style="margin-bottom:var(--space-2);width:fit-content;grid-column:1/-1">
      <button type="button" class="${libre ? '' : 'actif'}" data-toggle-devis-libre="0">Depuis une commande</button>
      <button type="button" class="${libre ? 'actif' : ''}" data-toggle-devis-libre="1">Devis libre</button>
    </div>
    ${libre ? `
      <p style="opacity:0.6;font-size:12.5px;margin:0 0 var(--space-3)">Pour un devis envoyé avant que la commande existe côté admin — à rattacher plus tard depuis la section "Devis libres".</p>
      ${champ('Structure', `<select class="input" id="nd-structure-select">${optionsStructures}</select>`)}
      ${champ('Structure / destinataire *', `<input class="input" id="cdl-structure" value="${echapper(state.ndStructureNom)}">`)}
      ${champ('Email', `<input class="input" id="cdl-email" type="email" value="${echapper(state.ndEmail)}">`)}
      ${champ('Adresse', `<textarea class="input" id="cdl-adresse" rows="2">${echapper(state.ndAdresse)}</textarea>`)}
      ${champ('Ajouter un produit ou une prestation', `
        <div style="display:flex;gap:8px">
          <select class="input" id="nd-produit-select" style="flex:1">${optionsProduitsDevis}</select>
          <input class="input" id="nd-produit-qte" type="number" min="1" value="1" style="width:70px">
          <button type="button" class="btn btn-secondary" data-nd-ajouter-ligne>${icon('plus', 15)}</button>
        </div>`)}
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:var(--space-2)">
        ${state.ndLignes.map((l, i) => `
        <div style="display:flex;align-items:center;gap:8px;background:var(--color-neutral-100);border-radius:var(--radius-md);padding:8px 12px">
          <span style="flex:1;font-size:13px">${l.quantite}× ${echapper(l.produit)}</span>
          <input type="number" class="input" data-nd-prix-ligne="${i}" value="${l.prixUnitaire}" step="0.01" min="0" style="width:90px" title="Prix unitaire (€)">
          <span style="font-size:12.5px;opacity:0.6;width:70px;text-align:right">${(l.quantite * l.prixUnitaire).toFixed(2)}€</span>
          <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-nd-retirer-ligne="${i}">${icon('x', 14)}</button>
        </div>`).join('') || '<p style="opacity:0.5;font-size:12.5px">Aucun produit ajouté.</p>'}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-divider)">
        <span style="font-weight:700;font-size:13.5px">Montant total</span>
        <span style="font-family:var(--font-heading);font-weight:700;font-size:19px">${total.toFixed(2)}€</span>
      </div>
    ` : (eligibles.length
      ? champ('Commande *', `<select class="input" id="cd-ligne">${options}</select>`)
      : '<p style="opacity:0.6;font-size:13px;margin-top:var(--space-2)">Aucune commande sans devis à facturer.</p>')}
    ${liensRaccourcis('devis')}
  `, 'cd-enregistrer');
}
async function enregistrerDevis(){
  if(state.modal.libre) return enregistrerDevisLibre();
  const select = $('cd-ligne');
  if(!select){ state.modal = null; render(); return; }
  const ligne = parseInt(select.value, 10);
  $('cd-enregistrer').disabled = true;
  try{
    etat('Génération…', 'chargement');
    const r = await poster({ action: 'commande-devis-direct', ligne });
    if(r.ok){
      etat(r.avertissement || 'Devis généré', 'succes', r.avertissement ? 6000 : 2600);
      const [rc, rd] = await Promise.all([
        jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
        jsonp({ action: 'devis', password: motDePasse, limite: 0 })
      ]);
      if(rc.ok) state.commandes = rc.commandes;
      if(rd.ok) state.devis = rd.devis;
      state.modal = null; render();
    }else{ etat(r.erreur || 'Génération impossible', 'erreur'); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('cd-enregistrer').disabled = false; }
  }catch(e){ etat('Génération impossible', 'erreur'); $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>'; $('cd-enregistrer').disabled = false; }
}
async function annulerDocumentAction(type, ligne, motif){
  const r = await posterEtat({ action: `${type}-annuler`, ligne, motif }, 'Annulation…', type === 'devis' ? 'Devis annulé' : 'Facture annulée');
  if(r.ok){
    const [rc, rd, rf] = await Promise.all([
      jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
      jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
      jsonp({ action: 'factures', password: motDePasse, limite: 0 })
    ]);
    if(rc.ok) state.commandes = rc.commandes;
    if(rd.ok) state.devis = rd.devis;
    if(rf.ok) state.factures = rf.factures;
    state.modal = null; state.documentGenere = null; render();
  }
}
async function genererDocumentPdf(){
  const dg = state.documentGenere;
  if(!dg) return;
  const estDevis = dg.type === 'devis';
  const doc = estDevis ? state.devis.find(x => x.referenceDevis === dg.ref) : state.factures.find(x => x.referenceFacture === dg.ref);
  if(!doc) return;
  dg.chargement = true; dg.erreur = null; render();
  try{
    const r = await poster({ action: estDevis ? 'devis-generer-pdf' : 'facture-generer-pdf', ligne: doc.ligne });
    if(r.ok){ dg.url = r.url; }
    else{ dg.erreur = r.erreur || 'Génération impossible.'; }
  }catch(e){ dg.erreur = 'Génération impossible — réessaie.'; }
  dg.chargement = false; render();
}
async function envoyerDocumentGenere(){
  const dg = state.documentGenere;
  if(!dg) return;
  const doc = dg.type === 'devis' ? state.devis.find(x => x.referenceDevis === dg.ref) : state.factures.find(x => x.referenceFacture === dg.ref);
  if(!doc) return;
  const email = $('dg-email').value.trim();
  if(!email){ dg.erreur = 'Renseigne une adresse email.'; render(); return; }
  dg.envoiChargement = true; dg.erreur = null; dg.envoiOk = false; render();
  try{
    const r = await poster({
      action: dg.type === 'devis' ? 'devis-envoyer' : 'facture-envoyer',
      ligne: doc.ligne, email, url: dg.url,
      sujet: $('dg-sujet').value.trim(), texte: $('dg-texte').value,
    });
    if(r.ok){
      dg.envoiOk = true; dg.envoiOuvert = false;
      const [rd, rf] = await Promise.all([
        jsonp({ action: 'devis', password: motDePasse, limite: 0 }),
        jsonp({ action: 'factures', password: motDePasse, limite: 0 })
      ]);
      if(rd.ok) state.devis = rd.devis;
      if(rf.ok) state.factures = rf.factures;
    }
    else{ dg.erreur = r.erreur || 'Envoi impossible.'; }
  }catch(e){ dg.erreur = 'Envoi impossible — réessaie.'; }
  dg.envoiChargement = false; render();
}
async function enregistrerDevisLibre(){
  const nomStructure = $('cdl-structure').value.trim();
  if(!nomStructure){
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">La structure / le destinataire est obligatoire.</div>';
    return;
  }
  if(!state.ndLignes.length){
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Ajoute au moins un produit ou une prestation.</div>';
    return;
  }
  $('cd-enregistrer').disabled = true;
  try{
    const r = await posterEtat({
      action: 'devis-creer-libre', nomStructure, lignes: state.ndLignes,
      email: $('cdl-email').value.trim(), adresse: $('cdl-adresse').value.trim(),
    }, 'Génération…', 'Devis libre créé');
    if(r.ok){
      const rd = await jsonp({ action: 'devis', password: motDePasse, limite: 0 });
      if(rd.ok) state.devis = rd.devis;
      state.modal = null; state.ndLignes = []; render();
    }else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('cd-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>'; $('cd-enregistrer').disabled = false; }
}

function vueCreerFacture(){
  const eligibles = state.commandes.filter(c => !c.referenceFacture && !structureExclueDevisFacture(c));
  const options = eligibles.map(c => `<option value="${c.ligne}">${echapper(c.reference)} — ${echapper(c.nom)}</option>`).join('');
  return dialogShell('Nouvelle facture', `
    ${eligibles.length ? `
      ${champ('Commande *', `<select class="input" id="cf-ligne">${options}</select>`)}
      ${champ('Numéro de facture *', '<input class="input" id="cf-numero">')}
    ` : '<p style="opacity:0.6;font-size:13px;margin-top:var(--space-2)">Aucune commande sans facture à facturer.</p>'}
    ${liensRaccourcis('facture')}
  `, 'cf-enregistrer');
}
async function enregistrerFacture(){
  const select = $('cf-ligne');
  if(!select){ state.modal = null; render(); return; }
  const ligne = parseInt(select.value, 10);
  const numeroFacture = $('cf-numero').value.trim();
  if(!numeroFacture){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Le numéro de facture est obligatoire.</div>'; return; }
  $('cf-enregistrer').disabled = true;
  try{
    const r = await posterEtat({ action: 'commande-facturer-direct', ligne, numeroFacture }, 'Génération…', 'Facture générée');
    if(r.ok){
      const [rc, rf] = await Promise.all([
        jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }),
        jsonp({ action: 'factures', password: motDePasse, limite: 0 })
      ]);
      if(rc.ok) state.commandes = rc.commandes;
      if(rf.ok) state.factures = rf.factures;
      state.modal = null; render();
    }else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('cf-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>'; $('cf-enregistrer').disabled = false; }
}

/* ============================================================
   Thème clair / sombre
   ============================================================ */
function basculerTheme(){
  const sombre = document.documentElement.classList.toggle('rp-dark');
  try{ localStorage.setItem('cvdl-theme', sombre ? 'dark' : 'light'); }catch(e){}
  majLabelTheme();
}
function majLabelTheme(){
  const label = $('rp-toggle-theme-label');
  if(label) label.textContent = document.documentElement.classList.contains('rp-dark') ? 'Mode clair' : 'Mode sombre';
}

/* Style unifié (admin-unifie.css) / ancien style — le fichier ne s'applique que sous
   html.rp-unifie, donc retirer la classe suffit à revenir exactement à l'ancien rendu. */
function basculerStyle(){
  const unifie = document.documentElement.classList.toggle('rp-unifie');
  try{ localStorage.setItem('cvdl-style', unifie ? 'unifie' : 'ancien'); }catch(e){}
  majLabelStyle();
  render();
}
/* Contenu en pleine largeur / largeur limitée (mémorisé). */
function basculerLargeur(){
  const pleine = document.documentElement.classList.toggle('rp-pleine');
  try{ localStorage.setItem('cvdl-largeur', pleine ? 'pleine' : 'limitee'); }catch(e){}
  majLabelLargeur();
}
function majLabelLargeur(){
  const l = $('rp-toggle-largeur-label');
  if(l) l.textContent = document.documentElement.classList.contains('rp-pleine') ? 'Largeur limitée' : 'Pleine largeur';
}
/** Modale « parente » quand on en ouvre une par-dessus une autre (fiche 360° → commande,
 *  commande → fiche 360°…) : la fermeture ne referme alors que la dernière ouverte. */
function modalParentPour(kind){
  if(!state.modal || state.modal.kind === kind) return state.modal ? state.modal.modalParent || null : null;
  return state.modal;
}
/** Pictogramme des actions d'annulation (commande, SAV…), toujours en bas à gauche des fiches. */
function iconeAnnuler(t){
  t = t || 18;
  return `<svg class="ic-annuler" viewBox="0 0 24 24" width="${t}" height="${t}" aria-hidden="true"><circle cx="13" cy="13" r="8.5" fill="#F5A3BC"/><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11.5" cy="11.5" r="8.5"/><path d="M8.5 8.5l6 6M14.5 8.5l-6 6"/></g></svg>`;
}
function estUnifie(){ return document.documentElement.classList.contains('rp-unifie'); }
/* Formes des statuts (style unifié) — losange : en attente d'une décision, carré : pris en
   charge / en cours, rond : terminé. Déduites du libellé affiché, pour couvrir toutes les
   pastilles existantes sans toucher à chacun de leurs rendus. */
const FORMES_STATUT = {
  'Reçue': 'losange', 'Validée': 'carre', 'Préparée': 'carre', 'En cours de livraison': 'carre', 'En livraison': 'carre', 'Livrée': 'rond', 'Annulée': 'rond',
  'En attente': 'losange', 'Émis': 'losange', 'Émise': 'losange', 'Envoyé': 'losange', 'Envoyée': 'losange', 'En retard': 'losange', 'Non payé': 'losange', 'Non payée': 'losange',
  'Accepté': 'rond', 'Accepté sans réserve': 'rond', 'Payé': 'rond', 'Payée': 'rond', 'Remboursé': 'rond', 'Annulé': 'rond', 'Refusé': 'rond', 'Rapproché': 'carre',
  'Estimée': 'carre', 'Confirmée': 'rond', 'Non rapproché': 'losange', 'Clôturé': 'rond'
};
function formeStatut(texte){
  const t = String(texte || '').trim().replace(/^SAV\s+/, '').split(' · ')[0].trim();
  if(FORMES_STATUT[t]) return FORMES_STATUT[t];
  const sav = state.statutsSav || [];
  const def = sav.find(d => d.statut === t);
  if(def){
    if(def.terminal || def.finCycle) return 'rond';
    const premier = sav.find(d => !d.terminal);
    return premier && premier.statut === t ? 'losange' : 'carre';
  }
  return null;
}
const ILL_MODALE = [[/statut/i, 'suiviSav'], [/structure/i, 'structures'], [/cat[ée]gorie|organiser/i, 'categories'], [/attestation/i, 'attestations'],
  [/mod[èe]le|devis|facture|^(DEV|FAC)/i, 'facture'], [/bon de livraison|livr/i, 'commandes'], [/synchro|tec\.tech/i, 'reglages'], [/sav/i, 'suiviSav'], [/commande/i, 'commandes'], [/produit|mat[ée]riel|stock/i, 'stock']];
function decorerElementsUnifies(racine){
  if(!racine || !racine.querySelectorAll) return;
  racine.querySelectorAll('.tag, .rp-statut, .rpd-statut').forEach(el => {
    const f = formeStatut(el.textContent) || (el.closest('.rp-fil-ligne') ? 'losange' : null);
    if(f) el.dataset.forme = f; else delete el.dataset.forme;
  });
  racine.querySelectorAll('.rp-filtre .rp-point, .rp-kb-point').forEach(pt => {
    const porteur = pt.closest('.rp-filtre') || pt.closest('.rp-kb-tete') || pt.parentNode;
    const clone = porteur.cloneNode(true); clone.querySelectorAll('.n').forEach(x => x.remove());
    const f = formeStatut(clone.textContent.replace(/\d+\s*$/, ''));
    if(f) pt.dataset.forme = f; else delete pt.dataset.forme;
  });
  racine.querySelectorAll('.dialog-title').forEach(t => {
    if(t.dataset.illOk) return;
    t.dataset.illOk = '1';
    const trouve = ILL_MODALE.find(([re]) => re.test(t.textContent));
    const ill = document.createElement('span');
    ill.className = 'ill rp-dialog-ill'; ill.style.display = 'none'; ill.dataset.ill = trouve ? trouve[1] : 'tableau';
    t.parentNode.insertBefore(ill, t);
    if(window.portailIllustrations) window.portailIllustrations(t.parentNode);
  });
}
new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
  if(n.nodeType !== 1) return;
  decorerElementsUnifies(n.parentNode || n);
}))).observe(document.body, { childList: true, subtree: true });
function majLabelStyle(){
  const label = $('rp-toggle-style-label');
  if(label) label.textContent = document.documentElement.classList.contains('rp-unifie') ? 'Ancien style' : 'Nouveau style';
}

/* ============================================================
   Démarrage
   ============================================================ */
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
  try{ mdpStocke = sessionStorage.getItem('cvdl-admin-jeton') || ''; sessionStorage.removeItem('cvdl-admin-password'); }catch(e){}
  preparerGoogleAdmin(!mdpStocke);
  if(!mdpStocke) return;
  await connecter(mdpStocke); // le jeton est renouvelé à chaque reconnexion

})();

/* Éléments role="button" activables au clavier (Entrée / Espace) — lignes du fil, livraisons… */
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest && e.target.closest('[role="button"]:not(button):not(a)');
  if(!el || el !== e.target) return;
  e.preventDefault(); el.click();
});

/* ════════════════════════════════════════════════════════════════════════════════════
   IMPACT (rapport par commande ou par structure) et VUE 360° D'UNE STRUCTURE
   ════════════════════════════════════════════════════════════════════════════════════ */
const CATEGORIES_IMPACT = ['PC portable', 'PC fixe', 'Tablette', 'Smartphone', 'Écran', 'Accessoire', 'Recharge / forfait'];
function categorieImpact(nomProduit){
  const p = (state.produits || []).find(x => x.nom === nomProduit) || {};
  const cle = `${p.icone || ''} ${nomProduit || ''}`.toLowerCase();
  if(p.dematerialise || /recharge|forfait|\bsim\b/.test(cle)) return 'Recharge / forfait';
  if(/tablette|ipad|\btab\b/.test(cle)) return 'Tablette';
  if(/smartphone|t[ée]l[ée]phone|mobile|iphone|galaxy/.test(cle)) return 'Smartphone';
  if(/[ée]cran|moniteur/.test(cle)) return 'Écran';
  if(/fixe|\btour\b|unit[ée] centrale|desktop/.test(cle)) return 'PC fixe';
  if(/portable|laptop|ordinateur|\bpc\b/.test(cle)) return 'PC portable';
  return 'Accessoire';
}
const EST_APPAREIL = cat => cat !== 'Accessoire' && cat !== 'Recharge / forfait';
function coefficientsImpact(){
  try{ return JSON.parse((state.reglages && state.reglages.impactCoefficients) || '{}') || {}; }catch(e){ return {}; }
}
function nbPersonnesCommande(c){
  return String(c.personnes || '').split('\n').map(s => s.trim()).filter(Boolean).length;
}
/** Impact d'un ensemble de commandes (seules les commandes livrées comptent). */
function calculImpact(commandes){
  const coef = coefficientsImpact();
  const livrees = commandes.filter(c => c.statutCommande === 'Livrée');
  const parCat = {};
  let appareils = 0, personnes = 0, co2 = 0, dechets = 0, coefConnu = false;
  livrees.forEach(c => {
    (c.lignes || []).forEach(l => {
      const q = parseInt(l.quantite, 10) || 0, cat = categorieImpact(l.produit);
      parCat[cat] = (parCat[cat] || 0) + q;
      if(EST_APPAREIL(cat)) appareils += q;
      const k = coef[cat];
      if(k){
        const a = parseFloat(k.co2), d = parseFloat(k.dechets);
        if(isFinite(a)){ co2 += a * q; coefConnu = true; }
        if(isFinite(d)){ dechets += d * q; coefConnu = true; }
      }
    });
    personnes += nbPersonnesCommande(c);
  });
  return { livrees, parCat, appareils, personnes, co2, dechets, coefConnu };
}
const fmtNombre = n => Math.round(n).toLocaleString('fr-FR');

/** Rapport d'impact imprimable (nouvelle fenêtre, charte CVDL, prêt à imprimer en PDF). */
function ouvrirRapportImpact({ titre, sousTitre, commandes }){
  const im = calculImpact(commandes);
  const logo = new URL('logo.png', location.href).href;
  const cats = CATEGORIES_IMPACT.filter(c => im.parCat[c]);
  const aujourdhui = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const kpi = (v, l) => `<div class="k"><b>${v}</b><span>${l}</span></div>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport d’impact — ${echapper(sousTitre)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap">
<style>
*{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,sans-serif;color:#002743;background:#fff}
.page{max-width:820px;margin:0 auto;padding:36px 40px 48px;border-top:8px solid #E62460}
header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:18px;border-bottom:1px solid #E3E8EC}
header img{height:44px} .sur{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#C2185B}
h1{font-family:"Space Grotesk",sans-serif;font-size:32px;line-height:1.1;margin:6px 0 4px} .sous{color:#5A6D7D;font-size:15px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:26px 0}
.k{border:1.5px solid #002743;border-radius:16px;padding:16px 18px;box-shadow:4px 4px 0 rgba(0,39,67,.16)} .k b{display:block;font-family:"Space Grotesk",sans-serif;font-size:30px;line-height:1} .k span{display:block;margin-top:6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#5A6D7D}
h2{font-family:"Space Grotesk",sans-serif;font-size:19px;margin:28px 0 10px}
table{width:100%;border-collapse:collapse;font-size:14px} th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5A6D7D;padding:10px 12px;background:#F6F8FA;border-bottom:1px solid #E3E8EC} td{padding:10px 12px;border-bottom:1px solid #EDF1F4} td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.note{margin-top:26px;padding:14px 16px;border-radius:12px;background:#F6F8FA;font-size:12.5px;line-height:1.55;color:#40566A}
.actions{display:flex;justify-content:flex-end;margin-bottom:16px} .actions button{font:inherit;font-weight:700;padding:10px 20px;border-radius:999px;border:1.5px solid #002743;background:#00777A;color:#fff;cursor:pointer}
@media print{ .actions{display:none} .page{padding:0;border-top-width:6px} @page{margin:16mm} }
</style></head><body><div class="page">
<div class="actions"><button onclick="window.print()">Imprimer / enregistrer en PDF</button></div>
<header><div><div class="sur">Rapport d’impact</div><h1>${echapper(titre)}</h1><div class="sous">${echapper(sousTitre)} · établi le ${aujourdhui}</div></div><img src="${logo}" alt="Emmaüs Connect"></header>
<div class="kpis">
${kpi(fmtNombre(im.appareils), 'appareils remis')}
${im.personnes ? kpi(fmtNombre(im.personnes), 'personnes équipées') : ''}
${kpi(fmtNombre(im.livrees.length), im.livrees.length > 1 ? 'commandes livrées' : 'commande livrée')}
${im.coefConnu && im.co2 ? kpi(fmtNombre(im.co2) + ' kg', 'CO₂e évités') : ''}
${im.coefConnu && im.dechets ? kpi(fmtNombre(im.dechets) + ' kg', 'déchets évités') : ''}
</div>
<h2>Matériel remis</h2>
${cats.length ? `<table><thead><tr><th>Catégorie</th><th style="text-align:right">Quantité</th></tr></thead><tbody>${cats.map(c => `<tr><td>${c}</td><td class="n">${fmtNombre(im.parCat[c])}</td></tr>`).join('')}</tbody></table>` : '<p class="sous">Aucune commande livrée sur la période.</p>'}
${im.livrees.length > 1 ? `<h2>Commandes livrées</h2><table><thead><tr><th>Commande</th><th>Livrée le</th><th style="text-align:right">Articles</th></tr></thead><tbody>${im.livrees.map(c => `<tr><td>${echapper(c.reference)}</td><td>${echapper(c.dateLivraison || '—')}</td><td class="n">${(c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0)}</td></tr>`).join('')}</tbody></table>` : ''}
<div class="note"><b>Méthode.</b> Seules les commandes au statut « Livrée » sont comptées. Les appareils excluent les accessoires et les recharges.
${im.coefConnu ? 'Les émissions et déchets évités sont calculés avec les coefficients par catégorie renseignés dans l’administration CVDL (source à citer : voir réglages).' : 'Les émissions de CO₂ et les déchets évités ne sont pas affichés : les coefficients par catégorie n’ont pas encore été renseignés dans l’administration.'}
${im.personnes ? '' : ' Le nombre de personnes équipées n’est connu que lorsque les personnes sont renseignées dans la commande.'}</div>
</div></body></html>`;
  const w = window.open('', '_blank');
  if(!w){ alerteCvdl('Le navigateur a bloqué l’ouverture du rapport.\n\nAutorise les fenêtres pour cette page, puis réessaie.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

/** Coefficients d'impact par catégorie (kg CO2e et kg de déchets évités par appareil). */
function vueCoefficientsImpact(){
  const coef = coefficientsImpact();
  // Valeurs ADEME appliquées automatiquement (étude 2022 sur le reconditionnement) — affichées en
  // grisé ; une saisie ici les remplace pour la catégorie concernée.
  const ADEME = { 'PC portable': { co2: 27, matieres: 127, dechets: 0.314 }, 'Smartphone': { co2: 24.6, matieres: 76.9 }, 'Tablette': { co2: 20, matieres: 80 } };
  const champ = (cat, type, lib) => `<input class="input" type="number" min="0" step="0.1" inputmode="decimal" data-coef-cat="${echapper(cat)}" data-coef-type="${type}" value="${coef[cat] && coef[cat][type] != null ? echapper(coef[cat][type]) : ''}" placeholder="${ADEME[cat] && ADEME[cat][type] != null ? String(ADEME[cat][type]).replace('.', ',') : '—'}" aria-label="${lib} pour ${cat}">`;
  return dialogShell('Impact : valeurs de calcul', `
    <div class="msg msg-info" data-pleine-largeur>Le rapport utilise automatiquement les chiffres de l’ADEME (étude 2022 sur les produits reconditionnés), par année d’utilisation d’un appareil reconditionné à la place d’un neuf. Ils apparaissent en grisé. Ne remplis une case que pour les remplacer, en citant ta source.</div>
    <div class="imp-coefs" data-pleine-largeur>
      <div class="imp-coefs-tete imp-4"><span>Catégorie</span><span>kg CO₂e évités / an</span><span>kg de matières / an</span><span>kg de déchets électroniques / an</span></div>
      ${['PC portable', 'Smartphone', 'Tablette', 'PC fixe', 'Écran'].map(cat => `<div class="imp-coefs-ligne imp-4"><b>${cat}</b>${champ(cat, 'co2', 'CO₂e évités')}${champ(cat, 'matieres', 'Matières évitées')}${champ(cat, 'dechets', 'Déchets évités')}</div>`).join('')}
    </div>
    <div class="field" data-pleine-largeur><label for="coef-source">Source des valeurs remplacées</label><input class="input" id="coef-source" value="${echapper(coef._source || '')}" placeholder="Obligatoire si tu remplaces une valeur ADEME"></div>
  `, 'coef-enregistrer');
}

async function enregistrerCoefficientsImpact(){
  const coef = { _source: ($('coef-source') || {}).value || '' };
  document.querySelectorAll('[data-coef-cat]').forEach(i => {
    const v = i.value.trim(); if(v === '') return;
    coef[i.dataset.coefCat] = coef[i.dataset.coefCat] || {};
    coef[i.dataset.coefCat][i.dataset.coefType] = parseFloat(v.replace(',', '.'));
  });
  const r = await poster({ action: 'reglages-set', champ: 'impactCoefficients', valeur: JSON.stringify(coef) });
  if(!r.ok){ etat('Enregistrement impossible', 'erreur'); return; }
  state.reglages = state.reglages || {}; state.reglages.impactCoefficients = JSON.stringify(coef);
  etat('Coefficients enregistrés', 'succes');
  state.modal = state.modal && state.modal.modalParent ? state.modal.modalParent : null; render();
}

/** Vue 360° d'une structure : identité, chiffres, commandes, SAV, documents, impact. */
/** Couleur d'un statut SAV hors de l'onglet SAV (fiche 360°) — même règle que couleurHex de
 *  vueSav, qui n'existe que dans cette fonction (la fiche plantait dès qu'un SAV était listé). */
function couleurStatutSavGlobale(statut){
  const def = (state.statutsSav || []).find(d => d.statut === statut);
  if(!def) return '#8FA3B3';
  if(def.terminal) return def.couleur === 't-vert' ? '#1F9D55' : '#E62460';
  const premier = (state.statutsSav || []).filter(d => !d.terminal).sort((a, b) => a.ordre - b.ordre)[0];
  return premier && premier.statut === def.statut ? '#FECC38' : '#00ACB0';
}
function vueStructure360(){
  const s = state.structures.find(x => x.ligne === state.modal.ligne);
  if(!s) return '';
  const commandes = state.commandes.filter(c => c.code === s.code).sort((a, b) => b.ligne - a.ligne);
  const sav = (state.sav || []).filter(t => t.code === s.code || (!t.code && t.structureNom === s.nom));
  const refsDevis = new Set(commandes.map(c => c.referenceDevis).filter(Boolean));
  const refsFact = new Set(commandes.map(c => c.referenceFacture).filter(Boolean));
  const memeStructure = x => (x.code && x.code === s.code) || [x.nomStructure, x.structureNom, x.structure].some(n => n && n === s.nom);
  const devis = (state.devis || []).filter(d => refsDevis.has(d.referenceDevis) || memeStructure(d));
  const factures = (state.factures || []).filter(f => refsFact.has(f.referenceFacture) || memeStructure(f));
  const enCours = commandes.filter(c => c.statutCommande !== 'Livrée' && c.statutCommande !== 'Annulée');
  const savOuverts = sav.filter(t => { const d = state.statutsSav.find(x => x.statut === t.statut); return !(d && (d.terminal || d.finCycle)); });
  const impayees = factures.filter(f => f.statut === 'En attente' || f.statut === 'En retard');
  const montantImpaye = impayees.reduce((m, f) => m + (parseFloat(f.montantTotal) || 0), 0);
  const im = impactServeurStructure(s.code) || calculImpact(commandes);
  const type = typeStructure(s);
  const tuile = (v, l, alerte, ill) => `<div class="s3-kpi${alerte ? ' alerte' : ''}"><span data-ill="${ill}" class="ill"></span><span class="s3-kpi-txt"><b>${v}</b><span>${l}</span></span></div>`;
  const illProduit = c => (window.illustrationCvdl && window.cleIllustrationProduit && (c.lignes || [])[0]) ? window.illustrationCvdl(window.cleIllustrationProduit(c.lignes[0].produit), 30) : '<span data-ill="commandes" class="ill s"></span>';
  const vide = t => `<p class="s3-vide">${t}</p>`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog s3" role="dialog" aria-modal="true" aria-labelledby="s3-titre">
        <header class="s3-tete">
          <span data-ill="structures" class="ill xl"></span>
          <div class="s3-tete-txt">
            <div class="rp-surtitre">Structure · ${echapper(typeAChoisir(s) ? 'type à définir' : type)}${s.structurePartenaireDe ? ' · partenaire d’une Interne' : ''}</div>
            <h2 id="s3-titre">${echapper(s.nom)}</h2>
            <div class="s3-contact">${[s.email, s.telephone || s.tel, s.adresse].filter(Boolean).map(echapper).join(' · ')}</div>
            ${(s.siret || s.region) ? `<div class="s3-contact">${[s.siret ? 'SIRET ' + s.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4') : '', s.region ? 'Région : ' + s.region : ''].filter(Boolean).map(echapper).join(' · ')}</div>` : ''}
          </div>
          <div class="s3-actions">
            <button type="button" class="btn btn-secondary" data-structure-modifier="${s.ligne}">${icon('gear', 14)}Modifier</button>
            <button type="button" class="btn btn-secondary" data-rapport-structure="${s.ligne}">${icon('stats', 14)}Rapport d’impact</button>
            ${s.lienConvention ? `<a class="btn btn-secondary" href="${echapper(urlSure(s.lienConvention))}" target="_blank" rel="noopener">${icon('lien_externe', 14)}Convention</a>` : ''}
            <button type="button" class="btn btn-ghost btn-icon" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
          </div>
        </header>
        <div class="s3-kpis">
          ${tuile(commandes.length, 'commandes', false, 'commandes')}
          ${tuile(enCours.length, 'en cours', false, 'commander')}
          ${tuile(fmtNombre(im.appareils), 'appareils remis', false, 'flotte')}
          ${tuile(savOuverts.length, 'SAV ouverts', savOuverts.length > 0, 'panne')}
          ${tuile(impayees.length ? `${fmtNombre(montantImpaye)} €` : '0 €', `impayé${impayees.length > 1 ? 's' : ''} (${impayees.length})`, impayees.length > 0, 'facture')}
        </div>
        ${s.depotVente ? (() => { const d = etatDepotVente(s.code); return `<section class="s3-bloc dv-s3">
          <div class="dv-s3-corps">
            <div class="dv-s3-titre"><span data-ill="flotte" class="ill s"></span><h3>Dépôt-vente</h3>${d && d.limites && d.limites.actif ? '<span class="dv-badge-restreint">Stock restreint</span>' : ''}</div>
            ${d ? `<div class="dv-puces"><span><b>${d.enStock}</b> en stock${d.reference ? ` sur ${d.reference} au dernier réassort` : ''}</span><span><b>${d.vendus}</b> vendu${d.vendus > 1 ? 's' : ''}</span>${d.sav ? `<span><b>${d.sav}</b> en SAV</span>` : ''}${pucesAlertesDepot(d)}<span>${d.facturation === 'chaque-vente' ? 'Facture à chaque vente' : 'Sans facturation auto.'}</span></div>` : '<p class="s3-vide">Stock en cours de chargement…</p>'}
          </div>
          <div class="dv-s3-actions">
            <button type="button" class="btn btn-secondary" data-stock-restreint="${echapper(s.code)}">${icon('gear', 14)}Stock restreint</button>
            <button type="button" class="btn btn-primary" data-flotte-structure="${echapper(s.code)}">${icon('package', 14)}Gérer la flotte</button>
          </div>
        </section>`; })() : ''}
        ${type === 'Interne' || s.type === 'interne' ? blocProjetsStructure360(s) : ''}
        <div class="s3-grille">
          <section class="s3-bloc s3-large">
            <div class="s3-bloc-tete"><span data-ill="commandes" class="ill s"></span><h3>Commandes</h3><span>${commandes.length}</span></div>
            ${commandes.length ? commandes.slice(0, 12).map(c => `<div class="s3-ligne" data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0">
              <span class="s3-ic">${illProduit(c)}</span>
              <span class="s3-ligne-txt"><b>${echapper(c.reference)}</b><small>${echapper(c.date || '')} · ${(c.lignes || []).reduce((n, l) => n + (parseInt(l.quantite, 10) || 0), 0)} article(s)</small></span>
              <span class="s3-ligne-droite">${pastilleStatutCommande(c.statutCommande)}${prochaineActionCommande(c)}</span></div>`).join('') + (commandes.length > 12 ? `<p class="s3-vide">… et ${commandes.length - 12} plus ancienne(s).</p>` : '') : vide('Aucune commande.')}
          </section>
          <section class="s3-bloc">
            <div class="s3-bloc-tete"><span data-ill="suiviSav" class="ill s"></span><h3>SAV</h3><span>${sav.length}</span></div>
            ${sav.length ? sav.slice(0, 8).map(t => `<div class="s3-ligne" data-sav-ouvrir="${echapper(t.reference)}" role="button" tabindex="0">
              <span class="s3-ic"><span data-ill="panne" class="ill s"></span></span>
              <span class="s3-ligne-txt"><b>${echapper(t.reference)}</b><small>${echapper(t.symptome || t.marque || '')}</small></span>
              <span class="rp-statut" style="--st:${couleurStatutSavGlobale(t.statut)}">${echapper(t.statut || '')}</span></div>`).join('') : vide('Aucune demande SAV.')}
          </section>
          <section class="s3-bloc">
            <div class="s3-bloc-tete"><span data-ill="facture" class="ill s"></span><h3>Devis et factures</h3><span>${devis.length + factures.length}</span></div>
            ${(devis.length + factures.length) ? [...devis.map(d => ({ t: 'Devis', ref: d.referenceDevis, st: d.statut })), ...factures.map(f => ({ t: 'Facture', ref: f.referenceFacture, st: f.statut, m: f.montantTotal }))].slice(0, 10).map(d => `<div class="s3-ligne s3-doc">
              <span class="s3-ic"><span data-ill="facture" class="ill s"></span></span>
              <span class="s3-ligne-txt"><b>${echapper(d.ref || '')}</b><small>${d.t}${d.m ? ` · ${fmtNombre(parseFloat(d.m) || 0)} €` : ''}</small></span>
              <span class="tag">${echapper(d.st || '')}</span></div>`).join('') : vide(politiqueAffichee(s) ? 'Aucun document.' : 'Pas de devis ni de facture pour ce type de structure.')}
          </section>
          <section class="s3-bloc">
            <div class="s3-bloc-tete"><span data-ill="impact" class="ill s"></span><h3>Impact</h3><button type="button" class="s3-lien" data-coefficients-impact>Valeurs de calcul</button></div>
            <div class="s3-impact">
              <div><span data-ill="flotte" class="ill s"></span><span><b>${fmtNombre(im.appareils)}</b><span>appareils remis</span></span></div>
              <div><span data-ill="personne" class="ill s"></span><span><b>${fmtNombre(im.personnes)}</b><span>personnes équipées</span></span></div>
              ${im.co2 ? `<div><span data-ill="impact" class="ill s"></span><span><b>${fmtNombre(im.co2)} kg</b><span>CO₂e évités / an</span></span></div>` : ''}${im.matieres ? `<div><span data-ill="stock" class="ill s"></span><span><b>${fmtNombre(im.matieres)} kg</b><span>matières non extraites / an</span></span></div>` : ''}
            </div>
            <p class="s3-vide">Calcul automatique : chiffres ADEME par année d’utilisation.</p>
          </section>
        </div>
      </div>
    </div>`;
}
/** Projets de distribution d'une structure Interne (créés depuis son espace, portail) : lecture
 *  seule dans l'admin. Chargés à l'ouverture de la fiche, mis en cache ; la fiche se redessine. */
const cacheProjetsStructures = {};
function projetsStructureAdmin(code){
  const c = cacheProjetsStructures[code];
  if(c && (c.donnees || c.enCours)) return c.donnees || null;
  cacheProjetsStructures[code] = { enCours: true };
  jsonp({ action: 'projets-structure-admin', password: motDePasse, code }).then(r => {
    cacheProjetsStructures[code] = { donnees: r && r.ok ? r : { projets: [], remisSansProjet: 0 } };
    if(state.modal && state.modal.kind === 'structure-360') render();
  }).catch(() => { cacheProjetsStructures[code] = { donnees: { projets: [], remisSansProjet: 0, echec: true } }; });
  return null;
}
function blocProjetsStructure360(s){
  const d = projetsStructureAdmin(s.code);
  const projets = d ? d.projets.filter(p => p.statut !== 'archive') : [];
  const archives = d ? d.projets.length - projets.length : 0;
  return `<section class="s3-bloc s3-projets">
    <div class="s3-bloc-tete"><span data-ill="distribution" class="ill s"></span><h3>Projets de distribution</h3><span>${d ? projets.length : '…'}</span>
      <button type="button" class="s3-lien" data-flotte-structure="${echapper(s.code)}" style="margin-left:auto">Voir la flotte</button></div>
    ${!d ? '<p class="s3-vide">Chargement…</p>'
      : !projets.length ? `<p class="s3-vide">Aucun projet en cours${archives ? ` (${archives} archivé${archives > 1 ? 's' : ''})` : ''}. La structure les crée depuis son espace (« Projets de distribution ») et y rattache les appareils remis.</p>`
      : projets.map(p => { const av = p.avancement || {}; const tot = av.totalObjectif || 0, liv = av.totalLivre || 0; return `
        <div class="s3-projet">
          <div class="s3-projet-l"><span><b>${echapper(p.nom)}</b><small>${echapper([p.financeur, `${p.debut ? frDate(p.debut) : '…'} → ${p.butoir ? frDate(p.butoir) : '…'}`].filter(Boolean).join(' · '))}</small></span>
            <span class="s3-projet-chiffre"><b>${liv}</b> / ${tot || '—'}</span></div>
          <div class="di-barre" role="img" aria-label="${liv} distribués sur ${tot}"><i class="liv" style="width:${tot ? Math.min(100, liv / tot * 100) : 0}%"></i></div>
          <div class="s3-projet-pied">${tagRythme(av)}${(av.objectifs || []).filter(o => o.objectif || o.livre).map(o => `<span class="di-tag">${echapper(o.produit)} ${o.livre}${o.objectif ? '/' + o.objectif : ''}</span>`).join('')}</div>
        </div>`; }).join('')}
    ${d && d.remisSansProjet ? `<p class="s3-vide">${d.remisSansProjet} appareil${d.remisSansProjet > 1 ? 's' : ''} remis sans projet.</p>` : ''}
  </section>`;
}
/** Impact d'une structure calculé par le serveur (regles/impact.js) — le même que celui du
 *  rapport côté portail ; mis en cache, la vue se redessine à la réception. */
const cacheImpactStructures = {};
function impactServeurStructure(code){
  const c = cacheImpactStructures[code];
  if(c && c.donnees) return c.donnees;
  if(!c){
    cacheImpactStructures[code] = { enCours: true };
    jsonp({ action: 'rapport-impact-par-code', code }).then(r => {
      if(!r || !r.ok){ cacheImpactStructures[code] = { donnees: null, echec: true }; return; }
      const t = { appareils: 0, personnes: 0, co2: 0, matieres: 0, dechets: 0, coefConnu: false };
      r.commandes.forEach(x => { t.appareils += x.appareils; t.personnes += x.personnes; t.co2 += x.co2 || 0; t.matieres += x.matieres || 0; t.dechets += x.dechets || 0; t.coefConnu = t.coefConnu || x.coefConnu; });
      cacheImpactStructures[code] = { donnees: t };
      if(state.modal && state.modal.kind === 'structure-360') render();
    }).catch(() => { cacheImpactStructures[code] = { donnees: null, echec: true }; });
  }
  return null;
}
function politiqueAffichee(s){ return !(s.bo || s.interne || s.esn); }
document.addEventListener('click', e => {
  const r = e.target.closest('[data-rapport-structure]');
  if(r){
    const s = state.structures.find(x => x.ligne === parseInt(r.dataset.rapportStructure, 10));
    if(s) window.open(`rapport-impact.html?code=${encodeURIComponent(s.code)}`, '_blank', 'noopener');
    return;
  }
  const rc = e.target.closest('[data-rapport-commande]');
  if(rc){
    const c = state.commandes.find(x => x.reference === rc.dataset.rapportCommande);
    if(c) window.open(`rapport-impact.html?code=${encodeURIComponent(c.code)}&ref=${encodeURIComponent(c.reference)}`, '_blank', 'noopener');
    return;
  }
  if(e.target.closest('[data-coefficients-impact]')){ state.modal = { kind: 'coefficients-impact', modalParent: modalParentPour('coefficients-impact') }; render(); return; }
  if(e.target.id === 'coef-enregistrer'){ enregistrerCoefficientsImpact(); return; }
  const s3 = e.target.closest('[data-structure-vue]');
  if(s3 && s3.classList.contains('lien-structure')) e.stopPropagation();
  if(s3 && !e.target.closest('[data-reveal-code], [data-structure-modifier]')){ state.modal = { kind: 'structure-360', ligne: parseInt(s3.dataset.structureVue, 10), modalParent: modalParentPour('structure-360') }; render(); }
});

/* Échap : ferme la dernière modale ouverte (la précédente reste affichée). */
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape' || !state.modal || document.querySelector('.cvdl-conf-voile')) return;
  state.modal = state.modal.modalParent || null; state.ncLignes = []; state.ndLignes = []; render();
});

/* ════════════════════════════════════════════════════════════════════════════════════
   DISTRIBUTION — programmes de distribution (onglet, formulaire, détail), rattachement des
   commandes à la livraison, calendrier global. Back : routes/distributions.js, distributions.js.
   ════════════════════════════════════════════════════════════════════════════════════ */
const TYPES_PERIMETRE = [['rn', 'RNum'], ['projets', 'Projets'], ['bo', 'BO'], ['interne', 'Interne'], ['esn', 'ESN'], ['standard', 'Standard']];
const MODES_RATTACHEMENT = {
  propose: { libelle: 'Proposé à la livraison', aide: 'À l’étape « Confirmer la livraison », question « Rattacher à ce programme ? » (oui / non).' },
  auto: { libelle: 'Automatique', aide: 'Toute commande éligible est rattachée dès sa création (modifiable).' },
  lien: { libelle: 'Lien de commande dédié', aide: 'Seules les commandes passées via le lien du programme sont rattachées (appels à projets).' },
};
function departementDeAdresse(adresse){
  const cps = String(adresse || '').match(/\b\d{5}\b/g);
  if(!cps) return '';
  const cp = cps[cps.length - 1];
  if(cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3);
  if(cp.startsWith('20')) return parseInt(cp, 10) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}
const isoJour = d => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const frDate = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ''); };
function phaseProgramme(p){
  if(p.statut === 'archive') return 'archives';
  const auj = isoJour(new Date());
  if(p.debut && auj < p.debut) return 'avenir';
  if(p.butoir && auj > p.butoir) return 'termines';
  return 'cours';
}
async function rechargerDistributions(){
  const r = await jsonp({ action: 'distributions', password: motDePasse });
  if(r && r.ok){ state.distributions = r.programmes || []; state.rattachements = r.rattachements || []; }
}
function nomProgramme(id){ const p = state.distributions.find(x => x.id === id); return p ? p.nom : id; }
function barreObjectif(o, echelle, sous){
  const base = Math.max(o.objectif || echelle || 0, o.livre + o.engage, 1);
  return `<div class="di-obj${sous ? ' sous' : ''}"><div class="di-obj-l"><b>${echapper(o.produit)}</b><span>${o.livre} livré${o.livre > 1 ? 's' : ''}${o.engage ? ` · ${o.engage} engagé${o.engage > 1 ? 's' : ''}` : ''}${o.objectif ? ` / ${o.objectif}` : ''}${o.livre > o.objectif && o.objectif ? ' · dépassé' : ''}</span></div>
    <div class="di-barre" role="img" aria-label="${echapper(o.produit)} : ${o.livre} livrés, ${o.engage} engagés sur ${o.objectif}"><i class="liv" style="width:${Math.min(100, o.livre / base * 100)}%"></i><i class="eng" style="width:${Math.min(100, o.engage / base * 100)}%"></i></div></div>`;
}
/** Barres d'un programme : objectif global (tous produits confondus) puis détail par produit. */
function barresProgramme(av){
  const lignes = av.objectifs || [];
  if(!av.global) return lignes.map(o => barreObjectif(o)).join('');
  return barreObjectif({ produit: 'Total', objectif: av.totalObjectif, livre: av.totalLivre, engage: av.totalEngage || 0 })
    + lignes.filter(o => o.objectif || o.livre || o.engage).map(o => barreObjectif(o, av.totalObjectif, true)).join('');
}
function tagRythme(av){
  if(!av) return '';
  if(av.reste === 0) return '<span class="di-tag ok">Objectif atteint</span>';
  if(av.joursRestants != null && av.joursRestants < 0) return '<span class="di-tag alerte">Terminé · objectif non atteint</span>';
  return av.enRetard ? `<span class="di-tag alerte" title="Rythme actuel ~${av.rythmeActuel}/sem.">En retard : ~${av.rythmeNecessaire}/sem. à livrer</span>` : '<span class="di-tag ok">Dans le rythme</span>';
}
function resumePerimetre(p){
  const per = p.perimetre || {}; const t = [];
  if(per.structures && per.structures.length) t.push(`${per.structures.length} structure${per.structures.length > 1 ? 's' : ''} désignée${per.structures.length > 1 ? 's' : ''}`);
  else {
    if(per.regions && per.regions.length) t.push(per.regions.join(', '));
    if(per.departements && per.departements.length) t.push('Dép. ' + per.departements.join(', '));
    if(per.types && per.types.length) t.push(per.types.map(x => (TYPES_PERIMETRE.find(y => y[0] === x) || [x, x])[1]).join(' · '));
  }
  return t.length ? t : ['Toutes les structures'];
}

/* ── Onglet Distribution ── */
function vueDistribution(){
  const liste = state.distributions || [];
  const compte = k => liste.filter(p => phaseProgramme(p) === k).length;
  const regions = [...new Set(liste.flatMap(p => (p.perimetre && p.perimetre.regions) || []))].sort((a, b) => a.localeCompare(b, 'fr'));
  const visibles = liste.filter(p => phaseProgramme(p) === state.distFiltre && (!state.distRegion || ((p.perimetre && p.perimetre.regions) || []).includes(state.distRegion)));
  const filtre = (k, l) => `<button type="button" class="di-filtre${state.distFiltre === k ? ' on' : ''}" data-dist-filtre="${k}" aria-pressed="${state.distFiltre === k}">${l} (${compte(k)})</button>`;
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)">
      <div><h1 style="font-size:32px;margin-bottom:var(--space-2)">Distribution</h1><p style="opacity:0.65;margin:0;font-size:15px">Programmes de distribution : objectifs, livré, engagé et reste à distribuer.</p></div>
      <button type="button" class="btn btn-primary" data-dist-nouveau>${icon('plus', 15)}Nouveau programme</button>
    </div>
    <div class="di-filtres">${filtre('cours', 'En cours')}${filtre('avenir', 'À venir')}${filtre('termines', 'Terminés')}${filtre('archives', 'Archivés')}
      ${regions.length ? `<select class="input" id="dist-region" style="width:auto" aria-label="Filtrer par région"><option value="">Toutes les régions</option>${regions.map(r => `<option ${state.distRegion === r ? 'selected' : ''}>${echapper(r)}</option>`).join('')}</select>` : ''}</div>
    <div class="di-legende"><span><i class="liv"></i>Livré</span><span><i class="eng"></i>Engagé (validée, pas encore livrée)</span><span><i></i>Reste</span></div>
    ${visibles.length ? `<div class="di-grille">${visibles.map(p => {
      const av = p.avancement || {};
      const tot = av.totalObjectif || 0, liv = av.totalLivre || 0, eng = av.totalEngage || 0;
      const pct = tot ? Math.min(100, Math.round(liv / tot * 100)) : 0;
      const pctEng = tot ? Math.min(100 - pct, Math.round(eng / tot * 100)) : 0;
      const r = 26, c = 2 * Math.PI * r;
      const jours = av.joursRestants != null && av.joursRestants >= 0 ? av.joursRestants : null;
      const perim = resumePerimetre(p);
      const produits = (av.objectifs || []).filter(o => o.objectif || o.livre || o.engage);
      return `<article class="di-carte di2${av.enRetard && av.reste ? ' retard' : ''}${av.reste === 0 ? ' atteint' : ''}" data-dist-ouvrir="${echapper(p.id)}" role="button" tabindex="0" aria-label="Ouvrir ${echapper(p.nom)}">
        <div class="di2-tete">
          <svg class="di2-anneau" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
            <circle cx="34" cy="34" r="${r + 5}" fill="color-mix(in srgb, #002743 12%, transparent)"/>
            <circle cx="32" cy="32" r="${r + 5}" fill="#fff" stroke="#002743" stroke-width="1.4"/>
            <circle cx="32" cy="32" r="${r}" fill="none" stroke="#EEF2F5" stroke-width="7"/>
            ${pctEng ? `<circle cx="32" cy="32" r="${r}" fill="none" stroke="#9FE0E1" stroke-width="7" stroke-dasharray="${(pct + pctEng) / 100 * c} ${c}" transform="rotate(-90 32 32)"/>` : ''}
            ${pct ? `<circle cx="32" cy="32" r="${r}" fill="none" stroke="#00ACB0" stroke-width="7" stroke-dasharray="${pct / 100 * c} ${c}" transform="rotate(-90 32 32)"/>` : ''}
            <text x="32" y="36.5" text-anchor="middle" font-size="12" font-weight="700" fill="#002743" font-family="Space Grotesk, system-ui">${pct}%</text>
          </svg>
          <div class="di2-titre">
            ${p.financeur ? `<div class="di-sur">${echapper(p.financeur)}</div>` : ''}
            <h3>${echapper(p.nom)}</h3>
            <div class="di2-periode">${icon('calendrier', 13)}${frDate(p.debut)} → <b>${frDate(p.butoir)}</b></div>
          </div>
        </div>
        <div class="di2-chiffres">
          <div><b>${liv}</b><span>livré${liv > 1 ? 's' : ''}</span></div>
          <div><b>${eng}</b><span>engagé${eng > 1 ? 's' : ''}</span></div>
          <div><b>${av.reste != null ? av.reste : Math.max(0, tot - liv)}</b><span>à distribuer</span></div>
          <div><b>${tot || '—'}</b><span>objectif</span></div>
        </div>
        ${produits.length ? `<div class="di2-produits">${produits.slice(0, 3).map(o => { const b = Math.max(o.objectif || 0, o.livre + o.engage, 1); return `<div class="di2-prod"><span>${echapper(o.produit)}</span><span class="di2-piste"><i class="l" style="width:${o.livre / b * 100}%"></i><i class="e" style="width:${o.engage / b * 100}%"></i></span><small>${o.livre}${o.objectif ? `/${o.objectif}` : ''}</small></div>`; }).join('')}${produits.length > 3 ? `<div class="di2-plus">+ ${produits.length - 3} autre${produits.length - 3 > 1 ? 's' : ''} produit${produits.length - 3 > 1 ? 's' : ''}</div>` : ''}</div>` : ''}
        <div class="di2-pied">
          <span class="di2-puce" title="Périmètre">${icon('pin', 12)}${echapper(perim.join(' · '))}</span>
          <span class="di2-puce">${icon('arrow', 12)}${echapper(MODES_RATTACHEMENT[p.mode].libelle)}</span>
          <span class="di-esp"></span>
          ${jours != null ? `<span class="di-jours${jours < 60 && av.enRetard ? ' urg' : ''}">J-${jours}</span>` : ''}${tagRythme(av)}
        </div>
      </article>`; }).join('')}</div>`
      : `<div class="pk-etat"><span data-ill="vide" class="ill"></span>${liste.length ? 'Aucun programme dans ce filtre.' : 'Aucun programme pour l’instant : créez le premier avec « Nouveau programme ».'}</div>`}`;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-dist-filtre]'); if(f){ state.distFiltre = f.dataset.distFiltre; render(); return; }
  if(e.target.closest('[data-dist-nouveau]')){ state.modal = { kind: 'distribution-form', modalParent: modalParentPour('distribution-form') }; render(); return; }
  const o = e.target.closest('[data-dist-ouvrir]'); if(o){ state.modal = { kind: 'distribution-detail', ref: o.dataset.distOuvrir, modalParent: modalParentPour('distribution-detail') }; render(); return; }
  const m = e.target.closest('[data-dist-modifier]'); if(m){ state.modal = { kind: 'distribution-form', ref: m.dataset.distModifier, modalParent: state.modal }; render(); return; }
});
document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches && e.target.matches('[data-dist-ouvrir]')) e.target.click(); });
document.addEventListener('change', e => { if(e.target.id === 'dist-region'){ state.distRegion = e.target.value; render(); } });

/* ── Formulaire (création / modification) ── */
function ligneObjectifForm(o){
  return `<div class="di-ligne-f" data-dist-obj><select class="input" aria-label="Produit"><option value="">Choisir un produit…</option>${state.produits.map(p => `<option ${o && o.produit === p.nom ? 'selected' : ''}>${echapper(p.nom)}</option>`).join('')}</select>
    <input class="input" type="number" min="1" value="${o ? o.quantite : ''}" placeholder="Quantité" aria-label="Quantité"><button type="button" class="btn btn-ghost btn-icon" data-dist-retirer aria-label="Retirer">${icon('x', 14)}</button></div>`;
}
/** « Déjà distribués avant le suivi » : produit ('' = sans produit précisé) + quantité. */
function ligneDejaForm(d){
  return `<div class="di-ligne-f" data-dist-deja><select class="input" aria-label="Produit"><option value="">Sans produit précisé</option>${state.produits.map(p => `<option ${d && d.produit === p.nom ? 'selected' : ''}>${echapper(p.nom)}</option>`).join('')}</select>
    <input class="input" type="number" min="1" value="${d ? d.quantite : ''}" placeholder="Quantité" aria-label="Quantité déjà distribuée"><button type="button" class="btn btn-ghost btn-icon" data-dist-retirer aria-label="Retirer">${icon('x', 14)}</button></div>`;
}
function ligneJalonForm(j){
  return `<div class="di-ligne-f jalon" data-dist-jalon><input class="input" type="date" value="${j ? echapper(j.date) : ''}" aria-label="Date"><input class="input" value="${j ? echapper(j.libelle) : ''}" placeholder="ex. Bilan intermédiaire financeur" aria-label="Libellé"><button type="button" class="btn btn-ghost btn-icon" data-dist-retirer aria-label="Retirer">${icon('x', 14)}</button></div>`;
}
function vueDistributionForm(){
  const p = state.modal.ref ? state.distributions.find(x => x.id === state.modal.ref) : null;
  const per = (p && p.perimetre) || { regions: [], departements: [], types: [], structures: [] };
  const puce = (groupe, val, lib, on) => `<label class="di-puce"><input type="checkbox" data-dist-per="${groupe}" value="${echapper(val)}" ${on ? 'checked' : ''}><span>${echapper(lib)}</span></label>`;
  const corps = `<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:14px;min-width:0">
    <div class="di-champs">
      <label class="field di-pleine"><span>Nom *</span><input class="input" id="df-nom" value="${p ? echapper(p.nom) : ''}"></label>
      <label class="field"><span>Financeur / partenaire</span><input class="input" id="df-financeur" value="${p ? echapper(p.financeur) : ''}"></label>
      <label class="field"><span>Référence interne</span><input class="input" id="df-reference" value="${p ? echapper(p.reference) : ''}" placeholder="ex. convention 2026-14"></label>
      <label class="field"><span>Début *</span><input class="input" type="date" id="df-debut" value="${p ? echapper(p.debut) : isoJour(new Date())}"></label>
      <label class="field"><span>Date butoir *</span><input class="input" type="date" id="df-butoir" value="${p ? echapper(p.butoir) : ''}"></label>
    </div>
    <section class="di-sect"><h3>Périmètre : qui peut en bénéficier</h3><p class="di-aide">Critère vide = pas de restriction. Une liste de structures précise remplace les autres critères.</p>
      <div><b>Régions analytiques</b><div class="di-puces">${REGIONS_ANALYTIQUE.map(r => puce('regions', r, r, per.regions.includes(r))).join('')}</div></div>
      <label class="field"><span>Départements <em style="font-weight:400">(numéros séparés par des virgules, d’après le code postal de la structure)</em></span><input class="input" id="df-departements" value="${echapper(per.departements.join(', '))}" placeholder="93, 94"></label>
      <div><b>Types de structure</b><div class="di-puces">${TYPES_PERIMETRE.map(([k, l]) => puce('types', k, l, per.types.includes(k))).join('')}</div></div>
      <details ${per.structures.length ? 'open' : ''}><summary><b>Structures précises</b> <span class="di-aide">(${per.structures.length || 'aucune'})</span></summary>
        <input class="input" id="df-recherche-struct" placeholder="Filtrer…" style="margin:8px 0">
        <div class="di-structs">${state.structures.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(s => `<label data-nom="${echapper(s.nom.toLowerCase())}"><input type="checkbox" data-dist-per="structures" value="${echapper(s.code)}" ${per.structures.includes(s.code) ? 'checked' : ''}>${echapper(s.nom)}</label>`).join('')}</div></details>
    </section>
    <section class="di-sect"><h3>Objectifs *</h3>
      <label class="field"><span>Objectif global <em style="font-weight:400">(tous produits confondus, facultatif)</em></span><input class="input" type="number" min="1" id="df-global" value="${p && p.objectifGlobal ? p.objectifGlobal : ''}" placeholder="ex. 500" style="max-width:200px"></label>
      <p class="di-aide">Par produit : quantité à atteindre pour chaque produit. Avec un objectif global, la quantité par produit devient facultative : une ligne sans quantité limite simplement les produits comptés. Sans aucune ligne, tous les produits comptent.</p>
      <div id="df-objectifs">${(p ? p.objectifs : [null]).map(ligneObjectifForm).join('')}</div>
      <div><button type="button" class="btn btn-secondary" data-dist-ajout-obj>${icon('plus', 14)}Ajouter un produit</button></div></section>
    <section class="di-sect"><h3>Rattachement des commandes</h3><div class="di-radios">${Object.entries(MODES_RATTACHEMENT).map(([k, m]) => `<label><input type="radio" name="df-mode" value="${k}" ${(p ? p.mode : 'propose') === k ? 'checked' : ''}><span><b>${m.libelle}</b><small>${m.aide}</small></span></label>`).join('')}</div>
      <p class="di-aide">Une structure peut aussi être liée à ce programme depuis sa fiche : toutes ses commandes y sont alors rattachées d’office.</p></section>
    <section class="di-sect"><h3>Déjà distribués avant le suivi <span class="di-aide">(facultatif)</span></h3>
      <p class="di-aide">Pour un programme déjà en cours avant sa création ici : ces appareils comptent dans le « livré » dès le début du programme.</p>
      <div id="df-deja">${((p && p.deja) || []).map(ligneDejaForm).join('')}</div>
      <div><button type="button" class="btn btn-secondary" data-dist-ajout-deja>${icon('plus', 14)}Ajouter des appareils déjà distribués</button></div></section>
    <section class="di-sect"><h3>Points d’étape <span class="di-aide">(affichés dans le calendrier)</span></h3><div id="df-jalons">${((p && p.jalons) || []).map(ligneJalonForm).join('')}</div>
      <div><button type="button" class="btn btn-secondary" data-dist-ajout-jalon>${icon('plus', 14)}Ajouter un point d’étape</button></div></section>
  </div>`;
  return `<div class="dialog-backdrop"><div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="df-titre" style="width:min(860px,100%)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)"><div class="dialog-title" id="df-titre">${p ? 'Modifier le programme' : 'Nouveau programme de distribution'}</div>
      <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
    <div class="dialog-corps">${corps}</div><div id="rp-retour-modale"></div>
    <div class="dialog-actions" style="justify-content:flex-end"><button type="button" class="btn btn-primary" id="df-enregistrer">${p ? 'Enregistrer' : 'Créer le programme'}</button></div>
  </div></div>`;
}
document.addEventListener('click', async e => {
  if(e.target.closest('[data-dist-ajout-obj]')){ $('df-objectifs').insertAdjacentHTML('beforeend', ligneObjectifForm(null)); return; }
  if(e.target.closest('[data-dist-ajout-jalon]')){ $('df-jalons').insertAdjacentHTML('beforeend', ligneJalonForm(null)); return; }
  if(e.target.closest('[data-dist-ajout-deja]')){ $('df-deja').insertAdjacentHTML('beforeend', ligneDejaForm(null)); return; }
  const r = e.target.closest('[data-dist-retirer]'); if(r){ r.parentElement.remove(); return; }
  if(e.target.id !== 'df-enregistrer') return;
  const coches = g => [...document.querySelectorAll(`[data-dist-per="${g}"]:checked`)].map(x => x.value);
  const programme = {
    id: state.modal.ref || '', nom: $('df-nom').value.trim(), financeur: $('df-financeur').value.trim(), reference: $('df-reference').value.trim(),
    debut: $('df-debut').value, butoir: $('df-butoir').value,
    perimetre: { regions: coches('regions'), types: coches('types'), structures: coches('structures'),
      departements: $('df-departements').value.split(/[,;\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean) },
    objectifGlobal: parseInt($('df-global').value, 10) || 0,
    objectifs: [...document.querySelectorAll('[data-dist-obj]')].map(l => ({ produit: l.querySelector('select').value, quantite: parseInt(l.querySelector('input').value, 10) || 0 })).filter(o => o.produit && (o.quantite > 0 || parseInt($('df-global').value, 10) > 0)),
    mode: (document.querySelector('input[name="df-mode"]:checked') || {}).value || 'propose',
    deja: [...document.querySelectorAll('[data-dist-deja]')].map(l => ({ produit: l.querySelector('select').value, quantite: parseInt(l.querySelector('input').value, 10) || 0 })).filter(d => d.quantite > 0),
    jalons: [...document.querySelectorAll('[data-dist-jalon]')].map(l => ({ date: l.querySelectorAll('input')[0].value, libelle: l.querySelectorAll('input')[1].value.trim() })).filter(j => j.date),
  };
  e.target.disabled = true;
  const res = await posterEtat({ action: 'distribution-enregistrer', programme }, 'Enregistrement…', 'Programme enregistré');
  if(res && res.ok){ await rechargerDistributions(); state.modal = { kind: 'distribution-detail', ref: res.id, modalParent: null }; render(); }
  else { afficherErreurModale(res && res.erreur); e.target.disabled = false; }
});
document.addEventListener('input', e => {
  if(e.target.id !== 'df-recherche-struct') return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.di-structs label').forEach(l => { l.hidden = !!q && !l.dataset.nom.includes(q); });
});

/* ── Détail d'un programme ── */
function vueDistributionDetail(){
  const p = state.distributions.find(x => x.id === state.modal.ref);
  if(!p) return '';
  const av = p.avancement || { objectifs: [], commandes: [], parDepartement: {}, parStructure: {} };
  const deps = Object.entries(av.parDepartement || {}).sort((a, b) => b[1] - a[1]);
  const maxDep = Math.max(1, ...deps.map(d => d[1]));
  const structs = Object.entries(av.parStructure || {}).sort((a, b) => b[1] - a[1]);
  const lien = new URL('commande.html?programme=' + encodeURIComponent(p.id), location.href).toString();
  const corps = `<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="di-tags">${resumePerimetre(p).map(t => `<span class="di-tag">${echapper(t)}</span>`).join('')}<span class="di-tag mode">${echapper(MODES_RATTACHEMENT[p.mode].libelle)}</span>${p.reference ? `<span class="di-tag">${echapper(p.reference)}</span>` : ''}${tagRythme(av)}</div>
    ${p.mode === 'lien' ? `<div class="msg msg-info" style="flex-wrap:wrap">Lien de commande dédié : <code style="user-select:all;word-break:break-all">${echapper(lien)}</code> <button type="button" class="btn btn-secondary btn-sm" data-copier-jeton="${echapper(lien)}">Copier</button></div>` : ''}
    <div class="di-detail">
      <section class="di-bloc"><h3>Avancement</h3>${barresProgramme(av) || '<p class="di-aide">Aucun objectif.</p>'}
        ${av.enRetard && av.rythmeNecessaire ? `<p class="di-aide">Rythme nécessaire : ~${av.rythmeNecessaire} / semaine jusqu’au ${frDate(p.butoir)} (rythme actuel ~${av.rythmeActuel}).${av.projection ? ` Au rythme actuel, objectif atteint vers le ${frDate(av.projection)}.` : ''}</p>` : ''}
        <h3 style="margin-top:6px">Commandes rattachées (${av.commandes.length})</h3>
        ${av.commandes.length ? `<div class="di-table"><table><thead><tr><th>Commande</th><th>Structure</th><th>Comptés</th><th>État</th></tr></thead><tbody>${av.commandes.map(c => c.avantSuivi ? `<tr class="di-avant"><td><b>Avant le suivi</b></td><td>—</td><td>${Object.entries(c.compte).map(([pr, q]) => `${q} × ${echapper(pr)}`).join(' · ')}</td><td><span class="di-tag">Déjà distribués</span></td></tr>` : `<tr data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0"><td><b>${echapper(c.reference)}</b></td><td>${echapper(c.nom || c.code)}</td><td>${Object.entries(c.compte).map(([pr, q]) => `${q} × ${echapper(pr)}`).join(' · ')}</td><td>${c.statut === 'Livrée' ? `<span class="di-tag ok">Livrée ${echapper(c.dateLivraison)}</span>` : `<span class="di-tag">${echapper(c.statut)}</span>`}</td></tr>`).join('')}</tbody></table></div>` : '<p class="di-aide">Aucune commande rattachée pour l’instant.</p>'}
      </section>
      <section class="di-bloc"><h3>Par département</h3>${deps.length ? deps.map(([d, q]) => `<div class="di-hb"><b>${echapper(d)}</b><span class="di-hbt"><i style="width:${q / maxDep * 100}%"></i></span><span>${q}</span></div>`).join('') : '<p class="di-aide">Rien de livré.</p>'}
        <h3 style="margin-top:6px">Par structure</h3>${structs.slice(0, 8).map(([n, q]) => `<div class="di-hb large"><span>${echapper(n)}</span><span class="di-hbt"><i style="width:${q / Math.max(1, structs[0][1]) * 100}%"></i></span><span>${q}</span></div>`).join('') || '<p class="di-aide">—</p>'}${structs.length > 8 ? `<p class="di-aide">+ ${structs.length - 8} autres</p>` : ''}
        ${av.personnes ? `<p class="di-aide">${av.personnes} personne${av.personnes > 1 ? 's' : ''} équipée${av.personnes > 1 ? 's' : ''}.</p>` : ''}
        <h3 style="margin-top:6px">Points d’étape</h3><div class="di-jalons">${[...(p.jalons || []), { date: p.butoir, libelle: 'Date butoir', fin: true }].sort((a, b) => a.date.localeCompare(b.date)).map(j => `<div class="${j.date < isoJour(new Date()) ? 'passe' : ''}${j.fin ? ' fin' : ''}"><b>${frDate(j.date)}</b> · ${echapper(j.libelle || '')}</div>`).join('')}</div>
      </section>
    </div></div>`;
  return `<div class="dialog-backdrop"><div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="dd-titre" style="width:min(1040px,100%)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)"><div><div class="rp-surtitre">${echapper([p.financeur, `${frDate(p.debut)} → ${frDate(p.butoir)}`].filter(Boolean).join(' · '))}</div><div class="dialog-title" id="dd-titre">${echapper(p.nom)}</div></div>
      <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
    <div class="dialog-corps">${corps}</div><div id="rp-retour-modale"></div>
    <div class="dialog-actions" style="justify-content:space-between">
      <button type="button" class="btn btn-ghost" data-dist-archiver="${echapper(p.id)}" data-archiver="${p.statut === 'archive' ? '0' : '1'}">${p.statut === 'archive' ? 'Désarchiver' : 'Archiver'}</button>
      <span style="display:flex;gap:8px"><button type="button" class="btn btn-secondary" data-dist-export="${echapper(p.id)}">${icon('file', 14)}Exporter CSV</button><button type="button" class="btn btn-primary" data-dist-modifier="${echapper(p.id)}">Modifier</button></span>
    </div></div></div>`;
}
function telechargerCsv(nom, lignes){
  const csv = '﻿' + lignes.map(l => l.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
document.addEventListener('click', async e => {
  const ex = e.target.closest('[data-dist-export]');
  if(ex){
    const p = state.distributions.find(x => x.id === ex.dataset.distExport); if(!p) return;
    const lignes = [['Programme', 'Commande', 'Structure', 'Département', 'Produit', 'Quantité', 'État', 'Livrée le']];
    (p.avancement.commandes || []).forEach(c => Object.entries(c.compte).forEach(([pr, q]) => lignes.push([p.nom, c.reference, c.nom || c.code, c.departement, pr, q, c.statut, c.dateLivraison])));
    telechargerCsv(`distribution-${p.id}.csv`, lignes); return;
  }
  const ar = e.target.closest('[data-dist-archiver]');
  if(ar){
    const archiver = ar.dataset.archiver === '1';
    if(archiver && !await confirmerCvdl('Archiver ce programme ?\n\nIl ne sera plus proposé aux commandes ; son historique reste consultable (filtre « Archivés »).')) return;
    const r = await posterEtat({ action: 'distribution-archiver', id: ar.dataset.distArchiver, archiver }, 'Enregistrement…', archiver ? 'Programme archivé' : 'Programme réactivé');
    if(r && r.ok){ await rechargerDistributions(); render(); }
  }
});

/* ── Rattachement d'une commande (carte d'étape « Confirmer la livraison » / commande livrée) ── */
function resumeAffectation(dist){
  const parProg = {};
  Object.entries(dist.affectation || {}).forEach(([prod, id]) => { (parProg[id] = parProg[id] || []).push(prod); });
  return Object.entries(parProg).map(([id, prods]) => `${echapper((dist.noms && dist.noms[id]) || nomProgramme(id))} (${prods.map(echapper).join(', ')})`).join(' · ');
}
function tacheProgrammeCommande(c){
  const d = c.distribution;
  if(!d || (!(d.aDemander || []).length && !Object.keys(d.affectation || {}).length && d.source !== 'non')) return null;
  const ref = echapper(c.reference);
  if((d.aDemander || []).length && !d.repondu){
    return { etat: 'cours', titre: 'Programme de distribution ?',
      detail: `Cette commande correspond à ${d.aDemander.length > 1 ? d.aDemander.length + ' programmes en cours' : 'un programme en cours'}. Les produits comptés s’ajoutent à son « livré ».${Object.keys(d.affectation || {}).length ? ` Déjà rattachée : ${resumeAffectation(d)}.` : ''}`,
      contenu: `<div class="di-choix">${d.aDemander.map(p => `<button type="button" class="di-choix-oui" data-dist-rattacher="${ref}" data-programme="${echapper(p.id)}"><b>Oui : ${echapper(p.nom)}</b><small>compte ${Object.entries(p.compte).map(([pr, q]) => `${q} × ${echapper(pr)}`).join(' · ')}</small></button>`).join('')}
        <button type="button" class="di-choix-non" data-dist-rattacher="${ref}" data-programme="NON"><b>Non</b><small>aucun programme pour cette commande</small></button></div>` };
  }
  return { etat: 'ok', titre: 'Programme de distribution',
    detail: d.source === 'non' || !Object.keys(d.affectation || {}).length ? 'Non rattachée' : `${resumeAffectation(d)}${d.source === 'auto' ? ' · auto' : d.source === 'lien' ? ' · via le lien dédié' : ''}`,
    action: `<button type="button" class="et-lien" data-dist-reinit="${ref}">Modifier</button>` };
}
async function enregistrerRattachement(c, valeur){
  const r = await posterEtat({ action: 'commande-programmes', ligne: c.ligne, valeur }, 'Enregistrement…', 'Rattachement enregistré');
  if(!(r && r.ok)) return;
  const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
  if(rc && rc.ok) state.commandes = rc.commandes || [];
  delete cacheEtatsCommandes[c.reference];
  rechargerDistributions().then(render);
  render();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-dist-rattacher]');
  if(b){
    const c = state.commandes.find(x => x.reference === b.dataset.distRattacher); if(!c || !c.distribution) return;
    if(b.dataset.programme === 'NON'){ enregistrerRattachement(c, Object.keys(c.distribution.affectation || {}).length ? { ...c.distribution.affectation } : 'NON'); return; }
    const p = c.distribution.aDemander.find(x => x.id === b.dataset.programme); if(!p) return;
    const a = { ...(c.distribution.affectation || {}) };
    Object.keys(p.compte).forEach(prod => { a[prod] = p.id; });
    enregistrerRattachement(c, a);
    return;
  }
  const ri = e.target.closest('[data-dist-reinit]');
  if(ri){ const c = state.commandes.find(x => x.reference === ri.dataset.distReinit); if(c) enregistrerRattachement(c, ''); }
});

/* ════════════════════════════════════════════════════════════════════════════════════
   Dépôt-vente — stock des structures en dépôt-vente, géré aussi depuis l'admin
   · state.depotVente : état par structure (routes/depotVente.js) — onglet Stock, fiche
     structure, fil des priorités / cloche (stock ancien, stock divisé par deux) ;
   · modale « flotte-structure » : la flotte de la structure (même feuille que son espace),
     modifiable en direct — statut, personne, date de vente, lieu de stockage, commentaire.
   ════════════════════════════════════════════════════════════════════════════════════ */
async function chargerDepotVente(){
  try{
    const r = await jsonp({ action: 'depot-vente-etat', password: motDePasse });
    if(r && r.ok){ state.depotVente = r.structures || []; if(!state.modal || state.modal.kind !== 'creer-structure') render(); }
  }catch(e){ /* non bloquant */ }
}
function etatDepotVente(code){ return (state.depotVente || []).find(x => x.code === code) || null; }
/** Lignes du fil des priorités (et donc de la cloche) pour le dépôt-vente. */
function feedDepotVente(){
  const out = [];
  (state.depotVente || []).forEach(d => {
    if(d.anciens) out.push({ icon: icon('clock', 15), badgeBg: 'var(--th-bg-fff3ccff, #FFF3CC)', badgeFg: 'var(--th-tx-7a5a00ff, #7A5A00)', tagCls: '', tagStyle: 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)', type: 'Dépôt-vente', id: d.nom, structure: 'Dépôt-vente', statut: `${d.anciens} appareil${d.anciens > 1 ? 's' : ''} en stock depuis + de 2 mois`, urgent: false, date: new Date(), attrs: `data-flotte-structure="${echapper(d.code)}"` });
    const bas = d.stockBas || {};
    if(bas.global || (bas.produits || []).length) out.push({ icon: icon('package', 15), badgeBg: 'var(--th-bg-fff3ccff, #FFF3CC)', badgeFg: 'var(--th-tx-7a5a00ff, #7A5A00)', tagCls: '', tagStyle: 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)', type: 'Dépôt-vente', id: d.nom, structure: 'Stock bas', statut: bas.global ? `Stock bas : ${d.enStock} appareil${d.enStock > 1 ? 's' : ''} (seuil ${d.limites.seuilBas})` : `Stock bas : ${bas.produits.map(p => `${p.produit} (${p.enStock})`).join(', ')}`, urgent: true, date: new Date(), attrs: `data-flotte-structure="${echapper(d.code)}"` });
    if(d.moitie) out.push({ icon: icon('package', 15), badgeBg: 'var(--color-accent-100)', badgeFg: 'var(--color-accent-700)', tagCls: 'tag-accent', type: 'Dépôt-vente', id: d.nom, structure: 'Dépôt-vente', statut: `Stock divisé par deux (${d.enStock}/${d.reference})`, urgent: true, date: new Date(), attrs: `data-flotte-structure="${echapper(d.code)}"` });
  });
  return out;
}
/** Pastilles d'alerte d'une structure en dépôt-vente (fiche, onglet Stock). */
function pucesAlertesDepot(d){
  const bas = d.stockBas || {};
  return [
    d.anciens ? `<span class="att">${d.anciens} depuis + de 2 mois</span>` : '',
    d.moitie ? '<span class="ko">Stock divisé par deux</span>' : '',
    bas.global ? `<span class="ko">Stock bas (≤ ${d.limites.seuilBas})</span>` : '',
    ...(bas.produits || []).map(p => `<span class="ko">${echapper(p.produit)} : stock bas (${p.enStock})</span>`),
    d.auPlafond ? `<span class="att">Plafond atteint (${d.limites.plafond})</span>` : '',
  ].join('');
}

/* ── « Mode stock bas » (onglet Stock) : limite TOUTES les commandes des structures sur le
   portail — total d'articles par commande, quantité par produit (défaut + réglage par produit),
   message affiché sur le formulaire. Les saisies manuelles de l'admin ne sont pas limitées. ── */
function msbActif(){ return !!(state.modeStockBas && state.modeStockBas.actif); }
async function chargerModeStockBas(){
  try{ const r = await jsonp({ action: 'mode-stock-bas', password: motDePasse }); if(r && r.ok){ state.modeStockBas = r.mode; if(state.activeTab === 'stock' && !state.modal) render(); } }catch(e){ /* non bloquant */ }
}
function resumeModeStockBas(m){
  const parties = [];
  if(m.maxParCommande != null) parties.push(`${m.maxParCommande} article${m.maxParCommande > 1 ? 's' : ''} max. par commande`);
  if(m.maxParProduit != null) parties.push(`${m.maxParProduit} par produit`);
  const n = Object.keys(m.produits || {}).length;
  if(n) parties.push(`${n} produit${n > 1 ? 's' : ''} réglé${n > 1 ? 's' : ''} à part`);
  return parties.join(' · ') || 'aucune limite chiffrée pour l’instant';
}
function bandeauModeStockBas(){
  if(!msbActif()) return '';
  const m = state.modeStockBas;
  return `<div class="msb-bandeau" role="status">${icon('alert', 18)}<div><b>Mode stock bas actif</b>${m.depuis ? ` <small>depuis le ${echapper(new Date(m.depuis).toLocaleDateString('fr-FR'))}</small>` : ''}<span>Toutes les commandes des structures sont limitées : ${echapper(resumeModeStockBas(m))}.</span></div><button type="button" class="btn btn-secondary" data-mode-stock-bas>Modifier</button></div>`;
}
function vueModeStockBas(){
  const m = state.modal; const v = m.v;
  const val = x => x === null || x === undefined ? '' : x;
  const produits = (state.produits || []).filter(p => p.visible && !p.dematerialise);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="msb-titre" style="width:min(780px,100%)">
        <header class="csw-tete">
          <div class="csw-tete-txt"><div class="rp-surtitre">Stock</div><h2 class="csw-titre" id="msb-titre">Mode stock bas</h2></div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <div class="dialog-corps"><div style="grid-column:1 / -1;min-width:0;display:flex;flex-direction:column;gap:14px">
          <label class="csw-option${v.actif ? ' choisi' : ''}">
            <span class="rp-switch"><input type="checkbox" data-msb="actif" ${v.actif ? 'checked' : ''}><span class="rp-switch-piste"></span></span>
            <span class="csw-option-txt"><b>Activer le mode stock bas</b><small>Limite toutes les commandes passées par les structures sur le portail, quel que soit leur type. Les quantités proposées dans le formulaire sont réduites en conséquence et le serveur refuse tout dépassement. Vos saisies de commande dans l’admin ne sont pas limitées.</small></span>
          </label>
          <div class="sr-global msb-global${v.actif ? '' : ' sr-off'}">
            <label class="field"><span>Articles max. par commande</span><input class="input" type="number" min="1" data-msb="maxParCommande" value="${val(v.maxParCommande)}" placeholder="Sans limite"></label>
            <label class="field"><span>Max. par produit (tous produits)</span><input class="input" type="number" min="1" data-msb="maxParProduit" value="${val(v.maxParProduit)}" placeholder="Sans limite"></label>
            <label class="field msb-message"><span>Message affiché aux structures <em>(facultatif)</em></span><input class="input" data-msb="message" maxlength="300" value="${echapper(v.message || '')}" placeholder="Ex. : Stock tendu jusqu’à fin octobre, merci de limiter vos demandes."></label>
          </div>
          <div class="sr-produits${v.actif ? '' : ' sr-off'}">
            <div class="sr-ligne msb-ligne sr-entete"><span>Produit</span><span>Stock EC</span><span>Max. par commande</span></div>
            ${produits.map(p => `<div class="sr-ligne msb-ligne">
              <span class="sr-nom">${window.illustrationCvdl && window.cleIllustrationProduit ? window.illustrationCvdl(window.cleIllustrationProduit(p.nom, p.icone), 26) : ''}<b>${echapper(p.nom)}</b></span>
              <span class="${p.stock <= 5 ? 'msb-stock-bas' : ''}">${p.stock}</span>
              <input class="input" type="number" min="1" data-msb-produit="${echapper(p.nom)}" value="${val((v.produits || {})[p.nom])}" placeholder="${v.maxParProduit != null ? v.maxParProduit : '—'}" aria-label="Maximum par commande ${echapper(p.nom)}">
            </div>`).join('') || '<p class="csw-aide">Aucun produit visible.</p>'}
            <p class="csw-aide">Champ vide = le « max. par produit » ci-dessus s’applique.</p>
          </div>
        </div></div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-modal-fermer>Annuler</button>
          <button type="button" class="btn btn-primary" data-msb-enregistrer>${icon('check', 15)}Enregistrer</button>
        </div>
      </div>
    </div>`;
}
document.addEventListener('change', e => {
  const m = state.modal; if(!m || m.kind !== 'mode-stock-bas') return;
  const t = e.target; const n = x => x === '' ? null : Math.max(1, parseInt(x, 10) || 1);
  if(t.dataset.msb === 'actif'){ m.v.actif = t.checked; render(); return; }
  if(t.dataset.msb === 'message'){ m.v.message = t.value; return; }
  if(t.dataset.msb){ m.v[t.dataset.msb] = n(t.value); return; }
  if(t.dataset.msbProduit){ const x = n(t.value); if(x === null) delete m.v.produits[t.dataset.msbProduit]; else m.v.produits[t.dataset.msbProduit] = x; }
});
document.addEventListener('click', async e => {
  if(e.target.closest('[data-mode-stock-bas]')){
    e.stopPropagation();
    state.modal = { kind: 'mode-stock-bas', v: JSON.parse(JSON.stringify(state.modeStockBas || { actif: false, maxParCommande: null, maxParProduit: null, produits: {}, message: '' })) };
    state.modal.v.produits = state.modal.v.produits || {};
    render(); return;
  }
  if(!e.target.closest('[data-msb-enregistrer]')) return;
  const m = state.modal; if(!m || m.kind !== 'mode-stock-bas') return;
  document.querySelectorAll('[data-msb]:not([type=checkbox]), [data-msb-produit]').forEach(el => el.dispatchEvent(new Event('change', { bubbles: true })));
  const r = await posterEtat({ action: 'mode-stock-bas', mode: m.v }, 'Enregistrement…', m.v.actif ? 'Mode stock bas activé' : 'Mode stock bas désactivé');
  if(r && r.ok){ state.modeStockBas = r.mode; state.modal = null; render(); }
}, true);

/* ── « Stock restreint » : plafonds (global / par produit) et seuils de stock bas d'une
   structure en dépôt-vente, réglés dans une seule fenêtre (routes/depotVente.js). ── */
async function ouvrirStockRestreint(code){
  state.modal = { kind: 'stock-restreint', ref: code, chargement: true, modalParent: state.modal && state.modal.kind === 'structure-360' ? state.modal : null };
  render();
  try{
    const r = await jsonp({ action: 'depot-vente-limites', password: motDePasse, code });
    if(state.modal && state.modal.kind === 'stock-restreint'){
      if(r && r.ok){ state.modal.limites = JSON.parse(JSON.stringify(r.limites)); state.modal.occupation = r.occupation; }
      else state.modal.erreur = (r && r.erreur) || 'Chargement impossible.';
      state.modal.chargement = false; render();
    }
  }catch(e){ if(state.modal){ state.modal.chargement = false; state.modal.erreur = 'Chargement impossible.'; render(); } }
}
function vueStockRestreint(){
  const m = state.modal;
  const s = state.structures.find(x => x.code === m.ref) || { nom: m.ref };
  const l = m.limites || { actif: false, plafond: null, seuilBas: null, produits: {} };
  const occ = m.occupation || { total: 0, parProduit: {} };
  const d = etatDepotVente(m.ref) || {};
  const enStockP = d.parProduit || {};
  const noms = [...new Set([...(state.produits || []).filter(p => p.visible && !p.dematerialise).map(p => p.nom), ...Object.keys(occ.parProduit || {}), ...Object.keys(l.produits || {})])].filter(Boolean);
  const val = v => v === null || v === undefined ? '' : v;
  const corps = m.chargement ? '<p style="opacity:.6">Chargement…</p>' : m.erreur ? `<div class="msg msg-erreur">${echapper(m.erreur)}</div>` : `
    <label class="csw-option${l.actif ? ' choisi' : ''}">
      <span class="rp-switch"><input type="checkbox" data-sr="actif" ${l.actif ? 'checked' : ''}><span class="rp-switch-piste"></span></span>
      <span class="csw-option-txt"><b>Activer le stock restreint</b><small>Limite le matériel confié à cette structure : au-delà d’un plafond, elle ne peut plus commander (le formulaire ne propose que ce qui reste possible). Le seuil de stock bas déclenche une alerte de réassort (fil des priorités, cloche, e-mail).</small></span>
    </label>
    <div class="sr-global${l.actif ? '' : ' sr-off'}">
      <div class="sr-chiffre"><b>${occ.total}</b><span>en dépôt ou en commande<br>(${d.enStock != null ? d.enStock : '—'} en stock)</span></div>
      <label class="field"><span>Plafond global</span><input class="input" type="number" min="0" inputmode="numeric" data-sr="plafond" value="${val(l.plafond)}" placeholder="Sans limite"></label>
      <label class="field"><span>Seuil de stock bas</span><input class="input" type="number" min="0" inputmode="numeric" data-sr="seuilBas" value="${val(l.seuilBas)}" placeholder="Aucune alerte"></label>
    </div>
    <div class="sr-produits${l.actif ? '' : ' sr-off'}">
      <div class="sr-ligne sr-entete"><span>Produit</span><span>En stock</span><span>Dépôt + commandes</span><span>Plafond</span><span>Seuil bas</span></div>
      ${noms.map(n => { const lp = (l.produits || {})[n] || {}; return `<div class="sr-ligne">
        <span class="sr-nom">${window.illustrationCvdl && window.cleIllustrationProduit ? window.illustrationCvdl(window.cleIllustrationProduit(n, ((state.produits || []).find(p => p.nom === n) || {}).icone), 26) : ''}<b>${echapper(n)}</b></span>
        <span>${enStockP[n] || 0}</span><span>${(occ.parProduit || {})[n] || 0}</span>
        <input class="input" type="number" min="0" inputmode="numeric" data-sr-produit="${echapper(n)}" data-sr-champ="plafond" value="${val(lp.plafond)}" placeholder="—" aria-label="Plafond ${echapper(n)}">
        <input class="input" type="number" min="0" inputmode="numeric" data-sr-produit="${echapper(n)}" data-sr-champ="seuilBas" value="${val(lp.seuilBas)}" placeholder="—" aria-label="Seuil bas ${echapper(n)}">
      </div>`; }).join('') || '<p class="csw-aide">Aucun produit au catalogue.</p>'}
      <p class="csw-aide">Champ vide = pas de limite pour ce produit (seul le plafond global s’applique).</p>
    </div>`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="sr-titre" style="width:min(820px,100%)">
        <header class="csw-tete">
          <div class="csw-tete-txt"><div class="rp-surtitre">Dépôt-vente · Stock restreint</div><h2 class="csw-titre" id="sr-titre">${echapper(s.nom)}</h2></div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <div class="dialog-corps"><div style="grid-column:1 / -1;min-width:0;display:flex;flex-direction:column;gap:14px">${corps}</div></div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-modal-fermer>Annuler</button>
          <button type="button" class="btn btn-primary" data-sr-enregistrer ${m.chargement || m.erreur ? 'disabled' : ''}>${icon('check', 15)}Enregistrer</button>
        </div>
      </div>
    </div>`;
}
document.addEventListener('change', e => {
  const m = state.modal; if(!m || m.kind !== 'stock-restreint' || !m.limites) return;
  const t = e.target; const n = v => v === '' ? null : Math.max(0, parseInt(v, 10) || 0);
  if(t.dataset.sr === 'actif'){ m.limites.actif = t.checked; render(); return; }
  if(t.dataset.sr){ m.limites[t.dataset.sr] = n(t.value); return; }
  if(t.dataset.srProduit){ const p = m.limites.produits[t.dataset.srProduit] = m.limites.produits[t.dataset.srProduit] || { plafond: null, seuilBas: null }; p[t.dataset.srChamp] = n(t.value); }
});
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-stock-restreint]');
  if(o){ e.stopPropagation(); e.preventDefault(); ouvrirStockRestreint(o.dataset.stockRestreint); return; }
  if(!e.target.closest('[data-sr-enregistrer]')) return;
  const m = state.modal; if(!m || m.kind !== 'stock-restreint') return;
  document.querySelectorAll('[data-sr], [data-sr-produit]').forEach(el => el.dispatchEvent(new Event('change', { bubbles: true }))); // valeurs en cours de saisie
  const r = await posterEtat({ action: 'depot-vente-limites', code: m.ref, limites: m.limites }, 'Enregistrement…', 'Stock restreint enregistré');
  if(r && r.ok){ state.modal = m.modalParent || null; render(); chargerDepotVente(); }
}, true);

/** Section « Dépôt-vente » de l'onglet Stock : stock restant par structure, lien direct. */
function sectionDepotVenteStock(){
  const liste = state.depotVente || [];
  if(!liste.length) return '';
  return `
    <section class="dv-section">
      <div class="dv-tete"><span data-ill="flotte" class="ill"></span><div><h2>Dépôt-vente</h2><p>Matériel confié en dépôt : stock restant et ventes déclarées, mis à jour à chaque modification, chez elles comme ici.</p></div></div>
      <div class="dv-grille">
        ${liste.map(d => { const pct = d.reference ? Math.round(d.enStock / d.reference * 100) : 100; return `
        <article class="card dv-carte${d.moitie ? ' alerte' : ''}" data-flotte-structure="${echapper(d.code)}" role="button" tabindex="0" aria-label="Gérer la flotte de ${echapper(d.nom)}">
          <div class="dv-carte-tete"><b>${echapper(d.nom)}</b><span class="et-lien">Gérer →</span></div>
          <div class="dv-chiffre"><b>${d.enStock}</b><span>en stock${d.reference ? ` sur ${d.reference} au dernier réassort` : ''}</span></div>
          <div class="dv-barre" aria-hidden="true"><i style="width:${Math.max(3, Math.min(100, pct))}%"></i></div>
          <div class="dv-puces">
            <span>${d.vendus} vendu${d.vendus > 1 ? 's' : ''}</span>${d.sav ? `<span>${d.sav} en SAV</span>` : ''}
            ${pucesAlertesDepot(d)}
          </div>
          <button type="button" class="et-lien dv-carte-restreint" data-stock-restreint="${echapper(d.code)}">${icon('gear', 13)}Stock restreint${d.limites && d.limites.actif ? ' · actif' : ''}</button>
        </article>`; }).join('')}
      </div>
    </section>`;
}
/* Modale « Flotte » : la page flotte de la structure elle-même (même design, mêmes outils :
   liste / fiches / comptabilité, statistiques, personnes, lieux…) intégrée dans l'admin — les
   modifications sont donc exactement celles que voit la structure. Les appareils livrés sont
   ajoutés à la flotte juste avant l'ouverture. */
async function ouvrirFlotteStructure(code, modalParent){
  state.modal = { kind: 'flotte-structure', ref: code, chargement: true, modalParent: modalParent || null };
  render();
  try{ await jsonp({ action: 'flotte-lister-admin', password: motDePasse, code, synchroniser: 'oui' }); }catch(e){ /* la page se charge quand même */ }
  if(state.modal && state.modal.kind === 'flotte-structure' && state.modal.ref === code){ state.modal.chargement = false; render(); }
}
function vueFlotteStructure(){
  const m = state.modal;
  const s = state.structures.find(x => x.code === m.ref) || { nom: m.ref };
  const d = etatDepotVente(m.ref);
  return `
    <div class="dialog-backdrop">
      <div class="dialog dv-modale" role="dialog" aria-modal="true" aria-labelledby="dv-titre">
        <header class="csw-tete dv-tete">
          <div class="csw-tete-txt"><div class="rp-surtitre">Flotte${s.depotVente ? ' · dépôt-vente' : ''}</div><h2 class="csw-titre" id="dv-titre">${echapper(s.nom)}</h2></div>
          ${d ? `<div class="dv-puces"><span><b>${d.enStock}</b> en stock${d.reference ? ` / ${d.reference}` : ''}</span><span><b>${d.vendus}</b> vendu${d.vendus > 1 ? 's' : ''}</span>${d.anciens ? `<span class="att">${d.anciens} depuis + de 2 mois</span>` : ''}${d.moitie ? '<span class="ko">Stock divisé par deux</span>' : ''}</div>` : ''}
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        ${m.chargement ? '<div class="pk-etat">Mise à jour de la flotte…</div>'
          : `<iframe class="dv-cadre" title="Flotte de ${echapper(s.nom)}" src="flotte-structure.html?code=${encodeURIComponent(m.ref)}&integre=1"></iframe>`}
      </div>
    </div>`;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-flotte-structure]');
  if(f){ e.stopPropagation(); state.notifOuverte = false; ouvrirFlotteStructure(f.dataset.flotteStructure, state.modal && state.modal.kind === 'structure-360' ? state.modal : null); return; }
  // En quittant la modale flotte, le stock affiché (onglet Stock, fiche, cloche) est rafraîchi.
  if(state.modal && state.modal.kind === 'flotte-structure' && (e.target.closest('[data-modal-fermer]') || e.target.matches('.dialog-backdrop'))) setTimeout(chargerDepotVente, 50);
}, true);
document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches && e.target.matches('.dv-carte[data-flotte-structure]')) e.target.click(); });
/* ── SAV : bon Colissimo (PDF) déposé à l'étape « Colissimo » — retrouvé par la structure et la
   personne accompagnée dans leur suivi SAV. Lien de suivi facultatif à côté. ── */
function blocColissimoSav(s){
  return `<div class="rpd-colis">
    <div class="rpd-colis-tete"><span class="rpd-di amb">${icon('truck', 14)}</span><b>Envoi Colissimo</b><small>visible dans le suivi SAV de la structure / de la personne</small></div>
    ${s.bonColissimo
      ? `<div class="rpd-colis-fichier"><a href="${echapper(urlSure(s.bonColissimo))}" target="_blank" rel="noopener">${icon('file', 15)}Bon Colissimo (PDF)</a>
          <label class="et-lien">Remplacer<input type="file" accept="application/pdf,.pdf" data-sav-bon-colissimo="${s.ligne}" hidden></label>
          <button type="button" class="et-lien" data-sav-bon-retirer="${s.ligne}">Retirer</button></div>`
      : `<label class="rpd-colis-depot"><input type="file" accept="application/pdf,.pdf" data-sav-bon-colissimo="${s.ligne}" hidden>${icon('plus', 16)}<span><b>Déposer le bon Colissimo</b><small>PDF, 10 Mo maximum</small></span></label>`}
    <label class="rpd-colis-lien"><span>Lien de suivi du colis <em>(facultatif)</em></span>
      <input class="input" type="url" data-sav-colissimo-lien="${s.ligne}" value="${echapper(String(s.colissimo || '').split('\\n')[0] || '')}" placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code=…"></label>
  </div>`;
}
async function deposerBonColissimoSav(ligne, fichier){
  const s = state.sav.find(x => x.ligne === ligne); if(!s) return;
  const base64 = fichier ? await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = ko; r.readAsDataURL(fichier); }) : '';
  const r = await posterEtat({ action: 'sav-bon-colissimo', ligne, fichier: fichier ? { nom: fichier.name, type: fichier.type || 'application/pdf', base64 } : null },
    fichier ? 'Dépôt du bon Colissimo…' : 'Retrait…', fichier ? 'Bon Colissimo déposé' : 'Bon retiré');
  if(r && r.ok){ s.bonColissimo = r.url || ''; if(typeof filSavAdminInvalider === 'function') filSavAdminInvalider(ligne); render(); }
}
document.addEventListener('change', e => {
  const f = e.target.closest && e.target.closest('[data-sav-bon-colissimo]');
  if(f && f.files && f.files[0]){ deposerBonColissimoSav(parseInt(f.dataset.savBonColissimo, 10), f.files[0]); return; }
  const l = e.target.closest && e.target.closest('[data-sav-colissimo-lien]');
  if(l){
    const s = state.sav.find(x => x.ligne === parseInt(l.dataset.savColissimoLien, 10)); if(!s) return;
    const v = l.value.trim();
    if(v && !/^https?:\/\//i.test(v)){ etat('Le lien doit commencer par https://', 'erreur'); return; }
    posterEtat({ action: 'sav-update', ligne: s.ligne, champ: 'colissimo', valeur: v }, 'Enregistrement…', 'Lien de suivi enregistré').then(r => { if(r && r.ok){ s.colissimo = v; render(); } });
  }
});
document.addEventListener('click', async e => {
  const r = e.target.closest('[data-sav-bon-retirer]');
  if(r && await confirmerCvdl('Retirer le bon Colissimo de ce dossier ? Il ne sera plus proposé dans le suivi SAV.')) deposerBonColissimoSav(parseInt(r.dataset.savBonRetirer, 10), null);
});

/* ── Calendrier global ── */
/* Même langage visuel que le calendrier « Livraisons » du tableau de bord (cal2) : grandes
 * cases arrondies, repères colorés dans la case, détail du jour choisi dans le panneau de
 * droite — plus de texte tassé dans la grille. Livraison livrée = point vert, prévue = carré
 * ambre (mêmes repères que le tableau de bord), programme = losange violet, factures = magenta. */
function evenementsCalendrier(){
  const ev = [];
  const f = state.calFiltres;
  if(f.livraisons) state.commandes.forEach(c => {
    if(c.statutCommande === 'Annulée') return;
    const livree = c.statutCommande === 'Livrée';
    const d = dateVersISO(livree ? c.dateLivraison : (c.dateLivraisonCible || ''));
    if(!d) return;
    const nb = (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
    const mode = MODES_LIVRAISON.find(m => m.valeur === c.modeLivraison);
    ev.push({ date: d, type: 'liv', marque: livree ? 'conf' : 'est', court: c.nom || c.reference,
      titre: c.nom || c.reference, sous: `${c.reference}${nb ? ` · ${nb} article${nb > 1 ? 's' : ''}` : ''}${mode ? ` · ${mode.label}` : ''}`,
      etat: livree ? 'Livrée' : 'Prévue', ic: 'truck', attrs: `data-commande-ouvrir="${echapper(c.reference)}"`, fait: livree });
  });
  if(f.programmes) state.distributions.filter(p => p.statut !== 'archive').forEach(p => {
    const base = { type: 'prog', marque: 'prog', ic: 'calendrier', titre: p.nom, attrs: `data-dist-ouvrir="${echapper(p.id)}"` };
    if(p.debut) ev.push({ ...base, date: p.debut, court: `Début · ${p.nom}`, sous: 'Début du programme', etat: 'Début' });
    (p.jalons || []).forEach(j => ev.push({ ...base, date: j.date, court: `${j.libelle || 'Point d’étape'} · ${p.nom}`, sous: j.libelle || 'Point d’étape', etat: 'Étape' }));
    if(p.butoir) ev.push({ ...base, date: p.butoir, fin: true, court: `Butoir · ${p.nom}`, sous: 'Date butoir du programme', etat: 'Butoir' });
  });
  if(f.factures && state.produits.some(p => p.facturationMensuelle)){
    const now = new Date();
    for(let k = -2; k <= 3; k++){ const d = new Date(now.getFullYear(), now.getMonth() + k, 1); ev.push({ date: isoJour(d), type: 'fact', marque: 'fact', ic: 'receipt', court: 'Factures mensuelles', titre: 'Factures mensuelles', sous: 'Envoi automatique aux structures', etat: 'Auto', attrs: 'data-factures-mensuelles' }); }
  }
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}
function carteEvenementCalendrier(x){
  return `<div class="calx-ev ${x.type}${x.fin ? ' fin' : ''}${x.fait ? ' fait' : ''}" ${x.attrs} role="button" tabindex="0">
    <span class="calx-ev-ic" aria-hidden="true">${icon(x.ic, 18)}</span>
    <span class="calx-ev-txt"><b>${echapper(x.titre)}</b><small>${echapper(x.sous)}</small></span>
    <span class="calx-etat">${echapper(x.etat)}</span>
  </div>`;
}
function vueCalendrierGlobal(){
  const auj = new Date();
  const isoAuj = isoJour(auj);
  const [an, mo] = (state.calMois || isoAuj.slice(0, 7)).split('-').map(Number);
  const premier = new Date(an, mo - 1, 1);
  const ev = evenementsCalendrier();
  const parJour = {}; ev.forEach(x => { (parJour[x.date] = parJour[x.date] || []).push(x); });
  const nbJours = new Date(an, mo, 0).getDate();
  const decalage = (premier.getDay() + 6) % 7;
  const moisIso = `${an}-${String(mo).padStart(2, '0')}`;
  if(!state.calJour || state.calJour.slice(0, 7) !== moisIso){
    const premierAvec = Object.keys(parJour).filter(k => k.startsWith(moisIso) && k >= isoAuj).sort()[0];
    state.calJour = isoAuj.startsWith(moisIso) ? isoAuj : (premierAvec || `${moisIso}-01`);
  }
  const compte = { livraisons: 0, programmes: 0, factures: 0 };
  ev.forEach(x => { if(x.date.startsWith(moisIso)) compte[{ liv: 'livraisons', prog: 'programmes', fact: 'factures' }[x.type]]++; });
  const cellules = Array(decalage).fill(null).concat(Array.from({ length: nbJours }, (_, i) => i + 1));
  const grille = cellules.map((j, k) => {
    if(!j) return '<span class="cal2-vide" aria-hidden="true"></span>';
    const iso = `${moisIso}-${String(j).padStart(2, '0')}`;
    const l = parJour[iso] || [];
    const cls = ['calx-jour', iso === state.calJour ? 'choisi' : '', iso === isoAuj ? 'auj' : '', iso < isoAuj ? 'passe' : '', (k % 7) >= 5 ? 'weekend' : '', l.length ? 'avec' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-calx-jour="${iso}" aria-pressed="${iso === state.calJour}"${iso === isoAuj ? ' aria-current="date"' : ''} aria-label="${j} ${MOIS_CAL[mo - 1]}${l.length ? ` : ${l.length} événement${l.length > 1 ? 's' : ''}` : ''}">
      <span class="calx-num">${j}</span>
      ${l.slice(0, 3).map(x => `<span class="calx-puce ${x.marque}${x.fin ? ' fin' : ''}"><i></i><span>${echapper(x.court)}</span></span>`).join('')}
      ${l.length > 3 ? `<span class="calx-plus">+${l.length - 3} autre${l.length - 3 > 1 ? 's' : ''}</span>` : ''}
    </button>`;
  }).join('');
  const duJour = parJour[state.calJour] || [];
  const dateChoisie = new Date(state.calJour + 'T00:00:00');
  const libJour = state.calJour === isoAuj ? 'Aujourd’hui' : dateChoisie.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fin30 = isoJour(new Date(auj.getTime() + 30 * 86400000));
  const prochains = ev.filter(x => x.date > isoAuj && x.date <= fin30);
  const parDateProchains = []; prochains.forEach(x => { const g = parDateProchains[parDateProchains.length - 1]; if(g && g.date === x.date) g.l.push(x); else parDateProchains.push({ date: x.date, l: [x] }); });
  const filtre = (k, l, m) => `<button type="button" class="calx-filtre${state.calFiltres[k] ? ' on' : ''}" data-cal-filtre="${k}" aria-pressed="${state.calFiltres[k]}"><i class="${m}"></i>${l}${state.calFiltres[k] ? `<b>${compte[k]}</b>` : ''}</button>`;
  const moisCourant = moisIso === isoAuj.slice(0, 7);
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)">
      <div><h1 style="font-size:32px;margin-bottom:var(--space-2)">Calendrier</h1><p style="opacity:0.65;margin:0;font-size:15px">Livraisons, échéances des programmes de distribution et factures mensuelles.</p></div>
    </div>
    <div class="calx">
      <section class="card calx-main">
        <div class="calx-barre">
          <div class="cal2-nav calx-nav">
            <button type="button" class="cal2-fleche" data-cal-mois="-1" aria-label="Mois précédent">‹</button>
            <span class="cal2-mois" aria-live="polite">${MOIS_CAL[mo - 1]} ${an}</span>
            <button type="button" class="cal2-fleche" data-cal-mois="1" aria-label="Mois suivant">›</button>
          </div>
          ${moisCourant ? '' : '<button type="button" class="cal2-auj" data-cal-mois="0">Aujourd’hui</button>'}
          <div class="calx-filtres">${filtre('livraisons', 'Livraisons', 'conf')}${filtre('programmes', 'Programmes', 'prog')}${filtre('factures', 'Factures mensuelles', 'fact')}</div>
        </div>
        <div class="cal2-semaine" aria-hidden="true">${JOURS_SEMAINE_CAL.map(j => `<span>${j}</span>`).join('')}</div>
        <div class="calx-grille" role="group" aria-label="${MOIS_CAL[mo - 1]} ${an}">${grille}</div>
        <div class="cal2-legende calx-legende"><span><i class="conf"></i>Livrée</span><span><i class="est"></i>Livraison prévue</span><span><i class="prog"></i>Programme</span><span><i class="fact"></i>Factures mensuelles</span></div>
      </section>
      <aside class="calx-cote">
        <section class="card calx-panneau">
          <div class="cal2-jourchoisi-titre calx-jour-titre"><span>${echapper(libJour)}</span>${duJour.length ? `<b>${duJour.length}</b>` : ''}</div>
          ${duJour.length ? `<div class="calx-evs">${duJour.map(carteEvenementCalendrier).join('')}</div>` : '<p class="cal2-rien">Rien de prévu ce jour-là.</p>'}
        </section>
        <section class="card calx-panneau">
          <div class="cal2-titre" style="font-size:16px">30 prochains jours</div>
          ${parDateProchains.length ? '<div class="calx-prochains">' + parDateProchains.map(g => `<div class="calx-groupe"><div class="calx-groupe-date">${echapper(new Date(g.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }))}</div><div class="calx-evs">${g.l.map(carteEvenementCalendrier).join('')}</div></div>`).join('') + '</div>' : '<p class="cal2-rien">Rien de prévu.</p>'}
        </section>
      </aside>
    </div>`;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-cal-filtre]'); if(f){ state.calFiltres[f.dataset.calFiltre] = !state.calFiltres[f.dataset.calFiltre]; render(); return; }
  const j = e.target.closest('[data-calx-jour]'); if(j){ state.calJour = j.dataset.calxJour; render(); return; }
  const m = e.target.closest('[data-cal-mois]');
  if(m){
    const d = m.dataset.calMois === '0' ? new Date() : (() => { const [a, mo] = (state.calMois || isoJour(new Date()).slice(0, 7)).split('-').map(Number); return new Date(a, mo - 1 + parseInt(m.dataset.calMois, 10), 1); })();
    state.calMois = isoJour(d).slice(0, 7); state.calJour = m.dataset.calMois === '0' ? isoJour(new Date()) : ''; render();
  }
});
document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches && e.target.matches('.calx-ev[data-commande-ouvrir], .calx-ev[data-factures-mensuelles]')) e.target.click(); });

/* ── Statistiques : filtres + section programmes ── */
function commandeDansFiltresStats(c){
  const f = state.statsFiltres;
  const s = state.structures.find(x => x.code === c.code) || state.structures.find(x => x.nom === c.nom) || {};
  if(f.region && s.region !== f.region) return false;
  if(f.type && (s.type || 'standard') !== f.type) return false;
  if(f.departement && departementDeAdresse(c.adresse || s.adresse) !== f.departement) return false;
  if(f.programme){
    const r = (state.rattachements || []).find(x => x.reference === c.reference);
    const aff = (c.distribution && c.distribution.affectation) || (r && r.affectation) || {};
    const ids = Object.values(aff);
    if(f.programme === '__hors' ? ids.length : !ids.includes(f.programme)) return false;
  }
  return true;
}
function barreFiltresStats(){
  const f = state.statsFiltres;
  const regions = [...new Set(state.structures.map(s => s.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const deps = [...new Set(state.structures.map(s => departementDeAdresse(s.adresse)).filter(Boolean))].sort();
  const sel = (id, lib, opts, val) => `<label class="st-f"><span>${lib}</span><select class="input" data-stats-filtre="${id}">${opts.map(([v, l]) => `<option value="${echapper(v)}" ${val === v ? 'selected' : ''}>${echapper(l)}</option>`).join('')}</select></label>`;
  return `<div class="st-filtres">
    ${sel('programme', 'Programme', [['', 'Tous'], ...state.distributions.map(p => [p.id, p.nom]), ['__hors', 'Hors programme']], f.programme)}
    ${sel('region', 'Région', [['', 'Toutes'], ...regions.map(r => [r, r])], f.region)}
    ${sel('departement', 'Département', [['', 'Tous'], ...deps.map(d => [d, d])], f.departement)}
    ${sel('type', 'Type de structure', [['', 'Tous'], ...TYPES_PERIMETRE.map(([k, l]) => [k, l])], f.type)}
    ${Object.values(f).some(Boolean) ? '<button type="button" class="et-lien" data-stats-reinit>Réinitialiser</button>' : ''}
  </div>`;
}
document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('[data-stats-filtre]'); if(s){ state.statsFiltres[s.dataset.statsFiltre] = s.value; render(); } });
document.addEventListener('click', e => { if(e.target.closest('[data-stats-reinit]')){ state.statsFiltres = { programme: '', region: '', departement: '', type: '' }; render(); } });
function courbeProgramme(p){
  const av = p.avancement || {}; const pts = av.cumul || [];
  const prod = (av.objectifs || []).reduce((a, o) => (o.objectif > (a ? a.objectif : -1) ? o : a), null);
  const obj = av.totalObjectif || 0;
  if(!pts.length || !obj) return '<p class="di-aide">Pas encore de livraison à tracer.</p>';
  const d0 = new Date(p.debut).getTime(), d1 = new Date(p.butoir).getTime();
  const W = 620, H = 220, PL = 40, PR = 96, PT = 16, PB = 26;
  const X = t => PL + (W - PL - PR) * Math.min(1, Math.max(0, (t - d0) / Math.max(1, d1 - d0)));
  const maxY = Math.max(obj, pts[pts.length - 1].livre);
  const Y = v => PT + (H - PT - PB) * (1 - v / maxY);
  const ligne = pts.map(x => `${X(new Date(x.semaine).getTime()).toFixed(1)},${Y(x.livre).toFixed(1)}`).join(' ');
  const dernier = pts[pts.length - 1]; const lx = X(new Date(dernier.semaine).getTime()), ly = Y(dernier.livre);
  const graduations = [0, Math.round(maxY / 2), maxY].map(v => `<line x1="${PL}" x2="${W - PR}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${PL - 8}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('');
  const points = pts.map(x => `<circle cx="${X(new Date(x.semaine).getTime()).toFixed(1)}" cy="${Y(x.livre).toFixed(1)}" r="8" class="hit"><title>Semaine du ${frDate(x.semaine)} : ${x.livre} livrés (cumul)</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="st-graph" role="img" aria-label="Cumul livré ${dernier.livre} sur ${obj}, trajectoire nécessaire en pointillés">${graduations}
    <text x="${PL}" y="${H - 6}" class="ax">${frDate(p.debut)}</text><text x="${W - PR}" y="${H - 6}" class="ax" text-anchor="end">${frDate(p.butoir)}</text>
    <line x1="${X(d0)}" y1="${Y(0)}" x2="${X(d1)}" y2="${Y(obj)}" class="ideal"/><text x="${X(d1) + 6}" y="${Y(obj) + 4}" class="lab2">objectif ${obj}</text>
    <polygon points="${X(d0)},${Y(0)} ${ligne} ${lx},${Y(0)}" class="aire"/><polyline points="${ligne}" class="courbe"/>
    <circle cx="${lx}" cy="${ly}" r="5" class="pt"/><text x="${lx + 9}" y="${ly - 8}" class="lab">${dernier.livre} livrés</text>${points}</svg>`;
}
function sectionProgrammesStats(){
  if(!state.distributions.length) return '';
  const f = state.statsFiltres;
  const progs = state.distributions.filter(p => p.statut !== 'archive' && (!f.programme || f.programme === p.id));
  if(!progs.length) return '';
  const un = progs.length === 1 ? progs[0] : null;
  const tot = progs.reduce((a, p) => { const av = p.avancement || {}; a.livre += av.totalLivre || 0; a.objectif += av.totalObjectif || 0; a.engage += av.totalEngage || 0; a.personnes += av.personnes || 0; return a; }, { livre: 0, objectif: 0, engage: 0, personnes: 0 });
  const deps = {}; progs.forEach(p => Object.entries((p.avancement || {}).parDepartement || {}).forEach(([d, q]) => { deps[d] = (deps[d] || 0) + q; }));
  const depsTri = Object.entries(deps).sort((a, b) => b[1] - a[1]); const maxD = Math.max(1, ...depsTri.map(d => d[1]));
  return `<section class="st-prog">
    <h2 class="st-h2">Programmes de distribution${un ? ` · ${echapper(un.nom)}` : ''}</h2>
    <div class="st-tuiles">
      <div class="st-tuile"><small>Livrés</small><b>${tot.livre}</b><span>sur ${tot.objectif} prévus</span></div>
      <div class="st-tuile"><small>Objectif atteint</small><b>${tot.objectif ? Math.round(tot.livre / tot.objectif * 100) : 0} %</b><span>${Math.max(0, tot.objectif - tot.livre)} restants</span></div>
      <div class="st-tuile"><small>Engagés</small><b>${tot.engage}</b><span>validés, pas encore livrés</span></div>
      <div class="st-tuile"><small>Personnes équipées</small><b>${tot.personnes}</b><span>personnes nommées</span></div>
    </div>
    <div class="di-detail">
      <section class="di-bloc"><h3>${un ? 'Livré vs trajectoire' : 'Comparaison'}</h3>${un ? `<p class="di-aide">Cumul des livraisons ; pointillés = rythme nécessaire pour tenir la date butoir.</p>${courbeProgramme(un)}${tagRythme(un.avancement)}`
        : `<div class="di-table"><table><thead><tr><th>Programme</th><th>Butoir</th><th>Livré / objectif</th><th>Engagé</th><th>Rythme</th><th>Structures</th></tr></thead><tbody>${progs.map(p => { const av = p.avancement || {}; return `<tr data-dist-ouvrir="${echapper(p.id)}" role="button" tabindex="0"><td><b>${echapper(p.nom)}</b></td><td>${frDate(p.butoir)}</td><td>${av.totalLivre || 0} / ${av.totalObjectif || 0} · ${av.totalObjectif ? Math.round((av.totalLivre || 0) / av.totalObjectif * 100) : 0} %</td><td>${av.totalEngage || 0}</td><td>${tagRythme(av)}</td><td>${Object.keys(av.parStructure || {}).length}</td></tr>`; }).join('')}</tbody></table></div><p class="di-aide">Choisissez un programme dans les filtres pour voir sa courbe.</p>`}</section>
      <section class="di-bloc"><h3>Par département</h3>${depsTri.length ? depsTri.map(([d, q]) => `<div class="di-hb"><b>${echapper(d)}</b><span class="di-hbt"><i style="width:${q / maxD * 100}%"></i></span><span>${q}</span></div>`).join('') : '<p class="di-aide">Rien de livré.</p>'}</section>
    </div></section>`;
}
