// Writes v7parts/K2.html and K2.he.html: the "Reverse the build" flows (homepage #reverse).
// Two panels of small isometric cubes on an isometric floor tile, side by side on wide screens, stacked below 760px.
// Old way: a flow of three human steps (start → person → person → person) is automated step by step (each person cube
// becomes a grey gear cube in the same place; the middle person stays). There is no goal: the run reaches the end of the flow, and then: why?
// Our way: the goal line (Goal 90%) comes FIRST; then the flow is built BACKWARDS from it, the step nearest the goal
// first (Mate, approval by a person, Mate), until it reaches the start. The line lights up, a run reaches the goal: On track.
// The markup is the FINAL state (both panels complete). All geometry and copy live here; K2.js reads the motion targets
// from data attributes (data-at, data-run), so the animation always ends on exactly this markup.
// Hebrew mirrors the flow (the goal sits on the left): every x is mirrored, the cubes themselves are not.
// Usage: node src/v7/tools/k2frag.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = join(dirname(fileURLToPath(import.meta.url)), '..', 'v7parts');
const W = 400, H = 280;                  // viewBox of each panel (the picture keeps this aspect ratio)
const s = 27, c = s * Math.cos(Math.PI / 6), t30 = Math.tan(Math.PI / 6);
const f = (n) => +(+n).toFixed(2);
const pct = (n, of) => f(n / of * 100) + '%';

// ---- the floor tile and the flow line (y = FY), shared by both panels
const FX = 200, FY = 160, HW = 186, HH = HW * t30, SLAB = 7;
const START = 42, GOAL = 360, POLE = 118;          // flow start, goal line x, goal line height above the floor
const OLD = { steps: [110, 192, 274], end: 340 };  // old way: three person steps, the flow ends at `end` (no goal)
const NEW = { steps: [128, 214, 300] };            // our way: Mate, approval, Mate (built from the goal backwards)
const NEW_KIND = ['mate', 'you', 'mate'];
const OLD_KEEP = 1;                                // old way: this step stays a person (not automated)

