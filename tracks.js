(() => {
window.F1 = window.F1 || {};

// Catmull-Rom interpolation for closed circuit spline
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    z:
      0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

function buildPolylineTrack(def) {
  const rawPts = [];
  const ctrl = def.controlPoints;
  const n = ctrl.length;
  const stepsPerSeg = def.stepsPerSeg || 18;

  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n];
    const p1 = ctrl[i];
    const p2 = ctrl[(i + 1) % n];
    const p3 = ctrl[(i + 2) % n];

    for (let j = 0; j < stepsPerSeg; j++) {
      const pt = catmullRom(p0, p1, p2, p3, j / stepsPerSeg);
      rawPts.push({ x: pt.x * def.scale, z: pt.z * def.scale });
    }
  }

  // Compute cumulative arc length, outward/right normal, and curvature for kerbs
  const pts = [];
  const m = rawPts.length;
  let totalLen = 0;

  for (let i = 0; i < m; i++) {
    const prev = rawPts[(i - 1 + m) % m];
    const curr = rawPts[i];
    const next = rawPts[(i + 1) % m];

    if (i > 0) {
      totalLen += Math.hypot(curr.x - prev.x, curr.z - prev.z);
    }

    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const tLen = Math.hypot(tx, tz) || 1;
    const ux = tx / tLen;
    const uz = tz / tLen;

    // Right-hand normal in XZ plane
    const nx = -uz;
    const nz = ux;

    // Angle change to detect corners for red-and-white kerbs
    const v1x = curr.x - prev.x;
    const v1z = curr.z - prev.z;
    const v2x = next.x - curr.x;
    const v2z = next.z - curr.z;
    const d1 = Math.hypot(v1x, v1z) || 1;
    const d2 = Math.hypot(v2x, v2z) || 1;
    const cross = (v1x * v2z - v1z * v2x) / (d1 * d2);
    const curvature = Math.abs(cross) / ((d1 + d2) * 0.5);

    pts.push({
      x: curr.x,
      z: curr.z,
      nx,
      nz,
      ux,
      uz,
      s: totalLen,
      isCorner: curvature > def.kerbCurvatureThreshold,
    });
  }

  // Close loop total length
  const last = rawPts[m - 1];
  const first = rawPts[0];
  totalLen += Math.hypot(first.x - last.x, first.z - last.z);

  // Add duplicated start point at the end for seamless ribbon rendering
  pts.push({ ...pts[0], s: totalLen });

  return {
    ...def,
    pts,
    totalLen,
    startX: pts[0].x,
    startZ: pts[0].z,
    startHeading: Math.atan2(pts[0].uz, pts[0].ux),
  };
}

// Oval track sampler (smooth exact stadium shape)
function buildOvalTrack() {
  const L = 125;
  const R = 135;
  const straightLen = 2 * L;
  const arcLen = Math.PI * R;
  const totalLen = 2 * straightLen + 2 * arcLen;
  const numSamples = 260;

  const pts = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = (i % numSamples) / numSamples;
    const s = t * totalLen;
    let x, z, nx, nz, ux, uz;

    if (s < straightLen) {
      x = -L + s;
      z = R;
      nx = 0;
      nz = 1;
      ux = 1;
      uz = 0;
    } else if (s < straightLen + arcLen) {
      const a = Math.PI / 2 - (s - straightLen) / R;
      x = L + Math.cos(a) * R;
      z = Math.sin(a) * R;
      nx = Math.cos(a);
      nz = Math.sin(a);
      ux = Math.sin(a);
      uz = -Math.cos(a);
    } else if (s < 2 * straightLen + arcLen) {
      x = L - (s - straightLen - arcLen);
      z = -R;
      nx = 0;
      nz = -1;
      ux = -1;
      uz = 0;
    } else {
      const a = -Math.PI / 2 - (s - 2 * straightLen - arcLen) / R;
      x = -L + Math.cos(a) * R;
      z = Math.sin(a) * R;
      nx = Math.cos(a);
      nz = Math.sin(a);
      ux = Math.sin(a);
      uz = -Math.cos(a);
    }

    pts.push({
      x,
      z,
      nx,
      nz,
      ux,
      uz,
      s: i === numSamples ? totalLen : s,
      isCorner: Math.abs(x) > L + 0.5,
    });
  }

  return {
    id: 'oval',
    name: 'Flat Oval',
    subtitle: 'High-Speed Flat Oval • No Banking',
    halfWidth: 14,
    kerbWidth: 2.1,
    wallOuterOffset: 22,
    wallInnerOffset: 22,
    pond: { x: -48, z: 0, rx: 36, rz: 20 },
    pts,
    totalLen,
    // Start at bottom straight x = -6, z = +135 facing +X (0 rad)
    startX: -6,
    startZ: R,
    startHeading: 0,
    minimapScale: 0.23,
    minimapOffsetX: 0,
    minimapOffsetZ: 0,
  };
}

