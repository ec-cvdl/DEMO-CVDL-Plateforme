/* Comprendre CVDL en lecture seule (comprendre.html) : lien de partage créé dans l'onglet Projet
   de l'admin. Le jeton est après # dans l'adresse (jamais envoyé ailleurs qu'à l'API) ; la page
   relit le dossier à chaque ouverture, donc toujours à jour. Rendu : projet-comprendre.js. */
(async () => {
  const zone = $('cc-zone');
  const jeton = decodeURIComponent(location.hash.slice(1));
  const r = jeton
    ? await appelApi({ action: 'comprendre-public', jeton }, { methode: 'POST' }).catch(() => null)
    : null;
  if (!r || !r.ok) {
    zone.innerHTML = `<p class="cc-erreur">${echapper((r && r.erreur) || 'Lien incomplet ou invalide : demandez le lien à l’équipe CVDL.')}</p>`;
    return;
  }
  window.ComprendreProjet.afficher(zone, r);
})();
