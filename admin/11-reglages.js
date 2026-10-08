/* Admin CVDL — réglages. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueReglages() {
  const r = state.reglages || {};
  return `
    <h1 style="font-size:32px;margin-bottom:var(--space-2)">Réglages</h1>
    <p style="opacity:0.65;margin:0 0 var(--space-6);font-size:15px">Paramètres généraux de la plateforme.</p>

    <div class="card elev-sm rg-secours">
      <div class="rg-secours-tete">
        <span class="rg-secours-ico">${icon('bouclier_garantie', 22)}</span>
        <div><div class="card-title">Plan de secours</div>
        <p style="margin:2px 0 0;opacity:.7;font-size:13.5px">Ce qu'il faut savoir si l'admin ne fonctionne plus. Rien n'est perdu : les commandes et demandes SAV continuent d'arriver.</p></div>
      </div>
      <div class="rg-secours-grille">
        <div class="rg-secours-bloc">
          <b>1. Les alertes par e-mail</b>
          <p>Chaque <b>nouvelle commande</b> et chaque <b>nouvelle demande SAV</b> envoie un e-mail à cette adresse, même si l'admin est en panne.</p>
          ${champ('Adresse qui reçoit les alertes', `<input class="input" id="rg-email-admin" type="email" value="${echapper(r.emailAdmin || '')}" placeholder="equipe@exemple.org">`)}
          ${r.emailAdmin ? `<div class="rg-etat ok">${icon('check', 14)}Alertes actives</div>` : `<div class="rg-etat ko">${icon('alert', 14)}Aucune adresse : aucune alerte n'est envoyée</div>`}
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-primary" data-enregistrer-email-admin>Enregistrer</button>
            <button type="button" class="btn btn-secondary" data-tester-alertes ${r.emailAdmin ? '' : 'disabled'}>Envoyer un e-mail de test</button>
          </div>
          <div id="rg-secours-retour"></div>
        </div>
        <div class="rg-secours-bloc">
          <b>2. Les données sont dans une base PostgreSQL</b>
          <p>Commandes, demandes SAV, structures, produits… sont enregistrés dans une base de données Google Cloud SQL, <b>sauvegardée chaque jour</b> et restaurable à la minute près sur les 7 derniers jours (console Google Cloud → SQL → Sauvegardes).</p>
        </div>
      </div>
      <details class="rg-secours-procedure">
        <summary>Que faire si l'admin ne marche plus ?</summary>
        <ol>
          <li>Pas de panique : les structures peuvent toujours commander et signaler une panne, et vous recevez les e-mails d'alerte.</li>
          <li>Les données restent intactes dans la base : les alertes e-mail donnent le détail de chaque nouvelle commande et demande SAV.</li>
          <li>Prévenez la personne qui gère la technique : elle peut remettre la version précédente du serveur (Google Cloud → la fonction → Révisions) ou du site (version précédente dans git).</li>
        </ol>
      </details>
    </div>


    ${sectionReglages({
      ic: 'building',
      teinte: 'vert',
      titre: 'Périmètre du lancement',
      desc: 'Les types de structures proposés à la création, l’ouverture des structures partenaires et de l’espace bénéficiaires. Un type masqué n’est plus proposé ; les structures existantes continuent de fonctionner.',
      corps: vuePerimetre(r),
    })}

    ${sectionReglages({
      ic: 'lien_externe',
      teinte: 'vert',
      titre: 'Adresse publique du site',
      desc: 'L’adresse mise dans les QR codes des passeports, les liens des e-mails et les liens à copier. Gardez-la stable : un QR code imprimé la garde pour toujours, même si le site change d’adresse ensuite.',
      corps: `<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="rg-url-site" type="url" placeholder="https://cvdl.exemple.fr" value="${echapper(r.urlSite || '')}" style="flex:1;min-width:0"><button type="button" class="btn btn-primary" id="rg-url-site-enregistrer">Enregistrer</button></div>
        <p class="rta-aide">Vide : l’adresse du site autorisée au déploiement (<code>ORIGINE_AUTORISEE</code>). Un changement est signalé par e-mail à l’adresse des alertes.</p>`,
    })}

    ${sectionReglages({
      ic: 'lien_externe',
      teinte: 'bleu',
      titre: 'Liens utiles',
      desc: 'Des fichiers à ouvrir d’un clic là où vous en avez besoin (numérotation des factures, tableau de suivi…), sans aller les chercher dans le Drive.',
      corps: window.sectionLiensUtiles ? window.sectionLiensUtiles() : '',
    })}

    ${sectionReglages({
      ic: 'file',
      teinte: 'violet',
      titre: 'Documents',
      desc: 'Les modèles utilisés pour générer les bons de livraison, devis, factures et attestations.',
      corps: `
      <div class="rg-tuiles">
        ${[
          ['data-ouvrir-modele-bon', 'Bon de livraison', 'À chaque préparation de commande'],
          ['data-ouvrir-modele-devis', 'Devis', 'Relais Numérique, Projets'],
          ['data-ouvrir-modele-facture', 'Facture', 'Après livraison ou en fin de mois'],
          ['data-ouvrir-modele-attestation', 'Attestation', 'Paiement des personnes accompagnées'],
        ]
          .map(
            ([attr, nom, aide]) =>
              `<button type="button" class="rg-tuile" ${attr}><span class="rg-tuile-ic">${icon('file', 18)}</span><span class="rg-tuile-txt"><b>${nom}</b><small>${aide}</small></span><span class="rg-tuile-go">Modifier ${icon('arrow', 13)}</span></button>`,
          )
          .join('')}
      </div>
      <details class="rg-details">
        <summary>Utiliser un modèle Google Sheets/Docs à la place (repli historique)</summary>
        <p class="rg-aide">Colle l'ID (ou le lien complet) du classeur/document modèle — ignoré si un modèle HTML est téléversé ci-dessus pour le même document.</p>
        <div class="rg-grille">
          ${champ('ID modèle — Bon de livraison', `<input class="input" id="rg-modele-bon-livraison" value="${echapper(r.modeleBonLivraison || '')}" placeholder="ID ou lien du classeur modèle">`)}
          ${champ('ID modèle — Attestation de paiement', `<input class="input" id="rg-modele-attestation" value="${echapper(r.modeleAttestationPaiement || '')}" placeholder="ID ou lien du document modèle">`)}
          ${champ('ID modèle — Facturation', `<input class="input" id="rg-modele-facturation" value="${echapper(r.modeleFacturation || '')}" placeholder="ID ou lien du classeur modèle">`)}
        </div>
        <div class="rg-actions"><button type="button" class="btn btn-primary" id="rg-modeles-sheets-enregistrer">Enregistrer les modèles Sheets</button></div>
        <div id="rg-modeles-sheets-retour"></div>
      </details>`,
    })}

    ${sectionReglages({
      ic: 'cart',
      teinte: 'turquoise',
      titre: 'Commandes',
      desc: 'Quantité maximale d’un produit dans une commande, quand le produit n’a pas son propre maximum (fiche produit).',
      corps: `
      <div class="rg-grille">
        ${champ('Maximum par produit et par commande', `<input class="input" id="rg-qte-max" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${echapper(String(r.quantiteMaxDefaut || 5))}">`)}
        ${champ('Maximum pour les structures ESN et Interne', `<input class="input" id="rg-qte-max-esn" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${echapper(String(r.quantiteMaxDefautEsn || 5))}">`)}
      </div>
      <p class="rg-aide">Le « Mode stock bas » (onglet Stock) peut abaisser ces limites temporairement.</p>
      <div class="rg-actions"><button type="button" class="btn btn-primary" id="rg-qte-enregistrer">Enregistrer</button></div>`,
    })}

    ${sectionReglages({
      ic: 'refresh',
      teinte: 'turquoise',
      titre: 'Connexion à l’API tec.tech',
      desc: 'Reconditionneur partenaire — synchro stock, donateur/reconditionneur d’origine.',
      corps: `
      <div class="rg-grille">
        ${champ('URL de base (variable TECTECH_URL du serveur)', `<input class="input" id="rg-tectech-url" value="${echapper(r.tectechUrlBase || '')}" readonly disabled>`)}
        ${champ('ID de stock suivi', `<input class="input" id="rg-tectech-stock" value="${echapper(r.tectechIdStock || '')}" placeholder="S-0454">`)}
        <div class="rg-large">${champ('Statuts comptant comme "disponible" (séparés par une virgule)', `<input class="input" id="rg-tectech-statuts" value="${echapper(r.tectechStatuts || '')}" placeholder="PRET_A_COMMANDER,A_DISTRIBUER">`)}</div>
      </div>
      <div class="rg-actions">
        <button type="button" class="btn btn-secondary" id="rg-tectech-tester">${icon('refresh', 15)}Tester la connexion</button>
        <button type="button" class="btn btn-primary" id="rg-tectech-enregistrer">Enregistrer</button>
      </div>
      <div id="rg-tectech-retour"></div>`,
    })}

    ${sectionReglages({
      ic: 'bouclier_garantie',
      teinte: 'vert',
      titre: 'Sécurité — partages Drive publics',
      desc: 'Les documents (bons, attestations, factures, bons Colissimo) ne sont plus partagés « à toute personne disposant du lien » : la plateforme les ouvre par des liens signés valables 24 h. À lancer une fois après la mise à jour, pour les fichiers créés avant ce changement.',
      corps: `
      <div class="rg-actions"><button type="button" class="btn btn-secondary" id="rg-retirer-partages">${icon('refresh', 15)}Retirer les partages publics</button></div>
      <div id="rg-partages-retour"></div>`,
    })}

    ${
      /-demo$/.test(API)
        ? sectionReglages({
            ic: 'refresh',
            teinte: 'rouge',
            titre: 'Données de démonstration',
            desc: 'Remet les données fictives de la démo à neuf (elles le sont aussi d’elles-mêmes après 15 minutes sans activité).',
            corps: `<div class="rg-actions"><button type="button" class="btn btn-primary" id="rg-demo-lancer">${icon('refresh', 15)}Remettre la démo à neuf</button></div>
      <div id="rg-demo-retour"></div>`,
          })
        : ''
    }`;
}
/** Section de l'écran Réglages : même en-tête que « Plan de secours » (pastille d'icône
 *  teintée + titre + phrase d'explication), puis le contenu. */
