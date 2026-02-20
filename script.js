window.onload = function() {
    alert("This site is still under construction. See anyway?");
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
  { pct: 0,   show: 'rawEgg'       },
  { pct: 1,   show: 'boiling'      },
  { pct: 65,  show: 'almostBoiled' },
  { pct: 100, show: 'cookedEgg'    },
];

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('[App] SW registered:', reg.scope);
  }).catch(err => {
    console.error('[App] SW registration failed:', err);
  });
}

// --- HELPER: send message to SW (waits until SW is ready) ---
function sendToSW(message) {
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) {
      reg.active.postMessage(message);
    }
  });
}

// --- NOTIFICATION PERMISSION ---
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// --- RINGTONE (plays when tab is active) ---
function playRingtone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047, 784, 659, 523];
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
  } catch(e) {
    console.warn('[App] Audio failed:', e);
  }
}

// --- EGG DISPLAY HELPERS ---
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

// --- TIMER DONE ---
function handleTimerDone() {
  clearInterval(timerInterval);
  timerInterval = null;

  progressBar.style.width = '100%';
  timeLeft.textContent = '0';
  showEgg('cookedEgg');
  playRingtone();

  // Android Chrome blocks new Notification() from the page directly.
  // Must go through the Service Worker's showNotification instead.
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('🥚 Your egg is ready!', {
        body: 'Time to take it off the heat!',
        icon: '/favicon.ico',
        tag: 'egg-timer',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
      });
    }).catch(e => console.warn('[App] SW notification failed:', e));
  }

  sendToSW({ type: 'CANCEL_TIMER' });
  localStorage.removeItem('eggEndTime');

  startBtn.textContent = 'Boil Again?';
  statusArea.style.display = 'block';
  controls.style.display = 'block';
}

// --- MAIN TIMER ---
let timerInterval = null;

async function startTimer() {
  await requestNotificationPermission();

  clearInterval(timerInterval);
  timerInterval = null;
  controls.style.display = 'none';
  statusArea.style.display = 'block';
  progressBar.style.width = '0%';
  timeLeft.textContent = String(TOTAL_TIME);
  showEgg('rawEgg');
  startBtn.textContent = 'Boiling...';

  const endTime = Date.now() + TOTAL_TIME * 1000;
  localStorage.setItem('eggEndTime', String(endTime));

  sendToSW({ type: 'START_TIMER', endTime });

  timerInterval = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.round((endTime - now) / 1000));
    const elapsed = TOTAL_TIME - remaining;
    const pct = Math.min(100, (elapsed / TOTAL_TIME) * 100);

    progressBar.style.width = pct + '%';
    timeLeft.textContent = String(remaining);
    showEgg(getCurrentStage(pct).show);

    if (remaining <= 0) handleTimerDone();
  }, 500);
}

startBtn.addEventListener('click', startTimer);

// --- RESUME IF PAGE RELOADED MID-TIMER ---
(function resumeIfRunning() {
  const savedEnd = localStorage.getItem('eggEndTime');
  if (!savedEnd) return;

  const endTime = parseInt(savedEnd, 10);
  const remaining = Math.round((endTime - Date.now()) / 1000);

  if (remaining <= 0) {
    localStorage.removeItem('eggEndTime');
    showEgg('cookedEgg');
    progressBar.style.width = '100%';
    timeLeft.textContent = '0';
    statusArea.style.display = 'block';
    startBtn.textContent = 'Boil Again?';
    controls.style.display = 'block';
    return;
  }

  statusArea.style.display = 'block';
  controls.style.display = 'none';
  startBtn.textContent = 'Boiling...';

  timerInterval = setInterval(() => {
    const now = Date.now();
    const rem = Math.max(0, Math.round((endTime - now) / 1000));
    const elapsed = TOTAL_TIME - rem;
    const pct = Math.min(100, (elapsed / TOTAL_TIME) * 100);

    progressBar.style.width = pct + '%';
    timeLeft.textContent = String(rem);
    showEgg(getCurrentStage(pct).show);

    if (rem <= 0) handleTimerDone();
  }, 500);
})();

showEgg('rawEgg');
