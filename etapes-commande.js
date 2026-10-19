/* ════════════════════════════════════════════════════════════════════════════════════
   etapes-commande.js — étapes d'une commande communes à la fiche commande de l'admin et à
   l'espace Logistique (support.html) : un seul code pour l'affichage, la saisie et les
   contrôles côté écran.
   · Quantités (« Reçue ») : + / − par produit, commandé et stock restant, message facultatif.
   · Numéros de série ou codes (« Validée ») : un champ par appareil, groupés par produit,
     Entrée ou douchette = appareil suivant, enregistrés au fil de la saisie, import du CSV
     tec.tech (tectech-csv.js) ; la personne associée s'affiche si la page la fournit.
   · Expédition (« Préparée ») : mode de livraison, liens de suivi Colissimo, date estimée.
   La page fournit l'enregistrement (son API, ses droits) par EtapesCommande.brancher({...}) :
   chaque fonction renvoie la réponse du serveur ({ ok, erreur }). Les saisies en cours sont
   gardées par commande (brouillons) entre deux rendus de la page. Styles : etapes-commande.css.
   ════════════════════════════════════════════════════════════════════════════════════ */
window.EtapesCommande = (function () {
  const esc = echapper;
  const entier = (v) => parseInt(v, 10) || 0;
  const QUANTITE_MAX = 10000;

  const MODES = [
    { valeur: 'Colissimo', label: 'Colissimo', ic: 'truck', aide: 'Envoi postal suivi — un lien par colis.' },
    {
      valeur: 'Livraison EC',
      label: 'Livraison Emmaüs Connect',
      ic: 'package',
      aide: 'Livrée par l’équipe, à une date estimée.',
    },
    { valeur: 'Retrait', label: 'Retrait', ic: 'building', aide: 'La structure vient récupérer sur place.' },
  ];
  // Même dessin que le reste de l'appli : aplat décalé + trait bleu nuit.
  const ILL_MODES = {
    Colissimo: [
      '#F5A3BC',
      '<path d="M10 17 25 10l15 7v17l-15 7-15-7z"/>',
      '<path d="M8 15 23 8l15 7v17l-15 7-15-7z"/><path d="M8 15l15 7 15-7M23 22v17"/><path d="M15.5 11.5 30.5 18.5v6"/><path d="M2 27h4M1 32h5"/>',
    ],
    'Livraison EC': [
      '#9FE0E1',
      '<rect x="5" y="15" width="24" height="17" rx="2"/><path d="M29 20h7l5 6v6H29z"/>',
      '<rect x="3" y="13" width="24" height="17" rx="2"/><path d="M27 18h7l5 6v6H27z"/><circle cx="11" cy="32" r="3.5" fill="#fff"/><circle cx="33" cy="32" r="3.5" fill="#fff"/><path d="M29 22h4l2.5 3"/>',
    ],
    Retrait: [
      '#F5A3BC',
      '<path d="M9 21h32v19H9z"/>',
      '<path d="M7 19h32v19H7z"/><path d="M5 19l4-10h28l4 10"/><path d="M5 19a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0"/><path d="M18 38v-9h10v9"/>',
    ],
  };
  function illustrationMode(valeur, t) {
    const d = ILL_MODES[valeur] || ILL_MODES['Livraison EC'];
    return `<svg viewBox="0 0 48 48" width="${t || 44}" height="${t || 44}" aria-hidden="true" style="overflow:visible;flex:none"><g fill="${d[0]}" stroke="none">${d[1]}</g><g fill="none" stroke="#002743" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d[2]}</g></svg>`;
  }
  const libelleMode = (v) => (MODES.find((m) => m.valeur === v) || { label: v || '' }).label;
  const COCHE =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  /* ── Brouillons : saisies en cours, par référence de commande ── */
  const brouillons = {};
  const brouillon = (ref) => brouillons[ref] || (brouillons[ref] = {});
  /** Saisies en cours d'une commande : { quantites, message, valeurs }. */
  function lire(ref) {
    const b = brouillons[ref] || {};
    return {
      quantites: b.quantites ? [...b.quantites] : null,
      message: b.message || '',
      valeurs: b.valeurs ? [...b.valeurs] : null,
    };
  }
  /** Oublie les saisies en cours (après rechargement depuis le serveur), sauf un champ en cours de frappe. */
  function oublier(ref) {
    const actif =
      document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-ec-ref]');
    if (ref) {
      if (!(actif && actif.dataset.ecRef === ref)) delete brouillons[ref];
      return;
    }
    Object.keys(brouillons).forEach((r) => {
      if (!(actif && actif.dataset.ecRef === r)) delete brouillons[r];
    });
  }

  /* ── Quantités ── */
  /** c : { reference, lignes: [{ produit, quantite }] } ; o : { stock(nom) → nombre ou null,
   *  illu(nom) → dessin du produit }. */
  function quantites(c, o) {
    const opts = o || {};
    const b = brouillon(c.reference);
    if (!b.quantites || b.quantites.length !== c.lignes.length) b.quantites = c.lignes.map((l) => entier(l.quantite));
    return `<div class="ec" data-ec-ref="${esc(c.reference)}">
      ${c.lignes
        .map((l, i) => {
          const stock = opts.stock ? opts.stock(l.produit) : null;
          return `<div class="ec-q">${opts.illu ? opts.illu(l.produit) : ''}<span class="ec-p">${esc(l.produit)}</span>
          <span class="ec-cmd">commandé : ${entier(l.quantite)}${stock != null ? ` · reste en stock : ${stock}` : ''}</span>
          <div class="ec-pas${b.quantites[i] !== entier(l.quantite) ? ' change' : ''}"><button type="button" data-ec-pas="${i}" data-d="-1" aria-label="Retirer un ${esc(l.produit)}">−</button><input type="number" min="0" max="${QUANTITE_MAX}" inputmode="numeric" data-ec-qte="${i}" data-origine="${entier(l.quantite)}" value="${b.quantites[i]}" aria-label="Quantité validée : ${esc(l.produit)}"><button type="button" class="plus" data-ec-pas="${i}" data-d="1" aria-label="Ajouter un ${esc(l.produit)}">+</button></div></div>`;
        })
        .join('')}
      <label class="ec-sr" for="ec-message-${esc(c.reference)}">Message pour l’équipe et la structure</label>
      <input class="input ec-message" id="ec-message-${esc(c.reference)}" data-ec-message maxlength="500" placeholder="Message (facultatif) : ex. plus que 4 PC en stock, le 5ᵉ partira avec la prochaine commande." value="${esc(b.message || '')}">
      <div class="ec-retour" data-ec-retour></div>
    </div>`;
  }
  function majPas(bloc, i) {
    const b = brouillon(bloc.dataset.ecRef);
    const champ = bloc.querySelector(`[data-ec-qte="${i}"]`);
    if (!champ) return;
    if (String(champ.value) !== String(b.quantites[i])) champ.value = b.quantites[i];
    champ.closest('.ec-pas').classList.toggle('change', b.quantites[i] !== Number(champ.dataset.origine));
  }

  /* ── Numéros de série / codes ── */
  /** c : { reference, numerosSerie (tableau) } ; o : { unites:
   *  [{ produit, nom? }] un par appareil, dans l'ordre ; sansNumero: [{ produit, quantite }] ;
   *  dematerialisee ; lecture (affichage seul) ; illu(nom) }. */
  function numeros(c, o) {
    const opts = o || {};
    const unites = opts.unites || [];
    const b = brouillon(c.reference);
    b.unites = unites;
    const serveur = c.numerosSerie || [];
    if (!b.valeurs || b.valeurs.length !== unites.length) b.valeurs = unites.map((u, i) => serveur[i] || '');
    const v = b.valeurs;
    const mot = opts.dematerialisee ? 'code' : 'numéro de série';
    const groupes = [];
    unites.forEach((u, i) => {
      const g = groupes[groupes.length - 1];
      if (g && g.produit === u.produit) g.idx.push(i);
      else groupes.push({ produit: u.produit, idx: [i] });
    });
    const saisis = v.filter((x) => String(x).trim()).length;
    const csv =
      !opts.lecture && !opts.dematerialisee && unites.length
        ? `<label class="ec-csv">Importer un CSV tec.tech<input type="file" accept=".csv,text/csv" data-ec-csv hidden></label>`
        : '';
    return `<div class="ec" data-ec-ref="${esc(c.reference)}">
      ${unites.length && !opts.lecture ? `<div class="ec-tete"><span class="ec-total${saisis === unites.length ? ' ok' : ''}" data-ec-total>${saisis} / ${unites.length}</span>${csv}</div>` : ''}
      <div class="ec-retour" data-ec-retour>${b.retour || ''}</div>
      ${groupes
        .map((g) => {
          const n = g.idx.filter((i) => String(v[i]).trim()).length;
          return `<div class="ec-groupe"><div class="ec-gt">${opts.illu ? opts.illu(g.produit) : ''}<b>${esc(g.produit)}</b><span class="ec-prog${n === g.idx.length ? ' ok' : ''}" data-ec-prog="${g.idx[0]}" data-n="${g.idx.length}">${n} / ${g.idx.length}</span></div>
          <div class="ec-sns">${g.idx
            .map((i) => {
              const nom = unites[i].nom ? `<small class="ec-nom">${esc(unites[i].nom)}</small>` : '';
              return opts.lecture
                ? `<span class="ec-sn-lu">${esc(v[i] || '—')}${nom}</span>`
                : `<label class="ec-sn${String(v[i]).trim() ? ' ok' : ''}"><span class="ec-sr">${opts.dematerialisee ? 'Code' : 'Numéro de série'} ${i + 1} (${esc(g.produit)})${unites[i].nom ? ', ' + esc(unites[i].nom) : ''}</span><input class="input" data-ec-sn="${i}" value="${esc(v[i])}" placeholder="${opts.dematerialisee ? 'Code…' : 'Scannez ou saisissez…'}" autocomplete="off" spellcheck="false">${nom}</label>`;
            })
            .join('')}</div></div>`;
        })
        .join('')}
      ${!unites.length ? `<p class="ec-aide">Rien à numéroter dans cette commande.</p>` : ''}
      ${(opts.sansNumero || []).length ? `<p class="ec-aide">Sans ${mot} : ${opts.sansNumero.map((l) => `${esc(l.produit)} × ${entier(l.quantite)}`).join(' · ')}</p>` : ''}
      ${!opts.lecture && unites.length ? `<p class="ec-aide">Entrée ou douchette = appareil suivant. Enregistré au fil de la saisie.</p>` : ''}
    </div>`;
  }
  /** Nombre de numéros saisis / attendus d'une commande (saisie en cours comprise). */
  function compteNumeros(ref) {
    const b = brouillons[ref] || {};
    const v = b.valeurs || [];
    return { saisis: v.filter((x) => String(x).trim()).length, total: v.length };
  }
  function majCompteurs(bloc) {
    const v = brouillon(bloc.dataset.ecRef).valeurs || [];
    bloc.querySelectorAll('[data-ec-prog]').forEach((el) => {
      const debut = Number(el.dataset.ecProg);
      const total = Number(el.dataset.n);
      const n = v.slice(debut, debut + total).filter((x) => String(x).trim()).length;
      el.textContent = `${n} / ${total}`;
      el.classList.toggle('ok', n === total);
    });
    const t = bloc.querySelector('[data-ec-total]');
    if (t) {
      const n = v.filter((x) => String(x).trim()).length;
      t.textContent = `${n} / ${v.length}`;
      t.classList.toggle('ok', n === v.length);
    }
  }

  /* ── Expédition ── */
  const isoDe = (fr) => {
    const m = String(fr || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  };
  /** Cartes de choix du mode de livraison. c : { reference, modeLivraison }. */
  function modes(c) {
    return `<div class="ec" data-ec-ref="${esc(c.reference)}"><div class="ml-cartes" role="radiogroup" aria-label="Mode de livraison">${MODES.map(
      (
        m,
      ) => `<button type="button" role="radio" class="ml-carte${c.modeLivraison === m.valeur ? ' choisi' : ''}" aria-checked="${c.modeLivraison === m.valeur}" data-ec-mode="${esc(m.valeur)}">
        <span class="ml-ill">${illustrationMode(m.valeur, 54)}</span>
        <b>${esc(m.label)}</b><small>${esc(m.aide)}</small>
        <span class="ml-coche" aria-hidden="true">${COCHE}</span>
      </button>`,
    ).join('')}</div><div class="ec-retour" data-ec-retour></div></div>`;
  }
  /** Liens de suivi Colissimo (un par colis), enregistrés quand on quitte le champ. */
  function colissimo(c) {
    return `<div class="ec" data-ec-ref="${esc(c.reference)}"><label class="ec-sr" for="ec-colissimo-${esc(c.reference)}">Liens de suivi Colissimo, un par colis</label><textarea class="input ec-colissimo" rows="2" id="ec-colissimo-${esc(c.reference)}" data-ec-colissimo placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code=…">${esc(c.colissimo || '')}</textarea><div class="ec-retour" data-ec-retour></div></div>`;
  }
  /** Date estimée de livraison (ou de retrait), affichée dans le suivi de la structure. */
  function dateCible(c) {
    return `<div class="ec" data-ec-ref="${esc(c.reference)}"><input type="date" class="input ec-date" data-ec-date value="${isoDe(c.dateLivraisonCible)}" aria-label="${c.modeLivraison === 'Retrait' ? 'Retrait disponible à partir du' : 'Date estimée de livraison'}"><div class="ec-retour" data-ec-retour></div></div>`;
  }

  /* ── Événements (une seule fois, pour toute la page) ── */
  let ctl = {};
  /** Branche l'enregistrement de la page : { numeros(ref, valeurs), mode(ref, valeur),
   *  colissimo(ref, valeur), date(ref, jj/mm/aaaa), classer(numeros) (tec.tech, import CSV),
   *  fiche(nom) (fiche produit, import CSV), saisie(ref) (après chaque frappe, facultatif),
   *  repeindre() } — chacune renvoie la réponse du serveur (ou une promesse). */
  function brancher(controleur) {
    ctl = controleur || {};
  }
  const blocDe = (el) => el && el.closest && el.closest('[data-ec-ref]');
  function afficherRetour(bloc, html) {
    const z = bloc && bloc.querySelector('[data-ec-retour]');
    if (z) z.innerHTML = html || '';
  }
  /** Le bloc tel qu'il est à l'écran (la page a pu se redessiner pendant l'enregistrement). */
  const actuel = (bloc) =>
    bloc.isConnected
      ? bloc
      : document.querySelector(`[data-ec-ref="${CSS.escape(bloc.dataset.ecRef)}"]:has([data-ec-sn], [data-ec-qte])`) ||
        bloc;
  async function appeler(bloc, fn, ...args) {
    if (!ctl[fn]) return null;
    const r = await ctl[fn](bloc.dataset.ecRef, ...args);
    if (r && !r.ok) {
      const detail =
        r.conflits && r.conflits.length
          ? `Déjà sur une autre commande : ${r.conflits.map((x) => `${esc(x.numeroSerie)} (${esc(x.referenceCommande)})`).join(', ')}`
          : esc(r.erreur || 'Enregistrement impossible.');
      if (fn === 'numeros') brouillon(bloc.dataset.ecRef).retour = `<div class="ec-err">${detail}</div>`;
      afficherRetour(actuel(bloc), `<div class="ec-err">${detail}</div>`);
    } else if (r && r.ok && fn === 'numeros') {
      const b = brouillon(bloc.dataset.ecRef);
      if (b.retour && /ec-err/.test(b.retour)) {
        b.retour = '';
        afficherRetour(actuel(bloc), '');
      }
    }
    return r;
  }
  const minuteurs = {};
  function enregistrerNumeros(bloc, toutDeSuite) {
    const ref = bloc.dataset.ecRef;
    clearTimeout(minuteurs[ref]);
    const go = () => appeler(bloc, 'numeros', [...brouillon(ref).valeurs]);
    if (toutDeSuite) return go();
    minuteurs[ref] = setTimeout(go, 800);
    return null;
  }

  document.addEventListener('click', (e) => {
    const pas = e.target.closest('[data-ec-pas]');
    if (pas) {
      const bloc = blocDe(pas);
      const b = brouillon(bloc.dataset.ecRef);
      const i = Number(pas.dataset.ecPas);
      b.quantites[i] = Math.max(0, Math.min(QUANTITE_MAX, (b.quantites[i] || 0) + Number(pas.dataset.d)));
      majPas(bloc, i);
      return;
    }
    const mode = e.target.closest('[data-ec-mode]');
    if (mode) {
      const bloc = blocDe(mode);
      bloc.querySelectorAll('[data-ec-mode]').forEach((x) => {
        x.classList.toggle('choisi', x === mode);
        x.setAttribute('aria-checked', String(x === mode));
      });
      appeler(bloc, 'mode', mode.dataset.ecMode);
    }
  });
  document.addEventListener('input', (e) => {
    const bloc = blocDe(e.target);
    if (!bloc) return;
    const b = brouillon(bloc.dataset.ecRef);
    if (e.target.matches('[data-ec-qte]')) {
      const i = Number(e.target.dataset.ecQte);
      const v = parseInt(e.target.value, 10);
      b.quantites[i] = Number.isFinite(v) ? Math.max(0, Math.min(QUANTITE_MAX, v)) : 0;
      majPas(bloc, i);
    } else if (e.target.matches('[data-ec-message]')) b.message = e.target.value;
    else if (e.target.matches('[data-ec-sn]')) {
      b.valeurs[Number(e.target.dataset.ecSn)] = e.target.value;
      e.target.closest('.ec-sn').classList.toggle('ok', !!e.target.value.trim());
      majCompteurs(bloc);
      if (ctl.saisie) ctl.saisie(bloc.dataset.ecRef);
      enregistrerNumeros(bloc);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('[data-ec-sn]')) return;
    e.preventDefault();
    const bloc = blocDe(e.target);
    const champs = [...bloc.querySelectorAll('[data-ec-sn]')];
    const i = champs.indexOf(e.target);
    const suivant = champs.slice(i + 1).find((x) => !x.value.trim()) || champs[i + 1];
    enregistrerNumeros(bloc, true);
    if (suivant) suivant.focus();
    else {
      const suite = document.querySelector('[data-ec-suite]');
      if (suite) suite.focus();
    }
  });
  document.addEventListener('change', (e) => {
    const bloc = blocDe(e.target);
    if (!bloc) return;
    if (e.target.matches('[data-ec-csv]')) {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) importerCsv(bloc, f);
    } else if (e.target.matches('[data-ec-colissimo]')) {
      const invalide = e.target.value
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .find((l) => !/^https?:\/\/\S+$/i.test(l));
      if (invalide)
        afficherRetour(bloc, `<div class="ec-err">« ${esc(invalide)} » n’est pas un lien http(s) valide.</div>`);
      else {
        afficherRetour(bloc, '');
        appeler(bloc, 'colissimo', e.target.value.trim());
      }
    } else if (e.target.matches('[data-ec-date]')) {
      const m = e.target.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      appeler(bloc, 'date', m ? `${m[3]}/${m[2]}/${m[1]}` : '');
    }
  });

  /** Import CSV tec.tech : chaque numéro va sur un emplacement vide du bon produit. */
  function importerCsv(bloc, fichier) {
    const ref = bloc.dataset.ecRef;
    const lecteur = new FileReader();
    lecteur.onload = async () => {
      const b = brouillon(ref);
      const appareils = window.lireCsvTecTech ? lireCsvTecTech(lecteur.result) : null;
      if (!appareils || !appareils.length) {
        b.retour = '<div class="ec-err">Aucun numéro de série trouvé dans ce CSV.</div>';
        if (ctl.repeindre) ctl.repeindre();
        return;
      }
      if (ctl.classer) await completerParTecTech(appareils, (numeros) => ctl.classer(numeros));
      const bilan = placerSeriesCsv(b.unites, b.valeurs, appareils, (nom) => (ctl.fiche ? ctl.fiche(nom) : null));
      b.valeurs = bilan.valeurs;
      const n = bilan.places.length;
      const hors = bilan.nonPlaces;
      b.retour =
        (n
          ? `<div class="ec-ok">${n} numéro${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''} sur le bon produit${bilan.lignesVides ? ` · ${bilan.lignesVides} encore à saisir` : ''}.</div>`
          : '<div class="ec-err">Aucun numéro du CSV ne correspond aux produits de la commande.</div>') +
        (hors.length
          ? `<div class="ec-warn">${hors.length} numéro${hors.length > 1 ? 's' : ''} du CSV sans place dans la commande : ${hors
              .slice(0, 8)
              .map((a) => esc(libelleNonPlace(a)))
              .join(
                ', ',
              )}${hors.length > 8 ? '…' : ''}. Vérifiez le type / la catégorie tec.tech des fiches produit.</div>`
          : '');
      if (ctl.repeindre) ctl.repeindre();
      if (n) {
        const r = await ctl.numeros(ref, [...b.valeurs]);
        if (r && !r.ok) b.retour += `<div class="ec-err">${esc(r.erreur || 'Enregistrement impossible.')}</div>`;
        if (ctl.repeindre) ctl.repeindre();
      }
    };
    lecteur.readAsText(fichier);
  }

  return {
    MODES,
    illustrationMode,
    libelleMode,
    quantites,
    numeros,
    compteNumeros,
    modes,
    colissimo,
    dateCible,
    lire,
    oublier,
    brancher,
  };
})();
