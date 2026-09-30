/* ════════════════════════════════════════════════════════════════════════════════════
   finance-admin.js — onglet « Finances » de l'admin (rôles Admin et Comptabilité).
   · Indicateurs : facturé, encaissé, reste à encaisser, retards, comparaison N-1 ;
   · mois par mois (encaissé / en attente, repère de l'année précédente) ;
   · par territoire (région → départements) et par type de structure ;
   · impayés par ancienneté, par structure, avec relances par e-mail (tracées) et
     « Marquer payée » ; réglages du délai de paiement et des relances automatiques ;
   · exports CSV (factures filtrées, territoires).
   Routes : src/routes/finance.js. S'appuie sur les fonctions globales d'app.js.
   ════════════════════════════════════════════════════════════════════════════════════ */
const fin = { d: null, chargement: false, filtres: { annee: '', region: '', departement: '', type: '' }, regions: new Set(), structures: new Set(), erreur: '' };
const MOIS_COURTS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const finEur = (n, dec) => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
const finDate = (iso) => { const d = new Date(iso); return iso && !isNaN(d) ? d.toLocaleDateString('fr-FR') : ''; };

async function finCharger(){
  if(fin.chargement) return;
  fin.chargement = true;
  const r = await jsonp(Object.assign({ action: 'finance-tableau', password: motDePasse }, fin.filtres)).catch(() => null);
  fin.chargement = false;
  if(r && r.ok){
    fin.d = r; fin.erreur = '';
    if(!fin.filtres.annee) fin.filtres.annee = r.filtres.annee ? String(r.filtres.annee) : 'tout';
  }else fin.erreur = (r && r.erreur) || 'Chargement impossible.';
  if(state.activeTab === 'finance') render();
}

function finSelect(nom, valeur, options, tous){
  return `<label class="fin-filtre"><span>${echapper(tous[0])}</span><select class="input" data-fin-filtre="${nom}">
    ${tous[1] != null ? `<option value="">${echapper(tous[1])}</option>` : ''}
    ${options.map(([v, l]) => `<option value="${echapper(v)}"${String(valeur) === String(v) ? ' selected' : ''}>${echapper(l)}</option>`).join('')}
  </select></label>`;
}

