// Writes v7parts/K2.html and K2.he.html: the "Reverse the build" cubes (homepage #reverse).
// The markup is the FINAL state (old tower collapsed into a pile; Mate's column at the goal, On track).
// All geometry lives here; K2.js reads it from data attributes (data-tower, data-pile, data-at, data-pivot),
// so the animation always ends on exactly this markup.  Usage: node src/v7/tools/k2frag.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = join(dirname(fileURLToPath(import.meta.url)), '..', 'v7parts');
const W = 400, H = 300;              // viewBox of each act (the stage keeps this aspect ratio)
const s = 26, c = s * Math.cos(Math.PI / 6);
const f = (n) => +n.toFixed(2);
const pct = (n, of) => f(n / of * 100) + '%';

// one cube, origin = centre of its bottom face
const TOP = `M0 ${-s / 2}L${f(c)} ${-s}L0 ${-1.5 * s}L${f(-c)} ${-s}Z`;
const LEFT = `M${f(-c)} ${-s}L0 ${-s / 2}L0 ${s / 2}L${f(-c)} 0Z`;
const RIGHT = `M${f(c)} ${-s}L0 ${-s / 2}L0 ${s / 2}L${f(c)} 0Z`;
const cube = (cls, attrs, t, glint) =>
  `<g class="k2-cube ${cls}"${attrs} style="transform:${t}"><path class="k2-l" d="${LEFT}"/><path class="k2-r" d="${RIGHT}"/><path class="k2-t" d="${TOP}"/>${glint ? `<path class="k2-glint" d="${TOP}"/>` : ''}</g>`;
const tf = (x, y, r) => `translate(${f(x)}px,${f(y)}px)` + (r ? ` rotate(${r}deg)` : '');
const floor = (x, y, hw) => { const hh = hw * Math.tan(Math.PI / 6); return `<path class="k2-floor" d="M${x} ${f(y - hh)}L${x + hw} ${y}L${x} ${f(y + hh)}L${x - hw} ${y}Z"/>`; };

// ---- Act 1: the old way. Tower at O1 (iso offsets make it wobble), then a pile on the floor.
const O1 = { x: 168, y: 214 };
const iso1 = (u, v, h) => ({ x: O1.x + (u - v) * c, y: O1.y + (u + v) * s / 2 - h * s });
const TOWER = [[0, 0, 0], [.1, -.04, 0], [-.06, .08, -1.5], [.16, -.06, 2], [.04, .12, -1], [.26, 0, 2.5]]; // u v rot
const PILE = [[0, 0, 0, 0], [1.02, .08, 0, 0], [1.1, .04, 1, 0], [.12, 1.22, 0, 0], [2.12, .26, 0, -4], [1.46, 1.24, 0, 0]]; // u v h rot (painter order)
const pivot = { x: f(O1.x + c), y: O1.y };
const oldCubes = TOWER.map(([u, v, r], i) => {
  const t = iso1(u, v, i), [pu, pv, ph, pr] = PILE[i], p = iso1(pu, pv, ph);
  return cube('is-old', ` data-tower="${f(t.x)},${f(t.y)},${r}" data-pile="${f(p.x)},${f(p.y)},${pr}"`, tf(p.x, p.y, pr), false);
});
const WHY = { x: O1.x - 64, y: O1.y - 4.4 * s };

// ---- Act 2: our way. Goal line first, then a clean column of 5 that tops out exactly on it.
const O2 = { x: 176, y: 214 }, N = 5;
const goalY = O2.y - (N - 1) * s - 1.5 * s;        // the top cube's back corner touches the line
const newCubes = Array.from({ length: N }, (_, i) => cube('is-mate', ` data-at="${O2.x},${O2.y - i * s}"`, tf(O2.x, O2.y - i * s), true));
const gx = O2.x, top = (N - 1) * s;
const GHOST = `M${gx} ${O2.y + s / 2}L${f(gx + c)} ${O2.y}L${f(gx + c)} ${O2.y - top - s}L${gx} ${goalY}L${f(gx - c)} ${O2.y - top - s}L${f(gx - c)} ${O2.y}Z`
  + Array.from({ length: N }, (_, i) => `M${f(gx - c)} ${O2.y - i * s - s}L${gx} ${O2.y - i * s - s / 2}L${f(gx + c)} ${O2.y - i * s - s}`).join('');
