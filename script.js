// This site is still underconstructuon. See anyway?
window.onload = function() {
    alert("This site is still underconstructuon. See anyway?");
};

const startBtn = document.getElementById('startBtn');
const statusArea = document.querySelector('.status-area');
const controls = document.querySelector('.controls');
const progressBar = document.getElementById('progressBar');
const timeLeft = document.getElementById('timeLeft');

// Egg images
const rawEgg = document.getElementById('rawEgg');
const boiling = document.getElementById('boiling');
const almostBoiled = document.getElementById('almostBoiled');
const cookedEgg = document.getElementById('cookedEgg');

// --- SETTINGS ---
const TOTAL_TIME = 30; 

const STAGES = [
  { pct: 0,   show: 'rawEgg'      },  // 0%   → raw egg
  { pct: 1,  show: 'boiling'     },  // 30%  → boiling (stage1)
  { pct: 65,  show: 'almostBoiled'},  // 65%  → almost done (stage2)
  { pct: 100, show: 'cookedEgg'   },  // 100% → cooked!
];

// --- RINGTONE (uses Web Audio API — no external file needed) ---
function playRingtone() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const notes = [523, 659, 784, 1047, 784, 659, 523]; // C5 E5 G5 C6 G5 E5 C5
  let time = ctx.currentTime;

  notes.forEach((freq) => {
    const osc = ctx.createOscillator();
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
  // Find the highest stage whose pct threshold we've passed
  let current = STAGES[0];
  for (const stage of STAGES) {
    if (pct >= stage.pct) current = stage;
  }
  return current;
}

// --- MAIN TIMER ---
let timerInterval = null;

function startTimer() {
  // Reset state
  clearInterval(timerInterval);
  progressBar.style.width = '0%';
  statusArea.style.display = 'block';
  controls.style.display = 'none';
  showEgg('rawEgg');

  let elapsed = 0;

  timerInterval = setInterval(() => {
    elapsed++;
    const pct = (elapsed / TOTAL_TIME) * 100;
    const remaining = TOTAL_TIME - elapsed;

    // Update progress bar
    progressBar.style.width = pct + '%';

    // Update countdown text
    timeLeft.textContent = remaining + ' ';

    // Update egg image based on stage
    const stage = getCurrentStage(pct);
    showEgg(stage.show);

    // Timer done
    if (elapsed >= TOTAL_TIME) {
      clearInterval(timerInterval);
      timeLeft.textContent = '0 ';
      playRingtone();

      startBtn.textContent = 'Boil Again?';
      controls.style.display = 'block';
    }
  }, 1000);
}

startBtn.addEventListener('click', startTimer);

showEgg('rawEgg');