// one cube, origin = centre of its bottom face (on the floor)
const TOP = `M0 ${-s / 2}L${f(c)} ${-s}L0 ${-1.5 * s}L${f(-c)} ${-s}Z`;
const LEFT = `M${f(-c)} ${-s}L0 ${-s / 2}L0 ${s / 2}L${f(-c)} 0Z`;
const RIGHT = `M${f(c)} ${-s}L0 ${-s / 2}L0 ${s / 2}L${f(c)} 0Z`;
// glyphs, drawn on the cube's left face (skewed onto it): centred on (0,0), about 12 units
const GLYPH = {
  person: '<circle cx="0" cy="-3.1" r="2.7"/><path d="M-4.7 5.6C-4.7 1.6 -2.6 .2 0 .2S4.7 1.6 4.7 5.6Z"/>',
  gear: '<circle class="k2-ring" cx="0" cy="0" r="3"/>' + Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4, x1 = 4.3 * Math.cos(a), y1 = 4.3 * Math.sin(a), x2 = 6 * Math.cos(a), y2 = 6 * Math.sin(a);
    return `<path class="k2-tooth" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
  }).join(''),
  mate: '<circle cx="2.3" cy="-2.3" r="2"/><circle cx="-2.3" cy="2.3" r="2"/><circle cx="2.3" cy="2.3" r="2"/>',
};
const glyph = (k) => `<g class="k2-gl" transform="translate(${f(-c / 2)} ${f(-s / 4)}) skewY(30) scale(1.3)">${GLYPH[k]}</g>`;
const cube = (kind, g, x, extra = '') =>
  `<g class="k2-cube is-${kind}" data-at="${f(x)},${FY}"${extra} style="transform:translate(${f(x)}px,${FY}px)"><path class="k2-l" d="${LEFT}"/><path class="k2-r" d="${RIGHT}"/><path class="k2-t" d="${TOP}"/>${glyph(g)}<path class="k2-glint" d="${TOP}"/></g>`;

function floor() {
  const y0 = FY - HH, y1 = FY + HH;
  return `<path class="k2-slab" d="M${FX - HW} ${FY}L${FX} ${f(y1)}L${FX + HW} ${FY}L${FX + HW} ${FY + SLAB}L${FX} ${f(y1 + SLAB)}L${FX - HW} ${FY + SLAB}Z"/>`
    + `<path class="k2-floor" d="M${FX} ${f(y0)}L${FX + HW} ${FY}L${FX} ${f(y1)}L${FX - HW} ${FY}Z"/>`;
}
const disc = (cls, x, rx) => `<ellipse class="${cls}" cx="${f(x)}" cy="${FY}" rx="${rx}" ry="${f(rx * t30 * 1.0)}"/>`;

function panel(L, act) {
  const m = (x) => (L === 'he' ? W - x : x), dir = L === 'he' ? -1 : 1;
  const chev = (x) => `<path class="k2-chev" d="M${f(m(x) - 3 * dir)} ${FY - 3.6}L${f(m(x) + 1.8 * dir)} ${FY}L${f(m(x) - 3 * dir)} ${FY + 3.6}"/>`;
  // a segment of the flow line from a to b (flow coordinates); `grow` = where it grows from ('a' or 'b')
  const seg = (a, b, grow, cls = 'k2-seg', arrow = true) => {
    const o = grow === 'a' ? m(a) : m(b);
    return `<g class="${cls}" style="transform-origin:${f(o)}px ${FY}px"><path class="k2-line" d="M${f(m(a))} ${FY}H${f(m(b))}"/>${arrow ? chev((a + b) / 2 + 2) : ''}</g>`;
  };
  const gap = 3 + c;                       // the line ends this far from a cube's centre (hidden under it anyway)
  const goal = `<g class="k2-goal"><path class="k2-pole" d="M${m(GOAL)} ${FY}V${FY - POLE}"/>${disc('k2-goal-base', m(GOAL), 9)}<circle class="k2-pole-top" cx="${m(GOAL)}" cy="${FY - POLE}" r="3"/></g>`;
  if (act === 'old') {
    const st = OLD.steps, pts = [START, ...st, OLD.end];
    const segs = pts.slice(0, -1).map((a, i) => seg(a, pts[i + 1], 'a', 'k2-seg', i < pts.length - 2)).join('');
    const cubes = st.map((x, i) => i === OLD_KEEP ? cube('human is-kept', 'person', m(x))
      : cube('human', 'person', m(x)) + cube('auto', 'gear', m(x), ` data-i="${i}"`)).join('');
    return floor()
      + segs + disc('k2-start', m(START), 7) + `<circle class="k2-end" cx="${m(OLD.end)}" cy="${FY}" r="3.2"/>`
      + `<circle class="k2-run" cx="${m(START)}" cy="${FY}" r="5" data-run="${f(m(OLD.end) - m(START))}" style="transform:translateX(${f(m(OLD.end) - m(START))}px)"/>`
      + cubes;
  }
  const st = NEW.steps, pts = [START, ...st, GOAL];
  const segs = pts.slice(0, -1).map((a, i) => seg(a, pts[i + 1], 'b')).join('');
  const lit = seg(START, GOAL, 'a', 'k2-lit', false).replace('</g>', pts.slice(0, -1).map((a, i) => chev((a + pts[i + 1]) / 2 + 2)).join('') + '</g>');
  const cubes = st.map((x, i) => cube(NEW_KIND[i], NEW_KIND[i] === 'you' ? 'person' : 'mate', m(x), ` data-n="${i}"`)).join('');
  return floor() + segs + lit + disc('k2-start', m(START), 7) + goal
    + `<circle class="k2-run" cx="${m(START)}" cy="${FY}" r="5" data-run="${f(m(GOAL) - m(START))}" style="transform:translateX(${f(m(GOAL) - m(START))}px)"/>`
    + cubes;
}

const T = {
  en: { old: 'Old way: build to replace a flow.', mine: 'Our way: build to achieve a business goal.', goal: 'Goal', ok: 'On track', why: 'why?',
    cap: 'Animation. Old way: build to replace a flow. A flow of three human steps is automated one step at a time: the first and last person are replaced by an automation in the same place, the person in the middle stays. There is no business goal: the finished flow runs to its end, and asks why? Our way: build to achieve a business goal. The goal line of 90% comes first. Then the flow is built backwards from the goal to the start: a Mate step, a person who approves, and another Mate step. The line lights up from start to goal, a run reaches the goal, and it shows On track.',
    pause: 'Pause animation' },
  he: { old: 'הדרך הישנה: בונים כדי להחליף תהליך.', mine: 'הדרך שלנו: בונים כדי להשיג יעד עסקי.', goal: 'יעד', ok: 'כמתוכנן', why: 'למה?',
    cap: 'אנימציה. הדרך הישנה: בונים כדי להחליף תהליך. תהליך של שלושה שלבים אנושיים עובר אוטומציה שלב אחר שלב: האדם הראשון והאחרון מוחלפים באוטומציה באותו מקום, והאדם באמצע נשאר. אין יעד עסקי: התהליך המוכן רץ עד הסוף, ושואל למה? הדרך שלנו: בונים כדי להשיג יעד עסקי. קודם מופיע קו היעד של 90%. אחר כך התהליך נבנה לאחור, מהיעד אל ההתחלה: שלב של Mate, אדם שמאשר, ועוד שלב של Mate. הקו נדלק מההתחלה עד היעד, ריצה מגיעה ליעד, והיעד מסומן כמתוכנן.',
    pause: 'השהיית האנימציה' },
};

function html(L) {
  const t = T[L], m = (x) => (L === 'he' ? W - x : x);
  const sv = (inner) => `<svg class="k2-svg" viewBox="0 0 ${W} ${H}" focusable="false">${inner}</svg>`;
  const at = (x, y) => `left:${pct(m(x), W)};top:${pct(y, H)}`;
  const flag = `<span class="k2-flag" style="${at(GOAL, FY - POLE)}"><span class="v7-chip is-you"><b>${t.goal}</b><bdi>90%</bdi></span></span>`;
  return `<figure class="v7-figure k2">
  <div class="v7-mock k2-stage" data-v7-mock="K2" data-v7-play="loop" data-v7-threshold=".35" aria-hidden="true" inert>
    <div class="k2-act" data-act="old">
      <p class="k2-label"><i></i>${t.old}</p>
      <div class="k2-pic">
        ${sv(panel(L, 'old'))}
        <span class="k2-res" dir="${L === 'he' ? 'rtl' : 'ltr'}" style="${at(OLD.end, FY - 12)}">${t.why}</span>
      </div>
    </div>
    <div class="k2-act" data-act="new">
      <p class="k2-label"><i></i>${t.mine}</p>
      <div class="k2-pic">
        ${sv(panel(L, 'new'))}
        ${flag}
        <span class="k2-ok" style="${at(GOAL, FY - POLE + 34)}"><span class="v7-pill" data-tone="ok"><svg class="v7-ic" aria-hidden="true" focusable="false"><use href="#i-check"/></svg>${t.ok}</span></span>
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
