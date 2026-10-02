/* Admin CVDL — fiche SAV. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueDossierSav(s) {
  const defs = state.statutsSav.length ? state.statutsSav : [{ statut: s.statut, terminal: false }];
  const nonTerminaux = defs.filter((d) => !d.terminal);
  const terminaux = defs.filter((d) => d.terminal);
  const idx = Math.max(
    0,
    nonTerminaux.findIndex((d) => d.statut === s.statut),
  );
  const estSurTerminal = terminaux.some((d) => d.statut === s.statut);
  const structureSav = state.structures.find((x) => x.code === s.code);
  const suivant = !estSurTerminal ? nonTerminaux[idx + 1] : null;
  const dateStatut = (st) => {
    const h = (s.historique || []).filter((x) => x.statut === st).pop();
    return h ? h.date : '';
  };
  const copie = (v) =>
    v
      ? `<button type="button" class="rpd-copie" data-copier-jeton="${echapper(v)}" title="Copier">${icon('copie', 12)}</button>`
      : '';
  const autresTickets = s.numeroSerie
    ? state.sav.filter((x) => x.numeroSerie === s.numeroSerie && x.reference !== s.reference)
    : [];
  const couleur = estSurTerminal ? '#1F9D55' : '#E5484D';
  const etapes = nonTerminaux
    .map((d, i) => {
      const fait = i < idx || estSurTerminal,
        enCours = i === idx && !estSurTerminal;
      const verrou = estSurTerminal || i > idx + 1;
      const date = dateStatut(d.statut);
      return `
      <div class="rpd-etape ${fait ? 'fait' : ''} ${enCours ? 'cours' : ''} ${!fait && !enCours ? 'avenir' : ''}">
        <span class="rpd-point">${fait ? icon('check', 15) : icon(iconeStatutSav(d.statut, d.icone), 15)}</span>
        <div class="rpd-etape-corps">
          <div class="rpd-etape-titre"><b>${echapper(d.statut)}</b><small>${enCours ? 'en cours' : ''}${date ? `${enCours ? ' · depuis le ' : ''}${echapper(date)}` : ''}</small></div>
          ${
            enCours
              ? `<div class="rpd-bloc-cours">
            ${
              suivant
                ? `<button type="button" class="btn btn-primary btn-block" data-changer-statut-sav="${echapper(suivant.statut)}" data-ref="${echapper(s.reference)}">${icon('arrow', 15)}Passer à « ${echapper(suivant.statut)} »</button>`
                : `<p class="rpd-apercu">Dernière étape avant la clôture — choisissez l'issue du dossier ci-dessous.</p>`
            }
            ${d.colissimo ? blocColissimoSav(s) : ''}
          </div>`
              : ''
          }
          ${!fait && !enCours && !verrou && !estSurTerminal ? '' : ''}
        </div>
      </div>`;
    })
    .join('');
  return `
    <div class="rp-drawer-backdrop rpd-voile">
      <div class="rpd" role="dialog" aria-modal="true" aria-label="SAV ${echapper(s.reference)}" style="--rpd-statut:${couleur}">
        <aside class="rpd-fiche">
          <div class="rpd-fiche-haut"><span class="rpd-k">SAV${structureSav ? ' · ' + echapper(typeStructure(structureSav)) : ''}</span><span class="rpd-statut">${echapper(s.statut || '')}</span><button type="button" class="rpd-fermer rpd-fermer-mobile" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
          <div class="rpd-id">
            <span data-ill="suiviSav" class="ill xl"></span>
            <div><div class="rpd-ref">${echapper(s.reference)}</div>
            ${
              s.referenceCommande
                ? state.commandes.some((c) => c.reference === s.referenceCommande)
                  ? `<button type="button" class="rpd-cmd-lien" data-commande-ouvrir="${echapper(s.referenceCommande)}" title="Ouvrir la commande d’origine">${icon('package', 13)}${echapper(s.referenceCommande)}<span aria-hidden="true">→</span></button>`
                  : `<span class="rpd-cmd-lien inactif">${icon('package', 13)}${echapper(s.referenceCommande)}</span>`
                : ''
            }
            <div class="rpd-structure">${(() => {
              const st = state.structures.find((x) => x.code === s.code);
              const n = s.structureNom || s.nom || '';
              return st
                ? `<button type="button" class="lien-structure" data-structure-vue="${st.ligne}" title="Ouvrir la fiche 360° de la structure">${echapper(n)}</button>`
                : echapper(n);
            })()}<small>Ouvert le ${echapper(s.date)}${s.dateResolution ? ' · clos le ' + echapper(s.dateResolution) : ''}</small></div></div>
          </div>
          <div class="rpd-badges">
            ${s.inactifDepuisUnMois && !estSurTerminal ? `<span class="rpd-b urg">${icon('clock', 11)}Inactif depuis 1 mois</span>` : ''}
            ${estSurTerminal ? `<span class="rpd-b ok">${icon('check', 11)}Dossier clos</span>` : ''}
            ${autresTickets.length ? `<span class="rpd-b dev">${icon('refresh', 11)}${autresTickets.length} autre${autresTickets.length > 1 ? 's' : ''} passage${autresTickets.length > 1 ? 's' : ''}</span>` : ''}
          </div>
          ${s.numeroSerie ? `<button type="button" class="rpd-passeport rpd-passeport-haut" data-passeport-url="passeport.html?sn=${encodeURIComponent(s.numeroSerie)}&admin=1" data-sn="${echapper(s.numeroSerie)}"><span data-ill="passeport" class="ill s"></span><span><b>Passeport de l’appareil</b><span class="rpd-passeport-sn">${echapper(s.numeroSerie)}<span class="rpd-passeport-cp" role="button" tabindex="0" data-copier-sn="${echapper(s.numeroSerie)}" title="Copier le numéro de série" aria-label="Copier le numéro de série">${icon('copie', 12)}</span></span></span><span aria-hidden="true">→</span></button>` : ''}
          ${s.numeroSerie ? `<div class="rpd-sec rpd-origine"><span class="rpd-k">Origine de l’appareil</span>${blocOrigineTecTech(s)}</div>` : ''}
          ${(() => {
            const g = s.numeroSerie ? badgeGarantie(s.dateAchat) : '';
            return s.marque || s.modele || g
              ? `<div class="rpd-somme">
            ${s.marque || s.modele ? `<div class="rpd-l"><span>Modèle</span><b>${echapper([s.marque, s.modele].filter(Boolean).join(' '))}</b></div>` : ''}
            ${g ? `<div class="rpd-l"><span>Garantie</span><b>${g}</b></div>` : ''}
          </div>`
              : '';
          })()}
          <div class="rpd-sec"><span class="rpd-k">Symptôme</span>${carteSymptomeSav(s.symptome)}
            ${s.problemeEffectif ? `<div class="rpd-row">${icon('wrench', 14)}Constaté : ${echapper(s.problemeEffectif)}</div>` : ''}</div>
          ${(() => {
            // Identité pseudonymisée par le serveur ; révélation tracée (identite-admin.js).
            const rv = s.identiteMasquee ? identiteRevelee('sav', s.ligne) : null;
            const email = s.email || (rv && rv.contact && rv.contact.email) || '';
            const tel = s.telephone || (rv && rv.contact && rv.contact.telephone) || '';
            const nomPers = (p) => (p ? nomPersonneAdmin('sav', s.ligne, p) : '');
            return `<div class="rpd-sec"><span class="rpd-k">Contact${s.contactPersonnel ? ' · la personne directement' : ''}</span>
            ${s.nomBeneficiaire ? `<div class="rpd-row">${icon('personne', 14)}${echapper(nomPers(s.nomBeneficiaire))}</div>` : ''}
            ${s.nom ? `<div class="rpd-row">${icon(s.code ? 'building' : 'personne', 14)}${echapper(s.code ? s.nom : nomPers(s.nom))}</div>` : ''}
            ${email ? `<div class="rpd-row">${icon('mail', 14)}<a href="mailto:${echapper(email)}">${echapper(email)}</a>${copie(email)}</div>` : s.emailIndice ? `<div class="rpd-row idr-indice">${icon('mail', 14)}${echapper(s.emailIndice)}</div>` : ''}
            ${tel ? `<div class="rpd-row">${icon('telephone', 14)}${echapper(tel)}${copie(tel)}</div>` : s.telephoneIndice ? `<div class="rpd-row idr-indice">${icon('telephone', 14)}${echapper(s.telephoneIndice)}</div>` : ''}
            ${s.identiteMasquee ? `<div class="rpd-row">${boutonIdentite('sav', s.ligne, s.contactPersonnel ? 'Afficher les coordonnées' : 'Afficher l’identité')}</div>` : ''}
          </div>`;
          })()}
          ${s.commentaire ? `<div class="rpd-comm">« ${echapper(s.commentaire)} »</div>` : ''}
          <div class="rpd-menu rpd-menu-v2">
            ${!estSurTerminal ? `<button type="button" class="btn-annuler" data-annuler-sav="${echapper(s.reference)}">${iconeAnnuler()}Annuler ce SAV</button>` : ''}
            ${s.email ? `<a class="rpd-mbtn" href="mailto:${echapper(s.email)}?subject=${encodeURIComponent('Votre demande SAV ' + s.reference)}">${icon('mail', 13)}Écrire</a>` : ''}
            ${!s.email && s.aEmail ? `<button type="button" class="rpd-mbtn" data-idr-ecrire="sav|${s.ligne}|${echapper(s.reference)}">${icon('mail', 13)}Écrire</button>` : ''}
          </div>
        </aside>
        <section class="rpd-parcours">
          <div class="rpd-ph"><h2>Parcours</h2><span>${estSurTerminal ? `Dossier clos · ${echapper(s.statut)}` : `Étape ${idx + 1} sur ${nonTerminaux.length} · ${echapper(s.statut)}`}</span>
            <button type="button" class="rpd-fermer" data-modal-fermer aria-label="Fermer">${icon('x', 16)}</button></div>
          <div class="rpd-docs">
            ${s.bonColissimo ? `<a class="rpd-doc" href="${echapper(urlSure(s.bonColissimo))}" target="_blank" rel="noopener"><span class="rpd-di amb">${icon('file', 14)}</span><span>Bon Colissimo<small>PDF déposé</small></span></a>` : ''}
            ${s.photo ? `<a class="rpd-doc" href="${echapper(urlSure(s.photo))}" target="_blank" rel="noopener"><span class="rpd-di tur">${icon('eye', 14)}</span><span>Photo<small>jointe par la structure</small></span></a>` : ''}
            ${s.lienVideo ? `<a class="rpd-doc" href="${echapper(urlSure(s.lienVideo))}" target="_blank" rel="noopener"><span class="rpd-di vio">${icon('eye', 14)}</span><span>Vidéo<small>lien fourni</small></span></a>` : ''}
            ${String(s.colissimo || '')
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean)
              .map(
                (l, i, t) =>
                  `<a class="rpd-doc" href="${echapper(urlSure(l))}" target="_blank" rel="noopener"><span class="rpd-di amb">${icon('truck', 14)}</span><span>${t.length > 1 ? 'Colis ' + (i + 1) : 'Suivi colis'}<small>Colissimo</small></span></a>`,
              )
              .join('')}
          </div>
          <div class="rpd-etapes">${etapes}</div>
          ${
            terminaux.length
              ? `
          <div class="rpd-bloc-cloture">
            <button type="button" class="rpd-cloture-titre" data-toggle-accordeon-terminal>${icon('alert', 15)}<b>${estSurTerminal ? 'Issue du dossier' : 'Clôturer le dossier'}</b><span class="rpd-chevron ${state.accordeonTerminalOuvert ? 'ouvert' : ''}">${icon('chevron', 15)}</span></button>
            ${
              state.accordeonTerminalOuvert
                ? `<p class="rpd-apercu">Ces statuts ferment définitivement le ticket, sans retour en arrière.</p>
            <div class="rpd-docs">${terminaux.map((d) => `<button type="button" class="rpd-doc" data-changer-statut-sav-terminal="${echapper(d.statut)}" data-ref="${echapper(s.reference)}"><span class="rpd-di ${d.statut === s.statut ? 'tur' : 'mag'}">${icon(d.statut === s.statut ? 'check' : 'alert', 14)}</span><span>${echapper(d.statut)}<small>${d.statut === s.statut ? 'statut actuel' : 'clôturer'}</small></span></button>`).join('')}</div>`
                : ''
            }
          </div>`
              : ''
          }
          ${
            autresTickets.length
              ? `<div class="rpd-historique"><div class="rpd-hist-titre">${icon('refresh', 15)}<b>Autres passages de cet appareil</b></div>
            <div class="rpd-docs">${autresTickets.map((t) => `<button type="button" class="rpd-doc" data-sav-ouvrir="${echapper(t.reference)}"><span class="rpd-di vio">${icon('wrench', 14)}</span><span>${echapper(t.reference)}<small>${echapper(t.date)} · ${echapper(t.statut)}</small></span></button>`).join('')}</div></div>`
              : ''
          }
          <div class="rpd-historique">
            <div class="rpd-hist-titre">${icon('clock', 15)}<b>Historique</b></div>
            ${
              (s.historique || []).length
                ? `<ol class="rpd-hist">${s.historique
                    .slice()
                    .reverse()
                    .map((h) => `<li><i></i><span>${echapper(h.statut)}</span><small>${echapper(h.date)}</small></li>`)
                    .join('')}</ol>`
                : '<p class="rpd-apercu">Aucun changement de statut enregistré.</p>'
            }
          </div>
          ${typeof blocFilSavAdmin === 'function' ? blocFilSavAdmin(s) : ''}
          <div id="rp-retour-modale"></div>
        </section>
      </div>
    </div>`;
}

function panneauDevisPaiementCommande(c) {
  const structure = state.structures.find((s) => s.code === c.code);
  const exempte = !!(structure && (structure.interne || structure.esn));
  if (exempte) return '';
  const devisEligible = c.devisDemande === 'Oui' && !structureExclueDevisFacture(c);
  const factureEligible = !structureExclueDevisFacture(c);
  const paiementCB = c.moyenPaiement === 'Paiement en ligne (CB)';
  const paiementEnAttente =
    c.dernierClicLienPaiement && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé';
  if (!devisEligible && !factureEligible && !paiementCB) return '';
  const ligneDoc = (cls, ic, titre, detail, action, fait) => `
    <div class="rpd-docligne ${fait ? 'fait' : ''}"><span class="rpd-di ${cls}">${icon(ic, 15)}</span><span class="rpd-docligne-txt"><b>${titre}</b><small>${detail}</small></span>${action || ''}</div>`;
  return `
    <section class="rpd-section">
      <div class="rpd-section-titre"><span data-ill="facture" class="ill s"></span><b>Devis, facture &amp; paiement</b></div>
      ${
        devisEligible
          ? ligneDoc(
              'vio',
              'file',
              c.referenceDevis ? `Devis ${echapper(c.referenceDevis)}` : 'Devis demandé',
              c.referenceDevis ? 'Généré — ouvrir dans Devis / Factures' : 'Pas encore généré',
              c.referenceDevis
                ? `<button type="button" class="btn btn-secondary btn-sm" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceDevis)}">Ouvrir</button>`
                : `<button type="button" class="btn btn-primary btn-sm" data-generer-devis="${echapper(c.reference)}">Générer</button>`,
              !!c.referenceDevis,
            )
          : ''
      }
      ${factureEligible && c.factureMensuelle && !c.referenceFacture ? ligneDoc('mag', 'calendrier', 'Facture mensuelle', 'Produits payés en fin de mois : facture regroupée envoyée au début du mois suivant.', '') : ''}
      ${
        factureEligible && !(c.factureMensuelle && !c.referenceFacture)
          ? c.referenceFacture
            ? ligneDoc(
                'mag',
                'receipt',
                `Facture ${echapper(c.referenceFacture)}`,
                echapper(c.statutComptable || 'Générée'),
                `<button type="button" class="btn btn-secondary btn-sm" data-feed-goto="factures" data-highlight-doc="${echapper(c.referenceFacture)}">Ouvrir</button>`,
                true,
              )
            : `${ligneDoc('mag', 'receipt', 'Facture', 'Pas encore générée', '')}
             <div class="rpd-form-ligne"><input class="input" id="pn-numero-facture" placeholder="Numéro de facture (FAC-…)"><button type="button" class="btn btn-secondary" data-generer-facture-livree="${echapper(c.reference)}">Générer</button></div>
             <div id="pn-erreur-facture"></div>`
          : ''
      }
      ${(devisEligible && !c.referenceDevis) || (factureEligible && !c.referenceFacture && !c.factureMensuelle) ? liensRaccourcis('commande') : ''}
      ${paiementEnAttente ? `<div class="rpd-alerte">${icon('alert', 14)}Lien de paiement cliqué, pas encore réglé</div>` : ''}
      ${
        paiementCB
          ? (() => {
              const noms = nomsPersonnesCommande(c);
              const actuel = (c.lienPaiement || '').trim();
              const entete = ligneDoc(
                'amb',
                'lien_externe',
                c.paiementSepare && noms.length > 1
                  ? 'Liens de paiement (un par personne)'
                  : 'Lien de paiement en ligne',
                actuel ? 'Visible dans le suivi de la structure' : 'Aucun lien pour l’instant',
                '',
                !!actuel,
              );
              if (c.paiementSepare && noms.length > 1) {
                const liens = String(c.lienPaiement || '').split('\n');
                return `${entete}
            <div class="rpd-liens">${noms.map((nom, i) => `<label class="rpd-lien-perso"><span title="${echapper(nom)}">${echapper(nom || 'Personne ' + (i + 1))}</span><input class="input" data-lien-paiement-personne="${i}" placeholder="https://…" value="${echapper(liens[i] || '')}"></label>`).join('')}</div>
            <button type="button" class="btn btn-secondary" data-enregistrer-liens-paiement-personnes="${echapper(c.reference)}">Enregistrer les liens</button>
            <div id="pn-erreur-lien-paiement"></div>`;
              }
              return `${entete}
          <div class="rpd-form-ligne"><input class="input" id="pn-lien-paiement" placeholder="https://…" value="${echapper(actuel)}"><button type="button" class="btn btn-secondary" data-enregistrer-lien-paiement="${echapper(c.reference)}">Enregistrer</button></div>
          <div id="pn-erreur-lien-paiement"></div>`;
            })()
          : ''
      }
    </section>`;
}
const MODES_LIVRAISON = [
  { valeur: 'Colissimo', label: 'Colissimo', ic: 'truck', aide: 'Envoi postal suivi — un lien par colis.' },
  {
    valeur: 'Livraison EC',
    label: 'Livraison Emmaüs Connect',
    ic: 'package',
    aide: 'Livrée par l’équipe, à une date estimée.',
  },
  { valeur: 'Retrait', label: 'Retrait', ic: 'building', aide: 'La structure vient récupérer sur place.' },
];
/* Illustrations des modes de livraison — même dessin que le reste de l'appli (aplat décalé
   + trait bleu nuit), en grand dans les cartes de choix. */
