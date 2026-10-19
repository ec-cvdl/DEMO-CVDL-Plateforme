/* ════════════════════════════════════════════════════════════════════════════════════
   46-recette.js — onglet « Recette » : dernier résultat de chaque cas (statut, testeur,
   commentaire, historique) et remarques des testeurs.
   Enregistrés depuis /demo/recette.html dans la base de production (src/routes/recette.js).
   ════════════════════════════════════════════════════════════════════════════════════ */
const rca = { charge: false, chargement: false, d: null, ouverts: new Set() };
const RCA_STATUTS = { ok: 'OK', ko: 'KO', bloque: 'Bloqué', corrige: 'À retester', '': 'À faire' };
const RCA_REMARQUES = { bug: 'Bug', suggestion: 'Suggestion', question: 'Question' };

async function rcaCharger(forcer) {
  if (rca.chargement || (rca.charge && !forcer)) return;
  rca.chargement = true;
  const r = await poster({ action: 'recette-etat' }).catch(() => null);
  rca.chargement = false;
  rca.charge = true;
  rca.d = r && r.ok ? r : null;
  if (state.activeTab === 'recette') render();
}

function vueRecette() {
  const entete = `<div class="rta-bloc-tete"><h1 style="font-size:32px;margin:0">Recette</h1>
    <span class="rca-boutons"><button type="button" class="btn btn-secondary" data-rca-actualiser>${icon('refresh', 14)}Actualiser</button>
    <a class="btn btn-primary" href="/demo/recette.html" target="_blank" rel="noopener">Ouvrir la recette</a></span></div>
    <p style="opacity:0.65;margin:var(--space-2) 0 var(--space-5);font-size:15px">Cas à vérifier avant un déploiement : les testeurs les préparent et les notent sur la démo, les résultats arrivent ici. Les KO et remarques sont aussi proposés dans Projet → À faire.</p>`;
  if (!rca.charge) {
    rcaCharger();
    return entete + '<p class="rta-muet">Chargement…</p>';
  }
  const d = rca.d;
  if (!d) return entete + '<p class="rta-muet">Résultats indisponibles.</p>';
  const quand = (v) => new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const res = (c) => d.resultats[c.id] || { statut: '' };
  const n = (s) => d.cas.filter((c) => res(c).statut === s).length;
  const f = rca.filtre || 'tous';
  const bilan = [
    ['tous', `Tous · ${d.cas.length}`],
    ...['ko', 'bloque', 'corrige', 'ok', ''].map((s) => [s || 'afaire', `${RCA_STATUTS[s]} · ${n(s)}`]),
  ]
    .map(
      ([k, l]) =>
        `<button type="button" class="rca-statut rca-${k}${f === k ? ' on' : ''}" data-rca-filtre="${k}">${l}</button>`,
    )
    .join('');
  const garde = (c) => f === 'tous' || (res(c).statut || 'afaire') === f;
  const historique = (r) =>
    `<ul class="rca-histo">${r.historique
      .map(
        (h) =>
          `<li><span class="rca-statut rca-${h.statut || 'afaire'}">${RCA_STATUTS[h.statut]}</span> ${echapper(h.testeur)} · ${quand(h.le)}${h.commentaire ? ` — ${echapper(h.commentaire)}` : ''}</li>`,
      )
      .join('')}</ul>`;
  const lignes = Object.entries(d.parcours)
    .map(([p, libelle]) => {
      const cas = d.cas.filter((c) => c.parcours === p && garde(c));
      if (!cas.length) return '';
      return `<tr class="rca-parcours"><th colspan="4">${echapper(libelle)}</th></tr>${cas
        .map((c) => {
          const r = res(c);
          const plus = r.historique && r.historique.length > 1;
          return `<tr><td><a href="/demo/recette.html#cas-${echapper(c.id)}" target="_blank" rel="noopener">${echapper(c.titre)}</a></td>
            <td><span class="rca-statut rca-${r.statut || 'afaire'}">${RCA_STATUTS[r.statut]}</span></td>
            <td>${r.testeur ? `${echapper(r.testeur)}<br><small class="rta-muet">${quand(r.le)}</small>` : ''}</td>
            <td>${echapper(r.commentaire || '')}${plus ? `<br><button type="button" class="rca-lien" data-rca-histo="${echapper(c.id)}">${rca.ouverts.has(c.id) ? 'Masquer' : 'Voir'} les ${r.historique.length} passages</button>${rca.ouverts.has(c.id) ? historique(r) : ''}` : ''}</td></tr>`;
        })
        .join('')}`;
    })
    .join('');
  const remarques = d.remarques.length
    ? `<ul class="rca-remarques">${d.remarques
        .map(
          (m) =>
            `<li><span class="rca-statut rca-${m.type}">${RCA_REMARQUES[m.type]}</span> ${echapper(m.texte)}<br><small class="rta-muet">${echapper(m.testeur)} · ${quand(m.le)}${m.page ? ` · ${echapper(m.page)}` : ''}</small></li>`,
        )
        .join('')}</ul>`
    : '<p class="rta-muet">Aucune remarque.</p>';
  return `${entete}
    <section class="rta-bloc">
      <div class="rca-bilan">${bilan}</div>
      ${lignes ? `<table class="rta-table"><thead><tr><th>Cas</th><th>Dernier résultat</th><th>Par</th><th>Commentaire</th></tr></thead><tbody>${lignes}</tbody></table>` : '<p class="rta-muet">Aucun cas avec ce statut.</p>'}
    </section>
    <section class="rta-bloc"><h2>Remarques des testeurs · ${d.remarques.length}</h2>${remarques}</section>`;
}

document.addEventListener('click', (e) => {
  if (state.activeTab !== 'recette') return;
  const filtre = e.target.closest('[data-rca-filtre]');
  if (filtre) {
    rca.filtre = filtre.dataset.rcaFiltre;
    return render();
  }
  const histo = e.target.closest('[data-rca-histo]');
  if (histo) {
    const id = histo.dataset.rcaHisto;
    if (rca.ouverts.has(id)) rca.ouverts.delete(id);
    else rca.ouverts.add(id);
    return render();
  }
  if (e.target.closest('[data-rca-actualiser]')) rcaCharger(true);
});
