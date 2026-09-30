/* ════════════════════════════════════════════════════════════════════════════════════
   depannage-admin.js — onglet « Dépannage » de l'admin : arbres de décision proposés après le
   choix du symptôme, avant la déclaration d'un SAV (pages sav.html / sav-beneficiaire.html).
   · Liste : arbres, statut, symptômes rattachés, statistiques (réglé sans SAV / SAV déclaré),
     symptômes encore sans arbre, derniers parcours ;
   · Éditeur : plan de l'arbre (à gauche), étape choisie (au centre), aperçu exact de ce que
     verra la structure (à droite, depannage.js) ;
   · Import du fichier .json de l'ancien outil d'arbres de décision (sauvegarde ou export).
   S'appuie sur les fonctions globales d'app.js : jsonp, poster, posterEtat, etat, echapper,
   icon, render, confirmerCvdl, motDePasse. Routes : src/routes/depannage.js.
   ════════════════════════════════════════════════════════════════════════════════════ */
const dpa = {
  charge: false, chargement: false, arbres: [], recents: [], symptomes: null,
  edition: null,      // copie de travail de l'arbre ouvert
  etape: null,        // id de l'étape sélectionnée
  modifie: false,
  vueApercu: null,
};

function dpaId(){ return Math.random().toString(36).slice(2, 10); }
function dpaCopie(o){ return JSON.parse(JSON.stringify(o)); }

async function dpaCharger(forcer){
  if(dpa.chargement || (dpa.charge && !forcer)) return;
  dpa.chargement = true;
  try{
    const [r, rs] = await Promise.all([
      jsonp({ action: 'depannage-admin', password: motDePasse }),
      dpa.symptomes ? Promise.resolve(null) : jsonp({ action: 'sav-symptomes' }).catch(() => null),
    ]);
    if(r && r.ok){ dpa.arbres = r.arbres || []; dpa.recents = r.recents || []; dpa.charge = true; }
    else etat((r && r.erreur) || 'Chargement du dépannage impossible', 'erreur');
    if(rs && rs.ok) dpa.symptomes = rs.symptomes || [];
  }catch(e){ etat('Chargement du dépannage impossible', 'erreur'); }
  dpa.chargement = false;
  if(state.activeTab === 'depannage') render();
}

/* ── Vérifications (mêmes règles que le serveur, regles/depannage.js) ── */
function dpaAlertes(a){
  const out = [];
  const vus = new Set(); const pile = [a.depart];
  while(pile.length){ const id = pile.pop(); if(vus.has(id) || !a.etapes[id]) continue; vus.add(id); (a.etapes[id].reponses || []).forEach(r => pile.push(r.cible)); }
  a.ordre.forEach(id => { if(!vus.has(id)) out.push({ etape: id, message: `« ${a.etapes[id].titre || 'Sans titre'} » n’est reliée à aucune réponse : personne n’y arrivera.` }); });
  const fins = a.ordre.map(id => a.etapes[id].fin);
  if(!fins.includes('resolu')) out.push({ message: 'Aucune étape « Problème réglé » : ce parcours ne peut jamais éviter un SAV.' });
  if(!fins.includes('sav')) out.push({ message: 'Aucune étape « Déclarer un SAV » : prévoyez une sortie quand rien ne marche.' });
  a.ordre.forEach(id => { const e = a.etapes[id]; if(!e.fin && !(e.reponses || []).length) out.push({ etape: id, message: `« ${e.titre || 'Sans titre'} » n’a ni réponse ni fin : les deux choix « réglé / SAV » seront proposés.` }); });
  if(a.statut === 'publie' && !a.symptomes.length) out.push({ message: 'Publié mais rattaché à aucun symptôme : il ne sera jamais proposé.' });
  return out;
}

/* ════════════════════ Vue principale ════════════════════ */
function vueDepannage(){
  if(!dpa.charge){ dpaCharger(); return `<h1 style="font-size:32px;margin-bottom:var(--space-2)">Dépannage</h1><p class="dpa-sous">Chargement…</p>`; }
  return dpa.edition ? vueDepannageEditeur() : vueDepannageListe();
}

function dpaPastilleStatut(a){ return a.statut === 'publie' ? '<span class="dpa-statut on">Publié</span>' : '<span class="dpa-statut">Brouillon</span>'; }

