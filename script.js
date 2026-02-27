const SCALE = 8;
const W = 24, H = 32;

const C = {
  rawShell: '#f5f0e8', rawShellShadow: '#c8bfae',
  water: '#3ab5e6', waterLight: '#6dd0f5', waterDark: '#1a8ab8',
  bubble: '#aae8ff', bubbleDark: '#6dc8ee',
  steam: '#d0eeff',
  white: '#fffbe8', whiteShadow: '#e8d8b0',
  yolk: '#ffcc22', yolkShadow: '#e8a800', yolkHigh: '#ffee88',
  pot: '#888', potDark: '#444', potLight: '#bbb',
  heat1: '#ff4400', heat2: '#ff8800', heat3: '#ffcc00',
};

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function drawEggShape(ctx, cx, cy, rx, ry, col, shadow, highlight) {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const topBias = dy < 0 ? 0.85 : 1.0;
      if ((dx/rx)**2 * topBias + (dy/ry)**2 * topBias <= 1.0) {
        let c = col;
        if (dx < -rx*0.4 && dy < -ry*0.3) c = highlight || col;
        else if (dx > rx*0.3 || dy > ry*0.4) c = shadow;
        px(ctx, cx+dx, cy+dy, c);
      }
    }
  }
}

function drawPot(ctx) {
  for (let row = 19; row < 29; row++)
    for (let col = 2; col < 22; col++) {
      let c = C.pot;
      if (col === 2 || col === 21) c = C.potDark;
      if (col === 3) c = C.potLight;
      px(ctx, col, row, c);
    }
  for (let col = 1; col < 23; col++) { px(ctx, col, 19, C.potLight); px(ctx, col, 20, C.pot); }
  [0,1].forEach(dx => { px(ctx, dx, 21, C.potDark); px(ctx, dx, 22, C.potDark); });
  [22,23].forEach(dx => { px(ctx, dx, 21, C.potDark); px(ctx, dx, 22, C.potDark); });
}

function drawWater(ctx, level, t) {
  const top = 20 + (8 - level);
  for (let row = top; row < 28; row++)
    for (let col = 3; col < 21; col++) {
      const wave = Math.sin(t * 0.15 + col * 0.8) > 0.3;
      let c = row === top && wave ? C.waterLight : C.water;
      if (row > top + 2) c = C.waterDark;
      px(ctx, col, row, c);
    }
}

function drawBubbles(ctx, t, intensity) {
  [{ x:6, p:0 },{ x:11, p:1.5 },{ x:16, p:3 },{ x:8, p:0.8 },{ x:14, p:2.2 }]
    .slice(0, Math.ceil(intensity * 5))
    .forEach(b => {
      const y = ((t * 0.12 + b.p * 5) % 10);
      const by = 27 - Math.floor(y);
      if (by > 20 && by < 28) {
        px(ctx, b.x, by, C.bubble);
        if (y > 7) { px(ctx, b.x-1, by, C.bubbleDark); px(ctx, b.x+1, by, C.bubbleDark); }
      }
    });
}

function drawSteam(ctx, t, intensity) {
  if (intensity < 0.3) return;
  [{ x:7, p:0 },{ x:12, p:2 },{ x:17, p:4 }].forEach(w => {
    for (let i = 0; i < 6; i++) {
      const offset = Math.sin(t * 0.08 + w.p + i) * 2;
      const y = 18 - i * 2 - ((t * 0.1 + w.p) % 6);
      if (y > 0 && y < 19) {
        ctx.globalAlpha = (1 - i/6) * intensity * 0.7;
        px(ctx, Math.round(w.x + offset), Math.floor(y), C.steam);
        ctx.globalAlpha = 1;
      }
    }
  });
}

function drawFlame(ctx, t) {
  [[10,30],[11,30],[12,30],[13,30],[9,30],[14,30],[10,29],[11,29],[12,29],[13,29],[11,28],[12,28]]
    .forEach(([x,y], i) => {
      const flicker = Math.sin(t * 0.3 + i * 0.7) > 0;
      px(ctx, x, y, i < 4 ? C.heat2 : (flicker ? C.heat1 : C.heat3));
    });
}

function drawRaw(ctx, t) {
  ctx.clearRect(0, 0, W*SCALE, H*SCALE);
  const bob = Math.round(Math.sin(t * 0.05));
  drawEggShape(ctx, 12, 16+bob, 6, 8, C.rawShell, C.rawShellShadow, '#fff');
}

function drawBoiling(ctx, t) {
  ctx.clearRect(0, 0, W*SCALE, H*SCALE);
  drawFlame(ctx, t);
  drawPot(ctx, t);
  drawWater(ctx, 5, t);
  drawBubbles(ctx, t, 0.4);
  drawSteam(ctx, t, 0.3);
  const wobble = Math.round(Math.sin(t * 0.1) * 0.5);
  drawEggShape(ctx, 12, 22+wobble, 5, 6, C.rawShell, C.rawShellShadow, '#fff');
}

function drawHighBoil(ctx, t) {
  ctx.clearRect(0, 0, W*SCALE, H*SCALE);
  drawFlame(ctx, t);
  ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 0.2);
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(4*SCALE, 26*SCALE, 16*SCALE, 4*SCALE);
  ctx.globalAlpha = 1;
  drawPot(ctx, t);
  drawWater(ctx, 6, t);
  drawBubbles(ctx, t, 1.0);
  drawSteam(ctx, t, 1.0);
  const wobble = Math.round(Math.sin(t * 0.2));
  drawEggShape(ctx, 12, 21+wobble, 5, 6, '#ede8c0', '#c8c0a0', '#fff');
  if (Math.sin(t * 0.15) > 0.5) { px(ctx, 12, 17, '#a09080'); px(ctx, 13, 18, '#a09080'); }
}

