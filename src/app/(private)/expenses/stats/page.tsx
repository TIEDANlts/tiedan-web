import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, ListFilter, ReceiptText } from "lucide-react";
import Link from "next/link";

import {
  DailyExpenseBar,
  MonthCategoryPie,
  TopMerchantBar,
  WeekCompareBar,
  WeekdayAverageBar,
  YearTrendLine,
} from "@/app/(private)/expenses/stats/expense-stats-charts";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  getExpenseMonthStats,
  getExpenseWeekStats,
  getExpenseYearStats,
  parseExpenseStatsParams,
  type ExpenseStatsSearchParams,
  type ExpenseStatsView,
} from "@/modules/expenses/stats";

export const dynamic = "force-dynamic";

function viewHref(view: ExpenseStatsView, period: { month: string; week: string; year: string }) {
  const params = new URLSearchParams({ view });
  if (view === "month") {
    params.set("month", period.month);
  }
  if (view === "week") {
    params.set("week", period.week);
  }
  if (view === "year") {
    params.set("year", period.year);
  }
  return `/expenses/stats?${params.toString()}`;
}

function switchHref(view: ExpenseStatsView, value: string) {
  const params = new URLSearchParams({ view });
  params.set(view === "month" ? "month" : view === "week" ? "week" : "year", value);
  return `/expenses/stats?${params.toString()}`;
}

function ViewTabs({ active, period }: { active: ExpenseStatsView; period: { month: string; week: string; year: string } }) {
  const tabs: Array<{ value: ExpenseStatsView; label: string }> = [
    { value: "month", label: "月视图" },
    { value: "week", label: "周视图" },
    { value: "year", label: "年视图" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={viewHref(tab.value, period)}
          className={
            active === tab.value
              ? "rounded-md bg-module-expenses px-3 py-1.5 text-sm font-medium text-white shadow-sm"
              : "rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function PeriodSwitcher({
  view,
  label,
  prev,
  next,
}: {
  view: ExpenseStatsView;
  label: string;
  prev: string;
  next: string;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={switchHref(view, prev)} aria-label="上一个周期">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <span className="min-w-32 px-4 text-center font-heading text-lg font-semibold text-ink">{label}</span>
      <Button asChild variant="ghost" size="icon">
        <Link href={switchHref(view, next)} aria-label="下一个周期">
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "expense" | "income";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-sm text-ink-2">{label}</p>
      <p
        className={
          tone === "expense"
            ? "mt-3 font-heading text-2xl font-semibold tabular-nums text-destructive"
            : tone === "income"
              ? "mt-3 font-heading text-2xl font-semibold tabular-nums text-module-trips"
              : "mt-3 font-heading text-2xl font-semibold tabular-nums text-ink"
        }
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function MonthCategoryTable({ rows }: { rows: Awaited<ReturnType<typeof getExpenseMonthStats>>["categoryDetails"] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[46rem] text-sm">
        <thead className="bg-surface-2 text-left text-ink-2">
          <tr>
            <th className="px-4 py-3 font-medium">分类</th>
            <th className="px-4 py-3 font-medium">金额</th>
            <th className="px-4 py-3 font-medium">笔数</th>
            <th className="px-4 py-3 font-medium">占比</th>
            <th className="px-4 py-3 font-medium">环比</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.categoryId ?? "uncategorized"}>
              <td className="px-4 py-3 text-ink">
                {row.icon ? `${row.icon} ` : ""}
                {row.name}
              </td>
              <td className="px-4 py-3 font-medium tabular-nums text-destructive">{row.amountText}</td>
              <td className="px-4 py-3 tabular-nums text-ink-2">{row.count}</td>
              <td className="px-4 py-3 tabular-nums text-ink-2">{row.shareText}</td>
              <td className="px-4 py-3 tabular-nums text-ink-2">{row.momText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function MonthView({ month }: { month: string }) {
  const data = await getExpenseMonthStats(month);

  if (!data.hasData) {
    return <EmptyState title="这个月还没有可分析的流水。" description="记一笔或导入账单后，分类、商户和每日趋势会在这里展开。" icon={<BarChart3 className="size-5" />} />;
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="本月支出" value={data.summary.expenseText} hint={`环比 ${data.summary.expenseMomText}`} tone="expense" />
        <MetricCard label="本月收入" value={data.summary.incomeText} tone="income" />
        <MetricCard label="结余" value={data.summary.balanceText} />
        <MetricCard label="分类数" value={`${data.categoryDetails.length} 类`} hint="仅统计支出分类" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartSection title="分类占比">
          <MonthCategoryPie data={data.categoryDetails} month={month} />
        </ChartSection>
        <ChartSection title="每日支出">
          <DailyExpenseBar data={data.dailyExpenses} month={month} />
        </ChartSection>
      </div>
      <ChartSection title="Top 10 商户">
        <TopMerchantBar data={data.topMerchants} />
      </ChartSection>
      <ChartSection title="分类明细">
        <MonthCategoryTable rows={data.categoryDetails} />
      </ChartSection>
    </>
  );
}

async function WeekView({ week }: { week: string }) {
  const data = await getExpenseWeekStats(week);

  if (!data.hasData) {
    return <EmptyState title="这两周还没有支出记录。" description="周视图会比较本周和上周，也会按最近 8 周估算星期消费习惯。" icon={<CalendarDays className="size-5" />} />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartSection title="本周 / 上周按日对比">
        <WeekCompareBar data={data} />
      </ChartSection>
      <ChartSection title="最近 8 周星期平均">
        <WeekdayAverageBar data={data.weekdayAverages} />
      </ChartSection>
    </div>
  );
}

async function YearView({ year }: { year: string }) {
  const data = await getExpenseYearStats(year);

  if (!data.hasData) {
    return <EmptyState title="这一年还没有可分析的流水。" description="年视图会固定展示 12 个月趋势，导入账单后可以用它看整年的收入、支出和结余。" icon={<BarChart3 className="size-5" />} />;
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="年度总支出" value={data.summary.expenseText} tone="expense" />
        <MetricCard label="年度总收入" value={data.summary.incomeText} tone="income" />
        <MetricCard label="年度结余" value={data.summary.balanceText} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartSection title="12 个月趋势">
          <YearTrendLine data={data.trend} />
        </ChartSection>
        <ChartSection title="年度分类占比">
          <MonthCategoryPie data={data.categoryDetails} month={`${year}-01`} />
        </ChartSection>
      </div>
    </>
  );
}

export default async function ExpenseStatsPage({ searchParams }: { searchParams: Promise<ExpenseStatsSearchParams> }) {
  const period = parseExpenseStatsParams(await searchParams);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-expenses">消费报表</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">消费分析</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">按月、周、年拆开看收入和支出，所有报表都排除不计收支流水。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/expenses">
              <ListFilter className="size-4" />
              回到流水
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/expenses/import">
              <ReceiptText className="size-4" />
              导入账单
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewTabs active={period.view} period={period} />
        <PeriodSwitcher
          view={period.view}
          label={period.view === "month" ? period.month : period.view === "week" ? period.week : period.year}
          prev={period.view === "month" ? period.prevMonth : period.view === "week" ? period.prevWeek : period.prevYear}
          next={period.view === "month" ? period.nextMonth : period.view === "week" ? period.nextWeek : period.nextYear}
        />
      </div>

      {period.view === "month" ? <MonthView month={period.month} /> : null}
      {period.view === "week" ? <WeekView week={period.week} /> : null}
      {period.view === "year" ? <YearView year={period.year} /> : null}
    </main>
  );
}
