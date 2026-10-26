// Nhóm A — kiểm thử API ghi của khách: phản ánh, điểm danh, thi trực tuyến (server chấm điểm)
import { request } from "playwright";
import { BASE, PW, check, summary } from "./lib.mjs";

// Chạy lại cần dọn phản ánh thử trước: a-psql.sh < a-sql/cleanup-a.sql (giới hạn 1 phản ánh/giờ/tài khoản)
const RUN = Date.now().toString(36);
const PHONE = `09${String(Date.now()).slice(-8)}`;
const PHONE_SPACED = `${PHONE.slice(0, 4)} ${PHONE.slice(4, 7)} ${PHONE.slice(7)}`;
const guest = await request.newContext({ baseURL: BASE });
async function loginCtx(username) {
  const ctx = await request.newContext({ baseURL: BASE });
  const r = await ctx.post("/api/auth/login", { data: { username, password: PW } });
  if (!r.ok()) throw new Error(`login ${username} ${r.status()}`);
  return ctx;
}
const dv1 = await loginCtx("t.dv1");
const dv2 = await loginCtx("t.dv2");
const tw = await loginCtx("t.tw");
const j = async (resp) => ({ status: resp.status(), body: await resp.json().catch(() => null) });

/* ================= PHẢN ÁNH ================= */
const fbInput = (email, extra = {}) => ({
  senderName: "Khách Thử A", senderEmail: email, senderPhone: PHONE_SPACED,
  feedbackTopicId: 1, title: `[A] Phản ánh thử ${RUN}`,
  content: "Nội dung phản ánh thử nghiệm của nhóm A, đủ hai mươi ký tự.", ...extra,
});
const email1 = `a-${RUN}@example.com`;
let r = await j(await guest.post("/api/phan-anh", {
  data: fbInput(email1, { trackingCode: "PA-2026-00999", status: "RESOLVED", senderAccountId: 1, id: 5 }),
}));
const code = r.body?.trackingCode;
check("khách gửi phản ánh OK", r.status === 200 && r.body?.ok, `HTTP ${r.status} ${r.body?.error ?? ""}`);
check("mã tra cứu dạng PA-XXXXX-XXXXX ngẫu nhiên", /^PA-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/.test(code ?? ""), code);
check("bỏ qua trackingCode/status/senderAccountId giả mạo", r.body?.feedback?.status === "NEW" && r.body?.feedback?.senderAccountId === null && r.body?.feedback?.id !== 5);
check("trả tin nhắn đầu của người gửi", r.body?.messages?.length === 1 && r.body.messages[0].senderType === "CITIZEN");

r = await j(await guest.get(`/api/phan-anh/${code}`));
check("khách tra cứu bằng mã mới được", r.status === 200 && r.body?.feedback?.trackingCode === code);
const raw = JSON.stringify(r.body ?? {});
check("tra cứu không lộ access_token / số điện thoại", !/accessToken|access_token|senderPhone/.test(raw) && !raw.includes(PHONE.slice(2)));
check("email người gửi bị che bớt", /^a-\*\*\*@example\.com$/.test(r.body?.feedback?.senderEmail ?? ""), r.body?.feedback?.senderEmail);
r = await j(await guest.get(`/api/phan-anh/${code.toLowerCase()}`));
check("tra cứu không phân biệt hoa thường", r.status === 200);

r = await j(await guest.get("/api/phan-anh/PA-ZZZZZ-ZZZZZ"));
check("mã sai → 404", r.status === 404, `HTTP ${r.status}`);
r = await j(await guest.get("/api/phan-anh/xyz';drop"));
check("mã rác → 404", r.status === 404, `HTTP ${r.status}`);

r = await j(await guest.get("/api/phan-anh/PA-2026-27001"));
check("mã kiểu cũ, khách chưa đăng nhập → 403", r.status === 403, `HTTP ${r.status}`);
r = await j(await guest.get("/api/phan-anh/PA-2026-00101"));
check("mã kiểu cũ có thật (seed) khách → 403", r.status === 403, `HTTP ${r.status}`);
r = await j(await dv2.get("/api/phan-anh/PA-2026-27001"));
check("mã kiểu cũ, đăng nhập KHÁC người gửi → 404", r.status === 404, `HTTP ${r.status}`);
r = await j(await dv1.get("/api/phan-anh/PA-2026-27001"));
check("mã kiểu cũ, đúng người gửi → 200", r.status === 200, `HTTP ${r.status}`);
check("không trả ghi chú nội bộ", !JSON.stringify(r.body ?? {}).includes("GHI CHU NOI BO"));
check("phản hồi công khai của cán bộ có, ẩn tên cán bộ", r.body?.messages?.some((m) => m.senderType === "STAFF" && m.senderName === null && m.content.includes("Phản hồi công khai")));

