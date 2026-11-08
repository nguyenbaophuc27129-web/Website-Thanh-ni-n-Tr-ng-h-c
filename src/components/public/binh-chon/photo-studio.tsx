"use client";

/**
 * Xưởng ảnh cắt nền AI — client-only.
 * - Cắt nền gọi remove.bg API QUA SERVER /api/cat-nen (key REMOVEBG_API_KEY chỉ ở BE).
 *   Free 50 lượt/tháng nhận preview 0.25MP; server tự thử "full" trước (ảnh gốc khi
 *   tài khoản có credit). Lỗi (hết lượt, sai key, mạng) → cảnh báo + vẫn dùng được
 *   các chức năng còn lại (degrade mềm).
 * - Khung theo MẪU CDTTB (rèm đỏ sân khấu + 2 chi tiết sóng đỏ), mọi toạ độ vẽ
 *   trong không gian logic 720x960; preview render 2x (1440x1920), xuất ảnh render
 *   3x (2160x2880) rồi hạ xuống full 1440x1920 + thumb 320x427 → sắc net 4K.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles, FlipHorizontal2, RotateCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FRAME_W = 720;
const FRAME_H = 960; // 3:4
const WORK_MAX = 2400; // giữ đủ pixel cho xuất 4K
const RENDER_PREVIEW = 2; // canvas xem trước 1440x1920

type BgMode = "transparent" | "color" | "gradient" | "sunburst" | "mau";

const BG_COLORS = ["#C81E1E", "#FFC93C", "#1e5a8a", "#ffffff"];

/* ═══ Frame theo mẫu "Giải thưởng Quảng cáo Sáng tạo VN": sân khấu rèm đỏ + người
   đứng bên phải GIỮA 2 chi tiết sóng đỏ (nền thẳng phía sau + gợn sóng phía trước),
   logo TNTH lớn chính giữa đỉnh, logo HS3T khối trái, tên HỌC SINH + đơn vị. ═══ */
const FRAME_BAR_FALLBACK = "HÀNH TRÌNH 3 TỐT — BÌNH CHỌN 2026";
const LOGO_TNTH_SRC = "/logo-tnth-03.png";
const LOGO_HS3T_SRC = "/logo-hs3t.png";
const BG_CURTAIN_SRC = "/frame/phong-nen.jpg"; // chi tiết 1 — rèm đỏ + vệt sáng (phông)
const BG_WAVES_SRC = "/frame/song-duoi.jpg"; // chi tiết 2 — gợn sóng đỏ đè trước người

/** Vùng chủ thể: mode "mau" → người đứng bên phải giữa 2 chi tiết sóng; còn lại → giữa khung */
const STAGE_RIGHT = { x0: 330, x1: 662, y0: 236, y1: 830 };
const STAGE_CENTER = { x0: 44, x1: 676, y0: 232, y1: 882 };

/** Ghép chủ thể vào vùng sân khấu (giống cách ráp mẫu frame) */
function stageFitFor(
  canvas: { width: number; height: number },
  zone: { x0: number; x1: number; y0: number; y1: number }
): { scale: number; offsetX: number; offsetY: number } {
  const fullFit = Math.min(FRAME_W / canvas.width, FRAME_H / canvas.height);
  const zoneFit = Math.min((zone.x1 - zone.x0) / canvas.width, (zone.y1 - zone.y0) / canvas.height);
  return {
    scale: Math.min(2, Math.max(0.5, zoneFit / fullFit)),
    offsetX: Math.round((zone.x0 + zone.x1) / 2 - FRAME_W / 2),
    offsetY: Math.round((zone.y0 + zone.y1) / 2 - FRAME_H / 2),
  };
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, boxW: number, boxH: number) {
  const s = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, x + (boxW - w) / 2, y + (boxH - h) / 2, w, h);
}

/** Nhãn chữ có giãn khoảng ký tự (HỌC SINH) — fallback an toàn nếu canvas chưa hỗ trợ */
function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
  } catch {
    /* bỏ qua — trình duyệt cũ vẽ chữ thường */
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string | CanvasGradient, stroke?: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.5;
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.stroke();
  }
}

