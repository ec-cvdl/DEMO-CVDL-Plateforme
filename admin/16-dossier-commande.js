/* Admin CVDL — fiche commande. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
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
function signatureEtatCommande(c) {
  return [
    c.statutCommande,
    c.numerosSerie,
    c.referenceDevis,
    c.referenceFacture,
    c.pasDeFacture,
    c.modeLivraison,
    c.colissimo,
    c.livraisonSansEnvoi,
    c.statutPaiement,
  ].join('|');
}
function etatServeurCommande(c) {
  const sig = signatureEtatCommande(c);
  const entree = cacheEtatsCommandes[c.reference];
  if (!entree || (entree.sig !== sig && !entree.enCours)) {
    cacheEtatsCommandes[c.reference] = { sig, enCours: true, etat: entree ? entree.etat : null };
    jsonp({ action: 'commande-etat', password: motDePasse, id: c.id })
      .then((r) => {
        cacheEtatsCommandes[c.reference] = { sig, enCours: false, etat: r.ok ? r.etat : null };
        if (state.modal && state.modal.kind === 'commande' && state.modal.ref === c.reference) render();
      })
      .catch(() => {
        cacheEtatsCommandes[c.reference] = { sig, enCours: false, etat: null };
      });
  }
  return cacheEtatsCommandes[c.reference];
}
/* Carte d'étape : menu « Autres actions », réouverture d'une tâche faite, enregistrements
   automatiques (Colissimo, date estimée), bouton principal bloqué tant qu'il manque quelque chose. */
document.addEventListener(
  'click',
  (e) => {
    const bloque = e.target.closest('.et-principal[data-et-bloque]');
    if (bloque) {
      e.preventDefault();
      e.stopImmediatePropagation();
      rappelCalepin();
      return;
    }
    const m = e.target.closest('[data-et-menu]');
    document.querySelectorAll('.et-menu-l').forEach((l) => {
      if (!m || l !== m.nextElementSibling) {
        l.hidden = true;
        const b = l.previousElementSibling;
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });
    if (m) {
      const l = m.nextElementSibling;
      l.hidden = !l.hidden;
      m.setAttribute('aria-expanded', String(!l.hidden));
      return;
    }
    const r = e.target.closest('[data-et-rouvrir]');
    if (r && state.modal) {
      if (r.dataset.etRouvrir === 'mode') state.etRouvrirMode = state.modal.ref;
      else state.etRouvrirDate = state.modal.ref;
      render();
    }
  },
  true,
);
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape' && document.querySelector('.et-menu-l:not([hidden])')) {
      e.stopPropagation();
      document.querySelectorAll('.et-menu-l').forEach((l) => {
        l.hidden = true;
      });
    }
  },
  true,
);
document.addEventListener('change', (e) => {
  const col = e.target.closest && e.target.closest('[data-auto-colissimo]');
  if (col && col.value.trim()) {
    confirmerColissimoPreparation(col.dataset.autoColissimo);
    return;
  }
  const dc = e.target.closest && e.target.closest('[data-auto-date-cible]');
  if (dc) {
    state.etRouvrirDate = null;
    enregistrerDateCibleCommande(dc.dataset.autoDateCible);
  }
});

/** Petite animation quand on essaie d'avancer alors que des tâches du calepin ne sont pas faites. */
function rappelCalepin() {
  const el = document.querySelector('.fc2-manque');
  if (!el) return;
  el.classList.remove('rappel');
  void el.offsetWidth;
  el.classList.add('rappel');
  setTimeout(() => el.classList.remove('rappel'), 1200);
}

document.addEventListener(
  'click',
  (e) => {
    const b = e.target.closest(
      ':is(.rpd, .fc2) :is([data-changer-statut], [data-valider-preparation], [data-marquer-livree], [data-demander-validation])',
    );
    if (!b) return;
    const ref = state.modal && state.modal.ref;
    const cache = ref && cacheEtatsCommandes[ref];
    if (cache && cache.etat && !cache.etat.peutAvancer) rappelCalepin();
  },
  true,
);

/** Journal des événements d'une commande — mis en cache, rechargé si
 *  plus vieux de 20 s (le dossier se ré-affiche après chaque action). */
