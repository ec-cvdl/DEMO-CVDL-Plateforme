/* Admin CVDL — personnes d'une structure (comptes à connexion par e-mail) dans la fiche
   structure (vue 360). Le composant (personnes-structure.js) est gardé d'un rendu à l'autre tant
   que la même fiche reste ouverte : il n'est rechargé qu'à l'ouverture. */
const zonesPersonnes = {};
function monterPersonnesStructure() {
  const stable = $('rp-modal-zone').classList.contains('rp-modal-stable');
  document.querySelectorAll('[data-pst-structure]').forEach((place) => {
    const id = Number(place.dataset.pstStructure);
    if (!stable || !zonesPersonnes[id]) {
      zonesPersonnes[id] = document.createElement('div');
      PersonnesStructure.monter(zonesPersonnes[id], { appel: poster, cible: { structureId: id } });
    }
    place.replaceChildren(zonesPersonnes[id]);
  });
}
