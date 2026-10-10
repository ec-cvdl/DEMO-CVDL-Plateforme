/* Import CSV tec.tech des numéros de série (préparation d'une commande) — partagé par l'admin
   (admin/05-actions.js) et l'espace logistique (support-commandes.js).
   Export réel (26/09/2026) : ID, Type de matériel, …, Numero de serie (G), IMEI 1, IMEI 2, …,
   Modèle, Marque, …, Catégorie, … — tout est lu par nom d'en-tête.
   Les fiches produit portent leur « Type tec.tech » (ORDINATEUR_PORTABLE, SMARTPHONE…) et leur
   « Catégorie tec.tech » (PREMIUM, A…D). Pour chaque numéro du CSV, on connaît son type et sa
   catégorie : par les colonnes du CSV si elles existent, sinon en interrogeant tec.tech.
   Placement : type + catégorie identiques, puis type seul, puis (si rien n'est configuré sur le
   produit) dans l'ordre. Ce qui ne correspond à rien est signalé. */

/** Une ligne CSV en champs : guillemets gérés, séparateur « , » ou « ; ». */
function parserLigneCsv(ligne, separateur) {
  const champs = [];
  let champ = '',
    dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const car = ligne[i];
    if (car === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        champ += '"';
        i++;
      } else dansGuillemets = !dansGuillemets;
    } else if (car === separateur && !dansGuillemets) {
      champs.push(champ);
      champ = '';
    } else champ += car;
  }
  champs.push(champ);
  return champs.map((c) => c.trim());
}
const normTT = (v) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
function typeTecTech(v) {
  const n = normTT(v);
  if (!n) return '';
  if (/PORTABLE|LAPTOP|NOTEBOOK/.test(n)) return 'ORDINATEUR_PORTABLE';
  if (/FIXE|DESKTOP|UNITE_CENTRALE|TOUR/.test(n)) return 'ORDINATEUR_FIXE';
  if (/SMARTPHONE|TELEPHONE|MOBILE/.test(n)) return 'SMARTPHONE';
  if (/TABLETTE|TABLET/.test(n)) return 'TABLETTE';
  return n;
}
function categorieTecTech(v) {
  const n = normTT(v);
  if (!n) return '';
  if (/PREMIUM/.test(n)) return 'PREMIUM';
  const m = n.match(/(?:^|_)(?:CAT(?:EGORIE)?|GRADE)?_?([A-D])$/);
  return m ? m[1] : n;
}
/** Appareils du CSV : [{ numeroSerie, type, categorie, marque, modele }], null si vide. */
function lireCsvTecTech(texte) {
  const lignes = String(texte || '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lignes.length < 2) return null;
  const sep = lignes[0].includes(';') ? ';' : ',';
  const entetes = parserLigneCsv(lignes[0], sep).map(normTT);
  const col = (motifs) => entetes.findIndex((h) => motifs.some((m) => m.test(h)));
  const iSerie = (() => {
    const k = col([/NUMERO_?DE_?SERIE/, /^N_?SERIE/, /SERIAL/, /^SN$/]);
    return k >= 0 ? k : 6;
  })(); // défaut : colonne G
  const iType = col([/TYPE_?(DE_?)?MATERIEL/, /^TYPE$/]);
  const iCat = col([/CATEGORIE/, /GRADE/]);
  const iMarque = col([/MARQUE/, /BRAND/]);
  const iModele = col([/MODELE/, /MODEL/]);
  const iImei = col([/^IMEI_?1$/, /^IMEI$/]); // smartphones sans n° de série : l'IMEI 1 en tient lieu
  return lignes
    .slice(1)
    .map((l) => {
      const c = parserLigneCsv(l, sep);
      return {
        numeroSerie: (c[iSerie] || '').trim() || (iImei >= 0 ? (c[iImei] || '').trim() : ''),
        type: iType >= 0 ? typeTecTech(c[iType]) : '',
        categorie: iCat >= 0 ? categorieTecTech(c[iCat]) : '',
        marque: iMarque >= 0 ? c[iMarque] || '' : '',
        modele: iModele >= 0 ? c[iModele] || '' : '',
      };
    })
    .filter((x) => x.numeroSerie);
}
/** Type / catégorie absents du CSV : demandés à tec.tech en un seul appel. `appeler(numeros)`
 *  renvoie la réponse de l'action tectech-classer-series. Sans réponse : placement dans l'ordre. */
async function completerParTecTech(appareils, appeler) {
  const aCompleter = appareils.filter((a) => !a.type);
  if (!aCompleter.length) return;
  try {
    const r = await appeler(aCompleter.map((a) => a.numeroSerie));
    if (r && r.ok)
      r.resultats.forEach((x) => {
        const a = appareils.find((y) => y.numeroSerie === x.numeroSerie);
        if (a) {
          a.type = typeTecTech(x.type);
          a.categorie = a.categorie || categorieTecTech(x.categorie);
          a.marque = a.marque || x.marque;
          a.modele = a.modele || x.modele;
        }
      });
  } catch (e) {
    /* tec.tech indisponible : placement dans l'ordre pour ce qui n'est pas typé */
  }
}
/** Place les appareils du CSV sur les emplacements vides, produit par produit.
 *  `unites` : [{ produit }] un par appareil attendu ; `valeurs` : numéros déjà saisis (même
 *  ordre) ; `fiche(nom)` : fiche produit ({ tectechType, tectechCategorie }).
 *  Renvoie { valeurs, places, nonPlaces, lignesVides }. */
function placerSeriesCsv(unites, valeurs, appareils, fiche) {
  const v = unites.map((u, i) => String(valeurs[i] || '').trim());
  const deja = new Set(v.filter(Boolean));
  const restants = appareils.filter((a) => !deja.has(a.numeroSerie));
  const places = [],
    pris = new Set();
  const produitDe = (i) => fiche((unites[i] || {}).produit) || {};
  const tenter = (critere) =>
    v.forEach((val, i) => {
      if (v[i]) return;
      const p = produitDe(i);
      const a = restants.find((x) => !pris.has(x.numeroSerie) && critere(p, x));
      if (a) {
        v[i] = a.numeroSerie;
        pris.add(a.numeroSerie);
        places.push({ ...a, produit: (unites[i] || {}).produit });
      }
    });
  const tt = (p) => typeTecTech(p.tectechType),
    ct = (p) => categorieTecTech(p.tectechCategorie);
  tenter((p, a) => tt(p) && a.type && tt(p) === a.type && ct(p) && a.categorie && ct(p) === a.categorie); // type + catégorie
  tenter((p, a) => tt(p) && a.type && tt(p) === a.type && (!ct(p) || !a.categorie)); // type seul (catégorie inconnue)
  tenter((p, a) => !tt(p) && !a.type); // rien de configuré : dans l'ordre
  tenter((p, a) => !a.type); // type inconnu (tec.tech indisponible) : dans l'ordre
  return {
    valeurs: v,
    places,
    nonPlaces: restants.filter((a) => !pris.has(a.numeroSerie)),
    lignesVides: v.filter((x) => !x).length,
  };
}
/** Texte d'un appareil non placé : « numéro (type · catégorie) ». */
const libelleNonPlace = (a) =>
  `${a.numeroSerie}${a.type ? ` (${[a.type.replace(/_/g, ' ').toLowerCase(), a.categorie].filter(Boolean).join(' · ')})` : ''}`;
