/* ================================================================
   illustrations.js — Les 54 illustrations SVG animées (data/illustrations.json)
   Utilisées telles quelles. On renomme seulement leurs identifiants internes
   (dégradés) pour qu'il n'y ait pas de doublons quand plusieurs SVG
   sont affichés sur la même page.
================================================================ */
let svgs = {};
let numero = 0;

export async function chargerIllustrations() {
  svgs = await (await fetch('data/illustrations.json')).json();
}

// Renvoie le HTML d'une illustration de taille w × h (px)
export function illu(kind, w, h) {
  const brut = svgs[kind] || svgs.generic || '';
  numero += 1;
  const suffixe = '_' + numero;
  const svg = brut
    .replace(/id="(pdc\w+)"/g, (m, id) => `id="${id}${suffixe}"`)
    .replace(/url\(#(pdc\w+)\)/g, (m, id) => `url(#${id}${suffixe})`)
    .replace(/href="#(pdc\w+)"/g, (m, id) => `href="#${id}${suffixe}"`);
  return `<span class="illu" style="width:${w}px;height:${h}px">${svg}</span>`;
}