function sectionReglages({ ic, teinte, titre, desc, corps, cls }) {
  return `
    <section class="card elev-sm rg-section rg-${teinte || 'bleu'}${cls ? ' ' + cls : ''}">
      <div class="rg-secours-tete">
        <span class="rg-secours-ico">${icon(ic, 20)}</span>
        <div><div class="card-title">${echapper(titre)}</div>
        ${desc ? `<p class="rg-desc">${echapper(desc)}</p>` : ''}</div>
      </div>
      <div class="rg-corps">${corps}</div>
    </section>`;
}
function vuePerimetre(r) {
  const actifs = String(r.typesActifs || 'rn,interne,bo').split(',');
  return `
      <div class="rg-tuiles">${TYPES_STRUCTURE.map(
        (t) =>
          `<label class="rg-tuile"><input type="checkbox" class="rg-type-actif" value="${t.cle}" ${actifs.includes(t.cle) ? 'checked' : ''}><span class="rg-tuile-txt"><b>${echapper(t.libelle)}</b><small>${echapper(t.aide)}</small></span></label>`,
      ).join('')}</div>
      <label class="rg-tuile"><input type="checkbox" id="rg-partenaires-actifs" ${r.partenairesActifs ? 'checked' : ''}><span class="rg-tuile-txt"><b>Structures partenaires</b><small>Une Interne crée des Ventes solidaires rattachées, les valide et les sert depuis sa flotte. Fermé : elles fonctionnent comme des Ventes solidaires autonomes.</small></span></label>
      <label class="rg-tuile"><input type="checkbox" id="rg-beneficiaires-actifs" ${r.beneficiairesActifs ? 'checked' : ''}><span class="rg-tuile-txt"><b>Espace bénéficiaires</b><small>Les personnes accompagnées déclarent et suivent elles-mêmes une panne. Fermé : ces pages renvoient vers le portail structure.</small></span></label>
      <div class="rg-actions"><button type="button" class="btn btn-primary" id="rg-perimetre-enregistrer">Enregistrer le périmètre</button></div>`;
}
async function enregistrerAdresseSite() {
  const urlSite = $('rg-url-site').value.trim();
  const r = await poster({ action: 'reglages-set', urlSite });
  if (r.ok) {
    state.reglages.urlSite = urlSite;
    etat('Adresse enregistrée', 'succes');
  } else etat(r.erreur || 'Enregistrement impossible', 'erreur');
}
async function enregistrerPerimetre() {
  const typesActifs = [...document.querySelectorAll('.rg-type-actif:checked')].map((c) => c.value).join(',');
  if (!typesActifs) {
    etat('Gardez au moins un type de structure', 'erreur');
    return;
  }
  const partenairesActifs = $('rg-partenaires-actifs').checked;
  const beneficiairesActifs = $('rg-beneficiaires-actifs').checked;
  const r = await poster({ action: 'reglages-set', typesActifs, partenairesActifs, beneficiairesActifs });
  if (r.ok) {
    Object.assign(state.reglages, { typesActifs, partenairesActifs, beneficiairesActifs });
    etat('Périmètre enregistré', 'succes');
  } else etat(r.erreur || 'Enregistrement impossible', 'erreur');
}
async function enregistrerQuantitesMax() {
  const qte = parseInt($('rg-qte-max').value, 10),
    esn = parseInt($('rg-qte-max-esn').value, 10);
  if (!(qte >= 1 && qte <= 1000) || !(esn >= 1 && esn <= 1000)) {
    etat('Indiquez un nombre entre 1 et 1000', 'erreur');
    return;
  }
  const r = await poster({ action: 'reglages-set', quantiteMaxDefaut: qte, quantiteMaxDefautEsn: esn });
  if (r.ok) {
    Object.assign(state.reglages, { quantiteMaxDefaut: qte, quantiteMaxDefautEsn: esn });
    etat('Réglages enregistrés', 'succes');
  } else etat(r.erreur || 'Enregistrement impossible', 'erreur');
}
/** Accepte aussi bien un ID brut qu'un lien Google complet (Sheets/Docs) — la copie de modèle
 *  (copierModele côté backend) attend un ID nu, jamais une URL. */
