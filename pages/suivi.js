function afficherMsg(id, texte, type) {
  $(id).innerHTML = texte ? `<div class="msg msg-${type}">${echapper(texte)}</div>` : '';
}
/** Repérage depuis un lien direct (ex. "Activité récente" du portail structure, ?ref=XXX) :
 *  fait défiler jusqu'à la carte visée et la fait clignoter doucement en bleu quelques fois. */
function cibleCarteDepuisUrl(selecteurCarte, classeAnimation) {
  const ref = new URLSearchParams(location.search).get('ref');
  if (!ref) return;
  const carte = document.querySelector(`${selecteurCarte}[data-reference="${CSS.escape(ref)}"]`);
  if (!carte) return;
  setTimeout(() => {
    carte.scrollIntoView({ behavior: 'smooth', block: 'center' });
    carte.classList.add(classeAnimation);
    setTimeout(() => carte.classList.remove(classeAnimation), 6000);
  }, 150);
}

const ETAPES_TIMELINE = ['Reçue', 'Validée', 'Préparée', 'En cours de livraison', 'Livrée'];
const SVG_MODE_LIVRAISON = {
  Colissimo:
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none"><path d="M2.5 5.5 9 2 15.5 5.5 9 9 2.5 5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2.5 5.5V12.5L9 16 15.5 12.5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  Retrait:
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8V4.5A1.5 1.5 0 0 1 5.5 3h7A1.5 1.5 0 0 1 14 4.5V8"/><rect x="2.5" y="8" width="13" height="7" rx="1.3"/><path d="M2.5 11.5h13"/></svg>',
  'Livraison EC':
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M10.5 8.5h3l3 2.5v2h-6z"/><circle cx="4.5" cy="14.5" r="1.4"/><circle cx="13" cy="14.5" r="1.4"/></svg>',
};
// Icône QR code — remplace partout l'ancienne icône "passeport" (carte d'identité), conforme
// à la maquette : c'est cette icône qui accompagne systématiquement le numéro de série.
const SVG_ICONE_QR =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="15" y="15" width="4" height="4" rx="0.8"/></svg>';
// Flèche "lien externe" — même icône partout où une pilule/lien redirige hors du site.
const SVG_ICONE_TICKET =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M10 7.5v9" stroke-dasharray="2.2 2.2"/></svg>';
// Icône "quitte le site" — pour les liens qui sortent réellement du domaine CVDL (Colissimo,
// bon de livraison, prestataire de paiement), distincte de la flèche simple ci-dessus qui
// reste réservée à la navigation interne (passeport.html, même site, juste un nouvel onglet).
const SVG_LIEN_EXTERNE =
  '<svg class="fleche-lien-externe" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';

const LIBELLES_COURTS_TIMELINE = {
  Reçue: 'Reçue',
  Validée: 'Validée',
  Préparée: 'Préparée',
  'En cours de livraison': 'En livraison',
  Livrée: 'Livrée',
};

/** Copie en presse-papier au clic sur l'icône (et seulement l'icône) d'une pilule numéro de
 *  série/code — délégué sur le document car les pilules sont reconstruites à chaque rendu. Le
 *  preventDefault/stopPropagation empêche l'ouverture du lien passeport quand la pilule est un
 *  <a> ; cliquer ailleurs dans la pilule continue de l'ouvrir normalement. */
/** Infos d'une commande, rangées en 3 blocs lisibles (au lieu d'une ligne de pastilles) :
 *  Livraison (mode + date) · Paiement (montant, moyen, statut, bouton Régler) · Contact. */
