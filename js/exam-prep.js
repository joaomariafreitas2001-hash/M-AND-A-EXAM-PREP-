/* Exam prep: takeover toolkit, concept index, short-answer theory. Uses globals from app.js */
const LS_CONCEPT_FLAGS = 'madeals_concept_flags_v1';

let examPrepState = {
  sub: 'menu',
  toolkitMode: 'browse',
  tkQuizIdx: 0,
  tkQuizDeck: [],
  tkQuizScore: 0,
  tkQuizAnswered: false,
  tkDefineRevealed: false,
  saDeck: [],
  saIdx: 0,
  saRevealed: false,
  tkQuizLogged: false,
  saLogged: false,
  conceptDeck: [],
  conceptIdx: 0,
  conceptRevealed: false,
  conceptFlaggedOnly: false,
};

function getConceptFlags() {
  try {
    return JSON.parse(localStorage.getItem(LS_CONCEPT_FLAGS) || '{}');
  } catch {
    return {};
  }
}

function saveConceptFlags(flags) {
  try {
    localStorage.setItem(LS_CONCEPT_FLAGS, JSON.stringify(flags));
  } catch {
    /* ignore */
  }
}

function isConceptFlagged(id) {
  return !!getConceptFlags()[id];
}

function setConceptFlagged(id, flagged) {
  const flags = getConceptFlags();
  if (flagged) flags[id] = true;
  else delete flags[id];
  saveConceptFlags(flags);
}

function toggleConceptFlagged(id) {
  const flagged = !isConceptFlagged(id);
  setConceptFlagged(id, flagged);
  return flagged;
}

function getFlaggedConceptCount() {
  const flags = getConceptFlags();
  return CONCEPT_TERMS.filter((c) => flags[c.id]).length;
}

function startConceptReview(flaggedOnly = false) {
  const flags = getConceptFlags();
  let deck = flaggedOnly
    ? CONCEPT_TERMS.filter((c) => flags[c.id])
    : [...CONCEPT_TERMS];
  if (!deck.length) return false;
  examPrepState.conceptDeck = shuffle(deck);
  examPrepState.conceptIdx = 0;
  examPrepState.conceptRevealed = false;
  examPrepState.conceptFlaggedOnly = flaggedOnly;
  examPrepState.sub = 'concepts-review';
  return true;
}

function renderExamPrep() {
  const sub = examPrepState.sub;
  if (sub === 'toolkit') return renderTakeoverToolkit();
  if (sub === 'toolkit-quiz') return renderTakeoverToolkitQuiz();
  if (sub === 'concepts') return renderConceptIndex();
  if (sub === 'concepts-review') return renderConceptReviewSession();
  if (sub === 'concepts-review-done') return renderConceptReviewDone();
  if (sub === 'short-answer') return renderShortAnswerSession();
  if (sub === 'short-answer-done') return renderShortAnswerDone();
  renderExamPrepMenu();
}

function renderExamPrepMenu() {
  examPrepState.sub = 'menu';
  renderLectureTheory();
}

function toolkitPhaseBadge(phase) {
  const label = TAKEOVER_PHASES[phase] || phase;
  return `<span class="phase-badge phase-${phase}">${escHtml(label)}</span>`;
}

