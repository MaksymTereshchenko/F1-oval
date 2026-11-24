const TRACK = {
  straightHalfLen: 125, // Total straight = 250m
  cornerRadius: 135,    // Flat oval turn centerline radius = 135m
  halfWidth: 14,        // Total asphalt width = 28m
  kerbWidth: 2.1,
  wallOuterOffset: 22,  // Outer barrier 8m beyond asphalt edge
  wallInnerOffset: 22,  // Inner barrier 8m inside asphalt edge
};

const TOTAL_PERIMETER =
  4 * TRACK.straightHalfLen + 2 * Math.PI * TRACK.cornerRadius;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Signed distance & surface query for the flat stadium oval.
 * Center of oval is (0, 0). Bottom straight is y = +cornerRadius.
 */
function queryTrack(x, y) {
  const L = TRACK.straightHalfLen;
  const R = TRACK.cornerRadius;

  const sx = clamp(x, -L, L);
  const dx = x - sx;
  const dy = y;
  const distSpine = Math.hypot(dx, dy);

  const nx = distSpine > 1e-6 ? dx / distSpine : 0;
  const ny = distSpine > 1e-6 ? dy / distSpine : 1;

  // Radial offset from centerline: 0 = centerline, + = outside, - = inside
  const offset = distSpine - R;
  const absOffset = Math.abs(offset);

  const onCorner = Math.abs(x) > L;
  const onKerb =
    absOffset >= TRACK.halfWidth - TRACK.kerbWidth &&
    absOffset <= TRACK.halfWidth + 0.3 &&
    onCorner;

  let surface = 'asphalt';
  if (absOffset > TRACK.halfWidth + 0.3) {
    surface = 'grass';
  } else if (onKerb) {
    surface = 'kerb';
  }

  return {
    offset,
    absOffset,
    nx,
    ny,
    onCorner,
    surface,
  };
}

/**
 * Continuous progress [0, 1) starting at (0, +cornerRadius) moving counter-clockwise.
 */
function getTrackProgress(x, y) {
  const L = TRACK.straightHalfLen;
  const R = TRACK.cornerRadius;
  let s = 0;

  if (x >= 0 && x <= L && y >= 0) {
    // Bottom straight right half
    s = x;
  } else if (x > L) {
    // Right turn (counter-clockwise from +PI/2 down to -PI/2)
    const theta = Math.atan2(y, x - L);
    const delta = Math.PI / 2 - theta;
    s = L + clamp(delta, 0, Math.PI) * R;
  } else if (x >= -L && x <= L && y < 0) {
    // Top straight
    s = L + Math.PI * R + (L - x);
  } else if (x < -L) {
    // Left turn (counter-clockwise from -PI/2 down through -PI/PI to +PI/2)
    const theta = Math.atan2(y, x + L);
    let delta = -Math.PI / 2 - theta;
    if (delta < 0) delta += Math.PI * 2;
    s = 3 * L + Math.PI * R + clamp(delta, 0, Math.PI) * R;
  } else {
    // Bottom straight left half (x in [-L, 0), y >= 0)
    s = 3 * L + 2 * Math.PI * R + (x + L);
  }

  return (s % TOTAL_PERIMETER) / TOTAL_PERIMETER;
}

class F1CarPhysics {
  constructor(team) {
    this.team = team;
    this.reset();
  }

  setTeam(team) {
    this.team = team;
  }

  reset() {
    // Start just before start/finish line on bottom straight, heading right (0 rad)
    this.x = -6;
    this.y = TRACK.cornerRadius;
    this.vx = 0;
    this.vy = 0;
    this.heading = 0;
    this.steerAngle = 0;

    this.speed = 0;       // m/s
    this.speedKmh = 0;
    this.gear = 1;
    this.rpmRatio = 0.2;

    this.throttle = 0;
    this.brake = 0;

    this.downforceG = 0;
    this.gripUsage = 0;   // 0..1.5+ (>1 means sliding beyond grip limit)
    this.isSliding = false;
    this.surface = 'asphalt';
    this.wallHitTimer = 0;

    this.progress = getTrackProgress(this.x, this.y);
    this.passedHalfway = false;
  }

