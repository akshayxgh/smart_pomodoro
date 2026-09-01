// ----------------------------------------------------
// Focus Flow - Productive Session Queue, Break Engine & Analytics
// ----------------------------------------------------

const savedVolume = localStorage.getItem('focus_flow_volume') !== null 
  ? parseInt(localStorage.getItem('focus_flow_volume'), 10) 
  : 70;

const savedSyncAudio = localStorage.getItem('focus_flow_sync_audio') !== null 
  ? localStorage.getItem('focus_flow_sync_audio') === 'true' 
  : true;

const savedPacingMode = localStorage.getItem('focus_flow_pacing_mode') || 'deep';
const savedPomoMins = parseInt(localStorage.getItem('focus_flow_pomo_mins'), 10) || 25;

let state = {
  activeTaskId: null,
  isBreakMode: false,
  breakType: null, // 'short' | 'long' | 'Sprint Recharge'
  timeLeft: 60 * 60,
  totalTime: 60 * 60,
  isRunning: false,
  timerInterval: null,
  isPillMode: false,
  isAlwaysOnTop: true,
  musicPlaying: false,
  
  // Timer Style / Logic (Deep Continuous Chunk vs Pomodoro 25m Sprints)
  pacingMode: savedPacingMode, // 'deep' | 'pomo'
  pomoSprintMinutes: savedPomoMins,
  shortBreakMinutes: 5,
  taskRemainingSeconds: 60 * 60,
  sprintIndex: 1,

  // Audio playback engine
  activeAudioEngine: 'stream', // 'stream' | 'synth' | 'youtube'
  currentTitle: 'Synthwave Focus',
  currentStreamSrc: 'https://streams.ilovemusic.de/iloveradio17.mp3',
  currentSynthType: null,
  currentVideoId: null,
  isVideoVisible: false,
  
  volume: savedVolume,
  isMuted: false,
  syncMusic: savedSyncAudio
};

// ----------------------------------------------------
// Queue Tasks & Analytics Storage (With Auto-Clean on Launch)
// ----------------------------------------------------
let rawQueue = JSON.parse(localStorage.getItem('focus_flow_queue')) || [
  { id: '1', title: 'SQL Study Session', minutes: 60, completed: false, active: true },
  { id: '2', title: 'Code Review & Testing', minutes: 30, completed: false, active: false },
  { id: '3', title: 'Deep Problem Solving', minutes: 45, completed: false, active: false }
];

// Auto-clean completed tasks so you start each session fresh with remaining tasks
let queueTasks = rawQueue.filter(t => !t.completed);
if (queueTasks.length === 0) {
  queueTasks.push({ id: Date.now().toString(), title: 'Deep Focus Session', minutes: 60, completed: false, active: true });
}
if (!queueTasks.some(t => t.active)) {
  queueTasks[0].active = true;
}

let dailyStats = JSON.parse(localStorage.getItem('focus_flow_stats')) || {
  totalFocusSeconds: 0,
  sessionsCompleted: 0,
  date: new Date().toDateString()
};

// Reset daily stats if new day
if (dailyStats.date !== new Date().toDateString()) {
  dailyStats = {
    totalFocusSeconds: 0,
    sessionsCompleted: 0,
    date: new Date().toDateString()
  };
  localStorage.setItem('focus_flow_stats', JSON.stringify(dailyStats));
}

// DOM Elements
const timeText = document.getElementById('time-text');
const pillTimeText = document.getElementById('pill-time-text');
const timerLabel = document.getElementById('timer-label');
const timerProgress = document.getElementById('timer-progress');
const activeSessionTitle = document.getElementById('active-session-title');
const activeSessionDurationTag = document.getElementById('active-session-duration-tag');
const nextUpStrip = document.getElementById('next-up-strip');
const nextTaskName = document.getElementById('next-task-name');
const queueBadge = document.getElementById('queue-badge');

const tabBtnTimer = document.getElementById('tab-btn-timer');
const tabBtnQueue = document.getElementById('tab-btn-queue');
const viewTimer = document.getElementById('view-timer');
const viewQueue = document.getElementById('view-queue');
const btnQuickSwitchTask = document.getElementById('btn-quick-switch-task');

const inputTaskName = document.getElementById('input-task-name');
const inputTaskMins = document.getElementById('input-task-mins');
const btnAddQueueTask = document.getElementById('btn-add-queue-task');
const queueListContainer = document.getElementById('queue-list-container');
const queueTotalTime = document.getElementById('queue-total-time');
const btnClearDone = document.getElementById('btn-clear-done');

// MyCES Integration Elements
const selectMycesTopic = document.getElementById('select-myces-topic');
const chkAutoLogMyces = document.getElementById('chk-auto-log-myces');
const btnRefreshMyces = document.getElementById('btn-refresh-myces');
const mycesStatusText = document.getElementById('myces-status-text');
const mycesToast = document.getElementById('myces-toast');
const toastMsg = document.getElementById('toast-msg');

// Analytics Elements
const statFocusTime = document.getElementById('stat-focus-time');
const statTasksDone = document.getElementById('stat-tasks-done');
const statSessionsCount = document.getElementById('stat-sessions-count');
const statEfficiency = document.getElementById('stat-efficiency');
const analyticsProgressBar = document.getElementById('analytics-progress-bar');

const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const btnReset = document.getElementById('btn-reset');
const btnSkip = document.getElementById('btn-skip');
const btnQuickBreak = document.getElementById('btn-quick-break');
const holdRingCircle = document.getElementById('hold-ring-circle');

const btnPillPlay = document.getElementById('btn-pill-play');
const pillPlayIcon = document.getElementById('pill-play-icon');
const pillPauseIcon = document.getElementById('pill-pause-icon');
const pillTrackName = document.getElementById('pill-track-name');

const widgetView = document.getElementById('widget-view');
const pillView = document.getElementById('pill-view');
const btnPillMode = document.getElementById('btn-pill-mode');
const btnPillExpand = document.getElementById('btn-pill-expand');
const btnPillToggleTimer = document.getElementById('btn-pill-toggle-timer');

const btnPin = document.getElementById('btn-pin');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');

// Music Elements
const btnToggleMusic = document.getElementById('btn-toggle-music');
const musicPlaySvg = document.getElementById('music-play-svg');
const musicPauseSvg = document.getElementById('music-pause-svg');
const trackNameEl = document.getElementById('track-name');
const trackStatusEl = document.getElementById('track-status');
const soundWave = document.getElementById('sound-wave');
const presetPills = document.querySelectorAll('.preset-pill');

const audioStreamPlayer = document.getElementById('audio-stream-player');
const volSlider = document.getElementById('vol-slider');
const btnMute = document.getElementById('btn-mute');