const cacheHistoriqueCommandes = {};
function historiqueCommande(c) {
  const ref = c.reference;
  const entree = cacheHistoriqueCommandes[ref];
  if (!entree || (!entree.enCours && Date.now() - entree.t > 20000)) {
    cacheHistoriqueCommandes[ref] = { t: Date.now(), enCours: true, evenements: entree ? entree.evenements : null };
    jsonp({ action: 'commande-historique', password: motDePasse, reference: ref })
      .then((r) => {
        cacheHistoriqueCommandes[ref] = {
          t: Date.now(),
          enCours: false,
          evenements: r && r.ok ? r.evenements || [] : [],
        };
        if (state.modal && state.modal.kind === 'commande' && state.modal.ref === ref) render();
      })
      .catch(() => {
        cacheHistoriqueCommandes[ref] = { t: Date.now(), enCours: false, evenements: [] };
      });
  }
  return cacheHistoriqueCommandes[ref];
}
/** Date d'une étape, déduite de l'historique (ou des dates connues de la commande). */
function dateEtapeCommande(c, statut, evenements) {
  const jour = (e) => String(e.date || '').split(' ')[0];
  const trouve = (motif) => {
    const e = (evenements || []).filter((x) => motif.test(x.evenement)).pop();
    return e ? jour(e) : '';
  };
  if (statut === 'Reçue') return c.date || trouve(/Commande (passée|créée)/);
  if (statut === 'Validée') return trouve(/^Validée/);
  if (statut === 'Livrée') return c.dateLivraison || trouve(/« Livrée »/);
  return trouve(new RegExp('« ' + statut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' »'));
}
function vueDossierCommande(c) {
  const histo = historiqueCommande(c);
  const evenements = histo && histo.evenements ? histo.evenements : [];
  const statuts = c.dematerialisee ? ORDER_STATUSES.filter((s) => s !== 'En cours de livraison') : ORDER_STATUSES;
  const annulee = c.statutCommande === 'Annulée';
  const idx = statuts.indexOf(c.statutCommande);
  const livree = c.statutCommande === 'Livrée';
  const exempte = structureExclueDevisFacture(c);
  const structure = state.structures.find((x) => x.code === c.code);
  const urgente = c.dateLivraisonSouhaitee === 'ASAP';
  const montant = c.montantFacture != null ? c.montantFacture : c.montantEstime;
  const personnes = nomsPersonnesCommande(c);
  const copie = (v) =>
    v
      ? `<button type="button" class="rpd-copie" data-copier-jeton="${echapper(v)}" title="Copier">${icon('copie', 12)}</button>`
      : '';
  const devis = c.referenceDevis ? state.devis.find((d) => d.referenceDevis === c.referenceDevis) : null;
  const facture = c.referenceFacture ? state.factures.find((f) => f.referenceFacture === c.referenceFacture) : null;
  const liensColis = String(c.colissimo || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  const docs = [
    exempte
      ? null
      : c.referenceDevis
        ? {
            cls: 'vio',
            ic: 'file',
            t: 'Devis',
            s: `${c.referenceDevis}${devis && devis.statut ? ' · ' + devis.statut : ''}`,
            goto: 'factures',
          }
        : c.devisDemande
          ? { cls: 'vio', ic: 'file', t: 'Devis', s: 'demandé — à générer', vide: 1 }
          : null,
    exempte
      ? null
      : c.referenceFacture
        ? {
            cls: 'mag',
            ic: 'receipt',
            t: 'Facture',
            s: `${c.referenceFacture}${facture && facture.statut ? ' · ' + facture.statut : ''}`,
            goto: 'factures',
          }
        : { cls: 'mag', ic: 'receipt', t: 'Facture', s: 'pas encore générée', vide: 1 },
    c.bonLivraison
      ? { cls: 'tur', ic: 'file', t: 'Bon de livraison', s: 'ouvrir', lien: c.bonLivraison }
      : { cls: 'tur', ic: 'file', t: 'Bon de livraison', s: 'à la préparation', vide: 1 },
    ...liensColis.map((l, i) => ({
      cls: 'amb',
      ic: 'truck',
      t: liensColis.length > 1 ? `Colis ${i + 1}` : 'Suivi colis',
      s: 'Colissimo',
      lien: l,
    })),
    (c.lienPaiement || '').trim()
      ? { cls: 'mag', ic: 'receipt', t: 'Lien de paiement', s: c.paiementSepare ? 'un par personne' : 'envoyé' }
      : null,
  ].filter(Boolean);
  // ── Fiche commande (modèle « Commandes — refonte ») : en-tête compact + frise, onglets,
  //    « À faire maintenant » (panneau de l'étape + pense-bête + en bref), pied d'actions.
  if (state.ficheCommandeRef !== c.reference) {
    state.ficheCommandeRef = c.reference;
    state.ongletCommande = 'faire';
  }
  const onglet = state.ongletCommande || 'faire';
  const serveur = etatServeurCommande(c);
  const infoType =
    serveur && serveur.etat && serveur.etat.libelleType
      ? `${serveur.etat.libelleType}${serveur.etat.circuit === 'interne' ? ' · circuit Interne' : ''}`
      : structure
        ? typeStructure(structure)
        : '';
  const nbArticles = (c.lignes || []).reduce((n, l) => n + (parseInt(l.quantite, 10) || 0), 0);
  const frise = annulee
    ? '<div class="fc2-annulee">Commande annulée</div>'
    : `<ol class="fc2-frise">${statuts
        .map((s, i) => {
          const fait = livree ? i <= idx : i < idx,
            cours = !livree && i === idx;
          const date = fait || cours ? dateEtapeCommande(c, s, evenements) : '';
          const ouverte = state.etapeCommandeOuverte === s;
          return `<li class="${fait ? 'fait' : cours ? 'cours' : 'avenir'}${ouverte ? ' ouverte' : ''}">${
            fait
              ? `<button type="button" data-toggle-etape-passee="${echapper(s)}" title="Revoir l’étape « ${echapper(s)} »"><i></i><span>${echapper(s === 'En cours de livraison' ? 'En livraison' : s)}</span>${date ? `<small>${echapper(date)}</small>` : ''}</button>`
              : `<div><i></i><span>${echapper(s === 'En cours de livraison' ? 'En livraison' : s)}</span>${date ? `<small>${echapper(date)}</small>` : ''}</div>`
          }</li>`;
        })
        .join('')}</ol>`;
  const etapeOuverte =
    statuts.includes(state.etapeCommandeOuverte) &&
    (livree ? statuts.indexOf(state.etapeCommandeOuverte) <= idx : statuts.indexOf(state.etapeCommandeOuverte) < idx)
      ? state.etapeCommandeOuverte
      : null;
  const manquants =
    serveur && serveur.etat && serveur.etat.statut === c.statutCommande
      ? serveur.etat.prerequis.filter((p) => !p.ok)
      : [];
  let panneau;
  if (annulee) {
    panneau = `<div class="fc2-panneau fc2-fin"><div class="fc2-k">Commande annulée</div><h2>Cette commande a été annulée</h2>${commentaireReel(c) ? `<p>« ${echapper(c.commentaire)} »</p>` : ''}</div>`;
  } else if (etapeOuverte) {
    panneau = `<div class="fc2-panneau fc2-passe et-carte">
      <div class="fc2-k">Étape terminée · ${echapper(etapeOuverte === 'En cours de livraison' ? 'En livraison' : etapeOuverte)}</div>
      <h2>Revoir ou corriger « ${echapper(etapeOuverte)} »</h2>
      <div class="rpd-actions">${panneauEtapePasseeCommande(c, etapeOuverte)}</div>
      <div class="et-pied"><span class="et-manque"></span><button type="button" class="btn btn-secondary" data-toggle-etape-passee="${echapper(etapeOuverte)}">← Revenir à l’étape en cours</button></div>
    </div>`;
  } else if (livree) {
    panneau = carteCommandeLivree(c, personnes, nbArticles);
  } else {
    panneau = carteEtapeCommande(c, statuts, manquants, serveur);
  }
  const enBref = `<div class="fc2-bref">
    <div class="fc2-k">En bref</div>
    <div class="fc2-bref-l"><span>Articles</span><b>${nbArticles} article${nbArticles > 1 ? 's' : ''}</b></div>
    ${(() => {
      const n = String(c.numerosSerie || '')
        .split('\n')
        .filter((x) => x.trim()).length;
      const att = c.quantiteAvecNumeroSerie != null ? c.quantiteAvecNumeroSerie : n;
      return n || att
        ? `<div class="fc2-bref-l"><span>${c.dematerialisee ? 'Codes' : 'N° de série'}</span><b>${n} / ${Math.max(att, n)}${n ? ` · <button type="button" class="lien-structure" data-onglet-commande="commande">voir</button>` : ''}</b></div>`
        : '';
    })()}
    ${c.moyenPaiement && !exempte ? `<div class="fc2-bref-l"><span>Paiement</span><b>${echapper(c.moyenPaiement)}${c.statutPaiement ? ` · <em class="${c.statutPaiement === 'Payé' ? 'ok' : 'ko'}">${echapper(c.statutPaiement)}</em>` : ''}</b></div>` : ''}
    ${montant != null && !exempte ? `<div class="fc2-bref-l"><span>Total</span><b>${formaterMontant(montant)}</b></div>` : ''}
    <div class="fc2-bref-l"><span>Livraison</span><b>${echapper(c.modeLivraison || 'à définir')}${urgente ? ' · <em class="ko">urgente</em>' : c.dateLivraisonSouhaitee ? ` · souhaitée ${echapper(c.dateLivraisonSouhaitee)}` : ''}</b></div>
    ${c.responsableCommande || c.telephone ? `<div class="fc2-bref-l"><span>Prescripteur · contact</span><b>${echapper([c.responsableCommande, c.telephone].filter(Boolean).join(' · '))}</b></div>` : ''}
  </div>`;
  const ongletCommande = `<div class="fc2-grille2">
      <section class="fc2-bloc"><div class="fc2-k">Articles</div>
        ${
          (c.lignes || [])
            .map((l) => {
              const p = state.produits.find((x) => x.nom === l.produit);
              return `<div class="fc2-art"><span class="rpd-ill">${illustrationProduitAdmin(l.produit, p ? p.icone : '', 34)}</span><span><b>${parseInt(l.quantite, 10)} ×</b> ${echapper(l.produit)}</span></div>`;
            })
            .join('') || '<p class="rpd-apercu">Aucun article</p>'
        }
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
    ${personnes.length ? `<section class="fc2-bloc"><div class="fc2-k">Personnes accompagnées · ${personnes.length}${c.identiteMasquee ? boutonIdentite('commande', c.id) : ''}</div><div class="fc2-personnes">${personnes.map((n) => `<span>${icon('personne', 13)}${echapper(c.identiteMasquee ? nomPersonneAdmin('commande', c.id, n) : n)}</span>`).join('')}</div>${c.identiteMasquee && !identiteRevelee('commande', c.id) ? '<p class="idr-note">Pseudonymes : l’identité reste utilisée pour les attestations et bons, sans être affichée.</p>' : ''}</section>` : ''}
    ${blocAppareilsCommande(c)}
    ${commentaireReel(c) ? `<section class="fc2-bloc"><div class="fc2-k">Commentaire de la structure</div><p class="fc2-comm">« ${echapper(c.commentaire)} »</p></section>` : ''}
    ${panneauDevisPaiementCommande(c)}`;
  const ongletDocuments = `<div class="rpd-docs fc2-docs">${docs
    .map((d) => {
      const inner = `<span class="rpd-di ${d.cls}">${icon(d.ic, 14)}</span><span>${echapper(d.t)}<small>${echapper(d.s)}</small></span>`;
      return d.lien
        ? `<a class="rpd-doc" href="${echapper(urlSure(d.lien))}" target="_blank" rel="noopener">${inner}</a>`
        : d.goto
          ? `<button type="button" class="rpd-doc" data-nav="${d.goto}">${inner}</button>`
          : `<span class="rpd-doc ${d.vide ? 'vide' : ''}">${inner}</span>`;
    })
    .join('')}</div>`;
  const ongletHistorique = `<div class="rpd-historique">
      ${
        evenements.length
          ? `<ol class="rpd-hist">${evenements
              .slice()
              .reverse()
              .map(
                (e) =>
                  `<li><i></i><span>${echapper(e.evenement)}${e.auteur ? `<small>${echapper(e.auteur)}</small>` : ''}</span><small>${echapper(e.date)}</small></li>`,
              )
              .join('')}</ol>`
          : `<p class="rpd-apercu">${histo && histo.enCours ? 'Chargement…' : 'Aucun événement enregistré pour cette commande.'}</p>`
      }
    </div>`;
  const ong = (cle, lib) =>
    `<button type="button" role="tab" class="fc2-onglet${onglet === cle ? ' actif' : ''}" aria-selected="${onglet === cle}" data-onglet-commande="${cle}">${lib}</button>`;
  return `
    <div class="rp-drawer-backdrop rpd-voile fc2-voile">
      <div class="fc2" role="dialog" aria-modal="true" aria-label="Commande ${echapper(c.reference)}">
        <header class="fc2-tete">
          <span data-ill="commandes" class="ill xl"></span>
          <div class="fc2-id">
            <div class="fc2-sur">${echapper(c.reference)} · commandée le ${echapper(c.date)}</div>
            <div class="fc2-nom">${(() => {
              const st = structure;
              return st
                ? `<button type="button" class="lien-structure" data-structure-vue="${st.id}" title="Ouvrir la fiche 360° de la structure">${echapper(c.nom)}</button>`
                : echapper(c.nom);
            })()}</div>
            <div class="fc2-puces">${infoType ? `<span class="tag">${echapper(infoType)}</span>` : ''}${badgeUrgentCommande(c)}${c.transfereAdmin ? '<span class="tag">Transférée</span>' : ''}</div>
          </div>
          ${frise}
          <button type="button" class="rpd-fermer" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </header>
        <nav class="fc2-onglets" role="tablist" aria-label="Sections de la commande">
          ${ong('faire', 'À faire maintenant')}${ong('commande', 'Commande')}${ong('documents', `Documents · ${docs.filter((d) => !d.vide).length}`)}${ong('historique', 'Historique')}
        </nav>
        <div class="fc2-corps">
          ${
            onglet === 'faire'
              ? `<div class="fc2-faire">${panneau}<aside class="fc2-cote">${enBref}</aside></div>`
              : onglet === 'commande'
                ? ongletCommande
                : onglet === 'documents'
                  ? ongletDocuments
                  : ongletHistorique
          }
          <div id="rp-retour-modale"></div>
        </div>
        <footer class="fc2-pied">
          <span class="fc2-espace"></span>
          <div class="et-menu">
            <button type="button" class="btn btn-secondary" data-et-menu aria-expanded="false" aria-haspopup="true">Autres actions <span aria-hidden="true">▾</span></button>
            <div class="et-menu-l" role="menu" hidden>
              ${c.email ? `<a role="menuitem" href="mailto:${echapper(c.email)}?subject=${encodeURIComponent('Votre commande ' + c.reference)}">${icon('mail', 14)}Écrire à la structure</a>` : ''}
              ${structure ? `<button type="button" role="menuitem" data-structure-vue="${structure.id}">${icon('building', 14)}Fiche 360° de la structure</button>` : ''}
              ${livree ? `<button type="button" role="menuitem" data-rapport-commande="${echapper(c.reference)}">${icon('file', 14)}Rapport d’impact</button>` : ''}
              ${!livree && !annulee ? `<button type="button" role="menuitem" class="danger" data-annuler-commande="${echapper(c.reference)}">${iconeAnnuler()}Annuler la commande…</button>` : ''}
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
function familleCouleurSymptomeAdmin(texte) {
  const t = String(texte || '').toLowerCase();
  if (/[ée]cran/.test(t) || /virus|malware|infect[ée]/.test(t))
    return { bg: 'var(--th-bg-fdececff, #FDECEC)', fg: 'var(--th-tx-b42318ff, #B42318)' };
  if (/(charge|batterie|alimentation|allum)/.test(t) || /internet|wifi|wi-fi|r[ée]seau|connexion/.test(t))
    return { bg: 'var(--th-bg-fff4d6ff, #FFF4D6)', fg: 'var(--th-tx-7a5a00ff, #7A5A00)' };
  if (/mise.{0,3}[àa].{0,3}jour|update/.test(t) || /lent|lenteur|rame|bloque|fige|plante/.test(t))
    return { bg: 'var(--th-bg-e8f0feff, #E8F0FE)', fg: 'var(--th-tx-1d4ed8ff, #1D4ED8)' };
  if (/clavier/.test(t) || /souris/.test(t) || /\bsons?\b|audio|hauts?[-\s]?parleurs?|micro/.test(t))
    return { bg: 'var(--th-bg-fce7efff, #FCE7EF)', fg: 'var(--th-tx-b0164aff, #B0164A)' };
  return { bg: 'var(--th-bg-eef2f5ff, #EEF2F5)', fg: 'var(--th-tx-002743ff, #002743)' };
}
function carteSymptomeSav(texte) {
  const f = familleCouleurSymptomeAdmin(texte);
  const cle = window.cleSymptomeCvdl ? window.cleSymptomeCvdl(texte) : 'generique_sav';
  const ill = window.illustrationCvdl
    ? window.illustrationCvdl('sym-' + cle, 52) || window.illustrationCvdl('sym-generique_sav', 52)
    : icon('alert', 26);
  return `<div class="rpd-sym" style="--c-bg:${f.bg};--c-fg:${f.fg}"><span class="rpd-sym-ill">${ill}</span><b>${echapper(texte || 'Non précisé')}</b></div>`;
}
