(function () {
  const PROD = 'https://europe-west1-cvdl-plateforme.cloudfunctions.net/cvdl-api';
  const API_DEMO = PROD + '-demo';
  const DUREE = 8 * 3600 * 1000;
  const CLES_SESSION = [
    'cvdl-admin-jeton',
    'cvdl-admin-password',
    'cvdl-code-structure',
    'cvdl-support-jeton',
    'cvdl-support-compte',
    'cvdl-portail-google-off',
    'cvdl-passeport-admin',
    'cvdl-embarquement-session',
    'cvdl-numero-serie-sav',
    'cvdl-numero-serie-suivi',
  ];
  const $ = (id) => document.getElementById(id);
  const echapper = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const viderSession = () =>
    CLES_SESSION.forEach((k) => {
      try {
        sessionStorage.removeItem(k);
      } catch (e) {}
    });
  // Clé d'accès équipe (lien ?cle=…) : mémorisée dans ce navigateur, retirée de l'adresse.
  const lireCle = () => {
    try {
      return localStorage.getItem('cvdl-demo-cle') || '';
    } catch (e) {
      return '';
    }
  };
  const appel = (donnees) =>
    fetch(API_DEMO, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ cle: lireCle() }, donnees)),
    }).then((r) => r.json());
  const message = (texte, type) => {
    $('msg').innerHTML = texte ? `<div class="msg msg-${type || 'erreur'}">${echapper(texte)}</div>` : '';
  };
  const illustrer = (el) => {
    if (window.portailIllustrations) window.portailIllustrations(el);
  };

  // Site de démo dédié (dossier « …demo… ») : on y reste, pas de « Quitter ».
  const dossier = location.pathname.split('/')[1] || '';
  const siteDemo = /demo/i.test(dossier) && !/\.html$/i.test(dossier);
  if (siteDemo) {
    $('btn-quitter').hidden = true;
    $('sep-quitter').hidden = true;
  }
  if (new URLSearchParams(location.search).get('quitter') && !siteDemo) {
    try {
      localStorage.removeItem('cvdl-mode-demo');
    } catch (e) {}
    viderSession();
    location.replace('portail.html');
    return;
  }
  // Les structures entrent par un code d'essai (accueil.html, « Essayer la plateforme ») : un
  // ancien lien ?vue=… y renvoie. L'équipe garde ?cle=… / ?pour=equipe.
  {
    const p = new URLSearchParams(location.search);
    if (p.get('vue') && !p.get('cle') && p.get('pour') !== 'equipe') {
      location.replace('accueil.html#essayer');
      return;
    }
  }
  // Toutes les pages du site parlent à la fonction de démo tant que ce repère est valable (8 h).
  try {
    localStorage.setItem('cvdl-mode-demo', JSON.stringify({ jusqua: Date.now() + DUREE }));
  } catch (e) {
    message('Le stockage du navigateur est bloqué : impossible d’activer le mode démo (navigation privée stricte ?).');
  }

  /* Démo présentée aux structures (lien ?pour=structures, mémorisé pour « Changer de profil ») :
     seulement les vues structure du lancement, sur l'Association Le Tremplin. */
  const params = new URLSearchParams(location.search);
  // Code d'essai d'une structure (posé par accueil.html) : la démo reste sur cette vue, sans
  // changement de profil, pour l'onglet ; ?cle=… ou ?pour=equipe le lève.
  let vueVerrouillee = '';
  try {
    if (params.get('cle') || params.get('pour') === 'equipe') sessionStorage.removeItem('cvdl-demo-vue');
    vueVerrouillee = sessionStorage.getItem('cvdl-demo-vue') || '';
  } catch (e) {}
  // Code d'essai (accueil.html) : entrée directe dans l'espace de la structure (sa présentation
  // de bienvenue s'ouvre alors), derrière un écran de préparation — la démo peut mettre un
  // moment à démarrer quand personne ne l'a ouverte depuis un moment.
  let prep = null;
  try {
    if (vueVerrouillee && sessionStorage.getItem('cvdl-demo-auto') === '1') prep = preparation();
    sessionStorage.removeItem('cvdl-demo-auto');
  } catch (e) {}
  if (vueVerrouillee) {
    $('btn-quitter').hidden = true;
    $('sep-quitter').hidden = true;
  }
  if (params.get('cle')) {
    try {
      localStorage.setItem('cvdl-demo-cle', params.get('cle'));
    } catch (e) {}
    params.delete('cle');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
  }
  if (params.get('pour')) {
    try {
      if (params.get('pour') === 'structures') localStorage.setItem('cvdl-demo-pour', 'structures');
      else localStorage.removeItem('cvdl-demo-pour');
    } catch (e) {}
  }
  let pourStructures = !!vueVerrouillee || params.get('pour') === 'structures';
  try {
    pourStructures = pourStructures || (!params.get('pour') && localStorage.getItem('cvdl-demo-pour') === 'structures');
  } catch (e) {}

  /** Écran « Préparation de votre démo » : étapes, barre et messages selon l'attente. */
  function preparation() {
    const ecran = $('demo-prep');
    ecran.hidden = false;
    illustrer(ecran);
    const minuteurs = [];
    const etape = (n) => {
      ecran.querySelectorAll('[data-etape]').forEach((li) => {
        const k = Number(li.dataset.etape);
        li.className = k < n ? 'fait' : k === n ? 'en-cours' : '';
      });
      ecran.querySelector('.demo-prep-barre i').style.width = `${[30, 60, 92][n]}%`;
    };
    const note = (t) => ($('demo-prep-note').textContent = t);
    etape(0);
    minuteurs.push(setTimeout(() => etape(1), 2500));
    minuteurs.push(
      setTimeout(
        () => note('La démo démarre : la première ouverture de la journée peut prendre jusqu’à une minute.'),
        6000,
      ),
    );
    minuteurs.push(setTimeout(() => note('Presque prêt, merci de patienter…'), 30000));
    return {
      ouvrir() {
        minuteurs.forEach(clearTimeout);
        etape(2);
        note('Votre espace s’ouvre…');
      },
      arreter() {
        minuteurs.forEach(clearTimeout);
        ecran.hidden = true;
      },
    };
  }

  /* ── Les vues proposées ──
     profil : action demo-connexion ; type : structure d'exemple choisie dans la liste du serveur. */
  const VUES = [
    {
      groupe: 'Équipe CVDL',
      id: 'admin',
      profil: 'admin',
      ill: 'tableau',
      titre: 'Administration',
      role: 'Chargé·e de distribution',
      texte:
        'Le poste de pilotage : toutes les commandes, de la réception à la livraison, les structures, le stock, les programmes de distribution et les statistiques.',
      points: [
        'Valider, préparer et livrer une commande',
        'Suivre un programme de distribution et son financeur',
        'Ouvrir la fiche 360° d’une structure',
      ],
    },
    {
      groupe: 'Équipe CVDL',
      id: 'compta',
      profil: 'compta',
      ill: 'tarifs',
      titre: 'Finances',
      role: 'Comptabilité',
      texte: 'Facturé, encaissé, impayés par ancienneté et par territoire, relances par e-mail, devis et factures.',
      points: [
        'Filtrer par territoire ou type de structure',
        'Relancer une facture en retard',
        'Exporter les factures en CSV',
      ],
    },
    {
      groupe: 'Équipe CVDL',
      id: 'support',
      profil: 'support',
      ill: 'suiviSav',
      titre: 'Gestion SAV',
      role: 'Chargé·e de logistique',
      texte:
        'Les demandes de réparation : diagnostic, statuts, échanges avec les structures et les personnes, bons de retour.',
      points: ['Répondre dans le fil d’un SAV', 'Faire avancer un ticket', 'Demander une adresse de retour'],
    },
    {
      groupe: 'Structures',
      id: 'interne',
      type: 'interne',
      code: 'ECCHER26',
      ill: 'structure',
      titre: 'Structure Interne',
      role: 'Responsable de territoire',
      texte:
        'Un territoire Emmaüs Connect : sa flotte, son équipe, ses structures partenaires et leurs commandes, ses projets de distribution.',
      points: [
        'Attribuer des appareils à un partenaire',
        'Rattacher des remises à un projet',
        'Gérer l’équipe (accès Google)',
      ],
    },
    {
      groupe: 'Structures',
      id: 'conseiller',
      profil: 'conseiller',
      ill: 'personne',
      titre: 'Structure Interne',
      role: 'Conseiller·ère numérique',
      texte:
        'Un membre de l’équipe d’une Interne : il remet le matériel et édite les attestations ; le reste est réservé au responsable.',
      points: ['Remettre un appareil à une personne', 'Éditer une attestation', 'Consulter les projets'],
    },
    {
      groupe: 'Structures',
      id: 'esn',
      type: 'esn',
      code: 'ESNRN26',
      ill: 'flotte',
      titre: 'Structure ESN',
      role: 'Responsable ESN',
      texte: 'Un reconditionneur partenaire : commandes en volume, sans paiement, flotte suivie dans la plateforme.',
      points: ['Commander en volume', 'Suivre sa flotte', 'Déclarer une panne'],
    },
    {
      groupe: 'Structures',
      id: 'projets',
      type: 'projets',
      code: 'PSC18',
      ill: 'distribution',
      titre: 'Structure Projets',
      role: 'Grande distribution',
      texte:
        'Un projet financé : grosses commandes avec devis et factures, prix masqués, flotte centralisée dans la plateforme.',
      points: ['Commander pour un projet', 'Suivre devis et factures', 'Consulter le rapport d’impact'],
    },
    {
      groupe: 'Structures',
      id: 'bo',
      type: 'bo',
      code: 'BOVIER26',
      ill: 'partenairesCmd',
      titre: 'Vente solidaire',
      role: 'Structure partenaire d’une Interne',
      texte:
        'Une association partenaire d’une Interne : elle commande pour des personnes nommées, paie sur place, et l’Interne valide.',
      points: ['Commander pour une personne', 'Suivre la validation par l’Interne', 'Voir les appareils attribués'],
    },
    {
      groupe: 'Structures',
      id: 'rn',
      type: 'rn',
      code: 'MLCHER26',
      ill: 'commander',
      titre: 'Relais Numérique',
      role: 'Mission Locale, CCAS…',
      texte:
        'Une structure qui achète au tarif solidaire : virement, devis et factures, tarif de convention, flotte suivie dans la plateforme.',
      points: ['Passer une commande au tarif négocié', 'Suivre sa livraison', 'Déclarer une panne'],
    },
    {
      groupe: 'Structures',
      id: 'depot',
      type: 'depot',
      code: 'DVTRAME26',
      ill: 'stock',
      titre: 'Dépôt-vente',
      role: 'Ressourcerie',
      texte: 'Du matériel confié en dépôt : la structure déclare ses ventes, chaque vente est facturée.',
      points: ['Déclarer une vente', 'Voir le stock restant'],
    },
    {
      groupe: 'Public',
      id: 'personne',
      lien: 'portail-beneficiaire.html',
      ill: 'panne',
      titre: 'Personne accompagnée',
      role: 'Sans code',
      texte: 'Une personne qui a reçu un appareil : dépannage guidé, déclaration de panne, suivi de sa réparation.',
      points: [],
    },
  ];
  // Résumé court affiché dans les cartes de la modale (le texte complet reste dans la fiche).
  const RESUMES = {
    admin: 'Toutes les commandes, les structures, le stock et les statistiques.',
    compta: 'Facturé, encaissé, impayés, relances.',
    support: 'Diagnostics, statuts, échanges, bons de retour.',
    interne: 'Flotte, équipe, partenaires et projets.',
    conseiller: 'Remettre du matériel, éditer une attestation.',
    esn: 'Commandes en volume, flotte suivie.',
    projets: 'Commandes financées, devis, impact.',
    bo: 'Commander pour une personne, validation par l’Interne.',
    rn: 'Tarif de convention, devis et factures.',
    depot: 'Déclarer ses ventes, voir son stock.',
    personne: 'Dépannage guidé et suivi de réparation.',
  };
  let profils = {};
  let choisie = null;

  function libelleVue(v) {
    return `<b>${echapper(v.titre)}</b><span>${echapper(v.role)}</span>`;
  }

  function construireListe() {
    let groupe = '';
    let html = '';
    VUES.forEach((v, i) => {
      if (v.groupe !== groupe) {
        html += `${groupe ? '</div>' : ''}<div class="demo-groupe" id="grp-${i}">${echapper((groupe = v.groupe))}</div><div class="demo-cartes" role="group" aria-labelledby="grp-${i}">`;
      }
      html += `<button type="button" class="demo-carte" data-i="${i}" aria-pressed="${choisie === v}">
        <span class="ill" data-ill="${v.ill}"></span><b>${echapper(v.titre)}</b><small>${echapper(v.role)}</small>
        <p>${echapper(RESUMES[v.id] || v.texte)}</p></button>`;
    });
    $('liste').innerHTML = html + '</div>';
    if ($('choix-nombre'))
      $('choix-nombre').textContent = `Équipe CVDL, structures, personne accompagnée : ${VUES.length} points de vue`;
    illustrer($('liste'));
  }

  // Modale des vues : Échap, clic sur le fond ou ✕ la ferment ; flèches pour passer d'une carte à l'autre.
  function ouvrir(o) {
    $('voile-vues').hidden = !o;
    $('bouton-choix').setAttribute('aria-expanded', String(o));
    document.body.style.overflow = o ? 'hidden' : '';
    if (o) {
      const c = $('liste').querySelector('[aria-pressed="true"]') || $('liste').querySelector('.demo-carte');
      if (c) c.focus();
    } else $('bouton-choix').focus();
  }

  function structurePour(v) {
    if (v.type === 'interne' && profils.interne) return { code: profils.interne.code, nom: profils.interne.nom }; // Interne avec équipe (Cher)
    const liste = profils.structures || [];
    const trouvee =
      liste.find((s) => s.code === v.code) ||
      (v.type === 'depot' ? liste.find((s) => s.depotVente) : liste.find((s) => s.type === v.type && !s.depotVente));
    return trouvee || (v.code ? { code: v.code, nom: '' } : null);
  }

  /** Deuxième modale : la vue choisie, à confirmer (« Entrer dans la démo ») ou à changer. */
  function ouvrirFiche(o) {
    $('voile-fiche').hidden = !o;
    document.body.style.overflow = o ? 'hidden' : '';
    if (o) $('btn-entrer').focus();
  }

  function choisir(i, confirmer = true) {
    if (!VUES.at(i)) return;
    choisie = VUES.at(i);
    $('voile-vues').hidden = true;
    $('bouton-choix').setAttribute('aria-expanded', 'false');
    $('choix').classList.add('choisi');
    $('choix-go').firstChild.textContent = 'Changer ';
    const ill = document.createElement('span'); // nouvel élément : l'illustration se dessine une seule fois par élément
    ill.className = 'ill';
    ill.id = 'choix-ill';
    ill.dataset.ill = choisie.ill;
    $('choix-ill').replaceWith(ill);
    illustrer($('bouton-choix'));
    $('choix-txt').innerHTML = libelleVue(choisie);
    construireListe();
    const v = choisie;
    let detail = '';
    if (v.id === 'admin' && profils.admin && profils.admin.nom) detail = `Vous êtes ${profils.admin.nom}.`;
    if (v.id === 'compta' && profils.compta && profils.compta.nom) detail = `Vous êtes ${profils.compta.nom}.`;
    if (v.id === 'support' && profils.support && profils.support.nom) detail = `Vous êtes ${profils.support.nom}.`;
    if (v.id === 'interne' && profils.interne)
      detail = `${profils.interne.nom} — vous êtes ${profils.interne.responsable}.`;
    if (v.id === 'conseiller' && profils.conseiller)
      detail = `${profils.conseiller.nom} — vous êtes ${profils.conseiller.personne}.`;
    if (v.type && v.type !== 'interne') {
      const s = structurePour(v);
      if (s && s.nom) detail = s.nom + (s.partenaireDe ? `, partenaire de ${s.partenaireDe}` : '') + '.';
    }
    const indice =
      v.id === 'personne' && profils.numeroSerieSav
        ? `<div class="demo-indice"><span>N° de série&nbsp;: <code>${echapper(profils.numeroSerieSav)}</code></span><span>Référence de suivi&nbsp;: <code>${echapper(profils.referenceSav)}</code></span></div>`
        : '';
    $('fiche').innerHTML = `
      <div class="demo-confirm-tete"><span class="ill" data-ill="${v.ill}"></span>
        <div id="titre-fiche"><b>${echapper(v.titre)}</b><span>${echapper(v.role)}</span></div>
        <button type="button" class="demo-fermer" id="btn-fermer-fiche" aria-label="Fermer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
      <p>${echapper(v.texte)}${detail ? ` <b>${echapper(detail)}</b>` : ''}</p>
      ${v.points.length ? `<ul>${v.points.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>` : ''}
      ${indice}
      <div id="msg-fiche"></div>
      <div class="demo-actions">
        ${VUES.length > 1 ? '<button type="button" class="btn btn-secondary" id="btn-autre-vue">Choisir une autre vue</button>' : ''}
        <button type="button" class="btn btn-primary demo-entrer" id="btn-entrer">Entrer dans la démo
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </div>`;
    illustrer($('fiche'));
    message('');
    if (confirmer) ouvrirFiche(true);
  }

  async function entrer() {
    const v = choisie;
    if (!v) return;
    if (v.lien) {
      viderSession();
      location.href = v.lien;
      return;
    }
    const b = $('btn-entrer');
    b.setAttribute('aria-busy', 'true');
    try {
      const s = v.type ? structurePour(v) : null;
      const r = await appel({ action: 'demo-connexion', profil: v.profil || 'structure', code: s ? s.code : '' });
      if (!r || !r.ok)
        throw new Error(
          r && r.erreur === 'Profil inconnu.'
            ? 'Le serveur de démo n’est pas à jour : redéployez-le (npm run deploy:demo).'
            : (r && r.erreur) || 'Accès refusé',
        );
      viderSession();
      Object.entries(r.stockage || {}).forEach(([k, val]) => {
        try {
          sessionStorage.setItem(k, val);
        } catch (e) {}
      });
      location.href = r.page;
    } catch (e) {
      if (prep) {
        prep.arreter();
        ouvrirFiche(true);
      }
      b.removeAttribute('aria-busy');
      $('msg-fiche').innerHTML = `<div class="msg msg-erreur">${echapper(
        e.message === 'Failed to fetch'
          ? 'La plateforme de démonstration ne répond pas pour le moment.'
          : e.message || 'Connexion impossible.',
      )}</div>`;
    }
  }

  const VUES_STRUCTURES = {
    rn: {
      code: 'TREMP2026',
      titre: 'Relais Numérique',
      role: 'Association Le Tremplin',
      texte:
        'Votre structure achète le matériel pour son public, au tarif de votre convention : commande, devis puis facture, paiement par virement, et chaque appareil suivi dans votre flotte.',
      points: [
        'Passer une commande au tarif de la convention',
        'Suivre la commande et ses documents',
        'Remettre un appareil et déclarer une panne',
      ],
    },
    bo: {
      code: 'TREMPVS26',
      ill: 'personne',
      titre: 'Vente solidaire',
      role: 'Association Le Tremplin',
      texte:
        'Votre structure oriente des personnes vers un achat à prix solidaire : une personne nommée par appareil, le moyen de paiement choisi pour votre structure, et le suivi jusqu’à la remise.',
      points: ['Commander pour une personne', 'Suivre la commande', 'Retrouver les appareils remis'],
    },
    interne: {
      titre: 'Structure Interne',
      role: 'Responsable de territoire',
      texte:
        'Un territoire Emmaüs Connect : commandes sans prix ni paiement, flotte, équipe et projets de distribution.',
      points: ['Commander pour le territoire', 'Suivre la flotte et son impact', 'Gérer l’équipe (accès Google)'],
    },
    conseiller: {
      titre: 'Conseiller numérique',
      role: 'Équipe d’une structure Interne',
      texte: 'Sur le terrain : remettre un appareil à une personne, éditer son attestation, consulter les projets.',
      points: ['Remettre un appareil', 'Éditer une attestation', 'Consulter les projets'],
    },
  };
  const ALIAS_VUES = {
    rn: 'rn',
    'relais-numerique': 'rn',
    vs: 'bo',
    bo: 'bo',
    'vente-solidaire': 'bo',
    interne: 'interne',
    conseiller: 'conseiller',
  };

  function appliquerModeStructures() {
    if (!pourStructures) return;
    for (let i = VUES.length - 1; i >= 0; i--) if (!VUES_STRUCTURES[VUES.at(i).id]) VUES.splice(i, 1);
    const ordre = ['rn', 'bo', 'interne', 'conseiller'];
    VUES.sort((a, b) => ordre.indexOf(a.id) - ordre.indexOf(b.id));
    VUES.forEach((v) => Object.assign(v, VUES_STRUCTURES[v.id], { groupe: 'Votre structure' }));
    Object.assign(RESUMES, {
      rn: 'Tarif de convention, devis puis facture, virement.',
      bo: 'Une personne par appareil, paiement au choix.',
      interne: 'Sans prix ni paiement : flotte, équipe, projets.',
      conseiller: 'Remettre un appareil, éditer une attestation.',
    });
    $('btn-reinit').hidden = true;
    const sep = $('btn-reinit').previousElementSibling;
    if (sep && sep.classList.contains('sep')) sep.hidden = true;
    // Fonctionnalités : seulement celles de la vue verrouillée, sinon celles des 4 vues structure.
    const vueLien = ALIAS_VUES[vueVerrouillee];
    document.querySelectorAll('ul.demo-cartes > li.demo-carte').forEach((li) => {
      const vues = (li.dataset.vues || '').split(' ').filter(Boolean);
      li.hidden = vueLien ? !vues.includes(vueLien) : !vues.length;
    });
    // Partenaires fermés : la carte ne parle que des projets et de l'impact.
    const carte = document.querySelector('li.demo-carte[data-vues="interne conseiller"]');
    if (carte && !(perimetreCourant && perimetreCourant.partenaires)) {
      carte.querySelector('h3').textContent = 'Projets et impact';
      carte.querySelector('p').textContent =
        'Rattacher les appareils remis à des projets de distribution financés, suivre leur avancement et leur impact environnemental.';
    }
  }

  /* Périmètre du lancement (Réglages → Périmètre) : seuls les types ouverts sont proposés ;
     partenaires fermés → Vente solidaire autonome, Interne sans partenaires. */
  let perimetreCourant = null;
  function appliquerPerimetre(p) {
    perimetreCourant = p || null;
    if (!p) return;
    const actifs = p.typesActifs || [];
    for (let i = VUES.length - 1; i >= 0; i--) {
      const t = VUES.at(i).type;
      if (t && t !== 'depot' && !actifs.includes(t)) VUES.splice(i, 1);
    }
    if (!p.beneficiaires) {
      const i = VUES.findIndex((v) => v.id === 'personne');
      if (i >= 0) VUES.splice(i, 1);
      document.querySelectorAll('.demo-pour .pil.public').forEach((e) => e.remove());
    }
    if (p.partenaires) return;
    const bo = VUES.find((v) => v.id === 'bo');
    if (bo)
      Object.assign(bo, {
        code: 'BORNB26',
        ill: 'personne',
        role: 'Association de quartier',
        texte:
          'Une association qui oriente des personnes vers un achat à prix solidaire : une personne nommée par appareil, paiement au choix.',
        points: ['Commander pour une personne', 'Choisir le moyen de paiement', 'Suivre sa commande'],
      });
    RESUMES.bo = 'Commander pour une personne, paiement au choix.';
    RESUMES.interne = 'Flotte, équipe et projets, sans prix ni paiement.';
    const interne = VUES.find((v) => v.id === 'interne');
    if (interne)
      Object.assign(interne, {
        texte:
          'Un territoire Emmaüs Connect : sa flotte, son équipe, ses projets de distribution. Ni prix ni paiement.',
        points: [
          'Remettre un appareil et éditer une attestation',
          'Rattacher des remises à un projet',
          'Gérer l’équipe (accès Google)',
        ],
      });
  }

  async function charger() {
    try {
      const r = await appel({ action: 'demo-infos' });
      if (!r || !r.ok) throw new Error();
      profils = r.profils || {};
      // Démo protégée sans la clé équipe : seulement les vues structure.
      if (r.equipeProtegee && !r.equipe) pourStructures = true;
      appliquerPerimetre(r.perimetre);
      appliquerModeStructures();
      construireListe();
      const vue = ALIAS_VUES[String(vueVerrouillee).toLowerCase()];
      if (vueVerrouillee && vue) {
        for (let i = VUES.length - 1; i >= 0; i--) if (VUES.at(i).id !== vue) VUES.splice(i, 1);
        construireListe();
      }
      if (vue && !choisie && VUES.find((v) => v.id === vue)) choisir(VUES.findIndex((v) => v.id === vue));
      const res = r.resume || {};
      $('genere').textContent =
        `${res.structures || 0} structures, ${res.commandes || 0} commandes, ${res.sav || 0} SAV — données du ${new Date(r.genereLe).toLocaleDateString('fr-FR')}`;
      if (choisie) choisir(VUES.indexOf(choisie), false);
      if (prep && choisie) {
        prep.ouvrir();
        entrer();
      } else if (prep) prep.arreter();
    } catch (e) {
      if (prep) prep.arreter();
      $('genere').textContent = 'Démo indisponible pour le moment.';
      message('La plateforme de démonstration ne répond pas pour le moment. Réessayez dans un instant.');
    }
  }

  /* ── Interactions ── */
  $('bouton-choix').addEventListener('click', () => ouvrir(true));
  $('btn-fermer-vues').addEventListener('click', () => ouvrir(false));
  $('voile-vues').addEventListener('click', (e) => {
    if (e.target === $('voile-vues')) ouvrir(false);
  });
  $('liste').addEventListener('click', (e) => {
    const c = e.target.closest('.demo-carte');
    if (c) choisir(Number(c.dataset.i));
  });
  $('voile-vues').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ouvrir(false);
      return;
    }
    const elements = [...$('voile-vues').querySelectorAll('.demo-fermer, .demo-carte')];
    const i = elements.indexOf(document.activeElement);
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key) && i > -1) {
      e.preventDefault();
      const pas = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1;
      elements[(i + pas + elements.length) % elements.length].focus();
    } else if (e.key === 'Tab') {
      // Focus gardé dans la modale (✕ en premier, dernière carte en dernier).
      if (e.shiftKey && i === 0) {
        e.preventDefault();
        elements[elements.length - 1].focus();
      } else if (!e.shiftKey && i === elements.length - 1) {
        e.preventDefault();
        elements[0].focus();
      }
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-entrer')) entrer();
    if (e.target.closest('#btn-fermer-fiche')) {
      ouvrirFiche(false);
      $('bouton-choix').focus();
    }
    if (e.target.closest('#btn-autre-vue')) {
      ouvrirFiche(false);
      ouvrir(true);
    }
  });
  $('voile-fiche').addEventListener('click', (e) => {
    if (e.target === $('voile-fiche')) ouvrirFiche(false);
  });
  $('voile-fiche').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ouvrirFiche(false);
      $('bouton-choix').focus();
      return;
    }
    if (e.key !== 'Tab') return;
    const el = [...$('voile-fiche').querySelectorAll('button')];
    const i = el.indexOf(document.activeElement);
    if (e.shiftKey && i === 0) {
      e.preventDefault();
      el.at(-1).focus();
    } else if (!e.shiftKey && i === el.length - 1) {
      e.preventDefault();
      el.at(0).focus();
    }
  });
  $('btn-reinit').addEventListener('click', async () => {
    if (
      !confirm(
        'Remettre toutes les données de démonstration à zéro ? Les modifications faites pendant la démo seront perdues.',
      )
    )
      return;
    try {
      const r = await appel({ action: 'demo-reinitialiser' });
      if (!r || !r.ok) throw new Error();
      message('Données réinitialisées.', 'succes');
      await charger();
    } catch (e) {
      message('Réinitialisation impossible pour le moment.');
    }
  });
  $('btn-quitter').addEventListener('click', () => {
    location.href = 'demo.html?quitter=1';
  });

  construireListe();
  charger();
})();
