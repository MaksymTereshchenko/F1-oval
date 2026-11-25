(() => {
const THREE = window.THREE;

/**
 * Creates a procedural carbon-fiber weave texture for Halo, floor, and wings.
 */
function createCarbonTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#171a21';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      ctx.fillStyle = (x + y) % 16 === 0 ? '#232833' : '#12141a';
      ctx.fillRect(x, y, 4, 4);
      ctx.fillRect(x + 4, y + 4, 4, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

/**
 * Builds a sleek, smooth semi-realistic 2024 F1 car facing +X in local space.
 * Includes curved TubeGeometry Halo, front wheel deflectors, mirrors,
 * butterfly steering wheel with live RPM LEDs, driver hands, and DRS flap.
 */
function createF1Car3D(team) {
  const group = new THREE.Group();
  const carbonTex = createCarbonTexture();

  const matPrimary = new THREE.MeshStandardMaterial({
    color: team.primary,
    roughness: 0.24,
    metalness: 0.32,
  });
  const matSecondary = new THREE.MeshStandardMaterial({
    color: team.secondary,
    roughness: 0.28,
    metalness: 0.25,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: team.accent,
    roughness: 0.22,
    metalness: 0.35,
  });
  const matCarbon = new THREE.MeshStandardMaterial({
    map: carbonTex,
    roughness: 0.42,
    metalness: 0.25,
  });
  const matTire = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.62,
    metalness: 0.06,
  });
  const matHelmet = new THREE.MeshStandardMaterial({
    color: team.helmet,
    roughness: 0.14,
    metalness: 0.45,
  });
  const matVisor = new THREE.MeshStandardMaterial({
    color: 0x0b101a,
    roughness: 0.08,
    metalness: 0.85,
  });
  const matGlove = new THREE.MeshStandardMaterial({
    color: 0xe8ecf5,
    roughness: 0.55,
    metalness: 0.05,
  });
  const matMirrorGlass = new THREE.MeshStandardMaterial({
    color: 0xaad4ff,
    roughness: 0.05,
    metalness: 0.95,
  });
  const matRainLight = new THREE.MeshStandardMaterial({
    color: 0x440008,
    emissive: 0x000000,
    roughness: 0.25,
  });

  // 1. Sculpted Carbon Floor & Diffuser
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.05, 1.65), matCarbon);
  floor.position.set(-0.2, 0.08, 0);
  floor.castShadow = true;
  floor.receiveShadow = true;
  group.add(floor);

  for (const side of [-1, 1]) {
    const floorEdge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.08), matSecondary);
    floorEdge.position.set(-0.3, 0.1, side * 0.82);
    group.add(floorEdge);
  }

  // 2. Smooth Monocoque + Nose Cone (tapered lathe/cylinder sculpting)
  const monocoque = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 2.2, 16),
    matPrimary
  );
  monocoque.rotation.z = -Math.PI / 2;
  monocoque.scale.set(0.85, 1, 1.05);
  monocoque.position.set(0.45, 0.34, 0);
  monocoque.castShadow = true;
  group.add(monocoque);

  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.3, 1.75, 16),
    matPrimary
  );
  nose.rotation.z = -Math.PI / 2 - 0.05;
  nose.scale.set(0.65, 1, 1.05);
  nose.position.set(2.1, 0.25, 0);
  nose.castShadow = true;
  group.add(nose);

  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.12), matAccent);
  noseStripe.position.set(1.95, 0.35, 0);
  noseStripe.rotation.z = -0.07;
  group.add(noseStripe);

  // Smooth Rounded Sidepods
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 1.95, 14), matPrimary);
    pod.rotation.z = -Math.PI / 2;
    pod.scale.set(0.85, 1, 1.15);
    pod.position.set(-0.45, 0.31, side * 0.48);
    pod.castShadow = true;
    group.add(pod);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 0.38), matSecondary);
    stripe.position.set(-0.48, 0.42, side * 0.46);
    stripe.rotation.y = side * 0.06;
    group.add(stripe);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.34), matCarbon);
    intake.position.set(0.48, 0.34, side * 0.48);
    group.add(intake);
  }

  // Sculpted Engine Cover + Airbox + Shark Fin
  const engineCover = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 1.75, 14), matPrimary);
  engineCover.rotation.z = -Math.PI / 2 + 0.07;
  engineCover.scale.set(1.15, 1, 0.85);
  engineCover.position.set(-1.15, 0.5, 0);
  engineCover.castShadow = true;
  group.add(engineCover);

  const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.04), matSecondary);
  sharkFin.position.set(-1.38, 0.72, 0);
  sharkFin.castShadow = true;
  group.add(sharkFin);

  const airbox = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.52, 12), matSecondary);
  airbox.rotation.z = Math.PI / 2;
  airbox.position.set(-0.48, 0.76, 0);
  airbox.castShadow = true;
  group.add(airbox);

  // T-Cam Pod
  const tCamStem = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.06), matCarbon);
  tCamStem.position.set(-0.45, 0.96, 0);
  group.add(tCamStem);

  const tCamBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.44), matCarbon);
  tCamBar.position.set(-0.45, 1.07, 0);
  group.add(tCamBar);

  // 3. Multi-Element Front Wing
  const fwMain = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 2.12), matPrimary);
  fwMain.position.set(2.6, 0.11, 0);
  fwMain.castShadow = true;
  group.add(fwMain);

  const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 2.02), matSecondary);
  fwFlap.position.set(2.44, 0.16, 0);
  fwFlap.rotation.z = 0.16;
  group.add(fwFlap);

  for (const side of [-1, 1]) {
    const fwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.25, 0.05), matSecondary);
    fwEndplate.position.set(2.56, 0.2, side * 1.06);
    fwEndplate.castShadow = true;
    group.add(fwEndplate);
  }

  // 4. Rear Wing + Animated DRS Flap + Rain Light
  const rwPylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.06), matCarbon);
  rwPylon.position.set(-2.25, 0.56, 0);
  group.add(rwPylon);

  const rwMain = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.055, 1.24), matSecondary);
  rwMain.position.set(-2.35, 0.84, 0);
  rwMain.rotation.z = 0.15;
  rwMain.castShadow = true;
  group.add(rwMain);

  const rwDrs = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.055, 1.22), matPrimary);
  rwDrs.position.set(-2.48, 0.96, 0);
  rwDrs.rotation.z = 0.34;
  group.add(rwDrs);

  for (const side of [-1, 1]) {
    const rwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.055), matPrimary);
    rwEndplate.position.set(-2.35, 0.72, side * 0.62);
    rwEndplate.castShadow = true;
    group.add(rwEndplate);
  }

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.1), matRainLight);
  rainLight.position.set(-2.38, 0.34, 0);
  group.add(rainLight);

  // 5. Realistic Rear-View Mirrors on Stalks (visible in T-Cam & Cockpit!)
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.28), matCarbon);
    stalk.position.set(0.55, 0.56, side * 0.42);
    stalk.rotation.y = side * 0.2;
    group.add(stalk);

    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.22), matPrimary);
    mirrorHousing.position.set(0.58, 0.6, side * 0.56);
    mirrorHousing.castShadow = true;
    group.add(mirrorHousing);

    const mirrorFace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.065, 0.18), matMirrorGlass);
    mirrorFace.position.set(0.51, 0.6, side * 0.56);
    group.add(mirrorFace);
  }

  // 6. Cockpit, Detailed F1 Butterfly Steering Wheel + Live RPM LEDs + Driver Hands
  const cockpitWell = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.48), matCarbon);
  cockpitWell.position.set(0.05, 0.42, 0);
  group.add(cockpitWell);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0.46, 0.54, 0);
  wheelPivot.rotation.z = -0.36;

  // Steering wheel body
  const wheelBody = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.28), matCarbon);
  wheelPivot.add(wheelBody);

  // Live OLED screen
  const wheelScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.085, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x0ed4ff })
  );
  wheelScreen.position.set(-0.006, 0.015, 0);
  wheelPivot.add(wheelScreen);

  // Top RPM Shift LED strip (6 LEDs)
  const rpmLeds = [];
  for (let i = 0; i < 6; i++) {
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x1a202c });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.014, 0.016), ledMat);
    led.position.set(-0.008, 0.072, (i - 2.5) * 0.021);
    wheelPivot.add(led);
    rpmLeds.push({ mat: ledMat, index: i });
  }

  // Grips & Driver Gloves
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.045), matPrimary);
    grip.position.set(0, -0.01, side * 0.135);
    wheelPivot.add(grip);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), matGlove);
    glove.scale.set(1.2, 1.3, 0.9);
    glove.position.set(-0.02, -0.01, side * 0.138);
    wheelPivot.add(glove);

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 8), matGlove);
    wrist.rotation.z = Math.PI / 2 - 0.2;
    wrist.position.set(-0.09, -0.04, side * 0.14);
    wheelPivot.add(wrist);
  }
  group.add(wheelPivot);

  // Driver Helmet with glossy visor
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(-0.06, 0.56, 0);

  const helmetSphere = new THREE.Mesh(new THREE.SphereGeometry(0.175, 20, 16), matHelmet);
  helmetSphere.scale.set(1.08, 0.98, 0.95);
  helmetGroup.add(helmetSphere);

  const helmetStripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.05), matAccent);
  helmetStripe.position.set(-0.01, 0.155, 0);
  helmetGroup.add(helmetStripe);

  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.085, 18, 1, false, -0.75, 1.5),
    matVisor
  );
  visor.rotation.y = Math.PI / 2;
  visor.position.set(0.02, 0.02, 0);
  helmetGroup.add(visor);
  group.add(helmetGroup);

  // 7. Curved Smooth 3D Halo (TubeGeometry via CatmullRomCurve3!)
  const haloCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 0.62, -0.25),
    new THREE.Vector3(0.25, 0.72, -0.22),
    new THREE.Vector3(0.56, 0.74, 0),
    new THREE.Vector3(0.25, 0.72, 0.22),
    new THREE.Vector3(-0.22, 0.62, 0.25),
  ]);
  const haloTube = new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 28, 0.034, 10, false), matCarbon);
  haloTube.castShadow = true;
  group.add(haloTube);

  const haloPillarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 0.74, 0),
    new THREE.Vector3(0.67, 0.61, 0),
    new THREE.Vector3(0.76, 0.45, 0),
  ]);
  const haloPillar = new THREE.Mesh(
    new THREE.TubeGeometry(haloPillarCurve, 12, 0.028, 10, false),
    matCarbon
  );
  haloPillar.castShadow = true;
  group.add(haloPillar);

  // 8. Suspension Arms, 2024 Front Wheel Winglets (Eyebrow Deflectors), & Rounded Pirelli Wheels
  const wheelMeshes = [];
  const frontWheelPivots = [];

  const createWheel = (isFront) => {
    const pivot = new THREE.Group();
    const spinGroup = new THREE.Group();

    const radius = 0.36;
    const width = isFront ? 0.35 : 0.44;

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), matTire);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    spinGroup.add(tire);

    // Sidewall Pirelli Ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.69, radius * 0.69, width + 0.015, 22),
      matAccent
    );
    ring.rotation.x = Math.PI / 2;
    spinGroup.add(ring);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width + 0.03, 18),
      matCarbon
    );
    hub.rotation.x = Math.PI / 2;
    spinGroup.add(hub);

    pivot.add(spinGroup);
    wheelMeshes.push(spinGroup);
    return pivot;
  };

  for (const side of [-1, 1]) {
    const fwPivot = createWheel(true);
    fwPivot.position.set(1.65, 0.36, side * 0.94);
    group.add(fwPivot);
    frontWheelPivots.push(fwPivot);

    // 2024 Front Wheel Aero Deflector (eyebrow winglet over tire!)
    const deflectorCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.42, 0.72, side * 0.76),
      new THREE.Vector3(1.68, 0.77, side * 0.78),
      new THREE.Vector3(1.92, 0.68, side * 0.8),
    ]);
    const deflector = new THREE.Mesh(
      new THREE.TubeGeometry(deflectorCurve, 12, 0.025, 6, false),
      matCarbon
    );
    deflector.scale.set(1, 0.6, 2.2);
    group.add(deflector);

    const armTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.66), matCarbon);
    armTop.position.set(1.64, 0.36, side * 0.56);
    group.add(armTop);

    const armLow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.66), matCarbon);
    armLow.position.set(1.56, 0.24, side * 0.56);
    group.add(armLow);
  }

  for (const side of [-1, 1]) {
    const rwPivot = createWheel(false);
    rwPivot.position.set(-1.65, 0.36, side * 0.94);
    group.add(rwPivot);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.62), matCarbon);
    arm.position.set(-1.65, 0.3, side * 0.56);
    group.add(arm);
  }

  return {
    root: group,
    helmetGroup,
    wheelPivot,
    wheelScreen,
    rpmLeds,
    rwDrs,
    frontWheelPivots,
    wheelMeshes,
    matRainLight,
    updateVisuals(car, dt, cameraMode) {
      this.root.position.set(car.x, 0, car.y);
      this.root.rotation.y = -car.heading;

      const speedPitch = (car.brake - car.throttle * 0.42) * 0.02;
      const cornerRoll = Math.max(-0.045, Math.min(0.045, -car.steerAngle * (car.speed / 95) * 0.11));
      this.root.rotation.z = speedPitch;
      this.root.rotation.x = cornerRoll;

      this.helmetGroup.visible = cameraMode !== 'cockpit';

      // DRS flap animation
      const targetFlapRot = car.drsOpen ? -0.04 : 0.34;
      const targetFlapY = car.drsOpen ? 1.02 : 0.96;
      this.rwDrs.rotation.z += (targetFlapRot - this.rwDrs.rotation.z) * Math.min(1, dt * 16);
      this.rwDrs.position.y += (targetFlapY - this.rwDrs.position.y) * Math.min(1, dt * 16);

      // Steer wheels & steering wheel
      for (const fw of this.frontWheelPivots) {
        fw.rotation.y = -car.steerAngle * 1.15;
      }
      this.wheelPivot.rotation.x = car.steerAngle * 2.4;

      // Steering wheel live RPM LEDs & ERS color
      const litLeds = Math.round(car.rpmRatio * 6);
      for (const led of this.rpmLeds) {
        if (led.index < litLeds) {
          const hex = led.index < 2 ? 0x2ee58f : led.index < 4 ? 0xff2a4b : 0x26b7ff;
          led.mat.color.setHex(hex);
        } else {
          led.mat.color.setHex(0x1a202c);
        }
      }
      this.wheelScreen.material.color.setHex(car.ersActive ? 0xffd22b : car.drsOpen ? 0x2ee58f : 0x0ed4ff);

      const spinDelta = (car.speed / 0.36) * dt;
      for (const wm of this.wheelMeshes) {
        wm.rotation.z -= spinDelta;
      }

      if (car.brake > 0.15) {
        this.matRainLight.emissive.setHex(0xff1a30);
        this.matRainLight.emissiveIntensity = 1.8;
      } else {
        this.matRainLight.emissive.setHex(0x000000);
      }
    },
  };
}

window.F1.createF1Car3D = createF1Car3D;
})();
