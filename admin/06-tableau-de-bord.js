/* Admin CVDL — tableau de bord, fil des priorités, notifications. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function commandesUrgentes() {
  // Volontairement limité aux étapes où une action reste à faire (Reçue/Validée/Préparée) —
  // une fois "En cours de livraison" ou "Livrée", ce n'est plus une notification actionnable :
  // le fil des priorités doit rester un centre de notifs des VRAIS trucs à vérifier, pas un
  // rappel permanent de tout ce qui a été marqué urgent un jour.
  return state.commandes.filter(
    (c) =>
      c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande),
  );
}
function savOuvertsListe() {
  // Un statut "Fin de cycle" ferme l'anneau de progression à 100% même sans être coché
  // "Terminal" — dans les deux cas, le dossier est résolu et n'a plus rien à surveiller, donc
  // les deux drapeaux sortent le ticket du centre de notifs.
  return state.sav.filter((s) => {
    const def = state.statutsSav.find((st) => st.statut === s.statut);
    return !(def && (def.terminal || def.finCycle));
  });
}
function docsEnAttenteListe() {
  return [
    ...state.devis
      .filter((d) => d.statut === 'En attente' || d.statut === 'En retard')
      .map((d) => ({ ...d, type: 'Devis' })),
    ...state.factures
      .filter((f) => f.statut === 'En attente' || f.statut === 'En retard')
      .map((f) => ({ ...f, type: 'Facture' })),
  ];
}
function commandesPaiementEnAttente() {
  return state.commandes.filter(
    (c) => c.dernierClicLienPaiement && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé',
  );
}
function commandesLivraisonDepassee() {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return state.commandes.filter((c) => {
    if (c.statutCommande !== 'En cours de livraison' || !c.dateLivraisonCible) return false;
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
function commandesARapprocher() {
  return state.commandes.filter((c) => c.referenceFacture && c.statutComptable !== 'Clôturé');
}
/** Regroupe les commandes par date de livraison — la date CONFIRMÉE (dateLivraison, remplie à
 *  "Marquer livrée", quel que soit le mode) prime sur la date ESTIMÉE (dateLivraisonCible,
 *  facultative, disponible pour les 3 modes) : une fois livrée, la case du calendrier doit
 *  refléter la réalité, pas l'ancienne estimation qui a pu être dépassée ou fausse. */
function commandesParDateLivraison() {
  const parDate = new Map();
  state.commandes.forEach((c) => {
    const isoConfirme = dateVersISO(c.dateLivraison);
    const isoEstime = dateVersISO(c.dateLivraisonCible);
    const iso = isoConfirme || isoEstime;
    if (!iso) return;
    if (!parDate.has(iso)) parDate.set(iso, []);
    parDate.get(iso).push({ commande: c, confirme: !!isoConfirme });
  });
  return parDate;
}
const JOURS_SEMAINE_CAL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_CAL = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
/** Mini calendrier des livraisons — volontairement "grossier" (grandes cases, un ou deux points
 *  par jour au plus, jamais de texte dans la grille) : le but est de repérer une date en un coup
 *  d'œil, pas d'afficher le détail dans la case elle-même — le détail vient dans la liste juste
 *  en dessous, au clic sur un jour. Point vert = livraison confirmée, point magenta = encore
 *  au stade de l'estimation. */
