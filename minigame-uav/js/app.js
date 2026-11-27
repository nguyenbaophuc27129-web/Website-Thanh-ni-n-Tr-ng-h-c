/* ============================================================
   WORKSHOP UAV 2026 — LOGIC WEBSITE MINIGAME
   ============================================================ */

'use strict';

/* ---------- Khởi tạo database (Supabase) ---------- */
let db = null;       // Supabase client
let demoMode = true; // true = chưa kết nối DB -> lưu localStorage

if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase) {
  try {
    db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    demoMode = false;
  } catch (e) {
    console.error('Lỗi kết nối Supabase:', e);
  }
}

/* ---------- Bộ câu hỏi từ database (ưu tiên) ---------- */
// Ban Tổ chức nhập câu hỏi ở trang Quản trị -> lưu bảng quiz_questions.
// Nếu bảng rỗng hoặc chưa nối DB thì dùng bộ câu mẫu trong js/questions.js.
let DB_QUESTIONS = null;
(async function preloadQuizQuestions() {
  if (!db) return;
  try {
    const { data, error } = await db.from('quiz_questions')
      .select('q, a1, a2, a3, a4, c')
      .order('created_at', { ascending: true });
    if (!error && data && data.length) {
      DB_QUESTIONS = data.map((row) => ({
        q: row.q,
        a: [row.a1, row.a2, row.a3, row.a4].filter((a) => a != null && String(a).trim() !== ''),
        c: row.c,
      }));
    }
  } catch (e) { console.error(e); }
})();

/* ---------- Tiện ích ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let toastTimer = null;
function showToast(message, type = '') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 3200);
}

/* ---------- Điền thông tin sự kiện vào trang ---------- */
function fillEventInfo() {
  $$('[data-event]').forEach((el) => {
    const key = el.getAttribute('data-event');
    if (CONFIG.EVENT[key]) el.textContent = CONFIG.EVENT[key];
  });
  $$('[data-quiz]').forEach((el) => {
    const key = el.getAttribute('data-quiz');
    if (CONFIG.QUIZ[key] !== undefined) el.textContent = CONFIG.QUIZ[key];
  });
  $('#lbRefreshInfo').textContent = CONFIG.REFRESH_LEADERBOARD_SEC;
}

/* ---------- Điều hướng giữa các trang (hash router) ---------- */
const VIEWS = ['home', 'minigame', 'leaderboard', 'ask'];

function navigate() {
  const hash = (location.hash || '#home').replace('#', '');
  const view = VIEWS.includes(hash) ? hash : 'home';

  VIEWS.forEach((v) => {
    const el = $('#view-' + v);
    if (el) el.hidden = v !== view;
  });

  $$('.nav-links a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + view);
  });

  // Đóng menu mobile + cuộn lên đầu
  $('#navToggle').classList.remove('open');
  $('#navLinks').classList.remove('open');
  window.scrollTo(0, 0);

  if (view === 'leaderboard') loadLeaderboard();
}

$('#navToggle').addEventListener('click', () => {
  $('#navToggle').classList.toggle('open');
  $('#navLinks').classList.toggle('open');
});

window.addEventListener('hashchange', navigate);

/* ---------- Hiệu ứng reveal khi cuộn ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

function watchReveals() {
  $$('.reveal').forEach((el) => revealObserver.observe(el));
}

/* ============================================================
   MINIGAME
   ============================================================ */
const KEY_NAMES = ['A', 'B', 'C', 'D'];

const quiz = {
  player: null,      // { name, school, phone }
  list: [],          // câu hỏi đã xáo trộn
  index: 0,
  score: 0,
  correct: 0,
  duration: 0,       // tổng giây đã dùng
  questionStart: 0,
  timerId: null,
  timeLeft: 0,
  locked: false,
};

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

/* ----- Luật chơi -> Đăng ký ----- */
$('#btnStartQuiz').addEventListener('click', () => {
  showQuizScreen('quizRegister');
  const saved = localStorage.getItem('uav_player');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      $('#regName').value = p.name || '';
      $('#regSchool').value = p.school || '';
      $('#regPhone').value = p.phone || '';
    } catch (_) { /* bỏ qua */ }
  }
});