function vueFinance(){
  const entete = `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Finances</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-5);font-size:15px">Facturation, encaissements et impayés — par mois, par territoire et par structure.</p>`;
  if(!fin.d){
    if(!fin.erreur) finCharger();
    return entete + (fin.erreur ? `<div class="msg msg-erreur">${echapper(fin.erreur)}</div>` : '<p class="rta-muet">Chargement…</p>');
  }
  const d = fin.d, t = d.tableau, k = t.indicateurs, f = fin.filtres;
  const deps = f.region ? (d.disponibles.departements[f.region] || []) : [];
  const evolution = (k.anneePrecedente && d.filtres.annee) ? Math.round((k.facture - k.anneePrecedente) / k.anneePrecedente * 100) : null;
  const libAnnee = d.filtres.annee ? String(d.filtres.annee) : 'toutes années';

  return `${entete}
  <div class="fin-barre">
    ${finSelect('annee', f.annee, [['tout', 'Toutes']].concat(d.disponibles.annees.map(a => [a, a])), ['Année', null])}
    ${finSelect('region', f.region, d.disponibles.regions.map(r => [r, r]), ['Territoire', 'Tous'])}
    ${finSelect('departement', f.departement, deps.map(x => [x, x]), ['Département', f.region ? 'Tous' : 'Choisir un territoire'])}
    ${finSelect('type', f.type, d.disponibles.types.map(x => [x.cle, x.libelle]), ['Type de structure', 'Tous'])}
    <span class="fin-barre-actions">
      <button type="button" class="btn btn-secondary" data-fin-export="factures">${icon('file', 14)}Factures (CSV)</button>
      <button type="button" class="btn btn-secondary" data-fin-export="territoires">${icon('file', 14)}Territoires (CSV)</button>
    </span>
  </div>

  <div class="fin-kpis">
    <div class="rta-kpi"><span><small>Facturé · ${echapper(libAnnee)}</small><b>${finEur(k.facture)}</b>${evolution != null ? `<em class="fin-evol ${evolution >= 0 ? 'hausse' : 'baisse'}">${evolution >= 0 ? '+' : ''}${evolution} % vs ${d.filtres.annee - 1}</em>` : `<em>${k.nbFactures} facture${k.nbFactures > 1 ? 's' : ''}</em>`}</span></div>
    <div class="rta-kpi ok"><span><small>Encaissé</small><b>${finEur(k.encaisse)}</b><em>${String(k.tauxEncaissement).replace('.', ',')} % du facturé</em></span></div>
    <div class="rta-kpi${k.resteTotal ? ' att' : ''}"><span><small>Reste à encaisser</small><b>${finEur(k.resteTotal)}</b><em>${k.nbImpayees} facture${k.nbImpayees > 1 ? 's' : ''}, toutes années</em></span></div>
    <div class="rta-kpi${k.retardTotal ? ' ko' : ''}"><span><small>En retard</small><b>${finEur(k.retardTotal)}</b><em>${k.nbEnRetard} facture${k.nbEnRetard > 1 ? 's' : ''} échue${k.nbEnRetard > 1 ? 's' : ''}</em></span></div>
    <div class="rta-kpi"><span><small>Facture moyenne</small><b>${finEur(k.panierMoyen)}</b><em>${k.nbStructures} structure${k.nbStructures > 1 ? 's' : ''} facturée${k.nbStructures > 1 ? 's' : ''}</em></span></div>
  </div>

  ${t.mois ? finVueMois(t.mois, d.filtres.annee) : ''}

  <section class="rta-bloc">
    <div class="rta-bloc-tete"><h2>Impayés par ancienneté <small>délai de paiement ${d.reglages.delaiJours} j</small></h2>
      ${d.aRelancer.length ? `<button type="button" class="btn btn-primary" data-fin-relancer-tout>${icon('mail', 14)}Relancer les ${d.aRelancer.length} factures dues</button>` : ''}</div>
    ${finVueBalance(t)}
  </section>

  <section class="rta-bloc">
    <h2>Par territoire <small>${echapper(libAnnee)} · reste dû toutes années</small></h2>
    ${finVueTerritoires(t.territoires)}
  </section>

  <section class="rta-bloc">
    <h2>Par type de structure</h2>
    ${t.types.length ? `<table class="rta-table fin-table"><thead><tr><th>Type</th><th class="n">Factures</th><th class="n">Facturé</th><th class="n">Encaissé</th><th class="n">En attente</th><th>Part du facturé</th></tr></thead><tbody>
      ${t.types.map(x => `<tr><td><b>${echapper(x.libelle)}</b></td><td class="n">${x.nbFactures}</td><td class="n">${finEur(x.facture)}</td><td class="n">${finEur(x.encaisse)}</td><td class="n">${finEur(x.reste)}</td>
        <td>${finJauge(k.facture ? x.facture / k.facture : 0)}</td></tr>`).join('')}
    </tbody></table>` : '<p class="rta-muet">Aucune facture sur cette période.</p>'}
  </section>

  ${finVueReglages(d.reglages)}`;
}

function finJauge(part){
  const p = Math.max(0, Math.min(100, Math.round(part * 1000) / 10));
  return `<span class="fin-jauge"><i style="width:${p}%"></i></span><span class="fin-part">${String(p).replace('.', ',')} %</span>`;
}

function finVueMois(mois, annee){
  const max = Math.max(1, ...mois.map(m => Math.max(m.facture, m.precedente)));
  const aujourdhui = new Date();
  return `<section class="rta-bloc">
    <div class="rta-bloc-tete"><h2>Mois par mois <small>${annee}</small></h2>
      <div class="fin-legende"><span><i class="enc"></i>Encaissé</span><span><i class="att"></i>En attente</span><span><i class="prec"></i>${annee - 1}</span></div></div>
    <div class="fin-mois" role="img" aria-label="Facturation par mois ${annee}">
      ${mois.map(m => {
        const futur = annee === aujourdhui.getFullYear() && m.mois > aujourdhui.getMonth();
        const hEnc = m.encaisse / max * 100, hAtt = (m.facture - m.encaisse) / max * 100, hPrec = m.precedente / max * 100;
        return `<div class="fin-col${futur ? ' futur' : ''}" title="${MOIS_COURTS[m.mois]} ${annee} : ${finEur(m.facture)} facturés, ${finEur(m.encaisse)} encaissés · ${annee - 1} : ${finEur(m.precedente)}">
          <span class="fin-val">${m.facture ? finEur(m.facture) : ''}</span>
          <div class="fin-pile">${m.precedente ? `<i class="prec" style="bottom:${hPrec}%"></i>` : ''}<i class="att" style="height:${hAtt}%"></i><i class="enc" style="height:${hEnc}%"></i></div>
          <span class="fin-mois-nom">${MOIS_COURTS[m.mois]}</span></div>`;
      }).join('')}
    </div></section>`;
}

