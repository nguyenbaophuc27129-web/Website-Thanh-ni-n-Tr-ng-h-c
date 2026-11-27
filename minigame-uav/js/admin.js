/* ============================================================
   TRANG QUẢN TRỊ — Workshop UAV 2026 (admin.html)
   Ban Tổ chức: đăng nhập bằng email + mật khẩu (Supabase Auth)
   — tự quản bộ câu hỏi minigame + xem toàn bộ dữ liệu + xuất Excel
   ============================================================ */

'use strict';

const $ = (sel) => document.querySelector(sel);

let db = null;
let demoMode = true;
let authReady = false;
try {
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase) {
    db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    demoMode = false;
  }
} catch (e) { console.error(e); }

/* ---------- Tiện ích ---------- */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

let toastTimer = null;
function showToast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

/* ---------- Đăng nhập Ban Tổ chức ---------- */
const gateError = (msg) => {
  const el = $('#gateError');
  el.textContent = msg;
  el.hidden = false;
};

(function initGate() {
  if (demoMode) {
    // Chưa nối database: giữ cổng mật khẩu demo đơn giản
    $('#gateEmailField').hidden = true;
    $('#gateHint').innerHTML = 'Chưa kết nối database — đang chạy <b>chế độ Demo</b>. Mật khẩu demo đặt trong <b>js/config.js</b> (ADMIN_PASSWORD).';
    $('#gateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if ($('#gatePass').value === String(CONFIG.ADMIN_PASSWORD)) {
        sessionStorage.setItem('uav_admin_ok', '1');
        openAdmin();
      } else gateError('⚠️ Mật khẩu chưa đúng. Thử lại nhé!');
    });
    if (sessionStorage.getItem('uav_admin_ok') === '1') openAdmin();
    return;
  }

  // Đã nối database: đăng nhập bằng tài khoản Supabase (email + mật khẩu)
  db.auth.getSession().then(({ data }) => {
    authReady = true;
    if (data && data.session) openAdmin();
  });

  $('#gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#gateError').hidden = true;
    const btn = $('#gateForm button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    const email = $('#gateEmail').value.trim();
    const pass = $('#gatePass').value;
    const { error } = await db.auth.signInWithPassword({ email, password: pass });
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
    if (error) {
      gateError(error.message === 'Invalid login credentials'
        ? '⚠️ Email hoặc mật khẩu chưa đúng. Thử lại nhé!'
        : '⚠️ ' + error.message);
      return;
    }
    sessionStorage.setItem('uav_admin_email', email);
    openAdmin();
  });
})();

$('#btnLogout').addEventListener('click', async () => {
  if (!demoMode && db) await db.auth.signOut();
  sessionStorage.removeItem('uav_admin_ok');
  sessionStorage.removeItem('uav_admin_email');
  location.reload();
});

$('#btnRefresh').addEventListener('click', () => {
  loadAll();
  showToast('Đã làm mới dữ liệu', 'success');
});

function openAdmin() {
  $('#adminGate').hidden = true;
  $('#adminWrap').hidden = false;
  if (demoMode) {
    $('#demoBanner').hidden = false;
    $('#quizQuestionsCard').hidden = true; // quản lý câu hỏi chỉ có ở chế độ database
  } else {
    const email = sessionStorage.getItem('uav_admin_email');
    if (email) $('#adminWho').textContent = email;
  }
  loadAll();
  loadQuizQuestions();
  startRefresh();
}

/* ---------- Tải dữ liệu ---------- */
let scoresData = [];
let questionsData = [];
let regCountData = 0;

let refreshTimer = null;
let refreshPeriod = (CONFIG.REFRESH_LEADERBOARD_SEC || 20) * 1000;
let liveMode = false;

function startRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadAll, refreshPeriod);
}

async function loadAll() {
  $('#adminStatus').textContent = 'Đang tải dữ liệu...';
  scoresData = await fetchScores();
  questionsData = await fetchQuestions();
  regCountData = await loadRegCount();
  render();
  $('#adminStatus').textContent =
    (demoMode ? 'Chế độ Demo (máy này) — ' : 'Kết nối SQL thật — ') +
    'cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN');
  if (!$('#liveOverlay').hidden) renderLiveBoard();
}

async function loadRegCount() {
  if (demoMode) {
    try { return parseInt(localStorage.getItem('uav_demo_regs') || '0', 10) || 0; }
    catch (_) { return 0; }
  }
  const { count, error } = await db.from('registrations')
    .select('*', { count: 'exact', head: true });
  if (error) { console.error(error); return regCountData; }
  return count || 0;
}

