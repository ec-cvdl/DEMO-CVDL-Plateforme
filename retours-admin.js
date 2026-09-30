/* ════════════════════════════════════════════════════════════════════════════════════
   retours-admin.js — onglet « Retours » de l'admin : ce que les structures et les personnes
   accompagnées pensent de l'outil, et où elles bloquent.
   · « Était-ce simple ? » par parcours (commande, SAV structure, SAV personne, espace) ;
   · avis écrits à lire (marquer « traité ») ;
   · erreurs rencontrées, regroupées par message (affichées à l'écran, techniques, serveur) ;
   · abandons des formulaires sur 90 jours (où les gens s'arrêtent).
   Données anonymes, conservées 13 mois. Routes : src/routes/retours.js.
   S'appuie sur les fonctions globales d'app.js (jsonp, posterEtat, echapper, icon, render…).
   ════════════════════════════════════════════════════════════════════════════════════ */
const rta = { charge: false, chargement: false, donnees: null, filtre: 'a-lire' };

const RTA_PARCOURS = { commande: 'Passer une commande', sav: 'Déclarer une panne (structure)', 'sav-beneficiaire': 'Déclarer une panne (personne)', 'portail-structure': 'Espace structure', 'portail-beneficiaire': 'Espace personne' };
const RTA_FORMULAIRES = { commande: 'Commande', 'sav-structure': 'SAV · structure', 'sav-beneficiaire': 'SAV · personne' };
const RTA_TYPES_ERREUR = { 'erreur-page': ['Affichée', 'Message d’erreur vu par l’utilisateur'], 'erreur-js': ['Technique', 'Erreur dans la page'], 'erreur-serveur': ['Serveur', 'Exception côté serveur'] };
const RTA_FOND = { 1: '#F7A8AA', 2: '#FEE9A6', 3: '#A7E0BF' };
const RTA_BOUCHE = { 1: 'M17 32c2.2-3 11.8-3 14 0', 2: 'M17 30.5h14', 3: 'M16.5 28c2.4 4 12.6 4 15 0' };
function rtaVisage(n, t){ n = +n || 2; t = t || 28; return `<svg viewBox="0 0 48 48" width="${t}" height="${t}" aria-hidden="true" style="overflow:visible;flex:none"><circle cx="26" cy="26" r="16" fill="${RTA_FOND[n]}"/><g fill="none" stroke="#002743" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="${RTA_BOUCHE[n]}"/></g><circle cx="18.5" cy="20" r="2" fill="#002743"/><circle cx="29.5" cy="20" r="2" fill="#002743"/></svg>`; }

async function rtaCharger(forcer){
  if(rta.chargement || (rta.charge && !forcer)) return;
  rta.chargement = true;
  try{
    const r = await jsonp({ action: 'retours-admin', password: motDePasse });
    if(r && r.ok){ rta.donnees = r; rta.charge = true; }
    else etat((r && r.erreur) || 'Chargement des retours impossible', 'erreur');
  }catch(e){ etat('Chargement des retours impossible', 'erreur'); }
  rta.chargement = false;
  if(state.activeTab === 'retours') render();
}

