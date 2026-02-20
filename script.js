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
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported in this browser.');
    return;
  }
  try {
    await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered.');
  } catch (err) {
    console.error('Service worker registration failed:', err);
  }
}
registerServiceWorker();

// --- NOTIFICATION PERMISSION ---
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported.');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// --- RINGTONE (Web Audio API — plays when user is on the tab) ---
function playRingtone() {
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
}

// --- FINISH: called when timer hits zero, whether tab is open or not ---
function handleTimerDone() {
  clearInterval(timerInterval);
  progressBar.style.width = '100%';
  timeLeft.textContent = '0 ';
  showEgg('cookedEgg');

  // Play audio melody (only works if tab is active/visible)
  playRingtone();

  // Show in-tab system notification too (works even if tab is in background)
  if (Notification.permission === 'granted') {
    new Notification('🥚 Your egg is ready!', {
      body: 'Time to take it off the heat!',
      icon: '/favicon.ico',   // swap for your egg icon path if you have one
      vibrate: [200, 100, 200],
    });
  }

  startBtn.textContent = 'Boil Again?';
  controls.style.display = 'block';

  // Clear the stored end time
  localStorage.removeItem('eggEndTime');
  // Tell the service worker to cancel its scheduled notification
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_TIMER' });
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

// --- MAIN TIMER ---
let timerInterval = null;

async function startTimer() {
  // Ask for notification permission on first start
  await requestNotificationPermission();

  clearInterval(timerInterval);
  progressBar.style.width = '0%';
  statusArea.style.display = 'block';
  controls.style.display = 'none';
  showEgg('rawEgg');

  // Save end time so the service worker and page reloads can sync
  const endTime = Date.now() + TOTAL_TIME * 1000;
  localStorage.setItem('eggEndTime', endTime);

  // Tell the service worker when the timer should fire
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'START_TIMER',
      endTime: endTime,
    });
  } else {
    // SW may not be active yet on very first load — wait for it
    navigator.serviceWorker.ready.then(reg => {
      reg.active.postMessage({
        type: 'START_TIMER',
        endTime: endTime,
      });
    });
  }

  // Run the visible countdown on the page
  timerInterval = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.round((endTime - now) / 1000));
    const elapsed = TOTAL_TIME - remaining;
    const pct = (elapsed / TOTAL_TIME) * 100;

    progressBar.style.width = pct + '%';
    timeLeft.textContent = remaining + ' ';
    showEgg(getCurrentStage(pct).show);

    if (remaining <= 0) {
      handleTimerDone();
    }
  }, 500); // tick every 500ms so it stays accurate
}

startBtn.addEventListener('click', startTimer);

// --- RESUME TIMER IF PAGE RELOADED WHILE RUNNING ---
// (e.g. user accidentally refreshed the tab)
(function resumeIfRunning() {
  const savedEnd = localStorage.getItem('eggEndTime');
  if (!savedEnd) return;

  const endTime = parseInt(savedEnd, 10);
  const remaining = Math.round((endTime - Date.now()) / 1000);

  if (remaining <= 0) {
    // Timer already done before page loaded — just reset cleanly
    localStorage.removeItem('eggEndTime');
    return;
  }

  // Pick up the timer visually where it left off
  statusArea.style.display = 'block';
  controls.style.display = 'none';

  timerInterval = setInterval(() => {
    const now = Date.now();
    const rem = Math.max(0, Math.round((endTime - now) / 1000));
    const elapsed = TOTAL_TIME - rem;
    const pct = (elapsed / TOTAL_TIME) * 100;

    progressBar.style.width = pct + '%';
    timeLeft.textContent = rem + ' ';
    showEgg(getCurrentStage(pct).show);

    if (rem <= 0) {
      handleTimerDone();
    }
  }, 500);
})();

showEgg('rawEgg');