function vueDepannageListe(){
  const arbres = dpa.arbres.slice().sort((x, y) => (y.statut === 'publie') - (x.statut === 'publie') || x.titre.localeCompare(y.titre, 'fr'));
  const tot = arbres.reduce((t, a) => ({ total: t.total + a.stats.total, resolus: t.resolus + a.stats.resolus, sav: t.sav + a.stats.sav }), { total: 0, resolus: 0, sav: 0 });
  const pct = tot.total ? Math.round(tot.resolus / tot.total * 100) : 0;
  const couverts = new Set(arbres.filter(a => a.statut === 'publie').flatMap(a => a.symptomes.map(s => s.toLowerCase())));
  const sansArbre = (dpa.symptomes || []).filter(s => !couverts.has(s.toLowerCase()));
  const titreArbre = id => (dpa.arbres.find(a => a.identifiant === id) || {}).titre || id;
  return `
    <div class="dpa-entete">
      <div><h1 style="font-size:32px;margin-bottom:var(--space-2)">Dépannage</h1>
        <p class="dpa-sous">Arbres de décision proposés après le choix du symptôme, avant de déclarer un SAV. Si le problème est réglé, aucune demande n’arrive.</p></div>
      <div class="dpa-entete-actions">
        <label class="btn btn-secondary">${icon('file', 15)}Importer (.json)<input type="file" accept=".json,application/json" data-dpa-importer hidden></label>
        <button type="button" class="btn btn-primary" data-dpa="nouveau">${icon('plus', 15)}Nouvel arbre</button>
      </div>
    </div>
    <div class="dpa-kpis">
      <div class="dpa-kpi"><b>${arbres.filter(a => a.statut === 'publie').length}</b><span>arbre${arbres.filter(a => a.statut === 'publie').length > 1 ? 's' : ''} publié${arbres.filter(a => a.statut === 'publie').length > 1 ? 's' : ''}</span></div>
      <div class="dpa-kpi"><b>${tot.total}</b><span>parcours effectués</span></div>
      <div class="dpa-kpi ok"><b>${tot.resolus}</b><span>réglés sans SAV${tot.total ? ` · ${pct} %` : ''}</span></div>
      <div class="dpa-kpi"><b>${tot.sav}</b><span>SAV déclarés ensuite</span></div>
    </div>
    ${sansArbre.length && dpa.symptomes ? `<div class="dpa-bandeau">${icon('info', 16)}<span><b>Symptômes sans dépannage :</b> ${sansArbre.map(s => `<button type="button" class="dpa-puce" data-dpa-nouveau-symptome="${echapper(s)}" title="Créer un arbre pour ce symptôme">${echapper(s)} ${icon('plus', 11)}</button>`).join(' ')}</span></div>` : ''}
    ${arbres.length ? `<div class="dpa-grille">${arbres.map(a => {
      const n = a.ordre.length;
      const p = a.stats.total ? Math.round(a.stats.resolus / a.stats.total * 100) : null;
      return `<article class="dpa-carte" data-dpa-ouvrir="${echapper(a.identifiant)}" role="button" tabindex="0" aria-label="Modifier ${echapper(a.titre)}">
        <div class="dpa-carte-tete">${dpaPastilleStatut(a)}${(a.alertes || []).length ? `<span class="dpa-alerte-mini" title="${(a.alertes || []).length} point(s) d’attention">${icon('alert', 13)}${(a.alertes || []).length}</span>` : ''}</div>
        <h3>${echapper(a.titre)}</h3>
        ${a.description ? `<p>${echapper(a.description)}</p>` : ''}
        <div class="dpa-symptomes">${a.symptomes.length ? a.symptomes.map(s => `<span>${echapper(s)}</span>`).join('') : '<em>Aucun symptôme rattaché</em>'}</div>
        <div class="dpa-carte-pied">
          <span>${n} étape${n > 1 ? 's' : ''}</span>
          ${a.stats.total ? `<span class="dpa-barre" title="${a.stats.resolus} réglé(s) · ${a.stats.sav} SAV"><i style="width:${p}%"></i></span><span><b>${p} %</b> réglés (${a.stats.total})</span>` : '<span class="dpa-muet">Pas encore utilisé</span>'}
        </div>
      </article>`; }).join('')}</div>`
      : `<div class="dpa-vide"><span data-ill="aide" class="ill xl"></span><h3>Aucun arbre pour l’instant</h3><p>Créez-en un, ou importez le fichier .json exporté de votre outil d’arbres de décision.</p></div>`}
    ${dpa.recents.length ? `<section class="dpa-recents"><h2>Derniers parcours</h2>
      <table class="dpa-table"><thead><tr><th>Date</th><th>Arbre</th><th>Symptôme</th><th>Arrivé à</th><th>Issue</th><th>Origine</th></tr></thead><tbody>
      ${dpa.recents.map(p => `<tr><td>${echapper(new Date(p.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}</td><td>${echapper(titreArbre(p.arbre))}</td><td>${echapper(p.symptome)}</td><td>${echapper(p.etapeFin)}</td>
        <td>${p.issue === 'resolu' ? '<span class="dpa-issue ok">Réglé</span>' : `<span class="dpa-issue">SAV${p.referenceSav ? ` <button type="button" class="et-lien" data-sav-ouvrir="${echapper(p.referenceSav)}">${echapper(p.referenceSav)}</button>` : ''}</span>`}</td>
        <td>${p.origine === 'beneficiaire' ? 'Personne accompagnée' : echapper(p.code || 'Structure')}</td></tr>`).join('')}
      </tbody></table></section>` : ''}`;
}

