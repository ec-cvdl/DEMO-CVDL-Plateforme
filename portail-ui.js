/** Lien sûr pour un href : seulement http(s), mailto, un chemin relatif ou un document généré en data: (PDF/HTML) —
 *  tout le reste (javascript:, data:text/html…) est remplacé par « # ». */
window.urlSure = function(u){
  const v = String(u == null ? '' : u).trim();
  if(!v) return '#';
  if(/^(https?:|mailto:)/i.test(v) || /^data:(application\/pdf|text\/html)[;,]/i.test(v)) return v;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^\/\//.test(v)) return v; // relatif (même site)
  return '#';
};
/* portail-ui.js — illustrations communes de l'espace public.
   Tout élément <span data-ill="nom" class="ill …"></span> reçoit son dessin (trait fin bleu nuit +
   aplat de couleur décalé). Styles dans portail.css. Aucune dépendance. */
(function(){
  const I = {
    flotte:['t','<rect x="8" y="12" width="26" height="18" rx="3"/><rect x="30" y="18" width="12" height="20" rx="3"/>','<rect x="6" y="10" width="26" height="18" rx="3"/><path d="M3 32h32"/><rect x="31" y="16" width="12" height="22" rx="2.5" fill="var(--ill-fond)"/><path d="M35.5 34h3"/>'],
    partenairesCmd:['m','<path d="M10 18 24 11l14 7v14l-14 7-14-7z"/>','<path d="M8 16 22 9l14 7v14l-14 7-14-7z"/><path d="M8 16l14 7 14-7M22 23v14M15 12.5 29 19.5"/><circle cx="37" cy="36" r="7" fill="var(--ill-fond)"/><path d="M34 36h6M37.5 33.5 40 36l-2.5 2.5"/>'],
    structures:['t','<rect x="9" y="16" width="14" height="24" rx="2"/><rect x="27" y="10" width="14" height="30" rx="2"/>','<rect x="7" y="14" width="14" height="24" rx="2"/><rect x="25" y="8" width="14" height="30" rx="2"/><path d="M11 20h2M16 20h2M11 26h2M16 26h2M29 14h2M34 14h2M29 20h2M34 20h2M29 26h2M34 26h2M12 38v-5h4v5M30 38v-5h4v5M3 38h40"/>'],
    tarifs:['m','<path d="M26 8h14v14L22 40 8 26z"/>','<path d="M24 6h14v14L20 38 6 24z"/><circle cx="31.5" cy="12.5" r="2.5"/><path d="M24.5 22.5a5 5 0 1 0 0 6.5M16 24.2h7M16.5 27.2h6"/>'],
    aide:['t','<path d="M12 12h22l5 5-5 5H12z"/>','<path d="M22 4v38"/><path d="M10 10h22l5 5-5 5H10z"/><path d="M34 24H14l-5 5 5 5h20z" fill="var(--ill-fond)"/><path d="M16 42h12"/>'],
    attestations:['m','<rect x="12" y="8" width="24" height="32" rx="3"/>','<path d="M30 40H11a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h17l8 8v9"/><path d="M28 6v8h8M14 18h10M14 23h14M14 28h8"/><circle cx="34" cy="31" r="6" fill="var(--ill-fond)"/><path d="m30.5 36-1.5 6 5-2.5 5 2.5-1.5-6"/>'],
    categories:['t','<rect x="7" y="9" width="16" height="22" rx="3"/><rect x="27" y="17" width="14" height="22" rx="3"/>','<rect x="5" y="7" width="16" height="22" rx="3"/><path d="M11 25h4"/><rect x="25" y="15" width="14" height="22" rx="3"/><path d="M30 33h4M5 38h13M25 42h14M8 34h7"/>'],
    commander:['m','<rect x="13" y="15" width="26" height="15" rx="3"/>','<path d="M4 7h6l4 21h22l4-15H12"/><circle cx="17" cy="37" r="3" fill="var(--ill-fond)"/><circle cx="33" cy="37" r="3" fill="var(--ill-fond)"/><path d="M20 20h10M25 15v10"/>'],
    commandes:['m','<path d="M10 17 24 10l14 7v16l-14 7-14-7z"/>','<path d="M8 15 22 8l14 7v16l-14 7-14-7z"/><path d="M8 15l14 7 14-7M22 22v16"/><rect x="28" y="26" width="16" height="16" rx="4" fill="var(--ill-fond)"/><path d="m32 34 2.5 2.5L40 31"/>'],
    panne:['t','<rect x="7" y="13" width="24" height="16" rx="3"/><path transform="translate(19 11) scale(1.25)" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>','<rect x="5" y="11" width="24" height="16" rx="3"/><path d="M2 31h22"/><path vector-effect="non-scaling-stroke" transform="translate(17 9) scale(1.25)" fill="var(--ill-fond)" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    suiviSav:['t','<rect x="12" y="10" width="26" height="30" rx="3"/>','<rect x="10" y="8" width="26" height="32" rx="3"/><rect x="17" y="5" width="12" height="6" rx="2" fill="var(--ill-fond)"/><path d="M14 26h5l3-6 4 10 3-6h4"/>'],
    passeport:['m','<rect x="12" y="8" width="26" height="33" rx="3"/>','<rect x="10" y="6" width="26" height="33" rx="3"/><circle cx="23" cy="18" r="5"/><path d="M18 18h10M23 13c-2 3-2 7 0 10M23 13c2 3 2 7 0 10M16 30h14M18 34h10"/>'],
    enquete:['m','<path d="M10 12h30a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H22l-8 7v-7h-4a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z"/>','<path d="M8 10h30a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H20l-8 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="m23 14.5 2.2 4.4 4.8.6-3.5 3.3.9 4.8L23 25.2l-4.4 2.4.9-4.8-3.5-3.3 4.8-.6z"/>'],
    cle:['t','<circle cx="17" cy="27" r="9"/>','<circle cx="15" cy="25" r="8"/><circle cx="15" cy="25" r="2.5"/><path d="M21 19 38 8M32 12l4 5M27.5 15l3 4"/>'],
    structure:['m','<rect x="11" y="12" width="26" height="28" rx="2"/>','<rect x="9" y="10" width="26" height="28" rx="2"/><path d="M15 16h3M21 16h3M27 16h2M15 22h3M21 22h3M27 22h2M15 28h3M27 28h2M19 38v-7h6v7M4 38h36"/>'],
    personne:['t','<circle cx="25" cy="17" r="8"/><path d="M11 41a14 14 0 0 1 28 0z"/>','<circle cx="23" cy="15" r="7"/><path d="M9 39a14 14 0 0 1 28 0"/><path d="M33 9l3-3M36 13h4"/>'],
    vide:['m','<circle cx="21" cy="21" r="12"/>','<circle cx="19" cy="19" r="12"/><path d="m28 28 12 12"/><path d="M14 19h10"/>'],
    tableau:['t','<rect x="10" y="10" width="30" height="28" rx="3"/>','<rect x="8" y="8" width="30" height="28" rx="3"/><path d="M8 15h30"/><rect x="12" y="20" width="7" height="12" rx="1.5" fill="var(--ill-fond)"/><rect x="22" y="25" width="5" height="7" rx="1.5"/><rect x="30" y="22" width="4" height="10" rx="1.5"/>'],
    facture:['m','<path d="M12 8h24v32l-4-3-4 3-4-3-4 3-4-3-4 3z"/>','<path d="M10 6h24v32l-4-3-4 3-4-3-4 3-4-3-4 3z"/><path d="M15 13h14M15 19h14M15 25h8"/><circle cx="33" cy="31" r="7" fill="var(--ill-fond)"/><path d="M35.5 28.5a3.2 3.2 0 1 0 0 5M30 30.2h4M30 32.2h3.4"/>'],
    stock:['t','<rect x="9" y="24" width="15" height="15" rx="2"/><rect x="26" y="24" width="15" height="15" rx="2"/>','<rect x="7" y="22" width="15" height="15" rx="2"/><rect x="24" y="22" width="15" height="15" rx="2"/><rect x="15.5" y="5" width="15" height="14" rx="2" fill="var(--ill-fond)"/><path d="M14.5 22v5M31.5 22v5M23 5v5M3 40h40"/>'],
    stats:['m','<path d="M10 40V26h6v14zM21 40V18h6v22zM32 40V10h6v30z"/>','<path d="M5 40h38"/><rect x="9" y="26" width="6" height="14" rx="1"/><rect x="20" y="18" width="6" height="22" rx="1" fill="var(--ill-fond)"/><rect x="31" y="10" width="6" height="30" rx="1"/><path d="M8 20l10-8 8 5 13-10"/>'],
    reglages:['t','<circle cx="25" cy="25" r="13"/>','<circle cx="23" cy="23" r="12"/><circle cx="23" cy="23" r="5" fill="var(--ill-fond)"/><path d="M23 5v5M23 36v5M5 23h5M36 23h5M10.3 10.3l3.5 3.5M32.2 32.2l3.5 3.5M10.3 35.7l3.5-3.5M32.2 13.8l3.5-3.5"/>'],
    impact:['t','<circle cx="25" cy="25" r="16"/>','<circle cx="23" cy="23" r="16"/><path d="M8 20h8l3 4-2 5 4 4v8M30 8l-2 6 4 3h8"/><path d="M28 40c0-9 5-15 14-16-1 9-6 14-14 16z" fill="var(--ill-fond)"/><path d="M28 40l8-9"/>'],
    distribution:['t','<path d="M9 20 21 14l12 6v14l-12 6-12-6z"/>','<path d="M7 18 19 12l12 6v14l-12 6-12-6z"/><path d="M7 18l12 6 12-6M19 24v14"/><path d="M34 12h8M38 8l4 4-4 4M34 26h8M38 22l4 4-4 4"/>'],
    calendrier:['m','<rect x="9" y="12" width="32" height="28" rx="3"/>','<rect x="7" y="10" width="32" height="28" rx="3"/><path d="M7 18h32M15 6v8M31 6v8"/><rect x="13" y="23" width="6" height="5" rx="1" fill="var(--ill-fond)"/><path d="M24 25.5h9M13 32.5h6M24 32.5h9"/>'],
    cloche:['m','<path d="M14 18a11 11 0 0 1 22 0c0 12 5 15 5 15H9s5-3 5-15z"/>','<path d="M12 16a11 11 0 0 1 22 0c0 12 5 15 5 15H7s5-3 5-15z"/><path d="M19 36a4 4 0 0 0 8 0"/><circle cx="36" cy="9" r="5" fill="var(--ill-fond)"/>'],
    linux:['t','<ellipse cx="25" cy="27" rx="12" ry="14"/>','<path d="M23 6c-5 0-7 4-7 9 0 3-4 7-5 12-1 4 1 8 4 10h16c3-2 5-6 4-10-1-5-5-9-5-12 0-5-2-9-7-9z"/><circle cx="20" cy="15" r="1.5"/><circle cx="26" cy="15" r="1.5"/><path d="M20 20c2 1.5 4 1.5 6 0M14 40l-3 3h8M32 40l3 3h-8"/>']
  };

  /* ── Illustrations « objets » (produits, symptômes SAV) : SVG autonome (couleurs en ligne),
        utilisable aussi dans l'admin qui ne charge pas portail.css.
        window.illustrationCvdl(cle, taille) → chaîne SVG. Clés : prod-… et sym-… ── */
  const T = 'color-mix(in srgb, #00ACB0 45%, white)', M = 'color-mix(in srgb, #E62460 35%, white)', R = 'color-mix(in srgb, #E5484D 38%, white)';
  const F = 'var(--ill-fond, #fff)';
  const O = {
    'prod-laptop':[T,'<rect x="9" y="13" width="30" height="18" rx="3"/>','<rect x="7" y="11" width="30" height="18" rx="3"/><path d="M3 33h38l-3 4H6z"/>'],
    'prod-ecran':[T,'<rect x="9" y="9" width="32" height="22" rx="3"/>','<rect x="7" y="7" width="32" height="22" rx="3"/><path d="M23 29v7M15 37h16"/>'],
    'prod-telephone':[M,'<rect x="17" y="7" width="16" height="33" rx="4"/>','<rect x="15" y="5" width="16" height="34" rx="4"/><path d="M21 34h4"/>'],
    'prod-telephone_touches':[M,'<rect x="17" y="7" width="16" height="33" rx="4"/>','<rect x="15" y="5" width="16" height="34" rx="4"/><rect x="18" y="9" width="10" height="9" rx="1.5"/><path d="M19 23h.01M23 23h.01M27 23h.01M19 27h.01M23 27h.01M27 27h.01M19 31h.01M23 31h.01M27 31h.01" stroke-width="3"/>'],
    'prod-tablette':[T,'<rect x="11" y="7" width="28" height="34" rx="4"/>','<rect x="9" y="5" width="28" height="36" rx="4"/><path d="M21 36h4"/>'],
    'prod-sim':[M,'<path d="M15 8h14l8 8v26H15z"/>','<path d="M13 6h14l8 8v26a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><rect x="16" y="21" width="14" height="13" rx="2" fill="' + F + '"/><path d="M23 21v13M16 27.5h14"/>'],
    'prod-recharge':[M,'<rect x="11" y="10" width="16" height="30" rx="4"/>','<rect x="9" y="8" width="16" height="30" rx="4"/><path d="M15 33h4"/><path d="M36 10 29 22h8l-7 12" stroke-width="2.2"/>'],
    'prod-souris':[T,'<rect x="17" y="11" width="18" height="29" rx="9"/>','<rect x="15" y="9" width="18" height="30" rx="9"/><path d="M24 9v10"/>'],
    'prod-clavier':[T,'<rect x="6" y="16" width="38" height="18" rx="3"/>','<rect x="4" y="14" width="38" height="18" rx="3"/><path d="M10 20h2M16 20h2M22 20h2M28 20h2M34 20h2M10 25h2M16 25h2M22 25h2M28 25h2M34 25h2M15 29h16"/>'],
    'prod-casque':[M,'<path d="M10 28a14 14 0 0 1 28 0v10H10z"/>','<path d="M8 30v-4a16 16 0 0 1 32 0v4"/><rect x="6" y="28" width="8" height="12" rx="3" fill="' + F + '"/><rect x="34" y="28" width="8" height="12" rx="3" fill="' + F + '"/>'],
    'prod-webcam':[T,'<circle cx="25" cy="21" r="12"/>','<circle cx="23" cy="19" r="12"/><circle cx="23" cy="19" r="5"/><path d="M23 31v8M15 40h16"/>'],
    'prod-station':[T,'<rect x="10" y="18" width="30" height="16" rx="3"/>','<rect x="8" y="16" width="30" height="16" rx="3"/><path d="M13 24h4M21 24h4M29 24h4M12 37h22"/>'],
    'prod-atelier':[M,'<rect x="8" y="8" width="30" height="20" rx="2"/>','<rect x="6" y="6" width="30" height="20" rx="2"/><path d="M11 12h12M11 17h18"/><circle cx="14" cy="34" r="4"/><circle cx="32" cy="34" r="4"/><path d="M7 44a7 7 0 0 1 14 0M25 44a7 7 0 0 1 14 0"/>'],
    'prod-feuille':[T,'<path d="M12 40C12 22 24 10 42 10c0 18-12 30-30 30z"/>','<path d="M10 38C10 20 22 8 40 8c0 18-12 30-30 30z"/><path d="M10 38 28 20"/>'],
    'prod-package':[M,'<path d="M10 17 24 10l14 7v16l-14 7-14-7z"/>','<path d="M8 15 22 8l14 7v16l-14 7-14-7z"/><path d="M8 15l14 7 14-7M22 22v16"/>'],
    'sym-alimentation':[R,'<circle cx="25" cy="27" r="14"/>','<path d="M23 7v15"/><path d="M14.5 12.5a14 14 0 1 0 17 0"/>'],
    'sym-ecran':[R,'<rect x="9" y="9" width="32" height="22" rx="3"/>','<rect x="7" y="7" width="32" height="22" rx="3"/><path d="M23 29v7M15 37h16"/><path d="M17 11l5 6-4 3 5 6"/>'],
    'sym-batterie':[R,'<rect x="7" y="17" width="32" height="16" rx="3"/>','<rect x="5" y="15" width="32" height="16" rx="3"/><path d="M41 21v6"/><path d="M23 18l-5 5.5h6l-5 5.5" stroke-width="2.2"/>'],
    'sym-clavier':[T,'<rect x="6" y="16" width="38" height="18" rx="3"/>','<rect x="4" y="14" width="38" height="18" rx="3"/><path d="M10 20h2M16 20h2M22 20h2M28 20h2M34 20h2M10 25h2M16 25h2M22 25h2M28 25h2M34 25h2M15 29h16"/>'],
    'sym-souris':[T,'<rect x="17" y="11" width="18" height="29" rx="9"/>','<rect x="15" y="9" width="18" height="30" rx="9"/><path d="M24 9v10"/>'],
    'sym-son':[M,'<path d="M10 20h7l9-7v26l-9-7h-7z"/>','<path d="M8 18h7l9-7v26l-9-7H8z"/><path d="M31 18a8 8 0 0 1 0 12M35.5 13.5a14 14 0 0 1 0 21"/>'],
    'sym-internet':[T,'<circle cx="25" cy="35" r="6"/>','<path d="M6 19a26 26 0 0 1 36 0M12 26a17 17 0 0 1 24 0M18 32a8 8 0 0 1 12 0"/><circle cx="24" cy="37" r="2" fill="#002743"/>'],
    'sym-virus':[R,'<circle cx="25" cy="25" r="12"/>','<circle cx="23" cy="23" r="11"/><path d="M23 7v5M23 34v5M7 23h5M34 23h5M11.5 11.5l3.5 3.5M31 31l3.5 3.5M11.5 34.5 15 31M31 15l3.5-3.5"/><circle cx="19.5" cy="20" r="1.8"/><circle cx="26" cy="26" r="2.4"/>'],
    'sym-mise_a_jour':[T,'<circle cx="25" cy="25" r="14"/>','<path d="M36 17A14 14 0 0 0 10 21M10 29a14 14 0 0 0 26 4"/><path d="M36 9v8h-8M10 39v-8h8"/>'],
    'sym-lenteur':[M,'<path d="M8 34a18 18 0 0 1 36 0z"/>','<path d="M6 32a18 18 0 0 1 36 0"/><path d="M24 32l-8-9"/><circle cx="24" cy="32" r="2.5" fill="#002743"/><path d="M12 32h2M34 32h2M24 16v2"/>'],
    'sym-surchauffe':[R,'<circle cx="24" cy="36" r="8"/>','<path d="M18 30V10a5 5 0 0 1 10 0v20a8 8 0 1 1-10 0z"/><path d="M23 16v16"/><path d="M35 13c2.5 2.5 2.5 5.5 0 8M39.5 9.5c4.5 4.5 4.5 11.5 0 16"/>'],
    'sym-mot_de_passe':[M,'<rect x="11" y="23" width="28" height="19" rx="3"/>','<rect x="9" y="21" width="28" height="19" rx="3"/><path d="M15 21v-6a8 8 0 0 1 16 0v6"/><path d="M23 29v4"/><circle cx="23" cy="28" r="1.8" fill="var(--ill-fond)"/>'],
    'sym-camera':[T,'<circle cx="25" cy="21" r="12"/>','<circle cx="23" cy="19" r="12"/><circle cx="23" cy="19" r="5"/><path d="M23 31v7M15 40h16"/><path d="M8 6l30 30"/>'],
    'sym-port':[T,'<path d="M16 18h20v8a10 10 0 0 1-20 0z"/>','<path d="M18 6v10M28 6v10"/><path d="M13 16h20v8a10 10 0 0 1-20 0z"/><path d="M23 34v9"/>'],
    'sym-application':[M,'<rect x="11" y="11" width="30" height="30" rx="5"/>','<rect x="8" y="8" width="13" height="13" rx="3"/><rect x="25" y="8" width="13" height="13" rx="3"/><rect x="8" y="25" width="13" height="13" rx="3"/><rect x="25" y="25" width="13" height="13" rx="3" fill="var(--ill-fond)"/><path d="M28.5 28.5l6 6M34.5 28.5l-6 6"/>'],
    'sym-choc':[T,'<path d="M25 9c6 9 10 14 10 20a10 10 0 0 1-20 0c0-6 4-11 10-20z"/>','<path d="M23 7c6 9 10 14 10 20a10 10 0 0 1-20 0c0-6 4-11 10-20z"/><path d="M18 28l4 3-2 4 4 3"/>'],
    'sym-impression':[T,'<rect x="9" y="19" width="32" height="15" rx="3"/>','<path d="M14 17V7h18v10"/><rect x="7" y="17" width="32" height="15" rx="3"/><path d="M14 27h18v13H14z" fill="var(--ill-fond)"/><path d="M18 32h10M18 36h7"/><circle cx="33" cy="22" r="1.4" fill="#002743"/>'],
    'sym-generique_sav':[R,'<rect x="8" y="12" width="26" height="18" rx="3"/>','<rect x="6" y="10" width="26" height="18" rx="3"/><path d="M3 32h32"/><path d="M41.5 25.5a6 6 0 0 1-7.8 5.7l-7 7a2.1 2.1 0 0 1-3-3l7-7a6 6 0 0 1 5.7-7.8l-3.4 3.4.6 2.5 2.5.6z" fill="' + F + '"/>'],
  };
  window.illustrationCvdl = function(cle, taille){
    const d = O[cle] || O['prod-package'];
    const t = taille || 40;
    return `<svg class="ill-objet" viewBox="0 0 48 48" width="${t}" height="${t}" aria-hidden="true" style="overflow:visible;flex:none"><g fill="${d[0]}" stroke="none">${d[1]}</g><g fill="none" stroke="#002743" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d[2]}</g></svg>`;
  };
  /** Clé d'illustration d'un produit (même logique de reconnaissance que l'admin et le portail). */
  window.cleIllustrationProduit = function(nom, icone){
    const alias = { portable:'laptop', fixe:'ecran', telephone:'telephone', telephone_touches:'telephone_touches', tablette:'tablette', sim:'sim', recharge:'recharge', atelier:'atelier', souris:'souris', feuille:'feuille', laptop:'laptop', ecran:'ecran', clavier:'clavier', casque:'casque', webcam:'webcam', station:'station', package:'package' };
    if(icone && alias[icone]) return 'prod-' + alias[icone];
    const n = String(nom || '').toLowerCase();
    if(/(sensibilisation|[ée]cologi|environnement)/.test(n)) return 'prod-feuille';
    if(/(atelier|animation)/.test(n)) return 'prod-atelier';
    if(/\bsim\b|carte sim/.test(n)) return 'prod-sim';
    if(/recharge|forfait/.test(n)) return 'prod-recharge';
    if(/souris/.test(n)) return 'prod-souris';
    if(/clavier/.test(n)) return 'prod-clavier';
    if(/casque/.test(n)) return 'prod-casque';
    if(/webcam/.test(n)) return 'prod-webcam';
    if(/station|dock/.test(n)) return 'prod-station';
    if(/touches?/.test(n)) return 'prod-telephone_touches';
    if(/(smartphone|t[ée]l[ée]phone|mobile)/.test(n)) return 'prod-telephone';
    if(/tablet/.test(n)) return 'prod-tablette';
    if(/([ée]cran|moniteur|fixe|bureau|desktop|tour)/.test(n)) return 'prod-ecran';
    if(/(portable|ordinateur|laptop|pc)/.test(n)) return 'prod-laptop';
    return 'prod-package';
  };

  function dessiner(el){
    const def = I[el.dataset.ill];
    if(!def || el.dataset.illOk) return;
    el.classList.add('ill', def[0]);
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 48 48"><g class="ill-fond">${def[1]}</g><g class="ill-trait">${def[2]}</g></svg>`;
    el.dataset.illOk = '1';
  }
  function tout(racine){ (racine || document).querySelectorAll('[data-ill]').forEach(dessiner); }
  window.portailIllustrations = tout;
  function demarrer(){
    tout();
    // Les pages reconstruisent souvent leur contenu en JS (listes, étapes) : on dessine aussi
    // les illustrations ajoutées après coup.
    new MutationObserver(mut => {
      for(const m of mut) for(const n of m.addedNodes){
        if(n.nodeType !== 1) continue;
        if(n.matches && n.matches('[data-ill]')) dessiner(n);
        if(n.querySelectorAll) n.querySelectorAll('[data-ill]').forEach(dessiner);
      }
    }).observe(document.body, { childList:true, subtree:true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();

/* ── Confirmation stylisée (remplace les popups du navigateur) — admin et pages publiques ──
   confirmerCvdl('Supprimer X ?\n\nDétail…') → Promise<boolean>. Le titre est la première phrase,
   le reste devient le texte ; le bouton reprend le verbe (Supprimer, Annuler, Retirer…). */
(function(){
  if(window.confirmerCvdl) return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `
.cvdl-conf-voile{ position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; background:color-mix(in srgb, #002743 45%, transparent); animation:cvdlcf-v .15s ease both; }
.cvdl-conf{ width:min(480px, 100%); background:#fff; color:#002743; border:1.5px solid #002743; border-radius:22px; box-shadow:8px 8px 0 color-mix(in srgb, #002743 38%, transparent); padding:22px 24px; font-family:Inter, system-ui, sans-serif; animation:cvdlcf-pop .24s cubic-bezier(.3,.7,.3,1) both; }
.cvdl-conf-tete{ display:flex; gap:12px; align-items:center; padding-bottom:14px; border-bottom:1.5px dashed color-mix(in srgb, #002743 22%, transparent); }
.cvdl-conf-ic{ width:44px; height:44px; flex:none; border-radius:12px; border:1.5px solid #002743; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, #FECC38 30%, #fff); }
.cvdl-conf.danger .cvdl-conf-ic{ background:color-mix(in srgb, #E5484D 18%, #fff); }
.cvdl-conf-ic svg{ width:24px; height:24px; fill:none; stroke:#002743; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.cvdl-conf-ic svg .plein{ fill:#FECC38; }
.cvdl-conf.danger .cvdl-conf-ic svg .plein{ fill:#F7A8AA; }
.cvdl-conf.info .cvdl-conf-ic svg .plein{ fill:#9FE0E1; }
.cvdl-conf-k{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; color:#E62460; }
.cvdl-conf.danger .cvdl-conf-k{ color:#C62828; }
.cvdl-conf h2{ font-family:"Space Grotesk", system-ui, sans-serif; font-size:19px; line-height:1.25; margin:2px 0 0; }
.cvdl-conf p{ margin:14px 0 0; font-size:14px; line-height:1.55; white-space:pre-line; opacity:.85; }
.cvdl-conf-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:20px; flex-wrap:wrap; }
.cvdl-conf-actions button{ font:inherit; font-weight:700; font-size:14px; min-height:44px; padding:10px 20px; border-radius:999px; border:1.5px solid #002743; cursor:pointer; transition:transform .12s, box-shadow .12s; }
.cvdl-conf-actions .retour{ background:#fff; color:#002743; border-color:transparent; text-decoration:underline dashed; text-underline-offset:4px; }
.cvdl-conf-actions .ok{ background:#00ACB0; color:#fff; box-shadow:3px 3px 0 color-mix(in srgb, #002743 38%, transparent); }
.cvdl-conf.danger .cvdl-conf-actions .ok{ background:#C62828; }
.cvdl-conf-actions .ok:hover{ transform:translate(-1px,-1px); box-shadow:4px 4px 0 color-mix(in srgb, #002743 38%, transparent); }
.cvdl-conf-champ{ display:flex; flex-direction:column; gap:6px; margin-top:14px; font-size:13px; font-weight:600; }
.cvdl-conf-champ input, .cvdl-conf-champ textarea{ font:inherit; font-weight:400; font-size:14.5px; color:#002743; padding:10px 14px; border:1px solid #7B8C9A; border-radius:12px; min-height:44px; }
.cvdl-conf-champ input:focus, .cvdl-conf-champ textarea:focus{ outline:2px solid #002743; outline-offset:2px; }
.cvdl-conf-err{ color:#C62828; font-size:13px; font-weight:600; min-height:0; margin-top:6px; }
.cvdl-conf.info .cvdl-conf-ic{ background:color-mix(in srgb, #00ACB0 20%, #fff); }
.cvdl-conf.info .cvdl-conf-k{ color:#00777A; }
.cvdl-conf.info.danger .cvdl-conf-ic{ background:color-mix(in srgb, #E5484D 16%, #fff); } .cvdl-conf.info.danger .cvdl-conf-ic svg .plein{ fill:#F7A8AA; } .cvdl-conf.info.danger .cvdl-conf-k{ color:#C62828; }
.cvdl-conf-actions .ok{ background:#00777A; }
.cvdl-conf-actions button:focus-visible{ outline:2px solid #00ACB0; outline-offset:3px; }
@keyframes cvdlcf-v{ from{ opacity:0; } } @keyframes cvdlcf-pop{ from{ opacity:0; transform:translate(6px,6px) scale(.97); } }
@media (prefers-reduced-motion:reduce){ .cvdl-conf-voile, .cvdl-conf{ animation:none; } }`;
  /** Pictogramme adapté au message : panneau attention, annulation, suppression, info, saisie. */
  const ICONES_CONF = {
    attention: '<path class="plein" d="M10.3 3.9 1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v5"/><path d="M12 17.5h.01"/>',
    annuler: '<circle class="plein" cx="12" cy="12" r="9.5"/><path d="m15 9-6 6M9 9l6 6"/>',
    supprimer: '<path class="plein" d="M5.5 7h13l-1 13a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z"/><path d="M3.5 7h17M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M10 11v6M14 11v6"/>',
    info: '<circle class="plein" cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
    ok: '<circle class="plein" cx="12" cy="12" r="9.5"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
    saisie: '<path class="plein" d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/>',
    question: '<circle class="plein" cx="12" cy="12" r="9.5"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9"/><path d="M12 17.2h.01"/>',
  };
  function iconeConf(o){
    const t = String(o.titre || '');
    let cle;
    if(o.saisie) cle = 'saisie';
    else if(o.info) cle = o.danger ? 'attention' : (/enregistr|envoy|succ|créé|termin/i.test(t) ? 'ok' : 'info');
    else if(/^(Supprimer|Effacer|Retirer)/i.test(t)) cle = 'supprimer';
    else if(/^Annuler/i.test(t)) cle = 'annuler';
    else cle = o.danger ? 'attention' : 'question';
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES_CONF[cle]}</svg>`;
  }
  function injecterStyle(){
    if(document.getElementById('cvdl-conf-style')) return;
    const st = document.createElement('style'); st.id = 'cvdl-conf-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  function deduire(message){
    const txt = String(message || '').trim();
    const i = txt.search(/\?|\n/);
    const titre = i === -1 ? txt : txt.slice(0, i + (txt[i] === '?' ? 1 : 0)).trim();
    const reste = i === -1 ? '' : txt.slice(i + 1).replace(/^\s+/, '');
    const verbe = (titre.match(/^(Supprimer|Annuler|Retirer|Régénérer|Réinitialiser|Effacer|Transférer|Générer|Remplacer|Envoyer|Dernière confirmation)/i) || [])[1] || '';
    const danger = /^(Supprimer|Annuler|Retirer|Effacer|Réinitialiser|Dernière confirmation)/i.test(titre);
    return { titre, texte: reste, ok: verbe && !/^Dernière/i.test(verbe) ? verbe.charAt(0).toUpperCase() + verbe.slice(1).toLowerCase() : (danger ? 'Confirmer' : 'Confirmer'), danger };
  }
  /* Fenêtre générique (confirmation, information, saisie) */
  function fenetre(o){
    injecterStyle();
    return new Promise(resolve => {
      const precedent = document.activeElement;
      const v = document.createElement('div');
      v.className = 'cvdl-conf-voile';
      v.innerHTML = `<div class="cvdl-conf${o.danger ? ' danger' : ''}${o.info ? ' info' : ''}" role="${o.info ? 'dialog' : 'alertdialog'}" aria-modal="true" aria-labelledby="cvdl-conf-t">
        <div class="cvdl-conf-tete"><span class="cvdl-conf-ic">${iconeConf(o)}</span><div><div class="cvdl-conf-k">${esc(o.k)}</div><h2 id="cvdl-conf-t">${esc(o.titre)}</h2></div></div>
        ${o.texte ? `<p>${esc(o.texte)}</p>` : ''}
        ${o.saisie ? `<label class="cvdl-conf-champ"><span>${esc(o.saisie.libelle || 'Votre réponse')}${o.saisie.requis ? ' *' : ''}</span>${o.saisie.long ? '<textarea rows="3"></textarea>' : '<input type="text">'}</label><div class="cvdl-conf-err" aria-live="assertive"></div>` : ''}
        <div class="cvdl-conf-actions">${o.info ? '' : '<button type="button" class="retour">Retour</button>'}<button type="button" class="ok">${esc(o.ok)}</button></div>
      </div>`;
      const champ = v.querySelector('input, textarea');
      if(champ && o.saisie.valeur) champ.value = o.saisie.valeur;
      const fermer = val => { document.removeEventListener('keydown', clavier, true); v.remove(); if(precedent && precedent.focus) precedent.focus(); resolve(val); };
      const valider = () => {
        if(!champ) return fermer(true);
        const val = champ.value.trim();
        if(o.saisie.requis && !val){ v.querySelector('.cvdl-conf-err').textContent = 'Ce champ est obligatoire.'; champ.focus(); return; }
        fermer(val);
      };
      const annuler = () => fermer(o.saisie ? null : (o.info ? true : false));
      const clavier = e => {
        if(e.key === 'Escape'){ e.stopPropagation(); annuler(); }
        if(e.key === 'Enter' && champ && champ.tagName === 'INPUT' && document.activeElement === champ){ e.preventDefault(); valider(); }
        if(e.key === 'Tab'){ const f = [...v.querySelectorAll('button, input, textarea')]; const i = f.indexOf(document.activeElement); if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); } else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); } }
      };
      v.addEventListener('click', e => { if(e.target === v) annuler(); });
      const r = v.querySelector('.retour'); if(r) r.addEventListener('click', annuler);
      v.querySelector('.ok').addEventListener('click', valider);
      document.addEventListener('keydown', clavier, true);
      document.body.appendChild(v);
      (champ || v.querySelector('.ok')).focus();
    });
  }
  /** Information (remplace alert) : alerteCvdl('Suppression impossible.') */
  window.alerteCvdl = function(message, options){
    const d = deduire(message);
    const erreur = /impossible|erreur|échec|réessaie/i.test(message);
    return fenetre(Object.assign({ titre: d.titre, texte: d.texte, ok: 'Compris', info: true, danger: erreur, k: erreur ? 'Problème' : 'Information' }, options || {}));
  };
  /** Saisie (remplace prompt) : await demanderCvdl('Motif ?', { requis: true, long: true }) → texte ou null */
  window.demanderCvdl = function(message, options){
    const d = deduire(String(message || '').replace(/\s*:\s*$/, ''));
    const o = options || {};
    const lignes = String(message || '').split(/\n+/);
    const libelle = lignes.length > 1 ? lignes[lignes.length - 1].replace(/\s*:\s*$/, '') : (o.libelle || d.titre.replace(/\s*:\s*$/, ''));
    const texte = lignes.length > 1 ? lignes.slice(1, -1).join('\n') : '';
    return fenetre({ titre: lignes.length > 1 ? d.titre : libelle, texte, ok: o.ok || d.ok, danger: d.danger, k: d.danger ? 'Action définitive' : 'À compléter',
      saisie: { libelle, requis: !!o.requis, long: !!o.long, valeur: o.valeur || '' } });
  };
  window.confirmerCvdl = function(message, options){
    injecterStyle();
    const o = Object.assign(deduire(message), options || {});
    return new Promise(resolve => {
      const precedent = document.activeElement;
      const v = document.createElement('div');
      v.className = 'cvdl-conf-voile';
      v.innerHTML = `<div class="cvdl-conf${o.danger ? ' danger' : ''}" role="alertdialog" aria-modal="true" aria-labelledby="cvdl-conf-t">
        <div class="cvdl-conf-tete"><span class="cvdl-conf-ic">${iconeConf(o)}</span><div><div class="cvdl-conf-k">${o.danger ? 'Action définitive' : 'Confirmation'}</div><h2 id="cvdl-conf-t">${esc(o.titre)}</h2></div></div>
        ${o.texte ? `<p>${esc(o.texte)}</p>` : ''}
        <div class="cvdl-conf-actions"><button type="button" class="retour">Retour</button><button type="button" class="ok">${esc(o.ok)}</button></div>
      </div>`;
      const fermer = val => { document.removeEventListener('keydown', clavier, true); v.remove(); if(precedent && precedent.focus) precedent.focus(); resolve(val); };
      const clavier = e => { if(e.key === 'Escape'){ e.stopPropagation(); fermer(false); } };
      v.addEventListener('click', e => { if(e.target === v) fermer(false); });
      v.querySelector('.retour').addEventListener('click', () => fermer(false));
      v.querySelector('.ok').addEventListener('click', () => fermer(true));
      document.addEventListener('keydown', clavier, true);
      document.body.appendChild(v);
      v.querySelector('.ok').focus();
    });
  };
})();

/* Clé d'illustration d'un symptôme SAV (portail et admin) — une seule règle. */
window.cleSymptomeCvdl = function(texte){
  const t = String(texte || '').toLowerCase();
  if(/chauff|surchauff|bruit|ventil/.test(t)) return 'surchauffe';
  if(/mot de passe|compte|identifiant|code pin|verrouill/.test(t)) return 'mot_de_passe';
  if(/cam[ée]ra|webcam|micro(?!soft)/.test(t)) return 'camera';
  if(/port|usb|prise|connecteur|c[âa]ble/.test(t)) return 'port';
  if(/application|logiciel|appli\b|programme/.test(t)) return 'application';
  if(/tomb|chute|eau|liquide|renvers|choc/.test(t)) return 'choc';
  if(/imprim/.test(t)) return 'impression';
  if(/allum|d[ée]marr|power|mort/.test(t)) return 'alimentation';
  if(/[ée]cran|affich|cass/.test(t)) return 'ecran';
  if(/batter|charg|alimentation/.test(t)) return 'batterie';
  if(/clavier|touche/.test(t)) return 'clavier';
  if(/souris|pav[ée]|trackpad/.test(t)) return 'souris';
  if(/\bsons?\b|audio|haut-parleur/.test(t)) return 'son';
  if(/wi-?fi|internet|r[ée]seau|connexion/.test(t)) return 'internet';
  if(/virus|pirat|malveill|malware/.test(t)) return 'virus';
  if(/mise [àa] jour|update/.test(t)) return 'mise_a_jour';
  if(/lent|rame|bloqu|fig|plant/.test(t)) return 'lenteur';
  return 'generique_sav';
};

/* ── Pilule « numéro de série » + passeport en modale — composant UNIQUE (admin et public) ──
   piluleSerieCvdl(sn, { query, code }) → HTML de la pilule.
     · query : paramètres d'accès ajoutés à l'URL du passeport ('&code=XXX' ou '&admin=YYY') ;
     · code  : true = code de produit dématérialisé (pas de passeport : pilule pointillée, copie au clic).
   Clic sur la pilule → passeport.html affiché dans une modale (mode intégré, sans en-tête) ;
   Ctrl/Cmd/clic molette → nouvel onglet (le href reste la vraie page). Icône copie : copie seule.
   Les styles sont injectés ici : un seul endroit à modifier pour tout le site. */
(function(){
  if(window.piluleSerieCvdl) return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SVG = {
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="15" y="15" width="4" height="4" rx=".8"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/></svg>',
    copie: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    onglet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
  };
  const CSS = `
html .cvdl-sn{ display:inline-flex; align-items:center; gap:8px; height:30px; box-sizing:border-box; padding:0 8px 0 4px; border-radius:999px; background:#6338F5 !important; border:1.5px solid #6338F5 !important; color:#fff !important; font:700 12.5px ui-monospace, SFMono-Regular, Menlo, monospace !important; letter-spacing:.02em; text-decoration:none !important; cursor:pointer; white-space:nowrap; max-width:100%; vertical-align:middle; transition:transform .16s cubic-bezier(.2,.8,.2,1), box-shadow .16s, background .16s; }
html .cvdl-sn svg{ width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
html .cvdl-sn .cvdl-sn-ic{ width:22px; height:22px; flex:none; border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.2); color:#fff; transition:transform .3s cubic-bezier(.3,1.6,.5,1); }
html .cvdl-sn .cvdl-sn-t{ overflow:hidden; text-overflow:ellipsis; }
html .cvdl-sn .cvdl-sn-go{ width:14px; height:18px; display:grid; place-items:center; opacity:.6; transition:transform .16s, opacity .16s; }
html .cvdl-sn .cvdl-sn-cp{ border:0; background:none; color:inherit; padding:0; width:18px; height:18px; display:grid; place-items:center; opacity:.6; cursor:copy; box-shadow:none; min-height:0; }
html .cvdl-sn .cvdl-sn-cp:hover{ opacity:1; }
html a.cvdl-sn:hover{ background:#4F24E0 !important; transform:translate(-1px,-1px); box-shadow:3px 3px 0 color-mix(in srgb, #6338F5 35%, transparent); }
html a.cvdl-sn:hover .cvdl-sn-ic{ transform:rotate(-12deg) scale(1.08); }
html a.cvdl-sn:hover .cvdl-sn-go{ opacity:1; transform:translateX(2px); }
html a.cvdl-sn:active{ transform:none; box-shadow:none; }
html .cvdl-sn:focus-visible{ outline:2.5px solid #002743; outline-offset:2px; }
html .cvdl-sn.code{ background:#FDECEC !important; color:#9E1F1E !important; border:1.5px dashed #E24B4A !important; cursor:copy; padding-right:11px; }
html .cvdl-sn.code .cvdl-sn-ic{ background:#E24B4A; color:#fff; }
html .cvdl-sn.code:hover{ background:#FBDADA !important; border-style:solid !important; }
html .cvdl-sn.copie{ animation:cvdl-sn-copie .65s ease-out; }
html .cvdl-sn.copie .cvdl-sn-cp{ opacity:1; animation:cvdl-sn-coche .65s ease-out; }
@keyframes cvdl-sn-copie{ 0%,35%{ box-shadow:0 0 0 3px #1F9D55, 0 0 0 6px color-mix(in srgb, #1F9D55 30%, transparent); } 100%{ box-shadow:0 0 0 0 transparent; } }
@keyframes cvdl-sn-coche{ 0%{ transform:scale(1); } 30%{ transform:scale(1.35); color:#9BF0BF; } 100%{ transform:scale(1); } }
html.cvdl-contraste .cvdl-sn{ background:#3A1DA8 !important; border:1.5px solid #002743 !important; }
.cvdl-pp-voile{ position:fixed; inset:0; z-index:8500; display:flex; align-items:center; justify-content:center; padding:16px; background:color-mix(in srgb, #002743 42%, transparent); opacity:0; transition:opacity .16s; }
.cvdl-pp-voile.vis{ opacity:1; }
.cvdl-pp{ position:relative; width:min(900px, 100%); height:min(88vh, 820px); display:flex; flex-direction:column; overflow:hidden; background:#fff; color:#002743; border:1.5px solid #002743; border-radius:22px; box-shadow:8px 8px 0 color-mix(in srgb, #002743 38%, transparent); font-family:Inter, system-ui, sans-serif; transform:translateY(14px) scale(.97); transition:transform .24s cubic-bezier(.2,.8,.2,1); }
.cvdl-pp-voile.vis .cvdl-pp{ transform:none; }
.cvdl-pp-fermer{ position:absolute; top:14px; right:14px; z-index:2; width:40px !important; height:40px !important; min-height:0 !important; border-radius:50% !important; border:1.5px solid #002743 !important; background:#fff !important; color:#002743 !important; display:inline-flex; align-items:center; justify-content:center; padding:0 !important; box-shadow:3px 3px 0 color-mix(in srgb, #E62460 45%, transparent); cursor:pointer; font-size:15px; transition:transform .12s, box-shadow .12s; }
.cvdl-pp-fermer:hover{ transform:translate(-1px,-1px); box-shadow:4px 4px 0 color-mix(in srgb, #E62460 55%, transparent); }
.cvdl-pp iframe{ flex:1; width:100%; border:0; background:#fff; }
.cvdl-pp-fermer:focus{ outline:none; } .cvdl-pp-fermer:focus-visible{ outline:2.5px solid #E62460; outline-offset:3px; }
@media (max-width:560px){ .cvdl-pp{ height:92vh; } }
@media (prefers-reduced-motion:reduce){ .cvdl-sn, .cvdl-pp, .cvdl-pp-voile{ transition:none !important; } }
html.cvdl-sans-anim .cvdl-sn, html.cvdl-sans-anim .cvdl-pp, html.cvdl-sans-anim .cvdl-pp-voile{ transition:none !important; }`;
  function injecterStyle(){
    if(document.getElementById('cvdl-sn-style')) return;
    const st = document.createElement('style'); st.id = 'cvdl-sn-style'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  if(document.head) injecterStyle(); else document.addEventListener('DOMContentLoaded', injecterStyle);

  window.piluleSerieCvdl = function(sn, opts){
    const o = opts || {};
    const n = String(sn == null ? '' : sn).trim();
    if(!n) return '';
    if(o.code) return `<span class="cvdl-sn code" data-copier-sn="${esc(n)}" title="Copier le code" tabindex="0" role="button"><span class="cvdl-sn-ic">${SVG.ticket}</span><span class="cvdl-sn-t">${esc(n)}</span></span>`;
    const url = `passeport.html?sn=${encodeURIComponent(n)}${o.query || ''}`;
    return `<a class="cvdl-sn" href="${esc(url)}" data-passeport-url="${esc(url)}" data-sn="${esc(n)}" title="Ouvrir le passeport de cet appareil"><span class="cvdl-sn-ic">${SVG.qr}</span><span class="cvdl-sn-t">${esc(n)}</span><button type="button" class="cvdl-sn-cp" data-copier-sn="${esc(n)}" title="Copier le numéro de série" aria-label="Copier le numéro de série ${esc(n)}">${SVG.copie}</button><span class="cvdl-sn-go">${SVG.go}</span></a>`;
  };
  /** Plusieurs numéros (texte multiligne ou tableau) → pilules côte à côte. */
  window.pilulesSeriesCvdl = function(liste, opts){
    const t = Array.isArray(liste) ? liste : String(liste || '').split('\n');
    const h = t.map(x => String(x).trim()).filter(Boolean).map(x => window.piluleSerieCvdl(x, opts)).join('');
    return h ? `<span style="display:inline-flex;gap:8px;flex-wrap:wrap">${h}</span>` : '';
  };

  function copier(el){
    const v = el.dataset.copierSn;
    const pil = el.closest('.cvdl-sn') || el;
    // Retour visuel immédiat et court (sans attendre la fin de l'écriture dans le presse-papier,
    // qui pouvait laisser la pilule verte plusieurs secondes) : la pilule « flashe » en vert
    // 0,6 s et l'icône devient une coche ; le survol reste actif pendant ce temps.
    clearTimeout(pil._copieT);
    pil.classList.remove('copie'); void pil.offsetWidth; pil.classList.add('copie');
    pil._copieT = setTimeout(() => pil.classList.remove('copie'), 650);
    try{ navigator.clipboard.writeText(v).catch(() => {}); }catch(e){ /* presse-papier indisponible */ }
  }
  /** Ouvre le passeport (url relative passeport.html?…) dans la modale. */
  window.ouvrirPasseportCvdl = function(url, sn){
    injecterStyle();
    const precedent = document.activeElement;
    const src = url + (url.includes('?') ? '&' : '?') + 'integre=1';
    const v = document.createElement('div');
    v.className = 'cvdl-pp-voile';
    v.innerHTML = `<div class="cvdl-pp" role="dialog" aria-modal="true" aria-label="Passeport de l’appareil ${esc(sn || '')}">
      <button type="button" class="cvdl-pp-fermer" aria-label="Fermer">✕</button>
      <iframe title="Passeport de l’appareil ${esc(sn || '')}" src="${esc(src)}"></iframe></div>`;
    const fermer = () => {
      document.removeEventListener('keydown', clavier, true);
      v.classList.remove('vis');
      setTimeout(() => v.remove(), 180);
      if(precedent && precedent.focus) precedent.focus();
    };
    const clavier = e => { if(e.key === 'Escape'){ e.stopPropagation(); e.preventDefault(); fermer(); } };
    v.addEventListener('click', e => { if(e.target === v || e.target.closest('.cvdl-pp-fermer')){ e.stopPropagation(); fermer(); } });
    document.addEventListener('keydown', clavier, true);
    document.body.appendChild(v);
    requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('vis')));
    v.querySelector('.cvdl-pp-fermer').focus();
  };

  // Capture : passe avant les gestionnaires des pages (ouverture de carte, de ligne…).
  document.addEventListener('click', e => {
    const cp = e.target.closest('[data-copier-sn]');
    if(cp){ e.preventDefault(); e.stopPropagation(); copier(cp); return; }
    const a = e.target.closest('[data-passeport-url]');
    if(!a) return;
    if(e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // nouvel onglet volontaire
    e.preventDefault(); e.stopPropagation();
    window.ouvrirPasseportCvdl(a.dataset.passeportUrl, a.dataset.sn);
  }, true);
  document.addEventListener('keydown', e => {
    if((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.cvdl-sn.code[data-copier-sn]')){ e.preventDefault(); copier(e.target); }
  }, true);
})();

/* ── Croix de fermeture garantie sur toutes les modales du portail (.voile-modale-qr) ──
   Plusieurs modales (création/modification de structure partenaire, nouveau tarif, QR…) ne
   proposaient qu'un bouton « Annuler » en bas, parfois hors de l'écran. Une croix est ajoutée
   en haut à droite de chaque modale qui n'en a pas ; elle reste visible même si la modale défile
   et déclenche le bouton de fermeture existant de la modale (même logique que « Annuler »).
   Échap ferme aussi la modale ouverte au premier plan. */
(function(){
  function boutonFermetureExistant(modale){
    const boutons = [...modale.querySelectorAll('button')];
    return boutons.find(b => /-fermer$/.test(b.id || '') && !b.classList.contains('cvdl-croix-auto'))
      || boutons.find(b => /^(annuler|fermer)$/i.test((b.textContent || '').trim()));
  }
  function fermer(voile){
    const modale = voile.querySelector('.modale-qr') || voile;
    const b = boutonFermetureExistant(modale);
    if(b) b.click(); else voile.classList.remove('visible');
  }
  function equiper(){
    document.querySelectorAll('.voile-modale-qr').forEach(voile => {
      const modale = voile.querySelector('.modale-qr');
      if(!modale || modale.querySelector('.modale-fermer-rond-qr, .cvdl-croix-auto')) return;
      const croix = document.createElement('button');
      croix.type = 'button';
      croix.className = 'modale-fermer-rond-qr cvdl-croix-auto';
      croix.setAttribute('aria-label', 'Fermer');
      croix.textContent = '✕';
      croix.addEventListener('click', () => fermer(voile));
      modale.prepend(croix);
    });
  }
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    const ouvertes = [...document.querySelectorAll('.voile-modale-qr.visible')];
    if(!ouvertes.length || document.querySelector('.cvdl-pp-voile')) return;
    fermer(ouvertes[ouvertes.length - 1]);
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', equiper);
  else equiper();
  window.cvdlEquiperModales = equiper;
})();

/* ── Bandeau « Mode démo » ──
   Actif quand demo.html a posé le repère cvdl-mode-demo (8 h) : toutes les pages parlent alors à
   la fonction de démonstration (données fictives). Le bandeau le rappelle partout, avec un retour
   au choix du profil et une sortie qui efface le repère et les accès de démonstration. */
(function(){
  let actif = false;
  // Site de démo dédié (publié dans un dossier « …demo… », ex. ec-cvdl.github.io/cvdl-demo/) : toujours en démo.
  const dossier = location.pathname.split('/')[1] || '';
  const siteDemo = /demo/i.test(dossier) && !/\.html$/i.test(dossier);
  try{ const d = JSON.parse(localStorage.getItem('cvdl-mode-demo') || 'null'); actif = siteDemo || !!(d && d.jusqua > Date.now()); }catch(e){ actif = siteDemo; }
  if(!actif || /demo\.html$/.test(location.pathname)) return;
  document.documentElement.classList.add('cvdl-demo');
  function poser(){
    if(document.getElementById('cvdl-bandeau-demo')) return;
    const b = document.createElement('div');
    b.id = 'cvdl-bandeau-demo';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;gap:10px;'
      + 'background:#002743;color:#fff;border-radius:999px;padding:7px 8px 7px 14px;font:600 13px/1.2 system-ui,sans-serif;'
      + 'box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100vw - 24px)';
    b.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#00ACB0;flex:none"></span>'
      + '<span>Mode démo · données fictives</span>'
      + '<a href="demo.html" style="color:#002743;background:#fff;border-radius:999px;padding:5px 10px;text-decoration:none;white-space:nowrap">Changer de profil</a>'
      + (siteDemo ? '' : '<a href="demo.html?quitter=1" style="color:#fff;opacity:.8;padding:5px 6px;text-decoration:underline;white-space:nowrap">Quitter</a>');
    document.body.appendChild(b);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser); else poser();
})();
