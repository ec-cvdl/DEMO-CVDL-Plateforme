/* Admin CVDL — factures mensuelles. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ══════════════ Factures mensuelles (produits payés en fin de mois) ══════════════
   Aperçu par mois et par structure ; émission + envoi à la main, en plus de l'envoi
   automatique le 1er du mois (tâche planifiée /taches/factures-mensuelles). */
let factMens = { mois: '', chargement: false, donnees: null };
function moisCourantIso(decalage = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + decalage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
async function chargerFacturesMensuelles(mois) {
  factMens = { mois: mois || factMens.mois || moisCourantIso(-1), chargement: true, donnees: null };
  render();
  const r = await jsonp({ action: 'factures-mensuelles-apercu', password: motDePasse, mois: factMens.mois });
  factMens.chargement = false;
  factMens.donnees = r;
  if (state.modal && state.modal.kind === 'factures-mensuelles') render();
}
function vueFacturesMensuelles() {
  const d = factMens.donnees;
  const liste = d && d.ok ? d.structures : [];
  const total = liste.reduce((t, x) => t + (x.montant || 0), 0);
  const aEmettre = liste.filter((x) => !x.factureExistante || !x.factureExistante.envoyeeLe).length;
  const corps = `
    <p style="margin:0 0 var(--space-3);font-size:13.5px;opacity:.75">Produits marqués « payé en fin de mois » (fiche produit), regroupés par structure sur les commandes passées dans le mois.
      ${d && d.ok ? (d.envoiAutomatique ? 'Envoi automatique par mail le 1<sup>er</sup> du mois suivant.' : '<b>Envoi automatique désactivé</b> (Config FACTURES_MENSUELLES_AUTO).') : ''}</p>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:var(--space-4)">
      <label for="fm-mois" style="font-weight:600;font-size:13px">Mois</label>
      <input type="month" class="input" id="fm-mois" value="${echapper(factMens.mois)}" style="width:auto">
      ${d && d.ok ? `<span class="tag">${liste.length} structure${liste.length > 1 ? 's' : ''} · ${echapper(formaterMontant(total))}</span>` : ''}
    </div>
    ${
      factMens.chargement
        ? '<p style="opacity:.6">Chargement…</p>'
        : !d
          ? ''
          : !d.ok
            ? `<div class="msg msg-erreur">${echapper(d.erreur || 'Chargement impossible.')}</div>`
            : !liste.length
              ? `<div class="pk-etat"><span data-ill="vide" class="ill"></span>Aucun produit « fin de mois » commandé en ${echapper(d.libelleMois)}.</div>`
              : `<div class="fm-liste">${liste
                  .map((x) => {
                    const f = x.factureExistante;
                    return `<div class="fm-ligne">
          <div class="fm-id"><b>${echapper(x.nom)}</b><small>${echapper(x.email || 'Pas d’email de facturation')}${x.region ? ' · ' + echapper(x.region) : ''}</small></div>
          <div class="fm-arts">${x.lignes.map((l) => `<span><b>${l.quantite} ×</b> ${echapper(l.produit)}</span>`).join('')}<small>${x.commandes.length} commande${x.commandes.length > 1 ? 's' : ''} : ${echapper(x.commandes.join(', '))}</small></div>
          <div class="fm-montant"><b>${echapper(formaterMontant(x.montant))}</b></div>
          <div class="fm-etat">${f ? `<span class="tag" data-forme="rond" style="--forme:var(--th-ac-1f9d55ff, #1F9D55)">${echapper(f.numero)}</span><small>${f.envoyeeLe ? `Envoyée le ${echapper(f.envoyeeLe)}` : 'Émise, pas encore envoyée'}</small>` : '<span class="tag" data-forme="losange" style="--forme:var(--th-ac-e62460ff, #E62460)">À émettre</span>'}</div>
          <div class="fm-act"><button type="button" class="btn btn-secondary" data-fm-emettre="${echapper(x.code)}" ${f && f.envoyeeLe ? 'data-fm-renvoyer="1"' : ''} ${x.email ? '' : 'disabled title="Renseigne un email de facturation sur la structure"'}>${icon('mail', 14)}${f ? (f.envoyeeLe ? 'Renvoyer' : 'Envoyer') : 'Émettre et envoyer'}</button></div>
        </div>`;
                  })
                  .join('')}</div>`
    }`;
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" aria-labelledby="fm-titre" style="width:min(980px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title" id="fm-titre">Factures mensuelles${d && d.ok ? ` — ${echapper(d.libelleMois)}` : ''}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button>
        </div>
        <div class="dialog-corps"><div style="grid-column:1 / -1;min-width:0">${corps}</div></div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:flex-end">
          <button type="button" class="btn btn-primary" data-fm-tout ${aEmettre ? '' : 'disabled'}>${icon('mail', 15)}Émettre et envoyer tout (${aEmettre})</button>
        </div>
      </div>
    </div>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-factures-mensuelles]')) {
    state.modal = { kind: 'factures-mensuelles' };
    chargerFacturesMensuelles(factMens.mois || moisCourantIso(-1));
    return;
  }
  const un = e.target.closest('[data-fm-emettre]');
  const tout = e.target.closest('[data-fm-tout]');
  if (!un && !tout) return;
  const renvoyer = !!(un && un.dataset.fmRenvoyer);
  const nom = un ? ((factMens.donnees.structures || []).find((x) => x.code === un.dataset.fmEmettre) || {}).nom : '';
  if (
    !(await confirmerCvdl(
      un
        ? `${renvoyer ? 'Renvoyer' : 'Envoyer'} la facture mensuelle de ${nom} ?\n\nElle part par mail à l’adresse de facturation de la structure.`
        : 'Envoyer toutes les factures mensuelles du mois ?\n\nChaque structure reçoit sa facture par mail ; celles déjà envoyées ne sont pas renvoyées.',
    ))
  )
    return;
  (un || tout).disabled = true;
  const r = await posterEtat(
    { action: 'facture-mensuelle-emettre', mois: factMens.mois, code: un ? un.dataset.fmEmettre : '', renvoyer },
    'Envoi…',
    'Facture(s) envoyée(s)',
  );
  if (r && !r.ok) {
    const echecs = (r.resultats || []).filter((x) => !x.ok).map((x) => `${x.nom} : ${x.erreur}`);
    afficherErreurModale(echecs.length ? echecs.join(' · ') : r.erreur);
  }
  const rf = await jsonp({ action: 'factures', password: motDePasse, limite: 0 });
  if (rf.ok) state.factures = rf.factures;
  chargerFacturesMensuelles(factMens.mois);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'fm-mois' && /^\d{4}-\d{2}$/.test(e.target.value)) chargerFacturesMensuelles(e.target.value);
});