const LINE = { x1: 44, x2: 356 };

const T = {
  en: { old: 'Old way: build first.', mine: 'Our way: start with the number.', why: 'why?', goal: 'Goal', ok: 'On track',
    cap: 'Animation. Old way: build first. Blocks are stacked with no target, someone asks why, and the tower falls into a pile. Our way: start with the number. A goal of 90% is set first, then Mate’s blocks are stacked in a straight column that reaches the goal line, and the goal shows On track.',
    pause: 'Pause animation' },
  he: { old: 'הדרך הישנה: בונים קודם.', mine: 'הדרך שלנו: מתחילים מהמספר.', why: 'למה?', goal: 'יעד', ok: 'כמתוכנן',
    cap: 'אנימציה. הדרך הישנה: בונים קודם. קוביות נערמות בלי יעד, מישהו שואל למה, והמגדל קורס לערימה. הדרך שלנו: מתחילים מהמספר. קודם נקבע יעד של 90%, ואז הקוביות של Mate נערמות בעמודה ישרה שמגיעה לקו היעד, והיעד מסומן כמתוכנן.',
    pause: 'השהיית האנימציה' },
};

function html(L) {
  const t = T[L];
  const sv = (inner) => `<svg class="k2-svg" viewBox="0 0 ${W} ${H}" focusable="false">${inner}</svg>`;
  return `<figure class="v7-figure k2">
  <div class="v7-mock k2-stage" data-v7-mock="K2" data-v7-play="loop" data-v7-threshold=".5" aria-hidden="true" inert>
    <div class="k2-act" data-act="old">
      <p class="k2-label"><i></i>${t.old}</p>
      <div class="k2-pic">
        ${sv(`${floor(O1.x + 22, O1.y + 12, 112)}<g class="k2-tower" style="transform-origin:${pivot.x}px ${pivot.y}px" data-pivot="${pivot.x},${pivot.y}">${oldCubes.join('')}</g>`)}
        <span class="k2-why" style="left:${pct(WHY.x, W)};top:${pct(WHY.y, H)}">${t.why}</span>
      </div>
    </div>
    <div class="k2-act" data-act="new">
      <p class="k2-label"><i></i>${t.mine}</p>
      <div class="k2-pic">
        ${sv(`${floor(O2.x, O2.y + 12, 112)}<path class="k2-ghost" d="${GHOST}"/><g class="k2-goal"><line class="k2-goal-line" x1="${LINE.x1}" y1="${goalY}" x2="${LINE.x2}" y2="${goalY}"/><circle class="k2-goal-end" cx="${LINE.x2}" cy="${goalY}" r="3.5"/></g>${newCubes.join('')}`)}
        <span class="k2-flag" style="left:${pct(LINE.x2, W)};top:${pct(goalY, H)}"><span class="v7-chip is-you"><b>${t.goal}</b><bdi>90%</bdi></span></span>
        <span class="k2-ok" style="left:${pct(O2.x + c + 18, W)};top:${pct(goalY + 1.2 * s, H)}"><span class="v7-pill" data-tone="ok"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-check"/></svg>${t.ok}</span></span>
      </div>
    </div>
  </div>
  <figcaption class="sr-only">${t.cap}</figcaption>
  <button class="v7-pause" type="button" aria-label="${t.pause}"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>
</figure>
`;
}
writeFileSync(join(P, 'K2.html'), html('en'));
writeFileSync(join(P, 'K2.he.html'), html('he'));
console.log('wrote K2.html, K2.he.html');
