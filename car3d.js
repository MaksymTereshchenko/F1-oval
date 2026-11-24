(() => {
const THREE = window.THREE;

/**
 * Builds a stylized cartoonish 2024 F1 car facing +X in local space,
 * Y up, Z right/left. Total length ~5.6m (-2.8 to +2.8), width ~2.1m.
 */
function createF1Car3D(team) {
  const group = new THREE.Group();

  const matPrimary = new THREE.MeshStandardMaterial({
    color: team.primary,
    roughness: 0.35,
    metalness: 0.15,
  });
  const matSecondary = new THREE.MeshStandardMaterial({
    color: team.secondary,
    roughness: 0.4,
    metalness: 0.15,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: team.accent,
    roughness: 0.3,
    metalness: 0.2,
  });
  const matCarbon = new THREE.MeshStandardMaterial({
    color: 0x1a1e26,
    roughness: 0.65,
    metalness: 0.1,
  });
  const matTire = new THREE.MeshStandardMaterial({
    color: 0x191b20,
    roughness: 0.85,
    metalness: 0.05,
  });
  const matHelmet = new THREE.MeshStandardMaterial({
    color: team.helmet,
    roughness: 0.25,
    metalness: 0.25,
  });
  const matRainLight = new THREE.MeshStandardMaterial({
    color: 0x440008,
    emissive: 0x000000,
    roughness: 0.3,
  });

  // 1. Carbon Floor / Plank
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.06, 1.55), matCarbon);
  floor.position.set(-0.25, 0.09, 0);
  floor.castShadow = true;
  floor.receiveShadow = true;
  group.add(floor);

  // 2. Main Monocoque / Chassis Body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.36, 0.68), matPrimary);
  chassis.position.set(0.25, 0.31, 0);
  chassis.castShadow = true;
  group.add(chassis);

  // Nose cone tapering forward (+X)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 0.42), matPrimary);
  nose.position.set(2.05, 0.24, 0);
  nose.rotation.z = -0.06;
  nose.castShadow = true;
  group.add(nose);

  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.28), matAccent);
  noseTip.position.set(2.75, 0.18, 0);
  noseTip.castShadow = true;
  group.add(noseTip);

  // Sidepods (left & right)
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.34, 0.44), matPrimary);
    pod.position.set(-0.45, 0.29, side * 0.52);
    pod.castShadow = true;
    group.add(pod);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.46), matSecondary);
    stripe.position.set(-0.45, 0.36, side * 0.52);
    group.add(stripe);

    // Sidepod intake
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.34), matCarbon);
    intake.position.set(0.45, 0.31, side * 0.52);
    group.add(intake);
  }

  // Engine Cover + Shark Fin + Airbox
  const engineCover = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 0.46), matPrimary);
  engineCover.position.set(-1.1, 0.48, 0);
  engineCover.castShadow = true;
  group.add(engineCover);

  const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.34, 0.06), matSecondary);
  sharkFin.position.set(-1.35, 0.72, 0);
  sharkFin.castShadow = true;
  group.add(sharkFin);

  const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.26, 0.34), matSecondary);
  airbox.position.set(-0.45, 0.76, 0);
  airbox.castShadow = true;
  group.add(airbox);

  // T-Cam Pod on top of Airbox
  const tCamStem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.08), matCarbon);
  tCamStem.position.set(-0.45, 0.96, 0);
  group.add(tCamStem);

  const tCamBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.42), matCarbon);
  tCamBar.position.set(-0.45, 1.07, 0);
  group.add(tCamBar);

  // 3. Front Wing (visible in Wing Cam & Cockpit/T-cam)
  const fwMain = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 2.08), matPrimary);
  fwMain.position.set(2.58, 0.12, 0);
  fwMain.castShadow = true;
  group.add(fwMain);

  const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.98), matSecondary);
  fwFlap.position.set(2.44, 0.17, 0);
  fwFlap.rotation.z = 0.14;
  group.add(fwFlap);

  for (const side of [-1, 1]) {
    const fwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.06), matSecondary);
    fwEndplate.position.set(2.55, 0.2, side * 1.04);
    fwEndplate.castShadow = true;
    group.add(fwEndplate);
  }

  // 4. Rear Wing + DRS + Rain Light
  const rwPylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.08), matCarbon);
  rwPylon.position.set(-2.25, 0.56, 0);
  group.add(rwPylon);

  const rwMain = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 1.24), matSecondary);
  rwMain.position.set(-2.35, 0.84, 0);
  rwMain.rotation.z = 0.15;
  rwMain.castShadow = true;
  group.add(rwMain);

  const rwDrs = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 1.22), matPrimary);
  rwDrs.position.set(-2.48, 0.96, 0);
  rwDrs.rotation.z = 0.28;
  group.add(rwDrs);

  for (const side of [-1, 1]) {
    const rwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.06), matPrimary);
    rwEndplate.position.set(-2.35, 0.72, side * 0.62);
    rwEndplate.castShadow = true;
    group.add(rwEndplate);
  }

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.1), matRainLight);
  rainLight.position.set(-2.38, 0.34, 0);
  group.add(rainLight);

  // 5. Cockpit, Steering Wheel, Halo, and Driver Helmet
  const cockpitWell = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.48), matCarbon);
  cockpitWell.position.set(0.05, 0.42, 0);
  group.add(cockpitWell);

  // Steering wheel (rotates around X axis when steering!)
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0.45, 0.55, 0);
  wheelPivot.rotation.z = -0.35; // tilted toward driver

  const wheelBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.19, 0.3), matCarbon);
  wheelPivot.add(wheelBody);

  const wheelScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.09, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x16d2ff })
  );
  wheelScreen.position.set(-0.005, 0.02, 0);
  wheelPivot.add(wheelScreen);

  // Steering wheel grips
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.05), matPrimary);
    grip.position.set(0, -0.01, side * 0.14);
    wheelPivot.add(grip);
  }
  group.add(wheelPivot);

  // Driver Helmet (toggled off in Cockpit view so it never blocks camera)
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(-0.05, 0.56, 0);

  const helmetSphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), matHelmet);
  helmetGroup.add(helmetSphere);

  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.185, 0.09, 14, 1, false, -0.7, 1.4),
    matCarbon
  );
  visor.rotation.y = Math.PI / 2;
  visor.position.set(0.02, 0.02, 0);
  helmetGroup.add(visor);
  group.add(helmetGroup);

  // Halo Safety Hoop (iconic F1 cockpit frame)
  const haloGroup = new THREE.Group();
  const haloPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.36, 10), matCarbon);
  haloPillar.position.set(0.66, 0.62, 0);
  haloPillar.rotation.z = -0.62;
  haloGroup.add(haloPillar);

  for (const side of [-1, 1]) {
    const haloArm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.045, 0.05), matCarbon);
    haloArm.position.set(0.15, 0.72, side * 0.23);
    haloArm.rotation.y = -side * 0.25;
    haloGroup.add(haloArm);
  }
  const haloArch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.36), matCarbon);
  haloArch.position.set(0.55, 0.72, 0);
  haloGroup.add(haloArch);
  group.add(haloGroup);

  // 6. Suspension Arms & 4 Spinning Wheels
  const wheelMeshes = [];
  const frontWheelPivots = [];

  const createWheel = (isFront) => {
    const pivot = new THREE.Group();
    const spinGroup = new THREE.Group();

    const radius = 0.36;
    const width = isFront ? 0.34 : 0.42;

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), matTire);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    spinGroup.add(tire);

    // Cartoon Pirelli-style sidewall ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.015, 16),
      matAccent
    );
    ring.rotation.x = Math.PI / 2;
    spinGroup.add(ring);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width + 0.03, 12),
      matCarbon
    );
    hub.rotation.x = Math.PI / 2;
    spinGroup.add(hub);

    pivot.add(spinGroup);
    wheelMeshes.push(spinGroup);
    return pivot;
  };

  // Front Wheels
  for (const side of [-1, 1]) {
    const fwPivot = createWheel(true);
    fwPivot.position.set(1.65, 0.36, side * 0.92);
    group.add(fwPivot);
    frontWheelPivots.push(fwPivot);

    // Front wishbone
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.65), matCarbon);
    arm.position.set(1.62, 0.3, side * 0.56);
    group.add(arm);
  }

  // Rear Wheels
  for (const side of [-1, 1]) {
    const rwPivot = createWheel(false);
    rwPivot.position.set(-1.65, 0.36, side * 0.92);
    group.add(rwPivot);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.6), matCarbon);
    arm.position.set(-1.65, 0.3, side * 0.56);
    group.add(arm);
  }

  return {
    root: group,
    helmetGroup,
    wheelPivot,
    frontWheelPivots,
    wheelMeshes,
    matRainLight,
    updateVisuals(car, dt, cameraMode) {
      this.root.position.set(car.x, 0, car.y);
      this.root.rotation.y = -car.heading;

      // Subtle pitch & roll body lean for tactile arcade feel
      const speedPitch = (car.brake - car.throttle * 0.4) * 0.018;
      const cornerRoll = Math.max(-0.04, Math.min(0.04, -car.steerAngle * (car.speed / 90) * 0.1));
      this.root.rotation.z = speedPitch;
      this.root.rotation.x = cornerRoll;

      // Hide helmet in Cockpit POV so it doesn't obstruct camera
      this.helmetGroup.visible = cameraMode !== 'cockpit';

      // Steer front wheels & steering wheel
      for (const fw of this.frontWheelPivots) {
        fw.rotation.y = -car.steerAngle * 1.15;
      }
      this.wheelPivot.rotation.x = car.steerAngle * 2.4;

      // Spin all 4 tires
      const spinDelta = (car.speed / 0.36) * dt;
      for (const wm of this.wheelMeshes) {
        wm.rotation.z -= spinDelta;
      }

      // Brake rain light glow
      if (car.brake > 0.15) {
        this.matRainLight.emissive.setHex(0xff1a30);
        this.matRainLight.emissiveIntensity = 1.6;
      } else {
        this.matRainLight.emissive.setHex(0x000000);
      }
    },
  };
}

window.F1.createF1Car3D = createF1Car3D;
})();
