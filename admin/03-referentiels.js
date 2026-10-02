/* Admin CVDL — statuts, couleurs, types de structure. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ── Référentiel de statuts (mêmes valeurs que le reste de la plateforme) ── */
const BADGE = {
  'tag-accent': { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)' },
  'tag-accent-2': { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' },
  'tag-warn': { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)' },
  'tag-neutral': { bg: 'var(--color-neutral-200)', fg: 'var(--color-neutral-700)' },
  'tag-bleu': { bg: 'var(--color-bleu-100)', fg: 'var(--color-bleu-700)' },
  'tag-violet': { bg: 'var(--color-violet-100)', fg: 'var(--color-violet-700)' },
  'tag-orange': { bg: 'var(--color-orange-100)', fg: 'var(--color-orange-700)' },
  'tag-vert': { bg: 'var(--color-vert-100)', fg: 'var(--color-vert-700)' },
};
const BAR_COLOR = {
  'tag-accent': 'var(--color-accent)',
  'tag-accent-2': 'var(--color-accent-2)',
  'tag-warn': 'var(--color-warn-700)',
  'tag-neutral': 'var(--color-neutral-500)',
  'tag-bleu': 'var(--color-bleu-700)',
  'tag-violet': 'var(--color-violet-700)',
  'tag-orange': 'var(--color-orange-700)',
  'tag-vert': 'var(--color-vert-700)',
};
const ORDER_META = {
  Reçue: { cls: 'tag-warn', ic: 'inbox' },
  Validée: { cls: 'tag-bleu', ic: 'validation' },
  Préparée: { cls: 'tag-violet', ic: 'package' },
  'En cours de livraison': { cls: 'tag-orange', ic: 'truck' },
  Livrée: { cls: 'tag-vert', ic: 'check' },
};
const ORDER_STATUSES = Object.keys(ORDER_META);
const DOC_META = {
  'En attente': { cls: 'tag-neutral', ic: 'clock' },
  Émis: { cls: 'tag-neutral', ic: 'clock' },
  Émise: { cls: 'tag-neutral', ic: 'clock' },
  Envoyé: { cls: 'tag-warn', ic: 'file' },
  Envoyée: { cls: 'tag-warn', ic: 'file' },
  Accepté: { cls: 'tag-accent-2', ic: 'check' },
  'Accepté sans réserve': { cls: 'tag-accent-2', ic: 'check' },
  Payé: { cls: 'tag-accent-2', ic: 'check' },
  Payée: { cls: 'tag-accent-2', ic: 'check' },
  'En retard': { cls: 'tag-accent', ic: 'alert' },
  'Non payé': { cls: 'tag-accent', ic: 'alert' },
  Annulé: { cls: 'tag-neutral', ic: 'ban' },
  Annulée: { cls: 'tag-neutral', ic: 'ban' },
};
function metaDoc(statut) {
  return DOC_META[statut] || DOC_META['En attente'];
}
/* Icônes de statut : style simple, un seul trait, sans aplat ni remplissage. */
const ICONES_STATUT_SIMPLES = {
  inbox: '<path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20"/><path d="M6.5 5.5h11L20 13.5V19H4v-5.5z"/>',
  validation: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  package: '<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5l8 3.5 8-3.5M12 11v9"/>',
  truck:
    '<path d="M3 7h11v9H3zM14 10h3.5l3 3v3H14"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  check: '<path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M9 15l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>',
  file: '<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4"/>',
};
function iconeStatutSimple(nom, t) {
  const d = ICONES_STATUT_SIMPLES[nom];
  if (!d) return icon(nom, t);
  return `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
function mkTag(statut, meta) {
  const m = meta[statut] || { cls: 'tag-neutral', ic: 'inbox' };
  const b = BADGE[m.cls];
  return { icon: iconeStatutSimple(m.ic, 17), tagCls: m.cls, badgeBg: b.bg, badgeFg: b.fg };
}

/* ── Couleurs des statuts SAV (mêmes clés que COULEURS_SAV_DISPONIBLES côté back) ── */
const COULEURS_SAV_DISPONIBLES = [
  't-ambre',
  't-orange',
  't-bleu',
  't-violet',
  't-turquoise',
  't-vert',
  't-rouge',
  't-gris',
];
const TEINTES_SAV = {
  't-ambre': { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)', vif: 'var(--color-warn-700)' },
  't-orange': { bg: 'var(--color-orange-100)', fg: 'var(--color-orange-700)', vif: 'var(--color-orange)' },
  't-bleu': { bg: 'var(--color-bleu-100)', fg: 'var(--color-bleu-700)', vif: 'var(--color-bleu)' },
  't-violet': { bg: 'var(--color-violet-100)', fg: 'var(--color-violet-700)', vif: 'var(--color-violet)' },
  't-turquoise': { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)', vif: 'var(--color-accent-2)' },
  't-vert': { bg: 'var(--color-vert-100)', fg: 'var(--color-vert-700)', vif: 'var(--color-vert)' },
  't-rouge': { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)', vif: 'var(--color-accent)' },
  't-gris': { bg: 'var(--color-neutral-200)', fg: 'var(--color-neutral-700)', vif: 'var(--color-neutral-500)' },
};
function teinteSav(couleur) {
  return TEINTES_SAV[couleur] || TEINTES_SAV['t-gris'];
}

const TYPE_COLORS = {
  RNum: { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' },
  Interne: { bg: 'var(--color-warn-100)', fg: 'var(--color-warn-800)' },
  ESN: { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)' },
  BO: { bg: 'var(--color-neutral-200)', fg: 'var(--color-neutral-700)' },
  Projets: { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-700)' },
};
function typeStructure(s) {
  return s.esn ? 'ESN' : s.interne ? 'Interne' : s.bo ? 'BO' : s.projets ? 'Projets' : 'RNum';
}
/* Type unique (colonne « Type ») : une structure sans type enregistré et avec zéro ou plusieurs
   anciennes cases cochées doit être tranchée à la main (le changer modifierait son tarif). */
const TYPES_STRUCTURE = [
  {
    cle: 'rn',
    libelle: 'Vente solidaire (RNum)',
    aide: 'Tarif RNum, paiement par virement, devis et facture, rapprochement comptable.',
  },
  {
    cle: 'projets',
    libelle: 'Projets',
    aide: 'Prix masqués, paiement fixé par l’équipe, facture, flotte gérée dans la plateforme.',
  },
  {
    cle: 'bo',
    libelle: 'Bon d’orientation (BO)',
    aide: 'Personnes nominatives et attestations, jamais de devis ni de facture.',
  },
  {
    cle: 'interne',
    libelle: 'Interne',
    aide: 'Sans paiement ni facture, flotte gérée dans la plateforme, peut créer des partenaires.',
  },
  { cle: 'esn', libelle: 'ESN', aide: 'Sans paiement ni facture, quantités ESN.' },
];
function typeAChoisir(s) {
  return !!s && !s.typeDefini && (s.casesCochees || []).length !== 1;
}

/* ============================================================
   État applicatif
   ============================================================ */