r = await j(await guest.post(`/api/phan-anh/${code}/tin-nhan`, { data: { content: `Nhắn thêm ${RUN}` } }));
check("người gửi nhắn thêm được", r.status === 200 && r.body?.messages?.length === 2, `HTTP ${r.status} ${r.body?.error ?? ""}`);
r = await j(await guest.post("/api/phan-anh/PA-ZZZZZ-ZZZZZ/tin-nhan", { data: { content: "abc def" } }));
check("nhắn vào mã sai → 404", r.status === 404);
r = await j(await guest.post("/api/phan-anh/PA-2026-27001/tin-nhan", { data: { content: "abc def" } }));
check("nhắn vào mã kiểu cũ khi chưa đăng nhập → 403", r.status === 403);

r = await j(await guest.post("/api/phan-anh", { data: fbInput(email1.toUpperCase()) }));
check("cùng email gửi lại trong 1 giờ → 429", r.status === 429, `HTTP ${r.status} ${r.body?.error ?? ""}`);
r = await j(await guest.post("/api/phan-anh", { data: fbInput(`b-${RUN}@example.com`, { senderPhone: PHONE }) }));
check("cùng số điện thoại (khác cách viết) → 429", r.status === 429, `HTTP ${r.status}`);
r = await j(await guest.post("/api/phan-anh", { data: fbInput(`c-${RUN}@example.com`, { senderPhone: "", content: "ngắn" }) }));
check("nội dung quá ngắn → 400", r.status === 400, r.body?.error);
r = await j(await guest.post("/api/phan-anh", { data: fbInput("khong-phai-email", { senderPhone: "" }) }));
check("email sai → 400", r.status === 400, r.body?.error);
r = await j(await guest.post("/api/phan-anh", { data: fbInput(`d-${RUN}@example.com`, { senderPhone: "", feedbackTopicId: 99999 }) }));
check("lĩnh vực không tồn tại → 400", r.status === 400, r.body?.error);

r = await j(await dv2.post("/api/phan-anh", { data: fbInput(`dv2-${RUN}@example.com`, { senderPhone: "" }) }));
check("đoàn viên gửi phản ánh — gắn tài khoản", r.status === 200 && r.body?.feedback?.senderAccountId === 928, `HTTP ${r.status} ${r.body?.error ?? ""}`);
const dv2Code = r.body?.trackingCode;
r = await j(await dv2.get("/api/phan-anh"));
check("GET /api/phan-anh: phản ánh của tôi", r.status === 200 && r.body?.feedbacks?.some((f) => f.trackingCode === dv2Code));
r = await j(await guest.get("/api/phan-anh"));
check("GET /api/phan-anh khi chưa đăng nhập → 401", r.status === 401);

// liveEvents là dữ liệu nội bộ — khách không nhận trong snapshot, kiểm bằng tài khoản TW
let snap = await (await tw.get("/api/store")).json();
check("sinh live_events FEEDBACK_NEW ở server", snap.data?.liveEvents?.some((e) => e.eventType === "FEEDBACK_NEW" && e.title.includes(RUN)));

