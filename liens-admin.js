/* ════════════════════════════════════════════════════════════════════════════════════
   liens-admin.js — « Liens utiles » (Réglages) : des fichiers à ouvrir d'un clic là où on en a
   besoin (ex. le classeur de numérotation des factures dans « Nouvelle facture »), sans aller
   fouiller le Drive.
   · Réglages : liste modifiable (libellé, adresse https://, où l'afficher) ;
   · boutonsLiensRaccourcis(contexte) : rangée de boutons à insérer dans une modale / une étape
     ('facture' = Nouvelle facture, 'devis' = Nouveau devis, 'commande' = fiche d'une commande,
     au moment de générer devis et facture).
   Stockage : Config LIENS_RACCOURCIS (JSON), route reglages-set { liensRaccourcis }.
   S'appuie sur les fonctions globales d'app.js (state, icon, echapper, poster, etat, render).
   ════════════════════════════════════════════════════════════════════════════════════ */
const LR_CONTEXTES = [
  { cle: 'facture', libelle: 'Nouvelle facture' },
  { cle: 'devis', libelle: 'Nouveau devis' },
  { cle: 'commande', libelle: 'Fiche commande' },
];
const lr = { edition: null, modifie: false };

function lrListe(){ return ((state.reglages || {}).liensRaccourcis) || []; }
function lrUrlValide(u){ return /^https:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()); }