function extraireIdDepuisLien(valeur) {
  const v = String(valeur || '').trim();
  const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}
/** Retire le partage public des anciens fichiers Drive, par lots de 100, jusqu'au bout. */
async function retirerPartagesPublics() {
  const bouton = $('rg-retirer-partages');
  if (bouton) bouton.disabled = true;
  let total = 0;
  try {
    for (let tour = 0; tour < 200; tour++) {
      $('rg-partages-retour').innerHTML = `<div class="msg msg-info">${total} fichier(s) traité(s)…</div>`;
      const r = await poster({ action: 'securite-retirer-partages' });
      if (!r.ok) {
        $('rg-partages-retour').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Échec')}</div>`;
        break;
      }
      total += r.traites || 0;
      if (!r.reste) {
        $('rg-partages-retour').innerHTML =
          `<div class="msg msg-succes">Terminé : ${total} fichier(s) ne sont plus publics.</div>`;
        break;
      }
    }
  } catch (e) {
    $('rg-partages-retour').innerHTML = '<div class="msg msg-erreur">Échec — réessaie.</div>';
  }
  if (bouton) bouton.disabled = false;
}
/** Démo : régénère les données fictives. */
async function lancerReinitialisationDemo() {
  const bouton = $('rg-demo-lancer');
  bouton.disabled = true;
  const r = await poster({ action: 'reset-donnees-test' }).catch(() => ({ ok: false }));
  bouton.disabled = false;
  $('rg-demo-retour').innerHTML = r.ok
    ? '<div class="msg msg-succes">Démo remise à neuf. Rechargez la page pour tout revoir à jour.</div>'
    : `<div class="msg msg-erreur">${echapper(r.erreur || 'Échec de la remise à neuf.')}</div>`;
}
async function enregistrerModelesSheets() {
  const bouton = $('rg-modeles-sheets-enregistrer');
  bouton.disabled = true;
  const champs = {
    modeleBonLivraison: extraireIdDepuisLien($('rg-modele-bon-livraison').value),
    modeleAttestationPaiement: extraireIdDepuisLien($('rg-modele-attestation').value),
    modeleFacturation: extraireIdDepuisLien($('rg-modele-facturation').value),
  };
  const reponses = await Promise.all(
    Object.keys(champs).map((c) => poster({ action: 'reglages-set', champ: c, valeur: champs[c] })),
  );
  const ok = !reponses.find((r) => !r.ok);
  const retour = $('rg-modeles-sheets-retour');
  if (ok) {
    Object.assign(state.reglages, champs);
    retour.innerHTML = '<div class="msg msg-succes">Modèles enregistrés.</div>';
  } else {
    retour.innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  bouton.disabled = false;
}
async function enregistrerReglagesTecTech() {
  const bouton = $('rg-tectech-enregistrer');
  bouton.disabled = true;
  const champs = {
    tectechIdStock: $('rg-tectech-stock').value.trim(),
    tectechStatuts: $('rg-tectech-statuts').value.trim(),
  };
  const reponses = await Promise.all(
    Object.keys(champs).map((c) => poster({ action: 'reglages-set', champ: c, valeur: champs[c] })),
  );
  const ok = !reponses.find((r) => !r.ok);
  if (ok) {
    Object.assign(state.reglages, champs);
    etat('Réglages enregistrés', 'succes');
  } else {
    etat('Enregistrement impossible', 'erreur');
  }
  bouton.disabled = false;
}
async function testerConnexionTecTech() {
  const bouton = $('rg-tectech-tester');
  const retour = $('rg-tectech-retour');
  bouton.disabled = true;
  retour.innerHTML = '<div class="msg msg-info">Vérification…</div>';
  try {
    const r = await jsonp({ action: 'tectech-tester-connexion', password: motDePasse });
    retour.innerHTML = r.ok
      ? `<div class="msg msg-succes">${echapper(r.message)}</div>`
      : `<div class="msg msg-erreur">${echapper(r.erreur || 'Connexion impossible.')}</div>`;
  } catch (e) {
    retour.innerHTML = '<div class="msg msg-erreur">Connexion impossible — réessaie.</div>';
  }
  bouton.disabled = false;
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#rg-tectech-enregistrer')) enregistrerReglagesTecTech();
  if (e.target.closest('#rg-tectech-tester')) testerConnexionTecTech();
  if (e.target.closest('#rg-modeles-sheets-enregistrer')) enregistrerModelesSheets();
  if (e.target.closest('#rg-demo-lancer')) lancerReinitialisationDemo();
  if (e.target.closest('#rg-retirer-partages')) retirerPartagesPublics();
  if (e.target.closest('#rg-qte-enregistrer')) enregistrerQuantitesMax();
  if (e.target.closest('#rg-perimetre-enregistrer')) enregistrerPerimetre();
  if (e.target.closest('#rg-url-site-enregistrer')) enregistrerAdresseSite();
});
