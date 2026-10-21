import type { QuizExam } from "@/types";

/**
 * Kỳ thi mẫu — KT-2026-001 đề thường (trộn câu + trộn đáp án),
 * KT-2026-002 đề adaptive (đúng → khó hơn, sai → dễ hơn).
 */
export const quizExams: QuizExam[] = [
  {
    id: 861,
    code: "KT-2026-001",
    title: "Kiến thức Đoàn & Kỹ năng số năm học 2026-2027",
    description: "Kỳ thi dành cho học sinh, sinh viên toàn quốc — 6 câu ngẫu nhiên từ ngân hàng đề, trộn cả câu hỏi và đáp án.",
    durationMinutes: 15,
    questionIds: [801, 802, 803, 804, 805, 806, 807, 808, 810, 811, 812, 813, 815, 818, 820, 824],
    shuffleQuestions: true,
    shuffleOptions: true,
    adaptive: false,
    status: "OPEN",
    createdByAccountId: 1,
    createdAt: "2026-09-20T02:00:00Z",
  },
  {
    id: 862,
    code: "KT-2026-002",
    title: "An toàn giao thông cho học sinh (đề thông minh)",
    description: "Đề thi thích ứng: trả lời đúng sẽ gặp câu khó hơn, sai sẽ quay về câu dễ hơn — 6 câu trên tổng 6 nội dung ATGT.",
    durationMinutes: 10,
    questionIds: [802, 806, 809, 811, 816, 817, 821, 823],
    shuffleQuestions: true,
    shuffleOptions: true,
    adaptive: true,
    topics: ["An toàn giao thông"],
    status: "OPEN",
    createdByAccountId: 1,
    createdAt: "2026-09-25T02:00:00Z",
  },
];
