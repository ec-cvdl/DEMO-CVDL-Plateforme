/* Statistiques des structures partenaires d'une Interne (statistiques-partenaires.html) :
   tableau comparatif puis, au clic, le détail d'un partenaire (stats-flotte.js). Serveur :
   partenaires-statistiques (chiffres agrégés, jamais une personne). */
let codeValide = '';
let partenaires = [];
const D = { index: -1, onglet: 'ensemble' };

async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Saisissez votre code structure.</div>';
    return;
  }
  $('btn-verifier-code').disabled = true;
  $('retour-id-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code });
    if (!r.ok) {
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    } else if (!r.interne) {
      $('retour-id-code').innerHTML =
        '<div class="msg msg-erreur">Cet espace est réservé aux structures Interne.</div>';
    } else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-stats').hidden = false;
      $('btn-deconnexion-stats').hidden = false;
      await charger();
    }
  } catch (e) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Réessayez.</div>';
  }
  $('btn-verifier-code').disabled = false;
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});
$('btn-deconnexion-stats').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

const nb = (n) => Number(n || 0).toLocaleString('fr-FR');
const pc = (n, t) => (t ? Math.round((n / t) * 100) : 0);

/** Petites colonnes des 7 derniers mois. */
function mini(valeurs) {
  const max = Math.max(1, ...valeurs);
  return `<span class="sp-mini" aria-label="${valeurs.join(', ')}">${valeurs
    .map((v) => `<i style="height:${Math.max(3, Math.round((v / max) * 22))}px"></i>`)
    .join('')}</span>`;
}

async function charger() {
  const r = await jsonp({ action: 'partenaires-statistiques', code: codeValide }).catch(() => ({ ok: false }));
  if (!r.ok) {
    $('sp-contenu').innerHTML =
      `<div class="msg msg-erreur">${echapper(r.erreur || 'Statistiques indisponibles pour le moment.')}</div>`;
    return;
  }
  partenaires = r.partenaires;
  if (!partenaires.length) {
    $('sp-contenu').innerHTML =
      '<div class="pk-etat pk-vide"><span data-ill="vide"></span>Pas encore de structure partenaire.</div>';
    window.portailIllustrations?.($('sp-contenu'));
    return;
  }
  const t = partenaires.reduce(
    (a, p) => ({
      attribues: a.attribues + p.attribues,
      remis: a.remis + p.remis,
      ceMois: a.ceMois + p.ceMois,
      anciens: a.anciens + p.anciens,
    }),
    { attribues: 0, remis: 0, ceMois: 0, anciens: 0 },
  );
  $('sp-contenu').innerHTML = `
    <div class="sp-kpis">
      <div class="sf-k"><b>${nb(t.attribues)}</b><span>appareils chez vos partenaires</span></div>
      <div class="sf-k"><b>${nb(t.remis)}</b><span>remis aux personnes (${pc(t.remis, t.attribues)} %)</span></div>
      <div class="sf-k"><b>${nb(t.ceMois)}</b><span>remis ce mois-ci</span></div>
      <div class="sf-k"><b>${nb(t.anciens)}</b><span>en stock depuis + de 2 mois</span></div>
    </div>
    <div class="sp-table" role="table" aria-label="Comparaison des partenaires">
      <div class="sp-l sp-entete" role="row"><span role="columnheader">Partenaire</span><span role="columnheader">Appareils</span><span role="columnheader">Remis aux personnes</span><span role="columnheader">Ce mois</span><span role="columnheader">7 derniers mois</span><span role="columnheader">Paiement le + utilisé</span><span role="columnheader">Oriente le plus</span><span role="columnheader">Alertes</span></div>
      ${partenaires
        .map(
          (p, i) => `<button type="button" class="sp-l" role="row" data-sp-partenaire="${i}">
        <b role="cell">${echapper(p.nom)}</b>
        <span role="cell">${nb(p.attribues)}</span>
        <span role="cell" class="sp-remis"><span class="sf-t"><i style="width:${pc(p.remis, p.attribues)}%;background:#00ACB0"></i></span>${nb(p.remis)} <small>${pc(p.remis, p.attribues)} %</small></span>
        <span role="cell" class="sp-mois">${p.ceMois ? '+' + p.ceMois : '—'}</span>
        <span role="cell">${mini(p.septMois)}</span>
        <span role="cell">${echapper(p.paiementPrincipal || '—')}</span>
        <span role="cell">${echapper(p.orientePrincipal || '—')}</span>
        <span role="cell">${p.anciens ? `<span class="sp-alerte">${p.anciens} en stock + 2 mois</span>` : '<span class="sp-ras">RAS</span>'}</span>
      </button>`,
        )
        .join('')}
    </div>
    <p class="sp-note">Un clic sur une ligne ouvre les statistiques détaillées du partenaire (mêmes graphiques que « Ma flotte »).</p>`;
}

function rendreDetail() {
  const p = partenaires[D.index];
  if (!p) return;
  $('sp-modale-titre').textContent = p.nom;
  $('sp-detail').innerHTML = window.StatsFlotte.html(p.detail, { onglet: D.onglet, periodes: false });
}
document.addEventListener('click', (e) => {
  const l = e.target.closest('[data-sp-partenaire]');
  if (l) {
    D.index = Number(l.dataset.spPartenaire);
    D.onglet = 'ensemble';
    rendreDetail();
    $('modale-stats-partenaire').classList.add('visible');
    return;
  }
  const o = e.target.closest('[data-sf-onglet]');
  if (o) {
    D.onglet = o.dataset.sfOnglet;
    rendreDetail();
    return;
  }
  if (e.target.id === 'modale-stats-partenaire' || e.target.id === 'sp-fermer')
    $('modale-stats-partenaire').classList.remove('visible');
});
$('sp-image').addEventListener('click', async function () {
  this.disabled = true;
  const p = partenaires[D.index];
  const ok = await window.StatsFlotte.exporterImage(
    $('sp-detail'),
    `Statistiques-${String(p ? p.nom : 'partenaire')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w]+/g, '-')}.png`,
  ).catch(() => false);
  this.disabled = false;
  if (!ok) alerteCvdl('Image impossible à créer — réessayez.');
});

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('id-code').value = codeMemorise;
    verifierCode().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}
