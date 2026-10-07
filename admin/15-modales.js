/* Admin CVDL — fenêtres modales. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueModal() {
  const m = state.modal;
  if (m.kind === 'distribution-form') return vueDistributionForm();
  if (m.kind === 'distribution-detail') return vueDistributionDetail();
  if (m.kind === 'creer-structure') return vueCreerStructure();
  if (m.kind === 'flotte-structure') return vueFlotteStructure();
  if (m.kind === 'stock-restreint') return vueStockRestreint();
  if (m.kind === 'mode-stock-bas') return vueModeStockBas();
  if (m.kind === 'factures-mensuelles') return vueFacturesMensuelles();
  if (m.kind === 'creer-commande') return vueCreerCommande();
  if (m.kind === 'creer-produit') return vueCreerProduit();
  if (m.kind === 'creer-devis') return vueCreerDevis();
  if (m.kind === 'creer-facture') return vueCreerFacture();
  if (m.kind === 'reglages-sav') return vueReglagesStatutsSav();
  if (m.kind === 'info-types-structure') return vueInfoTypesStructure();
  if (m.kind === 'migration-types') return vueMigrationTypes();
  if (m.kind === 'structure-360') return vueStructure360();
  if (m.kind === 'coefficients-impact') return vueCoefficientsImpact();
  if (m.kind === 'tectech-resultats') {
    const okCount = m.resultats.filter((r) => r.ok).length;
    return `
      <div class="dialog-backdrop">
        <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px,100%)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
            <div class="dialog-title">Synchronisation tec.tech</div>
            <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
          </div>
          <p style="font-size:13px;opacity:0.7;margin:0">${okCount}/${m.resultats.length} produit(s) synchronisé(s).</p>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto">
            ${m.resultats
              .map(
                (r) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:var(--radius-md);background:${r.ok ? 'var(--color-accent-2-100)' : 'var(--color-accent-100)'}">
                <span style="font-size:13px;font-weight:600">${echapper(r.nom)}</span>
                <span style="font-size:12.5px;color:${r.ok ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)'}">${r.ok ? `${r.ancienStock} → ${r.nouveauStock}` : echapper(r.erreur || 'Erreur')}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>
      </div>`;
  }
  if (m.kind === 'document-genere') {
    const dg = state.documentGenere || {};
    const estDevis = m.type === 'devis';
    const doc = estDevis
      ? state.devis.find((x) => x.referenceDevis === m.ref)
      : state.factures.find((x) => x.referenceFacture === m.ref);
    if (!doc) return '';
    const referenceAffichee = `${estDevis ? 'devis' : 'facture'} ${estDevis ? doc.referenceDevis : doc.referenceFacture}`;
    const sujetParDefaut = `Votre ${referenceAffichee}${doc.referenceCommande ? ` — commande ${doc.referenceCommande}` : ''} — Emmaüs Connect`;
    const texteParDefaut = `Bonjour,\n\nVeuillez trouver votre ${referenceAffichee} en pièce jointe.\n\nCordialement,\nEmmaüs Connect`;
    return `
      <div class="dialog-backdrop">
        <div class="dialog" role="dialog" aria-modal="true" style="width:min(480px,100%)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
            <div class="dialog-title">${estDevis ? echapper(doc.referenceDevis) : echapper(doc.referenceFacture)}</div>
            <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
          </div>
          <div style="font-size:13px;opacity:0.7">${echapper(doc.nomStructure)} · ${echapper(formaterMontant(doc.montantTotal))}</div>
          ${doc.dateEnvoiEmail ? `<div style="font-size:12px;opacity:0.55;display:flex;align-items:center;gap:6px">${icon('mail', 12)}Envoyé à ${echapper(doc.destinataireEnvoiEmail)} le ${echapper(doc.dateEnvoiEmail)}</div>` : ''}
          ${dg.erreur ? `<div class="msg msg-erreur">${echapper(dg.erreur)}</div>` : ''}
          ${
            dg.url
              ? `
            <div class="card elev-sm" style="padding:var(--space-4);gap:10px;background:var(--color-accent-2-100)">
              <button type="button" class="btn btn-secondary" style="width:fit-content" data-ouvrir-doc-genere="${echapper(dg.url)}">${icon('lien_externe', 14)}Ouvrir le document</button>
            </div>
            ${
              dg.envoiOk
                ? `<div class="msg msg-succes">Email envoyé.</div>`
                : !dg.envoiOuvert
                  ? `
              <button type="button" class="btn btn-ghost" style="width:fit-content;margin-top:var(--space-2)" data-toggle-envoi-doc>${icon('mail', 14)}Envoyer par email <span style="opacity:0.5;font-weight:400">— facultatif</span></button>
            `
                  : `
              <div style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:8px">
                <div class="field"><label>Destinataire</label><input class="input" id="dg-email" type="email" value="${echapper(dg.email != null ? dg.email : doc.email || '')}"></div>
                <div class="field"><label>Objet</label><input class="input" id="dg-sujet" value="${echapper(dg.sujet != null ? dg.sujet : sujetParDefaut)}"></div>
                <div class="field"><label>Message</label><textarea class="input" id="dg-texte" rows="5">${echapper(dg.texte != null ? dg.texte : texteParDefaut)}</textarea></div>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <button type="button" class="btn btn-ghost" data-toggle-envoi-doc>Annuler</button>
                  <button type="button" class="btn btn-primary" style="flex:1" data-doc-envoyer ${dg.envoiChargement ? 'disabled' : ''}>${dg.envoiChargement ? 'Envoi…' : 'Envoyer'}</button>
                </div>
              </div>
            `
            }
          `
              : `<button type="button" class="btn btn-primary btn-block" style="margin-top:var(--space-3)" data-doc-generer ${dg.chargement ? 'disabled' : ''}>${dg.chargement ? 'Génération…' : 'Générer le document'}</button>`
          }
          ${estDevis && !doc.referenceCommande && doc.statut !== 'Annulé' ? `<div style="margin-top:var(--space-3)"><button type="button" class="btn btn-secondary btn-block" data-generer-commande-depuis-devis="${doc.ligne}">${icon('plus', 14)}Générer la commande liée</button></div>` : ''}
          ${
            doc.statut === 'Annulé'
              ? `<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-divider);font-size:12.5px;opacity:0.7;display:flex;align-items:center;gap:6px">${iconeAnnuler(15)} Annulé — motif : ${echapper(doc.motifAnnulation || '—')}</div>`
              : `<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-divider)"><button type="button" class="btn btn-ghost" style="color:var(--color-accent-700)" data-annuler-${estDevis ? 'devis' : 'facture'}="${doc.ligne}" data-ref-${estDevis ? 'devis' : 'facture'}="${echapper(estDevis ? doc.referenceDevis : doc.referenceFacture)}">${iconeAnnuler(18)}Annuler ${estDevis ? 'ce devis' : 'cette facture'}</button></div>`
          }
        </div>
      </div>`;
  }
  if (m.kind === 'modele-bon') return vueModeleBon();
  if (m.kind === 'modele-doc') return vueModeleDoc();
  if (m.kind === 'modele-attestation') return vueModeleAttestation();
  if (m.kind === 'rapprochement') return vueRapprochement();
  if (m.kind === 'rattacher-devis') return vueRattacherDevis();
  if (m.kind === 'organiser-materiel') return vueOrganiserMateriel();
  if (m.kind === 'kpi-listing') return vueKpiListing(m.quoi);
  if (m.kind === 'creer-sav') return vueCreerSav();
  if (m.kind === 'a-livrer') return vueALivrer(m.produit);
  if (m.kind === 'commande') {
    const c = state.commandes.find((x) => x.reference === m.ref);
    if (!c) return '';
    return vueDossierCommande(c);
  }
  if (m.kind === 'sav') {
    const s = state.sav.find((x) => x.reference === m.ref);
    if (!s) return '';
    return vueDossierSav(s);
  }
  return '';
}

/**
 * Panneau donateur / reconditionneur d'origine (tec.tech), chargé à la demande (bouton) :
 * pas d'appel tec.tech à chaque ouverture de ticket.
 */
