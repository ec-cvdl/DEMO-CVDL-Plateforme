/* Admin CVDL — liste et kanban des commandes. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ── Rendu commun des commandes (liste + kanban) au format du kit ── */
const COULEUR_STATUT_COMMANDE = {
  Reçue: '#FECC38',
  Validée: '#E62460',
  Préparée: '#00ACB0',
  'En cours de livraison': '#00777A',
  Livrée: '#1F9D55',
  Annulée: '#8FA3B3',
};
function pastilleStatutCommande(statut) {
  const coul = COULEUR_STATUT_COMMANDE[statut] || '#8FA3B3';
  return `<span class="rp-statut" style="--st:${coul}">${echapper(statut === 'En cours de livraison' ? 'En livraison' : statut)}</span>`;
}
function articlesIllustres(c, max) {
  const lignes = c.lignes || [];
  const tout = lignes.map((l) => {
    const p = state.produits.find((x) => x.nom === l.produit);
    return `<span class="rp-art" title="${echapper(l.quantite + ' × ' + l.produit)}">${illustrationProduitAdmin(l.produit, p ? p.icone : '', 24)}<b>${parseInt(l.quantite, 10) || 0}</b></span>`;
  });
  return (
    tout.slice(0, max || 4).join('') +
    (tout.length > (max || 4) ? `<span class="rp-art-plus">+${tout.length - (max || 4)}</span>` : '')
  );
}
/** Badge « Urgent » (commande ASAP) : magenta tant qu'elle n'est pas livrée, vert une fois livrée. */
function badgeUrgentCommande(c) {
  if (c.dateLivraisonSouhaitee !== 'ASAP' || c.statutCommande === 'Annulée') return '';
  const livree = c.statutCommande === 'Livrée';
  return `<span class="rp-badge-urgent${livree ? ' ok' : ''}" title="${livree ? 'Commande urgente — bien livrée' : 'Commande urgente (dès que possible)'}">Urgent${livree ? ' · livrée' : ''}</span>`;
}
/** Produit le plus nombreux d'une commande (illustration en tête de ligne). */
function produitPrincipalCommande(c) {
  const lignes = (c.lignes || [])
    .slice()
    .sort((a, b) => (parseInt(b.quantite, 10) || 0) - (parseInt(a.quantite, 10) || 0));
  return lignes[0] ? lignes[0].produit : '';
}
/** Détail texte des articles (« 3 × PC portable · 1 × Souris »), à la place des icônes. */
function detailArticlesCommande(c) {
  const lignes = (c.lignes || [])
    .slice()
    .sort((a, b) => (parseInt(b.quantite, 10) || 0) - (parseInt(a.quantite, 10) || 0));
  if (!lignes.length) return '<small>—</small>';
  return `<span class="rp-arts-detail">${lignes.map((l) => `<span title="${echapper(l.produit)}"><b>${parseInt(l.quantite, 10) || 0} ×</b> ${echapper(l.produit)}</span>`).join('')}</span>`;
}
function indicateursCommande(c, opts = {}) {
  return (
    (opts.urgent ? ' ' + badgeUrgentCommande(c) : '') +
    (commentaireReel(c) ? `<span class="rp-ind" title="Commentaire de la structure">${icon('bulle', 12)}</span>` : '') +
    badgesCommandeListe(c)
  );
}