function drawDone(ctx, t) {
  ctx.clearRect(0, 0, W*SCALE, H*SCALE);
  drawFlame(ctx, t);
  drawPot(ctx, t);
  drawWater(ctx, 4, t);
  drawSteam(ctx, t, 0.5);
  drawEggShape(ctx, 12, 21, 6, 5, C.white, C.whiteShadow, '#fff');
  drawEggShape(ctx, 12, 21, 3, 3, C.yolk, C.yolkShadow, C.yolkHigh);
  [[7,14],[17,15],[5,18],[19,17]].forEach(([x,y], i) => {
    if (Math.floor((t * 0.1 + i * 1.3)) % 3 === 0) px(ctx, x, y, '#ffee88');
  });
}

// animation loop
let eggTick = 0;
const eggCanvases = {
  rawEgg:       { el: null, fn: drawRaw       },
  boiling:      { el: null, fn: drawBoiling   },
  almostBoiled: { el: null, fn: drawHighBoil  },
  cookedEgg:    { el: null, fn: drawDone      },
};

function initEggCanvases() {
  Object.entries(eggCanvases).forEach(([id, data]) => {
    data.el = document.getElementById(id);
    data.ctx = data.el.getContext('2d');
  });
}

function eggAnimLoop() {
  eggTick++;
  Object.values(eggCanvases).forEach(({ fn, ctx }) => fn(ctx, eggTick));
  requestAnimationFrame(eggAnimLoop);
}

document.addEventListener('DOMContentLoaded', () => {
  initEggCanvases();
  eggAnimLoop();
});

const startBtn      = document.getElementById('startBtn');
const statusArea    = document.querySelector('.status-area');
const controls      = document.querySelector('.controls');
const progressBar   = document.getElementById('progressBar');
const timeLeft      = document.getElementById('timeLeft');
const timerTitle    = document.getElementById('timerTitle');

const homePage  = document.getElementById('homePage');
const timerPage = document.getElementById('timerPage');

const rawEgg      = document.getElementById('rawEgg');
const boiling     = document.getElementById('boiling');
const almostBoiled = document.getElementById('almostBoiled');
const cookedEgg   = document.getElementById('cookedEgg');

const EGG_TYPES = {
    soft:   { label: '🥚 Soft Boiled',   time: 600  },  // 10 min
    medium: { label: '🍳 Medium Boiled', time: 900  },  // 15 min
    hard:   { label: '🔥 Hard Boiled',   time: 1200  },  // 20 min
};

const STAGES = [
    { pct: 0,   show: 'rawEgg'       },
    { pct: 1,  show: 'boiling'      },
    { pct: 65,  show: 'almostBoiled' },
    { pct: 100, show: 'cookedEgg'    },
];

let timerInterval = null;
let currentEggType = 'soft';

// page nav 
function openTimer(type) {
    currentEggType = type;
    const egg = EGG_TYPES[type];

    // update title
    timerTitle.textContent = egg.label + ' Timer';

    // reset timer UI
    clearInterval(timerInterval);
    timerInterval = null;
    progressBar.style.width = '0%';
    timeLeft.textContent = egg.time + ' ';
    statusArea.style.display = 'block';
    controls.style.display = 'block';
    startBtn.textContent = 'Start Timer';
    showEgg('rawEgg');

    // switch pages
    homePage.classList.add('hidden');
    timerPage.classList.remove('hidden');
}

function goBack() {
    // if timer is running, warn the user
    if (timerInterval) {
        const confirmed = confirm("Timer is still running! Are you sure you want to go back?");
        if (!confirmed) return;
    }

    // stop timer and go home
    clearInterval(timerInterval);
    timerInterval = null;

    timerPage.classList.add('hidden');
    homePage.classList.remove('hidden');
}

function hideAllEggs() {
    [rawEgg, boiling, almostBoiled, cookedEgg].forEach(img => {
        img.parentElement.style.display = 'none';
    });
}

function showEgg(id) {
    hideAllEggs();
    document.getElementById(id).parentElement.style.display = 'flex';
}

function getCurrentStage(pct) {
    let current = STAGES[0];
    for (const stage of STAGES) {
        if (pct >= stage.pct) current = stage;
    }
    return current;
}

// ringtone
function playRingtone() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047, 784, 659, 523];
    let time = ctx.currentTime;

    notes.forEach((freq) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
        time += 0.32;
    });
}

// main timer
function startTimer() {
    clearInterval(timerInterval);

    const TOTAL_TIME = EGG_TYPES[currentEggType].time;

    progressBar.style.width = '0%';
    statusArea.style.display = 'block';
    controls.style.display = 'none';
    showEgg('rawEgg');

    let elapsed = 0;

    timerInterval = setInterval(() => {
        elapsed++;
        const pct       = (elapsed / TOTAL_TIME) * 100;
        const remaining = TOTAL_TIME - elapsed;

        progressBar.style.width = pct + '%';
        timeLeft.textContent    = remaining + ' ';

        const stage = getCurrentStage(pct);
        showEgg(stage.show);

        if (elapsed >= TOTAL_TIME) {
            clearInterval(timerInterval);
            timerInterval = null;
            timeLeft.textContent = '0 ';
            playRingtone();

            startBtn.textContent = 'Boil Again?';
            controls.style.display = 'block';
        }
    }, 1000);
}

startBtn.addEventListener('click', startTimer);