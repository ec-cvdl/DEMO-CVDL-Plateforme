function $(id) {
  return document.getElementById(id);
}
function echapper(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function poster(data) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}
function jsonp(params) {
  return fetch(API + '?' + new URLSearchParams(params)).then((r) => r.json());
}
try {
  if (sessionStorage.getItem('cvdl-code-structure')) document.documentElement.classList.add('deja-identifie');
} catch (e) {}

let codeValide = '';
let commandesCourantes = [];
let flotteDisponible = [];
let commandeOuverte = null;
/** Checklist « ce qui manque » pour l'étape suivante — calculée par le serveur (commande-etat),
 *  avec la même règle que celle qui bloque le changement de statut. */
async function afficherPrerequisPartenaire(c) {
  const zone = $('dc-prerequis');
  if (!zone || !window.FicheCommande) return;
  zone.innerHTML = '';
  try {
    // Composant partagé avec l'admin (fiche-commande.js) : même frise, même checklist.
    const etat = await window.FicheCommande.charger(jsonp, { codeCreateur: codeValide, ligne: c.ligne });
    if (!etat || commandeOuverte !== c) return;
    $('dc-timeline').innerHTML = window.FicheCommande.frise(etat);
    if (!etat.etapeSuivante) return;
    const manquants = (etat.prerequis || []).filter((p) => !p.ok && !p.info);
    zone.className = 'dc-manque' + (manquants.length ? '' : ' pret');
    zone.textContent = manquants.length
      ? 'Il manque : ' + manquants.map((p) => p.libelle.charAt(0).toLowerCase() + p.libelle.slice(1)).join(' · ') + '.'
      : 'Tout est prêt.';
    const bouton = $('dc-avancer-statut');
    if (bouton) {
      bouton.disabled = !etat.peutAvancer;
      bouton.title = etat.peutAvancer ? '' : 'Complétez d’abord ce qui manque.';
    }
  } catch (err) {
    /* non bloquant : le serveur refusera de toute façon un passage incomplet */
  }
}

let lignesFlotteSelectionnees = [];
const tachesAvancerVisibles = {}; // par commande : la tâche « Passer à … » était-elle déjà affichée ?

// Circuit Interne (même règle que le back, regles/circuits.js) : l'Interne valide elle-même.
const ORDRE_STATUTS = ['Reçue', 'Validée', 'Préparée', 'En cours de livraison', 'Livrée'];
const COULEURS_STATUT = {
  Reçue: { bg: '#FFF3CC', fg: '#7A5A00' },
  Validée: { bg: 'var(--color-bleu-100)', fg: 'var(--color-bleu-700)' },
  Préparée: { bg: '#FBE3EC', fg: '#C2185B' },
  'En cours de livraison': { bg: '#FFF3CC', fg: '#7A5A00' },
  Livrée: { bg: 'var(--color-vert-100)', fg: 'var(--color-vert-700)' },
  Annulée: { bg: '#EEF2F5', fg: '#5A6D7D' },
};

