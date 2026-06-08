/* M&A — Deals Learn */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let currentView = 'home';
let quizState = {};
let flashState = { deck: [], idx: 0, flipped: false };
const LS_FLASH = 'madeals_flash_v1';
const LS_STATS = 'madeals_quiz_stats_v1';
const MAIN = '#main-content';

const PAGE_TITLES = {
  home: 'Home',
  study: 'Study hub',
  compare: 'Compare deals',
  practice: 'Practice MCQ',
  flashcards: 'Flashcards',
};

function focusMain() {
  const el = $(MAIN);
  if (el) el.focus({ preventScroll: false });
}

function announcePage(view) {
  document.title = `${PAGE_TITLES[view] || 'Deals'} — M&A Deals Learn`;
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

function navigate(view) {
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
    study: renderStudy,
    compare: renderCompare,
    practice: renderPracticeSetup,
    flashcards: renderFlashcards,
  };
  (renderers[view] || renderHome)();
  focusMain();
}

function renderHome() {
  const st = getStats();
  const fp = getFlashProgress();
  const mastered = Object.values(fp).filter((v) => v >= 3).length;
  $(MAIN).innerHTML = `
    <h1 class="page-title">M&A Deals Learn</h1>
    <p class="page-sub">9 case deals for your ESADE M&A exam — sector context, structure, synergies, and post-merger outcomes</p>
    <div class="grid-2" role="list">
      <button type="button" class="tile" data-go="study" role="listitem"><span class="tile-icon" aria-hidden="true">📖</span><h4>Study hub</h4><p>All 9 deals — expandable notes & exam traps</p></button>
      <button type="button" class="tile" data-go="compare" role="listitem"><span class="tile-icon" aria-hidden="true">⊞</span><h4>Compare</h4><p>Side-by-side matrix — value, type, motive</p></button>
      <button type="button" class="tile" data-go="practice" role="listitem"><span class="tile-icon" aria-hidden="true">✓</span><h4>Practice MCQ</h4><p>${ALL_QUESTIONS.length} questions · filter by deal</p></button>
      <button type="button" class="tile" data-go="flashcards" role="listitem"><span class="tile-icon" aria-hidden="true">🃏</span><h4>Flashcards</h4><p>${FLASHCARDS.length} cards · spaced repeat</p></button>
    </div>
    <div class="card">
      <h3>Your progress (this browser)</h3>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:8px">
        Quiz attempts: <strong>${st.attempts}</strong> · Best score: <strong>${st.best}%</strong><br>
        Flashcards mastered (3+ streak): <strong>${mastered}</strong> / ${FLASHCARDS.length}
      </p>
      <div class="btn-row">
        <button class="btn btn-primary" data-go="practice">Start practice →</button>
        <button class="btn btn-secondary" data-go="flashcards">Review flashcards</button>
      </div>
    </div>
    <div class="card">
      <h3>Exam-night checklist</h3>
      <ul class="trap-list">
        <li>Scale vs scope — which motive fits each deal?</li>
        <li>Cash vs stock — why did the target accept that structure?</li>
        <li>Know deal value, year, premium, and close date for each</li>
        <li>Hard vs soft synergies — what was promised vs delivered?</li>
        <li>One post-merger failure and one success story each</li>
      </ul>
    </div>
    <div class="card">
      <h3>Deal index</h3>
      <ol style="font-size:0.92rem;color:var(--text-body);line-height:1.8;padding-left:20px">
        ${STUDY_DEALS.map((d) => `<li><button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:0.82rem" data-deal="${d.id}">${d.title}</button> — ${d.value} (${d.year})</li>`).join('')}
      </ol>
    </div>
  `;
  $$('[data-go]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.go)));
  $$('[data-deal]').forEach((el) => el.addEventListener('click', () => {
    navigate('study');
    setTimeout(() => {
      const det = document.querySelector(`[data-deal-id="${el.dataset.deal}"]`);
      if (det) {
        det.open = true;
        det.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }));
}

function renderStudy() {
  const dealsHtml = STUDY_DEALS.map(
    (d) => `
    <details class="study-session" data-deal-id="${d.id}">
      <summary>${d.id}. ${d.title} <span style="font-weight:400;color:var(--muted);font-size:0.85rem">— ${d.value}</span></summary>
      <div class="study-body">
        <div class="deal-meta">
          <span class="deal-badge">${d.year}</span>
          <span class="deal-badge">${d.dealType}</span>
          <span class="deal-badge">${d.consideration}</span>
          <span class="deal-badge">Premium: ${d.premium}</span>
          <span class="deal-badge">${d.sector}</span>
        </div>
        <p>${d.summary}</p>
        ${d.sections.map((sec) => `<h4>${sec.h}</h4>${sec.html}`).join('')}
        <h4>Exam traps</h4>
        <ul class="trap-list">${d.traps.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
    </details>`
  ).join('');

  const formulaHtml = EXAM_FRAMEWORK.map(
    (f) => `<div class="formula-row"><span>${f.topic}</span><code>${f.formula}</code></div>`
  ).join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Study hub</h1>
    <p class="page-sub">Condensed from your 9 deal case presentations — expand each for full exam notes</p>
    ${dealsHtml}
    <div class="card" style="margin-top:20px">
      <h3>Exam frameworks</h3>
      <div class="formula-grid">${formulaHtml}</div>
    </div>
  `;
}

function renderCompare() {
  const rows = COMPARE_ROWS.map(
    (r) => `<tr>
      <td><strong>${r.deal}</strong></td>
      <td>${r.year}</td>
      <td>${r.value}</td>
      <td>${r.type}</td>
      <td>${r.pay}</td>
      <td>${r.premium}</td>
      <td>${r.motive}</td>
      <td>${r.outcome}</td>
    </tr>`
  ).join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Compare deals</h1>
    <p class="page-sub">Quick reference — scroll horizontally on mobile</p>
    <div class="card" style="overflow-x:auto">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Deal</th><th>Year</th><th>Value</th><th>Type</th><th>Payment</th><th>Premium</th><th>Motive</th><th>Outcome</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="card">
      <h3>Scale vs scope — quick sort</h3>
      <table class="compare-table">
        <tr><th>Scale (cost / same industry)</th><td>CaixaBank–Bankia, Marriott–Starwood, Kraft–Cadbury (partly)</td></tr>
        <tr><th>Scope (capabilities / new markets)</th><td>Microsoft–LinkedIn, Amazon–WFM, Instagram, Disney–Fox, LVMH–Tiffany</td></tr>
        <tr><th>Reverse / family saga</th><td>VW–Porsche</td></tr>
      </table>
    </div>
    <div class="card">
      <h3>All-cash deals</h3>
      <p>Microsoft–LinkedIn · Amazon–Whole Foods · LVMH–Tiffany — certainty, no exchange-ratio risk, often when target stock depressed or bidder has liquidity/debt access.</p>
    </div>
  `;
}

function renderPracticeSetup() {
  const dealChips = Object.entries(DEAL_LABELS)
    .map(([id, label]) => `<button type="button" class="filter-chip" data-d="${id}" aria-pressed="false">${label}</button>`)
    .join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Practice MCQ</h1>
    <p class="page-sub">${ALL_QUESTIONS.length} questions · deal facts, structure, and comparisons</p>
    <div class="card">
      <fieldset class="filter-fieldset">
        <legend>Deal filter</legend>
        <div class="filter-grid" id="dealFilter" role="group">
          <button type="button" class="filter-chip selected" data-d="all" aria-pressed="true">All deals</button>
          ${dealChips}
          <button type="button" class="filter-chip" data-d="0" aria-pressed="false">Cross-deal</button>
        </div>
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
      <button type="button" class="btn btn-primary" id="startQuizBtn" style="width:100%;margin-top:8px">Start quiz</button>
    </div>
  `;

  let dealF = 'all';
  let diffF = 'all';

  const bindFilter = (id, key) => {
    $$(`#${id} .filter-chip`).forEach((chip) => {
      chip.addEventListener('click', () => {
        $$(`#${id} .filter-chip`).forEach((c) => {
          c.classList.remove('selected');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('selected');
        chip.setAttribute('aria-pressed', 'true');
        if (key === 'd') dealF = chip.dataset.d;
        else diffF = chip.dataset.diff;
      });
    });
  };
  bindFilter('dealFilter', 'd');
  bindFilter('diffFilter', 'diff');

  $('#startQuizBtn').onclick = () => {
    let pool = [...ALL_QUESTIONS];
    if (dealF !== 'all') pool = pool.filter((q) => q.deal === +dealF);
    if (diffF !== 'all') pool = pool.filter((q) => q.difficulty === diffF);
    if (!pool.length) {
      alert('No questions match filters.');
      return;
    }
    quizState = {
      questions: shuffle(pool),
      current: 0,
      score: 0,
      selected: null,
      answered: false,
      prep: null,
      correctIdx: null,
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

  const pct = (quizState.current / qs.length) * 100;
  const diffClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[q.difficulty];
  const dealLabel = q.deal ? DEAL_LABELS[q.deal] || 'Cross-deal' : 'Cross-deal';

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
      <p class="q-text" id="quiz-question-text">${q.text}</p>
      <div class="options" id="opts" role="radiogroup">
        ${prep.displayOptions.map((o, i) => `
          <button type="button" class="option" data-i="${i}" role="radio" aria-checked="false">
            <span class="opt-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
            <span class="opt-text">${o}</span>
          </button>`).join('')}
      </div>
      <div class="explanation" id="exp" role="status"></div>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="quizBackBtn">Back to setup</button>
        <button type="button" class="btn btn-primary" id="confirmBtn" disabled>Confirm answer</button>
      </div>
      <p class="keyboard-hint">Use A–D to select, Enter to confirm</p>
    </div>
  `;

  $('#quizBackBtn').onclick = () => navigate('practice');

  const selectOpt = (i) => {
    if (quizState.answered) return;
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
  if (quizState.selected === null || quizState.answered) return;
  quizState.answered = true;
  const q = quizState.questions[quizState.current];
  const ok = quizState.selected === quizState.correctIdx;
  if (ok) quizState.score++;

  $$('.option').forEach((el) => {
    el.classList.add('disabled');
    const i = +el.dataset.i;
    if (i === quizState.correctIdx) el.classList.add('correct');
    if (i === quizState.selected && !ok) el.classList.add('incorrect');
  });

  const exp = $('#exp');
  exp.className = `explanation ${ok ? 'exp-ok' : 'exp-bad'}`;
  exp.style.display = 'block';
  exp.innerHTML = `<strong>${ok ? 'Correct.' : 'Incorrect.'}</strong> ${q.explanation}`;

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

  $(MAIN).innerHTML = `
    <h1 class="page-title">Results</h1>
    <div class="card" style="text-align:center">
      <div style="font-size:3rem;font-weight:800;color:var(--accent)">${pct}%</div>
      <p style="color:var(--muted);margin:12px 0">${quizState.score} / ${total} correct</p>
      <p style="font-size:0.95rem;margin-bottom:20px">${pct >= 80 ? 'Strong — exam-ready on deal facts' : pct >= 60 ? 'Review explanations and study hub' : 'Repeat weak deals via filters'}</p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-secondary" onclick="navigate('practice')">New filters</button>
        <button class="btn btn-primary" onclick="(() => { quizState.questions = shuffle(quizState.questions); quizState.current = 0; quizState.score = 0; renderQuizQuestion(); })()">Retry same set</button>
        <button class="btn btn-secondary" onclick="navigate('flashcards')">Flashcards</button>
      </div>
    </div>
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
  const dealTag = card.deal ? DEAL_LABELS[card.deal] || '' : 'Framework';

  $(MAIN).innerHTML = `
    <h1 class="page-title">Flashcards</h1>
    <p class="flash-stats">Card ${flashState.idx + 1} of ${flashState.deck.length} · ${dealTag} · Mastered: ${mastered}/${FLASHCARDS.length}</p>
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
  if (quizState.answered) {
    if (e.key === 'Enter') $('#confirmBtn')?.click();
    return;
  }
  const map = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };
  if (e.key in map) $(`.option[data-i="${map[e.key]}"]`)?.click();
  if (e.key === 'Enter') $('#confirmBtn')?.click();
});

$$('.nav-btn').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.view)));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => navigate('home'));
} else {
  navigate('home');
}