const ILL_MODE_LIVRAISON = {
  Colissimo: [
    '#F5A3BC',
    '<path d="M10 17 25 10l15 7v17l-15 7-15-7z"/>',
    '<path d="M8 15 23 8l15 7v17l-15 7-15-7z"/><path d="M8 15l15 7 15-7M23 22v17"/><path d="M15.5 11.5 30.5 18.5v6"/><path d="M2 27h4M1 32h5"/>',
  ],
  'Livraison EC': [
    '#9FE0E1',
    '<rect x="5" y="15" width="24" height="17" rx="2"/><path d="M29 20h7l5 6v6H29z"/>',
    '<rect x="3" y="13" width="24" height="17" rx="2"/><path d="M27 18h7l5 6v6H27z"/><circle cx="11" cy="32" r="3.5" fill="#fff"/><circle cx="33" cy="32" r="3.5" fill="#fff"/><path d="M29 22h4l2.5 3"/>',
  ],
  Retrait: [
    '#F5A3BC',
    '<path d="M9 21h32v19H9z"/>',
    '<path d="M7 19h32v19H7z"/><path d="M5 19l4-10h28l4 10"/><path d="M5 19a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0"/><path d="M18 38v-9h10v9"/>',
  ],
};
function illustrationModeLivraison(valeur, t) {
  const d = ILL_MODE_LIVRAISON[valeur];
  if (!d) return icon('truck', t || 20);
  return `<svg viewBox="0 0 48 48" width="${t || 44}" height="${t || 44}" aria-hidden="true" style="overflow:visible;flex:none"><g fill="${d[0]}" stroke="none">${d[1]}</g><g fill="none" stroke="#002743" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d[2]}</g></svg>`;
}
/** Cartes de choix du mode de livraison (fiche commande admin). */
function cartesModeLivraison(mode, ref) {
  return `<div class="ml-cartes" role="radiogroup" aria-label="Mode de livraison">${MODES_LIVRAISON.map(
    (m) => `
    <button type="button" role="radio" class="ml-carte${mode === m.valeur ? ' choisi' : ''}" aria-checked="${mode === m.valeur}" data-choisir-mode-livraison="${echapper(m.valeur)}" data-ref="${ref}">
      <span class="ml-ill">${illustrationModeLivraison(m.valeur, 54)}</span>
      <b>${echapper(m.label)}</b><small>${echapper(m.aide)}</small>
      <span class="coche-choix-admin" aria-hidden="true">✓</span>
    </button>`,
  ).join('')}</div>`;
}