function blocInfosSuivi(c, o) {
  const modeLib = c.modeLivraison === 'Livraison EC' ? 'Livraison Emmaüs Connect' : c.modeLivraison || '';
  let dateLiv = '',
    dateLab = '';
  if (o.estLivree && c.dateLivraison) {
    dateLab = 'Livrée le';
    dateLiv = c.dateLivraison;
  } else if (c.dateLivraisonCible && (c.modeLivraison === 'Retrait' || c.modeLivraison === 'Livraison EC')) {
    dateLab = c.modeLivraison === 'Retrait' ? 'Retrait à partir du' : 'Estimée le';
    dateLiv = c.dateLivraisonCible;
  } else if (c.dateLivraisonSouhaitee === 'ASAP') {
    dateLab = 'Souhaitée';
    dateLiv = 'dès que possible';
  } else if (c.dateLivraisonSouhaitee) {
    dateLab = 'Souhaitée le';
    dateLiv = c.dateLivraisonSouhaitee;
  }
  const montant =
    c.montantEstime != null ? formaterMontant(c.montantFacture != null ? c.montantFacture : c.montantEstime) : '';
  const statutP = c.statutPaiement
    ? `<span class="pk-pill ${c.statutPaiement === 'Payé' ? 'pk-ok' : 'pk-att'}">${echapper(c.statutPaiement)}</span>`
    : '';
  const bloc = (ic, lab, val, sous) =>
    `<div class="cs-info"><span class="cs-info-lab">${ic}${lab}</span><span class="cs-info-val">${val}</span>${sous ? `<span class="cs-info-sous">${sous}</span>` : ''}</div>`;
  const blocs = [
    bloc(
      SVG_MODE_LIVRAISON[c.modeLivraison] || SVG_MODE_LIVRAISON['Colissimo'] || '',
      'Livraison',
      modeLib ? echapper(modeLib) : '<em>Mode à définir</em>',
      dateLiv ? `${echapper(dateLab)} <b>${echapper(dateLiv)}</b>` : '',
    ),
    montant || o.moyenAffiche || c.statutPaiement
      ? bloc(
          o.moyenAffiche ? iconeMoyenPaiementV1(o.moyenAffiche) : '',
          'Paiement',
          `${montant ? `<b class="cs-montant">${montant}</b>` : ''}${statutP}`,
          [
            o.moyenAffiche ? echapper(o.moyenAffiche) : '',
            o.boutonsPaiement ? `<span class="cs-regler">${o.boutonsPaiement}</span>` : '',
          ]
            .filter(Boolean)
            .join(' '),
        )
      : '',
    c.responsableCommande
      ? bloc(SVG_V1.personne || '', 'Personne prescriptrice', echapper(c.responsableCommande), '')
      : '',
  ].filter(Boolean);
  return `<div class="cs-infos" style="--n:${blocs.length}">${blocs.join('')}</div>`;
}
let toastCopieCsTimeout = null;
function afficherToastCopieCs(texte) {
  let t = document.getElementById('toast-copie-cs');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-copie-cs';
    t.className = 'toast-copie-cs';
    document.body.appendChild(t);
  }
  t.textContent = texte;
  requestAnimationFrame(() => t.classList.add('visible'));
  clearTimeout(toastCopieCsTimeout);
  toastCopieCsTimeout = setTimeout(() => t.classList.remove('visible'), 1400);
}
document.addEventListener('click', (e) => {
  const icone = e.target.closest('.icone-copie-passeport-cs');
  if (!icone) return;
  e.preventDefault();
  e.stopPropagation();
  const valeur = icone.dataset.copier || '';
  (navigator.clipboard?.writeText(valeur) || Promise.reject())
    .then(() => {
      afficherToastCopieCs(icone.dataset.copierLibelle || 'Copié !');
    })
    .catch(() => {
      afficherToastCopieCs('Impossible de copier.');
    });
});

// Dernière liste chargée (pour reflitrer sans re-fetcher) + terme de recherche courant.
let commandesChargeesSuivi = [];
let termeRechercheSuivi = '';

/** Une commande "correspond" si le terme se retrouve dans sa référence, le nom d'un de ses
 *  bénéficiaires, ou l'un de ses numéros de série/codes — tout ce par quoi on chercherait
 *  concrètement une personne ou un appareil précis. */
