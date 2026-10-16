"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Single series, so one neutral colour and no legend. Blue/orange/purple are reserved
// for the three content layers and are never used for chart data.
const BAR = "#475569";

export default function HazardChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div style={{ height: 36 * data.length + 40 }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} stroke="#e5e5e5" />
          <XAxis type="number" domain={[0, "dataMax"]} allowDecimals={false} tick={{ fill: "#525252", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fill: "#262626", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "#f5f5f5" }} formatter={(v) => [v, "Verified cards"]} />
          <Bar dataKey="count" fill={BAR} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" fill="#262626" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
