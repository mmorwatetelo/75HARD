const STORAGE_KEY = 'mindfulWorkoutChallenge';
const totalDays = 75;
const weeklyPattern = ['legs', 'cardio', 'pushups', 'abs', 'planks', 'squats', 'rest'];
const workoutMap = {
  legs: { label: 'Leg power', focus: 'Glutes, hamstrings and thigh strength', repBase: 10, intensity: 'Bodyweight lunges, split squats and wall sits' },
  cardio: { label: 'Cardio flow', focus: 'Heart rate, stamina and energy', repBase: 8, intensity: 'Fast feet, step jacks, mountain climbers' },
  pushups: { label: 'Push-up challenge', focus: 'Chest, shoulders and triceps', repBase: 12, intensity: 'Incline push-ups, push-ups and slow lowers' },
  abs: { label: 'Core focus', focus: 'Abs, obliques and posture', repBase: 14, intensity: 'Crunches, bicycle crunches and dead bugs' },
  planks: { label: 'Plank endurance', focus: 'Core stability and back alignment', repBase: 10, intensity: 'Forearm planks, side planks and shoulder taps' },
  squats: { label: 'Squat & quad day', focus: 'Quads, glutes and lower-body strength', repBase: 12, intensity: 'Bodyweight squats, squat pulses and reverse lunges' },
  rest: { label: 'Recovery + reset', focus: 'Sunday rest, stretch and gentle breathing', repBase: 0, intensity: 'Light mobility and reflection' }
};

const defaultState = {
  loginCount: 0,
  userName: 'Guest',
  preferredStart: 'activity',
  startDate: new Date().toISOString(),
  participants: ['Ava', 'Mia', 'Noah'],
  resources: [],
  activityVideos: {},
  completedDays: [],
  skippedDays: []
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const merged = saved ? { ...defaultState, ...saved } : { ...defaultState };
    merged.resources = (Array.isArray(merged.resources) ? merged.resources : []).filter((item) =>
      item && isSafeHttpUrl(item.url) && !isSearchResultsUrl(item.url)
    );
    merged.activityVideos = merged.activityVideos && typeof merged.activityVideos === 'object' ? merged.activityVideos : {};
    return merged;
  } catch (error) {
    console.warn('Could not load saved challenge data.', error);
    return { ...defaultState };
  }
}

const state = loadState();
const byId = (id) => document.getElementById(id);
const loginForm = byId('loginForm');
const loginCountEl = byId('loginCount');
const currentUserEl = byId('currentUser');
const currentDayStatEl = byId('currentDayStat');
const daysLeftStatEl = byId('daysLeftStat');
const completionStatEl = byId('completionStat');
const dailyResetEl = byId('dailyReset');
const challengeTypeEl = byId('challengeType');
const heroTitleEl = byId('heroTitle');
const todayPlanEl = byId('todayPlan');
const participantListEl = byId('participantList');
const resourceListEl = byId('resourceList');
const challengeCalendarEl = byId('challengeCalendar');
const clockEl = byId('clock');
const meditationMinutesInput = byId('meditationMinutes');
const meditationTimeEl = byId('meditationTime');
const startMeditationBtn = byId('startMeditation');
const resetMeditationBtn = byId('resetMeditation');
const markCompleteBtn = byId('markComplete');
const chartCanvas = byId('progressChart');
let meditationTimer;
let meditationSecondsLeft = Number(meditationMinutesInput.value) * 60;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Could not save challenge data.', error);
  }
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSearchResultsUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname === 'www.youtube.com' && url.pathname === '/results';
  } catch {
    return false;
  }
}

function getDirectVideo(slot) {
  const video = state.activityVideos[slot];
  if (!video || !isSafeHttpUrl(video.url) || isSearchResultsUrl(video.url)) return null;
  return video;
}

function getTodayIndex() {
  const start = new Date(state.startDate);
  const today = new Date();
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / 86400000);
  return Math.max(0, Math.min(totalDays - 1, diff));
}

function getCurrentChallengeDay() {
  return Math.min(totalDays, Math.max(1, getTodayIndex() + 1));
}

function getDayStyle(dayNumber) {
  const workoutName = weeklyPattern[(dayNumber - 1) % 7];
  const detail = workoutMap[workoutName];
  const intensityBoost = Math.ceil(dayNumber / 5 + 1);
  const meditationMinutes = 8 + ((dayNumber * 2) % 9);
  const repetitions = detail.repBase + Math.ceil(dayNumber / 2.5);

  if (workoutName === 'rest') {
    return {
      number: dayNumber, type: 'rest', label: detail.label, focus: 'Recovery day',
      meditation: `${meditationMinutes} min mindful breath`, workout: 'Light stretch & mobility reset',
      reps: 'Recovery only', affirmations: 'Today is a pause for recovery and growth.'
    };
  }

  return {
    number: dayNumber, type: workoutName, label: detail.label, focus: detail.focus,
    meditation: `${meditationMinutes} min guided meditation`,
    workout: `${detail.intensity} · ${repetitions} reps, building gradually`,
    reps: `${repetitions} reps per movement; take breaks as needed`,
    affirmations: 'I can face today with courage, patience, and a positive perspective.'
  };
}

