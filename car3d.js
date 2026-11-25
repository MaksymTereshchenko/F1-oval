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

/**
 * Generates a soft dark ground contact shadow texture so the car sits firmly on the asphalt.
 */
function createContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');

  ctx.clearRect(0, 0, 256, 128);

  // Under-chassis AO shadow
  const grad = ctx.createRadialGradient(128, 64, 18, 128, 64, 118);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  // Darker blobs under the 4 tires
  const tireSpots = [
    [60, 22], [60, 106],
    [192, 22], [192, 106],
  ];
  for (const [tx, ty] of tireSpots) {
    const tg = ctx.createRadialGradient(tx, ty, 3, tx, ty, 22);
    tg.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    tg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tg;
    ctx.fillRect(tx - 24, ty - 24, 48, 48);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

/**
 * Generates realistic 2024 team livery textures for sidepods, shark fin, nose, and rear wing.
 */
function createTeamLiveryTextures(team) {
  // 1. Shark Fin / Engine Cover Texture with driver number & team stripes
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
    // Iconic SF-24 White + Yellow twin pinstripes
    fCtx.fillStyle = '#FFFFFF';
    fCtx.fillRect(0, 94, 256, 10);
    fCtx.fillStyle = '#FFF200';
    fCtx.fillRect(0, 104, 256, 8);
  } else {
    // Mercedes W15: Carbon black + Silver + Petronas teal
    fCtx.fillStyle = '#14171d';
    fCtx.fillRect(0, 0, 256, 128);
    fCtx.fillStyle = '#DC0000'; // INEOS airbox accent
    fCtx.fillRect(0, 0, 90, 28);
    fCtx.fillStyle = '#00D2BE';
    fCtx.fillRect(0, 96, 256, 14);
  }

  // Driver number on shark fin
  fCtx.fillStyle = team.id === 'ferrari' || team.id === 'redbull' ? '#FFFFFF' : '#FFFFFF';
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
  rCtx.fillStyle = team.id === 'ferrari' ? '#D40000' : team.id === 'mclaren' ? '#14171d' : team.id === 'redbull' ? '#121c3d' : '#14171d';
  rCtx.fillRect(0, 0, 256, 64);
  rCtx.fillStyle = team.id === 'mclaren' ? '#FF8000' : team.id === 'redbull' ? '#FFD300' : team.id === 'ferrari' ? '#FFFFFF' : '#00D2BE';
  rCtx.font = '900 26px sans-serif';
  rCtx.textAlign = 'center';
  rCtx.textBaseline = 'middle';
  const label =
    team.id === 'mclaren' ? 'McLAREN' :
    team.id === 'redbull' ? 'RED BULL' :
    team.id === 'ferrari' ? 'FERRARI' : 'PETRONAS';
  rCtx.fillText(label, 128, 32);

  const rwTex = new THREE.CanvasTexture(rwC);
  rwTex.encoding = THREE.sRGBEncoding;

  // 3. Nose Cone Texture with number
  const noseC = document.createElement('canvas');
  noseC.width = 128;
  noseC.height = 256;
  const nCtx = noseC.getContext('2d');
  if (team.id === 'mclaren') {
    nCtx.fillStyle = '#FF8000';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#14171d';
    nCtx.fillRect(0, 190, 128, 66);
  } else if (team.id === 'redbull') {
    nCtx.fillStyle = '#121c3d';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#FFD300';
    nCtx.fillRect(0, 170, 128, 86);
    nCtx.fillStyle = '#DC0000';
    nCtx.fillRect(46, 0, 36, 170);
  } else if (team.id === 'ferrari') {
    nCtx.fillStyle = '#D40000';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#FFFFFF';
    nCtx.fillRect(10, 0, 12, 256);
    nCtx.fillRect(106, 0, 12, 256);
    nCtx.fillStyle = '#FFF200';
    nCtx.fillRect(22, 0, 8, 256);
    nCtx.fillRect(98, 0, 8, 256);
  } else {
    // Mercedes W15 silver nose tip + black body + teal stripe
    nCtx.fillStyle = '#14171d';
    nCtx.fillRect(0, 0, 128, 256);
    nCtx.fillStyle = '#C9D1D9';
    nCtx.fillRect(0, 120, 128, 136);
    nCtx.fillStyle = '#00D2BE';
    nCtx.fillRect(58, 0, 12, 160);
  }
  nCtx.fillStyle = team.id === 'mercedes' ? '#14171d' : '#FFFFFF';
  nCtx.font = 'italic 900 42px sans-serif';
  nCtx.textAlign = 'center';
  nCtx.textBaseline = 'middle';
  nCtx.fillText(team.number, 64, 95);

  const noseTex = new THREE.CanvasTexture(noseC);
  noseTex.encoding = THREE.sRGBEncoding;

  return { finTex, rwTex, noseTex };
}

/**
 * Builds a sleek, grounded, realistic 2024 F1 car facing +X in local space.
 * Ground contact plane sits at y = 0.025 (matching track asphalt surface).
 */