  step(dt, input, canMove) {
    const t = this.team.tuning;
    const trackInfo = queryTrack(this.x, this.y);
    this.surface = trackInfo.surface;

    if (this.wallHitTimer > 0) {
      this.wallHitTimer = Math.max(0, this.wallHitTimer - dt);
    }

    // Inputs
    const targetThrottle = canMove && input.up ? 1 : 0;
    const targetBrake = canMove && input.down ? 1 : 0;
    const targetSteer = canMove ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;

    // Smooth pedal response
    this.throttle += (targetThrottle - this.throttle) * Math.min(1, dt * 14);
    this.brake += (targetBrake - this.brake) * Math.min(1, dt * 18);

    // Steering response: responsive at cornering speed, steady at top speed
    const maxSteerRad = 0.42;
    const speedFactor = clamp(this.speed / t.maxSpeedMs, 0, 1);
    const dynamicSteerLimit = maxSteerRad * (1 - 0.56 * speedFactor);
    const desiredSteer = targetSteer * dynamicSteerLimit;
    this.steerAngle += (desiredSteer - this.steerAngle) * Math.min(1, dt * 13);

    // Car local axes
    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    const rightX = -sinH;
    const rightY = cosH;

    // Project current velocity into car forward & lateral components
    let vForward = this.vx * cosH + this.vy * sinH;
    let vLateral = this.vx * rightX + this.vy * rightY;

    // Surface multipliers
    const isGrass = this.surface === 'grass';
    const isKerb = this.surface === 'kerb';
    const surfaceGrip = isGrass ? 0.52 : isKerb ? 0.96 : 1.0;
    const surfaceRollingDrag = isGrass ? 0.022 : 0.0022;

    // Aerodynamic downforce scales quadratically with speed: F_df ~ v^2
    // Increases lateral cornering capability dramatically at medium-high speed,
    // while still making full-throttle 100% top-speed cornering exceed grip!
    const forwardSpeed = Math.max(0, vForward);
    const aeroLatGrip = t.downforceCoeff * forwardSpeed * forwardSpeed;
    this.downforceG = aeroLatGrip / 9.81;

    const maxLateralAccel = surfaceGrip * (t.mechGrip + aeroLatGrip);

    // Longitudinal acceleration & braking
    let longAccel = 0;
    if (this.throttle > 0.01) {
      // Strong low-end F1 acceleration, tapering cleanly toward top speed
      const powerCurve = Math.max(0.18, 1 - 0.72 * Math.pow(forwardSpeed / t.maxSpeedMs, 1.4));
      longAccel += this.throttle * t.accelForce * powerCurve;
    }

    if (this.brake > 0.01) {
      if (vForward > 1.5) {
        // F1 carbon brakes (stronger at high speed due to downforce)
        longAccel -= this.brake * (32 + aeroLatGrip * 0.45);
      } else {
        // Slow reverse
        longAccel -= this.brake * 12;
      }
    }

    // Aero drag (~ v^2) balances top speed cleanly at t.maxSpeedMs
    const aeroDragCoeff = (t.accelForce * 0.28) / (t.maxSpeedMs * t.maxSpeedMs);
    const dragAccel =
      aeroDragCoeff * vForward * Math.abs(vForward) +
      surfaceRollingDrag * vForward * 12;
    longAccel -= dragAccel;

    // Apply longitudinal acceleration
    vForward += longAccel * dt;
    vForward = clamp(vForward, -16, t.maxSpeedMs * 1.03);

    // Steering angular velocity (bicycle-like yaw rate)
    const wheelbase = 3.6;
    const effectiveSpeed = Math.abs(vForward) > 0.6 ? vForward : 0;
    const rawYawRate = (effectiveSpeed / wheelbase) * Math.tan(this.steerAngle);

    // Calculate lateral centripetal acceleration demanded by this turn rate
    const neededLatAccel = Math.abs(vForward * rawYawRate);
    this.gripUsage = maxLateralAccel > 0.1 ? neededLatAccel / maxLateralAccel : 0;

    // If driver tries to corner faster than available downforce + tire grip:
    // car understeers (yaw rate capped) and scrubs speed through tire slip!
    let actualYawRate = rawYawRate;
    if (this.gripUsage > 1.0) {
      const gripCapRatio = 1 / Math.pow(this.gripUsage, 0.72);
      actualYawRate = rawYawRate * gripCapRatio;

      // Induced cornering drag & lateral slip when pushing past grip limit
      const excess = this.gripUsage - 1.0;
      const scrubDecel = Math.min(26, excess * 19);
      vForward = Math.max(0, vForward - scrubDecel * dt);

      // Push laterally outward slightly to create visible slip angle / drift
      const turnDir = Math.sign(rawYawRate);
      vLateral -= turnDir * excess * 9.5 * dt;
      this.isSliding = true;
    } else {
      this.isSliding = this.gripUsage > 0.88 && forwardSpeed > 35;
    }

    // Update car heading
    this.heading += actualYawRate * dt;

    // Lateral tire grip damps sideways slip velocity toward 0, clamped by maxLateralAccel
    const latGripStrength = Math.min(maxLateralAccel, Math.abs(vLateral) / Math.max(dt, 0.001));
    const latCorrection = Math.sign(vLateral) * latGripStrength * dt;
    vLateral -= latCorrection * 0.88;

    // Reconstruct world velocity from updated heading & local velocities
    const newCos = Math.cos(this.heading);
    const newSin = Math.sin(this.heading);
    const newRightX = -newSin;
    const newRightY = newCos;

    this.vx = vForward * newCos + vLateral * newRightX;
    this.vy = vForward * newSin + vLateral * newRightY;

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Barrier collisions (outer & inner walls)
    const afterInfo = queryTrack(this.x, this.y);
    if (afterInfo.offset > TRACK.wallOuterOffset) {
      const pen = afterInfo.offset - TRACK.wallOuterOffset;
      this.x -= afterInfo.nx * pen;
      this.y -= afterInfo.ny * pen;
      this.resolveWallImpact(afterInfo.nx, afterInfo.ny);
    } else if (afterInfo.offset < -TRACK.wallInnerOffset) {
      const pen = -TRACK.wallInnerOffset - afterInfo.offset;
      this.x += afterInfo.nx * pen;
      this.y += afterInfo.ny * pen;
      this.resolveWallImpact(-afterInfo.nx, -afterInfo.ny);
    }

    // Telemetry calculations
    this.speed = Math.hypot(this.vx, this.vy);
    this.speedKmh = Math.round(this.speed * 3.6);
    this.updateGearbox();

    // Lap progress & start/finish detection
    const prevProgress = this.progress;
    const nextProgress = getTrackProgress(this.x, this.y);
    this.progress = nextProgress;

    if (nextProgress > 0.35 && nextProgress < 0.65) {
      this.passedHalfway = true;
    }

    const crossedFinish =
      this.passedHalfway && prevProgress > 0.82 && nextProgress < 0.18;

    if (crossedFinish) {
      this.passedHalfway = false;
    }

    return { crossedFinish };
  }