function commandeCorrespondRechercheSuivi(c, terme) {
  if (!terme) return true;
  if ((c.reference || '').toLowerCase().includes(terme)) return true;
  if ((c.personnesDetail || []).some((p) => (p.nomComplet || '').toLowerCase().includes(terme))) return true;
  const numeros = String(c.numerosSerie || '')
    .split('\n')
    .map((s) => s.trim().toLowerCase());
  if (numeros.some((n) => n.includes(terme))) return true;
  return false;
}
function appliquerRechercheEtRendreSuivi() {
  const terme = termeRechercheSuivi.trim().toLowerCase();
  const filtrees = commandesChargeesSuivi.filter(
    (c) => commandeCorrespondRechercheSuivi(c, terme) && (!filtreEtatSuivi || etatSuivi(c) === filtreEtatSuivi),
  );
  rendreCommandesSuivi(filtrees);
  appliquerFocusSuivi();
  if (terme && !filtrees.length) {
    $('liste-commandes-suivi').innerHTML =
      `<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucune commande ne correspond à "${echapper(termeRechercheSuivi.trim())}".</div>`;
  }
}
/** Filtre d'état (maquette « Suivi des commandes ») : losange = à traiter (reçue, paiement
 *  attendu), carré = en cours, rond = livrée ou annulée. */
let filtreEtatSuivi = '';
function etatSuivi(c) {
  if (c.statutCommande === 'Livrée' || c.statutCommande === 'Annulée') return 'fini';
  const paiementAttendu = !!c.lienPaiement && c.statutPaiement && c.statutPaiement !== 'Payé';
  return c.statutCommande === 'Reçue' || paiementAttendu ? 'attente' : 'cours';
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filtre-suivi]');
  if (!f) return;
  filtreEtatSuivi = f.dataset.filtreSuivi;
  document.querySelectorAll('[data-filtre-suivi]').forEach((b) => b.classList.toggle('actif', b === f));
  appliquerRechercheEtRendreSuivi();
});
$('recherche-suivi').addEventListener('input', () => {
  termeRechercheSuivi = $('recherche-suivi').value;
  appliquerRechercheEtRendreSuivi();
});

/* ── Mode « une seule commande » ─────────────────────────────────────────────────────────
   Arrivée depuis le portail avec ?ref= : seule la commande visée est affichée (on s'y perd
   moins), avec un bouton pour charger toutes les autres. Au clic, la commande reste à sa place
   à l'écran et les autres glissent de derrière elle jusqu'à leur position. */
let focusSuivi = new URLSearchParams(location.search).get('ref') || '';
if (focusSuivi) setTimeout(() => detailsOuvertsSuivi.add(focusSuivi), 0);
function appliquerFocusSuivi() {
  const liste = $('liste-commandes-suivi');
  const cartes = [...liste.querySelectorAll('.carte-commande-suivi')];
  const cible = focusSuivi ? cartes.find((c) => c.dataset.reference === focusSuivi) : null;
  if (focusSuivi && !cible) focusSuivi = ''; // référence inconnue : liste complète
  $('etape-liste').classList.toggle('mode-focus', !!cible);
  cartes.forEach((c) => {
    c.classList.toggle('masquee-focus', !!cible && c !== cible);
    c.classList.toggle('carte-focus', c === cible);
  });
  let bouton = $('btn-toutes-commandes-suivi');
  if (!bouton) {
    bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.id = 'btn-toutes-commandes-suivi';
    bouton.className = 'btn-toutes-commandes-suivi';
    bouton.addEventListener('click', afficherToutesCommandesSuivi);
    liste.after(bouton);
  }
  bouton.hidden = !cible || cartes.length < 2;
  bouton.innerHTML = `Voir toutes mes commandes (${cartes.length}) <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`;
}
function afficherToutesCommandesSuivi() {
  const liste = $('liste-commandes-suivi');
  const cible = liste.querySelector('.carte-commande-suivi.carte-focus');
  if (!cible) {
    focusSuivi = '';
    appliquerFocusSuivi();
    return;
  }
  const avant = cible.getBoundingClientRect().top;
  focusSuivi = '';
  appliquerFocusSuivi();
  cible.classList.add('carte-focus'); // reste mise en avant pendant l'animation
  // La commande garde exactement sa place à l'écran (on compense le décalage de la page)…
  window.scrollTo({ top: window.scrollY + cible.getBoundingClientRect().top - avant, behavior: 'instant' });
  const origine = cible.getBoundingClientRect().top;
  const cartes = [...liste.querySelectorAll('.carte-commande-suivi')];
  const indexCible = cartes.indexOf(cible);
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // … et les autres sortent de derrière elle pour rejoindre leur position, en cascade.
  cartes.forEach((c, i) => {
    if (c === cible || reduit || !c.animate) return;
    const decalage = origine - c.getBoundingClientRect().top;
    c.style.zIndex = '1';
    c.animate(
      [
        { transform: `translateY(${decalage}px) scale(.94)`, opacity: 0 },
        { transform: `translateY(${decalage * 0.15}px) scale(.98)`, opacity: 1, offset: 0.55 },
        { transform: 'none', opacity: 1 },
      ],
      {
        duration: 720,
        delay: Math.min(Math.abs(i - indexCible) - 1, 6) * 70,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      },
    )
      .finished.then(() => {
        c.style.zIndex = '';
      })
      .catch(() => {});
  });
  if (!reduit && cible.animate)
    cible.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], {
      duration: 500,
      easing: 'ease-out',
    });
  setTimeout(() => cible.classList.remove('carte-focus'), 2600);
  try {
    history.replaceState(null, '', location.pathname);
  } catch (e) {}
}

