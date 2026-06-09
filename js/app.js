/* M&A  -  Deals Learn */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let currentView = 'home';
let quizState = {};
let flashState = { deck: [], idx: 0, flipped: false };
let compareSort = { key: 'yearSort', asc: false };
let studyDealTab = 1;
let dealsState = { tab: 'summaries' };

const LATEST_UPDATES = [
  {
    title: 'Tabbed deal summary cards',
    text: 'Each of the 9 cases has a structured English card: deal structure, process rounds, acquirer and target motives, outcome, and exam traps.',
    action: { view: 'deals', tab: 'summaries' },
    actionLabel: 'Open Deals → Summaries',
  },
  {
    title: 'Simpler sidebar',
    text: 'Navigation is now Home, Lecture Theory, Deals, Practice, and History. Compare and Deal drills live inside Deals.',
    action: { view: 'deals' },
    actionLabel: 'Explore Deals',
  },
  {
    title: 'Success ranking reference order',
    text: 'Before you sort (acquirer or acquiree), the full course order and reasoning appears at the bottom of the intro screen.',
    action: { view: 'deals', tab: 'drills', drill: 'success-acquirer' },
    actionLabel: 'Try Success · acquirer drill',
  },
  {
    title: 'Reload fix',
    text: 'Home loads immediately on refresh. The name prompt overlays the page instead of leaving a blank screen.',
  },
];
let dealSizesState = {
  sub: 'menu',
  rankOrder: [],
  rankResult: null,
  successPerspective: 'acquirer',
  successRankOrder: [],
  successRankResult: null,
  valueDeck: [],
  valueIdx: 0,
  valueScore: 0,
  valueFeedback: null,
  valueLogged: false,
};
const DEAL_SIZE_TOLERANCE = 1;
const LS_FLASH = 'madeals_flash_v1';
const LS_STATS = 'madeals_quiz_stats_v1';
const LS_HISTORY = 'madeals_quiz_history_v1';
const LS_DEAL_REF_UNLOCKED = 'madeals_deal_ref_unlocked_v1';
const HISTORY_MAX = 50;
const QUIZ_LENGTHS = [10, 15, 20, 40];
const DEFAULT_QUIZ_LENGTH = 15;
const MAIN = '#main-content';

const PAGE_TITLES = {
  home: 'Home',
  'lecture-theory': 'Lecture Theory',
  deals: 'Deals',
  practice: 'Practice MCQ',
  history: 'History',
};

const NAV_ALIASES = {
  study: 'lecture-theory',
  'exam-prep': 'lecture-theory',
  compare: 'deals',
  'deal-sizes': 'deals',
};

const FILTER_LABELS = {
  all: 'All topics',
  lessons: 'All lessons',
  deals: 'All deals',
  cross: 'Cross-topic',
};

function focusMain() {
  const el = $(MAIN);
  if (el) el.focus({ preventScroll: false });
}

function announcePage(view) {
  document.title = `${PAGE_TITLES[view] || 'Deals'}  -  M&A Deals Learn`;
}

function questionLabel(q) {
  if (q.lecture) return LECTURE_LABELS[q.lecture] || `Lecture ${q.lecture}`;
  if (q.deal) return DEAL_LABELS[q.deal] || 'Cross-topic';
  return 'Cross-topic';
}

function matchesQuizFilter(q, filter) {
  if (filter === 'all') return true;
  if (filter === 'lessons') return !!q.lecture;
  if (filter === 'deals') return q.deal > 0;
  if (filter === 'cross') return !q.lecture && !q.deal;
  if (filter.startsWith('l')) return q.lecture === +filter.slice(1);
  if (filter.startsWith('d')) return q.deal === +filter.slice(1);
  return true;
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function prepareQuestion(q) {
  const indexed = q.options.map((o, i) => ({ o, i }));
  const shuffled = shuffle(indexed);
  return {
    displayOptions: shuffled.map((x) => x.o),
    correctDisplayIndex: shuffled.findIndex((x) => x.i === q.correct),
  };
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bankCount() {
  return Array.isArray(typeof ALL_QUESTIONS !== 'undefined' ? ALL_QUESTIONS : null)
    ? ALL_QUESTIONS.length
    : 0;
}

function flashCount() {
  return Array.isArray(typeof FLASHCARDS !== 'undefined' ? FLASHCARDS : null)
    ? FLASHCARDS.length
    : 0;
}

function showBootError(err) {
  console.error('Boot/render failed:', err);
  const main = $(MAIN);
  if (!main) return;
  main.innerHTML = `
    <div class="card sizes-result sizes-result-bad">
      <h1 class="page-title">Page failed to load</h1>
      <p>Something went wrong starting the app. Try a hard reload (Ctrl+Shift+R).</p>
      <p class="sizes-hint" style="margin-top:12px">${escHtml(err && err.message ? err.message : String(err))}</p>
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-primary" onclick="location.reload()">Reload</button>
      </div>
    </div>`;
}

function cleanOptionLabel(s) {
  return String(s).replace(/\s+(typically|in practice|generally|broadly|often)$/i, '');
}

function explainWrongChoice(q, selected, correct) {
  const sel = cleanOptionLabel(selected);
  const cor = cleanOptionLabel(correct);
  let why = `"${sel}" does not match the course definition for this question. `;
  if (sel.toLowerCase().includes('ipo') && !q.text.toLowerCase().includes('ipo')) {
    why += 'IPO-related distractors often appear in non-IPO questions to test whether you are reading the topic carefully. ';
  }
  if (/synergy|efficiency/i.test(cor) && /market power|prestige|hubris|manager/i.test(sel)) {
    why += 'Lecture 1 distinguishes value-creating synergies from market-power or managerial motives that do not create value (or destroy it). ';
  }
  if (/phase \d|due diligence|integration plan/i.test(q.text) && /phase|diligence|integration/i.test(sel) && sel !== cor) {
    why += 'Process questions require the exact phase order from Lecture 2—adjacent steps are common traps. ';
  }
  why += `The syllabus answer is "${cor}" because ${q.explanation}`;
  return why;
}

function buildQuizExplanation(q, prep, selectedIdx, ok) {
  const correctIdx = quizState.correctIdx;
  const correctText = prep.displayOptions[correctIdx];
  const correctLetter = String.fromCharCode(65 + correctIdx);
  const detail = q.explanationDetail || q.explanation;

  if (ok) {
    return `
      <p class="exp-lead exp-lead-ok"><strong>Correct.</strong> ${escHtml(correctLetter)}: ${escHtml(cleanOptionLabel(correctText))}</p>
      <h4 class="exp-heading">Why this is correct</h4>
      <p class="exp-body">${escHtml(detail)}</p>`;
  }

  const selectedText = prep.displayOptions[selectedIdx];
  const selectedLetter = String.fromCharCode(65 + selectedIdx);
  const wrongWhy = explainWrongChoice(q, selectedText, correctText);

  return `
    <p class="exp-lead exp-lead-bad"><strong>Incorrect.</strong> You chose ${escHtml(selectedLetter)}: ${escHtml(cleanOptionLabel(selectedText))}</p>
    <p class="exp-correct-line"><strong>Correct answer:</strong> ${escHtml(correctLetter)}: ${escHtml(cleanOptionLabel(correctText))}</p>
    <h4 class="exp-heading">Why your answer is wrong</h4>
    <p class="exp-body">${escHtml(wrongWhy)}</p>
    <h4 class="exp-heading">Why the correct answer is right</h4>
    <p class="exp-body">${escHtml(detail)}</p>`;
}

function getFlashProgress() {
  try {
    return JSON.parse(localStorage.getItem(LS_FLASH) || '{}');
  } catch {
    return {};
  }
}

function saveFlashProgress(p) {
  localStorage.setItem(LS_FLASH, JSON.stringify(p));
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(LS_STATS) || '{"attempts":0,"best":0}');
  } catch {
    return { attempts: 0, best: 0 };
  }
}

function saveStats(s) {
  localStorage.setItem(LS_STATS, JSON.stringify(s));
}

function filterLabel(key) {
  if (FILTER_LABELS[key]) return FILTER_LABELS[key];
  if (key.startsWith('l')) return LECTURE_LABELS[+key.slice(1)] || key;
  if (key.startsWith('d')) return DEAL_LABELS[+key.slice(1)] || key;
  return key;
}

function getQuizHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  } catch {
    return [];
  }
}

function saveQuizAttempt(attempt) {
  const hist = getQuizHistory();
  hist.unshift(attempt);
  if (hist.length > HISTORY_MAX) hist.length = HISTORY_MAX;
  localStorage.setItem(LS_HISTORY, JSON.stringify(hist));
  renderSidebarGrade();
}

function computeBreakdown(answers) {
  const lectures = {};
  const deals = {};
  const cross = { correct: 0, total: 0, wrong: 0 };
  for (const a of answers) {
    if (a.lecture) {
      if (!lectures[a.lecture]) lectures[a.lecture] = { correct: 0, total: 0, wrong: 0 };
      lectures[a.lecture].total++;
      if (a.ok) lectures[a.lecture].correct++;
      else lectures[a.lecture].wrong++;
    } else if (a.deal > 0) {
      if (!deals[a.deal]) deals[a.deal] = { correct: 0, total: 0, wrong: 0 };
      deals[a.deal].total++;
      if (a.ok) deals[a.deal].correct++;
      else deals[a.deal].wrong++;
    } else {
      cross.total++;
      if (a.ok) cross.correct++;
      else cross.wrong++;
    }
  }
  return { lectures, deals, cross };
}

function formatAttemptDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Predicted exam grade /10 from last HISTORY_MAX attempts (recent sessions weighted more). */
function computePredictedGrade(history) {
  const attempts = (history || [])
    .slice(0, HISTORY_MAX)
    .filter((a) => a.total > 0 && typeof a.pct === 'number');

  if (!attempts.length) {
    return {
      grade: null,
      weightedPct: null,
      attempts: 0,
      confidence: 'insufficient',
      trend: null,
      trendDelta: 0,
      recentAvg: null,
      simpleAvg: null,
    };
  }

  let weightSum = 0;
  let weightedPctSum = 0;
  let simpleSum = 0;
  attempts.forEach((a, i) => {
    const w = attempts.length - i;
    weightedPctSum += a.pct * w;
    weightSum += w;
    simpleSum += a.pct;
  });

  const weightedPct = weightedPctSum / weightSum;
  const grade = Math.round((weightedPct / 10) * 10) / 10;
  const simpleAvg = Math.round(simpleSum / attempts.length);

  const recent = attempts.slice(0, Math.min(5, attempts.length));
  const previous = attempts.slice(5, 10);
  let trend = null;
  let trendDelta = 0;
  if (recent.length >= 3 && previous.length >= 3) {
    const recentAvg = recent.reduce((s, a) => s + a.pct, 0) / recent.length;
    const prevAvg = previous.reduce((s, a) => s + a.pct, 0) / previous.length;
    trendDelta = Math.round(recentAvg - prevAvg);
    if (trendDelta >= 3) trend = 'up';
    else if (trendDelta <= -3) trend = 'down';
    else trend = 'stable';
  }

  const n = attempts.length;
  const confidence = n >= 20 ? 'high' : n >= 8 ? 'medium' : n >= 3 ? 'low' : 'insufficient';

  return {
    grade,
    weightedPct: Math.round(weightedPct),
    attempts: n,
    confidence,
    trend,
    trendDelta,
    recentAvg: recent.length ? Math.round(recent.reduce((s, a) => s + a.pct, 0) / recent.length) : null,
    simpleAvg,
  };
}

function gradeLevel(grade) {
  if (grade == null) return '';
  if (grade >= 8) return 'good';
  if (grade >= 6) return 'ok';
  return 'low';
}

function renderSidebarGrade() {
  const el = document.getElementById('sidebar-grade');
  if (!el) return;
  const pred = computePredictedGrade(getQuizHistory());

  if (!pred.attempts || pred.confidence === 'insufficient') {
    const msg = pred.attempts
      ? `${pred.attempts} ${pred.attempts === 1 ? 'quiz' : 'quizzes'} · need 3+ for grade`
      : 'Complete 3+ quizzes';
    el.innerHTML = `
      <button type="button" class="sidebar-grade-btn sidebar-grade-empty" id="sidebarGradeBtn" title="View quiz history">
        <span class="sidebar-grade-label">Predicted grade</span>
        <span class="sidebar-grade-placeholder">—</span>
        <span class="sidebar-grade-meta">${escHtml(msg)}</span>
      </button>`;
  } else {
    const lvl = gradeLevel(pred.grade);
    const confShort = { low: 'Low conf.', medium: 'Med. conf.', high: 'High conf.' }[pred.confidence];
    el.innerHTML = `
      <button type="button" class="sidebar-grade-btn" id="sidebarGradeBtn" title="View quiz history and grade breakdown">
        <span class="sidebar-grade-label">Predicted grade</span>
        <span class="sidebar-grade-value grade-predicted grade-predicted-${lvl}">${pred.grade}<span class="grade-denom">/10</span></span>
        <span class="sidebar-grade-meta">${pred.attempts} session${pred.attempts === 1 ? '' : 's'} · ${confShort}</span>
      </button>`;
  }

  $('#sidebarGradeBtn')?.addEventListener('click', () => navigate('history'));
}

function renderGradePredictionCard(pred, { compact = false } = {}) {
  if (!pred.attempts) {
    return `
      <div class="card grade-card grade-card-empty">
        <h3>Predicted grade</h3>
        <p class="grade-empty-msg">Complete at least <strong>3 quiz sessions</strong> to see a predicted grade out of 10.</p>
      </div>`;
  }

  if (pred.confidence === 'insufficient') {
    return `
      <div class="card grade-card grade-card-empty">
        <h3>Predicted grade</h3>
        <p class="grade-empty-msg">${pred.attempts} attempt${pred.attempts === 1 ? '' : 's'} logged - need <strong>3+</strong> for a prediction.</p>
      </div>`;
  }

  const lvl = gradeLevel(pred.grade);
  const trendHtml =
    pred.trend === 'up'
      ? `<span class="grade-trend up">↑ improving (+${pred.trendDelta}% vs prior 5)</span>`
      : pred.trend === 'down'
        ? `<span class="grade-trend down">↓ slipping (${pred.trendDelta}% vs prior 5)</span>`
        : pred.trend === 'stable'
          ? `<span class="grade-trend stable">→ stable</span>`
          : '';

  const confLabel = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' }[pred.confidence];

  if (compact) {
    return `
      <div class="grade-inline">
        <span class="grade-predicted grade-predicted-${lvl}">${pred.grade}<span class="grade-denom">/10</span></span>
        <span class="grade-inline-meta">${pred.attempts} sessions · ${confLabel}</span>
      </div>`;
  }

  return `
    <div class="card grade-card">
      <div class="grade-card-head">
        <h3>Predicted grade</h3>
        <span class="grade-confidence grade-confidence-${pred.confidence}">${confLabel}</span>
      </div>
      <div class="grade-hero">
        <div class="grade-predicted grade-predicted-${lvl}">${pred.grade}<span class="grade-denom">/10</span></div>
        <div class="grade-hero-meta">
          <p>Based on last <strong>${pred.attempts}</strong> session${pred.attempts === 1 ? '' : 's'} (max ${HISTORY_MAX})</p>
          <p>Weighted quiz average: <strong>${pred.weightedPct}%</strong> · Simple avg: ${pred.simpleAvg}%</p>
          ${pred.recentAvg != null ? `<p>Last 5 sessions avg: <strong>${pred.recentAvg}%</strong></p>` : ''}
          ${trendHtml}
        </div>
      </div>
      <p class="grade-disclaimer">Indicative only - maps quiz % to a 0-10 scale (recent drills count more). Not an official ESADE grade.</p>
    </div>`;
}

function renderBreakdownTable(breakdown) {
  const lectureRows = Object.entries(breakdown.lectures || {})
    .sort(([a], [b]) => +a - +b)
    .map(([id, s]) => {
      const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
      return `<tr><td>${escHtml(LECTURE_LABELS[id] || `L${id}`)}</td><td>${s.correct}/${s.total}</td><td>${pct}%</td></tr>`;
    }).join('');
  const dealRows = Object.entries(breakdown.deals || {})
    .sort(([a], [b]) => +a - +b)
    .map(([id, s]) => {
      const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
      return `<tr><td>${escHtml(DEAL_LABELS[id] || `Deal ${id}`)}</td><td>${s.correct}/${s.total}</td><td>${pct}%</td></tr>`;
    }).join('');
  const cross = breakdown.cross || { correct: 0, total: 0 };
  const crossPct = cross.total ? Math.round((cross.correct / cross.total) * 100) : 0;
  const crossRow = cross.total
    ? `<tr><td>Cross-topic</td><td>${cross.correct}/${cross.total}</td><td>${crossPct}%</td></tr>`
    : '';
  if (!lectureRows && !dealRows && !crossRow) return '<p class="page-sub">No breakdown data.</p>';
  return `
    <table class="history-breakdown-table">
      <thead><tr><th>Topic</th><th>Score</th><th>%</th></tr></thead>
      <tbody>${lectureRows}${dealRows}${crossRow}</tbody>
    </table>`;
}

function renderWrongReviewList(wrong, openFirst = false) {
  if (!wrong.length) {
    return `<div class="card quiz-review quiz-review-perfect"><h3>No mistakes</h3><p>Perfect attempt.</p></div>`;
  }
  return `
    <div class="card quiz-review">
      <h3>Missed questions (${wrong.length})</h3>
      ${wrong.map((w, i) => {
        const diffClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[w.difficulty] || 'badge-s1';
        return `
        <details class="review-item" ${openFirst && i === 0 ? 'open' : ''}>
          <summary class="review-summary">
            <span class="review-num">${i + 1}</span>
            <span class="review-q">${escHtml(w.questionText)}</span>
            <span class="badge ${diffClass}">${escHtml(w.difficulty)}</span>
            <span class="badge badge-s1">${escHtml(w.label)}</span>
          </summary>
          <div class="review-body">
            <p class="review-wrong"><strong>Your answer:</strong> ${escHtml(cleanOptionLabel(w.selectedText))}</p>
            <p class="review-correct"><strong>Correct answer:</strong> ${escHtml(cleanOptionLabel(w.correctText))}</p>
            <h4 class="exp-heading">Why your answer was wrong</h4>
            <p class="exp-body">${escHtml(w.wrongWhy)}</p>
            <h4 class="exp-heading">Why the correct answer is right</h4>
            <p class="exp-body">${escHtml(w.explanationDetail)}</p>
          </div>
        </details>`;
      }).join('')}
    </div>`;
}

function renderHistory() {
  const hist = getQuizHistory();
  const gradePred = computePredictedGrade(hist);
  $(MAIN).innerHTML = `
    <h1 class="page-title">Quiz history</h1>
    <p class="page-sub">Stored in this browser only · last ${HISTORY_MAX} attempts</p>
    ${renderGradePredictionCard(gradePred)}
    ${hist.length ? '' : '<div class="card"><p>No attempts yet. <button type="button" class="btn btn-primary" data-go="practice">Start a quiz</button></p></div>'}
    <div id="historyList">
      ${hist.map((a) => `
        <details class="history-attempt" data-id="${a.id}">
          <summary class="history-summary">
            <span class="history-pct ${a.pct >= 80 ? 'good' : a.pct >= 60 ? 'ok' : 'low'}">${a.pct}%</span>
            <span class="history-meta">
              <strong>${a.score} / ${a.total}</strong>
              <span>${escHtml(formatAttemptDate(a.at))}</span>
              <span>${escHtml(a.filterLabel)} · ${escHtml(a.difficultyLabel)}${a.filters?.sessionLabel ? ` · ${escHtml(a.filters.sessionLabel)}` : ''}</span>
            </span>
            <span class="history-miss">${a.wrong.length} missed</span>
          </summary>
          <div class="history-detail">
            <h4>By lecture & deal</h4>
            ${renderBreakdownTable(a.breakdown)}
            ${renderWrongReviewList(a.wrong, false)}
            <button type="button" class="btn btn-secondary btn-sm history-delete" data-id="${a.id}">Delete this attempt</button>
          </div>
        </details>
      `).join('')}
    </div>
    ${hist.length ? '<div class="btn-row"><button type="button" class="btn btn-secondary" id="clearHistoryBtn">Clear all history</button></div>' : ''}
  `;
  $('[data-go="practice"]')?.addEventListener('click', () => navigate('practice'));
  $$('.history-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = +btn.dataset.id;
      const next = getQuizHistory().filter((x) => x.id !== id);
      localStorage.setItem(LS_HISTORY, JSON.stringify(next));
      renderHistory();
    });
  });
  $('#clearHistoryBtn')?.addEventListener('click', () => {
    if (confirm('Delete all quiz history in this browser?')) {
      localStorage.removeItem(LS_HISTORY);
      renderHistory();
    }
  });
}