function createF1Car3D(team) {
  const group = new THREE.Group();
  const carbonTex = createCarbonTexture();
  const livery = createTeamLiveryTextures(team);
  const shadowTex = createContactShadowTexture();

  // Contact AO shadow plane right on the asphalt surface (y = 0.036)
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 3.0),
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
    roughness: isMatteTeam ? 0.58 : 0.2,
    metalness: isMatteTeam ? 0.12 : 0.35,
  });
  const matSecondary = new THREE.MeshStandardMaterial({
    color: team.secondary,
    roughness: 0.28,
    metalness: 0.25,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: team.accent,
    roughness: 0.25,
    metalness: 0.3,
  });
  const matCarbon = new THREE.MeshStandardMaterial({
    map: carbonTex,
    roughness: 0.48,
    metalness: 0.22,
  });
  // Deep dark matte F1 rubber (low envMapIntensity prevents pale grey glow!)
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

  // 1. Low Ground-Effect Carbon Floor & Rear Diffuser
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.045, 1.72), matCarbon);
  floor.position.set(-0.2, 0.058, 0);
  floor.castShadow = true;
  floor.receiveShadow = true;
  group.add(floor);

  for (const side of [-1, 1]) {
    const floorEdge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.035, 0.06), matSecondary);
    floorEdge.position.set(-0.25, 0.075, side * 0.86);
    group.add(floorEdge);
  }

  // Rear diffuser tunnels
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 1.05), matCarbon);
  diffuser.position.set(-2.3, 0.12, 0);
  diffuser.rotation.z = -0.18;
  group.add(diffuser);

  // 2. Monocoque + Livery Nose Cone
  const monocoque = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.37, 2.15, 16), matPrimary);
  monocoque.rotation.z = -Math.PI / 2;
  monocoque.scale.set(0.84, 1, 1.04);
  monocoque.position.set(0.45, 0.32, 0);
  monocoque.castShadow = true;
  group.add(monocoque);

  const noseMat = new THREE.MeshStandardMaterial({
    map: livery.noseTex,
    roughness: isMatteTeam ? 0.55 : 0.22,
    metalness: 0.25,
  });
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.42), noseMat);
  nose.position.set(2.02, 0.23, 0);
  nose.rotation.z = -0.06;
  nose.castShadow = true;
  group.add(nose);

  // Smooth Tapered Sidepods with team livery accents
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 2.0, 14), matPrimary);
    pod.rotation.z = -Math.PI / 2;
    pod.scale.set(0.82, 1, 1.18);
    pod.position.set(-0.45, 0.28, side * 0.5);
    pod.castShadow = true;
    group.add(pod);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.32), matSecondary);
    stripe.position.set(-0.48, 0.38, side * 0.49);
    stripe.rotation.y = side * 0.07;
    group.add(stripe);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.36), matCarbon);
    intake.position.set(0.52, 0.31, side * 0.5);
    group.add(intake);
  }

  // Engine Cover + Livery Shark Fin + Airbox
  const engineCover = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.31, 1.78, 14), matPrimary);
  engineCover.rotation.z = -Math.PI / 2 + 0.06;
  engineCover.scale.set(1.15, 1, 0.85);
  engineCover.position.set(-1.15, 0.48, 0);
  engineCover.castShadow = true;
  group.add(engineCover);

  const finMat = new THREE.MeshStandardMaterial({
    map: livery.finTex,
    roughness: 0.35,
    metalness: 0.18,
  });
  const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.38, 0.035), finMat);
  sharkFin.position.set(-1.35, 0.72, 0);
  sharkFin.castShadow = true;
  group.add(sharkFin);

  const airbox = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.5, 12), matSecondary);
  airbox.rotation.z = Math.PI / 2;
  airbox.position.set(-0.48, 0.74, 0);
  airbox.castShadow = true;
  group.add(airbox);

  // T-Cam Pod
  const tCamStem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.05), matCarbon);
  tCamStem.position.set(-0.45, 0.93, 0);
  group.add(tCamStem);

  const tCamBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.42), matCarbon);
  tCamBar.position.set(-0.45, 1.03, 0);
  group.add(tCamBar);

  // 3. Multi-Element Front Wing
  const fwMain = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.045, 2.14), matCarbon);
  fwMain.position.set(2.62, 0.09, 0);
  fwMain.castShadow = true;
  group.add(fwMain);

  const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 2.04), matPrimary);
  fwFlap.position.set(2.45, 0.14, 0);
  fwFlap.rotation.z = 0.16;
  group.add(fwFlap);

  for (const side of [-1, 1]) {
    const fwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.05), matSecondary);
    fwEndplate.position.set(2.58, 0.18, side * 1.07);
    fwEndplate.castShadow = true;
    group.add(fwEndplate);
  }

  // 4. Realistic Rear Wing with Sponsor Banner, Beam Wing, DRS Flap & Rain Light
  const rwPylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.05), matCarbon);
  rwPylon.position.set(-2.28, 0.58, 0);
  group.add(rwPylon);

  const beamWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 1.0), matCarbon);
  beamWing.position.set(-2.35, 0.44, 0);
  beamWing.rotation.z = 0.2;
  group.add(beamWing);

  const rwMain = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.055, 1.24), matCarbon);
  rwMain.position.set(-2.36, 0.84, 0);
  rwMain.rotation.z = 0.15;
  rwMain.castShadow = true;
  group.add(rwMain);

  const rwDrsMat = new THREE.MeshStandardMaterial({
    map: livery.rwTex,
    roughness: 0.3,
    metalness: 0.2,
  });
  const rwDrs = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 1.22), rwDrsMat);
  rwDrs.position.set(-2.48, 0.96, 0);
  rwDrs.rotation.z = 0.34;
  group.add(rwDrs);

  for (const side of [-1, 1]) {
    const rwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.05), matPrimary);
    rwEndplate.position.set(-2.36, 0.72, side * 0.62);
    rwEndplate.castShadow = true;
    group.add(rwEndplate);
  }

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.09), matRainLight);
  rainLight.position.set(-2.42, 0.32, 0);
  group.add(rainLight);

  // 5. Rear-View Mirrors
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.26), matCarbon);
    stalk.position.set(0.55, 0.54, side * 0.4);
    group.add(stalk);

    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.085, 0.21), matPrimary);
    mirrorHousing.position.set(0.58, 0.58, side * 0.54);
    mirrorHousing.castShadow = true;
    group.add(mirrorHousing);

    const mirrorFace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.17), matMirrorGlass);
    mirrorFace.position.set(0.51, 0.58, side * 0.54);
    group.add(mirrorFace);
  }

  // 6. Cockpit, Steering Wheel with RPM LEDs & Driver Hands
  const cockpitWell = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.48), matCarbon);
  cockpitWell.position.set(0.05, 0.4, 0);
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
  helmetGroup.position.set(-0.06, 0.54, 0);

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

  // 7. Smooth Curved Halo
  const haloCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 0.6, -0.25),
    new THREE.Vector3(0.25, 0.7, -0.22),
    new THREE.Vector3(0.56, 0.72, 0),
    new THREE.Vector3(0.25, 0.7, 0.22),
    new THREE.Vector3(-0.22, 0.6, 0.25),
  ]);
  const haloTube = new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 28, 0.034, 10, false), matCarbon);
  haloTube.castShadow = true;
  group.add(haloTube);

  const haloPillarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 0.72, 0),
    new THREE.Vector3(0.67, 0.59, 0),
    new THREE.Vector3(0.76, 0.43, 0),
  ]);
  const haloPillar = new THREE.Mesh(
    new THREE.TubeGeometry(haloPillarCurve, 12, 0.028, 10, false),
    matCarbon
  );
  haloPillar.castShadow = true;
  group.add(haloPillar);

  // 8. Grounded Pirelli Slick Wheels & Tight Wheel Deflectors
  const wheelMeshes = [];
  const frontWheelPivots = [];
  const matPirelliRing = new THREE.MeshBasicMaterial({
    color: team.id === 'ferrari' || team.id === 'mclaren' ? 0xff2a3b : 0xffd22b, // Soft Red / Medium Yellow Pirelli stripe
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

    // Thin realistic Pirelli sidewall ring (torus on outer face)
    const pirelliStripe = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.74, 0.012, 8, 28),
      matPirelliRing
    );
    pirelliStripe.position.z = width * 0.502;
    spinGroup.add(pirelliStripe);

    const pirelliStripeIn = pirelliStripe.clone();
    pirelliStripeIn.position.z = -width * 0.502;
    spinGroup.add(pirelliStripeIn);

    // Aerodynamic carbon wheel cover
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

  // Tires sit exactly on asphalt surface (y = 0.025 + 0.35 = 0.375)
  for (const side of [-1, 1]) {
    const fwPivot = createWheel(true);
    fwPivot.position.set(1.65, 0.37, side * 0.94);
    group.add(fwPivot);
    frontWheelPivots.push(fwPivot);

    // Sleek eyebrow wheel deflector hugging inside of tire
    const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.025, 0.14), matCarbon);
    deflector.position.set(1.64, 0.73, side * 0.75);
    deflector.rotation.z = -0.14;
    group.add(deflector);

    const armTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.66), matCarbon);
    armTop.position.set(1.64, 0.35, side * 0.56);
    group.add(armTop);

    const armLow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.66), matCarbon);
    armLow.position.set(1.56, 0.23, side * 0.56);
    group.add(armLow);
  }

  for (const side of [-1, 1]) {
    const rwPivot = createWheel(false);
    rwPivot.position.set(-1.65, 0.37, side * 0.94);
    group.add(rwPivot);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.62), matCarbon);
    arm.position.set(-1.65, 0.28, side * 0.56);
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
