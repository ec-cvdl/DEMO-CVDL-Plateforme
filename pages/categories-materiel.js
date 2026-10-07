const SILHOUETTES = {
  portable:
    '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="6" width="24" height="15" rx="1.5"/><path d="M2 27h30l-2.5-4H4.5Z"/></svg>',
  telephone:
    '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="3" width="14" height="28" rx="3"/><path d="M15.5 27h3"/></svg>',
  tablette:
    '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="22" height="26" rx="2.5"/><path d="M15 27h4"/></svg>',
  recharge:
    '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3 8 19h7l-2 12 11-18h-7Z"/></svg>',
  autre:
    '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="17" r="13"/><path d="M17 10v7l5 3"/></svg>',
  atelier:
    '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12.5" cy="11.5" r="4"/><path d="M4 29c0-4.7 3.8-8.5 8.5-8.5S21 24.3 21 29"/><circle cx="24" cy="13" r="3.2"/><path d="M20.8 29c.4-3.8 3.1-6.8 6.8-7.5"/></svg>',
};
const SVG_SPEC = {
  systeme:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="12" rx="1"/><path d="M8 20h8M12 16v4"/></svg>',
  processeur:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  ram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="8" rx="1"/><path d="M8 8V5M12 8V5M16 8V5"/></svg>',
  disque:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>',
  donneesMobiles:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20v-4M9 20v-8M14 20v-12M19 20V4"/></svg>',
  sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  appels:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.5 2.1L7.9 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .4 2 .6 3 .7a2 2 0 0 1 1.7 2z"/></svg>',
};
const CATEGORIES = [
  {
    id: 'ordinateurs',
    titre: 'Ordinateurs',
    icones: ['portable', 'fixe'],
    silhouette: 'portable',
    teinte: 'var(--color-accent)',
    teinte100: 'var(--color-accent-100)',
  },
  {
    id: 'smartphones',
    titre: 'Smartphones',
    icones: ['telephone', 'telephone_touches'],
    silhouette: 'telephone',
    teinte: 'var(--violet)',
    teinte100: 'var(--violet-100)',
  },
  {
    id: 'tablettes',
    titre: 'Tablettes',
    icones: ['tablette'],
    silhouette: 'tablette',
    teinte: 'var(--jaune)',
    teinte100: 'var(--jaune-100)',
  },
  {
    id: 'recharges',
    titre: 'Recharges',
    icones: ['recharge'],
    silhouette: 'recharge',
    teinte: 'var(--rouge)',
    teinte100: 'var(--rouge-100)',
  },
  {
    id: 'ateliers',
    titre: 'Ateliers & accompagnement',
    icones: ['atelier', 'feuille'],
    silhouette: 'atelier',
    teinte: 'var(--vert)',
    teinte100: 'var(--vert-100)',
  },
  {
    id: 'autres',
    titre: 'Autres équipements',
    icones: [],
    silhouette: 'autre',
    teinte: 'var(--gris)',
    teinte100: 'var(--gris-100)',
  },
];
let categorieActive = 'ordinateurs';
let produitsParCategorie = {};
let estRN = false;
let masquerPrix = false;

function devineIcone(nom) {
  const n = String(nom || '').toLowerCase();
  // Même logique que iconeProduit() côté admin (admin/) — sans ça, un produit dont l'icône n'a
  // pas été choisie explicitement (valeur "Automatique") ne matchait aucune catégorie ici, y
  // compris "Recharges" qui n'avait tout simplement aucune détection par nom.
  if (/recharge|forfait/.test(n)) return 'recharge';
  // Doit être vérifié en priorité : un produit du type "Atelier de sensibilisation à l'écologie"
  // contient aussi "atelier" et parfois "ordinateur" — sans cette priorité, il retombait sur une
  // tout autre icône (même ordre de règles que iconeProduit() côté admin).
  if (/(sensibilisation|[ée]cologi|environnement)/.test(n)) return 'feuille';
  // testé avant « portable » / « ordinateur » : « Atelier initiation ordinateur » contient aussi
  // ces mots (même ordre que iconeProduit() dans l'admin)
  if (/(atelier|animation)/.test(n)) return 'atelier';
  if (/touches?/.test(n)) return 'telephone_touches';
  if (/(smartphone|t[ée]l[ée]phone|mobile)/.test(n)) return 'telephone';
  if (/tablet/.test(n)) return 'tablette';
  if (/(portable|laptop)/.test(n)) return 'portable';
  if (/(fixe|bureau|desktop|tour|ordinateur|pc)/.test(n)) return 'fixe';
  return '';
}

