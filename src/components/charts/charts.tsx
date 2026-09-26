"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

const COLORS = ["#da251d", "#ffcd29", "#0ea5e9", "#10b981", "#8b5cf6", "#f97316"];

export function ActivitiesBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip formatter={(v) => [`${v} hoạt động`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="value" fill="#da251d" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TaskProgressPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} nhiệm vụ`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PostViewsAreaChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#da251d" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#da251d" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => [`${Number(v).toLocaleString("vi-VN")} lượt xem`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Area type="monotone" dataKey="value" stroke="#da251d" strokeWidth={2} fill="url(#viewsGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ScoresHorizontalBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => [`${v} điểm`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="value" fill="#ffcd29" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip formatter={(v) => [v, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
