(() => {
const { TRACK, drawF1Car } = window.F1;

const PX_PER_M = 8.5;

class RaceRenderer {
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');

    this.camX = 0;
    this.camY = TRACK.cornerRadius;
    this.camZoom = 1;

    this.skidMarks = [];
    this.particles = [];
    this.trees = this.generateTrees();
    this.lastCarPos = null;
  }

  generateTrees() {
    const items = [];
    const L = TRACK.straightHalfLen;
    const R = TRACK.cornerRadius;

    // Deterministic decorative cartoon trees inside infield & outside barriers
    const seeds = [
      [-95, -55, 16], [-45, -72, 13], [45, -70, 15], [95, -52, 14],
      [-95, 58, 15], [-30, 74, 12], [55, 72, 16], [105, 55, 14],
      [-210, -185, 20], [-145, -205, 18], [150, -205, 19], [220, -180, 22],
      [-235, 175, 21], [-155, 200, 17], [160, 198, 20], [235, 170, 18],
      [-315, -75, 22], [-320, 65, 19], [315, -70, 21], [322, 70, 18],
    ];

    for (const [x, y, r] of seeds) {
      // Ensure tree is never on track
      const sx = Math.max(-L, Math.min(L, x));
      const d = Math.hypot(x - sx, y);
      if (Math.abs(d - R) > TRACK.wallOuterOffset + 6) {
        items.push({ x, y, r });
      }
    }
    return items;
  }

  resetEffects() {
    this.skidMarks = [];
    this.particles = [];
    this.lastCarPos = null;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
  }

  updateEffects(car, dt) {
    // Skid marks when sliding or hard braking on asphalt
    if ((car.isSliding || car.brake > 0.6) && car.speed > 18 && car.surface !== 'grass') {
      const cos = Math.cos(car.heading);
      const sin = Math.sin(car.heading);
      const rearX = car.x - cos * 2.1;
      const rearY = car.y - sin * 2.1;
      const halfAxle = 1.15;

      const lx = rearX - sin * halfAxle;
      const ly = rearY + cos * halfAxle;
      const rx = rearX + sin * halfAxle;
      const ry = rearY - cos * halfAxle;

      if (this.lastCarPos) {
        this.skidMarks.push({
          x1: this.lastCarPos.lx,
          y1: this.lastCarPos.ly,
          x2: lx,
          y2: ly,
          alpha: car.isSliding ? 0.45 : 0.25,
        });
        this.skidMarks.push({
          x1: this.lastCarPos.rx,
          y1: this.lastCarPos.ry,
          x2: rx,
          y2: ry,
          alpha: car.isSliding ? 0.45 : 0.25,
        });

        if (this.skidMarks.length > 900) {
          this.skidMarks.splice(0, 2);
        }
      }
      this.lastCarPos = { lx, ly, rx, ry };
    } else {
      this.lastCarPos = null;
    }

    // Tire smoke / grass dust particles
    if (car.isSliding && car.speed > 20) {
      this.spawnParticle(car, car.surface === 'grass' ? '#70b84f' : '#e6ebf2', 0.48, 0.42);
    } else if (car.surface === 'grass' && car.speed > 10) {
      this.spawnParticle(car, '#69b347', 0.4, 0.35);
    }

    // Aero wingtip streaks at high downforce (> 220 km/h)
    if (car.speedKmh > 220 && Math.random() < 0.55) {
      const cos = Math.cos(car.heading);
      const sin = Math.sin(car.heading);
      const side = Math.random() > 0.5 ? 1.25 : -1.25;
      this.particles.push({
        x: car.x - cos * 3.1 - sin * side,
        y: car.y - sin * 3.1 + cos * side,
        vx: -car.vx * 0.05,
        vy: -car.vy * 0.05,
        r: 0.25,
        grow: 0.35,
        life: 0.22,
        maxLife: 0.22,
        color: 'rgba(255,255,255,0.55)',
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.grow * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnParticle(car, color, radius, life) {
    const cos = Math.cos(car.heading);
    const sin = Math.sin(car.heading);
    const side = (Math.random() - 0.5) * 2.2;
    this.particles.push({
      x: car.x - cos * 2.4 - sin * side + (Math.random() - 0.5) * 0.5,
      y: car.y - sin * 2.4 + cos * side + (Math.random() - 0.5) * 0.5,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      r: radius,
      grow: 1.6,
      life,
      maxLife: life,
      color,
    });
  }

  render(car, dt) {
    this.resize();
    this.updateEffects(car, dt);

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Smooth camera follow + slight look-ahead + subtle speed zoom
    const lookAheadX = car.vx * 0.22;
    const lookAheadY = car.vy * 0.22;
    this.camX += (car.x + lookAheadX - this.camX) * Math.min(1, dt * 8.5);
    this.camY += (car.y + lookAheadY - this.camY) * Math.min(1, dt * 8.5);

    const speedRatio = Math.min(1, car.speed / 95);
    const targetZoom = 1.08 - speedRatio * 0.24;
    this.camZoom += (targetZoom - this.camZoom) * Math.min(1, dt * 4);

    // Clear with stylized grass green
    ctx.fillStyle = '#3b963f';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(dpr * this.camZoom * PX_PER_M, dpr * this.camZoom * PX_PER_M);
    ctx.translate(-this.camX, -this.camY);

    this.drawGrassStripes(ctx);
    this.drawGrandstands(ctx);
    this.drawInfieldDecor(ctx);
    this.drawOvalTrack(ctx);
    this.drawSkidMarks(ctx);
    this.drawParticles(ctx);

    // Draw F1 Car (convert px drawing into meter scale)
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);
    // Car asset is 66px long -> ~5.6m long at scale 0.088
    drawF1Car(ctx, car.team, {
      steerAngle: car.steerAngle * 1.15,
      isBraking: car.brake > 0.2,
      throttle: car.throttle,
      showShadow: true,
      scale: 0.092,
    });
    ctx.restore();

    this.drawTrees(ctx);
    ctx.restore();

    this.renderMinimap(car);
  }

  drawGrassStripes(ctx) {
    ctx.save();
    ctx.fillStyle = '#43a347';
    for (let x = -460; x <= 460; x += 28) {
      ctx.fillRect(x, -320, 14, 640);
    }
    ctx.restore();
  }

  drawInfieldDecor(ctx) {
    const L = TRACK.straightHalfLen;
    // Cartoon Infield Emblem & Pit Lane Apron
    ctx.save();
    ctx.fillStyle = 'rgba(24, 92, 34, 0.35)';
    this.stadiumPath(ctx, L, TRACK.cornerRadius - TRACK.wallInnerOffset - 10);
    ctx.fill();

    // Stylized Infield Pond
    ctx.fillStyle = '#29b6f6';
    ctx.strokeStyle = '#d4b46a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(-45, 0, 36, 20, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Water highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-50, -4, 14, 0.2, 1.4);
    ctx.stroke();

    // Infield text logo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = 'italic 900 18px "Exo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F1 OVAL 2024', 42, -5);
    ctx.font = '800 7px "Exo 2", sans-serif';
    ctx.fillText('FLAT CIRCUIT • HIGH DOWNFORCE', 42, 10);
    ctx.restore();
  }

  drawGrandstands(ctx) {
    const L = TRACK.straightHalfLen;
    const R = TRACK.cornerRadius;
    const yBottom = R + TRACK.wallOuterOffset + 8;
    const yTop = -(R + TRACK.wallOuterOffset + 22);

    const drawStand = (x, y, width, height, flip) => {
      ctx.save();
      // Concrete base
      ctx.fillStyle = '#4e586e';
      ctx.strokeStyle = '#1f2533';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      // Tiered colorful cartoon crowd seats
      const rowColors = ['#ff3b5c', '#ffd22b', '#2de2e6', '#ffffff'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = rowColors[i];
        const ry = flip ? y + 2 + i * 3 : y + height - 5 - i * 3;
        ctx.fillRect(x + 2, ry, width - 4, 2.1);
      }
      ctx.restore();
    };

    drawStand(-95, yBottom, 80, 14, true);
    drawStand(15, yBottom, 80, 14, true);
    drawStand(-95, yTop, 80, 14, false);
    drawStand(15, yTop, 80, 14, false);
  }

  drawOvalTrack(ctx) {
    const L = TRACK.straightHalfLen;
    const R = TRACK.cornerRadius;

    // 1. Outer & Inner Barrier Walls (cartoon red/white alternating curb wall)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer barrier shadow & wall
    this.stadiumPath(ctx, L, R + TRACK.wallOuterOffset);
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = '#e52538';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner barrier wall
    this.stadiumPath(ctx, L, R - TRACK.wallInnerOffset);
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = '#2474e5';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Main Asphalt Surface
    this.stadiumPath(ctx, L, R);
    ctx.strokeStyle = '#252a36';
    ctx.lineWidth = TRACK.halfWidth * 2 + 1.2;
    ctx.stroke();

    this.stadiumPath(ctx, L, R);
    ctx.strokeStyle = '#383f4f';
    ctx.lineWidth = TRACK.halfWidth * 2;
    ctx.stroke();

    // Subtle darker racing rubber groove
    this.stadiumPath(ctx, L, R - 2.5);
    ctx.strokeStyle = 'rgba(20, 24, 32, 0.22)';
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // 3. Red-and-White Apex Kerbs on Left & Right Corners
    this.drawCornerKerbs(ctx, L, 0, -Math.PI / 2, Math.PI / 2, R);
    this.drawCornerKerbs(ctx, -L, 0, Math.PI / 2, Math.PI * 1.5, R);

    // 4. White Track Edge Lines
    this.stadiumPath(ctx, L, R + TRACK.halfWidth - 0.35);
    ctx.strokeStyle = '#f2f5fa';
    ctx.lineWidth = 0.55;
    ctx.stroke();

    this.stadiumPath(ctx, L, R - TRACK.halfWidth + 0.35);
    ctx.strokeStyle = '#f2f5fa';
    ctx.lineWidth = 0.55;
    ctx.stroke();

    // 5. Centerline dashed markings on straights
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(-L, R);
    ctx.lineTo(L, R);
    ctx.moveTo(-L, -R);
    ctx.lineTo(L, -R);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Start / Finish Checkered Line at (x = 0, y = +R)
    this.drawStartFinish(ctx, 0, R);

    ctx.restore();
  }

  drawCornerKerbs(ctx, cx, cy, startAngle, endAngle, R) {
    const outerR = R + TRACK.halfWidth - TRACK.kerbWidth * 0.45;
    const innerR = R - TRACK.halfWidth + TRACK.kerbWidth * 0.45;
    const segments = 22;
    const step = (endAngle - startAngle) / segments;

    for (let i = 0; i < segments; i++) {
      const a0 = startAngle + i * step;
      const a1 = a0 + step;
      ctx.strokeStyle = i % 2 === 0 ? '#ef2b3d' : '#ffffff';
      ctx.lineWidth = TRACK.kerbWidth;
      ctx.lineCap = 'butt';

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, a0, a1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, innerR, a0, a1);
      ctx.stroke();
    }
  }

  drawStartFinish(ctx, x, yCenter) {
    const cols = 2;
    const rows = 14;
    const cellW = 1.4;
    const cellH = (TRACK.halfWidth * 2) / rows;
    const yStart = yCenter - TRACK.halfWidth;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#141720';
        ctx.fillRect(x - cellW + c * cellW, yStart + r * cellH, cellW, cellH);
      }
    }

    // Painted starting grid box behind the line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(x - 3.5, yCenter - 2.2);
    ctx.lineTo(x - 2.4, yCenter - 2.2);
    ctx.lineTo(x - 2.4, yCenter + 2.2);
    ctx.lineTo(x - 3.5, yCenter + 2.2);
    ctx.stroke();

    // Overhead Start Gantry Banner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + 1.2, yCenter - TRACK.halfWidth - 2, 2.2, TRACK.halfWidth * 2 + 4);

    ctx.fillStyle = '#1b2236';
    ctx.strokeStyle = '#ffd22b';
    ctx.lineWidth = 0.5;
    ctx.fillRect(x - 1.2, yCenter - TRACK.halfWidth - 2.2, 2.4, TRACK.halfWidth * 2 + 4.4);
    ctx.strokeRect(x - 1.2, yCenter - TRACK.halfWidth - 2.2, 2.4, TRACK.halfWidth * 2 + 4.4);
  }

  drawSkidMarks(ctx) {
    if (this.skidMarks.length === 0) return;
    ctx.save();
    ctx.lineWidth = 0.55;
    ctx.lineCap = 'round';
    for (const s of this.skidMarks) {
      ctx.strokeStyle = `rgba(18, 20, 26, ${s.alpha})`;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.65;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawTrees(ctx) {
    for (const t of this.trees) {
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.arc(t.x + 2, t.y + 2.5, t.r, 0, Math.PI * 2);
      ctx.fill();

      // Dark outer foliage
      ctx.fillStyle = '#256d2b';
      ctx.strokeStyle = '#184a1c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lighter cartoon crown highlight
      ctx.fillStyle = '#48b84f';
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.2, t.y - t.r * 0.2, t.r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  stadiumPath(ctx, L, R) {
    ctx.beginPath();
    ctx.moveTo(-L, R);
    ctx.lineTo(L, R);
    ctx.arc(L, 0, R, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(-L, -R);
    ctx.arc(-L, 0, R, -Math.PI / 2, Math.PI / 2, true);
    ctx.closePath();
  }

  renderMinimap(car) {
    const ctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    ctx.clearRect(0, 0, mw, mh);

    ctx.save();
    ctx.translate(mw / 2, mh / 2);
    const scale = 0.25;
    ctx.scale(scale, scale);

    // Oval track outline
    this.stadiumPath(ctx, TRACK.straightHalfLen, TRACK.cornerRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = TRACK.halfWidth * 2.2;
    ctx.stroke();

    // Start/finish tick
    ctx.fillStyle = '#ffd22b';
    ctx.fillRect(-5, TRACK.cornerRadius - 20, 10, 40);

    // Car marker
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

window.F1.RaceRenderer = RaceRenderer;
})();