function finVueBalance(t){
  const total = t.tranches.reduce((s, x) => s + x.montant, 0);
  if(!t.balance.length) return '<p class="rta-muet">Aucune facture impayée. 🎉</p>';
  return `<div class="fin-tranches">${t.tranches.map(x => `<div class="fin-tranche ${x.cle}"><small>${echapper(x.libelle)}</small><b>${finEur(x.montant)}</b>
      <span class="fin-jauge"><i style="width:${total ? Math.round(x.montant / total * 100) : 0}%"></i></span></div>`).join('')}</div>
    <table class="rta-table fin-table fin-balance"><thead><tr><th>Structure</th><th>Territoire</th>${t.tranches.map(x => `<th class="n">${echapper(x.libelle)}</th>`).join('')}<th class="n">Total dû</th><th></th></tr></thead><tbody>
    ${t.balance.map(s => {
      const cle = s.code || s.nom;
      const ouvert = fin.structures.has(cle);
      const dues = s.factures.filter(x => x.joursRetard > 0);
      return `<tr class="fin-ligne${ouvert ? ' ouvert' : ''}" data-fin-structure="${echapper(cle)}">
        <td><b>${echapper(s.nom)}</b>${s.retardMax > 0 ? `<small class="fin-retard">${s.retardMax} j de retard max.</small>` : ''}</td><td>${echapper(s.region)}</td>
        ${t.tranches.map(x => `<td class="n ${s.tranches[x.cle] ? 'fin-' + x.cle : 'fin-zero'}">${s.tranches[x.cle] ? finEur(s.tranches[x.cle]) : '—'}</td>`).join('')}
        <td class="n"><b>${finEur(s.total)}</b></td>
        <td class="fin-actions">${dues.length ? `<button type="button" class="btn btn-secondary fin-mini" data-fin-relancer="${echapper(dues.map(x => x.reference).join(','))}">${icon('mail', 13)}Relancer${dues.length > 1 ? ' (' + dues.length + ')' : ''}</button>` : ''}</td></tr>
        ${ouvert ? `<tr class="fin-detail"><td colspan="${t.tranches.length + 4}"><table class="fin-sous"><thead><tr><th>Facture</th><th>Date</th><th>Échéance</th><th class="n">Montant</th><th>Retard</th><th>Relances</th><th></th></tr></thead><tbody>
          ${s.factures.map(x => `<tr><td class="rta-ref">${echapper(x.reference)}</td><td>${finDate(x.date)}</td><td>${finDate(x.echeance)}</td><td class="n">${finEur(x.montant, true)}</td>
            <td>${x.joursRetard > 0 ? `<span class="fin-badge ko">${x.joursRetard} j</span>` : '<span class="fin-badge">à échoir</span>'}</td>
            <td>${x.relances ? `${x.relances} · dernière le ${finDate(x.derniereRelance)}` : '—'}</td>
            <td class="fin-actions">${x.joursRetard > 0 ? `<button type="button" class="btn btn-ghost fin-mini" data-fin-relancer="${echapper(x.reference)}">Relancer</button>` : ''}
              <button type="button" class="btn btn-ghost fin-mini" data-fin-payee="${echapper(x.reference)}" data-ligne="${x.ligne}">Marquer payée</button></td></tr>`).join('')}
        </tbody></table></td></tr>` : ''}`;
    }).join('')}
    </tbody></table>
    <p class="rta-aide">Cliquez sur une structure pour voir ses factures. Chaque relance part par e-mail à l’adresse de facturation et reste tracée dans l’historique de la facture et de la commande.</p>`;
}