async function fetchScores() {
  if (demoMode) {
    try { return JSON.parse(localStorage.getItem('uav_demo_scores') || '[]'); }
    catch (_) { return []; }
  }
  // Ưu tiên đọc bảng players (kèm số lần vi phạm + log đáp án — cần PATCH-LOG.sql)
  const p = await db.from('players')
    .select('name, school, correct_count, total_questions, duration_seconds, score, violations, answer_log, created_at')
    .order('correct_count', { ascending: false })
    .order('duration_seconds', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(2000);
  if (!p.error) return p.data || [];
  // Chưa chạy PATCH-LOG.sql / chưa đủ quyền đọc -> dùng view công khai (không có cột mới)
  const { data, error } = await db.from('v_leaderboard')
    .select('name, school, correct_count, total_questions, duration_seconds, score, created_at')
    .order('correct_count', { ascending: false })
    .order('duration_seconds', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(2000);
  if (error) { console.error(error); showToast('Lỗi tải bảng vàng', 'error'); return []; }
  return data || [];
}

async function fetchQuestions() {
  if (demoMode) {
    try { return JSON.parse(localStorage.getItem('uav_demo_questions') || '[]'); }
    catch (_) { return []; }
  }
  const { data, error } = await db.from('questions')
    .select('name, school, content, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) { console.error(error); showToast('Lỗi tải câu hỏi', 'error'); return []; }
  return data || [];
}

/* ---------- LIVE realtime (kiểu Kahoot) ---------- */
function liveRanked() {
  // Mỗi người tính kết quả tốt nhất, đúng tiêu chí Kế hoạch
  const seen = new Map();
  for (const row of scoresData) {
    const key = (row.name || '').trim().toLowerCase() + '|' + (row.school || '').trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()].sort(
    (a, b) => b.correct_count - a.correct_count || a.duration_seconds - b.duration_seconds
  );
}

function renderLiveBoard() {
  $('#liveCount').textContent = regCountData;
  const ranked = liveRanked().slice(0, 10);
  const board = $('#liveBoard');
  if (!ranked.length) {
    board.innerHTML = '<div class="live-empty">Chưa có kết quả nào — các sinh viên đang thi...</div>';
    return;
  }
  board.innerHTML = ranked.map((row, i) => `
    <div class="live-row live-top${i + 1}">
      <span class="live-rank">${i + 1}</span>
      <span class="live-name">${escapeHTML(row.name)}<small>${escapeHTML(row.school)}</small></span>
      <span class="live-score">${row.correct_count}/${row.total_questions}<small>${fmtDuration(row.duration_seconds)}</small></span>
    </div>`).join('');
}

$('#btnLive').addEventListener('click', () => {
  liveMode = !liveMode;
  refreshPeriod = liveMode ? 5000 : (CONFIG.REFRESH_LEADERBOARD_SEC || 20) * 1000;
  const btn = $('#btnLive');
  btn.textContent = liveMode ? '🟢 LIVE 5s — đang bật' : '🔴 Live 5s';
  btn.classList.toggle('is-live', liveMode);
  startRefresh();
  loadAll();
  showToast(liveMode ? 'Đã bật LIVE — tự cập nhật mỗi 5 giây' : 'Đã tắt LIVE', 'success');
});

$('#btnProject').addEventListener('click', () => {
  const el = $('#liveOverlay');
  el.hidden = false;
  renderLiveBoard();
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
});

function exitLive() {
  $('#liveOverlay').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
$('#btnLiveExit').addEventListener('click', exitLive);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#liveOverlay').hidden) exitLive();
});

/* ---------- Bộ câu hỏi minigame (Ban Tổ chức tự quản) ---------- */
let quizQuestionsData = [];

async function loadQuizQuestions() {
  if (demoMode) return;
  const { data, error } = await db.from('quiz_questions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); showToast('Lỗi tải bộ câu hỏi', 'error'); return; }
  quizQuestionsData = data || [];
  renderQuizQuestions();
}

function renderQuizQuestions() {
  $('#qqCount').textContent = quizQuestionsData.length;
  const list = $('#qqList');
  $('#qqEmpty').hidden = quizQuestionsData.length > 0;
  list.innerHTML = quizQuestionsData.map((row, i) => {
    const answers = [row.a1, row.a2, row.a3, row.a4]
      .map((a, j) => [a, j])
      .filter(([a]) => a != null && String(a).trim() !== '');
    return `
      <div class="qq-item">
        <div class="qq-item-head">
          <b>Câu ${i + 1}.</b> ${escapeHTML(row.q)}
          <button class="btn btn-ghost qq-del" data-id="${row.id}" title="Xóa câu này">🗑 Xóa</button>
        </div>
        <div class="qq-item-answers">
          ${answers.map(([a, j]) => `<span class="${j === row.c ? 'qq-correct' : ''}">${j === row.c ? '✔' : '✧'} ${escapeHTML(a)}</span>`).join('')}
        </div>
      </div>`;
  }).join('');
  list.querySelectorAll('.qq-del').forEach((btn) => {
    btn.addEventListener('click', () => deleteQuizQuestion(Number(btn.dataset.id)));
  });
}

$('#btnToggleQqForm').addEventListener('click', () => {
  const f = $('#qqForm');
  f.hidden = !f.hidden;
  $('#btnToggleQqForm').textContent = f.hidden ? '＋ Thêm câu hỏi' : '× Đóng form';
});

$('#btnQqCancel').addEventListener('click', () => {
  $('#qqForm').hidden = true;
  $('#btnToggleQqForm').textContent = '＋ Thêm câu hỏi';
});

$('#qqForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#qqError');
  err.hidden = true;
  const q = $('#qqQ').value.trim();
  const a1 = $('#qqA1').value.trim();
  const a2 = $('#qqA2').value.trim();
  const a3 = $('#qqA3').value.trim();
  const a4 = $('#qqA4').value.trim();
  const c = Number(document.querySelector('input[name=qqCorrect]:checked').value);
  if (!q || q.length < 5) { err.textContent = 'Câu hỏi còn quá ngắn.'; err.hidden = false; return; }
  if (!a1 || !a2) { err.textContent = 'Cần ít nhất 2 đáp án A và B.'; err.hidden = false; return; }
  const answers = [a1, a2, a3, a4].filter((a) => a !== '');
  if (c >= answers.length) { err.textContent = 'Đáp án đúng đang chỉ vào ô đáp án còn trống.'; err.hidden = false; return; }

  const btn = $('#qqForm button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';
  const { error } = await db.from('quiz_questions').insert({
    q, a1, a2, a3: a3 || null, a4: a4 || null, c,
  });
  btn.disabled = false;
  btn.textContent = '💾 Lưu câu hỏi';
  if (error) {
    err.textContent = error.code === '42501'
      ? '⚠️ Email này chưa được cấp quyền quản trị (phải có trong bảng admin_emails).'
      : '⚠️ Lưu lỗi: ' + error.message;
    err.hidden = false;
    return;
  }
  $('#qqForm').reset();
  document.querySelector('input[name=qqCorrect][value="0"]').checked = true;
  showToast('Đã thêm câu hỏi mới', 'success');
  loadQuizQuestions();
});

async function deleteQuizQuestion(id) {
  if (!confirm('Xóa câu hỏi này khỏi bộ câu hỏi minigame?')) return;
  const { error } = await db.from('quiz_questions').delete().eq('id', id);
  if (error) {
    showToast(error.code === '42501'
      ? 'Email này chưa được cấp quyền quản trị.'
      : 'Xóa lỗi: ' + error.message, 'error');
    return;
  }
  showToast('Đã xóa câu hỏi', 'success');
  loadQuizQuestions();
}

/* ---------- Hiển thị ---------- */
function render() {
  // Mỗi người tính kết quả tốt nhất (đúng tiêu chí kế hoạch)
  const seen = new Map();
  for (const row of scoresData) {
    const key = (row.name || '').trim().toLowerCase() + '|' + (row.school || '').trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, row);
  }
  const ranked = [...seen.values()].sort(
    (a, b) => b.correct_count - a.correct_count || a.duration_seconds - b.duration_seconds
  );

  // Thống kê
  $('#adminStats').innerHTML = `
    <div class="stat-box"><b>${scoresData.length}</b><small>tổng lượt tham gia minigame</small></div>
    <div class="stat-box violet"><b>${ranked.length}</b><small>người chơi (mỗi người tính điểm cao nhất)</small></div>
    <div class="stat-box amber"><b>${questionsData.length}</b><small>câu hỏi gửi về tọa đàm</small></div>
    ${demoMode ? '' : `<div class="stat-box"><b>${quizQuestionsData.length}</b><small>câu hỏi minigame trong database</small></div>`}
    <div class="stat-box green"><b>${regCountData}</b><small>sinh viên đăng ký tham dự</small></div>`;

  // Bảng vàng
  const body = $('#scoresBody');
  if (!ranked.length) {
    body.innerHTML = '';
    $('#scoresEmpty').hidden = false;
  } else {
    $('#scoresEmpty').hidden = true;
    body.innerHTML = ranked.map((row, i) => `
      <tr class="${i < 3 ? 'top' + (i + 1) : ''}">
        <td>${i + 1}</td>
        <td class="name">${escapeHTML(row.name)}${i < 3 ? [' 🥇', ' 🥈', ' 🥉'][i] : ''}</td>
        <td class="t-muted">${escapeHTML(row.school)}</td>
        <td class="t-center">${row.correct_count}/${row.total_questions}</td>
        <td class="t-muted">${fmtDuration(row.duration_seconds)}</td>
        <td class="t-center t-score">${row.score}</td>
        <td class="t-center ${row.violations ? 't-viol' : 't-muted'}">${row.violations || 0}</td>
        <td class="t-muted">${fmtTime(row.created_at)}</td>
      </tr>`).join('');
  }

  // Câu hỏi tọa đàm
  const list = $('#questionsList');
  if (!questionsData.length) {
    list.innerHTML = '';
    $('#questionsEmpty').hidden = false;
  } else {
    $('#questionsEmpty').hidden = true;
    list.innerHTML = questionsData.map((q) => `
      <div class="ask-item">
        <div class="ask-item-head">
          <span><b>${escapeHTML(q.name)}</b> • ${escapeHTML(q.school)}</span>
          <span>${fmtTime(q.created_at)}</span>
        </div>
        <div class="ask-item-body">${escapeHTML(q.content)}</div>
      </div>`).join('');
  }
}

/* ---------- Xuất CSV (mở bằng Excel) ---------- */
function downloadCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Đã xuất ' + filename, 'success');
}