$('#btnRegisterBack').addEventListener('click', () => showQuizScreen('quizIntro'));

function showQuizScreen(id) {
  ['quizIntro', 'quizRegister', 'quizPlay', 'quizResult'].forEach((s) => {
    $('#' + s).hidden = s !== id;
  });
  window.scrollTo({ top: 0 });
}

/* ----- Đăng ký ----- */
$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#regName').value.trim();
  const school = $('#regSchool').value.trim();
  const phone = $('#regPhone').value.trim();
  const err = $('#registerError');

  if (name.length < 2) return showError(err, 'Vui lòng nhập họ tên đầy đủ.');
  if (school.length < 2) return showError(err, 'Vui lòng nhập tên trường.');
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 9 || digits.length > 15) {
    return showError(err, 'Vui lòng nhập số điện thoại hợp lệ (9–15 số) — mỗi người chỉ được thi 1 lần.');
  }

  err.hidden = true;
  const phoneKey = digits.slice(-9); // 9 số cuối = định danh, 084/+84 đều khớp
  quiz.player = { name, school, phone };
  localStorage.setItem('uav_player', JSON.stringify(quiz.player));

  // Ghi danh vào database — bộ đếm live cho Ban Tổ chức (như Kahoot)
  // Trùng SĐT thì KHÔNG thêm lần nữa (bộ đếm không phình) nhưng vẫn cho vào thi,
  // lớp chặn "mỗi người 1 kết quả" nằm ở bước LƯU KẾT QUẢ phía database.
  if (!demoMode) {
    try {
      const { data: regs } = await db.from('registrations').select('phone');
      const dup = (regs || []).some((r) => String(r.phone || '').replace(/[^0-9]/g, '').slice(-9) === phoneKey);
      if (!dup) {
        db.from('registrations').insert({ name, school, phone }).then(({ error }) => {
          if (error) console.error('Ghi danh lỗi:', error);
        });
      }
    } catch (_) { /* lỗi mạng: vẫn cho thi, database sẽ tự chặn trùng */ }
  } else {
    try {
      const used = JSON.parse(localStorage.getItem('uav_demo_used') || '[]');
      if (!used.includes(phoneKey)) {
        used.push(phoneKey);
        localStorage.setItem('uav_demo_used', JSON.stringify(used));
        const n = (parseInt(localStorage.getItem('uav_demo_regs') || '0', 10) || 0) + 1;
        localStorage.setItem('uav_demo_regs', String(n));
      }
    } catch (_) { /* bỏ qua */ }
  }

  startQuiz();
});

function showError(el, msg) {
  el.textContent = '⚠️ ' + msg;
  el.hidden = false;
}

/* ----- Bắt đầu chơi ----- */
function startQuiz() {
  const source = DB_QUESTIONS || QUESTIONS;
  let list = source.map((item, originalIndex) => {
    let answers = item.a.map((text, idx) => ({ text, correct: idx === item.c }));
    if (CONFIG.QUIZ.SHUFFLE_ANSWERS) answers = shuffle(answers);
    return { q: item.q, answers, originalIndex };
  });
  if (CONFIG.QUIZ.SHUFFLE_QUESTIONS) list = shuffle(list);

  quiz.list = list;
  quiz.index = 0;
  quiz.score = 0;
  quiz.correct = 0;
  quiz.duration = 0;

  $('#quizPlayerName').textContent = '👤 ' + quiz.player.name;
  buildRunner();
  showQuizScreen('quizPlay');
  renderQuestion();
}

/* ============================================================
   ĐƯỜNG ĐUA 3D — camera sau lưng drone kiểu Subway Surfers
   ============================================================ */
const OBSTACLE_ICONS = ['☁️', '🎈', '🌩️', '🪁', '⛰️', '🌉', '🛰️'];
const AMBIENT_LANES = [22, 78];  // 2 làn biên cho vật cản nền trôi qua
const AMBIENT_ICONS = ['☁️', '🎈', '⛰️', '🛰️'];
let ambientBuilt = false;

function buildRunner() {
  $('#runnerObstacles').innerHTML = '';
  if (!ambientBuilt) {
    for (let i = 0; i < 3; i++) spawnAmbient(i);
    ambientBuilt = true;
  }
  setGateProgress(0);
}

