/* Pense-bête de commande (portail structure et formulaire de commande) : les besoins notés au
   fil de l'eau avant de commander, partagés par toute la structure (serveur :
   routes/penseBete.js). Chaque clic sur + / − est enregistré ; une commande envoyée en retire
   ce qui a été commandé.
   · Portail : carte « Pense-bête » (#pb-carte) et fenêtre rapide (#modale-pense-bete) ;
   · Commande : pastille dans la barre du haut, avec ce qui a été noté et ce qui est déjà choisi.
   Utilise `poster`, `jsonp`, `echapper` de commun.js. */
window.PenseBete = (function () {
  const PB = { code: '', notes: {}, produits: [], charge: false };
  const envois = {}; // produit → minuteur d'envoi (clics rapprochés regroupés)
  let surChangement = () => {};

  const total = () => Object.values(PB.notes).reduce((t, q) => t + q, 0);
  const pluriel = (n) => `${n} appareil${n > 1 ? 's' : ''} noté${n > 1 ? 's' : ''}`;
  const illu = (nom, icone, taille) =>
    window.illustrationCvdl && window.cleIllustrationProduit
      ? window.illustrationCvdl(window.cleIllustrationProduit(nom, icone), taille)
      : '';
  const $id = (id) => document.getElementById(id);

  async function charger(code) {
    PB.code = code;
    try {
      const r = await jsonp({ action: 'pense-bete', code });
      if (r.ok) {
        PB.notes = r.notes || {};
        PB.produits = r.produits || [];
        PB.charge = true;
      }
    } catch (e) {
      /* pense-bête indisponible : rien n'est affiché */
    }
    return PB.charge;
  }

  /* ── Portail : carte et fenêtre rapide ── */
  function majCarte() {
    const carte = $id('pb-carte');
    if (!carte) return;
    carte.hidden = !PB.charge;
    const n = total();
    $id('pb-carte-texte').textContent = n ? pluriel(n) : 'Notez vos besoins';
    carte.classList.toggle('vide', !n);
  }
  function rendreFenetre() {
    const produits = [...PB.produits];
    // Produit noté qui n'est plus au catalogue : affiché pour pouvoir le retirer.
    Object.keys(PB.notes)
      .filter((nom) => !produits.some((p) => p.nom === nom))
      .forEach((nom) => produits.push({ nom, horsCatalogue: true }));
    $id('pb-liste').innerHTML = produits.length
      ? produits
          .map((p) => {
            const q = PB.notes[p.nom] || 0;
            return `<div class="pb-ligne${q ? ' note' : ''}">${illu(p.nom, p.icone, 30)}
          <span class="pb-nom">${echapper(p.nom)}${p.horsCatalogue ? '<small>plus proposé</small>' : p.disponible === false ? '<small>en rupture pour le moment</small>' : ''}</span>
          <span class="pb-pas"><button type="button" data-pb-pas="-1" data-pb-produit="${echapper(p.nom)}" aria-label="Retirer un ${echapper(p.nom)}" ${q ? '' : 'disabled'}>−</button><b aria-live="polite">${q}</b><button type="button" class="plus" data-pb-pas="1" data-pb-produit="${echapper(p.nom)}" aria-label="Ajouter un ${echapper(p.nom)}" ${p.horsCatalogue || q >= 999 ? 'disabled' : ''}>+</button></span></div>`;
          })
          .join('')
      : '<p class="pb-vide">Aucun produit proposé pour le moment.</p>';
    const n = total();
    $id('pb-total').textContent = n ? pluriel(n) : 'Rien de noté pour l’instant';
    $id('pb-vider').hidden = !n;
  }
  function ouvrir() {
    $id('pb-retour').innerHTML = '';
    rendreFenetre();
    $id('modale-pense-bete').classList.add('visible');
  }
  function fermer() {
    $id('modale-pense-bete').classList.remove('visible');
  }
  /** Enregistre la quantité d'un produit (dernier clic seulement si plusieurs se suivent). */
  function envoyer(nom) {
    clearTimeout(envois[nom]);
    envois[nom] = setTimeout(async () => {
      const r = await poster({
        action: 'pense-bete-noter',
        code: PB.code,
        produit: nom,
        quantite: PB.notes[nom] || 0,
      }).catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
      // Seul ce produit est repris du serveur : les clics en cours sur les autres restent.
      if (r.ok) {
        if (r.notes[nom]) PB.notes[nom] = r.notes[nom];
        else delete PB.notes[nom];
      } else
        $id('pb-retour').innerHTML =
          `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible.')}</div>`;
      rendreFenetre();
      majCarte();
      surChangement(PB.notes);
    }, 350);
  }
  function brancherPortail(options) {
    surChangement = (options && options.surChangement) || surChangement;
    if (!$id('modale-pense-bete')) return;
    $id('pb-ouvrir').addEventListener('click', ouvrir);
    $id('pb-fermer').addEventListener('click', fermer);
    $id('modale-pense-bete').addEventListener('click', (e) => {
      if (e.target.id === 'modale-pense-bete') fermer();
      const b = e.target.closest('[data-pb-pas]');
      if (!b || b.disabled) return;
      const nom = b.dataset.pbProduit;
      const q = Math.max(0, Math.min(999, (PB.notes[nom] || 0) + Number(b.dataset.pbPas)));
      if (q) PB.notes[nom] = q;
      else delete PB.notes[nom];
      $id('pb-retour').innerHTML = '';
      rendreFenetre();
      majCarte();
      document.querySelector(`[data-pb-produit="${CSS.escape(nom)}"][data-pb-pas="${b.dataset.pbPas}"]`)?.focus();
      envoyer(nom);
    });
    $id('pb-vider').addEventListener('click', async () => {
      if (!(await confirmerCvdl('Effacer tout le pense-bête de votre structure ?'))) return;
      const r = await poster({ action: 'pense-bete-vider', code: PB.code }).catch(() => ({ ok: false }));
      if (r.ok) PB.notes = {};
      rendreFenetre();
      majCarte();
    });
  }

  /* ── Commande : pastille dans la barre du haut ── */
  const P = { ouverte: false, selection: {}, reprendre: () => {} };
  function basculer(ouverte) {
    P.ouverte = ouverte;
    pastille(P.selection, P.reprendre);
  }
  /** Affiche (ou met à jour) la pastille : `selection` { produit: quantité choisie },
   *  `reprendre(notes)` met dans la commande tout ce qui a été noté. */
  function pastille(selection, reprendre) {
    P.selection = selection;
    P.reprendre = reprendre;
    const actions = document.querySelector('.cvdl-entete-actions');
    let zone = $id('pb-entete');
    if (!PB.charge || !total() || !actions) {
      if (zone) zone.remove();
      return;
    }
    if (!zone) {
      zone = document.createElement('div');
      zone.id = 'pb-entete';
      zone.className = 'pb-entete';
      actions.prepend(zone);
      zone.addEventListener('click', (e) => {
        if (e.target.closest('[data-pb-basculer]')) basculer(!P.ouverte);
        else if (e.target.closest('[data-pb-reprendre]')) {
          P.ouverte = false;
          P.reprendre(PB.notes);
        }
      });
      // Clic ailleurs ou Échap : le panneau se ferme.
      document.addEventListener('click', (e) => {
        if (P.ouverte && !e.composedPath().includes(zone)) basculer(false);
      });
      document.addEventListener('keydown', (e) => {
        if (P.ouverte && e.key === 'Escape') {
          basculer(false);
          zone.querySelector('[data-pb-basculer]')?.focus();
        }
      });
    }
    const lignes = Object.entries(PB.notes).map(([nom, q]) => {
      const choisi = selection[nom] || 0;
      const p = PB.produits.find((x) => x.nom === nom) || {};
      return `<div class="pb-r">${illu(nom, p.icone, 26)}<span>${echapper(nom)}</span><b class="${choisi >= q ? 'ok' : ''}">${choisi} / ${q}${choisi >= q ? ' ✓' : ''}</b></div>`;
    });
    const tousPris = Object.entries(PB.notes).every(([nom, q]) => (selection[nom] || 0) >= q);
    zone.innerHTML = `<button type="button" class="pb-pastille" data-pb-basculer aria-expanded="${P.ouverte}" aria-controls="pb-panneau"><span>Pense-bête</span><b>${total()}</b><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="pb-panneau" id="pb-panneau" ${P.ouverte ? '' : 'hidden'}>
        <h3>Ce que vous aviez noté</h3>
        <p>Choisi dans cette commande / noté.</p>
        ${lignes.join('')}
        <button type="button" class="btn btn-primary btn-block" data-pb-reprendre ${tousPris ? 'disabled' : ''}>${tousPris ? 'Tout est dans la commande ✓' : 'Tout reprendre dans la commande'}</button>
        <p class="pb-apres">Une fois la commande envoyée, ce qui a été commandé sort du pense-bête.</p>
      </div>`;
  }

  return { charger, brancherPortail, majCarte, pastille, notes: () => PB.notes, total };
})();
