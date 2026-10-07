/* Admin CVDL — stock. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vueStock() {
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:32px;margin-bottom:var(--space-2)">Stock</h1>
        <p style="opacity:0.65;margin:0;font-size:15px">Matériel reconditionné disponible.</p>
      </div>
      <button type="button" class="btn btn-primary" data-ouvrir-creation="produit">${icon('plus', 15)}Ajouter un produit</button>
    </div>
    <div class="stk-outils" role="toolbar" aria-label="Outils du stock">
      <button type="button" class="btn msb-bouton${msbActif() ? ' actif' : ''}" data-mode-stock-bas title="Limiter toutes les commandes des structures">${icon('alert', 15)}${msbActif() ? 'Mode stock bas · actif' : 'Mode stock bas'}</button>
      <span class="stk-sep" aria-hidden="true"></span>
      <button type="button" class="btn btn-secondary" id="btn-synchroniser-tectech" title="Mettre à jour les quantités depuis tec.tech">${icon('refresh', 15)}Synchroniser tec.tech</button>
      <button type="button" class="btn btn-secondary" data-organiser-materiel title="Ordre et couleurs de la page « Catégories de matériel » du portail">${icon('grip', 15)}Organiser le catalogue</button>
    </div>
    ${bandeauModeStockBas()}
    ${sectionDepotVenteStock()}
    ${(state.depotVente || []).length ? '<h2 class="dv-titre-catalogue">Catalogue</h2>' : ''}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:var(--space-6)">
      ${
        state.produits.length
          ? state.produits
              .map((p) => {
                const stock = parseInt(p.stock, 10) || 0;
                const faible = stock > 0 && stock < SEUIL_STOCK_FAIBLE;
                const epuise = stock <= 0;
                const tagCls = epuise ? 'tag-accent' : faible ? 'tag-warn' : 'tag-accent-2';
                const tagLabel = epuise ? 'Épuisé' : faible ? 'Stock faible' : 'Disponible';
                return `
        <div class="card elev-sm" style="min-width:0;padding:var(--space-6);gap:var(--space-4);cursor:pointer" data-produit-modifier="${p.ligne}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="width:52px;height:52px;flex:none;display:flex;align-items:center;justify-content:center">${illustrationProduitAdmin(p.nom, p.icone, 50)}</span>
            <span class="tag ${tagCls}">${tagLabel}</span>
          </div>
          <div>
            <div style="font-weight:700;font-size:16px;margin-bottom:6px">${echapper(p.nom)}</div>
          </div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:var(--space-3);padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
            <span style="font-size:13px;opacity:0.7">${stock} en stock</span>
            <span style="font-family:var(--font-heading);font-size:22px">${formaterMontant(p.prixStandard)}</span>
          </div>
        </div>`;
              })
              .join('')
          : '<p style="opacity:0.5;font-size:13px">Aucun produit.</p>'
      }
    </div>`;
}

/* ============================================================
   Statistiques — calculées côté client à partir des données déjà
   chargées (commandes, factures, structures) : pas d'action back
   dédiée pour l'instant, donc portée aux ~500 dernières lignes de
   chaque liste (comme le reste de l'appli).
   ============================================================ */
function barreClassement(lignes, formatValeur) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  return `<div style="display:flex;flex-direction:column;gap:10px">
    ${
      lignes.length
        ? lignes
            .map(
              (l) => `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
          <span style="font-weight:600">${echapper(l.label)}</span>
          <span style="opacity:0.65">${echapper(formatValeur ? formatValeur(l.valeur) : l.valeur)}</span>
        </div>
        <div class="rp-barre-piste" style="height:8px;border-radius:999px;background:var(--color-neutral-200);overflow:hidden">
          <div class="rp-barre-val" style="height:100%;border-radius:999px;width:${Math.max(3, Math.round((l.valeur / max) * 100))}%;background:var(--color-accent-2)"></div>
        </div>
      </div>`,
            )
            .join('')
        : '<p style="opacity:0.5;font-size:13px">Aucune donnée.</p>'
    }
  </div>`;
}
const PALETTE_ANNEAUX = [
  'var(--color-accent-2)',
  'var(--color-accent)',
  'var(--color-bleu)',
  'var(--color-violet)',
  'var(--color-orange)',
  'var(--color-warn-700)',
  'var(--color-vert)',
  'var(--color-neutral-500)',
];
/** Anneau unique segmenté — répartition de tous les éléments dans un seul donut (plutôt qu'un
 *  anneau par ligne), avec légende à côté. */
