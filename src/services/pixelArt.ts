import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config';

const petPatterns: Record<string, string[]> = {
  dog: [
    '    ####    ', '   ######   ', '  ##@@@@##  ', '  #@@..@@#  ',
    '  #@@..@@#  ', '   #@**@#   ', '    ####    ', '   ######   ',
    '  ##@@@@##  ', '  #@@@@@@#  ', '   #@##@#   ', '   # ## #   ',
  ],
  cat: [
    ' ##    ##   ', '#@@#  #@@#  ', ' #@@@@@@#   ', ' #@@..@@#   ',
    ' #@@..@@#   ', '  #@**@#    ', '   ####     ', '  #@@@@#    ',
    '  #@@@@#    ', '   #@@#     ', '  ## ##~~   ', ' #    # ~~  ',
  ],
  hamster: [
    '   ######   ', '  ########  ', ' ##@@@@@@## ', ' #@@....@@# ',
    '##@@....@@##', '#@@@@**@@@@#', '#@@@@@@@@@@#', ' #@@@@@@@@# ',
    '  ########  ', '   ######   ', '    ####    ', '            ',
  ],
  bunny: [
    '  ##  ##    ', ' #@@##@@#   ', ' #@@##@@#   ', ' #@@@@@@#   ',
    '#@@....@@#  ', '#@@....@@#  ', ' #@@**@@#   ', '  ######    ',
    ' #@@@@@@#   ', '  #@##@#    ', ' ## ## ##   ', '            ',
  ],
  bird: [
    '    ###     ', '   #@@@#    ', '  #@@@@@#   ', '  #@@.@@#   ',
    ' ##@@.@@##  ', '#@@#**#@@#  ', '#@@@@@@@@ # ', ' #@@@@@@@#  ',
    '  #@@@@@#   ', '   #@@@#    ', '    # #     ', '   #   #    ',
  ],
  turtle: [
    '    ####    ', '  ##@@@@##  ', ' #@@..@@#   ', '  #@@@@#    ',
    '###****###  ', '#@@#***#@@# ', '#@@#***#@@# ', '###****###  ',
    '  ######    ', ' #  #  #    ', '#  #  #  #  ', '            ',
  ],
  lizard: [
    '   ###      ', '  #@@@#     ', ' #@@.@@#    ', '  #@*@#     ',
    '   ###      ', '  #@@@#     ', ' #@@@@@#    ', '##@@@@@##   ',
    '#  ###  #   ', '   ###      ', '  #   #~~~~ ', '       ~~~~ ',
  ],
  fish: [
    '            ', '     ###    ', '   ##@@@##  ', ' ##@@..@@## ',
    '#@@@@..@@@@#', '#@@@@@*@@@@#', ' #@@@@@@@@# ', '  ##@@@##   ',
    '    ###     ', '            ', '            ', '            ',
  ],
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shiftHue(hex: string, deg: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = (h + deg / 360 + 1) % 1;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return s === 0 ? `#${toHex(l)}${toHex(l)}${toHex(l)}` 
    : `#${toHex(hue2rgb(p, q, h + 1/3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1/3))}`;
}

export function generatePixelArt(petType: string, seed: string, size = 256): string {
  const pattern = petPatterns[petType] || petPatterns.dog;
  const colors = config.petColors[petType] || config.petColors.dog;
  const hueShift = (hashCode(seed) % 30) - 15;
  const adj = {
    primary: shiftHue(colors.primary, hueShift),
    secondary: shiftHue(colors.secondary, hueShift),
    accent: shiftHue(colors.accent, hueShift / 2),
    eye: colors.eye,
  };
  const ps = Math.floor(size / 12);
  const pixels: string[] = [];
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      const c = pattern[y][x];
      let col: string | null = null;
      if (c === '#') col = adj.secondary;
      else if (c === '@') col = adj.primary;
      else if (c === '.') col = adj.eye;
      else if (c === '*' || c === '~') col = adj.accent;
      if (col) pixels.push(`<rect x="${x*ps}" y="${y*ps}" width="${ps}" height="${ps}" fill="${col}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" style="image-rendering:pixelated"><rect width="100%" height="100%" fill="#FFF8F0"/>${pixels.join('')}</svg>`;
}

export function savePixelArt(petType: string, tokenId: string, outDir = './public/pets'): { url: string; path: string } {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const svg = generatePixelArt(petType, tokenId);
  const path = join(outDir, `${tokenId}.svg`);
  writeFileSync(path, svg);
  return { url: `/pets/${tokenId}.svg`, path };
}
