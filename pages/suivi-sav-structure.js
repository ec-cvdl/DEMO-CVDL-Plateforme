function afficherMsg(id, texte, type) {
  $(id).innerHTML = texte ? `<div class="msg msg-${type}">${echapper(texte)}</div>` : '';
}
// Même calcul que côté admin (statutGarantiePourDate()/badgeGarantie() dans admin/) — dupliqué
// ici, pas de module JS partagé entre l'admin et les pages publiques dans ce projet.
function statutGarantiePublic(dateAchatFormatee) {
  const [j, m, a] = String(dateAchatFormatee || '')
    .split('/')
    .map(function (n) {
      return parseInt(n, 10);
    });
  if (!j || !m || !a) return { statut: null, dateFinGarantie: '' };
  const dateMiGarantie = new Date(a + 1, m - 1, j);
  const dateFinGarantie = new Date(a + 2, m - 1, j);
  const maintenant = new Date();
  const statut = maintenant >= dateFinGarantie ? 'expiree' : maintenant >= dateMiGarantie ? 'bientot' : 'en_cours';
  return { statut, dateFinGarantie: dateFinGarantie.toLocaleDateString('fr-FR') };
}
// Même niveau d'information que l'admin (badgeGarantie()) : date de fin de garantie
// comprise.
function badgeGarantiePublicSav(dateAchatFormatee) {
  const { statut, dateFinGarantie } = statutGarantiePublic(dateAchatFormatee);
  const cfg = {
    en_cours: { bg: '#1F9D55', texte: `Garantie en cours (jusqu'au ${dateFinGarantie})` },
    bientot: { bg: '#7A5A00', texte: `Garantie bientôt expirée (jusqu'au ${dateFinGarantie})` },
    expiree: { bg: '#E5484D', texte: `Hors garantie (${dateFinGarantie})` },
  }[statut];
  if (!cfg) return '';
  return (
    '<span style="display:inline-flex;align-items:center;gap:6px;background:' +
    cfg.bg +
    ';color:#fff;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;flex:none;white-space:nowrap">' +
    echapper(cfg.texte) +
    '</span>'
  );
}
/** Repérage depuis un lien direct (ex. "Activité récente" du portail structure, ?ref=XXX) :
 *  fait défiler jusqu'à la carte visée et la fait clignoter doucement en bleu quelques fois. */
function cibleCarteDepuisUrl(selecteurCarte, classeAnimation) {
  const ref = new URLSearchParams(location.search).get('ref');
  if (!ref) return;
  const carte = document.querySelector(`${selecteurCarte}[data-reference="${CSS.escape(ref)}"]`);
  if (!carte) return;
  setTimeout(() => {
    carte.scrollIntoView({ behavior: 'smooth', block: 'center' });
    carte.classList.add(classeAnimation);
    setTimeout(() => carte.classList.remove(classeAnimation), 6000);
  }, 150);
}

/* Mêmes teintes que le back-office, pour que la couleur du statut reste cohérente partout */
const TEINTES_SAV = {
  't-ambre': { fond: '#FFF3CC', texte: '#7A5A00' },
  't-bleu': { fond: '#E0F2F2', texte: '#00777A' },
  't-violet': { fond: '#FBE3EC', texte: '#C2185B' },
  't-turquoise': { fond: '#E0F2F2', texte: '#00777A' },
  't-vert': { fond: '#E3F4EA', texte: '#147A43' },
  't-rouge': { fond: '#FBE4E4', texte: '#C62828' },
  't-gris': { fond: '#EEF2F5', texte: '#5A6D7D' },
};
let statutsSavPublic = [];

