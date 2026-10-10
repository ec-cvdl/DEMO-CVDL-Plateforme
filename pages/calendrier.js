/* Calendrier du portail structure (calendrier.html) : livraisons (faites, prévues, souhaitées)
   et échéances de paiement des personnes. Serveur : portail-agenda (routes/echeancier.js). */
let codeValide = '';
const C = { evenements: [], mois: null, jour: null, types: { livraison: true, paiement: true } };
const MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
/** Pastille d'un événement (voir la légende de calendrier.html). */
const PASTILLE = {
  livree: 'v',
  prevue: 'y',
  souhaitee: 'o',
  retard: 'r',
  bientot: 'b',
  avenir: 'b',
  payee: 'g',
};
const ETIQUETTE = {
  livree: ['Livrée', 'v'],
  prevue: ['Prévue', 'y'],
  souhaitee: ['Souhaitée', 'o'],
  retard: ['Retard', 'r'],
  bientot: ['À venir', 'b'],
  avenir: ['À venir', 'b'],
  payee: ['Payée', 'g'],
};

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const aujourdhui = () => iso(new Date());
const lienDe = (e) =>
  e.type === 'paiement' ? `flotte-structure.html?personne=${encodeURIComponent(e.appareilId)}` : 'suivi.html';
const visibles = () => C.evenements.filter((e) => C.types[e.type]);
function dateLongue(cle) {
  const [a, m, j] = cle.split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

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
    } else {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-cal').hidden = false;
      $('btn-deconnexion-cal').hidden = false;
      window.NotificationsPortail?.recharger();
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
$('btn-deconnexion-cal').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

async function charger() {
  const r = await jsonp({ action: 'portail-agenda', code: codeValide }).catch(() => ({ ok: false }));
  if (!r.ok) {
    $('cx-erreur').innerHTML =
      `<div class="msg msg-erreur">${echapper(r.erreur || 'Calendrier indisponible pour le moment.')}</div>`;
    return;
  }
  C.evenements = r.evenements;
  const d = new Date();
  C.mois = C.mois || new Date(d.getFullYear(), d.getMonth(), 1);
  rendre();
}

function ligneEvenement(e) {
  const [lib, cls] = ETIQUETTE[e.etat] || ['', 'b'];
  return `<a class="cx-it" href="${lienDe(e)}"><span data-ill="${e.type === 'paiement' ? 'facture' : 'commandes'}" class="ill s"></span><span class="cx-it-t"><b>${echapper(e.titre)}</b><span>${echapper(e.detail || '')}</span></span><em class="cx-e ${cls}">${lib}</em></a>`;
}

function rendreGrille() {
  const m = C.mois;
  $('cx-mois').textContent = `${MOIS[m.getMonth()]} ${m.getFullYear()}`;
  const decalage = (m.getDay() + 6) % 7;
  const nbJours = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const parJour = {};
  visibles().forEach((e) => (parJour[e.date] = parJour[e.date] || []).push(e));
  const auj = aujourdhui();
  let html = JOURS.map((j) => `<div class="h" role="columnheader">${j}</div>`).join('');
  for (let i = 0; i < decalage; i++) html += '<div class="j vide" aria-hidden="true"></div>';
  for (let j = 1; j <= nbJours; j++) {
    const cle = iso(new Date(m.getFullYear(), m.getMonth(), j));
    const evs = parJour[cle] || [];
    const we = (decalage + j - 1) % 7 >= 5;
    html += `<button type="button" class="j${cle === auj ? ' auj' : ''}${cle === C.jour ? ' choisi' : ''}${we ? ' we' : ''}" data-cx-jour="${cle}" aria-label="${dateLongue(cle)} : ${evs.length || 'aucun'} événement${evs.length > 1 ? 's' : ''}"><b>${j}</b>${evs
      .slice(0, 3)
      .map((e) => `<span class="cx-ev"><span class="d ${PASTILLE[e.etat] || 'b'}"></span>${echapper(e.titre)}</span>`)
      .join('')}${evs.length > 3 ? `<span class="cx-plus">+${evs.length - 3}</span>` : ''}</button>`;
  }
  $('cx-grille').innerHTML = html;
  ['livraison', 'paiement'].forEach((t) => {
    const n = C.evenements.filter((e) => e.type === t && e.date.slice(0, 7) === iso(m).slice(0, 7)).length;
    $(`cx-n-${t}`).textContent = n;
  });
}

function rendreJour() {
  const cle = C.jour || aujourdhui();
  $('cx-jour-titre').textContent = cle === aujourdhui() ? 'Aujourd’hui' : dateLongue(cle);
  const evs = visibles().filter((e) => e.date === cle);
  $('cx-jour').innerHTML = evs.length
    ? evs.map(ligneEvenement).join('')
    : '<p class="cx-vide">Rien de prévu ce jour-là.</p>';
}

function rendreAvenir() {
  const auj = aujourdhui();
  const fin = iso(new Date(Date.now() + 30 * 86400000));
  const retards = visibles().filter((e) => e.etat === 'retard');
  const avenir = visibles().filter((e) => e.date >= auj && e.date <= fin && e.etat !== 'retard');
  const jours = [...new Set(avenir.map((e) => e.date))];
  $('cx-avenir').innerHTML =
    (retards.length ? `<div class="cx-sd">En retard</div>${retards.map(ligneEvenement).join('')}` : '') +
      jours
        .map(
          (j) =>
            `<div class="cx-sd">${dateLongue(j)}</div>${avenir
              .filter((e) => e.date === j)
              .map(ligneEvenement)
              .join('')}`,
        )
        .join('') || '<p class="cx-vide">Rien de prévu dans les 30 prochains jours.</p>';
}

function rendre() {
  rendreGrille();
  rendreJour();
  rendreAvenir();
  window.portailIllustrations?.($('etape-cal'));
}

$('cx-prec').addEventListener('click', () => {
  C.mois = new Date(C.mois.getFullYear(), C.mois.getMonth() - 1, 1);
  rendreGrille();
});
$('cx-suiv').addEventListener('click', () => {
  C.mois = new Date(C.mois.getFullYear(), C.mois.getMonth() + 1, 1);
  rendreGrille();
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-cx-type]');
  if (t) {
    C.types[t.dataset.cxType] = !C.types[t.dataset.cxType];
    t.setAttribute('aria-pressed', String(C.types[t.dataset.cxType]));
    rendre();
    return;
  }
  const j = e.target.closest('[data-cx-jour]');
  if (j) {
    C.jour = j.dataset.cxJour;
    rendreGrille();
    rendreJour();
    window.portailIllustrations?.($('cx-jour'));
  }
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
