const $ = (id) => document.getElementById(id);
function echapper(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function poster(data) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}
function jsonp(params) {
  return fetch(API + '?' + new URLSearchParams(params)).then((r) => r.json());
}

let codeValide = '';
let appareilsAttestation = [];
let appareilChoisi = null;

async function verifierCode() {
  const code = $('id-code').value.trim();
  if (!code) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Saisissez votre code structure.</div>';
    return;
  }
  $('btn-verifier-code').disabled = true;
  $('btn-verifier-code').innerHTML = '<span class="spinner-inline"></span>Vérification…';
  $('retour-id-code').innerHTML = '';
  try {
    const r = await jsonp({ action: 'check', code });
    if (r.ok) {
      codeValide = code;
      try {
        sessionStorage.setItem('cvdl-code-structure', code);
      } catch (e) {}
      $('etape-code').hidden = true;
      $('etape-liste').hidden = false;
      await chargerAppareilsAttestation();
    } else {
      $('retour-id-code').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Code invalide.')}</div>`;
    }
  } catch (e) {
    $('retour-id-code').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Réessayez.</div>';
  }
  $('btn-verifier-code').disabled = false;
  $('btn-verifier-code').textContent = 'Continuer';
}
$('btn-verifier-code').addEventListener('click', verifierCode);
$('id-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifierCode();
});

async function chargerAppareilsAttestation() {
  $('retour-liste-appareils').innerHTML =
    '<div class="pk-etat pk-chargement"><span class="spinner-inline"></span>Chargement…</div>';
  try {
    const r = await jsonp({ action: 'flotte-lister', code: codeValide });
    if (!r.ok) {
      $('retour-liste-appareils').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</div>`;
      return;
    }
    appareilsAttestation = (r.appareils || []).filter((a) => a.personne);
    $('retour-liste-appareils').innerHTML = '';
    rendreListeAppareilsAttestation();
  } catch (e) {
    $('retour-liste-appareils').innerHTML = '<div class="msg msg-erreur">Chargement impossible — réessaie.</div>';
  }
}

function rendreListeAppareilsAttestation() {
  const terme = $('recherche-appareil-attestation').value.trim().toLowerCase();
  const visibles = terme
    ? appareilsAttestation.filter(
        (a) => (a.numeroSerie || '').toLowerCase().includes(terme) || (a.personne || '').toLowerCase().includes(terme),
      )
    : appareilsAttestation;

  if (!visibles.length) {
    $('liste-appareils-attestation').innerHTML =
      `<p style="opacity:0.6;font-size:14px">${appareilsAttestation.length ? 'Aucun appareil ne correspond à cette recherche.' : "Aucun appareil associé à une personne pour le moment — associez-les d'abord depuis votre gestion de flotte."}</p>`;
    return;
  }
  $('liste-appareils-attestation').innerHTML = visibles
    .map(
      (a) => `
    <div class="carte-appareil-attestation at-ligne" data-appareil-index="${appareilsAttestation.indexOf(a)}" role="button" tabindex="0">
      <span class="at-ill">${window.illustrationCvdl && window.cleIllustrationProduit ? window.illustrationCvdl(window.cleIllustrationProduit(a.produit || ''), 36) : ''}</span>
      <span class="at-txt"><b>${echapper(a.produit || 'Appareil')}</b><span class="pk-sn">${echapper(a.numeroSerie)}</span></span>
      <span class="at-personne">${echapper(a.personne)}</span>
      <span class="at-go">Générer →</span>
    </div>`,
    )
    .join('');
}
$('recherche-appareil-attestation').addEventListener('input', rendreListeAppareilsAttestation);
$('liste-appareils-attestation').addEventListener('keydown', (e) => {
  const c = e.target.closest('[data-appareil-index]');
  if (c && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    c.click();
  }
});

$('liste-appareils-attestation').addEventListener('click', (e) => {
  const carte = e.target.closest('[data-appareil-index]');
  if (!carte) return;
  appareilChoisi = appareilsAttestation[parseInt(carte.dataset.appareilIndex, 10)];
  if (!appareilChoisi) return;
  $('etape-liste').hidden = true;
  $('etape-generer').hidden = false;
  $('recap-appareil-attestation').textContent = `${appareilChoisi.numeroSerie} — ${appareilChoisi.produit || ''}`;
  $('attestation-nom-input').value = appareilChoisi.personne || '';
  // La date de naissance est déjà connue dès qu'un∙e agent∙e l'a saisie lors de l'attribution
  // de l'appareil (flotte interne) — pas besoin de la redemander si elle existe déjà.
  $('attestation-naissance-input').value = appareilChoisi.dateNaissance
    ? appareilChoisi.dateNaissance.split('/').reverse().join('-')
    : '';
  $('retour-attestation').innerHTML = '';
});

$('btn-retour-liste').addEventListener('click', () => {
  $('etape-generer').hidden = true;
  $('etape-liste').hidden = false;
});

$('btn-generer-attestation').addEventListener('click', async () => {
  if (!appareilChoisi) return;
  const nomComplet = $('attestation-nom-input').value.trim();
  const dateNaissanceISO = $('attestation-naissance-input').value;
  if (!nomComplet) {
    $('retour-attestation').innerHTML = '<div class="msg msg-erreur">Le nom est obligatoire.</div>';
    return;
  }
  const dateNaissance = dateNaissanceISO ? dateNaissanceISO.split('-').reverse().join('/') : '';

  $('btn-generer-attestation').disabled = true;
  $('retour-attestation').innerHTML = '<div class="msg msg-info">Génération en cours…</div>';
  try {
    const r = await poster({
      action: 'flotte-generer-attestation',
      code: codeValide,
      numeroSerie: appareilChoisi.numeroSerie,
      nomComplet,
      dateNaissance,
    });
    if (r.ok) {
      $('retour-attestation').innerHTML =
        `<div class="msg msg-succes">Prête — <a href="${echapper(urlSure(r.url))}" target="_blank" rel="noopener">l'ouvrir ↗</a></div>`;
    } else {
      $('retour-attestation').innerHTML =
        `<div class="msg msg-erreur">${echapper(r.erreur || 'Génération impossible.')}</div>`;
    }
  } catch (e) {
    $('retour-attestation').innerHTML = '<div class="msg msg-erreur">Génération impossible — réessaie.</div>';
  }
  $('btn-generer-attestation').disabled = false;
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