function renderTakeoverToolkit() {
  const groups = ['pre-bid', 'post-bid', 'buyer', 'regulatory'];
  const sections = groups.map((phase) => {
    const items = TAKEOVER_TERMS.filter((t) => t.phase === phase);
    if (!items.length) return '';
    return `
      <div class="toolkit-section">
        <h3>${escHtml(TAKEOVER_PHASES[phase])}</h3>
        <div class="toolkit-cards">
          ${items.map((t) => `
            <details class="toolkit-card">
              <summary><strong>${escHtml(t.term)}</strong> ${toolkitPhaseBadge(t.phase)}</summary>
              <p>${escHtml(t.definition)}</p>
              <p class="toolkit-exam-line"><strong>Exam line:</strong> ${escHtml(t.examLine)}</p>
              ${t.example ? `<p class="sizes-hint">${escHtml(t.example)}</p>` : ''}
            </details>
          `).join('')}
        </div>
      </div>`;
  }).join('');

  $(MAIN).innerHTML = `
    <h1 class="page-title">Takeover toolkit</h1>
    <p class="page-sub">${TAKEOVER_TERMS.length} terms · expand each card · full L7 syllabus</p>
    ${sections}
    <div class="btn-row" style="margin-top:20px">
      <button type="button" class="btn btn-secondary" id="epBack">Back</button>
      <button type="button" class="btn btn-primary" id="epToQuiz">Practice classify →</button>
    </div>
  `;
  $('#epBack').onclick = () => {
    examPrepState.sub = 'menu';
    renderExamPrepMenu();
  };
  $('#epToQuiz').onclick = () => {
    examPrepState.sub = 'toolkit-quiz';
    examPrepState.tkQuizDeck = shuffle([...TAKEOVER_TERMS]);
    examPrepState.tkQuizIdx = 0;
    examPrepState.tkQuizScore = 0;
    examPrepState.tkQuizAnswered = false;
    examPrepState.tkQuizLogged = false;
    renderTakeoverToolkitQuiz();
  };
}

function renderTakeoverToolkitQuiz() {
  const deck = examPrepState.tkQuizDeck;
  const idx = examPrepState.tkQuizIdx;
  if (idx >= deck.length) {
    const score = examPrepState.tkQuizScore;
    const total = deck.length;
    if (!examPrepState.tkQuizLogged) {
      examPrepState.tkQuizLogged = true;
      logDrillComplete({
        drill: 'Classify defenses',
        score,
        total,
        pct: total ? Math.round((score / total) * 100) : 0,
        missed: total - score,
        filterLabel: 'Exam prep',
      });
    }
    $(MAIN).innerHTML = `
      <h1 class="page-title">Classify complete</h1>
      <div class="card" style="text-align:center">
        <div style="font-size:2.5rem;font-weight:800;color:var(--accent)">${score} / ${total}</div>
        <p style="color:var(--muted);margin:12px 0">Phase classifications correct</p>
        <div class="btn-row" style="justify-content:center">
          <button type="button" class="btn btn-secondary" id="epBack">Back</button>
          <button type="button" class="btn btn-primary" id="epRetry">Try again</button>
        </div>
      </div>
    `;
    $('#epBack').onclick = () => {
      examPrepState.sub = 'menu';
      renderExamPrepMenu();
    };
    $('#epRetry').onclick = () => {
      examPrepState.tkQuizDeck = shuffle([...TAKEOVER_TERMS]);
      examPrepState.tkQuizIdx = 0;
      examPrepState.tkQuizScore = 0;
      examPrepState.tkQuizAnswered = false;
      examPrepState.tkQuizLogged = false;
      renderTakeoverToolkitQuiz();
    };
    return;
  }

  const item = deck[idx];
  const phases = Object.keys(TAKEOVER_PHASES);
  const feedback = examPrepState.tkQuizAnswered
    ? (examPrepState.tkLastCorrect
      ? `<p class="sizes-value-feedback sizes-result-ok">Correct — ${escHtml(TAKEOVER_PHASES[item.phase])}</p>`
      : `<p class="sizes-value-feedback sizes-result-bad">Correct: ${escHtml(TAKEOVER_PHASES[item.phase])}</p>`)
    : '';

  $(MAIN).innerHTML = `
    <h1 class="page-title">Classify the tactic</h1>
    <p class="page-sub">Question ${idx + 1} of ${deck.length} · score ${examPrepState.tkQuizScore}</p>
    <div class="card">
      <p class="sizes-deal-prompt" style="font-size:1.15rem">${escHtml(item.term)}</p>
      <p class="sizes-hint">Is this pre-bid defense, post-bid defense, buyer tactic, or rules/context?</p>
      <div class="filter-grid" style="margin-top:14px">
        ${phases.map((p) => `
          <button type="button" class="filter-chip tk-phase-btn" data-phase="${p}" ${examPrepState.tkQuizAnswered ? 'disabled' : ''}>${escHtml(TAKEOVER_PHASES[p])}</button>
        `).join('')}
      </div>
      ${feedback}
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" id="epBack">Back</button>
        ${examPrepState.tkQuizAnswered ? '<button type="button" class="btn btn-primary" id="epNext">Next</button>' : ''}
      </div>
    </div>
  `;

  $$('.tk-phase-btn').forEach((btn) => {
    btn.onclick = () => {
      if (examPrepState.tkQuizAnswered) return;
      const picked = btn.dataset.phase;
      const ok = picked === item.phase;
      examPrepState.tkQuizAnswered = true;
      examPrepState.tkLastCorrect = ok;
      if (ok) examPrepState.tkQuizScore++;
      renderTakeoverToolkitQuiz();
    };
  });
  $('#epBack').onclick = () => {
    examPrepState.sub = 'menu';
    renderExamPrepMenu();
  };
  $('#epNext')?.addEventListener('click', () => {
    examPrepState.tkQuizIdx++;
    examPrepState.tkQuizAnswered = false;
    renderTakeoverToolkitQuiz();
  });
}