// Icônes et libellés courts — repris tels quels de suivi.html pour rester visuellement
// cohérent partout où une commande affiche son mode de livraison / ses pilules.
const SVG_MODE_LIVRAISON = {
  Colissimo:
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none"><path d="M2.5 5.5 9 2 15.5 5.5 9 9 2.5 5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2.5 5.5V12.5L9 16 15.5 12.5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  Retrait:
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8V4.5A1.5 1.5 0 0 1 5.5 3h7A1.5 1.5 0 0 1 14 4.5V8"/><rect x="2.5" y="8" width="13" height="7" rx="1.3"/><path d="M2.5 11.5h13"/></svg>',
  'Livraison EC':
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M10.5 8.5h3l3 2.5v2h-6z"/><circle cx="4.5" cy="14.5" r="1.4"/><circle cx="13" cy="14.5" r="1.4"/></svg>',
};
const SVG_ICONE_QR =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="15" y="15" width="4" height="4" rx="0.8"/></svg>';
const SVG_ICONE_TICKET =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M10 7.5v9" stroke-dasharray="2.2 2.2"/></svg>';
const SVG_LIEN_EXTERNE =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';
const SVG_COCHE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    montant,
  );
}
// Noms des bénéficiaires déclarés à la commande, dans l'ordre — pour associer un lien de
// paiement par personne quand le paiement séparé a été choisi. Même extraction que côté admin
// (nomsPersonnesCommande) : ne lit que le premier segment de chaque ligne (le nom), qu'elle
// soit au format "Nom|Naissance" ou déjà simple.
function nomsPersonnesCommande(c) {
  return String(c.personnes || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((ligneTexte) => {
      const separateur = ligneTexte.includes('|') ? '|' : ligneTexte.includes('—') ? '—' : null;
      return separateur ? ligneTexte.split(separateur)[0].trim() : ligneTexte;
    });
}

// Icône du produit principal d'une commande — repris de commande.html (même correspondance
// mot-clé), en version autonome puisque cette page ne charge pas le catalogue produits complet.
function svgIcone(nomIcone) {
  const icones = {
    laptop:
      '<rect x="3" y="3" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="12.5" width="16" height="2" rx="1" fill="currentColor" stroke="none"/>',
    ecran:
      '<rect x="2.5" y="3" width="13" height="9" rx="1" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="12.5" x2="9" y2="15" stroke="currentColor" stroke-width="1.4"/><line x1="6" y1="15" x2="12" y2="15" stroke="currentColor" stroke-width="1.4"/>',
    tablette:
      '<rect x="3" y="1.5" width="12" height="15" rx="1.6" stroke="currentColor" stroke-width="1.4"/><line x1="7.5" y1="14" x2="10.5" y2="14" stroke="currentColor" stroke-width="1.4"/>',
    telephone:
      '<rect x="5.5" y="1.5" width="7" height="15" rx="1.8" stroke="currentColor" stroke-width="1.4"/><line x1="8" y1="14" x2="10" y2="14" stroke="currentColor" stroke-width="1.4"/>',
    sim: '<path d="M5 2h6l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/><rect x="6" y="8" width="5" height="4.5" rx=".8" stroke="currentColor" stroke-width="1.3"/>',
    recharge:
      '<rect x="1.5" y="6" width="13" height="7" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M16.5 8.2v3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 7.3 6.8 10h1.6l-.6 2.2L10 9.5H8.4z" fill="currentColor" stroke="none"/>',
    atelier:
      '<circle cx="6.3" cy="5.8" r="2.1" stroke="currentColor" stroke-width="1.3"/><path d="M2 15c0-2.4 1.9-4.3 4.3-4.3S10.6 12.6 10.6 15" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="12.8" cy="6.8" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M10.8 15c.2-1.9 1.6-3.4 3.4-3.8" stroke="currentColor" stroke-width="1.2" fill="none"/>',
  };
  return `<svg viewBox="0 0 18 18" width="18" height="18" fill="none">${icones[nomIcone] || icones.laptop}</svg>`;
}
/** Illustration produit du kit (portail-ui.js), repli sur l'icône au trait. */
function illustrationProduitCP(nom, taille) {
  if (window.illustrationCvdl && window.cleIllustrationProduit)
    return window.illustrationCvdl(window.cleIllustrationProduit(nom), taille);
  return svgIcone(iconePourProduit(nom));
}
function iconePourProduit(nom) {
  const n = (nom || '').toLowerCase();
  if (/(sensibilisation|[ée]cologi|environnement|atelier|animation)/.test(n)) return 'atelier';
  if (
    n.includes('smartphone') ||
    n.includes('téléphone') ||
    n.includes('telephone') ||
    n.includes('mobile') ||
    /\btouches?\b/.test(n)
  )
    return 'telephone';
  if (n.includes('tablet')) return 'tablette';
  if (n.includes('écran') || n.includes('ecran') || n.includes('moniteur')) return 'ecran';
  if (/\bsim\b|carte sim/.test(n)) return 'sim';
  if (n.includes('recharge') || n.includes('forfait')) return 'recharge';
  return 'laptop';
}
// Produit "principal" d'une commande multi-lignes : celui commandé en plus grande quantité.
function produitPrincipal(lignes) {
  if (!lignes || !lignes.length) return '';
  return [...lignes].sort((a, b) => (parseInt(b.quantite, 10) || 0) - (parseInt(a.quantite, 10) || 0))[0].produit;
}

const LIBELLES_COURTS_TIMELINE_PARTENAIRE = {
  Reçue: 'Reçue',
  Validée: 'Validée',
  Préparée: 'Préparée',
  'En cours de livraison': 'En livraison',
  Livrée: 'Livrée',
};
// Dégradé magenta → turquoise — mêmes teintes que suivi.html, juste 3 segments ici (4 étapes)
// au lieu de 4, puisque "Validée" n'existe pas dans le parcours self-service partenaire.
const DEGRADE_TIMELINE = ['#B3E3E4', '#66CDCF', '#00ACB0', '#00ACB0'];

function construireTimelinePartenaire(statutActuel) {
  // Une commande déjà validée par un autre biais (admin) avant transfert reste malgré tout
  // affichée comme "juste après Reçue" ici — Validée n'a pas d'étape dédiée dans ce parcours.
  const indexActuel = ORDRE_STATUTS.indexOf(statutActuel);
  if (indexActuel === -1) return '';
  const etapes = ORDRE_STATUTS.map((etape, i) => {
    const cls = i < indexActuel ? 'fait' : i === indexActuel ? 'actuel' : '';
    const couleurSegment = DEGRADE_TIMELINE[Math.min(i, DEGRADE_TIMELINE.length - 1)];
    const connecteurAtteint = i <= indexActuel;
    return `<div class="tlc-suivi-etape ${cls}" style="${connecteurAtteint ? `--couleur-segment:${couleurSegment}` : ''}">
      <div class="tlc-suivi-point ${cls}" style="${cls ? `--couleur-segment:${couleurSegment}` : ''}"></div>
      <div class="tlc-suivi-libelle ${cls}">${echapper(LIBELLES_COURTS_TIMELINE_PARTENAIRE[etape] || etape)}</div>
    </div>`;
  }).join('');
  return `<div class="tlc-suivi">${etapes}</div>`;
}

async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Saisissez votre code structure.</div>';
    return;
  }
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  $('retour-id-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code });
    if (!r.ok) {
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    } else if (!r.interne) {
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">Cet espace est réservé aux structures Interne.</div>';
    } else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-liste').hidden = false;
      $('btn-deconnexion-cp').hidden = false;
      await chargerCommandes();
    }
  } catch (e) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Réessayez.</div>';
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});
$('btn-deconnexion-cp').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