async function charger() {
  let code = '';
  try {
    code = sessionStorage.getItem('cvdl-code-structure') || '';
  } catch (e) {}
  // Le lien "retour" dépend de qui est arrivé ici : une structure (code en session) revient à
  // son portail, un bénéficiaire (pas de code, arrivé par sav-beneficiaire.html) au sien.
  $('ct-bas-commander').hidden = !code;
  $('btn-retour-portail').addEventListener('click', () => {
    location.href = code ? 'portail-structure.html' : 'portail-beneficiaire.html';
  });
  try {
    const r = await jsonp({ action: 'produits-public', code });
    $('etat-chargement').hidden = true;
    if (!r.ok || !r.produits) {
      $('etat-chargement').hidden = false;
      $('etat-chargement').textContent = 'Impossible de charger le catalogue pour le moment.';
      return;
    }
    // Structures Projets : accès à la page conservé, mais les prix restent masqués.
    masquerPrix = !!r.estProjets;
    estRN = !!r.estRN;
    const produits = r.produits.filter((p) => p.visible && !p.masqueCategorieMateriel);
    const dejaClasses = new Set();
    CATEGORIES.forEach((cat) => {
      const items = cat.icones.length
        ? produits.filter((p) => cat.icones.includes(p.icone) || (!p.icone && cat.icones.includes(devineIcone(p.nom))))
        : produits.filter((p) => !dejaClasses.has(p.nom) && (p.disque || p.ram || p.systeme || p.processeur));
      items.forEach((p) => dejaClasses.add(p.nom));
      produitsParCategorie[cat.id] = items.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    });
    const premiereNonVide = CATEGORIES.find((c) => produitsParCategorie[c.id].length);
    categorieActive = premiereNonVide ? premiereNonVide.id : 'ordinateurs';
    $('zone-categories').hidden = false;
    construireOnglets();
    construireTableau();
  } catch (e) {
    $('etat-chargement').textContent = 'Connexion impossible — réessaie.';
  }
}
function construireOnglets() {
  $('selecteur-categories').innerHTML = CATEGORIES.map((cat) => {
    const n = produitsParCategorie[cat.id].length;
    if (!n) return '';
    return `
      <button type="button" class="cs-filtre ct-filtre${cat.id === categorieActive ? ' actif' : ''}" data-categorie="${cat.id}" aria-pressed="${cat.id === categorieActive}">
        ${echapper(cat.titre)}<span class="ct-n">${n}</span>
      </button>`;
  }).join('');
  $('selecteur-categories')
    .querySelectorAll('[data-categorie]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        categorieActive = btn.dataset.categorie;
        construireOnglets();
        construireTableau();
      });
    });
}
function puceSpec(cle, libelle, valeur, chiffre) {
  if (!valeur) return '';
  return `<span class="puce-spec" title="${echapper(libelle)}"><span class="icone-spec">${SVG_SPEC[cle]}</span><span${chiffre ? ' class="chiffre"' : ''}>${echapper(valeur)}</span></span>`;
}
function construireTableau() {
  const items = produitsParCategorie[categorieActive] || [];
  const cat = CATEGORIES.find((c) => c.id === categorieActive);
  if (!items.length) {
    $('zone-tableau').innerHTML = '<div class="etat-vide">Rien à comparer dans cette catégorie pour le moment.</div>';
    return;
  }
  const visuel = (p) =>
    window.illustrationCvdl && window.cleIllustrationProduit
      ? window.illustrationCvdl(window.cleIllustrationProduit(p.nom, p.icone), 64)
      : `<span class="ct-silhouette">${SILHOUETTES[cat.silhouette]}</span>`;
  $('zone-tableau').innerHTML = `
    <div class="ct-grille">
      ${items
        .map((p) => {
          const prix = estRN ? p.prixRN : p.prixStandard;
          const specs =
            categorieActive === 'recharges'
              ? puceSpec('donneesMobiles', 'Données mobiles', p.donneesMobiles, true) +
                puceSpec('sms', 'SMS', p.sms) +
                puceSpec('appels', 'Appels', p.appels)
              : puceSpec('systeme', 'Système', p.systeme) +
                puceSpec('processeur', 'Processeur', p.processeur) +
                puceSpec('ram', 'Mémoire', p.ram, true) +
                puceSpec('disque', 'Stockage', p.disque, true);
          return `
        <article class="ct-carte">
          <div class="ct-haut">${visuel(p)}${p.disponible === false ? '<span class="tag" data-forme="losange">Sur demande</span>' : ''}</div>
          <b class="ct-nom">${echapper(p.nom)}</b>
          <div class="ct-specs">${specs}</div>
          ${masquerPrix || prix == null || prix === '' ? '' : `<div class="ct-prix"><span>Prix</span><b>${echapper(String(prix))} €</b></div>`}
        </article>`;
        })
        .join('')}
    </div>`;
}
charger();