function applyNavigateOptions(view, opts = {}) {
  if (view === 'deals') {
    dealsState.tab = opts.tab || (currentView === 'deals' ? dealsState.tab : 'summaries');
    if (opts.dealId) studyDealTab = opts.dealId;
    if (opts.drill === 'success-acquirer') {
      dealsState.tab = 'drills';
      dealSizesState.sub = 'success-intro';
      dealSizesState.successPerspective = 'acquirer';
    } else if (opts.drill === 'success-acquiree') {
      dealsState.tab = 'drills';
      dealSizesState.sub = 'success-intro';
      dealSizesState.successPerspective = 'acquiree';
    } else if (opts.tab === 'drills' && !opts.keepDrill) {
      dealSizesState.sub = opts.drillSub || 'menu';
    }
  }
  if (view === 'lecture-theory' && currentView !== 'lecture-theory') {
    examPrepState.sub = opts.examSub || 'menu';
  }
}

function navigate(view, opts = {}) {
  if (NAV_ALIASES[view]) {
    if (view === 'compare') opts.tab = opts.tab || 'compare';
    if (view === 'deal-sizes') opts.tab = opts.tab || 'drills';
    view = NAV_ALIASES[view];
  }
  applyNavigateOptions(view, opts);
  currentView = view;
  $$('.nav-btn').forEach((b) => {
    const on = b.dataset.view === view;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  announcePage(view);
  const renderers = {
    home: renderHome,
    'lecture-theory': renderLectureTheory,
    deals: renderDeals,
    practice: renderPracticeSetup,
    history: renderHistory,
  };
  try {
    const render = renderers[view] || renderHome;
    if (typeof render !== 'function') {
      throw new Error(`View "${view}" is not ready yet. Reload the page.`);
    }
    render();
  } catch (err) {
    showBootError(err);
  }
  renderSidebarGrade();
  focusMain();
}

function renderLatestUpdates() {
  return `
    <div class="card updates-card">
      <h3>Latest updates</h3>
      <p class="sizes-hint" style="margin-bottom:14px">Shipped in the last few hours — click through to try each feature.</p>
      <ul class="updates-list">
        ${LATEST_UPDATES.map((u, i) => `
          <li class="updates-item">
            <div class="updates-item-head">
              <span class="updates-num">${i + 1}</span>
              <strong>${escHtml(u.title)}</strong>
            </div>
            <p>${escHtml(u.text)}</p>
            ${u.action ? `<button type="button" class="btn btn-secondary btn-sm updates-go" data-update-view="${escAttr(u.action.view)}"${u.action.tab ? ` data-update-tab="${escAttr(u.action.tab)}"` : ''}${u.action.drill ? ` data-update-drill="${escAttr(u.action.drill)}"` : ''}>${escHtml(u.actionLabel)}</button>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>`;
}

function bindLatestUpdates() {
  $$('.updates-go').forEach((btn) => {
    btn.onclick = () => {
      const opts = { view: btn.dataset.updateView };
      if (btn.dataset.updateTab) opts.tab = btn.dataset.updateTab;
      if (btn.dataset.updateDrill) opts.drill = btn.dataset.updateDrill;
      navigate(opts.view, opts);
    };
  });
}

function renderHome() {
  const st = getStats();
  const allHist = getQuizHistory();
  const hist = allHist.slice(0, 5);
  const gradePred = computePredictedGrade(allHist);
  const recentHtml = hist.length
    ? `<div class="card">
      <h3>Recent quiz attempts</h3>
      <ul class="history-recent-list">
        ${hist.map((a) => `
          <li>
            <span class="history-pct ${a.pct >= 80 ? 'good' : a.pct >= 60 ? 'ok' : 'low'}">${a.pct}%</span>
            <span>${a.score}/${a.total} · ${escHtml(a.filterLabel)} · ${formatAttemptDate(a.at)}</span>
          </li>`).join('')}
      </ul>
      <button type="button" class="btn btn-secondary" data-go="history">View full history</button>
    </div>`
    : '';
  $(MAIN).innerHTML = `
    <h1 class="page-title">M&A Deals Learn</h1>
    <p class="page-sub">Full course revision  -  7 lectures + 9 case deals for your ESADE M&A exam</p>
    ${renderLatestUpdates()}
    <div class="grid-2" role="list">
      <button type="button" class="tile" data-go="lecture-theory" role="listitem"><span class="tile-icon" aria-hidden="true">📖</span><h4>Lecture Theory</h4><p>Lectures L1–L8 · takeover toolkit · short answers</p></button>
      <button type="button" class="tile" data-go="deals" role="listitem"><span class="tile-icon" aria-hidden="true">📋</span><h4>Deals</h4><p>Case summaries · compare matrix · rank & value drills</p></button>
      <button type="button" class="tile" data-go="practice" role="listitem"><span class="tile-icon" aria-hidden="true">✓</span><h4>Practice MCQ</h4><p>${bankCount()} in bank · 10, 15, 20, or 40 per session</p></button>
      <button type="button" class="tile" data-go="history" role="listitem"><span class="tile-icon" aria-hidden="true">📊</span><h4>History</h4><p>Quiz attempts and predicted grade</p></button>
    </div>
    ${renderGradePredictionCard(gradePred)}
    <div class="card">
      <h3>Your progress (this browser)</h3>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:8px">
        Quiz attempts: <strong>${st.attempts}</strong> · Best score: <strong>${st.best}%</strong>
      </p>
      <div class="btn-row">
        <button class="btn btn-primary" data-go="practice">Start practice →</button>
        <button class="btn btn-secondary" data-go="deals">Review deals →</button>
      </div>
    </div>
    ${recentHtml}
    <div class="card">
      <h3>Exam-night checklist</h3>
      <ul class="trap-list">
        <li>Only synergies create value  -  premium must be &lt; synergies</li>
        <li>12-phase process: integration plan (8) before due diligence (9)</li>
        <li>Scale vs scope  -  which motive fits each deal?</li>
        <li>MBO formula: (EBITDA × multiple) − net debt · PE = 2+20</li>
        <li>Know deal value, year, premium, and close date for each</li>
      </ul>
    </div>
    <div class="card">
      <h3>Lecture index</h3>
      <p style="font-size:0.88rem;color:var(--muted);margin-bottom:10px">L1 Intro · L2 Process · L3 Integration · L5 MBO · L6 PE/VC · L7 Takeovers · L8 IPO</p>
      <div class="btn-row">
        ${STUDY_LECTURES.map((l) => `<button type="button" class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem" data-lecture="${l.id}">L${l.id}</button>`).join('')}
      </div>
    </div>
    <div class="card">
      <h3>Deal index</h3>
      <ol style="font-size:0.92rem;color:var(--text-body);line-height:1.8;padding-left:20px">
        ${STUDY_DEALS.map((d) => `<li><button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:0.82rem" data-deal="${d.id}">${d.title}</button>  -  ${d.value} (${d.year})</li>`).join('')}
      </ol>
    </div>
  `;
  $$('[data-go]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.go)));
  $('[data-go="history"]')?.addEventListener('click', () => navigate('history'));
  bindLatestUpdates();
  $$('[data-deal]').forEach((el) => el.addEventListener('click', () => {
    navigate('deals', { tab: 'summaries', dealId: +el.dataset.deal });
    setTimeout(() => {
      document.querySelector('.deal-resumo-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }));
  $$('[data-lecture]').forEach((el) => el.addEventListener('click', () => {
    navigate('lecture-theory');
    setTimeout(() => {
      const det = document.querySelector(`[data-lecture-id="${el.dataset.lecture}"]`);
      if (det) {
        det.open = true;
        det.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }));
}

function dealResumoVerdictClass(verdict) {
  if (verdict === 'ok') return 'resumo-v-ok';
  if (verdict === 'fail') return 'resumo-v-fail';
  return 'resumo-v-mix';
}

function dealResumoBadgeClass(verdict) {
  if (verdict === 'ok') return 'resumo-badge-ok';
  if (verdict === 'fail') return 'resumo-badge-fail';
  return 'resumo-badge-mix';
}

function dealResumoDotClass(dot) {
  if (dot === 'accepted') return 'resumo-dot-accepted';
  if (dot === 'close') return 'resumo-dot-close';
  return 'resumo-dot-rejected';
}

function renderDealResumoCard(dealId) {
  const deal = STUDY_DEALS.find((d) => d.id === dealId);
  const resumo = DEAL_RESUMOS[dealId];
  if (!deal || !resumo) return '';

  const structHtml = resumo.struct.map(([k, v]) => `
    <div class="resumo-kv">
      <span class="resumo-kv-k">${escHtml(k)}</span>
      <span class="resumo-kv-v">${escHtml(v)}</span>
    </div>`).join('');

  const roundsHtml = resumo.rounds.map((r) => `
    <div class="resumo-round">
      <span class="resumo-dot ${dealResumoDotClass(r.dot)}" aria-hidden="true"></span>
      <span>${escHtml(r.text)}</span>
    </div>`).join('');

  const trapsHtml = resumo.traps.map((t) => `<li>${escHtml(t)}</li>`).join('');

  return `
    <div class="resumo-card${studyDealTab === dealId ? ' active' : ''}" id="resumo-card-${dealId}" role="tabpanel" aria-labelledby="resumo-tab-${dealId}"${studyDealTab === dealId ? '' : ' hidden'}>
      <div class="resumo-card-header">
        <div class="resumo-deal-title">${escHtml(deal.title)}</div>
        <div class="resumo-deal-sub">${escHtml(deal.value)} · ${escHtml(String(deal.year))} · closed ${escHtml(deal.closed)}</div>
        <div class="resumo-badges">
          <span class="resumo-badge resumo-badge-type">${escHtml(resumo.typeLabel)}</span>
          <span class="resumo-badge ${dealResumoBadgeClass(resumo.verdict)}">${escHtml(resumo.verdictLabel)}</span>
        </div>
      </div>
      <div class="resumo-grid">
        <div class="resumo-section">
          <div class="resumo-sec-label">Deal structure</div>
          ${structHtml}
        </div>
        <div class="resumo-section">
          <div class="resumo-sec-label">Process rounds</div>
          ${roundsHtml}
        </div>
        <div class="resumo-section">
          <div class="resumo-sec-label">Acquirer motivations</div>
          <p class="resumo-sec-body">${escHtml(resumo.motivAcquirer)}</p>
        </div>
        <div class="resumo-section">
          <div class="resumo-sec-label">Target motivations</div>
          <p class="resumo-sec-body">${escHtml(resumo.motivTarget)}</p>
        </div>
        <div class="resumo-section resumo-section-full">
          <div class="resumo-sec-label">Outcome — successes and failures</div>
          <p class="resumo-sec-body">${escHtml(resumo.result)}</p>
        </div>
        <div class="resumo-section resumo-section-full">
          <div class="resumo-sec-label">Exam traps</div>
          <ul class="trap-list">${trapsHtml}</ul>
        </div>
      </div>
      <div class="resumo-verdict-bar">
        <span class="resumo-verdict-label">Course verdict (acquirer)</span>
        <span class="${dealResumoVerdictClass(resumo.verdict)}">${escHtml(resumo.verdictLabel)}</span>
      </div>
    </div>`;
}

function renderDealResumoTabs() {
  const tabsHtml = DEAL_RESUMO_ORDER.map((id) => {
    const resumo = DEAL_RESUMOS[id];
    const active = studyDealTab === id;
    return `<button type="button" class="resumo-tab${active ? ' active' : ''}" id="resumo-tab-${id}" role="tab" aria-selected="${active}" aria-controls="resumo-card-${id}" data-deal-tab="${id}">${escHtml(resumo.label)}</button>`;
  }).join('');

  const cardsHtml = DEAL_RESUMO_ORDER.map((id) => renderDealResumoCard(id)).join('');

  return `
    <div class="deal-resumo-wrap">
      <p class="sizes-hint" style="margin-bottom:12px">Click a deal tab to open the full summary card.</p>
      <div class="resumo-tabs" role="tablist" aria-label="Deal summaries">${tabsHtml}</div>
      <div class="resumo-cards">${cardsHtml}</div>
    </div>`;
}

function bindDealResumoTabs() {
  $$('.resumo-tab').forEach((btn) => {
    btn.onclick = () => {
      studyDealTab = +btn.dataset.dealTab;
      $$('.resumo-tab').forEach((b) => {
        const on = +b.dataset.dealTab === studyDealTab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      $$('.resumo-card').forEach((card) => {
        const on = +card.id.replace('resumo-card-', '') === studyDealTab;
        card.classList.toggle('active', on);
        if (on) card.removeAttribute('hidden');
        else card.setAttribute('hidden', '');
      });
    };
  });
}

function openStudyDealTab(dealId) {
  if (DEAL_RESUMOS[dealId]) studyDealTab = dealId;
}

function renderLectureTheory() {
  if (examPrepState.sub !== 'menu') {
    return renderExamPrep();
  }

  const lecturesHtml = STUDY_LECTURES.map(
    (l) => `
    <details class="study-session" data-lecture-id="${l.id}">
      <summary>${l.title}</summary>
      <div class="study-body">
        <p><strong>Lesson overview:</strong> ${l.overview}</p>
        ${l.sections.map((sec) => `<h4>${sec.h}</h4>${sec.html}`).join('')}
        <h4>Exam traps</h4>
        <ul class="trap-list">${l.traps.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
    </details>`
  ).join('');

  const formulaHtml = EXAM_FRAMEWORK.map(
    (f) => `<div class="formula-row"><span>${f.topic}</span><code>${f.formula}</code></div>`
  ).join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Lecture Theory</h1>
    <p class="page-sub">Lectures L1–L8 · written-exam drills · frameworks</p>
    <h2 style="font-size:1.1rem;margin:24px 0 12px;color:var(--accent-text)">Lectures</h2>
    ${lecturesHtml}
    <h2 style="font-size:1.1rem;margin:28px 0 12px;color:var(--accent-text)">Written exam drills</h2>
    <div class="grid-2 sizes-menu-grid">
      <button type="button" class="tile" id="epToolkitBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">🛡</span>
        <h4>Takeover toolkit</h4>
        <p>${TAKEOVER_TERMS.length} terms · pre-bid, post-bid, buyer tactics</p>
      </button>
      <button type="button" class="tile" id="epToolkitQuizBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">?</span>
        <h4>Classify defenses</h4>
        <p>Pre-bid, post-bid, or buyer tactic? · self-check quiz</p>
      </button>
      <button type="button" class="tile" id="epConceptsBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">📋</span>
        <h4>Concept index</h4>
        <p>IM, escrow, ratchet, LBU, earn-out, tag/drag</p>
      </button>
      <button type="button" class="tile" id="epShortAnswerBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">✎</span>
        <h4>Short answers</h4>
        <p>${SHORT_ANSWER_SESSION_SIZE} questions · model answer reveal</p>
      </button>
    </div>
    <div class="card" style="margin-top:20px">
      <h3>Exam frameworks & formulas</h3>
      <div class="formula-grid">${formulaHtml}</div>
    </div>
    <div class="card">
      <h3>Deals part of the exam</h3>
      <p class="sizes-hint" style="margin-bottom:12px">Case summaries, compare matrix, and rank/value drills are in <strong>Deals</strong>.</p>
      <button type="button" class="btn btn-primary" data-go="deals">Open Deals →</button>
    </div>
  `;

  $('#epToolkitBtn').onclick = () => {
    examPrepState.sub = 'toolkit';
    examPrepState.toolkitMode = 'browse';
    renderLectureTheory();
  };
  $('#epToolkitQuizBtn').onclick = () => {
    examPrepState.sub = 'toolkit-quiz';
    examPrepState.tkQuizDeck = shuffle([...TAKEOVER_TERMS]);
    examPrepState.tkQuizIdx = 0;
    examPrepState.tkQuizScore = 0;
    examPrepState.tkQuizAnswered = false;
    examPrepState.tkQuizLogged = false;
    renderLectureTheory();
  };
  $('#epConceptsBtn').onclick = () => {
    examPrepState.sub = 'concepts';
    renderLectureTheory();
  };
  $('#epShortAnswerBtn').onclick = () => {
    const pool = shuffle([...SHORT_ANSWER_QUESTIONS]);
    examPrepState.saDeck = pool.slice(0, SHORT_ANSWER_SESSION_SIZE);
    examPrepState.saIdx = 0;
    examPrepState.saRevealed = false;
    examPrepState.saLogged = false;
    examPrepState.sub = 'short-answer';
    renderLectureTheory();
  };
  $('[data-go="deals"]')?.addEventListener('click', () => navigate('deals'));
}

function renderDealsSubNav(activeTab) {
  const tabs = [
    { id: 'summaries', label: 'Case summaries' },
    { id: 'compare', label: 'Compare matrix' },
    { id: 'drills', label: 'Drills' },
  ];
  return `
    <div class="deals-subnav" role="tablist" aria-label="Deals sections">
      ${tabs.map((t) => `
        <button type="button" class="deals-subnav-btn${activeTab === t.id ? ' active' : ''}" role="tab" aria-selected="${activeTab === t.id}" data-deals-tab="${t.id}">${escHtml(t.label)}</button>
      `).join('')}
    </div>`;
}

function bindDealsSubNav() {
  $$('.deals-subnav-btn').forEach((btn) => {
    btn.onclick = () => {
      dealsState.tab = btn.dataset.dealsTab;
      if (dealsState.tab === 'drills') dealSizesState.sub = 'menu';
      renderDeals();
    };
  });
}

function renderDealsSummaries() {
  $(MAIN).innerHTML = `
    <h1 class="page-title">Deals</h1>
    <p class="page-sub">${STUDY_DEALS.length} ESADE case studies · structure, process, motives, outcome</p>
    ${renderDealsSubNav('summaries')}
    ${renderDealResumoTabs()}
  `;
  bindDealsSubNav();
  bindDealResumoTabs();
}

function renderDeals() {
  if (dealsState.tab === 'drills') {
    if (dealSizesState.sub !== 'menu') return renderDealSizes();
    return renderDealsDrillsMenu();
  }
  if (dealsState.tab === 'compare') return renderDealsCompare();
  return renderDealsSummaries();
}

const COMPARE_COLUMNS = [
  { key: 'deal', label: 'Deal', type: 'string', col: 'col-deal' },
  { key: 'yearSort', label: 'Year', type: 'number', display: 'year', col: 'col-year' },
  { key: 'valueSort', label: 'Value', type: 'number', display: 'value', col: 'col-value' },
  { key: 'type', label: 'Type', type: 'string', col: 'col-type' },
  { key: 'pay', label: 'Payment', type: 'string', col: 'col-pay' },
  { key: 'premiumSort', label: 'Premium', type: 'number', display: 'premium', nullsLast: true, col: 'col-premium' },
  { key: 'motive', label: 'Motive', type: 'string', col: 'col-motive' },
  { key: 'successScore', label: 'Success (acquirer)', type: 'number', display: 'success', col: 'col-success' },
  { key: 'outcome', label: 'Outcome', type: 'string', col: 'col-outcome' },
];

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function successBadge(label) {
  const slug = label.toLowerCase();
  return `<span class="success-badge success-${slug}">${label}</span>`;
}

function compareSortValue(row, col) {
  const v = row[col.key];
  if (col.type === 'number') {
    if (v == null || Number.isNaN(v)) return col.nullsLast ? Infinity : -Infinity;
    return v;
  }
  return String(v ?? '').toLowerCase();
}

function sortCompareRows(rows) {
  const col = COMPARE_COLUMNS.find((c) => c.key === compareSort.key) || COMPARE_COLUMNS[0];
  const dir = compareSort.asc ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = compareSortValue(a, col);
    const bv = compareSortValue(b, col);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return a.deal.localeCompare(b.deal);
  });
}

function renderDealsCompare() {
  const sorted = sortCompareRows(COMPARE_ROWS);
  const headers = COMPARE_COLUMNS.map((col) => {
    const active = compareSort.key === col.key;
    const arrow = active ? (compareSort.asc ? ' ↑' : ' ↓') : '';
    const aria = active ? ` aria-sort="${compareSort.asc ? 'ascending' : 'descending'}"` : ' aria-sort="none"';
    return `<th class="sortable-th ${col.col || ''}" scope="col" data-sort="${col.key}"${aria} title="Sort by ${col.label}">${col.label}<span class="sort-ind" aria-hidden="true">${arrow}</span></th>`;
  }).join('');

  const rows = sorted.map(
    (r) => `<tr>
      <td class="col-deal"><strong>${r.deal}</strong></td>
      <td class="col-year">${r.year}</td>
      <td class="col-value">${r.value}</td>
      <td class="col-type">${r.type}</td>
      <td class="col-pay">${r.pay}</td>
      <td class="col-premium">${r.premium}</td>
      <td class="col-motive">${r.motive}</td>
      <td class="col-success" title="${escAttr(r.successNote)}">${successBadge(r.success)}</td>
      <td class="col-outcome">${r.outcome}</td>
    </tr>`
  ).join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Deals</h1>
    <p class="page-sub">Side-by-side matrix · click any column header to sort</p>
    ${renderDealsSubNav('compare')}
    <div class="card compare-card">
      <div class="compare-wrap">
        <table class="compare-table compare-table-main" id="compareTable">
          <colgroup>
            <col class="col-deal" />
            <col class="col-year" />
            <col class="col-value" />
            <col class="col-type" />
            <col class="col-pay" />
            <col class="col-premium" />
            <col class="col-motive" />
            <col class="col-success" />
            <col class="col-outcome" />
          </colgroup>
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h3>Scale vs scope</h3>
      <table class="compare-table compare-table-aux">
        <tr><th>Scale (cost / same industry)</th><td>CaixaBank · Bankia, Marriott · Starwood, Kraft · Cadbury (partly)</td></tr>
        <tr><th>Scope (capabilities / new markets)</th><td>Microsoft · LinkedIn, Amazon · WFM, Instagram, Disney · Fox, LVMH · Tiffany</td></tr>
        <tr><th>Reverse / family saga</th><td>VW · Porsche</td></tr>
      </table>
    </div>
    <div class="card">
      <h3>All-cash deals</h3>
      <p>Microsoft · LinkedIn · Amazon · Whole Foods · LVMH · Tiffany: certainty, no exchange-ratio risk, often when target stock depressed or bidder has liquidity/debt access.</p>
    </div>
  `;

  $$('#compareTable th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (compareSort.key === key) compareSort.asc = !compareSort.asc;
      else {
        compareSort.key = key;
        compareSort.asc = key === 'deal' || key === 'type' || key === 'motive' || key === 'outcome' || key === 'pay';
      }
      renderDealsCompare();
    });
  });
  bindDealsSubNav();
}

function getDealSizeItems() {
  return COMPARE_ROWS.map((row, id) => ({
    id,
    deal: row.deal,
    valueSort: row.valueSort,
    valueLabel: row.value,
    currency: String(row.value).includes('€') ? '€' : '$',
  }));
}

function dealSizeCorrectOrder() {
  return [...getDealSizeItems()]
    .sort((a, b) => b.valueSort - a.valueSort)
    .map((d) => d.id);
}

function dealSizeById(id) {
  return getDealSizeItems().find((d) => d.id === id);
}

function isDealValueCorrect(entered, actual) {
  if (entered === null || Number.isNaN(entered)) return false;
  return Math.abs(entered - actual) <= DEAL_SIZE_TOLERANCE;
}

function isDealRefUnlocked() {
  try {
    return localStorage.getItem(LS_DEAL_REF_UNLOCKED) === '1';
  } catch {
    return false;
  }
}

function unlockDealRef() {
  try {
    localStorage.setItem(LS_DEAL_REF_UNLOCKED, '1');
  } catch {
    /* ignore */
  }
}

function resetDealSizesRank() {
  const ids = getDealSizeItems().map((d) => d.id);
  dealSizesState.rankOrder = shuffle(ids);
  dealSizesState.rankResult = null;
}

function resetDealSizesValues() {
  const ids = getDealSizeItems().map((d) => d.id);
  dealSizesState.valueDeck = shuffle(ids);
  dealSizesState.valueIdx = 0;
  dealSizesState.valueScore = 0;
  dealSizesState.valueFeedback = null;
  dealSizesState.valueLogged = false;
}

const SUCCESS_PERSPECTIVES = {
  acquirer: {
    label: 'Acquirer',
    sublabel: 'the buying company',
    ratingKey: 'successAcquirer',
    scoreKey: 'successAcquirerScore',
  },
  acquiree: {
    label: 'Acquiree',
    sublabel: 'the target / selling side',
    ratingKey: 'successAcquiree',
    scoreKey: 'successAcquireeScore',
  },
};

function getDealSuccessItems(perspective = dealSizesState.successPerspective) {
  const cfg = SUCCESS_PERSPECTIVES[perspective] || SUCCESS_PERSPECTIVES.acquirer;
  return COMPARE_ROWS.map((row, id) => ({
    id,
    deal: row.deal,
    success: row[cfg.ratingKey],
    successScore: row[cfg.scoreKey],
  }));
}

function dealSuccessById(id, perspective = dealSizesState.successPerspective) {
  return getDealSuccessItems(perspective).find((d) => d.id === id);
}

function dealSuccessCorrectOrder(perspective = dealSizesState.successPerspective) {
  return [...getDealSuccessItems(perspective)]
    .sort((a, b) => b.successScore - a.successScore || a.deal.localeCompare(b.deal))
    .map((d) => d.id);
}

function getSuccessExtremes(perspective = dealSizesState.successPerspective) {
  const items = getDealSuccessItems(perspective);
  const max = Math.max(...items.map((i) => i.successScore));
  const min = Math.min(...items.map((i) => i.successScore));
  return {
    most: items.filter((i) => i.successScore === max),
    least: items.filter((i) => i.successScore === min),
  };
}

function resetDealSizesSuccessRank() {
  const ids = getDealSuccessItems().map((d) => d.id);
  dealSizesState.successRankOrder = shuffle(ids);
  dealSizesState.successRankResult = null;
}

function renderSuccessOrderRationale(perspective) {
  const cfg = SUCCESS_PERSPECTIVES[perspective];
  const ratingKey = perspective === 'acquirer' ? 'successAcquirer' : 'successAcquiree';
  const noteKey = perspective === 'acquirer' ? 'successAcquirerNote' : 'successAcquireeNote';
  const order = dealSuccessCorrectOrder(perspective);
  const items = order.map((id, i) => {
    const row = COMPARE_ROWS[id];
    return {
      rank: i + 1,
      deal: row.deal,
      rating: row[ratingKey],
      note: row[noteKey],
    };
  });

  return `
    <div class="card success-rationale-card">
      <h3>Course order on this site (${escHtml(cfg.label)})</h3>
      <p class="sizes-hint">This is the ranking we use when you check your sort. Tiers run <strong>Exceptional → Strong → Moderate → Mixed</strong>. Deals in the same tier can be in any order.</p>
      <ol class="success-rationale-list">
        ${items.map((item) => `
          <li class="success-rationale-item">
            <span class="success-rationale-rank">${item.rank}</span>
            <div class="success-rationale-body">
              <div class="success-rationale-head">
                <strong>${escHtml(item.deal)}</strong>
                <span class="sizes-ref-val">${escHtml(item.rating)}</span>
              </div>
              <p class="success-rationale-note">${escHtml(item.note)}</p>
            </div>
          </li>
        `).join('')}
      </ol>
      <p class="sizes-hint success-rationale-footer">Verdicts follow the ESADE case notes: did the ${escHtml(cfg.sublabel)} create or destroy value, meet strategic goals, and avoid hubris or a messy process — not headline deal size.</p>
    </div>
  `;
}

function bindDealRankListHandlers({ listEl, getOrder, setOrder, clearResult, render }) {
  $$('.deal-rank-item', listEl).forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.id);
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
  });
  listEl.addEventListener('dragover', (e) => e.preventDefault());
  listEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const dragId = +e.dataTransfer.getData('text/plain');
    const target = e.target.closest('.deal-rank-item');
    if (!target || target.dataset.id === String(dragId)) return;
    const ids = $$('.deal-rank-item', listEl).map((el) => +el.dataset.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(+target.dataset.id);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setOrder(ids);
    clearResult();
    render();
  });
  $$('.deal-rank-up').forEach((btn) => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const order = getOrder();
      const idx = order.indexOf(id);
      if (idx <= 0) return;
      const arr = [...order];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      setOrder(arr);
      clearResult();
      render();
    };
  });
  $$('.deal-rank-down').forEach((btn) => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const order = getOrder();
      const idx = order.indexOf(id);
      if (idx < 0 || idx >= order.length - 1) return;
      const arr = [...order];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      setOrder(arr);
      clearResult();
      render();
    };
  });
}

function renderDealSizes() {
  if (dealSizesState.sub === 'rank') return renderDealSizesRank();
  if (dealSizesState.sub === 'values') return renderDealSizesValues();
  if (dealSizesState.sub === 'success-intro') return renderDealSizesSuccessIntro();
  if (dealSizesState.sub === 'success-rank') return renderDealSizesSuccessRank();
  return renderDealsDrillsMenu();
}

function renderDealsDrillsMenu() {
  dealSizesState.sub = 'menu';
  $(MAIN).innerHTML = `
    <h1 class="page-title">Deals</h1>
    <p class="page-sub">Exam drills on deal values and success (acquirer vs acquiree)</p>
    ${renderDealsSubNav('drills')}
    <div class="grid-2 sizes-menu-grid">
      <button type="button" class="tile" id="sizesRankBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">↕</span>
        <h4>Rank largest → smallest</h4>
        <p>Reorder all 9 deals by total acquisition value. Values hidden until you check.</p>
      </button>
      <button type="button" class="tile" id="sizesSuccessAcquirerBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">★</span>
        <h4>Success · acquirer</h4>
        <p>See best and worst for the buyer, then sort most → least successful.</p>
      </button>
      <button type="button" class="tile" id="sizesSuccessAcquireeBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">☆</span>
        <h4>Success · acquiree</h4>
        <p>Same drill from the target side (premium, exit, autonomy).</p>
      </button>
      <button type="button" class="tile" id="sizesValueBtn" role="listitem">
        <span class="tile-icon" aria-hidden="true">#</span>
        <h4>Type the value</h4>
        <p>Name shown · enter billions in the box · ±1bn counts as correct</p>
      </button>
    </div>
    ${isDealRefUnlocked() ? `
    <div class="card">
      <h3>Reference order (largest first)</h3>
      <ol class="sizes-ref-list">
        ${dealSizeCorrectOrder().map((id) => {
          const d = dealSizeById(id);
          return `<li><strong>${escHtml(d.deal)}</strong> <span class="sizes-ref-val">${escHtml(d.valueLabel)}</span></li>`;
        }).join('')}
      </ol>
    </div>` : `
    <div class="card">
      <p class="sizes-hint">Complete a rank or value drill and check your answers to unlock the value answer key here.</p>
    </div>`}
  `;
  bindDealsSubNav();
  $('#sizesRankBtn').onclick = () => {
    dealSizesState.sub = 'rank';
    resetDealSizesRank();
    renderDealSizesRank();
  };
  $('#sizesSuccessAcquirerBtn').onclick = () => {
    dealSizesState.successPerspective = 'acquirer';
    dealSizesState.sub = 'success-intro';
    renderDealSizesSuccessIntro();
  };
  $('#sizesSuccessAcquireeBtn').onclick = () => {
    dealSizesState.successPerspective = 'acquiree';
    dealSizesState.sub = 'success-intro';
    renderDealSizesSuccessIntro();
  };
  $('#sizesValueBtn').onclick = () => {
    dealSizesState.sub = 'values';
    resetDealSizesValues();
    renderDealSizesValues();
  };
}

function renderDealSizesSuccessIntro() {
  const perspective = dealSizesState.successPerspective;
  const cfg = SUCCESS_PERSPECTIVES[perspective];
  const { most, least } = getSuccessExtremes(perspective);
  $(MAIN).innerHTML = `
    <h1 class="page-title">Rank by success · ${cfg.label.toLowerCase()}</h1>
    <p class="page-sub">Course verdict for ${cfg.sublabel} · most successful at the top</p>
    <div class="card sizes-success-intro">
      <h3>Before you sort</h3>
      <p class="sizes-scale-note">Scale (high → low): <strong>Exceptional</strong> · <strong>Strong</strong> · <strong>Moderate</strong> · <strong>Mixed</strong></p>
      <div class="sizes-extreme sizes-extreme-best">
        <span class="sizes-extreme-label">Most successful</span>
        ${most.map((d) => `<p class="sizes-extreme-deal"><strong>${escHtml(d.deal)}</strong> <span class="sizes-ref-val">${escHtml(d.success)}</span></p>`).join('')}
      </div>
      <div class="sizes-extreme sizes-extreme-worst">
        <span class="sizes-extreme-label">Least successful</span>
        ${least.map((d) => `<p class="sizes-extreme-deal"><strong>${escHtml(d.deal)}</strong> <span class="sizes-ref-val">${escHtml(d.success)}</span></p>`).join('')}
      </div>
      <p class="sizes-hint">Ratings stay hidden during the sort. Study the full order below before you start.</p>
    </div>
    ${renderSuccessOrderRationale(perspective)}
    <div class="btn-row" style="margin-top:16px;margin-bottom:24px">
      <button type="button" class="btn btn-secondary" id="sizesSuccessBack">Back</button>
      <button type="button" class="btn btn-primary" id="sizesSuccessStart">Start sorting</button>
    </div>
  `;
  $('#sizesSuccessBack').onclick = () => {
    dealSizesState.sub = 'menu';
    renderDeals();
  };
  $('#sizesSuccessStart').onclick = () => {
    dealSizesState.sub = 'success-rank';
    resetDealSizesSuccessRank();
    renderDealSizesSuccessRank();
  };
}

function renderDealSizesSuccessRank() {
  const perspective = dealSizesState.successPerspective;
  const cfg = SUCCESS_PERSPECTIVES[perspective];
  const order = dealSizesState.successRankOrder;
  const result = dealSizesState.successRankResult;
  const correct = dealSuccessCorrectOrder(perspective);
  const byId = Object.fromEntries(getDealSuccessItems(perspective).map((d) => [d.id, d]));
  const expectedScores = correct.map((id) => byId[id].successScore);

  let resultHtml = '';
  if (result) {
    const perfect = result.wrongPositions.length === 0;
    resultHtml = `
      <div class="card sizes-result ${perfect ? 'sizes-result-ok' : 'sizes-result-bad'}">
        <h3>${perfect ? 'Perfect order' : `${result.correctCount} / 9 in the right success tier`}</h3>
        ${perfect ? `<p>All deals ranked correctly for the ${cfg.label.toLowerCase()}.</p>` : '<p>Red rows are in the wrong success tier. Correct order below.</p>'}
        <ol class="sizes-ref-list">
          ${correct.map((id) => {
            const d = dealSuccessById(id);
            return `<li><strong>${escHtml(d.deal)}</strong> <span class="sizes-ref-val">${escHtml(d.success)}</span></li>`;
          }).join('')}
        </ol>
      </div>`;
  }

  $(MAIN).innerHTML = `
    <h1 class="page-title">Sort by success · ${cfg.label.toLowerCase()}</h1>
    <p class="page-sub">Most successful for the ${cfg.label.toLowerCase()} at the top · drag or use arrows</p>
    <div class="card">
      <ol class="deal-rank-list" id="dealSuccessRankList">
        ${order.map((id, pos) => {
          const d = dealSuccessById(id);
          const wrong = result && result.wrongPositions.includes(pos);
          return `
          <li class="deal-rank-item${wrong ? ' deal-rank-wrong' : ''}" data-id="${id}" draggable="true">
            <span class="deal-rank-grip" aria-hidden="true">⋮⋮</span>
            <span class="deal-rank-pos">${pos + 1}</span>
            <span class="deal-rank-name">${escHtml(d.deal)}</span>
            <span class="deal-rank-actions">
              <button type="button" class="btn btn-secondary btn-sm deal-rank-up" data-id="${id}" aria-label="Move ${escHtml(d.deal)} up">↑</button>
              <button type="button" class="btn btn-secondary btn-sm deal-rank-down" data-id="${id}" aria-label="Move ${escHtml(d.deal)} down">↓</button>
            </span>
          </li>`;
        }).join('')}
      </ol>
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" id="sizesSuccessRankBack">Back</button>
        <button type="button" class="btn btn-secondary" id="sizesSuccessRankShuffle">Shuffle</button>
        <button type="button" class="btn btn-primary" id="sizesSuccessRankCheck">Check order</button>
      </div>
    </div>
    ${resultHtml}
  `;

  const list = $('#dealSuccessRankList');
  bindDealRankListHandlers({
    listEl: list,
    getOrder: () => dealSizesState.successRankOrder,
    setOrder: (ids) => { dealSizesState.successRankOrder = ids; },
    clearResult: () => { dealSizesState.successRankResult = null; },
    render: renderDealSizesSuccessRank,
  });

  $('#sizesSuccessRankBack').onclick = () => {
    dealSizesState.sub = 'success-intro';
    renderDealSizesSuccessIntro();
  };
  $('#sizesSuccessRankShuffle').onclick = () => {
    resetDealSizesSuccessRank();
    renderDealSizesSuccessRank();
  };
  $('#sizesSuccessRankCheck').onclick = () => {
    const userOrder = $$('.deal-rank-item', list).map((el) => +el.dataset.id);
    dealSizesState.successRankOrder = userOrder;
    const userScores = userOrder.map((id) => byId[id].successScore);
    const wrongPositions = userScores
      .map((s, i) => (s !== expectedScores[i] ? i : -1))
      .filter((i) => i >= 0);
    const correctCount = 9 - wrongPositions.length;
    dealSizesState.successRankResult = {
      correctCount,
      wrongPositions,
    };
    logDrillComplete({
      drill: `Success · ${SUCCESS_PERSPECTIVES[perspective].label}`,
      score: correctCount,
      total: 9,
      pct: Math.round((correctCount / 9) * 100),
      missed: wrongPositions.length,
      filterLabel: 'Deal drills',
    });
    unlockDealRef();
    renderDealSizesSuccessRank();
  };
}

function renderDealSizesRank() {
  const items = getDealSizeItems();
  const order = dealSizesState.rankOrder;
  const result = dealSizesState.rankResult;
  const correct = dealSizeCorrectOrder();

  let resultHtml = '';
  if (result) {
    const perfect = result.wrongPositions.length === 0;
    resultHtml = `
      <div class="card sizes-result ${perfect ? 'sizes-result-ok' : 'sizes-result-bad'}">
        <h3>${perfect ? 'Perfect order' : `${result.correctCount} / 9 in the right place`}</h3>
        ${perfect ? '<p>All deals ranked correctly.</p>' : `<p>Positions marked in red are wrong. Correct order below.</p>`}
        <ol class="sizes-ref-list">
          ${correct.map((id) => {
            const d = dealSizeById(id);
            return `<li><strong>${escHtml(d.deal)}</strong> <span class="sizes-ref-val">${escHtml(d.valueLabel)}</span></li>`;
          }).join('')}
        </ol>
      </div>`;
  }

  $(MAIN).innerHTML = `
    <h1 class="page-title">Rank by value</h1>
    <p class="page-sub">Drag rows or use arrows · largest at the top</p>
    <div class="card">
      <ol class="deal-rank-list" id="dealRankList">
        ${order.map((id, pos) => {
          const d = dealSizeById(id);
          const wrong = result && result.wrongPositions.includes(pos);
          return `
          <li class="deal-rank-item${wrong ? ' deal-rank-wrong' : ''}" data-id="${id}" draggable="true">
            <span class="deal-rank-grip" aria-hidden="true">⋮⋮</span>
            <span class="deal-rank-pos">${pos + 1}</span>
            <span class="deal-rank-name">${escHtml(d.deal)}</span>
            <span class="deal-rank-actions">
              <button type="button" class="btn btn-secondary btn-sm deal-rank-up" data-id="${id}" aria-label="Move ${escHtml(d.deal)} up">↑</button>
              <button type="button" class="btn btn-secondary btn-sm deal-rank-down" data-id="${id}" aria-label="Move ${escHtml(d.deal)} down">↓</button>
            </span>
          </li>`;
        }).join('')}
      </ol>
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" id="sizesRankBack">Back</button>
        <button type="button" class="btn btn-secondary" id="sizesRankShuffle">Shuffle</button>
        <button type="button" class="btn btn-primary" id="sizesRankCheck">Check order</button>
      </div>
    </div>
    ${resultHtml}
  `;

  const list = $('#dealRankList');
  bindDealRankListHandlers({
    listEl: list,
    getOrder: () => dealSizesState.rankOrder,
    setOrder: (ids) => { dealSizesState.rankOrder = ids; },
    clearResult: () => { dealSizesState.rankResult = null; },
    render: renderDealSizesRank,
  });

  $('#sizesRankBack').onclick = () => {
    dealSizesState.sub = 'menu';
    renderDeals();
  };
  $('#sizesRankShuffle').onclick = () => {
    resetDealSizesRank();
    renderDealSizesRank();
  };
  $('#sizesRankCheck').onclick = () => {
    const userOrder = $$('.deal-rank-item').map((el) => +el.dataset.id);
    dealSizesState.rankOrder = userOrder;
    const wrongPositions = userOrder
      .map((id, i) => (id !== correct[i] ? i : -1))
      .filter((i) => i >= 0);
    const correctCount = 9 - wrongPositions.length;
    dealSizesState.rankResult = {
      correctCount,
      wrongPositions,
    };
    logDrillComplete({
      drill: 'Rank by value',
      score: correctCount,
      total: 9,
      pct: Math.round((correctCount / 9) * 100),
      missed: wrongPositions.length,
      filterLabel: 'Deal drills',
    });
    renderDealSizesRank();
  };
}

function renderDealSizesValues() {
  const deck = dealSizesState.valueDeck;
  const idx = dealSizesState.valueIdx;
  const fb = dealSizesState.valueFeedback;

  if (idx >= deck.length) {
    unlockDealRef();
    const total = deck.length;
    const score = dealSizesState.valueScore;
    const pct = Math.round((score / total) * 100);
    if (!dealSizesState.valueLogged) {
      dealSizesState.valueLogged = true;
      logDrillComplete({
        drill: 'Type the value',
        score,
        total,
        pct,
        missed: total - score,
        filterLabel: 'Deal drills',
      });
    }
    $(MAIN).innerHTML = `
      <h1 class="page-title">Value drill complete</h1>
      <div class="card" style="text-align:center">
        <div style="font-size:3rem;font-weight:800;color:var(--accent)">${pct}%</div>
        <p style="color:var(--muted);margin:12px 0">${score} / ${total} within ±${DEAL_SIZE_TOLERANCE}bn</p>
        <div class="btn-row" style="justify-content:center">
          <button type="button" class="btn btn-secondary" id="sizesValBack">Back</button>
          <button type="button" class="btn btn-primary" id="sizesValRetry">Try again</button>
        </div>
      </div>
    `;
    $('#sizesValBack').onclick = () => {
      dealSizesState.sub = 'menu';
      renderDeals();
    };
    $('#sizesValRetry').onclick = () => {
      resetDealSizesValues();
      renderDealSizesValues();
    };
    return;
  }

  const id = deck[idx];
  const d = dealSizeById(id);
  const curSym = d.currency;

  let feedbackHtml = '';
  if (fb) {
    feedbackHtml = `
      <div class="sizes-value-feedback ${fb.ok ? 'sizes-result-ok' : 'sizes-result-bad'}">
        <p><strong>${fb.ok ? 'Correct' : 'Not quite'}</strong> · you entered <strong>${escHtml(String(fb.entered))}</strong> · course value: <strong>${escHtml(d.valueLabel)}</strong></p>
        ${fb.ok ? `<p class="sizes-tolerance-note">Accepted range: ${fb.lo}–${fb.hi} ${curSym}bn</p>` : `<p class="sizes-tolerance-note">±${DEAL_SIZE_TOLERANCE}bn would accept ${fb.lo}–${fb.hi} ${curSym}bn</p>`}
      </div>`;
  }

  $(MAIN).innerHTML = `
    <h1 class="page-title">Type the value</h1>
    <p class="page-sub">Deal ${idx + 1} of ${deck.length} · score ${dealSizesState.valueScore}</p>
    <div class="card sizes-value-card">
      <p class="sizes-deal-prompt">${escHtml(d.deal)}</p>
      <label class="telemetry-label" for="dealValueInput">Acquisition value (${curSym} billions)</label>
      <input type="number" id="dealValueInput" class="telemetry-input deal-value-input" inputmode="decimal" step="0.1" min="0" placeholder="00" ${fb ? 'disabled' : ''} />
      <p class="sizes-hint">Enter the number only · ±${DEAL_SIZE_TOLERANCE} billion counts as correct</p>
      ${feedbackHtml}
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" id="sizesValBack">Back</button>
        ${fb
    ? `<button type="button" class="btn btn-primary" id="sizesValNext">${idx < deck.length - 1 ? 'Next deal' : 'See results'}</button>`
    : `<button type="button" class="btn btn-primary" id="sizesValSubmit">Check</button>`}
      </div>
    </div>
  `;

  const input = $('#dealValueInput');
  if (!fb) {
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#sizesValSubmit')?.click();
    });
  }

  $('#sizesValBack').onclick = () => {
    dealSizesState.sub = 'menu';
    dealSizesState.valueFeedback = null;
    renderDeals();
  };

  $('#sizesValSubmit')?.addEventListener('click', () => {
    const raw = input.value.trim();
    if (!raw) {
      input.focus();
      return;
    }
    const entered = parseFloat(raw);
    const actual = d.valueSort;
    const lo = Math.round((actual - DEAL_SIZE_TOLERANCE) * 10) / 10;
    const hi = Math.round((actual + DEAL_SIZE_TOLERANCE) * 10) / 10;
    const ok = isDealValueCorrect(entered, actual);
    if (ok) dealSizesState.valueScore++;
    dealSizesState.valueFeedback = { ok, entered, lo, hi };
    unlockDealRef();
    renderDealSizesValues();
  });

  $('#sizesValNext')?.addEventListener('click', () => {
    dealSizesState.valueIdx++;
    dealSizesState.valueFeedback = null;
    renderDealSizesValues();
  });
}

function renderPracticeSetup() {
  const lessonChips = Object.entries(LECTURE_LABELS)
    .map(([id, label]) => `<button type="button" class="filter-chip" data-d="l${id}" aria-pressed="false">${label.replace('  -  ', ' ')}</button>`)
    .join('');
  const dealChips = Object.entries(DEAL_LABELS)
    .map(([id, label]) => `<button type="button" class="filter-chip" data-d="d${id}" aria-pressed="false">${label}</button>`)
    .join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Practice MCQ</h1>
    <p class="page-sub">${bankCount()} in bank · pick 10, 15, 20, or 40 questions per session</p>
    <div class="card">
      <fieldset class="filter-fieldset">
        <legend>Topic filter</legend>
        <div class="filter-grid" id="dealFilter" role="group">
          <button type="button" class="filter-chip selected" data-d="all" aria-pressed="true">All</button>
          <button type="button" class="filter-chip" data-d="lessons" aria-pressed="false">All lessons</button>
          <button type="button" class="filter-chip" data-d="deals" aria-pressed="false">All deals</button>
          <button type="button" class="filter-chip" data-d="cross" aria-pressed="false">Cross-topic</button>
        </div>
      </fieldset>
      <fieldset class="filter-fieldset">
        <legend>By lecture</legend>
        <div class="filter-grid" role="group">${lessonChips}</div>
      </fieldset>
      <fieldset class="filter-fieldset">
        <legend>By deal</legend>
        <div class="filter-grid" role="group">${dealChips}</div>
      </fieldset>
      <fieldset class="filter-fieldset">
        <legend>Difficulty</legend>
        <div class="filter-grid" id="diffFilter" role="group">
          <button type="button" class="filter-chip selected" data-diff="all" aria-pressed="true">All</button>
          <button type="button" class="filter-chip" data-diff="easy" aria-pressed="false">Easy</button>
          <button type="button" class="filter-chip" data-diff="medium" aria-pressed="false">Medium</button>
          <button type="button" class="filter-chip" data-diff="hard" aria-pressed="false">Hard</button>
        </div>
      </fieldset>
      <fieldset class="filter-fieldset">
        <legend>Questions per session</legend>
        <div class="filter-grid" id="lengthFilter" role="group">
          ${QUIZ_LENGTHS.map((n) => `<button type="button" class="filter-chip${n === DEFAULT_QUIZ_LENGTH ? ' selected' : ''}" data-len="${n}" aria-pressed="${n === DEFAULT_QUIZ_LENGTH}">${n} questions</button>`).join('')}
        </div>
      </fieldset>
      <button type="button" class="btn btn-primary" id="startQuizBtn" style="width:100%;margin-top:8px">Start ${DEFAULT_QUIZ_LENGTH}-question quiz</button>
    </div>
  `;

  let dealF = 'all';
  let diffF = 'all';
  let quizLen = DEFAULT_QUIZ_LENGTH;

  const updateStartBtn = () => {
    const btn = $('#startQuizBtn');
    if (btn) btn.textContent = `Start ${quizLen}-question quiz`;
  };

  $$('.card .filter-chip[data-d]').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.card .filter-chip[data-d]').forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
      dealF = chip.dataset.d;
    });
  });
  $$('#diffFilter .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('#diffFilter .filter-chip').forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
      diffF = chip.dataset.diff;
    });
  });
  $$('#lengthFilter .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('#lengthFilter .filter-chip').forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
      quizLen = +chip.dataset.len;
      updateStartBtn();
    });
  });

  $('#startQuizBtn').onclick = () => {
    let pool = [...ALL_QUESTIONS];
    if (dealF !== 'all') pool = pool.filter((q) => matchesQuizFilter(q, dealF));
    if (diffF !== 'all') pool = pool.filter((q) => q.difficulty === diffF);
    if (!pool.length) {
      alert('No questions match filters.');
      return;
    }
    const sessionSize = Math.min(quizLen, pool.length);
    quizState = {
      questions: shuffle(pool).slice(0, sessionSize),
      current: 0,
      score: 0,
      selected: null,
      answered: false,
      optionsRevealed: false,
      prep: null,
      correctIdx: null,
      wrong: [],
      answers: [],
      filters: {
        topic: dealF,
        difficulty: diffF,
        questionCount: sessionSize,
        filterLabel: filterLabel(dealF),
        difficultyLabel: diffF === 'all' ? 'All difficulties' : diffF,
        sessionLabel: `${sessionSize} questions`,
      },
    };
    renderQuizQuestion();
  };
}