function anneauUnique(lignes, formatValeur, taille) {
  taille = taille || 180;
  const total = lignes.reduce((s, l) => s + l.valeur, 0) || 1;
  // conic-gradient plutôt que des arcs SVG : la dernière étape est forcée à 100 %, sans trou
  // d'arrondi entre segments
  let cumulPct = 0;
  const stops = lignes
    .map((l, i) => {
      const debut = cumulPct;
      cumulPct += (l.valeur / total) * 100;
      const fin = i === lignes.length - 1 ? 100 : cumulPct;
      return `${PALETTE_ANNEAUX[i % PALETTE_ANNEAUX.length]} ${debut}% ${fin}%`;
    })
    .join(', ');
  const epaisseur = 16;
  const fond = lignes.length ? `conic-gradient(${stops})` : 'var(--color-neutral-200)';
  return `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <div class="rp-anneau" style="position:relative;width:${taille}px;height:${taille}px;flex:none;border-radius:50%;background:${fond}">
        <div class="rp-anneau-trou" style="position:absolute;inset:${epaisseur}px;border-radius:50%;background:var(--color-surface);display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-family:var(--font-heading);font-size:26px;color:var(--color-text);line-height:1">${total}</span>
          <span style="font-size:11px;color:var(--color-text);opacity:0.55">total</span>
        </div>
      </div>
      <div style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:8px">
        ${
          lignes.length
            ? lignes
                .map(
                  (l, i) => `
          <div style="display:flex;align-items:center;gap:8px">
            <span class="rp-leg-pt" style="width:10px;height:10px;border-radius:999px;flex:none;background:${PALETTE_ANNEAUX[i % PALETTE_ANNEAUX.length]}"></span>
            <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${echapper(l.label)}</span>
            <span style="font-size:11.5px;opacity:0.6;flex:none">${echapper(formatValeur ? formatValeur(l.valeur) : l.valeur)} · ${Math.round((l.valeur / total) * 100)}%</span>
          </div>`,
                )
                .join('')
            : '<p style="opacity:0.5;font-size:13px">Aucune donnée.</p>'
        }
      </div>
    </div>`;
}
/* ============================================================
   Réglages
   ============================================================ */
function urlPortailPublic() {
  // Résolution relative "comme un vrai lien" (même algorithme que suivrait un <a href="portail.html">
  // cliqué depuis cette page) — fonctionne quel que soit l'hébergement, y compris avec une URL
  // sans extension, un sous-dossier, ou un slash de fin.
  return new URL('portail.html', location.href).href;
}
async function copierTexte(texte, libelleSucces) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texte);
      etat(libelleSucces || 'Copié dans le presse-papier', 'succes');
      return;
    }
    throw new Error('contexte non sécurisé');
  } catch (e) {
    try {
      const zone = document.createElement('textarea');
      zone.value = texte;
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.focus();
      zone.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(zone);
      if (ok) {
        etat(libelleSucces || 'Copié dans le presse-papier', 'succes');
        return;
      }
    } catch (e2) {
      /* tombe dans le message d'erreur ci-dessous */
    }
    etat(`Copie impossible — voici le texte : ${texte}`, 'erreur');
  }
}
async function copierLienPortail() {
  await copierTexte(urlPortailPublic(), 'Lien copié dans le presse-papier');
}
