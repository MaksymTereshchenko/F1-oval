(() => {
const { TEAMS_2024, drawF1Car, F1CarPhysics, RaceRenderer3D, SoundEngine } = window.F1;

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const raceScreen = document.getElementById('race-screen');
const teamGrid = document.getElementById('team-grid');
const startBtn = document.getElementById('start-btn');

const viewport3d = document.getElementById('viewport-3d');
const minimapCanvas = document.getElementById('minimap-canvas');

const hudTeamDot = document.getElementById('hud-team-dot');
const hudTeamName = document.getElementById('hud-team-name');
const hudChassis = document.getElementById('hud-chassis');
const hudLap = document.getElementById('hud-lap');
const hudCurrentTime = document.getElementById('hud-current-time');
const hudBestTime = document.getElementById('hud-best-time');

const hudGear = document.getElementById('hud-gear');
const hudSpeed = document.getElementById('hud-speed');
const hudDownforceBar = document.getElementById('hud-downforce-bar');
const hudDownforceVal = document.getElementById('hud-downforce-val');
const hudGripBar = document.getElementById('hud-grip-bar');
const hudGripState = document.getElementById('hud-grip-state');
const hudThrottleBar = document.getElementById('hud-throttle-bar');
const hudBrakeBar = document.getElementById('hud-brake-bar');

const startLightsEl = document.getElementById('start-lights');
const lightsTextEl = document.getElementById('lights-text');
const lightCols = Array.from(document.querySelectorAll('.light-col'));
const lapToastEl = document.getElementById('lap-toast');

const camButtons = Array.from(document.querySelectorAll('.cam-btn'));
const volMuteBtns = Array.from(document.querySelectorAll('.vol-mute-btn'));
const volSliders = Array.from(document.querySelectorAll('.vol-slider'));
const volPctEl = document.querySelector('.vol-pct');
const restartBtn = document.getElementById('restart-btn');
const garageBtn = document.getElementById('garage-btn');

// Game State
let selectedTeam = TEAMS_2024[0];
const car = new F1CarPhysics(selectedTeam);
const renderer = new RaceRenderer3D(viewport3d, minimapCanvas);
const sound = new SoundEngine();

let isRacing = false;
let racePhase = 'menu'; // 'menu' | 'countdown' | 'running'
let countdownTimer = 0;
let litCount = 0;
let lapNumber = 1;
let lapTime = 0;
let bestLapTime = null;
let toastTimeout = null;
let lastFrameTime = performance.now();

const kbInput = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const touchInput = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const input = {
  get up() {
    return kbInput.up || touchInput.up;
  },
  get down() {
    return kbInput.down || touchInput.down;
  },
  get left() {
    return kbInput.left || touchInput.left;
  },
  get right() {
    return kbInput.right || touchInput.right;
  },
};

// ==================== MENU SETUP ====================
function buildTeamCards() {
  teamGrid.innerHTML = '';

  TEAMS_2024.forEach((team) => {
    const card = document.createElement('div');
    card.className = `team-card${team.id === selectedTeam.id ? ' selected' : ''}`;
    card.style.setProperty('--team-primary', team.primary);
    card.style.setProperty('--team-secondary', team.secondary);

    card.innerHTML = `
      <div class="team-card-top">
        <span class="team-chassis-tag">${team.chassis}</span>
        <span class="team-number">#${team.number}</span>
      </div>
      <div class="car-preview-wrap">
        <canvas width="200" height="96"></canvas>
      </div>
      <div class="team-name">${team.name}</div>
      <div class="team-driver">${team.driver} • 2024</div>
      <div class="stat-list">
        <div class="stat-row">
          <span>TOP SPEED</span>
          <div class="stat-track"><div class="stat-fill" style="width:${team.stats.topSpeed}%"></div></div>
        </div>
        <div class="stat-row">
          <span>DOWNFORCE</span>
          <div class="stat-track"><div class="stat-fill" style="width:${team.stats.downforce}%"></div></div>
        </div>
        <div class="stat-row">
          <span>ACCEL</span>
          <div class="stat-track"><div class="stat-fill" style="width:${team.stats.accel}%"></div></div>
        </div>
      </div>
    `;

    const previewCanvas = card.querySelector('canvas');
    const pCtx = previewCanvas.getContext('2d');
    pCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
    drawF1Car(pCtx, team, { scale: 2.25, showShadow: true });

    card.addEventListener('click', () => {
      selectedTeam = team;
      document.querySelectorAll('.team-card').forEach((el) => el.classList.remove('selected'));
      card.classList.add('selected');
    });

    teamGrid.appendChild(card);
  });
}

// ==================== CAMERA CONTROLS ====================
function setCamera(mode) {
  renderer.setCameraMode(mode);
  camButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cam === mode);
  });
}

camButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setCamera(btn.dataset.cam);
    btn.blur();
  });
});

// ==================== RACE FLOW ====================
function startRace() {
  sound.init();
  car.setTeam(selectedTeam);
  menuScreen.classList.remove('active');
  raceScreen.classList.add('active');
  renderer.resize();

  hudTeamDot.style.background = `linear-gradient(180deg, ${selectedTeam.primary}, ${selectedTeam.secondary})`;
  hudTeamName.textContent = selectedTeam.name.toUpperCase();
  hudChassis.textContent = `${selectedTeam.chassis} • #${selectedTeam.number}`;

  isRacing = true;
  resetSession();
}

function resetSession() {
  car.reset();
  renderer.resetEffects(car);
  renderer.setGantryLights(0, false);

  lapNumber = 1;
  lapTime = 0;
  bestLapTime = null;
  hudLap.textContent = '1';
  hudCurrentTime.textContent = formatTime(0);
  hudBestTime.textContent = '--:--.--';

  racePhase = 'countdown';
  countdownTimer = 0;
  litCount = 0;

  startLightsEl.classList.remove('hidden');
  lightsTextEl.textContent = 'LIGHTS OUT SOON...';
  lightCols.forEach((col) => {
    col.classList.remove('on', 'go');
  });
}

function backToGarage() {
  isRacing = false;
  racePhase = 'menu';
  sound.update(0, 0, 0, false);
  raceScreen.classList.remove('active');
  menuScreen.classList.add('active');
}

function updateCountdown(dt) {
  countdownTimer += dt;
  const targetLights = Math.min(5, Math.floor(countdownTimer / 0.55));

  while (litCount < targetLights) {
    lightCols[litCount].classList.add('on');
    sound.playBeep(480, 0.12);
    litCount++;
  }
  renderer.setGantryLights(litCount, false);

  if (countdownTimer >= 3.25) {
    racePhase = 'running';
    lightCols.forEach((col) => {
      col.classList.remove('on');
      col.classList.add('go');
    });
    renderer.setGantryLights(5, true);
    lightsTextEl.textContent = 'LIGHTS OUT AND AWAY WE GO!';
    sound.playBeep(880, 0.25);

    setTimeout(() => {
      if (racePhase === 'running') {
        startLightsEl.classList.add('hidden');
        renderer.setGantryLights(0, false);
      }
    }, 900);
  }
}

function showToast(text) {
  lapToastEl.textContent = text;
  lapToastEl.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    lapToastEl.classList.add('hidden');
  }, 2400);
}

