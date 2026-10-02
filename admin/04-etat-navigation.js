/* Admin CVDL — état global, connexion, navigation, rendu et délégation des clics. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
const state = {
  activeTab: 'dashboard',
  commandes: [],
  sav: [],
  statutsSav: [],
  structures: [],
  devis: [],
  factures: [],
  produits: [],
  commandeSearch: '',
  savSearch: '',
  savFiltreStatut: '',
  savVue: 'liste',
  docSearch: '',
  // Mini calendrier des livraisons (tableau de bord) — décalage en mois par rapport au mois
  // actuel, et jour ISO sélectionné pour l'aperçu (null = choisi automatiquement au premier
  // rendu, sur la prochaine date qui a une livraison).
  calendrierDecalageMois: 0,
  calendrierJourChoisi: null,
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
  commandesFiltreStatut: 'ACTION',
  commandesFiltreType: '',
  groupesCommandesOuverts: {},
  ncLignes: [], // lignes produit en cours de saisie pour la modale "Nouvelle commande"
  ndLignes: [], // lignes produit/prestation en cours de saisie pour la modale "Nouveau devis" (devis libre)
  ndStructureNom: '',
  ndEmail: '',
  ndAdresse: '', // idem pour les champs texte du devis libre — sans ça, perdus à chaque re-rendu (ajout/retrait de ligne)
  documentGenere: null, // état du panneau "voir/générer/envoyer" ouvert sur un devis ou une facture — { type, ref, chargement, url, erreur, envoiChargement, envoiOk }
  ncCode: '', // structure choisie dans cette même modale
  reglages: {}, // chargé au démarrage (action:'reglages'), utilisé par la page Réglages
  tectechOrigine: {}, // { [referenceSav]: 'chargement' | { ok, reconditionneur, donateur, structureDonatrice } } — chargé à la demande, pas systématiquement (voir sav-origine-tectech)
  passeportRecherche: '',
  passeportResultat: null,
  passeportChargement: false, // onglet Passeport matériel (admin) — recherche par numéro de série, accès complet (pas de restriction structure), inclut tec.tech
  structuresFiltreRegion: '',
  distributions: [],
  rattachements: [],
  distFiltre: 'cours',
  distRegion: '', // programmes de distribution
  depotVente: [], // structures en dépôt-vente (routes/depotVente.js)
  calMois: '',
  calJour: '',
  calFiltres: { livraisons: true, programmes: true, factures: true }, // calendrier global
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
async function preparerGoogleAdmin(automatique) {
  const masquer = () => {
    $('rp-google').remove();
    $('rp-google-ou').remove();
  };
  const c = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'auth-config' }),
  })
    .then((r) => r.json())
    .catch(() => ({}));
  if (!c.clientId) return masquer();
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onerror = masquer;
  s.onload = () => {
    $('rp-google').style.display = 'flex';
    $('rp-google-ou').style.display = 'flex';
    google.accounts.id.initialize({
      client_id: c.clientId,
      hd: c.domaine,
      auto_select: true,
      ux_mode: 'popup',
      cancel_on_tap_outside: false,
      callback: async (rep) => {
        $('retour-connexion').innerHTML = '';
        const r = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'auth-google', credential: rep.credential }),
        })
          .then((x) => x.json())
          .catch(() => ({ ok: false, erreur: 'Connexion au serveur impossible.' }));
        if (r.ok && r.compte && ['admin', 'compta'].includes(r.compte.role)) return connecter(r.jeton);
        const msg = r.ok
          ? 'Ce compte a le rôle « Support SAV » : utilisez l’outil Support SAV (support.html).'
          : r.erreur || 'Connexion refusée.';
        $('retour-connexion').innerHTML = '<div class="msg msg-erreur">' + echapper(msg) + '</div>';
      },
    });
    google.accounts.id.renderButton($('rp-google'), {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      locale: 'fr',
      width: 280,
    });
    if (automatique) google.accounts.id.prompt();
  };
  document.head.appendChild(s);
}
$('mdp').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') connecter();
});

async function connecter(valeurForcee) {
  const mdp = (typeof valeurForcee === 'string' ? valeurForcee : $('mdp').value).trim();
  if (!mdp) return;
  $('btn-connexion').disabled = true;
  $('btn-connexion').textContent = 'Connexion…';
  $('retour-connexion').innerHTML = '';
  try {
    // Jeton de compte Google (j2) : on garde l'identité, validée par auth-moi (réservé aux admins).
    const estCompte = mdp.startsWith('j2.');
    let r = await jsonp(estCompte ? { action: 'auth-moi', password: mdp } : { action: 'login', password: mdp });
    if (estCompte && r && r.ok && (!r.compte || !['admin', 'compta'].includes(r.compte.role)))
      r = { ok: false, erreur: 'Ce compte a le rôle « Support SAV » : utilisez l’outil Support SAV (support.html).' };
    if (!r || !r.ok) {
      // Reconnexion silencieuse ratée (mot de passe changé entre-temps, session expirée...) :
      // le formulaire doit réapparaître avec l'erreur — sinon la page reste bloquée sur le
      // spinner de reconnexion, sans aucun moyen de ressaisir un mot de passe.
      document.documentElement.classList.remove('rp-reconnexion');
      try {
        sessionStorage.removeItem('cvdl-admin-jeton');
        sessionStorage.removeItem('cvdl-admin-password');
      } catch (e) {}
      // Message réel du serveur (mot de passe admin non configuré ou trop court, trop de tentatives…) :
      // « Mot de passe incorrect » seulement quand c'est vraiment le cas.
      const raison = r && r.erreur && !/mot de passe incorrect/i.test(r.erreur) ? r.erreur : 'Mot de passe incorrect.';
      $('retour-connexion').innerHTML = '<div class="msg msg-erreur">' + echapper(raison) + '</div>';
      $('btn-connexion').disabled = false;
      $('btn-connexion').textContent = 'Ouvrir le suivi';
      return;
    }
    // Jeton de session signé (12 h) : c'est lui qui est gardé et renvoyé, jamais le mot de passe.
    motDePasse = estCompte ? mdp : r.jeton || mdp;
    $('mdp').value = '';
    try {
      sessionStorage.removeItem('cvdl-admin-password');
      sessionStorage.setItem('cvdl-admin-jeton', motDePasse);
    } catch (e) {}
    state.role = estCompte ? r.compte.role : r.role || 'admin';
    state.compte = estCompte ? r.compte : null;
    // Connexion demandée depuis la page de pilotage (projet.html) : y retourner, en mode édition.
    if (new URLSearchParams(location.search).get('retour') === 'projet' && state.role === 'admin') {
      location.href = 'projet.html#edition';
      return;
    }
    // La fenêtre de connexion (et son flou) reste affichée pendant tout le chargement des
    // données — la masquer avant laissait voir l'appli vide un court instant.
    $('btn-connexion').textContent = 'Chargement des données…';
    await chargerTout();
    const snDepart = lireHash().sn;
    const ongletDepart = lireHash().onglet || (state.role !== 'admin' ? ONGLETS_COMPTA[0] : 'dashboard');
    state.activeTab =
      state.role === 'admin' || ONGLETS_COMPTA.includes(ongletDepart) ? ongletDepart : ONGLETS_COMPTA[0];
    history.replaceState({ onglet: state.activeTab }, '', '#' + state.activeTab);
    $('connexion').hidden = true;
    render();
    if (state.activeTab === 'passeport' && snDepart) rechercherPasseportMateriel(snDepart);
  } catch (e) {
    // Panne réseau pendant la reconnexion silencieuse : mot de passe gardé (rien ne prouve
    // qu'il soit invalide), mais le formulaire doit redevenir visible pour ne pas laisser
    // tourner le spinner indéfiniment — l'admin peut alors retenter (bouton "Ouvrir le suivi").
    document.documentElement.classList.remove('rp-reconnexion');
    $('retour-connexion').innerHTML =
      '<div class="msg msg-erreur">Connexion impossible. Vérifiez l\'URL du script.</div>';
    $('btn-connexion').disabled = false;
    $('btn-connexion').textContent = 'Ouvrir le suivi';
  }
}

async function chargerTout() {
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
    jsonp({ action: 'distributions', password: motDePasse }).catch(() => null),
  ]);
  if (rc && rc.ok) state.commandes = rc.commandes || [];
  if (rs && rs.ok) state.sav = rs.tickets || [];
  if (rss && rss.ok) state.statutsSav = rss.statuts || [];
  if (rst && rst.ok) state.structures = (rst.structures || []).slice().sort((a, b) => b.ligne - a.ligne);
  if (rd && rd.ok) state.devis = rd.devis || [];
  if (rf && rf.ok) state.factures = rf.factures || [];
  if (rp && rp.ok) state.produits = rp.produits || [];
  if (rr && rr.ok) state.reglages = rr;
  if (rdi && rdi.ok) {
    state.distributions = rdi.programmes || [];
    state.rattachements = rdi.rattachements || [];
  }
  if (!compta) {
    chargerDepotVente(); // non bloquant : alimente l'onglet Stock, les fiches et la cloche
    chargerModeStockBas(); // non bloquant : bouton / bandeau « Mode stock bas » de l'onglet Stock
  }
  if (typeof fin !== 'undefined') fin.d = null; // l'onglet Finances se recharge avec les nouvelles données
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
  { key: 'reglages', label: 'Réglages', ic: 'gear' },
];

/** Navigation entre onglets synchronisée avec l'historique du navigateur — bouton retour/
 *  avant du navigateur fonctionne comme changer d'onglet, sans recharger la page ni perdre
 *  les données déjà chargées. */