function finVueTerritoires(territoires){
  if(!territoires.length) return '<p class="rta-muet">Aucune facture sur cette période.</p>';
  const total = territoires.reduce((s, x) => s + x.facture, 0);
  return `<table class="rta-table fin-table"><thead><tr><th>Territoire</th><th class="n">Structures</th><th class="n">Factures</th><th class="n">Facturé</th><th class="n">Encaissé</th><th class="n">Reste dû</th><th>Part du facturé</th></tr></thead><tbody>
    ${territoires.map(r => {
      const ouvert = fin.regions.has(r.region);
      return `<tr class="fin-ligne${ouvert ? ' ouvert' : ''}" data-fin-region="${echapper(r.region)}">
        <td><b>${r.departements.length ? `<span class="fin-chevron">${icon('chevron', 12)}</span>` : ''}${echapper(r.region)}</b></td><td class="n">${r.nbStructures}</td><td class="n">${r.nbFactures}</td>
        <td class="n"><b>${finEur(r.facture)}</b></td><td class="n">${finEur(r.encaisse)}</td><td class="n ${r.resteDu ? 'fin-t60' : 'fin-zero'}">${r.resteDu ? finEur(r.resteDu) : '—'}</td>
        <td>${finJauge(total ? r.facture / total : 0)}</td></tr>
        ${ouvert ? r.departements.map(dp => `<tr class="fin-sousligne"><td>Département ${echapper(dp.departement)}</td><td class="n">${dp.nbStructures}</td><td class="n">${dp.nbFactures}</td>
          <td class="n">${finEur(dp.facture)}</td><td class="n">${finEur(dp.encaisse)}</td><td class="n">${dp.reste ? finEur(dp.reste) : '—'}</td><td>${finJauge(r.facture ? dp.facture / r.facture : 0)}</td></tr>`).join('') : ''}`;
    }).join('')}
  </tbody></table>`;
}

function finVueReglages(r){
  return `<section class="rta-bloc">
    <h2>Délai de paiement et relances</h2>
    <form class="fin-reglages" id="fin-reglages">
      <label>Délai de paiement<span><input class="input" type="number" name="delaiJours" min="0" max="120" value="${r.delaiJours}"> jours</span></label>
      <label class="fin-case"><input type="checkbox" name="relancesAuto"${r.relancesAuto ? ' checked' : ''}> Relances automatiques</label>
      <label>1re relance<span><input class="input" type="number" name="premierDelai" min="0" max="90" value="${r.premierDelai}"> j après l’échéance</span></label>
      <label>Puis tous les<span><input class="input" type="number" name="intervalle" min="3" max="90" value="${r.intervalle}"> jours</span></label>
      <label>Au plus<span><input class="input" type="number" name="max" min="1" max="6" value="${r.max}"> relances</span></label>
      <button class="btn btn-primary" type="submit">Enregistrer</button>
    </form>
    <p class="rta-aide">Les relances automatiques partent lors de la tâche planifiée <code>taches/relances-impayes</code> (par exemple chaque lundi matin). Le bouton « Relancer » fonctionne toujours, même si elles sont désactivées.</p>
  </section>`;
}

/* ── Export CSV (séparateur « ; », BOM UTF-8 : s'ouvre tel quel dans Excel / LibreOffice) ── */
function finCsv(nom, entetes, lignes){
  const cellule = v => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const nombre = n => (Number(n) || 0).toFixed(2).replace('.', ',');
  const texte = '﻿' + [entetes, ...lignes.map(l => l.map(v => typeof v === 'number' ? nombre(v) : v))].map(l => l.map(cellule).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texte], { type: 'text/csv;charset=utf-8' }));
  a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function finExporter(quoi){
  const d = fin.d, suffixe = [d.filtres.annee || 'toutes-annees', d.filtres.region, d.filtres.departement, d.filtres.type].filter(Boolean).join('-').replace(/[^\wÀ-ÿ-]+/g, '_');
  if(quoi === 'territoires'){
    const lignes = [];
    d.tableau.territoires.forEach(r => {
      lignes.push([r.region, '', r.nbStructures, r.nbFactures, r.facture, r.encaisse, r.resteDu]);
      r.departements.forEach(dp => lignes.push([r.region, dp.departement, dp.nbStructures, dp.nbFactures, dp.facture, dp.encaisse, dp.reste]));
    });
    return finCsv(`territoires-${suffixe}.csv`, ['Territoire', 'Département', 'Structures', 'Factures', 'Facturé', 'Encaissé', 'Reste dû'], lignes);
  }
  finCsv(`factures-${suffixe}.csv`, ['Référence', 'Date', 'Échéance', 'Structure', 'Code', 'Territoire', 'Département', 'Type', 'Nature', 'Montant', 'Statut', 'Payée', 'Jours de retard', 'Relances', 'Commande'],
    d.factures.map(f => [f.reference, finDate(f.date), finDate(f.echeance), f.nomStructure, f.code, f.region, f.departement, f.type, f.nature, f.montant, f.statut, f.payee ? 'Oui' : 'Non', f.joursRetard > 0 ? f.joursRetard : 0, f.relances, f.referenceCommande]));
}