function carteCalendrierLivraisonsContenu() {
  const parDate = commandesParDateLivraison();
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const isoDe = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isoAuj = isoDe(auj);
  const moisRef = new Date(auj.getFullYear(), auj.getMonth() + state.calendrierDecalageMois, 1);

  if (!state.calendrierJourChoisi) {
    const prochaines = [...parDate.keys()].filter((iso) => iso >= isoAuj).sort();
    state.calendrierJourChoisi = prochaines[0] || isoAuj;
  }

  const premierJourSemaine = (new Date(moisRef.getFullYear(), moisRef.getMonth(), 1).getDay() + 6) % 7; // lundi = 0
  const nbJours = new Date(moisRef.getFullYear(), moisRef.getMonth() + 1, 0).getDate();
  const isoJour = (j) =>
    `${moisRef.getFullYear()}-${String(moisRef.getMonth() + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
  let totalMois = 0;

  const cellules = Array(premierJourSemaine)
    .fill(null)
    .concat(Array.from({ length: nbJours }, (_, i) => i + 1));
  const grille = cellules
    .map((j, k) => {
      if (!j) return `<span class="cal2-vide" aria-hidden="true"></span>`;
      const iso = isoJour(j);
      const entrees = parDate.get(iso) || [];
      totalMois += entrees.length;
      const nbConf = entrees.filter((e) => e.confirme).length,
        nbEst = entrees.length - nbConf;
      const choisi = iso === state.calendrierJourChoisi;
      const classes = [
        'cal2-jour',
        choisi ? 'choisi' : '',
        iso === isoAuj ? 'auj' : '',
        iso < isoAuj ? 'passe' : '',
        k % 7 >= 5 ? 'weekend' : '',
        entrees.length ? 'avec' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const libelle = `${j} ${MOIS_CAL[moisRef.getMonth()]}${entrees.length ? ` : ${entrees.length} livraison${entrees.length > 1 ? 's' : ''}` : ''}`;
      return `<button type="button" class="${classes}" data-calendrier-jour="${iso}" ${choisi ? 'data-choisi aria-pressed="true"' : 'aria-pressed="false"'} ${iso === isoAuj ? 'data-auj aria-current="date"' : ''} aria-label="${echapper(libelle)}">
      <span class="cal2-num">${j}</span>
      ${entrees.length ? `<span class="cal2-marques">${nbConf ? '<i class="conf"></i>' : ''}${nbEst ? '<i class="est"></i>' : ''}${entrees.length > 1 ? `<b>${entrees.length}</b>` : ''}</span>` : ''}
    </button>`;
    })
    .join('');

  const entreesDuJour = parDate.get(state.calendrierJourChoisi) || [];
  const dateChoisie = new Date(state.calendrierJourChoisi + 'T00:00:00');
  const libelleJourChoisi =
    state.calendrierJourChoisi === isoAuj
      ? "Aujourd'hui"
      : dateChoisie.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
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
        <div class="cal2-semaine" aria-hidden="true">${JOURS_SEMAINE_CAL.map((j) => `<span>${j}</span>`).join('')}</div>
        <div class="cal2-grille" role="group" aria-label="Jours de ${MOIS_CAL[moisRef.getMonth()]}">${grille}</div>
        <div class="cal2-legende"><span><i class="conf"></i>Livrée / confirmée</span><span><i class="est"></i>Estimée</span></div>
        <div class="cal2-jourchoisi">
          <div class="cal2-jourchoisi-titre"><span>${echapper(libelleJourChoisi)}</span>${entreesDuJour.length ? `<b>${entreesDuJour.length}</b>` : ''}</div>
          ${
            entreesDuJour.length
              ? entreesDuJour
                  .map(({ commande: c, confirme }) => {
                    const nbArticles = (c.lignes || []).reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
                    const modeInfo = MODES_LIVRAISON.find((m) => m.valeur === c.modeLivraison);
                    return `
            <div class="cal2-livraison ${confirme ? 'conf' : 'est'}" data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0">
              <i aria-hidden="true"></i>
              <div class="cal2-livraison-txt"><b>${echapper(c.nom)}</b><small>${echapper(c.reference)} · ${nbArticles} article${nbArticles > 1 ? 's' : ''}${modeInfo ? ` · ${echapper(modeInfo.label)}` : ''}</small></div>
              <span class="cal2-etat">${confirme ? 'Livrée' : 'Estimée'}</span>
            </div>`;
                  })
                  .join('')
              : `<p class="cal2-rien">Aucune livraison prévue ce jour-là.</p>`
          }
        </div>
      </div>`;
}

/** Fil des priorités partagé entre le tableau de bord et la cloche de notifications (sidebar) —
 *  toutes les sources déjà calculées ailleurs (commandes urgentes, SAV ouverts, devis/factures
 *  en attente, liens de paiement cliqués mais non réglés, livraisons dépassées, rapprochement),
 *  triées par urgence puis par date la plus récente. */