/** Type de fichier d'après l'adresse — pour l'icône et le sous-titre du bouton. */
function lrType(url){
  const u = String(url || '');
  if(/docs\.google\.com\/spreadsheets/.test(u)) return { cls: 'sheets', txt: 'Google Sheets', svg: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 9v12"/>' };
  if(/docs\.google\.com\/document/.test(u)) return { cls: 'docs', txt: 'Google Docs', svg: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>' };
  if(/docs\.google\.com\/presentation/.test(u)) return { cls: 'slides', txt: 'Google Slides', svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 19v2M16 19v2M7 10h10"/>' };
  if(/drive\.google\.com/.test(u)) return { cls: 'drive', txt: 'Google Drive', svg: '<path d="M8 3h8l6 10-4 7H6l-4-7z"/><path d="M8 3l6 10h8M2 13h12l-4 7"/>' };
  if(/sharepoint\.com|onedrive/.test(u)) return { cls: 'docs', txt: 'SharePoint', svg: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>' };
  let hote = ''; try{ hote = new URL(u).hostname.replace(/^www\./, ''); }catch(e){}
  return { cls: 'web', txt: hote || 'Lien', svg: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>' };
}

/** Boutons des liens à afficher dans un contexte ('facture' | 'devis' | 'commande'). '' si aucun. */
function boutonsLiensRaccourcis(contexte, titre){
  const liens = lrListe().filter(l => (l.ou || []).includes(contexte) && lrUrlValide(l.url));
  if(!liens.length) return '';
  return `<div class="lr-zone">
    ${titre === false ? '' : `<div class="lr-zone-titre">${icon('lien_externe', 13)}${echapper(titre || 'Fichiers utiles')}</div>`}
    <div class="lr-liens">${liens.map(l => { const t = lrType(l.url); return `
      <a class="lr-lien" href="${echapper(l.url)}" target="_blank" rel="noopener noreferrer" title="Ouvrir dans un nouvel onglet">
        <span class="lr-ic ${t.cls}" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.svg}</svg></span>
        <span class="lr-txt"><b>${echapper(l.libelle)}</b><small>${echapper(t.txt)}</small></span>
        <span class="lr-go" aria-hidden="true">${icon('lien_externe', 14)}</span>
      </a>`; }).join('')}</div>
  </div>`;
}
window.boutonsLiensRaccourcis = boutonsLiensRaccourcis;

/* ── Réglages ─────────────────────────────────────────────────────────────────────── */
function lrEdition(){
  if(!lr.edition) lr.edition = lrListe().map(l => ({ libelle: l.libelle, url: l.url, ou: [...(l.ou || [])] }));
  return lr.edition;
}
function sectionLiensUtiles(){
  const liste = lrEdition();
  const lignes = liste.map((l, i) => {
    const urlKo = l.url.trim() && !lrUrlValide(l.url);
    const t = lrType(l.url);
    return `
    <div class="lr-ligne" data-lr-ligne="${i}">
      <span class="lr-ic ${l.url.trim() && !urlKo ? t.cls : 'web'}" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.svg}</svg></span>
      <div class="lr-champs">
        <input class="input" data-lr="libelle" data-i="${i}" value="${echapper(l.libelle)}" placeholder="Nom affiché (ex. Numérotation des factures)" maxlength="60" aria-label="Nom du lien">
        <input class="input${urlKo ? ' lr-ko' : ''}" data-lr="url" data-i="${i}" value="${echapper(l.url)}" placeholder="https://docs.google.com/…" aria-label="Adresse du fichier" inputmode="url">
        <div class="lr-ou" role="group" aria-label="Où afficher ce lien">
          <span>Afficher dans</span>
          ${LR_CONTEXTES.map(c => `<button type="button" class="lr-puce${l.ou.includes(c.cle) ? ' on' : ''}" data-lr-ou="${c.cle}" data-i="${i}" aria-pressed="${l.ou.includes(c.cle)}">${l.ou.includes(c.cle) ? icon('check', 12) : ''}${echapper(c.libelle)}</button>`).join('')}
        </div>
        ${urlKo ? '<div class="lr-erreur">L’adresse doit commencer par https://</div>' : ''}
      </div>
      <button type="button" class="btn btn-ghost btn-icon lr-suppr" data-lr-suppr="${i}" title="Retirer ce lien" aria-label="Retirer ce lien">${icon('trash', 15)}</button>
    </div>`;
  }).join('');
  return `
    <div class="lr-liste">${lignes || '<div class="lr-vide">Aucun lien pour l’instant. Ajoutez par exemple le classeur de numérotation des factures : il apparaîtra dans « Nouvelle facture ».</div>'}</div>
    <div class="rg-actions">
      <button type="button" class="btn btn-secondary" data-lr-ajouter>${icon('plus', 15)}Ajouter un lien</button>
      <button type="button" class="btn btn-primary" data-lr-enregistrer ${lr.modifie ? '' : 'disabled'}>Enregistrer les liens</button>
    </div>`;
}
window.sectionLiensUtiles = sectionLiensUtiles;

async function lrEnregistrer(){
  const liste = lrEdition().map(l => ({ libelle: l.libelle.trim(), url: l.url.trim(), ou: l.ou }))
    .filter(l => l.libelle || l.url);
  const ko = liste.find(l => !l.libelle || !lrUrlValide(l.url));
  if(ko){ etat(!ko.libelle ? 'Chaque lien a besoin d’un nom.' : 'Une adresse ne commence pas par https://', 'erreur'); return; }
  if(liste.some(l => !l.ou.length) && !await confirmerCvdl('Un lien n’est affiché nulle part (aucune case « Afficher dans »). Enregistrer quand même ?')) return;
  const bouton = document.querySelector('[data-lr-enregistrer]'); if(bouton) bouton.disabled = true;
  const r = await poster({ action: 'reglages-set', champ: 'liensRaccourcis', valeur: liste });
  if(r && r.ok){
    state.reglages.liensRaccourcis = liste;
    lr.edition = null; lr.modifie = false;
    etat('Liens enregistrés', 'succes');
    render();
  }else{ etat((r && r.erreur) || 'Enregistrement impossible', 'erreur'); if(bouton) bouton.disabled = false; }
}

document.addEventListener('input', e => {
  const el = e.target.closest('[data-lr]'); if(!el) return;
  const l = lrEdition()[parseInt(el.dataset.i, 10)]; if(!l) return;
  l[el.dataset.lr] = el.value; lr.modifie = true;
  const b = document.querySelector('[data-lr-enregistrer]'); if(b) b.disabled = false;
});
document.addEventListener('change', e => {
  // Re-rendu à la sortie du champ adresse : icône du type de fichier + contrôle https.
  const el = e.target.closest('[data-lr="url"]'); if(el) render();
});
document.addEventListener('click', e => {
  if(e.target.closest('[data-lr-ajouter]')){
    lrEdition().push({ libelle: '', url: '', ou: ['facture'] }); lr.modifie = true; render();
    const champs = document.querySelectorAll('[data-lr="libelle"]'); if(champs.length) champs[champs.length - 1].focus();
    return;
  }
  const s = e.target.closest('[data-lr-suppr]');
  if(s){ lrEdition().splice(parseInt(s.dataset.lrSuppr, 10), 1); lr.modifie = true; render(); return; }
  const p = e.target.closest('[data-lr-ou]');
  if(p){
    const l = lrEdition()[parseInt(p.dataset.i, 10)]; if(!l) return;
    const c = p.dataset.lrOu;
    l.ou = l.ou.includes(c) ? l.ou.filter(x => x !== c) : [...l.ou, c];
    lr.modifie = true; render(); return;
  }
  if(e.target.closest('[data-lr-enregistrer]')) lrEnregistrer();
});