/* ================= ĐIỂM DANH ================= */
const name = `Học Sinh ${RUN}`;
r = await j(await guest.post("/api/diem-danh", { data: { activityId: 271001, memberName: name, memberClass: "11A2" } }));
check("điểm danh hoạt động đang mở OK", r.status === 200 && r.body?.attendance?.memberName === name && r.body?.count >= 1, `HTTP ${r.status} ${r.body?.error ?? ""}`);
r = await j(await guest.post("/api/diem-danh", { data: { activityId: 271001, memberName: `  ${name.toUpperCase()}  `, memberClass: " 11a2 " } }));
check("điểm danh trùng (khác hoa thường/khoảng trắng) → 409", r.status === 409, `HTTP ${r.status} ${r.body?.error ?? ""}`);
r = await j(await guest.post("/api/diem-danh", { data: { activityId: 271001, memberName: name, memberClass: "11A3" } }));
check("cùng tên khác lớp vẫn điểm danh được", r.status === 200, `HTTP ${r.status}`);
r = await j(await guest.post("/api/diem-danh", { data: { activityId: 271002, memberName: name } }));
check("hoạt động đóng điểm danh → 409", r.status === 409, `HTTP ${r.status} ${r.body?.error ?? ""}`);
r = await j(await guest.post("/api/diem-danh", { data: { activityId: 99999999, memberName: name } }));
check("hoạt động không tồn tại → 404", r.status === 404, `HTTP ${r.status}`);
r = await j(await guest.post("/api/diem-danh", { data: { activityId: 271001, memberName: "" } }));
check("thiếu họ tên → 400", r.status === 400);
r = await j(await guest.get("/api/diem-danh?activityId=271001"));
check("GET trạng thái điểm danh", r.status === 200 && r.body?.open === true && r.body?.count >= 2);
r = await j(await guest.get("/api/diem-danh?activityId=271002"));
check("GET hoạt động đóng: open=false", r.status === 200 && r.body?.exists === true && r.body?.open === false);
snap = await (await tw.get("/api/store")).json();
check("sinh live_events ATTENDANCE ở server", snap.data?.liveEvents?.some((e) => e.eventType === "ATTENDANCE" && e.title.includes("[A] Hoạt động đang mở")));

/* ================= THI — đề thường ================= */
r = await j(await guest.post("/api/thi/bat-dau", { data: { examId: 271001, examineeName: `Thí sinh ${RUN}`, examineeOrgText: "THPT A" } }));
const at1 = r.body?.attempt;
const tok1 = r.body?.accessToken;
check("bắt đầu thi (khách) OK", r.status === 200 && at1?.status === "IN_PROGRESS" && typeof tok1 === "string" && tok1.length >= 24, `HTTP ${r.status} ${r.body?.error ?? ""}`);
check("lượt thi trả về không kèm access_token", !JSON.stringify(at1 ?? {}).includes("ccess"));
r = await j(await guest.post("/api/thi/bat-dau", { data: { examId: 271003, examineeName: "Thí sinh X" } }));
check("bắt đầu đề đã đóng → 404", r.status === 404, `HTTP ${r.status}`);
r = await j(await guest.post("/api/thi/tra-loi", { data: { attemptId: at1?.id, accessToken: tok1, questionId: 271001, answer: { selected: [1] } } }));
check("tra-loi với đề thường → 400", r.status === 400, `HTTP ${r.status}`);

const answers1 = {
  271001: { selected: [1] },          // đúng 1đ
  271002: { selected: [2, 0, 0] },    // đúng 2đ (trùng/khác thứ tự)
  271003: { selected: [1] },          // sai
  271004: { text: "  hồ  CHÍ minh " }, // đúng 1đ
  271005: { text: "Tự luận chờ chấm" },
  999: { selected: [0] },             // câu ngoài đề — bỏ
};
r = await j(await guest.post("/api/thi/nop", { data: { attemptId: at1?.id, accessToken: "sai-ma-bi-mat", answers: answers1, autoScore: 999 } }));
check("nộp lượt thi sai mã bí mật → 403", r.status === 403, `HTTP ${r.status}`);
r = await j(await guest.post("/api/thi/nop", { data: { attemptId: at1?.id, answers: answers1 } }));
check("nộp thiếu mã bí mật → 403", r.status === 403);
r = await j(await guest.post("/api/thi/nop", {
  data: { attemptId: at1?.id, accessToken: tok1, answers: answers1, autoScore: 999, maxScore: 1, trail: [{ questionId: 271005, difficulty: "HARD", correct: true }] },
}));
check("nộp bài OK", r.status === 200 && r.body?.attempt?.status === "SUBMITTED", `HTTP ${r.status} ${r.body?.error ?? ""}`);
check("điểm do server chấm: 4/7 (bỏ qua autoScore=999 giả mạo)", r.body?.attempt?.autoScore === 4 && r.body?.attempt?.maxScore === 7, `${r.body?.attempt?.autoScore}/${r.body?.attempt?.maxScore}`);
const pq = Object.fromEntries((r.body?.perQuestion ?? []).map((x) => [x.questionId, x]));
check("chấm từng câu đúng/sai/tự luận", pq[271001]?.correct === true && pq[271002]?.correct === true && pq[271003]?.correct === false && pq[271004]?.correct === true && pq[271005]?.correct === null);
check("lưu answers đã làm sạch (bỏ câu ngoài đề, trail rỗng)", !("999" in (r.body?.attempt?.answers ?? {})) && (r.body?.attempt?.trail ?? []).length === 0);
r = await j(await guest.post("/api/thi/nop", { data: { attemptId: at1?.id, accessToken: tok1, answers: answers1 } }));
check("nộp lại lượt đã nộp → 409", r.status === 409, `HTTP ${r.status}`);