/* ── Nouvelles sources du fil des priorités (audit) ── */
function joursDepuis(dateFr) {
  const iso = dateVersISO(dateFr);
  if (!iso) return 0;
  const d = new Date(iso);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
const COMMANDE_ACTIVE = (c) => !['Livrée', 'Annulée'].includes(c.statutCommande);
/** Devis demandé par la structure, pas encore généré (hors Interne/ESN/BO). */
/** Petites pastilles « Devis demandé » / « Transférée » sur les lignes et cartes de commandes. */
function badgesCommandeListe(c) {
  const devis = c.devisDemande === 'Oui' && !c.referenceDevis && COMMANDE_ACTIVE(c) && !structureExclueDevisFacture(c);
  return (
    (devis
      ? ` <span class="rp-mini-badge rp-mb-devis" title="Devis demandé par la structure, pas encore généré">Devis demandé</span>`
      : '') +
    (c.transfereAdmin
      ? ` <span class="rp-mini-badge rp-mb-transfert" title="Transférée par une structure Interne">Transférée</span>`
      : '')
  );
}
function commandesDevisDemande() {
  return state.commandes.filter(
    (c) => COMMANDE_ACTIVE(c) && c.devisDemande === 'Oui' && !c.referenceDevis && !structureExclueDevisFacture(c),
  );
}
/** Commandes transférées par une structure Interne (matériel manquant chez elle), encore à traiter. */
function commandesTransferees() {
  return state.commandes.filter((c) => c.transfereAdmin && c.statutCommande === 'Reçue');
}
/** Nouvelles commandes non urgentes (reçues), avec leur ancienneté — « en attente » au-delà de 3 jours. */
function commandesNouvelles() {
  return state.commandes.filter(
    (c) => c.statutCommande === 'Reçue' && c.dateLivraisonSouhaitee !== 'ASAP' && !c.transfereAdmin,
  );
}
/** Date souhaitée par la structure dépassée alors que la commande n'est pas encore partie. */
function commandesDateSouhaiteeDepassee() {
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return state.commandes.filter((c) => {
    if (!['Reçue', 'Validée', 'Préparée'].includes(c.statutCommande)) return false;
    const iso = dateVersISO(c.dateLivraisonSouhaitee);
    if (!iso) return false;
    return new Date(iso) < auj;
  });
}
/** Commandes livrées, non réglées (hors structures sans paiement) — même sans clic sur le lien. */
function commandesLivreesNonPayees() {
  return state.commandes.filter(
    (c) =>
      c.statutCommande === 'Livrée' &&
      c.moyenPaiement &&
      !structureExclueDevisFacture(c) &&
      !['Payé', 'Remboursé'].includes(c.statutPaiement) &&
      !c.dernierClicLienPaiement,
  );
}
function construireFeedPriorites(limite) {
  const urgentes = commandesUrgentes();
  const savOuverts = savOuvertsListe();
  const docsEnAttente = docsEnAttenteListe();
  const paiementsEnAttente = commandesPaiementEnAttente();
  const livraisonsDepassees = commandesLivraisonDepassee();
  const aRapprocher = commandesARapprocher();
  const dateItem = (v) => {
    const iso = dateVersISO(v);
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d : new Date(0);
  };
  const feedBrut = [
    ...urgentes.map((c) => {
      const t = mkTag(c.statutCommande, ORDER_META);
      return {
        ...t,
        type: 'Commande',
        id: c.reference,
        structure: c.nom,
        statut: c.statutCommande,
        urgent: true,
        date: dateItem(c.date),
        attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
      };
    }),
    ...savOuverts.map((s) => {
      const def = state.statutsSav.find((d) => d.statut === s.statut);
      const t = teinteSav(def ? def.couleur : 't-gris');
      return {
        icon: icon(iconeStatutSav(s.statut, def && def.icone), 15),
        badgeBg: t.bg,
        badgeFg: t.fg,
        tagCls: '',
        tagStyle: `background:${t.bg};color:${t.fg}`,
        type: 'SAV',
        id: s.reference,
        structure: s.structureNom || '',
        statut: s.statut,
        urgent: false,
        date: dateItem(s.date),
        attrs: `data-sav-ouvrir="${echapper(s.reference)}"`,
      };
    }),
    ...docsEnAttente.map((d) => {
      const t = mkTag(d.statut, DOC_META);
      return {
        ...t,
        type: d.type,
        id: d.referenceDevis || d.referenceFacture,
        structure: d.nomStructure || '',
        statut: d.statut,
        urgent: d.statut === 'En retard',
        date: dateItem(d.date),
        attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(d.referenceDevis || d.referenceFacture)}"`,
      };
    }),
    ...paiementsEnAttente.map((c) => ({
      icon: icon('receipt', 15),
      badgeBg: 'var(--color-accent-100)',
      badgeFg: 'var(--color-accent-700)',
      tagCls: 'tag-accent',
      type: 'Paiement',
      id: c.reference,
      structure: c.nom,
      statut: 'Lien de paiement consulté',
      urgent: true,
      date: dateItem(c.date),
      attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
    })),
    ...livraisonsDepassees.map((c) => ({
      icon: icon('eclair', 15),
      badgeBg: 'var(--color-accent-100)',
      badgeFg: 'var(--color-accent-700)',
      tagCls: 'tag-accent',
      type: 'Livraison',
      id: c.reference,
      structure: c.nom,
      statut: 'Date dépassée, à vérifier',
      urgent: true,
      date: dateItem(c.dateLivraisonCible),
      attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
    })),
    ...commandesDevisDemande().map((c) => ({
      icon: icon('file', 15),
      badgeBg: 'var(--th-bg-fbe3ecff, #FBE3EC)',
      badgeFg: 'var(--th-tx-c2185bff, #C2185B)',
      tagCls: '',
      tagStyle: 'background:var(--th-bg-fbe3ecff, #FBE3EC);color:var(--th-tx-c2185bff, #C2185B)',
      type: 'Devis',
      id: c.reference,
      structure: c.nom,
      statut: 'Devis demandé, à générer',
      urgent: joursDepuis(c.date) >= 2,
      date: dateItem(c.date),
      attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
    })),
    ...commandesTransferees().map((c) => ({
      icon: icon('arrow', 15),
      badgeBg: 'var(--color-accent-100)',
      badgeFg: 'var(--color-accent-700)',
      tagCls: 'tag-accent',
      type: 'Transfert',
      id: c.reference,
      structure: c.nom,
      statut: 'Transférée par une Interne',
      urgent: true,
      date: dateItem(c.date),
      attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
    })),
    ...commandesNouvelles().map((c) => {
      const j = joursDepuis(c.date);
      return {
        icon: icon('inbox', 15),
        badgeBg: j >= 3 ? '#FFF3CC' : 'var(--color-neutral-100)',
        badgeFg: j >= 3 ? '#7A5A00' : 'var(--color-neutral-700)',
        tagCls: '',
        tagStyle: j >= 3 ? 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)' : '',
        type: 'Commande',
        id: c.reference,
        structure: c.nom,
        statut: j >= 3 ? `Reçue depuis ${j} jours` : 'Nouvelle commande',
        urgent: false,
        date: dateItem(c.date),
        attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
      };
    }),
    ...commandesDateSouhaiteeDepassee().map((c) => ({
      icon: icon('clock', 15),
      badgeBg: 'var(--th-bg-fbe4e4ff, #FBE4E4)',
      badgeFg: 'var(--th-tx-c62828ff, #c62828)',
      tagCls: '',
      tagStyle: 'background:var(--th-bg-fbe4e4ff, #FBE4E4);color:var(--th-tx-c62828ff, #c62828)',
      type: 'Délai',
      id: c.reference,
      structure: c.nom,
      statut: `Date souhaitée dépassée (${c.dateLivraisonSouhaitee})`,
      urgent: true,
      date: dateItem(c.dateLivraisonSouhaitee),
      attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
    })),
    ...commandesLivreesNonPayees().map((c) => ({
      icon: icon('receipt', 15),
      badgeBg: 'var(--th-bg-fff3ccff, #FFF3CC)',
      badgeFg: 'var(--th-tx-7a5a00ff, #7A5A00)',
      tagCls: '',
      tagStyle: 'background:var(--th-bg-fff3ccff, #FFF3CC);color:var(--th-tx-7a5a00ff, #7A5A00)',
      type: 'Paiement',
      id: c.reference,
      structure: c.nom,
      statut: `Livrée, ${String(c.statutPaiement || 'non payée').toLowerCase()}`,
      urgent: false,
      date: dateItem(c.dateLivraison || c.date),
      attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
    })),
    ...feedDepotVente(),
    ...aRapprocher.map((c) => {
      const cloture3 = c.statutComptable === 'Rapproché';
      const t3 = cloture3
        ? { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' }
        : { bg: 'var(--color-corail-100)', fg: 'var(--color-corail-700)' };
      return {
        icon: icon(cloture3 ? 'check' : 'clock', 15),
        badgeBg: t3.bg,
        badgeFg: t3.fg,
        tagCls: '',
        tagStyle: `background:${t3.bg};color:${t3.fg}`,
        type: 'Facture',
        id: c.reference,
        structure: c.nom,
        statut: cloture3 ? 'Rapproché, à clôturer' : 'Non rapproché',
        urgent: !cloture3,
        date: dateItem(c.date),
        attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}"`,
      };
    }),
  ];
  // Une commande peut remonter plusieurs fois (urgente + devis demandé…) : on garde la
  // première occurrence (la plus prioritaire, les urgentes étant listées en tête).
  // Motifs supplémentaires ajoutés au libellé de la première occurrence (ex. « Reçue · Devis
  // demandé, à générer ») plutôt que de répéter la même commande plusieurs fois.
  const parId = new Map();
  const feedUnique = [];
  feedBrut.forEach((f) => {
    const deja = parId.get(f.id);
    if (deja) {
      if (!String(deja.statut).includes(f.statut)) deja.statut = `${deja.statut} · ${f.statut}`;
      deja.urgent = deja.urgent || f.urgent;
      return;
    }
    const copie = { ...f };
    parId.set(f.id, copie);
    feedUnique.push(copie);
  });
  return feedUnique.sort((a, b) => b.urgent - a.urgent || b.date - a.date).slice(0, limite || 20);
}
/** Rendu HTML d'une ligne de fil des priorités — partagé entre le tableau de bord et la cloche. */
function ligneFeedPriorite(f) {
  if (estUnifie())
    return `<div class="rp-fil-ligne${f.urgent ? ' urgent' : ''}" ${f.attrs} role="button" tabindex="0">
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
function cleNotif(f) {
  return `${f.id}|${f.statut}`;
}
function notifsMasquees() {
  try {
    return new Set(JSON.parse(localStorage.getItem('cvdl-notifs-masquees') || '[]'));
  } catch (e) {
    return new Set();
  }
}
function masquerNotifs(cles) {
  const m = notifsMasquees();
  cles.forEach((k) => m.add(k));
  try {
    localStorage.setItem('cvdl-notifs-masquees', JSON.stringify([...m].slice(-500)));
  } catch (e) {}
}
document.addEventListener(
  'click',
  (e) => {
    const x = e.target.closest('[data-masquer-notif]');
    if (x) {
      e.stopPropagation();
      masquerNotifs([x.dataset.masquerNotif]);
      rendreClocheNotifications();
      return;
    }
    if (e.target.closest('[data-masquer-toutes-notifs]')) {
      e.stopPropagation();
      masquerNotifs(construireFeedPriorites(20).map(cleNotif));
      rendreClocheNotifications();
    }
  },
  true,
);
function rendreClocheNotifications() {
  const masquees = notifsMasquees();
  const feed = construireFeedPriorites(20).filter((f) => !masquees.has(cleNotif(f)));
  const nbUrgent = feed.filter((f) => f.urgent).length;
  $('rp-cloche-badge').textContent = nbUrgent > 99 ? '99+' : nbUrgent;
  $('rp-cloche-badge').hidden = !nbUrgent;
  const panneau = $('rp-cloche-panel');
  panneau.hidden = !state.notifOuverte;
  if (state.notifOuverte) {
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
        ${feed.length ? feed.map((f) => `<div class="notif-ligne">${ligneFeedPriorite(f)}<button type="button" class="notif-x" data-masquer-notif="${echapper(cleNotif(f))}" aria-label="Supprimer cette notification" title="Supprimer">✕</button></div>`).join('') : '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Rien à traiter — tout est à jour.</p>'}
      </div>
      ${feed.length ? '<div class="notif-pied"><button type="button" class="btn-lien" data-masquer-toutes-notifs>Tout effacer</button></div>' : ''}`;
    if (window.portailIllustrations) window.portailIllustrations(panneau);
  }
}
window.addEventListener('resize', () => {
  if (state.notifOuverte) {
    state.notifOuverte = false;
    render();
  }
});

