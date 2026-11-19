// Génère les icônes 192 et 512 px à partir de logoApp.png (npm run icons)
import sharp from 'sharp';
for (const taille of [192, 512]) {
  await sharp('logoApp.png').resize(taille, taille, { fit: 'contain', background: '#0a0a0a' }).png().toFile(`icons/icon-${taille}.png`);
  console.log(`icons/icon-${taille}.png`);
}
