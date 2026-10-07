/* ════════════════════════════════════════════════════════════════════════════════════
   embarquement.js — présentation plein écran à la première connexion d'une structure.
   · Contenu selon le type (Interne, ESN, Vente solidaire, Relais Numérique, Projets) et le rôle
     (conseiller·ère d'une Interne), + une étape « Dépôt-vente » si la structure l'a ;
   · dernier écran : plateforme en test (Centre-Val de Loire), invitation à donner son avis ;
   · transition : l'illustration rejoint celle de l'en-tête, le fond se referme sur elle, puis
     les blocs de la page arrivent un par un (fondu simple si animations réduites).
   · Mémoire : côté serveur pour le code structure (action embarquement-vu, une fois par
     structure) ; par appareil pour les conseillers ; à chaque entrée de vue en démo.
   Styles : embarquement.css. Illustrations : portail-ui.js (data-ill). Aucune dépendance.

   const emb = CvdlEmbarquement.preparer(reponseCheck, code, { api, forcer });
   if(emb){ emb.afficher(pretPromesse); await emb.termine; }
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const lireL = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const ecrireL = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  };
  const lireS = (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const ecrireS = (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch (e) {}
  };
  const reduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enDemo = () => {
    const dossier = location.pathname.split('/')[1] || '';
    if (/demo/i.test(dossier) && !/\.html$/i.test(dossier)) return true;
    try {
      const d = JSON.parse(localStorage.getItem('cvdl-mode-demo') || 'null');
      return !!(d && d.jusqua > Date.now());
    } catch (e) {
      return false;
    }
  };
  const FLECHE =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ── Libellés des types (référentiel : Interne, ESN, Vente solidaire, Relais Numérique) ── */
  const LIBELLES = {
    interne: 'Structure Interne',
    esn: 'ESN',
    bo: 'Vente solidaire',
    rn: 'Relais Numérique',
    projets: 'Projets',
    standard: 'Structure partenaire',
  };
  const STATUTS = ['Reçue', 'Validée', 'Préparée', 'En livraison', 'Livrée'];

  /* ── Étapes communes ── */
  const SAV = {
    ill: 'panne',
    sur: 'Réparer',
    titre: 'Un appareil en panne ?',
    texte:
      'Signalez-le depuis votre espace : on vous propose d’abord quelques vérifications rapides, puis notre équipe prend le relais.',
    points: ['Le suivi de la réparation étape par étape', 'Les échanges avec notre équipe au même endroit'],
  };
  const suivi = (texte, parcours) => ({
    ill: 'commandes',
    sur: 'Suivre',
    titre: 'Chaque commande, pas à pas',
    texte,
    parcours: parcours || STATUTS,
    points: ['Un e-mail de confirmation à l’enregistrement', 'Les numéros de série et les documents dans le suivi'],
  });

  /* ── Étapes par type ── */
  function etapesType(type, ctx) {
    switch (type) {
      case 'interne':
        return [
          {
            ill: 'commander',
            sur: 'Commander',
            titre: 'Le matériel de votre territoire',
            texte: 'Ordinateurs, tablettes et smartphones reconditionnés, sans paiement ni prix affiché.',
            points: ['Plusieurs appareils dans une même commande', 'Une date de livraison souhaitée si besoin'],
          },
          suivi('Votre commande est validée, préparée puis livrée. Vous voyez où elle en est à tout moment.'),
          {
            ill: 'flotte',
            sur: 'Votre flotte',
            titre: 'Tout votre matériel au même endroit',
            texte: 'Chaque appareil reçu arrive dans votre flotte : à qui il est remis, son état, sa garantie.',
            points: [
              'Une attestation de remise en un clic',
              'Votre impact : appareils réemployés, CO₂ évité, personnes équipées',
            ],
          },
          ctx.partenairesOuverts
            ? {
                ill: 'partenairesCmd',
                sur: 'Vos partenaires',
                titre: 'Les structures qui travaillent avec vous',
                texte:
                  'Créez vos structures partenaires, validez leurs commandes et attribuez-leur des appareils de votre flotte.',
                points: [
                  'Rattachez vos remises à des projets de distribution',
                  'Donnez accès à votre équipe avec son compte Google',
                ],
              }
            : {
                ill: 'distribution',
                sur: 'Votre territoire',
                titre: 'Vos projets et votre équipe',
                texte: 'Rattachez vos remises à des projets de distribution et suivez leur avancement.',
                points: ['Donnez accès à votre équipe avec son compte Google'],
              },
        ];
      case 'esn':
        return [
          {
            ill: 'commander',
            sur: 'Commander',
            titre: 'Commander en volume',
            texte: 'Commandez en quantité, sans paiement ni prix affiché.',
            points: ['Plusieurs modèles dans une même commande'],
          },
          suivi('Votre commande est validée, préparée puis livrée. Vous voyez où elle en est à tout moment.'),
          {
            ill: 'flotte',
            sur: 'Votre flotte',
            titre: 'Le suivi de vos appareils',
            texte: 'Les appareils livrés, avec leurs numéros de série, rejoignent le tableau de suivi de votre flotte.',
            points: ['À qui chaque appareil est remis', 'Votre impact écologique et social'],
          },
        ];
      case 'bo':
        return [
          {
            ill: 'personne',
            sur: 'Commander',
            titre: 'Une commande pour une personne',
            texte:
              'Chaque commande est faite pour une personne que vous accompagnez. Le règlement se fait selon les moyens prévus pour votre structure, sans devis ni facture.',
            points: ['Le prix de chaque appareil affiché avant de valider'],
          },
          ctx.partenaire
            ? suivi(
                'Votre commande est d’abord validée par le territoire Emmaüs Connect qui vous accompagne, puis préparée et livrée.',
                ['Reçue', 'Validée par votre territoire', 'Préparée', 'En livraison', 'Livrée'],
              )
            : suivi('Votre commande est validée, préparée puis livrée. Vous voyez où elle en est à tout moment.'),
          {
            ill: 'flotte',
            sur: 'Votre matériel',
            titre: 'Les appareils remis',
            texte: 'Retrouvez les appareils remis aux personnes que vous accompagnez, avec leur garantie.',
            points: ['Votre impact : appareils réemployés, personnes équipées'],
          },
        ];
      case 'rn':
        return [
          {
            ill: 'tarifs',
            sur: 'Commander',
            titre: 'Le tarif de votre convention',
            texte:
              'Les prix affichés sont ceux de votre convention. Le règlement se fait par virement : vous recevez un devis, puis la facture.',
            points: [
              'Le prix de chaque appareil affiché avant de valider',
              'Devis et factures dans le suivi de la commande',
            ],
          },
          suivi('Votre commande est validée, préparée puis livrée. Vous voyez où elle en est à tout moment.'),
          {
            ill: 'flotte',
            sur: 'Votre flotte',
            titre: 'Le suivi de vos appareils',
            texte: 'Les appareils livrés, avec leurs numéros de série, rejoignent le tableau de suivi de votre flotte.',
            points: ['À qui chaque appareil est remis', 'Votre impact écologique et social'],
          },
        ];
      case 'projets':
        return [
          {
            ill: 'distribution',
            sur: 'Commander',
            titre: 'Commander pour votre projet',
            texte: 'Des commandes importantes, rattachées à votre projet, avec devis et factures.',
            points: ['Devis et factures dans le suivi de la commande'],
          },
          suivi('Votre commande est validée, préparée puis livrée. Vous voyez où elle en est à tout moment.'),
          {
            ill: 'impact',
            sur: 'Votre impact',
            titre: 'Votre flotte et votre rapport d’impact',
            texte:
              'Tout le matériel livré est suivi dans votre flotte. Votre rapport d’impact est prêt à imprimer pour vos bilans.',
            points: ['Appareils réemployés, CO₂ évité, personnes équipées'],
          },
        ];
      default:
        return [
          {
            ill: 'commander',
            sur: 'Commander',
            titre: 'Commander du matériel',
            texte: 'Ordinateurs, tablettes et smartphones reconditionnés, en quelques étapes.',
          },
          suivi('Votre commande est validée, préparée puis livrée. Vous voyez où elle en est à tout moment.'),
        ];
    }
  }

  const CONSEILLER = [
    {
      ill: 'personne',
      sur: 'Remettre',
      titre: 'Remettre un appareil',
      texte: 'Dans la flotte de votre structure, attribuez un appareil à la personne que vous accompagnez.',
      points: ['L’état et la garantie de chaque appareil'],
    },
    {
      ill: 'attestations',
      sur: 'Attester',
      titre: 'L’attestation en un clic',
      texte: 'Éditez l’attestation de remise au moment de donner l’appareil, prête à imprimer ou à envoyer.',
    },
    {
      ill: 'distribution',
      sur: 'Projets',
      titre: 'Les projets de votre structure',
      texte:
        'Consultez les projets de distribution auxquels vos remises sont rattachées. Les commandes et l’équipe restent gérées par votre responsable.',
    },
  ];

  function etapeDepotVente(facturation) {
    return {
      ill: 'stock',
      sur: 'Dépôt-vente',
      titre: 'Du matériel confié en dépôt',
      texte:
        'Une partie du matériel vous est confiée en dépôt : rien à payer à la commande. Quand un appareil est vendu, déclarez-le dans votre flotte.',
      points:
        facturation === 'chaque-vente'
          ? ['Chaque vente déclarée donne lieu à une facture du prix de cession']
          : ['Le stock restant toujours visible'],
    };
  }

  /* ── Visages de l'avis rapide (mêmes dessins que retours.js) ── */
  const FOND = {
    1: 'color-mix(in srgb, #E5484D 38%, #fff)',
    2: 'color-mix(in srgb, #FECC38 55%, #fff)',
    3: 'color-mix(in srgb, #1F9D55 35%, #fff)',
  };
  const BOUCHE = { 1: 'M17 32c2.2-3 11.8-3 14 0', 2: 'M17 30.5h14', 3: 'M16.5 28c2.4 4 12.6 4 15 0' };
  const visage = (n) =>
    `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true" style="overflow:visible"><circle cx="26" cy="26" r="16" fill="${FOND[n]}"/><g fill="none" stroke="#002743" stroke-width="1.9" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="${BOUCHE[n]}"/></g><circle cx="18.5" cy="20" r="1.9" fill="#002743"/><circle cx="29.5" cy="20" r="1.9" fill="#002743"/></svg>`;

  function construireEtapes(ctx) {
    const accueil = {
      ill: 'structure',
      sur: 'Bienvenue sur CVDL',
      titre: ctx.nom ? `Bonjour, ${ctx.nom}` : 'Bienvenue',
      texte: ctx.conseiller
        ? 'Votre espace pour remettre du matériel informatique reconditionné aux personnes que vous accompagnez. Faisons-en le tour en une minute.'
        : 'Votre espace pour commander du matériel informatique reconditionné, le suivre et le faire réparer. Faisons-en le tour en deux minutes.',
      badge: ctx.conseiller ? 'Conseiller·ère numérique' : LIBELLES[ctx.type] || LIBELLES.standard,
    };
    const fin = {
      ill: 'enquete',
      sur: 'Avant de commencer',
      titre: 'Vous faites partie des premières structures',
      fin: true,
      badgeTest: true,
      texte:
        'CVDL est une <b>plateforme de distribution en test</b>, réservée pour l’instant à quelques structures en <b>Centre-Val de Loire</b>. Elle pourra être remplacée à terme par une plateforme nationale.',
      texte2:
        'Votre avis nous aide à l’améliorer : après chaque commande ou démarche, dites-nous en un clic si c’était simple. Un mot de plus est toujours bienvenu.',
    };
    let milieu = ctx.conseiller ? CONSEILLER.slice() : etapesType(ctx.type, ctx);
    if (ctx.depotVente && !ctx.conseiller) milieu.push(etapeDepotVente(ctx.facturationDepotVente));
    if (!ctx.conseiller) milieu.push(SAV);
    return [accueil, ...milieu, fin];
  }

  /* ── Rendu d'une étape ── */
  function htmlEtape(e, i, n) {
    const badge = e.badgeTest
      ? '<span class="emb-badge emb-badge-test">Version test</span>'
      : `<span class="emb-badge">${esc(e.badge || `Étape ${i + 1} sur ${n}`)}</span>`;
    const parcours = e.parcours
      ? `<ol class="emb-parcours" aria-label="Étapes d’une commande">${e.parcours.map((p) => `<li><span>${esc(p)}</span></li>`).join('')}</ol>`
      : '';
    const points =
      e.points && e.points.length
        ? `<ul class="emb-points">${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`
        : '';
    const avis = e.fin
      ? `<p>${esc(e.texte2)}</p><div class="emb-avis"><span class="emb-visages">${visage(1)}${visage(2)}${visage(3)}</span><span>« Était-ce simple ? » vous sera demandé à la fin de chaque démarche.</span></div>`
      : '';
    return {
      ill: `<div class="emb-ill"><span class="ill" data-ill="${esc(e.ill)}"></span>${badge}</div>`,
      txt: `<div class="emb-txt"><span class="emb-sur">${esc(e.sur)}</span><h1 id="emb-titre" tabindex="-1">${esc(e.titre)}</h1>
        <p>${e.fin ? e.texte : esc(e.texte)}</p>${parcours}${points}${avis}</div>`,
    };
  }

  /* ── Préparation : null si rien à montrer ── */
  function preparer(r, code, opts) {
    opts = opts || {};
    if (!r || !r.ok) return null;
    const conseiller = r.role === 'conseiller';
    const demo = enDemo();
    const cleLocale = 'cvdl-embarquement-v1-' + (conseiller ? 'c-' + (r.nom || '') : code);
    if (!opts.forcer) {
      if (demo) {
        if (lireS('cvdl-embarquement-session') === code) return null;
      } else if (conseiller) {
        if (lireL(cleLocale) === 'vu') return null;
      } else if (r.embarquementAFaire === false || lireL(cleLocale) === 'vu') return null;
    }
    const p = r.politique || {};
    const ctx = {
      nom: r.nom || '',
      conseiller,
      type: p.type || 'standard',
      partenaire: !!r.structurePartenaireDe,
      partenairesOuverts: !!(r.perimetre && r.perimetre.partenaires),
      depotVente: !!(p.depotVente && p.depotVente.actif),
      facturationDepotVente: p.depotVente && p.depotVente.facturation,
    };
    const etapes = construireEtapes(ctx);
    let fini;
    const termine = new Promise((res) => {
      fini = res;
    });

    function memoriser() {
      if (opts.forcer) return;
      if (demo) {
        ecrireS('cvdl-embarquement-session', code);
        return;
      }
      ecrireL(cleLocale, 'vu'); // filet si le serveur ne répond pas : pas de nouvel affichage sur cet appareil
      if (!conseiller && opts.api) {
        fetch(opts.api, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'embarquement-vu', code }),
        }).catch(() => {});
      }
    }

    function afficher(pret) {
      pret = pret || Promise.resolve();
      let i = 0,
        occupe = false;
      const racine = document.createElement('div');
      racine.className = 'emb';
      racine.setAttribute('role', 'dialog');
      racine.setAttribute('aria-modal', 'true');
      racine.setAttribute('aria-labelledby', 'emb-titre');
      racine.innerHTML = `
        <div class="emb-haut"><img src="logo.png" alt="Emmaüs Connect" class="emb-logo">
          <span class="emb-pil">${esc(ctx.nom)}${ctx.nom ? ' · ' : ''}${esc(etapes[0].badge)}</span>
          <button type="button" class="emb-passer" data-emb="passer">Passer la présentation</button></div>
        <div class="emb-scene"><div class="emb-cote-ill"></div><div class="emb-cote-txt" aria-live="polite"></div></div>
        <div class="emb-bas"><div class="emb-pts" aria-hidden="true">${etapes.map(() => '<i></i>').join('')}</div>
          <div class="emb-actions"><button type="button" class="btn emb-btn" data-emb="retour">Retour</button>
          <button type="button" class="btn btn-primary emb-btn" data-emb="suivant"></button></div></div>`;
      document.body.appendChild(racine);
      document.documentElement.classList.add('emb-ouvert');
      const $ = (s) => racine.querySelector(s);

      function montrer(n, sens) {
        i = n;
        const h = htmlEtape(etapes[i], i, etapes.length);
        const ill = $('.emb-cote-ill'),
          txt = $('.emb-cote-txt');
        ill.innerHTML = h.ill;
        txt.innerHTML = h.txt;
        if (window.portailIllustrations) window.portailIllustrations(racine);
        if (!reduit()) {
          ill.firstElementChild.animate(
            [
              { opacity: 0, transform: 'scale(.9) rotate(-2deg)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1.2)' },
          );
          txt.firstElementChild.animate(
            [
              { opacity: 0, transform: `translateX(${sens < 0 ? -28 : 28}px)` },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 320, easing: 'ease-out' },
          );
        }
        racine.querySelectorAll('.emb-pts i').forEach((p, k) => p.classList.toggle('on', k === i));
        $('[data-emb="retour"]').style.visibility = i === 0 ? 'hidden' : '';
        const dernier = i === etapes.length - 1;
        $('[data-emb="suivant"]').innerHTML =
          (dernier ? 'Découvrir mon espace ' : i === 0 ? 'C’est parti ' : 'Suivant ') + FLECHE;
        $('[data-emb="passer"]').hidden = dernier;
        const t = $('#emb-titre');
        if (t) t.focus({ preventScroll: true });
      }

      async function terminer() {
        if (occupe) return;
        occupe = true;
        memoriser();
        const b = $('[data-emb="suivant"]');
        b.setAttribute('aria-busy', 'true');
        await pret.catch(() => {});
        b.removeAttribute('aria-busy');
        document.removeEventListener('keydown', clavier, true);
        await transition(racine);
        document.documentElement.classList.remove('emb-ouvert');
        fini();
        // Présentation suivie jusqu'au bout : avis rapide (retours.js).
        if (i === etapes.length - 1 && window.CvdlRetours)
          setTimeout(
            () =>
              CvdlRetours.proposerAvis({
                parcours: 'embarquement',
                question: 'Cette présentation était-elle claire ?',
              }),
            900,
          );
      }

      function clavier(e) {
        if (occupe) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          terminer();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (i < etapes.length - 1) montrer(i + 1, 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (i > 0) montrer(i - 1, -1);
        } else if (e.key === 'Tab') {
          // focus gardé dans la présentation
          const f = [...racine.querySelectorAll('button:not([hidden])')].filter((x) => x.style.visibility !== 'hidden');
          const k = f.indexOf(document.activeElement);
          if (e.shiftKey && k <= 0) {
            e.preventDefault();
            f[f.length - 1].focus();
          } else if (!e.shiftKey && k === f.length - 1) {
            e.preventDefault();
            f[0].focus();
          }
        }
      }
      document.addEventListener('keydown', clavier, true);
      racine.addEventListener('click', (e) => {
        const b = e.target.closest('[data-emb]');
        if (!b || occupe) return;
        if (b.dataset.emb === 'passer') terminer();
        else if (b.dataset.emb === 'retour' && i > 0) montrer(i - 1, -1);
        else if (b.dataset.emb === 'suivant') i < etapes.length - 1 ? montrer(i + 1, 1) : terminer();
      });
      // Glisser du doigt (mobile)
      let x0 = null;
      racine.addEventListener(
        'touchstart',
        (e) => {
          x0 = e.touches[0].clientX;
        },
        { passive: true },
      );
      racine.addEventListener('touchend', (e) => {
        if (x0 == null || occupe) return;
        const dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (dx < -60 && i < etapes.length - 1) montrer(i + 1, 1);
        else if (dx > 60 && i > 0) montrer(i - 1, -1);
      });
      montrer(0, 1);
      if (!reduit()) racine.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    }

    return { afficher, termine };
  }

  /* ── Transition vers la page structure ── */
  function transition(racine) {
    const page = document.getElementById('etape-portail');
    const fin = () => {
      racine.remove();
      if (page) page.classList.remove('emb-arrivee');
    };
    if (reduit()) {
      return racine.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).finished.then(fin, fin);
    }
    const carte = racine.querySelector('.emb-ill');
    const cible = document.querySelector('.ps-titre .ill') || document.querySelector('.ps-titre');
    const r0 = carte.getBoundingClientRect();
    const r1 = cible ? cible.getBoundingClientRect() : { left: innerWidth / 2, top: 80, width: 0, height: 0 };
    const cx = r1.left + r1.width / 2,
      cy = r1.top + r1.height / 2;
    // 1) le texte et les boutons s'effacent ; la carte sort du voile pour voler seule.
    racine
      .querySelectorAll('.emb-cote-txt, .emb-bas, .emb-haut')
      .forEach((el) =>
        el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 220, fill: 'forwards' }),
      );
    const vol = carte.cloneNode(true);
    vol.classList.add('emb-vol');
    Object.assign(vol.style, {
      left: r0.left + 'px',
      top: r0.top + 'px',
      width: r0.width + 'px',
      height: r0.height + 'px',
    });
    document.body.appendChild(vol);
    carte.style.visibility = 'hidden';
    const echelle = Math.max(r1.width, 40) / r0.width;
    const dx = cx - (r0.left + r0.width / 2),
      dy = cy - (r0.top + r0.height / 2);
    const aVol = vol.animate(
      [
        { transform: 'none', borderRadius: '32px' },
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 40}px) scale(${(1 + echelle) / 2}) rotate(-6deg)`,
          offset: 0.55,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${echelle})`, borderRadius: '50%', opacity: 0.0 },
      ],
      { duration: 900, delay: 120, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' },
    );
    // 2) le fond se referme en cercle sur l'illustration de l'en-tête.
    const rayon = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    const aFond = racine.animate(
      [{ clipPath: `circle(${rayon}px at ${cx}px ${cy}px)` }, { clipPath: `circle(0px at ${cx}px ${cy}px)` }],
      { duration: 820, delay: 260, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' },
    );
    // 3) les blocs de la page arrivent en vague ; l'illustration de l'en-tête « reçoit » la carte.
    if (page) {
      page.classList.add('emb-arrivee');
      [...page.children]
        .filter((el) => !el.hidden)
        .forEach((el, k) =>
          el.animate(
            [
              { opacity: 0, transform: 'translateY(18px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 480, delay: 380 + k * 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
          ),
        );
    }
    if (cible)
      cible.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], {
        duration: 420,
        delay: 960,
        easing: 'ease-out',
      });
    return Promise.all([aVol.finished, aFond.finished]).then(
      () => {
        vol.remove();
        fin();
      },
      () => {
        vol.remove();
        fin();
      },
    );
  }

  window.CvdlEmbarquement = { preparer };
})();