function construireAnneauSav(statutActuel) {
  if (!statutsSavPublic.length) return '';
  const statutCourant = statutsSavPublic.find((s) => s.statut === statutActuel);
  if (!statutCourant) return '';
  const teinte = TEINTES_SAV[statutCourant.couleur] || TEINTES_SAV['t-gris'];
  const rayon = 64 / 2 - 5;
  const circonference = 2 * Math.PI * rayon;

  const parcours = statutsSavPublic.filter((s) => !s.terminal || s.finCycle);
  const estSortieAlternative = statutCourant.terminal && !statutCourant.finCycle;

  let progression;
  let texteEtape = '';
  if (estSortieAlternative || statutCourant.finCycle) {
    progression = 1;
    if (!estSortieAlternative) texteEtape = `${parcours.length}/${parcours.length}`;
  } else {
    const indexActuel = parcours.findIndex((s) => s.statut === statutActuel);
    const total = parcours.length;
    progression = total ? (indexActuel + 1) / total : 0;
    if (indexActuel !== -1 && total) texteEtape = `${indexActuel + 1}/${total}`;
  }

  const decalage = circonference * (1 - progression);
  return `<svg class="anneau-sav-wrap" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="${rayon}" fill="none" stroke="var(--color-neutral-200)" stroke-width="6"/>
    <circle cx="32" cy="32" r="${rayon}" fill="none" stroke="${teinte.texte}" stroke-width="6"
      stroke-dasharray="${circonference.toFixed(1)}" stroke-dashoffset="${decalage.toFixed(1)}"
      stroke-linecap="round" transform="rotate(-90 32 32)"/>
    ${texteEtape ? `<text x="32" y="32" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" font-family="inherit" fill="${teinte.texte}">${texteEtape}</text>` : ''}
  </svg>`;
}

const tiroirsSavOuverts = new Set();
const SVG_SAV_V1 = {
  check:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  attente:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  cle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/></svg>',
  chevron:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  qr: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-4"/></svg>',
  personne:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="vertical-align:-2px"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  photo:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>',
  colis:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tiroir-sav]');
  if (!b) return;
  const carte = b.closest('.carte-ticket-suivi');
  const ouvert = !carte.classList.contains('ouvert');
  carte.classList.toggle('ouvert', ouvert);
  b.setAttribute('aria-expanded', ouvert);
  if (ouvert) tiroirsSavOuverts.add(b.dataset.tiroirSav);
  else tiroirsSavOuverts.delete(b.dataset.tiroirSav);
});
// Arrivée depuis le portail avec ?ref= : tiroir de la demande visée ouvert d'office.
{
  const refUrl = new URLSearchParams(location.search).get('ref');
  if (refUrl) tiroirsSavOuverts.add(refUrl);
}

function rendreTicketsSuivi(tickets) {
  if (!tickets.length) {
    $('liste-tickets-suivi').innerHTML =
      `<div class="pk-etat pk-vide"><span data-ill="vide"></span>Aucune demande SAV enregistrée pour ce code pour le moment.</div>`;
    return;
  }
  $('liste-tickets-suivi').innerHTML = tickets
    .map((t, i) => {
      const statutCourantTicket = statutsSavPublic.find((s) => s.statut === t.statut);
      const teinte = TEINTES_SAV[statutCourantTicket ? statutCourantTicket.couleur : 't-gris'] || TEINTES_SAV['t-gris'];
      const liensColissimo =
        statutCourantTicket && (statutCourantTicket.colissimo || statutCourantTicket.terminal)
          ? String(t.colissimo || '')
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      const historique = t.historique || [];
      // ── Carte « colonne d'état + tiroir » (même composant que Mes commandes) ──
      const terminal = !!(statutCourantTicket && statutCourantTicket.terminal);
      const couleur = statutCourantTicket ? statutCourantTicket.couleur : '';
      const famille = terminal
        ? couleur === 't-rouge'
          ? 'ko'
          : 'ok'
        : couleur === 't-rouge'
          ? 'urg'
          : couleur === 't-ambre'
            ? 'action'
            : 'cours';
      const codeStructure = (() => {
        try {
          const cs = sessionStorage.getItem('cvdl-code-structure');
          return cs ? '&code=' + encodeURIComponent(cs) : '';
        } catch (e) {
          return '';
        }
      })();
      const ouvert = tiroirsSavOuverts.has(t.reference);
      const formeTicket = terminal ? 'rond' : famille === 'action' ? 'losange' : 'carre';
      const histoTicket = historique.length
        ? historique
        : [
            { statut: 'Demande ouverte', date: t.date || '' },
            { statut: t.statut || '', date: '' },
          ];
      const docsTicket = [
        t.photo
          ? `<a class="cs-doc" href="${echapper(urlSure(t.photo))}" target="_blank" rel="noopener"><span data-ill="passeport" class="ill"></span>Photo jointe</a>`
          : '',
        t.bonColissimo
          ? `<a class="cs-doc cs-doc-bon" href="${echapper(urlSure(t.bonColissimo))}" target="_blank" rel="noopener"><span data-ill="attestations" class="ill"></span>Bon Colissimo à imprimer</a>`
          : '',
        ...liensColissimo.map(
          (l, k) =>
            `<a class="cs-doc" href="${echapper(urlSure(l))}" target="_blank" rel="noopener"><span data-ill="stock" class="ill"></span>${liensColissimo.length > 1 ? 'Colis ' + (k + 1) : 'Suivi Colissimo'}</a>`,
        ),
      ]
        .filter(Boolean)
        .join('');
      return `<article class="card carte-ticket-suivi ts-carte${terminal ? ' fini' : ''}${ouvert ? ' ouvert' : ''}" data-reference="${echapper(t.reference)}">
      <div class="ts-tete">
        <span class="ts-anneau">${construireAnneauSav(t.statut)}</span>
        <div class="ts-tete-txt">
          <div class="cvdl-surtitre">${echapper(t.reference)} · ${t.dateResolution ? 'résolu le ' + echapper(t.dateResolution) : 'ouvert le ' + echapper(t.date || '')}</div>
          <b class="ts-titre">${echapper(t.symptome || 'Symptôme non précisé')}</b>
          <div class="ts-pastilles"><span class="tag" data-forme="${formeTicket}" style="--forme:${teinte.texte}">${echapper(t.statut || '')}</span>${t.dateAchat ? badgeGarantiePublicSav(t.dateAchat) : ''}</div>
        </div>
      </div>
      ${t.nomBeneficiaire || t.numeroSerie ? `<div class="ts-meta">${t.nomBeneficiaire ? `<span class="ts-personne"><span data-ill="personne" class="ill"></span><b>${echapper(t.nomBeneficiaire)}</b></span>` : ''}${t.numeroSerie ? window.piluleSerieCvdl(t.numeroSerie, { query: codeStructure }) : ''}</div>` : ''}
      ${t.notesResolution ? `<div class="ts-message"><span class="pk-lab">Message de l’équipe</span>${echapper(t.notesResolution)}</div>` : ''}
      <div class="cs-pied">
        <div class="cs-docs">${docsTicket}</div>
        <div class="cs-actions"><button type="button" class="cs-details-btn" data-tiroir-sav="${echapper(t.reference)}" aria-expanded="${ouvert}">Historique (${histoTicket.length}) ${SVG_SAV_V1.chevron}</button>${t.numeroSerie ? `<a class="btn btn-secondary v1-btn" href="passeport.html?sn=${encodeURIComponent(t.numeroSerie)}${codeStructure}" data-passeport-url="passeport.html?sn=${encodeURIComponent(t.numeroSerie)}${codeStructure}" data-sn="${echapper(t.numeroSerie)}">Voir le passeport</a>` : ''}</div>
      </div>
      <div class="cs-details"><div><div class="cs-details-in">
        <ol class="pp-frise ts-frise">${histoTicket.map((hh, k) => `<li class="${k === histoTicket.length - 1 ? 'dernier' : ''}${k === histoTicket.length - 1 && terminal ? ' fini' : ''}"><i></i><span>${echapper(hh.statut)}</span><small>${echapper(hh.date || '')}</small></li>`).join('')}</ol>
      </div></div></div>
    </article>`;
    })
    .join('');
  // Fil d'échanges (sav-fil.js).
  if (window.CvdlFilSav)
    CvdlFilSav.brancher($('liste-tickets-suivi'), tickets, (t) => ({
      reference: t.reference,
      code: $('code-structure').value.trim(),
    }));
}

async function chargerTicketsSuivi() {
  const code = $('code-structure').value.trim();
  if (!code) {
    afficherMsg('retour-code', 'Merci de saisir un code.', 'erreur');
    return;
  }

  $('btn-voir-tickets').disabled = true;
  $('btn-voir-tickets').innerHTML = '<span class="spinner-inline"></span>Recherche…';
  afficherMsg('retour-code', '', 'info');

  try {
    const [r, rStatuts] = await Promise.all([
      jsonp({ action: 'sav-par-code', code: code }),
      statutsSavPublic.length
        ? Promise.resolve({ ok: true, statuts: statutsSavPublic })
        : jsonp({ action: 'sav-statuts-public' }),
    ]);
    if (rStatuts.ok) statutsSavPublic = rStatuts.statuts.sort((a, b) => a.ordre - b.ordre);
    if (r.ok) {
      $('titre-structure').textContent = r.nomStructure ? `Demandes SAV de ${r.nomStructure}` : 'Vos demandes SAV';
      $('nb-tickets-texte').textContent =
        r.tickets.length > 1
          ? `${r.tickets.length} demandes trouvées`
          : r.tickets.length === 1
            ? '1 demande trouvée'
            : '';
      rendreTicketsSuivi(r.tickets);
      $('etape-code').hidden = true;
      $('etape-liste').hidden = false;
      $('btn-deconnexion-suivi-sav').hidden = false;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      demarrerRafraichissementAutoSuivi();
      cibleCarteDepuisUrl('.carte-ticket-suivi', 'arrivee-ciblee');
    } else {
      afficherMsg('retour-code', r.erreur || 'Code introuvable.', 'erreur');
    }
  } catch (e) {
    afficherMsg('retour-code', 'Connexion impossible. Réessayez dans un instant.', 'erreur');
  }
  $('btn-voir-tickets').disabled = false;
  $('btn-voir-tickets').textContent = 'Continuer';
}

$('btn-voir-tickets').addEventListener('click', chargerTicketsSuivi);
$('code-structure').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    chargerTicketsSuivi();
  }
});

$('btn-deconnexion-suivi-sav').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
  } catch (e) {}
  location.reload();
});

try {
  const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
  if (codeMemorise) {
    $('code-structure').value = codeMemorise;
    chargerTicketsSuivi().finally(() => {
      document.documentElement.classList.remove('deja-identifie');
      const v = $('voile-verification-precoce');
      if (v) v.style.display = 'none';
    });
  }
} catch (e) {}

let intervalleRafraichissementSuivi = null;

async function rafraichirSuiviSilencieusement() {
  if (document.hidden) return;
  if (window.CvdlFilSav && CvdlFilSav.enSaisie()) return; // ne pas effacer un message en cours
  const code = $('code-structure').value.trim();
  if (!code) return;
  try {
    const r = await jsonp({ action: 'sav-par-code', code: code });
    if (r.ok) {
      rendreTicketsSuivi(r.tickets);
      $('nb-tickets-texte').textContent =
        r.tickets.length > 1
          ? `${r.tickets.length} demandes trouvées`
          : r.tickets.length === 1
            ? '1 demande trouvée'
            : '';
    }
  } catch (e) {
    /* on retente simplement au prochain cycle */
  }
}
function demarrerRafraichissementAutoSuivi() {
  if (intervalleRafraichissementSuivi) return;
  intervalleRafraichissementSuivi = setInterval(rafraichirSuiviSilencieusement, 25000);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('etape-liste').hidden) rafraichirSuiviSilencieusement();
});
