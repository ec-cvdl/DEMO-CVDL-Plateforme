/* Admin CVDL — icônes SVG. Scripts chargés dans l'ordre par admin.html (fonctions globales partagées). */
/* ── Icônes (mêmes tracés que Canvas.dc.html, portés en SVG statique) ── */
const ICONES = {
  copie: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  calendrier: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  check: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  validation:
    '<path d="M9 11.5 11 13.5 15 9"/><rect x="3.5" y="4" width="17" height="17" rx="2.5"/><path d="M8 2v3"/><path d="M16 2v3"/>',
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  package:
    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="M3.3 7 12 12l8.7-5"/><path d="m7.5 4.27 9 5.15"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  clipboard:
    '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  wrench:
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  loupe_diagnostic:
    '<circle cx="10" cy="10" r="6.5"/><path d="m20.5 20.5-4.6-4.6"/><path d="M10 7.2v5.6M7.2 10h5.6" opacity=".6"/>',
  colis_livraison: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8" opacity=".6"/>',
  boite_pieces:
    '<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 8l3.5-5h11L21 8"/><path d="M9 12h6" opacity=".6"/>',
  reparation_cours:
    '<path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="4"/>',
  bouclier_garantie:
    '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z"/><path d="m9 12 2 2 4-4" opacity=".8"/>',
  croix_irreparable: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  building:
    '<rect x="8" y="2" width="8" height="20" rx="1"/><rect x="3" y="10" width="5" height="12" rx="1"/><rect x="16" y="10" width="5" height="12" rx="1"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  eclair: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r="0.5" fill="currentColor"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  receipt:
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M13 16H8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:
    '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
  package2:
    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="M3.3 7 12 12l8.7-5"/>',
  dashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  stats: '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.42H5.12"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  portable: '<rect x="3" y="4" width="18" height="11" rx="1.3"/><path d="M2 18.5h20l-1.4-3.5H3.4z"/>',
  fixe: '<rect x="4" y="4" width="16" height="11" rx="1.3"/><path d="M9 19h6M12 15v4"/>',
  feuille: '<path d="M4 20c9 0 15-6 16-16C10 5 4 11 4 20Z"/><path d="M6 18C10 12 13 9 20 4"/>',
  sim: '<path d="M7 2h8l4 4v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V3.5A1.5 1.5 0 0 1 6.5 2Z"/><rect x="9" y="9" width="6" height="7" rx="1"/>',
  passeport:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="15" y="15" width="4" height="4" rx="0.8"/>',
  // Ticket/coupon — pour un code de produit dématérialisé (recharge, licence...), volontairement
  // distinct du QR code utilisé pour un numéro de série d'appareil réel (voir "passeport").
  ticket:
    '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M10 7.5v9" stroke-dasharray="2.2 2.2"/>',
  lien_externe:
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  telephone_touches:
    '<rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8.5" y="5" width="7" height="4" rx="0.6"/><circle cx="9.6" cy="12.5" r="0.9"/><circle cx="12" cy="12.5" r="0.9"/><circle cx="14.4" cy="12.5" r="0.9"/><circle cx="9.6" cy="15.5" r="0.9"/><circle cx="12" cy="15.5" r="0.9"/><circle cx="14.4" cy="15.5" r="0.9"/>',
  telephone: '<rect x="6.5" y="2" width="11" height="20" rx="2.2"/><path d="M11 18.5h2"/>',
  tablette: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M11.5 19h1"/>',
  atelier:
    '<circle cx="8.5" cy="8" r="3"/><path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M14.7 20c.3-2.7 2.2-4.8 4.8-5.3"/>',
  recharge:
    '<path d="M9 7V3M15 7V3"/><rect x="6" y="7" width="12" height="7" rx="2"/><path d="M9 14v2a3 3 0 0 0 6 0v-2"/><path d="M12 16v5"/><path d="M9 21h6"/>',
  souris: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v7"/>',
  personne: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 7 9-7"/>',
  bulle: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  refresh:
    '<path d="M21 3v6h-6" opacity=".9"/><path d="M3 12a9 9 0 0 1 15-6.7L21 9"/><path d="M3 21v-6h6" opacity=".9"/><path d="M21 12a9 9 0 0 1-15 6.7L3 15"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5"/><path d="M12 8h.01"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5 5 14 14"/>',
  remboursement: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5a4 4 0 1 0 0 7"/><path d="M7 10.5h6M7 13.5h5"/>',
  nettoyage: '<path d="M12 2c3 4 6 7.5 6 11.5a6 6 0 1 1-12 0C6 9.5 9 6 12 2Z"/>',
  carte_paiement: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
};
const ICONES_UNIFIE = {
  check: ['', '<path d="M4.5 12.8c1.6 1.3 3 2.8 4.3 4.4C11.5 12.6 15 8.9 19.5 6"/>'],
  wrench: [
    '<circle cx="16.5" cy="8.5" r="5"/>',
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
  ],
  loupe_diagnostic: [
    '<circle cx="12" cy="12" r="7"/>',
    '<circle cx="10.5" cy="10.5" r="7"/><path d="m21 21-5.5-5.5M6.5 10.5h2l1-2 1.5 4 1-2h2"/>',
  ],
  boite_pieces: [
    '<rect x="5" y="9" width="17" height="12" rx="2"/>',
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M10 7V4h4v3M8 15h3"/>',
  ],
  colis_livraison: [
    '<path d="M5 9l8-4 8 4v9l-8 4-8-4z"/>',
    '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/>',
  ],
  truck: [
    '<rect x="3.5" y="7.5" width="12.5" height="10" rx="1.5"/>',
    '<path d="M2 6h12v10H2zM14 9h4l3 3.5V16h-7"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  ],
  reparation_cours: [
    '<rect x="4" y="6" width="15" height="10.5" rx="2"/>',
    '<rect x="2.5" y="4.5" width="15" height="10.5" rx="2"/><path d="M6 19h8"/><path d="M21.5 15.8a3 3 0 0 1-3.9 2.9l-2.7 2.7a1 1 0 0 1-1.5-1.5l2.7-2.7a3 3 0 0 1 2.9-3.9l-1.4 1.4.4 1.2 1.2.4z"/>',
  ],
  bouclier_garantie: [
    '<path d="M13.5 3.5 20.5 6v6c0 5-7 9-7 9s-7-4-7-9V6z"/>',
    '<path d="M12 2 19 4.5v6c0 5-7 9-7 9s-7-4-7-9v-6z"/><path d="m9 11 2 2 4-4"/>',
  ],
  croix_irreparable: [
    '<circle cx="13.5" cy="13.5" r="8.5"/>',
    '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
  ],
  telephone: [
    '<rect x="8" y="3.5" width="11" height="18" rx="2.5"/>',
    '<rect x="6.5" y="2" width="11" height="18" rx="2.5"/><path d="M10.5 16.5h3"/>',
  ],
  personne: [
    '<circle cx="13.5" cy="9" r="4"/><path d="M6 21.5a7.5 7.5 0 0 1 15 0z"/>',
    '<circle cx="12" cy="7.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  ],
  nettoyage: [
    '<path d="M13.5 4c3 4 5.5 7 5.5 10.5a5.5 5.5 0 1 1-11 0C8 11 10.5 8 13.5 4z"/>',
    '<path d="M12 2.5c3 4 5.5 7 5.5 10.5a5.5 5.5 0 1 1-11 0C6.5 9.5 9 6.5 12 2.5z"/><path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  ],
  remboursement: [
    '<circle cx="13.5" cy="13.5" r="8"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2a3.2 3.2 0 1 0 0 5.6M8.5 11h5M8.5 13h4.5"/>',
  ],
  ban: ['<circle cx="13.5" cy="13.5" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>'],
  receipt: [
    '<path d="M7 4h13v17l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5L9 19.5 7 21z"/>',
    '<path d="M5 2.5h13v17l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5L7 18l-2 1.5z"/><path d="M8.5 7h6M8.5 10.5h6M8.5 14h3.5"/>',
  ],
  file: [
    '<path d="M7 4h9l4.5 4.5V21H7z"/>',
    '<path d="M5 2.5h9l4.5 4.5v13.5H5z"/><path d="M14 2.5V7h4.5M8.5 12h6.5M8.5 15.5h4.5"/>',
  ],
  clock: ['<circle cx="13.5" cy="13.5" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
  alert: ['<path d="M13.5 5 22 20H5z"/>', '<path d="M12 3.5 20.5 18.5h-17z"/><path d="M12 9.5v4M12 16.2v.3"/>'],
  inbox: [
    '<rect x="4.5" y="6" width="17" height="15" rx="2"/>',
    '<rect x="3" y="4.5" width="17" height="15" rx="2"/><path d="M3 12.5h4.5l1.5 2.5h5l1.5-2.5H20"/>',
  ],
  validation: [
    '<rect x="5.5" y="5.5" width="16" height="16" rx="3"/>',
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12.5 3 3 5-6"/>',
  ],
  mail: [
    '<rect x="4.5" y="6.5" width="18" height="13" rx="2"/>',
    '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m3.5 6 8.5 6.5L20.5 6"/>',
  ],
  eclair: ['<path d="M14.5 3.5 6 14.5h7l-1 7.5 8.5-11h-7z"/>', '<path d="M13 2 4.5 13h7l-1 7.5L19 9.5h-7z"/>'],
  passeport: [
    '<rect x="6.5" y="4" width="14" height="18" rx="2"/>',
    '<rect x="5" y="2.5" width="14" height="18" rx="2"/><circle cx="12" cy="9.5" r="3"/><path d="M9 9.5h6M9 15h6M10 17.5h4"/>',
  ],
  package: [
    '<path d="M5 9l8-4 8 4v9l-8 4-8-4z"/>',
    '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/>',
  ],
  package2: [
    '<path d="M5 9l8-4 8 4v9l-8 4-8-4z"/>',
    '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6"/>',
  ],
};
function icon(name, size) {
  size = size || 20;
  if (estUnifie() && ICONES_UNIFIE[name]) {
    const [fond, trait] = ICONES_UNIFIE[name];
    return `<svg class="ic-u" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${fond ? `<g class="ic-u-fond" fill="currentColor" stroke="none">${fond}</g>` : ''}<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${trait}</g></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${ICONES[name] || ICONES.package}</svg>`;
}
/** Transforme un bloc de liens (un par ligne) en pilules cliquables, avec l'icône "lien
 *  externe" — même traitement que dans le suivi de commande public, pour rester cohérent.
 *  `libelles` est soit un libellé unique (répété), soit un tableau (un par lien, ex. noms des
 *  bénéficiaires pour un paiement séparé). */
/** Base commune à pilulesColis()/pilulesPaiement() ci-dessous — un lien (ou plusieurs, un par
 *  ligne) rendu dans la pilule de la couleur/icône demandée. */
function pilulesGenerique(texteLiens, libellePluriel, libelleSingulier, classeCss, nomIcone) {
  const liens = String(texteLiens || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!liens.length) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">${liens
    .map((l, i) => {
      const libelle = Array.isArray(libellePluriel)
        ? libellePluriel[i] || `Lien ${i + 1}`
        : liens.length > 1
          ? `${libellePluriel} ${i + 1}`
          : libelleSingulier || libellePluriel;
      return `<a href="${echapper(urlSure(l))}" target="_blank" rel="noopener" class="${classeCss}">${icon(nomIcone, 14)}${echapper(libelle)}<span style="opacity:0.75;font-size:11px">↗</span></a>`;
    })
    .join('')}</div>`;
}
/** Lien(s) de suivi Colissimo — pilule verte, icône camion. */
function pilulesColis(texteLiens) {
  return pilulesGenerique(texteLiens, 'Colis', 'Suivi Colissimo', 'rp-pilule-jaune', 'truck');
}
/** Lien(s) de paiement — pilule bleue, icône carte bancaire. */
function pilulesPaiement(texteLiens, libellePluriel, libelleSingulier) {
  return pilulesGenerique(texteLiens, libellePluriel, libelleSingulier, 'rp-pilule-orange', 'carte_paiement');
}
/** Numéro(s) de série confirmé(s) — pastille violette, lien direct vers le passeport numérique
 *  de l'appareil. Design unique dans tout l'admin (récap commande, modale SAV...) : à réutiliser
 *  plutôt que redupliquer le style à chaque endroit. Accepte aussi bien un seul numéro qu'une
 *  liste multiligne. */
function pilulesNumerosSerie(texteNumeros) {
  // Composant commun admin / public (portail-ui.js) : pilule unique, passeport ouvert en modale.
  return window.pilulesSeriesCvdl ? window.pilulesSeriesCvdl(texteNumeros, { query: '&admin=1' }) : '';
}
/** Équivalent pour un code de produit dématérialisé (recharge...) — pastille rouge, jamais de
 *  lien (un code n'a pas de passeport numérique) : juste affiché, sélectionnable au clic. */
function pilulesCodes(texteCodes) {
  return window.pilulesSeriesCvdl ? window.pilulesSeriesCvdl(texteCodes, { code: true }) : '';
}
// Groupes de commande : chaque produit appartient à l'un des trois ; une structure peut être
// limitée à un sous-ensemble (plusieurs cochés = profil "Mixte" dans les formulaires).
const GROUPES_COMMANDE = ['Connexion', 'Équipement', 'Accompagnement'];
const TECTECH_TYPES = ['ORDINATEUR_FIXE', 'ORDINATEUR_PORTABLE', 'SMARTPHONE', 'TABLETTE', 'TELEPHONE_A_TOUCHES'];
const TECTECH_CATEGORIES = ['PREMIUM', 'A', 'B', 'C', 'D'];

const MOYENS_PAIEMENT_STRUCTURE = ['Paiement en ligne (CB)', 'Chèque', 'Espèces', 'Comptoir solidaire'];

const ICONES_PRODUIT_OPTIONS = [
  { value: '', label: 'Automatique (déduite du nom)' },
  { value: 'portable', label: 'Ordinateur portable' },
  { value: 'fixe', label: 'Ordinateur fixe' },
  { value: 'feuille', label: 'Écologie / sensibilisation' },
  { value: 'sim', label: 'Carte SIM' },
  { value: 'telephone_touches', label: 'Téléphone basique (à touches)' },
  { value: 'telephone', label: 'Smartphone' },
  { value: 'tablette', label: 'Tablette' },
  { value: 'atelier', label: "Atelier d'accompagnement" },
  { value: 'recharge', label: 'Recharge téléphone' },
  { value: 'souris', label: 'Souris' },
];
// Listes utilisées pour les champs techniques du formulaire produit — menus déroulants plutôt
// que texte libre, pour éviter les fautes de saisie et les formats différents d'un produit à
// l'autre (ex. "8go" / "8 Go" / "8Go"). Les valeurs de RAM sont de simples nombres, le "Go" est
// rajouté automatiquement à l'enregistrement (voir enregistrerProduit()).
const SYSTEMES_OPTIONS = ['Windows 11', 'macOS', 'Linux', 'ChromeOS', 'Android', 'iOS'];
const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 64];
const DISQUE_OPTIONS = ['32 Go', '64 Go', '128 Go', '256 Go', '500 Go', '512 Go', '1 To', '2 To'];
const DONNEES_MOBILES_OPTIONS = [1, 2, 5, 10, 20, 50, 'Illimitées'];
/** Construit un <select> à partir d'une liste d'options simples (valeur = libellé), en ajoutant
 *  la valeur actuellement enregistrée si elle n'y figure pas déjà (une saisie plus ancienne ou
 *  inhabituelle ne doit jamais être silencieusement remplacée/perdue à l'ouverture du formulaire). */
function selectSimple(id, options, valeurActuelle, videLabel) {
  const valeurs = options.map((o) => String(o));
  const extra = valeurActuelle && !valeurs.includes(String(valeurActuelle)) ? [valeurActuelle] : [];
  return `<select class="input" id="${id}">
    <option value="">${echapper(videLabel || '—')}</option>
    ${[...options, ...extra].map((o) => `<option value="${echapper(String(o))}" ${String(valeurActuelle) === String(o) ? 'selected' : ''}>${echapper(String(o))}</option>`).join('')}
  </select>`;
}
/** Variante pour un champ numérique suivi d'une unité (RAM en Go, données mobiles en Go) — la
 *  valeur stockée inclut déjà l'unité ("8 Go"), donc on la retire pour retrouver le nombre à
 *  présélectionner, et on ne la réaffiche qu'en libellé (la valeur du <select> reste le nombre
 *  seul). Toute entrée non numérique de la liste (ex. "Illimitées") est affichée telle quelle,
 *  sans suffixe. */
function selectAvecUnite(id, options, unite, valeurActuelle) {
  const brut =
    valeurActuelle && valeurActuelle.endsWith(' ' + unite)
      ? valeurActuelle.slice(0, -(unite.length + 1))
      : valeurActuelle;
  const valeurs = options.map((o) => String(o));
  const extra = brut && !valeurs.includes(String(brut)) ? [brut] : [];
  return `<select class="input" id="${id}">
    <option value="">—</option>
    ${[...options, ...extra].map((o) => `<option value="${echapper(String(o))}" ${String(brut) === String(o) ? 'selected' : ''}>${echapper(String(o))}${/^\d+$/.test(String(o)) ? ' ' + echapper(unite) : ''}</option>`).join('')}
  </select>`;
}

/** Champ de recherche avec petite croix pour vider — n'apparaît que si le champ contient
 *  déjà du texte. */
function champRecherche(id, placeholder, valeur) {
  return `
    <div class="field" style="max-width:340px;margin-bottom:var(--space-6);position:relative">
      <input class="input" id="${id}" placeholder="${echapper(placeholder)}" value="${echapper(valeur)}" style="${valeur ? 'padding-right:36px' : ''}">
      ${valeur ? `<button type="button" data-vider-recherche="${id}" style="all:unset;position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--color-neutral-500);display:flex;padding:4px" title="Vider">${icon('x', 14)}</button>` : ''}
    </div>`;
}
/** Icône par mot-clé pour un statut SAV (diagnostic, réparation, pièces, livraison,
 *  garantie...) — à défaut de correspondance, l'icône générique reste la clé anglaise. */
const ICONES_STATUT_SAV_OPTIONS = [
  { value: '', label: 'Automatique (déduite du nom)' },
  { value: 'wrench', label: 'Clé (générique)' },
  { value: 'loupe_diagnostic', label: 'Diagnostic' },
  { value: 'boite_pieces', label: 'Pièces / approvisionnement' },
  { value: 'colis_livraison', label: 'Livraison / expédition' },
  { value: 'reparation_cours', label: 'Réparation en cours' },
  { value: 'bouclier_garantie', label: 'Garantie' },
  { value: 'croix_irreparable', label: 'Irréparable / hors service' },
  { value: 'telephone', label: 'Appel / contact client' },
  { value: 'personne', label: 'Prise en charge / accueil' },
  { value: 'nettoyage', label: 'Nettoyage' },
  { value: 'package2', label: 'Emballage / retour colis' },
  { value: 'truck', label: 'Retour transporteur' },
  { value: 'remboursement', label: 'Remboursement' },
  { value: 'ban', label: 'Refusé / annulé' },
  { value: 'receipt', label: 'Facturation SAV' },
  { value: 'check', label: 'Terminé' },
];
function iconeStatutSav(nom, iconeChoisie) {
  if (iconeChoisie && ICONES[iconeChoisie]) return iconeChoisie;
  const n = String(nom || '').toLowerCase();
  if (/diagnostic|analyse|expertise/.test(n)) return 'loupe_diagnostic';
  if (/(pi[eè]ce|attente.*commande|approvisionn)/.test(n)) return 'boite_pieces';
  if (/(livr|exp[ée]di|retour.*structure|retour.*b[ée]n[ée]ficiaire)/.test(n)) return 'colis_livraison';
  if (/garantie|assurance/.test(n)) return 'bouclier_garantie';
  if (/(irr[ée]parable|abandon|hors service|hs\b|rebut)/.test(n)) return 'croix_irreparable';
  if (/(r[ée]par|atelier|en cours)/.test(n)) return 'reparation_cours';
  if (/rembours/.test(n)) return 'remboursement';
  if (/(refus|annul)/.test(n)) return 'ban';
  if (/(appel|contact|rappel)/.test(n)) return 'telephone';
  if (/(accueil|prise en charge)/.test(n)) return 'personne';
  if (/nettoy/.test(n)) return 'nettoyage';
  if (/(embal|transporteur)/.test(n)) return 'package2';
  if (/factur/.test(n)) return 'receipt';
  return 'wrench';
}
/** Illustration produit du kit (portail-ui.js) — même style que le portail public ; repli sur
 *  l'icône au trait si le script n'est pas chargé. */
function illustrationProduitAdmin(nom, icone, taille) {
  if (window.illustrationCvdl && window.cleIllustrationProduit)
    return window.illustrationCvdl(window.cleIllustrationProduit(nom, icone), taille);
  return icon(iconeProduit(nom, icone), Math.round(taille / 2));
}
function iconeProduit(nom, icone) {
  if (icone && ICONES[icone]) return icone;
  const n = String(nom || '').toLowerCase();
  if (/(sensibilisation|[ée]cologi|environnement)/.test(n)) return 'feuille';
  if (/(atelier|animation)/.test(n)) return 'atelier';
  if (/\bsim\b|carte sim/.test(n)) return 'sim';
  if (/recharge|forfait/.test(n)) return 'recharge';
  if (/souris/.test(n)) return 'souris';
  if (/touches?/.test(n)) return 'telephone_touches';
  if (/(smartphone|t[ée]l[ée]phone|mobile)/.test(n)) return 'telephone';
  if (/tablet/.test(n)) return 'tablette';
  if (/(portable|laptop)/.test(n)) return 'portable';
  if (/(fixe|bureau|desktop|tour)/.test(n)) return 'fixe';
  return 'package';
}
