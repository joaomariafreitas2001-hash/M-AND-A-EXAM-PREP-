/* Poll version.json during an open session; nightly 22:00 Europe/Madrid reload. */
const UPDATE_POLL_MS = 90_000;
const MADRID_TZ = 'Europe/Madrid';
const NIGHTLY_HOUR = 22;
const NIGHTLY_AUTO_RELOAD_MS = 4000;

let loadedBuild = null;
let updateModalShown = false;
let updatePollTimer = null;
let nightlyTimer = null;
let nightlyBackupTimer = null;

function madridParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MADRID_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: +get('year'),
    month: +get('month'),
    day: +get('day'),
    hour: +get('hour'),
    minute: +get('minute'),
    second: +get('second'),
  };
}

function madridDateKey(date = new Date()) {
  const p = madridParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function nightlyStorageKey() {
  return `madeals_nightly_reload_${madridDateKey()}`;
}

function msUntilNextMadridHour(hour) {
  const now = Date.now();
  const limit = now + 48 * 60 * 60 * 1000;
  for (let t = now; t < limit; t += 1000) {
    const p = madridParts(new Date(t));
    if (p.hour === hour && p.minute === 0 && p.second === 0) {
      return Math.max(t - now, 0);
    }
  }
  for (let t = now; t < limit; t += 60_000) {
    const p = madridParts(new Date(t));
    if (p.hour === hour && p.minute === 0) {
      return Math.max(t - now, 0);
    }
  }
  return 24 * 60 * 60 * 1000;
}

async function fetchVersionJson() {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRemoteBuild() {
  const data = await fetchVersionJson();
  return data && data.version != null ? String(data.version) : null;
}

function showUpdateModal(message, autoReloadMs = 0) {
  if (document.getElementById('update-modal')) return;
  updateModalShown = true;

  const overlay = document.createElement('div');
  overlay.id = 'update-modal';
  overlay.className = 'telemetry-overlay update-overlay';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'update-modal-title');
  overlay.innerHTML = `
    <div class="telemetry-modal card update-modal">
      <h2 id="update-modal-title">Updates available</h2>
      <p class="telemetry-modal-sub" id="update-modal-msg">${message || 'New updates on the interface. Reload to get the latest version.'}</p>
      <button type="button" class="btn btn-primary telemetry-submit" id="update-reload-btn">Reload now</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#update-reload-btn').addEventListener('click', () => {
    window.location.reload();
  });

  if (autoReloadMs > 0) {
    const msgEl = overlay.querySelector('#update-modal-msg');
    const secs = Math.ceil(autoReloadMs / 1000);
    if (msgEl) {
      msgEl.textContent = `${message} Reloading in ${secs} seconds…`;
    }
    setTimeout(() => window.location.reload(), autoReloadMs);
  }
}

function triggerNightlyReload() {
  if (sessionStorage.getItem(nightlyStorageKey())) return;
  sessionStorage.setItem(nightlyStorageKey(), '1');
  showUpdateModal('New updates on the interface.', NIGHTLY_AUTO_RELOAD_MS);
}

function scheduleNightlyMadridReload() {
  if (nightlyTimer) clearTimeout(nightlyTimer);
  const delay = msUntilNextMadridHour(NIGHTLY_HOUR);
  nightlyTimer = setTimeout(() => {
    triggerNightlyReload();
    scheduleNightlyMadridReload();
  }, delay);
}

function startNightlyBackupCheck() {
  if (nightlyBackupTimer) clearInterval(nightlyBackupTimer);
  nightlyBackupTimer = setInterval(() => {
    const p = madridParts();
    if (p.hour === NIGHTLY_HOUR && p.minute === 0) triggerNightlyReload();
  }, 30_000);
}

async function checkForUpdate(isInitial) {
  const remote = await fetchRemoteBuild();
  if (!remote) return;

  if (isInitial || loadedBuild === null) {
    loadedBuild = remote;
    return;
  }

  if (remote !== loadedBuild && !updateModalShown) {
    const data = await fetchVersionJson();
    const message = (data && data.message) || 'New updates on the interface. Reload to get the latest version.';
    showUpdateModal(message);
  }
}

function initUpdateCheck() {
  checkForUpdate(true);
  if (updatePollTimer) clearInterval(updatePollTimer);
  updatePollTimer = setInterval(() => checkForUpdate(false), UPDATE_POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate(false);
  });

  scheduleNightlyMadridReload();
  startNightlyBackupCheck();
}