/** « Prochaine action » d'une commande dans les listes (règles serveur, voir resumeRegles). */
function prochaineActionCommande(c) {
  const r = c.regles;
  if (!r || !r.etapeSuivante) return '';
  if (r.peutAvancer) return `<small class="rp-prochain ok">Prête pour « ${echapper(r.etapeSuivante)} »</small>`;
  const m = r.manquants || [];
  return `<small class="rp-prochain" title="${echapper(m.join(' · '))}">À faire : ${echapper(m[0] || r.etapeSuivante)}${m.length > 1 ? ` (+${m.length - 1})` : ''}</small>`;
}
/** Liste regroupée par action (maquette « Commandes — refonte », planche 3). */
function commandesParAction(liste) {
  const il30j = Date.now() - 30 * 86400000;
  const dateIso = (d) => {
    const m = String(d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime() : 0;
  };
  const GROUPES = [
    {
      cle: 'valider',
      titre: 'À valider',
      forme: 'losange',
      couleur: '#E62460',
      filtre: (c) => c.statutCommande === 'Reçue',
    },
    {
      cle: 'preparer',
      titre: 'À préparer',
      forme: 'carre',
      couleur: '#00ACB0',
      filtre: (c) => c.statutCommande === 'Validée',
    },
    {
      cle: 'expedier',
      titre: 'À expédier',
      forme: 'carre',
      couleur: '#00ACB0',
      filtre: (c) => c.statutCommande === 'Préparée',
    },
    {
      cle: 'livraison',
      titre: 'En livraison',
      forme: 'carre',
      couleur: '#00777A',
      filtre: (c) => c.statutCommande === 'En cours de livraison',
    },
    {
      cle: 'livrees',
      titre: 'Livrées ces 30 jours',
      forme: 'rond',
      couleur: '#1F9D55',
      ferme: true,
      filtre: (c) => c.statutCommande === 'Livrée' && dateIso(c.dateLivraison) >= il30j,
    },
  ];
  const urgentesDabord = (a, b) =>
    (b.dateLivraisonSouhaitee === 'ASAP') - (a.dateLivraisonSouhaitee === 'ASAP') || b.ligne - a.ligne;
  const html = GROUPES.map((g) => {
    const membres = liste.filter(g.filtre).sort(urgentesDabord);
    if (!membres.length) return '';
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
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-groupe-commandes]');
  if (!g) return;
  const cle = g.dataset.groupeCommandes;
  state.groupesCommandesOuverts[cle] = g.getAttribute('aria-expanded') !== 'true';
  render();
});
function tableauCommandes(liste, opts = {}) {
  const parPage = opts.tout ? Math.max(1, liste.length) : 25;
  const page = opts.tout ? 0 : state.commandesPage || 0;
  const total = liste.length;
  const debut = page * parPage;
  const pageListe = liste.slice(debut, debut + parPage);
  const nbPages = Math.max(1, Math.ceil(total / parPage));
  return `
    <div class="rp-liste">
      <div class="rp-liste-tete"><span class="rp-col-ill" aria-hidden="true"></span><span>Commande</span><span>Articles</span><span class="rp-col-m">Paiement</span><span class="rp-col-m">Livraison</span><span>Statut</span></div>
      ${
        pageListe.length
          ? pageListe
              .map((c) => {
                const montant = c.montantFacture != null ? c.montantFacture : c.montantEstime;
                const exempte = structureExclueDevisFacture(c);
                const payee = c.statutPaiement === 'Payé';
                return `
        <div class="rp-ligne ${c.statutCommande === 'Annulée' ? 'annulee' : ''} ${c.statutCommande === 'Livrée' ? 'livree' : ''}" data-commande-ouvrir="${echapper(c.reference)}" role="button" tabindex="0" style="--st:${COULEUR_STATUT_COMMANDE[c.statutCommande] || 'var(--th-ac-8fa3b3ff, #8FA3B3)'}">
          <span class="rp-col-ill" aria-hidden="true">${(() => {
            const pp = produitPrincipalCommande(c);
            if (!pp) return '';
            const p = state.produits.find((x) => x.nom === pp);
            return illustrationProduitAdmin(pp, p ? p.icone : '', 34);
          })()}</span>
          <span class="rp-ligne-id"><b>${echapper(c.reference)}</b>${indicateursCommande(c)}<small>${(() => {
            const st = state.structures.find((x) => x.code === c.code);
            return st
              ? `<button type="button" class="lien-structure" data-structure-vue="${st.ligne}" title="Ouvrir la fiche 360° de la structure">${echapper(c.nom)}</button>`
              : echapper(c.nom);
          })()} · ${echapper(c.date)}</small>${c.regles ? `<span class="rp-type-cmd">${echapper(c.regles.libelleType)}${c.regles.circuit === 'interne' ? ' · circuit Interne' : ''}</span>` : ''}</span>
          <span class="rp-ligne-arts">${detailArticlesCommande(c)}</span>
          <span class="rp-col-m rp-ligne-pay">${exempte ? '<small>—</small>' : `${montant != null ? `<b>${formaterMontant(montant)}</b>` : ''}<small class="${payee ? 'ok' : ''}">${echapper(c.statutPaiement || (c.moyenPaiement ? 'Non payé' : '—'))}</small>`}</span>
          <span class="rp-col-m rp-ligne-liv"><small>${echapper(c.modeLivraison === 'Livraison EC' ? 'Livraison EC' : c.modeLivraison || '—')}</small>${c.dateLivraisonSouhaitee === 'ASAP' ? badgeUrgentCommande(c) : c.dateLivraisonSouhaitee ? `<small>Souhaitée ${echapper(c.dateLivraisonSouhaitee)}</small>` : ''}</span>
          <span class="rp-ligne-statut">${pastilleStatutCommande(c.statutCommande)}${prochaineActionCommande(c)}</span>
        </div>`;
              })
              .join('')
          : `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucune commande.</div>`
      }
    </div>
    ${
      nbPages > 1
        ? `
    <div class="rp-pagination">
      <button type="button" class="btn btn-secondary btn-icon" data-page-commandes="${page - 1}" ${page === 0 ? 'disabled' : ''} aria-label="Page précédente">${icon('chevron', 14)}</button>
      <span>Page ${page + 1} / ${nbPages} · ${total} commande${total > 1 ? 's' : ''}</span>
      <button type="button" class="btn btn-secondary btn-icon" data-page-commandes="${page + 1}" ${page >= nbPages - 1 ? 'disabled' : ''} style="transform:rotate(180deg)" aria-label="Page suivante">${icon('chevron', 14)}</button>
    </div>`
        : ''
    }`;
}

function vueCommandes() {
  const q = state.commandeSearch.trim().toLowerCase();
  let liste = q
    ? state.commandes.filter((c) => c.reference.toLowerCase().includes(q) || c.nom.toLowerCase().includes(q))
    : state.commandes;
  const listeAvantFiltreStatut = liste;
  if (state.commandesFiltreStatut === 'URGENT')
    liste = liste.filter(
      (c) =>
        c.dateLivraisonSouhaitee === 'ASAP' &&
        !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande),
    );
  else if (state.commandesFiltreStatut === 'PRETES') liste = liste.filter((c) => c.regles && c.regles.peutAvancer);
  else if (state.commandesFiltreStatut && state.commandesFiltreStatut !== 'ACTION')
    liste = liste.filter((c) => c.statutCommande === state.commandesFiltreStatut);
  // Filtre par type de structure (règles de la commande, calculées par le serveur)
  const typesPresents = [
    ...new Map(state.commandes.filter((c) => c.regles).map((c) => [c.regles.type, c.regles.libelleType])).entries(),
  ];
  if (state.commandesFiltreType) liste = liste.filter((c) => c.regles && c.regles.type === state.commandesFiltreType);

  // "À livrer" reste un résumé global, indépendant du filtre de statut affiché juste en
  // dessous (sinon il disparaît dès qu'un filtre est actif) — seule la recherche s'applique.
  const aLivrer = listeAvantFiltreStatut.filter((c) => c.statutCommande !== 'Livrée' && c.statutCommande !== 'Annulée');
  const parProduit = {};
  aLivrer.forEach((c) =>
    (c.lignes || []).forEach((l) => {
      parProduit[l.produit] = (parProduit[l.produit] || 0) + parseInt(l.quantite, 10);
    }),
  );
  const resume = Object.keys(parProduit)
    .map((nom) => ({ label: nom, qty: parProduit[nom] }))
    .sort((a, b) => b.qty - a.qty);
  const totalArticles = resume.reduce((s, m) => s + m.qty, 0);
  const nbUrgentesListe = listeAvantFiltreStatut.filter(
    (c) =>
      c.dateLivraisonSouhaitee === 'ASAP' && !['En cours de livraison', 'Livrée', 'Annulée'].includes(c.statutCommande),
  ).length;

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
        ${
          resume.length
            ? resume
                .map(
                  (m) => `
          <div class="card elev-sm" style="min-width:0;padding:var(--space-4);gap:var(--space-2);cursor:pointer" data-livrer-produit="${echapper(m.label)}">
            <span style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex:none">${illustrationProduitAdmin(m.label, (state.produits.find((p) => p.nom === m.label) || {}).icone, 38)}</span>
            <div style="font-family:var(--font-heading);font-size:24px;line-height:1">${m.qty}</div>
            <div style="font-size:12px;opacity:0.6">${echapper(m.label)}</div>
          </div>`,
                )
                .join('')
            : '<p style="opacity:0.5;font-size:13px">Rien à livrer.</p>'
        }
      </div>
    </div>
    <div class="rp-filtres">
      <button type="button" class="rp-filtre ${state.commandesFiltreStatut === 'ACTION' ? 'actif' : ''}" data-filtrer-statut-commande="ACTION">Par action</button>
      <button type="button" class="rp-filtre ${!state.commandesFiltreStatut ? 'actif' : ''}" data-filtrer-statut-commande="">Toutes<span class="n">${listeAvantFiltreStatut.length}</span></button>
      <button type="button" class="rp-filtre urg ${state.commandesFiltreStatut === 'URGENT' ? 'actif' : ''}" data-filtrer-statut-commande="URGENT">${icon('eclair', 13)}Urgentes<span class="n">${nbUrgentesListe}</span></button>
      <button type="button" class="rp-filtre ${state.commandesFiltreStatut === 'PRETES' ? 'actif' : ''}" data-filtrer-statut-commande="PRETES">${icon('check', 13)}Prêtes à avancer<span class="n">${listeAvantFiltreStatut.filter((c) => c.regles && c.regles.peutAvancer).length}</span></button>
      ${ORDER_STATUSES.map((st) => {
        const n = listeAvantFiltreStatut.filter((c) => c.statutCommande === st).length;
        return `<button type="button" class="rp-filtre ${state.commandesFiltreStatut === st ? 'actif' : ''}" style="--st:${COULEUR_STATUT_COMMANDE[st] || 'var(--th-ac-8fa3b3ff, #8FA3B3)'}" data-filtrer-statut-commande="${echapper(st)}"><span class="rp-point"></span>${echapper(st === 'En cours de livraison' ? 'En livraison' : st)}<span class="n">${n}</span></button>`;
      }).join('')}
    </div>
    ${
      typesPresents.length > 1
        ? `<div class="rp-filtres rp-filtres-type">
      <span class="rp-surtitre">Type</span>
      <button type="button" class="rp-filtre ${!state.commandesFiltreType ? 'actif' : ''}" data-filtrer-type-commande="">Tous</button>
      ${typesPresents.map(([t, lib]) => `<button type="button" class="rp-filtre ${state.commandesFiltreType === t ? 'actif' : ''}" data-filtrer-type-commande="${echapper(t)}">${echapper(lib)}</button>`).join('')}
    </div>`
        : ''
    }
    ${state.commandesFiltreStatut === 'ACTION' ? commandesParAction(liste) : tableauCommandes(liste)}`;
}
function kanbanCommandes(liste) {
  return `
    <div class="rp-kanban">
      ${ORDER_STATUSES.map((statut) => {
        const items = liste.filter((c) => c.statutCommande === statut);
        const coul = COULEUR_STATUT_COMMANDE[statut] || '#8FA3B3';
        return `
        <div class="rp-kb-col" style="--st:${coul}">
          <div class="rp-kb-tete"><span class="rp-kb-point"></span><b>${echapper(statut === 'En cours de livraison' ? 'En livraison' : statut)}</b><span>${items.length}</span></div>
          <div class="rp-kanban-zone rp-kb-zone" data-kanban-colonne="${echapper(statut)}">
          ${
            items
              .map((c) => {
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
              })
              .join('') || '<div class="rp-kb-vide">Aucune</div>'
          }
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
let ligneCommandeEnGlisse = null;
let ligneSavEnGlisse = null;
let materielDragLigne = null;
let materielDragCat = null;
document.addEventListener('dragstart', (e) => {
  const carte = e.target.closest('[data-kanban-carte]');
  if (carte) {
    ligneCommandeEnGlisse = carte.dataset.kanbanCarte;
    carte.style.opacity = '.4';
    return;
  }
  const carteSav = e.target.closest('[data-kanban-sav-carte]');
  if (carteSav) {
    ligneSavEnGlisse = carteSav.dataset.kanbanSavCarte;
    carteSav.style.opacity = '.4';
  }
});
document.addEventListener('dragend', (e) => {
  const carte = e.target.closest('[data-kanban-carte]');
  if (carte) carte.style.opacity = '';
  const carteSav = e.target.closest('[data-kanban-sav-carte]');
  if (carteSav) carteSav.style.opacity = '';
});
document.addEventListener('dragover', (e) => {
  const zone = e.target.closest('[data-kanban-colonne], [data-kanban-sav-colonne]');
  if (!zone) return;
  e.preventDefault();
  zone.style.background = 'var(--color-neutral-200)';
});
document.addEventListener('dragleave', (e) => {
  const zone = e.target.closest('[data-kanban-colonne], [data-kanban-sav-colonne]');
  if (zone) zone.style.background = '';
});
document.addEventListener('drop', (e) => {
  const zoneSav = e.target.closest('[data-kanban-sav-colonne]');
  if (zoneSav && ligneSavEnGlisse) {
    e.preventDefault();
    zoneSav.style.background = '';
    const s = state.sav.find((x) => x.reference === ligneSavEnGlisse);
    ligneSavEnGlisse = null;
    if (s && s.statut !== zoneSav.dataset.kanbanSavColonne)
      changerStatutSav(s.reference, zoneSav.dataset.kanbanSavColonne);
    return;
  }
  const zone = e.target.closest('[data-kanban-colonne]');
  if (!zone || !ligneCommandeEnGlisse) return;
  e.preventDefault();
  zone.style.background = '';
  const c = state.commandes.find((x) => x.reference === ligneCommandeEnGlisse);
  ligneCommandeEnGlisse = null;
  if (!c) return;
  const idxActuel = ORDER_STATUSES.indexOf(c.statutCommande);
  const idxCible = ORDER_STATUSES.indexOf(zone.dataset.kanbanColonne);
  if (idxCible === idxActuel) return; // déposée dans sa colonne d'origine, rien à faire
  if (zone.dataset.kanbanColonne === 'Validée') {
    etat('Le passage à "Validée" se fait uniquement via la validation logistique (ouvre la fiche).', 'erreur');
    return;
  }
  if (idxCible !== idxActuel + 1) {
    etat("Les étapes s'enchaînent une par une, impossible de sauter une étape.", 'erreur');
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
document.addEventListener('dragstart', (e) => {
  const carte = e.target.closest('[data-materiel-carte]');
  if (carte) {
    materielDragLigne = parseInt(carte.dataset.materielCarte, 10);
    materielDragCat = carte.dataset.materielCat;
    carte.style.opacity = '.4';
  }
});
document.addEventListener('dragend', (e) => {
  const carte = e.target.closest('[data-materiel-carte]');
  if (carte) carte.style.opacity = '';
});
document.addEventListener('dragover', (e) => {
  if (e.target.closest('[data-materiel-carte]')) e.preventDefault();
});
document.addEventListener('drop', (e) => {
  const cible = e.target.closest('[data-materiel-carte]');
  if (!cible || materielDragLigne == null || cible.dataset.materielCat !== materielDragCat) return;
  e.preventDefault();
  const liste = state.materielGroupes[materielDragCat];
  const depuis = liste.indexOf(materielDragLigne);
  const vers = parseInt(cible.dataset.materielIndex, 10);
  if (depuis !== -1 && depuis !== vers) {
    liste.splice(depuis, 1);
    liste.splice(vers, 0, materielDragLigne);
    render();
  }
  materielDragLigne = null;
  materielDragCat = null;
});

/* ============================================================
   SAV — kanban dynamique + recherche
   ============================================================ */
/** Modale "À livrer" — commandes non livrées contenant ce produit précisément, chacune
 *  cliquable pour ouvrir sa fiche détaillée (même modale que partout ailleurs). */
/** Listing derrière les cartes KPI du tableau de bord — mêmes filtres que le fil des
 *  priorités, juste sans la limite d'affichage à 4 pour le SAV. */
function vueKpiListing(quoi) {
  const defs = {
    urgentes: {
      titre: 'Commandes urgentes',
      liste: commandesUrgentes(),
      rendre: (c) => {
        const t = mkTag(c.statutCommande, ORDER_META);
        return {
          id: c.reference,
          structure: c.nom,
          statutTag: t,
          statut: c.statutCommande,
          attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
        };
      },
    },
    'a-decider': {
      titre: 'À décider maintenant',
      liste: state.commandes.filter((c) => c.statutCommande === 'Reçue'),
      rendre: (c) => {
        const t = mkTag(c.statutCommande, ORDER_META);
        return {
          id: c.reference,
          structure: c.nom,
          statutTag: t,
          statut: c.statutCommande,
          attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
        };
      },
    },
    'en-preparation': {
      titre: 'Commandes validées, à préparer',
      liste: state.commandes.filter((c) => c.statutCommande === 'Validée'),
      rendre: (c) => {
        const t = mkTag(c.statutCommande, ORDER_META);
        return {
          id: c.reference,
          structure: c.nom,
          statutTag: t,
          statut: c.statutCommande,
          attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
        };
      },
    },
    'sav-en-cours': {
      titre: 'SAV en cours',
      liste: savOuvertsListe(),
      rendre: (s) => {
        const t = mkTag(s.statut, {});
        return {
          id: s.reference,
          structure: s.structureNom || '',
          statutTag: t,
          statut: s.statut,
          attrs: `data-sav-ouvrir="${echapper(s.reference)}"`,
        };
      },
    },
    // Bug corrigé : cette liste utilisait docsEnAttenteListe() (devis/factures au statut "En
    // attente"), une donnée totalement différente du montant/nombre affiché sur la case "À
    // clôturer" du tableau de bord (qui vient de commandesARapprocher(), les factures à
    // rapprocher/clôturer) — la carte annonçait un nombre non nul, mais cliquer dessus ouvrait
    // une liste vide ou sans rapport, puisqu'elle interrogeait une tout autre donnée.
    facturation: {
      titre: 'Factures à clôturer',
      liste: commandesARapprocher(),
      rendre: (c) => {
        const cloture = c.statutComptable === 'Rapproché';
        const statutTag = {
          icon: icon(cloture ? 'check' : 'clock', 15),
          tagCls: '',
          badgeBg: cloture ? BADGE['tag-accent-2'].bg : 'var(--color-corail-100)',
          badgeFg: cloture ? BADGE['tag-accent-2'].fg : 'var(--color-corail-700)',
        };
        return {
          id: c.reference,
          structure: c.nom,
          statutTag,
          statut: c.statutComptable || 'Non rapproché',
          attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}" data-modal-fermer`,
        };
      },
    },
    'toutes-taches': {
      titre: 'Tâches restantes',
      liste: [
        ...commandesUrgentes().map((c) => {
          const t = mkTag(c.statutCommande, ORDER_META);
          return {
            id: c.reference,
            structure: `Commande · ${c.nom}`,
            statutTag: t,
            statut: c.statutCommande,
            attrs: `data-commande-ouvrir="${echapper(c.reference)}"`,
          };
        }),
        ...savOuvertsListe().map((s) => {
          const t = mkTag(s.statut, {});
          return {
            id: s.reference,
            structure: `SAV · ${s.structureNom || ''}`,
            statutTag: t,
            statut: s.statut,
            attrs: `data-sav-ouvrir="${echapper(s.reference)}"`,
          };
        }),
        ...docsEnAttenteListe().map((d) => {
          const t = mkTag(d.statut, DOC_META);
          return {
            id: d.referenceDevis || d.referenceFacture,
            structure: `${d.type} · ${d.nomStructure || ''}`,
            statutTag: t,
            statut: d.statut,
            attrs: `data-feed-goto="factures" data-highlight-doc="${echapper(d.referenceDevis || d.referenceFacture)}" data-modal-fermer`,
          };
        }),
      ],
      rendre: (r) => r,
    },
  };
  const def = defs[quoi];
  if (!def) return '';
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(520px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(def.titre)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.65;margin:0">${def.liste.length} élément${def.liste.length > 1 ? 's' : ''}.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${
            def.liste.length
              ? def.liste
                  .map((item) => {
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
                  })
                  .join('')
              : '<p style="opacity:0.5;font-size:13px">Rien à traiter — tout est à jour.</p>'
          }
        </div>
        
      </div>
    </div>`;
}

function vueALivrer(produit) {
  const concernees = state.commandes.filter(
    (c) =>
      c.statutCommande !== 'Livrée' &&
      c.statutCommande !== 'Annulée' &&
      (c.lignes || []).some((l) => l.produit === produit),
  );
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(520px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(produit)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.65;margin:0">${concernees.length} commande${concernees.length > 1 ? 's' : ''} à livrer avec ce matériel.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${
            concernees.length
              ? concernees
                  .map((c) => {
                    const qte = (c.lignes || [])
                      .filter((l) => l.produit === produit)
                      .reduce((s, l) => s + (parseInt(l.quantite, 10) || 0), 0);
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
                  })
                  .join('')
              : '<p style="opacity:0.5;font-size:13px">Aucune commande.</p>'
          }
        </div>
        
      </div>
    </div>`;
}