function getTodayDetails() {
  return getDayStyle(getCurrentChallengeDay());
}

function renderClock() {
  clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function renderLoginSummary() {
  loginCountEl.textContent = state.loginCount;
  currentUserEl.textContent = state.userName || 'Guest';
}

function renderStats() {
  const currentDay = getCurrentChallengeDay();
  completionStatEl.textContent = `${Math.min(100, Math.round((state.completedDays.length / totalDays) * 100))}%`;
  currentDayStatEl.textContent = currentDay;
  daysLeftStatEl.textContent = Math.max(0, totalDays - currentDay);
  dailyResetEl.textContent = '24h';
}

function makeVideoLink(slot, label) {
  const video = getDirectVideo(slot);
  const link = document.createElement('a');
  link.className = 'video-link';
  if (video) {
    link.href = video.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `▶ ${video.title || label}`;
  } else {
    link.classList.add('video-missing');
    link.textContent = 'No direct video assigned yet — the editor can add one below.';
  }
  return link;
}

function renderTodayPlan() {
  const today = getTodayDetails();
  const startChoice = state.preferredStart || 'activity';
  const workoutText = today.workout;
  const meditationText = today.meditation;
  const orderedItems = startChoice === 'activity' ? [workoutText, meditationText] : [meditationText, workoutText];

  heroTitleEl.textContent = `Day ${today.number}: ${today.label}`;
  challengeTypeEl.textContent = today.type === 'rest' ? 'Recovery day' : 'Workout day';
  todayPlanEl.replaceChildren();

  const workoutRow = document.createElement('div');
  workoutRow.className = 'plan-row';
  const workoutIcon = document.createElement('div');
  workoutIcon.className = 'plan-icon';
  workoutIcon.textContent = '💪';
  const workoutContent = document.createElement('div');
  const workoutHeading = document.createElement('h4');
  workoutHeading.textContent = today.label;
  const workoutFocus = document.createElement('p');
  workoutFocus.textContent = today.focus;
  const workoutDescription = document.createElement('p');
  workoutDescription.textContent = `Plan: ${workoutText}`;
  const reps = document.createElement('p');
  reps.textContent = `Reps / effort: ${today.reps}`;
  workoutContent.append(workoutHeading, workoutFocus, workoutDescription, reps, makeVideoLink(today.type, `${today.label} video`));
  workoutRow.append(workoutIcon, workoutContent);

  const meditationRow = document.createElement('div');
  meditationRow.className = 'plan-row';
  const meditationIcon = document.createElement('div');
  meditationIcon.className = 'plan-icon';
  meditationIcon.textContent = '🧘';
  const meditationContent = document.createElement('div');
  const meditationHeading = document.createElement('h4');
  meditationHeading.textContent = 'Meditation';
  const meditationDescription = document.createElement('p');
  meditationDescription.textContent = meditationText;
  const mindset = document.createElement('p');
  mindset.textContent = `Mindset: ${today.affirmations}`;
  meditationContent.append(meditationHeading, meditationDescription, mindset, makeVideoLink('meditation', 'Meditation video'));
  meditationRow.append(meditationIcon, meditationContent);

  const routine = document.createElement('div');
  routine.className = 'routine-stack';
  orderedItems.forEach((text, index) => {
    const step = document.createElement('div');
    step.className = 'routine-step';
    step.textContent = `${index + 1}. ${startChoice === 'activity' ? 'Activity first' : 'Meditation first'}: ${text}`;
    routine.appendChild(step);
  });
  todayPlanEl.append(workoutRow, meditationRow, routine);
}

function renderParticipants() {
  participantListEl.replaceChildren();
  (state.participants.length ? state.participants : ['Guest']).forEach((name) => {
    const item = document.createElement('li');
    item.className = 'participant-item';
    const label = document.createElement('span');
    label.textContent = name;
    const tag = document.createElement('span');
    tag.className = 'participant-tag';
    tag.textContent = `Day ${getCurrentChallengeDay()} task: ${getTodayDetails().label}`;
    item.append(label, tag);
    participantListEl.appendChild(item);
  });
}

function renderResources() {
  resourceListEl.replaceChildren();
  state.resources.forEach((resource) => {
    if (!isSafeHttpUrl(resource.url) || isSearchResultsUrl(resource.url)) return;
    const link = document.createElement('a');
    link.href = resource.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'resource-item';
    link.textContent = resource.title;
    resourceListEl.appendChild(link);
  });
}

function renderCalendar() {
  challengeCalendarEl.replaceChildren();
  for (let day = 1; day <= totalDays; day += 1) {
    const details = getDayStyle(day);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'day-box';
    if (day === getCurrentChallengeDay()) item.classList.add('active');
    if (state.completedDays.includes(day)) item.classList.add('done');
    if (state.skippedDays.includes(day)) item.classList.add('skipped');
    const label = document.createElement('span');
    label.textContent = day;
    const type = document.createElement('small');
    type.textContent = details.type === 'rest' ? 'Rest' : details.label;
    item.append(label, type);
    item.title = `Day ${day}: ${details.label}`;
    challengeCalendarEl.appendChild(item);
  }
}

function renderChart() {
  const ctx = chartCanvas.getContext('2d');
  const { width, height } = chartCanvas;
  const padding = 26;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(148,163,184,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + ((height - padding * 2) / 4) * i;
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
  }
  const points = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const value = state.completedDays.includes(day) ? 100 : state.skippedDays.includes(day) ? 50 : 10;
    return { x: padding + (index / (totalDays - 1)) * (width - padding * 2), y: height - padding - (value / 100) * (height - padding * 2) };
  });
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = '#7bf1c6'; ctx.lineWidth = 3; ctx.stroke();
  points.forEach((point) => { ctx.beginPath(); ctx.arc(point.x, point.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#d9f99d'; ctx.fill(); });
}

function updateMeditationDisplay() {
  const minutes = Math.floor(meditationSecondsLeft / 60);
  const seconds = meditationSecondsLeft % 60;
  meditationTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startMeditation() {
  clearInterval(meditationTimer);
  meditationTimer = setInterval(() => {
    if (meditationSecondsLeft <= 0) { clearInterval(meditationTimer); return; }
    meditationSecondsLeft -= 1;
    updateMeditationDisplay();
  }, 1000);
}

function resetMeditation() {
  clearInterval(meditationTimer);
  meditationSecondsLeft = Number(meditationMinutesInput.value) * 60;
  updateMeditationDisplay();
}

function handleLogin(event) {
  event.preventDefault();
  const participantName = byId('participantName').value.trim() || 'Guest';
  state.userName = participantName;
  state.preferredStart = byId('preferredStart').value;
  state.loginCount += 1;
  if (!state.participants.includes(participantName)) state.participants.push(participantName);
  saveState();
  renderLoginSummary(); renderParticipants(); renderTodayPlan(); renderStats();
  byId('participantName').value = '';
}

function handleParticipantAdd(event) {
  event.preventDefault();
  const input = byId('newParticipantName');
  const value = input.value.trim();
  if (!value) return;
  if (!state.participants.includes(value)) state.participants.push(value);
  saveState(); renderParticipants(); input.value = '';
}

function handleResourceAdd(event) {
  event.preventDefault();
  const title = byId('resourceTitle').value.trim();
  const url = byId('resourceUrl').value.trim();
  if (!title || !isSafeHttpUrl(url) || isSearchResultsUrl(url)) {
    byId('resourceUrl').setCustomValidity('Enter a direct http(s) URL, not a YouTube search-results URL.');
    byId('resourceUrl').reportValidity();
    return;
  }
  byId('resourceUrl').setCustomValidity('');
  state.resources.push({ title, url });
  saveState(); renderResources();
  byId('resourceTitle').value = ''; byId('resourceUrl').value = '';
}

function handleVideoSave(event) {
  event.preventDefault();
  const slot = byId('videoActivity').value;
  const title = byId('videoTitle').value.trim();
  const url = byId('videoUrl').value.trim();
  const urlInput = byId('videoUrl');
  if (!title || !isSafeHttpUrl(url) || isSearchResultsUrl(url)) {
    urlInput.setCustomValidity('Paste a direct video URL (http:// or https://), not a YouTube search-results URL.');
    urlInput.reportValidity();
    return;
  }
  urlInput.setCustomValidity('');
  state.activityVideos[slot] = { title, url };
  saveState();
  renderTodayPlan();
  byId('videoEditorStatus').textContent = `Saved “${title}” for ${byId('videoActivity').selectedOptions[0].text}.`;
  byId('videoUrl').value = '';
  byId('videoTitle').value = '';
}

function markTodayDone() {
  const day = getCurrentChallengeDay();
  if (!state.completedDays.includes(day)) state.completedDays.push(day);
  state.skippedDays = state.skippedDays.filter((item) => item !== day);
  saveState(); renderStats(); renderCalendar(); renderChart();
}

loginForm.addEventListener('submit', handleLogin);
byId('participantForm').addEventListener('submit', handleParticipantAdd);
byId('resourceForm').addEventListener('submit', handleResourceAdd);
byId('videoEditorForm').addEventListener('submit', handleVideoSave);
startMeditationBtn.addEventListener('click', startMeditation);
resetMeditationBtn.addEventListener('click', resetMeditation);
meditationMinutesInput.addEventListener('input', resetMeditation);
markCompleteBtn.addEventListener('click', () => {
  markTodayDone();
  markCompleteBtn.textContent = 'Completed';
  setTimeout(() => { markCompleteBtn.textContent = 'Mark completed'; }, 1200);
});

renderClock(); renderLoginSummary(); renderStats(); renderTodayPlan(); renderParticipants(); renderResources(); renderCalendar(); renderChart(); updateMeditationDisplay();
setInterval(renderClock, 1000);
