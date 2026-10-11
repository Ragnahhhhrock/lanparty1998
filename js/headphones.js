// A pair of over-ear headphones, for a head (js/avatars.js) or standing on a tower (js/room.js). The band arches over
// the crown from ear to ear and the cups sit where the ears are. Local origin is the middle of the ear line, +y is up,
// the band lies in the x/y plane. Colours are tokens from css/tokens.css: --clothes-black (band and cups),
// --duct-silver (the plates on the cups), --disk-smoke (the ear pads).
import * as THREE from 'three';

const BAND = { rx: 0.127, ry: 0.16, thick: 0.3 };   // metres: ear to ear is a bit wider than a head, and the arch clears hair
const CUP_X = 0.125;                                // the middle of each cup, out from the centre line

const mats = {
  black: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 }),
  silver: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.5, roughness: 0.4 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.9 }),
};
let geoms = null;
function shared() {
  return geoms ??= {
    band: new THREE.TorusGeometry(1, 0.055, 6, 24, Math.PI),                 // half a ring: ear, over the top, ear
    cup: new THREE.CylinderGeometry(0.042, 0.042, 0.03, 16).rotateZ(Math.PI / 2),
    plate: new THREE.CylinderGeometry(0.03, 0.03, 0.006, 14).rotateZ(Math.PI / 2),
    pad: new THREE.CylinderGeometry(0.037, 0.037, 0.012, 14).rotateZ(Math.PI / 2),
  };
}

export function headphones() {
  const g = shared(), out = new THREE.Group();
  const band = new THREE.Mesh(g.band, mats.black);
  band.scale.set(BAND.rx, BAND.ry, BAND.thick);
  out.add(band);
  for (const sx of [-1, 1]) {
    const part = (geom, mat, x) => { const m = new THREE.Mesh(geom, mat); m.position.x = sx * x; out.add(m); };
    part(g.cup, mats.black, CUP_X);
    part(g.plate, mats.silver, CUP_X + 0.0165);   // outside face
    part(g.pad, mats.pad, CUP_X - 0.021);         // against the head
  }
  return out;
}
