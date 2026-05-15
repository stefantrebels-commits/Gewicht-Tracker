const SETTINGS_KEY = "runtimer-settings-v1";

const DEFAULT_SETTINGS = {
  runSeconds: 105,
  walkSeconds: 75,
  repetitions: 10,
  vibrationEnabled: true,
  soundEnabled: false,
};

const PHASES = {
  IDLE: "idle",
  RUN: "run",
  WALK: "walk",
  PAUSED: "paused",
  DONE: "done",
};

const statusLabel = document.getElementById("status-label");
const timeDisplay = document.getElementById("time-display");
const roundLabel = document.getElementById("round-label");
const nextLabel = document.getElementById("next-label");
const progressBar = document.getElementById("phase-progress-bar");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const resetButton = document.getElementById("reset-button");
const runDurationInput = document.getElementById("run-duration");
const walkDurationInput = document.getElementById("walk-duration");
const repetitionsInput = document.getElementById("repetitions");
const vibrationInput = document.getElementById("vibration-enabled");
const vibrationNote = document.getElementById("vibration-note");
const soundInput = document.getElementById("sound-enabled");
const settingsForm = document.getElementById("settings-form");

let settings = loadSettings();
let timerId = null;
let audioContext = null;
let currentPhase = PHASES.IDLE;
let previousActivePhase = PHASES.RUN;
let currentRepetition = 1;
let phaseDurationMs = settings.runSeconds * 1000;
let remainingMs = phaseDurationMs;
let phaseEndAt = null;

hydrateSettingsForm();
configureFeatureAvailability();
resetTimer({ keepSettings: true });

startButton.addEventListener("click", handleStartButton);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", () => resetTimer());
settingsForm.addEventListener("change", handleSettingsChange);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

function handleStartButton() {
  if (currentPhase === PHASES.PAUSED) {
    resumeTimer();
    return;
  }

  if (currentPhase === PHASES.DONE) {
    resetTimer({ keepSettings: true });
  }

  startTimer();
}

function startTimer() {
  applySettingsFromForm();
  unlockAudio();
  currentPhase = PHASES.RUN;
  previousActivePhase = PHASES.RUN;
  currentRepetition = 1;
  phaseDurationMs = settings.runSeconds * 1000;
  remainingMs = phaseDurationMs;
  beginPhaseCountdown();
  notifyPhaseChange();
  render();
}

function pauseTimer() {
  if (currentPhase !== PHASES.RUN && currentPhase !== PHASES.WALK) {
    return;
  }

  remainingMs = Math.max(0, phaseEndAt - Date.now());
  previousActivePhase = currentPhase;
  currentPhase = PHASES.PAUSED;
  stopTicking();
  render();
}

function resumeTimer() {
  currentPhase = previousActivePhase;
  beginPhaseCountdown();
  render();
}

function resetTimer(options = {}) {
  stopTicking();

  if (!options.keepSettings) {
    applySettingsFromForm();
  }

  currentPhase = PHASES.IDLE;
  previousActivePhase = PHASES.RUN;
  currentRepetition = 1;
  phaseDurationMs = settings.runSeconds * 1000;
  remainingMs = phaseDurationMs;
  phaseEndAt = null;
  render();
}

function beginPhaseCountdown() {
  stopTicking();
  phaseEndAt = Date.now() + remainingMs;
  timerId = window.setInterval(tick, 250);
  tick();
}

function tick() {
  remainingMs = Math.max(0, phaseEndAt - Date.now());

  if (remainingMs <= 0) {
    advancePhase();
    return;
  }

  render();
}

function advancePhase() {
  if (currentPhase === PHASES.RUN) {
    currentPhase = PHASES.WALK;
    previousActivePhase = PHASES.WALK;
    phaseDurationMs = settings.walkSeconds * 1000;
    remainingMs = phaseDurationMs;
    beginPhaseCountdown();
    notifyPhaseChange();
    render();
    return;
  }

  if (currentPhase === PHASES.WALK && currentRepetition < settings.repetitions) {
    currentRepetition += 1;
    currentPhase = PHASES.RUN;
    previousActivePhase = PHASES.RUN;
    phaseDurationMs = settings.runSeconds * 1000;
    remainingMs = phaseDurationMs;
    beginPhaseCountdown();
    notifyPhaseChange();
    render();
    return;
  }

  finishTimer();
}

function finishTimer() {
  stopTicking();
  currentPhase = PHASES.DONE;
  previousActivePhase = PHASES.RUN;
  remainingMs = 0;
  phaseEndAt = null;
  notifyPhaseChange();
  render();
}

function stopTicking() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function handleSettingsChange() {
  applySettingsFromForm();

  if (currentPhase === PHASES.IDLE || currentPhase === PHASES.DONE) {
    resetTimer({ keepSettings: true });
  } else {
    render();
  }
}

function applySettingsFromForm() {
  settings = {
    runSeconds: clampDuration(parseDuration(runDurationInput.value), DEFAULT_SETTINGS.runSeconds),
    walkSeconds: clampDuration(parseDuration(walkDurationInput.value), DEFAULT_SETTINGS.walkSeconds),
    repetitions: clampNumber(Number(repetitionsInput.value), 1, 99, DEFAULT_SETTINGS.repetitions),
    vibrationEnabled: vibrationInput.checked && canVibrate(),
    soundEnabled: soundInput.checked,
  };

  hydrateSettingsForm();
  saveSettings(settings);
}

