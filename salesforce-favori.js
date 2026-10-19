/* Favori « CVDL › Salesforce ».
   Ce fichier n'est pas chargé par les pages de CVDL : la page Saisie Salesforce en fait un
   favori (lien javascript:) à glisser dans la barre du navigateur. Cliqué dans Salesforce, il
   demande la saisie copiée dans CVDL (bouton « Saisir dans Salesforce » d'un créneau), puis
   affiche un panneau qui ouvre l'un après l'autre les formulaires pré-remplis : Créneau, puis
   pour chaque personne Contact, Participant et Vente. La personne vérifie et enregistre ; le
   panneau voit la fiche créée (adresse de la page) et ouvre le formulaire suivant.
   Rien n'est écrit dans Salesforce par le favori : il ouvre des formulaires, comme un lien.
   Les données restent dans l'onglet (sessionStorage) jusqu'à la fin de la saisie.
   Tout ce qui dépend du Salesforce d'Emmaüs Connect (objets, champs, types) est ici. */
(() => {
  const DOMAINE = 'emmaus-connect.lightning.force.com';
  const CLE = 'cvdl-favori';
  const CLE_MARQUES = 'cvdl-favori-marques';
  // Créneaux déjà créés par le favori (date, lieu, Opération → id Salesforce) : une saisie
  // relancée les réutilise au lieu d'en créer un second.
  const CLE_CRENEAUX = 'cvdl-favori-creneaux';
  // Types d'enregistrement des ventes de matériel ('' = inconnu : choisi dans Salesforce).
  const TYPES_VENTE = { ordinateur: '012b0000000Q1rlAAC', smartphone: '012b0000000Q1rmAAC', tablette: '' };
  const OBJETS = {
    creneau: 'GW_Volunteers__Volunteer_Shift__c',
    contact: 'Contact',
    participant: 'Participant__c',
    vente: 'Vente__c',
  };
  const NOMS = { creneau: 'Créneau', contact: 'Contact', participant: 'Participant', vente: 'Vente' };

  if (location.hostname !== DOMAINE) {
    alert(`Ce favori s’utilise dans Salesforce (${DOMAINE}).`);
    return;
  }
  if (window.__cvdlFavori) {
    window.__cvdlFavori.afficher();
    return;
  }

  /* ── État (onglet courant) ── */
  const lire = () => {
    try {
      return JSON.parse(sessionStorage.getItem(CLE) || 'null');
    } catch (e) {
      return null;
    }
  };
  const ecrire = () => {
    try {
      sessionStorage.setItem(CLE, JSON.stringify(etat));
    } catch (e) {
      /* stockage indisponible : l'état reste en mémoire tant que la page n'est pas rechargée */
    }
  };
  const effacer = () => {
    try {
      sessionStorage.removeItem(CLE);
    } catch (e) {
      /* rien à effacer */
    }
  };
  const marquesConnues = () => {
    try {
      return JSON.parse(localStorage.getItem(CLE_MARQUES) || '[]');
    } catch (e) {
      return [];
    }
  };

  const cleCreneau = (p) => [p.creneau.date, p.creneau.lieu, p.creneau.operationId].join('|');
  function creneauxConnus() {
    try {
      return JSON.parse(localStorage.getItem(CLE_CRENEAUX) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function retenirCreneau(id) {
    const connus = creneauxConnus();
    connus[cleCreneau(etat.p)] = id;
    try {
      localStorage.setItem(CLE_CRENEAUX, JSON.stringify(connus));
    } catch (e) {
      /* pas de mémoire : une relance proposera de choisir le créneau */
    }
  }

  /** « CVDL1:<base64 du JSON> » (bouton de CVDL) → données du créneau, ou null. */
  function decoder(texte) {
    const m = String(texte || '')
      .trim()
      .match(/^CVDL1:([A-Za-z0-9+/=]+)$/);
    if (!m) return null;
    try {
      const octets = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
      const p = JSON.parse(new TextDecoder().decode(octets));
      return p && p.v === 1 && p.creneau && Array.isArray(p.ventes) ? p : null;
    } catch (e) {
      return null;
    }
  }

  let etat = lire();
  if (!etat) {
    const texte = prompt('Collez ici la saisie copiée dans CVDL (Ctrl+V), puis Entrée.');
    if (texte == null) return;
    const p = decoder(texte);
    if (!p) {
      alert('Ce texte ne vient pas du bouton « Saisir dans Salesforce » de CVDL. Recopiez-le et recommencez.');
      return;
    }
    if (!p.ventes.length) {
      alert('Toutes les ventes de ce créneau sont déjà saisies.');
      return;
    }
    const repris = creneauxConnus()[cleCreneau(p)] || '';
    etat = {
      p,
      i: 0,
      etape: repris ? 'contact' : 'creneau',
      creneauId: repris,
      creneauRepris: !!repris,
      contactId: '',
      faites: [],
      passees: [],
      ouvert: false,
      depart: '',
    };
    ecrire();
  }

  /* ── Page courante ── */
  /** Fiche affichée : { objet, id } d'après l'adresse (…/lightning/r/<Objet>/<Id>/view), ou null. */
  function ficheCourante() {
    const m = location.pathname.match(/\/lightning\/r\/(\w+)\/([a-zA-Z0-9]{15,18})\//);
    return m ? { objet: m[1], id: m[2] } : null;
  }
  const venteCourante = () => etat.p.ventes[etat.i];

  /* ── Formulaires pré-remplis ── */
  /** Valeur pour defaultFieldValues : les virgules séparent les champs, on les retire. */
  const valeurUrl = (v) => encodeURIComponent(String(v).replace(/,/g, ' '));

  function ouvrir(objet, valeurs, typeEnregistrement) {
    const champs = Object.entries(valeurs)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}=${valeurUrl(v)}`)
      .join(',');
    const url =
      `/lightning/o/${objet}/new?` +
      (typeEnregistrement ? `recordTypeId=${typeEnregistrement}&` : '') +
      `defaultFieldValues=${champs}`;
    const f = ficheCourante();
    etat.depart = f ? f.id : '';
    etat.ouvert = true;
    ecrire();
    // Navigation interne de Salesforce (le panneau reste affiché) ; sinon, chargement de la page
    // (il faudra recliquer sur le favori, qui reprendra où il en était).
    const aura = window.$A;
    const nav = aura && typeof aura.get === 'function' ? aura.get('e.force:navigateToURL') : null;
    if (nav) {
      nav.setParams({ url });
      nav.fire();
    } else location.assign(url);
  }

  /** Marque : la valeur de la liste Salesforce si elle y est, sinon « Autre » + Autre marque.
   *  Liste inconnue : rien (choisie dans le formulaire). */
  function champsMarque(marque) {
    const liste = marquesConnues();
    if (!marque || !liste.length) return {};
    const trouvee = liste.find((m) => m.toLowerCase() === marque.toLowerCase());
    if (trouvee) return { Marque__c: trouvee };
    const autre = liste.find((m) => /^autre/i.test(m));
    return autre ? { Marque__c: autre, Autre_Marque__c: marque } : {};
  }

  function valeursEtape() {
    const p = etat.p;
    const v = venteCourante();
    switch (etat.etape) {
      case 'creneau':
        return [
          OBJETS.creneau,
          {
            GW_Volunteers__Volunteer_Job__c: p.creneau.operationId,
            GW_Volunteers__Start_Date_Time__c: p.creneau.debut,
            GW_Volunteers__Duration__c: p.creneau.duree,
            Statut__c: 'Planifiée',
            GW_Volunteers__Desired_Number_of_Volunteers__c: p.creneau.benevoles,
          },
        ];
      case 'contact':
        return [
          OBJETS.contact,
          {
            FirstName: v.prenom,
            LastName: v.nom,
            Birthdate: v.naissance,
            Antenne__c: p.antenneId,
            ContactReferent__c: p.prescripteurId,
          },
        ];
      case 'participant':
        return [
          OBJETS.participant,
          {
            Volunteer_Shift__c: etat.creneauId,
            Beneficiaire__c: etat.contactId,
            Prenom_Participant__c: v.prenom,
            Nom_participant__c: v.nom,
            Statut_participant__c: 'Présent·e',
          },
        ];
      case 'vente':
        return [
          OBJETS.vente,
          {
            ContactBeneficiaire__c: etat.contactId,
            DateVente__c: v.dateVente,
            Montant__c: v.montant == null ? '' : v.montant,
            Reference_materiel__c: v.identifiantEc,
            ...champsMarque(v.marque),
            Modele__c: v.modele,
            Numero_serie_code_IMEI__c: v.numeroSerie,
            Paiement_complet__c: v.paiementComplet === false ? 'Non' : 'Oui',
            Linux__c: v.linux == null ? '' : String(v.linux),
            Stock__c: v.stockId,
          },
          TYPES_VENTE[v.typeVente] || '',
        ];
      default:
        return null;
    }
  }

  function ouvrirEtape() {
    const e = valeursEtape();
    if (e) ouvrir(...e);
  }

  /** Ce qui restera à choisir à la main dans le formulaire de l'étape. */
  function aChoisir() {
    const p = etat.p;
    const v = venteCourante();
    const l = [];
    if (etat.etape === 'creneau' && !p.creneau.operationId) l.push('l’Opération (adresse absente des réglages CVDL)');
    if (etat.etape === 'contact') {
      l.push('Fiche créée par');
      if (!p.antenneId) l.push('l’Antenne');
      if (!p.prescripteurId) l.push('le prescripteur·trice');
    }
    if (etat.etape === 'vente') {
      l.push('Vente suivie par');
      if (!v.stockId) l.push('le Stock');
      if (!TYPES_VENTE[v.typeVente]) l.push('le type de vente (Ordinateur, Smartphone…)');
      if (!Object.keys(champsMarque(v.marque)).length) l.push(`la Marque${v.marque ? ` (${v.marque})` : ''}`);
    }
    return l;
  }

  /* ── Enchaînement ── */
  function passerA(etape) {
    etat.etape = etape;
    etat.ouvert = false;
    ecrire();
    afficher();
    const v = venteCourante();
    if (['creneau', 'participant', 'vente'].includes(etape) || (etape === 'contact' && !v.contactExistant))
      ouvrirEtape();
  }

  /** Fiche enregistrée (ou reprise) pour l'étape en cours : on garde son identifiant et on passe
   *  à la suite. */
  function ficheObtenue(id) {
    if (etat.etape === 'creneau') {
      etat.creneauId = id;
      etat.creneauRepris = false;
      retenirCreneau(id);
      return passerA('contact');
    }
    if (etat.etape === 'contact') {
      etat.contactId = id;
      return passerA('participant');
    }
    if (etat.etape === 'participant') return passerA('vente');
    if (etat.etape === 'vente') {
      etat.faites.push(venteCourante().id);
      return passerA('attestation');
    }
  }

  function personneSuivante(passee) {
    if (passee) (etat.passees ||= []).push(venteCourante().id);
    etat.creneauRepris = false;
    etat.i += 1;
    etat.contactId = '';
    if (etat.i >= etat.p.ventes.length) {
      etat.etape = 'fin';
      ecrire();
      return afficher();
    }
    passerA('contact');
  }

  /** Surveillance de la page : une nouvelle fiche du type attendu = formulaire enregistré. */
  function surveiller() {
    if (!document.getElementById('cvdl-panneau')) afficher();
    const f = ficheCourante();
    const attendu = OBJETS[etat.etape];
    if (etat.ouvert && f && attendu && f.objet === attendu && f.id !== etat.depart) ficheObtenue(f.id);
    else majFicheOuverte();
  }

  /* ── Relevé de la liste des marques (formulaire Vente ouvert) ── */
  /** Tous les éléments de la page, zones fermées (shadow DOM) comprises. */
  function tous(racine = document, liste = []) {
    racine.querySelectorAll('*').forEach((e) => {
      liste.push(e);
      if (e.shadowRoot) tous(e.shadowRoot, liste);
    });
    return liste;
  }
  async function releverMarques() {
    const elements = tous();
    const libelle = elements.find(
      (e) => e.tagName === 'LABEL' && /^\*?\s*Marque\s*$/i.test((e.textContent || '').trim()),
    );
    const bloc =
      libelle &&
      (libelle.closest('lightning-combobox, lightning-picklist, .slds-form-element') || libelle.parentElement);
    const bouton = bloc && tous(bloc).find((e) => e.getAttribute && e.getAttribute('role') === 'combobox');
    if (!bouton) return alert('Ouvrez d’abord un formulaire de Vente (le champ Marque doit être visible).');
    bouton.click();
    await new Promise((r) => setTimeout(r, 600));
    const options = tous(bloc)
      .filter((e) => e.getAttribute && e.getAttribute('role') === 'option')
      .map((e) => (e.getAttribute('data-value') || e.textContent || '').trim())
      .filter((t) => t && !/^--/.test(t));
    bouton.click();
    if (!options.length) return alert('Liste des marques introuvable : déroulez la liste Marque puis recliquez.');
    try {
      localStorage.setItem(CLE_MARQUES, JSON.stringify([...new Set(options)]));
    } catch (e) {
      return alert('Impossible de mémoriser la liste dans ce navigateur.');
    }
    alert(`${options.length} marques mémorisées pour les prochaines ventes.`);
    if (etat.etape === 'vente') ouvrirEtape();
  }

  /* ── Panneau ── */
  const echapper = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  /* Panneau : une pastille de progression (repère, jamais une consigne) ; au-dessus, seulement
     les points d'attention (champ à compléter à la main, décision, attestation, fin). Les
     actions de secours (rouvrir, passer, arrêter…) sont dans le menu de la pastille. */
  let menuOuvert = false;
  const ICONES = {
    attention:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
    question:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17v.01"/></svg>',
  };
  /** Point d'attention : `genre` attention | ok | alerte | question ; `bouton` : [action, libellé]. */
  const avis = (genre, titre, texte, bouton) =>
    `<div class="cf-avis cf-${genre}"><span class="cf-ic">${ICONES[genre === 'alerte' ? 'attention' : genre]}</span><div><b>${titre}</b>${texte ? `<p>${texte}</p>` : ''}${bouton ? `<button type="button" data-cf="${bouton[0]}">${bouton[1]}</button>` : ''}</div></div>`;

  function avisEnCours() {
    const p = etat.p;
    const v = venteCourante();
    const total = p.ventes.length;
    const qui = v ? echapper(`${v.prenom} ${v.nom}`) : '';
    const l = [];
    if (etat.etape === 'fin') {
      const n = etat.faites.length;
      const noms = (ids) =>
        p.ventes
          .filter((x) => ids.includes(x.id))
          .map((x) => echapper(`${x.prenom} ${x.nom}`))
          .join(', ');
      const passees = etat.passees || [];
      const restantes = p.ventes.filter((x) => !etat.faites.includes(x.id) && !passees.includes(x.id)).map((x) => x.id);
      const bilan = [
        n ? `Enregistrées : ${noms(etat.faites)}.` : '',
        passees.length ? `Passées : ${noms(passees)}.` : '',
        restantes.length ? `Pas faites : ${noms(restantes)}.` : '',
      ]
        .filter(Boolean)
        .join('<br>');
      const titre = `${etat.arretee ? 'Saisie arrêtée · ' : ''}${n} vente${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''}`;
      // Confirmation dans CVDL : une petite fenêtre CVDL marque ces ventes puis se ferme ; les
      // autres restent « à saisir » (une relance ne proposera qu'elles).
      l.push(
        n && p.jeton && p.retour
          ? avis('ok', titre, bilan, ['confirmer', 'Confirmer dans CVDL et fermer'])
          : avis(
              'ok',
              titre,
              n ? `${bilan}<br>Dans l’onglet CVDL, cochez-les puis « Marquer comme saisies ».` : bilan,
              ['terminer', 'Fermer'],
            ),
      );
      return l;
    }
    if (etat.etape === 'attestation') {
      // Le problème d'abord, puis la confirmation et son unique bouton, juste au-dessus de la pastille.
      if (!v.attestationGeneree)
        l.push(
          avis(
            'alerte',
            'Attestation pas encore générée',
            `Générez-la dans CVDL (fiche de la personne), puis déposez <b>${echapper(v.identifiantEc)}.pdf</b> sur cette vente (onglet Fichiers).`,
          ),
        );
      l.push(
        avis(
          'ok',
          `Vente enregistrée · ${qui}`,
          v.attestationGeneree
            ? `Déposez l’attestation <b>${echapper(v.identifiantEc)}.pdf</b> sur cette vente (onglet Fichiers).`
            : '',
          [
            'suivante',
            `${v.attestationGeneree ? 'Attestation déposée' : 'Continuer sans l’attestation'} → ${etat.i + 1 < total ? 'personne suivante' : 'terminer'}`,
          ],
        ),
      );
      return l;
    }
    const f = ficheCourante();
    if (etat.creneauRepris && etat.i === 0)
      l.push(
        avis(
          'info',
          'Créneau déjà créé',
          'Celui de la saisie précédente est réutilisé (menu : « Créer un autre créneau »).',
        ),
      );
    if (etat.etape === 'creneau' && f && f.objet === OBJETS.creneau && !etat.ouvert)
      l.push(
        avis('question', 'Ce créneau est-il le bon ?', `Il servira aux ${total} personnes de la saisie.`, [
          'reprendre',
          'Oui, ce créneau → première personne',
        ]),
      );
    if (etat.etape === 'contact' && v.contactExistant)
      l.push(
        f && f.objet === 'Contact'
          ? avis('question', `Est-ce bien ${qui} ?`, '', ['reprendre', 'Oui, c’est cette personne → suite'])
          : avis(
              'question',
              `${qui} est déjà dans Salesforce`,
              'Recherchez sa fiche en haut de la page et ouvrez-la (ou « Nouveau contact » dans le menu).',
            ),
      );
    // Fiche existante à retrouver ou à confirmer : pas de formulaire, donc rien à y compléter.
    // Un seul encart avec un bouton à la fois : jamais deux actions proposées ensemble.
    const surFiche = l.some((x) => x.includes('cf-question')) || (etat.etape === 'contact' && v.contactExistant);
    const choix = surFiche ? [] : aChoisir();
    if (choix.length)
      l.push(
        avis(
          'attention',
          'À compléter dans le formulaire',
          `<ul>${choix.map((c) => `<li>${echapper(c)}</li>`).join('')}</ul>`,
        ),
      );
    return l;
  }

  function contenu() {
    const p = etat.p;
    const total = p.ventes.length;
    const faites = etat.faites.length;
    const ou =
      etat.etape === 'fin'
        ? etat.arretee
          ? 'Saisie arrêtée'
          : 'Saisie terminée'
        : etat.etape === 'creneau'
          ? 'Créneau'
          : `Personne ${Math.min(etat.i + 1, total)}/${total} · ${etat.etape === 'attestation' ? 'Attestation' : NOMS[etat.etape]}`;
    const menu = [
      etat.etape !== 'fin' && etat.etape !== 'attestation'
        ? [
            'ouvrir',
            etat.etape === 'contact' && venteCourante().contactExistant ? 'Nouveau contact' : 'Rouvrir le formulaire',
          ]
        : null,
      etat.etape === 'creneau' ? ['existe', 'Le créneau existe déjà'] : null,
      etat.creneauRepris ? ['autre-creneau', 'Créer un autre créneau'] : null,
      etat.etape === 'vente' ? ['marques', 'Lire la liste des marques'] : null,
      !['creneau', 'attestation', 'fin'].includes(etat.etape) ? ['passer', 'Passer cette personne'] : null,
      etat.etape !== 'fin' ? ['arreter', 'Arrêter la saisie'] : null,
    ].filter(Boolean);
    return `${avisEnCours().join('')}
      ${menuOuvert && menu.length ? `<div class="cf-menu" role="menu">${menu.map(([a, t]) => `<button type="button" role="menuitem" data-cf="${a}">${t}</button>`).join('')}</div>` : ''}
      <button type="button" class="cf-pastille" data-cf="menu" aria-expanded="${menuOuvert}" title="Progression de la saisie CVDL — options">
        <span class="cf-marque">CVDL</span>
        <span class="cf-ou"><b>${ou}</b><span>${echapper(p.creneau.date)}${p.creneau.lieu ? ` · ${echapper(p.creneau.lieu)}` : ''}</span></span>
        <span class="cf-compte"><span class="cf-barre"><i style="width:${total ? Math.round((faites / total) * 100) : 0}%"></i></span>${faites}/${total}</span>
        <span class="cf-chevron" aria-hidden="true">${menuOuvert ? '▾' : '▴'}</span>
      </button>`;
  }

  const STYLE = `#cvdl-panneau{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:340px;max-height:84vh;overflow:auto;display:flex;flex-direction:column;gap:8px;align-items:stretch;font:14px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#002743;pointer-events:none}
#cvdl-panneau>*{pointer-events:auto}#cvdl-panneau *{box-sizing:border-box}#cvdl-panneau p{margin:2px 0 0;font-size:13px}#cvdl-panneau ul{margin:4px 0 0;padding-left:18px;font-size:13px}
#cvdl-panneau .cf-avis{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid #d5dde3;border-radius:10px;box-shadow:0 4px 14px rgba(0,39,67,.14);background:linear-gradient(90deg,#ffe9a3 0%,#fff8dc 38%,#fff 75%)}
#cvdl-panneau .cf-avis b{font-size:13.5px}#cvdl-panneau .cf-ic{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#fff3c4;color:#7a5a00}
#cvdl-panneau .cf-ok{background:linear-gradient(90deg,#bfe9d0 0%,#e9f7ef 38%,#fff 75%)}#cvdl-panneau .cf-ok .cf-ic{background:#dff3e7;color:#14633a}
#cvdl-panneau .cf-alerte{background:linear-gradient(90deg,#f9c3d4 0%,#fdebf1 38%,#fff 75%)}#cvdl-panneau .cf-alerte .cf-ic{background:#fde4ec;color:#a3154a}
#cvdl-panneau .cf-info{background:linear-gradient(90deg,#d6e4f0 0%,#eef4f9 38%,#fff 75%)}#cvdl-panneau .cf-info .cf-ic{background:#e3edf6;color:#002743}
#cvdl-panneau .cf-question{background:linear-gradient(90deg,#b5ebec 0%,#e4f7f7 38%,#fff 75%)}#cvdl-panneau .cf-question .cf-ic{background:#d9f3f3;color:#00696c}
#cvdl-panneau .cf-avis button{margin-top:8px;font:inherit;font-size:13px;font-weight:700;border:1.5px solid #002743;background:#fff;color:#002743;border-radius:999px;padding:5px 12px;cursor:pointer}
#cvdl-panneau .cf-avis button:hover,#cvdl-panneau .cf-menu button:hover{background:#f3f6f8}
#cvdl-panneau .cf-menu{display:flex;flex-direction:column;padding:4px;background:#fff;border:1px solid #d5dde3;border-radius:10px;box-shadow:0 4px 14px rgba(0,39,67,.14)}
#cvdl-panneau .cf-menu button{font:inherit;font-size:13px;text-align:left;border:0;background:none;color:#002743;padding:7px 10px;border-radius:7px;cursor:pointer}
#cvdl-panneau .cf-menu button[data-cf=arreter]{color:#a3154a}
#cvdl-panneau .cf-pastille{display:flex;align-items:center;gap:10px;width:100%;font:inherit;text-align:left;color:#fff;background:#002743;border:0;border-radius:999px;padding:7px 14px 7px 8px;cursor:pointer;box-shadow:0 4px 14px rgba(0,39,67,.3)}
#cvdl-panneau .cf-marque{flex:none;font-size:10.5px;font-weight:800;letter-spacing:.1em;background:#00acb0;color:#002743;border-radius:999px;padding:4px 7px}
#cvdl-panneau .cf-ou{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}#cvdl-panneau .cf-ou b{font-size:13px}#cvdl-panneau .cf-ou span{font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cvdl-panneau .cf-compte{flex:none;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700}#cvdl-panneau .cf-barre{width:44px;height:5px;border-radius:99px;background:rgba(255,255,255,.25);overflow:hidden}#cvdl-panneau .cf-barre i{display:block;height:100%;background:#00acb0}
#cvdl-panneau .cf-chevron{flex:none;font-size:12px;opacity:.8}
#cvdl-panneau button:focus-visible{outline:3px solid #00acb0;outline-offset:2px}`;

  let derniereFiche = '';
  function majFicheOuverte() {
    // Questions « Ce créneau est-il le bon ? » / « Est-ce bien … ? » : dépendent de la page affichée.
    const f = ficheCourante();
    const cle = f ? f.id : location.pathname;
    if (cle !== derniereFiche) {
      derniereFiche = cle;
      afficher();
    }
  }

  function afficher() {
    let panneau = document.getElementById('cvdl-panneau');
    if (!panneau) {
      if (!document.getElementById('cvdl-panneau-style')) {
        const s = document.createElement('style');
        s.id = 'cvdl-panneau-style';
        s.textContent = STYLE;
        document.head.appendChild(s);
      }
      panneau = document.createElement('section');
      panneau.id = 'cvdl-panneau';
      panneau.setAttribute('aria-label', 'Saisie CVDL dans Salesforce');
      panneau.addEventListener('click', clic);
      document.body.appendChild(panneau);
    }
    panneau.innerHTML = contenu();
  }

  function clic(e) {
    const b = e.target.closest('[data-cf]');
    if (!b) return;
    const action = b.dataset.cf;
    if (action === 'menu') {
      menuOuvert = !menuOuvert;
      return afficher();
    }
    if (menuOuvert) {
      menuOuvert = false;
      afficher();
    }
    if (action === 'ouvrir') return ouvrirEtape();
    if (action === 'existe') {
      etat.ouvert = false;
      ecrire();
      return alert('Ouvrez le créneau dans Salesforce, puis répondez « Oui, ce créneau » dans l’encart CVDL.');
    }
    if (action === 'reprendre') {
      const f = ficheCourante();
      if (f) ficheObtenue(f.id);
      return;
    }
    if (action === 'suivante') return personneSuivante();
    if (action === 'marques') return releverMarques();
    if (action === 'passer') {
      if (confirm('Passer cette personne ? Elle restera « à saisir » dans CVDL.')) personneSuivante(true);
      return;
    }
    if (action === 'autre-creneau') {
      etat.creneauId = '';
      etat.creneauRepris = false;
      return passerA('creneau');
    }
    if (action === 'arreter') {
      if (!confirm('Arrêter la saisie ? Ce qui est déjà enregistré dans Salesforce le reste.')) return;
      // Des ventes déjà enregistrées : bilan, pour les confirmer dans CVDL avant de fermer.
      if (etat.faites.length) {
        etat.etape = 'fin';
        etat.arretee = true;
        ecrire();
        return afficher();
      }
    }
    if (action === 'confirmer') {
      const resultat = btoa(
        String.fromCharCode(...new TextEncoder().encode(JSON.stringify({ jeton: etat.p.jeton, ids: etat.faites }))),
      );
      const f = window.open(
        `${etat.p.retour}#confirmer=${encodeURIComponent(resultat)}`,
        'cvdl-confirmer',
        'popup,width=480,height=420',
      );
      if (!f)
        return alert(
          'Le navigateur a bloqué la fenêtre de CVDL : autorisez les fenêtres pour Salesforce, puis recliquez.',
        );
    }
    if (action === 'arreter' || action === 'terminer' || action === 'confirmer') {
      if (navigator.clipboard) navigator.clipboard.writeText('').catch(() => {});
      clearInterval(minuterie);
      effacer();
      document.getElementById('cvdl-panneau').remove();
      window.__cvdlFavori = null;
    }
  }

  window.__cvdlFavori = { afficher };
  afficher();
  // Reprise (page rechargée) : la fiche enregistrée est peut-être déjà affichée.
  surveiller();
  const minuterie = setInterval(surveiller, 700);
  if (etat.etape === 'creneau' && !etat.ouvert && !etat.creneauId) ouvrirEtape();
  // Créneau repris d'une saisie précédente : on commence directement par la première personne.
  else if (etat.creneauRepris && etat.etape === 'contact' && !etat.ouvert && !etat.contactId) passerA('contact');
})();