/** Clé d'illustration de symptôme SAV à partir du texte libre (mêmes illustrations que le portail). */
/** Anneau d'avancement des cartes SAV, dessiné en SVG (traits nets même pendant l'effet de
 *  survol de la carte — l'ancien dégradé conique + contours en box-shadow « vibrait »). */
function anneauSavSvg(pourcent) {
  const p = Math.max(0, Math.min(100, pourcent || 0));
  return `<svg class="sv2-anneau-svg" viewBox="0 0 58 58" width="58" height="58" aria-hidden="true">
    <circle class="piste" cx="29" cy="29" r="25.25"/>
    ${p ? `<circle class="prog" cx="29" cy="29" r="25.25" pathLength="100" stroke-dasharray="${p} 100" transform="rotate(-90 29 29)"/>` : ''}
    <circle class="bord" cx="29" cy="29" r="28.1"/>
    <circle class="coeur" cx="29" cy="29" r="22.4"/>
  </svg>`;
}
function cleSymptomeAdmin(texte) {
  if (window.cleSymptomeCvdl) return window.cleSymptomeCvdl(texte);
  const t = String(texte || '').toLowerCase();
  if (/allum|d[ée]marr|power|mort/.test(t)) return 'alimentation';
  if (/[ée]cran|affich|cass/.test(t)) return 'ecran';
  if (/batter|charg/.test(t)) return 'batterie';
  if (/clavier|touche/.test(t)) return 'clavier';
  if (/souris|pav[ée]|trackpad/.test(t)) return 'souris';
  if (/son|audio|haut-parleur|micro/.test(t)) return 'son';
  if (/wi-?fi|internet|r[ée]seau|connexion/.test(t)) return 'internet';
  if (/virus|pirat|malveill/.test(t)) return 'virus';
  if (/mise [àa] jour|update/.test(t)) return 'mise_a_jour';
  if (/lent|rame|bloqu/.test(t)) return 'lenteur';
  return 'generique_sav';
}