function blocOrigineTecTech(s) {
  const etatOrigine = state.tectechOrigine[s.reference];
  if (!etatOrigine) {
    return `<button type="button" class="btn btn-secondary" style="width:fit-content" data-charger-origine-tectech="${echapper(s.reference)}" data-ns="${echapper(s.numeroSerie)}">${icon('refresh', 14)}Voir l'origine (tec.tech)</button>`;
  }
  if (etatOrigine === 'chargement') {
    return `<div style="font-size:13px;opacity:0.6">Recherche chez tec.tech…</div>`;
  }
  if (!etatOrigine.ok) {
    return `<div class="card elev-sm" style="padding:var(--space-3) var(--space-4);background:var(--color-accent-100);color:var(--color-accent-700);font-size:12.5px">${echapper(etatOrigine.erreur || 'Origine introuvable.')}</div>`;
  }
  return `<div class="card elev-sm" style="padding:var(--space-4);gap:6px;background:var(--color-neutral-100)">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;font-weight:700">Origine (tec.tech)</div>
    ${etatOrigine.marque || etatOrigine.modele ? `<div style="font-size:13px"><strong>Marque et modèle</strong> · ${echapper([etatOrigine.marque, etatOrigine.modele].filter(Boolean).join(' '))}</div>` : ''}
    <div style="font-size:13px"><strong>Reconditionneur</strong> · ${etatOrigine.reconditionneur ? echapper(etatOrigine.reconditionneur) : '—'}</div>
    <div style="font-size:13px"><strong>Donateur</strong> · ${etatOrigine.donateur ? echapper(etatOrigine.donateur) : '—'}${etatOrigine.structureDonatrice ? ` (${echapper(etatOrigine.structureDonatrice)})` : ''}</div>
  </div>`;
}
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-charger-origine-tectech]');
  if (!btn) return;
  const ref = btn.dataset.chargerOrigineTectech;
  const numeroSerie = btn.dataset.ns;
  state.tectechOrigine[ref] = 'chargement';
  render();
  try {
    const r = await poster({ action: 'sav-origine-tectech', numeroSerie });
    state.tectechOrigine[ref] = r;
  } catch (err) {
    state.tectechOrigine[ref] = { ok: false, erreur: 'Connexion impossible.' };
  }
  render();
});

