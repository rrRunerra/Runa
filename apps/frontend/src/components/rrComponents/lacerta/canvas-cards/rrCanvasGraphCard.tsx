"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { CanvasNode } from "../types";

interface RrCanvasGraphCardProps {
  node: CanvasNode;
}

export default function RrCanvasGraphCard({ node }: RrCanvasGraphCardProps) {
  const currentData = node.graphData || [];

  return (
    <div
      className="relative w-full h-full flex flex-col p-3 text-foreground bg-card/65 overflow-hidden"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1.5 shrink-0">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Interactive Graph ({node.graphType || "bar"})
        </span>
      </div>

      <div className="flex-1 w-full min-h-0 select-none text-[8px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {node.graphType === "line" ? (
            <LineChart
              data={currentData}
              margin={{
                top: 5,
                right: 10,
                left: -32,
                bottom: 0,
              }}
            >
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={8}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={8}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "9px",
                  color: "var(--popover-foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          ) : node.graphType === "pie" ? (
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "9px",
                  color: "var(--popover-foreground)",
                }}
              />
              <Pie
                data={currentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={42}
                fill="var(--primary)"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
                style={{
                  fontSize: "7px",
                  fill: "var(--muted-foreground)",
                }}
              >
                {currentData.map((entry, index) => {
                  const colors = [
                    "var(--primary)",
                    "var(--success)",
                    "var(--warning)",
                    "var(--destructive)",
                    "var(--muted-foreground)",
                  ];
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          ) : (
            <BarChart
              data={currentData}
              margin={{
                top: 5,
                right: 10,
                left: -32,
                bottom: 0,
              }}
            >
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={8}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={8}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "9px",
                  color: "var(--popover-foreground)",
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--primary)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
