"use client";

import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";

import { baseChartOption, ExpenseChart, useExpenseChartTheme } from "@/components/expense-chart";
import type { getExpenseMonthStats, getExpenseWeekStats, getExpenseYearStats } from "@/modules/expenses/stats";

type MonthStats = Awaited<ReturnType<typeof getExpenseMonthStats>>;
type WeekStats = Awaited<ReturnType<typeof getExpenseWeekStats>>;
type YearStats = Awaited<ReturnType<typeof getExpenseYearStats>>;

function moneyTooltip(params: unknown) {
  if (!Array.isArray(params)) {
    return "";
  }
  return params
    .map((item) => {
      const point = item as { marker?: string; seriesName?: string; name?: string; value?: string | number };
      return `${point.marker ?? ""}${point.seriesName ?? point.name}: ¥${point.value ?? "0.00"}`;
    })
    .join("<br/>");
}

export function MonthCategoryPie({ data, month }: { data: MonthStats["categoryDetails"]; month: string }) {
  const theme = useExpenseChartTheme();
  const router = useRouter();
  const option: EChartsOption = {
    ...baseChartOption(theme),
    tooltip: { ...baseChartOption(theme).tooltip, trigger: "item" },
    legend: { bottom: 0, textStyle: { color: theme.ink2 } },
    series: [
      {
        name: "分类支出",
        type: "pie",
        radius: ["44%", "68%"],
        center: ["50%", "43%"],
        data: data.map((item) => ({
          name: item.name,
          value: Number(item.amount),
          categoryId: item.categoryId,
        })),
      },
    ],
  };

  return (
    <ExpenseChart
      option={option}
      onEvents={{
        click: (params) => {
          const data = (params as { data?: { categoryId?: string | null } }).data;
          const href = data?.categoryId
            ? `/expenses?month=${month}&category=${encodeURIComponent(data.categoryId)}`
            : `/expenses?month=${month}`;
          router.push(href);
        },
      }}
    />
  );
}

export function DailyExpenseBar({ data, month }: { data: MonthStats["dailyExpenses"]; month: string }) {
  const theme = useExpenseChartTheme();
  const router = useRouter();
  const option: EChartsOption = {
    ...baseChartOption(theme),
    tooltip: { ...baseChartOption(theme).tooltip, formatter: moneyTooltip },
    xAxis: { type: "category", data: data.map((item) => item.date.slice(5)), axisLabel: { color: theme.ink2 } },
    yAxis: { type: "value", axisLabel: { color: theme.ink3 }, splitLine: { lineStyle: { color: theme.border } } },
    series: [{ name: "支出", type: "bar", data: data.map((item) => item.amount), itemStyle: { color: theme.expenses } }],
  };

  return (
    <ExpenseChart
      option={option}
      onEvents={{
        click: (params) => {
          const index = (params as { dataIndex?: number }).dataIndex ?? 0;
          const date = data[index]?.date;
          if (date) {
            router.push(`/expenses?month=${month}&date=${date}&direction=EXPENSE`);
          }
        },
      }}
    />
  );
}

export function TopMerchantBar({ data }: { data: MonthStats["topMerchants"] }) {
  const theme = useExpenseChartTheme();
  const option: EChartsOption = {
    ...baseChartOption(theme),
    tooltip: { ...baseChartOption(theme).tooltip, formatter: moneyTooltip },
    xAxis: { type: "value", axisLabel: { color: theme.ink3 }, splitLine: { lineStyle: { color: theme.border } } },
    yAxis: {
      type: "category",
      data: [...data].reverse().map((item) => item.merchant),
      axisLabel: { color: theme.ink2 },
    },
    series: [
      {
        name: "支出",
        type: "bar",
        data: [...data].reverse().map((item) => item.amount),
        itemStyle: { color: theme.expenses },
      },
    ],
  };

  return <ExpenseChart option={option} height={340} />;
}

export function WeekCompareBar({ data }: { data: WeekStats }) {
  const theme = useExpenseChartTheme();
  const option: EChartsOption = {
    ...baseChartOption(theme),
    tooltip: { ...baseChartOption(theme).tooltip, formatter: moneyTooltip },
    legend: { top: 0, textStyle: { color: theme.ink2 } },
    xAxis: { type: "category", data: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"], axisLabel: { color: theme.ink2 } },
    yAxis: { type: "value", axisLabel: { color: theme.ink3 }, splitLine: { lineStyle: { color: theme.border } } },
    series: [
      { name: "本周", type: "bar", data: data.currentWeek.map((item) => item.amount), itemStyle: { color: theme.expenses } },
      { name: "上周", type: "bar", data: data.previousWeek.map((item) => item.amount), itemStyle: { color: theme.primary } },
    ],
  };

  return <ExpenseChart option={option} />;
}

export function WeekdayAverageBar({ data }: { data: WeekStats["weekdayAverages"] }) {
  const theme = useExpenseChartTheme();
  const option: EChartsOption = {
    ...baseChartOption(theme),
    tooltip: { ...baseChartOption(theme).tooltip, formatter: moneyTooltip },
    xAxis: { type: "category", data: data.map((item) => item.label), axisLabel: { color: theme.ink2 } },
    yAxis: { type: "value", axisLabel: { color: theme.ink3 }, splitLine: { lineStyle: { color: theme.border } } },
    series: [{ name: "8周平均", type: "bar", data: data.map((item) => item.amount), itemStyle: { color: theme.income } }],
  };

  return <ExpenseChart option={option} />;
}

export function YearTrendLine({ data }: { data: YearStats["trend"] }) {
  const theme = useExpenseChartTheme();
  const option: EChartsOption = {
    ...baseChartOption(theme),
    tooltip: { ...baseChartOption(theme).tooltip, formatter: moneyTooltip },
    legend: { top: 0, textStyle: { color: theme.ink2 } },
    xAxis: { type: "category", data: data.map((item) => item.month.slice(5)), axisLabel: { color: theme.ink2 } },
    yAxis: { type: "value", axisLabel: { color: theme.ink3 }, splitLine: { lineStyle: { color: theme.border } } },
    series: [
      { name: "支出", type: "line", smooth: true, data: data.map((item) => item.expense), itemStyle: { color: theme.expenses } },
      {
        name: "收入",
        type: "line",
        smooth: true,
        data: data.map((item) => item.income),
        lineStyle: { type: "dashed", color: theme.income },
        itemStyle: { color: theme.income },
      },
    ],
  };

  return <ExpenseChart option={option} />;
}
