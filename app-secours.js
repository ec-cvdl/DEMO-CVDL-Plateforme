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
const API = 'https://europe-west1-cvdl-plateforme.cloudfunctions.net/cvdl-api';
// L'adresse de l'API est fixe : plus aucune substitution possible depuis le localStorage
// (un script malveillant aurait pu y rediriger tous les appels, mot de passe compris).
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
function icon(name, size){
  size = size || 20;
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
  const numeros = String(texteNumeros || '').split('\n').map(s => s.trim()).filter(Boolean);
  if(!numeros.length) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">${numeros.map(n => `
    <a href="passeport.html?sn=${encodeURIComponent(n)}&admin=1" target="_blank" class="rp-pilule-violette" title="Ouvrir le passeport numérique — accès admin direct">${icon('passeport', 13)}${echapper(n)}<span style="opacity:0.55;font-size:11px">↗</span></a>
  `).join('')}</div>`;
}
/** Équivalent pour un code de produit dématérialisé (recharge...) — pastille rouge, jamais de
 *  lien (un code n'a pas de passeport numérique) : juste affiché, sélectionnable au clic. */
function pilulesCodes(texteCodes){
  const codes = String(texteCodes || '').split('\n').map(s => s.trim()).filter(Boolean);
  if(!codes.length) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">${codes.map(cd => `
    <span class="rp-pilule-rouge" style="user-select:all" title="Code">${icon('ticket', 13)}${echapper(cd)}</span>
  `).join('')}</div>`;
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
function mkTag(statut, meta){
  const m = meta[statut] || { cls: 'tag-neutral', ic: 'inbox' };
  const b = BADGE[m.cls];
  return { icon: icon(m.ic, 15), tagCls: m.cls, badgeBg: b.bg, badgeFg: b.fg };
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
  commandesFiltreStatut: '',
  ncLignes: [], // lignes produit en cours de saisie pour la modale "Nouvelle commande"
  ndLignes: [], // lignes produit/prestation en cours de saisie pour la modale "Nouveau devis" (devis libre)
  ndStructureNom: '', ndEmail: '', ndAdresse: '', // idem pour les champs texte du devis libre — sans ça, perdus à chaque re-rendu (ajout/retrait de ligne)
  documentGenere: null, // état du panneau "voir/générer/envoyer" ouvert sur un devis ou une facture — { type, ref, chargement, url, erreur, envoiChargement, envoiOk }
  ncCode: '', // structure choisie dans cette même modale
  reglages: {}, // chargé au démarrage (action:'reglages'), utilisé par la page Réglages
  tectechOrigine: {}, // { [referenceSav]: 'chargement' | { ok, reconditionneur, donateur, structureDonatrice } } — chargé à la demande, pas systématiquement (voir sav-origine-tectech)
  passeportRecherche: '', passeportResultat: null, passeportChargement: false, // onglet Passeport matériel (admin) — recherche par numéro de série, accès complet (pas de restriction structure), inclut tec.tech
  notifOuverte: false, // panneau de la cloche de notifications (sidebar), fermé par défaut
};

/* ============================================================
   Connexion
   ============================================================ */
$('btn-connexion').addEventListener('click', connecter);
$('mdp').addEventListener('keydown', e => { if(e.key === 'Enter') connecter(); });

async function connecter(valeurForcee){
  const mdp = (typeof valeurForcee === 'string' ? valeurForcee : $('mdp').value).trim();
  if(!mdp) return;
  $('btn-connexion').disabled = true;
  $('btn-connexion').textContent = 'Connexion…';
  $('retour-connexion').innerHTML = '';
  try{
    const r = await jsonp({ action: 'login', password: mdp });
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
    motDePasse = r.jeton || mdp;
    $('mdp').value = '';
    try{ sessionStorage.removeItem('cvdl-admin-password'); if(r.jeton) sessionStorage.setItem('cvdl-admin-jeton', r.jeton); }catch(e){}
    state.role = r.role || 'admin';
    // La fenêtre de connexion (et son flou) reste affichée pendant tout le chargement des
    // données — la masquer avant laissait voir l'appli vide un court instant.
    $('btn-connexion').textContent = 'Chargement des données…';
    await chargerTout();
    const ongletDepart = (location.hash ? location.hash.slice(1) : '') || (state.role !== 'admin' ? 'factures' : 'dashboard');
    state.activeTab = (state.role === 'admin' || ongletDepart === 'factures') ? ongletDepart : 'factures';
    history.replaceState({ onglet: state.activeTab }, '', '#' + state.activeTab);
    $('connexion').hidden = true;
    render();
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
  const [rc, rs, rss, rst, rd, rf, rp, rr] = await Promise.all([
    jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' }).catch(() => null),
    jsonp({ action: 'sav-list', password: motDePasse, limite: 0 }).catch(() => null),
    jsonp({ action: 'sav-statuts-list', password: motDePasse }).catch(() => null),
    jsonp({ action: 'structures', password: motDePasse }).catch(() => null),
    jsonp({ action: 'devis', password: motDePasse, limite: 0 }).catch(() => null),
    jsonp({ action: 'factures', password: motDePasse, limite: 0 }).catch(() => null),
    jsonp({ action: 'produits', password: motDePasse }).catch(() => null),
    jsonp({ action: 'reglages', password: motDePasse }).catch(() => null)
  ]);
  if(rc && rc.ok) state.commandes = rc.commandes || [];
  if(rs && rs.ok) state.sav = rs.tickets || [];
  if(rss && rss.ok) state.statutsSav = rss.statuts || [];
  if(rst && rst.ok) state.structures = (rst.structures || []).slice().sort((a, b) => b.ligne - a.ligne);
  if(rd && rd.ok) state.devis = rd.devis || [];
  if(rf && rf.ok) state.factures = rf.factures || [];
  if(rp && rp.ok) state.produits = rp.produits || [];
  if(rr && rr.ok) state.reglages = rr;
  etat('À jour', 'succes');
}

/* ============================================================
   Rendu — nav + shell
   ============================================================ */
const NAV_DEFS = [
  { key: 'dashboard', label: 'Tableau de bord', ic: 'dashboard' },
  { key: 'commandes', label: 'Commandes', ic: 'cart' },
  { key: 'sav', label: 'SAV', ic: 'wrench' },
  { key: 'factures', label: 'Devis / Factures', ic: 'receipt' },
  { key: 'stock', label: 'Stock', ic: 'package' },
  { key: 'passeport', label: 'Passeport matériel', ic: 'passeport' },
  { key: 'structures', label: 'Structures', ic: 'building' },
  { key: 'bilan', label: 'Statistiques', ic: 'stats' },
  { key: 'reglages', label: 'Réglages', ic: 'gear' }
];

/** Navigation entre onglets synchronisée avec l'historique du navigateur — bouton retour/
 *  avant du navigateur fonctionne comme changer d'onglet, sans recharger la page ni perdre
 *  les données déjà chargées. */
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
  const cle = (e.state && e.state.onglet) || (location.hash ? location.hash.slice(1) : 'dashboard');
  if(NAV_DEFS.some(n => n.key === cle) || cle === 'dashboard'){
    state.activeTab = cle; state.highlightRef = null; state.modal = null; render();
  }
});
function render(){
  const navsVisibles = state.role === 'admin' ? NAV_DEFS : NAV_DEFS.filter(n => n.key === 'factures');
  const nbUrgentes = commandesUrgentes().length;
  const nbSavOuverts = savOuvertsListe().length;
  $('rp-nav').innerHTML = navsVisibles.map(n => `
    <button type="button" class="${state.activeTab === n.key ? 'rp-actif' : ''}" data-nav="${n.key}" title="${echapper(n.label)}">
      ${icon(n.ic, 18)}<span class="rp-label">${echapper(n.label)}</span>
      ${(n.key === 'commandes' && nbUrgentes) ? `<span style="position:absolute;top:6px;left:24px;background:var(--color-corail-700, #C0392B);color:#fff;font-size:10px;font-weight:800;min-width:16px;height:16px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1">${nbUrgentes > 99 ? '99+' : nbUrgentes}</span>` : ''}
      ${(n.key === 'sav' && nbSavOuverts) ? `<span style="position:absolute;top:6px;left:24px;background:var(--color-corail-700, #C0392B);color:#fff;font-size:10px;font-weight:800;min-width:16px;height:16px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1">${nbSavOuverts > 99 ? '99+' : nbSavOuverts}</span>` : ''}
    </button>`).join('');
  if(state.role === 'admin' && $('rp-cloche-bouton')) rendreClocheNotifications();

  const main = $('rp-main');
  if(state.activeTab === 'dashboard') main.innerHTML = vueDashboard();
  else if(state.activeTab === 'commandes') main.innerHTML = vueCommandes();
  else if(state.activeTab === 'sav') main.innerHTML = vueSav();
  else if(state.activeTab === 'factures') main.innerHTML = vueFactures();
  else if(state.activeTab === 'stock') main.innerHTML = vueStock();
  else if(state.activeTab === 'passeport') main.innerHTML = vuePasseportMateriel();
  else if(state.activeTab === 'structures') main.innerHTML = vueStructures();
  else if(state.activeTab === 'bilan') main.innerHTML = vueBilan();
  else if(state.activeTab === 'reglages') main.innerHTML = vueReglages();

  $('rp-modal-zone').innerHTML = state.modal ? vueModal() : '';
}

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if(nav){ state.notifOuverte = false; naviguerVersOnglet(nav.dataset.nav); return; }

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
  if(kanbanCarte){ state.modal = { kind: 'commande', ref: kanbanCarte.dataset.commandeOuvrir }; state.etapeCommandeOuverte = null; state.notifOuverte = false; render(); return; }
  const kanbanSav = e.target.closest('[data-sav-ouvrir]');
  if(kanbanSav){ state.modal = { kind: 'sav', ref: kanbanSav.dataset.savOuvrir }; state.accordeonTerminalOuvert = false; state.notifOuverte = false; render(); return; }
  const livrerProduit = e.target.closest('[data-livrer-produit]');
  if(livrerProduit){ state.modal = { kind: 'a-livrer', produit: livrerProduit.dataset.livrerProduit }; render(); return; }

  const modifierProduit = e.target.closest('[data-produit-modifier]');
  if(modifierProduit){ state.modal = { kind: 'creer-produit', ligne: parseInt(modifierProduit.dataset.produitModifier, 10) }; render(); return; }
  const supprimerProduit = e.target.closest('[data-supprimer-produit]');
  if(supprimerProduit){
    if(confirm(`Supprimer le produit « ${supprimerProduit.dataset.nomProduit} » ? Il ne sera plus proposé, mais l'historique des commandes le mentionnant reste inchangé.`)){
      supprimerProduitAction(parseInt(supprimerProduit.dataset.supprimerProduit, 10));
    }
    return;
  }
  const supprimerStructure = e.target.closest('[data-supprimer-structure]');
  if(supprimerStructure){
    if(confirm(`Supprimer la structure « ${supprimerStructure.dataset.nomStructure} » ?\n\nSon code d'accès cessera de fonctionner, mais toutes les commandes, tickets SAV et documents déjà liés à cette structure sont conservés tels quels — rien n'est supprimé côté historique.`)){
      supprimerStructureAction(parseInt(supprimerStructure.dataset.supprimerStructure, 10));
    }
    return;
  }

  const reveal = e.target.closest('[data-reveal-code]');
  if(reveal){ state.revealedCodes[reveal.dataset.revealCode] = !state.revealedCodes[reveal.dataset.revealCode]; render(); return; }
  const modifierStructure = e.target.closest('[data-structure-modifier]');
  if(modifierStructure){ state.modal = { kind: 'creer-structure', ligne: parseInt(modifierStructure.dataset.structureModifier, 10) }; render(); return; }

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
  const genDevis = e.target.closest('[data-generer-devis]');
  if(genDevis){ genererDocumentCommande(genDevis.dataset.genererDevis, 'devis'); return; }
  const genFactureLivree = e.target.closest('[data-generer-facture-livree]');
  if(genFactureLivree){ genererFactureDepuisLivree(genFactureLivree.dataset.genererFactureLivree); return; }
  const enregLienPaiement = e.target.closest('[data-enregistrer-lien-paiement]');
  if(enregLienPaiement){ enregistrerLienPaiement(enregLienPaiement.dataset.enregistrerLienPaiement); return; }
  const enregLiensPaiementPersonnes = e.target.closest('[data-enregistrer-liens-paiement-personnes]');
  if(enregLiensPaiementPersonnes){ enregistrerLiensPaiementPersonnes(enregLiensPaiementPersonnes.dataset.enregistrerLiensPaiementPersonnes); return; }
  const choixMode = e.target.closest('[data-choisir-mode-livraison]');
  if(choixMode){ choisirModeLivraison(choixMode.dataset.ref, choixMode.dataset.choisirModeLivraison); return; }
  const enregColissimo = e.target.closest('[data-enregistrer-colissimo]');
  if(enregColissimo){ enregistrerColissimoCommande(enregColissimo.dataset.enregistrerColissimo); return; }
  const validerPrep = e.target.closest('[data-valider-preparation]');
  if(validerPrep && !validerPrep.disabled){
    if(confirm('Générer et envoyer le bon de livraison à la structure, puis faire passer la commande en livraison ?\n\nCette étape ne peut pas être annulée ensuite.')){
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
    const raison = prompt(`Clôturer ce dossier avec le statut « ${statut} » ? Cette action est définitive.\n\nMotif (visible par la structure/la personne accompagnée dans son suivi) :`);
    if(raison === null) return; // annulé
    if(!raison.trim()){ etat('Un motif est obligatoire pour clôturer le dossier.', 'erreur'); return; }
    clotureSavAvecMotif(etapeSavTerminal.dataset.ref, statut, raison.trim());
    return;
  }
  const annulSav = e.target.closest('[data-annuler-sav]');
  if(annulSav){ annulerSav(annulSav.dataset.annulerSav); return; }
  const toggleAccTerminal = e.target.closest('[data-toggle-accordeon-terminal]');
  if(toggleAccTerminal){ state.accordeonTerminalOuvert = !state.accordeonTerminalOuvert; render(); return; }
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
    const motif = prompt(`Annuler le devis « ${annulerDevis.dataset.refDevis} » ? Cette action est irréversible.\n\nMotif (interne, non visible par la structure) :`);
    if(motif !== null && motif.trim()) annulerDocumentAction('devis', parseInt(annulerDevis.dataset.annulerDevis, 10), motif.trim());
    return;
  }
  const annulerFacture = e.target.closest('[data-annuler-facture]');
  if(annulerFacture){
    const motif = prompt(`Annuler la facture « ${annulerFacture.dataset.refFacture} » ? Cette action est irréversible.\n\nMotif (interne, non visible par la structure) :`);
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
  const filtrerStatutSav = e.target.closest('[data-filtrer-statut-sav]');
  if(filtrerStatutSav){ state.savFiltreStatut = filtrerStatutSav.dataset.filtrerStatutSav; render(); return; }
  const savVue = e.target.closest('[data-sav-vue]');
  if(savVue){ state.savVue = savVue.dataset.savVue; render(); return; }
  const calendrierMois = e.target.closest('[data-calendrier-mois]');
  if(calendrierMois){ state.calendrierDecalageMois += parseInt(calendrierMois.dataset.calendrierMois, 10); render(); return; }
  const calendrierJour = e.target.closest('[data-calendrier-jour]');
  if(calendrierJour){ state.calendrierJourChoisi = calendrierJour.dataset.calendrierJour; render(); return; }
  if(e.target.closest('#rp-toggle-theme')){ basculerTheme(); return; }
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
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (0/O, 1/I/l)
    const groupe = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    const code = `${groupe()}-${groupe()}-${groupe()}-${groupe()}`;
    const champ = $('cs-code');
    if(champ) champ.value = code;
    return;
  }
  const regenererCode = e.target.closest('[data-regenerer-code-structure]');
  if(regenererCode){
    if(!confirm('Régénérer le code de cette structure ? L\'ancien code cessera de fonctionner immédiatement (liens déjà partagés, portail, suivi de commande...).')) return;
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
function importerCsvSeries(fichier){
  if(!fichier) return;
  const lecteur = new FileReader();
  lecteur.onload = () => {
    const texte = String(lecteur.result || '');
    const lignes = texte.split(/\r?\n/).filter(l => l.trim());
    if(lignes.length < 2){ etat('CSV vide ou sans ligne de données (2ᵉ ligne).', 'erreur'); return; }
    const separateur = lignes[0].includes(';') ? ';' : ',';
    const numeros = lignes.slice(1) // à partir de la 2ᵉ ligne : la 1ʳᵉ est l'en-tête
      .map(ligne => parserLigneCsv(ligne, separateur)[6]) // colonne G = index 6
      .map(v => (v || '').trim())
      .filter(Boolean);
    if(!numeros.length){ etat('Aucun numéro trouvé en colonne G du CSV.', 'erreur'); return; }
    const zone = $('pn-series');
    if(zone) zone.value = numeros.join('\n');
    etat(`${numeros.length} numéro${numeros.length > 1 ? 's' : ''} importé${numeros.length > 1 ? 's' : ''}`, 'succes');
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
  const raison = prompt('Annuler ce dossier SAV ? Cette action est définitive.\n\nMotif (visible par la structure/la personne accompagnée dans son suivi) :');
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
  const isoAuj = `${auj.getFullYear()}-${String(auj.getMonth()+1).padStart(2,'0')}-${String(auj.getDate()).padStart(2,'0')}`;
  const moisRef = new Date(auj.getFullYear(), auj.getMonth() + state.calendrierDecalageMois, 1);

  if(!state.calendrierJourChoisi){
    const prochaines = [...parDate.keys()].filter(iso => iso >= isoAuj).sort();
    state.calendrierJourChoisi = prochaines[0] || isoAuj;
  }

  const premierJourSemaine = (new Date(moisRef.getFullYear(), moisRef.getMonth(), 1).getDay() + 6) % 7; // lundi = 0
  const nbJours = new Date(moisRef.getFullYear(), moisRef.getMonth() + 1, 0).getDate();
  const isoJour = j => `${moisRef.getFullYear()}-${String(moisRef.getMonth()+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`;

  const cellules = Array(premierJourSemaine).fill(null).concat(Array.from({ length: nbJours }, (_, i) => i + 1));
  const grille = cellules.map(j => {
    if(!j) return `<div></div>`;
    const iso = isoJour(j);
    const entrees = parDate.get(iso) || [];
    const aConfirme = entrees.some(e => e.confirme);
    const aEstime = entrees.some(e => !e.confirme);
    const choisi = iso === state.calendrierJourChoisi;
    const estAuj = iso === isoAuj;
    return `
    <button type="button" data-calendrier-jour="${iso}" style="all:unset;box-sizing:border-box;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:10px;cursor:pointer;font-weight:700;font-size:15px;font-family:var(--font-heading);${choisi ? 'background:var(--color-neutral-900);color:#fff' : estAuj ? 'background:var(--color-accent-100);color:var(--color-accent-700)' : 'color:var(--color-text)'}">
      ${j}
      <span style="display:flex;gap:3px;height:5px">
        ${aConfirme ? `<span style="width:5px;height:5px;border-radius:999px;flex:none;background:${choisi ? '#fff' : COULEUR_VERT_GARANTIE}"></span>` : ''}
        ${aEstime ? `<span style="width:5px;height:5px;border-radius:999px;flex:none;background:${choisi ? '#fff' : 'var(--color-warn)'}"></span>` : ''}
      </span>
    </button>`;
  }).join('');

  const entreesDuJour = parDate.get(state.calendrierJourChoisi) || [];
  const dateChoisie = new Date(state.calendrierJourChoisi + 'T00:00:00');
  const libelleJourChoisi = state.calendrierJourChoisi === isoAuj ? "Aujourd'hui" : dateChoisie.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return `
      <div>
        <div class="card-title" style="font-size:16px">Prochaines livraisons</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
          <button type="button" class="btn btn-ghost btn-icon" style="width:28px;height:28px" data-calendrier-mois="-1" aria-label="Mois précédent">‹</button>
          <span style="font-weight:700;font-size:13.5px;font-family:var(--font-heading)">${MOIS_CAL[moisRef.getMonth()]} ${moisRef.getFullYear()}</span>
          <button type="button" class="btn btn-ghost btn-icon" style="width:28px;height:28px" data-calendrier-mois="1" aria-label="Mois suivant">›</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:10.5px;font-weight:700;opacity:0.45;text-align:center;margin-top:12px">
        ${JOURS_SEMAINE_CAL.map(j => `<div>${j}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:4px">${grille}</div>
      <div style="display:flex;gap:14px;font-size:10.5px;opacity:0.55;margin-top:8px">
        <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:6px;height:6px;border-radius:999px;background:${COULEUR_VERT_GARANTIE}"></span>Confirmée</span>
        <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:6px;height:6px;border-radius:999px;background:var(--color-warn)"></span>Estimée</span>
      </div>
      <div style="border-top:1px solid var(--color-divider);padding-top:var(--space-3);margin-top:var(--space-4);display:flex;flex-direction:column;gap:8px">
        <div style="font-size:12px;font-weight:700;text-transform:capitalize">${echapper(libelleJourChoisi)}</div>
        ${entreesDuJour.length ? entreesDuJour.map(({ commande: c, confirme }) => {
          const nbArticles = (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
          const modeInfo = MODES_LIVRAISON.find(m => m.valeur === c.modeLivraison);
          // Le jaune plein (--color-warn) sert au point du calendrier (repère visuel, pas de
          // texte dessus) ; ici, en texte/icône, il lui faut sa variante foncée pour rester
          // lisible — le jaune clair "vif" est illisible en avant-plan sur fond clair.
          const coul = confirme ? COULEUR_VERT_GARANTIE : 'var(--color-warn-700)';
          return `
          <div data-commande-ouvrir="${echapper(c.reference)}" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--color-neutral-100);cursor:pointer;min-width:0">
            <span style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${confirme ? `color-mix(in srgb, ${coul} 18%, var(--color-surface))` : 'var(--color-warn-100)'};color:${coul}">${icon(confirme ? 'check' : (modeInfo ? modeInfo.ic : 'truck'), 14)}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(c.nom)}</div>
              <div style="font-size:11.5px;opacity:0.6">${echapper(c.reference)} · ${nbArticles} article${nbArticles > 1 ? 's' : ''}${modeInfo ? ` · ${echapper(modeInfo.label)}` : ''}</div>
            </div>
            <span class="tag" style="background:${confirme ? `color-mix(in srgb, ${coul} 16%, white)` : 'var(--color-warn-100)'};color:${coul};font-weight:700;flex:none">${confirme ? 'Livrée' : 'Estimée'}</span>
          </div>`;
        }).join('') : `<p style="opacity:0.5;font-size:12.5px;margin:0">Aucune livraison prévue ce jour-là.</p>`}
      </div>`;
}
/** Fil des priorités partagé entre le tableau de bord et la cloche de notifications (sidebar) —
 *  toutes les sources déjà calculées ailleurs (commandes urgentes, SAV ouverts, devis/factures
 *  en attente, liens de paiement cliqués mais non réglés, livraisons dépassées, rapprochement),
 *  triées par urgence puis par date la plus récente. */
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
    ...aRapprocher.map(c => { const cloture3 = c.statutComptable === 'Rapproché'; const t3 = cloture3 ? { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' } : { bg: 'var(--color-corail-100)', fg: 'var(--color-corail-700)' }; return { icon: icon(cloture3 ? 'check' : 'clock', 15), badgeBg: t3.bg, badgeFg: t3.fg, tagCls: '', tagStyle: `background:${t3.bg};color:${t3.fg}`, type: 'Facture', id: c.reference, structure: c.nom, statut: cloture3 ? 'Rapproché, à clôturer' : 'Non rapproché', urgent: !cloture3, date: dateItem(c.date), attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}"` }; })
  ];
  return feedBrut.sort((a, b) => (b.urgent - a.urgent) || (b.date - a.date)).slice(0, limite || 14);
}
/** Rendu HTML d'une ligne de fil des priorités — partagé entre le tableau de bord et la cloche. */
function ligneFeedPriorite(f){
  // Une seule colonne flexible sous l'icône (au lieu de 4 blocs flex:none en concurrence sur la
  // largeur) — le tag de statut, potentiellement long ("Date dépassée, à vérifier"), a sa propre
  // ligne plutôt que de forcer tout le reste à se tasser dans un panneau étroit (340px).
  return `<div ${f.attrs} style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);cursor:pointer;${f.urgent ? `background:color-mix(in srgb, ${f.badgeBg} 45%, var(--color-surface))` : ''}">
    <span style="width:34px;height:34px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${f.badgeBg};color:${f.badgeFg}">${f.icon}</span>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(f.id)}${f.urgent ? ` <span style="color:${f.badgeFg};font-size:11px;font-weight:800;letter-spacing:0.04em">· URGENT</span>` : ''}</div>
      <div style="font-size:11.5px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(f.type)} · ${echapper(f.structure)}</div>
      <span class="tag ${f.tagCls || ''}" style="align-self:flex-start;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${f.tagStyle || ''}">${echapper(f.statut)}</span>
    </div>
  </div>`;
}
/** Cloche de notifications (sidebar) — mêmes données que le fil des priorités du tableau de
 *  bord, mais accessibles depuis n'importe quel onglet plutôt qu'en revenant au dashboard. */
