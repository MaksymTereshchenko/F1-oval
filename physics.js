(() => {
const { TRACKS, queryPolylineTrack } = window.F1;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

class F1CarPhysics {
  constructor(team, track) {
    this.team = team;
    this.track = track || TRACKS.oval;
    this.reset();
  }

  setTeam(team) {
    this.team = team;
  }

  setTrack(track) {
    this.track = track;
  }

  reset() {
    // Spawn directly in the Pit Lane in front of the team Pit Boxes
    this.x = this.track.pitSpawnX;
    this.y = this.track.pitSpawnZ;
    this.vx = 0;
    this.vy = 0;
    this.heading = this.track.pitSpawnHeading;
    this.steerAngle = 0;

    this.speed = 0;
    this.speedKmh = 0;
    this.gear = 1;
    this.rpmRatio = 0.2;

    this.throttle = 0;
    this.brake = 0;

    // ERS Battery & DRS Rear Wing
    this.ersEnergy = 100;
    this.ersActive = false;
    this.drsOpen = false;

    this.downforceG = 0;
    this.gripUsage = 0;
    this.isSliding = false;
    this.surface = 'asphalt';
    this.wallHitTimer = 0;

    const info = queryPolylineTrack(this.track, this.x, this.y);
    this.progress = info.progress;
    this.passedHalfway = false;
  }

  toggleErs() {
    if (this.ersActive) {
      this.ersActive = false;
      return { active: false, changed: true };
    }
    if (this.ersEnergy > 2) {
      this.ersActive = true;
      return { active: true, changed: true };
    }
    return { active: false, changed: false };
  }

  toggleDrs() {
    this.drsOpen = !this.drsOpen;
    return this.drsOpen;
  }

  step(dt, input, canMove) {
    const t = this.team.tuning;
    const tr = this.track;
    const trackInfo = queryPolylineTrack(tr, this.x, this.y);
    this.surface = trackInfo.surface;

    if (this.wallHitTimer > 0) {
      this.wallHitTimer = Math.max(0, this.wallHitTimer - dt);
    }

    const targetThrottle = canMove && input.up ? 1 : 0;
    const targetBrake = canMove && input.down ? 1 : 0;
    const targetSteer = canMove ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;

    this.throttle += (targetThrottle - this.throttle) * Math.min(1, dt * 15);
    this.brake += (targetBrake - this.brake) * Math.min(1, dt * 19);

    // Real F1 behavior: DRS automatically shuts when braking
    if (this.brake > 0.2 && this.drsOpen) {
      this.drsOpen = false;
    }

    // ERS Deployment & Harvesting (MGU-K braking regen)
    let ersUsing = false;
    if (canMove && this.ersActive) {
      if (this.throttle > 0.15 && this.ersEnergy > 0) {
        ersUsing = true;
        this.ersEnergy = Math.max(0, this.ersEnergy - 15 * dt);
        if (this.ersEnergy <= 0) {
          this.ersActive = false;
        }
      }
    }

    if (canMove && !ersUsing) {
      if (this.brake > 0.15 && this.speed > 10) {
        // Strong regen under braking
        this.ersEnergy = Math.min(100, this.ersEnergy + 19 * dt);
      } else if (this.throttle < 0.1 && this.speed > 15) {
        // Light coasting harvest
        this.ersEnergy = Math.min(100, this.ersEnergy + 5 * dt);
      }
    }

    const isGrass = this.surface === 'grass';
    const isKerb = this.surface === 'kerb';
    const surfaceGrip = isGrass ? 0.52 : isKerb ? 0.96 : 1.0;
    const surfaceRollingDrag = isGrass ? 0.022 : 0.002;

    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    const rightX = -sinH;
    const rightY = cosH;

    let vForward = this.vx * cosH + this.vy * sinH;
    let vLateral = this.vx * rightX + this.vy * rightY;

    // Aerodynamic downforce (~ v^2); open DRS reduces rear wing downforce slightly
    const forwardSpeed = Math.max(0, vForward);
    const drsDfMult = this.drsOpen ? 0.86 : 1.0;
    const aeroLatGrip = t.downforceCoeff * forwardSpeed * forwardSpeed * drsDfMult;
    this.downforceG = aeroLatGrip / 9.81;

    const maxLateralAccel = surfaceGrip * (t.mechGrip + aeroLatGrip);

    // Speed-sensitive F1 steering: full lock at hairpin speeds, razor-sharp high-downforce steering at 250+ km/h
    const wheelbase = 3.55;
    const speedFactor = clamp(this.speed / t.maxSpeedMs, 0, 1);
    const baseSteerLimit = 0.44 * (1 - 0.84 * Math.pow(speedFactor, 0.72));
    const gripSteerCap =
      forwardSpeed > 14
        ? Math.atan(((maxLateralAccel * 1.08) / (forwardSpeed * forwardSpeed)) * wheelbase)
        : 0.44;
    const dynamicSteerLimit = Math.max(0.032, Math.min(baseSteerLimit, gripSteerCap));
    const desiredSteer = targetSteer * dynamicSteerLimit;
    this.steerAngle += (desiredSteer - this.steerAngle) * Math.min(1, dt * 16);

    // Longitudinal acceleration + ERS boost
    const effectiveMaxSpeed = t.maxSpeedMs * (ersUsing ? 1.055 : 1.0);
    let longAccel = 0;
    if (this.throttle > 0.01) {
      const powerCurve = Math.max(
        0.2,
        1 - 0.7 * Math.pow(forwardSpeed / effectiveMaxSpeed, 1.4)
      );
      const ersBoost = ersUsing ? 1.24 : 1.0;
      longAccel += this.throttle * t.accelForce * ersBoost * powerCurve;
    }

    if (this.brake > 0.01) {
      if (vForward > 1.5) {
        longAccel -= this.brake * (38 + aeroLatGrip * 0.5);
      } else {
        longAccel -= this.brake * 12;
      }
    }

    // Aero drag (~ v^2); open DRS cuts drag by 30%
    const baseDragCoeff = (t.accelForce * 0.28) / (t.maxSpeedMs * t.maxSpeedMs);
    const drsDragMult = this.drsOpen ? 0.70 : 1.0;
    const dragAccel =
      baseDragCoeff * drsDragMult * vForward * Math.abs(vForward) +
      surfaceRollingDrag * vForward * 12;
    longAccel -= dragAccel;

    vForward += longAccel * dt;
    vForward = clamp(vForward, -16, 114); // up to ~410 km/h ceiling

    // Yaw rate & downforce-limited cornering (clean F1 grip + natural understeer on excess speed, no sideways drifting)
    const effectiveSpeed = Math.abs(vForward) > 0.6 ? vForward : 0;
    const rawYawRate = (effectiveSpeed / wheelbase) * Math.tan(this.steerAngle);

    const neededLatAccel = Math.abs(vForward * rawYawRate);
    this.gripUsage = maxLateralAccel > 0.1 ? neededLatAccel / maxLateralAccel : 0;

    let actualYawRate = rawYawRate;
    if (this.gripUsage > 1.0 && forwardSpeed > 8) {
      // Cap turn rate cleanly to available tire + downforce grip (understeer)
      const maxYaw = maxLateralAccel / forwardSpeed;
      actualYawRate = Math.sign(rawYawRate) * Math.min(Math.abs(rawYawRate), maxYaw);

      const excess = this.gripUsage - 1.0;
      vForward = Math.max(0, vForward - Math.min(18, excess * 14) * dt);
      this.isSliding = excess > 0.08 && forwardSpeed > 32;
    } else {
      this.isSliding = false;
    }

    this.heading += actualYawRate * dt;

    // High lateral tire stiffness keeps F1 car planted on rails (no rally drift)
    const lateralDamping = isGrass ? 7.5 : 22.0;
    vLateral *= Math.exp(-lateralDamping * dt);

    const newCos = Math.cos(this.heading);
    const newSin = Math.sin(this.heading);
    const newRightX = -newSin;
    const newRightY = newCos;

    this.vx = vForward * newCos + vLateral * newRightX;
    this.vy = vForward * newSin + vLateral * newRightY;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Barrier collisions (with expanded pit-lane clearance near Pit Straight)
    const afterInfo = queryPolylineTrack(tr, this.x, this.y);
    const innerLimit = afterInfo.effectiveInnerLimit || tr.wallInnerOffset;
    if (afterInfo.offset > tr.wallOuterOffset) {
      const pen = afterInfo.offset - tr.wallOuterOffset;
      this.x -= afterInfo.nx * pen;
      this.y -= afterInfo.ny * pen;
      this.resolveWallImpact(afterInfo.nx, afterInfo.ny);
    } else if (afterInfo.offset < -innerLimit) {
      const pen = -innerLimit - afterInfo.offset;
      this.x += afterInfo.nx * pen;
      this.y += afterInfo.ny * pen;
      this.resolveWallImpact(-afterInfo.nx, -afterInfo.ny);
    }

    this.speed = Math.hypot(this.vx, this.vy);
    this.speedKmh = Math.round(this.speed * 3.6);
    this.updateGearbox();

    const prevProgress = this.progress;
    const nextProgress = afterInfo.progress;
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

    const thresholds = [0, 75, 122, 170, 218, 260, 300, 336, 410];
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

window.F1.F1CarPhysics = F1CarPhysics;
})();