/** Phông sân khấu: chi tiết rèm đỏ phủ kín khung (center-crop cover) */
function drawCurtainBackdrop(ctx: CanvasRenderingContext2D, curtain?: HTMLImageElement) {
  if (!curtain) {
    const g = ctx.createLinearGradient(0, 0, 0, FRAME_H);
    g.addColorStop(0, "#1d0100");
    g.addColorStop(0.55, "#5c0d10");
    g.addColorStop(1, "#2a0505");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
    return;
  }
  const s = Math.max(FRAME_W / curtain.naturalWidth, FRAME_H / curtain.naturalHeight);
  const w = curtain.naturalWidth * s;
  const h = curtain.naturalHeight * s;
  ctx.drawImage(curtain, (FRAME_W - w) / 2, (FRAME_H - h) / 2, w, h);
}

/**
 * Gợn sóng đỏ đè TRƯỚC chân người — vẽ TRỰC TIẾP từ ảnh theo 10 lát cắt ngang với
 * alpha tăng dần (mờ dần ở đỉnh băng → hòa vào sàn sân khấu như lớp lụa thật).
 * Không dùng canvas trung gian: drawImage nguồn là canvas bị mất lớp khi raster lớn.
 */
function drawFrontWaves(ctx: CanvasRenderingContext2D, waves?: HTMLImageElement) {
  if (!waves) return;
  const BAND = 310;
  const sy = waves.naturalHeight * 0.42; // bỏ trời đen phía trên
  const sw = waves.naturalWidth * 0.92; // bỏ 8% phải — dấu nước
  const sh = waves.naturalHeight * 0.53;
  const SLICES = 10;
  const RAMP = 0.5; // 50% đầu của băng là vùng mờ dần
  for (let i = 0; i < SLICES; i++) {
    const t0 = i / SLICES;
    const t1 = (i + 1) / SLICES;
    const alpha = Math.min(1, ((t0 + t1) / 2) / RAMP);
    if (alpha <= 0.01) continue;
    ctx.globalAlpha = alpha * 0.97;
    ctx.drawImage(
      waves,
      0,
      sy + sh * t0,
      sw,
      sh * (t1 - t0),
      0,
      FRAME_H - BAND + BAND * t0,
      FRAME_W,
      BAND * (t1 - t0) + 0.6
    );
  }
  ctx.globalAlpha = 1;
}

/** Viền khung vàng — vẽ CUỐI để "đóng khung" toàn bộ poster */
function drawFrameBorder(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, FRAME_W, FRAME_H);
  g.addColorStop(0, "#FFE9A8");
  g.addColorStop(0.5, "#FFC93C");
  g.addColorStop(1, "#E8A020");
  ctx.strokeStyle = g;
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, FRAME_W - 10, FRAME_H - 10);
  ctx.strokeStyle = "rgba(122,18,8,0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(11, 11, FRAME_W - 22, FRAME_H - 22);
}

