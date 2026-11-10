"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LayerBadge } from "@/components/Layers";
import type { ChartSpec } from "@/lib/chart";

// One neutral series colour: blue/orange/purple are reserved for the content layers.
const BAR = "#475569";

/** A chart from data/chart/: always shows its source, and "from paper table" when typed from a paper. */
export default function DataChart({ spec, sourceTitle }: { spec: ChartSpec; sourceTitle: string }) {
  const plotted = spec.rows.filter((r) => r.numeric !== null).map((r) => ({ label: r.label, value: r.numeric as number }));
  const skipped = spec.rows.length - plotted.length;
  const unit = spec.unit ? ` (${spec.unit})` : "";
  return (
    <figure className="rounded-md border-l-8 border-blue-600 bg-blue-50 p-4">
      <figcaption className="mb-2 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <LayerBadge kind="nasa" />
          <span className="font-semibold">{spec.title}</span>
          {spec.kind === "paper_table" && (
            <span className="rounded border border-blue-700 px-2 py-0.5 text-xs font-medium text-blue-900">from paper table</span>
          )}
          {spec.kind === "psi_data" && (
            <span className="rounded border border-blue-700 px-2 py-0.5 text-xs font-medium text-blue-900">NASA PSI data</span>
          )}
        </div>
        <p className="text-sm text-neutral-700">
          Source: {spec.source_id} · {sourceTitle}
          {spec.page ? ` · PDF page ${spec.page}` : ""}
          {spec.source_note ? ` · ${spec.source_note}` : ""}
        </p>
      </figcaption>
      {plotted.length > 0 && (
        <div style={{ height: 36 * plotted.length + 50 }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plotted} layout="vertical" margin={{ top: 4, right: 40, bottom: 16, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="#cbd5e1" />
              <XAxis type="number" tick={{ fill: "#525252", fontSize: 12 }} axisLine={false} tickLine={false}
                label={{ value: `${spec.value_label}${unit}`, position: "insideBottom", offset: -8, fill: "#404040", fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={160} tick={{ fill: "#262626", fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#e2e8f0" }} formatter={(v) => [`${v}${spec.unit ? " " + spec.unit : ""}`, spec.value_label]} />
              <Bar dataKey="value" fill={BAR} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
                <LabelList dataKey="value" position="right" fill="#262626" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer">Show as a table (values exactly as written)</summary>
        <table className="mt-2 border-collapse">
          <thead>
            <tr>
              <th scope="col" className="border-b border-blue-300 px-2 py-1 text-left">Item</th>
              <th scope="col" className="border-b border-blue-300 px-2 py-1 text-left">{spec.value_label}{unit}</th>
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((r, i) => (
              <tr key={i}>
                <td className="border-b border-blue-100 px-2 py-1">{r.label}</td>
                <td className="border-b border-blue-100 px-2 py-1 font-mono">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {skipped > 0 && <p className="mt-1 text-xs text-neutral-600">{skipped} value(s) are not plain numbers, so they are in the table but not the bars.</p>}
      </details>
    </figure>
  );
}