/* ════════════════════ Éditeur ════════════════════ */
function dpaNouvelArbre(symptome){
  const q = dpaId(), ok = dpaId(), sav = dpaId();
  return {
    identifiant: '', titre: symptome ? symptome : 'Nouvel arbre', description: '', statut: 'brouillon', symptomes: symptome ? [symptome] : [],
    depart: q, ordre: [q, ok, sav],
    etapes: {
      [q]: { titre: 'Première vérification', texte: 'Décrivez ce que la personne doit regarder ou faire.', astuce: '', media: null, fin: '', reponses: [{ libelle: 'Ça fonctionne', cible: ok }, { libelle: 'Toujours en panne', cible: sav }] },
      [ok]: { titre: 'Problème réglé', texte: 'L’appareil fonctionne à nouveau normalement.', astuce: '', media: null, fin: 'resolu', reponses: [] },
      [sav]: { titre: 'Notre équipe prend le relais', texte: 'Ce problème demande une intervention : déclarez le SAV, nous revenons vers vous rapidement.', astuce: '', media: null, fin: 'sav', reponses: [] },
    },
  };
}
function dpaOuvrir(a){
  dpa.edition = dpaCopie(a);
  delete dpa.edition.stats; delete dpa.edition.alertes; delete dpa.edition.ligne;
  dpa.etape = dpa.edition.depart;
  dpa.modifie = !a.identifiant;
  render();
}

/** Plan : parcours en profondeur depuis le départ, avec la réponse qui mène à chaque étape. */
function dpaPlan(a){
  const lignes = []; const vus = new Set();
  (function visiter(id, niveau, via){
    const e = a.etapes[id]; if(!e) return;
    const deja = vus.has(id);
    lignes.push({ id, niveau, via, renvoi: deja });
    if(deja) return;
    vus.add(id);
    (e.reponses || []).forEach(r => visiter(r.cible, niveau + 1, r.libelle));
  })(a.depart, 0, '');
  const orphelines = a.ordre.filter(id => !vus.has(id));
  return { lignes, orphelines };
}
function dpaIconeFin(e){
  if(e.fin === 'resolu') return '<i class="dpa-f rond ok" title="Fin : problème réglé"></i>';
  if(e.fin === 'sav') return '<i class="dpa-f carre sav" title="Fin : déclarer un SAV"></i>';
  return '<i class="dpa-f losange" title="Question"></i>';
}
function vuePlanDepannage(a){
  const { lignes, orphelines } = dpaPlan(a);
  const item = (l) => { const e = a.etapes[l.id]; return `<button type="button" class="dpa-plan-l${dpa.etape === l.id && !l.renvoi ? ' actif' : ''}${l.renvoi ? ' renvoi' : ''}" style="--niv:${l.niveau}" data-dpa-etape="${l.id}">
      ${l.via ? `<span class="dpa-via">${echapper(l.via)}</span>` : ''}
      <span class="dpa-plan-t">${dpaIconeFin(e)}<span>${l.renvoi ? '↩ ' : ''}${echapper(e.titre || 'Sans titre')}</span>${l.id === a.depart && !l.renvoi ? '<em>Départ</em>' : ''}</span></button>`; };
  return `${lignes.map(item).join('')}
    ${orphelines.length ? `<div class="dpa-plan-sep">Non reliées</div>${orphelines.map(id => item({ id, niveau: 0, via: '' })).join('')}` : ''}
    <button type="button" class="dpa-plan-ajout" data-dpa="etape-ajouter">${icon('plus', 13)}Ajouter une étape</button>`;
}

