/* Admin CVDL — passeport matériel. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
function vuePasseportMateriel() {
  const r = state.passeportResultat;
  return `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:32px;margin-bottom:var(--space-2)">Passeport matériel</h1>
      <p style="opacity:0.65;margin:0;font-size:15px">Retrouver le parcours complet d'un appareil par son numéro de série — accès complet, toutes structures.</p>
    </div>
    <div class="card elev-sm" style="padding:var(--space-6);gap:var(--space-4);margin-bottom:var(--space-6)">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input class="input" id="pm-numero-serie" style="flex:1;min-width:220px" placeholder="Numéro de série" value="${echapper(state.passeportRecherche)}">
        <button type="button" class="btn btn-primary" id="pm-rechercher">${icon('search', 15)}Rechercher</button>
      </div>
    </div>
    ${state.passeportChargement ? `<p style="opacity:0.6;font-size:13px">Recherche…</p>` : ''}
    ${r && !r.ok ? `<div class="card elev-sm" style="padding:var(--space-4) var(--space-5);background:var(--color-accent-100);color:var(--color-accent-700);font-size:13.5px">${echapper(r.erreur || 'Numéro de série introuvable.')}</div>` : ''}
    ${
      r && r.ok
        ? (() => {
            // une seule carte pour tout, comme passeport.html
            const infosCompletes = r.reconditionneurOriginal !== undefined || !!r.tectech;
            const lignes = [
              !r.sourceTecTechUniquement ? ['N° de commande', echapper(r.referenceCommande), true] : null,
              r.structure ? ['Remis par', echapper(r.structure)] : null,
              r.dateLivraison ? ['Livré le', echapper(r.dateLivraison)] : null,
              r.nomPersonne ? ['Utilisé par', echapper(r.nomPersonne)] : null,
              [
                'Marque et modèle',
                ([r.marqueTecTech, r.modeleTecTech].filter(Boolean).map(echapper).join(' ') || '—') +
                  ' <span style="opacity:0.5;font-weight:400">(tec.tech)</span>',
              ],
              ["Système d'exploitation", r.systemeTecTech ? echapper(r.systemeTecTech) : '—'],
              r.typeMateriel
                ? [
                    'Type de matériel',
                    echapper(r.typeMateriel) + (r.categorieMateriel ? ` · ${echapper(r.categorieMateriel)}` : ''),
                  ]
                : null,
              r.statutAppareil ? ['Statut', echapper(r.statutAppareil)] : null,
              r.statutTecTech ? ['Statut tec.tech', echapper(r.statutTecTech)] : null,
              infosCompletes
                ? [
                    'Reconditionneur',
                    r.tectech && r.tectech.reconditionneur
                      ? echapper(r.tectech.reconditionneur)
                      : r.reconditionneurOriginal
                        ? echapper(r.reconditionneurOriginal)
                        : '—',
                  ]
                : null,
              infosCompletes
                ? [
                    'Donateur',
                    r.tectech && r.tectech.donateur
                      ? echapper(r.tectech.donateur) +
                        (r.tectech.structureDonatrice ? ` (${echapper(r.tectech.structureDonatrice)})` : '')
                      : '—',
                  ]
                : null,
            ].filter(Boolean);
            if (estUnifie()) return passeportUnifie(r, lignes);
            return `
      <div class="card elev-sm" style="padding:var(--space-6);gap:var(--space-4)">
        ${r.sourceTecTechUniquement ? `<div style="padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-warn-100);color:var(--color-warn-800);font-size:13px">Aucune commande CVDL associée à cet appareil — informations issues uniquement de tec.tech.</div>` : ''}
        <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap">
          <span style="width:52px;height:52px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon('passeport', 24)}</span>
          <div style="flex:1;min-width:180px">
            <div class="card-title" style="font-size:19px">${echapper(r.caracteristiques || r.numeroSerie)}</div>
          </div>
          ${badgeGarantie(r.dateLivraison)}
          ${!r.sourceTecTechUniquement ? `<a href="passeport.html?sn=${encodeURIComponent(r.numeroSerie)}&admin=1" target="_blank" class="btn btn-secondary">${icon('lien_externe', 14)}Passeport public</a>` : ''}
        </div>
        <div style="display:grid;gap:0;padding-top:var(--space-3);border-top:1px solid var(--color-divider)">
          ${lignes
            .map(
              ([cle, valeur]) => `
            <div class="rp-ligne-info">
              <span class="cle">${cle}</span>
              <span class="valeur">${valeur}</span>
            </div>`,
            )
            .join('')}
        </div>

        ${
          r.ticketsSav && r.ticketsSav.length
            ? `
        <div style="padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:var(--space-3)">Tickets SAV (${r.ticketsSav.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${r.ticketsSav
              .map(
                (t) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-md);background:var(--color-neutral-100);cursor:pointer" data-sav-ouvrir="${echapper(t.reference)}">
                <span style="font-size:12.5px;font-weight:700">${echapper(t.reference)}</span>
                <span style="font-size:12px;opacity:0.6;flex:1">${echapper(t.date)}${t.reconditionneur ? ` · ${echapper(t.reconditionneur)}` : ''}</span>
                <span class="tag tag-neutral">${echapper(t.statut)}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>`
            : ''
        }

        ${
          !r.sourceTecTechUniquement && r.historique && r.historique.length
            ? `
        <div style="padding-top:var(--space-4);border-top:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:var(--space-3)">Historique de l'appareil</div>
          <div style="display:grid;gap:var(--space-3)">
            ${r.historique
              .map(
                (h) => `
              <div class="rp-ligne-historique">
                <span class="icone" style="background:var(--color-accent-2-100);color:var(--color-accent-2-700)">${icon('check', 16)}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:700">${echapper(h.label)}</div>
                </div>
                <span style="font-size:12px;opacity:0.5;flex:none">${echapper(h.date)}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>`
            : ''
        }
      </div>`;
          })()
        : ''
    }`;
}
/** Passeport matériel, style unifié — même composition que passeport.html (en-tête illustré,
 *  caractéristiques + historique côte à côte), plus les tickets SAV propres à l'admin. */