const detailsOuvertsSuivi = new Set();
const SVG_V1 = {
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  carte:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  horloge:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  chevron:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  personne:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
};
/** Icône du moyen de paiement (carte, chèque, espèces, virement, comptoir solidaire). */
function iconeMoyenPaiementV1(m) {
  const t = String(m || '').toLowerCase();
  const d =
    t.includes('chèque') || t.includes('cheque')
      ? '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 14h6M15 10h3M6 10h5"/>'
      : t.includes('espèce') || t.includes('espece')
        ? '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'
        : t.includes('virement')
          ? '<path d="M3 10h18M5 10v10M9 10v10M15 10v10M19 10v10M2 20h20M12 3l9 5H3z"/>'
          : t.includes('comptoir')
            ? '<path d="M3 21h18M5 21V10M19 21V10M2 10l10-7 10 7"/><circle cx="12" cy="14" r="2.5"/>'
            : '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>';
  return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-details-suivi]');
  if (!b) return;
  const carte = b.closest('.carte-commande-suivi');
  const ref = b.dataset.detailsSuivi;
  const ouvert = !carte.classList.contains('ouvert');
  carte.classList.toggle('ouvert', ouvert);
  b.setAttribute('aria-expanded', ouvert);
  if (ouvert) detailsOuvertsSuivi.add(ref);
  else detailsOuvertsSuivi.delete(ref);
});

/* Plusieurs liens (paiement par personne, plusieurs colis) → une seule action qui ouvre
   une modale listant chaque lien avec son bouton, au lieu d'une rangée de boutons. */
const liensModaleSuivi = {};
function ouvrirModaleLiensSuivi(cle) {
  const d = liensModaleSuivi[cle];
  if (!d) return;
  $('modale-liens-titre').textContent = d.titre;
  $('modale-liens-intro').textContent = d.intro || '';
  $('modale-liens-liste').innerHTML = d.liens
    .map(
      (l) =>
        `<div class="ml-ligne"><span data-ill="${d.ill}" class="ill"></span><span class="ml-txt"><b>${echapper(l.titre)}</b>${l.detail ? `<small>${echapper(l.detail)}</small>` : ''}</span><a class="btn btn-primary v1-btn" href="${echapper(urlSure(l.href))}" target="_blank" rel="noopener">${echapper(l.libelle)}${SVG_LIEN_EXTERNE}</a></div>`,
    )
    .join('');
  $('modale-liens').classList.add('visible');
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-liens-modale]');
  if (b) {
    e.preventDefault();
    ouvrirModaleLiensSuivi(b.dataset.liensModale);
    return;
  }
  if (e.target.id === 'modale-liens' || e.target.id === 'modale-liens-fermer')
    $('modale-liens').classList.remove('visible');
});

/* Devis et facture : générés à la demande (même document que celui envoyé par Emmaüs Connect).
   L'onglet est ouvert dès le clic pour ne pas être bloqué, puis reçoit le document. */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-document]');
  if (!b || b.disabled) return;
  const [reference, type] = b.dataset.document.split('|');
  const fenetre = window.open('', '_blank');
  if (fenetre) fenetre.document.title = 'Préparation du document…';
  b.disabled = true;
  const r = await poster({
    action: 'commande-document',
    code: $('code-structure').value.trim(),
    reference,
    type,
  }).catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
  b.disabled = false;
  if (r.ok) return window.ouvrirDocumentGenere(r.url, fenetre);
  if (fenetre) fenetre.close();
  alerteCvdl(r.erreur || 'Document indisponible pour le moment.');
});

