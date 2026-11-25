(() => {
window.F1 = window.F1 || {};

const TEAMS_2024 = [
  {
    id: 'mclaren',
    name: 'McLaren',
    fullName: 'McLaren Formula 1 Team',
    chassis: 'MCL38',
    number: '4',
    driver: 'L. Norris',
    primary: '#FF8000',
    secondary: '#1B1D24',
    accent: '#27C4FF',
    helmet: '#D8FF00',
    stats: {
      topSpeed: 94,
      downforce: 96,
      accel: 95,
    },
    tuning: {
      maxSpeedMs: 99.0,      // ~356 km/h base (~380+ with ERS + DRS)
      accelForce: 43.0,
      downforceCoeff: 0.0092,
      mechGrip: 22.0,
    },
  },
  {
    id: 'redbull',
    name: 'Red Bull',
    fullName: 'Oracle Red Bull Racing',
    chassis: 'RB20',
    number: '1',
    driver: 'M. Verstappen',
    primary: '#1E326E',
    secondary: '#DC0000',
    accent: '#FFD300',
    helmet: '#FF2A4B',
    stats: {
      topSpeed: 98,
      downforce: 94,
      accel: 94,
    },
    tuning: {
      maxSpeedMs: 100.5,     // ~362 km/h base (~385+ with ERS + DRS)
      accelForce: 42.2,
      downforceCoeff: 0.0089,
      mechGrip: 21.5,
    },
  },
  {
    id: 'ferrari',
    name: 'Ferrari',
    fullName: 'Scuderia Ferrari HP',
    chassis: 'SF-24',
    number: '16',
    driver: 'C. Leclerc',
    primary: '#DC0000',
    secondary: '#FFF200',
    accent: '#FFFFFF',
    helmet: '#FFFFFF',
    stats: {
      topSpeed: 96,
      downforce: 92,
      accel: 98,
    },
    tuning: {
      maxSpeedMs: 99.6,      // ~359 km/h base
      accelForce: 44.2,
      downforceCoeff: 0.0087,
      mechGrip: 22.4,
    },
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    fullName: 'Mercedes-AMG Petronas',
    chassis: 'W15',
    number: '44',
    driver: 'L. Hamilton',
    primary: '#191D24',
    secondary: '#00D2BE',
    accent: '#C9D1D9',
    helmet: '#A6FF00',
    stats: {
      topSpeed: 93,
      downforce: 95,
      accel: 94,
    },
    tuning: {
      maxSpeedMs: 98.4,      // ~354 km/h base
      accelForce: 42.5,
      downforceCoeff: 0.0091,
      mechGrip: 22.8,
    },
  },
];

function drawF1Car(ctx, team, options = {}) {
  const {
    steerAngle = 0,
    isBraking = false,
    throttle = 0,
    showShadow = true,
    scale = 1,
  } = options;

  ctx.save();
  ctx.scale(scale, scale);

  if (showShadow) {
    ctx.save();
    ctx.translate(4, 5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    roundRectPath(ctx, -33, -15, 66, 30, 8);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = '#1d222c';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(15, -4);
  ctx.lineTo(17, -12);
  ctx.moveTo(15, 4);
  ctx.lineTo(17, 12);
  ctx.moveTo(-19, -5);
  ctx.lineTo(-20, -12);
  ctx.moveTo(-19, 5);
  ctx.lineTo(-20, 12);
  ctx.stroke();

  drawTire(ctx, -20, -12.5, 13, 6.6, 0, team.accent);
  drawTire(ctx, -20, 12.5, 13, 6.6, 0, team.accent);
  drawTire(ctx, 17, -12.5, 12.2, 6.2, steerAngle, team.accent);
  drawTire(ctx, 17, 12.5, 12.2, 6.2, steerAngle, team.accent);

  ctx.fillStyle = team.secondary;
  ctx.strokeStyle = '#11151d';
  ctx.lineWidth = 1.8;
  roundRectPath(ctx, -33, -12.5, 8, 25, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = team.primary;
  ctx.fillRect(-31, -10.5, 3, 21);

  ctx.fillStyle = '#141820';
  roundRectPath(ctx, -25, -10, 38, 20, 5);
  ctx.fill();

  ctx.fillStyle = team.primary;
  ctx.strokeStyle = '#0e121a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-25, -5.5);
  ctx.lineTo(-14, -9.5);
  ctx.lineTo(6, -8.8);
  ctx.lineTo(12, -4.5);
  ctx.lineTo(31, -2.5);
  ctx.quadraticCurveTo(34.5, 0, 31, 2.5);
  ctx.lineTo(12, 4.5);
  ctx.lineTo(6, 8.8);
  ctx.lineTo(-14, 9.5);
  ctx.lineTo(-25, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = team.secondary;
  ctx.beginPath();
  ctx.moveTo(-18, -7);
  ctx.lineTo(4, -7.2);
  ctx.lineTo(2, -4);
  ctx.lineTo(-16, -4.2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-18, 7);
  ctx.lineTo(4, 7.2);
  ctx.lineTo(2, 4);
  ctx.lineTo(-16, 4.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = team.accent;
  roundRectPath(ctx, 14, -1.8, 15, 3.6, 1.5);
  ctx.fill();

  ctx.fillStyle = team.primary;
  ctx.strokeStyle = '#0e121a';
  ctx.lineWidth = 1.8;
  roundRectPath(ctx, 25, -14.5, 7, 29, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = team.secondary;
  ctx.fillRect(24.5, -15, 8, 2.8);
  ctx.fillRect(24.5, 12.2, 8, 2.8);

  ctx.fillStyle = team.secondary;
  roundRectPath(ctx, -21, -2.4, 15, 4.8, 2);
  ctx.fill();

  ctx.fillStyle = '#0c0f15';
  roundRectPath(ctx, -5, -4.2, 13, 8.4, 4);
  ctx.fill();

  ctx.fillStyle = team.helmet;
  ctx.strokeStyle = '#0e121a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0.5, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#111622';
  ctx.beginPath();
  ctx.arc(2.1, 0, 2.1, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.fill();

  ctx.strokeStyle = '#181c26';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(-3.5, -3.7);
  ctx.quadraticCurveTo(6.5, -3.5, 8.2, 0);
  ctx.quadraticCurveTo(6.5, 3.5, -3.5, 3.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8.2, 0);
  ctx.lineTo(10.5, 0);
  ctx.stroke();

  if (isBraking) {
    ctx.fillStyle = '#ff2038';
    ctx.shadowColor = '#ff2038';
    ctx.shadowBlur = 10;
    ctx.fillRect(-34, -2, 3, 4);
    ctx.shadowBlur = 0;
  } else if (throttle > 0.7) {
    ctx.fillStyle = 'rgba(255, 190, 50, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-33, -1.6);
    ctx.lineTo(-39 - Math.random() * 4, 0);
    ctx.lineTo(-33, 1.6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawTire(ctx, cx, cy, w, h, angle, rimColor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.fillStyle = '#1b1f26';
  ctx.strokeStyle = '#090b0f';
  ctx.lineWidth = 1.4;
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = rimColor;
  ctx.fillRect(-w * 0.25, -h * 0.16, w * 0.5, h * 0.32);

  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

window.F1.TEAMS_2024 = TEAMS_2024;
window.F1.drawF1Car = drawF1Car;
})();
