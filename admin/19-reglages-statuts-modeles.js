/* Admin CVDL — statuts SAV et modèles de documents. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueReglagesStatutsSav() {
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(640px,94vw);max-height:88vh;overflow-y:auto">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Statuts SAV</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.7;margin:0">Ajoute, renomme, réordonne, colore ou supprime les statuts selon le déroulé de ton territoire. Les drapeaux pilotent l'apparition progressive des champs sur chaque ticket, et le calcul du délai.</p>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${state.statutsSav
            .map(
              (s, i) => `
            <div class="card elev-sm" style="padding:var(--space-4);gap:14px">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="display:flex;flex-direction:column;gap:2px">
                  <button type="button" class="btn btn-ghost btn-icon" style="width:22px;height:22px" data-statut-monter="${s.id}" ${i === 0 ? 'disabled' : ''} title="Monter"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg></button>
                  <button type="button" class="btn btn-ghost btn-icon" style="width:22px;height:22px" data-statut-descendre="${s.id}" ${i === state.statutsSav.length - 1 ? 'disabled' : ''} title="Descendre"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"/></svg></button>
                </div>
                <input class="input" style="flex:1;min-width:100px" value="${echapper(s.statut)}" data-statut-config="${s.id}" data-champ="statut">
                <span class="tag rs-apercu" style="flex:none;color:${teinteSav(s.couleur).fg}" title="Aperçu de la pastille">${echapper(s.statut)}</span>
                <select class="input" style="width:120px;flex:none" data-statut-config="${s.id}" data-champ="couleur">
                  ${COULEURS_SAV_DISPONIBLES.map((c) => `<option value="${c}" ${c === s.couleur ? 'selected' : ''}>${c.replace('t-', '')}</option>`).join('')}
                </select>
                <span style="width:32px;height:32px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${teinteSav(s.couleur).bg};color:${teinteSav(s.couleur).fg}">${icon(iconeStatutSav(s.statut, s.icone), 15)}</span>
                <select class="input" style="width:170px;flex:none" data-statut-config="${s.id}" data-champ="icone">
                  ${ICONES_STATUT_SAV_OPTIONS.map((o) => `<option value="${o.value}" ${o.value === (s.icone || '') ? 'selected' : ''}>${echapper(o.label)}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-ghost btn-icon" style="color:var(--color-accent-700)" data-statut-supprimer="${s.id}" data-statut-nom="${echapper(s.statut)}" title="Supprimer">${icon('x', 15)}</button>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px 16px;padding-top:12px;border-top:1px solid var(--color-divider)">
                <label class="rp-switch" title="Affiche le champ et la pilule de suivi Colissimo"><input type="checkbox" data-statut-config="${s.id}" data-champ="colissimo" ${s.colissimo ? 'checked' : ''}><span class="rp-switch-piste"></span>Colissimo</label>
                <label class="rp-switch" title="Phase de diagnostic technique"><input type="checkbox" data-statut-config="${s.id}" data-champ="diagnostic" ${s.diagnostic ? 'checked' : ''}><span class="rp-switch-piste"></span>Diagnostic</label>
                <label class="rp-switch" title="Point de départ du décompte du délai"><input type="checkbox" data-statut-config="${s.id}" data-champ="departDelai" ${s.departDelai ? 'checked' : ''}><span class="rp-switch-piste"></span>Départ délai</label>
                <label class="rp-switch" title="Clôture le ticket"><input type="checkbox" data-statut-config="${s.id}" data-champ="terminal" ${s.terminal ? 'checked' : ''}><span class="rp-switch-piste"></span>Terminal</label>
                <label class="rp-switch" title="Ferme l'anneau de progression à 100%"><input type="checkbox" data-statut-config="${s.id}" data-champ="finCycle" ${s.finCycle ? 'checked' : ''}><span class="rp-switch-piste"></span>Fin de cycle</label>
              </div>
            </div>`,
            )
            .join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:var(--space-2)">
          <input class="input" id="rs-nouveau-nom" placeholder="Nom du nouveau statut" style="flex:1">
          <button type="button" class="btn btn-secondary" data-ajouter-statut>${icon('plus', 15)}Ajouter</button>
        </div>
        <div id="rp-retour-modale"></div>
        
      </div>
    </div>`;
}
async function rechargerStatutsSav() {
  const r = await jsonp({ action: 'sav-statuts-list', password: motDePasse });
  if (r.ok) state.statutsSav = r.statuts;
}
async function modifierStatutSav(id, champ, valeur) {
  const r = await posterEtat(
    { action: 'sav-statut-modifier', id, champ, valeur },
    'Enregistrement…',
    'Statut mis à jour',
  );
  if (r.ok) {
    await rechargerStatutsSav();
    render();
  }
}
async function deplacerStatutSav(id, direction) {
  const r = await posterEtat({ action: 'sav-statut-deplacer', id, direction }, 'Déplacement…', 'Ordre mis à jour');
  if (r.ok) {
    await rechargerStatutsSav();
    render();
  }
}
async function supprimerStatutSav(id, nom) {
  if (!(await confirmerCvdl(`Supprimer le statut « ${nom} » ?`))) return;
  const r = await posterEtat({ action: 'sav-statut-supprimer', id }, 'Suppression…', 'Statut supprimé');
  if (r.ok) {
    await rechargerStatutsSav();
    render();
  } else if ($('rp-retour-modale'))
    $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
}
async function ajouterStatutSav() {
  const nom = $('rs-nouveau-nom').value.trim();
  if (!nom) return;
  const r = await posterEtat({ action: 'sav-statut-ajouter', statut: nom }, 'Ajout…', 'Statut ajouté');
  if (r.ok) {
    await rechargerStatutsSav();
    render();
  } else $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
}

/* Modèle de bon de livraison : HTML téléversé, prioritaire sur le modèle
   Google Sheets. */