// Custom YouTube & Settings
const btnCustomUrlToggle = document.getElementById('btn-custom-url-toggle');
const customUrlDrawer = document.getElementById('custom-url-drawer');
const customYtInput = document.getElementById('custom-yt-input');
const btnLoadYt = document.getElementById('btn-load-yt');
const ytWebview = document.getElementById('yt-webview');

const btnSettings = document.getElementById('btn-settings');
const settingsDrawer = document.getElementById('settings-drawer');
const chkSyncMusic = document.getElementById('chk-sync-music');

// ----------------------------------------------------
// Web Audio Synthesizer (Harmonic Chimes & Soundscapes)
// ----------------------------------------------------
let audioCtx = null;
let synthNodes = [];

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChime(type = 'sessionStart') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    let notes = [783.99, 1046.50];
    if (type === 'sessionEnd') notes = [523.25, 659.25, 783.99, 1046.50];
    if (type === 'breakStart') notes = [587.33, 880.00];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.85);
    });
  } catch (e) {
    console.log('Audio chime error:', e);
  }
}

function playTickSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Crisp, subtle mechanical countdown tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {
    console.log('Tick sound error:', e);
  }
}

// ----------------------------------------------------
// ----------------------------------------------------
// Generative Offline Sound Generators (Rain in Car & White Noise)
// ----------------------------------------------------
function startSynthesizer(synthType) {
  stopSynthesizer();
  const ctx = getAudioContext();

  if (synthType === 'rain_car' || synthType === 'rain') {
    // 1. Cozy Car Cabin Roof & Glass Damping Filter
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Cabin acoustic enclosure filter (muffled deep tapping on roof)
    const cabinFilter = ctx.createBiquadFilter();
    cabinFilter.type = 'lowpass';
    cabinFilter.frequency.setValueAtTime(460, ctx.currentTime);
    cabinFilter.Q.setValueAtTime(1.8, ctx.currentTime);

    // Subtle windshield patter
    const glassFilter = ctx.createBiquadFilter();
    glassFilter.type = 'bandpass';
    glassFilter.frequency.setValueAtTime(1600, ctx.currentTime);
    glassFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    const gainNode = ctx.createGain();
    const effectiveVol = state.isMuted ? 0 : (state.volume / 100) * 0.45;
    gainNode.gain.setValueAtTime(effectiveVol, ctx.currentTime);

    noiseSource.connect(cabinFilter);
    cabinFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start();
    synthNodes = [noiseSource, cabinFilter, glassFilter, gainNode];
  } else if (synthType === 'white_noise' || synthType === 'alpha') {
    // 2. Pure Calibrated White Noise for Concentration
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.035;
    }

    const whiteSource = ctx.createBufferSource();
    whiteSource.buffer = buffer;
    whiteSource.loop = true;

    // Gentle band-limiting filter to soften harsh treble
    const softenFilter = ctx.createBiquadFilter();
    softenFilter.type = 'lowpass';
    softenFilter.frequency.setValueAtTime(6500, ctx.currentTime);

    const gainNode = ctx.createGain();
    const effectiveVol = state.isMuted ? 0 : (state.volume / 100) * 0.35;
    gainNode.gain.setValueAtTime(effectiveVol, ctx.currentTime);

    whiteSource.connect(softenFilter);
    softenFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteSource.start();
    synthNodes = [whiteSource, softenFilter, gainNode];
  }
}

function stopSynthesizer() {
  synthNodes.forEach(node => {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch (e) {}
  });
  synthNodes = [];
}

// ----------------------------------------------------
// Webview YouTube Engine (Auto-Play, Ad-Muting & Ad-Skipping)
// ----------------------------------------------------
let ytHeartbeatInterval = null;

ytWebview.addEventListener('dom-ready', () => {
  startYouTubeHeartbeat();
});

ytWebview.addEventListener('did-finish-load', () => {
  startYouTubeHeartbeat();
});

function injectYouTubeEngine() {
  if (state.activeAudioEngine !== 'youtube') return;
  const volFraction = state.isMuted ? 0 : state.volume / 100;

  ytWebview.executeJavaScript(`
    (() => {
      const dismissBtns = document.querySelectorAll(
        'button[aria-label*="Dismiss"], #dismiss-button, ytd-button-renderer.ytd-consent-bump-v2-lightbox button, [aria-label*="Accept all"], [aria-label*="Reject all"]'
      );
      dismissBtns.forEach(b => b.click());

      const video = document.querySelector('video');
      if (!video) return;

      const isAd = document.querySelector('.ad-showing, .ad-interrupting, .video-ads, .ytp-ad-player-overlay, .ytp-ad-module');
      if (isAd) {
        video.muted = true;
        video.playbackRate = 16.0;
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration - 0.1;
        }
        const skipBtns = document.querySelectorAll(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button, .ytp-ad-skip-button-text'
        );
        skipBtns.forEach(b => b.click());
      } else {
        if (video.playbackRate > 1.0) {
          video.playbackRate = 1.0;
        }
        video.muted = ${state.isMuted};
        video.volume = ${volFraction};

        if (${state.musicPlaying} && video.paused) {
          video.play().catch(() => {});
          const bigPlay = document.querySelector('.ytp-large-play-button, .ytp-play-button, .player-control-play-pause-icon');
          if (bigPlay && video.paused) bigPlay.click();
        } else if (!${state.musicPlaying} && !video.paused) {
          video.pause();
        }
      }
    })();
  `).catch(() => {});
}

function startYouTubeHeartbeat() {
  if (ytHeartbeatInterval) clearInterval(ytHeartbeatInterval);
  injectYouTubeEngine();
  ytHeartbeatInterval = setInterval(injectYouTubeEngine, 250);
}

function loadYouTubeWebview(videoId) {
  state.currentVideoId = videoId;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  ytWebview.loadURL(watchUrl);
  startYouTubeHeartbeat();
}

// ----------------------------------------------------
// Unified Master Audio Controller
// ----------------------------------------------------
function startAudioPlayback() {
  state.musicPlaying = true;
  updateMusicUI(true);

  if (state.activeAudioEngine === 'stream') {
    if (audioStreamPlayer.src !== state.currentStreamSrc) {
      audioStreamPlayer.src = state.currentStreamSrc;
    }
    audioStreamPlayer.volume = state.isMuted ? 0 : state.volume / 100;
    audioStreamPlayer.play().then(() => {
      trackStatusEl.textContent = 'Playing Radio Stream';
    }).catch(e => {
      console.log('Stream play error:', e);
      trackStatusEl.textContent = 'Stream buffering...';
    });
  } else if (state.activeAudioEngine === 'synth') {
    startSynthesizer(state.currentSynthType);
    trackStatusEl.textContent = 'Generative Soundscape';
  } else if (state.activeAudioEngine === 'youtube') {
    trackStatusEl.textContent = 'Streaming YouTube Audio';
    injectYouTubeEngine();
  }
}

