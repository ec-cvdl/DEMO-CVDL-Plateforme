/* ════════════════════════════════════════════════════════════════════════════════════
   retours-admin.js — onglet « Retours » de l'admin : ce que les structures et les personnes
   accompagnées pensent de l'outil, et où elles bloquent.
   · « Était-ce simple ? » par parcours (commande, SAV structure, SAV personne, espace) ;
   · avis écrits à lire (marquer « traité ») ;
   · erreurs rencontrées, regroupées par message (affichées à l'écran, techniques, serveur) ;
   · abandons des formulaires sur 90 jours (où les gens s'arrêtent).
   Données anonymes, conservées 13 mois. Routes : src/routes/retours.js.
   S'appuie sur les fonctions globales de l'admin (admin/*.js) (jsonp, posterEtat, echapper, icon, render…).
   ════════════════════════════════════════════════════════════════════════════════════ */
const rta = { charge: false, chargement: false, donnees: null, filtre: 'a-lire', demo: false };

const RTA_PARCOURS = {
  commande: 'Passer une commande',
  sav: 'Déclarer une panne (structure)',
  'sav-beneficiaire': 'Déclarer une panne (personne)',
  'portail-structure': 'Espace structure',
  'portail-beneficiaire': 'Espace personne',
  embarquement: 'Présentation de première connexion',
  remise: 'Remettre un appareil',
  attestation: 'Éditer une attestation',
};
/* Pages suivies (usage) : nom lisible, et liste des pages structure attendues pour repérer
   celles qui ne servent pas. */
const RTA_PAGES = {
  'portail-structure': 'Accueil de l’espace structure',
  commande: 'Commander',
  suivi: 'Suivre mes commandes',
  'flotte-structure': 'Ma flotte',
  sav: 'Signaler une panne',
  'suivi-sav-structure': 'Mes demandes SAV',
  attestations: 'Mes attestations',
  'rapport-impact': 'Notre impact',
  'categories-materiel': 'Catégories de matériel',
  'projets-distribution': 'Projets de distribution',
  portail: 'Portail (connexion)',
  'portail-beneficiaire': 'Espace personne',
  'sav-beneficiaire': 'Panne (personne)',
  'suivi-sav-beneficiaire': 'Suivi SAV (personne)',
  passeport: 'Passeport d’un appareil',
};
const RTA_TYPES = {
  rn: 'Relais Numérique',
  bo: 'Vente solidaire',
  interne: 'Interne',
  conseiller: 'Conseiller',
  'sans-code': 'Sans code',
};
const rtaDuree = (s) => (!s ? '—' : s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);
const RTA_FORMULAIRES = {
  commande: 'Commande',
  'sav-structure': 'SAV · structure',
  'sav-beneficiaire': 'SAV · personne',
};
const RTA_TYPES_ERREUR = {
  'erreur-page': ['Affichée', 'Message d’erreur vu par l’utilisateur'],
  'erreur-js': ['Technique', 'Erreur dans la page'],
  'erreur-serveur': ['Serveur', 'Exception côté serveur'],
};
const RTA_FOND = { 1: '#F7A8AA', 2: '#FEE9A6', 3: '#A7E0BF' };
const RTA_BOUCHE = { 1: 'M17 32c2.2-3 11.8-3 14 0', 2: 'M17 30.5h14', 3: 'M16.5 28c2.4 4 12.6 4 15 0' };
function rtaVisage(n, t) {
  n = +n || 2;
  t = t || 28;
  return `<svg viewBox="0 0 48 48" width="${t}" height="${t}" aria-hidden="true" style="overflow:visible;flex:none"><circle cx="26" cy="26" r="16" fill="${RTA_FOND[n]}"/><g fill="none" stroke="#002743" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="${RTA_BOUCHE[n]}"/></g><circle cx="18.5" cy="20" r="2" fill="#002743"/><circle cx="29.5" cy="20" r="2" fill="#002743"/></svg>`;
}

async function rtaCharger(forcer) {
  if (rta.chargement || (rta.charge && !forcer)) return;
  rta.chargement = true;
  try {
    const r = await jsonp({ action: 'retours-admin', password: motDePasse, demo: rta.demo ? '1' : '' });
    if (r && r.ok) {
      rta.donnees = r;
      rta.charge = true;
    } else etat((r && r.erreur) || 'Chargement des retours impossible', 'erreur');
  } catch (e) {
    etat('Chargement des retours impossible', 'erreur');
  }
  rta.chargement = false;
  if (state.activeTab === 'retours') render();
}