function vueEtapeDepannage(a){
  const id = dpa.etape; const e = a.etapes[id];
  if(!e) return '<p class="dpa-muet">Choisissez une étape dans le plan.</p>';
  const autres = a.ordre.filter(x => x !== id);
  const type = (k, lib, aide) => `<label class="dpa-type${e.fin === k ? ' choisi' : ''}"><input type="radio" name="dpa-type" value="${k}" ${e.fin === k ? 'checked' : ''} data-dpa-type><b>${lib}</b><small>${aide}</small></label>`;
  const media = e.media;
  return `
    <div class="dpa-etape-tete">
      <div class="rp-surtitre">${id === a.depart ? 'Étape de départ' : 'Étape'}</div>
      <div class="dpa-etape-actions">
        ${id !== a.depart ? `<button type="button" class="et-lien" data-dpa="etape-depart">Mettre au départ</button>` : ''}
        ${a.ordre.length > 1 ? `<button type="button" class="et-lien dpa-rouge" data-dpa="etape-supprimer">${icon('trash', 13)}Supprimer l’étape</button>` : ''}
      </div>
    </div>
    <label class="field"><span>Titre / question *</span><input class="input" id="dpa-e-titre" data-dpa-champ="titre" value="${echapper(e.titre)}" maxlength="160" placeholder="Ex. : Le voyant de charge s’allume-t-il ?"></label>
    <label class="field"><span>Explication</span><textarea class="input" id="dpa-e-texte" data-dpa-champ="texte" rows="4" maxlength="2000" placeholder="Ce que la personne doit regarder ou faire, simplement.">${echapper(e.texte)}</textarea></label>
    <label class="field"><span>Astuce <em>(facultatif, encadré jaune)</em></span><textarea class="input" id="dpa-e-astuce" data-dpa-champ="astuce" rows="2" maxlength="600">${echapper(e.astuce)}</textarea></label>
    <div class="field"><span>Image ou vidéo <em>(facultatif)</em></span>
      ${media ? `<div class="dpa-media">${media.type === 'image' ? `<img src="${echapper(media.url)}" alt="">` : `<span class="dpa-media-video">${icon('lien_externe', 16)}</span>`}
        <span class="dpa-media-nom">${echapper(media.nom || (media.type === 'video' ? media.url : 'Image'))}</span><button type="button" class="et-lien" data-dpa="media-retirer">Retirer</button></div>`
      : `<div class="dpa-media-ajout"><label class="btn btn-secondary">${icon('plus', 14)}Image<input type="file" accept="image/*" data-dpa-image hidden></label>
          <input class="input" id="dpa-e-video" placeholder="ou lien d’une vidéo (https://…)" data-dpa-video></div>`}
    </div>
    <div class="field"><span>Type d’étape</span><div class="dpa-types">
      ${type('', 'Question', 'Des réponses mènent aux étapes suivantes')}
      ${type('resolu', 'Fin : problème réglé', 'Aucune demande SAV n’est envoyée')}
      ${type('sav', 'Fin : déclarer un SAV', 'La personne passe à la demande')}
    </div></div>
    ${e.fin ? '' : `<div class="field"><span>Réponses proposées</span>
      <div class="dpa-reponses">${e.reponses.map((r, i) => `<div class="dpa-reponse-l">
        <input class="input" data-dpa-rep-libelle="${i}" id="dpa-r-${i}" value="${echapper(r.libelle)}" maxlength="120" placeholder="Libellé de la réponse">
        <span class="dpa-fleche">→</span>
        <select class="input" data-dpa-rep-cible="${i}" aria-label="Étape suivante">
          ${autres.map(x => `<option value="${x}" ${x === r.cible ? 'selected' : ''}>${echapper(a.etapes[x].titre || 'Sans titre')}</option>`).join('')}
          <option value="__nouvelle">＋ Nouvelle étape…</option>
        </select>
        <button type="button" class="btn btn-ghost btn-icon" data-dpa-rep-aller="${i}" title="Aller à cette étape">${icon('arrow', 14)}</button>
        <button type="button" class="btn btn-ghost btn-icon" data-dpa-rep-suppr="${i}" title="Retirer la réponse">${icon('x', 14)}</button>
      </div>`).join('') || '<p class="dpa-muet">Aucune réponse : la personne pourra dire « réglé » ou déclarer le SAV.</p>'}</div>
      ${e.reponses.length < 8 ? `<button type="button" class="et-lien" data-dpa="reponse-ajouter">${icon('plus', 13)}Ajouter une réponse</button>` : ''}
    </div>`}`;
}