// Vật cản nền: trôi vĩnh viễn ở 2 làn biên, không bao giờ trúng drone
function spawnAmbient(i) {
  const ob = document.createElement('span');
  ob.className = 'r3d-obstacle ambient';
  ob.textContent = AMBIENT_ICONS[i % AMBIENT_ICONS.length];
  ob.style.left = AMBIENT_LANES[i % AMBIENT_LANES.length] + '%';
  ob.style.setProperty('--dur', (4.4 + i * 1.3).toFixed(2) + 's');
  ob.style.setProperty('--delay', (-i * 1.9).toFixed(2) + 's');
  $('#runnerObstacles').appendChild(ob);
}

// Cổng về đích ở chân trời: to dần theo tiến độ trả lời đúng
function setGateProgress(correct) {
  const n = quiz.list.length;
  const p = n ? correct / n : 0;
  $('#r3dGate').style.transform = `translate(-50%, -84%) scale(${(0.55 + p * 1.05).toFixed(3)})`;
}

function spawnApproachObstacle() {
  const ob = document.createElement('span');
  ob.className = 'r3d-obstacle approach';
  ob.textContent = OBSTACLE_ICONS[Math.floor(Math.random() * OBSTACLE_ICONS.length)];
  ob.style.left = '50%';
  $('#runnerObstacles').appendChild(ob);
  return ob;
}

// Phản ứng đường đua khi trả lời: đúng = drone đâm xuyên vật cản, sai = tông trúng
function runnerFly(correct, gained = 0) {
  const drone = $('#runnerDrone');
  const world = $('#runnerWorld');
  drone.classList.remove('happy', 'crash');
  world.classList.remove('shake');
  void drone.offsetWidth;

  const ob = spawnApproachObstacle();
  ob.addEventListener('animationend', () => {
    if (correct) {
      ob.classList.add('smash');
      ob.addEventListener('animationend', () => ob.remove(), { once: true });
      void drone.offsetWidth;
      drone.classList.add('happy');
      flashWorld(false);
      spawnSparks();
      spawnFloatScore(gained);
      setGateProgress(quiz.correct);
    } else {
      ob.remove();
      drone.classList.add('crash');
      world.classList.add('shake');
      flashWorld(true);
    }
  }, { once: true });
}

function flashWorld(bad) {
  const f = $('#r3dFlash');
  f.classList.remove('on', 'bad');
  if (bad) f.classList.add('bad');
  void f.offsetWidth;
  f.classList.add('on');
}

function spawnSparks() {
  const holder = $('#runnerSparks');
  const icons = ['✨', '⭐', '💫'];
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = icons[i % icons.length];
    s.style.setProperty('--sx', (Math.random() * 90 - 45).toFixed(0) + 'px');
    s.style.left = (20 + Math.random() * 60) + '%';
    s.style.top = (10 + Math.random() * 40) + '%';
    s.style.animationDelay = (Math.random() * 0.18) + 's';
    s.addEventListener('animationend', () => s.remove());
    holder.appendChild(s);
  }
}

function spawnFloatScore(gained) {
  if (!gained) return;
  const s = document.createElement('span');
  s.className = 'float-score';
  s.textContent = '+' + gained;
  s.addEventListener('animationend', () => s.remove());
  $('#runnerDrone').appendChild(s);
}

/* ----- Hiển thị câu hỏi ----- */
function renderQuestion() {
  const item = quiz.list[quiz.index];
  quiz.locked = false;

  // Drone trở lại trạng thái bình thường cho câu mới
  $('#runnerDrone').classList.remove('happy', 'crash');
  $('#runnerWorld').classList.remove('shake');

  $('#quizQuestionNo').textContent = `Câu ${quiz.index + 1}/${quiz.list.length}`;
  $('#quizMiniFill').style.width = (quiz.index / quiz.list.length * 100) + '%';
  $('#quizScore').textContent = quiz.score;
  $('#quizQuestion').textContent = item.q;

  const box = $('#quizAnswers');
  box.innerHTML = '';
  item.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer';
    btn.innerHTML = `<span class="answer-key">${KEY_NAMES[i]}</span><span>${escapeHTML(ans.text)}</span>`;
    btn.addEventListener('click', () => answer(ans.correct, btn));
    box.appendChild(btn);
  });

  startTimer();
}

