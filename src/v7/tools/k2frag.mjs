// Writes v7parts/K2.html and K2.he.html: the "Reverse the build" toy-block towers (homepage #reverse).
// One stage, two acts. Act 1: a wobbly tower of things companies buy first falls into a pile. Act 2: the goal block
// appears first, high up, and the tower builds DOWNWARD under it until it touches the ground: On track.
// The markup is the FINAL state (act 2's tower complete; on a wide stage the act-1 pile rests small and faded to the side).
// All geometry is in stage units (u = one block height, set in K2.css from the stage width) and lives here:
// every block carries its final place as CSS custom properties (--x --y --r) and its act positions as data attributes
// (data-tower, data-pile), which K2.js reads, so the animation always ends on exactly this markup.
// x is from the stage centre, left to right in LTR and mirrored in RTL (K2.css and K2.js multiply it by the direction),
// y is up from the ground, r is degrees (clockwise in LTR, mirrored in RTL).
// Usage: node src/v7/tools/k2frag.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = join(dirname(fileURLToPath(import.meta.url)), '..', 'v7parts');
const f = (n) => +(+n).toFixed(3);

// lowest point of a w x h block rotated by r (clockwise) about its bottom centre, as a lift above the ground
function lift(w, h, r) {
  const a = r * Math.PI / 180, ys = [];
  for (const [x, y] of [[-w / 2, 0], [w / 2, 0], [-w / 2, h], [w / 2, h]]) ys.push(-x * Math.sin(a) + y * Math.cos(a));
  return -Math.min(...ys);
}

// ---- Act 1: the old way. Bottom to top. x/r = how each block sits in the wobbly tower; pile = where it ends.
// pile: [x, yOnTopOf, r]: yOnTopOf is the height of whatever it lands on (0 = the ground); the lift for the rotation is added.
const OLD = [
  { k: 'crm', tone: 'o1', w: 2.5, h: .95, x: 0, r: 0, pile: [.3, 0, 0] },
  { k: 'app', tone: 'o2', w: 1.7, h: 1.0, x: .32, r: 1.2, pile: [-1.8, 0, -8] },
  { k: 'bot', tone: 'o3', w: 1.3, h: 1.1, x: -.22, r: -1.6, pile: [-2.75, 0, -84] },
  { k: 'excel', tone: 'o4', w: 2.4, h: .75, x: .5, r: 2.4, pile: [.12, .95, 5] },
  { k: 'dash', tone: 'o5', w: 2.6, h: .9, x: .02, r: -3.2, pile: [-1.05, 0, 14] },
];
{ let y = 0; for (const b of OLD) { b.y = y; y += b.h; } }
const PILE_DX = .3;                                    // the whole pile, nudged back toward the centre
for (const b of OLD) { const [x, on, r] = b.pile; b.py = on + lift(b.w, b.h, r); b.px = x + PILE_DX; b.pr = r; }
const PIVOT = OLD[0].x - OLD[0].w / 2;                 // the tower tips over its base's inline-start corner

// ---- Act 2: our way. Bottom to top (paint order); K2.js plays them top-down after the goal.
const NEW = [
  { k: 'data', tone: 'data', w: 3.0, h: 1.0, icon: 'db' },
  { k: 'person', tone: 'person', w: 2.3, h: .9, icon: 'person' },
  { k: 'flow', tone: 'flow', w: 2.3, h: .9, icon: 'flow' },
  { k: 'flow2', tone: 'flow', w: 2.3, h: .9, icon: 'flow' },
  { k: 'goal', tone: 'goal', w: 2.3, h: 1.05 },
];
{ let y = 0; for (const b of NEW) { b.y = y; y += b.h; } }
const GOAL = NEW[NEW.length - 1];