function renderQuizQuestion() {
  const qs = quizState.questions;
  if (quizState.current >= qs.length) {
    renderQuizResults();
    return;
  }
  const q = qs[quizState.current];
  const prep = prepareQuestion(q);
  quizState.prep = prep;
  quizState.correctIdx = prep.correctDisplayIndex;
  quizState.selected = null;
  quizState.answered = false;
  quizState.optionsRevealed = false;

  const pct = (quizState.current / qs.length) * 100;
  const diffClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[q.difficulty];
  const dealLabel = questionLabel(q);

  $(MAIN).innerHTML = `
    <div class="quiz-header">
      <h1 class="page-title">Practice</h1>
      <div class="progress-wrap" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-meta"><span>Question ${quizState.current + 1} of ${qs.length}</span><span>Score: ${quizState.score}</span></div>
    </div>
    <div class="card">
      <div class="badges">
        <span class="badge ${diffClass}">${q.difficulty}</span>
        <span class="badge badge-s1">${dealLabel}</span>
      </div>
      <p class="q-text" id="quiz-question-text">${escHtml(q.text)}</p>
      <div class="opts-reveal-wrap" id="optsRevealWrap">
        <p class="opts-reveal-hint">Read the question first, then reveal the four options when you are ready.</p>
        <button type="button" class="btn btn-primary btn-show-answers" id="showAnswersBtn">Show possible answers</button>
      </div>
      <div class="options hidden" id="opts" role="radiogroup" aria-label="Answer choices">
        ${prep.displayOptions.map((o, i) => `
          <button type="button" class="option" data-i="${i}" role="radio" aria-checked="false">
            <span class="opt-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
            <span class="opt-text">${escHtml(o)}</span>
          </button>`).join('')}
      </div>
      <div class="explanation" id="exp" role="status"></div>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="quizBackBtn">Back to setup</button>
        <button type="button" class="btn btn-primary" id="confirmBtn" disabled>Confirm answer</button>
      </div>
      <p class="keyboard-hint" id="quizKeyHint">Press Enter or Space to show answers, then A–D to select</p>
    </div>
  `;

  $('#quizBackBtn').onclick = () => navigate('practice');

  const revealOptions = () => {
    if (quizState.optionsRevealed || quizState.answered) return;
    quizState.optionsRevealed = true;
    $('#optsRevealWrap').classList.add('hidden');
    $('#opts').classList.remove('hidden');
    $('#quizKeyHint').textContent = 'Use A–D to select, Enter to confirm';
    $('#showAnswersBtn')?.focus();
  };

  $('#showAnswersBtn').onclick = revealOptions;

  const selectOpt = (i) => {
    if (!quizState.optionsRevealed || quizState.answered) return;
    quizState.selected = i;
    $$('.option').forEach((o) => {
      const on = +o.dataset.i === i;
      o.classList.toggle('selected', on);
      o.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    $('#confirmBtn').disabled = false;
  };

  $$('.option').forEach((el) => el.addEventListener('click', () => selectOpt(+el.dataset.i)));
  $('#confirmBtn').onclick = confirmQuizAnswer;
}

function confirmQuizAnswer() {
  if (!quizState.optionsRevealed) return;
  if (quizState.selected === null || quizState.answered) return;
  quizState.answered = true;
  const q = quizState.questions[quizState.current];
  const prep = quizState.prep;
  const ok = quizState.selected === quizState.correctIdx;
  if (ok) quizState.score++;
  quizState.answers.push({
    ok,
    lecture: q.lecture || null,
    deal: q.deal ?? null,
  });
  if (!ok) {
    quizState.wrong.push({
      questionText: q.text,
      selectedText: prep.displayOptions[quizState.selected],
      correctText: prep.displayOptions[quizState.correctIdx],
      explanationDetail: q.explanationDetail || q.explanation,
      wrongWhy: explainWrongChoice(q, prep.displayOptions[quizState.selected], prep.displayOptions[quizState.correctIdx]),
      label: questionLabel(q),
      difficulty: q.difficulty,
      lecture: q.lecture || null,
      deal: q.deal ?? null,
    });
  }

  $$('.option').forEach((el) => {
    el.classList.add('disabled');
    const i = +el.dataset.i;
    if (i === quizState.correctIdx) el.classList.add('correct');
    if (i === quizState.selected && !ok) el.classList.add('incorrect');
  });

  const exp = $('#exp');
  exp.className = `explanation ${ok ? 'exp-ok' : 'exp-bad'}`;
  exp.style.display = 'block';
  exp.innerHTML = buildQuizExplanation(q, prep, quizState.selected, ok);

  const btn = $('#confirmBtn');
  btn.textContent = quizState.current < quizState.questions.length - 1 ? 'Next question' : 'View results';
  btn.disabled = false;
  btn.onclick = () => {
    quizState.current++;
    renderQuizQuestion();
  };
}

function renderQuizResults() {
  const total = quizState.questions.length;
  const pct = Math.round((quizState.score / total) * 100);
  const st = getStats();
  st.attempts++;
  if (pct > st.best) st.best = pct;
  saveStats(st);

  const wrong = quizState.wrong || [];
  const breakdown = computeBreakdown(quizState.answers || []);
  const filters = quizState.filters || { filterLabel: 'All topics', difficultyLabel: 'All difficulties', topic: 'all', difficulty: 'all' };

  saveQuizAttempt({
    id: Date.now(),
    at: new Date().toISOString(),
    score: quizState.score,
    total,
    pct,
    filterLabel: filters.filterLabel,
    difficultyLabel: filters.difficultyLabel,
    filters,
    breakdown,
    wrong,
  });

  logQuizComplete({
    score: quizState.score,
    total,
    pct,
    filterLabel: filters.sessionLabel ? `${filters.filterLabel} · ${filters.sessionLabel}` : filters.filterLabel,
    difficultyLabel: filters.difficultyLabel,
    missed: wrong.length,
  });

  const gradePred = computePredictedGrade(getQuizHistory());

  $(MAIN).innerHTML = `
    <h1 class="page-title">Results</h1>
    <div class="card" style="text-align:center">
      <div style="font-size:3rem;font-weight:800;color:var(--accent)">${pct}%</div>
      <p style="color:var(--muted);margin:12px 0">${quizState.score} / ${total} correct</p>
      <p style="font-size:0.88rem;color:var(--muted);margin-bottom:8px">${escHtml(filters.filterLabel)} · ${escHtml(filters.difficultyLabel)}${filters.sessionLabel ? ` · ${escHtml(filters.sessionLabel)}` : ''}</p>
      ${gradePred.grade != null && gradePred.confidence !== 'insufficient' ? `<div class="grade-result-line"><span style="color:var(--muted);font-size:0.88rem">Updated predicted grade:</span> ${renderGradePredictionCard(gradePred, { compact: true })}</div>` : ''}
      <p style="font-size:0.95rem;margin-bottom:20px">${pct >= 80 ? 'Strong  -  exam-ready on deal facts' : pct >= 60 ? 'Review missed questions below, then study hub' : 'Repeat weak topics via filters'}</p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-secondary" onclick="navigate('practice')">New filters</button>
        <button class="btn btn-primary" onclick="(() => { quizState.questions = shuffle(quizState.questions); quizState.current = 0; quizState.score = 0; quizState.wrong = []; quizState.answers = []; renderQuizQuestion(); })()">Retry same set</button>
        <button class="btn btn-secondary" onclick="navigate('history')">View in history</button>
      </div>
    </div>
    <div class="card">
      <h3>Score by topic</h3>
      ${renderBreakdownTable(breakdown)}
    </div>
    ${renderWrongReviewList(wrong, true)}
  `;
}

function buildFlashDeck() {
  const prog = getFlashProgress();
  return shuffle(FLASHCARDS.map((c) => ({ ...c, streak: prog[c.id] || 0 }))).sort((a, b) => a.streak - b.streak);
}

function renderFlashcards() {
  if (!flashState.deck.length) {
    flashState.deck = buildFlashDeck();
    flashState.idx = 0;
    flashState.flipped = false;
  }
  const card = flashState.deck[flashState.idx];
  if (!card) {
    flashState.deck = buildFlashDeck();
    flashState.idx = 0;
    return renderFlashcards();
  }

  const prog = getFlashProgress();
  const mastered = Object.values(prog).filter((v) => v >= 3).length;
  const dealTag = card.lecture ? LECTURE_LABELS[card.lecture] : card.deal ? DEAL_LABELS[card.deal] : 'Framework';

  $(MAIN).innerHTML = `
    <h1 class="page-title">Flashcards</h1>
    <p class="flash-stats">Card ${flashState.idx + 1} of ${flashState.deck.length} · ${dealTag} · Mastered: ${mastered}/${flashCount()}</p>
    <button type="button" class="flash-card ${flashState.flipped ? 'back' : ''}" id="flashCard">
      ${flashState.flipped ? card.back : card.front}
    </button>
    <div class="btn-row ${flashState.flipped ? '' : 'hidden'}" id="flashActions">
      <button class="btn btn-bad" id="fcAgain">Again</button>
      <button class="btn btn-ok" id="fcGood">Got it</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" id="fcReset">Reset progress</button>
      <button class="btn btn-secondary" data-go="practice">Practice MCQ</button>
    </div>
  `;

  $('#flashCard').onclick = () => {
    flashState.flipped = !flashState.flipped;
    renderFlashcards();
  };

  if (flashState.flipped) {
    $('#fcAgain').onclick = () => advanceFlash(card.id, false);
    $('#fcGood').onclick = () => advanceFlash(card.id, true);
  }
  $('#fcReset').onclick = () => {
    if (confirm('Clear all flashcard progress?')) {
      localStorage.removeItem(LS_FLASH);
      flashState.deck = [];
      flashState.idx = 0;
      renderFlashcards();
    }
  };
  $('[data-go="practice"]')?.addEventListener('click', () => navigate('practice'));
}

function advanceFlash(id, good) {
  const prog = getFlashProgress();
  prog[id] = good ? Math.min((prog[id] || 0) + 1, 5) : 0;
  saveFlashProgress(prog);
  flashState.idx++;
  flashState.flipped = false;
  if (flashState.idx >= flashState.deck.length) flashState.deck = buildFlashDeck();
  renderFlashcards();
}

document.addEventListener('keydown', (e) => {
  if (currentView !== 'practice' || !quizState.questions) return;
  if (quizState.current >= quizState.questions.length) return;
  if (quizState.answered) {
    if (e.key === 'Enter') $('#confirmBtn')?.click();
    return;
  }
  if (!quizState.optionsRevealed) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      $('#showAnswersBtn')?.click();
    }
    return;
  }
  const map = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };
  if (e.key in map) $(`.option[data-i="${map[e.key]}"]`)?.click();
  if (e.key === 'Enter' && quizState.selected !== null) $('#confirmBtn')?.click();
});

$$('.nav-btn').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.view)));

function bootApp() {
  initUpdateCheck();
  try {
    navigate('home');
  } catch (err) {
    showBootError(err);
  }
  initTelemetry();
}