function vueRetours() {
  const entete = `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Retours</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Ce que les structures et les personnes pensent de l’outil, comment elles l’utilisent et où elles bloquent. Sans données personnelles, conservé 13 mois.</p>`;
  if (!rta.charge) {
    rtaCharger();
    return entete + '<p class="rta-muet">Chargement…</p>';
  }
  const d = rta.donnees;
  const parcours = Object.entries(d.parParcours || {}).sort((a, b) => b[1].total - a[1].total);
  const totalReponses = parcours.reduce((t, [, p]) => t + p.total, 0);
  const facile = parcours.reduce((t, [, p]) => t + p.facile, 0);
  const erreurs30 = (d.erreurs || []).reduce((t, e) => t + e.trenteJours, 0);
  const avis = (d.avisListe || []).filter((a) => rta.filtre === 'tous' || !a.traite);
  const nomStructure = (code) => ((state.structures || []).find((s) => s.code === code) || {}).nom || '';
  const date = (v) => {
    const x = new Date(v);
    return isNaN(x)
      ? ''
      : x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
          ' ' +
          x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  const formulaires = Object.entries(d.abandons || {});
  const taches = Object.entries(d.parcours || {}).sort(
    (a, b) => b[1].reussis + b[1].abandons - (a[1].reussis + a[1].abandons),
  );
  const pages = Object.entries(d.usage || {}).sort((a, b) => b[1].vues - a[1].vues);
  const pagesSansVue = [
    'portail-structure',
    'commande',
    'suivi',
    'flotte-structure',
    'sav',
    'suivi-sav-structure',
    'attestations',
    'rapport-impact',
    'categories-materiel',
    'projets-distribution',
  ].filter((p) => !(d.usage || {})[p]);
  const moisParcours = [...new Set((d.parMois || []).flatMap((m) => Object.keys(m.parcours)))];
  return `${entete}
    <div class="rta-filtres" style="margin-bottom:var(--space-4)">
      <button type="button" class="di-filtre${rta.demo ? '' : ' on'}" data-rta-demo="">Plateforme réelle</button>
      <button type="button" class="di-filtre${rta.demo ? ' on' : ''}" data-rta-demo="1">Démo${d.lignesDemo ? ` (${d.lignesDemo})` : ''}</button>
    </div>
    <div class="rta-kpis">
      <div class="rta-kpi ok"><b>${totalReponses ? Math.round((facile / totalReponses) * 100) + ' %' : '—'}</b><span>trouvent ça « facile »<br><small>${totalReponses} réponse${totalReponses > 1 ? 's' : ''}</small></span></div>
      <div class="rta-kpi${d.nonTraites ? ' att' : ''}"><b>${d.nonTraites}</b><span>avis écrits à lire<br><small>${d.avis} au total</small></span></div>
      <div class="rta-kpi${erreurs30 ? ' ko' : ''}"><b>${erreurs30}</b><span>erreurs rencontrées<br><small>sur 30 jours</small></span></div>
      <button type="button" class="btn btn-secondary rta-actualiser" data-rta="actualiser">${icon('refresh', 14)}Actualiser</button>
    </div>

    <section class="rta-bloc">
      <h2>« Était-ce simple ? »</h2>
      ${
        parcours.length
          ? `<div class="rta-parcours">${parcours
              .map(
                ([k, p]) => `<div class="rta-p">
        <div class="rta-p-tete"><b>${echapper(RTA_PARCOURS[k] || k)}</b><span>${p.scoreFacile} % facile · ${p.total} réponse${p.total > 1 ? 's' : ''}</span></div>
        <div class="rta-barre" role="img" aria-label="${p.facile} facile, ${p.moyen} moyen, ${p.difficile} difficile">
          ${p.facile ? `<i class="f" style="flex:${p.facile}"></i>` : ''}${p.moyen ? `<i class="m" style="flex:${p.moyen}"></i>` : ''}${p.difficile ? `<i class="d" style="flex:${p.difficile}"></i>` : ''}
        </div>
        <div class="rta-legende"><span>${rtaVisage(3, 16)}${p.facile}</span><span>${rtaVisage(2, 16)}${p.moyen}</span><span>${rtaVisage(1, 16)}${p.difficile}</span></div>
      </div>`,
              )
              .join('')}</div>`
          : '<p class="rta-muet">Pas encore de réponse : la question est posée juste après une commande ou une déclaration de panne.</p>'
      }
    </section>

    ${
      d.negatifs && d.negatifs.length
        ? `<section class="rta-bloc"><h2>À surveiller <small>derniers avis « difficile » avec un mot</small></h2><div class="rta-avis">${d.negatifs
            .map(
              (a) =>
                `<article class="rta-a">${rtaVisage(1, 30)}<div class="rta-a-corps"><div class="rta-a-meta"><b>${echapper(RTA_PARCOURS[a.parcours] || a.parcours || 'Général')}</b><span>${echapper(date(a.date))}</span></div><p>${echapper(a.commentaire)}</p></div></article>`,
            )
            .join('')}</div></section>`
        : ''
    }

    <section class="rta-bloc">
      <h2>Tâches menées au bout <small>commande, remise d’un appareil, attestation</small></h2>
      ${
        taches.length
          ? `<div class="rta-parcours">${taches
              .map(([k, p]) => {
                const n = p.reussis + p.abandons;
                const arrets = Object.entries(p.etapes || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                return `<div class="rta-p">
        <div class="rta-p-tete"><b>${echapper(RTA_PARCOURS[k] || k)}</b><span>${p.tauxReussite} % au bout · ${n} essai${n > 1 ? 's' : ''} · durée médiane ${rtaDuree(p.dureeMediane)}</span></div>
        <div class="rta-barre"><i class="f" style="flex:${p.reussis || 0.0001}"></i><i class="d" style="flex:${p.abandons || 0.0001}"></i></div>
        ${arrets.length ? `<div class="rta-abandons">Abandons à l’étape : ${arrets.map(([e, x]) => `<span>${echapper(e)} <b>${x}</b></span>`).join('')}</div>` : ''}
      </div>`;
              })
              .join('')}</div>`
          : '<p class="rta-muet">Pas encore de données : elles arrivent dès les premières commandes et remises.</p>'
      }
    </section>

    <section class="rta-bloc">
      <h2>Utilisation <small>pages vues sur 30 jours</small></h2>
      ${
        pages.length
          ? `<table class="rta-table"><thead><tr><th>Page</th><th>Vues</th><th>Temps médian</th><th>Par type de structure</th></tr></thead><tbody>${pages
              .map(
                ([k, u]) =>
                  `<tr><td>${echapper(RTA_PAGES[k] || k)}</td><td><b>${u.vues}</b></td><td>${rtaDuree(u.dureeMediane)}</td><td class="rta-pages">${Object.entries(
                    u.parType || {},
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, n]) => `${echapper(RTA_TYPES[t] || t)} (${n})`)
                    .join(', ')}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : '<p class="rta-muet">Pas encore de visite enregistrée.</p>'
      }
      ${pages.length && pagesSansVue.length ? `<p class="rta-aide">Jamais ouvertes en 30 jours : ${pagesSansVue.map((p) => echapper(RTA_PAGES[p] || p)).join(', ')}.</p>` : ''}
    </section>

    ${
      (d.parMois || []).length
        ? `<section class="rta-bloc"><h2>Note moyenne par mois <small>de 1 (difficile) à 3 (facile)</small></h2>
      <table class="rta-table"><thead><tr><th>Mois</th>${moisParcours.map((k) => `<th>${echapper(RTA_PARCOURS[k] || k)}</th>`).join('')}</tr></thead><tbody>${d.parMois
        .map(
          (m) =>
            `<tr><td>${echapper(m.mois)}</td>${moisParcours
              .map((k) => {
                const v = m.parcours[k];
                return `<td>${v ? `<b>${String(v.moyenne).replace('.', ',')}</b> <small>(${v.reponses})</small>` : '—'}</td>`;
              })
              .join('')}</tr>`,
        )
        .join('')}</tbody></table></section>`
        : ''
    }

    <section class="rta-bloc">
      <div class="rta-bloc-tete"><h2>Avis écrits</h2>
        <div class="rta-filtres"><button type="button" class="di-filtre${rta.filtre === 'a-lire' ? ' on' : ''}" data-rta-filtre="a-lire">À lire (${d.nonTraites})</button><button type="button" class="di-filtre${rta.filtre === 'tous' ? ' on' : ''}" data-rta-filtre="tous">Tous</button></div></div>
      ${
        avis.length
          ? `<div class="rta-avis">${avis
              .map(
                (a) => `<article class="rta-a${a.traite ? ' traite' : ''}">
        ${a.note ? rtaVisage(a.note, 34) : `<span class="rta-sans-note">${icon('bulle', 16)}</span>`}
        <div class="rta-a-corps">
          <div class="rta-a-meta"><b>${echapper(RTA_PARCOURS[a.parcours] || a.parcours || 'Général')}</b><span>${echapper(date(a.date))}</span>${a.code ? `<span>${echapper(nomStructure(a.code) || a.code)}</span>` : '<span>Anonyme</span>'}${a.reference ? `<span class="rta-ref">${echapper(a.reference)}</span>` : ''}</div>
          <p>${echapper(a.commentaire || '—')}</p>
        </div>
        <button type="button" class="btn btn-secondary rta-traiter" data-rta-traiter="${a.id}" data-rta-etat="${a.traite ? '1' : ''}">${a.traite ? 'Remettre à lire' : `${icon('check', 14)}Traité`}</button>
      </article>`,
              )
              .join('')}</div>`
          : `<p class="rta-muet">${rta.filtre === 'a-lire' ? 'Rien à lire pour l’instant.' : 'Aucun avis écrit.'}</p>`
      }
    </section>

    <section class="rta-bloc">
      <h2>Erreurs rencontrées</h2>
      <p class="rta-aide">Regroupées par message. « Affichée » : message d’erreur vu par l’utilisateur (code invalide, champ manquant, stock insuffisant…) — souvent le signe d’une étape peu claire. « Technique » et « Serveur » : un bug à corriger.</p>
      ${
        (d.erreurs || []).length
          ? `<table class="rta-table"><thead><tr><th>Message</th><th>Type</th><th>30 j</th><th>Total</th><th>Dernière</th><th>Pages</th></tr></thead><tbody>
        ${d.erreurs
          .map((e) => {
            const t = RTA_TYPES_ERREUR[e.type] || [e.type, ''];
            return `<tr>
          <td class="rta-msg">${echapper(e.message)}</td>
          <td><span class="rta-type ${e.type}" title="${echapper(t[1])}">${echapper(t[0])}</span></td>
          <td><b>${e.trenteJours}</b></td><td>${e.nombre}</td><td>${echapper(date(e.derniere))}</td>
          <td class="rta-pages">${
            Object.entries(e.pages || {})
              .map(([p, n]) => `${echapper(p)} (${n})`)
              .join(', ') || '—'
          }</td></tr>`;
          })
          .join('')}
      </tbody></table>`
          : '<p class="rta-muet">Aucune erreur enregistrée.</p>'
      }
    </section>

    <section class="rta-bloc">
      <h2>Abandons des formulaires <small>90 derniers jours</small></h2>
      ${
        formulaires.length
          ? `<div class="rta-parcours">${formulaires
              .map(([k, f]) => {
                const taux = f.sessions ? Math.round((f.terminees / f.sessions) * 100) : 0;
                const top = Object.entries(f.etapes)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                return `<div class="rta-p">
        <div class="rta-p-tete"><b>${echapper(RTA_FORMULAIRES[k] || k)}</b><span>${taux} % vont au bout · ${f.sessions} visite${f.sessions > 1 ? 's' : ''}</span></div>
        <div class="rta-barre"><i class="f" style="flex:${f.terminees || 0.0001}"></i><i class="d" style="flex:${f.sessions - f.terminees || 0.0001}"></i></div>
        ${top.length ? `<div class="rta-abandons">Arrêts les plus fréquents : ${top.map(([e, n]) => `<span>${echapper(e)} <b>${n}</b></span>`).join('')}</div>` : ''}
      </div>`;
              })
              .join('')}</div>`
          : '<p class="rta-muet">Pas encore de données.</p>'
      }
    </section>`;
}

document.addEventListener('click', async (e) => {
  if (state.activeTab !== 'retours') return;
  const f = e.target.closest('[data-rta-filtre]');
  if (f) {
    rta.filtre = f.dataset.rtaFiltre;
    render();
    return;
  }
  const dm = e.target.closest('[data-rta-demo]');
  if (dm) {
    rta.demo = dm.dataset.rtaDemo === '1';
    rtaCharger(true);
    return;
  }
  if (e.target.closest('[data-rta="actualiser"]')) {
    rtaCharger(true);
    return;
  }
  const t = e.target.closest('[data-rta-traiter]');
  if (t) {
    const traite = !t.dataset.rtaEtat;
    const r = await posterEtat(
      { action: 'retour-traiter', id: +t.dataset.rtaTraiter, traite },
      'Enregistrement…',
      traite ? 'Avis marqué traité' : 'Avis remis à lire',
    );
    if (r && r.ok) {
      const a = rta.donnees.avisListe.find((x) => x.id === +t.dataset.rtaTraiter);
      if (a) {
        a.traite = traite;
        rta.donnees.nonTraites += traite ? -1 : 1;
      }
      render();
    }
  }
});