/** Chữ co giãn vừa khung bề rộng cho phép */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  maxSize: number,
  minSize: number,
  maxWidth: number
): number {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px 'Segoe UI', Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

/** Lớp frame đè lên: logo TNTH đỉnh + logo HS3T trái + HỌC SINH + tên + dải đơn vị */
function drawFrameOverlay(
  ctx: CanvasRenderingContext2D,
  logos: { tnth?: HTMLImageElement; hs3t?: HTMLImageElement },
  studentName: string,
  orgName: string
) {
  // Logo Thanh niên trường học — chính giữa đỉnh khung, to và nổi
  if (logos.tnth) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 14;
    drawContain(ctx, logos.tnth, FRAME_W / 2 - 150, 16, 300, 156);
    ctx.restore();
  }

  // Logo Học sinh 3 Tốt góc trái — nhỏ vừa (bằng cỡ logo trang), không đè ảnh chân dung
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (logos.hs3t) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10;
    drawContain(ctx, logos.hs3t, 30, 208, 96, 96);
    ctx.restore();
  }

  // Tên học sinh dưới sân khấu (thay "NGHỆ SĨ …" của mẫu)
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  setLetterSpacing(ctx, 10);
  ctx.font = "900 26px 'Segoe UI', Arial, sans-serif";
  const hg = ctx.createLinearGradient(0, 840, 0, 872);
  hg.addColorStop(0, "#FFF7C2");
  hg.addColorStop(0.5, "#FFD34D");
  hg.addColorStop(1, "#EE9C13");
  ctx.fillStyle = hg;
  ctx.fillText("HỌC SINH", FRAME_W / 2 + 5, 866); // +5 bù letterSpacing lệch tâm
  setLetterSpacing(ctx, 0);

  const name = studentName.trim().toUpperCase();
  if (name) {
    const size = fitText(ctx, name, 900, 42, 26, 640);
    ctx.font = `900 ${size}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(name, FRAME_W / 2, 906);
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Dải đơn vị đáy khung (thay "HẠNG MỤC ĐỀ CỪ" của mẫu)
  const barY = FRAME_H - 46;
  const bg2 = ctx.createLinearGradient(0, barY, 0, FRAME_H);
  bg2.addColorStop(0, "#7A0E12");
  bg2.addColorStop(1, "#3E0608");
  ctx.fillStyle = bg2;
  ctx.fillRect(0, barY, FRAME_W, 46);
  ctx.fillStyle = "#FFC93C";
  ctx.fillRect(0, barY, FRAME_W, 3);
  const barText = orgName.trim() ? `ĐƠN VỊ: ${orgName.trim().toUpperCase()}` : FRAME_BAR_FALLBACK;
  const barSize = fitText(ctx, barText, 800, 17, 12, 640);
  ctx.font = `800 ${barSize}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  const btw = ctx.measureText(barText).width;
  ctx.fillText(barText, FRAME_W / 2, barY + 30);
  drawStar(ctx, FRAME_W / 2 - btw / 2 - 22, barY + 24, 8, "#FFC93C");
  drawStar(ctx, FRAME_W / 2 + btw / 2 + 22, barY + 24, 8, "#FFC93C");

  drawFrameBorder(ctx);
}

const FILTER_PRESETS: { key: string; label: string; extra: string }[] = [
  { key: "natural", label: "Tự nhiên", extra: "" },
  { key: "fresh", label: "Tươi sáng", extra: "brightness(1.05) saturate(1.15)" },
  { key: "warm", label: "Ấm áp", extra: "sepia(0.25) saturate(1.15)" },
  { key: "bw", label: "Trắng đen", extra: "grayscale(1)" },
  { key: "vintage", label: "Cổ điển", extra: "sepia(0.55) contrast(0.95)" },
];

interface RenderOpts {
  bgMode: BgMode;
  bgColor: string;
  subject: HTMLCanvasElement | null;
  scale: number;
  rotation: number;
  flipH: boolean;
  offset: { x: number; y: number };
  filter: string;
  logos: { tnth?: HTMLImageElement; hs3t?: HTMLImageElement };
  curtain?: HTMLImageElement;
  waves?: HTMLImageElement;
  studentName: string;
  orgName: string;
}

