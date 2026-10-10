/* Règlement d'une vente dans la fiche personne de la flotte (flotte-structure.html) : payé à la
   vente, plus tard (une date) ou en plusieurs fois (échéancier). Les échéances alimentent la
   cloche de notifications et le calendrier du portail. Serveur : routes/echeancier.js.
   ReglementPersonne.ouvrir(zone, { appareil, code, poster, montantPropose, surPaiementComplet })
   puis, au clic sur « Enregistrer » de la fiche : await ReglementPersonne.enregistrer() →
   { ok } ou { erreur } (rien à faire si rien n'a changé). */
window.ReglementPersonne = (function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const MODES = [
    ['', 'Payé à la vente'],
    ['plus-tard', 'Plus tard'],
    ['plusieurs-fois', 'En plusieurs fois'],
  ];
  const PILULES = {
    payee: (e) => `<span class="rg-pill ok">Payée le ${esc(e.payeeLe)}</span>`,
    retard: (e) => `<span class="rg-pill ret">En retard de ${e.jours} jour${e.jours > 1 ? 's' : ''}</span>`,
    bientot: (e) =>
      `<span class="rg-pill av">${e.jours ? `Dans ${e.jours} jour${e.jours > 1 ? 's' : ''}` : 'Aujourd’hui'}</span>`,
    avenir: () => '<span class="rg-pill av">À venir</span>',
  };
  const euros = (n) => (n == null || n === '' ? '' : String(n).replace('.', ','));
  const nombre = (v) =>
    parseFloat(
      String(v || '')
        .replace(/\s|€/g, '')
        .replace(',', '.'),
    );
  let R = null;

  async function ouvrir(zone, o) {
    R = { zone, o, charge: false, sale: false, reglement: '', total: '', echeances: [], gen: {}, erreur: '' };
    zone.innerHTML = '<p class="rg-note">Chargement du règlement…</p>';
    const r = await o
      .poster({ action: 'flotte-echeancier', code: o.code, id: o.appareil.id })
      .catch(() => ({ ok: false }));
    if (!R || R.zone !== zone) return;
    if (!r.ok) {
      zone.innerHTML = '';
      return;
    }
    R.charge = true;
    R.rythmes = r.rythmes;
    R.reglement = r.reglement || '';
    R.total = r.total == null ? '' : r.total;
    R.echeances = r.echeances;
    const proposee = R.echeances[0] ? R.echeances[0].date : '';
    R.gen = {
      total: R.total || o.montantPropose || '',
      acompte: (() => {
        const reste = R.total ? R.total - R.echeances.reduce((t, e) => t + e.montant, 0) : 0;
        return reste > 0 ? Math.round(reste * 100) / 100 : '';
      })(),
      nombre: R.echeances.length || 3,
      premiere: proposee,
      rythme: 'mois',
    };
    rendre();
  }

  function ligne(e, i) {
    const enregistree = !R.sale && e.id;
    return `<tr>
      <td><span class="rg-num">${i + 1}</span></td>
      <td><input class="input" data-rg-e="date" data-rg-i="${i}" value="${esc(e.date)}" placeholder="jj/mm/aaaa" aria-label="Date de l’échéance ${i + 1}"></td>
      <td><span class="rg-euros"><input class="input" data-rg-e="montant" data-rg-i="${i}" value="${esc(euros(e.montant))}" inputmode="decimal" aria-label="Montant de l’échéance ${i + 1}">€</span></td>
      <td>${enregistree && PILULES[e.etat] ? PILULES[e.etat](e) : e.payee || e.payeeLe ? '<span class="rg-pill ok">Payée</span>' : ''}</td>
      <td class="rg-act"><span class="rg-act-in">${
        enregistree
          ? `<button type="button" class="btn btn-secondary btn-sm" data-rg-payee="${e.id}" data-rg-valeur="${e.payeeLe ? '' : '1'}"${e.payeeLe ? ` aria-label="Annuler le paiement de l’échéance ${i + 1}"` : ''}>${e.payeeLe ? 'Annuler' : 'Marquer payée'}</button>`
          : `<label class="rg-case"><input type="checkbox" data-rg-e="payee" data-rg-i="${i}" ${e.payee || e.payeeLe ? 'checked' : ''}> payée</label>`
      }${R.reglement === 'plusieurs-fois' && R.echeances.length > 1 ? `<button type="button" class="rg-x" data-rg-retirer="${i}" aria-label="Retirer l’échéance ${i + 1}">×</button>` : ''}</span></td>
    </tr>`;
  }

  function rendre() {
    if (!R || !R.charge) return;
    const plusieurs = R.reglement === 'plusieurs-fois';
    const somme = R.echeances.reduce((t, e) => t + (nombre(e.montant) || 0), 0);
    const acompte = plusieurs && nombre(R.total) > 0 ? Math.round((nombre(R.total) - somme) * 100) / 100 : null;
    R.zone.innerHTML = `<div class="rg">
      <h4 class="pp-titre rg-titre">Règlement <span class="rg-seg" role="radiogroup" aria-label="Mode de règlement">${MODES.map(
        ([v, l]) =>
          `<button type="button" role="radio" aria-checked="${R.reglement === v}" data-rg-mode="${v}">${l}</button>`,
      ).join('')}</span></h4>
      ${
        plusieurs
          ? `<div class="rg-gen">
        <label>Montant total<span class="rg-euros"><input class="input" data-rg-g="total" value="${esc(euros(R.gen.total))}" inputmode="decimal">€</span></label>
        <label>Déjà réglé à la vente<span class="rg-euros"><input class="input" data-rg-g="acompte" value="${esc(euros(R.gen.acompte))}" inputmode="decimal" placeholder="0">€</span></label>
        <label>Nombre d’échéances<input class="input" type="number" min="1" max="24" data-rg-g="nombre" value="${esc(R.gen.nombre)}"></label>
        <label>Première échéance<input class="input" data-rg-g="premiere" value="${esc(R.gen.premiere)}" placeholder="jj/mm/aaaa"></label>
        <label>Rythme<select class="input" data-rg-g="rythme">${Object.entries(R.rythmes || {})
          .map(([k, l]) => `<option value="${k}"${k === R.gen.rythme ? ' selected' : ''}>${esc(l)}</option>`)
          .join('')}</select></label>
        <button type="button" class="btn btn-secondary" data-rg-calculer>${R.echeances.length ? 'Recalculer' : 'Calculer les échéances'}</button>
      </div>`
          : ''
      }
      ${
        R.reglement
          ? `${R.echeances.length ? `<table class="rg-t"><thead><tr><th></th><th>Date</th><th>Montant</th><th>État</th><th></th></tr></thead><tbody>${R.echeances.map(ligne).join('')}</tbody></table>` : ''}
        ${plusieurs ? `<p class="rg-note">${acompte > 0 ? `Déjà réglé à la vente : ${euros(acompte)} € · ` : ''}<button type="button" class="rg-lien" data-rg-ajouter>＋ Ajouter une échéance</button></p>` : ''}
        <p class="rg-note">Rappel dans les notifications du portail 3 jours avant chaque échéance, puis tant qu’elle n’est pas réglée.${R.sale ? ' <b>Modifications enregistrées avec la fiche.</b>' : ''}</p>`
          : '<p class="rg-note">Rien à suivre : la personne a tout réglé le jour de la vente.</p>'
      }
      ${R.erreur ? `<div class="msg msg-erreur">${esc(R.erreur)}</div>` : ''}
    </div>`;
  }

  async function calculer() {
    const g = R.gen;
    const r = await R.o
      .poster({
        action: 'flotte-echeancier-calculer',
        code: R.o.code,
        total: nombre(g.total),
        acompte: nombre(g.acompte) || 0,
        nombre: g.nombre,
        premiere: g.premiere,
        rythme: g.rythme,
      })
      .catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
    if (!R) return;
    R.erreur = r.ok ? '' : r.erreur || 'Calcul impossible.';
    if (r.ok) {
      R.echeances = r.echeances;
      R.total = nombre(g.total);
      R.sale = true;
    }
    rendre();
  }

  function clic(e) {
    if (!R || !R.zone.contains(e.target)) return;
    const m = e.target.closest('[data-rg-mode]');
    if (m) {
      R.reglement = m.dataset.rgMode;
      R.sale = true;
      R.erreur = '';
      if (R.reglement === 'plus-tard' && R.echeances.length !== 1)
        R.echeances = [{ date: R.echeances[0] ? R.echeances[0].date : '', montant: R.gen.total || '' }];
      return rendre();
    }
    if (e.target.closest('[data-rg-calculer]')) return calculer();
    if (e.target.closest('[data-rg-ajouter]')) {
      R.echeances.push({ date: '', montant: '' });
      R.sale = true;
      return rendre();
    }
    const x = e.target.closest('[data-rg-retirer]');
    if (x) {
      R.echeances.splice(Number(x.dataset.rgRetirer), 1);
      R.sale = true;
      return rendre();
    }
    const p = e.target.closest('[data-rg-payee]');
    if (p) payer(p);
  }
  async function payer(bouton) {
    bouton.disabled = true;
    const r = await R.o
      .poster({
        action: 'flotte-echeance-payee',
        code: R.o.code,
        echeance: bouton.dataset.rgPayee,
        payee: !!bouton.dataset.rgValeur,
      })
      .catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
    if (!R) return;
    R.erreur = r.ok ? '' : r.erreur || 'Enregistrement impossible.';
    if (r.ok) {
      R.echeances = r.echeances;
      if (r.paiementComplet != null && R.o.surPaiementComplet) R.o.surPaiementComplet(r.paiementComplet);
    }
    rendre();
  }
  function saisie(e) {
    if (!R || !R.zone.contains(e.target)) return;
    const g = e.target.closest('[data-rg-g]');
    if (g) R.gen[g.dataset.rgG] = g.value;
    const c = e.target.closest('[data-rg-e]');
    if (c) {
      const ech = R.echeances[Number(c.dataset.rgI)];
      ech[c.dataset.rgE] = c.type === 'checkbox' ? c.checked : c.value;
      if (c.dataset.rgE === 'montant' && R.reglement === 'plus-tard') R.total = c.value;
      if (!R.sale) {
        R.sale = true;
        // Les boutons « Marquer payée » deviennent des cases : tout part avec la fiche.
        if (c.type !== 'checkbox') {
          const pos = c.selectionStart;
          rendre();
          const meme = R.zone.querySelector(`[data-rg-e="${c.dataset.rgE}"][data-rg-i="${c.dataset.rgI}"]`);
          if (meme) {
            meme.focus();
            if (pos != null) meme.setSelectionRange(pos, pos);
          }
        }
      }
    }
  }
  document.addEventListener('click', clic);
  document.addEventListener('input', saisie);
  document.addEventListener('change', saisie);

  /** Enregistre le règlement s'il a changé : { ok } ou { erreur }. */
  async function enregistrer() {
    if (!R || !R.charge || !R.sale) return { ok: true };
    const r = await R.o
      .poster({
        action: 'flotte-echeancier-enregistrer',
        code: R.o.code,
        id: R.o.appareil.id,
        reglement: R.reglement,
        total: R.reglement === 'plusieurs-fois' ? nombre(R.total) || '' : '',
        echeances: R.reglement
          ? R.echeances.map((e) => ({ date: e.date, montant: nombre(e.montant), payee: !!(e.payee || e.payeeLe) }))
          : [],
      })
      .catch(() => ({ ok: false, erreur: 'Connexion impossible — réessayez.' }));
    if (!r.ok) {
      R.erreur = r.erreur || 'Règlement non enregistré.';
      rendre();
      return { erreur: R.erreur };
    }
    R.sale = false;
    R.reglement = r.reglement;
    R.echeances = r.echeances;
    R.o.appareil.reglement = r.reglement;
    if (r.paiementComplet != null && R.o.surPaiementComplet) R.o.surPaiementComplet(r.paiementComplet);
    rendre();
    return { ok: true };
  }
  const aChange = () => !!(R && R.sale);
  function fermer() {
    R = null;
  }

  return { ouvrir, enregistrer, aChange, fermer };
})();