/* ----- Đồng hồ đếm ngược ----- */
function startTimer() {
  stopTimer();
  quiz.timeLeft = CONFIG.QUIZ.TIME_PER_QUESTION;
  quiz.questionStart = Date.now();

  const ring = $('#timerCircle');
  const C = 163.36; // chu vi vòng tròn r=26
  const number = $('#timerNumber');
  const ringBox = document.querySelector('.timer-ring');

  const paint = () => {
    number.textContent = quiz.timeLeft;
    ring.style.strokeDashoffset = C * (1 - quiz.timeLeft / CONFIG.QUIZ.TIME_PER_QUESTION);
    const danger = quiz.timeLeft <= 5;
    ringBox.classList.toggle('danger', danger);
    $('#quizTimerText').textContent = quiz.timeLeft + 's';
    $('#quizTimerText').classList.toggle('danger', danger);
  };

  paint();
  quiz.timerId = setInterval(() => {
    quiz.timeLeft--;
    quiz.duration++;
    paint();
    if (quiz.timeLeft <= 0) {
      stopTimer();
      answer(false, null); // hết giờ
    }
  }, 1000);
}

function stopTimer() {
  if (quiz.timerId) clearInterval(quiz.timerId);
  quiz.timerId = null;
}

/* ----- Chọn đáp án ----- */
function answer(correct, chosenBtn) {
  if (quiz.locked) return;
  quiz.locked = true;
  stopTimer();

  const item = quiz.list[quiz.index];
  const buttons = $$('#quizAnswers .answer');

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (item.answers[i].correct) btn.classList.add('correct');
    else if (btn === chosenBtn) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });

  let gained = 0;
  if (correct) {
    quiz.correct++;
    const speedBonus = Math.max(0, quiz.timeLeft);
    gained = CONFIG.QUIZ.POINTS_PER_CORRECT + Math.round(speedBonus * CONFIG.QUIZ.SPEED_BONUS_MAX / CONFIG.QUIZ.TIME_PER_QUESTION);
    quiz.score += gained;
    $('#quizScore').textContent = quiz.score;
  }
  runnerFly(correct, gained);

  setTimeout(() => {
    quiz.index++;
    if (quiz.index >= quiz.list.length) finishQuiz();
    else renderQuestion();
  }, correct ? 750 : 1350);
}

/* ----- Kết thúc ----- */
async function finishQuiz() {
  stopTimer();
  const perfect = quiz.correct === quiz.list.length;
  $('#quizMiniFill').style.width = '100%';

  $('#resultScore').textContent = quiz.score;
  $('#resultCorrect').textContent = `${quiz.correct}/${quiz.list.length}`;
  $('#resultTime').textContent = fmtDuration(quiz.duration);
  $('#resultName').textContent = quiz.player.name;

  // Vòng điểm animate
  const maxScore = quiz.list.length * (CONFIG.QUIZ.POINTS_PER_CORRECT + CONFIG.QUIZ.SPEED_BONUS_MAX);
  const C = 326.7;
  requestAnimationFrame(() => {
    $('#resultRing').style.strokeDashoffset = C * (1 - Math.min(1, quiz.score / maxScore));
  });

  const note = $('#resultSaveNote');
  note.className = 'result-note';
  note.textContent = 'Đang lưu kết quả...';

  showQuizScreen('quizResult');
  $('#resultRing').style.strokeDashoffset = C; // reset trước khi animate

  const saved = await saveResult();
  if (saved === 'ok') {
    note.className = 'result-note ok';
    note.textContent = demoMode
      ? '✅ Kết quả đã lưu (chế độ Demo trên máy này).'
      : '✅ Kết quả đã được lưu vào bảng vàng chung!';
  } else if (saved === 'duplicate') {
    note.className = 'result-note';
    note.textContent = '⚠️ Số điện thoại này đã được dùng để thi rồi — mỗi người chỉ được thi 1 lần, kết quả lần này không ghi nhận.';
  } else {
    note.className = 'result-note';
    note.textContent = '⚠️ Không lưu được kết quả. Vui lòng kiểm tra kết nối mạng và thử lại.';
  }

  celebrate(perfect);
}