// Albert Park (Melbourne, Australia) — 14 turns (2022–2025 F1 layout)
// Start at Pit Straight heading +X, clockwise loop through T1-T14!
const AUSTRALIA_DEF = {
  id: 'australia',
  name: 'Australia',
  subtitle: 'Albert Park, Melbourne • 14 Turns',
  halfWidth: 11.5,
  kerbWidth: 1.9,
  wallOuterOffset: 17.5,
  wallInnerOffset: 17.5,
  scale: 1.35,
  stepsPerSeg: 18,
  kerbCurvatureThreshold: 0.0045,
  pond: { x: 10, z: 45, rx: 105, rz: 58 },
  minimapScale: 0.115,
  minimapOffsetX: 0,
  minimapOffsetZ: -15,
  // Control points tracing Pit Straight (+X) -> T1-T2 -> T3-T4-T5 -> T6-T7 -> T8 -> T9-T10 -> T11-T12 -> T13 -> T14
  controlPoints: [
    { x: -10, z: -210 },   // Start/Finish on Pit Straight
    { x: 115, z: -210 },   // End of Pit Straight braking into T1
    { x: 195, z: -206 },   // T1 (Jones) apex (Right)
    { x: 230, z: -162 },   // T2 (Brabham) transition (Left)
    { x: 295, z: -138 },   // T2 exit straight
    { x: 390, z: -130 },   // Braking zone for T3
    { x: 432, z: -105 },   // T3 (Sports Centre) apex (Right)
    { x: 395, z: -48 },    // T4 apex (Left)
    { x: 440, z: 12 },     // T5 fast apex (Right)
    { x: 412, z: 85 },     // Short chute into T6
    { x: 370, z: 145 },    // T6 (Whiteford) fast Right
    { x: 315, z: 162 },    // T7 fast Left onto Lakeside Drive
    { x: 255, z: 215 },    // Lakeside Drive entry
    { x: 140, z: 265 },    // T8 sweeping Left lakeside kink
    { x: 10, z: 278 },     // Mid Lakeside Drive
    { x: -125, z: 255 },   // Approach T9-T10 high-speed chicane
    { x: -195, z: 268 },   // T9 fast Left
    { x: -265, z: 222 },   // T10 fast Right
    { x: -345, z: 165 },   // Back straight toward T11
    { x: -415, z: 105 },   // Braking into T11
    { x: -435, z: 32 },    // T11 (Waite) apex (Right)
    { x: -405, z: -48 },   // T12 (Stewart) sweeping Right
    { x: -355, z: -115 },  // Approach T13
    { x: -285, z: -130 },  // T13 (Ascari) heavy-braking Right
    { x: -292, z: -192 },  // T14 (Prost) Right onto Pit Straight
    { x: -230, z: -212 },  // Pit Straight entry
    { x: -120, z: -210 },  // Pit Straight mid
  ],
};

const TRACKS = {
  oval: buildOvalTrack(),
  australia: buildPolylineTrack(AUSTRALIA_DEF),
};

function queryPolylineTrack(track, x, z) {
  const pts = track.pts;
  const n = pts.length - 1;

  let bestDistSq = Infinity;
  let bestX = 0;
  let bestZ = 0;
  let bestSeg = 0;
  let bestT = 0;

  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lenSq)) : 0;
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const distSq = (x - px) * (x - px) + (z - pz) * (z - pz);

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestX = px;
      bestZ = pz;
      bestSeg = i;
      bestT = t;
    }
  }

  const a = pts[bestSeg];
  const b = pts[bestSeg + 1];
  const segLen = Math.hypot(b.x - a.x, b.z - a.z);
  const s = a.s + bestT * segLen;
  const progress = (s % track.totalLen) / track.totalLen;

  // Interpolate outward/right normal
  const rnx = a.nx + (b.nx - a.nx) * bestT;
  const rnz = a.nz + (b.nz - a.nz) * bestT;
  const rnLen = Math.hypot(rnx, rnz) || 1;
  const nx = rnx / rnLen;
  const nz = rnz / rnLen;

  // Signed radial offset (+ = right/outer side of track normal, - = inner/left side)
  const vx = x - bestX;
  const vz = z - bestZ;
  const dist = Math.hypot(vx, vz);
  const sign = vx * nx + vz * nz >= 0 ? 1 : -1;
  const offset = dist * sign;
  const absOffset = Math.abs(offset);

  const onCorner = a.isCorner || b.isCorner;
  const onKerb =
    absOffset >= track.halfWidth - track.kerbWidth &&
    absOffset <= track.halfWidth + 0.3 &&
    onCorner;

  let surface = 'asphalt';
  if (absOffset > track.halfWidth + 0.3) {
    surface = 'grass';
  } else if (onKerb) {
    surface = 'kerb';
  }

  return {
    offset,
    absOffset,
    nx,
    ny: nz,
    onCorner,
    surface,
    progress,
  };
}

window.F1.TRACKS = TRACKS;
window.F1.queryPolylineTrack = queryPolylineTrack;
})();