function rendreClocheNotifications(){
  const feed = construireFeedPriorites(20);
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
      <div style="padding:var(--space-4) var(--space-4) var(--space-3);border-bottom:1px solid var(--color-divider);font-weight:700;font-size:14px">Notifications</div>
      <div style="max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:var(--space-2)">
        ${feed.length ? feed.map(ligneFeedPriorite).join('') : '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Rien à traiter — tout est à jour.</p>'}
      </div>`;
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
    <p style="opacity:0.65;margin:0 0 var(--space-6);font-size:15px">Vue d'ensemble de l'activité du parc informatique reconditionné.</p>
    <div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,0.7fr) minmax(0,0.7fr);gap:var(--space-4);margin-bottom:var(--space-4)">
      <div style="grid-row:span 2;background:var(--color-neutral-900);color:#fff;border-radius:calc(var(--radius-lg) * 1.15);padding:var(--space-6);position:relative;min-height:260px;display:flex;flex-direction:column;justify-content:space-between;gap:var(--space-3);cursor:pointer;min-width:0" data-kpi-listing="a-decider">
        <div style="position:absolute;inset:0;border-radius:calc(var(--radius-lg) * 1.15);overflow:hidden;z-index:0">
          <div style="position:absolute;width:200px;height:200px;border-radius:999px;background:var(--color-accent-2);opacity:0.9;right:-70px;bottom:-70px"></div>
          <div style="position:absolute;width:135px;height:135px;border-radius:999px;background:var(--color-accent);opacity:0.9;right:-45px;top:-38px"></div>
          ${KPI_FORMES_TRAJECTOIRES.map((t, i) => `<div class="rp-kpi-forme f${i + 1}" style="--x0:${t.x0}px;--y0:${t.y0}px;--x1:${t.x1}px;--y1:${t.y1}px;animation-duration:${t.duree}s;animation-delay:${t.delai}s"></div>`).join('')}
        </div>
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;opacity:0.85;position:relative;z-index:1">À décider maintenant</div>
        <div style="font-family:var(--font-heading);font-size:72px;line-height:1;position:relative;z-index:1">${aDecider.length}</div>
        <div style="font-weight:700;font-size:16px;line-height:1.35;position:relative;z-index:1;overflow-wrap:break-word">Commande${aDecider.length > 1 ? 's' : ''} attend${aDecider.length > 1 ? 'ent' : ''} votre validation</div>
      </div>
      <div style="grid-column:span 2;background:var(--color-accent);color:#fff;border-radius:calc(var(--radius-lg) * 1.15);padding:var(--space-6);cursor:pointer;min-width:0;overflow-wrap:break-word" data-kpi-listing="urgentes">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;opacity:0.9;overflow-wrap:break-word">${plusUrgente ? `Urgent — ${echapper(plusUrgente.nom)}` : 'Aucune commande urgente'}</div>
        ${plusUrgente ? `
        <div style="font-family:var(--font-heading);font-weight:700;font-size:19px;line-height:1.3;margin:8px 0;overflow-wrap:break-word">${echapper(materielUrgent || plusUrgente.reference)}</div>
        <div style="font-size:12.5px;opacity:0.85">${echapper(plusUrgente.reference)} · ${joursAttente} jour${joursAttente > 1 ? 's' : ''} d'attente</div>` : ''}
      </div>
      <div style="background:var(--color-accent-2);color:#fff;border-radius:calc(var(--radius-lg) * 1.15);padding:var(--space-6);cursor:pointer;min-width:0" data-kpi-listing="en-preparation">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;opacity:0.9">Préparation</div>
        <div style="font-family:var(--font-heading);font-size:36px;line-height:1;margin:6px 0">${enPreparation.length}</div>
        <div style="font-size:12px;opacity:0.85">sans n° de série</div>
      </div>
      <div style="background:var(--color-warn);color:var(--color-warn-800);border-radius:calc(var(--radius-lg) * 1.15);padding:var(--space-6);cursor:pointer;min-width:0;overflow-wrap:break-word" data-kpi-listing="facturation">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:800;opacity:1;color:var(--color-neutral-800)">À clôturer</div>
        <div style="font-family:var(--font-heading);font-size:24px;line-height:1.15;margin:6px 0">${formaterMontant(montantARapprocher)}</div>
        <div style="font-size:12px;opacity:0.75">${aRapprocher.length} facture${aRapprocher.length > 1 ? 's' : ''}${enRetardRapprochement ? `, ${enRetardRapprochement} en retard` : ''}</div>
      </div>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6);min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:var(--space-6)">
      <div style="min-width:0">
      <div class="card-title" style="font-size:18px;margin-bottom:var(--space-3)">Fil des priorités</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${feed.length ? feed.map(ligneFeedPriorite).join('') : '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Rien à traiter — tout est à jour.</p>'}
      </div>
      </div>
      <div style="border-left:1px solid var(--color-divider);padding-left:var(--space-6);margin:calc(var(--space-6) * -1) 0;padding-top:var(--space-6);padding-bottom:var(--space-6)">
        ${carteCalendrierLivraisonsContenu()}
      </div>
    </div>`;
}

/* ============================================================
   Commandes — kanban + "à livrer" + recherche
   ============================================================ */
function commentaireReel(c){
  return !!(c.commentaire && !c.commentaire.startsWith('##LOGISTIQUE_QUANTITES##'));
}
function tableauCommandes(liste){
  const parPage = 25;
  const page = state.commandesPage || 0;
  const total = liste.length;
  const debut = page * parPage;
  const pageListe = liste.slice(debut, debut + parPage);
  const nbPages = Math.max(1, Math.ceil(total / parPage));

  return `
    <div class="card elev-sm" style="padding:0;border-radius:var(--radius-md)">
      <table class="table">
        <thead><tr><th>Référence</th><th>Structure</th><th>Date</th><th>Articles</th><th>Statut</th></tr></thead>
        <tbody>
          ${pageListe.length ? pageListe.map(c => {
            const t = mkTag(c.statutCommande, ORDER_META);
            const nbArticles = (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
            const urgent = c.dateLivraisonSouhaitee === 'ASAP' && c.statutCommande !== 'Livrée';
            return `
            <tr style="cursor:pointer;${c.statutCommande === 'Annulée' ? 'opacity:0.45' : c.statutCommande === 'Livrée' ? 'background:var(--color-vert-100)' : ''}" data-commande-ouvrir="${echapper(c.reference)}">
              <td style="font-weight:700;white-space:nowrap">${echapper(c.reference)}${urgent ? ` <span style="color:var(--color-accent)" title="Urgente">${icon('eclair', 13)}</span>` : ''}${commentaireReel(c) ? ` <span style="opacity:0.5" title="Commentaire">${icon('bulle', 12)}</span>` : ''}</td>
              <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(c.nom)}</td>
              <td style="white-space:nowrap;opacity:0.7">${echapper(c.date)}</td>
              <td>${nbArticles}</td>
              <td><span class="tag ${t.tagCls}">${echapper(c.statutCommande)}</span></td>
            </tr>`;
          }).join('') : `<tr><td colspan="5" style="text-align:center;opacity:0.5;padding:var(--space-6)">Aucune commande.</td></tr>`}
        </tbody>
      </table>
    </div>
    ${nbPages > 1 ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-3);margin-top:var(--space-4)">
      <button type="button" class="btn btn-secondary btn-icon" data-page-commandes="${page - 1}" ${page === 0 ? 'disabled' : ''}>${icon('chevron', 14)}</button>
      <span style="font-size:13px;opacity:0.65">Page ${page + 1} / ${nbPages} · ${total} commande${total > 1 ? 's' : ''}</span>
      <button type="button" class="btn btn-secondary btn-icon" data-page-commandes="${page + 1}" ${page >= nbPages - 1 ? 'disabled' : ''} style="transform:rotate(180deg)">${icon('chevron', 14)}</button>
    </div>` : ''}`;
}