/** Vẽ CHỈ chủ thể (cùng transform với renderFrame) — dùng cho xuất ảnh cắt nền trong suốt */
function drawSubject(ctx: CanvasRenderingContext2D, o: RenderOpts) {
  if (!o.subject) return;
  const base = Math.min(FRAME_W / o.subject.width, FRAME_H / o.subject.height) * o.scale;
  const w = o.subject.width * base;
  const h = o.subject.height * base;
  ctx.save();
  ctx.filter = o.filter;
  ctx.translate(FRAME_W / 2 + o.offset.x, FRAME_H / 2 + o.offset.y);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.scale(o.flipH ? -1 : 1, 1);
  ctx.drawImage(o.subject, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.filter = "none";
}

/** Vẽ toàn bộ khung trong không gian logic 720x960 — caller đã setTransform(r,0,0,r,0,0) */
function renderFrame(ctx: CanvasRenderingContext2D, o: RenderOpts) {
  ctx.clearRect(0, 0, FRAME_W, FRAME_H);

  // ═══ Nền ═══
  if (o.bgMode === "mau") {
    drawCurtainBackdrop(ctx, o.curtain);
  } else if (o.bgMode === "color") {
    ctx.fillStyle = o.bgColor;
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  } else if (o.bgMode === "gradient") {
    const g = ctx.createLinearGradient(0, FRAME_H, 0, 0);
    g.addColorStop(0, "#C9271E");
    g.addColorStop(0.45, "#E04A1F");
    g.addColorStop(1, "#FFC93C");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  } else if (o.bgMode === "sunburst") {
    ctx.fillStyle = "#E04A1F";
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
    ctx.save();
    ctx.translate(FRAME_W / 2, FRAME_H * 1.15);
    ctx.fillStyle = "rgba(255,201,60,0.35)";
    for (let i = 0; i < 24; i++) {
      ctx.rotate((Math.PI * 2) / 24);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, FRAME_H, (i * Math.PI) / 24, (i * Math.PI) / 24 + Math.PI / 48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══ Ảnh chủ thể ═══
  drawSubject(ctx, o);

  // ═══ Gợn sóng đỏ đè trước người (chỉ mode mẫu) ═══
  if (o.bgMode === "mau") drawFrontWaves(ctx, o.waves);

  // ═══ Logo + chữ + viền ═══
  drawFrameOverlay(ctx, o.logos, o.studentName, o.orgName);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: (fullDataUrl: string, thumbDataUrl: string) => void;
  /** Tên học sinh in dưới khung (đoàn viên nhập) */
  studentName?: string;
  /** Tên đơn vị in dải đáy khung */
  orgName?: string;
}

export function PhotoStudio({ open, onClose, onDone, studentName = "", orgName = "" }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const subjectRef = useRef<HTMLCanvasElement | null>(null); // canvas gốc (có thể có alpha)
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [hasImage, setHasImage] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [cutNote, setCutNote] = useState<string>("");
  const [bgMode, setBgMode] = useState<BgMode>("mau");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [preset, setPreset] = useState("natural");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  /* Nạp logo + 2 chi tiết phông khi mở xưởng */
  const logosRef = useRef<{ tnth?: HTMLImageElement; hs3t?: HTMLImageElement }>({});
  const curtainRef = useRef<HTMLImageElement | null>(null);
  const wavesRef = useRef<HTMLImageElement | null>(null);
  const [assetsReady, setAssetsReady] = useState(0);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = (src: string, done: (img: HTMLImageElement) => void) => {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        done(img);
        setAssetsReady((n) => n + 1);
      };
      img.src = src;
    };
    load(LOGO_TNTH_SRC, (img) => {
      logosRef.current.tnth = img;
    });
    load(LOGO_HS3T_SRC, (img) => {
      logosRef.current.hs3t = img;
    });
    load(BG_CURTAIN_SRC, (img) => {
      curtainRef.current = img;
    });
    load(BG_WAVES_SRC, (img) => {
      wavesRef.current = img;
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const compose = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = FRAME_W * RENDER_PREVIEW;
    canvas.height = FRAME_H * RENDER_PREVIEW;
    ctx.setTransform(RENDER_PREVIEW, 0, 0, RENDER_PREVIEW, 0, 0);
    renderFrame(ctx, {
      bgMode,
      bgColor,
      subject: subjectRef.current,
      scale,
      rotation,
      flipH,
      offset,
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) ${FILTER_PRESETS.find((p) => p.key === preset)?.extra ?? ""}`,
      logos: logosRef.current,
      curtain: curtainRef.current ?? undefined,
      waves: wavesRef.current ?? undefined,
      studentName,
      orgName,
    });
  }, [bgMode, bgColor, preset, brightness, contrast, saturate, scale, rotation, flipH, offset, assetsReady, studentName, orgName]);

  // rAF-debounce compose khi đổi tham số
  useEffect(() => {
    if (!open) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(compose);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, compose]);

  const loadFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert("Ảnh gốc vượt 8MB — vui lòng chọn ảnh nhỏ hơn.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, WORK_MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        subjectRef.current = canvas;
        setHasImage(true);
        // Ghép sẵn vào vùng sân khấu — người đứng phải giữa 2 chi tiết sóng, đầu không đè logo
        const fit = stageFitFor(canvas, bgMode === "mau" ? STAGE_RIGHT : STAGE_CENTER);
        setScale(fit.scale);
        setOffset({ x: fit.offsetX, y: fit.offsetY });
        setRotation(0);
        setFlipH(false);
        setCutNote("");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /** Cắt nền qua remove.bg API (server /api/cat-nen giữ API key) — lỗi → degrade mềm */
  const runRemoveBackground = async () => {
    const subject = subjectRef.current;
    if (!subject || cutting) return;
    setCutting(true);
    setCutNote("Đang gửi ảnh tới AI remove.bg — đợi vài giây…");
    try {
      // Ảnh gốc chưa có alpha → gửi JPEG nhẹ hơn PNG rất nhiều
      const imageDataUrl = subject.toDataURL("image/jpeg", 0.92);
      const res = await fetch("/api/cat-nen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; imageDataUrl?: string }
        | null;
      if (!json?.ok || !json.imageDataUrl) {
        setCutNote(json?.error ?? "Không cắt được nền — thử lại hoặc dùng ảnh cắt sẵn từ máy.");
        setCutting(false);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        subjectRef.current = canvas;
        setHasImage(true);
        setCutNote("Đã cắt nền xong — kéo ảnh đứng ngay giữa 2 dải sóng đỏ nhé.");
        setCutting(false);
      };
      img.onerror = () => {
        setCutNote("Không đọc được ảnh đã cắt — vẫn dùng ảnh gốc.");
        setCutting(false);
      };
      img.src = json.imageDataUrl;
    } catch {
      setCutting(false);
      setCutNote("Lỗi mạng khi gọi AI cắt nền — thử lại nhé.");
    }
  };

  /** Xuất ảnh KÈM KHUNG SÂN KHẤU VINH DANH (mặc định duy nhất) — bài dự thi gửi lên
   *  phải mang đúng khung như xem trước: rèm đỏ + sóng + logo + tên + dải đơn vị + viền vàng.
   *  Full ~2x (1440x1920) JPEG nền đặc, thumb ~0.8x — thu nhỏ dần nếu nặng (guard API 2MB/400KB). */
  const exportImages = () => {
    if (!subjectRef.current) {
      setCutNote("Chưa có ảnh — chọn ảnh trước đã.");
      return;
    }
    const opts: RenderOpts = {
      bgMode,
      bgColor,
      subject: subjectRef.current,
      scale,
      rotation,
      flipH,
      offset,
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) ${FILTER_PRESETS.find((p) => p.key === preset)?.extra ?? ""}`,
      logos: logosRef.current,
      curtain: curtainRef.current ?? undefined,
      waves: wavesRef.current ?? undefined,
      studentName,
      orgName,
    };
    const renderFramed = (k: number, quality: number): string => {
      const stage = document.createElement("canvas");
      stage.width = Math.round(FRAME_W * k);
      stage.height = Math.round(FRAME_H * k);
      const sctx = stage.getContext("2d")!;
      sctx.setTransform(k, 0, 0, k, 0, 0);
      renderFrame(sctx, opts);
      return stage.toDataURL("image/jpeg", quality);
    };

    let kFull = 2;
    let full = renderFramed(kFull, 0.82);
    // ~1.9MB base64 ≈ 1.42MB nhị phân — hạ dần độ phân giải nếu nặng
    while (full.length > 1_900_000 && kFull > 1.0) {
      kFull -= 0.25;
      full = renderFramed(kFull, 0.82);
    }
    let kThumb = 0.8;
    let thumb = renderFramed(kThumb, 0.8);
    while (thumb.length > 380_000 && kThumb > 0.4) {
      kThumb -= 0.1;
      thumb = renderFramed(kThumb, 0.8);
    }
    onDone(full, thumb);
  };

  // Kéo để căn vị trí
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = FRAME_W / rect.width;
    setOffset({ x: Math.round(d.ox + (e.clientX - d.x) * px), y: Math.round(d.oy + (e.clientY - d.y) * px) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Wand2 className="h-4 w-4 text-doan-600" /> Xưởng ảnh — cắt nền AI &amp; làm đẹp
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="thin-scrollbar grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,340px)_1fr]">
          {/* Preview 3:4 */}
          <div className="space-y-3">
            <canvas
              ref={previewRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={cn(
                "w-full cursor-grab touch-none rounded-lg border border-stone-200 bg-checker active:cursor-grabbing",
                !hasImage && "opacity-70"
              )}
              style={{ aspectRatio: "3/4" }}
            />
            <p className="text-center text-[11px] text-stone-400">
              Khung 3:4 để căn ảnh — bấm “Cắt nền bằng AI” rồi kéo người đứng giữa 2 dải sóng.
              Bài dự thi gửi lên kèm nguyên khung sân khấu vinh danh như xem trước (đơn vị & tên in dưới khung).
            </p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-doan-400 bg-doan-50 px-3 py-2.5 text-sm font-medium text-doan-700 hover:bg-doan-100">
              <ImagePlus className="h-4 w-4" /> {hasImage ? "Chọn ảnh khác" : "Chọn ảnh từ máy"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <Button className="w-full" onClick={runRemoveBackground} disabled={!hasImage || cutting}>
              <Sparkles className="h-4 w-4" /> {cutting ? "Đang cắt nền…" : "Cắt nền bằng AI"}
            </Button>
            {cutNote ? <p className="text-center text-[11px] leading-snug text-amber-700">{cutNote}</p> : null}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Khung sân khấu vinh danh chính thức duy nhất */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Khung vinh danh</p>
              <div className="flex items-center gap-2.5 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-[#FFFDF0] via-amber-50 to-yellow-100/80 px-3.5 py-2.5 shadow-2xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F26522] to-[#C4161C] text-white shadow-2xs">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-amber-950 uppercase tracking-tight">
                    Khung Sân khấu Rực rỡ tuổi học sinh
                  </p>
                  <p className="text-[10px] font-medium text-amber-800/80 leading-snug">
                    Khung chuẩn chính thức — Rèm nhung đỏ, sóng ánh kim &amp; biểu trưng quốc gia
                  </p>
                </div>
                <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[9px] font-black uppercase text-amber-950 border border-amber-300">
                  Mặc định duy nhất
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-stone-500">BỘ LỌC</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs font-medium",
                      preset === p.key ? "border-doan-600 bg-doan-600 text-white" : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { label: "Độ sáng", value: brightness, set: setBrightness },
                    { label: "Tương phản", value: contrast, set: setContrast },
                    { label: "Độ rực", value: saturate, set: setSaturate },
                  ] as { label: string; value: number; set: (v: number) => void }[]
                ).map((s) => (
                  <label key={s.label} className="block text-[11px] text-stone-500">
                    {s.label} <span className="float-right text-stone-400">{s.value}%</span>
                    <input
                      type="range"
                      min={40}
                      max={160}
                      value={s.value}
                      onChange={(e) => s.set(Number(e.target.value))}
                      className="mt-1 w-full accent-doan-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-stone-500">
                PHÓNG TO <span className="float-right font-normal text-stone-400">{scale.toFixed(2)}×</span>
              </p>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-doan-600"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw className="h-3.5 w-3.5" /> Xoay 90°
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setFlipH((f) => !f)}>
                <FlipHorizontal2 className="h-3.5 w-3.5" /> Lật ngang
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const fit = stageFitFor(subjectRef.current ?? { width: FRAME_W, height: FRAME_H }, bgMode === "mau" ? STAGE_RIGHT : STAGE_CENTER);
                  setScale(fit.scale);
                  setOffset({ x: fit.offsetX, y: fit.offsetY });
                  setRotation(0);
                  setFlipH(false);
                  setPreset("natural");
                  setBrightness(100);
                  setContrast(100);
                  setSaturate(100);
                }}
              >
                Về giữa khung
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            Quay lại
          </Button>
          <Button onClick={exportImages} disabled={!hasImage}>
            Dùng ảnh này (kèm khung vinh danh)
          </Button>
        </div>
      </div>
    </div>
  );
}
