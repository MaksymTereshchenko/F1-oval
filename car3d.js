(() => {
const THREE = window.THREE;

function createCarbonTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#14171d';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      ctx.fillStyle = (x + y) % 16 === 0 ? '#1f242e' : '#0f1116';
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

function createContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);

  const grad = ctx.createRadialGradient(128, 64, 18, 128, 64, 118);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.90)');
  grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.62)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  const tireSpots = [
    [60, 22], [60, 106],
    [192, 22], [192, 106],
  ];
  for (const [tx, ty] of tireSpots) {
    const tg = ctx.createRadialGradient(tx, ty, 3, tx, ty, 22);
    tg.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    tg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tg;
    ctx.fillRect(tx - 24, ty - 24, 48, 48);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function createTeamLiveryTextures(team) {
  // 1. Shark Fin / Engine Cover Texture
  const finC = document.createElement('canvas');
  finC.width = 256;
  finC.height = 128;
  const fCtx = finC.getContext('2d');

  if (team.id === 'mclaren') {
    fCtx.fillStyle = '#14171d';
    fCtx.fillRect(0, 0, 256, 128);
    fCtx.fillStyle = '#FF8000';
    fCtx.beginPath();
    fCtx.moveTo(0, 0);
    fCtx.lineTo(175, 0);
    fCtx.lineTo(95, 128);
    fCtx.lineTo(0, 128);
    fCtx.closePath();
    fCtx.fill();
    fCtx.fillStyle = '#27C4FF';
    fCtx.fillRect(10, 102, 110, 10);
  } else if (team.id === 'redbull') {
    fCtx.fillStyle = '#121c3d';
    fCtx.fillRect(0, 0, 256, 128);
    fCtx.fillStyle = '#DC0000';
    fCtx.fillRect(0, 0, 256, 36);
    fCtx.fillStyle = '#FFD300';
    fCtx.beginPath();
    fCtx.arc(135, 72, 26, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#DC0000';
    fCtx.fillRect(110, 62, 50, 18);
  } else if (team.id === 'ferrari') {
    fCtx.fillStyle = '#D40000';
    fCtx.fillRect(0, 0, 256, 128);
    fCtx.fillStyle = '#FFFFFF';
    fCtx.fillRect(0, 94, 256, 10);
    fCtx.fillStyle = '#FFF200';
    fCtx.fillRect(0, 104, 256, 8);
  } else {
    fCtx.fillStyle = '#14171d';
    fCtx.fillRect(0, 0, 256, 128);
    fCtx.fillStyle = '#DC0000';
    fCtx.fillRect(0, 0, 90, 28);
    fCtx.fillStyle = '#00D2BE';
    fCtx.fillRect(0, 96, 256, 14);
  }

  fCtx.fillStyle = '#FFFFFF';
  fCtx.font = 'italic 900 44px sans-serif';
  fCtx.textAlign = 'center';
  fCtx.textBaseline = 'middle';
  fCtx.fillText(team.number, 200, 64);

  const finTex = new THREE.CanvasTexture(finC);
  finTex.encoding = THREE.sRGBEncoding;

  // 2. Rear Wing Banner Texture
  const rwC = document.createElement('canvas');
  rwC.width = 256;
  rwC.height = 64;
  const rCtx = rwC.getContext('2d');
  rCtx.fillStyle =
    team.id === 'ferrari'
      ? '#D40000'
      : team.id === 'redbull'
      ? '#121c3d'
      : '#14171d';
  rCtx.fillRect(0, 0, 256, 64);
  rCtx.fillStyle =
    team.id === 'mclaren'
      ? '#FF8000'
      : team.id === 'redbull'
      ? '#FFD300'
      : team.id === 'ferrari'
      ? '#FFFFFF'
      : '#00D2BE';
  rCtx.font = '900 26px sans-serif';
  rCtx.textAlign = 'center';
  rCtx.textBaseline = 'middle';
  const label =
    team.id === 'mclaren'
      ? 'McLAREN'
      : team.id === 'redbull'
      ? 'RED BULL'
      : team.id === 'ferrari'
      ? 'FERRARI'
      : 'PETRONAS';
  rCtx.fillText(label, 128, 32);

  const rwTex = new THREE.CanvasTexture(rwC);
  rwTex.encoding = THREE.sRGBEncoding;

  // 3. Nose Cone Texture with driver number
  const noseC = document.createElement('canvas');
  noseC.width = 128;
  noseC.height = 256;
  const nCtx = noseC.getContext('2d');
  if (team.id === 'mclaren') {
    nCtx.fillStyle = '#FF8000';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#14171d';
    nCtx.fillRect(0, 185, 128, 71);
  } else if (team.id === 'redbull') {
    nCtx.fillStyle = '#121c3d';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#FFD300';
    nCtx.fillRect(0, 168, 128, 88);
    nCtx.fillStyle = '#DC0000';
    nCtx.fillRect(46, 0, 36, 168);
  } else if (team.id === 'ferrari') {
    nCtx.fillStyle = '#D40000';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#FFFFFF';
    nCtx.fillRect(8, 0, 12, 256);
    nCtx.fillRect(108, 0, 12, 256);
    nCtx.fillStyle = '#FFF200';
    nCtx.fillRect(20, 0, 8, 256);
    nCtx.fillRect(100, 0, 8, 256);
  } else {
    nCtx.fillStyle = '#14171d';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#C9D1D9';
    nCtx.fillRect(0, 118, 128, 138);
    nCtx.fillStyle = '#00D2BE';
    nCtx.fillRect(58, 0, 12, 160);
  }
  nCtx.fillStyle = team.id === 'mercedes' ? '#14171d' : '#FFFFFF';
  nCtx.font = 'italic 900 42px sans-serif';
  nCtx.textAlign = 'center';
  nCtx.textBaseline = 'middle';
  nCtx.fillText(team.number, 64, 90);

  const noseTex = new THREE.CanvasTexture(noseC);
  noseTex.encoding = THREE.sRGBEncoding;

  return { finTex, rwTex, noseTex };
}

/**
 * Helper to create a clean extruded 2D shape in XZ plane extruded upward along +Y.
 */
function extrudeXZ(shape, height, bevel = 0.03) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  // Rotate so shape X stays +X, shape Y becomes -Z (mirrored cleanly), extrusion depth goes +Y
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * Builds a unified, cohesive, zero-gap sculpted 2024 F1 car facing +X.
 */
function createF1Car3D(team) {
  const group = new THREE.Group();
  const carbonTex = createCarbonTexture();
  const livery = createTeamLiveryTextures(team);
  const shadowTex = createContactShadowTexture();

  // Ground Contact Shadow (y = 0.036)
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.3, 3.05),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0.05, 0.038, 0);
  group.add(contactShadow);

  const isMatteTeam = team.id === 'redbull';
  const matPrimary = new THREE.MeshStandardMaterial({
    color: team.primary,
    roughness: isMatteTeam ? 0.56 : 0.2,
    metalness: isMatteTeam ? 0.14 : 0.36,
  });
  const matSecondary = new THREE.MeshStandardMaterial({
    color: team.secondary,
    roughness: 0.28,
    metalness: 0.25,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: team.accent,
    roughness: 0.24,
    metalness: 0.32,
  });
  const matCarbon = new THREE.MeshStandardMaterial({
    map: carbonTex,
    roughness: 0.46,
    metalness: 0.24,
  });
  const matTire = new THREE.MeshStandardMaterial({
    color: 0x0b0c10,
    roughness: 0.85,
    metalness: 0.02,
    envMapIntensity: 0.22,
  });
  const matHelmet = new THREE.MeshStandardMaterial({
    color: team.helmet,
    roughness: 0.14,
    metalness: 0.45,
  });
  const matVisor = new THREE.MeshStandardMaterial({
    color: 0x080c14,
    roughness: 0.06,
    metalness: 0.9,
  });
  const matGlove = new THREE.MeshStandardMaterial({
    color: 0xe8ecf5,
    roughness: 0.6,
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

  // 1. UNIFIED SCULPTED CARBON UNDERFLOOR (T-tray -> wide floor -> coke-bottle rear -> diffuser)
  const floorShape = new THREE.Shape();
  floorShape.moveTo(1.25, 0.22);
  floorShape.lineTo(0.85, 0.86);
  floorShape.lineTo(-1.15, 0.84);
  floorShape.lineTo(-1.75, 0.42);
  floorShape.lineTo(-2.45, 0.42);
  floorShape.lineTo(-2.45, -0.42);
  floorShape.lineTo(-1.75, -0.42);
  floorShape.lineTo(-1.15, -0.84);
  floorShape.lineTo(0.85, -0.86);
  floorShape.lineTo(1.25, -0.22);
  floorShape.closePath();

  const floorMesh = new THREE.Mesh(extrudeXZ(floorShape, 0.04, 0.015), matCarbon);
  floorMesh.position.y = 0.055;
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Colored floor edge wing trim
  for (const side of [-1, 1]) {
    const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.03, 0.045), matSecondary);
    edgeTrim.position.set(-0.15, 0.09, side * 0.84);
    group.add(edgeTrim);
  }

  // Integrated Rear Diffuser & Crash Structure
  const crashBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.24, 0.42), matCarbon);
  crashBox.position.set(-2.15, 0.22, 0);
  crashBox.castShadow = true;
  group.add(crashBox);

  // 2. UNIFIED SCULPTED BODY SHELL (Seamless Sidepods + Coke-Bottle Taper + Bulkhead!)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(1.15, 0.24);
  bodyShape.bezierCurveTo(0.85, 0.28, 0.65, 0.72, 0.45, 0.72);
  bodyShape.lineTo(-0.35, 0.70);
  bodyShape.bezierCurveTo(-1.05, 0.66, -1.35, 0.34, -2.02, 0.22);
  bodyShape.lineTo(-2.02, -0.22);
  bodyShape.bezierCurveTo(-1.35, -0.34, -1.05, -0.66, -0.35, -0.70);
  bodyShape.lineTo(0.45, -0.72);
  bodyShape.bezierCurveTo(0.65, -0.72, 0.85, -0.28, 1.15, -0.24);
  bodyShape.closePath();

  const bodyShell = new THREE.Mesh(extrudeXZ(bodyShape, 0.27, 0.075), matPrimary);
  bodyShell.position.y = 0.14;
  bodyShell.castShadow = true;
  bodyShell.receiveShadow = true;
  group.add(bodyShell);

  // Secondary Livery Sidepod Shoulder Flashes (flush on sculpted body!)
  for (const side of [-1, 1]) {
    const podStripe = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.04, 0.26), matSecondary);
    podStripe.position.set(-0.42, 0.45, side * 0.48);
    podStripe.rotation.y = side * 0.12;
    group.add(podStripe);

    // Sidepod Radiator Intake (flush front opening)
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.38), matCarbon);
    intake.position.set(0.48, 0.32, side * 0.48);
    group.add(intake);
  }

  // 3. SEAMLESS CENTRAL CHASSIS SPINE & TAPERED NOSE CONE (Side-profile Extrude!)
  const spineShape = new THREE.Shape();
  spineShape.moveTo(2.74, 0.11);    // Low rounded nose tip
  spineShape.lineTo(2.74, 0.18);
  spineShape.bezierCurveTo(2.15, 0.26, 1.45, 0.44, 0.75, 0.50); // Nose ramp -> front bulkhead
  spineShape.lineTo(-0.05, 0.50);   // Cockpit rim
  spineShape.lineTo(-0.35, 0.82);   // Airbox top
  spineShape.lineTo(-0.78, 0.80);   // Engine cover spine
  spineShape.bezierCurveTo(-1.35, 0.72, -1.80, 0.48, -2.22, 0.34); // Taper to rear
  spineShape.lineTo(-2.22, 0.10);
  spineShape.closePath();

  const spineGeo = new THREE.ExtrudeGeometry(spineShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 16,
  });
  spineGeo.translate(0, 0, -0.19); // Center along Z = 0!
  const spineMesh = new THREE.Mesh(spineGeo, matPrimary);
  spineMesh.castShadow = true;
  spineMesh.receiveShadow = true;
  group.add(spineMesh);

  // Nose Cone Top Number Plate
  const noseMat = new THREE.MeshStandardMaterial({
    map: livery.noseTex,
    roughness: isMatteTeam ? 0.55 : 0.22,
    metalness: 0.25,
  });
  const nosePlate = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.03, 0.28), noseMat);
  nosePlate.position.set(1.9, 0.34, 0);
  nosePlate.rotation.z = -0.16;
  group.add(nosePlate);

  // Integrated Shark Fin (recessed cleanly into spine & rear crash structure!)
  const finMat = new THREE.MeshStandardMaterial({
    map: livery.finTex,
    roughness: 0.35,
    metalness: 0.18,
  });
  const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.035), finMat);
  sharkFin.position.set(-1.32, 0.76, 0);
  sharkFin.castShadow = true;
  group.add(sharkFin);

  // Airbox Intake + T-Cam Pod (flush onto top of airbox)
  const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.34), matSecondary);
  airbox.position.set(-0.48, 0.78, 0);
  airbox.castShadow = true;
  group.add(airbox);

  const airboxHole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.22), matCarbon);
  airboxHole.position.set(-0.24, 0.79, 0);
  group.add(airboxHole);

  const tCamStem = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.05), matCarbon);
  tCamStem.position.set(-0.46, 0.96, 0);
  group.add(tCamStem);

  const tCamBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.42), matCarbon);
  tCamBar.position.set(-0.46, 1.06, 0);
  group.add(tCamBar);

  // 4. INTEGRATED SWEPT FRONT WING ASSEMBLY (connected seamlessly to nose tip)
  const fwShape = new THREE.Shape();
  fwShape.moveTo(2.85, 0.0);
  fwShape.lineTo(2.45, 1.07);
  fwShape.lineTo(2.18, 1.07);
  fwShape.lineTo(2.38, 0.0);
  fwShape.lineTo(2.18, -1.07);
  fwShape.lineTo(2.45, -1.07);
  fwShape.closePath();

  const fwBase = new THREE.Mesh(extrudeXZ(fwShape, 0.03, 0.01), matCarbon);
  fwBase.position.y = 0.075;
  fwBase.castShadow = true;
  group.add(fwBase);

  const fwTopFlap = new THREE.Mesh(extrudeXZ(fwShape, 0.025, 0.008), matPrimary);
  fwTopFlap.position.set(-0.14, 0.125, 0);
  fwTopFlap.scale.set(0.85, 1, 0.94);
  fwTopFlap.rotation.z = 0.08;
  group.add(fwTopFlap);

  for (const side of [-1, 1]) {
    const fwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.045), matSecondary);
    fwEndplate.position.set(2.35, 0.17, side * 1.08);
    fwEndplate.castShadow = true;
    group.add(fwEndplate);
  }

  // 5. INTEGRATED REAR WING ASSEMBLY (bolted down to rear crash box & floor)
  const rwPylon = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.055), matCarbon);
  rwPylon.position.set(-2.22, 0.56, 0);
  group.add(rwPylon);

  const beamWing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 1.18), matCarbon);
  beamWing.position.set(-2.32, 0.36, 0);
  beamWing.rotation.z = 0.18;
  group.add(beamWing);

  const rwMain = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.055, 1.24), matCarbon);
  rwMain.position.set(-2.34, 0.84, 0);
  rwMain.rotation.z = 0.14;
  rwMain.castShadow = true;
  group.add(rwMain);

  const rwDrsMat = new THREE.MeshStandardMaterial({
    map: livery.rwTex,
    roughness: 0.3,
    metalness: 0.2,
  });
  const rwDrs = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 1.22), rwDrsMat);
  rwDrs.position.set(-2.46, 0.96, 0);
  rwDrs.rotation.z = 0.34;
  group.add(rwDrs);

  // Full-height rear wing endplates connecting smoothly from beam wing/floor up to DRS flap!
  for (const side of [-1, 1]) {
    const rwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.045), matPrimary);
    rwEndplate.position.set(-2.34, 0.64, side * 0.62);
    rwEndplate.castShadow = true;
    group.add(rwEndplate);
  }

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.09), matRainLight);
  rainLight.position.set(-2.48, 0.22, 0);
  group.add(rainLight);

  // 6. INTEGRATED MIRRORS, COCKPIT, STEERING WHEEL & HALO
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.24), matCarbon);
    stalk.position.set(0.54, 0.54, side * 0.34);
    group.add(stalk);

    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.085, 0.21), matPrimary);
    mirrorHousing.position.set(0.56, 0.57, side * 0.48);
    mirrorHousing.castShadow = true;
    group.add(mirrorHousing);

    const mirrorFace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.17), matMirrorGlass);
    mirrorFace.position.set(0.49, 0.57, side * 0.48);
    group.add(mirrorFace);
  }

  // Cockpit surround & headrest padding
  const cockpitWell = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.44), matCarbon);
  cockpitWell.position.set(0.06, 0.44, 0);
  group.add(cockpitWell);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0.46, 0.52, 0);
  wheelPivot.rotation.z = -0.36;

  const wheelBody = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.28), matCarbon);
  wheelPivot.add(wheelBody);

  const wheelScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.085, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x0ed4ff })
  );
  wheelScreen.position.set(-0.006, 0.015, 0);
  wheelPivot.add(wheelScreen);

  const rpmLeds = [];
  for (let i = 0; i < 6; i++) {
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x1a202c });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.014, 0.016), ledMat);
    led.position.set(-0.008, 0.072, (i - 2.5) * 0.021);
    wheelPivot.add(led);
    rpmLeds.push({ mat: ledMat, index: i });
  }

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

  // Driver Helmet
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(-0.06, 0.55, 0);

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

  // Smooth Curved Halo anchored directly into bulkhead & airbox
  const haloCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.26, 0.56, -0.23),
    new THREE.Vector3(0.22, 0.72, -0.21),
    new THREE.Vector3(0.56, 0.73, 0),
    new THREE.Vector3(0.22, 0.72, 0.21),
    new THREE.Vector3(-0.26, 0.56, 0.23),
  ]);
  const haloTube = new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 28, 0.034, 10, false), matCarbon);
  haloTube.castShadow = true;
  group.add(haloTube);

  const haloPillarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 0.73, 0),
    new THREE.Vector3(0.68, 0.59, 0),
    new THREE.Vector3(0.76, 0.44, 0),
  ]);
  const haloPillar = new THREE.Mesh(
    new THREE.TubeGeometry(haloPillarCurve, 12, 0.028, 10, false),
    matCarbon
  );
  haloPillar.castShadow = true;
  group.add(haloPillar);

  // 7. CONNECTED SUSPENSION WISHBONES & GROUNDED PIRELLI WHEELS
  const wheelMeshes = [];
  const frontWheelPivots = [];
  const matPirelliRing = new THREE.MeshBasicMaterial({
    color: team.id === 'ferrari' || team.id === 'mclaren' ? 0xff2a3b : 0xffd22b,
  });

  const createWheel = (isFront) => {
    const pivot = new THREE.Group();
    const spinGroup = new THREE.Group();

    const radius = 0.35;
    const width = isFront ? 0.36 : 0.45;

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), matTire);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    spinGroup.add(tire);

    const pirelliStripe = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.74, 0.012, 8, 28),
      matPirelliRing
    );
    pirelliStripe.position.z = width * 0.502;
    spinGroup.add(pirelliStripe);

    const pirelliStripeIn = pirelliStripe.clone();
    pirelliStripeIn.position.z = -width * 0.502;
    spinGroup.add(pirelliStripeIn);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.012, 18),
      matCarbon
    );
    hub.rotation.x = Math.PI / 2;
    spinGroup.add(hub);

    pivot.add(spinGroup);
    wheelMeshes.push(spinGroup);
    return pivot;
  };

  const addStrut = (x1, y1, z1, x2, y2, z2, r = 0.02) => {
    const start = new THREE.Vector3(x1, y1, z1);
    const end = new THREE.Vector3(x2, y2, z2);
    const len = start.distanceTo(end);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), matCarbon);
    strut.position.copy(start).lerp(end, 0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    group.add(strut);
  };

  for (const side of [-1, 1]) {
    const fwPivot = createWheel(true);
    fwPivot.position.set(1.65, 0.37, side * 0.92);
    group.add(fwPivot);
    frontWheelPivots.push(fwPivot);

    // Connected upper & lower A-arm wishbones directly from nose/monocoque to front upright
    addStrut(1.78, 0.36, side * 0.22, 1.65, 0.42, side * 0.78, 0.022);
    addStrut(1.38, 0.38, side * 0.22, 1.65, 0.42, side * 0.78, 0.022);
    addStrut(1.78, 0.22, side * 0.20, 1.65, 0.28, side * 0.78, 0.022);
    addStrut(1.38, 0.22, side * 0.20, 1.65, 0.28, side * 0.78, 0.022);

    // Wheel deflector mounted directly on front upright strut
    const uprightBracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.05), matCarbon);
    uprightBracket.position.set(1.65, 0.55, side * 0.74);
    group.add(uprightBracket);

    const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.028, 0.14), matCarbon);
    deflector.position.set(1.65, 0.72, side * 0.76);
    deflector.rotation.z = -0.14;
    group.add(deflector);
  }

  for (const side of [-1, 1]) {
    const rwPivot = createWheel(false);
    rwPivot.position.set(-1.68, 0.37, side * 0.92);
    group.add(rwPivot);

    // Connected rear suspension A-arms from gearbox/crash structure to rear hub
    addStrut(-1.45, 0.38, side * 0.26, -1.68, 0.42, side * 0.74, 0.025);
    addStrut(-1.95, 0.34, side * 0.22, -1.68, 0.42, side * 0.74, 0.025);
    addStrut(-1.45, 0.18, side * 0.26, -1.68, 0.25, side * 0.74, 0.025);
    addStrut(-1.95, 0.18, side * 0.22, -1.68, 0.25, side * 0.74, 0.025);
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

      const speedPitch = (car.brake - car.throttle * 0.42) * 0.015;
      const cornerRoll = Math.max(-0.035, Math.min(0.035, -car.steerAngle * (car.speed / 95) * 0.09));
      this.root.rotation.z = speedPitch;
      this.root.rotation.x = cornerRoll;

      this.helmetGroup.visible = cameraMode !== 'cockpit';

      const targetFlapRot = car.drsOpen ? -0.04 : 0.34;
      const targetFlapY = car.drsOpen ? 1.02 : 0.96;
      this.rwDrs.rotation.z += (targetFlapRot - this.rwDrs.rotation.z) * Math.min(1, dt * 16);
      this.rwDrs.position.y += (targetFlapY - this.rwDrs.position.y) * Math.min(1, dt * 16);

      for (const fw of this.frontWheelPivots) {
        fw.rotation.y = -car.steerAngle * 1.15;
      }
      this.wheelPivot.rotation.x = car.steerAngle * 2.4;

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

      const spinDelta = (car.speed / 0.35) * dt;
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
