import sharp from 'sharp';
import { writeFileSync } from 'fs';

const W = 1200, H = 630;
const R = 130; // circle radius
const CX1 = 730, CY1 = 215; // top-right
const CX2 = 470, CY2 = 415; // bottom-left
const CX3 = 730, CY3 = 415; // bottom-right

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <circle cx="${CX1}" cy="${CY1}" r="${R}" fill="#FF8C42"/>
  <circle cx="${CX2}" cy="${CY2}" r="${R}" fill="#17BEBB"/>
  <circle cx="${CX3}" cy="${CY3}" r="${R}" fill="#5B53E8"/>
</svg>`;

const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync('./public/og.png', buffer);
console.log('og.png generated');