function vueDashboard() {
  const urgentes = commandesUrgentes();
  const savOuverts = savOuvertsListe();
  const aRapprocher = commandesARapprocher();

  // Données du bento (mêmes couleurs que la charte : navy #002743, turquoise, magenta, jaune)
  const aDecider = state.commandes.filter((c) => c.statutCommande === 'Reçue');
  const enPreparation = state.commandes.filter((c) => c.statutCommande === 'Validée');
  const plusUrgente = urgentes[0] || null;
  const joursAttente = plusUrgente
    ? Math.max(0, Math.round((new Date() - new Date(dateVersISO(plusUrgente.date) || Date.now())) / 86400000))
    : 0;
  const materielUrgent = plusUrgente
    ? Object.entries(
        (plusUrgente.lignes || []).reduce((acc, l) => {
          acc[l.produit] = (acc[l.produit] || 0) + (parseInt(l.quantite, 10) || 0);
          return acc;
        }, {}),
      )
        .map(([nom, q]) => `${q} ${nom}`)
        .join(', ')
    : '';
  const montantARapprocher = aRapprocher.reduce((s, c) => {
    const f = state.factures.find((x) => x.referenceFacture === c.referenceFacture);
    return s + (f ? parseFloat(f.montantTotal) || 0 : 0);
  }, 0);
  const enRetardRapprochement = aRapprocher.filter((c) => {
    const f = state.factures.find((x) => x.referenceFacture === c.referenceFacture);
    if (!f) return false;
    const d = dateVersISO(f.date);
    const dt = d ? new Date(d) : null;
    return dt && !Number.isNaN(dt.getTime()) && (new Date() - dt) / 86400000 > 30;
  }).length;
  const avancementMoyenSav = savOuverts.length
    ? Math.round(
        (savOuverts.reduce((s, t) => {
          const ordre = state.statutsSav.filter((d) => !d.terminal).map((d) => d.statut);
          const idx = ordre.indexOf(t.statut);
          return s + (idx >= 0 ? (idx + 1) / Math.max(1, ordre.length) : 0);
        }, 0) /
          savOuverts.length) *
          100,
      )
    : 0;

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
        <b>${plusUrgente ? `${echapper(plusUrgente.reference)} · ${echapper(plusUrgente.nom)}` : aDecider.length ? `${aDecider.length} commande${aDecider.length > 1 ? 's attendent' : ' attend'} votre décision` : 'Tout est à jour'}</b>
        <span>${plusUrgente ? `${echapper(materielUrgent || '')} · ${joursAttente} jour${joursAttente > 1 ? 's' : ''} d’attente` : `${savOuverts.length} SAV ouvert${savOuverts.length > 1 ? 's' : ''} · ${commandesDevisDemande().length} devis à préparer`}</span>
      </div>
      <span class="rp-banniere-btn">${plusUrgente ? 'Ouvrir la commande' : 'Voir les commandes'} ${icon('arrow', 15)}</span>
    </div>
    <div class="rp-kpis">
      ${[
        {
          ill: 'commandes',
          k: 'À décider',
          v: aDecider.length,
          d: 'commande' + (aDecider.length > 1 ? 's' : '') + ' reçue' + (aDecider.length > 1 ? 's' : ''),
          attr: 'data-kpi-listing="a-decider"',
        },
        {
          ill: 'facture',
          k: 'Devis à préparer',
          v: commandesDevisDemande().length,
          d: 'demandés par les structures',
          attr: 'data-nav="factures"',
        },
        {
          ill: 'stock',
          k: 'En préparation',
          v: enPreparation.length,
          d: 'commande' + (enPreparation.length > 1 ? 's' : '') + ' validée' + (enPreparation.length > 1 ? 's' : ''),
          attr: 'data-kpi-listing="en-preparation"',
        },
        {
          ill: 'suiviSav',
          k: 'SAV ouverts',
          v: savOuverts.length,
          d: `avancement moyen ${avancementMoyenSav} %`,
          attr: 'data-nav="sav"',
        },
        {
          ill: 'attestations',
          k: 'À clôturer',
          v: formaterMontant(montantARapprocher),
          d: `${aRapprocher.length} facture${aRapprocher.length > 1 ? 's' : ''}${enRetardRapprochement ? `, ${enRetardRapprochement} en retard` : ''}`,
          attr: 'data-kpi-listing="facturation"',
          alerte: enRetardRapprochement > 0,
        },
      ]
        .map(
          (k) =>
            `<div class="rp-kpi ${k.alerte ? 'alerte' : ''}" ${k.attr} role="button" tabindex="0"><span data-ill="${k.ill}" class="ill"></span><span class="rp-kpi-txt"><span class="rp-kpi-k">${k.k}</span><b>${k.v}</b><small>${k.d}</small></span></div>`,
        )
        .join('')}
    </div>
    ${
      estUnifie()
        ? blocFilEtCalendrierUnifie(feed)
        : `<div class="card elev-sm" style="padding:var(--space-6);min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:var(--space-6)">
      <div style="min-width:0">
      <div class="card-title" style="font-size:18px;margin-bottom:var(--space-3)">Fil des priorités</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${feed.length ? feed.map(ligneFeedPriorite).join('') : '<p style="opacity:0.5;font-size:13px;padding:var(--space-3)">Rien à traiter — tout est à jour.</p>'}
      </div>
      </div>
      <div style="border-left:1px solid var(--color-divider);padding-left:var(--space-6);margin:calc(var(--space-6) * -1) 0;padding-top:var(--space-6);padding-bottom:var(--space-6)">
        ${carteCalendrierLivraisonsContenu()}
      </div>
    </div>`
    }`;
}
/** Tableau de bord, style unifié : fil des priorités en liste de cartes (urgent / à suivre) +
 *  calendrier dans sa propre carte à droite. */
function blocFilEtCalendrierUnifie(feed) {
  const urgents = feed.filter((f) => f.urgent),
    autres = feed.filter((f) => !f.urgent);
  const groupe = (titre, liste) =>
    liste.length
      ? `<div class="rp-fil-groupe"><div class="rp-surtitre">${titre} · ${liste.length}</div>${liste.map(ligneFeedPriorite).join('')}</div>`
      : '';
  return `<div class="rp-dash-grille">
    <section class="card rp-fil">
      <div class="rp-fil-tete"><span data-ill="tableau" class="ill s"></span><h2>Fil des priorités</h2>${legendeFormes()}</div>
      ${feed.length ? groupe('Urgent', urgents) + groupe('À suivre', autres) : '<div class="pk-etat"><span data-ill="vide" class="ill"></span>Rien à traiter — tout est à jour.</div>'}
    </section>
    <section class="card rp-cal">${carteCalendrierLivraisonsContenu()}</section>
  </div>`;
}
/** Légende des formes de statut (style unifié). */
function legendeFormes() {
  return `<div class="rp-legende"><span data-forme="losange">En attente de décision</span><span data-forme="carre">En cours</span><span data-forme="rond">Terminé</span></div>`;
}

/* ============================================================
   Commandes — kanban + "à livrer" + recherche
   ============================================================ */
function commentaireReel(c) {
  return !!(c.commentaire && !c.commentaire.startsWith('##LOGISTIQUE_QUANTITES##'));
}
