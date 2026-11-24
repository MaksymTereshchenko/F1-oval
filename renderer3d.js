(() => {
const THREE = window.THREE;
const { TRACK, createF1Car3D } = window.F1;

const CAMERA_MODES = ['tcam', 'cockpit', 'wing', 'chase'];

class RaceRenderer3D {
  constructor(containerEl, minimapCanvas) {
    this.container = containerEl;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');

    this.cameraMode = 'tcam';
    this.carVisual = null;
    this.currentTeamId = null;

    // Three.js core
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x63c5ff);
    this.scene.fog = new THREE.Fog(0x88d7ff, 180, 560);

    this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.08, 900);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Chase cam smoothing state
    this.chaseCamPos = new THREE.Vector3(-12, 4, TRACK.cornerRadius);
    this.chaseLookPos = new THREE.Vector3(6, 1, TRACK.cornerRadius);

    // Particle pool
    this.particles = [];
    this.particleGeo = new THREE.SphereGeometry(0.32, 8, 6);

    // Start gantry light pods
    this.gantryLamps = [];

    this.setupLights();
    this.buildEnvironment();
    this.buildTrack3D();
    this.resize();
  }

  setCameraMode(mode) {
    if (CAMERA_MODES.includes(mode)) {
      this.cameraMode = mode;
    }
  }

  cycleCameraMode() {
    const idx = CAMERA_MODES.indexOf(this.cameraMode);
    this.cameraMode = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
    return this.cameraMode;
  }

  ensureCar(team) {
    if (this.carVisual && this.currentTeamId === team.id) return;
    if (this.carVisual) {
      this.scene.remove(this.carVisual.root);
    }
    this.carVisual = createF1Car3D(team);
    this.currentTeamId = team.id;
    this.scene.add(this.carVisual.root);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xdbf2ff, 0x3b8c3f, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff6e0, 1.15);
    sun.position.set(110, 180, 95);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 520;
    const d = 290;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  buildEnvironment() {
    // Mowed cartoon grass ground texture
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 256;
    gCanvas.height = 256;
    const gCtx = gCanvas.getContext('2d');
    gCtx.fillStyle = '#3f9d43';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#48ae4c';
    gCtx.fillRect(0, 0, 128, 256);

    const grassTex = new THREE.CanvasTexture(gCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(42, 42);
    grassTex.encoding = THREE.sRGBEncoding;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Stylized Infield Pond
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 28, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x26b7ff, roughness: 0.15, metalness: 0.1 })
    );
    pond.scale.set(1.3, 1, 0.72);
    pond.position.set(-48, 0.03, 0);
    this.scene.add(pond);

    const pondRim = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0xd8bb73, roughness: 0.85 })
    );
    pondRim.scale.set(1.3, 1, 0.72);
    pondRim.position.set(-48, 0.015, 0);
    this.scene.add(pondRim);

    // Grandstands along top & bottom straights
    const buildGrandstand = (x, z, rotY) => {
      const stand = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(72, 4, 14),
        new THREE.MeshStandardMaterial({ color: 0x4b556b, roughness: 0.8 })
      );
      base.position.y = 2;
      base.castShadow = true;
      base.receiveShadow = true;
      stand.add(base);

      const tierColors = [0xff3355, 0xffd22b, 0x29d6e6, 0xffffff];
      for (let i = 0; i < 4; i++) {
        const tier = new THREE.Mesh(
          new THREE.BoxGeometry(70, 1.3, 3.0),
          new THREE.MeshStandardMaterial({ color: tierColors[i], roughness: 0.6 })
        );
        tier.position.set(0, 4.4 + i * 1.35, -4.2 + i * 2.8);
        tier.castShadow = true;
        stand.add(tier);
      }

      // Roof canopy
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(73, 0.6, 15),
        new THREE.MeshStandardMaterial({ color: 0xe6ecf5, roughness: 0.5 })
      );
      roof.position.set(0, 11.5, 0.5);
      roof.rotation.x = 0.12;
      roof.castShadow = true;
      stand.add(roof);

      stand.position.set(x, 0, z);
      stand.rotation.y = rotY;
      this.scene.add(stand);
    };

    const outerZ = TRACK.cornerRadius + TRACK.wallOuterOffset + 16;
    buildGrandstand(-55, outerZ, Math.PI);
    buildGrandstand(55, outerZ, Math.PI);
    buildGrandstand(-55, -outerZ, 0);
    buildGrandstand(55, -outerZ, 0);

    // Cartoon Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4b2a, roughness: 0.9 });
    const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x26752c, roughness: 0.75 });
    const leafLightMat = new THREE.MeshStandardMaterial({ color: 0x4cc452, roughness: 0.7 });

    const treeCoords = [
      [42, -32, 1.1], [68, 28, 1.25], [95, -15, 1.0], [18, 42, 0.95],
      [-10, -45, 1.15], [-105, 42, 1.2], [-102, -45, 1.05],
      [-210, -180, 1.4], [-145, -200, 1.3], [145, -200, 1.45], [220, -175, 1.35],
      [-225, 178, 1.4], [-150, 200, 1.25], [150, 200, 1.3], [225, 175, 1.4],
      [-310, -70, 1.5], [-315, 65, 1.35], [310, -68, 1.4], [315, 70, 1.3],
    ];

    for (const [tx, tz, sc] of treeCoords) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.85, 3.6, 8), trunkMat);
      trunk.position.y = 1.8;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown1 = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 10), leafDarkMat);
      crown1.position.y = 5.2;
      crown1.castShadow = true;
      tree.add(crown1);

      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(2.3, 10, 8), leafLightMat);
      crown2.position.set(0.8, 6.8, -0.6);
      crown2.castShadow = true;
      tree.add(crown2);

      tree.position.set(tx, 0, tz);
      tree.scale.setScalar(sc);
      this.scene.add(tree);
    }
  }

  sampleStadiumCenterline(numSamples) {
    const L = TRACK.straightHalfLen;
    const R = TRACK.cornerRadius;
    const straightLen = 2 * L;
    const arcLen = Math.PI * R;
    const totalLen = 2 * straightLen + 2 * arcLen;

    const pts = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = (i % numSamples) / numSamples;
      const s = t * totalLen;
      let x, z, nx, nz;

      if (s < straightLen) {
        // Bottom straight (-L -> +L, z = +R)
        x = -L + s;
        z = R;
        nx = 0;
        nz = 1;
      } else if (s < straightLen + arcLen) {
        // Right turn (+PI/2 -> -PI/2)
        const a = Math.PI / 2 - (s - straightLen) / R;
        x = L + Math.cos(a) * R;
        z = Math.sin(a) * R;
        nx = Math.cos(a);
        nz = Math.sin(a);
      } else if (s < 2 * straightLen + arcLen) {
        // Top straight (+L -> -L, z = -R)
        x = L - (s - straightLen - arcLen);
        z = -R;
        nx = 0;
        nz = -1;
      } else {
        // Left turn (-PI/2 -> -3PI/2)
        const a = -Math.PI / 2 - (s - 2 * straightLen - arcLen) / R;
        x = -L + Math.cos(a) * R;
        z = Math.sin(a) * R;
        nx = Math.cos(a);
        nz = Math.sin(a);
      }

      pts.push({ x, z, nx, nz, s, isCorner: Math.abs(x) > L + 0.5 });
    }
    return pts;
  }

  buildRibbonMesh(pts, innerOffset, outerOffset, yLevel, material, uvScaleLen = 20) {
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const ix = p.x + p.nx * innerOffset;
      const iz = p.z + p.nz * innerOffset;
      const ox = p.x + p.nx * outerOffset;
      const oz = p.z + p.nz * outerOffset;

      positions.push(ix, yLevel, iz);
      positions.push(ox, yLevel, oz);

      const u = p.s / uvScaleLen;
      uvs.push(0, u);
      uvs.push(1, u);

      if (i < pts.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildBarrierWall(pts, offset, height, colorA, colorB) {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 256;
    texCanvas.height = 64;
    const tCtx = texCanvas.getContext('2d');
    tCtx.fillStyle = colorA;
    tCtx.fillRect(0, 0, 128, 64);
    tCtx.fillStyle = colorB;
    tCtx.fillRect(128, 0, 128, 64);
    tCtx.fillStyle = 'rgba(0,0,0,0.22)';
    tCtx.fillRect(0, 52, 256, 12);

    const wallTex = new THREE.CanvasTexture(texCanvas);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.ClampToEdgeWrapping;
    wallTex.encoding = THREE.sRGBEncoding;

    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const wx = p.x + p.nx * offset;
      const wz = p.z + p.nz * offset;

      positions.push(wx, 0, wz);
      positions.push(wx, height, wz);

      const u = p.s / 12;
      uvs.push(u, 0);
      uvs.push(u, 1);

      if (i < pts.length - 1) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildTrack3D() {
    const pts = this.sampleStadiumCenterline(260);

    // 1. Procedural Asphalt Texture with white edge lines & dashed centerline
    const aCanvas = document.createElement('canvas');
    aCanvas.width = 512;
    aCanvas.height = 512;
    const aCtx = aCanvas.getContext('2d');

    aCtx.fillStyle = '#363c4a';
    aCtx.fillRect(0, 0, 512, 512);

    // Subtle cartoon asphalt grain
    for (let i = 0; i < 2400; i++) {
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
      aCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 4);
    }

    // Racing groove dark strip
    aCtx.fillStyle = 'rgba(18, 22, 30, 0.22)';
    aCtx.fillRect(140, 0, 140, 512);

    // Crisp white edge lines
    aCtx.fillStyle = '#f4f7fc';
    aCtx.fillRect(8, 0, 14, 512);
    aCtx.fillRect(490, 0, 14, 512);

    // Center dashed stripe
    aCtx.fillStyle = 'rgba(255,255,255,0.28)';
    aCtx.fillRect(252, 40, 8, 180);
    aCtx.fillRect(252, 290, 8, 180);

    const asphaltTex = new THREE.CanvasTexture(aCanvas);
    asphaltTex.wrapS = THREE.ClampToEdgeWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.anisotropy = 8;
    asphaltTex.encoding = THREE.sRGBEncoding;

    const trackMesh = this.buildRibbonMesh(
      pts,
      -TRACK.halfWidth,
      TRACK.halfWidth,
      0.025,
      new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.85 }),
      24
    );
    this.scene.add(trackMesh);

    // 2. Red-and-White Kerbs on turns
    const kCanvas = document.createElement('canvas');
    kCanvas.width = 64;
    kCanvas.height = 128;
    const kCtx = kCanvas.getContext('2d');
    kCtx.fillStyle = '#ef2b3d';
    kCtx.fillRect(0, 0, 64, 64);
    kCtx.fillStyle = '#ffffff';
    kCtx.fillRect(0, 64, 64, 64);

    const kerbTex = new THREE.CanvasTexture(kCanvas);
    kerbTex.wrapS = THREE.ClampToEdgeWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.encoding = THREE.sRGBEncoding;

    const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.7 });

    // Extract corner segments cleanly
    const rightTurnPts = pts.filter((p) => p.x >= TRACK.straightHalfLen - 1);
    const leftTurnPts = pts.filter((p) => p.x <= -TRACK.straightHalfLen + 1);

    for (const seg of [rightTurnPts, leftTurnPts]) {
      if (seg.length < 2) continue;
      this.scene.add(
        this.buildRibbonMesh(seg, -TRACK.halfWidth - 0.1, -TRACK.halfWidth + TRACK.kerbWidth, 0.045, kerbMat, 6)
      );
      this.scene.add(
        this.buildRibbonMesh(seg, TRACK.halfWidth - TRACK.kerbWidth, TRACK.halfWidth + 0.1, 0.045, kerbMat, 6)
      );
    }

    // 3. Outer & Inner 3D Barrier Walls
    this.scene.add(this.buildBarrierWall(pts, TRACK.wallOuterOffset, 1.35, '#e82538', '#ffffff'));
    this.scene.add(this.buildBarrierWall(pts, -TRACK.wallInnerOffset, 1.2, '#2272e6', '#ffffff'));

    // 4. Start / Finish Checkered Line & 3D Gantry with 5 Light Pods
    const sfCanvas = document.createElement('canvas');
    sfCanvas.width = 256;
    sfCanvas.height = 32;
    const sfCtx = sfCanvas.getContext('2d');
    const cols = 16;
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        sfCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#141720';
        sfCtx.fillRect(c * (256 / cols), r * 16, 256 / cols, 16);
      }
    }
    const sfTex = new THREE.CanvasTexture(sfCanvas);
    sfTex.encoding = THREE.sRGBEncoding;

    const finishStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, TRACK.halfWidth * 2 - 0.8),
      new THREE.MeshStandardMaterial({ map: sfTex, roughness: 0.75 })
    );
    finishStrip.rotation.x = -Math.PI / 2;
    finishStrip.position.set(0, 0.04, TRACK.cornerRadius);
    finishStrip.receiveShadow = true;
    this.scene.add(finishStrip);

    // 3D Start Gantry Bridge at x = 0, z = cornerRadius
    const gantry = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1c2335, roughness: 0.5 });
    const yellowTrim = new THREE.MeshStandardMaterial({ color: 0xffd22b, roughness: 0.4 });

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 7.2, 1.1), darkMetal);
      pillar.position.set(0, 3.6, side * (TRACK.halfWidth + 1.6));
      pillar.castShadow = true;
      gantry.add(pillar);
    }

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.5, TRACK.halfWidth * 2 + 4.4),
      darkMetal
    );
    beam.position.set(0, 7.1, 0);
    beam.castShadow = true;
    gantry.add(beam);

    const beamTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.25, TRACK.halfWidth * 2 + 4.4),
      yellowTrim
    );
    beamTrim.position.set(0, 7.8, 0);
    gantry.add(beamTrim);

    // 5 Start Light Pods facing oncoming driver (-X side of gantry)
    this.gantryLamps = [];
    for (let i = 0; i < 5; i++) {
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0x331015,
        emissive: 0x000000,
        roughness: 0.25,
      });
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 16), lampMat);
      pod.rotation.z = Math.PI / 2;
      pod.position.set(-0.85, 6.2, (i - 2) * 1.45);
      gantry.add(pod);
      this.gantryLamps.push(lampMat);
    }

    gantry.position.set(0, 0, TRACK.cornerRadius);
    this.scene.add(gantry);
  }

  setGantryLights(litCount, goGreen) {
    for (let i = 0; i < this.gantryLamps.length; i++) {
      const mat = this.gantryLamps[i];
      if (goGreen) {
        mat.color.setHex(0x28eb88);
        mat.emissive.setHex(0x28eb88);
        mat.emissiveIntensity = 1.8;
      } else if (i < litCount) {
        mat.color.setHex(0xff2238);
        mat.emissive.setHex(0xff2238);
        mat.emissiveIntensity = 2.0;
      } else {
        mat.color.setHex(0x331015);
        mat.emissive.setHex(0x000000);
      }
    }
  }

  updateParticles(car, dt) {
    if (car.isSliding && car.speed > 20) {
      this.spawnParticle(car, car.surface === 'grass' ? 0x70b84f : 0xe4e9f0, 0.48);
    } else if (car.surface === 'grass' && car.speed > 10) {
      this.spawnParticle(car, 0x67b345, 0.38);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.life -= dt;

      const ratio = Math.max(0.01, p.life / p.maxLife);
      const scale = 1 + (1 - ratio) * 1.8;
      p.mesh.scale.setScalar(scale);
      p.mesh.material.opacity = ratio * 0.65;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  spawnParticle(car, colorHex, maxLife) {
    if (this.particles.length > 90) return;
    const cos = Math.cos(car.heading);
    const sin = Math.sin(car.heading);
    const side = (Math.random() - 0.5) * 1.7;

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.65,
    });
    const mesh = new THREE.Mesh(this.particleGeo, mat);
    mesh.position.set(
      car.x - cos * 2.1 - sin * side,
      0.32,
      car.y - sin * 2.1 + cos * side
    );
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 0.8 + Math.random() * 1.2,
      vz: (Math.random() - 0.5) * 2.4,
      life: maxLife,
      maxLife,
    });
  }

  resetEffects(car) {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.material.dispose();
    }
    this.particles = [];
    if (car) {
      this.chaseCamPos.set(car.x - 8, 3.2, car.y);
      this.chaseLookPos.set(car.x + 6, 0.9, car.y);
    }
  }

  updateCamera(car, dt) {
    if (!this.carVisual) return;
    const root = this.carVisual.root;
    root.updateMatrixWorld(true);

    const speedRatio = Math.min(1, car.speed / 95);
    const rumble =
      car.surface === 'grass'
        ? (Math.random() - 0.5) * 0.035
        : car.surface === 'kerb'
        ? (Math.random() - 0.5) * 0.016
        : 0;

    if (this.cameraMode === 'tcam') {
      // Classic F1 T-Cam above airbox looking over halo, nose & front tires
      const pos = new THREE.Vector3(-0.48, 1.34 + rumble, 0.0);
      const look = new THREE.Vector3(16, 0.45, 0);
      root.localToWorld(pos);
      root.localToWorld(look);
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      this.camera.fov = 68 + speedRatio * 9;
    } else if (this.cameraMode === 'cockpit') {
      // Driver POV inside helmet behind Halo pillar & steering wheel
      const pos = new THREE.Vector3(-0.06, 0.82 + rumble * 0.7, 0);
      const look = new THREE.Vector3(18, 0.62, 0);
      root.localToWorld(pos);
      root.localToWorld(look);
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      this.camera.fov = 74 + speedRatio * 8;
    } else if (this.cameraMode === 'wing') {
      // Low Front-Wing Camera inches above asphalt
      const pos = new THREE.Vector3(2.22, 0.42 + rumble * 1.1, 0);
      const look = new THREE.Vector3(20, 0.34, 0);
      root.localToWorld(pos);
      root.localToWorld(look);
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      this.camera.fov = 82 + speedRatio * 10;
    } else {
      // Chase Camera behind car
      const cos = Math.cos(car.heading);
      const sin = Math.sin(car.heading);
      const targetPos = new THREE.Vector3(
        car.x - cos * 7.6,
        3.1 + speedRatio * 0.4,
        car.y - sin * 7.6
      );
      const targetLook = new THREE.Vector3(
        car.x + cos * 6.5,
        0.9,
        car.y + sin * 6.5
      );
      this.chaseCamPos.lerp(targetPos, Math.min(1, dt * 11));
      this.chaseLookPos.lerp(targetLook, Math.min(1, dt * 14));
      this.camera.position.copy(this.chaseCamPos);
      this.camera.lookAt(this.chaseLookPos);
      this.camera.fov = 64 + speedRatio * 8;
    }

    this.camera.updateProjectionMatrix();
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render(car, dt) {
    this.ensureCar(car.team);
    this.carVisual.updateVisuals(car, dt, this.cameraMode);
    this.updateParticles(car, dt);
    this.updateCamera(car, dt);
    this.renderer.render(this.scene, this.camera);
    this.renderMinimap(car);
  }

  renderMinimap(car) {
    const ctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    ctx.clearRect(0, 0, mw, mh);

    ctx.save();
    ctx.translate(mw / 2, mh / 2);
    ctx.scale(0.25, 0.25);

    const L = TRACK.straightHalfLen;
    const R = TRACK.cornerRadius;

    ctx.beginPath();
    ctx.moveTo(-L, R);
    ctx.lineTo(L, R);
    ctx.arc(L, 0, R, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(-L, -R);
    ctx.arc(-L, 0, R, -Math.PI / 2, Math.PI / 2, true);
    ctx.closePath();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = TRACK.halfWidth * 2.2;
    ctx.stroke();

    ctx.fillStyle = '#ffd22b';
    ctx.fillRect(-5, TRACK.cornerRadius - 20, 10, 40);

    ctx.fillStyle = car.team.primary;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(car.x, car.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

window.F1.RaceRenderer3D = RaceRenderer3D;
window.F1.CAMERA_MODES = CAMERA_MODES;
})();
