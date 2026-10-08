/* Admin CVDL — structures. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/** Explications courtes des 5 types de structure — reflètent les règles réellement appliquées
 *  côté back (exemption devis/facture, qui peut créer des structures partenaires...), pas une
 *  définition métier à part que le code ne suivrait pas. */
function vueInfoTypesStructure() {
  const items = [
    [
      'Relais Numérique',
      'Réseau national',
      'Structure standard : un devis puis une facture sont générés pour chaque commande, avec paiement demandé à la personne accompagnée.',
    ],
    [
      'ESN',
      'Entreprise du numérique solidaire',
      'Structure partenaire : ni devis ni facture ne sont générés, les commandes sont exemptées de paiement.',
    ],
    [
      'Interne',
      'Structure Emmaüs Connect',
      'Ni devis ni facture non plus ; peut en plus créer et gérer ses propres structures partenaires (Vente solidaire).',
    ],
    [
      'Vente solidaire',
      'Structure partenaire',
      "Créée par une structure Interne — rejoint le suivi général sans pouvoir passer commande elle-même comme Relais Numérique/ESN/Interne ; gérée depuis l'espace de la structure Interne qui l'a créée.",
    ],
    [
      'Projets',
      'Structure liée à un projet dédié',
      "Mêmes règles qu'une structure Relais Numérique : devis, facture et paiement s'appliquent normalement.",
    ],
  ];
  return `
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" style="width:min(540px,100%)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
          <div class="dialog-title">Types de structure</div>
          <button type="button" class="btn btn-ghost btn-icon" style="width:32px;height:32px" data-modal-fermer>${icon('x', 16)}</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
          ${items
            .map(
              ([code, titre, desc]) => `
            <div style="display:flex;gap:var(--space-3);align-items:flex-start">
              <span class="tag tag-outline" style="flex:none;margin-top:2px">${echapper(code)}</span>
              <div>
                <div style="font-weight:700;font-size:13.5px">${echapper(titre)}</div>
                <div style="font-size:12.5px;opacity:0.7;margin-top:2px">${echapper(desc)}</div>
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </div>
    </div>`;
}
function vueStructures() {
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="display:flex;align-items:center;gap:8px;font-size:32px;margin-bottom:var(--space-2)">Structures
          <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px" data-info-types-structure title="Qu'est-ce que les différents types de structure signifient ?">${icon('info', 15)}</button>
        </h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Annuaire des organismes partenaires.</p>
      </div>
      <button type="button" class="btn btn-primary" data-ouvrir-creation="structure">${icon('plus', 15)}Nouvelle structure</button>
    </div>
    ${(() => {
      const regions = [...new Set(state.structures.map((x) => x.region).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      );
      return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:var(--space-4)">
        <label for="st-filtre-region" style="font-size:13px;font-weight:600">Région analytique</label>
        <select class="input" id="st-filtre-region" style="width:auto;min-width:220px">
          <option value="">Toutes (${state.structures.length})</option>
          ${regions.map((r) => `<option value="${echapper(r)}" ${state.structuresFiltreRegion === r ? 'selected' : ''}>${echapper(r)} (${state.structures.filter((x) => x.region === r).length})</option>`).join('')}
          <option value="__aucune" ${state.structuresFiltreRegion === '__aucune' ? 'selected' : ''}>Non rattachées (${state.structures.filter((x) => !x.region).length})</option>
        </select>
      </div>`;
    })()}
    <div class="card elev-sm" style="padding:0;overflow:hidden">
      ${
        state.structures
          .filter(
            (s) =>
              !state.structuresFiltreRegion ||
              (state.structuresFiltreRegion === '__aucune' ? !s.region : s.region === state.structuresFiltreRegion),
          )
          .map((s) => {
            const type = typeStructure(s);
            const c = TYPE_COLORS[type];
            const revealed = !!state.revealedCodes[s.id];
            return `
        <div class="st-ligne" style="display:grid;grid-template-columns:38px minmax(240px, 2.2fr) 140px minmax(0, 1fr) auto;align-items:center;gap:var(--space-4);padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-divider);min-width:0;cursor:pointer;min-height:70px" data-structure-vue="${s.id}" role="button" tabindex="0" aria-label="Ouvrir la fiche 360 de ${echapper(s.nom)}">
          <span style="width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:${c.bg};color:${c.fg}">${icon('building', 18)}</span>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-width:0;min-height:38px">
            <span style="font-weight:700;font-size:14px;line-height:1.3;overflow-wrap:anywhere" title="${echapper(s.nom)}">${echapper(s.nom)}</span>
            ${typeAChoisir(s) ? '<span class="tag" data-forme="losange" style="flex:none">Type à définir</span>' : `<span class="tag tag-outline" style="flex:none">${echapper(type)}</span>`}
            ${
              s.depotVente
                ? `<button type="button" class="dv-tag" data-flotte-structure="${echapper(s.code)}" title="Gérer la flotte en dépôt-vente">${icon('package', 13)}Dépôt-vente${(() => {
                    const d = etatDepotVente(s.code);
                    return d ? ` · ${d.enStock}` : '';
                  })()}</button>`
                : ''
            }
          </div>
          <div style="min-width:0">${s.region ? `<span class="tag" title="Région analytique" style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${echapper(s.region)}</span>` : '<span style="font-size:12px;opacity:.45">Sans région</span>'}</div>
          <div style="min-width:0;font-size:13px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(s.email || '')}</div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--color-neutral-100);padding:6px 10px;border-radius:var(--radius-md)">
            <span style="font-family:ui-monospace,monospace;font-size:13px">${revealed ? echapper(s.code) : '••••••••••'}</span>
            <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px;flex:none" data-reveal-code="${s.id}" aria-label="${revealed ? 'Masquer' : 'Afficher'} le code">${icon(revealed ? 'eyeoff' : 'eye', 15)}</button>
            <button type="button" class="btn btn-ghost btn-icon" style="width:26px;height:26px;flex:none" data-structure-modifier="${s.id}" aria-label="Modifier ${echapper(s.nom)}">${icon('gear', 15)}</button>
          </div>
        </div>`;
          })
          .join('') || '<p style="opacity:0.5;font-size:13px;padding:var(--space-6)">Aucune structure.</p>'
      }
    </div>`;
}

/* ============================================================
   Modale de détail (commande / SAV)
   ============================================================ */
/** Statut de garantie à 3 paliers, calculé côté serveur à partir de la date d'achat/livraison
 *  — même logique que passeport-materiel (routes/commandes.js), dupliquée ici plutôt que
 *  partagée entre les deux fichiers (pas de module commun pour ce genre de petit calcul dans
 *  ce projet). en_cours (< 1 an), bientot (entre 1 et 2 ans), expiree (> 2 ans). */
function statutGarantiePourDate(dateAchatFormatee) {
  const [j, m, a] = String(dateAchatFormatee || '')
    .split('/')
    .map((n) => parseInt(n, 10));
  if (!j || !m || !a) return { statut: null, dateFinGarantie: '' };
  const dateMiGarantie = new Date(a + 1, m - 1, j);
  const dateFinGarantie = new Date(a + 2, m - 1, j);
  const maintenant = new Date();
  const statut = maintenant >= dateFinGarantie ? 'expiree' : maintenant >= dateMiGarantie ? 'bientot' : 'en_cours';
  return { statut, dateFinGarantie: dateFinGarantie.toLocaleDateString('fr-FR') };
}
// Vert dédié "garantie en cours" / clôture SAV réussie — pas var(--color-accent-2), qui est
// le turquoise déjà réservé aux infos/succès génériques ailleurs dans l'admin (coche
// "Terminée", étapes intermédiaires SAV, etc.) ; ce vert reste propre à ces deux usages précis
// pour rester identifiable au premier coup d'œil.
const COULEUR_VERT_GARANTIE = 'var(--color-vert-garantie)';
function badgeGarantie(dateAchatFormatee) {
  const { statut, dateFinGarantie } = statutGarantiePourDate(dateAchatFormatee);
  if (statut === 'en_cours')
    return `<span class="rp-garantie g-ok" style="display:inline-flex;align-items:center;gap:6px;background:${COULEUR_VERT_GARANTIE};color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('bouclier_garantie', 13)}Garantie en cours (jusqu'au ${echapper(dateFinGarantie)})</span>`;
  if (statut === 'bientot')
    return `<span class="rp-garantie g-att" style="display:inline-flex;align-items:center;gap:6px;background:var(--color-warn-700);color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('bouclier_garantie', 13)}Garantie bientôt expirée (jusqu'au ${echapper(dateFinGarantie)})</span>`;
  if (statut === 'expiree')
    return `<span class="rp-garantie g-ko" style="display:inline-flex;align-items:center;gap:6px;background:var(--th-bg-e5484dff, #E5484D);color:#fff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${icon('x', 13)}Hors garantie (${echapper(dateFinGarantie)})</span>`;
  return '';
}
