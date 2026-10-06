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
  const appel = (donnees) =>
    fetch(API_DEMO, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(donnees),
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
  // Toutes les pages du site parlent à la fonction de démo tant que ce repère est valable (8 h).
  try {
    localStorage.setItem('cvdl-mode-demo', JSON.stringify({ jusqua: Date.now() + DUREE }));
  } catch (e) {
    message('Le stockage du navigateur est bloqué : impossible d’activer le mode démo (navigation privée stricte ?).');
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
      code: 'ECLYON26',
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
      texte:
        'Un reconditionneur partenaire : commandes en volume, sans paiement, flotte suivie dans son propre tableau.',
      points: ['Commander en volume', 'Suivre sa flotte', 'Déclarer une panne'],
    },
    {
      groupe: 'Structures',
      id: 'projets',
      type: 'projets',
      code: 'PSC69',
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
      code: 'BOGERL26',
      ill: 'partenairesCmd',
      titre: 'Structure partenaire',
      role: 'Bon d’orientation',
      texte:
        'Une association partenaire d’une Interne : elle commande pour des personnes nommées, paie sur place, et l’Interne valide.',
      points: ['Commander pour une personne', 'Suivre la validation par l’Interne', 'Voir les appareils attribués'],
    },
    {
      groupe: 'Structures',
      id: 'rn',
      type: 'rn',
      code: 'MLNI2026',
      ill: 'commander',
      titre: 'Vente solidaire',
      role: 'RNum (Mission Locale, CCAS…)',
      texte:
        'Une structure qui achète au tarif solidaire : virement, devis et factures, tarif de convention, flotte dans son propre tableau.',
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
    if (v.type === 'interne' && profils.interne) return { code: profils.interne.code, nom: profils.interne.nom }; // Interne avec équipe (Lyon)
    const liste = profils.structures || [];
    const trouvee =
      liste.find((s) => s.code === v.code) ||
      (v.type === 'depot'
        ? liste.find((s) => s.depotVente)
        : liste.find((s) => s.type === v.type && !s.depotVente && (v.type !== 'bo' || s.partenaireDe)));
    return trouvee || (v.code ? { code: v.code, nom: '' } : null);
  }

  function choisir(i) {
    choisie = VUES[i];
    if (!$('voile-vues').hidden) ouvrir(false);
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
      <p>${echapper(v.texte)}${detail ? ` <b>${echapper(detail)}</b>` : ''}</p>
      ${v.points.length ? `<ul>${v.points.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>` : ''}
      ${indice}
      <button type="button" class="btn btn-primary demo-entrer" id="btn-entrer">Entrer dans la démo
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`;
    $('fiche').hidden = false;
    message('');
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
      b.removeAttribute('aria-busy');
      message(
        e.message === 'Failed to fetch'
          ? 'La plateforme de démonstration ne répond pas pour le moment.'
          : e.message || 'Connexion impossible.',
      );
    }
  }

  async function charger() {
    try {
      const r = await appel({ action: 'demo-infos' });
      if (!r || !r.ok) throw new Error();
      profils = r.profils || {};
      const res = r.resume || {};
      $('genere').textContent =
        `${res.structures || 0} structures, ${res.commandes || 0} commandes, ${res.sav || 0} SAV — données du ${new Date(r.genereLe).toLocaleDateString('fr-FR')}`;
      if (choisie) choisir(VUES.indexOf(choisie));
    } catch (e) {
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