function vueDepannageEditeur(){
  const a = dpa.edition;
  const alertes = dpaAlertes(a);
  const original = dpa.arbres.find(x => x.identifiant === a.identifiant);
  const stats = original ? original.stats : null;
  const listeSymptomes = [...new Set([...(dpa.symptomes || []), ...a.symptomes])];
  const autresArbres = s => dpa.arbres.filter(x => x.identifiant !== a.identifiant && x.statut === 'publie' && x.symptomes.some(y => y.toLowerCase() === s.toLowerCase())).map(x => x.titre);
  return `
    <div class="dpa-barre-ed">
      <button type="button" class="btn-retour dpa-retour" data-dpa="fermer"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>Tous les arbres</button>
      <span class="dpa-etat-modif">${dpa.modifie ? '● Modifications non enregistrées' : 'Enregistré'}</span>
      <div class="dpa-statut-choix" role="group" aria-label="Statut">
        <button type="button" class="${a.statut !== 'publie' ? 'on' : ''}" data-dpa-statut="brouillon">Brouillon</button>
        <button type="button" class="${a.statut === 'publie' ? 'on' : ''}" data-dpa-statut="publie">Publié</button>
      </div>
      ${a.identifiant ? `<button type="button" class="btn btn-ghost" data-dpa="supprimer">${icon('trash', 14)}Supprimer</button>` : ''}
      <button type="button" class="btn btn-primary" data-dpa="enregistrer">${icon('check', 15)}Enregistrer</button>
    </div>
    <h1 style="font-size:28px;margin:0 0 var(--space-4)">${echapper(a.titre || 'Nouvel arbre')}</h1>
    <div class="dpa-ed">
      <aside class="dpa-col dpa-col-plan">
        ${alertes.length ? `<section class="dpa-bloc dpa-alertes">${alertes.map(x => `<button type="button" class="dpa-alerte" ${x.etape ? `data-dpa-etape="${x.etape}"` : ''}>${icon('alert', 14)}<span>${echapper(x.message)}</span></button>`).join('')}</section>` : ''}
        <section class="dpa-bloc"><div class="dpa-bloc-titre">Plan</div><div class="dpa-plan" id="dpa-plan">${vuePlanDepannage(a)}</div></section>
        <section class="dpa-bloc"><div class="dpa-bloc-titre">Réglages</div>
          <label class="field"><span>Titre de l’arbre *</span><input class="input" id="dpa-a-titre" data-dpa-arbre="titre" value="${echapper(a.titre)}" maxlength="160"></label>
          <label class="field"><span>Description <em>(interne)</em></span><input class="input" id="dpa-a-description" data-dpa-arbre="description" value="${echapper(a.description)}" maxlength="400"></label>
          <div class="field"><span>Proposé pour les symptômes</span>
            <div class="dpa-choix-symptomes">${a.symptomes.map(s => `<span class="dpa-puce-choix on">${echapper(s)}<button type="button" data-dpa-symptome-retirer="${echapper(s)}" aria-label="Retirer ${echapper(s)}">${icon('x', 11)}</button></span>`).join('') || '<em class="dpa-muet">Aucun : l’arbre ne sera pas proposé.</em>'}</div>
            ${listeSymptomes.some(s => !a.symptomes.includes(s)) ? `<select class="input" data-dpa-symptome-ajouter aria-label="Ajouter un symptôme"><option value="">＋ Ajouter un symptôme…</option>${listeSymptomes.filter(s => !a.symptomes.includes(s)).map(s => { const pris = autresArbres(s); return `<option value="${echapper(s)}">${echapper(s)}${pris.length ? ` (déjà : ${echapper(pris.join(', '))})` : ''}</option>`; }).join('')}</select>` : ''}
            <p class="csw-aide">Symptômes du formulaire SAV (Réglages). Si deux arbres publiés couvrent le même symptôme, le premier par ordre alphabétique est proposé.</p>
          </div>
          ${stats && stats.total ? `<div class="dpa-stats-ed"><b>${stats.total}</b> parcours · <b>${stats.resolus}</b> réglés · <b>${stats.sav}</b> SAV</div>` : ''}
        </section>
      </aside>
      <section class="dpa-col dpa-bloc dpa-col-etape" id="dpa-etape">${vueEtapeDepannage(a)}</section>
      <aside class="dpa-col dpa-col-apercu">
        <div class="dpa-bloc-titre">Aperçu <small>ce que voit la structure</small></div>
        <div class="dp-zone dpa-apercu" id="dpa-apercu"></div>
      </aside>
    </div>`;
}