const JETONS_MODELE_BON = [
  'STRUCTURE',
  'ADRESSE',
  'EMAIL',
  'TELEPHONE',
  'REFERENCE_COMMANDE',
  'DATE',
  'NUMEROS_SERIE',
  'RESPONSABLE_NOM',
  'RESPONSABLE_TELEPHONE',
  'RESPONSABLE_EMAIL',
  'PRODUIT_1',
  'QUANTITE_1',
  'PRIX_UNITAIRE_1',
  'TOTAL_LIGNE_1',
  "… jusqu'à _10",
  'NUMERO_SERIE_1',
  'MARQUE_MODELE_1',
  "… jusqu'à _15",
];
let infoModeleBon = null;
async function chargerInfoModeleBon() {
  infoModeleBon = null;
  const r = await jsonp({ action: 'modele-bon-livraison-info', password: motDePasse });
  if (r.ok) infoModeleBon = r;
  if (state.modal && state.modal.kind === 'modele-bon') render();
}
function vueModeleBon() {
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Modèle de bon de livraison</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.7;margin:0">Fichier HTML avec des jetons à remplacer (ex. <code>{{STRUCTURE}}</code>). Une fois téléversé, il remplace le modèle Google Sheets pour toutes les prochaines générations — rien à ouvrir ni gérer côté Google.</p>
        ${
          infoModeleBon
            ? infoModeleBon.present
              ? `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:13px">${icon('check', 14)} Modèle actif (${infoModeleBon.taille.toLocaleString('fr-FR')} caractères).</div>`
              : `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-neutral-100);font-size:13px;opacity:0.7">Aucun modèle téléversé — génération sur l'ancien modèle Google Sheets (Réglages), si configuré.</div>`
            : `<div style="font-size:13px;opacity:0.5">Chargement…</div>`
        }
        <div class="field">
          <label>Nouveau modèle (.html)</label>
          <input type="file" class="input" id="mb-fichier" accept=".html,text/html">
        </div>
        <details style="font-size:12.5px;opacity:0.7">
          <summary style="cursor:pointer;font-weight:600">Jetons disponibles</summary>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${JETONS_MODELE_BON.map((j) =>
              j.includes('…')
                ? `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;opacity:0.6">${j}</code>`
                : `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;cursor:pointer" data-copier-jeton="{{${j}}}" title="Cliquer pour copier">{{${j}}}</code>`,
            ).join('')}
          </div>
        </details>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${infoModeleBon && infoModeleBon.present ? 'space-between' : 'flex-end'}">
          ${infoModeleBon && infoModeleBon.present ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-bon>Retirer le modèle</button>` : ''}
          <button type="button" class="btn btn-primary" id="mb-enregistrer">Téléverser</button>
        </div>
      </div>
    </div>`;
}
async function enregistrerModeleBon() {
  const fichier = $('mb-fichier').files[0];
  if (!fichier) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .html.</div>';
    return;
  }
  $('mb-enregistrer').disabled = true;
  try {
    const html = await fichier.text();
    const r = await posterEtat({ action: 'modele-bon-livraison-televerser', html }, 'Envoi…', 'Modèle enregistré');
    if (r.ok) {
      await chargerInfoModeleBon();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('mb-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>';
    $('mb-enregistrer').disabled = false;
  }
}
async function supprimerModeleBon() {
  if (
    !(await confirmerCvdl(
      'Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.',
    ))
  )
    return;
  const r = await posterEtat({ action: 'modele-bon-livraison-supprimer' }, 'Suppression…', 'Modèle retiré');
  if (r.ok) await chargerInfoModeleBon();
}

/* ============================================================
   Modèle de devis / facture — même principe que le bon de
   livraison : HTML téléversé, aucun appel Drive donc jamais
   concerné par un souci de quota ou de partage. Devis et facture
   sont deux documents différents : un modèle distinct pour chacun.
   ============================================================ */
const JETONS_MODELE_FACTURATION = [
  'STRUCTURE',
  'ADRESSE',
  'EMAIL',
  'TELEPHONE',
  'NUMERO_DEVIS',
  'NUMERO_FACTURE',
  'DATE',
  'PRIX_TOTAL_HT',
  'RESPONSABLE_NOM',
  'RESPONSABLE_TELEPHONE',
  'RESPONSABLE_EMAIL',
  'PRODUIT_1',
  'QUANTITE_1',
  'PRIX_UNITAIRE_1',
  'TOTAL_LIGNE_1',
  "… jusqu'à _10",
];
const infosModeleDoc = { devis: null, facture: null };
async function chargerInfoModeleDoc(type) {
  infosModeleDoc[type] = null;
  const r = await jsonp({ action: `modele-${type}-info`, password: motDePasse });
  if (r.ok) infosModeleDoc[type] = r;
  if (state.modal && state.modal.kind === 'modele-doc' && state.modal.type === type) render();
}
function vueModeleDoc() {
  const type = state.modal.type;
  const info = infosModeleDoc[type];
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Modèle de ${type}</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <p style="font-size:13px;opacity:0.7;margin:0">Fichier HTML avec des jetons à remplacer (ex. <code>{{STRUCTURE}}</code>). Une fois téléversé, il remplace le modèle Google Sheets pour toutes les prochaines générations de ${type === 'devis' ? 'devis' : 'factures'} — rien à ouvrir ni gérer côté Google, donc aucun risque de quota Drive.</p>
        ${
          info
            ? info.present
              ? `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:13px">${icon('check', 14)} Modèle actif (${info.taille.toLocaleString('fr-FR')} caractères).</div>`
              : `<div class="card elev-sm" style="padding:var(--space-4);background:var(--color-neutral-100);font-size:13px;opacity:0.7">Aucun modèle téléversé — génération sur l'ancien modèle Google Sheets (Réglages), si configuré.</div>`
            : `<div style="font-size:13px;opacity:0.5">Chargement…</div>`
        }
        <div class="field">
          <label>Nouveau modèle (.html)</label>
          <input type="file" class="input" id="md-fichier" accept=".html,text/html">
        </div>
        <details style="font-size:12.5px;opacity:0.7">
          <summary style="cursor:pointer;font-weight:600">Jetons disponibles</summary>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${JETONS_MODELE_FACTURATION.map((j) =>
              j.includes('…')
                ? `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;opacity:0.6">${j}</code>`
                : `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;cursor:pointer" data-copier-jeton="{{${j}}}" title="Cliquer pour copier">{{${j}}}</code>`,
            ).join('')}
          </div>
        </details>
        <div id="rp-retour-modale"></div>
        <div class="dialog-actions" style="justify-content:${info && info.present ? 'space-between' : 'flex-end'}">
          ${info && info.present ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-doc="${type}">Retirer le modèle</button>` : ''}
          <button type="button" class="btn btn-primary" id="md-enregistrer">Téléverser</button>
        </div>
      </div>
    </div>`;
}
async function enregistrerModeleDoc() {
  const type = state.modal.type;
  const fichier = $('md-fichier').files[0];
  if (!fichier) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .html.</div>';
    return;
  }
  $('md-enregistrer').disabled = true;
  try {
    const html = await fichier.text();
    const r = await posterEtat({ action: `modele-${type}-televerser`, html }, 'Envoi…', 'Modèle enregistré');
    if (r.ok) {
      await chargerInfoModeleDoc(type);
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('md-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>';
    $('md-enregistrer').disabled = false;
  }
}
async function supprimerModeleDoc(type) {
  if (
    !(await confirmerCvdl(
      'Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.',
    ))
  )
    return;
  const r = await posterEtat({ action: `modele-${type}-supprimer` }, 'Suppression…', 'Modèle retiré');
  if (r.ok) await chargerInfoModeleDoc(type);
}

/* ============================================================
   Modèle d'attestation de paiement — même principe que le modèle de bon de livraison
   ci-dessus (HTML téléversé, hors Google Workspace).
   ============================================================ */
const JETONS_MODELE_ATTESTATION = [
  'NOM_COMPLET',
  'DATE_NAISSANCE',
  'STRUCTURE',
  'REFERENCE_COMMANDE',
  'PRIX',
  'PRODUIT',
  'MARQUE_MODELE',
  'DATE_VENTE',
  'NUMERO_SERIE',
  'RESPONSABLE_NOM',
  'RESPONSABLE_TELEPHONE',
  'RESPONSABLE_EMAIL',
];
let infoModeleAttestation = null;
async function chargerInfoModeleAttestation() {
  infoModeleAttestation = null;
  const r = await jsonp({ action: 'modele-attestation-info', password: motDePasse });
  if (r.ok) infoModeleAttestation = r;
  if (state.modal && state.modal.kind === 'modele-attestation') render();
}
function vueModeleAttestation() {
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,94vw)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Modèle d'attestation de paiement</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>

        <div class="card elev-sm" style="padding:var(--space-5);gap:10px">
          <div style="font-weight:600;font-size:13.5px">Modèle PDF (formulaire) — recommandé</div>
          <p style="font-size:12.5px;opacity:0.7;margin:0">Un PDF avec de vrais champs de formulaire, nommés comme les jetons (ex. un champ <code>NOM_COMPLET</code>). Rempli directement en mémoire — aucun service externe, la solution la plus simple et la plus fiable. À créer une fois avec LibreOffice Writer ou un éditeur PDF qui gère les formulaires.</p>
          ${
            infoModeleAttestation
              ? infoModeleAttestation.presentPdf
                ? `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12.5px">${icon('check', 14)} Modèle actif (${Math.round(infoModeleAttestation.taillePdf / 1024).toLocaleString('fr-FR')} ko).</div>`
                : `<div style="font-size:12.5px;opacity:0.55">Aucun modèle PDF téléversé.</div>`
              : ''
          }
          <input type="file" class="input" id="ma-fichier-pdf" accept=".pdf">
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-primary" id="ma-pdf-enregistrer">Téléverser</button>
            ${infoModeleAttestation && infoModeleAttestation.presentPdf ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-attestation-pdf>Retirer</button>` : ''}
          </div>
        </div>

        <details style="margin-top:4px">
          <summary style="cursor:pointer;font-size:12.5px;font-weight:600;opacity:0.7">Autres options (repli, si pas de modèle PDF)</summary>
          <div class="card elev-sm" style="padding:var(--space-5);gap:10px;margin-top:8px">
            <div style="font-weight:600;font-size:13px">Modèle Excel (.xlsx)</div>
            <p style="font-size:12px;opacity:0.7;margin:0">Nécessite un dossier dans un Drive partagé pour la conversion en PDF (voir Réglages) — sinon la génération échoue.</p>
            ${
              infoModeleAttestation
                ? infoModeleAttestation.presentXlsx
                  ? `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12px">${icon('check', 14)} Modèle actif (${Math.round(infoModeleAttestation.tailleXlsx / 1024).toLocaleString('fr-FR')} ko).</div>`
                  : ''
                : ''
            }
            <input type="file" class="input" id="ma-fichier-xlsx" accept=".xlsx">
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-secondary" id="ma-xlsx-enregistrer">Téléverser</button>
              ${infoModeleAttestation && infoModeleAttestation.presentXlsx ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-attestation-xlsx>Retirer</button>` : ''}
            </div>
          </div>

          <p style="font-size:12.5px;opacity:0.6;margin:12px 0 8px">Ou un modèle HTML :</p>
          ${
            infoModeleAttestation
              ? infoModeleAttestation.present
                ? `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-2-100);color:var(--color-accent-2-700);font-size:12.5px;margin-bottom:8px">${icon('check', 14)} Modèle actif (${infoModeleAttestation.taille.toLocaleString('fr-FR')} caractères).</div>`
                : ''
              : ''
          }
          <input type="file" class="input" id="ma-fichier" accept=".html,text/html">
          <div style="display:flex;gap:8px;margin-top:8px">
            <button type="button" class="btn btn-secondary" id="ma-enregistrer">Téléverser</button>
            ${infoModeleAttestation && infoModeleAttestation.present ? `<button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-supprimer-modele-attestation>Retirer</button>` : ''}
          </div>
        </details>

        <details style="font-size:12.5px;opacity:0.7">
          <summary style="cursor:pointer;font-weight:600">Jetons disponibles</summary>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${JETONS_MODELE_ATTESTATION.map((j) => `<code style="background:var(--color-neutral-100);padding:2px 8px;border-radius:6px;cursor:pointer" data-copier-jeton="{{${j}}}" title="Cliquer pour copier">{{${j}}}</code>`).join('')}
          </div>
        </details>
        <div id="rp-retour-modale"></div>
      </div>
    </div>`;
}
async function enregistrerModeleAttestationPdf() {
  const fichier = $('ma-fichier-pdf').files[0];
  if (!fichier) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .pdf.</div>';
    return;
  }
  $('ma-pdf-enregistrer').disabled = true;
  try {
    const buffer = await fichier.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((s, o) => s + String.fromCharCode(o), ''));
    const r = await posterEtat(
      { action: 'modele-attestation-pdf-televerser', pdfBase64: base64 },
      'Envoi…',
      'Modèle enregistré',
    );
    if (r.ok) {
      await chargerInfoModeleAttestation();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('ma-pdf-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>';
    $('ma-pdf-enregistrer').disabled = false;
  }
}
async function supprimerModeleAttestationPdf() {
  if (!(await confirmerCvdl('Retirer le modèle PDF téléversé ?'))) return;
  const r = await posterEtat({ action: 'modele-attestation-pdf-supprimer' }, 'Suppression…', 'Modèle retiré');
  if (r.ok) await chargerInfoModeleAttestation();
}
async function enregistrerModeleAttestationXlsx() {
  const fichier = $('ma-fichier-xlsx').files[0];
  if (!fichier) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .xlsx.</div>';
    return;
  }
  $('ma-xlsx-enregistrer').disabled = true;
  try {
    const buffer = await fichier.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((s, o) => s + String.fromCharCode(o), ''));
    const r = await posterEtat(
      { action: 'modele-attestation-xlsx-televerser', xlsxBase64: base64 },
      'Envoi…',
      'Modèle enregistré',
    );
    if (r.ok) {
      await chargerInfoModeleAttestation();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('ma-xlsx-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>';
    $('ma-xlsx-enregistrer').disabled = false;
  }
}
async function supprimerModeleAttestationXlsx() {
  if (!(await confirmerCvdl('Retirer le modèle .xlsx téléversé ?'))) return;
  const r = await posterEtat({ action: 'modele-attestation-xlsx-supprimer' }, 'Suppression…', 'Modèle retiré');
  if (r.ok) await chargerInfoModeleAttestation();
}
async function enregistrerModeleAttestation() {
  const fichier = $('ma-fichier').files[0];
  if (!fichier) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Choisis un fichier .html.</div>';
    return;
  }
  $('ma-enregistrer').disabled = true;
  try {
    const html = await fichier.text();
    const r = await posterEtat({ action: 'modele-attestation-televerser', html }, 'Envoi…', 'Modèle enregistré');
    if (r.ok) {
      await chargerInfoModeleAttestation();
    } else {
      $('rp-retour-modale').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      $('ma-enregistrer').disabled = false;
    }
  } catch (e) {
    $('rp-retour-modale').innerHTML = '<div class="msg msg-erreur">Lecture du fichier impossible.</div>';
    $('ma-enregistrer').disabled = false;
  }
}
async function supprimerModeleAttestation() {
  if (
    !(await confirmerCvdl(
      'Retirer le modèle téléversé ? La génération repassera sur le modèle Google Sheets historique.',
    ))
  )
    return;
  const r = await posterEtat({ action: 'modele-attestation-supprimer' }, 'Suppression…', 'Modèle retiré');
  if (r.ok) await chargerInfoModeleAttestation();
}

/* ============================================================
   Modales de création — Structure / Commande / Produit
   ============================================================ */