function vueCommandes(){
  const q = state.commandeSearch.trim().toLowerCase();
  let liste = q ? state.commandes.filter(c => c.reference.toLowerCase().includes(q) || c.nom.toLowerCase().includes(q)) : state.commandes;
  const listeAvantFiltreStatut = liste;
  if(state.commandesFiltreStatut === 'URGENT') liste = liste.filter(c => c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande));
  else if(state.commandesFiltreStatut) liste = liste.filter(c => c.statutCommande === state.commandesFiltreStatut);

  // "À livrer" reste un résumé global, indépendant du filtre de statut affiché juste en
  // dessous (sinon il disparaît dès qu'un filtre est actif) — seule la recherche s'applique.
  const aLivrer = listeAvantFiltreStatut.filter(c => c.statutCommande !== 'Livrée' && c.statutCommande !== 'Annulée');
  const parProduit = {};
  aLivrer.forEach(c => (c.lignes || []).forEach(l => { parProduit[l.produit] = (parProduit[l.produit] || 0) + parseInt(l.quantite, 10); }));
  const resume = Object.keys(parProduit).map(nom => ({ label: nom, qty: parProduit[nom] })).sort((a, b) => b.qty - a.qty);
  const totalArticles = resume.reduce((s, m) => s + m.qty, 0);
  const nbUrgentesListe = listeAvantFiltreStatut.filter(c => c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande)).length;

  const vueListe = state.commandesVue !== 'kanban';

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Commandes</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">${vueListe ? 'Liste triable, une commande par ligne.' : 'Suivi en tableau, colonne par étape.'}</p>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <div class="rp-seg">
          <button type="button" class="${vueListe ? 'actif' : ''}" data-commandes-vue="liste">Liste</button>
          <button type="button" class="${vueListe ? '' : 'actif'}" data-commandes-vue="kanban">Kanban</button>
        </div>
        <button type="button" class="btn btn-primary" data-ouvrir-creation="commande">${icon('plus', 15)}Nouvelle commande</button>
      </div>
    </div>
    ${champRecherche('rp-recherche-commandes', 'Rechercher par nom ou n° de commande...', state.commandeSearch)}
    <div style="margin-bottom:var(--space-6)">
      <div class="card-title" style="font-size:16px;margin-bottom:var(--space-3)">À livrer <span style="opacity:0.5;font-weight:400">· ${totalArticles} article${totalArticles > 1 ? 's' : ''}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3)">
        ${resume.length ? resume.map(m => `
          <div class="card elev-sm" style="min-width:0;padding:var(--space-4);gap:var(--space-2);cursor:pointer" data-livrer-produit="${echapper(m.label)}">
            <span style="width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon(iconeProduit(m.label, (state.produits.find(p => p.nom === m.label) || {}).icone), 18)}</span>
            <div style="font-family:var(--font-heading);font-size:24px;line-height:1">${m.qty}</div>
            <div style="font-size:12px;opacity:0.6">${echapper(m.label)}</div>
          </div>`).join('') : '<p style="opacity:0.5;font-size:13px">Rien à livrer.</p>'}
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:var(--space-6)">
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${!state.commandesFiltreStatut ? 'var(--color-neutral-900)' : 'var(--color-surface)'};color:${!state.commandesFiltreStatut ? '#fff' : 'var(--color-text)'};border:1.5px solid ${!state.commandesFiltreStatut ? 'var(--color-neutral-900)' : 'var(--color-divider)'}" data-filtrer-statut-commande="">
        Tous <span style="opacity:0.65;font-weight:600">${listeAvantFiltreStatut.length}</span>
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.commandesFiltreStatut === 'URGENT' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.commandesFiltreStatut === 'URGENT' ? '#fff' : 'var(--color-text)'};border:1.5px solid ${state.commandesFiltreStatut === 'URGENT' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-statut-commande="URGENT">
        <span style="display:flex">${icon('eclair', 13)}</span>URGENT <span style="opacity:0.65;font-weight:600">${nbUrgentesListe}</span>
      </button>
      ${ORDER_STATUSES.map(s => {
        const m = ORDER_META[s], b = BADGE[m.cls];
        const n = listeAvantFiltreStatut.filter(c => c.statutCommande === s).length;
        const actif = state.commandesFiltreStatut === s;
        return `
        <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${actif ? b.bg : 'var(--color-surface)'};color:${actif ? b.fg : 'var(--color-text)'};border:1.5px solid ${actif ? 'transparent' : 'var(--color-divider)'}" data-filtrer-statut-commande="${echapper(s)}">
          <span style="display:flex">${icon(m.ic, 13)}</span>${echapper(s)} <span style="opacity:0.65;font-weight:600">${n}</span>
        </button>`;
      }).join('')}
    </div>
    ${vueListe ? tableauCommandes(liste) : kanbanCommandes(liste)}`;
}
function kanbanCommandes(liste){
  const colonnes = ORDER_STATUSES.map(statut => {
    const m = ORDER_META[statut], b = BADGE[m.cls];
    const items = liste.filter(c => c.statutCommande === statut);
    return { statut, icon: icon(m.ic, 14), bg: b.bg, fg: b.fg, items };
  });
  return `
    <div style="display:flex;gap:var(--space-4);overflow-x:auto;padding-bottom:var(--space-3)">
      ${colonnes.map(col => `
        <div style="flex:none;width:250px;display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;align-items:center;gap:8px;padding:0 4px">
            <span style="width:26px;height:26px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:${col.bg};color:${col.fg}">${col.icon}</span>
            <span style="font-weight:700;font-size:13px">${echapper(col.statut)}</span>
            <span style="margin-left:auto;font-size:12px;opacity:0.5">${col.items.length}</span>
          </div>
          <div class="rp-kanban-zone" data-kanban-colonne="${echapper(col.statut)}" style="display:flex;flex-direction:column;gap:var(--space-3);flex:1;min-height:140px;border-radius:var(--radius-md);transition:background .15s">
          ${col.items.map(c => {
            const idx = ORDER_STATUSES.indexOf(c.statutCommande);
            const percent = Math.round(((idx + 1) / ORDER_STATUSES.length) * 100);
            const nbArticles = (c.lignes || []).reduce((s, l) => s + parseInt(l.quantite, 10), 0);
            const urgent = c.dateLivraisonSouhaitee === 'ASAP' && c.statutCommande !== 'Livrée';
            return `
            <div class="card elev-sm" draggable="true" style="min-width:0;padding:var(--space-4);gap:var(--space-2);cursor:pointer" data-commande-ouvrir="${echapper(c.reference)}" data-kanban-carte="${echapper(c.reference)}">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-weight:700;font-size:13px">${echapper(c.reference)}</span>
                ${urgent ? `<span style="color:var(--color-accent)" title="Urgente">${icon('eclair', 13)}</span>` : ''}
                ${commentaireReel(c) ? `<span style="opacity:0.5" title="Commentaire">${icon('bulle', 12)}</span>` : ''}
              </div>
              <div style="font-size:12px;opacity:0.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(c.nom)}</div>
              <div style="font-size:12px;opacity:0.5">${echapper(c.date)} · ${nbArticles} article${nbArticles > 1 ? 's' : ''}</div>
              <div style="height:5px;border-radius:999px;background:var(--color-neutral-200);overflow:hidden;margin-top:4px">
                <div style="height:100%;border-radius:999px;width:${percent}%;background:${BAR_COLOR[mkTag(c.statutCommande, ORDER_META).tagCls]}"></div>
              </div>
            </div>`;
          }).join('')}
          </div>
        </div>`).join('')}
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
    'en-preparation': { titre: 'En préparation — sans n° de série', liste: state.commandes.filter(c => c.statutCommande === 'Validée'), rendre: c => {
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
              <span style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${r.statutTag.badgeBg};color:${r.statutTag.badgeFg}">${r.statutTag.icon}</span>
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
              <span style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${t.badgeBg};color:${t.badgeFg}">${t.icon}</span>
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

  const pilulesFiltre = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:var(--space-4) 0 var(--space-6)">
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${!state.savFiltreStatut ? 'var(--color-neutral-900)' : 'var(--color-surface)'};color:${!state.savFiltreStatut ? '#fff' : 'var(--color-text)'};border:1.5px solid ${!state.savFiltreStatut ? 'var(--color-neutral-900)' : 'var(--color-divider)'}" data-filtrer-statut-sav="">
        Tous <span style="opacity:0.65;font-weight:600">${listeAvantFiltreStatut.length}</span>
      </button>
      ${ordreComplet.map(def => {
        const coul = couleurRole(def);
        const n = listeAvantFiltreStatut.filter(s => s.statut === def.statut).length;
        const actif = state.savFiltreStatut === def.statut;
        return `
        <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${actif ? coul : 'var(--color-surface)'};color:${actif ? '#fff' : 'var(--color-text)'};border:1.5px solid ${actif ? 'transparent' : 'var(--color-divider)'}" data-filtrer-statut-sav="${echapper(def.statut)}">
          <span style="display:flex">${icon(iconeStatutSav(def.statut, def.icone), 13)}</span>${echapper(def.statut)} <span style="opacity:0.65;font-weight:600">${n}</span>
        </button>`;
      }).join('')}
    </div>`;

  // Grandes cards (plus de kanban, plus de bandeau récap) — triées dans l'ordre du cycle de
  // vie des statuts (réglages statuts) pour garder une lecture cohérente sans colonnes.
  const ordreIndex = new Map(ordreComplet.map((d, i) => [d.statut, i]));
  const listeTriee = [...liste].sort((a, b) => (ordreIndex.get(a.statut) ?? 999) - (ordreIndex.get(b.statut) ?? 999));

  const cartes = listeTriee.map(s => {
    const def = ordreComplet.find(d => d.statut === s.statut);
    const coul = couleurRole(def);
    return `
    <div class="card elev-sm" style="padding:var(--space-6) var(--space-5);gap:var(--space-3);cursor:pointer;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center" data-sav-ouvrir="${echapper(s.reference)}">
      ${ring(fractionPour(def), coul, 104, null, 10)}
      <div style="min-width:0;width:100%">
        <div style="font-weight:700;font-size:16px;font-family:var(--font-heading)">${echapper(s.reference)}</div>
        <div style="font-size:13px;opacity:0.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(s.structureNom || '')}</div>
      </div>
      <div style="font-size:13px;opacity:0.65">${echapper(s.marque || '')} ${echapper(s.modele || '')}</div>
      <span class="tag" style="width:fit-content;background:color-mix(in srgb, ${coul} 16%, var(--color-surface));color:${coul};font-weight:700">${echapper(s.statut)}</span>
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
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:var(--space-4)">
      ${cartes || '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Aucun dossier SAV.</p>'}
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
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${ticketsAnnee.length}</div>
        <div style="font-size:12.5px;opacity:0.6">dossiers ouverts en ${anneeSelectionnee}</div>
      </div>
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${nbOuverts}</div>
        <div style="font-size:12.5px;opacity:0.6">encore en cours</div>
      </div>
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${tauxResolu}%</div>
        <div style="font-size:12.5px;opacity:0.6">clôturés</div>
      </div>
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
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
            <div style="width:100%;border-radius:6px 6px 0 0;background:var(--color-accent-2);height:${Math.max(2, Math.round(n / maxMois * 100))}%"></div>
            <span style="font-size:10.5px;opacity:0.5">${MOIS[i]}</span>
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
    return `<span${titreEnvoi} style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 18%, var(--color-surface));color:${fg}">${ic}</span>
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
    return `<span${titreEnvoi} style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 18%, var(--color-surface));color:${fg}">${ic}</span>
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
      <span style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;line-height:0;background:color-mix(in srgb, ${b.fg} 18%, var(--color-surface));color:${b.fg}"><span style="display:block;position:relative;top:${decalageIcone}">${icon(icone, 15)}</span></span>
      <div style="flex:1;min-width:0;color:${b.fg}">
        <div style="font-size:13px">${echapper(c.nom)}</div>
        ${c.numeroDepot ? `<div style="font-size:11.5px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(c.numeroDepot)}</div>` : ''}
      </div>
      <button type="button" class="tag" style="border:none;cursor:pointer;flex:none;background:var(--color-surface);color:${b.fg}" data-ouvrir-rapprochement="${echapper(f.referenceFacture)}">${echapper(c.statutComptable || 'Non rapproché')}</button>` };
  };

  const cellule = (info, hauteurPleine) => `
    <div style="min-width:0;padding:var(--space-3);border-radius:var(--radius-md);display:flex;align-items:center;gap:var(--space-3);${hauteurPleine ? 'height:100%;' : ''}background:${info.bg || 'transparent'};border:${(info.present || info.bg) ? 'none' : '2.5px dashed var(--color-neutral-400)'};opacity:${(info.present || info.bg) ? '1' : '0.55'};overflow:hidden${info.type ? ';cursor:pointer' : ''}" ${info.type ? `data-doc-ouvrir="${info.type}:${echapper(info.ref)}"` : ''}>
      ${info.html}
    </div>`;
  const traitVertical = present => `<div style="width:2px;height:12px;margin-left:26px;background:${present ? 'var(--color-accent-2)' : 'var(--color-divider)'}"></div>`;
  const traitHorizontal = present => `<div style="align-self:center;height:2px;background:${present ? 'var(--color-accent-2)' : 'var(--color-divider)'};min-width:20px"></div>`;

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
        <button type="button" class="btn btn-secondary" data-ouvrir-creation="devis">${icon('plus', 15)}Nouveau devis</button>
        <button type="button" class="btn btn-primary" data-ouvrir-creation="facture">${icon('plus', 15)}Nouvelle facture</button>
      </div>
    </div>
    ${champRecherche('rp-recherche-docs', 'Rechercher par nom de facture/devis...', state.docSearch)}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:var(--space-3) 0 var(--space-5)">
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${!state.docsFiltre ? 'var(--color-neutral-900)' : 'var(--color-surface)'};color:${!state.docsFiltre ? '#fff' : 'var(--color-text)'};border:1.5px solid ${!state.docsFiltre ? 'var(--color-neutral-900)' : 'var(--color-divider)'}" data-filtrer-docs="">
        Tous
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.docsFiltre === 'devis-attente' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.docsFiltre === 'devis-attente' ? '#fff' : 'var(--color-text)'};border:1.5px solid ${state.docsFiltre === 'devis-attente' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-docs="devis-attente">
        Devis en attente <span style="opacity:0.65;font-weight:600">${nbDevisAttente}</span>
      </button>
      <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;font-family:var(--font-heading);background:${state.docsFiltre === 'facture-impayee' ? 'var(--color-accent)' : 'var(--color-surface)'};color:${state.docsFiltre === 'facture-impayee' ? '#fff' : 'var(--color-text)'};border:1.5px solid ${state.docsFiltre === 'facture-impayee' ? 'transparent' : 'var(--color-divider)'}" data-filtrer-docs="facture-impayee">
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
      <button type="button" class="btn btn-secondary" id="btn-synchroniser-tectech">${icon('refresh', 15)}Synchroniser stock tec.tech</button>
      <button type="button" class="btn btn-secondary" data-organiser-materiel>${icon('grip', 15)}Organiser la page catalogue</button>
      <button type="button" class="btn btn-primary" data-ouvrir-creation="produit">${icon('plus', 15)}Ajouter un produit</button>
    </div>
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
            <span style="width:48px;height:48px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon(iconeProduit(p.nom, p.icone), 22)}</span>
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
        <div style="height:8px;border-radius:999px;background:var(--color-neutral-200);overflow:hidden">
          <div style="height:100%;border-radius:999px;width:${Math.max(3, Math.round(l.valeur / max * 100))}%;background:var(--color-accent-2)"></div>
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
      <div style="position:relative;width:${taille}px;height:${taille}px;flex:none;border-radius:50%;background:${fond}">
        <div style="position:absolute;inset:${epaisseur}px;border-radius:50%;background:var(--color-surface);display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-family:var(--font-heading);font-size:26px;color:var(--color-text);line-height:1">${total}</span>
          <span style="font-size:11px;color:var(--color-text);opacity:0.55">total</span>
        </div>
      </div>
      <div style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:8px">
        ${lignes.length ? lignes.map((l, i) => `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:999px;flex:none;background:${PALETTE_ANNEAUX[i % PALETTE_ANNEAUX.length]}"></span>
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

    <div class="card elev-sm" style="padding:var(--space-6);gap:10px;margin-bottom:var(--space-6)">
      <div class="card-title">Documents</div>
      <p style="font-size:13px;opacity:0.7;margin:0">Modèle utilisé pour générer les bons de livraison.</p>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn btn-secondary" style="width:fit-content" data-ouvrir-modele-bon>${icon('file', 15)}Modèle bon de livraison</button>
        <span style="opacity:0.35">|</span>
        <button type="button" class="btn btn-secondary" style="width:fit-content" data-ouvrir-modele-devis>${icon('file', 15)}Modèle devis</button>
        <span style="opacity:0.35">|</span>
        <button type="button" class="btn btn-secondary" style="width:fit-content" data-ouvrir-modele-facture>${icon('file', 15)}Modèle facture</button>
        <span style="opacity:0.35">|</span>
        <button type="button" class="btn btn-secondary" style="width:fit-content" data-ouvrir-modele-attestation>${icon('file', 15)}Modèle attestation</button>
      </div>
      <details style="margin-top:6px">
        <summary style="cursor:pointer;font-size:12.5px;font-weight:600;opacity:0.7">Utiliser un modèle Google Sheets/Docs à la place (repli historique)</summary>
        <p style="font-size:12.5px;opacity:0.6;margin:8px 0">Colle l'ID (ou le lien complet) du classeur/document modèle — ignoré si un modèle HTML est téléversé ci-dessus pour le même document.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${champ("ID modèle — Bon de livraison", `<input class="input" id="rg-modele-bon-livraison" value="${echapper(r.modeleBonLivraison || '')}" placeholder="ID ou lien du classeur modèle">`)}
          ${champ("ID modèle — Bon d'orientation", `<input class="input" id="rg-modele-bon-orientation" value="${echapper(r.modeleBonOrientation || '')}" placeholder="ID ou lien du classeur modèle">`)}
          ${champ("ID modèle — Attestation de paiement", `<input class="input" id="rg-modele-attestation" value="${echapper(r.modeleAttestationPaiement || '')}" placeholder="ID ou lien du document modèle">`)}
          ${champ("ID modèle — Facturation", `<input class="input" id="rg-modele-facturation" value="${echapper(r.modeleFacturation || '')}" placeholder="ID ou lien du classeur modèle">`)}
        </div>
        <button type="button" class="btn btn-primary" style="margin-top:10px" id="rg-modeles-sheets-enregistrer">Enregistrer les modèles Sheets</button>
        <div id="rg-modeles-sheets-retour"></div>
      </details>
    </div>

    <div class="card elev-sm" style="padding:var(--space-6);gap:var(--space-4)">
      <div>
        <div class="card-title">Connexion à l'API tec.tech</div>
        <p style="font-size:13px;opacity:0.7;margin:4px 0 0">Reconditionneur partenaire — synchro stock, donateur/reconditionneur d'origine.</p>
      </div>
      ${champ("URL de base", `<input class="input" id="rg-tectech-url" value="${echapper(r.tectechUrlBase || '')}" placeholder="https://tec-tech.osc-fr1.scalingo.io">`)}
      ${champ("ID de stock suivi", `<input class="input" id="rg-tectech-stock" value="${echapper(r.tectechIdStock || '')}" placeholder="S-0454">`)}
      ${champ("Statuts comptant comme \"disponible\" (séparés par une virgule)", `<input class="input" id="rg-tectech-statuts" value="${echapper(r.tectechStatuts || '')}" placeholder="PRET_A_COMMANDER,A_DISTRIBUER">`)}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn btn-primary" id="rg-tectech-enregistrer">Enregistrer</button>
        <button type="button" class="btn btn-secondary" id="rg-tectech-tester">${icon('refresh', 15)}Tester la connexion</button>
      </div>
      <div id="rg-tectech-retour"></div>
    </div>

    <div class="card elev-sm" style="padding:var(--space-6);gap:var(--space-4);margin-top:var(--space-6);border:1.5px solid var(--color-accent)">
      <div>
        <div class="card-title" style="color:var(--color-accent-700)">⚠️ Mode démo — réinitialisation complète</div>
        <p style="font-size:13px;opacity:0.7;margin:4px 0 0">Efface <strong>toutes</strong> les Structures, Commandes, Devis, Factures, SAV et la flotte interne (jamais le catalogue Produits ni ces réglages), puis les repeuple avec un jeu de données de démonstration réaliste (~15 structures, ~70 commandes, SAV, devis/factures). Réutilisable à volonté (avant chaque démo par exemple), mais irréversible à chaque lancement — pense à faire une copie du classeur avant si tu as le moindre doute. Prend normalement moins d'une minute (écritures groupées par lots) — si jamais ça échoue en cours de route, relancer est sans risque : tout est effacé avant d'être régénéré à chaque lancement.</p>
      </div>
      ${champ('Tape RÉINITIALISER pour confirmer', `<input class="input" id="rg-demo-confirmation" placeholder="RÉINITIALISER" autocomplete="off">`)}
      <button type="button" class="btn btn-primary" style="width:fit-content;background:var(--color-accent);border-color:var(--color-accent)" id="rg-demo-lancer" disabled>${icon('refresh', 15)}Réinitialiser en mode démo</button>
      <div id="rg-demo-retour"></div>
    </div>`;
}
/** Accepte aussi bien un ID brut qu'un lien Google complet (Sheets/Docs) — la copie de modèle
 *  (copierModele côté backend) attend un ID nu, jamais une URL. */
function extraireIdDepuisLien(valeur){
  const v = String(valeur || '').trim();
  const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}
/** Mode démo : bouton désactivé tant que le mot de confirmation exact n'est pas tapé — filet de
 *  sécurité minimal avant une action destructrice qui efface toutes les données réelles. */
async function lancerReinitialisationDemo(){
  if($('rg-demo-confirmation').value.trim() !== 'RÉINITIALISER') return;
  if(!confirm("Dernière confirmation : ceci efface définitivement toutes les Structures, Commandes, Devis, Factures, SAV et la flotte interne actuelles, pour les remplacer par des données de démonstration. Le catalogue Produits n'est pas touché. Continuer ?")) return;
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
    const r = await poster({ action: 'reset-donnees-test', password: motDePasse });
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
async function rechercherPasseportMateriel(){
  const numeroSerie = $('pm-numero-serie').value.trim();
  state.passeportRecherche = numeroSerie;
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
    return iso && new Date(iso).getFullYear() === anneeSelectionnee;
  });
  const facturesAnnee = state.factures.filter(f => {
    const iso = dateVersISO(f.date);
    return iso && new Date(iso).getFullYear() === anneeSelectionnee;
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

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${actives.length}</div>
        <div style="font-size:12.5px;opacity:0.6">commandes (hors annulées)</div>
      </div>
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${Object.keys(parStructureCmd).length}</div>
        <div style="font-size:12.5px;opacity:0.6">structures actives</div>
      </div>
      <div class="card elev-sm" style="padding:var(--space-6);gap:6px">
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
            <div style="width:100%;border-radius:6px 6px 0 0;background:var(--color-accent-2);height:${Math.max(2, Math.round(n / maxMois * 100))}%"></div>
            <span style="font-size:10.5px;opacity:0.5">${MOIS[i]}</span>
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
    </div>`;
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
    <div class="card elev-sm" style="padding:0;overflow:hidden">
      ${state.structures.map(s => {
        const type = typeStructure(s);
        const c = TYPE_COLORS[type];
        const revealed = !!state.revealedCodes[s.ligne];
        return `
        <div style="display:grid;grid-template-columns:38px 260px 1fr auto;align-items:center;gap:var(--space-4);padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-divider);min-width:0;cursor:pointer;min-height:70px" data-structure-modifier="${s.ligne}">
          <span style="width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:${c.bg};color:${c.fg}">${icon('building', 18)}</span>
          <div style="display:flex;align-items:center;gap:10px;min-width:0;min-height:38px">
            <span style="font-weight:700;font-size:14px;line-height:38px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(s.nom)}</span>
            <span class="tag tag-outline" style="flex:none">${echapper(type)}</span>
          </div>
          <div style="min-width:0;font-size:13px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(s.email || '')}</div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--color-neutral-100);padding:6px 10px;border-radius:var(--radius-md)">
            <span style="font-family:ui-monospace,monospace;font-size:13px">${revealed ? echapper(s.code) : '••••••••••'}</span>
            <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px;flex:none" data-reveal-code="${s.ligne}">${icon(revealed ? 'eyeoff' : 'eye', 15)}</button>
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
  if(statut === 'en_cours') return `<span style="display:inline-flex;align-items:center;gap:6px;background:${COULEUR_VERT_GARANTIE};color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('bouclier_garantie', 13)}Garantie en cours (jusqu'au ${echapper(dateFinGarantie)})</span>`;
  if(statut === 'bientot') return `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--color-warn-700);color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('bouclier_garantie', 13)}Garantie bientôt expirée (jusqu'au ${echapper(dateFinGarantie)})</span>`;
  if(statut === 'expiree') return `<span style="display:inline-flex;align-items:center;gap:6px;background:#E24B4A;color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('x', 13)}Hors garantie (${echapper(dateFinGarantie)})</span>`;
  return '';
}
function vueModal(){
  const m = state.modal;
  if(m.kind === 'creer-structure') return vueCreerStructure();
  if(m.kind === 'creer-commande') return vueCreerCommande();
  if(m.kind === 'creer-produit') return vueCreerProduit();
  if(m.kind === 'creer-devis') return vueCreerDevis();
  if(m.kind === 'creer-facture') return vueCreerFacture();
  if(m.kind === 'reglages-sav') return vueReglagesStatutsSav();
  if(m.kind === 'info-types-structure') return vueInfoTypesStructure();
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
            ? `<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-divider);font-size:12.5px;opacity:0.7">${icon('ban', 13)} Annulé — motif : ${echapper(doc.motifAnnulation || '—')}</div>`
            : `<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-divider)"><button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-annuler-${estDevis ? 'devis' : 'facture'}="${doc.ligne}" data-ref-${estDevis ? 'devis' : 'facture'}="${echapper(estDevis ? doc.referenceDevis : doc.referenceFacture)}">${icon('ban', 14)}Annuler ${estDevis ? 'ce devis' : 'cette facture'}</button></div>`}
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
    // Commande dématérialisée : "En cours de livraison" ne fait pas partie de son parcours
    // (aucune livraison physique) — retirée de la timeline affichée, pas seulement sautée au
    // moment de la transition de statut.
    const statutsAffiches = c.dematerialisee ? ORDER_STATUSES.filter(s => s !== 'En cours de livraison') : ORDER_STATUSES;
    const idx = statutsAffiches.indexOf(c.statutCommande);
    const nbArticles = (c.lignes || []).reduce((s, l) => s + parseInt(l.quantite, 10), 0);
    return `
      <div class="rp-drawer-backdrop">
        <div class="rp-drawer" role="dialog" aria-modal="true">
          <div class="rp-drawer-header">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
              <div>
                <div class="dialog-title" style="font-size:20px">${echapper(c.reference)}</div>
                <div style="font-weight:600;opacity:0.75;margin-top:2px">${(() => { const st = state.structures.find(x => x.code === c.code); return st ? `${echapper(typeStructure(st))} · ` : ''; })()}${echapper(c.nom)}</div>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px;flex:none" data-modal-fermer>${icon('x', 16)}</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
              ${(c.lignes || []).map(l => {
                const p = state.produits.find(x => x.nom === l.produit);
                return `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:999px">${icon(iconeProduit(l.produit, p ? p.icone : ''), 14)}${parseInt(l.quantite, 10)}× ${echapper(l.produit)}</span>`;
              }).join('') || `<span style="opacity:0.6;font-size:13px">Aucun article</span>`}
            </div>
          </div>
          <div class="rp-drawer-body">
            ${(() => {
              // Chaque catégorie sur sa propre ligne, avec une étiquette — plutôt qu'un simple
              // enchaînement de pilules sans repère, illisible dès qu'il y en a plus de deux.
              const groupes = [
                !c.dematerialisee && c.numerosSerie ? ['Numéro(s) de série', pilulesNumerosSerie(c.numerosSerie)] : null,
                c.dematerialisee && c.numerosSerie ? ['Code(s)', pilulesCodes(c.numerosSerie)] : null,
                c.colissimo ? ['Suivi colis', pilulesColis(c.colissimo)] : null,
                (c.lienPaiement || '').trim() ? ['Paiement', pilulesPaiement(c.lienPaiement, c.paiementSepare ? nomsPersonnesCommande(c) : 'Lien de paiement', 'Lien de paiement')] : null,
                // 'ASAP' est déjà signalé ailleurs (éclair "urgente") — ne reste à afficher ici
                // que la vraie date souhaitée choisie par une structure Interne, sinon invisible
                // nulle part dans l'admin une fois la commande passée.
                (c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee !== 'ASAP') ? ['Date de livraison souhaitée', `<span class="tag tag-neutral" style="font-size:12.5px">${echapper(c.dateLivraisonSouhaitee)}</span>`] : null,
              ].filter(Boolean);
              if(!groupes.length) return '';
              return `<div class="card elev-sm" style="padding:var(--space-3);gap:10px;background:var(--color-neutral-100)">
                ${groupes.map(([libelle, html]) => `
                  <div>
                    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;opacity:0.5;margin-bottom:5px">${echapper(libelle)}</div>
                    ${html}
                  </div>`).join('')}
              </div>`;
            })()}
          ${(c.commentaire && !c.commentaire.startsWith('##LOGISTIQUE_QUANTITES##')) ? `
          <div class="card elev-sm" style="padding:var(--space-4);gap:6px;background:var(--color-warn-100)">
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;color:var(--color-warn-800)">${icon('alert', 13)}Commentaire</div>
            <div style="font-size:13px;white-space:pre-line">${echapper(c.commentaire)}</div>
          </div>` : ''}
          ${c.statutCommande === 'Annulée' ? `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-accent-100);color:var(--color-accent-700);font-weight:600">Commande annulée.</div>` : ''}
          <div style="display:flex;flex-direction:column;gap:10px">
            ${statutsAffiches.map((s, i) => {
              const estLivree = c.statutCommande === 'Livrée';
              const done = estLivree ? i <= idx : i < idx;
              const current = i === idx && !estLivree;
              const aVenir = i > idx;
              const ouverte = current ? state.etapeCommandeOuverte !== ('replier:' + s) : state.etapeCommandeOuverte === s;
              const dotBg = done ? 'var(--color-accent-2)' : current ? 'var(--color-accent)' : 'var(--color-neutral-200)';
              const dotFg = (!done && !current) ? 'var(--color-neutral-500)' : '#ffffff';
              return `
              <div class="card ${current ? 'elev-md' : 'elev-sm'}" style="padding:var(--space-4);gap:12px;opacity:${aVenir ? '0.55' : '1'};${current ? `border:1.5px solid ${dotBg}` : ''}">
                <div style="display:flex;align-items:center;gap:12px;${(done || current) ? 'cursor:pointer' : ''}" ${done ? `data-toggle-etape-passee="${echapper(s)}"` : current ? `data-toggle-etape-courante="${echapper(s)}"` : ''}>
                  <span style="width:32px;height:32px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${dotBg};color:${dotFg}">${done ? icon('check', 16) : icon(ORDER_META[s].ic, 16)}</span>
                  <span style="font-weight:700;font-size:15px;flex:1">${echapper(s)}</span>
                  <span class="tag ${done ? 'tag-accent-2' : current ? 'tag-accent' : 'tag-neutral'}">${done ? 'Terminée' : current ? 'En cours' : 'À venir'}</span>
                  ${(done || current) ? `<span style="opacity:0.5;display:flex;transition:transform .15s;transform:rotate(${ouverte ? '180deg' : '0deg'})">${icon('chevron', 15)}</span>` : ''}
                </div>
                ${(current && ouverte) ? `<div>${panneauEtapeSuivanteCommande(c)}</div>` : ''}
                ${(done && ouverte) ? `<div style="border-top:1px solid var(--color-divider);padding-top:12px">${panneauEtapePasseeCommande(c, s)}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          ${panneauDevisPaiementCommande(c)}
          <div id="rp-retour-modale"></div>
          </div>
          ${(!['Livrée', 'Annulée'].includes(c.statutCommande)) ? `<div class="rp-drawer-footer"><button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-annuler-commande="${echapper(c.reference)}">Annuler la commande</button></div>` : ''}
        </div>
      </div>`;
  }
  if(m.kind === 'sav'){
    const s = state.sav.find(x => x.reference === m.ref);
    if(!s) return '';
    const defs = state.statutsSav.length ? state.statutsSav : [{ statut: s.statut, terminal: false }];
    const nonTerminaux = defs.filter(d => !d.terminal);
    const terminaux = defs.filter(d => d.terminal);
    const idx = Math.max(0, nonTerminaux.findIndex(d => d.statut === s.statut));
    const estSurTerminal = terminaux.some(d => d.statut === s.statut);
    const structureSav = state.structures.find(x => x.code === s.code);
    return `
      <div class="rp-drawer-backdrop">
        <div class="rp-drawer" role="dialog" aria-modal="true">
          <div class="rp-drawer-header">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
              <div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                  <div class="dialog-title" style="font-size:20px">${echapper(s.reference)}</div>
                  ${s.numeroSerie ? badgeGarantie(s.dateAchat) : ''}
                </div>
                <div style="font-weight:600;opacity:0.75;margin-top:2px">${structureSav ? `${echapper(typeStructure(structureSav))} · ` : ''}${echapper(s.structureNom || '')}</div>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px;flex:none" data-modal-fermer>${icon('x', 16)}</button>
            </div>
            <div style="opacity:0.7;margin-top:10px">${echapper(s.marque || '')} ${echapper(s.modele || '')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
              ${pilulesNumerosSerie(s.numeroSerie)}
              ${piluleContact(s.nom, s.telephone, s.email)}
            </div>
          </div>
          <div class="rp-drawer-body">
          ${s.numeroSerie ? blocOrigineTecTech(s) : ''}
          ${estSurTerminal ? `<div class="tag tag-accent-2" style="width:fit-content">Dossier clos — ${echapper(s.statut)}</div>` : ''}
          ${(() => {
            const autresTickets = s.numeroSerie ? state.sav.filter(x => x.numeroSerie === s.numeroSerie && x.reference !== s.reference) : [];
            if(!autresTickets.length) return '';
            return `
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;font-weight:700;margin-bottom:var(--space-3)">Historique de l'appareil (${autresTickets.length} autre${autresTickets.length > 1 ? 's' : ''} passage${autresTickets.length > 1 ? 's' : ''})</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${autresTickets.map(t => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-md);background:var(--color-neutral-100);cursor:pointer" data-sav-ouvrir="${echapper(t.reference)}">
                  <span style="font-size:12.5px;font-weight:700">${echapper(t.reference)}</span>
                  <span style="font-size:12px;opacity:0.6;flex:1">${echapper(t.date)} · ${echapper(t.symptome || '')}</span>
                  <span class="tag tag-neutral">${echapper(t.statut)}</span>
                </div>`).join('')}
            </div>
          </div>`;
          })()}
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;font-weight:700;margin-bottom:var(--space-3)">Progression du dossier</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${nonTerminaux.map((d, i) => {
                const done = i < idx || estSurTerminal, current = i === idx && !estSurTerminal, locked = estSurTerminal || i > idx + 1;
                const dotBg = done ? 'var(--color-accent-2)' : current ? 'var(--color-accent-2)' : 'var(--color-neutral-200)';
                const dotFg = (!done && !current) ? 'var(--color-neutral-500)' : '#ffffff';
                // Chaque étape dans sa propre carte, distincte des autres (bordure + fond selon
                // l'état) — avant, les étapes n'étaient reliées que par un simple trait vertical,
                // sans vraie séparation visuelle entre "faite", "en cours" et "à venir".
                return `
                <div data-changer-statut-sav="${echapper(d.statut)}" data-ref="${echapper(s.reference)}" ${locked ? 'data-verrou="1"' : ''} style="display:flex;align-items:center;gap:var(--space-3);padding:10px 14px;border-radius:var(--radius-md);cursor:${locked ? 'default' : 'pointer'};background:${current ? 'var(--color-accent-2-100)' : done ? 'var(--color-neutral-100)' : 'transparent'};border:1.5px solid ${current ? 'var(--color-accent-2)' : 'var(--color-divider)'};opacity:${locked && !done ? '0.5' : '1'}">
                  <span style="width:30px;height:30px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${dotBg};color:${dotFg}">${done ? icon('check', 15) : icon(iconeStatutSav(d.statut, d.icone), 15)}</span>
                  <span style="font-size:14px;font-weight:${current ? 700 : 600};flex:1">${echapper(d.statut)}</span>
                  ${current ? `<span class="tag tag-accent-2">En cours</span>` : done ? `<span style="font-size:11px;opacity:0.5">Fait</span>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>
          ${terminaux.length ? `
          <div>
            <button type="button" data-toggle-accordeon-terminal style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer;border-top:1px solid var(--color-divider);padding-top:var(--space-4)">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;font-weight:700;flex:1;text-align:left">Clôturer le dossier</span>
              <span style="display:flex;transition:transform .15s;transform:rotate(${state.accordeonTerminalOuvert ? '180deg' : '0deg'})">${icon('chevron', 14)}</span>
            </button>
            ${state.accordeonTerminalOuvert ? `
            <div class="card elev-sm" style="padding:var(--space-3) var(--space-4);margin:var(--space-3) 0;background:var(--color-accent-100);color:var(--color-accent-700);display:flex;align-items:center;gap:10px">
              <span style="flex:none;display:flex">${icon('alert', 18)}</span>
              <span style="font-size:12.5px;font-weight:600">Fin de cycle : ces statuts ferment définitivement le ticket, aucun retour en arrière possible.</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${terminaux.map(d => `
                <button type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;width:100%;padding:14px;border-radius:var(--radius-md);font-family:var(--font-heading);font-weight:700;font-size:14.5px;text-align:center;${d.statut === s.statut ? 'background:var(--color-accent-700);color:#fff' : 'background:var(--color-accent);color:#fff'}" data-changer-statut-sav-terminal="${echapper(d.statut)}" data-ref="${echapper(s.reference)}">
                  ${icon('alert', 15)}${echapper(d.statut)}${d.statut === s.statut ? ' · statut actuel' : ''}
                </button>`).join('')}
            </div>` : ''}
          </div>` : ''}
          </div>
          ${!estSurTerminal ? `<div class="rp-drawer-footer"><button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-annuler-sav="${echapper(s.reference)}">Annuler ce SAV</button></div>` : ''}
        </div>
      </div>`;
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
  return !!(structure && (structure.interne || structure.esn || structure.bo));
}
function panneauDevisPaiementCommande(c){
  const structure = state.structures.find(s => s.code === c.code);
  // BO n'a pas de devis, mais PEUT payer par carte (lien de paiement à coller ici) — contrairement
  // à Interne/ESN qui n'ont ni devis ni paiement du tout (voir estSansPaiement côté formulaire de
  // commande). BO retiré de cette exemption : sans ça, ce panneau restait introuvable dès qu'une
  // commande BO choisissait "Paiement en ligne (CB)", empêchant de coller le moindre lien.
  const exempte = !!(structure && (structure.interne || structure.esn));
  if(exempte) return '';

  const devisEligible = c.devisDemande === 'Oui';
  // BO n'a ni devis ni facture (seul le lien de paiement CB le concerne ici, voir plus haut) —
  // section facture entièrement masquée pour cette structure, comme le refuse déjà le back
  // (commande-facturer-direct).
  const factureEligible = !structureExclueDevisFacture(c);
  const paiementCB = c.moyenPaiement === 'Paiement en ligne (CB)';
  const paiementEnAttente = c.dernierClicLienPaiement && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé';
  const ouverte = state.etapeCommandeOuverte === 'devis-paiement';

  return `
    <div class="card elev-sm" style="padding:var(--space-4);gap:12px;border:1.5px solid #C9A227">
      <div style="display:flex;align-items:center;gap:12px;cursor:pointer" data-toggle-devis-paiement>
        <span style="width:32px;height:32px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:#F6ECC9;color:#8A6D1B">${icon('receipt', 16)}</span>
        <span style="font-weight:700;font-size:15px;flex:1">Liens de paiement</span>
        <span style="opacity:0.5;display:flex;transition:transform .15s;transform:rotate(${ouverte ? '180deg' : '0deg'})">${icon('chevron', 15)}</span>
      </div>
      ${ouverte ? `
      <div style="display:flex;flex-direction:column;gap:12px">
      ${devisEligible ? `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:26px;height:26px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${c.referenceDevis ? 'var(--color-accent-2-100)' : 'var(--color-neutral-200)'};color:${c.referenceDevis ? 'var(--color-accent-2-700)' : 'var(--color-neutral-500)'}">${icon('file', 13)}</span>
        <div style="flex:1;font-size:13px">${c.referenceDevis ? `<span style="cursor:pointer;text-decoration:underline" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceDevis)}">Devis ${echapper(c.referenceDevis)}</span>` : 'Devis pas encore généré'}</div>
        ${c.referenceDevis ? '' : '<span class="tag tag-neutral" style="font-size:11px">à générer à l\'étape « Validée »</span>'}
      </div>` : ''}

      ${factureEligible ? `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:26px;height:26px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${c.referenceFacture ? 'var(--color-accent-2-100)' : 'var(--color-neutral-200)'};color:${c.referenceFacture ? 'var(--color-accent-2-700)' : 'var(--color-neutral-500)'}">${icon('receipt', 13)}</span>
        <div style="flex:1;font-size:13px">${c.referenceFacture ? `<span style="cursor:pointer;text-decoration:underline" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Facture ${echapper(c.referenceFacture)}</span> — ${echapper(c.statutPaiement || 'statut inconnu')}` : 'Facture pas encore générée'}</div>
      </div>
      ${!c.referenceFacture ? `
      <div style="display:flex;gap:8px">
        <input class="input" id="pn-numero-facture" placeholder="Numéro de facture (FAC-...)" style="flex:1">
        <button type="button" class="btn btn-secondary" data-generer-facture-livree="${echapper(c.reference)}">Générer</button>
      </div>
      <div id="pn-erreur-facture"></div>` : ''}` : ''}

      ${paiementEnAttente ? `<div class="tag tag-accent" style="width:fit-content">${icon('alert', 12)} Lien de paiement cliqué, pas encore réglé</div>` : ''}

      ${paiementCB ? `
      <div style="border-top:1px solid var(--color-divider);padding-top:12px">
        ${(c.lienPaiement || '').trim() ? `
        <div class="field">
          <label>Lien(s) de paiement actuellement envoyé(s)</label>
          ${pilulesPaiement(c.lienPaiement, c.paiementSepare ? nomsPersonnesCommande(c) : 'Lien de paiement', 'Lien de paiement')}
        </div>` : ''}
        ${(() => {
          const noms = nomsPersonnesCommande(c);
          // Un lien par bénéficiaire (paiement séparé choisi à la commande, ≥2 personnes) : un
          // champ par nom plutôt qu'une zone de texte unique — sans repère, rien n'indiquait
          // quel lien collé sur quelle ligne revenait à quel bénéficiaire.
          if(c.paiementSepare && noms.length > 1){
            const liensActuels = String(c.lienPaiement || '').split('\n');
            return `
            <div class="field">
              <label>Un lien de paiement par personne accompagnée</label>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${noms.map((nom, i) => `
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="flex:0 0 130px;font-size:12.5px;font-weight:600;opacity:0.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${echapper(nom)}">${echapper(nom || `Personne accompagnée ${i + 1}`)}</span>
                  <input class="input" data-lien-paiement-personne="${i}" placeholder="https://..." value="${echapper(liensActuels[i] || '')}" style="flex:1">
                </div>`).join('')}
              </div>
              <button type="button" class="btn btn-secondary btn-block" style="margin-top:8px" data-enregistrer-liens-paiement-personnes="${echapper(c.reference)}">Enregistrer</button>
              <div id="pn-erreur-lien-paiement"></div>
            </div>`;
          }
          return `
          <div class="field">
            <label>Lien de paiement en ligne (visible dans le suivi de la structure)</label>
            <textarea class="input" rows="2" id="pn-lien-paiement" placeholder="https://...">${echapper(c.lienPaiement || '')}</textarea>
            <button type="button" class="btn btn-secondary btn-block" data-enregistrer-lien-paiement="${echapper(c.reference)}">Enregistrer</button>
            <div id="pn-erreur-lien-paiement"></div>
          </div>`;
        })()}
      </div>` : ''}
      </div>` : ''}
    </div>`;
}
const MODES_LIVRAISON = [
  { valeur: 'Colissimo', label: 'Colissimo', ic: 'truck' },
  { valeur: 'Livraison EC', label: 'Livraison Emmaüs Connect', ic: 'package' },
  { valeur: 'Retrait', label: 'Retrait', ic: 'building' }
];
function panneauEtapeSuivanteCommande(c){
  const structure = state.structures.find(s => s.code === c.code);
  const exempte = !!(structure && (structure.interne || structure.bo || structure.esn)); // Interne/BO/ESN : ni devis ni facture requis
  // Même valeur que celle utilisée par le back pour valider le passage à "Préparée"
  // (quantiteAvecNumeroSerie, déjà calculée serveur — exclut les produits sansNumeroSerie).
  // Recalculer ce total côté client par correspondance de nom de produit pouvait diverger en
  // silence (casse, accents, produit renommé) et bloquer la confirmation à tort.
  const quantiteAttendue = typeof c.quantiteAvecNumeroSerie === 'number'
    ? c.quantiteAvecNumeroSerie
    : (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);

  if(c.statutCommande === 'Reçue'){
    const parProduit = {};
    (c.lignes || []).forEach(l => { parProduit[l.produit] = (parProduit[l.produit] || 0) + parseInt(l.quantite, 10); });
    return `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">
          ${Object.keys(parProduit).map(nom => `
            <div class="card elev-sm" style="padding:var(--space-3);gap:6px;min-width:0;align-items:center;text-align:center">
              <span style="width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon(iconeProduit(nom, (state.produits.find(p => p.nom === nom) || {}).icone), 16)}</span>
              <div style="font-family:var(--font-heading);font-size:22px;line-height:1">${parProduit[nom]}</div>
              <div style="font-size:11.5px;opacity:0.65">${echapper(nom)}</div>
            </div>`).join('')}
        </div>
        ${c.validationLogistiqueEnAttente
          ? `<div style="font-size:13px;opacity:0.7">En attente de validation logistique.</div>
             <button type="button" class="btn btn-secondary btn-block" data-renvoyer-validation="${echapper(c.reference)}">Renvoyer le mail de validation</button>`
          : `<button type="button" class="btn btn-primary btn-block" data-demander-validation="${echapper(c.reference)}">Envoyer pour validation logistique</button>`}
      </div>`;
  }

  if(c.statutCommande === 'Validée'){
    const note = extraireNoteLogistique(c.commentaire);
    const devisEligible = !exempte && c.devisDemande === 'Oui'; // devis possible seulement pour RNum / Projets
    const devisOk = !devisEligible || c.referenceDevis;
    const nbSeries = (c.numerosSerie || '').split('\n').map(s => s.trim()).filter(Boolean).length;
    const serieOk = nbSeries === quantiteAttendue;
    const conf = state.confirmSubEtapes[c.ligne] || {};
    // Le back exige les numéros de série complets AVANT d'accepter le passage à "Préparée" —
    // donc à saisir ici, pendant qu'on est encore sur "Validée", pas après.
    const serieConfirmee = serieOk && conf.series;
    // Produit(s) dématérialisé(s) (recharge internet...) : même mécanique de saisie, mais ce
    // n'est pas un numéro de série d'appareil réel — le libellé change partout dans ce bloc, et
    // l'import CSV tec.tech (pensé pour des numéros de série physiques) n'a pas de sens ici.
    const motSerie = c.dematerialisee ? 'code' : 'numéro de série';
    const motSeriePluriel = c.dematerialisee ? 'codes' : 'numéros de série';
    const libelleSerie = c.dematerialisee ? 'Codes' : 'Numéros de série';

    return `
      <div style="display:flex;flex-direction:column;gap:14px">
        ${(note && note.changements.length) ? `
        <div class="card elev-sm" style="padding:var(--space-4);gap:8px;background:var(--color-warn-100)">
          <div style="font-weight:700;font-size:13px">La logistique a ajusté les quantités</div>
          ${note.changements.map(ch => `
            <div style="display:flex;justify-content:space-between;font-size:13px;gap:10px">
              <span>${echapper(ch.produit)}</span>
              <span><span style="text-decoration:line-through;opacity:0.5">${echapper(ch.ancienne)}</span> → <strong>${echapper(ch.nouvelle)}</strong></span>
            </div>`).join('')}
          ${note.message ? `<div style="font-size:12.5px;font-style:italic;opacity:0.75">« ${echapper(note.message)} »</div>` : ''}
        </div>` : ''}

        <div class="card elev-sm" style="padding:var(--space-4);gap:10px;background:${serieConfirmee ? 'var(--color-accent-2-100)' : 'var(--color-neutral-100)'}">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:24px;height:24px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${serieConfirmee ? 'var(--color-accent-2)' : 'var(--color-neutral-300)'};color:#fff">${serieConfirmee ? icon('check', 13) : '1'}</span>
            <span style="font-weight:700;font-size:13.5px">${libelleSerie}</span>
          </div>
          ${quantiteAttendue === 0 ? `<div style="font-size:13px;opacity:0.7">Aucun ${motSerie} requis pour cette commande.</div>` : serieConfirmee ? `
            <div style="font-size:13px;opacity:0.75">${nbSeries}/${quantiteAttendue} ${quantiteAttendue > 1 ? motSeriePluriel : motSerie} confirmé${quantiteAttendue > 1 ? 's' : ''}.</div>
            <button type="button" class="btn btn-ghost" style="width:fit-content;padding:0" data-modifier-series="${echapper(c.reference)}">Modifier</button>
          ` : (() => {
            const unitesAssoc = unitesSeriePersonnes(c);
            const melange = unitesAssoc.some(u => u.dematerialise) && unitesAssoc.some(u => !u.dematerialise);
            const avecNoms = !!(structure && structure.bo);
            // Repère qui associer à quelle ligne AVANT de saisir, dès qu'il y a plus d'une ligne
            // attendue — sans ça, plusieurs produits mélangés (numéros de série ET codes, comme
            // des ordinateurs avec des recharges) n'ont aucun repère commun : rien n'indique quelle
            // ligne du champ ci-dessous attend un numéro de série et laquelle attend un code, ni
            // (pour BO) à quel bénéficiaire chacune revient.
            const legende = (quantiteAttendue > 1 && (avecNoms || melange)) ? `
            <div style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;background:var(--color-neutral-100);border-radius:var(--radius-md);font-size:12.5px">
              <div style="font-weight:700;opacity:0.7">Ordre attendu (une ligne du champ ci-dessous par repère) :</div>
              ${unitesAssoc.map((u, i) => `<div>${i + 1}. ${echapper(u.produit)} — <span style="opacity:0.7">${u.dematerialise ? 'code' : 'numéro de série'} attendu</span>${u.nom ? ` — <strong>${echapper(u.nom)}</strong>` : (avecNoms ? ' <span style="opacity:0.55">(pas de personne accompagnée nommée)</span>' : '')}</div>`).join('')}
            </div>` : '';
            return `
            ${legende}
            <textarea class="input" rows="${Math.max(2, quantiteAttendue)}" id="pn-series" data-quantite-attendue="${quantiteAttendue}" placeholder="${melange ? 'Un numéro ou code par ligne, dans l\'ordre ci-dessus' : c.dematerialisee ? 'Un code par ligne (ex : code de recharge)' : 'Un numéro par ligne'}">${echapper(c.numerosSerie || '')}</textarea>
            <div id="pn-series-compteur" style="font-size:11.5px;opacity:0.6">${nbSeries}/${quantiteAttendue} saisi${nbSeries > 1 ? 's' : ''}</div>
            ${c.dematerialisee ? '' : `
            <div style="display:flex;gap:8px">
              <label class="btn btn-secondary" style="flex:1;cursor:pointer;text-align:center">Importer un CSV tec.tech<input type="file" accept=".csv,text/csv" id="pn-series-csv" style="display:none"></label>
            </div>`}
            <button type="button" class="btn btn-primary btn-block" data-confirmer-series="${echapper(c.reference)}">Confirmer le${quantiteAttendue > 1 ? 's' : ''} ${quantiteAttendue > 1 ? motSeriePluriel : motSerie} (${quantiteAttendue} attendu${quantiteAttendue > 1 ? 's' : ''})</button>
            <div id="pn-erreur-series"></div>
            `;
          })()}
        </div>

        ${devisEligible ? `
        <div>
          ${c.referenceDevis
            ? `<div style="font-size:13px;color:var(--color-accent-2-700)">${icon('check', 14)} Devis ${echapper(c.referenceDevis)} généré</div>`
            : `<div style="font-size:12.5px;opacity:0.7;margin-bottom:8px">Devis demandé par la structure (RNum/Projets) — génère-le si besoin avant de continuer.</div>
               <button type="button" class="btn btn-secondary btn-block" data-generer-devis="${echapper(c.reference)}">Générer un devis</button>`}
        </div>` : ''}
        <button type="button" class="btn btn-primary btn-block" data-changer-statut="Préparée" data-ref="${echapper(c.reference)}" ${(devisOk && (serieConfirmee || quantiteAttendue === 0)) ? '' : 'disabled'}>Commande bien validée — passer en préparation</button>
      </div>`;
  }

  if(c.statutCommande === 'Préparée'){
    if(c.dematerialisee){
      return `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="card elev-sm" style="padding:var(--space-4);gap:8px;background:var(--color-accent-2-100);color:var(--color-accent-2-700)">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px">${icon('check', 15)}Produit(s) dématérialisé(s)</div>
            <div style="font-size:13px">Pas de livraison physique — cette commande passe directement à "Livrée", sans étape "En cours de livraison".</div>
          </div>
          <div class="field">
            <label>Date de livraison</label>
            <input type="date" class="input" id="pn-date-livraison-directe" value="${dateVersISO(c.dateLivraison) || new Date().toISOString().slice(0, 10)}">
          </div>
          <button type="button" class="btn btn-primary btn-block" data-marquer-livree="${echapper(c.reference)}">Marquer livrée</button>
        </div>`;
    }
    const modeChoisi = !!c.modeLivraison;
    const colissimoRequis = c.modeLivraison === 'Colissimo';
    const colissimoConfirme = !colissimoRequis || (state.confirmSubEtapes[c.ligne] || {}).colissimo || (c.colissimo || '').trim().length > 0;

    return `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card elev-sm" style="padding:var(--space-4);gap:10px;background:${modeChoisi ? 'var(--color-accent-2-100)' : 'var(--color-neutral-100)'}">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:24px;height:24px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${modeChoisi ? 'var(--color-accent-2)' : 'var(--color-neutral-300)'};color:#fff">${modeChoisi ? icon('check', 13) : '1'}</span>
            <span style="font-weight:700;font-size:13.5px">Mode de livraison</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
            ${MODES_LIVRAISON.map(mode => {
              const choisi = c.modeLivraison === mode.valeur;
              return `
              <button type="button" style="all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;padding:16px 10px;border-radius:var(--radius-md);text-align:center;background:${choisi ? 'var(--color-accent)' : 'var(--color-surface)'};color:${choisi ? '#fff' : 'var(--color-text)'};border:1.5px solid ${choisi ? 'var(--color-accent)' : 'var(--color-divider)'}" data-choisir-mode-livraison="${echapper(mode.valeur)}" data-ref="${echapper(c.reference)}">
                ${icon(mode.ic, 22)}
                <span style="font-weight:700;font-size:13px">${echapper(mode.label)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        ${(modeChoisi && colissimoRequis) ? `
        <div class="card elev-sm" style="padding:var(--space-4);gap:10px;background:${colissimoConfirme ? 'var(--color-accent-2-100)' : 'var(--color-neutral-100)'}">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:24px;height:24px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${colissimoConfirme ? 'var(--color-accent-2)' : 'var(--color-neutral-300)'};color:#fff">${colissimoConfirme ? icon('check', 13) : '2'}</span>
            <span style="font-weight:700;font-size:13.5px">Lien(s) de suivi Colissimo</span>
          </div>
          ${colissimoConfirme ? `
            ${pilulesColis(c.colissimo)}
            <button type="button" class="btn btn-ghost" style="width:fit-content;padding:0" data-modifier-colissimo="${echapper(c.reference)}">Modifier</button>
          ` : `
            <textarea class="input" rows="2" id="pn-colissimo" placeholder="Un lien par colis (http:// ou https://)">${echapper(c.colissimo || '')}</textarea>
            <button type="button" class="btn btn-primary btn-block" data-confirmer-colissimo="${echapper(c.reference)}">Confirmer le(s) lien(s)</button>
            <div id="pn-erreur-colissimo"></div>
          `}
        </div>` : ''}

        ${modeChoisi ? `
        <div class="field">
          <label>${c.modeLivraison === 'Retrait' ? 'Retrait disponible à partir du' : 'Date estimée de livraison'} <em style="font-weight:400">(facultatif${c.modeLivraison === 'Colissimo' ? ' — en plus du suivi Colissimo' : ''})</em></label>
          <input type="date" class="input" id="pn-date-cible" value="${dateVersISO(c.dateLivraisonCible)}">
          <button type="button" class="btn btn-secondary btn-block" data-enregistrer-date-cible="${echapper(c.reference)}">Enregistrer</button>
        </div>` : ''}

        ${(modeChoisi && colissimoConfirme) ? `
        <div>
          <button type="button" class="btn btn-primary btn-block" data-valider-preparation="${echapper(c.reference)}">Marquer en livraison</button>
        </div>` : ''}
      </div>`;
  }

  if(c.statutCommande === 'En cours de livraison'){
    return `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="font-size:13px;opacity:0.7">Le matériel est en transit.</div>
        ${c.modeLivraison === 'Colissimo' && c.colissimo ? pilulesColis(c.colissimo) : ''}
        <div class="field">
          <label>Date de livraison</label>
          <input type="date" class="input" id="pn-date-livraison-directe" value="${dateVersISO(c.dateLivraison) || new Date().toISOString().slice(0, 10)}">
        </div>
        <button type="button" class="btn btn-primary btn-block" data-marquer-livree="${echapper(c.reference)}">Marquer livrée</button>
      </div>`;
  }

  if(c.statutCommande === 'Livrée'){
    return `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="field">
          <label>Date de livraison finale</label>
          <input type="date" class="input" id="pn-date-livraison" value="${dateVersISO(c.dateLivraison)}">
          <button type="button" class="btn btn-secondary btn-block" data-enregistrer-date-livraison="${echapper(c.reference)}">Confirmer la date</button>
        </div>
        <div style="font-size:13px;color:var(--color-accent-2-700)">${icon('check', 14)} Commande livrée.</div>
      </div>`;
  }
  return '';
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
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${MODES_LIVRAISON.map(mode => `
            <button type="button" class="tag ${c.modeLivraison === mode.valeur ? 'tag-accent' : 'tag-outline'}" style="border:${c.modeLivraison === mode.valeur ? 'none' : ''};cursor:pointer" data-choisir-mode-livraison="${echapper(mode.valeur)}" data-ref="${echapper(c.reference)}">${echapper(mode.label)}</button>`).join('')}
        </div>
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
    const numero = prompt('Numéro de facture :');
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
  if(!confirm(`Annuler la commande ${c.reference} ?`)) return;
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
  if(!confirm(`Supprimer le statut « ${nom} » ?`)) return;
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
  if(!confirm('Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.')) return;
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
  if(!confirm('Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.')) return;
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
  if(!confirm('Retirer le modèle PDF téléversé ?')) return;
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
  if(!confirm('Retirer le modèle .xlsx téléversé ?')) return;
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
  if(!confirm('Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.')) return;
  const r = await posterEtat({ action: 'modele-attestation-supprimer' }, 'Suppression…', 'Modèle retiré');
  if(r.ok) await chargerInfoModeleAttestation();
}

/* ============================================================
   Modales de création — Structure / Commande / Produit
   ============================================================ */
function dialogShell(titre, corps, idFormulaire, boutonGauche){
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(titre)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        ${corps}
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${boutonGauche ? 'space-between' : 'flex-end'}">
          ${boutonGauche || ''}
          <button type="button" class="btn btn-primary" id="${idFormulaire}">Enregistrer</button>
        </div>
      </div>
    </div>`;
}
function champ(label, html){
  return `<div class="field" style="margin-top:var(--space-2)"><label>${echapper(label)}</label>${html}</div>`;
}

const CATEGORIES_STRUCTURE = ['Collège/Université', 'École', 'Collectivité', 'Entreprise privée', 'Association', 'Structure sociale'];
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
function vueCreerStructure(){
  const ligne = state.modal.ligne;
  const s = ligne ? state.structures.find(x => x.ligne === ligne) : null;
  const type = s ? typeStructure(s).toLowerCase() : 'rn';
  const { prenom: responsablePrenom, nom: responsableNom } = separerResponsable(s ? s.responsable : '');
  const { prenom: responsableFacturationPrenom, nom: responsableFacturationNom } = separerResponsable(s ? s.responsableFacturation : '');
  return dialogShell(s ? `Modifier ${s.nom}` : 'Nouvelle structure', `
    ${champ('Code d\'accès *', ligne
      ? `<div style="display:flex;gap:8px"><input class="input" value="${echapper(s.code)}" disabled style="flex:1"><button type="button" class="btn btn-secondary" data-regenerer-code-structure="${s.ligne}">Régénérer</button></div>`
      : `<div style="display:flex;gap:8px"><input class="input" id="cs-code" style="flex:1"><button type="button" class="btn btn-secondary" data-generer-code-structure>Générer</button></div>`)}
    ${champ('Nom *', `<input class="input" id="cs-nom" value="${s ? echapper(s.nom) : ''}">`)}
    ${champ('Email', `<input class="input" id="cs-email" type="email" value="${s ? echapper(s.email || '') : ''}">`)}
    ${champ('Téléphone', `<input class="input" id="cs-tel" value="${s ? echapper(s.telephone || '') : ''}">`)}
    ${champ('Adresse', `<textarea class="input" id="cs-adresse" rows="2">${s ? echapper(s.adresse || '') : ''}</textarea>`)}
    <div class="field" style="margin-top:var(--space-2)">
      <label>Responsable habituel *</label>
      <div style="display:flex;gap:8px">
        <input class="input" id="cs-responsable-prenom" placeholder="Prénom" style="flex:1" value="${echapper(responsablePrenom)}">
        <input class="input" id="cs-responsable-nom" placeholder="NOM" style="flex:1" value="${echapper(responsableNom)}">
      </div>
    </div>
    <div class="field" style="margin-top:var(--space-2)">
      <label>Responsable facturation <em style="font-weight:400">(si différent du responsable habituel)</em></label>
      <div style="display:flex;gap:8px">
        <input class="input" id="cs-responsable-facturation-prenom" placeholder="Prénom" style="flex:1" value="${echapper(responsableFacturationPrenom)}">
        <input class="input" id="cs-responsable-facturation-nom" placeholder="NOM" style="flex:1" value="${echapper(responsableFacturationNom)}">
      </div>
    </div>
    ${champ('Email de facturation', `<input class="input" id="cs-email-facturation" type="email" value="${s ? echapper(s.emailFacturation || '') : ''}">`)}
    ${champ('Catégorie', `<select class="input" id="cs-categorie">
      <option value="">—</option>
      ${CATEGORIES_STRUCTURE.map(c => `<option value="${echapper(c)}" ${s && s.categorie === c ? 'selected' : ''}>${echapper(c)}</option>`).join('')}
    </select>`)}
    ${champ('Groupe(s) de commande', selecteurGroupesCommande('cs-groupes', s ? s.groupesCommande : ''))}
    ${champ('Type de public visé <em style="font-weight:400">(facultatif — surtout pour BO)</em>', `<input class="input" id="cs-type-public" value="${s ? echapper(s.typePublic || '') : ''}" placeholder="Ex : Étudiants, Familles, Seniors…">`)}
    <div class="field" style="margin-top:var(--space-2)">
      <label>Moyens de paiement autorisés <em style="font-weight:400">(aucune case cochée = tous)</em></label>
      <div style="display:flex;flex-direction:column;gap:6px">${selecteurMoyensPaiement('cs-paiement', s ? s.moyensPaiement : '')}</div>
    </div>
    <div class="field" style="margin-top:var(--space-2)">
      <label style="display:flex;align-items:center;gap:6px">Type
        <button type="button" class="btn btn-ghost btn-icon" style="width:20px;height:20px;flex:none" data-info-types-structure title="Qu'est-ce que ces types signifient ?">${icon('info', 13)}</button>
      </label>
      <select class="input" id="cs-type">
        <option value="rn" ${type === 'rn' ? 'selected' : ''}>RNum</option>
        <option value="interne" ${type === 'interne' ? 'selected' : ''}>Interne</option>
        <option value="esn" ${type === 'esn' ? 'selected' : ''}>ESN</option>
        <option value="bo" ${type === 'bo' ? 'selected' : ''}>BO</option>
        <option value="projets" ${type === 'projets' ? 'selected' : ''}>Projets</option>
      </select>
    </div>
  `, 'cs-enregistrer', s ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-structure="${s.ligne}" data-nom-structure="${echapper(s.nom)}">Supprimer</button>` : null);
}
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
  const ligne = state.modal.ligne;
  // "code" n'est modifiable qu'à la création : structure-update n'accepte pas ce champ (pas de
  // colonne dédiée à sa mise à jour côté back) — l'envoyer dans le lot d'édition faisait
  // échouer tout l'enregistrement (une réponse ok:false suffit à annuler le groupe).
  const champsCommuns = {
    nom: $('cs-nom').value.trim(),
    email: $('cs-email').value.trim(), telephone: $('cs-tel').value.trim(),
    adresse: $('cs-adresse').value.trim(), categorie: $('cs-categorie').value,
    // Reconcaténé depuis les deux champs Prénom/NOM du formulaire — la colonne back reste un
    // seul champ texte ("Prénom NOM"), rien à changer côté API pour ce changement.
    responsable: [$('cs-responsable-prenom').value.trim(), $('cs-responsable-nom').value.trim()].filter(Boolean).join(' '),
    responsableFacturation: [$('cs-responsable-facturation-prenom').value.trim(), $('cs-responsable-facturation-nom').value.trim()].filter(Boolean).join(' '),
    emailFacturation: $('cs-email-facturation').value.trim(),
    groupesCommande: lireGroupesCommande('cs-groupes'),
    typePublic: $('cs-type-public').value.trim(), moyensPaiement: lireMoyensPaiement('cs-paiement'),
    rn: $('cs-type').value === 'rn', esn: $('cs-type').value === 'esn',
    interne: $('cs-type').value === 'interne', bo: $('cs-type').value === 'bo', projets: $('cs-type').value === 'projets'
  };
  const code = ligne ? null : $('cs-code').value.trim();
  if((!ligne && !code) || !champsCommuns.nom || !champsCommuns.responsable){
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Le code, le nom et le responsable sont obligatoires.</div>';
    return;
  }
  $('cs-enregistrer').disabled = true;
  try{
    etat(ligne ? 'Enregistrement…' : 'Création…', 'chargement');
    let ok;
    if(ligne){
      const reponses = await Promise.all(Object.keys(champsCommuns).map(c => poster({ action: 'structure-update', ligne, champ: c, valeur: champsCommuns[c] })));
      ok = !reponses.find(r => !r.ok);
    }else{
      const r = await poster({ action: 'structure-create', code, ...champsCommuns });
      ok = r.ok;
    }
    if(ok){
      etat(ligne ? 'Structure mise à jour' : 'Structure créée', 'succes');
      const rst = await jsonp({ action: 'structures', password: motDePasse });
      if(rst.ok) state.structures = rst.structures.slice().sort((a, b) => b.ligne - a.ligne);
      state.modal = null; render();
    }else{ etat('Enregistrement impossible', 'erreur'); $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>'; $('cs-enregistrer').disabled = false; }
  }catch(e){ etat('Enregistrement impossible', 'erreur'); $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>'; $('cs-enregistrer').disabled = false; }
}

function vueCreerCommande(){
  const codeActuel = state.ncCode || (state.structures[0] && state.structures[0].code) || '';
  const optionsStructures = state.structures.map(s => `<option value="${echapper(s.code)}" ${s.code === codeActuel ? 'selected' : ''}>${echapper(s.nom)}</option>`).join('');
  const optionsProduits = state.produits.map(p => `<option value="${echapper(p.nom)}">${echapper(p.nom)}</option>`).join('');
  const structureChoisie = state.structures.find(s => s.code === codeActuel);
  const estProjets = structureChoisie && typeStructure(structureChoisie) === 'Projets';
  return dialogShell('Nouvelle commande', `
    ${champ('Structure *', `<select class="input" id="nc-code">${optionsStructures}</select>`)}
    ${champ('Ajouter un produit', `
      <div style="display:flex;gap:8px">
        <select class="input" id="nc-produit-select" style="flex:1">${optionsProduits}</select>
        <input class="input" id="nc-produit-qte" type="number" min="1" value="1" style="width:80px">
        <button type="button" class="btn btn-secondary" data-nc-ajouter-ligne>${icon('plus', 15)}</button>
      </div>`)}
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:var(--space-2)">
      ${state.ncLignes.map((l, i) => {
        const p = state.produits.find(x => x.nom === l.produit);
        const stock = p ? parseInt(p.stock, 10) || 0 : null;
        const insuffisant = stock !== null && l.quantite > stock;
        return `
        <div style="display:flex;align-items:center;gap:8px;background:${insuffisant ? 'var(--color-warn-100)' : 'var(--color-neutral-100)'};border-radius:var(--radius-md);padding:8px 12px">
          <span style="flex:1;font-size:13px">${l.quantite}× ${echapper(l.produit)}${insuffisant ? ` <span style="color:var(--color-warn-800);font-size:11.5px">(stock : ${stock})</span>` : ''}</span>
          <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-nc-retirer-ligne="${i}">${icon('x', 14)}</button>
        </div>`;
      }).join('') || '<p style="opacity:0.5;font-size:12.5px">Aucune ligne ajoutée.</p>'}
    </div>
    ${estProjets ? `<div class="card elev-sm" style="padding:var(--space-3);background:var(--color-warn-100);color:var(--color-warn-800);font-size:12.5px;margin-top:8px">${icon('alert', 13)} Structure Projets : une quantité supérieure au stock disponible est autorisée (commande par prévision).</div>` : ''}
    ${champ('Statut initial', `<select class="input" id="nc-statut">${ORDER_STATUSES.map(s => `<option value="${echapper(s)}">${echapper(s)}</option>`).join('')}</select>`)}
    ${champ('Commentaire', '<textarea class="input" id="nc-commentaire" rows="2"></textarea>')}
  `, 'cc-enregistrer');
}
async function enregistrerCommande(){
  const donnees = {
    action: 'commande-create-manuelle',
    code: $('nc-code').value,
    lignes: state.ncLignes,
    date: new Date().toLocaleDateString('fr-FR'),
    statutCommande: $('nc-statut').value,
    statutPaiement: 'Non applicable (ESN/Interne)',
    commentaire: $('nc-commentaire').value.trim(),
    responsableCommande: '', demandeDevis: false, urlSuivi: '', urlPortail: ''
  };
  if(!donnees.code){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis une structure.</div>'; return; }
  if(!donnees.lignes.length){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Ajoute au moins un produit.</div>'; return; }

  const structureChoisie = state.structures.find(s => s.code === donnees.code);
  const estProjets = structureChoisie && typeStructure(structureChoisie) === 'Projets';
  if(!estProjets){
    const insuffisantes = donnees.lignes.filter(l => {
      const p = state.produits.find(x => x.nom === l.produit);
      return p && l.quantite > (parseInt(p.stock, 10) || 0);
    });
    if(insuffisantes.length){
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">Stock insuffisant pour : ${insuffisantes.map(l => echapper(l.produit)).join(', ')}. Seules les structures Projets peuvent commander au-delà du stock disponible.</div>`;
      return;
    }
  }

  $('cc-enregistrer').disabled = true;
  try{
    const r = await posterEtat(donnees, 'Création…', 'Commande créée');
    if(r.ok){
      const rc = await jsonp({ action: 'list', password: motDePasse, limite: -1, filtre: 'tout' });
      if(rc.ok) state.commandes = rc.commandes;
      // Créée depuis un devis libre (bouton "Générer la commande liée") : rattache
      // automatiquement le nouveau devis à cette commande fraîchement créée.
      if(state.modal.rattacherDevisLigne){
        const nouvelleCommande = state.commandes.find(c => c.reference === r.reference);
        if(nouvelleCommande){
          await poster({ action: 'devis-rattacher-commande', ligneDevis: state.modal.rattacherDevisLigne, ligneCommande: nouvelleCommande.ligne });
          const rd = await jsonp({ action: 'devis', password: motDePasse, limite: 0 });
          if(rd.ok) state.devis = rd.devis;
        }
      }
      state.modal = null; state.ncLignes = []; render();
    }else{ $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('cc-enregistrer').disabled = false; }
  }catch(e){ $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>'; $('cc-enregistrer').disabled = false; }
}

function vueCreerSav(){
  const optionsStructures = state.structures.map(s => `<option value="${echapper(s.code)}">${echapper(s.nom)} (${echapper(s.code)})</option>`).join('');
  return dialogShell('Nouveau SAV', `
    ${champ('Nom (structure ou personne) *', '<input class="input" id="ns-nom">')}
    ${champ('Email *', '<input class="input" id="ns-email" type="email">')}
    ${champ('Structure liée', `<select class="input" id="ns-code"><option value="">—</option>${optionsStructures}</select>`)}
    ${champ('Téléphone', '<input class="input" id="ns-telephone">')}
    ${champ('Numéro de série', '<input class="input" id="ns-numero-serie">')}
    ${champ('Marque', '<input class="input" id="ns-marque">')}
    ${champ('Modèle', '<input class="input" id="ns-modele">')}
    ${champ('Symptôme *', '<textarea class="input" id="ns-symptome" rows="2"></textarea>')}
    ${champ('Commentaire', '<textarea class="input" id="ns-commentaire" rows="2"></textarea>')}
  `, 'ns-enregistrer');
}
async function enregistrerSav(){
  const nom = $('ns-nom').value.trim();
  const email = $('ns-email').value.trim();
  const symptome = $('ns-symptome').value.trim();
  if(!nom || !email || !symptome){
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Nom, email et symptôme sont obligatoires.</div>';
    return;
  }
  $('ns-enregistrer').disabled = true;
  try{
    etat('Création…', 'chargement');
    const r = await poster({
      action: 'sav-create', nom, email, symptome,
      code: $('ns-code').value, telephone: $('ns-telephone').value.trim(),
      numeroSerie: $('ns-numero-serie').value.trim(), commentaire: $('ns-commentaire').value.trim()
    });
    if(!r.ok){ etat(r.erreur || 'Création impossible', 'erreur'); $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; $('ns-enregistrer').disabled = false; return; }

    // Marque/modèle ne sont pas acceptés à la création (sav-create) — renseignés juste après
    // via sav-update, sur le ticket qui vient d'être créé.
    const marque = $('ns-marque').value.trim(), modele = $('ns-modele').value.trim();
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
    state.modal = null; render();
  }catch(e){ etat('Création impossible', 'erreur'); $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>'; $('ns-enregistrer').disabled = false; }
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
function vueCreerProduit(){
  const ligne = state.modal.ligne;
  const p = ligne ? state.produits.find(x => x.ligne === ligne) : null;
  const icone = p ? p.icone : '';
  const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(icone);
  const estTablette = icone === 'tablette';
  const estRecharge = icone === 'recharge';
  return dialogShell(p ? `Modifier ${p.nom}` : 'Nouveau produit', `
    ${champ('Nom *', `<input class="input" id="cp-nom" value="${p ? echapper(p.nom) : ''}">`)}
    ${champ('Icône (détermine la catégorie et les caractéristiques ci-dessous)', `<select class="input" id="cp-icone">${ICONES_PRODUIT_OPTIONS.map(o => `<option value="${o.value}" ${p && p.icone === o.value ? 'selected' : ''}>${echapper(o.label)}</option>`).join('')}</select>`)}
    ${champ('Prix standard (€) *', `<input class="input" id="cp-prix-standard" type="number" step="0.01" value="${p ? echapper(p.prixStandard) : ''}">`)}
    ${champ('Prix RNum (€) *', `<input class="input" id="cp-prix-rn" type="number" step="0.01" value="${p ? echapper(p.prixRN) : ''}">`)}
    ${champ('Stock *', `<input class="input" id="cp-stock" type="number" step="1" value="${p ? echapper(p.stock) : ''}">`)}
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
    ${champ('Groupe de commande *', `<select class="input" id="cp-groupe">${GROUPES_COMMANDE.map(g => `<option value="${echapper(g)}" ${p && p.groupe === g ? 'selected' : ''}>${echapper(g)}</option>`).join('')}</select>`)}
    ${champ('Type tec.tech', `<select class="input" id="cp-tectech-type"><option value="">—</option>${TECTECH_TYPES.map(t => `<option value="${t}" ${p && p.tectechType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
    ${champ('Catégorie tec.tech', `<select class="input" id="cp-tectech-categorie"><option value="">—</option>${TECTECH_CATEGORIES.map(c => `<option value="${c}" ${p && p.tectechCategorie === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}
    ${champ('Message d\'indisponibilité', `<textarea class="input" id="cp-message-rupture" rows="2" placeholder="Ce produit est temporairement indisponible.">${p ? echapper(p.messageRupture || '') : ''}</textarea>`)}
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:var(--space-4)">
      <label class="rp-switch"><input type="checkbox" id="cp-visible" ${!p || p.visible ? 'checked' : ''}><span class="rp-switch-piste"></span>Visible dans le formulaire public</label>
      <label class="rp-switch"><input type="checkbox" id="cp-sans-suivi" ${p && p.sansPersonne && p.exclureDuPasseport ? 'checked' : ''}><span class="rp-switch-piste"></span>Pas de numéro de série ou de personne à associer (exemple : atelier, cartes sim, recharges etc)</label>
      <label class="rp-switch"><input type="checkbox" id="cp-dematerialise" ${p && p.dematerialise ? 'checked' : ''}><span class="rp-switch-piste"></span>Produit dématérialisé, pas de livraison (exemple : recharges internet) — saute l'étape "En cours de livraison" et remplace le champ "numéros de série" par un champ "codes"</label>
    </div>
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
  const nom = $('cp-nom').value.trim();
  const prixStandard = $('cp-prix-standard').value, prixRN = $('cp-prix-rn').value, stock = $('cp-stock').value;
  if(!nom || prixStandard === '' || prixRN === '' || stock === ''){
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Nom, prix standard, prix RNum et stock sont obligatoires.</div>';
    return;
  }
  $('cp-enregistrer').disabled = true;
  // Le toggle "sans suivi" pilote deux drapeaux (nominatif, passeport) — le troisième (sans
  // numéro de série) est forcé à faux si le produit est dématérialisé : un code reste requis
  // par unité dans ce cas (voir "Codes" à l'étape Validée), même si l'ancien toggle "sans
  // suivi" est aussi coché sur ce produit (ex. une recharge qui avait déjà ce toggle avant
  // l'ajout du concept "dématérialisé").
  const sansSuivi = $('cp-sans-suivi').checked;
  const dematerialise = $('cp-dematerialise').checked;
  // Système/RAM/disque : ordinateur, smartphone ou tablette. Processeur : ordinateur/smartphone
  // uniquement (pas tablette). Données mobiles/SMS/appels : recharge uniquement. Ailleurs, tout
  // est envoyé vide plutôt que de garder ce qui traîne dans des champs masqués (utile si le
  // produit change de catégorie). RAM et données mobiles arrivent en nombre nu depuis leur
  // <select> — le "Go" est rajouté ici, pas dans le formulaire.
  const icone = $('cp-icone').value;
  const estOrdiOuTelephone = ['portable', 'fixe', 'telephone'].includes(icone);
  const estTablette = icone === 'tablette';
  const estMaterielTechnique = estOrdiOuTelephone || estTablette;
  const estRecharge = icone === 'recharge';
  const avecGo = valeur => valeur && /^\d+$/.test(valeur) ? `${valeur} Go` : valeur;
  const champsCommuns = {
    nom, prixStandard, prixRN, stock, icone,
    visible: $('cp-visible').checked, sansPersonne: sansSuivi,
    exclureDuPasseport: sansSuivi, sansNumeroSerie: sansSuivi && !dematerialise, groupe: $('cp-groupe').value,
    tectechType: $('cp-tectech-type').value, tectechCategorie: $('cp-tectech-categorie').value,
    dematerialise, messageRupture: $('cp-message-rupture').value.trim(),
    systeme: estMaterielTechnique ? $('cp-systeme').value.trim() : '',
    ram: estMaterielTechnique ? avecGo($('cp-ram').value.trim()) : '',
    processeur: estOrdiOuTelephone ? $('cp-processeur').value.trim() : '',
    disque: estMaterielTechnique ? $('cp-disque').value.trim() : '',
    donneesMobiles: estRecharge ? avecGo($('cp-donnees-mobiles').value.trim()) : '',
    sms: estRecharge ? $('cp-sms').value.trim() : '',
    appels: estRecharge ? $('cp-appels').value.trim() : '',
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
        action: 'produit-create', ...champsCommuns,
        messageRupture: '', disque: '', ram: '', systeme: '', structureDediee: ''
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
    <div class="rp-seg" style="margin-bottom:var(--space-4);width:fit-content">
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

/* ============================================================
   Démarrage
   ============================================================ */
render();
majLabelTheme();
// Reconnexion silencieuse si un mot de passe a déjà été saisi dans cet onglet — sans ça,
// n'importe quel rechargement de page (F5, lien externe...) redemandait le mot de passe, chose
// que les pages publiques n'imposent jamais une fois identifié.
(async () => {
  let mdpStocke = '';
  try{ mdpStocke = sessionStorage.getItem('cvdl-admin-jeton') || ''; sessionStorage.removeItem('cvdl-admin-password'); }catch(e){}
  if(!mdpStocke) return;
  await connecter(mdpStocke); // le jeton est renouvelé à chaque reconnexion

})();