/** Après chaque rendu de l'onglet : aperçu (depannage.js) monté sur l'étape choisie. */
function apresRenduDepannage(){
  if(!dpa.edition) return;
  const zone = document.getElementById('dpa-apercu');
  if(!zone || !window.CvdlDepannage) return;
  if(dpa.vueApercu){ try{ dpa.vueApercu.detruire(); }catch(e){} }
  const a = dpa.edition;
  if(!a.etapes[a.depart]) return;
  dpa.vueApercu = CvdlDepannage.monter(zone, a, {
    symptome: a.symptomes[0] || a.titre, apercu: true, focus: false,
    onResolu(){}, onSav(){ etat('Aperçu : la personne passerait à la déclaration du SAV', 'succes'); },
  });
  if(dpa.etape && dpa.etape !== a.depart) dpa.vueApercu.allerA(dpa.etape);
}
let dpaMinuteurApercu = null;
function dpaRafraichirPartiel(){
  dpa.modifie = true;
  const m = document.querySelector('.dpa-etat-modif'); if(m) m.textContent = '● Modifications non enregistrées';
  clearTimeout(dpaMinuteurApercu);
  dpaMinuteurApercu = setTimeout(() => {
    const plan = document.getElementById('dpa-plan'); if(plan) plan.innerHTML = vuePlanDepannage(dpa.edition);
    apresRenduDepannage();
  }, 250);
}
function dpaModifie(){ dpa.modifie = true; render(); }

