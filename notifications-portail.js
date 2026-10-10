/* Cloche de notifications du portail structure (en-tête de cvdl-ui.js) : paiements des personnes
   (échéances en retard ou proches), livraisons, flotte. Serveur : portail-agenda
   (routes/echeancier.js). Le compteur ne retient que ce qui demande une action. Sur le portail,
   la bande « À traiter » ouvre la même fenêtre (NotificationsPortail.brancherBande). */
window.NotificationsPortail = (function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const N = { donnees: null, contexte: null, ouvert: false, filtre: 'tout', bouton: null, panneau: null };
  const GROUPES = [
    ['contexte', 'À traiter'],
    ['paiement', 'Paiements des personnes'],
    ['livraison', 'Livraisons'],
    ['flotte', 'Flotte'],
  ];
  const FILTRES = [
    ['paiement', 'Paiements'],
    ['livraison', 'Livraisons'],
    ['flotte', 'Flotte'],
  ];
  const ICONES = { paiement: 'facture', livraison: 'commandes', flotte: 'gestionFlotte', contexte: 'cloche' };
  const CLASSES = { retard: 'r', bientot: 'a', avenir: 'a', prevue: 'i', livree: 'l', info: 'i', contexte: 'i' };

  function code() {
    try {
      return sessionStorage.getItem('cvdl-code-structure') || '';
    } catch (e) {
      return '';
    }
  }
  function lien(n) {
    if (n.type === 'contexte') return n.lien || '#';
    if (n.type === 'paiement') return `flotte-structure.html?personne=${encodeURIComponent(n.appareilId)}`;
    if (n.type === 'livraison') return 'suivi.html';
    return 'flotte-structure.html';
  }
  function liste() {
    let l = N.donnees ? N.donnees.notifications.slice() : [];
    // Le message du jour reprend déjà l'alerte de stock : pas deux fois la même ligne.
    if (N.contexte && /flotte-structure/.test(N.contexte.lien || '')) l = l.filter((n) => n.type !== 'flotte');
    if (N.contexte)
      l.unshift({ type: 'contexte', etat: 'contexte', titre: N.contexte.texte, lien: N.contexte.lien, quand: 'Voir' });
    return l;
  }

  function rendrePanneau() {
    const toutes = liste();
    const visibles = N.filtre === 'tout' ? toutes : toutes.filter((n) => n.type === N.filtre);
    const compte = (t) => toutes.filter((n) => n.type === t).length;
    N.panneau.innerHTML = `<div class="nf-h"><div><small>À traiter</small><b id="nf-titre">Notifications</b></div><span class="nf-n">${toutes.length}</span></div>
      <div class="nf-f" role="tablist" aria-label="Filtrer les notifications">
        <button type="button" role="tab" aria-selected="${N.filtre === 'tout'}" data-nf-filtre="tout">Tout</button>
        ${FILTRES.filter(([t]) => compte(t))
          .map(
            ([t, l]) =>
              `<button type="button" role="tab" aria-selected="${N.filtre === t}" data-nf-filtre="${t}">${l} ${compte(t)}</button>`,
          )
          .join('')}
      </div>
      <div class="nf-l">${
        visibles.length
          ? GROUPES.map(([t, titre]) => {
              const g = visibles.filter((n) => n.type === t);
              return g.length
                ? `<div class="nf-g">${titre}</div>${g
                    .map(
                      (n) =>
                        `<a class="nf-i ${n.etat === 'retard' ? 'r' : ''}" href="${esc(lien(n))}"><span data-ill="${ICONES[n.type]}" class="ill s"></span><span class="nf-t"><b>${esc(n.titre)}</b><span>${esc(n.detail || '')}</span></span><em class="nf-e ${CLASSES[n.etat] || 'i'}">${esc(n.quand || '')}</em></a>`,
                    )
                    .join('')}`
                : '';
            }).join('')
          : '<p class="nf-vide">Rien à signaler pour le moment.</p>'
      }</div>
      <div class="nf-pied"><a href="calendrier.html">Ouvrir le calendrier →</a><span>Un clic ouvre la fiche concernée</span></div>`;
    if (window.portailIllustrations) window.portailIllustrations(N.panneau);
  }
  function majBouton() {
    if (!N.bouton) return;
    const n = (N.donnees ? N.donnees.compteur : 0) + (N.contexte && N.contexte.type === 'urgent' ? 1 : 0);
    N.bouton.querySelector('i').textContent = n || '';
    N.bouton.querySelector('i').hidden = !n;
    N.bouton.setAttribute('aria-label', n ? `Notifications : ${n} à traiter` : 'Notifications');
  }
  function basculer(ouvert) {
    N.ouvert = ouvert;
    N.panneau.hidden = !ouvert;
    N.bouton.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) {
      rendrePanneau();
      N.panneau.focus();
    }
  }

  function installer() {
    const actions = document.querySelector('.cvdl-entete-actions');
    if (!actions || N.bouton) return !!N.bouton;
    N.bouton = document.createElement('button');
    N.bouton.type = 'button';
    N.bouton.className = 'nf-cloche';
    N.bouton.setAttribute('aria-haspopup', 'dialog');
    N.bouton.setAttribute('aria-expanded', 'false');
    N.bouton.setAttribute('aria-controls', 'nf-panneau');
    N.bouton.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg><span>Notifications</span><i hidden></i>';
    actions.prepend(N.bouton);
    N.panneau = document.createElement('div');
    N.panneau.id = 'nf-panneau';
    N.panneau.className = 'nf-p';
    N.panneau.hidden = true;
    N.panneau.tabIndex = -1;
    N.panneau.setAttribute('role', 'dialog');
    N.panneau.setAttribute('aria-labelledby', 'nf-titre');
    document.body.appendChild(N.panneau);
    N.bouton.addEventListener('click', (e) => {
      e.stopPropagation();
      basculer(!N.ouvert);
    });
    N.panneau.addEventListener('click', (e) => {
      const f = e.target.closest('[data-nf-filtre]');
      if (f) {
        N.filtre = f.dataset.nfFiltre;
        rendrePanneau();
      }
    });
    document.addEventListener('click', (e) => {
      if (N.ouvert && !e.composedPath().includes(N.panneau) && !e.composedPath().includes(N.bouton)) basculer(false);
    });
    document.addEventListener('keydown', (e) => {
      if (N.ouvert && e.key === 'Escape') {
        basculer(false);
        N.bouton.focus();
      }
    });
    majBouton();
    return true;
  }

  let enCours = null;
  function charger() {
    if (!enCours) enCours = lire().finally(() => (enCours = null));
    return enCours;
  }
  async function lire() {
    const c = code();
    if (!c) return;
    const r = await jsonp({ action: 'portail-agenda', code: c }).catch(() => null);
    if (!r || !r.ok) return;
    N.donnees = r;
    // L'en-tête est construit par cvdl-ui.js au chargement : on l'attend un court instant.
    for (let i = 0; i < 30 && !installer(); i++) await new Promise((ok) => setTimeout(ok, 100));
    majBouton();
    if (N.ouvert) rendrePanneau();
    if (N.bande) majBande();
  }

  /** Portail : la bande « À traiter » ouvre la fenêtre ; son message y figure en tête. Sans
   *  message du jour, elle affiche la première notification qui demande une action. */
  function brancherBande(bande, texte, contexte) {
    N.bande = { bande, texte };
    N.contexte = contexte || null;
    if (!bande.dataset.nfBranchee) {
      bande.dataset.nfBranchee = '1';
      bande.addEventListener('click', (e) => {
        if (!N.bouton) return;
        e.preventDefault();
        e.stopPropagation();
        basculer(true);
      });
    }
    majBande();
    majBouton();
  }
  function majBande() {
    const { bande, texte } = N.bande;
    if (N.contexte || !N.donnees) return;
    const premiere = N.donnees.notifications.find((n) => n.action);
    if (!premiere) return;
    const autres = N.donnees.compteur - 1;
    texte.textContent = `${premiere.titre} — ${premiere.detail} (${premiere.quand.toLowerCase()})${autres > 0 ? ` · et ${autres} autre${autres > 1 ? 's' : ''}` : ''}`;
    bande.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', charger);
  else charger();
  return { brancherBande, recharger: () => (N.donnees ? Promise.resolve() : charger()) };
})();