async function chargerCommandes() {
  $('retour-liste-commandes-partenaires').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await jsonp({ action: 'commandes-partenaires-lister', codeCreateur: codeValide });
    if (!r.ok) {
      $('retour-liste-commandes-partenaires').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</div>`;
      return;
    }
    commandesCourantes = r.commandes || [];
    $('retour-liste-commandes-partenaires').innerHTML = '';
    if (!commandesCourantes.length) {
      $('grille-commandes-partenaires').innerHTML =
        '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucune commande de vos structures partenaires pour le moment.</div>';
      return;
    }
    rendreCartesPartenaires();
  } catch (e) {
    $('retour-liste-commandes-partenaires').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
}

/* Liste des commandes (maquette « Espace partenaire ») : filtres d'état + recherche. */
let filtreCp = '',
  rechercheCp = '';
function etatCp(c) {
  if (c.transfereAdmin || c.statutCommande === 'Livrée' || c.statutCommande === 'Annulée') return 'fini';
  return c.statutCommande === 'Reçue' ? 'attente' : 'cours';
}
/** Ce qu'il reste à faire, en une phrase, pour la carte de la liste. */
function prochaineActionCp(c) {
  if (c.transfereAdmin) return 'Gérée par l’équipe CVDL';
  const deja = String(c.numerosSerie || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean).length;
  const besoin = c.quantiteAvecNumeroSerie || 0;
  switch (c.statutCommande || 'Reçue') {
    case 'Reçue':
      return 'À valider';
    case 'Validée':
      return besoin && deja < besoin ? `Matériel à choisir (${deja}/${besoin})` : 'À préparer';
    case 'Préparée':
      return 'À remettre ou expédier';
    case 'En cours de livraison':
      return 'Réception à confirmer';
    default:
      return '';
  }
}
/** Mini-frise d'avancement (5 étapes du circuit Interne) sur la carte. */
function avancementCp(c) {
  const i = Math.max(0, ORDRE_STATUTS.indexOf(c.statutCommande || 'Reçue'));
  return `<div class="cp-avancement" role="img" aria-label="Étape ${i + 1} sur ${ORDRE_STATUTS.length} : ${echapper(c.statutCommande || 'Reçue')}">${ORDRE_STATUTS.map((_, k) => `<i class="${k < i ? 'fait' : k === i ? 'cours' : ''}"></i>`).join('')}</div>`;
}
function rendreCartesPartenaires() {
  const terme = rechercheCp.trim().toLowerCase();
  const liste = commandesCourantes.filter(
    (c) =>
      (!filtreCp || etatCp(c) === filtreCp) &&
      (!terme ||
        [c.reference, c.nom, ...(c.lignes || []).map((l) => l.produit)].join(' ').toLowerCase().includes(terme)),
  );
  if (!liste.length) {
    $('grille-commandes-partenaires').innerHTML =
      '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucune commande ne correspond.</div>';
    return;
  }
  $('grille-commandes-partenaires').innerHTML = liste
    .map((c) => {
      const estLivree = c.statutCommande === 'Livrée' && c.dateLivraison;
      const etat = etatCp(c);
      const forme = etat === 'fini' ? 'rond' : etat === 'attente' ? 'losange' : 'carre';
      const urgente = c.dateLivraisonSouhaitee === 'ASAP' && etat !== 'fini';
      const articles = (c.lignes || [])
        .map(
          (l) =>
            `<div class="cp-art">${illustrationProduitCP(l.produit, 28)}<span><b>${parseInt(l.quantite, 10) || 0} ×</b> ${echapper(l.produit)}</span></div>`,
        )
        .join('');
      return `
      <div class="carte-commande-partenaire cp-carte cp-${etat}${c.transfereAdmin ? ' transferee' : ''}" data-ouvrir-commande="${echapper(c.reference)}" role="button" tabindex="0">
        <div class="cp-tete">
          <span class="cp-ill">${illustrationProduitCP(produitPrincipal(c.lignes), 44)}</span>
          <div class="cp-tete-txt"><div class="cvdl-surtitre">${echapper(c.reference)}</div><b>${echapper(c.nom)}</b></div>
          <span class="cp-etat">${urgente ? '<span class="cs-urgent">Urgent</span>' : ''}<span class="tag" data-forme="${forme}">${echapper(c.transfereAdmin ? 'Transférée' : c.statutCommande || 'Reçue')}</span></span>
        </div>
        <div class="cp-articles">${articles}</div>
        ${etat !== 'fini' ? avancementCp(c) : ''}
        <div class="cp-pied">${estLivree ? `<span class="pk-pill pk-ok">Livrée le ${echapper(c.dateLivraison)}</span>` : `<span class="cp-action">${echapper(prochaineActionCp(c))}</span>`}<span class="cp-gerer">${etat === 'fini' ? 'Voir' : 'Gérer'} →</span></div>
      </div>`;
    })
    .join('');
  document.querySelectorAll('[data-ouvrir-commande]').forEach((el) => {
    el.addEventListener('click', () => ouvrirDetailCommande(el.dataset.ouvrirCommande));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ouvrirDetailCommande(el.dataset.ouvrirCommande);
      }
    });
  });
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filtre-cp]');
  if (!f) return;
  filtreCp = f.dataset.filtreCp;
  document.querySelectorAll('[data-filtre-cp]').forEach((b) => b.classList.toggle('actif', b === f));
  rendreCartesPartenaires();
});
$('cp-recherche').addEventListener('input', () => {
  rechercheCp = $('cp-recherche').value;
  rendreCartesPartenaires();
});

async function ouvrirDetailCommande(reference) {
  const c = commandesCourantes.find((x) => x.reference === reference);
  if (!c) return;
  commandeOuverte = c;
  lignesFlotteSelectionnees = [];
  const fenetre = document.querySelector('.dc-v2');
  if (fenetre) fenetre.scrollTop = 0;
  $('dc-reference').textContent = c.reference;
  $('dc-structure').textContent = c.nom;

  const estAnnulee = c.statutCommande === 'Annulée';
  const svgHorloge =
    '<svg width="13" height="13" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M9 5v4l3 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  // Une seule pilule de date, même logique que le suivi bénéficiaire : la livraison effective
  // une fois livrée, sinon la date cible confirmée (Colissimo, Retrait ou Livraison EC), sinon
  // la date initialement souhaitée.
  let piluleDate = '';
  if (!estAnnulee) {
    if (c.statutCommande === 'Livrée' && c.dateLivraison) {
      piluleDate = `<span class="pilule-date-livree-cs">${svgHorloge}Livrée le ${echapper(c.dateLivraison)}</span>`;
    } else if (
      c.dateLivraisonCible &&
      (c.modeLivraison === 'Colissimo' || c.modeLivraison === 'Retrait' || c.modeLivraison === 'Livraison EC')
    ) {
      piluleDate = `<span class="pilule-date-estimee-cs">${svgHorloge}${c.modeLivraison === 'Retrait' ? 'Retrait à partir du' : 'Livraison estimée le'} ${echapper(c.dateLivraisonCible)}</span>`;
    } else if (c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee !== 'ASAP') {
      piluleDate = `<span class="pilule-date-estimee-cs">${svgHorloge}Livraison estimée le ${echapper(c.dateLivraisonSouhaitee)}</span>`;
    }
  }
  const piluleMode =
    !estAnnulee && c.modeLivraison
      ? `<span class="pilule-mode-cs">${SVG_MODE_LIVRAISON[c.modeLivraison] || ''}${echapper(c.modeLivraison === 'Livraison EC' ? 'Livraison Emmaüs Connect' : c.modeLivraison)}</span>`
      : '';
  $('dc-articles').innerHTML =
    (c.lignes || [])
      .map(
        (l) =>
          `<span class="dc-article">${illustrationProduitCP(l.produit, 26)}<b>${parseInt(l.quantite, 10)}×</b> ${echapper(l.produit)}</span>`,
      )
      .join('') +
    piluleMode +
    piluleDate;

  $('dc-timeline').innerHTML = estAnnulee
    ? `<span class="tag-statut" style="background:${COULEURS_STATUT['Annulée'].bg};color:${COULEURS_STATUT['Annulée'].fg}">Commande annulée</span>`
    : construireTimelinePartenaire(c.statutCommande);

  const numerosDejaLa = String(c.numerosSerie || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // "Qui a reçu quoi" — retrouve le bénéficiaire de chaque appareil déjà attribué, pour ne pas
  // avoir à recouper à la main la liste des numéros et celle des bénéficiaires déclarés.
  // Numéro/code devant le nom : c'est lui qu'on scanne/recherche en premier sur le terrain.
  const parPersonne = commandeOuverte.personnesAvecAppareil || [];
  $('dc-personnes-appareils').innerHTML = '';
  $('dc-qui').hidden = !parPersonne.length;
  $('dc-qui-liste').innerHTML = parPersonne.length
    ? `<div class="liste-personnes-appareils-cs">
      ${parPersonne
        .map(
          (p) => `<div class="ligne-personne-appareil-cs">
        ${
          c.dematerialisee
            ? window.piluleSerieCvdl(p.numeroSerie, { code: true })
            : window.piluleSerieCvdl(p.numeroSerie, {
                query: codeValide ? '&code=' + encodeURIComponent(codeValide) : '',
              })
        }
        — <span class="nom-cs">${p.nomComplet ? echapper(p.nomComplet) : 'Personne accompagnée non renseignée'}</span>
      </div>`,
        )
        .join('')}
    </div>`
    : '';

  // Pied de paiement — montant, statut, lien de règlement, et sa gestion : cette page concerne
  // des structures BO partenaires, pas exemptées de paiement comme les Internes/ESN, donc ces
  // infos existent bien pour elles. L'Interne peut ici éditer le(s) lien(s) et marquer le
  // paiement reçu elle-même, plutôt que de dépendre entièrement de l'admin pour ça.
  // Un lien par bénéficiaire si le paiement séparé a été choisi à la commande (≥2 personnes) —
  // sans repère, rien n'indiquerait quel lien collé sur quelle ligne revient à quel bénéficiaire.
  const nomsBeneficiairesPaiement = nomsPersonnesCommande(c);
  const paiementSepareMultiple = c.paiementSepare && nomsBeneficiairesPaiement.length > 1;
  const liensActuelsPaiement = String(c.lienPaiement || '').split('\n');
  $('dc-pied-paiement').innerHTML =
    !estAnnulee && c.montantEstime != null
      ? `<div class="pied-cs" style="flex-direction:column;align-items:stretch;gap:10px">
      <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap">
        <div class="montant-cs">${formaterMontant(c.montantFacture != null ? c.montantFacture : c.montantEstime)}</div>
        <div class="statut-paiement-cs ${c.statutPaiement === 'Payé' ? 'paye' : 'non-paye'}">${echapper(c.statutPaiement || 'Non payé')}</div>
        <div class="rangee-boutons-paiement-cs">
          <button type="button" class="btn btn-secondary" id="dc-toggle-paiement" data-nouveau-statut="${c.statutPaiement === 'Payé' ? 'Non payé' : 'Payé'}">Marquer ${c.statutPaiement === 'Payé' ? 'non payée' : 'payée'}</button>
        </div>
      </div>
      ${
        paiementSepareMultiple
          ? `
      <div>
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.55;font-weight:700;display:block;margin-bottom:4px">Un lien de paiement par personne accompagnée</label>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${nomsBeneficiairesPaiement
            .map(
              (nom, i) => `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="flex:0 0 130px;font-size:12.5px;font-weight:600;opacity:0.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${echapper(nom)}">${echapper(nom || `Personne accompagnée ${i + 1}`)}</span>
            <input type="text" class="input" data-lien-paiement-personne="${i}" placeholder="https://…" value="${echapper(liensActuelsPaiement[i] || '')}" style="flex:1">
            ${liensActuelsPaiement[i] && c.statutPaiement !== 'Payé' ? `<a class="lien-paiement-cs" href="${echapper(API + '?action=clic-lien-paiement&ref=' + encodeURIComponent(c.reference) + '&index=' + i)}" target="_blank" rel="noopener" title="Ouvrir ce lien de paiement">${SVG_LIEN_EXTERNE}</a>` : ''}
          </div>`,
            )
            .join('')}
        </div>
        <button type="button" class="btn btn-ghost" id="dc-enregistrer-lien-paiement" style="margin-top:8px">Enregistrer les liens</button>
      </div>`
          : `
      <div>
        <label for="dc-lien-paiement" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.55;font-weight:700;display:block;margin-bottom:4px">Lien de paiement</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input type="text" class="input" id="dc-lien-paiement" placeholder="https://…" value="${echapper(c.lienPaiement || '')}" style="flex:1;min-width:200px">
          <button type="button" class="btn btn-ghost" id="dc-enregistrer-lien-paiement">Enregistrer</button>
          ${c.lienPaiement && c.statutPaiement !== 'Payé' ? `<a class="lien-paiement-cs" href="${echapper(API + '?action=clic-lien-paiement&ref=' + encodeURIComponent(c.reference))}" target="_blank" rel="noopener">Régler cette commande${SVG_LIEN_EXTERNE}</a>` : ''}
        </div>
      </div>`
      }
      <div id="dc-retour-paiement"></div>
    </div>`
      : '';
  $('dc-repli-paiement').hidden = !$('dc-pied-paiement').innerHTML.trim();
  if (!estAnnulee && c.montantEstime != null)
    $('dc-resume-paiement').textContent =
      `Paiement · ${formaterMontant(c.montantFacture != null ? c.montantFacture : c.montantEstime)} · ${c.statutPaiement || 'Non payé'}`;
  if ($('dc-toggle-paiement')) {
    $('dc-toggle-paiement').addEventListener('click', async () => {
      const nouveauStatut = $('dc-toggle-paiement').dataset.nouveauStatut;
      $('dc-toggle-paiement').disabled = true;
      try {
        const r = await poster({
          action: 'commande-partenaire-update',
          codeCreateur: codeValide,
          ligne: c.ligne,
          champ: 'statutPaiement',
          valeur: nouveauStatut,
        });
        if (r.ok) {
          await chargerCommandes();
          ouvrirDetailCommande(c.reference);
        } else {
          $('dc-retour-paiement').innerHTML =
            `<div class="msg msg-erreur">${echapper(r.erreur || 'Échec de la mise à jour.')}</div>`;
          $('dc-toggle-paiement').disabled = false;
        }
      } catch (e) {
        $('dc-retour-paiement').innerHTML =
          `<div class="msg msg-erreur">Erreur technique : ${echapper((e && e.message) || String(e))}</div>`;
        $('dc-toggle-paiement').disabled = false;
      }
    });
  }
  if ($('dc-enregistrer-lien-paiement')) {
    $('dc-enregistrer-lien-paiement').addEventListener('click', async () => {
      // Un lien par bénéficiaire (dans l'ordre) si paiement séparé, sinon un seul champ.
      const valeur = paiementSepareMultiple
        ? Array.from(document.querySelectorAll('[data-lien-paiement-personne]'))
            .sort((a, b) => parseInt(a.dataset.lienPaiementPersonne, 10) - parseInt(b.dataset.lienPaiementPersonne, 10))
            .map((input) => input.value.trim())
            .join('\n')
        : $('dc-lien-paiement').value.trim();
      $('dc-enregistrer-lien-paiement').disabled = true;
      try {
        const r = await poster({
          action: 'commande-partenaire-update',
          codeCreateur: codeValide,
          ligne: c.ligne,
          champ: 'lienPaiement',
          valeur,
        });
        if (r.ok) {
          await chargerCommandes();
          ouvrirDetailCommande(c.reference);
        } else {
          $('dc-retour-paiement').innerHTML =
            `<div class="msg msg-erreur">${echapper(r.erreur || "Échec de l'enregistrement.")}</div>`;
          $('dc-enregistrer-lien-paiement').disabled = false;
        }
      } catch (e) {
        $('dc-retour-paiement').innerHTML =
          `<div class="msg msg-erreur">Erreur technique : ${echapper((e && e.message) || String(e))}</div>`;
        $('dc-enregistrer-lien-paiement').disabled = false;
      }
    });
  }

  // Badge final bien visible si livrée — plus explicite que la petite pilule déjà présente en
  // haut à côté des articles.
  $('dc-badge-livree').innerHTML =
    c.statutCommande === 'Livrée' && c.dateLivraison
      ? `<div class="badge-livree-finale-cs">Commande livrée le ${echapper(c.dateLivraison)}</div>`
      : '';

  // Une fois tous les numéros de série nécessaires déjà attribués, plus rien à faire ici — la
  // zone de sélection ne doit plus réapparaître vide à chaque ouverture (ça donnait l'impression
  // à tort qu'il fallait tout re-sélectionner). `quantiteAvecNumeroSerie` compte déjà les produits
  // qui n'en nécessitent pas (cartes SIM, recharges…), donc 0 y est un cas valide et complet.
  const attributionComplete = numerosDejaLa.length >= (c.quantiteAvecNumeroSerie || 0);

  // Transférée : plus aucune action possible depuis cette interface, juste consultable.
  $('dc-bandeau-transferee').hidden = !c.transfereAdmin;
  $('dc-zone-attribution').hidden = !!c.transfereAdmin || attributionComplete || c.statutCommande !== 'Validée';
  // Transfert possible seulement avant la préparation (même règle que le back).
  $('dc-zone-transfert').hidden = !!c.transfereAdmin || !['Reçue', 'Validée'].includes(c.statutCommande || 'Reçue');
  // Une fois la commande livrée (terminale pour ce parcours self-service), plus rien à faire
  // avancer — la section entière disparaît plutôt que de laisser un titre sans bouton en dessous.
  $('dc-section-avancer').hidden = !!c.transfereAdmin || c.statutCommande === 'Livrée';
  if (c.transfereAdmin) {
    $('modale-detail-commande').classList.add('visible');
    return;
  }

  const idx = ORDRE_STATUTS.indexOf(c.statutCommande);
  const prochain = idx >= 0 && idx < ORDRE_STATUTS.length - 1 ? ORDRE_STATUTS[idx + 1] : null;
  const boutonAvancer = $('dc-avancer-statut');
  // Une consigne par étape (circuit Interne : Reçue → Validée → Préparée → En livraison → Livrée).
  const TITRES = {
    Reçue: 'Valider la demande',
    Validée: 'Préparer le matériel',
    Préparée: 'Remettre ou expédier',
    'En cours de livraison': 'Confirmer la remise',
  };
  const AIDES = {
    Reçue: 'Vérifiez la demande de la structure partenaire puis validez-la. Le matériel se choisit à l’étape suivante.',
    Validée:
      'Choisissez les appareils dans votre flotte : ils sont transférés à la structure et leurs numéros enregistrés sur la commande.',
    Préparée: 'Le matériel est prêt : passez en livraison quand il part (ou quand la structure vient le chercher).',
    'En cours de livraison': 'Confirmez quand la structure a bien reçu le matériel.',
  };
  $('dc-etape-titre').textContent = TITRES[c.statutCommande] || 'Faire avancer la commande';
  $('dc-etape-num').textContent =
    'Étape en cours · ' + (c.statutCommande === 'En cours de livraison' ? 'En livraison' : c.statutCommande || 'Reçue');
  $('dc-avancer-titre').textContent = prochain
    ? `Passer à « ${prochain === 'En cours de livraison' ? 'En livraison' : prochain} »`
    : 'Commande terminée';
  const besoinAppareils = (c.quantiteAvecNumeroSerie || 0) > 0;
  // Le choix du matériel n'apparaît qu'à partir de « Validée » (avant : la validation ne pouvait
  // pas se faire tant que tout n'était pas attribué, alors que rien ne l'exige). Il reste visible
  // (coché) une fois fait, jusqu'à la préparation.
  const etapeMateriel = besoinAppareils && ['Validée'].includes(c.statutCommande);
  $('dc-tache-attribution').hidden = !etapeMateriel;
  $('dc-tache-attribution').className = 'dc-tache ' + (attributionComplete ? 'ok' : 'cours');
  $('dc-tache-avancer').hidden = !prochain;
  $('dc-tache-avancer').className = 'dc-tache ' + (etapeMateriel && !attributionComplete ? 'avenir' : 'cours');
  $('dc-ensuite').hidden = true;
  $('dc-tache-avancer').querySelector('.dc-num').textContent = etapeMateriel ? '2' : '1';
  $('dc-avancer-aide').textContent =
    AIDES[c.statutCommande] || 'Vous faites avancer la commande vous-même, sans passer par la logistique.';
  // Colissimo : le numéro de suivi est exigé pour passer « En livraison » — il n'y avait aucun
  // champ pour le saisir ici, la commande restait bloquée à « Préparée ».
  const etapeColissimo = c.modeLivraison === 'Colissimo' && c.statutCommande === 'Préparée';
  $('dc-tache-colissimo').hidden = !etapeColissimo;
  $('dc-tache-colissimo').className = 'dc-tache ' + (c.colissimo ? 'ok' : 'cours');
  $('dc-colissimo').value = c.colissimo || '';
  $('dc-retour-colissimo').innerHTML = '';
  if (etapeColissimo) {
    $('dc-tache-avancer').querySelector('.dc-num').textContent = '2';
    if (!c.colissimo) $('dc-tache-avancer').className = 'dc-tache avenir';
  }
  $('dc-attr-detail').textContent = attributionComplete
    ? `${numerosDejaLa.length} appareil${numerosDejaLa.length > 1 ? 's' : ''} attribué${numerosDejaLa.length > 1 ? 's' : ''}.`
    : `${numerosDejaLa.length} / ${c.quantiteAvecNumeroSerie} attribué${numerosDejaLa.length > 1 ? 's' : ''} — les numéros sont enregistrés sur la commande et les appareils transférés à la structure.`;
  if (prochain) {
    boutonAvancer.hidden = false;
    boutonAvancer.disabled = false;
    boutonAvancer.textContent = `Passer à « ${prochain === 'En cours de livraison' ? 'En livraison' : prochain} »`;
    boutonAvancer.dataset.prochain = prochain;
  } else {
    boutonAvancer.hidden = true;
  }
  afficherPrerequisPartenaire(c);
  $('dc-retour-statut').innerHTML = '';
  $('dc-retour-attribution').innerHTML = '';
  $('dc-retour-transfert').innerHTML = '';

  if (attributionComplete || c.statutCommande !== 'Validée') {
    $('modale-detail-commande').classList.add('visible');
    return;
  }

  $('dc-liste-flotte').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  $('modale-detail-commande').classList.add('visible');

  try {
    const r = await jsonp({ action: 'flotte-lister', code: codeValide });
    flotteDisponible = (r.ok ? r.appareils : []).filter((a) => a.statut === 'En stock' && !a.verrouille);
    if (!flotteDisponible.length) {
      $('dc-liste-flotte').innerHTML =
        '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucun appareil disponible en stock dans votre flotte pour le moment.</div>';
      return;
    }
    // Une section par produit demandé — plutôt qu'une seule liste de toute la flotte mélangée,
    // pour répondre précisément à "combien de X, à qui, avec quoi de disponible pour X". Les
    // appareils dont le produit correspond exactement remontent en premier ("correspondance"),
    // le reste du stock reste accessible en dépliant, pour les cas où le libellé ne correspond
    // pas exactement (catégorie tec.tech proche mais nom de produit différent).
    const personnesParProduit = {};
    (c.personnesParLigne || []).forEach((p) => {
      (personnesParProduit[p.produit] ||= []).push(p);
    });

    // Suivi de quelle personne (index dans personnesParProduit[produit]) est déjà rattachée à
    // quel appareil sélectionné — par groupe de produit — pour ne jamais proposer deux fois le
    // même bénéficiaire sur deux appareils différents du même produit.
    const personnesUtiliseesParProduit = {};

    function optionsPersonnes(produit, ligneCourante) {
      const liste = personnesParProduit[produit] || [];
      const utilisees = personnesUtiliseesParProduit[produit] || {};
      return liste
        .map((p, idx) => {
          const prisAilleurs = utilisees[idx] !== undefined && utilisees[idx] !== ligneCourante;
          const libelle = p.nomComplet ? echapper(p.nomComplet) : `Personne accompagnée ${idx + 1} (nom non renseigné)`;
          const dateAffichee = p.dateNaissance ? ` — ${echapper(p.dateNaissance)}` : '';
          return `<option value="${idx}" ${prisAilleurs ? 'disabled' : ''}>${libelle}${dateAffichee}</option>`;
        })
        .join('');
    }

    // Regénère les options de tous les menus déroulants du groupe (garde la valeur choisie sur
    // chacun) — appelé à chaque changement de sélection pour tenir les "disabled" à jour partout.
    function rafraichirSelectsProduit(groupeIdx) {
      document.querySelectorAll(`[data-personne-select][data-groupe-idx="${groupeIdx}"]`).forEach((sel) => {
        const ligneCourante = parseInt(sel.dataset.personneSelect, 10);
        const produit = sel.dataset.produit;
        const valeurActuelle = sel.value;
        sel.innerHTML = `<option value="">Choisir une personne accompagnée…</option>${optionsPersonnes(produit, ligneCourante)}<option value="autre">Autre / saisir manuellement…</option>`;
        sel.value = valeurActuelle;
      });
    }

    $('dc-liste-flotte').innerHTML = (c.lignes || [])
      .map((l, groupeIdx) => {
        const quantite = parseInt(l.quantite, 10) || 0;
        const personnesCeProduit = personnesParProduit[l.produit] || [];
        const correspondants = flotteDisponible.filter((a) => a.produit === l.produit);
        const autres = flotteDisponible.filter((a) => a.produit !== l.produit);
        const ligneAppareil = (a) => `
        <div class="ligne-appareil-choix" data-ligne-flotte="${a.ligne}" data-groupe-idx="${groupeIdx}">
          <input type="checkbox" data-case-flotte="${a.ligne}" data-produit-flotte="${echapper(l.produit)}" data-quantite-max="${quantite}" data-groupe-idx="${groupeIdx}">
          ${illustrationProduitCP(a.produit || l.produit, 30)}
          <div class="lac-txt">
            <div class="lac-sn mono">${echapper(a.numeroSerie)}</div>
            <div class="lac-desc">${[a.produit, a.marque, a.modele, a.categorie].filter(Boolean).map(echapper).join(' · ')}</div>
          </div>
        </div>`;
        return `
      <div class="dc-groupe">
        <div class="dc-groupe-tete">${illustrationProduitCP(l.produit, 34)}<span class="dc-groupe-nom"><b>${echapper(l.produit)}</b><small>${quantite} demandé${quantite > 1 ? 's' : ''} · ${correspondants.length} en stock</small></span></div>
        ${personnesCeProduit.some((p) => p.nomComplet) ? `<div style="font-size:12px;opacity:0.6;margin-bottom:8px">Personnes accompagnées renseignées à la commande : ${personnesCeProduit.map((p) => (p.nomComplet ? echapper(p.nomComplet) : '—')).join(', ')}</div>` : ''}
        ${correspondants.length ? correspondants.map(ligneAppareil).join('') : '<p style="font-size:12px;opacity:0.55;margin:4px 0">Aucun appareil "' + echapper(l.produit) + '" en stock — dépliez le reste du stock ci-dessous si un autre modèle peut convenir.</p>'}
        ${
          autres.length
            ? `
        <details style="margin-top:6px">
          <summary class="dc-reste-stock">Voir le reste du stock (${autres.length})</summary>
          <div style="margin-top:6px">${autres.map(ligneAppareil).join('')}</div>
        </details>`
            : ''
        }
      </div>`;
      })
      .join('');

    majCompteurSelection();
    document.querySelectorAll('[data-case-flotte]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const ligne = parseInt(cb.dataset.caseFlotte, 10);
        const produit = cb.dataset.produitFlotte;
        const groupeIdx = cb.dataset.groupeIdx;
        const quantiteMax = parseInt(cb.dataset.quantiteMax, 10) || 0;
        const conteneur = cb.closest('.ligne-appareil-choix');
        const dejaPourCeProduit = lignesFlotteSelectionnees.filter((x) => x.produit === produit).length;
        if (cb.checked) {
          if (dejaPourCeProduit >= quantiteMax) {
            cb.checked = false;
            $('dc-retour-attribution').innerHTML =
              `<div class="msg msg-erreur">Déjà ${quantiteMax} appareil(s) sélectionné(s) pour "${echapper(produit)}".</div>`;
            return;
          }
          lignesFlotteSelectionnees.push({ ligne, produit });
          conteneur.classList.add('selectionnee');
          majCompteurSelection();

          // Choix par défaut : le premier bénéficiaire du produit pas encore pris par un autre
          // appareil coché — l'Interne n'a rien à faire s'il coche dans l'ordre, et peut corriger
          // via le menu déroulant sinon (ou choisir "Autre" pour saisir à la main).
          const listePersonnes = personnesParProduit[produit] || [];
          const utilisees = personnesUtiliseesParProduit[produit] || (personnesUtiliseesParProduit[produit] = {});
          const indexParDefaut = listePersonnes.findIndex((p, idx) => utilisees[idx] === undefined);
          if (indexParDefaut !== -1) utilisees[indexParDefaut] = ligne;

          const zonePersonne = document.createElement('div');
          zonePersonne.dataset.personnePour = ligne;
          zonePersonne.innerHTML = `
            <select class="input" data-personne-select="${ligne}" data-groupe-idx="${groupeIdx}" data-produit="${echapper(produit)}" style="margin-top:6px">
              <option value="">Choisir une personne accompagnée…</option>
              ${optionsPersonnes(produit, ligne)}
              <option value="autre">Autre / saisir manuellement…</option>
            </select>
            <div class="grille-personne-appareil" data-personne-manuel="${ligne}" hidden style="margin-top:6px">
              <input type="text" class="input" placeholder="Prénom" data-personne-prenom="${ligne}">
              <input type="text" class="input" placeholder="NOM" style="text-transform:uppercase" data-personne-nom="${ligne}">
              <input type="text" class="input" placeholder="Date de naissance (jj/mm/aaaa)" data-personne-naissance="${ligne}">
            </div>`;
          conteneur.after(zonePersonne);

          const select = zonePersonne.querySelector('[data-personne-select]');
          const zoneManuelle = zonePersonne.querySelector('[data-personne-manuel]');
          if (indexParDefaut !== -1) {
            select.value = String(indexParDefaut);
          } else {
            // Plus aucun bénéficiaire disponible pour ce produit : on passe directement en
            // saisie manuelle plutôt que de laisser un menu vide sans rien de sélectionné.
            select.value = 'autre';
            zoneManuelle.hidden = false;
          }
          select.addEventListener('change', () => {
            Object.keys(utilisees).forEach((idx) => {
              if (utilisees[idx] === ligne) delete utilisees[idx];
            });
            zoneManuelle.hidden = select.value !== 'autre';
            if (select.value !== '' && select.value !== 'autre') utilisees[select.value] = ligne;
            rafraichirSelectsProduit(groupeIdx);
          });
          rafraichirSelectsProduit(groupeIdx);
        } else {
          lignesFlotteSelectionnees = lignesFlotteSelectionnees.filter((x) => x.ligne !== ligne);
          conteneur.classList.remove('selectionnee');
          majCompteurSelection();
          const utilisees = personnesUtiliseesParProduit[produit] || {};
          Object.keys(utilisees).forEach((idx) => {
            if (utilisees[idx] === ligne) delete utilisees[idx];
          });
          const zonePersonne = document.querySelector(`[data-personne-pour="${ligne}"]`);
          if (zonePersonne) zonePersonne.remove();
          rafraichirSelectsProduit(groupeIdx);
        }
      });
    });
  } catch (e) {
    $('dc-liste-flotte').innerHTML = '<div class="msg msg-erreur">Impossible de charger votre flotte.</div>';
  }
}
function majCompteurSelection() {
  const c = commandeOuverte;
  if (!c) return;
  const deja = String(c.numerosSerie || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean).length;
  const reste = Math.max(0, (c.quantiteAvecNumeroSerie || 0) - deja);
  const n = lignesFlotteSelectionnees.length;
  $('dc-compteur-selection').textContent = `${n} sélectionné${n > 1 ? 's' : ''} sur ${reste} à attribuer`;
  $('dc-confirmer-attribution').disabled = !n;
}
$('dc-fermer').addEventListener('click', () => $('modale-detail-commande').classList.remove('visible'));
$('modale-detail-commande').addEventListener('click', (e) => {
  if (e.target.id === 'modale-detail-commande') $('modale-detail-commande').classList.remove('visible');
});

$('dc-transferer-admin').addEventListener('click', async () => {
  if (!commandeOuverte) return;
  if (
    !(await confirmerCvdl(
      `Transférer ${commandeOuverte.reference} au chargé de distribution régionale ? Cette commande ne se gérera plus depuis votre espace — action définitive pour elle uniquement, les autres commandes de cette structure continueront d'arriver chez vous normalement.`,
    ))
  )
    return;
  $('dc-transferer-admin').disabled = true;
  $('dc-retour-transfert').innerHTML = '';
  try {
    const r = await poster({
      action: 'commande-partenaire-transferer-admin',
      codeCreateur: codeValide,
      ligne: commandeOuverte.ligne,
    });
    if (r.ok) {
      $('modale-detail-commande').classList.remove('visible');
      await chargerCommandes();
    } else {
      $('dc-retour-transfert').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Transfert impossible.')}</div>`;
    }
  } catch (e) {
    $('dc-retour-transfert').innerHTML = '<div class="msg msg-erreur">Transfert impossible.</div>';
  }
  $('dc-transferer-admin').disabled = false;
});