$('#btnExportScores').addEventListener('click', () => {
  // Tính lại hạng như bảng hiển thị
  const seen = new Map();
  for (const row of scoresData) {
    const key = (row.name || '').trim().toLowerCase() + '|' + (row.school || '').trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, row);
  }
  const ranked = [...seen.values()].sort(
    (a, b) => b.correct_count - a.correct_count || a.duration_seconds - b.duration_seconds
  );
  if (!ranked.length) return showToast('Chưa có dữ liệu để xuất', 'error');
  downloadCSV(
    'bang-vang-uav-2026.csv',
    ['Hạng', 'Họ tên', 'Trường', 'Câu đúng', 'Tổng câu', 'Thời gian (giây)', 'Điểm', 'Thời điểm'],
    ranked.map((r, i) => [i + 1, r.name, r.school, r.correct_count, r.total_questions, r.duration_seconds, r.score, fmtTime(r.created_at)])
  );
});

$('#btnExportQuestions').addEventListener('click', () => {
  if (!questionsData.length) return showToast('Chưa có dữ liệu để xuất', 'error');
  downloadCSV(
    'cau-hoi-toa-dam-uav-2026.csv',
    ['STT', 'Họ tên', 'Trường', 'Câu hỏi', 'Thời điểm gửi'],
    questionsData.map((q, i) => [i + 1, q.name, q.school, q.content, fmtTime(q.created_at)])
  );
});

// Log chi tiết từng lần chọn đáp án (cột answer_log — cần PATCH-LOG.sql)
$('#btnExportAnswers').addEventListener('click', () => {
  const rows = [];
  for (const r of scoresData) {
    const log = Array.isArray(r.answer_log) ? r.answer_log : [];
    for (const t of log) {
      rows.push([
        r.name, r.school,
        t.q, t.question || '',
        t.answer == null ? '(hết giờ - không chọn)' : t.answer,
        t.correct ? 'Đúng' : 'Sai',
        t.sec_left != null ? t.sec_left : '',
        t.at || '',
      ]);
    }
  }
  if (!rows.length) return showToast('Chưa có log đáp án — cần chạy PATCH-LOG.sql và thí sinh thi từ bản mới', 'error');
  downloadCSV(
    'log-dap-an-uav-2026.csv',
    ['Họ tên', 'Trường', 'Câu số', 'Câu hỏi', 'Đáp án chọn', 'Kết quả', 'Giây còn lại', 'Thời điểm chọn'],
    rows
  );
});