// Nộp lượt của người khác: đoàn viên dv1 bắt đầu, khách thử nộp bằng mã của lượt khác
r = await j(await dv1.post("/api/thi/bat-dau", { data: { examId: 271001, examineeName: "Đoàn viên Một" } }));
const at2 = r.body?.attempt;
check("đoàn viên bắt đầu thi — gắn tài khoản", r.status === 200 && at2?.accountId === 927, `HTTP ${r.status} ${r.body?.error ?? ""}`);
r = await j(await guest.post("/api/thi/nop", { data: { attemptId: at2?.id, accessToken: tok1, answers: answers1 } }));
check("nộp lượt của người khác (mã của lượt khác) → 403", r.status === 403, `HTTP ${r.status}`);

/* ================= THI — đề thích ứng ================= */
r = await j(await guest.post("/api/thi/bat-dau", { data: { examId: 271002, examineeName: `Thích ứng ${RUN}` } }));
const at3 = r.body?.attempt;
const tok3 = r.body?.accessToken;
check("đề thích ứng: câu đầu do server chọn (MEDIUM, id nhỏ nhất)", r.status === 200 && r.body?.firstQuestionId === 271013, String(r.body?.firstQuestionId));
const ans = (questionId, selected) => guest.post("/api/thi/tra-loi", { data: { attemptId: at3?.id, accessToken: tok3, questionId, answer: { selected } } });
r = await j(await ans(271011, [1]));
check("trả lời câu không phải câu hiện tại → 409", r.status === 409, `HTTP ${r.status}`);
r = await j(await guest.post("/api/thi/tra-loi", { data: { attemptId: at3?.id, accessToken: "sai", questionId: 271013, answer: { selected: [0] } } }));
check("tra-loi sai mã bí mật → 403", r.status === 403);
r = await j(await ans(271013, [0]));
check("đúng → câu khó hơn (HARD 271015)", r.status === 200 && r.body?.correct === true && r.body?.nextQuestionId === 271015, JSON.stringify(r.body));
r = await j(await ans(271015, [0]));
check("sai → câu dễ hơn (MEDIUM 271014)", r.status === 200 && r.body?.correct === false && r.body?.nextQuestionId === 271014, JSON.stringify(r.body));
r = await j(await ans(271014, [3]));
check("đúng → HARD 271016", r.status === 200 && r.body?.correct === true && r.body?.nextQuestionId === 271016, JSON.stringify(r.body));
r = await j(await guest.post("/api/thi/nop", {
  data: { attemptId: at3?.id, accessToken: tok3, answers: { 271015: { selected: [1] }, 271016: { selected: [2] } }, autoScore: 100,
    trail: [{ questionId: 271015, difficulty: "HARD", correct: true }] },
}));
check("đề thích ứng: server chấm theo lộ trình đã ghi = 4/7", r.status === 200 && r.body?.attempt?.autoScore === 4 && r.body?.attempt?.maxScore === 7, `${r.body?.attempt?.autoScore}/${r.body?.attempt?.maxScore} ${r.body?.error ?? ""}`);
check("trail lưu đúng 3 bước của server", (r.body?.attempt?.trail ?? []).map((s) => `${s.questionId}:${s.correct}`).join(",") === "271013:true,271015:false,271014:true");

snap = await (await tw.get("/api/store")).json();
const dbAt = snap.data?.quizAttempts?.find((a) => a.id === at1?.id);
check("DB (cán bộ đọc qua store): autoScore 4, SUBMITTED", dbAt?.autoScore === 4 && dbAt?.status === "SUBMITTED");
check("snapshot cán bộ không kèm access_token", !JSON.stringify(dbAt ?? {}).includes("ccess"));

await Promise.all([guest.dispose(), dv1.dispose(), dv2.dispose(), tw.dispose()]);
summary();
