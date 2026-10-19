/* Recette (recette.html, servie sous /demo/) : cas à vérifier avant un déploiement.
   Catalogue et « Préparer » : API de démo (src/demo/recette.js, réservé à l'équipe : clé de démo).
   « Préparer » crée des données neuves et donne des accès : chaque accès ouvre un nouvel onglet
   avec sa session (copiée de cet onglet au moment de l'ouverture, puis effacée ici).
   Résultats et remarques : API de production (src/routes/recette.js), pour durer malgré les
   remises à zéro de la démo ; partagés entre testeurs, consultables dans l'admin. */
(function () {
  const API_PROD = API.replace(/-demo$/, '');
  const API_DEMO = API_PROD + '-demo';
  const stocker = (k, v) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  };
  const lire = (k) => {
    try {
      return localStorage.getItem(k) || '';
    } catch (e) {
      return '';
    }
  };
  const appel = (donnees, base = API_DEMO) =>
    appelApi(Object.assign({ cle: lire('cvdl-demo-cle') }, donnees), { methode: 'POST', base });

  // Lien d'invitation des testeurs : ?cle=… mémorisée dans ce navigateur, retirée de l'adresse.
  const params = new URLSearchParams(location.search);
  if (params.get('cle')) {
    stocker('cvdl-demo-cle', params.get('cle'));
    history.replaceState(null, '', location.pathname + location.hash);
  }

  const R = {
    parcours: {},
    cas: [],
    resultats: {},
    remarques: [],
    filtre: '',
    statut: '',
    prepares: {},
    ouverts: new Set(),
  };
  const TYPES_REMARQUE = { bug: 'Bug', suggestion: 'Suggestion', question: 'Question' };
  const STATUTS = { ok: 'OK', ko: 'KO', bloque: 'Bloqué', corrige: 'À retester', '': 'À faire' };
  const moi = () => $('rc-testeur').value.trim().toLowerCase();

  function erreur(message) {
    $('rc-erreur').hidden = !message;
    $('rc-erreur').textContent = message || '';
  }

  /* ── Rendu ── */
  function bilan() {
    const n = (s) => R.cas.filter((c) => ((R.resultats[c.id] || {}).statut || '') === s).length;
    const total = R.cas.length;
    const faits = total - n('');
    $('rc-bilan').innerHTML = `
      <div class="rc-jauge"><i class="ok" style="width:${(n('ok') / total) * 100}%"></i><i class="ko" style="width:${(n('ko') / total) * 100}%"></i><i class="bloque" style="width:${(n('bloque') / total) * 100}%"></i><i class="corrige" style="width:${(n('corrige') / total) * 100}%"></i></div>
      <div class="rc-chiffres"><b>${faits} / ${total}</b> cas testés · <span class="ok">${n('ok')} OK</span> · <span class="ko">${n('ko')} KO</span> · <span class="bloque">${n('bloque')} bloqués</span> · <span class="corrige">${n('corrige')} à retester</span></div>`;
    $('rc-filtres').innerHTML = [['', 'Tous'], ...Object.entries(R.parcours)]
      .map(
        ([k, l]) =>
          `<button type="button" data-filtre="${k}" class="${R.filtre === k ? 'on' : ''}">${echapper(l)}</button>`,
      )
      .join('');
    $('rc-statuts').innerHTML = [
      ['', 'Tous'],
      ['a-faire', 'À faire'],
      ['corrige', 'À retester'],
      ['ko', 'KO'],
      ['bloque', 'Bloqués'],
      ['ok', 'OK'],
      ['moi', 'Mes résultats'],
    ]
      .map(([k, l]) => `<button type="button" data-statut="${k}" class="${R.statut === k ? 'on' : ''}">${l}</button>`)
      .join('');
  }

  function carte(c) {
    const r = R.resultats[c.id] || { statut: '' };
    const p = R.prepares[c.id];
    const ouvert = R.ouverts.has(c.id);
    const dernier = r.le
      ? `<small class="rc-dernier">${STATUTS[r.statut]}${r.testeur ? ` par ${echapper(r.testeur)}` : ''} le ${new Date(r.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>`
      : '';
    return `<article class="rc-cas rc-${r.statut || 'afaire'}" id="cas-${c.id}">
      <button type="button" class="rc-cas-tete" data-ouvrir="${c.id}" aria-expanded="${ouvert}">
        <span class="rc-pastille">${STATUTS[r.statut]}</span>
        <span class="rc-cas-titre"><b>${echapper(c.titre)}</b><small>${echapper(c.contexte)}</small></span>
        ${dernier}
      </button>
      ${
        ouvert
          ? `<div class="rc-cas-corps">
        <div class="rc-prep">
          <button type="button" class="btn btn-primary" data-preparer="${c.id}">${p ? 'Préparer à nouveau' : 'Préparer les données'}</button>
          <button type="button" class="rc-lien" data-copier="${c.id}">Copier le lien de ce cas</button>
          ${p && p.enCours ? '<span class="rc-sous">Préparation…</span>' : ''}
          ${
            p && p.acces
              ? `<div class="rc-acces">${p.acces
                  .map(
                    (a, i) =>
                      `<button type="button" class="btn" data-acces="${c.id}" data-i="${i}">↗ ${echapper(a.libelle)}</button>`,
                  )
                  .join('')}</div>${
                  (p.infos || []).length
                    ? `<dl class="rc-infos">${p.infos.map(([k, v]) => `<dt>${echapper(k)}</dt><dd>${echapper(v)}</dd>`).join('')}</dl>`
                    : ''
                }`
              : ''
          }
        </div>
        <div class="rc-colonnes">
          <div><h3>Étapes</h3><ol>${c.etapes.map((e) => `<li>${echapper(e)}</li>`).join('')}</ol></div>
          <div><h3>Attendu</h3><ul>${c.attendu.map((e) => `<li>${echapper(e)}</li>`).join('')}</ul></div>
        </div>
        <div class="rc-resultat">
          <div class="rc-choix" role="group" aria-label="Résultat">${['ok', 'ko', 'bloque', 'corrige']
            .map((s) => `<button type="button" data-res="${s}" class="${s}">${STATUTS[s]}</button>`)
            .join('')}</div>
          <textarea class="input" rows="2" maxlength="2000" placeholder="Ce qui ne va pas, la page, le message affiché…" data-commentaire></textarea>
          <button type="button" class="btn btn-primary" data-enregistrer="${c.id}">Enregistrer le résultat</button>
          ${
            (r.historique || []).length
              ? `<details class="rc-histo"><summary>Tous les résultats (${r.historique.length}, ${new Set(r.historique.map((h) => h.testeur)).size} testeur${new Set(r.historique.map((h) => h.testeur)).size > 1 ? 's' : ''})</summary><ul>${r.historique
                  .map(
                    (h) =>
                      `<li>${STATUTS[h.statut]} · ${echapper(h.testeur || '—')} · ${new Date(h.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${h.commentaire ? ` — ${echapper(h.commentaire)}` : ''}</li>`,
                  )
                  .join('')}</ul></details>`
              : ''
          }
        </div>
      </div>`
          : ''
      }
    </article>`;
  }

  function rendre() {
    bilan();
    const visible = (c) => {
      const s = (R.resultats[c.id] || {}).statut || '';
      const r = R.resultats[c.id] || {};
      const statutVu =
        !R.statut ||
        (R.statut === 'a-faire'
          ? !s
          : R.statut === 'moi'
            ? !!moi() && (r.historique || []).some((h) => (h.testeur || '').toLowerCase() === moi())
            : s === R.statut);
      return (!R.filtre || c.parcours === R.filtre) && statutVu;
    };
    $('rc-liste').innerHTML =
      Object.entries(R.parcours)
        .map(([k, l]) => {
          const liste = R.cas.filter((c) => c.parcours === k && visible(c));
          return liste.length
            ? `<section class="rc-groupe"><h2>${echapper(l)} <span>${liste.length}</span></h2>${liste.map(carte).join('')}</section>`
            : '';
        })
        .join('') || '<p class="rc-sous">Aucun cas dans ce filtre.</p>';
    rendreRemarques();
  }

  /* ── Remarques libres (hors cas : bug, suggestion, question) ── */
  function rendreRemarques() {
    $('rc-remarques-liste').innerHTML = R.remarques.length
      ? R.remarques
          .map(
            (x) => `<li class="rc-rem-${x.type}"><span class="rc-rem-type">${TYPES_REMARQUE[x.type]}</span>
              <div><p>${echapper(x.texte)}</p><small>${echapper(x.testeur)} · ${new Date(x.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${x.page ? ` · ${echapper(x.page)}` : ''}</small></div></li>`,
          )
          .join('')
      : '<li class="rc-sous">Aucune remarque pour l’instant.</li>';
  }
  async function envoyerRemarque(f) {
    const r = await appel(
      {
        action: 'recette-remarque',
        type: f.elements.type.value,
        page: f.elements.page.value,
        texte: f.elements.texte.value,
        testeur: $('rc-testeur').value.trim(),
      },
      API_PROD,
    ).catch(() => null);
    if (!r || !r.ok) return erreur((r && r.erreur) || 'Envoi impossible.');
    erreur('');
    R.remarques = r.remarques;
    f.reset();
    rendreRemarques();
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'rc-remarque') return;
    e.preventDefault();
    envoyerRemarque(e.target);
  });

  /* ── Actions ── */
  async function preparer(id) {
    R.prepares[id] = { enCours: true };
    rendre();
    const r = await appel({ action: 'recette-preparer', id }).catch(() => null);
    if (!r || !r.ok) {
      delete R.prepares[id];
      erreur((r && r.erreur) || 'Le serveur de démo ne répond pas.');
    } else {
      erreur('');
      R.prepares[id] = r;
    }
    rendre();
  }
  function ouvrirAcces(id, i) {
    const a = R.prepares[id].acces[i];
    const cles = Object.keys(a.stockage || {});
    cles.forEach((k) => {
      try {
        sessionStorage.setItem(k, a.stockage[k]);
      } catch (e) {}
    });
    window.open(a.page, '_blank'); // le nouvel onglet reçoit une copie de la session
    cles.forEach((k) => {
      try {
        sessionStorage.removeItem(k);
      } catch (e) {}
    });
  }
  async function enregistrer(id, bloc) {
    const statut = (bloc.querySelector('.rc-choix .on') || {}).dataset;
    if (!statut) return erreur('Choisissez OK, KO, Bloqué ou À retester.');
    if (!$('rc-testeur').value.trim()) return erreur('Indiquez votre prénom (en haut à droite) avant d’enregistrer.');
    const r = await appel(
      {
        action: 'recette-resultat',
        id,
        statut: statut.res,
        commentaire: bloc.querySelector('[data-commentaire]').value,
        testeur: $('rc-testeur').value.trim(),
      },
      API_PROD,
    ).catch(() => null);
    if (!r || !r.ok) return erreur((r && r.erreur) || 'Enregistrement impossible.');
    erreur('');
    R.resultats = r.resultats;
    rendre();
  }
  function exporter() {
    const champ = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    // Une ligne par résultat de chaque testeur, puis les remarques libres.
    const lignes = [['Parcours', 'Cas', 'Résultat', 'Testeur', 'Date', 'Commentaire']];
    R.cas.forEach((c) => {
      const h = (R.resultats[c.id] || {}).historique || [];
      if (!h.length) lignes.push([R.parcours[c.parcours], c.titre, STATUTS[''], '', '', '']);
      h.forEach((x) =>
        lignes.push([R.parcours[c.parcours], c.titre, STATUTS[x.statut], x.testeur, x.le, x.commentaire]),
      );
    });
    R.remarques.forEach((x) =>
      lignes.push(['Remarque libre', x.page, TYPES_REMARQUE[x.type], x.testeur, x.le, x.texte]),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(['﻿' + lignes.map((l) => l.map(champ).join(';')).join('\n')], { type: 'text/csv' }),
    );
    a.download = `recette-cvdl-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const f = t.closest('[data-filtre]');
    if (f) return ((R.filtre = f.dataset.filtre), rendre());
    const s = t.closest('[data-statut]');
    if (s) return ((R.statut = s.dataset.statut), rendre());
    const o = t.closest('[data-ouvrir]');
    if (o) {
      const id = o.dataset.ouvrir;
      if (R.ouverts.has(id)) R.ouverts.delete(id);
      else R.ouverts.add(id);
      return rendre();
    }
    const p = t.closest('[data-preparer]');
    if (p) return preparer(p.dataset.preparer);
    const a = t.closest('[data-acces]');
    if (a) return ouvrirAcces(a.dataset.acces, Number(a.dataset.i));
    const res = t.closest('[data-res]');
    if (res) {
      res.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === res));
      return;
    }
    const en = t.closest('[data-enregistrer]');
    if (en) return enregistrer(en.dataset.enregistrer, en.closest('.rc-resultat'));
    if (t.closest('#rc-export')) exporter();
    const cp = t.closest('[data-copier]');
    if (cp) {
      const lien = `${location.origin}${location.pathname}#cas-${cp.dataset.copier}`;
      navigator.clipboard.writeText(lien).then(
        () => (cp.textContent = 'Lien copié ✓'),
        () => (cp.textContent = lien),
      );
    }
  });
  $('rc-testeur').addEventListener('input', (e) => {
    stocker('cvdl-recette-testeur', e.target.value);
    if (R.statut === 'moi') rendre();
  });

  /* ── Démarrage : catalogue et résultats ── */
  (async () => {
    $('rc-testeur').value = lire('cvdl-recette-testeur');
    const [r, e] = await Promise.all([
      appel({ action: 'recette' }).catch(() => null),
      appel({ action: 'recette-etat' }, API_PROD).catch(() => null),
    ]);
    if (!r || !r.ok) {
      $('rc-liste').innerHTML = '';
      return erreur(
        r && r.erreur
          ? r.erreur
          : 'Recette indisponible : ouvrez cette page depuis le site de démo (/demo/recette.html), avec la clé d’équipe si elle est demandée.',
      );
    }
    if (!e || !e.ok) erreur((e && e.erreur) || 'Résultats indisponibles : réessayez dans un instant.');
    Object.assign(R, {
      parcours: r.parcours,
      cas: r.cas,
      resultats: (e && e.resultats) || {},
      remarques: (e && e.remarques) || [],
    });
    const ancre = location.hash.slice(1).replace(/^cas-/, '');
    if (ancre) R.ouverts.add(ancre);
    rendre();
  })();
})();