function pauseAudioPlayback() {
  state.musicPlaying = false;
  updateMusicUI(false);

  if (state.activeAudioEngine === 'stream') {
    audioStreamPlayer.pause();
    trackStatusEl.textContent = 'Paused';
  } else if (state.activeAudioEngine === 'synth') {
    stopSynthesizer();
    trackStatusEl.textContent = 'Paused';
  } else if (state.activeAudioEngine === 'youtube') {
    injectYouTubeEngine();
    trackStatusEl.textContent = 'Paused';
  }
}

function toggleAudioPlayback() {
  if (state.musicPlaying) {
    pauseAudioPlayback();
  } else {
    startAudioPlayback();
  }
}

function updateMusicUI(isPlaying) {
  if (isPlaying) {
    soundWave.classList.add('playing');
    musicPlaySvg.classList.add('hidden');
    musicPauseSvg.classList.remove('hidden');
  } else {
    soundWave.classList.remove('playing');
    musicPlaySvg.classList.remove('hidden');
    musicPauseSvg.classList.add('hidden');
  }
}

function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// ----------------------------------------------------
// Productive Task Queue & Analytics Engine
// ----------------------------------------------------
function saveQueue() {
  localStorage.setItem('focus_flow_queue', JSON.stringify(queueTasks));
  renderQueue();
  updateUpcomingPreview();
  updateAnalyticsUI();
}

function saveDailyStats() {
  localStorage.setItem('focus_flow_stats', JSON.stringify(dailyStats));
  updateAnalyticsUI();
}

function updateAnalyticsUI() {
  const hours = Math.floor(dailyStats.totalFocusSeconds / 3600);
  const mins = Math.floor((dailyStats.totalFocusSeconds % 3600) / 60);
  statFocusTime.textContent = `${hours}h ${mins.toString().padStart(2, '0')}m`;

  const doneTasks = queueTasks.filter(t => t.completed).length;
  statTasksDone.textContent = `${doneTasks} / ${queueTasks.length}`;
  statSessionsCount.textContent = dailyStats.sessionsCompleted;

  const pct = queueTasks.length > 0 ? Math.round((doneTasks / queueTasks.length) * 100) : 0;
  analyticsProgressBar.style.width = `${pct}%`;
  statEfficiency.textContent = `${pct}% Flow`;
}

// Settings Pacing Logic Elements
const btnPacingDeep = document.getElementById('btn-pacing-deep');
const btnPacingPomo = document.getElementById('btn-pacing-pomo');
const rowPomoSprintLen = document.getElementById('row-pomo-sprint-len');
const selectPomoLength = document.getElementById('select-pomo-length');

function setPacingMode(mode) {
  state.pacingMode = mode;
  localStorage.setItem('focus_flow_pacing_mode', mode);

  if (btnPacingDeep) btnPacingDeep.classList.toggle('active', mode === 'deep');
  if (btnPacingPomo) btnPacingPomo.classList.toggle('active', mode === 'pomo');
  if (rowPomoSprintLen) {
    rowPomoSprintLen.style.display = mode === 'pomo' ? 'flex' : 'none';
  }

  const activeTask = getActiveTask();
  if (activeTask && !state.isBreakMode) {
    setActiveTask(activeTask.id, false);
  }
}

function getActiveTask() {
  return queueTasks.find(t => t.active) || queueTasks[0];
}

function setActiveTask(taskId, autoStart = false) {
  state.isBreakMode = false;
  state.breakType = null;

  const breakIconEl = document.getElementById('break-btn-icon');
  if (breakIconEl) breakIconEl.textContent = '☕';
  btnQuickBreak.title = '☕ Take Break (Tap: 5m Short • Hold 3s: 15m Long)';

  const activeIconEl = document.getElementById('active-session-icon');
  if (activeIconEl) activeIconEl.textContent = '🎯';

  queueTasks.forEach(t => {
    t.active = (t.id === taskId);
  });

  const activeTask = getActiveTask();
  if (activeTask) {
    state.activeTaskId = activeTask.id;
    state.taskRemainingSeconds = activeTask.minutes * 60;
    state.sprintIndex = 1;

    if (state.pacingMode === 'pomo') {
      const sprintSecs = Math.min(state.taskRemainingSeconds, state.pomoSprintMinutes * 60);
      state.totalTime = sprintSecs;
      state.timeLeft = sprintSecs;
      const totalSprints = Math.max(1, Math.ceil((activeTask.minutes * 60) / (state.pomoSprintMinutes * 60)));
      timerLabel.textContent = `🍅 SPRINT ${state.sprintIndex}/${totalSprints}`;
      activeSessionDurationTag.textContent = `${Math.ceil(sprintSecs / 60)}m / ${activeTask.minutes}m`;
    } else {
      state.totalTime = activeTask.minutes * 60;
      state.timeLeft = state.totalTime;
      timerLabel.textContent = 'PRODUCTIVE TIME';
      activeSessionDurationTag.textContent = `${activeTask.minutes}m`;
    }
    
    activeSessionTitle.textContent = activeTask.title;
    pillTrackName.textContent = activeTask.title;

    if (state.isRunning) {
      clearInterval(state.timerInterval);
      state.isRunning = false;
    }
    updateDisplay();

    if (autoStart) {
      toggleTimer();
    }
  }
  saveQueue();
}

function startQuickBreak(minutes, typeName) {
  pauseTimer();
  pauseAudioPlayback(); // Stop music on break!
  state.isBreakMode = true;
  state.breakType = typeName;
  state.totalTime = minutes * 60;
  state.timeLeft = state.totalTime;

  timerLabel.textContent = `${typeName.toUpperCase()} BREAK`;
  activeSessionTitle.textContent = `${typeName} Break`;
  activeSessionDurationTag.textContent = `${minutes}m`;
  pillTrackName.textContent = `${typeName} Break`;

  const breakIconEl = document.getElementById('break-btn-icon');
  if (breakIconEl) breakIconEl.textContent = '⚡';
  btnQuickBreak.title = '⚡ Resume Work (Tap: Resume Work • Hold 3s: Switch to 15m Long Break)';

  const activeIconEl = document.getElementById('active-session-icon');
  if (activeIconEl) activeIconEl.textContent = '☕';

  updateDisplay();
  playChime('breakStart');
  startTimer();
}

function upgradeBreakToLong() {
  state.breakType = 'Long';
  // Add +10 minutes (600s) difference to retain current elapsed seconds seamlessly
  const additionalSeconds = 10 * 60;
  state.timeLeft += additionalSeconds;
  state.totalTime += additionalSeconds;

  timerLabel.textContent = 'LONG BREAK';
  activeSessionTitle.textContent = 'Long Break';
  activeSessionDurationTag.textContent = `${Math.ceil(state.totalTime / 60)}m`;
  pillTrackName.textContent = 'Long Break';

  updateDisplay();
  playChime('breakStart');
}