function rendreCommandesSuivi(commandes) {
  if (!commandes.length) {
    $('liste-commandes-suivi').innerHTML =
      `<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucune commande enregistrée pour ce code pour le moment.</div>`;
    return;
  }

  $('liste-commandes-suivi').innerHTML = commandes
    .map((c) => {
      const produitsTexte = c.lignes.map((l) => `${l.quantite}× ${echapper(l.produit)}`).join(', ');
      const estAnnulee = c.statutCommande === 'Annulée';
      const urgente = c.dateLivraisonSouhaitee === 'ASAP' && !estAnnulee;

      const liensColissimo = String(c.colissimo || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const numerosSerie = String(c.numerosSerie || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      // ── Carte « colonne d'état + tiroir » ──────────────────────────────────────────────
      // Famille de couleur de la colonne : annulée (gris) · livrée (vert) · urgente (magenta) ·
      // paiement attendu (ambre) · en cours (turquoise).
      const estLivree = !estAnnulee && c.statutCommande === 'Livrée';
      const paiementAttendu = !estAnnulee && !!c.lienPaiement && c.statutPaiement && c.statutPaiement !== 'Payé';
      const indexEtape = ETAPES_TIMELINE.indexOf(c.statutCommande);
      const libelleEtat = estAnnulee
        ? 'Annulée'
        : paiementAttendu && indexEtape < 2
          ? 'Paiement attendu'
          : LIBELLES_COURTS_TIMELINE[c.statutCommande] || c.statutCommande || 'Reçue';
      const moyenAffiche =
        !estAnnulee && c.moyenPaiement && c.moyenPaiement !== 'Non applicable (ESN/Interne)' ? c.moyenPaiement : '';
      const liensPaiementPersonnes =
        paiementAttendu && c.lienPaiement && c.paiementSepare && c.personnesDetail && c.personnesDetail.length
          ? c.personnesDetail.map((pp, i) => ({
              href: API + '?action=clic-lien-paiement&ref=' + encodeURIComponent(c.reference) + '&index=' + i,
              titre: pp.nomComplet || 'Personne ' + (i + 1),
              detail: pp.prix != null ? formaterMontant(pp.prix) : '',
              libelle: 'Régler',
            }))
          : [];
      if (liensPaiementPersonnes.length > 1)
        liensModaleSuivi[c.reference + '|paiement'] = {
          titre: 'Liens de paiement',
          intro: 'Un lien de paiement par personne accompagnée.',
          ill: 'personne',
          liens: liensPaiementPersonnes,
        };
      if (liensColissimo.length > 1)
        liensModaleSuivi[c.reference + '|colis'] = {
          titre: 'Suivi des colis',
          intro: 'Cette commande est envoyée en plusieurs colis.',
          ill: 'stock',
          liens: liensColissimo.map((l, i) => ({ href: l, titre: 'Colis ' + (i + 1), detail: '', libelle: 'Suivre' })),
        };
      const boutonsPaiement =
        paiementAttendu && c.lienPaiement
          ? liensPaiementPersonnes.length > 1
            ? `<button type="button" class="btn btn-primary v1-btn" data-liens-modale="${echapper(c.reference + '|paiement')}">Régler · ${liensPaiementPersonnes.length} liens</button>`
            : liensPaiementPersonnes.length === 1
              ? `<a class="btn btn-primary v1-btn" href="${echapper(urlSure(liensPaiementPersonnes[0].href))}" target="_blank" rel="noopener">Régler${SVG_LIEN_EXTERNE}</a>`
              : `<a class="btn btn-primary v1-btn" href="${echapper(API + '?action=clic-lien-paiement&ref=' + encodeURIComponent(c.reference))}" target="_blank" rel="noopener">Régler${SVG_LIEN_EXTERNE}</a>`
          : '';
      const codeStructure = (() => {
        try {
          const cs = sessionStorage.getItem('cvdl-code-structure');
          return cs ? '&code=' + encodeURIComponent(cs) : '';
        } catch (e) {
          return '';
        }
      })();
      const blocNumeros = numerosSerie.length
        ? `<div><span class="pk-lab">${c.dematerialisee ? (numerosSerie.length > 1 ? 'Codes' : 'Code') : numerosSerie.length > 1 ? 'Numéros de série' : 'Numéro de série'}</span><span class="v1-v">${
            c.dematerialisee
              ? numerosSerie.map((n) => window.piluleSerieCvdl(n, { code: true })).join(' ')
              : numerosSerie.map((n) => window.piluleSerieCvdl(n, { query: codeStructure })).join(' ')
          }</span></div>`
        : '';
      const personnes = !estAnnulee && c.personnesDetail ? c.personnesDetail.filter((pp) => pp.nomComplet) : [];
      const blocPersonnes = personnes.length
        ? `<div><span class="pk-lab">${personnes.length > 1 ? `${personnes.length} personnes accompagnées` : '1 personne accompagnée'}</span><span class="v1-v cs-personnes">${personnes.map((pp) => `<span class="cs-personne"><span data-ill="personne" class="ill"></span><span class="cs-personne-txt"><b>${echapper(pp.nomComplet)}</b>${pp.numeroSerie ? window.piluleSerieCvdl(pp.numeroSerie, { query: codeStructure }) : pp.produit ? `<small>${echapper(pp.produit)}</small>` : ''}</span></span>`).join('')}</span></div>`
        : '';
      const ouvert = detailsOuvertsSuivi.has(c.reference);

      const formeEtat = estAnnulee || estLivree ? 'rond' : etatSuivi(c) === 'attente' ? 'losange' : 'carre';
      const etapesFrise = ETAPES_TIMELINE.map((e, i) => {
        const cls = estLivree || i < indexEtape ? 'fait' : i === indexEtape ? 'cours' : 'avenir';
        return `<li class="${cls}"><i></i><span>${echapper(LIBELLES_COURTS_TIMELINE[e] || e)}</span></li>`;
      }).join('');
      const docs = [
        c.bonLivraison
          ? `<a class="cs-doc" href="${echapper(urlSure(c.bonLivraison))}" target="_blank" rel="noopener"><span data-ill="commandes" class="ill"></span>Bon de livraison</a>`
          : '',
        liensColissimo.length > 1
          ? `<button type="button" class="cs-doc" data-liens-modale="${echapper(c.reference + '|colis')}"><span data-ill="stock" class="ill"></span>Suivi des colis (${liensColissimo.length})</button>`
          : liensColissimo.length
            ? `<a class="cs-doc" href="${echapper(urlSure(liensColissimo[0]))}" target="_blank" rel="noopener"><span data-ill="stock" class="ill"></span>Suivi Colissimo</a>`
            : '',
        c.devisDisponible
          ? `<button type="button" class="cs-doc" data-document="${echapper(c.reference + '|devis')}"><span data-ill="facture" class="ill"></span>Devis</button>`
          : '',
        c.factureDisponible
          ? `<button type="button" class="cs-doc" data-document="${echapper(c.reference + '|facture')}"><span data-ill="facture" class="ill"></span>Facture</button>`
          : '',
        estLivree
          ? `<a class="cs-doc" href="rapport-impact.html?ref=${encodeURIComponent(c.reference)}"><span data-ill="stats" class="ill"></span>Rapport d’impact</a>`
          : '',
      ].join('');
      const aDetails = !estAnnulee && (blocNumeros || blocPersonnes);

      return `<article class="card carte-commande-suivi cs-carte${estAnnulee ? ' annulee' : ''}${estLivree ? ' livree' : ''}${urgente && !estLivree ? ' urgente' : ''}${ouvert ? ' ouvert' : ''}" data-reference="${echapper(c.reference)}">
      <div class="cs-tete">
        <span data-ill="commandes" class="ill"></span>
        <div class="cs-tete-txt">
          <div class="cvdl-surtitre">${echapper(c.reference)} · ${echapper(c.date || '')}</div>
          <b class="cs-produits">${produitsTexte}</b>
        </div>
        <span class="cs-etat">${urgente && !estLivree ? '<span class="cs-urgent">Urgent</span>' : ''}<span class="tag" data-forme="${formeEtat}">${echapper(libelleEtat)}</span></span>
      </div>
      ${
        estAnnulee
          ? `<div class="cs-motif">${c.commentaire ? 'Motif : ' + echapper(c.commentaire) : 'Commande annulée.'}</div>`
          : `<ol class="cs-frise">${etapesFrise}</ol>
      ${blocInfosSuivi(c, { estLivree, moyenAffiche, boutonsPaiement })}`
      }
      ${
        docs || aDetails
          ? `<div class="cs-pied">
        <div class="cs-docs">${docs}</div>
        <div class="cs-actions">${aDetails ? `<button type="button" class="cs-details-btn" data-details-suivi="${echapper(c.reference)}" aria-expanded="${ouvert}">Numéros de série et personnes ${SVG_V1.chevron}</button>` : ''}</div>
      </div>`
          : ''
      }
      ${aDetails ? `<div class="cs-details"><div><div class="cs-details-in">${blocNumeros}${blocPersonnes}</div></div></div>` : ''}
    </article>`;
    })
    .join('');
}

async function chargerCommandesSuivi() {
  const code = $('code-structure').value.trim();
  if (!code) {
    afficherMsg('retour-code', 'Merci de saisir un code.', 'erreur');
    return;
  }

  $('btn-voir-commandes').disabled = true;
  $('btn-voir-commandes').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  afficherMsg('retour-code', '', 'info');

  try {
    const r = await jsonp({ action: 'commandes-par-code', code: code });
    if (r.ok) {
      $('titre-structure').textContent = r.nomStructure ? `Commandes de ${r.nomStructure}` : 'Vos commandes';
      $('nb-commandes-texte').textContent =
        r.commandes.length > 1
          ? `${r.commandes.length} commandes enregistrées`
          : r.commandes.length === 1
            ? '1 commande enregistrée'
            : '';
      commandesChargeesSuivi = r.commandes;
      appliquerRechercheEtRendreSuivi();
      $('etape-code').hidden = true;
      $('etape-liste').hidden = false;
      $('btn-deconnexion-suivi').hidden = false;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      demarrerRafraichissementAutoSuivi();
      cibleCarteDepuisUrl('.carte-commande-suivi', 'arrivee-ciblee');
    } else {
      afficherMsg('retour-code', r.erreur || 'Code introuvable.', 'erreur');
    }
  } catch (e) {
    afficherMsg('retour-code', 'Connexion impossible. Réessayez dans un instant.', 'erreur');
  }
  $('btn-voir-commandes').disabled = false;
  $('btn-voir-commandes').textContent = 'Continuer';
}

$('btn-voir-commandes').addEventListener('click', chargerCommandesSuivi);
$('code-structure').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    chargerCommandesSuivi();
  }
});