/* ============================================================
   Panneau "étape suivante" de la commande — mêmes conditions
   bloquantes que conditionBloquanteEtapeSuivante() côté back.
   ============================================================ */
/** Devis & Paiement — étape à part, sous le déroulé des statuts de livraison, pour les
 *  structures RN/Projets (Interne/BO/ESN n'ont ni devis ni facture). Le devis reste généré
 *  depuis l'étape "Validée" (il conditionne le passage à "Préparée"), cette section n'en
 *  affiche que le statut ; la facture, elle, n'est bloquante nulle part, donc entièrement
 *  gérée ici, disponible dès que la commande existe. */
/** Noms des bénéficiaires associés à une commande, dans l'ordre — pour étiqueter chaque lien
 *  de paiement séparé avec le bon nom (même format pipe "nom|genre|produit|série" que le
 *  suivi public, ou "nom — date" tant que l'association n'a pas encore réécrit la ligne). */
/** Reconstruit, dans l'ordre des lignes de la commande (c.lignes), quelle unité de quel produit
 *  correspond à quel bénéficiaire — utilisé pour BO uniquement (seule structure à nommer un
 *  bénéficiaire par unité). Un produit peut avoir besoin de l'un sans l'autre (une recharge
 *  demande un code mais jamais de nom ; un atelier l'inverse) : on ne suppose donc jamais que
 *  la liste des personnes et celle des numéros de série avancent au même rythme — chacune
 *  n'avance que pour les produits qui la concernent (sansPersonne / sansNumeroSerie).
 *  Sans ça, avec une commande mélangeant par exemple ordinateurs (série + nom) et recharges
 *  (code, pas de nom), rien n'indiquait quel numéro de série revenait à quel bénéficiaire. */
