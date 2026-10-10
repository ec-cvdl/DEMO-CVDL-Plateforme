/* ════════════════════════════════════════════════════════════════════════════════════
   support-commandes.js — partie « Commandes » de l'espace Logistique (support.html), branchée
   par support.js. Les commandes du circuit CVDL :
   · À valider (Reçue) : la logistique vérifie les quantités (+ / −), laisse un message, valide ;
   · À préparer (Validée) : un numéro de série par appareil (douchette, saisie ou CSV tec.tech,
     mêmes règles que l'admin : tectech-csv.js), enregistré au fil de la saisie, puis
     « Marquer préparée » quand tout est prêt (devis ou facture : côté équipe) ;
   · Préparées : récapitulatif (l'expédition Colissimo viendra ici).
   La notification e-mail d'une nouvelle commande ouvre support.html#commande=<référence>.
   Aucune donnée personnelle : ni personnes accompagnées, ni commentaire de la structure.
   ════════════════════════════════════════════════════════════════════════════════════ */
window.SupportCommandes = {
  creer(ctx) {
    const { api, esc, etat, svg, S } = ctx;
    const C = {
      commandes: [],
      produits: {},
      charge: false,
      erreur: '',
      ouverte: null, // référence affichée
      quantites: {}, // référence → quantités en cours de vérification
      messages: {}, // référence → message pour l'équipe
      valeurs: {}, // référence → numéros saisis (un par appareil)
      retours: {}, // référence → message affiché dans la fiche (CSV, enregistrement)
    };
    const FILES = [
      { k: 'cmd:recue', l: 'À valider', statut: 'Reçue' },
      { k: 'cmd:validee', l: 'À préparer', statut: 'Validée' },
      { k: 'cmd:preparee', l: 'Préparées', statut: 'Préparée' },
    ];
    const COULEURS = { Reçue: '#E62460', Validée: '#00A3A8', Préparée: '#1F9D55' };
    const ICONES = {
      'cmd:recue': '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M4 13 6.5 5h11L20 13v6H4z"/>',
      'cmd:validee': '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
      'cmd:preparee': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    };
    const estFile = (k) => /^cmd:/.test(String(k || ''));
    const fileDe = (statut) => (FILES.find((f) => f.statut === statut) || FILES[0]).k;
    const deFile = (k) => C.commandes.filter((c) => c.statut === (FILES.find((f) => f.k === k) || {}).statut);
    const commande = (ref) => C.commandes.find((c) => c.reference === ref) || null;
    const nbAppareils = (c) => c.lignes.reduce((t, l) => t + l.quantite, 0);
    const pastille = (statut) =>
      `<span class="sp-st" style="--c:${COULEURS[statut] || '#8FA3B3'}"><i></i>${esc({ Reçue: 'À valider', Validée: 'À préparer', Préparée: 'Préparée' }[statut] || statut)}</span>`;
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

    /** Appareils à numéroter, dans l'ordre de la commande : [{ produit }]. */
    const unites = (c) =>
      c.lignes.flatMap((l) =>
        (C.produits[l.produit] || {}).sansNumeroSerie
          ? []
          : Array.from({ length: l.quantite }, () => ({ produit: l.produit })),
      );
    const valeurs = (c) => {
      if (!C.valeurs[c.reference]) C.valeurs[c.reference] = unites(c).map((u, i) => c.numerosSerie[i] || '');
      return C.valeurs[c.reference];
    };
    const saisis = (c) => valeurs(c).filter((x) => String(x).trim()).length;

    /* ── Données ── */
    async function charger() {
      const r = await api('logistique-commandes', {}, true);
      if (r.ok) {
        C.commandes = r.commandes;
        C.produits = r.produits || {};
        C.charge = true;
        C.erreur = '';
        // Numéros en cours de saisie : on garde ce qui est à l'écran, sinon on repart du serveur.
        const enCours = C.ouverte && document.activeElement && document.activeElement.matches('[data-lc-sn]');
        Object.keys(C.valeurs).forEach((ref) => {
          if (!(enCours && ref === C.ouverte)) delete C.valeurs[ref];
        });
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
    /** File d'ouverture : les commandes à valider s'il y en a, sinon le SAV. */
    const fileDeDepart = () =>
      deFile('cmd:recue').length ? 'cmd:recue' : deFile('cmd:validee').length ? 'cmd:validee' : '';

    /* ── Rendu ── */
    function nav(lienNav) {
      return (
        '<span class="sp-grp">Commandes</span>' +
        FILES.map((f) =>
          lienNav(f.k, f.l, deFile(f.k).length, { icone: ICONES[f.k], badge: f.k === 'cmd:recue' }),
        ).join('')
      );
    }
    function filtrees() {
      const q = S.recherche.trim().toLowerCase();
      const l = q
        ? C.commandes.filter((c) =>
            `${c.reference} ${c.structure} ${c.numerosSerie.join(' ')} ${c.lignes.map((x) => x.produit).join(' ')}`
              .toLowerCase()
              .includes(q),
          )
        : deFile(S.file);
      const ancien = S.file !== 'cmd:preparee' && !q;
      return [...l].sort((a, b) => (ancien ? 1 : -1) * (new Date(a.recueLe) - new Date(b.recueLe)));
    }
    function liste(recherche) {
      const l = filtrees();
      const f = FILES.find((x) => x.k === S.file) || FILES[0];
      const titre = recherche ? 'Commandes' : f.l;
      return (
        `<div class="sp-lt"><h2>${esc(titre)} <span>${l.length}</span></h2><small>${S.file !== 'cmd:preparee' && !recherche ? 'Plus anciennes d’abord' : 'Plus récentes d’abord'}</small></div>` +
        (l.length
          ? l
              .map((c) => {
                const n = nbAppareils(c);
                const s = souhait(c);
                const suite =
                  c.statut === 'Validée'
                    ? `<span class="lc-prog${saisis(c) === c.requis ? ' ok' : ''}">${c.dematerialisee ? 'Codes' : 'Numéros'} ${saisis(c)} / ${c.requis}</span>`
                    : '';
                return `<button type="button" class="sp-tk lc-tk${C.ouverte === c.reference ? ' on' : ''}" data-cmd="${esc(c.reference)}">
          <span class="sp-tk-h">${pastille(c.statut)}${c.dateLivraisonSouhaitee === 'ASAP' ? '<span class="sp-sla">Au plus vite</span>' : ''}<span class="sp-d">${esc(quand(c.recueLe))}</span></span>
          <span class="sp-tk-t"><span>${esc(c.structure)}</span></span>
          <span class="sp-tk-m">${esc(c.reference)} · ${n} article${n > 1 ? 's' : ''} · ${c.lignes.length} produit${c.lignes.length > 1 ? 's' : ''}</span>
          <span class="sp-tk-b"><span class="sp-tk-app">${s && c.dateLivraisonSouhaitee !== 'ASAP' ? `Livraison ${esc(s)}` : ''}</span>${suite}</span></button>`;
              })
              .join('')
          : `<p class="sp-vide">${C.charge ? (recherche ? 'Aucune commande ne correspond.' : 'Rien ici pour le moment.') : C.erreur ? esc(C.erreur) : 'Chargement…'}</p>`)
      );
    }

    function accueil() {
      const av = deFile('cmd:recue').length,
        ap = deFile('cmd:validee').length;
      return `<div class="sp-accueil"><span data-ill="commandes" class="ill"></span><b>Choisissez une commande</b><p>${C.charge ? `${av} commande${av > 1 ? 's' : ''} à valider, ${ap} à préparer.` : C.erreur ? esc(C.erreur) : 'Chargement…'}</p></div>`;
    }
    function tete(c) {
      const s = souhait(c);
      return `<div class="sp-tete lc-tete">
        <button type="button" class="sp-retour" data-lc="fermer" aria-label="Retour à la liste">←</button>
        <span class="sp-ill lc-ill"><span data-ill="commandes" class="ill"></span></span>
        <div class="sp-conv-titre"><div class="sp-s"><b>${esc(c.reference)}</b> · reçue le ${esc(quand(c.recueLe))}</div><h2>${esc(c.structure)}</h2>
        <div class="sp-s">${[s ? `Livraison souhaitée : ${esc(s)}` : '', esc(c.modeLivraison), esc(c.adresse)].filter(Boolean).join(' · ')}</div></div>
        ${pastille(c.statut)}
      </div>`;
    }
    const etape = (n, titre, etatEtape, aide, droite) =>
      `<div class="lc-h"><i class="lc-n ${etatEtape}">${etatEtape === 'fait' ? svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 14) : n}</i><b>${esc(titre)}</b>${aide ? `<small>${esc(aide)}</small>` : ''}${droite || ''}</div>`;
    const noteAjustement = (c) =>
      c.note && (c.note.changements.length || c.note.message)
        ? `<p class="lc-note">${c.note.changements.map((ch) => `${esc(ch.produit)} : <s>${ch.ancienne}</s> → <b>${ch.nouvelle}</b>`).join(' · ')}${c.note.message ? `${c.note.changements.length ? ' — ' : ''}« ${esc(c.note.message)} »` : ''}</p>`
        : '';

    function blocQuantites(c) {
      if (c.statut !== 'Reçue') {
        const n = nbAppareils(c);
        return `<section class="lc-carte fait">${etape(1, 'Quantités validées', 'fait', `${n} article${n > 1 ? 's' : ''}`)}${noteAjustement(c)}</section>`;
      }
      const q = C.quantites[c.reference] || (C.quantites[c.reference] = c.lignes.map((l) => l.quantite));
      return `<section class="lc-carte actif">${etape(1, 'Quantités à valider', 'actif', 'Modifiez si le stock ne suit pas.')}
        ${c.lignes
          .map(
            (
              l,
              i,
            ) => `<div class="lc-q">${illu(l.produit, 28)}<span class="lc-p">${esc(l.produit)}</span><span class="lc-cmd">commandé : ${l.quantite}</span>
          <div class="lc-pas${q[i] !== l.quantite ? ' change' : ''}"><button type="button" data-lc-q="${i}" data-d="-1" aria-label="Retirer un ${esc(l.produit)}">−</button><input type="number" min="0" max="10000" inputmode="numeric" data-lc-qv="${i}" value="${q[i]}" aria-label="Quantité validée : ${esc(l.produit)}"><button type="button" class="plus" data-lc-q="${i}" data-d="1" aria-label="Ajouter un ${esc(l.produit)}">+</button></div></div>`,
          )
          .join('')}
        <label class="sp-sr" for="lc-message">Message pour l’équipe et la structure</label>
        <input class="input lc-message" id="lc-message" maxlength="500" placeholder="Message (facultatif) : ex. plus que 4 PC en stock, le 5ᵉ partira avec la prochaine commande." value="${esc(C.messages[c.reference] || '')}">
        <div class="lc-pied"><span class="lc-aide">L’équipe voit les quantités ajustées et votre message.</span><button type="button" class="btn btn-primary" data-lc="valider">✓ Valider les quantités</button></div>
      </section>`;
    }

    function blocNumeros(c) {
      const mot = c.dematerialisee ? 'Codes' : 'Numéros de série';
      if (c.statut === 'Reçue')
        return `<section class="lc-carte attente">${etape(2, mot, 'attente', 'Après la validation des quantités.')}</section>`;
      const u = unites(c);
      const v = valeurs(c);
      const lecture = c.statut !== 'Validée';
      const accessoires = c.lignes.filter((l) => (C.produits[l.produit] || {}).sansNumeroSerie);
      let i0 = 0;
      const groupes = c.lignes
        .filter((l) => !(C.produits[l.produit] || {}).sansNumeroSerie)
        .map((l) => {
          const debut = i0;
          i0 += l.quantite;
          const idx = Array.from({ length: l.quantite }, (_, k) => debut + k);
          const n = idx.filter((i) => String(v[i] || '').trim()).length;
          return `<div class="lc-groupe"><div class="lc-gt">${illu(l.produit, 26)}<b>${esc(l.produit)}</b><span class="lc-prog${n === l.quantite ? ' ok' : ''}" data-lc-prog="${debut}">${n} / ${l.quantite}</span></div>
            <div class="lc-sns">${idx
              .map((i) =>
                lecture
                  ? `<span class="lc-sn-lu">${esc(v[i] || '—')}</span>`
                  : `<label class="lc-sn${String(v[i] || '').trim() ? ' ok' : ''}"><span class="sp-sr">${c.dematerialisee ? 'Code' : 'Numéro de série'} ${i + 1} (${esc(l.produit)})</span><input class="input" data-lc-sn="${i}" value="${esc(v[i] || '')}" placeholder="${c.dematerialisee ? 'Code…' : 'Scannez…'}" autocomplete="off" spellcheck="false"></label>`,
              )
              .join('')}</div></div>`;
        })
        .join('');
      const csv =
        !lecture && !c.dematerialisee
          ? `<label class="sp-btn petit lc-csv">${svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>', 16)}Importer un CSV tec.tech<input type="file" accept=".csv,text/csv" data-lc-csv hidden></label>`
          : '';
      const total = saisis(c);
      return `<section class="lc-carte ${lecture ? 'fait' : 'actif'}">${etape(2, mot, lecture ? 'fait' : 'actif', lecture ? `${total} / ${u.length}` : 'Entrée ou douchette = appareil suivant. Enregistré au fil de la saisie.', csv)}
        ${!lecture ? `<div class="lc-retour" id="lc-retour">${C.retours[c.reference] || ''}</div>` : ''}
        ${groupes || '<p class="lc-aide">Rien à numéroter dans cette commande.</p>'}
        ${accessoires.length ? `<p class="lc-acc">Sans numéro : ${accessoires.map((l) => `${esc(l.produit)} × ${l.quantite}`).join(' · ')}</p>` : ''}
        ${lecture ? '' : piedPreparation(c)}
      </section>`;
    }
    /** Ce qui manque avant « Préparée » : numéros (ici) et devis / facture (équipe). */
    function prerequis(c) {
      return c.prerequis.map((p) =>
        p.cle === 'numerosSerie'
          ? {
              ...p,
              ok: saisis(c) === c.requis,
              libelle: `${saisis(c)} / ${c.requis} ${c.dematerialisee ? 'codes' : 'numéros de série'}`,
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
            `<li class="${p.ok ? 'ok' : ''}">${p.ok ? svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 14) : '<i></i>'}${esc(p.libelle)}${!p.ok && p.cle === 'devisFacture' ? ' <small>(à faire par l’équipe dans l’admin)</small>' : ''}</li>`,
        )
        .join(
          '',
        )}</ul><button type="button" class="btn btn-primary" data-lc="preparer" ${pret ? '' : 'disabled'}>Marquer préparée</button></div>`;
    }
    function blocExpedition(c) {
      return `<section class="lc-carte attente">${etape(3, 'Expédition', c.statut === 'Préparée' ? 'actif' : 'attente', 'Bientôt ici : bon et suivi Colissimo. En attendant, l’équipe s’en charge dans l’admin.')}</section>`;
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
      d.innerHTML = `<div class="sp-ouvert lc-ouvert">${tete(c)}${blocQuantites(c)}${blocNumeros(c)}${blocExpedition(c)}</div>`;
      ctx.illustrer(d);
    }

    /* ── Actions ── */
    function rafraichirPied(c) {
      const pied = document.getElementById('lc-pied');
      if (pied) pied.outerHTML = piedPreparation(c);
      document.querySelectorAll('[data-lc-prog]').forEach((el) => {
        const debut = Number(el.dataset.lcProg);
        const total = Number(el.textContent.split('/')[1]);
        const n = valeurs(c)
          .slice(debut, debut + total)
          .filter((x) => String(x).trim()).length;
        el.textContent = `${n} / ${total}`;
        el.classList.toggle('ok', n === total);
      });
    }
    let minuteur;
    async function enregistrerNumeros(c) {
      clearTimeout(minuteur);
      const envoyes = [...valeurs(c)];
      const r = await api('logistique-series', { id: c.id, numeros: envoyes }, true);
      const retour = document.getElementById('lc-retour');
      if (r.ok) {
        c.numerosSerie = envoyes.map((x) => String(x).trim());
        if (retour && /lc-err/.test(retour.innerHTML)) retour.innerHTML = C.retours[c.reference] = '';
        if (r.saisis === r.requis && r.requis) etat('Tous les numéros sont enregistrés', 'succes');
      } else {
        C.retours[c.reference] = `<div class="lc-err">${esc(r.erreur || 'Enregistrement impossible.')}</div>`;
        if (retour) retour.innerHTML = C.retours[c.reference];
      }
      ctx.peindreListe();
    }
    const programmer = (c) => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => enregistrerNumeros(c), 800);
    };

    async function valider(c) {
      const q = C.quantites[c.reference] || c.lignes.map((l) => l.quantite);
      const r = await api('logistique-valider', { id: c.id, quantites: q, message: C.messages[c.reference] || '' });
      if (!r.ok) return;
      delete C.quantites[c.reference];
      delete C.messages[c.reference];
      etat('Quantités validées : place aux numéros de série', 'succes');
      await charger();
      S.file = 'cmd:validee';
      ctx.peindre();
      const premier = document.querySelector('[data-lc-sn]');
      if (premier) premier.focus();
    }
    async function preparer(c) {
      clearTimeout(minuteur);
      await enregistrerNumeros(c);
      const r = await api('logistique-preparer', { id: c.id });
      if (!r.ok) return;
      etat('Commande préparée', 'succes');
      await charger();
      S.file = 'cmd:preparee';
      ctx.peindre();
    }
    function importerCsv(c, fichier) {
      const lecteur = new FileReader();
      lecteur.onload = async () => {
        const appareils = lireCsvTecTech(lecteur.result);
        if (!appareils || !appareils.length) {
          C.retours[c.reference] = '<div class="lc-err">Aucun numéro de série trouvé dans ce CSV.</div>';
          ctx.peindreDetail();
          return;
        }
        if (appareils.some((a) => !a.type)) etat('Recherche des appareils chez tec.tech…');
        await completerParTecTech(appareils, (numeros) => api('tectech-classer-series', { numeros }, true));
        const bilan = placerSeriesCsv(unites(c), valeurs(c), appareils, (nom) => C.produits[nom]);
        C.valeurs[c.reference] = bilan.valeurs;
        const n = bilan.places.length;
        const hors = bilan.nonPlaces;
        C.retours[c.reference] =
          (n
            ? `<div class="lc-ok">${n} numéro${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''} sur le bon produit${bilan.lignesVides ? ` · ${bilan.lignesVides} encore à saisir` : ''}.</div>`
            : '<div class="lc-err">Aucun numéro du CSV ne correspond aux produits de la commande.</div>') +
          (hors.length
            ? `<div class="lc-warn">${hors.length} numéro${hors.length > 1 ? 's' : ''} du CSV sans place dans la commande : ${hors
                .slice(0, 8)
                .map((a) => esc(libelleNonPlace(a)))
                .join(
                  ', ',
                )}${hors.length > 8 ? '…' : ''}. Vérifiez le type / la catégorie tec.tech des fiches produit.</div>`
            : '');
        ctx.peindreDetail();
        if (n) await enregistrerNumeros(c);
        ctx.peindreDetail();
      };
      lecteur.readAsText(fichier);
    }

    function clic(e) {
      const t = e.target.closest('[data-cmd]');
      if (t) {
        C.ouverte = t.dataset.cmd;
        ctx.peindre();
        return true;
      }
      const c = commande(C.ouverte);
      const pas = e.target.closest('[data-lc-q]');
      if (pas && c) {
        const i = Number(pas.dataset.lcQ);
        const q = C.quantites[c.reference];
        q[i] = Math.max(0, Math.min(10000, (Number(q[i]) || 0) + Number(pas.dataset.d)));
        ctx.peindreDetail();
        return true;
      }
      const a = e.target.closest('[data-lc]');
      if (!a) return false;
      if (a.dataset.lc === 'fermer') {
        C.ouverte = null;
        ctx.peindre();
      }
      if (c && a.dataset.lc === 'valider') valider(c);
      if (c && a.dataset.lc === 'preparer') preparer(c);
      return true;
    }
    function saisie(e) {
      const c = commande(C.ouverte);
      if (!c) return false;
      if (e.target.matches('[data-lc-sn]')) {
        valeurs(c)[Number(e.target.dataset.lcSn)] = e.target.value;
        e.target.closest('.lc-sn').classList.toggle('ok', !!e.target.value.trim());
        rafraichirPied(c);
        programmer(c);
        return true;
      }
      if (e.target.matches('[data-lc-qv]')) {
        const q = C.quantites[c.reference];
        const v = parseInt(e.target.value, 10);
        q[Number(e.target.dataset.lcQv)] = Number.isFinite(v) ? Math.max(0, Math.min(10000, v)) : 0;
        e.target
          .closest('.lc-pas')
          .classList.toggle(
            'change',
            q[Number(e.target.dataset.lcQv)] !== c.lignes[Number(e.target.dataset.lcQv)].quantite,
          );
        return true;
      }
      if (e.target.id === 'lc-message') {
        C.messages[c.reference] = e.target.value;
        return true;
      }
      return false;
    }
    function changement(e) {
      const c = commande(C.ouverte);
      if (!c || !e.target.matches('[data-lc-csv]')) return false;
      const f = e.target.files[0];
      if (f) importerCsv(c, f);
      return true;
    }
    function touche(e) {
      if (e.key !== 'Enter' || !e.target.matches('[data-lc-sn]')) return false;
      e.preventDefault();
      const champs = [...document.querySelectorAll('[data-lc-sn]')];
      const suivant =
        champs.slice(champs.indexOf(e.target) + 1).find((x) => !x.value.trim()) || champs[champs.indexOf(e.target) + 1];
      const c = commande(C.ouverte);
      if (c) enregistrerNumeros(c);
      if (suivant) suivant.focus();
      else document.querySelector('[data-lc="preparer"]')?.focus();
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
      saisie,
      changement,
      touche,
      compte: (k) => deFile(k).length,
      ouverte: () => C.ouverte,
    };
  },
};
