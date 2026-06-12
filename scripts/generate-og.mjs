import sharp from 'sharp';
import { writeFileSync } from 'fs';

const W = 1200, H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      .title { font-family: Georgia, serif; font-weight: 700; font-size: 96px; fill: #FFFFFF; letter-spacing: -2px; }
      .ai    { font-family: Georgia, serif; font-weight: 700; font-size: 96px; fill: #FF8C42; letter-spacing: -2px; }
      .tag   { font-family: Georgia, serif; font-weight: 400; font-size: 30px; fill: rgba(255,255,255,0.55); letter-spacing: 0; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#14141E"/>

  <!-- Subtle gradient overlay -->
  <defs>
    <radialGradient id="glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#FF8C42" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#14141E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Logo mark — 3 circles in 2×2 grid, top-left empty, centered at 600,215 -->
  <circle cx="548" cy="163" r="54" fill="#FF8C42"/>
  <circle cx="440" cy="271" r="54" fill="#17BEBB"/>
  <circle cx="548" cy="271" r="54" fill="#5B53E8"/>

  <!-- wordmark -->
  <text x="624" y="235" class="title">mateos<tspan class="ai">.ai</tspan></text>

  <!-- tagline -->
  <text x="600" y="390" text-anchor="middle" class="tag">The perfect assistant, every step of the funnel.</text>
</svg>`;

const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync('./public/og.png', buffer);
console.log('og.png generated');
