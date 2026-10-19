/* ════════════════════════════════════════════════════════════════════════════════════
   support-commandes.js — partie « Commandes » de l'espace Logistique (support.html), branchée
   par support.js. Les commandes du circuit CVDL :
   · À valider (Reçue) : quantités vérifiées (+ / −), message facultatif, « Valider » ;
   · À préparer (Validée) : un numéro de série par appareil (douchette, saisie ou CSV
     tec.tech), enregistré au fil de la saisie, puis « Marquer préparée » quand tout est prêt
     (devis ou facture : côté équipe) ;
   · À expédier (Préparée) : mode de livraison, suivi Colissimo, date estimée, puis « Passer
     en livraison » ; une commande de codes (sans envoi) est remise directement ;
   · En livraison : date de livraison, question du programme de distribution, « Marquer
     livrée » (mêmes règles que la fiche admin).
   Les étapes elles-mêmes (affichage, saisie, contrôles) sont celles de la fiche commande de
   l'admin : etapes-commande.js. La notification e-mail d'une nouvelle commande ouvre
   support.html#commande=<référence>. Aucune donnée personnelle : ni personnes accompagnées,
   ni commentaire de la structure.
   ════════════════════════════════════════════════════════════════════════════════════ */
window.SupportCommandes = {
  creer(ctx) {
    const { api, esc, etat, svg, S } = ctx;
    const EC = window.EtapesCommande;
    const C = {
      commandes: [],
      produits: {},
      charge: false,
      erreur: '',
      ouverte: null, // référence affichée
    };
    const FILES = [
      { k: 'cmd:recue', l: 'À valider', statut: 'Reçue' },
      { k: 'cmd:validee', l: 'À préparer', statut: 'Validée' },
      { k: 'cmd:preparee', l: 'À expédier', statut: 'Préparée' },
      { k: 'cmd:livraison', l: 'En livraison', statut: 'En cours de livraison' },
    ];
    const COULEURS = { Reçue: '#E62460', Validée: '#00A3A8', Préparée: '#1F9D55', 'En cours de livraison': '#7A4FB5' };
    const ICONES = {
      'cmd:recue': '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M4 13 6.5 5h11L20 13v6H4z"/>',
      'cmd:validee': '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
      'cmd:preparee':
        '<rect x="2.5" y="7" width="12" height="9" rx="1.5"/><path d="M14.5 10h4l3 3.5V16h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
      'cmd:livraison':
        '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    };
    const estFile = (k) => /^cmd:/.test(String(k || ''));
    const fileDe = (statut) => (FILES.find((f) => f.statut === statut) || FILES[0]).k;
    const deFile = (k) => C.commandes.filter((c) => c.statut === (FILES.find((f) => f.k === k) || {}).statut);
    const commande = (ref) => C.commandes.find((c) => c.reference === ref) || null;
    const nbAppareils = (c) => c.lignes.reduce((t, l) => t + l.quantite, 0);
    const pastille = (statut) =>
      `<span class="sp-st" style="--c:${COULEURS[statut] || '#8FA3B3'}"><i></i>${esc({ Reçue: 'À valider', Validée: 'À préparer', Préparée: 'À expédier', 'En cours de livraison': 'En livraison' }[statut] || statut)}</span>`;
    const illu = (nom, taille) =>
      window.illustrationCvdl && window.cleIllustrationProduit
        ? window.illustrationCvdl(window.cleIllustrationProduit(nom, (C.produits[nom] || {}).icone), taille || 30)
        : '';
    const quand = (iso) => {
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleDateString('fr-FR');
    };
    const souhait = (c) =>
      c.dateLivraisonSouhaitee === 'ASAP' ? 'au plus vite' : c.dateLivraisonSouhaitee || c.dateLivraisonCible || '';
    const sansNumero = (nom) => !!(C.produits[nom] || {}).sansNumeroSerie;
    /** Appareils à numéroter, dans l'ordre de la commande : [{ produit }]. */
    const unites = (c) =>
      c.lignes.flatMap((l) =>
        sansNumero(l.produit) ? [] : Array.from({ length: l.quantite }, () => ({ produit: l.produit })),
      );
    /** Mode choisi et, pour Colissimo, au moins un lien de suivi (même règle que le serveur). */
    const pretAPartir = (c) =>
      c.livraisonSansEnvoi || (!!c.modeLivraison && (c.modeLivraison !== 'Colissimo' || !!c.colissimo.trim()));

    /* ── Données ── */
    async function charger() {
      const r = await api('logistique-commandes', {}, true);
      if (r.ok) {
        C.commandes = r.commandes;
        C.produits = r.produits || {};
        C.charge = true;
        C.erreur = '';
        EC.oublier(); // saisies en cours : on repart du serveur, sauf le champ en cours de frappe
      } else if (!C.charge) C.erreur = r.erreur || 'Commandes indisponibles pour le moment.';
    }

    /** Ouvre la commande de l'adresse (#commande=CVDL-…), lien de l'e-mail de notification. */
    function ouvrirDepuisAdresse() {
      const m = location.hash.match(/^#commande=(.+)$/);
      if (!m) return false;
      const ref = decodeURIComponent(m[1]);
      const c = commande(ref);
      history.replaceState(null, '', location.pathname + location.search);
      if (!c) {
        etat(`${ref} n’est plus dans l’espace logistique (déjà expédiée, livrée ou annulée).`, 'erreur');
        return false;
      }
      S.file = fileDe(c.statut);
      C.ouverte = ref;
      return true;
    }
    /** File d'ouverture : les commandes à valider s'il y en a, sinon à préparer, sinon à expédier. */
    const fileDeDepart = () => (FILES.find((f) => deFile(f.k).length) || { k: '' }).k;

    /* ── Rendu ── */
    function nav(lienNav) {
      return FILES.map((f) =>
        lienNav(f.k, f.l, deFile(f.k).length, { icone: ICONES[f.k], badge: f.k === 'cmd:recue' }),
      ).join('');
    }
    /** Commandes qui contiennent le texte cherché (référence, structure, numéro de série, produit). */
    const trouvees = (texte) => {
      const q = String(texte || '')
        .trim()
        .toLowerCase();
      return C.commandes.filter((c) =>
        `${c.reference} ${c.structure} ${c.numerosSerie.join(' ')} ${c.lignes.map((x) => x.produit).join(' ')}`
          .toLowerCase()
          .includes(q),
      );
    };
    function filtrees() {
      const l = S.recherche.trim() ? trouvees(S.recherche) : deFile(S.file);
      const ancien = !S.recherche.trim();
      return [...l].sort((a, b) => (ancien ? 1 : -1) * (new Date(a.recueLe) - new Date(b.recueLe)));
    }
    function liste(recherche) {
      const l = filtrees();
      const f = FILES.find((x) => x.k === S.file) || FILES[0];
      const titre = recherche ? 'Commandes' : f.l;
      return (
        `<div class="sp-lt"><h2>${esc(titre)} <span>${l.length}</span></h2><small>${!recherche ? 'Plus anciennes d’abord' : 'Plus récentes d’abord'}</small></div>` +
        (l.length
          ? l
              .map((c) => {
                const n = nbAppareils(c);
                const s = souhait(c);
                const saisis = c.numerosSerie.filter((x) => String(x).trim()).length;
                const suite =
                  c.statut === 'Validée'
                    ? `<span class="lc-prog${saisis === c.requis ? ' ok' : ''}">${c.dematerialisee ? 'Codes' : 'Numéros'} ${saisis} / ${c.requis}</span>`
                    : c.statut === 'Préparée' && !c.dematerialisee
                      ? `<span class="lc-prog${pretAPartir(c) ? ' ok' : ''}">${esc(c.modeLivraison ? EC.libelleMode(c.modeLivraison) : 'Mode à choisir')}</span>`
                      : c.statut === 'En cours de livraison'
                        ? `<span class="lc-prog">${esc(EC.libelleMode(c.modeLivraison) || 'En route')}${c.dateLivraisonCible ? ` · ${esc(c.dateLivraisonCible)}` : ''}</span>`
                        : c.statut === 'Préparée' && c.dematerialisee
                          ? '<span class="lc-prog">Codes à remettre</span>'
                          : '';
                return `<button type="button" class="sp-tk lc-tk${C.ouverte === c.reference ? ' on' : ''}" data-cmd="${esc(c.reference)}">
          <span class="sp-tk-h">${pastille(c.statut)}${c.dateLivraisonSouhaitee === 'ASAP' ? '<span class="sp-sla">Au plus vite</span>' : ''}${c.homogene ? '<span class="sp-sla sp-homogene">Même modèle</span>' : ''}<span class="sp-d">${esc(quand(c.recueLe))}</span></span>
          <span class="sp-tk-t"><span>${esc(c.structure)}</span></span>
          <span class="sp-tk-m">${esc(c.reference)} · ${n} article${n > 1 ? 's' : ''} · ${c.lignes.length} produit${c.lignes.length > 1 ? 's' : ''}</span>
          <span class="sp-tk-b"><span class="sp-tk-app">${s && c.dateLivraisonSouhaitee !== 'ASAP' ? `Livraison ${esc(s)}` : ''}</span>${suite}</span></button>`;
              })
              .join('')
          : `<p class="sp-vide">${C.charge ? (recherche ? 'Aucune commande ne correspond.' : 'Rien ici pour le moment.') : C.erreur ? esc(C.erreur) : 'Chargement…'}</p>`)
      );
    }

    function accueil() {
      const n = (k) => deFile(k).length;
      return `<div class="sp-accueil"><span data-ill="commandes" class="ill"></span><b>Choisissez une commande</b><p>${C.charge ? `${n('cmd:recue')} à valider, ${n('cmd:validee')} à préparer, ${n('cmd:preparee')} à expédier, ${n('cmd:livraison')} en livraison.` : C.erreur ? esc(C.erreur) : 'Chargement…'}</p></div>`;
    }
    function tete(c) {
      const s = souhait(c);
      return `<div class="sp-tete lc-tete">
        <button type="button" class="sp-retour" data-lc="fermer" aria-label="Retour à la liste">←</button>
        <span class="sp-ill lc-ill"><span data-ill="commandes" class="ill"></span></span>
        <div class="sp-conv-titre"><div class="sp-s"><b>${esc(c.reference)}</b> · reçue le ${esc(quand(c.recueLe))}</div><h2>${esc(c.structure)}</h2>
        <div class="sp-s">${[s ? `Livraison souhaitée : ${esc(s)}` : '', esc(c.adresse)].filter(Boolean).join(' · ')}</div></div>
        ${pastille(c.statut)}
      </div>`;
    }
    const COCHE = '<path d="m5 12.5 4.5 4.5L19 7.5"/>';
    const etape = (n, titre, etatEtape, aide) =>
      `<div class="lc-h"><i class="lc-n ${etatEtape}">${etatEtape === 'fait' ? svg(COCHE, 14) : n}</i><b>${esc(titre)}</b>${aide ? `<small>${esc(aide)}</small>` : ''}</div>`;
    const noteAjustement = (c) =>
      c.note && (c.note.changements.length || c.note.message)
        ? `<p class="lc-note">${c.note.changements.map((ch) => `${esc(ch.produit)} : <s>${ch.ancienne}</s> → <b>${ch.nouvelle}</b>`).join(' · ')}${c.note.message ? `${c.note.changements.length ? ' — ' : ''}« ${esc(c.note.message)} »` : ''}</p>`
        : '';

    function blocQuantites(c) {
      if (c.statut !== 'Reçue') {
        const n = nbAppareils(c);
        return `<section class="lc-carte fait">${etape(1, 'Quantités validées', 'fait', `${n} article${n > 1 ? 's' : ''}`)}${noteAjustement(c)}</section>`;
      }
      return `<section class="lc-carte actif">${etape(1, 'Quantités à valider', 'actif', 'Modifiez si le stock ne suit pas.')}
        ${EC.quantites(c, { illu: (nom) => illu(nom, 28), stock: (nom) => (C.produits[nom] || {}).stock ?? null })}
        <div class="lc-pied"><span class="lc-aide">L’équipe voit les quantités ajustées et votre message.</span><button type="button" class="btn btn-primary" data-lc="valider" data-ec-suite>✓ Valider les quantités</button></div>
      </section>`;
    }

    function blocNumeros(c) {
      const mot = c.dematerialisee ? 'Codes' : 'Numéros de série';
      if (c.statut === 'Reçue')
        return `<section class="lc-carte attente">${etape(2, mot, 'attente', 'Après la validation des quantités.')}</section>`;
      const lecture = c.statut !== 'Validée';
      const u = unites(c);
      const editeur = EC.numeros(c, {
        unites: u,
        sansNumero: c.lignes.filter((l) => sansNumero(l.produit)),
        dematerialisee: c.dematerialisee,
        lecture,
        illu: (nom) => illu(nom, 26),
      });
      const fait = c.numerosSerie.filter((x) => String(x).trim()).length;
      return `<section class="lc-carte ${lecture ? 'fait' : 'actif'}">${etape(2, mot, lecture ? 'fait' : 'actif', lecture ? `${fait} / ${u.length}` : '')}
        ${editeur}
        ${lecture ? '' : piedPreparation(c)}
      </section>`;
    }
    /** Ce qui manque avant « Préparée » : numéros (ici) et devis / facture (équipe). */
    function prerequis(c) {
      const { saisis } = EC.compteNumeros(c.reference);
      return c.prerequis.map((p) =>
        p.cle === 'numerosSerie'
          ? {
              ...p,
              ok: saisis === c.requis,
              libelle: `${saisis} / ${c.requis} ${c.dematerialisee ? 'codes' : 'numéros de série'}`,
            }
          : p,
      );
    }
    function piedPreparation(c) {
      const pr = prerequis(c);
      const pret = pr.every((p) => p.ok);
      return `<div class="lc-pied" id="lc-pied"><ul class="lc-pre">${pr
        .map(
          (p) =>
            `<li class="${p.ok ? 'ok' : ''}">${p.ok ? svg(COCHE, 14) : '<i></i>'}${esc(p.libelle)}${!p.ok && p.cle === 'devisFacture' ? ' <small>(à faire par l’équipe dans l’admin)</small>' : ''}</li>`,
        )
        .join(
          '',
        )}</ul><button type="button" class="btn btn-primary" data-lc="preparer" data-ec-suite ${pret ? '' : 'disabled'}>Marquer préparée</button></div>`;
    }
    /** Date de livraison (jamais dans le futur), question du programme, bouton final. */
    function formulaireLivraison(c, libelleDate, bouton) {
      const auj = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const progs = c.programmes || [];
      const choix = progs
        .map(
          (p) =>
            `<label class="lc-choix"><input type="radio" name="lc-programme" value="${esc(p.id)}"><span><b>Oui : ${esc(p.nom)}</b><small>compte ${Object.entries(
              p.compte,
            )
              .map(([pr, q]) => `${q} × ${esc(pr)}`)
              .join(' · ')}</small></span></label>`,
        )
        .join('');
      return `<div class="lc-sous"><label for="lc-date-${esc(c.reference)}"><b>${esc(libelleDate)}</b></label><input type="date" class="input ec-date" id="lc-date-${esc(c.reference)}" data-lc-date value="${auj}" max="${auj}"></div>
        ${
          progs.length
            ? `<fieldset class="lc-sous lc-programmes"><legend><b>Programme de distribution ?</b></legend><small>Cette commande correspond à ${progs.length > 1 ? `${progs.length} programmes en cours` : 'un programme en cours'} : ses produits s’ajoutent à son « livré ».</small>${choix}<label class="lc-choix"><input type="radio" name="lc-programme" value="NON"><span><b>Non</b><small>aucun programme pour cette commande</small></span></label></fieldset>`
            : ''
        }
        <div class="lc-pied"><span class="lc-aide">La structure voit la commande livrée ; les appareils arrivent dans sa flotte.</span><button type="button" class="btn btn-primary" data-lc="livrer">${esc(bouton)}</button></div>`;
    }
    function blocExpedition(c) {
      if (c.statut === 'Reçue' || c.statut === 'Validée')
        return `<section class="lc-carte attente">${etape(3, 'Expédition', 'attente', 'Mode de livraison, suivi Colissimo, date estimée : une fois la commande préparée.')}</section>`;
      if (c.dematerialisee)
        return `<section class="lc-carte actif">${etape(3, 'Remise des codes', 'actif', 'Pas d’envoi physique : les codes sont remis directement à la structure.')}
          ${formulaireLivraison(c, 'Date de remise', 'Marquer remise')}</section>`;
      if (c.statut === 'En cours de livraison') {
        const liens = c.colissimo.split('\n').filter((l) => l.trim());
        const resume = [
          EC.libelleMode(c.modeLivraison),
          c.dateLivraisonCible ? `prévue le ${c.dateLivraisonCible}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return `<section class="lc-carte fait">${etape(3, 'Expédiée', 'fait', resume)}
          ${liens.length ? `<p class="lc-aide">${liens.map((l, i) => `<a href="${esc(/^https?:\/\//i.test(l) ? l : '#')}" target="_blank" rel="noopener">Suivi Colissimo${liens.length > 1 ? ` ${i + 1}` : ''} ↗</a>`).join(' · ')}</p>` : ''}</section>
          <section class="lc-carte actif">${etape(4, 'Livraison', 'actif', 'Quand la structure a reçu la commande.')}
          ${formulaireLivraison(c, c.modeLivraison === 'Retrait' ? 'Retirée le' : 'Livrée le', 'Marquer livrée')}</section>`;
      }
      const mode = c.modeLivraison;
      return `<section class="lc-carte actif">${etape(3, 'Expédition', 'actif', 'Enregistré au fil de la saisie. La structure voit le mode et le suivi une fois la commande en livraison.')}
        <div class="lc-sous"><b>Mode de livraison</b>${EC.modes(c)}</div>
        ${mode === 'Colissimo' ? `<div class="lc-sous"><b>Suivi Colissimo</b><small>Un lien par colis.</small>${EC.colissimo(c)}</div>` : ''}
        ${mode ? `<div class="lc-sous"><b>${mode === 'Retrait' ? 'Retrait disponible à partir du' : 'Date estimée de livraison'}</b><small>Facultatif · affichée dans le suivi de la structure.</small>${EC.dateCible(c)}</div>` : ''}
        <div class="lc-pied"><span class="lc-aide">${pretAPartir(c) ? 'Tout est prêt.' : mode === 'Colissimo' ? 'Il manque le lien de suivi Colissimo.' : 'Choisissez le mode de livraison.'}</span><button type="button" class="btn btn-primary" data-lc="expedier" ${pretAPartir(c) ? '' : 'disabled'}>Passer en livraison</button></div>
      </section>`;
    }

    function detail(d) {
      const c = commande(C.ouverte);
      document.body.classList.toggle('sp-ticket-ouvert', !!c);
      if (!c || (!S.recherche && c.statut !== (FILES.find((f) => f.k === S.file) || {}).statut)) {
        if (c && !S.recherche) C.ouverte = null;
        d.innerHTML = accueil();
        ctx.illustrer(d);
        return;
      }
      // Commande d'une Interne : raison, structure concernée, même modèle à respecter.
      const consigne = c.destinationResume
        ? `<div class="lc-destination${c.homogene ? ' lc-homogene' : ''}"><b>${c.homogene ? 'Même modèle pour tous les ordinateurs' : 'Pour l’Interne'}</b><span>${esc(c.destinationResume)}</span></div>`
        : '';
      d.innerHTML = `<div class="sp-ouvert lc-ouvert">${tete(c)}${consigne}${blocQuantites(c)}${blocNumeros(c)}${blocExpedition(c)}</div>`;
      ctx.illustrer(d);
    }

    /* ── Enregistrement des étapes (etapes-commande.js) ── */
    async function expedition(ref, champ, valeur) {
      const c = commande(ref);
      if (!c) return { ok: false, erreur: 'Commande introuvable : rechargez.' };
      const r = await api('logistique-expedition', { id: c.id, champ, valeur }, true);
      if (r.ok) {
        c[champ] = r.valeur;
        etat('Enregistré', 'succes');
        ctx.peindreDetail();
        ctx.peindreListe();
      }
      return r;
    }
    EC.brancher({
      async numeros(ref, valeurs) {
        const c = commande(ref);
        if (!c || c.statut !== 'Validée') return { ok: true };
        const r = await api('logistique-series', { id: c.id, numeros: valeurs }, true);
        if (r.ok) {
          c.numerosSerie = valeurs.map((x) => String(x).trim());
          if (r.saisis === r.requis && r.requis) etat('Tous les numéros sont enregistrés', 'succes');
          ctx.peindreListe();
        }
        return r;
      },
      saisie(ref) {
        const c = commande(ref);
        const pied = document.getElementById('lc-pied');
        if (c && pied) pied.outerHTML = piedPreparation(c);
      },
      mode: (ref, valeur) => expedition(ref, 'modeLivraison', valeur),
      colissimo: (ref, valeur) => expedition(ref, 'colissimo', valeur),
      date: (ref, valeur) => expedition(ref, 'dateLivraisonCible', valeur),
      classer: (numeros) => api('tectech-classer-series', { numeros }, true),
      fiche: (nom) => C.produits[nom],
      repeindre: () => ctx.peindreDetail(),
    });

    /* ── Actions ── */
    async function valider(c) {
      const { quantites, message } = EC.lire(c.reference);
      const r = await api('logistique-valider', {
        id: c.id,
        quantites: quantites || c.lignes.map((l) => l.quantite),
        message,
      });
      if (!r.ok) return;
      EC.oublier(c.reference);
      etat('Quantités validées : place aux numéros de série', 'succes');
      await charger();
      S.file = 'cmd:validee';
      ctx.peindre();
      const premier = document.querySelector('[data-ec-sn]');
      if (premier) premier.focus();
    }
    async function preparer(c) {
      const { valeurs } = EC.lire(c.reference);
      if (valeurs) {
        const rs = await api('logistique-series', { id: c.id, numeros: valeurs });
        if (!rs.ok) return;
      }
      const r = await api('logistique-preparer', { id: c.id });
      if (!r.ok) return;
      etat('Commande préparée : place à l’expédition', 'succes');
      await charger();
      S.file = 'cmd:preparee';
      ctx.peindre();
    }
    async function livrer(c) {
      const date = (document.querySelector('[data-lc-date]') || {}).value || '';
      const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const choix = document.querySelector('input[name="lc-programme"]:checked');
      if ((c.programmes || []).length && !choix) {
        etat('Répondez à la question « programme de distribution ? »', 'erreur');
        return;
      }
      const r = await api('logistique-livrer', {
        id: c.id,
        date: m ? `${m[3]}/${m[2]}/${m[1]}` : '',
        programme: choix ? choix.value : '',
      });
      if (!r.ok) return;
      etat(c.dematerialisee ? 'Codes remis : commande terminée' : 'Commande livrée', 'succes');
      C.ouverte = null;
      await charger();
      ctx.peindre();
    }
    async function expedier(c) {
      if (
        !confirm(
          'Passer la commande « En livraison » ?\n\nLa structure voit alors le mode de livraison et le suivi dans son espace.',
        )
      )
        return;
      const r = await api('logistique-expedier', { id: c.id });
      if (!r.ok) return;
      etat('Commande en livraison', 'succes');
      await charger();
      S.file = 'cmd:livraison';
      ctx.peindre();
    }

    function clic(e) {
      const t = e.target.closest('[data-cmd]');
      if (t) {
        C.ouverte = t.dataset.cmd;
        ctx.peindre();
        return true;
      }
      const a = e.target.closest('[data-lc]');
      if (!a) return false;
      const c = commande(C.ouverte);
      if (a.dataset.lc === 'fermer') {
        C.ouverte = null;
        ctx.peindre();
      }
      if (c && a.dataset.lc === 'valider') valider(c);
      if (c && a.dataset.lc === 'preparer') preparer(c);
      if (c && a.dataset.lc === 'expedier') expedier(c);
      if (c && a.dataset.lc === 'livrer') livrer(c);
      return true;
    }

    return {
      estFile,
      charger,
      ouvrirDepuisAdresse,
      fileDeDepart,
      nav,
      liste,
      detail,
      clic,
      compte: (k) => deFile(k).length,
      trouvees: (texte) => trouvees(texte).length,
      ouverte: () => C.ouverte,
    };
  },
};