$('btn-deconnexion-suivi').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('code-structure').value = codeMemorise;
    chargerCommandesSuivi().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}

/** Rafraîchissement automatique en arrière-plan — sans lui, quelqu'un qui laisse cette page
 *  ouverte ne verrait jamais un changement fait côté admin pendant ce temps (nouveau statut,
 *  numéro Colissimo ajouté…) sans recharger la page à la main. En pause quand l'onglet n'est
 *  pas affiché, pour ne pas multiplier les appels pour rien. */
let intervalleRafraichissementSuivi = null;

async function rafraichirSuiviSilencieusement() {
  if (document.hidden) return;
  const code = $('code-structure').value.trim();
  if (!code) return;
  try {
    const r = await jsonp({ action: 'commandes-par-code', code: code });
    if (r.ok) {
      commandesChargeesSuivi = r.commandes;
      appliquerRechercheEtRendreSuivi();
      $('nb-commandes-texte').textContent =
        r.commandes.length > 1
          ? `${r.commandes.length} commandes enregistrées`
          : r.commandes.length === 1
            ? '1 commande enregistrée'
            : '';
    }
  } catch (e) {
    /* on retente simplement au prochain cycle */
  }
}

function demarrerRafraichissementAutoSuivi() {
  if (intervalleRafraichissementSuivi) return;
  intervalleRafraichissementSuivi = setInterval(rafraichirSuiviSilencieusement, 25000);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('etape-liste').hidden) rafraichirSuiviSilencieusement();
});