function renderConceptIndex() {
  const byLecture = {};
  CONCEPT_TERMS.forEach((c) => {
    if (!byLecture[c.lecture]) byLecture[c.lecture] = [];
    byLecture[c.lecture].push(c);
  });
  const flaggedCount = getFlaggedConceptCount();

  $(MAIN).innerHTML = `
    <h1 class="page-title">Concept index</h1>
    <p class="page-sub">${CONCEPT_TERMS.length} terms · ${flaggedCount} flagged for review</p>
    <div class="card concept-review-menu">
      <h3>Review one by one</h3>
      <p class="sizes-hint">See each term, try to define it, reveal the answer, then flag anything you want to revisit.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" id="epConceptReviewAll">All terms →</button>
        <button type="button" class="btn btn-secondary" id="epConceptReviewFlagged" ${flaggedCount ? '' : 'disabled'}>Flagged only (${flaggedCount})</button>
        ${flaggedCount ? '<button type="button" class="btn btn-secondary" id="epConceptClearFlags">Clear flags</button>' : ''}
      </div>
    </div>
    ${Object.entries(byLecture).map(([lec, items]) => `
      <div class="toolkit-section">
        <h3>${escHtml(lec)}</h3>
        <div class="toolkit-cards">
          ${items.map((c) => {
            const flagged = isConceptFlagged(c.id);
            return `
            <details class="toolkit-card${flagged ? ' concept-flagged-browse' : ''}">
              <summary>
                <strong>${escHtml(c.term)}</strong>
                ${flagged ? '<span class="concept-flag-pill">Review</span>' : ''}
              </summary>
              <p>${escHtml(c.definition)}</p>
              <p class="toolkit-exam-line"><strong>Exam line:</strong> ${escHtml(c.examLine)}</p>
            </details>`;
          }).join('')}
        </div>
      </div>
    `).join('')}
    <div class="btn-row" style="margin-top:20px">
      <button type="button" class="btn btn-secondary" id="epBack">Back</button>
      <button type="button" class="btn btn-primary" id="epToSA">Short-answer drill →</button>
    </div>
  `;
  $('#epConceptReviewAll').onclick = () => {
    if (startConceptReview(false)) renderConceptReviewSession();
  };
  $('#epConceptReviewFlagged')?.addEventListener('click', () => {
    if (startConceptReview(true)) renderConceptReviewSession();
  });
  $('#epConceptClearFlags')?.addEventListener('click', () => {
    if (confirm('Clear all flagged concepts?')) {
      saveConceptFlags({});
      renderConceptIndex();
    }
  });
  $('#epBack').onclick = () => {
    examPrepState.sub = 'menu';
    renderExamPrepMenu();
  };
  $('#epToSA').onclick = () => {
    const pool = shuffle([...SHORT_ANSWER_QUESTIONS]);
    examPrepState.saDeck = pool.slice(0, SHORT_ANSWER_SESSION_SIZE);
    examPrepState.saIdx = 0;
    examPrepState.saRevealed = false;
    examPrepState.saLogged = false;
    examPrepState.sub = 'short-answer';
    renderShortAnswerSession();
  };
}

