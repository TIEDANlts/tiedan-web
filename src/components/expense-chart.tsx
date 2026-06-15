"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type ExpenseChartTheme = {
  ink: string;
  ink2: string;
  ink3: string;
  border: string;
  surface: string;
  expenses: string;
  income: string;
  primary: string;
  palette: string[];
};

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readTheme(): ExpenseChartTheme {
  return {
    ink: readCssVar("--ink", "#2B2622"),
    ink2: readCssVar("--ink-2", "#6B6259"),
    ink3: readCssVar("--ink-3", "#776D63"),
    border: readCssVar("--border", "#E7DECF"),
    surface: readCssVar("--surface", "#FFFFFF"),
    expenses: readCssVar("--module-expenses", "#D6537E"),
    income: readCssVar("--module-trips", "#1F9E86"),
    primary: readCssVar("--primary", "#9A5B2D"),
    palette: [
      readCssVar("--module-expenses", "#D6537E"),
      readCssVar("--module-media", "#D08A1E"),
      readCssVar("--module-trips", "#1F9E86"),
      readCssVar("--module-games", "#8A4FA0"),
      readCssVar("--module-todos", "#3B82C4"),
      readCssVar("--module-special-days", "#F59E0B"),
      readCssVar("--module-links", "#64748B"),
    ],
  };
}

export function useExpenseChartTheme() {
  const [theme, setTheme] = useState<ExpenseChartTheme>(() => readTheme());

  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function baseChartOption(theme: ExpenseChartTheme): EChartsOption {
  return {
    color: theme.palette,
    backgroundColor: "transparent",
    textStyle: {
      color: theme.ink2,
      fontFamily: "inherit",
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.ink },
    },
    grid: {
      left: 12,
      right: 12,
      top: 24,
      bottom: 16,
      containLabel: true,
    },
  };
}

export function ExpenseChart({
  option,
  loading = false,
  height = 320,
  className,
  onEvents,
}: {
  option: EChartsOption;
  loading?: boolean;
  height?: number;
  className?: string;
  onEvents?: Record<string, (params: unknown) => void>;
}) {
  const style = useMemo(() => ({ height, width: "100%" }), [height]);

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-3", className)}>
      {loading ? (
        <div className="flex h-full min-h-56 items-center justify-center text-sm text-ink-2">图表正在整理数据...</div>
      ) : (
        <ReactECharts option={option} style={style} notMerge lazyUpdate onEvents={onEvents} />
      )}
    </div>
  );
}