  resolveWallImpact(wallNormalX, wallNormalY) {
    const vDotN = this.vx * wallNormalX + this.vy * wallNormalY;
    if (vDotN > 0) {
      // Bounce softly & scrape parallel to wall
      this.vx -= 1.25 * vDotN * wallNormalX;
      this.vy -= 1.25 * vDotN * wallNormalY;
      this.vx *= 0.82;
      this.vy *= 0.82;
      this.wallHitTimer = 0.2;
    }
  }

  updateGearbox() {
    if (this.speedKmh < 3) {
      this.gear = this.throttle > 0.1 ? 1 : 'N';
      this.rpmRatio = 0.22;
      return;
    }

    const thresholds = [0, 70, 115, 160, 205, 245, 282, 312, 355];
    let g = 1;
    for (let i = 1; i <= 8; i++) {
      if (this.speedKmh >= thresholds[i - 1]) {
        g = i;
      }
    }
    this.gear = g;

    const low = thresholds[g - 1];
    const high = thresholds[g];
    this.rpmRatio = clamp((this.speedKmh - low) / (high - low), 0.25, 1.0);
  }
}

window.F1.TRACK = TRACK;
window.F1.queryTrack = queryTrack;
window.F1.getTrackProgress = getTrackProgress;
window.F1.F1CarPhysics = F1CarPhysics;