function unitesSeriePersonnes(c) {
  const lignesPersonnes = String(c.personnes || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  let idxPersonne = 0;
  const unites = [];
  (c.lignes || []).forEach((l) => {
    const p = state.produits.find((x) => x.nom === l.produit) || {};
    const qte = parseInt(l.quantite, 10) || 0;
    for (let i = 0; i < qte; i++) {
      let nom = null,
        dateNaissance = '';
      if (!p.sansPersonne) {
        const ligneBrute = lignesPersonnes[idxPersonne++] || '';
        const separateur = ligneBrute.includes('|') ? '|' : ligneBrute.includes(' — ') ? ' — ' : null;
        nom = (separateur ? ligneBrute.split(separateur)[0] : ligneBrute).trim() || null;
        dateNaissance = separateur ? (ligneBrute.split(separateur)[1] || '').trim() : '';
      }
      if (!p.sansNumeroSerie) unites.push({ produit: l.produit, nom, dateNaissance, dematerialise: !!p.dematerialise });
    }
  });
  return unites;
}
/** Appareils de la commande avec leur numéro de série (ou code) et la personne associée,
 *  dans l'ordre de saisie de la préparation — affiché dans la fiche commande. */
function blocAppareilsCommande(c, titre = true) {
  const valeurs = String(c.numerosSerie || '')
    .split('\n')
    .map((x) => x.trim());
  const unites = unitesSeriePersonnes(c);
  if (!unites.length && !valeurs.some(Boolean)) return '';
  const saisis = valeurs.filter(Boolean).length;
  const lignes = unites.map((u, i) => ({ ...u, valeur: valeurs[i] || '' }));
  valeurs
    .slice(unites.length)
    .filter(Boolean)
    .forEach((v) => lignes.push({ produit: '', nom: null, dematerialise: !!c.dematerialisee, valeur: v }));
  const libelle = c.dematerialisee ? 'Codes' : 'Numéros de série';
  return `<section class="fc2-bloc fc2-appareils">
    ${titre ? `<div class="fc2-k">${libelle} · ${saisis} / ${Math.max(unites.length, saisis)}</div>` : ''}
    <div class="fc2-app-liste">${lignes
      .map((l) => {
        const p = state.produits.find((x) => x.nom === l.produit);
        return `<div class="fc2-app"><span class="rpd-ill">${l.produit ? illustrationProduitAdmin(l.produit, p ? p.icone : '', 28) : ''}</span>
        <span class="fc2-app-t"><b title="${echapper(l.produit || '')}">${echapper(l.produit || 'Appareil')}</b>${l.nom ? `<small>${icon('personne', 12)}${echapper(c.identiteMasquee ? nomPersonneAdmin('commande', c.ligne, l.nom) : l.nom)}</small>` : ''}</span>
        <span class="fc2-app-v">${l.valeur ? (l.dematerialise ? pilulesCodes(l.valeur) : pilulesNumerosSerie(l.valeur)) : `<em>${l.dematerialise ? 'Code' : 'N° de série'} à saisir</em>`}</span></div>`;
      })
      .join('')}</div>
  </section>`;
}
function nomsPersonnesCommande(c) {
  return String(c.personnes || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((ligne) => {
      const separateur = ligne.includes('|') ? '|' : ligne.includes('—') ? '—' : null;
      return separateur ? ligne.split(separateur)[0].trim() : ligne;
    });
}
/** Vrai si cette structure n'a jamais ni devis ni facture (Interne/ESN/BO) — même règle que le
 *  back (commande-devis-direct, commande-facturer-direct), à appliquer partout où l'admin choisit
 *  une commande à facturer ou à devis, pour ne jamais lister une commande que le back refusera
 *  de toute façon. */
function structureExclueDevisFacture(c) {
  const structure = state.structures.find((s) => s.code === c.code);
  // Dépôt-vente : mise en dépôt, jamais facturée à la commande (seules les ventes peuvent l'être).
  return !!(structure && (structure.interne || structure.esn || structure.bo || structure.depotVente));
}
