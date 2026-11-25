(() => {
const THREE = window.THREE;
const { TRACKS, createF1Car3D } = window.F1;

const CAMERA_MODES = ['tcam', 'cockpit', 'wing', 'chase'];

class RaceRenderer3D {
  constructor(containerEl, minimapCanvas) {
    this.container = containerEl;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');

    this.cameraMode = 'tcam';
    this.carVisual = null;
    this.currentTeamId = null;
    this.track = TRACKS.oval;
    this.trackGroup = null;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd8b89a, 0.00145);

    this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.08, 1400);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.chaseCamPos = new THREE.Vector3(-12, 4, 135);
    this.chaseLookPos = new THREE.Vector3(6, 1, 135);

    this.particles = [];
    this.particleGeo = new THREE.SphereGeometry(0.28, 8, 6);
    this.sparkGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
    this.gantryLamps = [];

    this.setupGoldenHourSkyAndEnv();
    this.setupLights();
    this.buildGround();
    this.setTrack(TRACKS.oval);
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

  setTrack(track) {
    this.track = track;
    if (this.trackGroup) {
      this.scene.remove(this.trackGroup);
    }
    this.trackGroup = new THREE.Group();
    this.buildTrackEnvironment(track, this.trackGroup);
    this.buildTrack3D(track, this.trackGroup);
    this.scene.add(this.trackGroup);
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

  setupGoldenHourSkyAndEnv() {
    const skyGeo = new THREE.SphereGeometry(950, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        sunDir: { value: new THREE.Vector3(0.55, 0.22, -0.78).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 sunDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 horizon = vec3(0.95, 0.72, 0.54);
          vec3 midSky  = vec3(0.42, 0.64, 0.88);
          vec3 zenith  = vec3(0.11, 0.26, 0.52);

          vec3 col = mix(horizon, midSky, smoothstep(0.0, 0.26, h));
          col = mix(col, zenith, smoothstep(0.22, 0.85, h));

          float sunAmt = max(dot(dir, sunDir), 0.0);
          col += vec3(1.0, 0.75, 0.42) * pow(sunAmt, 14.0) * 0.45;
          col += vec3(1.0, 0.94, 0.82) * smoothstep(0.9965, 0.9992, sunAmt) * 1.4;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);

    // Bake sky into PMREM environment map for real metallic/paint/asphalt reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), skyMat));
    const envRT = pmrem.fromScene(envScene, 0.03);
    this.scene.environment = envRT.texture;
    pmrem.dispose();
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0x9bc7ff, 0x3b4d2b, 0.72);
    this.scene.add(hemi);

    // Warm Golden Hour directional sun casting crisp tight shadows around the car
    this.sun = new THREE.DirectionalLight(0xffdfb0, 1.65);
    this.sun.position.set(45, 55, -60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 220;
    const d = 42;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Subtle cool sky fill light from opposite direction
    const fill = new THREE.DirectionalLight(0x7fb4ff, 0.4);
    fill.position.set(-160, 140, 200);
    this.scene.add(fill);
  }

  buildGround() {
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 256;
    gCanvas.height = 256;
    const gCtx = gCanvas.getContext('2d');
    gCtx.fillStyle = '#387d39';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#408c41';
    gCtx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 600; i++) {
      gCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';
      gCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }

    const grassTex = new THREE.CanvasTexture(gCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(85, 85);
    grassTex.encoding = THREE.sRGBEncoding;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.94, metalness: 0.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  isNearTrack(track, x, z, minClearance) {
    for (let i = 0; i < track.pts.length; i += 2) {
      const p = track.pts[i];
      if (Math.hypot(x - p.x, z - p.z) < minClearance) return true;
    }
    return false;
  }

  buildTrackEnvironment(track, targetGroup) {
    // Reflective Albert Park Lake / Pond
    if (track.pond) {
      const pond = new THREE.Mesh(
        new THREE.CylinderGeometry(track.pond.rx, track.pond.rx, 0.08, 40),
        new THREE.MeshStandardMaterial({
          color: 0x16688f,
          roughness: 0.08,
          metalness: 0.55,
        })
      );
      pond.scale.set(1, 1, track.pond.rz / track.pond.rx);
      pond.position.set(track.pond.x, 0.03, track.pond.z);
      targetGroup.add(pond);

      const pondRim = new THREE.Mesh(
        new THREE.CylinderGeometry(track.pond.rx + 2.8, track.pond.rx + 2.8, 0.05, 40),
        new THREE.MeshStandardMaterial({ color: 0xb79d66, roughness: 0.88 })
      );
      pondRim.scale.set(1, 1, track.pond.rz / track.pond.rx);
      pondRim.position.set(track.pond.x, 0.015, track.pond.z);
      targetGroup.add(pondRim);
    }

    // Detailed Pit Complex & Grandstands
    const buildGrandstand = (x, z, rotY) => {
      const stand = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(82, 4.2, 15),
        new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.75 })
      );
      base.position.y = 2.1;
      base.castShadow = true;
      base.receiveShadow = true;
      stand.add(base);

      const tierColors = [0xd62839, 0xf7b801, 0x2b6cb0, 0xedf2f7];
      for (let i = 0; i < 4; i++) {
        const tier = new THREE.Mesh(
          new THREE.BoxGeometry(78, 1.35, 3.0),
          new THREE.MeshStandardMaterial({ color: tierColors[i], roughness: 0.65 })
        );
        tier.position.set(0, 4.6 + i * 1.35, -4.4 + i * 2.8);
        tier.castShadow = true;
        stand.add(tier);
      }

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(84, 0.55, 16),
        new THREE.MeshStandardMaterial({ color: 0xd8dee9, roughness: 0.35, metalness: 0.35 })
      );
      roof.position.set(0, 12.2, 0.6);
      roof.rotation.x = 0.1;
      roof.castShadow = true;
      stand.add(roof);

      stand.position.set(x, 0, z);
      stand.rotation.y = rotY;
      targetGroup.add(stand);
    };

    const h = track.startHeading;
    const rightX = -Math.sin(h);
    const rightZ = Math.cos(h);
    const standDist = track.wallOuterOffset + 16;
    buildGrandstand(
      track.startX - rightX * standDist - Math.cos(h) * 18,
      track.startZ - rightZ * standDist - Math.sin(h) * 18,
      -h
    );
    buildGrandstand(
      track.startX + rightX * standDist + Math.cos(h) * 32,
      track.startZ + rightZ * standDist + Math.sin(h) * 32,
      -h + Math.PI
    );

    // Richer Multi-Crown Park Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.92 });
    const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x205926, roughness: 0.82 });
    const leafLightMat = new THREE.MeshStandardMaterial({ color: 0x3b8f3e, roughness: 0.76 });

    const clearance = track.wallOuterOffset + 10;
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const range = track.id === 'australia' ? 760 : 400;
    let placed = 0;
    for (let attempt = 0; attempt < 260 && placed < 56; attempt++) {
      const tx = (rand() * 2 - 1) * range;
      const tz = (rand() * 2 - 1) * range;

      if (this.isNearTrack(track, tx, tz, clearance)) continue;
      if (track.pond) {
        const dx = (tx - track.pond.x) / (track.pond.rx + 10);
        const dz = (tz - track.pond.z) / (track.pond.rz + 10);
        if (dx * dx + dz * dz < 1.1) continue;
      }

      const sc = 0.95 + rand() * 0.7;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 3.8, 8), trunkMat);
      trunk.position.y = 1.9;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), leafDarkMat);
      crown1.position.y = 5.4;
      crown1.castShadow = true;
      tree.add(crown1);

      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 1), leafLightMat);
      crown2.position.set(0.9, 6.9, -0.6);
      crown2.castShadow = true;
      tree.add(crown2);

      tree.position.set(tx, 0, tz);
      tree.scale.setScalar(sc);
      targetGroup.add(tree);
      placed++;
    }
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

  buildBarrierWall(pts, offset, height, colorA, colorB, isPirelliStyle = false) {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 64;
    const tCtx = texCanvas.getContext('2d');

    if (isPirelliStyle) {
      // Iconic Yellow & Red F1 Trackside Sponsor/Armco Barrier look
      tCtx.fillStyle = '#e6b800';
      tCtx.fillRect(0, 0, 256, 64);
      tCtx.fillStyle = '#c81d25';
      tCtx.fillRect(256, 0, 256, 64);
      tCtx.fillStyle = 'rgba(20, 20, 20, 0.28)';
      tCtx.fillRect(0, 0, 512, 8);
      tCtx.fillRect(0, 52, 512, 12);
    } else {
      tCtx.fillStyle = colorA;
      tCtx.fillRect(0, 0, 256, 64);
      tCtx.fillStyle = colorB;
      tCtx.fillRect(256, 0, 256, 64);
      tCtx.fillStyle = 'rgba(0,0,0,0.22)';
      tCtx.fillRect(0, 52, 512, 12);
    }

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

      const u = p.s / 24;
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
      roughness: 0.42,
      metalness: 0.22,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildTrack3D(track, targetGroup) {
    const pts = track.pts;

    // 1. High-Detail PBR Asphalt Texture + Roughness Map
    const aCanvas = document.createElement('canvas');
    aCanvas.width = 512;
    aCanvas.height = 512;
    const aCtx = aCanvas.getContext('2d');

    aCtx.fillStyle = '#2d313b';
    aCtx.fillRect(0, 0, 512, 512);

    // Fine mineral grain
    for (let i = 0; i < 6000; i++) {
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.07)';
      aCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 3);
    }

    // Rubberized racing groove with subtle gradient
    const grooveGrad = aCtx.createLinearGradient(120, 0, 392, 0);
    grooveGrad.addColorStop(0, 'rgba(12, 14, 18, 0)');
    grooveGrad.addColorStop(0.5, 'rgba(12, 14, 18, 0.32)');
    grooveGrad.addColorStop(1, 'rgba(12, 14, 18, 0)');
    aCtx.fillStyle = grooveGrad;
    aCtx.fillRect(120, 0, 272, 512);

    // Crisp white edge lines
    aCtx.fillStyle = '#eef2f7';
    aCtx.fillRect(8, 0, 12, 512);
    aCtx.fillRect(492, 0, 12, 512);

    // Subtle centerline dashes
    aCtx.fillStyle = 'rgba(255,255,255,0.18)';
    aCtx.fillRect(254, 40, 4, 175);
    aCtx.fillRect(254, 295, 4, 175);

    const asphaltTex = new THREE.CanvasTexture(aCanvas);
    asphaltTex.wrapS = THREE.ClampToEdgeWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.anisotropy = 8;
    asphaltTex.encoding = THREE.sRGBEncoding;

    targetGroup.add(
      this.buildRibbonMesh(
        pts,
        -track.halfWidth,
        track.halfWidth,
        0.025,
        new THREE.MeshStandardMaterial({
          map: asphaltTex,
          roughness: 0.62,
          metalness: 0.14,
        }),
        22
      )
    );

    // 2. Red-and-White Kerbs on all corner segments
    const kCanvas = document.createElement('canvas');
    kCanvas.width = 64;
    kCanvas.height = 128;
    const kCtx = kCanvas.getContext('2d');
    kCtx.fillStyle = '#e02436';
    kCtx.fillRect(0, 0, 64, 64);
    kCtx.fillStyle = '#f5f7fa';
    kCtx.fillRect(0, 64, 64, 64);

    const kerbTex = new THREE.CanvasTexture(kCanvas);
    kerbTex.wrapS = THREE.ClampToEdgeWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.encoding = THREE.sRGBEncoding;

    const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.65 });

    let seg = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].isCorner) {
        seg.push(pts[i]);
      } else if (seg.length > 0) {
        if (seg.length >= 2) {
          targetGroup.add(
            this.buildRibbonMesh(
              seg,
              -track.halfWidth - 0.1,
              -track.halfWidth + track.kerbWidth,
              0.045,
              kerbMat,
              6
            )
          );
          targetGroup.add(
            this.buildRibbonMesh(
              seg,
              track.halfWidth - track.kerbWidth,
              track.halfWidth + 0.1,
              0.045,
              kerbMat,
              6
            )
          );
        }
        seg = [];
      }
    }
    if (seg.length >= 2) {
      targetGroup.add(
        this.buildRibbonMesh(seg, -track.halfWidth - 0.1, -track.halfWidth + track.kerbWidth, 0.045, kerbMat, 6)
      );
      targetGroup.add(
        this.buildRibbonMesh(seg, track.halfWidth - track.kerbWidth, track.halfWidth + 0.1, 0.045, kerbMat, 6)
      );
    }

    // 3. Pirelli-style Yellow/Red Outer Wall + Armco White/Blue Inner Wall
    targetGroup.add(this.buildBarrierWall(pts, track.wallOuterOffset, 1.4, '#e6b800', '#c81d25', true));
    targetGroup.add(this.buildBarrierWall(pts, -track.wallInnerOffset, 1.2, '#e2e8f0', '#2b6cb0', false));

    // 4. Start/Finish Checkered Line + 3D Start Gantry
    const sfCanvas = document.createElement('canvas');
    sfCanvas.width = 256;
    sfCanvas.height = 32;
    const sfCtx = sfCanvas.getContext('2d');
    const cols = 16;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        sfCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#141720';
        sfCtx.fillRect(c * (256 / cols), r * 16, 256 / cols, 16);
      }
    }
    const sfTex = new THREE.CanvasTexture(sfCanvas);
    sfTex.encoding = THREE.sRGBEncoding;

    const startGroup = new THREE.Group();
    startGroup.position.set(track.startX, 0, track.startZ);
    startGroup.rotation.y = -track.startHeading;

    const finishStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, track.halfWidth * 2 - 0.8),
      new THREE.MeshStandardMaterial({ map: sfTex, roughness: 0.7 })
    );
    finishStrip.rotation.x = -Math.PI / 2;
    finishStrip.position.y = 0.04;
    finishStrip.receiveShadow = true;
    startGroup.add(finishStrip);

    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.4, metalness: 0.5 });
    const yellowTrim = new THREE.MeshStandardMaterial({ color: 0xffd22b, roughness: 0.3 });

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 7.2, 1.1), darkMetal);
      pillar.position.set(0, 3.6, side * (track.halfWidth + 1.6));
      pillar.castShadow = true;
      startGroup.add(pillar);
    }

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.5, track.halfWidth * 2 + 4.4),
      darkMetal
    );
    beam.position.set(0, 7.1, 0);
    beam.castShadow = true;
    startGroup.add(beam);

    const beamTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.25, track.halfWidth * 2 + 4.4),
      yellowTrim
    );
    beamTrim.position.set(0, 7.8, 0);
    startGroup.add(beamTrim);

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
      startGroup.add(pod);
      this.gantryLamps.push(lampMat);
    }

    targetGroup.add(startGroup);
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
      this.spawnParticle(car, car.surface === 'grass' ? 0x62a346 : 0xdde3ec, 0.45, false);
    } else if (car.surface === 'grass' && car.speed > 10) {
      this.spawnParticle(car, 0x5c9b3f, 0.36, false);
    }

    // Titanium plank sparks on kerbs or top-speed bottoming out!
    if ((car.surface === 'kerb' && car.speed > 55) || (car.speedKmh > 315 && Math.random() < 0.32)) {
      this.spawnParticle(car, 0xffaa22, 0.22, true);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.isSpark) p.vy -= 9.8 * dt;
      p.life -= dt;

      const ratio = Math.max(0.01, p.life / p.maxLife);
      if (!p.isSpark) {
        const scale = 1 + (1 - ratio) * 1.8;
        p.mesh.scale.setScalar(scale);
      }
      p.mesh.material.opacity = ratio * (p.isSpark ? 0.95 : 0.55);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  spawnParticle(car, colorHex, maxLife, isSpark) {
    if (this.particles.length > 120) return;
    const cos = Math.cos(car.heading);
    const sin = Math.sin(car.heading);
    const side = isSpark ? (Math.random() - 0.5) * 0.6 : (Math.random() - 0.5) * 1.7;

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: isSpark ? 0.95 : 0.55,
    });
    const mesh = new THREE.Mesh(isSpark ? this.sparkGeo : this.particleGeo, mat);
    mesh.position.set(
      car.x - cos * 2.1 - sin * side,
      isSpark ? 0.14 : 0.32,
      car.y - sin * 2.1 + cos * side
    );
    if (isSpark) {
      mesh.rotation.y = -car.heading;
    }
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      isSpark,
      vx: (Math.random() - 0.5) * (isSpark ? 5 : 2.4) - (isSpark ? cos * 8 : 0),
      vy: isSpark ? 1.5 + Math.random() * 2.5 : 0.8 + Math.random() * 1.2,
      vz: (Math.random() - 0.5) * (isSpark ? 5 : 2.4) - (isSpark ? sin * 8 : 0),
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
      const cos = Math.cos(car.heading);
      const sin = Math.sin(car.heading);
      this.chaseCamPos.set(car.x - cos * 8, 3.2, car.y - sin * 8);
      this.chaseLookPos.set(car.x + cos * 6, 0.9, car.y + sin * 6);
    }
  }

  updateCamera(car, dt) {
    if (!this.carVisual) return;
    const root = this.carVisual.root;
    root.updateMatrixWorld(true);

    const speedRatio = Math.min(1, car.speed / 104);
    const gShiftX = (car.brake - car.throttle * 0.4) * 0.04;
    const rumble =
      car.surface === 'grass'
        ? (Math.random() - 0.5) * 0.035
        : car.surface === 'kerb'
        ? (Math.random() - 0.5) * 0.016
        : 0;

    if (this.cameraMode === 'tcam') {
      // Broadcast T-Cam angle framed over helmet, curved Halo, mirrors & wheel deflectors
      const pos = new THREE.Vector3(-0.46 + gShiftX, 1.22 + rumble, 0.0);
      const look = new THREE.Vector3(14, 0.42, 0);
      root.localToWorld(pos);
      root.localToWorld(look);
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      this.camera.fov = 68 + speedRatio * 11;
    } else if (this.cameraMode === 'cockpit') {
      const pos = new THREE.Vector3(-0.06 + gShiftX, 0.82 + rumble * 0.7, 0);
      const look = new THREE.Vector3(18, 0.62, 0);
      root.localToWorld(pos);
      root.localToWorld(look);
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      this.camera.fov = 74 + speedRatio * 10;
    } else if (this.cameraMode === 'wing') {
      const pos = new THREE.Vector3(2.22, 0.42 + rumble * 1.1, 0);
      const look = new THREE.Vector3(20, 0.34, 0);
      root.localToWorld(pos);
      root.localToWorld(look);
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      this.camera.fov = 82 + speedRatio * 11;
    } else {
      const cos = Math.cos(car.heading);
      const sin = Math.sin(car.heading);
      const targetPos = new THREE.Vector3(
        car.x - cos * 7.6,
        3.1 + speedRatio * 0.45,
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
      this.camera.fov = 64 + speedRatio * 10;
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

    // Keep shadow frustum locked tightly around the car for crisp grounded tire/wing shadows
    if (this.sun) {
      this.sun.position.set(car.x + 45, 55, car.y - 60);
      this.sun.target.position.set(car.x, 0, car.y);
      this.sun.target.updateMatrixWorld();
    }

    this.updateParticles(car, dt);
    this.updateCamera(car, dt);
    this.renderer.render(this.scene, this.camera);
    this.renderMinimap(car);
  }

  renderMinimap(car) {
    const ctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    const tr = this.track;

    ctx.clearRect(0, 0, mw, mh);

    ctx.save();
    ctx.translate(mw / 2 + tr.minimapOffsetX, mh / 2 + tr.minimapOffsetZ);
    ctx.scale(tr.minimapScale, tr.minimapScale);

    ctx.beginPath();
    for (let i = 0; i < tr.pts.length; i++) {
      const p = tr.pts[i];
      if (i === 0) ctx.moveTo(p.x, p.z);
      else ctx.lineTo(p.x, p.z);
    }
    ctx.closePath();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = tr.halfWidth * 2.4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffd22b';
    ctx.beginPath();
    ctx.arc(tr.startX, tr.startZ, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = car.team.primary;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(car.x, car.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

window.F1.RaceRenderer3D = RaceRenderer3D;
window.F1.CAMERA_MODES = CAMERA_MODES;
})();