$('dc-confirmer-attribution').addEventListener('click', async () => {
  if (!lignesFlotteSelectionnees.length) {
    $('dc-retour-attribution').innerHTML = '<div class="msg msg-erreur">Sélectionnez au moins un appareil.</div>';
    return;
  }
  $('dc-confirmer-attribution').disabled = true;
  $('dc-retour-attribution').innerHTML = '';
  try {
    // Reconstruit les bénéficiaires déclarés sur la commande, par produit, pour retrouver l'objet
    // complet {nomComplet, dateNaissance} correspondant à l'index choisi dans chaque menu déroulant.
    // Fait partie du try englobant : la moindre erreur ici (avant même l'envoi de la requête)
    // doit remonter à l'écran plutôt que de bloquer silencieusement sans rien afficher.
    const personnesParProduitCommande = {};
    (commandeOuverte.personnesParLigne || []).forEach((p) => {
      (personnesParProduitCommande[p.produit] ||= []).push(p);
    });

    const personnes = lignesFlotteSelectionnees.map(({ ligne, produit }) => {
      const select = document.querySelector(`[data-personne-select="${ligne}"]`);
      const valeurSelect = select ? select.value : 'autre';
      if (valeurSelect !== '' && valeurSelect !== 'autre') {
        const p = (personnesParProduitCommande[produit] || [])[parseInt(valeurSelect, 10)];
        return { nomComplet: p ? p.nomComplet : '', dateNaissance: p ? p.dateNaissance : '' };
      }
      const prenom = document.querySelector(`[data-personne-prenom="${ligne}"]`)?.value.trim() || '';
      const nom = document.querySelector(`[data-personne-nom="${ligne}"]`)?.value.trim() || '';
      const dateNaissance = document.querySelector(`[data-personne-naissance="${ligne}"]`)?.value.trim() || '';
      return { nomComplet: [prenom, nom].filter(Boolean).join(' '), dateNaissance };
    });

    const r = await poster({
      action: 'commande-partenaire-attribuer-flotte',
      codeCreateur: codeValide,
      ligneCommande: commandeOuverte.ligne,
      lignesFlotte: lignesFlotteSelectionnees.map((x) => x.ligne),
      personnes,
    });
    if (r.ok) {
      const ref = commandeOuverte.reference;
      await chargerCommandes();
      await ouvrirDetailCommande(ref);
      $('dc-retour-statut').innerHTML =
        `<div class="msg msg-succes">${r.numerosSeries.length} appareil${r.numerosSeries.length > 1 ? 's' : ''} attribué${r.numerosSeries.length > 1 ? 's' : ''}.</div>`;
    } else {
      $('dc-retour-attribution').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Attribution impossible.')}</div>`;
    }
  } catch (e) {
    // Le détail de l'erreur est affiché (pas juste loggé) pour pouvoir le remonter facilement
    // en cas de bug, plutôt que de laisser l'écran silencieux sans aucune trace exploitable.
    console.error('Attribution flotte — erreur :', e);
    $('dc-retour-attribution').innerHTML =
      `<div class="msg msg-erreur">Attribution impossible — erreur technique : ${echapper((e && e.message) || String(e))}</div>`;
  }
  $('dc-confirmer-attribution').disabled = false;
});