/** Onglet + paramètres lus dans l'ancre (#passeport?sn=XXX). */
function lireHash() {
  const [onglet, qs] = location.hash.slice(1).split('?');
  return { onglet: onglet || '', sn: new URLSearchParams(qs || '').get('sn') || '' };
}
function naviguerVersOnglet(cle, remplacer) {
  state.activeTab = cle;
  state.highlightRef = null;
  state.modal = null;
  const url = '#' + cle;
  if (remplacer) history.replaceState({ onglet: cle }, '', url);
  else history.pushState({ onglet: cle }, '', url);
  render();
}
window.addEventListener('popstate', (e) => {
  const cle = (e.state && e.state.onglet) || lireHash().onglet || 'dashboard';
  if (state.role === 'compta' && !ONGLETS_COMPTA.includes(cle)) return; // rôle Comptabilité : onglets financiers seulement
  if (NAV_DEFS.some((n) => n.key === cle) || cle === 'dashboard') {
    state.activeTab = cle;
    state.highlightRef = null;
    state.modal = null;
    render();
    const sn = lireHash().sn;
    if (cle === 'passeport' && sn && sn !== state.passeportRecherche) rechercherPasseportMateriel(sn, true);
  }
});
/* En-tête des onglets au format du kit : illustration au-dessus du titre (portail-ui.js). */
const ILLUSTRATION_ONGLET = {
  finance: 'tarifs',
  dashboard: 'tableau',
  commandes: 'commandes',
  sav: 'suiviSav',
  depannage: 'aide',
  retours: 'enquete',
  equipe: 'structure',
  factures: 'facture',
  stock: 'stock',
  passeport: 'passeport',
  structures: 'structures',
  distribution: 'distribution',
  calendrier: 'calendrier',
  bilan: 'stats',
  reglages: 'reglages',
};
/** Sur-titres des en-têtes de page (maquette admin : illustration + sur-titre + titre). */
const SURTITRE_ONGLET = {
  finance: 'Comptabilité',
  dashboard: 'Pilotage',
  commandes: 'Gestion',
  sav: 'Après-vente',
  depannage: 'Après-vente',
  retours: 'Utilisateurs',
  equipe: 'Accès',
  factures: 'Comptabilité',
  stock: 'Matériel',
  passeport: 'Traçabilité',
  structures: 'Partenaires',
  distribution: 'Pilotage',
  calendrier: 'Planning',
  bilan: 'Pilotage',
  stats: 'Pilotage',
  reglages: 'Plateforme',
};
function decorerEnTeteOnglet(main, onglet) {
  const h1 = main.querySelector('h1');
  if (
    !h1 ||
    h1.closest('.rp-titre-bloc') ||
    (h1.previousElementSibling && h1.previousElementSibling.classList.contains('rp-titre-ill'))
  )
    return;
  const ill = document.createElement('span');
  ill.className = 'ill xl rp-titre-ill';
  ill.dataset.ill = ILLUSTRATION_ONGLET[onglet] || 'tableau';
  // Style unifié : bloc « illustration à gauche + sur-titre + titre + sous-titre » (maquette).
  if (estUnifie()) {
    const sous = h1.nextElementSibling && h1.nextElementSibling.tagName === 'P' ? h1.nextElementSibling : null;
    const bloc = document.createElement('div');
    bloc.className = 'rp-titre-bloc';
    const txt = document.createElement('div');
    txt.className = 'rp-titre-txt';
    const sur = document.createElement('div');
    sur.className = 'rp-surtitre rp-titre-sur';
    sur.textContent = SURTITRE_ONGLET[onglet] || '';
    h1.before(bloc);
    bloc.append(ill, txt);
    if (sur.textContent) txt.append(sur);
    txt.append(h1);
    if (sous) txt.append(sous);
  } else {
    h1.parentNode.insertBefore(ill, h1);
  }
  if (window.portailIllustrations) window.portailIllustrations(ill.parentNode);
  if (NAV_DEFS.some((n) => n.key === onglet)) {
    ill.classList.remove('m', 't');
    ill.classList.add(teinteOnglet(onglet));
  }
}
/** Teinte de l'icône d'un onglet : turquoise / magenta en alternance dans l'ordre du menu. */
function teinteOnglet(cle) {
  const i = NAV_DEFS.findIndex((n) => n.key === cle);
  return i % 2 ? 'm' : 't';
}
let derniereCleModale = '';
let derniereCleVue = '';
function render() {
  const navsVisibles = state.role === 'admin' ? NAV_DEFS : NAV_DEFS.filter((n) => ONGLETS_COMPTA.includes(n.key));
  const nbUrgentes = commandesUrgentes().length;
  const nbSavOuverts = savOuvertsListe().length;
  $('rp-nav').innerHTML = navsVisibles
    .map(
      (n) => `
    <button type="button" class="${state.activeTab === n.key ? 'rp-actif' : ''}" data-nav="${n.key}" title="${echapper(n.label)}">
      ${icon(n.ic, 18)}<span class="rp-nav-ill" data-ill="${ILLUSTRATION_ONGLET[n.key] || 'tableau'}" style="display:none"></span><span class="rp-label">${echapper(n.label)}</span>
      ${n.key === 'commandes' && nbUrgentes ? `<span class="rp-pastille-nav">${nbUrgentes > 99 ? '99+' : nbUrgentes}</span>` : ''}
      ${n.key === 'sav' && nbSavOuverts ? `<span class="rp-pastille-nav">${nbSavOuverts > 99 ? '99+' : nbSavOuverts}</span>` : ''}
    </button>`,
    )
    .join('');
  // Icônes illustrées du menu (visibles seulement avec le style unifié, admin-unifie.css).
  if (window.portailIllustrations) window.portailIllustrations($('rp-nav'));
  // Alternance turquoise / magenta garantie dans le menu, quel que soit le dessin choisi pour
  // chaque onglet (les nouvelles icônes Distribution/Calendrier cassaient l'alternance).
  $('rp-nav')
    .querySelectorAll('[data-nav] .rp-nav-ill')
    .forEach((el) => {
      const t = teinteOnglet(el.closest('[data-nav]').dataset.nav);
      el.classList.remove('m', 't');
      el.classList.add(t);
    });
  if (state.role === 'admin' && $('rp-cloche-bouton')) rendreClocheNotifications();

  const main = $('rp-main');
  if (state.activeTab === 'dashboard') main.innerHTML = vueDashboard();
  else if (state.activeTab === 'commandes') main.innerHTML = vueCommandes();
  else if (state.activeTab === 'sav') main.innerHTML = vueSav();
  else if (state.activeTab === 'depannage') main.innerHTML = typeof vueDepannage === 'function' ? vueDepannage() : '';
  else if (state.activeTab === 'retours') main.innerHTML = typeof vueRetours === 'function' ? vueRetours() : '';
  else if (state.activeTab === 'equipe') main.innerHTML = typeof vueEquipe === 'function' ? vueEquipe() : '';
  else if (state.activeTab === 'factures') main.innerHTML = vueFactures();
  else if (state.activeTab === 'finance') main.innerHTML = typeof vueFinance === 'function' ? vueFinance() : '';
  else if (state.activeTab === 'stock') main.innerHTML = vueStock();
  else if (state.activeTab === 'passeport') main.innerHTML = vuePasseportMateriel();
  else if (state.activeTab === 'structures') main.innerHTML = vueStructures();
  else if (state.activeTab === 'bilan') main.innerHTML = vueBilan();
  else if (state.activeTab === 'distribution') main.innerHTML = vueDistribution();
  else if (state.activeTab === 'calendrier') main.innerHTML = vueCalendrierGlobal();
  else if (state.activeTab === 'reglages') main.innerHTML = vueReglages();
  decorerEnTeteOnglet(main, state.activeTab);
  if (state.activeTab === 'depannage' && typeof apresRenduDepannage === 'function') apresRenduDepannage();
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

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    state.notifOuverte = false;
    naviguerVersOnglet(nav.dataset.nav);
    if (nav.dataset.passeportSn) rechercherPasseportMateriel(nav.dataset.passeportSn);
    return;
  }

  const clocheBouton = e.target.closest('#rp-cloche-bouton');
  if (clocheBouton) {
    state.notifOuverte = !state.notifOuverte;
    render();
    return;
  }
  if (state.notifOuverte && !e.target.closest('#rp-cloche-panel') && !e.target.closest('#rp-cloche-bouton')) {
    state.notifOuverte = false;
    render();
  }

  const feedRow = e.target.closest('[data-feed-goto]');
  if (feedRow) {
    state.activeTab = feedRow.dataset.feedGoto;
    state.highlightRef = feedRow.dataset.highlightDoc || null;
    state.modal = null;
    state.notifOuverte = false;
    render();
    // Le clignotement ne doit jouer qu'une fois — sans ça, toute interaction ultérieure sur
    // l'onglet (recherche, etc.) déclenche un nouveau rendu qui le rejouerait indéfiniment.
    const ref = state.highlightRef;
    if (ref)
      setTimeout(() => {
        if (state.highlightRef === ref) {
          state.highlightRef = null;
          render();
        }
      }, 2400);
    return;
  }

  const kanbanCarte = e.target.closest('[data-commande-ouvrir]');
  if (kanbanCarte) {
    state.modal = {
      kind: 'commande',
      ref: kanbanCarte.dataset.commandeOuvrir,
      modalParent: modalParentPour('commande'),
    };
    state.etapeCommandeOuverte = null;
    state.notifOuverte = false;
    render();
    return;
  }
  const kanbanSav = e.target.closest('[data-sav-ouvrir]');
  if (kanbanSav) {
    state.modal = { kind: 'sav', ref: kanbanSav.dataset.savOuvrir, modalParent: modalParentPour('sav') };
    state.accordeonTerminalOuvert = false;
    state.notifOuverte = false;
    render();
    return;
  }
  const livrerProduit = e.target.closest('[data-livrer-produit]');
  if (livrerProduit) {
    state.modal = { kind: 'a-livrer', produit: livrerProduit.dataset.livrerProduit };
    render();
    return;
  }

  const modifierProduit = e.target.closest('[data-produit-modifier]');
  if (modifierProduit) {
    state.modal = { kind: 'creer-produit', ligne: parseInt(modifierProduit.dataset.produitModifier, 10) };
    render();
    return;
  }
  const supprimerProduit = e.target.closest('[data-supprimer-produit]');
  if (supprimerProduit) {
    if (
      await confirmerCvdl(
        `Supprimer le produit « ${supprimerProduit.dataset.nomProduit} » ? Il ne sera plus proposé, mais l'historique des commandes le mentionnant reste inchangé.`,
      )
    ) {
      supprimerProduitAction(parseInt(supprimerProduit.dataset.supprimerProduit, 10));
    }
    return;
  }
  const supprimerStructure = e.target.closest('[data-supprimer-structure]');
  if (supprimerStructure) {
    if (
      await confirmerCvdl(
        `Supprimer la structure « ${supprimerStructure.dataset.nomStructure} » ?\n\nSon code d'accès cessera de fonctionner, mais toutes les commandes, tickets SAV et documents déjà liés à cette structure sont conservés tels quels — rien n'est supprimé côté historique.`,
      )
    ) {
      supprimerStructureAction(parseInt(supprimerStructure.dataset.supprimerStructure, 10));
    }
    return;
  }

  const reveal = e.target.closest('[data-reveal-code]');
  if (reveal) {
    state.revealedCodes[reveal.dataset.revealCode] = !state.revealedCodes[reveal.dataset.revealCode];
    render();
    return;
  }
  const modifierStructure = e.target.closest('[data-structure-modifier]');
  if (modifierStructure) {
    state.modal = {
      kind: 'creer-structure',
      ligne: parseInt(modifierStructure.dataset.structureModifier, 10),
      modalParent: modalParentPour('creer-structure'),
    };
    render();
    return;
  }

  const ouvrirReglagesStatuts = e.target.closest('[data-ouvrir-reglages-statuts]');
  if (ouvrirReglagesStatuts) {
    state.modal = { kind: 'reglages-sav' };
    render();
    return;
  }
  const ouvrirModeleBon = e.target.closest('[data-ouvrir-modele-bon]');
  if (ouvrirModeleBon) {
    state.modal = { kind: 'modele-bon' };
    chargerInfoModeleBon();
    render();
    return;
  }
  const ouvrirModeleDevis = e.target.closest('[data-ouvrir-modele-devis]');
  if (ouvrirModeleDevis) {
    state.modal = { kind: 'modele-doc', type: 'devis' };
    chargerInfoModeleDoc('devis');
    render();
    return;
  }
  const ouvrirModeleFacture = e.target.closest('[data-ouvrir-modele-facture]');
  if (ouvrirModeleFacture) {
    state.modal = { kind: 'modele-doc', type: 'facture' };
    chargerInfoModeleDoc('facture');
    render();
    return;
  }
  const ouvrirModeleAttestation = e.target.closest('[data-ouvrir-modele-attestation]');
  if (ouvrirModeleAttestation) {
    state.modal = { kind: 'modele-attestation' };
    chargerInfoModeleAttestation();
    render();
    return;
  }
  const copierLien = e.target.closest('[data-copier-lien-portail]');
  if (copierLien) {
    copierLienPortail();
    return;
  }
  const copierJeton = e.target.closest('[data-copier-jeton]');
  if (copierJeton) {
    copierTexte(copierJeton.dataset.copierJeton, `${copierJeton.dataset.copierJeton} copié`);
    return;
  }
  const monter = e.target.closest('[data-statut-monter]');
  if (monter) {
    deplacerStatutSav(parseInt(monter.dataset.statutMonter, 10), 'haut');
    return;
  }
  const descendre = e.target.closest('[data-statut-descendre]');
  if (descendre) {
    deplacerStatutSav(parseInt(descendre.dataset.statutDescendre, 10), 'bas');
    return;
  }
  const supprimerStatut = e.target.closest('[data-statut-supprimer]');
  if (supprimerStatut) {
    supprimerStatutSav(parseInt(supprimerStatut.dataset.statutSupprimer, 10), supprimerStatut.dataset.statutNom);
    return;
  }
  const ajouterStatut = e.target.closest('[data-ajouter-statut]');
  if (ajouterStatut) {
    ajouterStatutSav();
    return;
  }

  const ouvrirCreationCommandeDepuisDevis = e.target.closest('[data-generer-commande-depuis-devis]');
  if (ouvrirCreationCommandeDepuisDevis) {
    state.modal = {
      kind: 'creer-commande',
      rattacherDevisLigne: parseInt(ouvrirCreationCommandeDepuisDevis.dataset.genererCommandeDepuisDevis, 10),
    };
    state.ncLignes = [];
    state.ncCode = '';
    render();
    return;
  }
  const ouvrirCreation = e.target.closest('[data-ouvrir-creation]');
  if (ouvrirCreation) {
    const kind = ouvrirCreation.dataset.ouvrirCreation;
    state.modal = { kind: 'creer-' + kind };
    if (kind === 'commande') {
      state.ncLignes = [];
      state.ncCode = '';
    }
    if (kind === 'devis') {
      state.ndLignes = [];
      state.ndStructureNom = '';
      state.ndEmail = '';
      state.ndAdresse = '';
      state.modal.libre = false;
    }
    render();
    return;
  }
  if (e.target.closest('[data-info-types-structure]')) {
    state.modal = { kind: 'info-types-structure', modalParent: state.modal };
    render();
    return;
  }
  if (e.target.closest('[data-organiser-materiel]')) {
    ouvrirOrganisationMateriel();
    return;
  }
  if (e.target.id === 'materiel-enregistrer') {
    enregistrerOrganisationMateriel();
    return;
  }
  const masquerMateriel = e.target.closest('[data-materiel-masquer]');
  if (masquerMateriel) {
    const p = state.produits.find((x) => x.ligne === parseInt(masquerMateriel.dataset.materielMasquer, 10));
    if (p) p.masqueCategorieMateriel = !p.masqueCategorieMateriel;
    render();
    return;
  }

  if (
    e.target.closest('[data-modal-fermer]') ||
    e.target.matches('.dialog-backdrop') ||
    e.target.matches('.rp-drawer-backdrop')
  ) {
    // Cas particulier de la modale "types de structure" (ouverte par-dessus la fiche
    // structure) : la refermer doit revenir à la modale d'origine, pas tout fermer d'un coup.
    state.modal = (state.modal && state.modal.modalParent) || null;
    state.ncLignes = [];
    state.ndLignes = [];
    render();
    return;
  }

  // Capture les champs texte du devis libre AVANT tout re-rendu déclenché par cette même
  // modale (ajout/retrait de ligne) — sinon ils repartaient à vide à chaque fois, puisque leur
  // contenu ne vivait que dans le DOM, jamais dans state (voir ndStructureNom et consorts).
  if (state.modal && state.modal.kind === 'devis' && state.modal.libre && $('cdl-structure')) {
    state.ndStructureNom = $('cdl-structure').value;
    state.ndEmail = $('cdl-email').value;
    state.ndAdresse = $('cdl-adresse').value;
  }
  if (e.target.closest('[data-nd-ajouter-ligne]')) {
    const select = $('nd-produit-select');
    const produit = select.value;
    const quantite = parseInt($('nd-produit-qte').value, 10) || 1;
    const option = select.selectedOptions[0];
    const prixUnitaire = option ? parseFloat(option.dataset.prix) || 0 : 0;
    if (produit) {
      state.ndLignes.push({ produit, quantite, prixUnitaire });
      render();
    }
    return;
  }
  const ndRetirerLigne = e.target.closest('[data-nd-retirer-ligne]');
  if (ndRetirerLigne) {
    state.ndLignes.splice(parseInt(ndRetirerLigne.dataset.ndRetirerLigne, 10), 1);
    render();
    return;
  }

  if (e.target.closest('[data-nc-ajouter-ligne]')) {
    const produit = $('nc-produit-select').value;
    const quantite = parseInt($('nc-produit-qte').value, 10) || 1;
    if (produit) {
      state.ncLignes.push({ produit, quantite });
      render();
    }
    return;
  }
  const retirerLigne = e.target.closest('[data-nc-retirer-ligne]');
  if (retirerLigne) {
    state.ncLignes.splice(parseInt(retirerLigne.dataset.ncRetirerLigne, 10), 1);
    render();
    return;
  }

  const etape = e.target.closest('[data-changer-statut]');
  if (etape && !etape.disabled) {
    changerStatutCommande(etape.dataset.ref, etape.dataset.changerStatut);
    return;
  }
  const marquerLivree = e.target.closest('[data-marquer-livree]');
  if (marquerLivree) {
    marquerCommandeLivree(marquerLivree.dataset.marquerLivree);
    return;
  }

  const demandeValidation = e.target.closest('[data-demander-validation]');
  if (demandeValidation) {
    demanderValidationCommande(demandeValidation.dataset.demanderValidation);
    return;
  }
  const renvoiValidation = e.target.closest('[data-renvoyer-validation]');
  if (renvoiValidation) {
    demanderValidationCommande(renvoiValidation.dataset.renvoyerValidation);
    return;
  }
  const enregSeries = e.target.closest('[data-confirmer-series]');
  if (enregSeries) {
    confirmerSeriesCommande(enregSeries.dataset.confirmerSeries);
    return;
  }
  const modifierSeries = e.target.closest('[data-modifier-series]');
  if (modifierSeries) {
    const c = state.commandes.find((x) => x.reference === modifierSeries.dataset.modifierSeries);
    if (c) {
      (state.confirmSubEtapes[c.ligne] ||= {}).series = false;
      render();
    }
    return;
  }
  const confirmColissimo = e.target.closest('[data-confirmer-colissimo]');
  if (confirmColissimo) {
    confirmerColissimoPreparation(confirmColissimo.dataset.confirmerColissimo);
    return;
  }
  const modifierColissimo = e.target.closest('[data-modifier-colissimo]');
  if (modifierColissimo) {
    const c = state.commandes.find((x) => x.reference === modifierColissimo.dataset.modifierColissimo);
    if (c) {
      (state.confirmSubEtapes[c.ligne] ||= {}).colissimo = false;
      render();
    }
    return;
  }
  const enregEmailAdmin = e.target.closest('[data-enregistrer-email-admin]');
  if (enregEmailAdmin) {
    const valeur = ($('rg-email-admin').value || '').trim();
    if (valeur && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur)) {
      $('rg-secours-retour').innerHTML = '<div class="msg msg-erreur">Adresse e-mail invalide.</div>';
      return;
    }
    posterEtat({ action: 'reglages-set', emailAdmin: valeur }, 'Enregistrement…', 'Adresse enregistrée').then((r) => {
      if (r && r.ok) {
        state.reglages = Object.assign({}, state.reglages, { emailAdmin: valeur });
        render();
      }
    });
    return;
  }
  const testerAlertes = e.target.closest('[data-tester-alertes]');
  if (testerAlertes) {
    testerAlertes.disabled = true;
    posterEtat({ action: 'reglages-tester-alertes' }, 'Envoi…', 'E-mail de test envoyé').then((r) => {
      const z = $('rg-secours-retour');
      if (!z) return;
      z.innerHTML =
        r && r.ok
          ? `<div class="msg msg-succes">E-mail envoyé à ${echapper(r.destinataire)} — vérifiez la boîte de réception (et les indésirables).</div>`
          : `<div class="msg msg-erreur">${echapper((r && r.erreur) || 'Envoi impossible')}</div>`;
      testerAlertes.disabled = false;
    });
    return;
  }
  const genDevis = e.target.closest('[data-generer-devis]');
  if (genDevis) {
    genererDocumentCommande(genDevis.dataset.genererDevis, 'devis');
    return;
  }
  const genFactureLivree = e.target.closest('[data-generer-facture-livree]');
  if (genFactureLivree) {
    genererFactureDepuisLivree(genFactureLivree.dataset.genererFactureLivree);
    return;
  }
  const enregLienPaiement = e.target.closest('[data-enregistrer-lien-paiement]');
  if (enregLienPaiement) {
    enregistrerLienPaiement(enregLienPaiement.dataset.enregistrerLienPaiement);
    return;
  }
  const enregLiensPaiementPersonnes = e.target.closest('[data-enregistrer-liens-paiement-personnes]');
  if (enregLiensPaiementPersonnes) {
    enregistrerLiensPaiementPersonnes(enregLiensPaiementPersonnes.dataset.enregistrerLiensPaiementPersonnes);
    return;
  }
  const choixMode = e.target.closest('[data-choisir-mode-livraison]');
  if (choixMode) {
    state.etRouvrirMode = null;
    choisirModeLivraison(choixMode.dataset.ref, choixMode.dataset.choisirModeLivraison);
    return;
  }
  const enregColissimo = e.target.closest('[data-enregistrer-colissimo]');
  if (enregColissimo) {
    enregistrerColissimoCommande(enregColissimo.dataset.enregistrerColissimo);
    return;
  }
  const validerPrep = e.target.closest('[data-valider-preparation]');
  if (validerPrep && !validerPrep.disabled) {
    if (
      await confirmerCvdl(
        'Passer la commande « En livraison » ?\n\nLa structure voit alors le mode de livraison et le suivi dans son espace. Cette étape ne peut pas être annulée ensuite.',
      )
    ) {
      validerPreparationCommande(validerPrep.dataset.validerPreparation, validerPrep);
    }
    return;
  }
  const enregDateLivraison = e.target.closest('[data-enregistrer-date-livraison]');
  if (enregDateLivraison) {
    enregistrerDateLivraisonCommande(enregDateLivraison.dataset.enregistrerDateLivraison);
    return;
  }
  const enregDateCible = e.target.closest('[data-enregistrer-date-cible]');
  if (enregDateCible) {
    enregistrerDateCibleCommande(enregDateCible.dataset.enregistrerDateCible);
    return;
  }
  const annuler = e.target.closest('[data-annuler-commande]');
  if (annuler) {
    annulerCommande(annuler.dataset.annulerCommande);
    return;
  }
  const toggleEtapePassee = e.target.closest('[data-toggle-etape-passee]');
  if (toggleEtapePassee) {
    const s = toggleEtapePassee.dataset.toggleEtapePassee;
    state.ongletCommande = 'faire';
    state.etapeCommandeOuverte = state.etapeCommandeOuverte === s ? null : s;
    render();
    return;
  }
  const toggleEtapeCourante = e.target.closest('[data-toggle-etape-courante]');
  if (toggleEtapeCourante) {
    const s = toggleEtapeCourante.dataset.toggleEtapeCourante;
    state.etapeCommandeOuverte = state.etapeCommandeOuverte === 'replier:' + s ? null : 'replier:' + s;
    render();
    return;
  }
  const toggleDevisPaiement = e.target.closest('[data-toggle-devis-paiement]');
  if (toggleDevisPaiement) {
    state.etapeCommandeOuverte = state.etapeCommandeOuverte === 'devis-paiement' ? null : 'devis-paiement';
    render();
    return;
  }
  const corrigerSeries = e.target.closest('[data-corriger-series]');
  if (corrigerSeries) {
    corrigerSeriesCommande(corrigerSeries.dataset.corrigerSeries);
    return;
  }
  const corrigerColissimo = e.target.closest('[data-corriger-colissimo]');
  if (corrigerColissimo) {
    corrigerColissimoCommande(corrigerColissimo.dataset.corrigerColissimo);
    return;
  }

  const etapeSav = e.target.closest('[data-changer-statut-sav]');
  if (etapeSav && !etapeSav.dataset.verrou) {
    changerStatutSav(etapeSav.dataset.ref, etapeSav.dataset.changerStatutSav);
    return;
  }
  const etapeSavTerminal = e.target.closest('[data-changer-statut-sav-terminal]');
  if (etapeSavTerminal) {
    const statut = etapeSavTerminal.dataset.changerStatutSavTerminal;
    const raison = await demanderCvdl(
      `Clôturer ce dossier avec le statut « ${statut} » ? Cette action est définitive.\n\nMotif (visible par la structure/la personne accompagnée dans son suivi) :`,
    );
    if (raison === null) return; // annulé
    if (!raison.trim()) {
      etat('Un motif est obligatoire pour clôturer le dossier.', 'erreur');
      return;
    }
    clotureSavAvecMotif(etapeSavTerminal.dataset.ref, statut, raison.trim());
    return;
  }
  const annulSav = e.target.closest('[data-annuler-sav]');
  if (annulSav) {
    annulerSav(annulSav.dataset.annulerSav);
    return;
  }
  const toggleAccTerminal = e.target.closest('[data-toggle-accordeon-terminal]');
  if (toggleAccTerminal) {
    state.accordeonTerminalOuvert = !state.accordeonTerminalOuvert;
    render();
    return;
  }
  const ongletCmd = e.target.closest('[data-onglet-commande]');
  if (ongletCmd) {
    state.ongletCommande = ongletCmd.dataset.ongletCommande;
    state.etapeCommandeOuverte = null;
    render();
    return;
  }
  const vueCommandesToggle = e.target.closest('[data-commandes-vue]');
  if (vueCommandesToggle) {
    state.commandesVue = vueCommandesToggle.dataset.commandesVue;
    state.commandesPage = 0;
    render();
    return;
  }
  const vueDocsToggle = e.target.closest('[data-docs-vue]');
  if (vueDocsToggle) {
    state.docsVue = vueDocsToggle.dataset.docsVue;
    render();
    return;
  }
  const toggleDevisLibre = e.target.closest('[data-toggle-devis-libre]');
  if (toggleDevisLibre) {
    state.modal.libre = toggleDevisLibre.dataset.toggleDevisLibre === '1';
    render();
    return;
  }
  const filtrerDocs = e.target.closest('[data-filtrer-docs]');
  if (filtrerDocs) {
    state.docsFiltre = filtrerDocs.dataset.filtrerDocs;
    render();
    return;
  }
  const annulerDevis = e.target.closest('[data-annuler-devis]');
  if (annulerDevis) {
    const motif = await demanderCvdl(
      `Annuler le devis « ${annulerDevis.dataset.refDevis} » ? Cette action est irréversible.\n\nMotif (interne, non visible par la structure) :`,
    );
    if (motif !== null && motif.trim())
      annulerDocumentAction('devis', parseInt(annulerDevis.dataset.annulerDevis, 10), motif.trim());
    return;
  }
  const annulerFacture = e.target.closest('[data-annuler-facture]');
  if (annulerFacture) {
    const motif = await demanderCvdl(
      `Annuler la facture « ${annulerFacture.dataset.refFacture} » ? Cette action est irréversible.\n\nMotif (interne, non visible par la structure) :`,
    );
    if (motif !== null && motif.trim())
      annulerDocumentAction('facture', parseInt(annulerFacture.dataset.annulerFacture, 10), motif.trim());
    return;
  }
  const docOuvrir = e.target.closest('[data-doc-ouvrir]');
  if (docOuvrir) {
    const [type, ref] = docOuvrir.dataset.docOuvrir.split(':');
    state.modal = { kind: 'document-genere', type, ref };
    state.documentGenere = { type, ref, chargement: false, url: null, erreur: null };
    render();
    return;
  }
  if (e.target.closest('[data-doc-generer]')) {
    genererDocumentPdf();
    return;
  }
  if (e.target.closest('[data-doc-envoyer]')) {
    envoyerDocumentGenere();
    return;
  }
  if (e.target.closest('[data-toggle-envoi-doc]')) {
    if (state.documentGenere) state.documentGenere.envoiOuvert = !state.documentGenere.envoiOuvert;
    render();
    return;
  }
  const ouvrirDocGenere = e.target.closest('[data-ouvrir-doc-genere]');
  if (ouvrirDocGenere) {
    ouvrirDocumentGenere(ouvrirDocGenere.dataset.ouvrirDocGenere);
    return;
  }
  const filtrerStatutCommande = e.target.closest('[data-filtrer-statut-commande]');
  if (filtrerStatutCommande) {
    state.commandesFiltreStatut = filtrerStatutCommande.dataset.filtrerStatutCommande;
    state.commandesPage = 0;
    render();
    return;
  }
  const filtrerTypeCommande = e.target.closest('[data-filtrer-type-commande]');
  if (filtrerTypeCommande) {
    state.commandesFiltreType = filtrerTypeCommande.dataset.filtrerTypeCommande;
    state.commandesPage = 0;
    render();
    return;
  }
  const filtrerStatutSav = e.target.closest('[data-filtrer-statut-sav]');
  if (filtrerStatutSav) {
    state.savFiltreStatut = filtrerStatutSav.dataset.filtrerStatutSav;
    render();
    return;
  }
  const savVue = e.target.closest('[data-sav-vue]');
  if (savVue) {
    state.savVue = savVue.dataset.savVue;
    render();
    return;
  }
  const calendrierMois = e.target.closest('[data-calendrier-mois]');
  if (calendrierMois) {
    state.calendrierDecalageMois += parseInt(calendrierMois.dataset.calendrierMois, 10);
    render();
    return;
  }
  if (e.target.closest('[data-calendrier-aujourdhui]')) {
    const a = new Date();
    state.calendrierDecalageMois = 0;
    state.calendrierJourChoisi = `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')}`;
    render();
    return;
  }
  const calendrierJour = e.target.closest('[data-calendrier-jour]');
  if (calendrierJour) {
    state.calendrierJourChoisi = calendrierJour.dataset.calendrierJour;
    render();
    return;
  }
  if (e.target.closest('#rp-toggle-theme')) {
    basculerTheme();
    return;
  }
  if (e.target.closest('#rp-toggle-style')) {
    basculerStyle();
    return;
  }
  if (e.target.closest('#rp-toggle-largeur')) {
    basculerLargeur();
    return;
  }
  const pageCommandes = e.target.closest('[data-page-commandes]');
  if (pageCommandes && !pageCommandes.disabled) {
    state.commandesPage = parseInt(pageCommandes.dataset.pageCommandes, 10);
    render();
    return;
  }

  const ouvrirRappro = e.target.closest('[data-ouvrir-rapprochement]');
  if (ouvrirRappro) {
    state.modal = { kind: 'rapprochement', refFacture: ouvrirRappro.dataset.ouvrirRapprochement };
    render();
    return;
  }
  const ouvrirRattachement = e.target.closest('[data-rattacher-devis]');
  if (ouvrirRattachement) {
    state.modal = { kind: 'rattacher-devis', ligneDevis: parseInt(ouvrirRattachement.dataset.rattacherDevis, 10) };
    render();
    return;
  }
  const kpiListing = e.target.closest('[data-kpi-listing]');
  if (kpiListing) {
    state.modal = { kind: 'kpi-listing', quoi: kpiListing.dataset.kpiListing };
    render();
    return;
  }
  const viderRecherche = e.target.closest('[data-vider-recherche]');
  if (viderRecherche) {
    const cle = CHAMPS_RECHERCHE[viderRecherche.dataset.viderRecherche];
    if (cle) {
      state[cle] = '';
      if (cle === 'commandeSearch') state.commandesPage = 0;
      render();
    }
    return;
  }
  const genererCode = e.target.closest('[data-generer-code-structure]');
  if (genererCode) {
    if (state.modal && state.modal.kind === 'creer-structure' && state.modal.v) {
      state.modal.v.code = genererCodeStructure();
      state.modal.v.codeMode = 'generer';
      render();
    }
    return;
  }
  const regenererCode = e.target.closest('[data-regenerer-code-structure]');
  if (regenererCode) {
    if (
      !(await confirmerCvdl(
        "Régénérer le code de cette structure ? L'ancien code cessera de fonctionner immédiatement (liens déjà partagés, portail, suivi de commande...).",
      ))
    )
      return;
    (async () => {
      const ligne = parseInt(regenererCode.dataset.regenererCodeStructure, 10);
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const groupe = () =>
        Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const nouveauCode = `${groupe()}-${groupe()}-${groupe()}-${groupe()}`;
      regenererCode.disabled = true;
      try {
        const r = await poster({
          action: 'structure-update',
          ligne,
          champ: 'code',
          valeur: nouveauCode,
          password: motDePasse,
        });
        if (r.ok) {
          const st = state.structures.find((x) => x.ligne === ligne);
          if (st) st.code = nouveauCode;
          etat('Code régénéré', 'succes');
          render();
        } else {
          etat(r.erreur || 'Régénération impossible', 'erreur');
          regenererCode.disabled = false;
        }
      } catch (err) {
        etat('Régénération impossible', 'erreur');
        regenererCode.disabled = false;
      }
    })();
    return;
  }
});
// Recherche : on ne re-rend qu'après une courte pause de frappe (pas à chaque lettre), et on
// restaure le focus + la position du curseur ensuite — sinon le re-rendu complet du HTML
// recrée le champ et fait perdre le focus à chaque caractère tapé.
