/* Learner name + quiz logging to Google Sheet (optional). See TELEMETRY-SETUP.md */
const LS_LEARNER_NAME = 'madeals_learner_name_v1';

function telemetryEnabled() {
  return !!(typeof TELEMETRY !== 'undefined' && TELEMETRY.webhookUrl && TELEMETRY.webhookUrl.trim());
}

function getLearnerName() {
  try {
    return (localStorage.getItem(LS_LEARNER_NAME) || '').trim();
  } catch {
    return '';
  }
}

function setLearnerName(name) {
  const n = String(name || '').trim().slice(0, 80);
  if (!n) return false;
  try {
    localStorage.setItem(LS_LEARNER_NAME, n);
    return true;
  } catch {
    return false;
  }
}

function postTelemetry(payload) {
  if (!telemetryEnabled()) return;
  const body = JSON.stringify({
    token: TELEMETRY.token || '',
    ...payload,
  });
  try {
    fetch(TELEMETRY.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body,
    }).catch(() => {});
  } catch {
    /* fire-and-forget */
  }
}

function logSessionComplete(data) {
  if (!telemetryEnabled() || !getLearnerName()) return;
  postTelemetry({
    event: data.event || 'session_complete',
    name: getLearnerName(),
    score: data.score != null ? data.score : '',
    total: data.total != null ? data.total : '',
    pct: data.pct != null ? data.pct : '',
    filterLabel: data.filterLabel || '',
    difficultyLabel: data.difficultyLabel || '',
    missed: data.missed != null ? data.missed : '',
    drill: data.drill || '',
    at: new Date().toISOString(),
  });
}

function logQuizComplete(data) {
  logSessionComplete({ ...data, event: 'quiz_complete' });
}

function logDrillComplete(data) {
  logSessionComplete({ ...data, event: 'drill_complete' });
}

function showNameModal(onDone) {
  if (document.getElementById('telemetry-modal')) {
    onDone?.();
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'telemetry-modal';
  overlay.className = 'telemetry-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'telemetry-modal-title');
  overlay.innerHTML = `
    <div class="telemetry-modal card">
      <h2 id="telemetry-modal-title">Welcome</h2>
      <p class="telemetry-modal-sub">Enter your name to have access!</p>
      <label class="telemetry-label" for="telemetry-name-input">Name</label>
      <input type="text" id="telemetry-name-input" class="telemetry-input" maxlength="80" autocomplete="name" placeholder="e.g. João" />
      <p class="telemetry-error hidden" id="telemetry-name-error">Please enter your name.</p>
      <button type="button" class="btn btn-primary telemetry-submit" id="telemetry-name-submit">Continue</button>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#telemetry-name-input');
  const err = overlay.querySelector('#telemetry-name-error');
  const submit = () => {
    const v = input.value.trim();
    if (!v) {
      err.classList.remove('hidden');
      input.focus();
      return;
    }
    setLearnerName(v);
    overlay.remove();
    postTelemetry({ event: 'learner_registered', name: v, at: new Date().toISOString() });
    onDone?.();
  };

  overlay.querySelector('#telemetry-name-submit').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  input.focus();
}

function initTelemetry(onReady) {
  if (!telemetryEnabled()) {
    onReady?.();
    return;
  }
  if (getLearnerName()) {
    onReady?.();
    return;
  }
  showNameModal(onReady);
}
