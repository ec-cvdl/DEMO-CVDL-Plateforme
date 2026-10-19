/* Transfert de stock (espace structure, carte « Transférer mon stock ») : la structure envoie le
   tableur des appareils qu'elle avait déjà (CSV, Excel, ODS) ; l'équipe les ajoute à sa flotte
   depuis l'admin. Serveur : routes/transfertsStock.js. Utilise `poster`, `lireApi`, `echapper`
   (commun.js, base.js) ; fenêtre au style des modales du portail (.voile-modale-qr). */
window.TransfertStock = (function () {
  const TAILLE_MAX = 2 * 1024 * 1024;
  const COLONNES = 'numéro de série;produit;marque;modèle;statut;date d’arrivée;prénom;nom';
  const FERMER =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  let voile = null;

  const code = () => {
    try {
      return sessionStorage.getItem('cvdl-code-structure') || '';
    } catch (e) {
      return '';
    }
  };
  const $t = (id) => document.getElementById(id);
  const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

  function construire() {
    voile = document.createElement('div');
    voile.className = 'voile-modale-qr';
    voile.id = 'modale-transfert-stock';
    voile.innerHTML = `
      <div class="modale-qr ts-modale">
        <div class="modale-qr-entete">
          <span data-ill="flotte" class="pk-modale-ill"></span><h3>Transférer mon stock</h3>
          <button type="button" class="modale-fermer-rond-qr" id="ts-fermer" aria-label="Fermer">${FERMER}</button>
        </div>
        <p>Vous aviez déjà des appareils avant la plateforme ? Envoyez-nous leur liste : l’équipe les ajoute à votre flotte, puis vous les retrouvez dans « Ma flotte ». Un appareil déjà connu de la plateforme n’est jamais ajouté deux fois.</p>
        <p class="ts-aide">Un tableur (.csv, .xlsx ou .ods, 2 Mo au plus), une ligne par appareil, avec au moins le numéro de série. <button type="button" class="pk-lien" id="ts-modele">Télécharger le modèle de tableur</button></p>
        <div class="field"><label for="ts-fichier">Votre tableur</label><input type="file" id="ts-fichier" class="input" accept=".csv,.xlsx,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"></div>
        <div class="field"><label for="ts-message">Un mot pour l’équipe (facultatif)</label><textarea id="ts-message" class="input" rows="3" maxlength="1000" placeholder="Ex. : appareils reçus d’un don en 2024, tous en stock."></textarea></div>
        <div id="ts-retour" aria-live="polite"></div>
        <div class="ts-actions"><button type="button" class="btn btn-primary" id="ts-envoyer">Envoyer</button></div>
        <div class="ts-envois" id="ts-envois" hidden></div>
      </div>`;
    document.body.appendChild(voile);
    $t('ts-fermer').addEventListener('click', fermer);
    $t('ts-envoyer').addEventListener('click', envoyer);
    $t('ts-modele').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob(['﻿' + COLONNES + '\nPF1M2NVQ;PC portable 14";Lenovo;ThinkPad T480;En stock;15/03/2025;;\n'], {
          type: 'text/csv;charset=utf-8',
        }),
      );
      a.download = 'modele-stock.csv';
      a.click();
    });
  }

  function retour(texte, type) {
    $t('ts-retour').innerHTML = texte ? `<div class="msg msg-${type}">${echapper(texte)}</div>` : '';
  }

  async function chargerEnvois() {
    const r = await lireApi({ action: 'transferts-stock-structure', code: code() }).catch(() => null);
    const liste = $t('ts-envois');
    if (!r || !r.ok || !r.demandes.length) return (liste.hidden = true);
    liste.hidden = false;
    liste.innerHTML =
      '<div class="cvdl-surtitre">Vos envois</div>' +
      r.demandes
        .map(
          (d) => `<div class="ts-envoi${d.traiteLe ? ' fait' : ''}">
            <span><b>${echapper(d.nomFichier)}</b><small>Envoyé le ${dateFr(d.deposeLe)}${d.appareils != null ? ` · ${d.appareils} appareil${d.appareils > 1 ? 's' : ''}` : ''}</small></span>
            <span class="ts-etat">${d.traiteLe ? `Traité le ${dateFr(d.traiteLe)}${d.resultat ? ` · ${echapper(d.resultat)}` : ''}` : 'En cours'}</span>
          </div>`,
        )
        .join('');
  }

  function ouvrir() {
    if (!voile) construire();
    $t('ts-fichier').value = '';
    $t('ts-message').value = '';
    $t('ts-envoyer').disabled = false;
    retour('');
    voile.classList.add('visible');
    chargerEnvois();
  }
  function fermer() {
    voile.classList.remove('visible');
  }

  function lireBase64(fichier) {
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onload = () => ok(String(lecteur.result).split(',').pop());
      lecteur.onerror = ko;
      lecteur.readAsDataURL(fichier);
    });
  }

  async function envoyer() {
    const fichier = $t('ts-fichier').files[0];
    if (!fichier) return retour('Choisissez votre tableur.', 'erreur');
    if (!/\.(csv|xlsx|ods)$/i.test(fichier.name))
      return retour('Envoyez un tableur : fichier .csv, .xlsx ou .ods.', 'erreur');
    if (fichier.size > TAILLE_MAX) return retour('Fichier trop lourd (2 Mo maximum).', 'erreur');
    const bouton = $t('ts-envoyer');
    bouton.disabled = true;
    retour('Envoi…', 'info');
    let r;
    try {
      r = await poster({
        action: 'transfert-stock-deposer',
        code: code(),
        fichier: { nom: fichier.name, base64: await lireBase64(fichier) },
        message: $t('ts-message').value,
      });
    } catch (e) {
      r = { ok: false, erreur: 'Connexion impossible — réessayez.' };
    }
    if (!r.ok) {
      bouton.disabled = false;
      return retour(r.erreur || 'Envoi impossible.', 'erreur');
    }
    fermer();
    const n = r.appareils;
    const message = `Bien reçu${n != null ? ` : ${n} appareil${n > 1 ? 's' : ''} dans votre tableur` : ''}. L’équipe les ajoute à votre flotte ; suivez l’avancement depuis « Transférer mon stock ».`;
    if (window.alerteCvdl) window.alerteCvdl(message);
  }

  return { ouvrir };
})();
