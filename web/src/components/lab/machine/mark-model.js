// The three-dot mark as a procedural Three.js model (img2threejs, generic profile, complexity "simple").
// Reconstruction data (MARK_SPEC) is kept apart from renderer objects, as the skill's implementation rules ask; the full
// sculpt spec it was taken from lives in docs/visual-direction.md ("3D1 build record"). Units: 1 = 100 logo units, so the
// logo's discs (r 27 at (130,70), (70,130), (130,130) in a 200 box centred on 100,100) become spheres of r .27, 0.6 apart.
// The logo is flat: depth is a stylization (all three on z = 0). Budget: 3 x 1,216 = 3,648 triangles (target <= 6k), 3 draw calls.
import { Group, Mesh, MeshPhysicalMaterial, SphereGeometry } from 'three';

export const MARK_SPEC = {
  radius: 0.27,
  segments: [32, 20], // width, height -> 32 * 20 * 2 - 2 * 32 = 1,216 triangles per sphere
  material: { roughness: 0.45, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.35 },
  // role order matters: the motion reads Mate first, then on track, and the person holds still
  dots: [
    { id: 'dot-mate', role: 'Mate', color: '#5B53E8', position: [0.3, -0.3, 0], breathe: { amp: 0.045, phase: 0 } },
    { id: 'dot-ok', role: 'on track', color: '#17BEBB', position: [-0.3, -0.3, 0], breathe: { amp: 0.03, phase: 0.9 } },
    { id: 'dot-you', role: 'you', color: '#FF8C42', position: [0.3, 0.3, 0], breathe: { amp: 0, phase: 0 } },
  ],
};

/** createMateosMarkModel(spec) -> THREE.Group with one Mesh per dot (named by id, clickable/explodable by part). */
export function createMateosMarkModel(spec = MARK_SPEC) {
  const root = new Group();
  root.name = 'mateos-mark';
  const geo = new SphereGeometry(spec.radius, spec.segments[0], spec.segments[1]);
  for (const d of spec.dots) {
    const mat = new MeshPhysicalMaterial({ color: d.color, ...spec.material });
    const m = new Mesh(geo, mat);
    m.name = d.id;
    m.position.set(d.position[0], d.position[1], d.position[2]);
    m.userData = { role: d.role, base: d.position.slice(), breathe: d.breathe };
    root.add(m);
  }
  return root;
}

/** Triangle count of the model (for the budget report). */
export function triangles(group) {
  let n = 0;
  group.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return n;
}
