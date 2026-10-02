/* ════════════════════════════════════════════════════════════════════════════════════
   fiche-commande.js — composant PARTAGÉ de la fiche commande, chargé par l'admin
   (admin.html) et par l'espace partenaire (commandes-partenaires.html).
   Il ne rend que ce qui dépend des règles de traitement, à partir de l'état renvoyé par
   l'action serveur « commande-etat » (regles/prerequis.js) :
     · FicheCommande.frise(etat)     → étapes du circuit (fait / en cours / à venir) ;
     · FicheCommande.checklist(etat) → « Pour passer à « X » » + ce qui manque ;
     · FicheCommande.charger(params) → appel commande-etat (admin : password, partenaire :
                                        codeCreateur), via la fonction jsonp de la page.
   Les deux écrans affichent donc exactement la même chose pour une même commande.
   ════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  const esc = (v) =>
    String(v == null ? '' : v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const COURTS = { 'En cours de livraison': 'En livraison' };

  /** Étapes du circuit, horizontales : rond turquoise = faite, carré magenta = en cours,
   *  rond pointillé = à venir. */
  function frise(etat) {
    if (!etat) return '';
    if (etat.statut === 'Annulée') return '<div class="fc-annulee">Commande annulée</div>';
    const livree = etat.statut === 'Livrée';
    return `<ol class="fc-frise">${etat.etapes
      .map((e, i) => {
        const cls = livree || i < etat.indexEtape ? 'fait' : i === etat.indexEtape ? 'cours' : 'avenir';
        return `<li class="${cls}"${cls === 'cours' ? ' aria-current="step"' : ''}><i></i><span>${esc(COURTS[e] || e)}</span></li>`;
      })
      .join('')}</ol>`;
  }

  /** Checklist de passage à l'étape suivante. */
  function checklist(etat, { titre = true } = {}) {
    if (!etat || !etat.etapeSuivante) return '';
    const manquants = etat.prerequis.filter((p) => !p.ok).length;
    return `<div class="fc-checklist">
      ${titre ? `<div class="fc-titre">Pour passer à « ${esc(etat.etapeSuivante)} »${etat.raccourci ? ` <small>(ou directement « ${esc(etat.raccourci)} » : commande dématérialisée)</small>` : ''}</div>` : ''}
      ${etat.prerequis.map((p) => `<div class="fc-pr ${p.info ? 'info' : p.ok ? 'ok' : 'ko'}"><span class="fc-c" aria-hidden="true"></span><span>${esc(p.libelle)}</span></div>`).join('')}
      <div class="fc-bilan ${manquants ? 'manque' : 'pret'}">${manquants ? (manquants === 1 ? 'Il manque 1 élément avant de pouvoir avancer.' : `Il manque ${manquants} éléments avant de pouvoir avancer.`) : 'Tout est prêt.'}</div>
    </div>`;
  }

  /** Charge l'état d'une commande. `jsonp` = fonction d'appel API de la page. */
  async function charger(jsonp, params) {
    const r = await jsonp(Object.assign({ action: 'commande-etat' }, params));
    return r && r.ok ? r.etat : null;
  }

  window.FicheCommande = { frise, checklist, charger };
})();
