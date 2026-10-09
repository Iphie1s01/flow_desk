"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Box, Text, useColorModeValue } from "@chakra-ui/react";

const compact = (v: number) =>
  v >= 1e6
    ? `${+(v / 1e6).toFixed(1)}M`
    : v >= 1e3
      ? `${+(v / 1e3).toFixed(1)}k`
      : String(v);
const useColors = () => ({
  accent: useColorModeValue("#e8501a", "#ff6a2b"),
  grid: useColorModeValue("#d3cbb4", "#26382e"),
  text: useColorModeValue("#5f6d63", "#93a398"),
  tip: useColorModeValue("#f8f4e9", "#13211a"),
  ink: useColorModeValue("#14231c", "#e9e4d3"),
});

export function RevenueChart({
  data,
  currency,
}: {
  data: { label: string; value: number }[];
  currency: string;
}) {
  const c = useColors();
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  return (
    <Box h="250px" role="img" aria-label="Collected revenue over time">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: c.text, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: c.text, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={compact}
            width={42}
          />
          <Tooltip
            formatter={(v: number) => [fmt(v), "Collected"]}
            contentStyle={{
              background: c.tip,
              border: `1px solid ${c.ink}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={c.accent}
            strokeWidth={2}
            fill="url(#rv)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
export function BarList({
  data,
  currency,
  title,
}: {
  data: { label: string; value: number }[];
  currency: string;
  title: string;
}) {
  const c = useColors();
  if (!data.length)
    return (
      <Text color="mute" fontSize="sm">
        No data for this period.
      </Text>
    );
  return (
    <Box
      h={`${Math.max(120, data.length * 34)}px`}
      role="img"
      aria-label={title}
    >
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: c.text, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: c.grid, opacity: 0.4 }}
            formatter={(v: number) => [
              new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(v),
              "Collected",
            ]}
            contentStyle={{
              background: c.tip,
              border: `1px solid ${c.ink}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="value"
            fill={c.accent}
            radius={[0, 3, 3, 0]}
            barSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