function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  const whole = Math.floor(rem);
  const hundredths = Math.floor((rem - whole) * 100);
  return `${String(mins).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function updateHUD() {
  hudSpeed.textContent = car.speedKmh;
  hudGear.textContent = car.gear;
  hudCurrentTime.textContent = formatTime(lapTime);

  const dfPct = Math.min(100, (car.downforceG / 4.2) * 100);
  hudDownforceBar.style.width = `${dfPct.toFixed(0)}%`;
  hudDownforceVal.textContent = `${car.downforceG.toFixed(1)}G`;

  const gripPct = Math.min(100, car.gripUsage * 85);
  hudGripBar.style.width = `${gripPct.toFixed(0)}%`;
  if (car.gripUsage > 1.02) {
    hudGripState.textContent = 'SLIP!';
    hudGripState.style.color = '#ff3b58';
  } else if (car.gripUsage > 0.78) {
    hudGripState.textContent = 'LIMIT';
    hudGripState.style.color = '#ffd22b';
  } else {
    hudGripState.textContent = 'OK';
    hudGripState.style.color = '#2ee58f';
  }

  hudThrottleBar.style.height = `${Math.round(car.throttle * 100)}%`;
  hudBrakeBar.style.height = `${Math.round(car.brake * 100)}%`;
}

// ==================== MAIN LOOP ====================
function loop(now) {
  const rawDt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  const dt = Math.min(0.05, Math.max(0.001, rawDt));

  if (isRacing) {
    if (racePhase === 'countdown') {
      updateCountdown(dt);
      car.step(dt, input, false);
      sound.update(0.2 + (input.up ? 0.35 : 0), input.up ? 0.5 : 0, 0, true);
    } else if (racePhase === 'running') {
      lapTime += dt;
      const { crossedFinish } = car.step(dt, input, true);

      if (crossedFinish) {
        const finishedTime = lapTime;
        if (bestLapTime === null || finishedTime < bestLapTime) {
          bestLapTime = finishedTime;
          hudBestTime.textContent = formatTime(bestLapTime);
          showToast(`FASTEST LAP! ${formatTime(bestLapTime)}`);
        } else {
          showToast(`LAP ${lapNumber} • ${formatTime(finishedTime)}`);
        }
        lapNumber += 1;
        lapTime = 0;
        hudLap.textContent = String(lapNumber);
      }

      const slipAudio = car.isSliding ? Math.max(0.4, car.gripUsage - 0.65) : 0;
      sound.update(car.rpmRatio, car.throttle, slipAudio, true);
    }

    renderer.render(car, dt);
    updateHUD();
  }

  requestAnimationFrame(loop);
}

// ==================== INPUT & EVENTS ====================
function handleKey(e, isDown) {
  const keyLower = (e.key || '').toLowerCase();

  if (isDown && !e.repeat && (e.code === 'KeyC' || keyLower === 'c' || keyLower === 'с')) {
    if (isRacing) {
      const mode = renderer.cycleCameraMode();
      setCamera(mode);
    }
    return;
  }

  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      kbInput.up = isDown;
      break;
    case 'KeyS':
    case 'ArrowDown':
      kbInput.down = isDown;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      kbInput.left = isDown;
      break;
    case 'KeyD':
    case 'ArrowRight':
      kbInput.right = isDown;
      break;
    case 'Digit1':
      if (isDown && !e.repeat && isRacing) setCamera('tcam');
      break;
    case 'Digit2':
      if (isDown && !e.repeat && isRacing) setCamera('cockpit');
      break;
    case 'Digit3':
      if (isDown && !e.repeat && isRacing) setCamera('wing');
      break;
    case 'Digit4':
      if (isDown && !e.repeat && isRacing) setCamera('chase');
      break;
    case 'KeyR':
      if (isDown && !e.repeat && isRacing) resetSession();
      break;
    case 'KeyM':
      if (isDown && !e.repeat) toggleMute();
      break;
    default:
      return;
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
}

function syncVolumeUI() {
  const pct = Math.round(sound.volume * 100);
  const icon = sound.muted || pct === 0 ? '🔇' : pct < 45 ? '🔉' : '🔊';
  volMuteBtns.forEach((btn) => {
    btn.textContent = icon;
  });
  volSliders.forEach((slider) => {
    slider.value = String(sound.muted ? 0 : pct);
  });
  if (volPctEl) {
    volPctEl.textContent = `${sound.muted ? 0 : pct}%`;
  }
}

function toggleMute() {
  sound.init();
  if (sound.muted && sound.volume === 0) {
    sound.setVolume(0.45);
  } else {
    sound.setMuted(!sound.muted);
  }
  syncVolumeUI();
}

volMuteBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleMute();
    btn.blur();
  });
});

volSliders.forEach((slider) => {
  slider.addEventListener('input', (e) => {
    sound.init();
    const val = parseInt(e.target.value, 10) / 100;
    sound.setVolume(val);
    syncVolumeUI();
  });
  slider.addEventListener('change', () => slider.blur());
});

syncVolumeUI();

function bindTouchButton(btnId, controlKey) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const activePointers = new Set();

  const updateState = () => {
    const active = activePointers.size > 0;
    touchInput[controlKey] = active;
    btn.classList.toggle('pressed', active);
  };

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    document.body.classList.add('is-touch');
    sound.init();
    activePointers.add(e.pointerId);
    if (btn.setPointerCapture) {
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
    updateState();
  });

  const release = (e) => {
    if (activePointers.delete(e.pointerId)) {
      updateState();
    }
  };

  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindTouchButton('touch-left', 'left');
bindTouchButton('touch-right', 'right');
bindTouchButton('touch-brake', 'down');
bindTouchButton('touch-gas', 'up');

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add('is-touch');
}

window.addEventListener(
  'touchstart',
  () => {
    document.body.classList.add('is-touch');
    sound.init();
  },
  { passive: true, once: true }
);

window.addEventListener('resize', () => {
  if (isRacing) renderer.resize();
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (isRacing) renderer.resize();
  }, 150);
});
window.addEventListener('keydown', (e) => handleKey(e, true));
window.addEventListener('keyup', (e) => handleKey(e, false));
window.addEventListener('blur', () => {
  kbInput.up = false;
  kbInput.down = false;
  kbInput.left = false;
  kbInput.right = false;
  touchInput.up = false;
  touchInput.down = false;
  touchInput.left = false;
  touchInput.right = false;
});

startBtn.addEventListener('click', startRace);
restartBtn.addEventListener('click', resetSession);
garageBtn.addEventListener('click', backToGarage);

buildTeamCards();
requestAnimationFrame(loop);
})();