function vueRetours(){
  const entete = `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Retours</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Ce que les structures et les personnes pensent de l’outil, et où elles bloquent. Anonyme, conservé 13 mois.</p>`;
  if(!rta.charge){ rtaCharger(); return entete + '<p class="rta-muet">Chargement…</p>'; }
  const d = rta.donnees;
  const parcours = Object.entries(d.parParcours || {}).sort((a, b) => b[1].total - a[1].total);
  const totalReponses = parcours.reduce((t, [, p]) => t + p.total, 0);
  const facile = parcours.reduce((t, [, p]) => t + p.facile, 0);
  const erreurs30 = (d.erreurs || []).reduce((t, e) => t + e.trenteJours, 0);
  const avis = (d.avisListe || []).filter(a => rta.filtre === 'tous' || !a.traite);
  const nomStructure = code => ((state.structures || []).find(s => s.code === code) || {}).nom || '';
  const date = v => { const x = new Date(v); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
  const formulaires = Object.entries(d.abandons || {});
  return `${entete}
    <div class="rta-kpis">
      <div class="rta-kpi ok"><b>${totalReponses ? Math.round(facile / totalReponses * 100) + ' %' : '—'}</b><span>trouvent ça « facile »<br><small>${totalReponses} réponse${totalReponses > 1 ? 's' : ''}</small></span></div>
      <div class="rta-kpi${d.nonTraites ? ' att' : ''}"><b>${d.nonTraites}</b><span>avis écrits à lire<br><small>${d.avis} au total</small></span></div>
      <div class="rta-kpi${erreurs30 ? ' ko' : ''}"><b>${erreurs30}</b><span>erreurs rencontrées<br><small>sur 30 jours</small></span></div>
      <button type="button" class="btn btn-secondary rta-actualiser" data-rta="actualiser">${icon('refresh', 14)}Actualiser</button>
    </div>

    <section class="rta-bloc">
      <h2>« Était-ce simple ? »</h2>
      ${parcours.length ? `<div class="rta-parcours">${parcours.map(([k, p]) => `<div class="rta-p">
        <div class="rta-p-tete"><b>${echapper(RTA_PARCOURS[k] || k)}</b><span>${p.scoreFacile} % facile · ${p.total} réponse${p.total > 1 ? 's' : ''}</span></div>
        <div class="rta-barre" role="img" aria-label="${p.facile} facile, ${p.moyen} moyen, ${p.difficile} difficile">
          ${p.facile ? `<i class="f" style="flex:${p.facile}"></i>` : ''}${p.moyen ? `<i class="m" style="flex:${p.moyen}"></i>` : ''}${p.difficile ? `<i class="d" style="flex:${p.difficile}"></i>` : ''}
        </div>
        <div class="rta-legende"><span>${rtaVisage(3, 16)}${p.facile}</span><span>${rtaVisage(2, 16)}${p.moyen}</span><span>${rtaVisage(1, 16)}${p.difficile}</span></div>
      </div>`).join('')}</div>` : '<p class="rta-muet">Pas encore de réponse : la question est posée juste après une commande ou une déclaration de panne.</p>'}
    </section>

    <section class="rta-bloc">
      <div class="rta-bloc-tete"><h2>Avis écrits</h2>
        <div class="rta-filtres"><button type="button" class="di-filtre${rta.filtre === 'a-lire' ? ' on' : ''}" data-rta-filtre="a-lire">À lire (${d.nonTraites})</button><button type="button" class="di-filtre${rta.filtre === 'tous' ? ' on' : ''}" data-rta-filtre="tous">Tous</button></div></div>
      ${avis.length ? `<div class="rta-avis">${avis.map(a => `<article class="rta-a${a.traite ? ' traite' : ''}">
        ${a.note ? rtaVisage(a.note, 34) : `<span class="rta-sans-note">${icon('bulle', 16)}</span>`}
        <div class="rta-a-corps">
          <div class="rta-a-meta"><b>${echapper(RTA_PARCOURS[a.parcours] || a.parcours || 'Général')}</b><span>${echapper(date(a.date))}</span>${a.code ? `<span>${echapper(nomStructure(a.code) || a.code)}</span>` : '<span>Anonyme</span>'}${a.reference ? `<span class="rta-ref">${echapper(a.reference)}</span>` : ''}</div>
          <p>${echapper(a.commentaire || '—')}</p>
        </div>
        <button type="button" class="btn btn-secondary rta-traiter" data-rta-traiter="${a.ligne}" data-rta-etat="${a.traite ? '1' : ''}">${a.traite ? 'Remettre à lire' : `${icon('check', 14)}Traité`}</button>
      </article>`).join('')}</div>` : `<p class="rta-muet">${rta.filtre === 'a-lire' ? 'Rien à lire pour l’instant.' : 'Aucun avis écrit.'}</p>`}
    </section>

    <section class="rta-bloc">
      <h2>Erreurs rencontrées</h2>
      <p class="rta-aide">Regroupées par message. « Affichée » : message d’erreur vu par l’utilisateur (code invalide, champ manquant, stock insuffisant…) — souvent le signe d’une étape peu claire. « Technique » et « Serveur » : un bug à corriger.</p>
      ${(d.erreurs || []).length ? `<table class="rta-table"><thead><tr><th>Message</th><th>Type</th><th>30 j</th><th>Total</th><th>Dernière</th><th>Pages</th></tr></thead><tbody>
        ${d.erreurs.map(e => { const t = RTA_TYPES_ERREUR[e.type] || [e.type, '']; return `<tr>
          <td class="rta-msg">${echapper(e.message)}</td>
          <td><span class="rta-type ${e.type}" title="${echapper(t[1])}">${echapper(t[0])}</span></td>
          <td><b>${e.trenteJours}</b></td><td>${e.nombre}</td><td>${echapper(date(e.derniere))}</td>
          <td class="rta-pages">${Object.entries(e.pages || {}).map(([p, n]) => `${echapper(p)} (${n})`).join(', ') || '—'}</td></tr>`; }).join('')}
      </tbody></table>` : '<p class="rta-muet">Aucune erreur enregistrée.</p>'}
    </section>

    <section class="rta-bloc">
      <h2>Abandons des formulaires <small>90 derniers jours</small></h2>
      ${formulaires.length ? `<div class="rta-parcours">${formulaires.map(([k, f]) => { const taux = f.sessions ? Math.round(f.terminees / f.sessions * 100) : 0; const top = Object.entries(f.etapes).sort((a, b) => b[1] - a[1]).slice(0, 3); return `<div class="rta-p">
        <div class="rta-p-tete"><b>${echapper(RTA_FORMULAIRES[k] || k)}</b><span>${taux} % vont au bout · ${f.sessions} visite${f.sessions > 1 ? 's' : ''}</span></div>
        <div class="rta-barre"><i class="f" style="flex:${f.terminees || 0.0001}"></i><i class="d" style="flex:${(f.sessions - f.terminees) || 0.0001}"></i></div>
        ${top.length ? `<div class="rta-abandons">Arrêts les plus fréquents : ${top.map(([e, n]) => `<span>${echapper(e)} <b>${n}</b></span>`).join('')}</div>` : ''}
      </div>`; }).join('')}</div>` : '<p class="rta-muet">Pas encore de données.</p>'}
    </section>`;
}

document.addEventListener('click', async e => {
  if(state.activeTab !== 'retours') return;
  const f = e.target.closest('[data-rta-filtre]');
  if(f){ rta.filtre = f.dataset.rtaFiltre; render(); return; }
  if(e.target.closest('[data-rta="actualiser"]')){ rtaCharger(true); return; }
  const t = e.target.closest('[data-rta-traiter]');
  if(t){
    const traite = !t.dataset.rtaEtat;
    const r = await posterEtat({ action: 'retour-traiter', ligne: +t.dataset.rtaTraiter, traite }, 'Enregistrement…', traite ? 'Avis marqué traité' : 'Avis remis à lire');
    if(r && r.ok){
      const a = rta.donnees.avisListe.find(x => x.ligne === +t.dataset.rtaTraiter);
      if(a){ a.traite = traite; rta.donnees.nonTraites += traite ? -1 : 1; }
      render();
    }
  }
});
