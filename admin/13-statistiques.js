/* Admin CVDL — statistiques. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueBilan() {
  const anneeCourante = new Date().getFullYear();
  // Les années proposées viennent des dates réellement présentes dans les commandes, plus
  // l'année en cours et la suivante systématiquement (pour pouvoir préparer l'année prochaine
  // même avant d'y avoir la moindre commande).
  const anneesDispo = new Set([anneeCourante, anneeCourante + 1]);
  state.commandes.forEach((c) => {
    const iso = dateVersISO(c.date);
    if (iso) anneesDispo.add(new Date(iso).getFullYear());
  });
  const anneeSelectionnee = state.bilanAnnee || anneeCourante;
  anneesDispo.add(anneeSelectionnee);
  const listeAnnees = [...anneesDispo].sort((a, b) => b - a);

  const actives = state.commandes.filter((c) => {
    if (c.statutCommande === 'Annulée') return false;
    const iso = dateVersISO(c.date);
    return iso && new Date(iso).getFullYear() === anneeSelectionnee && commandeDansFiltresStats(c);
  });
  const fs = state.statsFiltres;
  const facturesAnnee = state.factures.filter((f) => {
    const iso = dateVersISO(f.date);
    if (!(iso && new Date(iso).getFullYear() === anneeSelectionnee)) return false;
    if (!fs.region && !fs.type && !fs.departement) return true;
    const st = state.structures.find((x) => x.nom === f.nomStructure);
    return (
      !!st &&
      (!fs.region || st.region === fs.region) &&
      (!fs.type || (st.type || 'standard') === fs.type) &&
      (!fs.departement || departementDeAdresse(st.adresse) === fs.departement)
    );
  });

  // Produits les plus distribués
  const parProduit = {};
  actives.forEach((c) =>
    (c.lignes || []).forEach((l) => {
      parProduit[l.produit] = (parProduit[l.produit] || 0) + (parseInt(l.quantite, 10) || 0);
    }),
  );
  const topProduits = Object.keys(parProduit)
    .map((nom) => ({ label: nom, valeur: parProduit[nom] }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 8);

  // Structures qui commandent le plus
  const parStructureCmd = {};
  actives.forEach((c) => {
    parStructureCmd[c.nom] = (parStructureCmd[c.nom] || 0) + 1;
  });
  const topStructuresCmd = Object.keys(parStructureCmd)
    .map((nom) => ({ label: nom, valeur: parStructureCmd[nom] }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 8);

  // Argent rapporté par structure (sur les factures)
  const parStructureMontant = {};
  facturesAnnee.forEach((f) => {
    parStructureMontant[f.nomStructure] =
      (parStructureMontant[f.nomStructure] || 0) + (parseFloat(f.montantTotal) || 0);
  });
  const topStructuresMontant = Object.keys(parStructureMontant)
    .map((nom) => ({ label: nom, valeur: parStructureMontant[nom] }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 8);
  const totalFacture = facturesAnnee.reduce((s, f) => s + (parseFloat(f.montantTotal) || 0), 0);

  // Répartition des commandes par catégorie de structure (Collège/Université, École, etc.)
  const parCategorie = {};
  actives.forEach((c) => {
    const structure = state.structures.find((s) => s.nom === c.nom);
    const cat = (structure && structure.categorie) || 'Non renseignée';
    parCategorie[cat] = (parCategorie[cat] || 0) + 1;
  });
  const topCategories = Object.keys(parCategorie)
    .map((nom) => ({ label: nom, valeur: parCategorie[nom] }))
    .sort((a, b) => b.valeur - a.valeur);

  // Répartition des commandes sur l'année sélectionnée
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const parMois = new Array(12).fill(0);
  actives.forEach((c) => {
    const iso = dateVersISO(c.date);
    if (!iso) return;
    parMois[new Date(iso).getMonth()]++;
  });
  const maxMois = Math.max(1, ...parMois);

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Statistiques</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Vue d'ensemble de l'activité, calculée sur les commandes et factures chargées.</p>
      </div>
      <select class="input" id="bilan-annee" style="width:auto;flex:none">
        ${listeAnnees.map((a) => `<option value="${a}" ${a === anneeSelectionnee ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div>
    ${barreFiltresStats()}
    ${state.statsFiltres.programme && state.statsFiltres.programme !== '__hors' ? sectionProgrammesStats() : ''}

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${actives.length}</div>
        <div style="font-size:12.5px;opacity:0.6">commandes (hors annulées)</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${Object.keys(parStructureCmd).length}</div>
        <div style="font-size:12.5px;opacity:0.6">structures actives</div>
      </div>
      <div class="card elev-sm rp-stat-kpi" style="padding:var(--space-6);gap:6px">
        <div style="font-family:var(--font-heading);font-size:28px">${formaterMontant(totalFacture)}</div>
        <div style="font-size:12.5px;opacity:0.6">facturé au total</div>
      </div>
    </div>

    <div class="card elev-sm" style="padding:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Commandes par mois — ${anneeSelectionnee}</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px">
        ${parMois
          .map(
            (n, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">
            <span style="font-size:11px;opacity:0.6">${n || ''}</span>
            <div class="rp-histo-barre" style="width:100%;border-radius:6px 6px 0 0;background:var(--color-accent-2);height:${Math.max(2, Math.round((n / maxMois) * 100))}%"></div>
            <span style="font-size:11px;opacity:0.5">${MOIS[i]}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Produits les plus distribués</div>
        ${anneauUnique(topProduits)}
      </div>
      <div class="card elev-sm" style="padding:var(--space-6)">
        <div class="card-title" style="margin-bottom:var(--space-4)">Structures qui commandent le plus</div>
        ${anneauUnique(topStructuresCmd)}
      </div>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6);margin-bottom:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Répartition des commandes par catégorie de structure</div>
      ${anneauUnique(topCategories)}
    </div>
    <div class="card elev-sm" style="padding:var(--space-6)">
      <div class="card-title" style="margin-bottom:var(--space-4)">Argent rapporté par structure</div>
      ${barreClassement(topStructuresMontant, formaterMontant)}
    </div>
    ${state.statsFiltres.programme && state.statsFiltres.programme !== '__hors' ? '' : sectionProgrammesStats()}`;
}

/* ============================================================
   Structures
   ============================================================ */
