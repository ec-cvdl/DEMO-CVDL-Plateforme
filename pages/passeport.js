const $ = (id) => document.getElementById(id);
function echapper(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function poster(data) {
  // Mot de passe admin éventuel : en-tête X-CVDL-Admin, jamais dans le corps ni l'URL.
  const d = { ...data };
  const mdp = d.password;
  delete d.password;
  const h = { 'Content-Type': 'text/plain;charset=utf-8' };
  if (mdp) h['X-CVDL-Admin'] = encodeURIComponent(mdp);
  return fetch(API, { method: 'POST', headers: h, body: JSON.stringify(d) }).then((r) => r.json());
}

/* ─── Identification : code structure ou mot de passe admin, tous deux persistés en
   sessionStorage — le temps de l'onglet, effacés par le bouton Déconnexion. ─── */
let codeIdentifie = '';
let motDePasseAdminIdentifie = '';

function passerAEtapeRecherche() {
  $('etape-identification').hidden = true;
  $('etape-recherche').hidden = false;
  $('btn-deconnexion-passeport').hidden = false;
  const depuisUrl = new URLSearchParams(location.search).get('sn');
  if (depuisUrl) {
    $('champ-numero-serie').value = depuisUrl;
    afficherPasseport(depuisUrl);
  }
}

$('btn-mode-admin').addEventListener('click', () => {
  $('zone-mode-admin').hidden = !$('zone-mode-admin').hidden;
  if (!$('zone-mode-admin').hidden) $('champ-mot-de-passe-admin').focus();
});

$('btn-identifier-structure').addEventListener('click', () => {
  const code = $('champ-code-structure').value.trim();
  if (!code) return;
  codeIdentifie = code;
  try {
    sessionStorage.setItem('cvdl-code-structure', code);
  } catch (e) {}
  passerAEtapeRecherche();
});
$('champ-code-structure').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-identifier-structure').click();
});

$('btn-identifier-admin').addEventListener('click', async () => {
  const mdp = $('champ-mot-de-passe-admin').value;
  if (!mdp) return;
  // Le mot de passe est échangé contre un jeton de session : seul le jeton est gardé.
  let jeton = '';
  try {
    const r = await poster({ action: 'login', password: mdp });
    jeton = r && r.ok ? r.jeton || '' : '';
  } catch (e) {}
  $('champ-mot-de-passe-admin').value = '';
  if (!jeton) {
    alert('Mot de passe incorrect.');
    return;
  }
  motDePasseAdminIdentifie = jeton;
  try {
    sessionStorage.setItem('cvdl-passeport-admin', jeton);
  } catch (e) {}
  passerAEtapeRecherche();
});
$('champ-mot-de-passe-admin').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-identifier-admin').click();
});

// Déjà identifiée sur cet appareil (venant d'une autre page du portail structure, ou d'un
// précédent passage ici) : on saute directement l'étape d'identification. Priorité au code
// passé dans l'URL (lien "confort" ouvert depuis une page déjà authentifiée) sur celui
// mémorisé en sessionStorage, au cas où une autre structure vient de se connecter sur ce même
// onglet entre-temps.
const codeDepuisUrl = new URLSearchParams(location.search).get('code');
const adminDepuisUrl = new URLSearchParams(location.search).get('admin');
if (codeDepuisUrl) {
  codeIdentifie = codeDepuisUrl;
  try {
    sessionStorage.setItem('cvdl-code-structure', codeDepuisUrl);
  } catch (e) {}
  // Le code ne doit pas traîner visible dans la barre d'adresse une fois consommé.
  const urlNettoyee = new URL(location.href);
  urlNettoyee.searchParams.delete('code');
  history.replaceState(null, '', urlNettoyee.pathname + urlNettoyee.search);
  passerAEtapeRecherche();
} else if (adminDepuisUrl) {
  // Lien ouvert depuis l'admin : le mot de passe n'est JAMAIS dans l'URL (« admin=1 » seulement).
  // Il est repris de la session admin du même navigateur (onglet ou modale ouverts depuis
  // l'admin) ; à défaut, l'identification est demandée.
  let mdpSession = '';
  try {
    mdpSession = sessionStorage.getItem('cvdl-admin-jeton') || sessionStorage.getItem('cvdl-passeport-admin') || '';
  } catch (e) {}
  const urlNettoyee = new URL(location.href);
  urlNettoyee.searchParams.delete('admin');
  history.replaceState(null, '', urlNettoyee.pathname + urlNettoyee.search);
  if (mdpSession) {
    motDePasseAdminIdentifie = mdpSession;
    passerAEtapeRecherche();
  }
} else {
  try {
    const codeMemorise = sessionStorage.getItem('cvdl-code-structure');
    const motDePasseMemorise = sessionStorage.getItem('cvdl-passeport-admin');
    if (codeMemorise) {
      codeIdentifie = codeMemorise;
      passerAEtapeRecherche();
    } else if (motDePasseMemorise) {
      motDePasseAdminIdentifie = motDePasseMemorise;
      passerAEtapeRecherche();
    }
  } catch (e) {}
}