$('dc-enregistrer-colissimo').addEventListener('click', async () => {
  if (!commandeOuverte) return;
  const valeur = $('dc-colissimo').value.trim().replace(/\s+/g, '');
  if (!/^[A-Za-z0-9]{8,30}$/.test(valeur)) {
    $('dc-retour-colissimo').innerHTML =
      '<div class="msg msg-erreur">Numéro de suivi invalide (lettres et chiffres, 8 à 30 caractères).</div>';
    return;
  }
  $('dc-enregistrer-colissimo').disabled = true;
  try {
    const r = await poster({
      action: 'commande-partenaire-update',
      codeCreateur: codeValide,
      ligne: commandeOuverte.ligne,
      champ: 'colissimo',
      valeur,
    });
    if (r.ok) {
      const ref = commandeOuverte.reference;
      await chargerCommandes();
      await ouvrirDetailCommande(ref);
      $('dc-retour-statut').innerHTML = '<div class="msg msg-succes">Numéro de suivi enregistré.</div>';
    } else
      $('dc-retour-colissimo').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
  } catch (e) {
    $('dc-retour-colissimo').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('dc-enregistrer-colissimo').disabled = false;
});
$('dc-avancer-statut').addEventListener('click', async function () {
  const prochain = this.dataset.prochain;
  if (!prochain || !commandeOuverte) return;
  this.disabled = true;
  $('dc-retour-statut').innerHTML = '';
  try {
    const r = await poster({
      action: 'commande-partenaire-update',
      codeCreateur: codeValide,
      ligne: commandeOuverte.ligne,
      champ: 'statutCommande',
      valeur: prochain,
    });
    if (r.ok) {
      const ref = commandeOuverte.reference;
      await chargerCommandes();
      await ouvrirDetailCommande(ref);
      $('dc-retour-statut').innerHTML =
        `<div class="msg msg-succes">Commande passée à « ${echapper(prochain === 'En cours de livraison' ? 'En livraison' : prochain)} ».</div>`;
    } else {
      $('dc-retour-statut').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Impossible.')}</div>`;
    }
  } catch (e) {
    $('dc-retour-statut').innerHTML = '<div class="msg msg-erreur">Impossible.</div>';
  }
  this.disabled = false;
});

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('id-code').value = codeMemorise;
    verifierCode().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}

// Un clic n'importe où sur la ligne d'un appareil coche / décoche sa case.
document.addEventListener('click', (e) => {
  const ligne = e.target.closest('.ligne-appareil-choix');
  if (!ligne || e.target.closest('input, select, a, button, label')) return;
  const cb = ligne.querySelector('[data-case-flotte]');
  if (cb) {
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