function hydrateSettingsForm() {
  runDurationInput.value = formatDuration(settings.runSeconds);
  walkDurationInput.value = formatDuration(settings.walkSeconds);
  repetitionsInput.value = String(settings.repetitions);
  vibrationInput.checked = settings.vibrationEnabled && canVibrate();
  soundInput.checked = settings.soundEnabled;
}

function render() {
  document.body.classList.remove("phase-idle", "phase-run", "phase-walk", "phase-paused", "phase-done");
  document.body.classList.add(`phase-${currentPhase}`);

  statusLabel.textContent = getStatusText();
  timeDisplay.value = formatClockDuration(Math.ceil(remainingMs / 1000));
  roundLabel.textContent = getRoundText();
  nextLabel.textContent = getNextText();
  progressBar.style.transform = `scaleX(${getProgressRatio()})`;

  const isActive = currentPhase === PHASES.RUN || currentPhase === PHASES.WALK;
  const isPaused = currentPhase === PHASES.PAUSED;

  startButton.textContent = isPaused ? "Fortsetzen" : currentPhase === PHASES.DONE ? "Neu starten" : "Start";
  startButton.disabled = isActive;
  pauseButton.disabled = !isActive;
  resetButton.disabled = currentPhase === PHASES.IDLE;

  runDurationInput.disabled = isActive || isPaused;
  walkDurationInput.disabled = isActive || isPaused;
  repetitionsInput.disabled = isActive || isPaused;
}

function getStatusText() {
  if (currentPhase === PHASES.RUN) return "Laufen";
  if (currentPhase === PHASES.WALK) return "Gehen";
  if (currentPhase === PHASES.PAUSED) return "Pausiert";
  if (currentPhase === PHASES.DONE) return "Fertig";
  return "Bereit";
}

function getRoundText() {
  if (currentPhase === PHASES.IDLE) {
    return `Bereit für ${settings.repetitions} ${settings.repetitions === 1 ? "Wiederholung" : "Wiederholungen"}`;
  }

  if (currentPhase === PHASES.DONE) {
    return `${settings.repetitions} ${settings.repetitions === 1 ? "Wiederholung" : "Wiederholungen"} geschafft`;
  }

  return `Wiederholung ${currentRepetition} von ${settings.repetitions}`;
}

function getNextText() {
  if (currentPhase === PHASES.IDLE) return "Startet mit Laufen";
  if (currentPhase === PHASES.RUN) return "Danach: Gehen";
  if (currentPhase === PHASES.WALK && currentRepetition < settings.repetitions) return "Danach: Laufen";
  if (currentPhase === PHASES.WALK) return "Danach: Fertig";
  if (currentPhase === PHASES.PAUSED) return "Timer ist angehalten";
  return "Training abgeschlossen";
}

function getProgressRatio() {
  if (currentPhase === PHASES.IDLE) return 1;
  if (currentPhase === PHASES.DONE) return 0;
  return Math.max(0, Math.min(1, remainingMs / phaseDurationMs));
}

function notifyPhaseChange() {
  if (settings.vibrationEnabled && canVibrate()) {
    navigator.vibrate(currentPhase === PHASES.DONE ? [180, 80, 180] : 160);
  }

  if (settings.soundEnabled) {
    playTone(currentPhase === PHASES.DONE ? 660 : currentPhase === PHASES.RUN ? 880 : 520);
  }
}

function unlockAudio() {
  if (!settings.soundEnabled || audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(frequency) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return;

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw);
    return {
      runSeconds: clampDuration(Number(parsed.runSeconds), DEFAULT_SETTINGS.runSeconds),
      walkSeconds: clampDuration(Number(parsed.walkSeconds), DEFAULT_SETTINGS.walkSeconds),
      repetitions: clampNumber(Number(parsed.repetitions), 1, 99, DEFAULT_SETTINGS.repetitions),
      vibrationEnabled: Boolean(parsed.vibrationEnabled),
      soundEnabled: Boolean(parsed.soundEnabled),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(nextSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
}

function parseDuration(value) {
  const text = String(value).trim();
  if (!text) return NaN;

  if (text.includes(":")) {
    const [minutesPart, secondsPart = "0"] = text.split(":");
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart);
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds)) return NaN;
    return minutes * 60 + seconds;
  }

  const seconds = Number(text);
  return Number.isInteger(seconds) ? seconds : NaN;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatClockDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clampDuration(value, fallback) {
  return clampNumber(value, 5, 5999, fallback);
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function canVibrate() {
  return "vibrate" in navigator;
}

function configureFeatureAvailability() {
  if (!canVibrate()) {
    vibrationInput.checked = false;
    vibrationInput.disabled = true;
    vibrationNote.textContent = "Vibration wird von diesem Browser nicht unterstützt.";
    settings.vibrationEnabled = false;
    saveSettings(settings);
  }
}