$('btn-deconnexion-passeport').addEventListener('click', () => {
  try {
    sessionStorage.removeItem('cvdl-code-structure');
    sessionStorage.removeItem('cvdl-passeport-admin');
  } catch (e) {}
  codeIdentifie = '';
  motDePasseAdminIdentifie = '';
  $('champ-code-structure').value = '';
  $('champ-mot-de-passe-admin').value = '';
  $('zone-passeport').innerHTML = '';
  $('champ-numero-serie').value = '';
  $('etape-recherche').hidden = true;
  $('etape-identification').hidden = false;
  $('btn-deconnexion-passeport').hidden = true;
});

async function afficherPasseport(numeroSerie) {
  $('zone-passeport').innerHTML = '<p class="etat-passeport">Recherche en cours…</p>';
  try {
    const r = await poster({
      action: 'passeport-materiel',
      numeroSerie,
      code: codeIdentifie,
      password: motDePasseAdminIdentifie,
    });
    if (!r.ok) {
      if (r.identificationRequise || r.sessionExpiree) {
        // Le code ou le mot de passe s'est avéré invalide (ou a été révoqué depuis) : on
        // revient à l'identification.
        try {
          sessionStorage.removeItem('cvdl-code-structure');
          sessionStorage.removeItem('cvdl-passeport-admin');
        } catch (e) {}
        codeIdentifie = '';
        motDePasseAdminIdentifie = '';
        $('etape-recherche').hidden = true;
        $('etape-identification').hidden = false;
        $('btn-deconnexion-passeport').hidden = true;
        $('retour-identification').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
        return;
      }
      $('zone-passeport').innerHTML =
        `<p class="etat-passeport">${echapper(r.erreur || 'Numéro de série introuvable.')}<br>Vérifiez la saisie, ou contactez la structure qui vous a remis l'appareil.</p>`;
      return;
    }

    // reconditionneurOriginal / donateur ne sont présents dans la réponse que pour les
    // structures ESN et l'admin — absents (pas juste vides) pour tout le monde d'autre.
    const infosCompletes = r.reconditionneurOriginal !== undefined;
    const nomAppareil = r.caracteristiques || r.numeroSerie;

    const lignes = [
      ['N° de commande', echapper(r.referenceCommande), true],
      r.structure ? ['Remis par', echapper(r.structure)] : null,
      r.dateLivraison ? ['Livré le', echapper(r.dateLivraison)] : null,
      r.dateFinGarantie ? ["Garantie jusqu'au", echapper(r.dateFinGarantie)] : null,
      r.nomPersonne ? ['Utilisé par', echapper(r.nomPersonne)] : null,
      ['Marque et modèle', [r.marqueTecTech, r.modeleTecTech].filter(Boolean).map(echapper).join(' ') || '—'],
      ["Système d'exploitation", r.systemeTecTech ? echapper(r.systemeTecTech) : '—'],
      infosCompletes
        ? [
            'Reconditionneur',
            r.tectech && r.tectech.reconditionneur
              ? echapper(r.tectech.reconditionneur)
              : r.reconditionneurOriginal
                ? echapper(r.reconditionneurOriginal)
                : '—',
          ]
        : null,
      infosCompletes
        ? [
            'Donateur',
            r.tectech && r.tectech.donateur
              ? echapper(r.tectech.donateur) +
                (r.tectech.structureDonatrice ? ` (${echapper(r.tectech.structureDonatrice)})` : '')
              : '—',
          ]
        : null,
      infosCompletes && r.statutAppareil ? ['Statut', echapper(r.statutAppareil)] : null,
    ].filter(Boolean);

    // ── Passeport au format du kit : en-tête (illustration, nom, n° de série, garantie, QR),
    //    puis caractéristiques et historique côte à côte, puis les actions.
    const garantie = {
      en_cours: ['pk-ok', 'Garantie en cours'],
      bientot: ['pk-att', 'Garantie bientôt terminée'],
      expiree: ['pk-ko', 'Garantie expirée'],
    }[r.statutGarantie];
    const icoQr =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-4"/></svg>';
    const icoBouclier =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    const historique = r.historique || [];
    $('zone-passeport').innerHTML = `
      <div class="card pp-hero">
        ${window.illustrationCvdl && window.cleIllustrationProduit ? `<span class="pp-appareil" aria-hidden="true">${window.illustrationCvdl(window.cleIllustrationProduit(r.produit || r.categorieMateriel || r.caracteristiques || '', r.icone), 96)}</span>` : '<span data-ill="flotte" class="ill xxl"></span>'}
        <div class="pp-id">
          <div class="cvdl-surtitre">Passeport de l'appareil${r.produit ? ` · ${echapper(r.produit)}` : ''}</div>
          <h2 class="pp-nom">${echapper(nomAppareil)}</h2>
          <div class="pp-pastilles">
            <span class="pk-sn">${icoQr}${echapper(r.numeroSerie)}</span>
            ${garantie ? `<span class="pk-pill ${garantie[0]}">${icoBouclier}${garantie[1]}</span>` : ''}
            ${r.statutAppareil ? `<span class="pk-pill">${echapper(r.statutAppareil)}</span>` : ''}
          </div>
        </div>
        <div class="pp-qr" id="qr-code-passeport-admin" title="QR code du passeport"></div>
      </div>
      <div class="pp-grille${historique.length ? '' : ' seule'}">
        <div class="card pp-bloc">
          <div class="pk-lab">Caractéristiques</div>
          <div class="pp-lignes">
            ${lignes
              .map(
                ([cle, valeur, mono]) => `
              <div class="ligne-passeport">
                <span class="cle">${cle}</span>
                <span class="valeur${mono ? ' mono' : ''}">${valeur}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>
        ${
          historique.length
            ? `
        <div class="card pp-bloc">
          <div class="pk-lab">Historique</div>
          <ol class="pp-frise">
            ${historique.map((hh, k) => `<li class="${k === historique.length - 1 ? 'dernier' : ''}"><i></i><span>${echapper(hh.label)}</span><small>${echapper(hh.date)}</small></li>`).join('')}
          </ol>
        </div>`
            : ''
        }
      </div>
      <div class="pp-actions">
        <button type="button" class="btn btn-secondary" id="btn-imprimer-etiquette-admin">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimer l'étiquette
        </button>
        ${codeIdentifie ? `<a class="btn btn-primary" href="sav.html?sn=${encodeURIComponent(r.numeroSerie)}">Signaler une panne <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>` : ''}
      </div>
    `;

    $('qr-code-passeport-admin').innerHTML = '';
    try {
      new QRCode($('qr-code-passeport-admin'), {
        text: location.href.split('?')[0] + '?sn=' + encodeURIComponent(r.numeroSerie),
        width: 180,
        height: 180,
        colorDark: '#002743',
        colorLight: '#ffffff',
      });
    } catch (e) {}
    $('btn-imprimer-etiquette-admin').addEventListener('click', () => {
      const fenetre = window.open('', '_blank', 'width=400,height=500');
      fenetre.document
        .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Étiquette ${echapper(r.numeroSerie)}</title><style>
        @page{ size:62mm 40mm; margin:2mm; }
        *{ box-sizing:border-box; } body{ margin:0; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; color:#14202b; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .etiquette{ width:58mm; height:36mm; border:0.4mm solid #d5dbe0; border-radius:3mm; display:flex; align-items:center; gap:2.5mm; padding:2.5mm; margin:0 auto; }
        .qr{ width:30mm; height:30mm; flex:none; } .qr img, .qr canvas{ width:100% !important; height:100% !important; display:block; }
        .txt{ display:flex; flex-direction:column; gap:1mm; min-width:0; }
        .marque{ font-size:2.6mm; font-weight:700; color:#002743; display:flex; align-items:center; gap:1mm; }
        .marque i{ width:1.6mm; height:1.6mm; border-radius:50%; display:inline-block; }
        .lab{ font-size:1.9mm; letter-spacing:.12em; text-transform:uppercase; color:#66727e; font-weight:700; }
        .num{ font-family:ui-monospace,Menlo,monospace; font-weight:700; font-size:3.2mm; word-break:break-all; }
        .nom{ font-size:2.3mm; color:#3c4852; }
      </style></head><body>
        <div class="etiquette">
          <div class="qr">${$('qr-code-passeport-admin').innerHTML}</div>
          <div class="txt">
            <span class="marque"><i style="background:#E62460"></i><i style="background:#00ACB0"></i>Emmaüs Connect</span>
            <span class="lab">Passeport</span>
            <span class="num">${echapper(r.numeroSerie)}</span>
            <span class="nom">${echapper(nomAppareil || '')}</span>
          </div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>`);
      fenetre.document.close();
    });
  } catch (e) {
    $('zone-passeport').innerHTML =
      '<p class="etat-passeport">Impossible de récupérer les informations — réessayez.</p>';
  }
}

$('btn-chercher-passeport').addEventListener('click', () => {
  const v = $('champ-numero-serie').value.trim();
  if (v) {
    history.replaceState(null, '', '?sn=' + encodeURIComponent(v));
    afficherPasseport(v);
  }
});
$('champ-numero-serie').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-chercher-passeport').click();
});
