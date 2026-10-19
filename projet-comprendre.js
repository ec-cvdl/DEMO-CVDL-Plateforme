/* Onglet « Comprendre CVDL » de projet.html (admin seulement) : dossier de conception interne,
   fait de blocs rangés par partie (cheminement — rendez-vous, décisions et étapes —, structures,
   équipe, choix, suites…). En mode édition : ajouter, modifier (texte mis en forme, images),
   masquer, monter / descendre, supprimer ; les nouvelles mises à jour du journal sont proposées à
   l'intégration (ou ignorées). Routes : comprendre, comprendre-enregistrer, -supprimer,
   -deplacer, -ignorer (src/routes/comprendre.js). Panneau d'édition, mode édition et journal :
   ceux de pages/projet.js (ouvrirPanneau, fermerPanneau, P.edition, entreesJournal, toast).
   ComprendreProjet.rendre(zone, appel) dans l'onglet ; ComprendreProjet.afficher(zone, données) en
   lecture seule (comprendre.html, lien de partage). */
window.ComprendreProjet = (function () {
  // Mises à jour proposées : celles publiées après la dernière reprise complète du dossier.
  const DEPUIS = '2026-10-14';
  const ILL = {
    structure: [
      'm',
      '<rect x="11" y="12" width="26" height="28" rx="2"/>',
      '<rect x="9" y="10" width="26" height="28" rx="2"/><path d="M15 16h3M21 16h3M27 16h2M15 22h3M21 22h3M27 22h2M15 28h3M27 28h2M19 38v-7h6v7M4 38h36"/>',
    ],
    structures: [
      't',
      '<rect x="9" y="16" width="14" height="24" rx="2"/><rect x="27" y="10" width="14" height="30" rx="2"/>',
      '<rect x="7" y="14" width="14" height="24" rx="2"/><rect x="25" y="8" width="14" height="30" rx="2"/><path d="M11 20h2M16 20h2M11 26h2M16 26h2M29 14h2M34 14h2M29 20h2M34 20h2M29 26h2M34 26h2M12 38v-5h4v5M30 38v-5h4v5M3 38h40"/>',
    ],
    stock: [
      't',
      '<rect x="9" y="24" width="15" height="15" rx="2"/><rect x="26" y="24" width="15" height="15" rx="2"/>',
      '<rect x="7" y="22" width="15" height="15" rx="2"/><rect x="24" y="22" width="15" height="15" rx="2"/><rect x="15.5" y="5" width="15" height="14" rx="2" fill="var(--ill-fond)"/><path d="M14.5 22v5M31.5 22v5M23 5v5M3 40h40"/>',
    ],
    personne: [
      't',
      '<circle cx="25" cy="17" r="8"/><path d="M11 41a14 14 0 0 1 28 0z"/>',
      '<circle cx="23" cy="15" r="7"/><path d="M9 39a14 14 0 0 1 28 0"/><path d="M33 9l3-3M36 13h4"/>',
    ],
    commander: [
      'm',
      '<rect x="13" y="15" width="26" height="15" rx="3"/>',
      '<path d="M4 7h6l4 21h22l4-15H12"/><circle cx="17" cy="37" r="3" fill="var(--ill-fond)"/><circle cx="33" cy="37" r="3" fill="var(--ill-fond)"/><path d="M20 20h10M25 15v10"/>',
    ],
    commandes: [
      'm',
      '<path d="M10 17 24 10l14 7v16l-14 7-14-7z"/>',
      '<path d="M8 15 22 8l14 7v16l-14 7-14-7z"/><path d="M8 15l14 7 14-7M22 22v16"/><rect x="28" y="26" width="16" height="16" rx="4" fill="var(--ill-fond)"/><path d="m32 34 2.5 2.5L40 31"/>',
    ],
    flotte: [
      't',
      '<rect x="8" y="12" width="26" height="18" rx="3"/><rect x="30" y="18" width="12" height="20" rx="3"/>',
      '<rect x="6" y="10" width="26" height="18" rx="3"/><path d="M3 32h32"/><rect x="31" y="16" width="12" height="22" rx="2.5" fill="var(--ill-fond)"/><path d="M35.5 34h3"/>',
    ],
    partenairesCmd: [
      'm',
      '<path d="M10 18 24 11l14 7v14l-14 7-14-7z"/>',
      '<path d="M8 16 22 9l14 7v14l-14 7-14-7z"/><path d="M8 16l14 7 14-7M22 23v14M15 12.5 29 19.5"/><circle cx="37" cy="36" r="7" fill="var(--ill-fond)"/><path d="M34 36h6M37.5 33.5 40 36l-2.5 2.5"/>',
    ],
    facture: [
      'm',
      '<path d="M12 8h24v32l-4-3-4 3-4-3-4 3-4-3-4 3z"/>',
      '<path d="M10 6h24v32l-4-3-4 3-4-3-4 3-4-3-4 3z"/><path d="M15 13h14M15 19h14M15 25h8"/><circle cx="33" cy="31" r="7" fill="var(--ill-fond)"/><path d="M35.5 28.5a3.2 3.2 0 1 0 0 5M30 30.2h4M30 32.2h3.4"/>',
    ],
    passeport: [
      'm',
      '<rect x="12" y="8" width="26" height="33" rx="3"/>',
      '<rect x="10" y="6" width="26" height="33" rx="3"/><circle cx="23" cy="18" r="5"/><path d="M18 18h10M23 13c-2 3-2 7 0 10M23 13c2 3 2 7 0 10M16 30h14M18 34h10"/>',
    ],
    panne: [
      't',
      '<rect x="7" y="13" width="24" height="16" rx="3"/><path transform="translate(19 11) scale(1.25)" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
      '<rect x="5" y="11" width="24" height="16" rx="3"/><path d="M2 31h22"/><path vector-effect="non-scaling-stroke" transform="translate(17 9) scale(1.25)" fill="var(--ill-fond)" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    ],
    impact: [
      't',
      '<circle cx="25" cy="25" r="16"/>',
      '<circle cx="23" cy="23" r="16"/><path d="M8 20h8l3 4-2 5 4 4v8M30 8l-2 6 4 3h8"/><path d="M28 40c0-9 5-15 14-16-1 9-6 14-14 16z" fill="var(--ill-fond)"/><path d="M28 40l8-9"/>',
    ],
    cle: [
      't',
      '<circle cx="17" cy="27" r="9"/>',
      '<circle cx="15" cy="25" r="8"/><circle cx="15" cy="25" r="2.5"/><path d="M21 19 38 8M32 12l4 5M27.5 15l3 4"/>',
    ],
    distribution: [
      't',
      '<path d="M9 20 21 14l12 6v14l-12 6-12-6z"/>',
      '<path d="M7 18 19 12l12 6v14l-12 6-12-6z"/><path d="M7 18l12 6 12-6M19 24v14"/><path d="M34 12h8M38 8l4 4-4 4M34 26h8M38 22l4 4-4 4"/>',
    ],
    tableau: [
      't',
      '<rect x="10" y="10" width="30" height="28" rx="3"/>',
      '<rect x="8" y="8" width="30" height="28" rx="3"/><path d="M8 15h30"/><rect x="12" y="20" width="7" height="12" rx="1.5" fill="var(--ill-fond)"/><rect x="22" y="25" width="5" height="7" rx="1.5"/><rect x="30" y="22" width="4" height="10" rx="1.5"/>',
    ],
    attestations: [
      'm',
      '<rect x="12" y="8" width="24" height="32" rx="3"/>',
      '<path d="M30 40H11a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h17l8 8v9"/><path d="M28 6v8h8M14 18h10M14 23h14M14 28h8"/><circle cx="34" cy="31" r="6" fill="var(--ill-fond)"/><path d="m30.5 36-1.5 6 5-2.5 5 2.5-1.5-6"/>',
    ],
    reglages: [
      't',
      '<circle cx="25" cy="25" r="13"/>',
      '<circle cx="23" cy="23" r="12"/><circle cx="23" cy="23" r="5" fill="var(--ill-fond)"/><path d="M23 5v5M23 36v5M5 23h5M36 23h5M10.3 10.3l3.5 3.5M32.2 32.2l3.5 3.5M10.3 35.7l3.5-3.5M32.2 13.8l3.5-3.5"/>',
    ],
    stats: [
      'm',
      '<path d="M10 40V26h6v14zM21 40V18h6v22zM32 40V10h6v30z"/>',
      '<path d="M5 40h38"/><rect x="9" y="26" width="6" height="14" rx="1"/><rect x="20" y="18" width="6" height="22" rx="1" fill="var(--ill-fond)"/><rect x="31" y="10" width="6" height="30" rx="1"/><path d="M8 20l10-8 8 5 13-10"/>',
    ],
    calendrier: [
      'm',
      '<rect x="9" y="12" width="32" height="28" rx="3"/>',
      '<rect x="7" y="10" width="32" height="28" rx="3"/><path d="M7 18h32M15 6v8M31 6v8"/><rect x="13" y="23" width="6" height="5" rx="1" fill="var(--ill-fond)"/><path d="M24 25.5h9M13 32.5h6M24 32.5h9"/>',
    ],
    tarifs: [
      'm',
      '<path d="M26 8h14v14L22 40 8 26z"/>',
      '<path d="M24 6h14v14L20 38 6 24z"/><circle cx="31.5" cy="12.5" r="2.5"/><path d="M24.5 22.5a5 5 0 1 0 0 6.5M16 24.2h7M16.5 27.2h6"/>',
    ],
    aide: [
      't',
      '<path d="M12 12h22l5 5-5 5H12z"/>',
      '<path d="M22 4v38"/><path d="M10 10h22l5 5-5 5H10z"/><path d="M34 24H14l-5 5 5 5h20z" fill="var(--ill-fond)"/><path d="M16 42h12"/>',
    ],
    enquete: [
      'm',
      '<path d="M10 12h30a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H22l-8 7v-7h-4a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z"/>',
      '<path d="M8 10h30a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H20l-8 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="m23 14.5 2.2 4.4 4.8.6-3.5 3.3.9 4.8L23 25.2l-4.4 2.4.9-4.8-3.5-3.3 4.8-.6z"/>',
    ],
    suiviSav: [
      't',
      '<rect x="12" y="10" width="26" height="30" rx="3"/>',
      '<rect x="10" y="8" width="26" height="32" rx="3"/><rect x="17" y="5" width="12" height="6" rx="2" fill="var(--ill-fond)"/><path d="M14 26h5l3-6 4 10 3-6h4"/>',
    ],
  };
  // Schémas fixes (règles de la plateforme) : tableau par type, parcours, architecture.
  const FIXE = {
    coup: `<div class="legende"><span><i class="pt oui"></i>Oui</span><span><i class="pt mi"></i>Selon le cas</span><span><i class="pt non"></i>Non</span></div>
    <div class="defile"><table>
      <thead><tr><th scope="col" style="text-align:left">Pour la structure</th><th scope="col">Interne</th><th scope="col">ESN<small style="display:block;font:500 11px var(--corps);color:var(--texte-doux)">en réserve</small></th><th scope="col">Vente solidaire</th><th scope="col">Relais Numérique</th><th scope="col">Projets<small style="display:block;font:500 11px var(--corps);color:var(--texte-doux)">en réserve</small></th><th scope="col">+ Dépôt-vente</th></tr></thead>
      <tbody>
        <tr><th scope="row">Paie à la commande</th><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i><small>virement</small></td><td><i class="pt mi"></i><small>fixé par l'équipe</small></td><td><i class="pt non"></i><small>payé à la vente</small></td></tr>
        <tr><th scope="row">Voit les prix</th><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i><small>tarif convention</small></td><td><i class="pt non"></i></td><td><i class="pt mi"></i><small>selon le type</small></td></tr>
        <tr><th scope="row">Reçoit devis et facture</th><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i></td><td><i class="pt mi"></i><small>facture à chaque vente si choisi</small></td></tr>
        <tr><th scope="row">Nomme les personnes</th><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt oui"></i><small>une par appareil</small></td><td><i class="pt non"></i></td><td><i class="pt mi"></i><small>si nominatif</small></td><td><i class="pt non"></i></td></tr>
        <tr><th scope="row">Crée des partenaires</th><td><i class="pt oui"></i></td><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt non"></i></td><td><i class="pt non"></i></td></tr>
        <tr><th scope="row">Flotte suivie dans CVDL</th><td><i class="pt oui"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i></td><td><i class="pt oui"></i><small>« Vendu » au lieu de « Remis »</small></td></tr>
        <tr><th scope="row">Commande validée par</th><td>Logistique CVDL</td><td>Logistique CVDL</td><td>Logistique CVDL<small>ou son Interne si partenaire</small></td><td>Logistique CVDL</td><td>Logistique CVDL</td><td>Logistique CVDL</td></tr>
      </tbody>
    </table></div>`,
    parcours: `<div class="legende"><span><i class="forme losange"></i>En attente d'une décision</span><span><i class="forme carre"></i>En cours</span><span><i class="forme rond"></i>Terminé</span></div>
    <div class="couloir"><span class="nom"><span data-ill="stock" class="ill m" style="width:28px;height:28px"></span>Circuit CVDL — toutes les structures sauf Vente solidaire partenaire</span>
      <div class="etapes">
        <div class="etp"><span class="t"><i class="forme losange"></i>Reçue</span><p>Enregistrée avec les contrôles du type ; stock retiré, équipe prévenue.</p></div>
        <div class="etp"><span class="t"><i class="forme losange"></i>Validée</span><p>La logistique confirme par un lien e-mail, ou validation directe.</p></div>
        <div class="etp"><span class="t"><i class="forme carre"></i>Préparée</span><p>N° de série saisis ; devis ou facture si le type l'exige.</p></div>
        <div class="etp"><span class="t"><i class="forme carre"></i>En livraison</span><p>Mode d'envoi choisi ; suivi Colissimo partagé.</p></div>
        <div class="etp fin"><span class="t"><i class="forme rond"></i>Livrée</span><p>Date posée, appareils ajoutés à la flotte de la structure.</p></div>
      </div></div>
    <div class="transfert"><svg width="22" height="34" viewBox="0 0 22 34" aria-hidden="true"><path d="M11 32V4M4 11l7-7 7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>L'Interne peut transférer la commande de son partenaire à l'équipe CVDL tant qu'elle n'est pas préparée.</div>
    <div class="couloir"><span class="nom"><span data-ill="structures" class="ill t" style="width:28px;height:28px"></span>Circuit Interne — Vente solidaire partenaire, servie par son territoire</span>
      <div class="etapes">
        <div class="etp"><span class="t"><i class="forme losange"></i>Reçue</span><p>Visible par l'Interne seule.</p></div>
        <div class="etp"><span class="t"><i class="forme losange"></i>Validée</span><p>Par l'Interne, qui prend les appareils dans sa propre flotte.</p></div>
        <div class="etp"><span class="t"><i class="forme carre"></i>Préparée</span><p>N° de série saisis.</p></div>
        <div class="etp"><span class="t"><i class="forme carre"></i>En livraison</span><p>Suivi Colissimo si besoin.</p></div>
        <div class="etp fin"><span class="t"><i class="forme rond"></i>Livrée</span><p>Flotte du partenaire, inscrit au journal.</p></div>
      </div></div>`,
    archi: `<div class="carte archi"><svg viewBox="0 0 1000 300" role="img" aria-label="Le site appelle l'API, qui seule lit et écrit la base PostgreSQL et parle aux services Google, e-mail et tec.tech">
      <defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="fl"/></marker></defs>
      <rect class="ombre" x="25" y="85" width="250" height="110" rx="16"/><rect class="b" x="20" y="80" width="250" height="110" rx="16"/>
      <text class="n" x="40" y="116">Le site</text><text class="d" x="40" y="142">Pages statiques, Google Cloud</text><text class="d" x="40" y="162">Aucun secret, aucune règle</text>
      <rect class="ombre" x="380" y="85" width="250" height="110" rx="16"/><rect class="bp" x="375" y="80" width="250" height="110" rx="16"/>
      <text class="n" x="395" y="116">L'API</text><text class="d" x="395" y="142">Node.js, Google Cloud</text><text class="d" x="395" y="162">Contrôle d'accès, règles par type</text>
      <rect class="ombre" x="735" y="85" width="245" height="110" rx="16"/><rect class="b" x="730" y="80" width="245" height="110" rx="16"/>
      <text class="n" x="750" y="116">PostgreSQL</text><text class="d" x="750" y="142">Toutes les données</text><text class="d" x="750" y="162">Schéma versionné</text>
      <path class="l" d="M270 135H373" marker-end="url(#fl)"/><path class="l" d="M625 135H728" marker-end="url(#fl)"/>
      <rect class="b" x="300" y="236" width="150" height="50" rx="12"/><text class="n" x="316" y="260" style="font-size:14px">Google Drive</text><text class="d" x="316" y="278" style="font-size:12px">documents, fichiers</text>
      <rect class="b" x="470" y="236" width="150" height="50" rx="12"/><text class="n" x="486" y="260" style="font-size:14px">Brevo / Gmail</text><text class="d" x="486" y="278" style="font-size:12px">e-mails</text>
      <rect class="b" x="640" y="236" width="150" height="50" rx="12"/><text class="n" x="656" y="260" style="font-size:14px">tec.tech</text><text class="d" x="656" y="278" style="font-size:12px">lecture seule</text>
      <path class="lp" d="M450 190V215H375V234" marker-end="url(#fl)"/><path class="lp" d="M500 190V234" marker-end="url(#fl)"/><path class="lp" d="M550 190V215H715V234" marker-end="url(#fl)"/>
      <text class="d" x="40" y="44" style="font-size:14px">Navigateur des structures, de l'équipe et des personnes</text><path class="lp" d="M145 54V78" marker-end="url(#fl)"/>
    </svg></div>`,
  };
  const TYPES = { etape: 'Étape', 'rendez-vous': 'Rendez-vous', decision: 'Décision' };
  const FORMES = {
    carte: 'Carte',
    principe: 'Principe (bandeau)',
    reserve: 'En réserve (pointillés)',
    option: 'Option',
    chiffre: 'Chiffre clé',
    citation: 'Citation / témoignage',
    comparaison: 'Comparaison (deux colonnes)',
    image: 'Image avec légende',
    faq: 'Question / réponse (dépliable)',
    encadre: 'Encadré coloré',
  };
  // Formes rendues de la même façon dans toutes les parties en grille.
  const SPECIALES = ['chiffre', 'citation', 'comparaison', 'image', 'faq', 'encadre'];
  const TONS = { info: 'Info', retenir: 'À retenir', attention: 'Attention' };
  // Aide et champs propres à chaque forme spéciale (en plus du titre et du texte).
  const AIDE_FORME = {
    chiffre: 'Titre = libellé sous le chiffre (ex. « structures accompagnées »). Chiffre saisi, ou calculé en direct.',
    citation: 'Texte = la citation ; titre = la personne ; sous-titre = son rôle ou sa structure.',
    comparaison: 'Deux colonnes côte à côte : Avant / Après, Pour / Contre…',
    image: 'Collez ou insérez l’image dans le texte ; le titre et la note forment la légende.',
    faq: 'Titre = la question ; texte = la réponse, dépliée au clic.',
    encadre: 'Un encadré coloré pour ce qu’il faut retenir ou ce qui demande de l’attention.',
  };
  const CHAMPS_FORME = {
    chiffre: ['valeur', 'mesure', 'note', 'ill'],
    citation: ['sousTitre', 'ill'],
    comparaison: ['libelles', 'texte2'],
    image: ['note'],
    faq: [],
    encadre: ['ton'],
  };
  const BARRE = [
    ['bold', '<b>G</b>', 'Gras'],
    ['italic', '<i>I</i>', 'Italique'],
    ['underline', '<u>S</u>', 'Souligné'],
    null,
    ['h3', 'T', 'Intertitre'],
    ['insertUnorderedList', '•', 'Liste à puces'],
    ['insertOrderedList', '1.', 'Liste numérotée'],
    ['blockquote', '❝', 'Citation'],
    null,
    ['lien', '🔗', 'Lien'],
    ['image', '🖼', 'Image'],
  ];
  const IMAGE_MAX_PX = 1600;
  const IMAGE_MAX_CAR = 2_700_000;
  const C = {
    zone: null,
    appel: null,
    blocs: [],
    traitees: new Set(),
    parties: {},
    libres: [],
    mesures: {},
    libellesMesures: {},
    emplacements: {},
    charge: false,
    lecture: false,
  };
  // Mode édition de l'onglet Projet (jamais en lecture seule ni pendant un export).
  const edition = () => !C.lecture && !C.export && typeof P !== 'undefined' && P.edition;
  const notifier = (m, o) => (typeof toast === 'function' ? toast(m, o) : null);

  const dateLongue = (iso) =>
    iso
      ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
  const dateFr = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  const ill = (cle, taille, couleur) => {
    const d = ILL[cle];
    return d
      ? `<span class="ill ${taille || ''} ${couleur || d[0]}" aria-hidden="true"><svg viewBox="0 0 48 48"><g class="ill-fond">${d[1]}</g><g class="ill-trait">${d[2]}</g></svg></span>`
      : '';
  };

  async function charger() {
    const r = await C.appel('comprendre');
    if (!r.ok) {
      C.zone.innerHTML = `<p class="pj-chargement">${echapper(r.erreur || 'Dossier indisponible.')}</p>`;
      return false;
    }
    Object.assign(C, {
      blocs: r.blocs,
      traitees: new Set(r.traitees),
      parties: r.parties,
      libres: r.libres || [],
      mesures: r.mesures || {},
      libellesMesures: r.libellesMesures || {},
      emplacements: r.emplacements || {},
      charge: true,
    });
    return true;
  }
  async function rendre(zone, appel) {
    Object.assign(C, { zone, appel });
    if (!C.charge) {
      zone.innerHTML = '<p class="pj-chargement">Chargement…</p>';
      if (!(await charger())) return;
    }
    zone.innerHTML = page();
    animer(zone);
    preparerGlisser(zone);
  }
  async function recharger() {
    if (!(await charger())) return;
    C.zone.innerHTML = page();
    animer(C.zone);
    preparerGlisser(C.zone);
  }

  /** Lecture seule (lien de partage) : données déjà lues par la page. */
  function afficher(zone, donnees) {
    Object.assign(C, {
      zone,
      blocs: donnees.blocs,
      parties: donnees.parties,
      libres: donnees.libres || [],
      mesures: donnees.mesures || {},
      charge: true,
      lecture: true,
    });
    zone.innerHTML = page();
    animer(zone);
  }

  /* Lien de partage : adresse fixe de comprendre.html, jeton après #, toujours à jour. */
  async function partage(faire) {
    if (faire === 'creer' && C.jeton && !confirm('Créer un nouveau lien ? L’ancien ne fonctionnera plus.')) return;
    if (faire === 'couper' && !confirm('Couper le lien ? Plus personne ne pourra l’ouvrir.')) return;
    const r = await C.appel('comprendre-lien', { faire });
    if (!r.ok) return notifier(r.erreur || 'Lien indisponible.', { erreur: true });
    C.jeton = r.jeton;
    const lien = r.jeton ? new URL(`comprendre.html#${r.jeton}`, location.href).href : '';
    ouvrirPanneau(
      `<span class="cvdl-surtitre" style="color:var(--tur)">Comprendre CVDL</span>
      <h2 id="pj-panneau-titre">Lien de partage</h2>
      <p class="pj-sous">Une adresse fixe, en lecture seule et toujours à jour : chaque modification du dossier y apparaît aussitôt. Les blocs masqués n’y sont pas. Quiconque a le lien peut lire le dossier : partagez-le en interne seulement.</p>
      ${
        lien
          ? `<div class="pj-ch"><label for="cc-lien">Lien</label><input class="input" id="cc-lien" readonly value="${echapper(lien)}"></div>
        <div class="pj-actions"><button type="button" class="btn btn-primary" data-cc-lien-copier>Copier le lien</button><a class="btn btn-secondary" href="${echapper(lien)}" target="_blank" rel="noopener">Ouvrir</a><span class="espace"></span>
        <button type="button" class="btn btn-ghost" data-cc-lien="creer">Nouveau lien</button><button type="button" class="btn btn-danger" data-cc-lien="couper">Couper le lien</button></div>`
          : `<p>Aucun lien pour l’instant.</p><div class="pj-actions"><button type="button" class="btn btn-primary" data-cc-lien="creer">Créer le lien</button></div>`
      }`,
      (p) =>
        p.addEventListener('click', (e) => {
          const b = e.target.closest('[data-cc-lien]');
          if (b) return partage(b.dataset.ccLien);
          if (e.target.closest('[data-cc-lien-copier]'))
            navigator.clipboard.writeText(lien).then(
              () => notifier('Lien copié'),
              () => $('cc-lien').select(),
            );
        }),
    );
  }

  /* ── Rendu ── */
  const de = (partie) => C.blocs.filter((b) => b.partie === partie && (edition() || !b.masque));
  function outils(b, deplacable = true) {
    if (!edition()) return '';
    return `<span class="cc-outils">${
      deplacable && !['chemin', 'intro'].includes(b.partie)
        ? '<span class="cc-poignee" title="Glisser pour déplacer, y compris vers une autre partie" aria-hidden="true">⠿</span>'
        : ''
    }${
      deplacable
        ? `<button type="button" data-cc-sens="-1" data-cc-id="${b.id}" title="Monter" aria-label="Monter">↑</button><button type="button" data-cc-sens="1" data-cc-id="${b.id}" title="Descendre" aria-label="Descendre">↓</button>`
        : ''
    }<button type="button" data-cc-masquer="${b.id}" title="${b.masque ? 'Afficher' : 'Masquer'}">${b.masque ? 'Afficher' : 'Masquer'}</button><button type="button" data-cc-modifier="${b.id}">Modifier</button></span>`;
  }
  const cls = (b) => (b.masque ? ' cc-masque' : '');
  const ajouter = (partie, libelle = 'Ajouter') =>
    edition() ? `<button type="button" class="cc-ajouter" data-cc-ajouter="${partie}">＋ ${libelle}</button>` : '';
  const entete = (n, sur, titre, texte) =>
    `<div class="entete"><span class="sur">${n} · ${sur}</span><h2>${titre}</h2>${texte ? `<p class="doux">${texte}</p>` : ''}</div>`;

  /** Formes spéciales (chiffre, citation, comparaison, image, FAQ, encadré), dans toute grille. */
  function speciale(b) {
    const o = outils(b);
    const c = cls(b);
    if (b.forme === 'chiffre') {
      const n = b.mesure ? C.mesures[b.mesure] : null;
      const affiche = n != null ? Number(n).toLocaleString('fr-FR') : b.valeur;
      return `<article class="carte cc-bloc cc-chiffre${c}">${ill(b.ill)}<b class="cc-nombre"${n != null ? ` data-cc-compte="${Number(n)}"` : ''}>${echapper(affiche || '—')}</b><span class="cc-libelle">${echapper(b.titre)}</span>${
        b.note ? `<small>${echapper(b.note)}</small>` : ''
      }${b.mesure ? '<em class="cc-direct">en direct</em>' : ''}${o}</article>`;
    }
    if (b.forme === 'citation')
      return `<figure class="cc-bloc cc-citation cc-large${c}"><span class="cc-guillemet" aria-hidden="true">“</span><blockquote class="cc-texte">${b.texte}</blockquote><figcaption>${ill(b.ill || 'personne')}<b>${echapper(b.titre)}</b>${
        b.sousTitre ? `<span>${echapper(b.sousTitre)}</span>` : ''
      }</figcaption>${o}</figure>`;
    if (b.forme === 'comparaison')
      return `<article class="carte cc-bloc cc-comparaison cc-large${c}"><h3>${echapper(b.titre)}</h3><div class="cc-colonnes">
        <div class="cc-col cc-col-a"><span class="cc-col-tete">${echapper(b.libelleA || 'Avant')}</span><div class="cc-texte">${b.texte}</div></div>
        <span class="cc-fleche" aria-hidden="true">→</span>
        <div class="cc-col cc-col-b"><span class="cc-col-tete">${echapper(b.libelleB || 'Après')}</span><div class="cc-texte">${b.texte2}</div></div>
      </div>${o}</article>`;
    if (b.forme === 'image')
      return `<figure class="cc-bloc cc-image cc-large${c}"><div class="cc-texte">${b.texte}</div><figcaption><b>${echapper(b.titre)}</b>${
        b.note ? ` — ${echapper(b.note)}` : ''
      }</figcaption>${o}</figure>`;
    if (b.forme === 'faq')
      return `<details class="cc-bloc cc-faq cc-large${c}"><summary>${echapper(b.titre)}</summary><div class="cc-texte">${b.texte}</div>${o}</details>`;
    const symbole = { info: 'i', retenir: '★', attention: '!' }[b.ton] || 'i';
    return `<aside class="cc-bloc cc-encadre cc-ton-${b.ton || 'info'} cc-large${c}"><span class="cc-ton" aria-hidden="true">${symbole}</span><div><span class="cc-ton-libelle">${TONS[b.ton] || 'Info'}</span><h3>${echapper(b.titre)}</h3><div class="cc-texte">${b.texte}</div></div>${o}</aside>`;
  }
  const ouSpeciale = (rendu) => (b, i) => (SPECIALES.includes(b.forme) ? speciale(b) : rendu(b, i));

  /** Parties libres placées après la partie `cle` du dossier. */
  function libresApres(cle) {
    const liste = C.libres.filter((p) => p.apres === cle && (edition() || !p.masque));
    const nouvelle = edition()
      ? `<div class="wrap"><button type="button" class="cc-ajouter cc-nouvelle" data-cc-nouvelle-partie="${cle}">＋ Nouvelle partie ici</button></div>`
      : '';
    return (
      `<div class="cc-libres" data-cc-emplacement="${cle}">` +
      liste
        .map((p) => {
          const blocs = C.blocs.filter((b) => b.partieLibre === p.id && (edition() || !b.masque));
          const outilsPartie = edition()
            ? `<span class="cc-outils cc-outils-partie"><span class="cc-poignee" title="Glisser la partie pour la déplacer" aria-hidden="true">⠿</span><button type="button" data-cc-partie-sens="-1" data-cc-partie="${p.id}" aria-label="Monter la partie">↑</button><button type="button" data-cc-partie-sens="1" data-cc-partie="${p.id}" aria-label="Descendre la partie">↓</button><button type="button" data-cc-partie-modifier="${p.id}">Modifier la partie</button></span>`
            : '';
          return `<section class="wrap bloc cc-libre cc-bloc${p.masque ? ' cc-masque' : ''}" data-cc-partie-glisse="${p.id}">
          <div class="entete">${p.surtitre ? `<span class="sur">${echapper(p.surtitre)}</span>` : ''}<h2>${echapper(p.titre)}</h2>${
            p.sousTitre ? `<p class="doux">${echapper(p.sousTitre)}</p>` : ''
          }</div>${outilsPartie}
          <div class="cc-grille cc-cols-${p.disposition}" data-cc-zone="libre:${p.id}">${blocs.map(ouSpeciale(carte)).join('')}</div>${ajouter(`libre:${p.id}`, 'Ajouter un bloc')}
        </section>`;
        })
        .join('') +
      '</div>' +
      nouvelle
    );
  }

  function carte(b) {
    if (b.forme === 'principe')
      return `<div class="regle-or cc-bloc${cls(b)}">${ill(b.ill || 'cle', 'xl')}<div><p class="grand">${echapper(b.titre)}</p><div class="cc-texte">${b.texte}</div></div>${outils(b)}</div>`;
    const forme = b.forme === 'reserve' ? ' en-reserve' : b.forme === 'option' ? ' option' : '';
    return `<article class="carte cc-bloc${forme}${cls(b)}"><div class="type-tete">${ill(b.ill, 'xl')}<div><h3>${echapper(b.titre)}${
      b.etiquette ? ` <span class="masque">${echapper(b.etiquette)}</span>` : ''
    }</h3>${b.sousTitre ? `<p class="qui">${echapper(b.sousTitre)}</p>` : ''}</div></div>
      ${b.texte ? `<div class="cc-texte">${b.texte}</div>` : ''}
      ${b.note ? `<p class="pourquoi"><b>Pourquoi</b>${echapper(b.note)}</p>` : ''}${outils(b)}</article>`;
  }
  function cartes(partie, style) {
    const liste = de(partie);
    const principes = liste.filter((b) => b.forme === 'principe');
    const autres = liste.filter((b) => b.forme !== 'principe');
    return `${principes.map(carte).join('')}<div class="types" data-cc-zone="${partie}"${style ? ` style="${style}"` : ''}>${autres.map(ouSpeciale(carte)).join('')}</div>${ajouter(partie)}`;
  }

  /** Bandeau « en chiffres » sous l'introduction : chiffres calculés en direct, comptés à l'écran. */
  const CHIFFRES_TETE = [
    ['structures', 'structures partenaires', 'structures', 'm'],
    ['departements', 'départements couverts', 'distribution', 't'],
    ['appareils-livres', 'appareils livrés', 'flotte', 'm'],
    ['appareils-remis', 'appareils remis ou vendus', 'personne', 't'],
  ];
  function chiffresTete() {
    const liste = CHIFFRES_TETE.filter(([k]) => C.mesures && C.mesures[k] != null);
    if (!liste.length) return '';
    return `<section class="wrap cc-chiffres" aria-label="CVDL en chiffres"><p class="cc-chiffres-titre">CVDL aujourd’hui</p>${liste
      .map(
        ([k, libelle, i, c]) =>
          `<div class="cc-chiffre-cle">${ill(i, '', c)}<b data-cc-compte="${Number(C.mesures[k])}">${Number(C.mesures[k]).toLocaleString('fr-FR')}</b><span>${libelle}</span></div>`,
      )
      .join(
        '',
      )}<p class="cc-chiffres-note">En direct, au ${dateFr(new Date().toISOString().slice(0, 10))}</p></section>`;
  }

  function propositions() {
    if (!edition() || typeof entreesJournal !== 'function') return '';
    const liste = entreesJournal().filter((e) => e.date > DEPUIS && !e.masque && !C.traitees.has(e.cle));
    if (!liste.length) return '';
    return `<section class="wrap cc-props"><h3>À intégrer <span>${liste.length}</span></h3>
      <p class="doux">Mises à jour publiées depuis la dernière reprise du dossier : intégrez ce qui compte (dans la partie de votre choix), ignorez le reste.</p>
      <ul>${liste
        .slice(0, 12)
        .map(
          (e) =>
            `<li><span><small>${echapper(dateFr(e.date))}</small><b>${echapper(e.titre)}</b></span><button type="button" class="btn btn-primary btn-sm" data-cc-integrer="${echapper(e.cle)}">Intégrer…</button><button type="button" class="btn btn-ghost btn-sm" data-cc-ignorer="${echapper(e.cle)}">Ignorer</button></li>`,
        )
        .join('')}</ul>${liste.length > 12 ? `<p class="doux">Et ${liste.length - 12} autres.</p>` : ''}</section>`;
  }

  function page() {
    const intro = de('intro')[0];
    const chemin = de('chemin');
    const liste = (partie, titre, forme) =>
      `<article class="carte"><h3>${titre}</h3><ul data-cc-zone="${partie}">${de(partie)
        .map(
          (b) =>
            `<li class="cc-bloc${cls(b)}"><i class="forme ${forme}"></i><span>${echapper(b.titre)}${b.texte ? `<span class="cc-texte doux">${b.texte}</span>` : ''}${outils(b)}</span></li>`,
        )
        .join('')}</ul>${ajouter(partie)}</article>`;
    return `<div class="cc">
    <div class="bande"></div>
    <header class="wrap tete"><img src="logo.png" alt="Emmaüs Connect" class="cc-logo">
      <span class="cc-tete-d"><span class="etiquette">Dossier de conception interne</span>
      ${
        `<button type="button" class="btn btn-primary btn-sm cc-bouton" data-cc-presenter title="Plein écran, une partie à la fois (flèches du clavier)">▶ Présenter</button>` +
        (C.export
          ? ''
          : `${C.lecture ? '' : '<button type="button" class="btn btn-secondary btn-sm cc-bouton" data-cc-partage>Lien de partage</button>'}<button type="button" class="btn btn-ghost btn-sm cc-bouton" data-cc-exporter>Exporter en HTML</button><button type="button" class="btn btn-ghost btn-sm cc-bouton" data-cc-imprimer>Imprimer / PDF</button>`)
      }</span></header>
    ${propositions()}
    <section class="wrap hero">
      <div class="cc-bloc${intro ? cls(intro) : ''}">${
        intro
          ? `<span class="sur">${echapper(intro.sousTitre)}</span><h1 style="margin-top:14px">${echapper(intro.titre)}</h1><div class="chapo">${intro.texte}</div>${intro.note ? `<p class="doux" style="margin-top:14px;font-size:14.5px">${echapper(intro.note)}</p>` : ''}${outils(intro, false)}`
          : ajouter('intro', 'Introduction')
      }</div>
      <div class="publics" data-cc-zone="publics">${de('publics')
        .map(
          (b) =>
            `<div class="carte public cc-bloc${cls(b)}">${ill(b.ill, 'xl')}<div><h3>${echapper(b.titre)}</h3><div class="doux cc-texte">${b.texte}</div></div>${outils(b)}</div>`,
        )
        .join('')}${ajouter('publics')}</div>
    </section>
    ${chiffresTete()}
    ${libresApres('intro')}

    <section class="wrap bloc">
      ${entete(1, 'Le cheminement', 'D’un tableur partagé à une plateforme prête pour la production', 'Rendez-vous, décisions et étapes : chacune a répondu à une limite de la précédente. Ce qu’on en a retenu explique la forme actuelle de l’outil.')}
      <ol class="chemin">${chemin
        .map(
          (b, i) =>
            `<li class="cc-bloc cc-t-${b.type || 'etape'}${i === chemin.length - 1 ? ' dernier' : ''}${cls(b)}"><span class="rond">${i + 1}</span><div class="etape-ch"><div><span class="quand">${echapper(b.quand || dateLongue(b.date))}${
              b.type !== 'etape' ? ` <span class="cc-type cc-${b.type}">${TYPES[b.type]}</span>` : ''
            }</span><h3>${echapper(b.titre)}</h3><div class="doux cc-texte">${b.texte}</div></div>${
              b.note ? `<p class="retenu"><b>Retenu</b>${echapper(b.note).replace(/\n/g, '<br>')}</p>` : '<span></span>'
            }</div>${outils(b, false)}</li>`,
        )
        .join('')}</ol>${ajouter('chemin', 'Ajouter un rendez-vous, une décision ou une étape')}
    </section>
    ${libresApres('chemin')}

    <section class="wrap bloc">
      ${entete(2, 'Les structures', 'Trois types au lancement, deux en réserve', 'Le type dit qui paie, ce qu’il faut fournir et qui valide.')}
      ${cartes('types')}
    </section>
    ${libresApres('types')}

    <section class="wrap bloc">
      ${entete(3, 'L’équipe et les régions', 'Un compte par personne, un territoire par compte', 'L’admin national invite chaque personne avec son rôle et ses régions ; à la première connexion, elle découvre ce que son rôle permet.')}
      ${cartes('equipe', 'grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))')}
    </section>
    ${libresApres('equipe')}

    <section class="wrap bloc">
      ${entete(4, 'D’un coup d’œil', 'Ce que chaque type fournit et reçoit')}
      ${FIXE.coup}
    </section>
    ${libresApres('coup')}

    <section class="wrap bloc">
      ${entete(5, 'Le parcours d’une commande', 'Cinq étapes pour tout le monde, seul le validateur change')}
      ${FIXE.parcours}
      <div class="raisons" data-cc-zone="parcours">${de('parcours')
        .map(
          ouSpeciale(
            (b) =>
              `<div class="sous cc-bloc${cls(b)}"><b>${echapper(b.titre)}</b><div class="cc-texte">${b.texte}</div>${outils(b)}</div>`,
          ),
        )
        .join('')}</div>${ajouter('parcours')}
    </section>
    ${libresApres('parcours')}

    <section class="wrap bloc">
      ${entete(6, 'Comment c’est construit', 'Un site sans secret, un serveur qui vérifie tout, une seule base')}
      ${FIXE.archi}
      <div class="choix" data-cc-zone="archi">${de('archi')
        .map(ouSpeciale((b) => choix(b, 0)))
        .join('')}</div>${ajouter('archi')}
    </section>
    ${libresApres('archi')}

    <section class="wrap bloc">
      ${entete(7, 'Les choix', 'Simple à utiliser pour les structures, simple à reprendre pour une équipe nationale')}
      <div class="choix" data-cc-zone="choix">${de('choix')
        .map(ouSpeciale((b, i) => choix(b, i)))
        .join('')}</div>${ajouter('choix')}
    </section>
    ${libresApres('choix')}

    <section class="wrap bloc">
      ${entete(8, 'Et ensuite', 'Ce qui reste à décider et à reprendre')}
      <div class="suites">${liste('trancher', 'À trancher', 'losange')}${liste('reprendre', 'À reprendre', 'carre')}${liste('production', 'Avant la production', 'carre')}</div>
      <p class="doux" style="font-size:13.5px">Le suivi au jour le jour est dans l’onglet « À faire ».</p>
    </section>
    ${libresApres('suites')}
    <footer><div class="wrap"><span>CVDL · Emmaüs Connect · dossier tenu à jour dans l’onglet Projet</span></div></footer>
    </div>`;
  }
  function choix(b, i) {
    return `<article class="carte cc-bloc${cls(b)}">${ill(b.ill, '', i % 2 ? 't' : 'm')}<h3>${echapper(b.titre)}</h3><div class="cc-texte">${b.texte}</div>${
      b.note ? `<p class="echange"><b>En échange :</b> ${echapper(b.note)}</p>` : ''
    }${outils(b)}</article>`;
  }

  /* ── Animations : les blocs apparaissent en glissant quand ils arrivent à l'écran (rien si
     l'utilisateur a réduit les animations), et mode présentation. Autonome : recopiée telle
     quelle dans l'export. */
  function animer(racine) {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Chiffre clé calculé : compte de 0 à sa valeur.
    const compter = (n) => {
      if (reduit) return;
      const fin = Number(n.dataset.ccCompte);
      const debut = performance.now();
      const pas = (t) => {
        const k = Math.min(1, (t - debut) / 1100);
        n.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))).toLocaleString('fr-FR');
        if (k < 1) requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    };

    /* Mode présentation : plein écran, une partie (section) à la fois ; flèches, espace, Échap.
       Branché une seule fois par page ; les animations de la partie affichée sont rejouées. */
    if (!document.documentElement.dataset.ccDiapo) {
      document.documentElement.dataset.ccDiapo = '1';
      let cc = null;
      let diapos = [];
      let n = 0;
      const nav = document.createElement('div');
      nav.className = 'cc-diapo-nav';
      nav.innerHTML =
        '<button type="button" data-cc-diapo="-1" aria-label="Partie précédente">←</button><span class="cc-diapo-n" aria-live="polite"></span><button type="button" data-cc-diapo="1" aria-label="Partie suivante">→</button><button type="button" data-cc-diapo="fin">Quitter <kbd>Échap</kbd></button>';
      const barre = document.createElement('span');
      barre.className = 'cc-diapo-barre';
      barre.innerHTML = '<i></i>';
      const montrer = (k) => {
        n = Math.max(0, Math.min(diapos.length - 1, k));
        diapos.forEach((d, i) => d.classList.toggle('cc-courant', i === n));
        const d = diapos[n];
        cc.scrollTop = 0;
        d.querySelectorAll('.cc-a').forEach((el) => {
          el.classList.remove('cc-vu');
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('cc-vu')));
        });
        d.querySelectorAll('[data-cc-compte]').forEach(compter);
        nav.querySelector('.cc-diapo-n').textContent = `${n + 1} / ${diapos.length}`;
        barre.firstChild.style.width = `${((n + 1) / diapos.length) * 100}%`;
      };
      const fermer = () => {
        if (!cc) return;
        cc.classList.remove('cc-diapo');
        diapos.forEach((d) => d.classList.remove('cc-courant', 'cc-diapo-el'));
        nav.remove();
        barre.remove();
        cc = null;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      };
      const ouvrir = (depuis) => {
        cc = depuis.closest('.cc') || document.querySelector('.cc');
        if (!cc) return;
        diapos = [...cc.querySelectorAll(':scope > section, :scope > .cc-libres > section')].filter(
          (d) => !d.classList.contains('cc-props') && !d.classList.contains('cc-masque'),
        );
        diapos.forEach((d) => d.classList.add('cc-diapo-el'));
        cc.classList.add('cc-diapo');
        document.body.append(nav, barre);
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
        montrer(0);
      };
      document.addEventListener('click', (e) => {
        const o = e.target.closest && e.target.closest('[data-cc-presenter]');
        if (o) return ouvrir(o);
        const b = e.target.closest && e.target.closest('[data-cc-diapo]');
        if (!b || !cc) return;
        if (b.dataset.ccDiapo === 'fin') fermer();
        else montrer(n + Number(b.dataset.ccDiapo));
      });
      document.addEventListener('keydown', (e) => {
        if (!cc || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
        const touches = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 };
        if (e.key === 'Escape') fermer();
        else if (e.key === 'Home') montrer(0);
        else if (e.key === 'End') montrer(diapos.length - 1);
        else if (touches[e.key]) montrer(n + touches[e.key]);
        else return;
        e.preventDefault();
      });
      // Sortie du plein écran par le navigateur (Échap) : on quitte aussi la présentation.
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && cc) fermer();
      });
    }

    if (!('IntersectionObserver' in window) || reduit) return;
    const io = new IntersectionObserver(
      (vus) =>
        vus.forEach((v) => {
          if (!v.isIntersecting) return;
          v.target.classList.add('cc-vu');
          io.unobserve(v.target);
          v.target.querySelectorAll('[data-cc-compte]').forEach(compter);
          setTimeout(() => (v.target.style.transitionDelay = ''), 900);
        }),
      { threshold: 0.12 },
    );
    racine
      .querySelectorAll(
        '.cc .entete, .cc .carte, .cc .regle-or, .cc .chemin > li, .cc .etp, .cc .raisons .sous, .cc .defile, .cc .cc-citation, .cc .cc-faq, .cc .cc-encadre, .cc .cc-chiffre-cle, .cc .couloir',
      )
      .forEach((el) => {
        el.style.transitionDelay = `${Math.min([...el.parentNode.children].indexOf(el), 6) * 70}ms`;
        el.classList.add('cc-a');
        io.observe(el);
      });
  }

  /* ── Export : une page HTML autonome (styles, logo, images et animations compris), à ouvrir
     dans n'importe quel navigateur pour présenter le dossier. ── */
  async function exporter() {
    try {
      const enDataUrl = (blob) =>
        new Promise((ok, ko) => {
          const l = new FileReader();
          l.onload = () => ok(l.result);
          l.onerror = ko;
          l.readAsDataURL(blob);
        });
      const [css, logo] = await Promise.all([
        fetch('projet-comprendre.css').then((r) => r.text()),
        fetch('logo.png')
          .then((r) => r.blob())
          .then(enDataUrl),
      ]);
      C.export = true;
      const corps = page().replace('src="logo.png"', `src="${logo}"`);
      C.export = false;
      const jour = new Date().toISOString().slice(0, 10);
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Comprendre CVDL</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap">
<style>:root{--police-titre:'Space Grotesk',system-ui,sans-serif;--police:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;--navy:#002743;--tur:#00acb0}
body{margin:0;padding:24px 12px 48px;background:#f3f6f8}.cc{max-width:1200px;margin:0 auto}
${css}</style></head><body>${corps.replace('dossier tenu à jour dans l’onglet Projet', `export du ${dateFr(jour)}`)}
<script>(${animer.toString()})(document);</script></body></html>`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = `comprendre-cvdl-${jour}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      notifier('Page HTML exportée');
    } catch (e) {
      notifier('Export impossible pour le moment.', { erreur: true });
    }
  }

  /* ── Éditeur (panneau de projet.js) ── */
  const CHAMPS = {
    // partie → champs affichés en plus du titre et du texte
    intro: ['sousTitre', 'note'],
    publics: ['ill'],
    chemin: ['type', 'date', 'quand', 'note'],
    types: ['sousTitre', 'note', 'ill', 'forme', 'etiquette'],
    equipe: ['sousTitre', 'note', 'ill', 'forme', 'etiquette'],
    parcours: [],
    archi: ['ill', 'note'],
    choix: ['ill', 'note'],
    trancher: [],
    reprendre: [],
    production: [],
    libre: ['sousTitre', 'note', 'ill', 'forme', 'etiquette'],
  };
  // Parties où le bloc peut prendre une autre forme (grilles de cartes).
  const AVEC_FORMES = ['types', 'equipe', 'parcours', 'archi', 'choix', 'libre'];
  function editer(bloc, defaut = {}) {
    const b = bloc || {
      partie: 'chemin',
      type: 'etape',
      date: '',
      quand: '',
      titre: '',
      sousTitre: '',
      texte: '',
      note: '',
      ill: '',
      forme: 'carte',
      etiquette: '',
      masque: false,
      texte2: '',
      libelleA: '',
      libelleB: '',
      valeur: '',
      mesure: '',
      ton: 'info',
      partieLibre: null,
      ...defaut,
    };
    const valeurPartie = b.partie === 'libre' ? `libre:${b.partieLibre}` : b.partie;
    const partiesChoix = {
      ...Object.fromEntries(
        Object.entries(C.parties)
          .filter(([k]) => k !== 'libre')
          .map(([k, p]) => [k, p.libelle]),
      ),
      ...Object.fromEntries(C.libres.map((p) => [`libre:${p.id}`, `Partie libre · ${p.titre}`])),
    };
    const ch = (nom, html) => `<div class="pj-ch" data-cc-champ="${nom}">${html}</div>`;
    const options = (o, v) =>
      Object.entries(o)
        .map(([k, l]) => `<option value="${echapper(k)}" ${k === v ? 'selected' : ''}>${echapper(l)}</option>`)
        .join('');
    ouvrirPanneau(
      `<span class="cvdl-surtitre" style="color:var(--tur)">Comprendre CVDL</span>
      <h2 id="pj-panneau-titre">${bloc ? 'Modifier le bloc' : defaut.source ? 'Intégrer la mise à jour' : 'Nouveau bloc'}</h2>
      <div class="pj-ch"><label for="cc-f-partie">Partie</label><select class="input" id="cc-f-partie">${options(
        partiesChoix,
        valeurPartie,
      )}</select></div>
      ${ch('forme', `<label for="cc-f-forme">Forme du bloc</label><select class="input" id="cc-f-forme">${options(FORMES, b.forme)}</select><small class="cc-aide-forme" id="cc-aide-forme"></small>`)}
      ${ch('type', `<label for="cc-f-type">Type</label><select class="input" id="cc-f-type">${options(TYPES, b.type || 'etape')}</select>`)}
      <div class="pj-2">${ch('date', `<label for="cc-f-date">Date</label><input class="input" id="cc-f-date" placeholder="jj/mm/aaaa" value="${echapper(dateFr(b.date))}">`)}
      ${ch('quand', `<label for="cc-f-quand">Période affichée <small>(facultatif)</small></label><input class="input" id="cc-f-quand" maxlength="60" placeholder="Ex. Au départ" value="${echapper(b.quand)}">`)}</div>
      <div class="pj-ch"><label for="cc-f-titre">Titre</label><input class="input" id="cc-f-titre" maxlength="200" value="${echapper(b.titre)}"></div>
      ${ch('sousTitre', `<label for="cc-f-sous">Sous-titre</label><input class="input" id="cc-f-sous" maxlength="200" value="${echapper(b.sousTitre)}">`)}
      <div class="pj-ch"><span class="lab" id="cc-l-texte">Texte</span>
        <div class="cc-barre" role="toolbar" aria-label="Mise en forme">${BARRE.map((x) =>
          x
            ? `<button type="button" data-cc-cmd="${x[0]}" title="${x[2]}" aria-label="${x[2]}">${x[1]}</button>`
            : '<i aria-hidden="true"></i>',
        ).join(
          '',
        )}<input type="file" id="cc-fichier" accept="image/png,image/jpeg,image/webp,image/gif" hidden multiple></div>
        <div class="cc-editeur" id="cc-f-texte" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="cc-l-texte">${b.texte}</div></div>
      ${ch('libelles', `<div class="pj-2"><div><label for="cc-f-la">Colonne de gauche</label><input class="input" id="cc-f-la" maxlength="60" placeholder="Avant" value="${echapper(b.libelleA)}"></div><div><label for="cc-f-lb">Colonne de droite</label><input class="input" id="cc-f-lb" maxlength="60" placeholder="Après" value="${echapper(b.libelleB)}"></div></div>`)}
      ${ch('texte2', `<span class="lab" id="cc-l-texte2">Texte de la colonne de droite</span><div class="cc-editeur cc-editeur-petit" id="cc-f-texte2" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="cc-l-texte2">${b.texte2 || ''}</div>`)}
      <div class="pj-2">${ch('valeur', `<label for="cc-f-valeur">Chiffre</label><input class="input" id="cc-f-valeur" maxlength="40" placeholder="Ex. 1 200 ou 83 %" value="${echapper(b.valeur)}">`)}
      ${ch('mesure', `<label for="cc-f-mesure">Ou calculé en direct</label><select class="input" id="cc-f-mesure"><option value="">— Chiffre saisi —</option>${options(C.libellesMesures, b.mesure)}</select>`)}</div>
      ${ch(
        'ton',
        `<span class="lab">Couleur</span><div class="pj-seg" data-seg="ton" role="group">${Object.entries(TONS)
          .map(
            ([k, l]) =>
              `<button type="button" data-val="${k}" class="${(b.ton || 'info') === k ? 'actif' : ''}">${l}</button>`,
          )
          .join('')}</div>`,
      )}
      ${ch('note', `<label for="cc-f-note" id="cc-l-note">Note</label><textarea class="input" id="cc-f-note" rows="3" maxlength="5000">${echapper(b.note)}</textarea>`)}
      <div class="pj-2">${ch('ill', `<label for="cc-f-ill">Illustration</label><select class="input" id="cc-f-ill"><option value="">Aucune</option>${options(Object.fromEntries(Object.keys(ILL).map((k) => [k, k])), b.ill)}</select>`)}
</div>
      ${ch('etiquette', `<label for="cc-f-etiquette">Étiquette <small>(ex. masqué au lancement)</small></label><input class="input" id="cc-f-etiquette" maxlength="60" value="${echapper(b.etiquette)}">`)}
      <label class="pj-case"><input type="checkbox" id="cc-f-masque" ${b.masque ? 'checked' : ''}> Masqué (visible seulement en mode édition)</label>
      <p class="pj-erreur" id="cc-f-erreur" role="alert"></p>
      <div class="pj-actions"><button type="button" class="btn btn-primary" id="cc-f-enregistrer">Enregistrer</button><button type="button" class="btn btn-secondary" data-fermer>Annuler</button><span class="espace"></span>${
        bloc ? '<button type="button" class="btn btn-danger" id="cc-f-supprimer">Supprimer</button>' : ''
      }</div>`,
      (p) => {
        const maj = () => {
          const partie = $('cc-f-partie').value.startsWith('libre:') ? 'libre' : $('cc-f-partie').value;
          const formes = AVEC_FORMES.includes(partie);
          const forme = formes ? $('cc-f-forme').value : 'carte';
          const visibles = SPECIALES.includes(forme)
            ? ['forme', ...CHAMPS_FORME[forme]]
            : CHAMPS[partie].filter((c) => formes || c !== 'forme');
          p.querySelectorAll('[data-cc-champ]').forEach((el) => (el.hidden = !visibles.includes(el.dataset.ccChamp)));
          $('cc-l-note').textContent =
            forme === 'chiffre'
              ? 'Précision (petit texte)'
              : forme === 'image'
                ? 'Légende'
                : (C.parties[partie] || {}).note || 'Note';
          $('cc-aide-forme').textContent = AIDE_FORME[forme] || '';
        };
        maj();
        $('cc-f-partie').addEventListener('change', maj);
        $('cc-f-forme').addEventListener('change', maj);
        p.addEventListener('click', (e) => {
          const t = e.target.closest('[data-seg="ton"] button');
          if (t) t.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('actif', x === t));
        });
        $('cc-f-enregistrer').addEventListener('click', async () => {
          const choix = $('cc-f-partie').value;
          const libre = choix.startsWith('libre:');
          const formes = AVEC_FORMES.includes(libre ? 'libre' : choix);
          const r = await C.appel('comprendre-enregistrer', {
            id: bloc ? bloc.id : '',
            source: bloc ? '' : defaut.source || '',
            partie: libre ? 'libre' : choix,
            partieLibre: libre ? choix.slice(6) : '',
            texte2: $('cc-f-texte2').innerHTML,
            libelleA: $('cc-f-la').value,
            libelleB: $('cc-f-lb').value,
            valeur: $('cc-f-valeur').value,
            mesure: $('cc-f-mesure').value,
            ton: (p.querySelector('[data-seg="ton"] .actif') || {}).dataset?.val || 'info',
            type: $('cc-f-type').value,
            date: $('cc-f-date').value,
            quand: $('cc-f-quand').value,
            titre: $('cc-f-titre').value,
            sousTitre: $('cc-f-sous').value,
            texte: $('cc-f-texte').innerHTML,
            note: $('cc-f-note').value,
            ill: $('cc-f-ill').value,
            forme: formes ? $('cc-f-forme').value : 'carte',
            etiquette: $('cc-f-etiquette').value,
            masque: $('cc-f-masque').checked,
          });
          if (!r.ok) return ($('cc-f-erreur').textContent = r.erreur || 'Enregistrement impossible.');
          fermerPanneau();
          toast(bloc ? 'Bloc enregistré' : 'Bloc ajouté');
          recharger();
        });
        if (bloc)
          $('cc-f-supprimer').addEventListener('click', async () => {
            if (!confirm(`Supprimer « ${bloc.titre} » ? (Masquer le garde de côté.)`)) return;
            const r = await C.appel('comprendre-supprimer', { id: bloc.id });
            if (!r.ok) return ($('cc-f-erreur').textContent = r.erreur || 'Suppression impossible.');
            fermerPanneau();
            toast('Bloc supprimé');
            recharger();
          });
      },
    );
  }
  /** Partie libre : titre, surtitre, sous-titre, emplacement, colonnes, masquage. */
  function editerPartie(partie, apres) {
    const p = partie || {
      titre: '',
      surtitre: '',
      sousTitre: '',
      apres: apres || 'choix',
      disposition: 3,
      masque: false,
    };
    ouvrirPanneau(
      `<span class="cvdl-surtitre" style="color:var(--tur)">Comprendre CVDL</span>
      <h2 id="pj-panneau-titre">${partie ? 'Modifier la partie' : 'Nouvelle partie'}</h2>
      <div class="pj-ch"><label for="cc-p-sur">Surtitre <small>(petit texte au-dessus, facultatif)</small></label><input class="input" id="cc-p-sur" maxlength="60" value="${echapper(p.surtitre)}" placeholder="Ex. Témoignages"></div>
      <div class="pj-ch"><label for="cc-p-titre">Titre</label><input class="input" id="cc-p-titre" maxlength="200" value="${echapper(p.titre)}"></div>
      <div class="pj-ch"><label for="cc-p-sous">Introduction <small>(facultatif)</small></label><textarea class="input" id="cc-p-sous" rows="2" maxlength="400">${echapper(p.sousTitre)}</textarea></div>
      <div class="pj-ch"><label for="cc-p-apres">Placée après</label><select class="input" id="cc-p-apres">${Object.entries(
        C.emplacements,
      )
        .map(([k, l]) => `<option value="${k}" ${p.apres === k ? 'selected' : ''}>${echapper(l)}</option>`)
        .join('')}</select></div>
      <div class="pj-ch"><span class="lab">Disposition des blocs</span>${seg('dispo', { 1: '1 colonne', 2: '2 colonnes', 3: '3 colonnes' }, String(p.disposition))}</div>
      <label class="pj-case"><input type="checkbox" id="cc-p-masque" ${p.masque ? 'checked' : ''}> Masquée (visible seulement en mode édition)</label>
      <p class="pj-erreur" id="cc-p-erreur" role="alert"></p>
      <div class="pj-actions"><button type="button" class="btn btn-primary" id="cc-p-enregistrer">Enregistrer</button><button type="button" class="btn btn-secondary" data-fermer>Annuler</button><span class="espace"></span>${
        partie ? '<button type="button" class="btn btn-danger" id="cc-p-supprimer">Supprimer</button>' : ''
      }</div>`,
      (z) => {
        z.addEventListener('click', (e) => {
          const b = e.target.closest('[data-seg] button');
          if (b) b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('actif', x === b));
        });
        $('cc-p-enregistrer').addEventListener('click', async () => {
          const r = await C.appel('comprendre-partie', {
            id: partie ? partie.id : '',
            titre: $('cc-p-titre').value,
            surtitre: $('cc-p-sur').value,
            sousTitre: $('cc-p-sous').value,
            apres: $('cc-p-apres').value,
            disposition: valeurSeg(z, 'dispo'),
            masque: $('cc-p-masque').checked,
          });
          if (!r.ok) return ($('cc-p-erreur').textContent = r.erreur || 'Enregistrement impossible.');
          fermerPanneau();
          notifier(partie ? 'Partie enregistrée' : 'Partie ajoutée');
          recharger();
        });
        if (partie)
          $('cc-p-supprimer').addEventListener('click', async () => {
            if (!confirm(`Supprimer la partie « ${partie.titre} » et ses blocs ? (La masquer la garde de côté.)`))
              return;
            await C.appel('comprendre-partie', { id: partie.id, supprimer: true });
            fermerPanneau();
            notifier('Partie supprimée');
            recharger();
          });
      },
    );
  }

  /** Mise à jour du journal → éditeur prérempli (cheminement, étape datée). */
  function integrer(cle) {
    const e = entreesJournal().find((x) => x.cle === cle);
    if (!e) return;
    const puces = e.blocs.filter((x) => x.type === 'li').slice(0, 4);
    const texte = puces.length
      ? `<ul>${puces.map((x) => `<li>${echapper(x.texte.replace(/\*\*|`/g, ''))}</li>`).join('')}</ul>`
      : '';
    editer(null, { partie: 'chemin', type: 'etape', date: e.date, titre: e.titre, texte, source: cle });
  }

  /* Texte mis en forme : commandes, images réduites (1600 px, ≈ 2 Mo au plus) */
  function commande(cmd) {
    $('cc-f-texte').focus();
    if (['h3', 'blockquote'].includes(cmd)) {
      const actuel = document.queryCommandValue('formatBlock').toLowerCase();
      document.execCommand('formatBlock', false, actuel === cmd ? 'p' : cmd);
    } else if (cmd === 'lien') {
      const url = window.prompt('Adresse du lien (https://…)', 'https://');
      if (url && /^(https?:\/\/|mailto:)/i.test(url.trim())) document.execCommand('createLink', false, url.trim());
    } else if (cmd === 'image') $('cc-fichier').click();
    else document.execCommand(cmd, false);
  }
  function reduire(fichier) {
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onerror = ko;
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = ko;
        img.onload = () => {
          const r = Math.min(1, IMAGE_MAX_PX / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * r);
          c.height = Math.round(img.height * r);
          const ctx = c.getContext('2d');
          const png = fichier.type === 'image/png' || fichier.type === 'image/gif';
          if (!png) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
          }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          let url = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
          for (let q = 0.75; url.length > IMAGE_MAX_CAR && q > 0.3; q -= 0.15) url = c.toDataURL('image/jpeg', q);
          if (url.length > IMAGE_MAX_CAR) return ko(new Error('trop lourde'));
          ok(url);
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(fichier);
    });
  }
  async function insererImages(fichiers) {
    for (const f of [...fichiers].filter((x) => /^image\//.test(x.type))) {
      try {
        const url = await reduire(f);
        $('cc-f-texte').focus();
        document.execCommand('insertHTML', false, `<img src="${url}" alt="${echapper(f.name || 'image')}"><p><br></p>`);
      } catch (e) {
        $('cc-f-erreur').textContent = `Image « ${f.name || ''} » trop lourde ou illisible.`;
      }
    }
  }

  /* ── Glisser-déposer (édition) : un bloc se range dans sa partie ou passe dans une autre partie
     de la même famille (même rendu, comme côté serveur) ; une partie libre se range entre les
     parties du dossier. L'élément suit la souris, l'ordre est envoyé au dépôt. ── */
  const FAMILLE = {
    publics: 'publics',
    trancher: 'liste',
    reprendre: 'liste',
    production: 'liste',
    types: 'grille',
    equipe: 'grille',
    parcours: 'grille',
    archi: 'grille',
    choix: 'grille',
    libre: 'grille',
  };
  const familleZone = (z) => FAMILLE[z.dataset.ccZone.split(':')[0]];
  function preparerGlisser(racine) {
    if (!edition()) return;
    racine.querySelectorAll('[data-cc-zone] > .cc-bloc').forEach((el) => {
      const m = el.querySelector(
        ':scope > .cc-outils [data-cc-modifier], :scope > span > .cc-outils [data-cc-modifier]',
      );
      if (!m) return;
      el.draggable = true;
      el.dataset.ccGlisse = m.dataset.ccModifier;
    });
    racine.querySelectorAll('[data-cc-partie-glisse]').forEach((el) => (el.draggable = true));
  }
  let glisse = null; // { el, type: 'bloc' | 'partie', famille, depose }
  const cibleDe = (t) =>
    !glisse || !t.closest
      ? null
      : glisse.type === 'partie'
        ? t.closest('[data-cc-emplacement]')
        : (() => {
            const z = t.closest('[data-cc-zone]');
            return z && familleZone(z) === glisse.famille ? z : null;
          })();
  /** Place l'élément glissé avant le premier frère que le pointeur précède (sens de lecture). */
  function placer(zone, x, y) {
    const attr = glisse.type === 'partie' ? 'data-cc-partie-glisse' : 'data-cc-glisse';
    const freres = [...zone.children].filter((c) => c.hasAttribute(attr) && c !== glisse.el);
    const avant = freres.find((c) => {
      const r = c.getBoundingClientRect();
      return glisse.type === 'partie'
        ? y < r.top + r.height / 2
        : y < r.top || (y < r.bottom && x < r.left + r.width / 2);
    });
    if (avant) {
      if (glisse.el.nextElementSibling !== avant) avant.before(glisse.el);
    } else if (freres.length) {
      if (freres[freres.length - 1].nextElementSibling !== glisse.el) freres[freres.length - 1].after(glisse.el);
    } else if (glisse.el.parentElement !== zone) zone.prepend(glisse.el);
  }
  document.addEventListener('dragstart', (e) => {
    if (!C.zone || !C.zone.contains(e.target) || !e.target.closest) return;
    const el = e.target.closest('[data-cc-glisse], [data-cc-partie-glisse]');
    if (!el || !el.draggable) return;
    const bloc = el.hasAttribute('data-cc-glisse');
    glisse = { el, type: bloc ? 'bloc' : 'partie', famille: bloc ? familleZone(el.parentElement) : '', depose: false };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.dataset.ccGlisse || el.dataset.ccPartieGlisse);
    C.zone.querySelectorAll(bloc ? '[data-cc-zone]' : '[data-cc-emplacement]').forEach((z) => {
      if (!bloc || familleZone(z) === glisse.famille) z.classList.add('cc-cible');
    });
    requestAnimationFrame(() => el.classList.add('cc-en-glisse'));
  });
  document.addEventListener('dragover', (e) => {
    const z = cibleDe(e.target);
    if (!z) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    placer(z, e.clientX, e.clientY);
  });
  document.addEventListener('drop', async (e) => {
    const z = cibleDe(e.target);
    if (!z) return;
    e.preventDefault();
    glisse.depose = true;
    const r =
      glisse.type === 'partie'
        ? await C.appel('comprendre-parties-ordonner', {
            apres: z.dataset.ccEmplacement,
            ids: [...z.querySelectorAll(':scope > [data-cc-partie-glisse]')].map((x) => x.dataset.ccPartieGlisse),
          })
        : await C.appel('comprendre-ordonner', {
            partie: z.dataset.ccZone.split(':')[0],
            partieLibre: z.dataset.ccZone.split(':')[1] || '',
            ids: [...z.querySelectorAll(':scope > [data-cc-glisse]')].map((x) => x.dataset.ccGlisse),
          });
    if (!r.ok) notifier(r.erreur || 'Déplacement impossible.', { erreur: true });
    recharger();
  });
  document.addEventListener('dragend', () => {
    if (!glisse) return;
    const annule = !glisse.depose;
    glisse.el.classList.remove('cc-en-glisse');
    C.zone.querySelectorAll('.cc-cible').forEach((z) => z.classList.remove('cc-cible'));
    glisse = null;
    if (annule) recharger(); // remet l'ordre enregistré
  });

  /* ── Événements ── */
  const blocDe = (id) => C.blocs.find((b) => b.id === Number(id));
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const cmd = t.closest('[data-cc-cmd]');
    if (cmd) return commande(cmd.dataset.ccCmd);
    if (!C.zone || !C.zone.contains(t)) return;
    const m = t.closest('[data-cc-modifier]');
    if (m) return editer(blocDe(m.dataset.ccModifier));
    const a = t.closest('[data-cc-ajouter]');
    if (a) {
      const v = a.dataset.ccAjouter;
      return v.startsWith('libre:')
        ? editer(null, { partie: 'libre', partieLibre: Number(v.slice(6)) })
        : editer(null, { partie: v, type: 'etape' });
    }
    const np = t.closest('[data-cc-nouvelle-partie]');
    if (np) return editerPartie(null, np.dataset.ccNouvellePartie);
    const mp = t.closest('[data-cc-partie-modifier]');
    if (mp) return editerPartie(C.libres.find((x) => x.id === Number(mp.dataset.ccPartieModifier)));
    const sp = t.closest('[data-cc-partie-sens]');
    if (sp) {
      await C.appel('comprendre-partie-deplacer', { id: sp.dataset.ccPartie, sens: sp.dataset.ccPartieSens });
      return recharger();
    }
    const s = t.closest('[data-cc-sens]');
    if (s) {
      await C.appel('comprendre-deplacer', { id: s.dataset.ccId, sens: s.dataset.ccSens });
      return recharger();
    }
    const mq = t.closest('[data-cc-masquer]');
    if (mq) {
      const b = blocDe(mq.dataset.ccMasquer);
      const r = await C.appel('comprendre-enregistrer', { ...b, date: b.date, masque: !b.masque });
      if (!r.ok) return toast(r.erreur || 'Enregistrement impossible.', { erreur: true });
      return recharger();
    }
    const ig = t.closest('[data-cc-integrer]');
    if (ig) return integrer(ig.dataset.ccIntegrer);
    const ign = t.closest('[data-cc-ignorer]');
    if (ign) {
      const r = await C.appel('comprendre-ignorer', { cle: ign.dataset.ccIgnorer });
      if (!r.ok) return toast(r.erreur || 'Impossible.', { erreur: true });
      return recharger();
    }
    if (t.closest('[data-cc-exporter]')) return exporter();
    if (t.closest('[data-cc-partage]')) return partage('lire');
    if (t.closest('[data-cc-imprimer]')) {
      document.body.classList.add('cc-impression');
      window.print();
      document.body.classList.remove('cc-impression');
    }
  });
  // Les boutons de la barre ne prennent pas le focus : la sélection du texte reste en place.
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-cc-cmd]')) e.preventDefault();
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'cc-fichier') {
      insererImages(e.target.files);
      e.target.value = '';
    }
  });
  document.addEventListener('paste', (e) => {
    if (e.target.closest?.('#cc-f-texte') && e.clipboardData) {
      const images = [...e.clipboardData.files].filter((f) => /^image\//.test(f.type));
      if (images.length) {
        e.preventDefault();
        insererImages(images);
      }
    }
  });
  document.addEventListener('drop', (e) => {
    if (!e.target.closest?.('#cc-f-texte') || !e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    insererImages(e.dataTransfer.files);
  });

  return { rendre, afficher };
})();