function exitBreakAndResumeFocus() {
  pauseTimer();
  state.isBreakMode = false;
  state.breakType = null;

  const breakIconEl = document.getElementById('break-btn-icon');
  if (breakIconEl) breakIconEl.textContent = '☕';
  btnQuickBreak.title = '☕ Take Break (Tap: 5m Short • Hold 3s: 15m Long)';

  const activeIconEl = document.getElementById('active-session-icon');
  if (activeIconEl) activeIconEl.textContent = '🎯';

  const activeTask = getActiveTask();
  if (activeTask) {
    state.activeTaskId = activeTask.id;
    
    if (state.pacingMode === 'pomo') {
      const sprintSecs = Math.min(state.taskRemainingSeconds, state.pomoSprintMinutes * 60);
      state.totalTime = sprintSecs;
      state.timeLeft = sprintSecs;
      const totalSprints = Math.max(1, Math.ceil((activeTask.minutes * 60) / (state.pomoSprintMinutes * 60)));
      timerLabel.textContent = `🍅 SPRINT ${state.sprintIndex}/${totalSprints}`;
      activeSessionDurationTag.textContent = `${Math.ceil(sprintSecs / 60)}m / ${activeTask.minutes}m`;
    } else {
      state.totalTime = activeTask.minutes * 60;
      state.timeLeft = state.totalTime;
      timerLabel.textContent = 'PRODUCTIVE TIME';
      activeSessionDurationTag.textContent = `${activeTask.minutes}m`;
    }
    
    activeSessionTitle.textContent = activeTask.title;
    pillTrackName.textContent = activeTask.title;
  }

  updateDisplay();
  playChime('sessionStart');
  startTimer();
}

function updateUpcomingPreview() {}

let draggedItemIndex = null;