/* ----- Confetti ăn mừng khi drone về đích ----- */
const CONFETTI_COLORS = ['#22d3ee', '#38bdf8', '#818cf8', '#fbbf24', '#34d399', '#f472b6'];

function celebrate(perfect) {
  if (!window.confetti) return; // CDN không tải được -> bỏ qua

  const base = {
    colors: CONFETTI_COLORS,
    ticks: 160,
    gravity: 0.9,
    decay: 0.93,
    zIndex: 90,
  };

  // Hai cánh pháo hai bên + pháo giữa
  confetti({ ...base, particleCount: 80, spread: 65, startVelocity: 42, angle: 60, origin: { x: 0.1, y: 0.75 } });
  confetti({ ...base, particleCount: 80, spread: 65, startVelocity: 42, angle: 120, origin: { x: 0.9, y: 0.75 } });
  setTimeout(() => {
    confetti({ ...base, particleCount: 110, spread: 100, startVelocity: 38, origin: { x: 0.5, y: 0.55 } });
  }, 220);

  // Đủ chuẩn cả bài -> thêm waves sao + sóng confetti kép
  if (perfect) {
    setTimeout(() => {
      confetti({ ...base, particleCount: 70, spread: 110, shapes: ['star'], scalar: 1.25, origin: { x: 0.5, y: 0.5 } });
      confetti({ ...base, particleCount: 60, spread: 90, startVelocity: 30, origin: { x: 0.35, y: 0.65 } });
      confetti({ ...base, particleCount: 60, spread: 90, startVelocity: 30, origin: { x: 0.65, y: 0.65 } });
    }, 550);
  }
}

/* ----- Lưu kết quả ----- */
function saveResult() {
  const row = {
    name: quiz.player.name,
    school: quiz.player.school,
    phone: quiz.player.phone || null,
    correct_count: quiz.correct,
    total_questions: quiz.list.length,
    duration_seconds: quiz.duration,
    score: quiz.score,
  };

  if (demoMode) {
    try {
      const usedKey = (row.phone || '').replace(/[^0-9]/g, '').slice(-9);
      const used = JSON.parse(localStorage.getItem('uav_demo_used_results') || '[]');
      if (usedKey && used.includes(usedKey)) return Promise.resolve('duplicate');
      used.push(usedKey);
      localStorage.setItem('uav_demo_used_results', JSON.stringify(used));
      const list = JSON.parse(localStorage.getItem('uav_demo_scores') || '[]');
      list.push({ ...row, created_at: new Date().toISOString() });
      localStorage.setItem('uav_demo_scores', JSON.stringify(list));
      return Promise.resolve('ok');
    } catch (_) {
      return Promise.resolve('error');
    }
  }

  return db.from('players').insert(row)
    .then(({ error }) => {
      if (!error) return 'ok';
      console.error(error);
      return error.code === '42501' ? 'duplicate' : 'error';
    })
    .catch((e) => {
      console.error(e);
      return e && e.code === '42501' ? 'duplicate' : 'error';
    });
}

// Nút "Chơi lại" -> về màn đăng ký (giữ sẵn thông tin)
$('#btnReplay').addEventListener('click', () => {
  showQuizScreen('quizRegister');
});

/* ============================================================
   BẢNG VÀNG
   ============================================================ */
let lbTimer = null;

async function fetchScores() {
  if (demoMode) {
    try { return JSON.parse(localStorage.getItem('uav_demo_scores') || '[]'); }
    catch (_) { return []; }
  }
  const { data, error } = await db.from('v_leaderboard')
    .select('name, school, correct_count, total_questions, duration_seconds, score, created_at')
    .order('correct_count', { ascending: false })
    .order('duration_seconds', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) { console.error(error); return null; }
  return data || [];
}

async function loadLeaderboard() {
  const data = await fetchScores();
  if (data === null) {
    showToast('Không tải được bảng vàng. Kiểm tra kết nối mạng.', 'error');
    return;
  }

  // Mỗi người chỉ tính kết quả tốt nhất (theo tên + trường)
  const seen = new Map();
  for (const row of data) {
    const key = (row.name || '').trim().toLowerCase() + '|' + (row.school || '').trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, row);
  }
  const ranked = [...seen.values()]
    .sort((a, b) => b.correct_count - a.correct_count || a.duration_seconds - b.duration_seconds)
    .slice(0, CONFIG.LEADERBOARD_TOP);

  renderLeaderboard(ranked);
}