function renderConceptReviewSession() {
  const deck = examPrepState.conceptDeck;
  const idx = examPrepState.conceptIdx;
  if (idx >= deck.length) {
    examPrepState.sub = 'concepts-review-done';
    return renderConceptReviewDone();
  }

  const c = deck[idx];
  const revealed = examPrepState.conceptRevealed;
  const flagged = isConceptFlagged(c.id);

  $(MAIN).innerHTML = `
    <h1 class="page-title">Concept review</h1>
    <p class="page-sub">Card ${idx + 1} of ${deck.length} · <span class="phase-badge phase-regulatory">${escHtml(c.lecture)}</span></p>
    <div class="card concept-review-card">
      <p class="concept-review-prompt">${escHtml(c.term)}</p>
      ${!revealed
    ? '<p class="sizes-hint">Try to define this in your head, then reveal the answer.</p>'
    : `
        <div class="concept-review-answer">
          <p>${escHtml(c.definition)}</p>
          <p class="toolkit-exam-line"><strong>Exam line:</strong> ${escHtml(c.examLine)}</p>
        </div>
      `}
      <button type="button" class="btn concept-flag-btn${flagged ? ' concept-flag-btn-on' : ''}" id="epConceptFlag" aria-pressed="${flagged}">
        ${flagged ? '★ Flagged for review' : '☆ Flag for later review'}
      </button>
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" id="epBack">Exit</button>
        ${idx > 0 ? '<button type="button" class="btn btn-secondary" id="epConceptPrev">Previous</button>' : ''}
        ${revealed
    ? `<button type="button" class="btn btn-primary" id="epConceptNext">${idx < deck.length - 1 ? 'Next' : 'Finish'}</button>`
    : '<button type="button" class="btn btn-primary" id="epConceptReveal">Show answer</button>'}
      </div>
    </div>
  `;

  $('#epConceptFlag').onclick = () => {
    toggleConceptFlagged(c.id);
    renderConceptReviewSession();
  };
  $('#epBack').onclick = () => {
    examPrepState.sub = 'concepts';
    renderConceptIndex();
  };
  $('#epConceptPrev')?.addEventListener('click', () => {
    examPrepState.conceptIdx--;
    examPrepState.conceptRevealed = false;
    renderConceptReviewSession();
  });
  $('#epConceptReveal')?.addEventListener('click', () => {
    examPrepState.conceptRevealed = true;
    renderConceptReviewSession();
  });
  $('#epConceptNext')?.addEventListener('click', () => {
    examPrepState.conceptIdx++;
    examPrepState.conceptRevealed = false;
    renderConceptReviewSession();
  });
}

function renderConceptReviewDone() {
  const flaggedCount = getFlaggedConceptCount();
  $(MAIN).innerHTML = `
    <h1 class="page-title">Review complete</h1>
    <div class="card" style="text-align:center">
      <p style="font-size:1.1rem;margin-bottom:12px">You went through <strong>${examPrepState.conceptDeck.length}</strong> concept${examPrepState.conceptDeck.length === 1 ? '' : 's'}.</p>
      <p class="sizes-hint">${flaggedCount} flagged for later review (saved in this browser).</p>
      <div class="btn-row" style="justify-content:center;margin-top:20px">
        <button type="button" class="btn btn-secondary" id="epBack">Concept index</button>
        ${flaggedCount ? '<button type="button" class="btn btn-primary" id="epConceptReviewFlagged">Review flagged only</button>' : ''}
        <button type="button" class="btn btn-secondary" id="epConceptRetry">Run again (shuffle)</button>
      </div>
    </div>
  `;
  $('#epBack').onclick = () => {
    examPrepState.sub = 'concepts';
    renderConceptIndex();
  };
  $('#epConceptReviewFlagged')?.addEventListener('click', () => {
    if (startConceptReview(true)) renderConceptReviewSession();
  });
  $('#epConceptRetry')?.addEventListener('click', () => {
    const flaggedOnly = examPrepState.conceptFlaggedOnly && getFlaggedConceptCount() > 0;
    if (startConceptReview(flaggedOnly)) renderConceptReviewSession();
  });
}