function renderQueue() {
  queueListContainer.innerHTML = '';
  const totalMins = queueTasks.reduce((acc, t) => acc + (t.completed ? 0 : parseInt(t.minutes || 0, 10)), 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  queueTotalTime.textContent = `Total Planned: ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
  
  const pendingCount = queueTasks.filter(t => !t.completed).length;
  queueBadge.textContent = pendingCount;

  queueTasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = `queue-item ${task.completed ? 'completed' : ''} ${task.active ? 'active-session' : ''}`;
    item.draggable = true;
    item.dataset.index = index;

    // Drag Handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⠿';
    dragHandle.title = 'Drag to reorder priority';

    // Checkbox
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'queue-chk';
    chk.checked = task.completed;
    chk.addEventListener('change', (e) => {
      e.stopPropagation();
      task.completed = chk.checked;
      if (task.completed) {
        playChime('sessionEnd');
        dailyStats.sessionsCompleted++;
        saveDailyStats();
        logTaskToMyCES(task);
      }
      saveQueue();
    });

    // Task Title (Click to activate)
    const title = document.createElement('span');
    title.className = 'queue-title';
    title.textContent = task.title;
    title.title = 'Click to make active focus session';
    title.addEventListener('click', () => {
      setActiveTask(task.id, false);
      switchView('timer');
    });

    // MyCES Track Badge if applicable
    if (task.mycesTopic || task.mycesSubject) {
      const mycesBadge = document.createElement('span');
      mycesBadge.className = 'queue-tag-myces';
      mycesBadge.textContent = 'MyCES';
      title.appendChild(mycesBadge);
    }

    // Duration Tag
    const duration = document.createElement('span');
    duration.className = 'queue-duration';
    duration.textContent = `${task.minutes}m`;

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'queue-btn-del';
    delBtn.innerHTML = '✕';
    delBtn.title = 'Remove session';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      queueTasks.splice(index, 1);
      if (task.active && queueTasks.length > 0) {
        queueTasks[0].active = true;
      }
      saveQueue();
      const currentActive = getActiveTask();
      if (currentActive) setActiveTask(currentActive.id, false);
    });

    // HTML5 Drag & Drop Listeners
    item.addEventListener('dragstart', (e) => {
      draggedItemIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (draggedItemIndex !== null && draggedItemIndex !== index) {
        const movedItem = queueTasks.splice(draggedItemIndex, 1)[0];
        queueTasks.splice(index, 0, movedItem);
        saveQueue();
      }
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('drag-over'));
      draggedItemIndex = null;
    });

    item.appendChild(dragHandle);
    item.appendChild(chk);
    item.appendChild(title);
    item.appendChild(duration);
    item.appendChild(delBtn);
    queueListContainer.appendChild(item);
  });
}

function addNewQueueTask() {
  const name = inputTaskName.value.trim();
  const mins = parseInt(inputTaskMins.value, 10) || 25;
  if (!name) return;

  const mycesSubject = inputTaskName.dataset.mycesSubject || null;
  const mycesTopic = inputTaskName.dataset.mycesTopic || null;

  const isFirst = queueTasks.length === 0;
  const newTask = {
    id: Date.now().toString(),
    title: name,
    minutes: Math.min(Math.max(mins, 1), 240),
    completed: false,
    active: isFirst,
    mycesSubject: mycesSubject,
    mycesTopic: mycesTopic
  };

  queueTasks.push(newTask);
  inputTaskName.value = '';
  inputTaskName.dataset.mycesSubject = '';
  inputTaskName.dataset.mycesTopic = '';
  if (selectMycesTopic) selectMycesTopic.value = '';
  inputTaskMins.value = '60';
  saveQueue();

  if (isFirst) {
    setActiveTask(newTask.id, false);
  }
}

// ----------------------------------------------------
// Pomodoro Timer Engine
// ----------------------------------------------------
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  const formatted = formatTime(state.timeLeft);
  timeText.textContent = formatted;
  pillTimeText.textContent = formatted;

  const radius = timerProgress.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  timerProgress.style.strokeDasharray = `${circumference} ${circumference}`;

  const progress = (state.totalTime - state.timeLeft) / state.totalTime;
  const offset = circumference - progress * circumference;
  timerProgress.style.strokeDashoffset = offset;

  const activeTask = getActiveTask();
  const title = state.isBreakMode ? `${state.breakType} Break` : (activeTask ? activeTask.title : 'Focus Flow');
  document.title = `${formatted} • ${title}`;
}

function toggleTimer() {
  if (state.isBreakMode) {
    // No pausing on break! Toggling immediately resumes productive focus work
    exitBreakAndResumeFocus();
    return;
  }

  if (state.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  getAudioContext();
  state.isRunning = true;
  updateTimerButtons(true);
  playChime(state.isBreakMode ? 'breakStart' : 'sessionStart');

  if (state.isBreakMode) {
    pauseAudioPlayback(); // Always quiet on breaks
  } else if (state.syncMusic && !state.musicPlaying) {
    startAudioPlayback();
  }

  if (state.timerInterval) clearInterval(state.timerInterval);

  state.timerInterval = setInterval(() => {
    if (state.timeLeft > 0) {
      state.timeLeft--;
      if (!state.isBreakMode) {
        dailyStats.totalFocusSeconds++;
        if (dailyStats.totalFocusSeconds % 10 === 0) saveDailyStats();
      }

      // Tick-tick sound for the last 5 seconds (5, 4, 3, 2, 1)
      if (state.timeLeft <= 5 && state.timeLeft >= 1) {
        playTickSound();
      }

      updateDisplay();
    } else {
      completeCurrentSession();
    }
  }, 1000);
}

function pauseTimer() {
  state.isRunning = false;
  updateTimerButtons(false);
  clearInterval(state.timerInterval);

  if (state.syncMusic && state.musicPlaying) {
    pauseAudioPlayback();
  }
}

function resetTimer() {
  pauseTimer();
  if (state.isBreakMode) {
    state.timeLeft = state.totalTime;
  } else {
    const activeTask = getActiveTask();
    state.totalTime = activeTask ? activeTask.minutes * 60 : 60 * 60;
    state.timeLeft = state.totalTime;
  }
  updateDisplay();
}

function completeCurrentSession() {
  pauseTimer();
  playChime('sessionEnd');

  if (state.isBreakMode) {
    // Break finished! If in Pomodoro mode, advance to next sprint automatically!
    if (state.pacingMode === 'pomo' && state.taskRemainingSeconds > 0) {
      state.isBreakMode = false;
      state.breakType = null;
      state.sprintIndex++;
      const sprintSecs = Math.min(state.taskRemainingSeconds, state.pomoSprintMinutes * 60);
      state.totalTime = sprintSecs;
      state.timeLeft = sprintSecs;
      const activeTask = getActiveTask();
      const totalSprints = activeTask ? Math.max(1, Math.ceil((activeTask.minutes * 60) / (state.pomoSprintMinutes * 60))) : 1;
      timerLabel.textContent = `🍅 SPRINT ${state.sprintIndex}/${totalSprints}`;
      updateDisplay();
      playChime('sessionStart');
      startTimer();
      return;
    }
    exitBreakAndResumeFocus();
    return;
  }

  // Active Focus Session finished
  if (state.pacingMode === 'pomo') {
    state.taskRemainingSeconds = Math.max(0, state.taskRemainingSeconds - state.totalTime);
    
    if (state.taskRemainingSeconds > 0) {
      // Sprint complete, but task still has remaining time -> Launch auto short break!
      showMyCESToast(`🍅 Sprint complete! Take a ${state.shortBreakMinutes}m recharge break.`);
      startQuickBreak(state.shortBreakMinutes, 'Sprint Recharge');
      return;
    }
  }

  // Full task complete!
  const activeTask = getActiveTask();
  if (activeTask) {
    activeTask.completed = true;
    dailyStats.sessionsCompleted++;
    saveDailyStats();
    logTaskToMyCES(activeTask);
  }

  // Auto-chain to next uncompleted task in the queue!
  const nextTask = queueTasks.find(t => !t.completed && t.id !== (getActiveTask() ? getActiveTask().id : null));
  if (nextTask) {
    setActiveTask(nextTask.id, false);
  } else {
    saveQueue();
    updateDisplay();
  }
}

function updateTimerButtons(isRunning) {
  if (state.isBreakMode) {
    // While on break, show Play/Resume icon (▶) indicating "Click to resume work"
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    pillPlayIcon.classList.remove('hidden');
    pillPauseIcon.classList.add('hidden');
    btnPlayPause.title = '⚡ Resume Productive Work Session';
    btnPillPlay.title = '⚡ Resume Productive Work Session';
    return;
  }

  btnPlayPause.title = isRunning ? 'Pause Focus Session' : 'Start Focus Session';
  btnPillPlay.title = isRunning ? 'Pause' : 'Play';

  if (isRunning) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    pillPlayIcon.classList.add('hidden');
    pillPauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    pillPlayIcon.classList.remove('hidden');
    pillPauseIcon.classList.add('hidden');
  }
}

// ----------------------------------------------------
// Quick Break Button (Single Tap 5m • Hold 3s for 15m)
// ----------------------------------------------------
let breakHoldTimer = null;
let holdStartTime = 0;
let holdAnimFrame = null;
const HOLD_DURATION_MS = 3000;
const CIRCLE_CIRCUMFERENCE = 94.2;

function resetHoldRing() {
  if (holdRingCircle) {
    holdRingCircle.style.strokeDashoffset = `${CIRCLE_CIRCUMFERENCE}`;
  }
}

function animateHoldRing() {
  const elapsed = Date.now() - holdStartTime;
  const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
  const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
  if (holdRingCircle) {
    holdRingCircle.style.strokeDashoffset = `${offset}`;
  }

  if (progress < 1) {
    holdAnimFrame = requestAnimationFrame(animateHoldRing);
  }
}

if (btnQuickBreak) {
  btnQuickBreak.addEventListener('mousedown', (e) => {
    e.preventDefault();
    holdStartTime = Date.now();
    animateHoldRing();

    breakHoldTimer = setTimeout(() => {
      if (state.isBreakMode) {
        upgradeBreakToLong();
      } else {
        startQuickBreak(15, 'Long');
      }
      resetHoldRing();
      clearTimeout(breakHoldTimer);
      breakHoldTimer = null;
    }, HOLD_DURATION_MS);
  });

  btnQuickBreak.addEventListener('mouseup', (e) => {
    e.preventDefault();
    if (holdAnimFrame) cancelAnimationFrame(holdAnimFrame);
    resetHoldRing();

    if (breakHoldTimer) {
      clearTimeout(breakHoldTimer);
      const elapsed = Date.now() - holdStartTime;
      if (elapsed < HOLD_DURATION_MS) {
        if (state.isBreakMode) {
          exitBreakAndResumeFocus();
        } else {
          startQuickBreak(5, 'Short');
        }
      }
      breakHoldTimer = null;
    }
  });

  btnQuickBreak.addEventListener('mouseleave', () => {
    if (holdAnimFrame) cancelAnimationFrame(holdAnimFrame);
    resetHoldRing();
    if (breakHoldTimer) {
      clearTimeout(breakHoldTimer);
      breakHoldTimer = null;
    }
  });
}

// ----------------------------------------------------
// View Switcher (Timer vs Queue)
// ----------------------------------------------------
function switchView(viewName) {
  if (viewName === 'timer') {
    tabBtnTimer.classList.add('active');
    tabBtnQueue.classList.remove('active');
    viewTimer.classList.remove('hidden');
    viewQueue.classList.add('hidden');
  } else {
    tabBtnTimer.classList.remove('active');
    tabBtnQueue.classList.add('active');
    viewTimer.classList.add('hidden');
    viewQueue.classList.remove('hidden');
    updateAnalyticsUI();
  }
}

tabBtnTimer.addEventListener('click', () => switchView('timer'));
tabBtnQueue.addEventListener('click', () => switchView('queue'));

btnQuickSwitchTask.addEventListener('click', () => {
  if (state.isBreakMode) {
    exitBreakAndResumeFocus();
  } else {
    switchView('queue');
  }
});

nextUpStrip.addEventListener('click', () => switchView('queue'));

btnAddQueueTask.addEventListener('click', addNewQueueTask);
inputTaskName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addNewQueueTask();
});
inputTaskMins.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addNewQueueTask();
});

btnClearDone.addEventListener('click', () => {
  queueTasks = queueTasks.filter(t => !t.completed);
  if (queueTasks.length === 0) {
    queueTasks.push({ id: Date.now().toString(), title: 'Deep Focus Session', minutes: 60, completed: false, active: true });
  }
  const active = getActiveTask();
  if (active) setActiveTask(active.id, false);
  saveQueue();
});

// ----------------------------------------------------
// Window Pill Mode & Unlimited Dragging
// ----------------------------------------------------
function setPillMode(toPill) {
  state.isPillMode = toPill;
  if (toPill) {
    widgetView.classList.add('hidden');
    pillView.classList.remove('hidden');
  } else {
    pillView.classList.add('hidden');
    widgetView.classList.remove('hidden');
  }
  if (window.electronAPI) {
    window.electronAPI.togglePillMode(toPill);
  }
}

let isDraggingWindow = false;
let startX = 0, startY = 0;

function setupSmoothDrag(element) {
  if (!element) return;
  element.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, input, select, textarea, .queue-item, .no-drag') || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    isDraggingWindow = true;
    startX = e.screenX;
    startY = e.screenY;
  });
}

window.addEventListener('mousemove', (e) => {
  if (isDraggingWindow && window.electronAPI && window.electronAPI.moveWindow) {
    const deltaX = e.screenX - startX;
    const deltaY = e.screenY - startY;
    if (deltaX !== 0 || deltaY !== 0) {
      window.electronAPI.moveWindow({ deltaX, deltaY });
      startX = e.screenX;
      startY = e.screenY;
    }
  }
});

window.addEventListener('mouseup', () => {
  isDraggingWindow = false;
});

setupSmoothDrag(document.getElementById('pill-view'));
setupSmoothDrag(document.getElementById('main-drag-header'));

// Window Action Buttons
btnPillMode.addEventListener('click', () => setPillMode(true));
btnPillExpand.addEventListener('click', () => setPillMode(false));

btnPin.addEventListener('click', () => {
  state.isAlwaysOnTop = !state.isAlwaysOnTop;
  btnPin.classList.toggle('active', state.isAlwaysOnTop);
  if (window.electronAPI) {
    window.electronAPI.toggleAlwaysOnTop(state.isAlwaysOnTop);
  }
});

btnMinimize.addEventListener('click', () => {
  if (window.electronAPI) window.electronAPI.minimizeWindow();
});

btnClose.addEventListener('click', () => {
  if (window.electronAPI) window.electronAPI.closeWindow();
});

if (window.electronAPI && window.electronAPI.onTogglePill) {
  window.electronAPI.onTogglePill(() => {
    setPillMode(!state.isPillMode);
  });
}

// Timer Controls Listeners
btnPlayPause.addEventListener('click', toggleTimer);
btnPillPlay.addEventListener('click', toggleTimer);
btnPillToggleTimer.addEventListener('click', toggleTimer);
btnReset.addEventListener('click', resetTimer);
btnSkip.addEventListener('click', () => {
  if (state.isBreakMode) {
    exitBreakAndResumeFocus();
  } else {
    completeCurrentSession();
  }
});

// ----------------------------------------------------
// Preset Memory & Switching
// ----------------------------------------------------
presetPills.forEach((pill, idx) => {
  pill.addEventListener('click', () => {
    presetPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    localStorage.setItem('focus_flow_selected_preset', idx.toString());
    pauseAudioPlayback();

    const pType = pill.dataset.type;
    const title = pill.dataset.title;
    state.currentTitle = title;
    trackNameEl.textContent = title;

    if (pType === 'stream') {
      state.activeAudioEngine = 'stream';
      state.currentStreamSrc = pill.dataset.src;
    } else if (pType === 'synth') {
      state.activeAudioEngine = 'synth';
      state.currentSynthType = pill.dataset.synth;
    } else if (pType === 'youtube') {
      state.activeAudioEngine = 'youtube';
      loadYouTubeWebview(pill.dataset.videoId);
    }

    startAudioPlayback();
  });
});

btnToggleMusic.addEventListener('click', toggleAudioPlayback);

// Custom YouTube Link Memory & Loader
const savedYtUrl = localStorage.getItem('focus_flow_last_yt_url') || '';
if (savedYtUrl && customYtInput) {
  customYtInput.value = savedYtUrl;
  customYtInput.placeholder = savedYtUrl;
}

btnCustomUrlToggle.addEventListener('click', () => {
  customUrlDrawer.classList.toggle('hidden');
});

btnLoadYt.addEventListener('click', () => {
  const val = customYtInput.value.trim();
  if (!val) return;
  const vid = extractYouTubeId(val);
  if (vid) {
    localStorage.setItem('focus_flow_last_yt_url', val);
    localStorage.setItem('focus_flow_selected_preset', 'custom_yt');

    presetPills.forEach(p => p.classList.remove('active'));
    pauseAudioPlayback();
    
    state.activeAudioEngine = 'youtube';
    state.currentTitle = 'YouTube Audio';
    trackNameEl.textContent = 'YouTube Audio Stream';

    loadYouTubeWebview(vid);
    startAudioPlayback();
    customUrlDrawer.classList.add('hidden');
  }
});

// Volume & Settings Memory
volSlider.value = state.volume;
audioStreamPlayer.volume = state.volume / 100;
chkSyncMusic.checked = state.syncMusic;

volSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  state.volume = val;
  state.isMuted = false;
  btnMute.style.opacity = '1';
  localStorage.setItem('focus_flow_volume', val.toString());

  audioStreamPlayer.volume = val / 100;
  if (state.activeAudioEngine === 'synth') {
    startSynthesizer(state.currentSynthType);
  } else if (state.activeAudioEngine === 'youtube') {
    ytWebview.executeJavaScript(`if(document.querySelector('video')) document.querySelector('video').volume = ${val / 100};`).catch(() => {});
  }
});

btnMute.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  audioStreamPlayer.volume = state.isMuted ? 0 : state.volume / 100;
  if (state.activeAudioEngine === 'synth') {
    startSynthesizer(state.currentSynthType);
  } else if (state.activeAudioEngine === 'youtube') {
    ytWebview.executeJavaScript(`if(document.querySelector('video')) document.querySelector('video').volume = ${state.isMuted ? 0 : state.volume / 100};`).catch(() => {});
  }
  btnMute.style.opacity = state.isMuted ? '0.35' : '1';
});

// Settings & Sync
chkSyncMusic.addEventListener('change', (e) => {
  state.syncMusic = e.target.checked;
  localStorage.setItem('focus_flow_sync_audio', e.target.checked.toString());
});

btnSettings.addEventListener('click', () => {
  settingsDrawer.classList.toggle('hidden');
});

const btnLoginYt = document.getElementById('btn-login-yt');
if (btnLoginYt) {
  btnLoginYt.addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.openYouTubeLogin();
    }
  });
}

if (window.electronAPI) {
  window.electronAPI.onLoginComplete(() => {
    trackStatusEl.textContent = 'YouTube Premium Synced!';
    if (state.activeAudioEngine === 'youtube' && state.currentVideoId) {
      ytWebview.reload();
    }
  });
}

// Auto-clean completed tasks on window close
window.addEventListener('beforeunload', () => {
  const incompleteOnly = queueTasks.filter(t => !t.completed);
  localStorage.setItem('focus_flow_queue', JSON.stringify(incompleteOnly));
});

// ----------------------------------------------------
// Initial App Startup & Memory Brain Restoration
// ----------------------------------------------------
const savedPresetKey = localStorage.getItem('focus_flow_selected_preset');
if (savedPresetKey !== null && savedPresetKey !== 'custom_yt') {
  const pIndex = parseInt(savedPresetKey, 10);
  if (presetPills[pIndex]) {
    presetPills.forEach(p => p.classList.remove('active'));
    const pill = presetPills[pIndex];
    pill.classList.add('active');
    
    const pType = pill.dataset.type;
    const title = pill.dataset.title;
    state.currentTitle = title;
    trackNameEl.textContent = title;

    if (pType === 'stream') {
      state.activeAudioEngine = 'stream';
      state.currentStreamSrc = pill.dataset.src;
      audioStreamPlayer.src = pill.dataset.src;
    } else if (pType === 'synth') {
      state.activeAudioEngine = 'synth';
      state.currentSynthType = pill.dataset.synth;
    } else if (pType === 'youtube') {
      state.activeAudioEngine = 'youtube';
      loadYouTubeWebview(pill.dataset.videoId);
    }
  }
} else if (savedPresetKey === 'custom_yt' && savedYtUrl) {
  const vid = extractYouTubeId(savedYtUrl);
  if (vid) {
    presetPills.forEach(p => p.classList.remove('active'));
    state.activeAudioEngine = 'youtube';
    state.currentTitle = 'YouTube Audio';
    trackNameEl.textContent = 'YouTube Audio Stream';
    loadYouTubeWebview(vid);
  }
}

// ----------------------------------------------------
// Adaptive Ambient Theme Engine (Windows OS & Daylight Sun Cycle)
// ----------------------------------------------------
let currentThemeMode = localStorage.getItem('focus_flow_theme_mode') || 'auto';
const themePillBtns = document.querySelectorAll('.theme-pill-btn');

function applyTheme() {
  let effectiveTheme = 'dark';

  if (currentThemeMode === 'light') {
    effectiveTheme = 'light';
  } else if (currentThemeMode === 'dark') {
    effectiveTheme = 'dark';
  } else {
    // AUTO MODE: Dual Smart Detection (Windows OS Theme + Solar Daylight Cycle)
    const hour = new Date().getHours();
    const isDaytime = (hour >= 6 && hour < 18); // 6:00 AM - 6:00 PM is bright daylight
    const osPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    if (osPrefersLight || isDaytime) {
      effectiveTheme = 'light';
    } else {
      effectiveTheme = 'dark';
    }
  }

  document.body.className = effectiveTheme === 'light' ? 'theme-light' : 'theme-dark';

  // Update theme selector buttons
  themePillBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeMode === currentThemeMode);
  });
}

// Listen for Windows OS Theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (currentThemeMode === 'auto') applyTheme();
  });
}

// Re-check solar daylight cycle periodically every 60 seconds
setInterval(() => {
  if (currentThemeMode === 'auto') applyTheme();
}, 60000);

themePillBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentThemeMode = btn.dataset.themeMode;
    localStorage.setItem('focus_flow_theme_mode', currentThemeMode);
    applyTheme();
  });
});

applyTheme();

// ----------------------------------------------------
// MyCES Supabase Integration Client & Real-Time Sync
// ----------------------------------------------------
const MYCES_CONFIG = {
  supabaseUrl: 'https://nnicnxwzuvinaqvxuvsh.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWNueHd6dXZpbmFxdnh1dnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzgxNTYsImV4cCI6MjA5ODExNDE1Nn0.c_s_9DZ4qEX47xzNluAPG9HXHsiAnFGTZ8EeXz38yqU',
  userId: 'Akshay'
};

let toastTimeout = null;
function showMyCESToast(msg) {
  if (!mycesToast) return;
  if (toastMsg) toastMsg.textContent = msg;
  mycesToast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    mycesToast.classList.add('hidden');
  }, 3500);
}

// Fetch Learning Tracks from Supabase app_state
async function fetchMyCESTracks() {
  try {
    const res = await fetch(`${MYCES_CONFIG.supabaseUrl}/rest/v1/app_state?select=data&user_id=eq.${MYCES_CONFIG.userId}`, {
      headers: {
        'apikey': MYCES_CONFIG.supabaseKey,
        'Authorization': `Bearer ${MYCES_CONFIG.supabaseKey}`
      }
    });
    if (!res.ok) throw new Error('Network response not ok');
    const json = await res.json();
    if (json && json[0] && json[0].data && json[0].data.learningTracks) {
      const tracks = json[0].data.learningTracks;
      localStorage.setItem('myces_cached_tracks', JSON.stringify(tracks));
      populateMyCESTopicDropdown(tracks);
      if (mycesStatusText) mycesStatusText.textContent = 'Connected (Akshay) • Synced';
      return tracks;
    }
  } catch (err) {
    console.warn('Using cached MyCES tracks:', err);
    if (mycesStatusText) mycesStatusText.textContent = 'Connected (Akshay) • Offline';
    const cached = JSON.parse(localStorage.getItem('myces_cached_tracks'));
    if (cached) populateMyCESTopicDropdown(cached);
  }
}

function populateMyCESTopicDropdown(tracks) {
  if (!selectMycesTopic) return;
  selectMycesTopic.innerHTML = '<option value="">⚡ Pick from MyCES Track...</option>';
  
  tracks.forEach(t => {
    const optgroup = document.createElement('optgroup');
    const icon = t.name.includes('SQL') ? '🗄️ ' : (t.name.includes('Power') ? '📊 ' : '🐍 ');
    optgroup.label = `${icon}${t.name}`;

    if (Array.isArray(t.modules)) {
      t.modules.forEach(m => {
        const opt = document.createElement('option');
        opt.value = `${t.name}:::${m.name}`;
        const statusIcon = m.status === 'Completed' ? '✅ ' : (m.status === 'In Progress' ? '⏳ ' : '');
        opt.textContent = `${statusIcon}${m.name}`;
        optgroup.appendChild(opt);
      });
    }

    selectMycesTopic.appendChild(optgroup);
  });
}

// Log study session & update track module in Supabase
async function logStudySessionToMyCES({ subject, topic, hours, notes }) {
  if (chkAutoLogMyces && !chkAutoLogMyces.checked) return;

  try {
    // 1. Fetch latest app_state from Supabase
    const fetchRes = await fetch(`${MYCES_CONFIG.supabaseUrl}/rest/v1/app_state?select=data&user_id=eq.${MYCES_CONFIG.userId}`, {
      headers: {
        'apikey': MYCES_CONFIG.supabaseKey,
        'Authorization': `Bearer ${MYCES_CONFIG.supabaseKey}`
      }
    });
    const fetchJson = await fetchRes.json();
    if (!fetchJson || !fetchJson[0] || !fetchJson[0].data) return;

    const fullData = fetchJson[0].data;
    if (!Array.isArray(fullData.studyLogs)) fullData.studyLogs = [];

    // 2. Create study log item
    const newLog = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'log_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      subject: subject || 'SQL Track',
      topic: topic,
      plannedHours: hours,
      actualHours: hours,
      confidenceScore: 5,
      notes: notes || 'Logged via Focus Flow Desktop Timer',
      completed: true
    };

    // Prepend to studyLogs
    fullData.studyLogs.unshift(newLog);

    // 3. Mark module Completed in learningTracks
    if (Array.isArray(fullData.learningTracks)) {
      fullData.learningTracks = fullData.learningTracks.map(track => {
        if (!subject || track.name.toLowerCase().includes(subject.toLowerCase())) {
          return {
            ...track,
            modules: track.modules.map(mod => {
              if (mod.name.toLowerCase() === topic.toLowerCase() || topic.toLowerCase().includes(mod.name.toLowerCase())) {
                return { ...mod, status: 'Completed' };
              }
              return mod;
            })
          };
        }
        return track;
      });
    }

    // 4. Send PATCH to Supabase
    await fetch(`${MYCES_CONFIG.supabaseUrl}/rest/v1/app_state?user_id=eq.${MYCES_CONFIG.userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': MYCES_CONFIG.supabaseKey,
        'Authorization': `Bearer ${MYCES_CONFIG.supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: MYCES_CONFIG.userId,
        data: fullData
      })
    });

    showMyCESToast(`☁️ Logged ${hours}h of "${topic}" to MyCES!`);
  } catch (err) {
    console.error('Error logging to MyCES:', err);
  }
}

function logTaskToMyCES(task) {
  if (!task) return;
  let subject = task.mycesSubject || 'SQL Track';
  let topic = task.mycesTopic || task.title;

  if (!task.mycesSubject) {
    const lower = task.title.toLowerCase();
    if (lower.includes('power bi') || lower.includes('dax') || lower.includes('pl-300') || lower.includes('rls')) {
      subject = 'Power BI Track';
    } else if (lower.includes('python') || lower.includes('pandas') || lower.includes('numpy') || lower.includes('openpyxl')) {
      subject = 'Python for Analytics Track';
    } else {
      subject = 'SQL Track';
    }
  }

  const hours = parseFloat((task.minutes / 60).toFixed(1));
  logStudySessionToMyCES({
    subject: subject,
    topic: topic,
    hours: hours > 0 ? hours : 1,
    notes: `Completed in Focus Flow • ${task.minutes} min productive flow`
  });
}

// MyCES UI Event Listeners
if (selectMycesTopic) {
  selectMycesTopic.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split(':::');
    const subject = parts[0];
    const topic = parts[1];
    inputTaskName.value = topic;
    inputTaskName.dataset.mycesSubject = subject;
    inputTaskName.dataset.mycesTopic = topic;
  });
}

if (btnRefreshMyces) {
  btnRefreshMyces.addEventListener('click', async () => {
    btnRefreshMyces.style.transform = 'rotate(360deg)';
    await fetchMyCESTracks();
    setTimeout(() => { btnRefreshMyces.style.transform = ''; }, 600);
    showMyCESToast('MyCES tracks updated!');
  });
}

const savedAutoLog = localStorage.getItem('focus_flow_autolog_myces');
if (chkAutoLogMyces && savedAutoLog !== null) {
  chkAutoLogMyces.checked = savedAutoLog === 'true';
}
if (chkAutoLogMyces) {
  chkAutoLogMyces.addEventListener('change', (e) => {
    localStorage.setItem('focus_flow_autolog_myces', e.target.checked.toString());
  });
}

// Pacing Logic Event Listeners in Settings Drawer
if (btnPacingDeep) {
  btnPacingDeep.addEventListener('click', () => setPacingMode('deep'));
}
if (btnPacingPomo) {
  btnPacingPomo.addEventListener('click', () => setPacingMode('pomo'));
}
if (selectPomoLength) {
  selectPomoLength.value = state.pomoSprintMinutes.toString();
  selectPomoLength.addEventListener('change', (e) => {
    state.pomoSprintMinutes = parseInt(e.target.value, 10) || 25;
    localStorage.setItem('focus_flow_pomo_mins', state.pomoSprintMinutes.toString());
    if (state.pacingMode === 'pomo') {
      const activeTask = getActiveTask();
      if (activeTask && !state.isBreakMode) setActiveTask(activeTask.id, false);
    }
  });
}

// Initial Pacing Mode UI state
if (btnPacingDeep) btnPacingDeep.classList.toggle('active', state.pacingMode === 'deep');
if (btnPacingPomo) btnPacingPomo.classList.toggle('active', state.pacingMode === 'pomo');
if (rowPomoSprintLen) rowPomoSprintLen.style.display = state.pacingMode === 'pomo' ? 'flex' : 'none';

// Fetch live MyCES tracks on startup
fetchMyCESTracks();

const initialTask = getActiveTask();
if (initialTask) {
  setActiveTask(initialTask.id, false);
} else {
  saveQueue();
}
renderQueue();
updateAnalyticsUI();