function renderLeaderboard(list) {
  const body = $('#lbBody');
  const podium = $('#podium');

  if (!list.length) {
    podium.hidden = true;
    body.innerHTML = '<div class="lb-empty">Chưa có kết quả nào. Hãy là người đầu tiên chinh phục thử thách! 🚀</div>';
    return;
  }

  // Bục vinh danh Top 3
  podium.hidden = false;
  const medals = ['1', '2', '3'];
  medals.forEach((pos) => {
    const row = list[Number(pos) - 1];
    if (!row) return;
    $('#podName' + pos).textContent = row.name;
    $('#podSchool' + pos).textContent = row.school;
    $('#podScore' + pos).textContent = row.score + ' điểm';
  });
  ['1', '2', '3'].forEach((pos) => {
    const item = document.querySelector('.podium-item.pos-' + pos);
    item.style.display = list[Number(pos) - 1] ? '' : 'none';
  });

  // Danh sách
  body.innerHTML = list.map((row, i) => {
    const rank = i + 1;
    const rankCell = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank;
    return `
      <div class="lb-row${rank <= 3 ? ' top' + rank : ''}" style="animation-delay:${i * 0.04}s">
        <div><span class="lb-rank">${rankCell}</span></div>
        <div class="lb-name">${escapeHTML(row.name)}</div>
        <div class="lb-school">${escapeHTML(row.school)}</div>
        <div class="lb-stat">${row.correct_count}/${row.total_questions}</div>
        <div class="lb-stat">${fmtDuration(row.duration_seconds)}</div>
        <div class="lb-score">${row.score}</div>
      </div>`;
  }).join('');
}

// Tự động làm mới khi đang ở trang bảng vàng
setInterval(() => {
  if (!$('#view-leaderboard').hidden) loadLeaderboard();
}, CONFIG.REFRESH_LEADERBOARD_SEC * 1000);

/* ============================================================
   GỬI CÂU HỎI
   ============================================================ */
$('#askContent').addEventListener('input', (e) => {
  $('#askCharCount').textContent = e.target.value.length;
});

$('#askForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = $('#askName').value.trim();
  const school = $('#askSchool').value.trim();
  const content = $('#askContent').value.trim();
  const err = $('#askError');
  const btn = $('#btnSendQuestion');

  err.hidden = true;
  if (name.length < 2) return showError(err, 'Vui lòng nhập họ tên đầy đủ.');
  if (school.length < 2) return showError(err, 'Vui lòng nhập tên trường.');
  if (content.length < 5) return showError(err, 'Vui lòng nhập nội dung câu hỏi.');

  btn.disabled = true;
  btn.textContent = 'Đang gửi...';

  const ok = await saveQuestion({ name, school, content });

  btn.disabled = false;
  btn.textContent = 'Gửi câu hỏi ✈️';

  if (!ok) {
    showError(err, 'Không gửi được câu hỏi. Vui lòng kiểm tra kết nối mạng và thử lại.');
    return;
  }

  $('#askForm').reset();
  $('#askCharCount').textContent = '0';
  $('#askForm').hidden = true;
  $('#askSuccess').hidden = false;
  window.scrollTo({ top: 0 });
  celebrate(false);
});

$('#btnAskAgain').addEventListener('click', () => {
  $('#askSuccess').hidden = true;
  $('#askForm').hidden = false;
});

async function saveQuestion({ name, school, content }) {
  if (demoMode) {
    try {
      const list = JSON.parse(localStorage.getItem('uav_demo_questions') || '[]');
      list.push({ name, school, content, created_at: new Date().toISOString() });
      localStorage.setItem('uav_demo_questions', JSON.stringify(list));
      return true;
    } catch (_) {
      return false;
    }
  }
  try {
    const { error } = await db.from('questions').insert({ name, school, content });
    if (error) { console.error(error); return false; }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/* ---------- Khởi động ---------- */
fillEventInfo();
watchReveals();
navigate();

if (demoMode) {
  $('#demoBanner').hidden = false;
}
