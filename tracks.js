(() => {
window.F1 = window.F1 || {};

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

    const nx = -uz;
    const nz = ux;

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

  const last = rawPts[m - 1];
  const first = rawPts[0];
  totalLen += Math.hypot(first.x - last.x, first.z - last.z);
  pts.push({ ...pts[0], s: totalLen });

  const startHeading = Math.atan2(pts[0].uz, pts[0].ux);
  // Pit lane runs on the inside/left side (-normal) of the start/finish straight
  const pitOffset = -(def.halfWidth + 11.5);
  const pitSpawnX = pts[0].x - Math.cos(startHeading) * 32 + pts[0].nx * pitOffset;
  const pitSpawnZ = pts[0].z - Math.sin(startHeading) * 32 + pts[0].nz * pitOffset;

  return {
    ...def,
    pts,
    totalLen,
    startX: pts[0].x,
    startZ: pts[0].z,
    startHeading,
    pitOffset,
    pitSide: -1, // -normal side
    pitSpawnX,
    pitSpawnZ,
    pitSpawnHeading: startHeading,
  };
}

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

  const pitOffset = -(14 + 11.5);
  return {
    id: 'oval',
    name: 'Flat Oval',
    subtitle: 'High-Speed Flat Oval • No Banking',
    halfWidth: 14,
    kerbWidth: 2.1,
    wallOuterOffset: 22,
    wallInnerOffset: 22,
    pond: { x: -48, z: -15, rx: 34, rz: 18 },
    pts,
    totalLen,
    startX: 0,
    startZ: R,
    startHeading: 0,
    pitOffset,
    pitSide: -1,
    pitSpawnX: -32,
    pitSpawnZ: R + pitOffset,
    pitSpawnHeading: 0,
    minimapScale: 0.23,
    minimapOffsetX: 0,
    minimapOffsetZ: 0,
  };
}

// Accurate Albert Park (Melbourne, Australia) — ~6.1 km, 14-turn F1 layout (~1:30 lap time)
const AUSTRALIA_DEF = {
  id: 'australia',
  name: 'Australia',
  subtitle: 'Albert Park, Melbourne • ~1:30 Lap',
  halfWidth: 12.5,
  kerbWidth: 2.0,
  wallOuterOffset: 19.5,
  wallInnerOffset: 19.5,
  scale: 2.48,
  stepsPerSeg: 20,
  kerbCurvatureThreshold: 0.0024,
  pond: { x: 40, z: 75, rx: 220, rz: 120 },
  minimapScale: 0.062,
  minimapOffsetX: 2,
  minimapOffsetZ: -6,
  controlPoints: [
    // Main Pit Straight (+X)
    { x: -20, z: -215 },
    { x: 95, z: -215 },
    { x: 185, z: -214 },   // Braking zone for T1 (Jones)
    // T1 (Jones - sharp Right) -> T2 (Brabham - sharp Left)
    { x: 212, z: -202 },   // T1 apex
    { x: 224, z: -158 },   // T1 -> T2 transition
    { x: 256, z: -138 },   // T2 apex
    { x: 335, z: -140 },   // Straight down toward T3
    // T3 (Sports Centre - hard Right hairpin) -> T4 (Left) -> T5 (Right)
    { x: 432, z: -136 },   // Braking zone into T3
    { x: 458, z: -120 },   // T3 tight apex
    { x: 424, z: -76 },    // T3 exit
    { x: 388, z: -42 },    // T4 (Left)
    { x: 444, z: 16 },     // T5 (fast Right)
    // T6-T7 (Whiteford fast Right-Left onto Lakeside Drive)
    { x: 428, z: 96 },
    { x: 374, z: 156 },    // T6 (Right)
    { x: 312, z: 162 },    // T7 (Left)
    // Lakeside Drive hugging Albert Park Lake + T8 sweeping Left kink
    { x: 235, z: 222 },
    { x: 125, z: 270 },    // T8 sweeping bend
    { x: -10, z: 278 },
    // T9-T10 (High-speed sweeping Left-Right chicane)
    { x: -135, z: 254 },
    { x: -195, z: 272 },   // T9 fast Left
    { x: -245, z: 242 },
    { x: -288, z: 204 },   // T10 fast Right
    { x: -368, z: 164 },   // Approach T11
    // T11 (Waite) -> T12 (Stewart) -> T13 (Ascari) -> T14 (Prost)
    { x: -425, z: 108 },
    { x: -446, z: 36 },    // T11 (Right)
    { x: -418, z: -42 },   // T12 (sweeping Right)
    { x: -368, z: -108 },  // Braking for T13
    { x: -286, z: -112 },  // T13 (Ascari) tight Right
    { x: -308, z: -176 },
    { x: -292, z: -214 },  // T14 (Prost) onto Pit Straight
    { x: -205, z: -215 },
    { x: -110, z: -215 },
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

  const rnx = a.nx + (b.nx - a.nx) * bestT;
  const rnz = a.nz + (b.nz - a.nz) * bestT;
  const rnLen = Math.hypot(rnx, rnz) || 1;
  const nx = rnx / rnLen;
  const nz = rnz / rnLen;

  const vx = x - bestX;
  const vz = z - bestZ;
  const dist = Math.hypot(vx, vz);
  const sign = vx * nx + vz * nz >= 0 ? 1 : -1;
  const offset = dist * sign;
  const absOffset = Math.abs(offset);

  // Allow extra inner clearance near Start/Finish straight so car can drive freely in the Pit Lane & Pit Boxes
  const inPitZone = progress < 0.045 || progress > 0.92;
  const inPitAsphalt =
    inPitZone && offset <= -track.halfWidth && offset >= track.pitOffset - 6.5;

  const onCorner = a.isCorner || b.isCorner;
  const onKerb =
    absOffset >= track.halfWidth - track.kerbWidth &&
    absOffset <= track.halfWidth + 0.3 &&
    onCorner;

  let surface = 'asphalt';
  if (inPitAsphalt) {
    surface = 'asphalt';
  } else if (absOffset > track.halfWidth + 0.3) {
    surface = 'grass';
  } else if (onKerb) {
    surface = 'kerb';
  }

  const effectiveInnerLimit = inPitZone
    ? Math.max(track.wallInnerOffset, Math.abs(track.pitOffset) + 7.5)
    : track.wallInnerOffset;

  return {
    offset,
    absOffset,
    nx,
    ny: nz,
    onCorner,
    surface,
    progress,
    effectiveInnerLimit,
  };
}

window.F1.TRACKS = TRACKS;
window.F1.queryPolylineTrack = queryPolylineTrack;
})();
