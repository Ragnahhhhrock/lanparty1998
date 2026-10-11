// Where the power goes. Pure data and arithmetic with no three.js, so the layout can be checked in node
// (tools/power.test.mjs). js/power.js builds it; the rules (what loses power, and when) are in js/party.js.
//
// Coordinates are the room's: x along the long wall, z front to back, y up, in metres.
// The room is 12 x 10, x from -6 to 6 and z from -5 (the stairs, the back wall) to 5 (the front wall).

export const SOCKET_Y = 0.3;            // height of a wall power point, centre
export const PLATE = { w: 0.08, h: 0.12, d: 0.008 };
export const WALL = { back: -5, front: 5, left: -6, right: 6 };

// The board every PC gets, and where it sits behind its table, in the station's own space (monitor faces +z,
// the wall is at wallZ behind it). Boards lie on the floor in the gap between the table and the wall.
export const BOARD = { len: 0.4, h: 0.04, d: 0.09, sockets: [-0.14, -0.06, 0.02, 0.10], switchX: 0.165 };
export const BOARD_AT = { x: 0.3, gap: 0.1 };   // x in the station's space; z = wallZ + gap
export const STATION_WALL_Z = -0.75;            // the back and front rows: the wall is 0.75 m behind the table's middle
export const DESK_WALL_Z = -0.55;               // the desks pushed against the side walls: 0.55 m

// The extension lead. The front-wall sockets are on the dryer's circuit, so the front row's board is fed from the
// back wall: out of the wall behind PC-01 and PC-02, under the back table, across the aisle, under the front table
// and round behind it to a female end that the front board's own plug goes into.
export const LEAD_X = -1.4;
export const LEAD_ROUTE = [
  [LEAD_X, 0.30, -4.97],  // the plug, in the wall socket
  [LEAD_X, 0.18, -4.90],
  [LEAD_X, 0.008, -4.80],
  [LEAD_X, 0.008, -4.00], // under the back table
  [LEAD_X, 0.008, 4.00],  // across the aisle, and under the front table
  [LEAD_X, 0.008, 4.45],
  [-1.3, 0.008, 4.62],    // out the back of the table
  [-1.15, 0.008, 4.76],
  [-0.92, 0.008, 4.84],
  [-0.74, 0.013, 4.84],   // the female end, with its mouth toward the board
];
export const LEAD_END = { x: -0.70, y: 0.016, z: 4.84, len: 0.07 };        // the block at the end of the lead
export const LEAD_AISLE = { from: -3.7, to: 3.9 };                         // the stretch you can walk over

// A point every `step` metres along a polyline, for the trip test. Points up in the air are left out.
export function samplePath(route, step = 0.06, maxY = 0.05) {
  const out = [];
  for (let i = 1; i < route.length; i++) {
    const [ax, ay, az] = route[i - 1], [bx, by, bz] = route[i];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k <= n; k++) {
      const t = k / n, y = ay + (by - ay) * t;
      if (y < maxY) out.push({ x: ax + (bx - ax) * t, y, z: az + (bz - az) * t });
    }
  }
  return out;
}
export const leadTripPoints = () => samplePath(LEAD_ROUTE);

// The light switch: left of the stairs door, on the back wall, at the height a hand falls to.
export const SWITCH = { x: 4.35, y: 1.2 };

// Wall power points that aren't behind a PC. [wall, how far along it]: x for the back and front walls, z for the sides.
export const SOCKETS = {
  lead: ['back', LEAD_X],     // the extension lead's plug
  fan: ['right', 0.3],        // the pedestal fan's
  tv: ['right', -0.15],       // the TV and console
  snack: ['left', 0.45],      // the board on the snack table, which runs the hub
  spare: [['back', -4.3], ['back', 4.05], ['front', -4.05], ['front', -1.4], ['front', 1.4], ['front', 4.05], ['left', -2.4], ['right', -3.0]],
};

// The pose of a plate on a wall: where it is and which way it faces (a rotation about y, plate normal toward the room).
export function socketPose([wall, along]) {
  const off = 0.004;
  if (wall === 'back') return { x: along, y: SOCKET_Y, z: WALL.back + off, yaw: 0 };
  if (wall === 'front') return { x: along, y: SOCKET_Y, z: WALL.front - off, yaw: Math.PI };
  if (wall === 'left') return { x: WALL.left + off, y: SOCKET_Y, z: along, yaw: Math.PI / 2 };
  return { x: WALL.right - off, y: SOCKET_Y, z: along, yaw: -Math.PI / 2 };
}

// The CRT glow, by what's on the screen: [colour, how much brighter to drive it, because teal and green are dim light].
// Colours are tokens: --dos-grey, --w98-desktop, --felt.
export const GLOW_BY_IDLE = {
  dos: [0xaaaaaa, 1.5], waiting: [0xaaaaaa, 1.5], bios: [0xaaaaaa, 1.5],
  win98: [0x008080, 2.3], defrag: [0x008080, 2.3], solitaire: [0x008000, 2.3],
};
export const GLOW_DEFAULT = [0xaaaaaa, 1.5];