function renderShortAnswerSession() {
  const deck = examPrepState.saDeck;
  const idx = examPrepState.saIdx;
  if (idx >= deck.length) {
    if (!examPrepState.saLogged) {
      examPrepState.saLogged = true;
      logDrillComplete({
        drill: 'Short answers',
        total: deck.length,
        filterLabel: 'Exam prep',
      });
    }
    examPrepState.sub = 'short-answer-done';
    return renderShortAnswerDone();
  }

  const q = deck[idx];
  const revealed = examPrepState.saRevealed;

  $(MAIN).innerHTML = `
    <h1 class="page-title">Short answers</h1>
    <p class="page-sub">Question ${idx + 1} of ${deck.length} · <span class="phase-badge phase-regulatory">${escHtml(q.topic)}</span></p>
    <div class="card">
      <p class="sa-prompt">${escHtml(q.prompt)}</p>
      <p class="sizes-hint">Write 2–3 lines in the box, then reveal the model answer and compare.</p>
      <label class="telemetry-label" for="saInput">Your answer</label>
      <textarea id="saInput" class="sa-textarea" rows="5" placeholder="Type your answer here…" ${revealed ? 'disabled' : ''}></textarea>
      ${revealed ? `
        <div class="sa-model card sizes-result-ok" style="margin-top:16px">
          <h4>Model answer</h4>
          <p>${escHtml(q.modelAnswer)}</p>
          <h4 style="margin-top:12px;font-size:0.9rem">Marking rubric</h4>
          <ul class="trap-list">${q.rubric.map((r) => `<li>${escHtml(r)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" id="epBack">Exit</button>
        ${revealed
    ? `<button type="button" class="btn btn-primary" id="epNext">${idx < deck.length - 1 ? 'Next question' : 'Finish'}</button>`
    : '<button type="button" class="btn btn-primary" id="epReveal">Show model answer</button>'}
      </div>
    </div>
  `;

  $('#epBack').onclick = () => {
    examPrepState.sub = 'menu';
    renderExamPrepMenu();
  };
  $('#epReveal')?.addEventListener('click', () => {
    examPrepState.saRevealed = true;
    renderShortAnswerSession();
  });
  $('#epNext')?.addEventListener('click', () => {
    examPrepState.saIdx++;
    examPrepState.saRevealed = false;
    renderShortAnswerSession();
  });
}

function renderShortAnswerDone() {
  $(MAIN).innerHTML = `
    <h1 class="page-title">Session complete</h1>
    <div class="card" style="text-align:center">
      <p style="font-size:1.1rem;margin-bottom:12px">You worked through <strong>${examPrepState.saDeck.length}</strong> short-answer questions.</p>
      <p class="sizes-hint">Self-grade against each model answer. Repeat until you can write each rubric from memory.</p>
      <div class="btn-row" style="justify-content:center;margin-top:20px">
        <button type="button" class="btn btn-secondary" id="epBack">Back</button>
        <button type="button" class="btn btn-primary" id="epRetry">New ${SHORT_ANSWER_SESSION_SIZE} questions</button>
      </div>
    </div>
  `;
  $('#epBack').onclick = () => {
    examPrepState.sub = 'menu';
    renderExamPrepMenu();
  };
  $('#epRetry').onclick = () => {
    const pool = shuffle([...SHORT_ANSWER_QUESTIONS]);
    examPrepState.saDeck = pool.slice(0, SHORT_ANSWER_SESSION_SIZE);
    examPrepState.saIdx = 0;
    examPrepState.saRevealed = false;
    examPrepState.saLogged = false;
    examPrepState.sub = 'short-answer';
    renderShortAnswerSession();
  };
}