function passeportUnifie(r, lignes) {
  const histo = !r.sourceTecTechUniquement && r.historique ? r.historique : [];
  const tickets = r.ticketsSav || [];
  return `
    ${r.sourceTecTechUniquement ? `<div class="msg msg-info" style="margin-bottom:14px">Aucune commande CVDL associée : informations issues de tec.tech uniquement.</div>` : ''}
    <div class="card pp-hero">
      ${window.illustrationCvdl && window.cleIllustrationProduit ? `<span class="pp-appareil" aria-hidden="true">${window.illustrationCvdl(window.cleIllustrationProduit(r.produit || r.categorieMateriel || r.caracteristiques || '', r.icone), 96)}</span>` : '<span data-ill="flotte" class="ill xxl"></span>'}
      <div class="pp-id">
        <div class="rp-surtitre">Passeport de l'appareil${r.produit ? ` · ${echapper(r.produit)}` : ''}</div>
        <h2 class="pp-nom">${echapper(r.caracteristiques || r.numeroSerie)}</h2>
        <div class="pp-pastilles">
          <span class="pk-sn">${echapper(r.numeroSerie)}</span>
          ${badgeGarantie(r.dateLivraison)}
          ${r.statutAppareil ? `<span class="tag">${echapper(r.statutAppareil)}</span>` : ''}
        </div>
      </div>
      ${!r.sourceTecTechUniquement ? `<a href="passeport.html?sn=${encodeURIComponent(r.numeroSerie)}&admin=1" target="_blank" class="btn btn-secondary">${icon('lien_externe', 14)}Page publique</a>` : ''}
    </div>
    <div class="pp-grille${histo.length || tickets.length ? '' : ' seule'}">
      <div class="card pp-bloc">
        <div class="rp-surtitre">Caractéristiques</div>
        <div class="pp-lignes">${lignes.map(([cle, valeur]) => `<div class="rp-ligne-info"><span class="cle">${cle}</span><span class="valeur">${valeur}</span></div>`).join('')}</div>
      </div>
      ${
        histo.length || tickets.length
          ? `<div class="pp-colonne">
        ${
          histo.length
            ? `<div class="card pp-bloc">
          <div class="rp-surtitre">Historique</div>
          <ol class="pp-frise">${histo.map((h, k) => `<li class="${k === histo.length - 1 ? 'dernier' : ''}"><i></i><span>${echapper(h.label)}</span><small>${echapper(h.date)}</small></li>`).join('')}</ol>
        </div>`
            : ''
        }
        ${
          tickets.length
            ? `<div class="card pp-bloc">
          <div class="rp-surtitre">Tickets SAV · ${tickets.length}</div>
          ${tickets.map((t) => `<div class="pp-ticket" data-sav-ouvrir="${echapper(t.reference)}" role="button" tabindex="0"><b>${echapper(t.reference)}</b><small>${echapper(t.date)}${t.reconditionneur ? ` · ${echapper(t.reconditionneur)}` : ''}</small><span class="tag">${echapper(t.statut)}</span></div>`).join('')}
        </div>`
            : ''
        }
      </div>`
          : ''
      }
    </div>`;
}
async function rechercherPasseportMateriel(snImpose, sansHistorique) {
  const numeroSerie = String(
    snImpose != null ? snImpose : $('pm-numero-serie') ? $('pm-numero-serie').value : '',
  ).trim();
  state.passeportRecherche = numeroSerie;
  if (!sansHistorique)
    history.replaceState(
      { onglet: 'passeport' },
      '',
      '#passeport' + (numeroSerie ? '?sn=' + encodeURIComponent(numeroSerie) : ''),
    );
  if (!numeroSerie) {
    state.passeportResultat = { ok: false, erreur: 'Saisis un numéro de série.' };
    render();
    return;
  }
  state.passeportChargement = true;
  state.passeportResultat = null;
  render();
  try {
    state.passeportResultat = await poster({ action: 'passeport-materiel', numeroSerie });
  } catch (e) {
    state.passeportResultat = { ok: false, erreur: 'Connexion impossible — réessaie.' };
  }
  state.passeportChargement = false;
  render();
  const champ = $('pm-numero-serie');
  if (champ) {
    champ.focus();
    champ.setSelectionRange(numeroSerie.length, numeroSerie.length);
  }
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#pm-rechercher')) rechercherPasseportMateriel();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'pm-numero-serie') rechercherPasseportMateriel();
});