const T = {
  en: {
    old: 'Old way: build to replace a flow.', mine: 'Our way: build to achieve a business goal.', why: 'why?', goal: 'Goal', ok: 'On track', oldTag: 'Old way',
    lab: { crm: 'CRM', app: 'App', bot: 'Bot', excel: 'Excel', dash: 'Dashboard', data: 'Your data', person: 'Person', flow: 'Flow', flow2: 'Flow', goal: '90%' },
    cap: 'Animation of two block towers. Old way: build to replace a flow. Blocks labelled CRM, App, Bot, Excel and Dashboard are stacked with no target; the tower wobbles, someone asks why, and it falls into a pile. Our way: build to achieve a business goal. A goal block of 90% appears first, high up. Then the tower is built downward beneath it: two Flow blocks, a Person block and Your data at the base. When the base touches the ground the tower stands straight, and the goal shows On track.',
    pause: 'Pause animation',
  },
  he: {
    old: 'הדרך הישנה: בונים כדי להחליף תהליך.', mine: 'הדרך שלנו: בונים כדי להשיג יעד עסקי.', why: 'למה?', goal: 'יעד', ok: 'כמתוכנן', oldTag: 'הדרך הישנה',
    lab: { crm: '<bdi>CRM</bdi>', app: 'אפליקציה', bot: 'בוט', excel: 'אקסל', dash: 'דשבורד', data: 'הנתונים שלכם', person: 'אדם', flow: 'תהליך', flow2: 'תהליך', goal: '<bdi>90%</bdi>' },
    cap: 'אנימציה של שני מגדלי קוביות. הדרך הישנה: בונים כדי להחליף תהליך. קוביות בשם CRM, אפליקציה, בוט, אקסל ודשבורד נערמות בלי יעד; המגדל מתנדנד, מישהו שואל למה, והוא קורס לערימה. הדרך שלנו: בונים כדי להשיג יעד עסקי. קודם מופיעה למעלה קוביית יעד של 90%. אחר כך המגדל נבנה כלפי מטה מתחתיה: שתי קוביות תהליך, קוביית אדם, ובבסיס הנתונים שלכם. כשהבסיס נוגע בקרקע המגדל עומד ישר, והיעד מסומן כמתוכנן.',
    pause: 'השהיית האנימציה',
  },
};

const vars = (o) => Object.entries(o).map(([k, v]) => `--${k}:${f(v)}`).join(';');
const icon = (id) => `<svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
const block = (b, label, attrs, at) =>
  `<span class="k2-b" data-tone="${b.tone}"${attrs} style="${vars({ w: b.w, h: b.h, x: at[0], y: at[1], r: at[2] })}"><i class="k2-lid"></i><b class="k2-f">${b.icon ? icon(b.icon) : ''}<span>${label}</span></b></span>`;

function html(L) {
  const t = T[L];
  const old = OLD.map((b) => block(b, t.lab[b.k], ` data-tower="${f(b.x)},${f(b.y)},${b.r}" data-pile="${f(b.px)},${f(b.py)},${b.pr}"`, [b.px, b.py, b.pr]));
  const neu = NEW.map((b) => block(b, t.lab[b.k], b === GOAL ? ' data-goal' : '', [0, b.y, 0]));
  return `<figure class="v7-figure k2">
  <div class="v7-mock k2-stage" data-v7-mock="K2" data-v7-play="loop" data-v7-threshold=".5" data-pivot="${f(PIVOT)}" aria-hidden="true" inert>
    <i class="k2-probe"></i><i class="k2-ground"></i>
    <p class="k2-cap" data-act="old"><i></i>${t.old}</p>
    <p class="k2-cap" data-act="new"><i></i>${t.mine}</p>
    <div class="k2-old"><i class="k2-shadow"></i>${old.join('')}</div>
    <span class="k2-oldtag">${t.oldTag}</span>
    <span class="k2-why" style="${vars({ x: 2.3, y: OLD.reduce((s, b) => s + b.h, 0) + .45 })}">${t.why}</span>
    <div class="k2-new"><i class="k2-shadow"></i>${neu.join('')}</div>
    <span class="k2-tag" style="${vars({ x: -(GOAL.w / 2 + .22), y: GOAL.y + GOAL.h / 2 })}">${t.goal}</span>
    <span class="k2-ok" style="${vars({ x: GOAL.w / 2 + .22, y: GOAL.y + GOAL.h / 2 })}"><i>${icon('check')}</i>${t.ok}</span>
  </div>
  <figcaption class="sr-only">${t.cap}</figcaption>
  <button class="v7-pause" type="button" aria-label="${t.pause}"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-pause"/></svg></button>
</figure>
`;
}
writeFileSync(join(P, 'K2.html'), html('en'));
writeFileSync(join(P, 'K2.he.html'), html('he'));
console.log('wrote K2.html, K2.he.html');