/* ── Actions ── */
async function finRelancer(references){
  const n = references.length;
  if(!(await confirmerCvdl(`Envoyer ${n > 1 ? n + ' relances' : 'une relance'} par e-mail ?\nLe message rappelle la facture, son montant et son échéance, et reste tracé dans l’historique.`, { ok: 'Envoyer' }))) return;
  const r = await posterEtat({ action: 'finance-relancer', references }, 'Envoi des relances…', 'Relances envoyées');
  if(r && r.ok){
    if(r.ignorees && r.ignorees.length) etat(`${r.envoyees.length} relance(s) envoyée(s), ${r.ignorees.length} ignorée(s) : ${r.ignorees.map(x => x.reference + ' (' + x.raison + ')').join(', ')}`, r.envoyees.length ? 'succes' : 'erreur');
    await finCharger();
  }
}
async function finMarquerPayee(reference, ligne){
  if(!(await confirmerCvdl(`Marquer la facture ${reference} comme payée ?`, { ok: 'Marquer payée' }))) return;
  const facture = (fin.d.factures || []).find(f => f.reference === reference);
  const r = await posterEtat({ action: 'facture-update', ligne, champ: 'statut', valeur: 'Payée' }, 'Enregistrement…', 'Facture marquée payée');
  if(r && r.ok){
    const c = facture && facture.referenceCommande && (state.commandes || []).find(x => x.reference === facture.referenceCommande);
    if(c) await poster({ action: 'update', ligne: c.ligne, champ: 'statutPaiement', valeur: 'Payé' }).then(x => { if(x && x.ok) c.statutPaiement = 'Payé'; });
    const f = (state.factures || []).find(x => x.referenceFacture === reference);
    if(f) f.statut = 'Payée';
    await finCharger();
  }
}

document.addEventListener('change', e => {
  const s = e.target.closest && e.target.closest('[data-fin-filtre]');
  if(!s) return;
  fin.filtres[s.dataset.finFiltre] = s.value;
  if(s.dataset.finFiltre === 'region') fin.filtres.departement = '';
  finCharger();
});
document.addEventListener('click', e => {
  if(state.activeTab !== 'finance') return;
  const rel = e.target.closest('[data-fin-relancer]');
  if(rel){ e.stopPropagation(); return finRelancer(rel.dataset.finRelancer.split(',').filter(Boolean)); }
  if(e.target.closest('[data-fin-relancer-tout]')) return finRelancer(fin.d.aRelancer.slice());
  const pay = e.target.closest('[data-fin-payee]');
  if(pay){ e.stopPropagation(); return finMarquerPayee(pay.dataset.finPayee, parseInt(pay.dataset.ligne, 10)); }
  const exp = e.target.closest('[data-fin-export]');
  if(exp) return finExporter(exp.dataset.finExport);
  const reg = e.target.closest('[data-fin-region]');
  if(reg){ const c = reg.dataset.finRegion; fin.regions.has(c) ? fin.regions.delete(c) : fin.regions.add(c); return render(); }
  const st = e.target.closest('[data-fin-structure]');
  if(st && !e.target.closest('button')){ const c = st.dataset.finStructure; fin.structures.has(c) ? fin.structures.delete(c) : fin.structures.add(c); return render(); }
});
document.addEventListener('submit', async e => {
  if(e.target.id !== 'fin-reglages') return;
  e.preventDefault();
  const f = e.target;
  const r = await posterEtat({ action: 'finance-reglages', delaiJours: f.delaiJours.value, relancesAuto: f.relancesAuto.checked, premierDelai: f.premierDelai.value, intervalle: f.intervalle.value, max: f.max.value }, 'Enregistrement…', 'Réglages enregistrés');
  if(r && r.ok) finCharger();
});
