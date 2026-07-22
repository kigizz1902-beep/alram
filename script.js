const STORAGE_KEY = "simple-alarms";

const clockEl = document.getElementById("clock");
const timeInput = document.getElementById("alarm-time");
const labelInput = document.getElementById("alarm-label");
const addBtn = document.getElementById("add-btn");
const listEl = document.getElementById("alarm-list");
const emptyMsg = document.getElementById("empty-msg");
const overlay = document.getElementById("ringing-overlay");
const ringingLabel = document.getElementById("ringing-label");
const ringingTime = document.getElementById("ringing-time");
const snoozeBtn = document.getElementById("snooze-btn");
const stopBtn = document.getElementById("stop-btn");

let alarms = loadAlarms();
let activeAlarmId = null;
let audioCtx = null;
let beepInterval = null;

function loadAlarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function formatTimeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${pad(m)}`;
}

function renderAlarms() {
  listEl.innerHTML = "";
  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));

  emptyMsg.classList.toggle("hidden", sorted.length > 0);

  for (const alarm of sorted) {
    const li = document.createElement("li");
    li.className = "alarm-item" + (alarm.enabled ? "" : " disabled");

    const info = document.createElement("div");
    info.className = "alarm-info";

    const timeDiv = document.createElement("div");
    timeDiv.className = "alarm-time";
    timeDiv.textContent = formatTimeLabel(alarm.time);

    const labelDiv = document.createElement("div");
    labelDiv.className = "alarm-label";
    labelDiv.textContent = alarm.label || "알람";

    info.appendChild(timeDiv);
    info.appendChild(labelDiv);

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = alarm.enabled;
    checkbox.addEventListener("change", () => {
      alarm.enabled = checkbox.checked;
      saveAlarms();
      renderAlarms();
    });
    const slider = document.createElement("span");
    slider.className = "slider";
    switchLabel.appendChild(checkbox);
    switchLabel.appendChild(slider);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      alarms = alarms.filter((a) => a.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });

    li.appendChild(info);
    li.appendChild(switchLabel);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  }
}

function addAlarm() {
  const time = timeInput.value;
  if (!time) return;

  alarms.push({
    id: crypto.randomUUID(),
    time,
    label: labelInput.value.trim(),
    enabled: true,
    lastFiredMinute: null,
  });

  saveAlarms();
  renderAlarms();
  timeInput.value = "";
  labelInput.value = "";
}

function checkAlarms() {
  const now = new Date();
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const minuteKey = `${now.toDateString()}_${current}`;

  for (const alarm of alarms) {
    if (alarm.enabled && alarm.time === current && alarm.lastFiredMinute !== minuteKey) {
      alarm.lastFiredMinute = minuteKey;
      saveAlarms();
      triggerAlarm(alarm);
      break;
    }
  }
}

function triggerAlarm(alarm) {
  activeAlarmId = alarm.id;
  ringingLabel.textContent = alarm.label || "알람";
  ringingTime.textContent = formatTimeLabel(alarm.time);
  overlay.classList.remove("hidden");
  startBeep();
}

function startBeep() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const playBeep = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  };

  playBeep();
  beepInterval = setInterval(playBeep, 600);
}

function stopBeep() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
}

function stopAlarm() {
  stopBeep();
  overlay.classList.add("hidden");
  activeAlarmId = null;
}

function snoozeAlarm() {
  const alarm = alarms.find((a) => a.id === activeAlarmId);
  stopBeep();
  overlay.classList.add("hidden");
  activeAlarmId = null;

  if (alarm) {
    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
    alarm.time = `${pad(snoozeTime.getHours())}:${pad(snoozeTime.getMinutes())}`;
    alarm.lastFiredMinute = null;
    saveAlarms();
    renderAlarms();
  }
}

addBtn.addEventListener("click", addAlarm);
timeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAlarm();
});
labelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAlarm();
});
stopBtn.addEventListener("click", stopAlarm);
snoozeBtn.addEventListener("click", snoozeAlarm);

updateClock();
renderAlarms();
setInterval(updateClock, 1000);
setInterval(checkAlarms, 1000);