function dialogShell(titre, corps, idFormulaire, boutonGauche) {
  return `
    <div class="dialog-backdrop">
      <div class="dialog dialog-large" role="dialog" aria-modal="true" style="width:min(900px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">${echapper(titre)}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <div class="dialog-corps">${corps}</div>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${boutonGauche ? 'space-between' : 'flex-end'}">
          ${boutonGauche || ''}
          <button type="button" class="btn btn-primary" id="${idFormulaire}">Enregistrer</button>
        </div>
      </div>
    </div>`;
}
/** Liens utiles des Réglages pour ce contexte (liens-admin.js) — '' si aucun ou module absent. */
function liensRaccourcis(contexte, titre) {
  return typeof window.boutonsLiensRaccourcis === 'function' ? window.boutonsLiensRaccourcis(contexte, titre) : '';
}
function champ(label, html) {
  return `<div class="field" style="margin-top:var(--space-2)"><label>${echapper(label)}</label>${html}</div>`;
}

const CATEGORIES_STRUCTURE = [
  'Collège/Université',
  'École',
  'Collectivité',
  'Entreprise privée',
  'Association',
  'Structure sociale',
];
/** Régions analytiques (territoires EC) — rattachement d'une structure pour ventiler l'activité.
 *  Liste à ajuster ici si besoin ; une valeur déjà enregistrée hors liste reste affichée. */
const REGIONS_ANALYTIQUE = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d’Azur',
  'Outre-mer',
  'National',
];
/** Sépare la valeur "Prénom NOM" stockée en base (un seul champ côté back) en deux morceaux
 *  pour préremplir les deux champs du formulaire — repère le NOM via la même convention que
 *  la règle de casse (mot(s) entièrement en majuscules en fin de chaîne). Si rien ne matche
 *  (ancienne donnée saisie librement), tout part dans "prénom" plutôt que de perdre l'info. */
function separerResponsable(valeur) {
  const mots = String(valeur || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const idx = mots.findIndex((m) => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase());
  if (idx === -1) return { prenom: mots.join(' '), nom: '' };
  return { prenom: mots.slice(0, idx).join(' '), nom: mots.slice(idx).join(' ') };
}
