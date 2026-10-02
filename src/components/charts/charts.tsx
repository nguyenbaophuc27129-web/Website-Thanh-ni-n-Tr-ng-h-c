"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

/* Palette GovTech — KHÔNG đỏ: Blue chủ đạo, Cyan công nghệ, nhấn phụ */
const PALETTE = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];

type GlassTipProps = {
  active?: boolean;
  payload?: { value?: number | string; color?: string; fill?: string }[];
  label?: string | number;
  unit?: string;
};

/** Tooltip kính mờ — glass morphism nổi trên biểu đồ */
function GlassTooltip({ active, payload, label, unit }: GlassTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/60 bg-white/80 px-3.5 py-2.5 shadow-[0_8px_30px_rgb(15,23,42,0.14)] backdrop-blur-md">
      {label !== undefined && label !== "" ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      ) : null}
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {Number(p.value).toLocaleString("vi-VN")}
          {unit ? ` ${unit}` : ""}
        </p>
      ))}
    </div>
  );
}

/** Lưới ngang nét đứt siêu mờ + trục X minimal (KHÔNG trục Y) */
function SoftGrid() {
  return <CartesianGrid vertical={false} stroke="#0f172a" strokeOpacity={0.05} strokeDasharray="5 10" />;
}
function SoftXAxis({ dataKey }: { dataKey: string }) {
  return (
    <XAxis
      dataKey={dataKey}
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 11, fill: "#94a3b8" }}
      dy={8}
    />
  );
}

export function ActivitiesBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="barBlueGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.08} />
            <stop offset="55%" stopColor="#3b82f6" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <SoftGrid />
        <SoftXAxis dataKey="name" />
        <Tooltip cursor={{ fill: "rgba(37,99,235,0.05)" }} content={<GlassTooltip unit="hoạt động" />} />
        <Bar dataKey="value" fill="url(#barBlueGrad)" radius={[8, 8, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TaskProgressPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={4}
          cornerRadius={8}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<GlassTooltip unit="nhiệm vụ" />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PostViewsAreaChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <SoftGrid />
        <SoftXAxis dataKey="name" />
        <Tooltip content={<GlassTooltip unit="lượt xem" />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#2563eb"
          strokeWidth={2.5}
          fill="url(#viewsGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ScoresHorizontalBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="barCyanGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke="#0f172a" strokeOpacity={0.05} strokeDasharray="5 10" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <Tooltip cursor={{ fill: "rgba(37,99,235,0.05)" }} content={<GlassTooltip unit="điểm" />} />
        <Bar dataKey="value" fill="url(#barCyanGrad)" radius={[0, 8, 8, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <SoftGrid />
        <SoftXAxis dataKey="name" />
        <Tooltip content={<GlassTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#06b6d4"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