/* ── Actions ── */
async function dpaEnregistrer(){
  const a = dpa.edition;
  if(!String(a.titre || '').trim()) return etat('Donnez un titre à l’arbre', 'erreur');
  const r = await posterEtat({ action: 'depannage-enregistrer', arbre: a }, 'Enregistrement…', a.statut === 'publie' ? 'Arbre enregistré et publié' : 'Brouillon enregistré');
  if(r && r.ok){
    dpa.edition.identifiant = r.arbre.identifiant;
    dpa.modifie = false;
    await dpaCharger(true);
    render();
  }
}
function dpaAjouterEtape(){
  const id = dpaId();
  dpa.edition.etapes[id] = { titre: 'Nouvelle étape', texte: '', astuce: '', media: null, fin: '', reponses: [] };
  dpa.edition.ordre.push(id);
  return id;
}
function dpaSupprimerEtape(id){
  const a = dpa.edition;
  delete a.etapes[id];
  a.ordre = a.ordre.filter(x => x !== id);
  a.ordre.forEach(x => { a.etapes[x].reponses = (a.etapes[x].reponses || []).filter(r => r.cible !== id); });
  if(a.depart === id) a.depart = a.ordre[0];
  dpa.etape = a.depart;
}
/** Image choisie : réduite (1100 px max, JPEG) pour rester légère dans la base. */
function dpaLireImage(fichier){
  return new Promise((ok, ko) => {
    const lecteur = new FileReader();
    lecteur.onerror = ko;
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = ko;
      img.onload = () => {
        const max = 1100, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        let q = 0.82, url = c.toDataURL('image/jpeg', q);
        while(url.length > 1150000 && q > 0.4){ q -= 0.12; url = c.toDataURL('image/jpeg', q); }
        ok(url);
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}
async function dpaQuitterEdition(){
  if(dpa.modifie && !(await confirmerCvdl('Quitter sans enregistrer ? Les modifications de cet arbre seront perdues.'))) return;
  dpa.edition = null; dpa.etape = null; dpa.modifie = false;
  if(dpa.vueApercu){ try{ dpa.vueApercu.detruire(); }catch(e){} dpa.vueApercu = null; }
  render();
}

document.addEventListener('click', async e => {
  if(state.activeTab !== 'depannage') return;
  const t = e.target;
  const ouvrir = t.closest('[data-dpa-ouvrir]');
  if(ouvrir){ const a = dpa.arbres.find(x => x.identifiant === ouvrir.dataset.dpaOuvrir); if(a) dpaOuvrir(a); return; }
  const nouveauSym = t.closest('[data-dpa-nouveau-symptome]');
  if(nouveauSym){ dpaOuvrir(dpaNouvelArbre(nouveauSym.dataset.dpaNouveauSymptome)); return; }
  const etape = t.closest('[data-dpa-etape]');
  if(etape && dpa.edition){ dpa.etape = etape.dataset.dpaEtape; render(); return; }
  const statut = t.closest('[data-dpa-statut]');
  if(statut && dpa.edition){ dpa.edition.statut = statut.dataset.dpaStatut; dpaModifie(); return; }
  const aller = t.closest('[data-dpa-rep-aller]');
  if(aller && dpa.edition){ const r = dpa.edition.etapes[dpa.etape].reponses[+aller.dataset.dpaRepAller]; if(r){ dpa.etape = r.cible; render(); } return; }
  const retirerSym = t.closest('[data-dpa-symptome-retirer]');
  if(retirerSym && dpa.edition){ dpa.edition.symptomes = dpa.edition.symptomes.filter(x => x !== retirerSym.dataset.dpaSymptomeRetirer); dpaModifie(); return; }
  const suppr = t.closest('[data-dpa-rep-suppr]');
  if(suppr && dpa.edition){ dpa.edition.etapes[dpa.etape].reponses.splice(+suppr.dataset.dpaRepSuppr, 1); dpaModifie(); return; }
  const b = t.closest('[data-dpa]');
  if(!b) return;
  const act = b.dataset.dpa;
  if(act === 'nouveau') dpaOuvrir(dpaNouvelArbre());
  else if(act === 'fermer') dpaQuitterEdition();
  else if(act === 'enregistrer') dpaEnregistrer();
  else if(act === 'supprimer'){
    if(!(await confirmerCvdl(`Supprimer l’arbre « ${dpa.edition.titre} » ? Il ne sera plus proposé ; les statistiques déjà enregistrées sont conservées.`))) return;
    const r = await posterEtat({ action: 'depannage-supprimer', identifiant: dpa.edition.identifiant }, 'Suppression…', 'Arbre supprimé');
    if(r && r.ok){ dpa.edition = null; dpa.modifie = false; await dpaCharger(true); }
  }
  else if(act === 'etape-ajouter'){ dpa.etape = dpaAjouterEtape(); dpaModifie(); }
  else if(act === 'etape-depart'){ dpa.edition.depart = dpa.etape; dpa.edition.ordre = [dpa.etape, ...dpa.edition.ordre.filter(x => x !== dpa.etape)]; dpaModifie(); }
  else if(act === 'etape-supprimer'){
    const e2 = dpa.edition.etapes[dpa.etape];
    if(!(await confirmerCvdl(`Supprimer l’étape « ${e2.titre} » ? Les réponses qui y mènent seront retirées.`))) return;
    dpaSupprimerEtape(dpa.etape); dpaModifie();
  }
  else if(act === 'reponse-ajouter'){
    // Une nouvelle réponse mène à une nouvelle étape (modifiable ensuite vers une étape existante).
    const a = dpa.edition; const e2 = a.etapes[dpa.etape];
    const id = dpaAjouterEtape();
    e2.reponses.push({ libelle: 'Nouvelle réponse', cible: id });
    dpaModifie();
    setTimeout(() => { const champ = document.getElementById('dpa-r-' + (e2.reponses.length - 1)); if(champ){ champ.focus(); champ.select(); } }, 30);
  }
  else if(act === 'media-retirer'){ dpa.edition.etapes[dpa.etape].media = null; dpaModifie(); }
});

document.addEventListener('keydown', e => {
  if(state.activeTab === 'depannage' && e.key === 'Enter' && e.target.matches && e.target.matches('[data-dpa-ouvrir]')) e.target.click();
  if(state.activeTab === 'depannage' && dpa.edition && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); dpaEnregistrer(); }
});

document.addEventListener('input', e => {
  if(state.activeTab !== 'depannage' || !dpa.edition) return;
  const t = e.target; const a = dpa.edition;
  if(t.dataset.dpaArbre){ a[t.dataset.dpaArbre] = t.value; if(t.dataset.dpaArbre === 'titre'){ const h = document.querySelector('.dpa-barre-ed + h1'); if(h) h.textContent = t.value || 'Nouvel arbre'; } dpaRafraichirPartiel(); return; }
  if(t.dataset.dpaChamp){ a.etapes[dpa.etape][t.dataset.dpaChamp] = t.value; dpaRafraichirPartiel(); return; }
  if(t.dataset.dpaRepLibelle != null){ a.etapes[dpa.etape].reponses[+t.dataset.dpaRepLibelle].libelle = t.value; dpaRafraichirPartiel(); return; }
});

document.addEventListener('change', async e => {
  if(state.activeTab !== 'depannage') return;
  const t = e.target;
  if(t.matches('[data-dpa-importer]')){
    const f = t.files && t.files[0]; t.value = '';
    if(!f) return;
    const texte = await f.text();
    const r = await posterEtat({ action: 'depannage-importer', fichier: texte }, 'Import…', 'Import terminé');
    if(r && r.ok){
      etat(`${r.importes.length} arbre(s) importé(s) en brouillon${r.ignores ? `, ${r.ignores} ignoré(s)` : ''}${r.mediasRetires ? ` · ${r.mediasRetires} image(s) trop lourde(s) retirée(s)` : ''}`, 'succes', 6000);
      await dpaCharger(true);
    }
    return;
  }
  if(!dpa.edition) return;
  const a = dpa.edition;
  if(t.matches('[data-dpa-symptome-ajouter]')){
    if(t.value){ a.symptomes = [...new Set([...a.symptomes, t.value])]; dpaModifie(); }
    return;
  }
  if(t.matches('[data-dpa-type]')){
    const e2 = a.etapes[dpa.etape]; e2.fin = t.value;
    if(e2.fin) e2.reponses = [];
    dpaModifie(); return;
  }
  if(t.dataset.dpaRepCible != null){
    const r = a.etapes[dpa.etape].reponses[+t.dataset.dpaRepCible];
    if(t.value === '__nouvelle'){
      const id = dpaAjouterEtape();
      a.etapes[id].titre = r.libelle ? `Après « ${r.libelle} »` : 'Nouvelle étape';
      r.cible = id; dpa.etape = id;
    } else r.cible = t.value;
    dpaModifie(); return;
  }
  if(t.matches('[data-dpa-image]')){
    const f = t.files && t.files[0]; if(!f) return;
    try{ a.etapes[dpa.etape].media = { type: 'image', url: await dpaLireImage(f), nom: f.name }; dpaModifie(); }
    catch(err){ etat('Image illisible', 'erreur'); }
    return;
  }
  if(t.matches('[data-dpa-video]')){
    const u = t.value.trim();
    if(!/^https:\/\/\S{4,}$/.test(u)) return etat('Le lien doit commencer par https://', 'erreur');
    a.etapes[dpa.etape].media = { type: 'video', url: u, nom: '' }; dpaModifie();
  }
});
