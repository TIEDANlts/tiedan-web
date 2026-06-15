"use client";

import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  executeExpenseImportAction,
  parseExpenseImportFileAction,
  previewExpenseImportAction,
  type ExpenseImportParseState,
  type ExpenseImportPreviewState,
} from "@/modules/expenses/actions";
import type { ExpenseImportPlatform } from "@/modules/expenses/parsers";
import { expenseDirectionLabels } from "@/modules/expenses/utils";

type Step = 1 | 2 | 3;

const platformLabels = {
  alipay: "支付宝",
  wechat: "微信",
} as const satisfies Record<ExpenseImportPlatform, string>;

function StepBadge({ step, current, label }: { step: Step; current: Step; label: string }) {
  const active = current === step;
  const done = current > step;

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span
        className={
          active || done
            ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-module-expenses text-white"
            : "flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3"
        }
      >
        {done ? <CheckCircle2 className="size-4" /> : step}
      </span>
      <span className={active ? "font-medium text-ink" : "text-ink-2"}>{label}</span>
    </div>
  );
}

function parseError(result: ExpenseImportParseState | null) {
  return result && !result.ok ? result.message : null;
}

function previewError(result: ExpenseImportPreviewState | null) {
  return result && !result.ok ? result.message : null;
}

export function ExpenseImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [parseResult, setParseResult] = useState<ExpenseImportParseState | null>(null);
  const [previewResult, setPreviewResult] = useState<ExpenseImportPreviewState | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<ExpenseImportPlatform>("wechat");
  const [isPending, startTransition] = useTransition();
  const parsed = parseResult?.ok ? parseResult : null;
  const preview = previewResult?.ok ? previewResult : null;

  function uploadFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setParseResult({ ok: false, message: "请选择一个微信或支付宝 CSV 文件。" });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await parseExpenseImportFileAction(formData);
      setParseResult(result);
      setPreviewResult(null);
      if (result.ok) {
        setSelectedPlatform(result.selectedPlatform ?? "wechat");
        setStep(2);
      }
    });
  }

  function previewFile() {
    if (!parsed) {
      return;
    }

    startTransition(async () => {
      const result = await previewExpenseImportAction({
        payload: parsed.payload,
        fileName: parsed.fileName,
        platform: selectedPlatform,
      });
      setPreviewResult(result);
      if (result.ok) {
        setStep(3);
      }
    });
  }

  function executeImport() {
    if (!preview) {
      return;
    }

    startTransition(async () => {
      const result = await executeExpenseImportAction({
        payload: preview.payload,
        fileName: preview.fileName,
        platform: preview.platform,
      });
      if (result.ok) {
        router.push(`/expenses/import/result/${result.batchId}`);
      } else {
        setPreviewResult(result);
      }
    });
  }

  return (
    <div className="space-y-5">
      <nav className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
        <StepBadge step={1} current={step} label="上传" />
        <StepBadge step={2} current={step} label="确认平台" />
        <StepBadge step={3} current={step} label="预览导入" />
      </nav>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-module-expenses/12 text-module-expenses">
              <FileSpreadsheet className="size-6" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ink">上传账单</h2>
              <p className="mt-2 text-sm leading-7 text-ink-2">
                支持微信和支付宝官方导出的 CSV。支付宝 GBK 编码会自动识别。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input ref={fileInputRef} type="file" accept=".csv" />
              <Button type="button" onClick={uploadFile} disabled={isPending}>
                <Upload className="size-4" />
                {isPending ? "正在解析..." : "解析文件"}
              </Button>
            </div>
            {parseError(parseResult) ? <p className="text-sm text-destructive">{parseError(parseResult)}</p> : null}
          </div>
        ) : null}

        {step === 2 && parsed ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ink">确认平台</h2>
              <p className="mt-2 text-sm leading-7 text-ink-2">
                文件：{parsed.fileName}；编码：{parsed.encoding}。{parsed.message ?? "已自动识别平台。"}
              </p>
            </div>
            <label className="block space-y-2 text-sm font-medium text-ink">
              <span>账单平台</span>
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value as ExpenseImportPlatform)}
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                重新上传
              </Button>
              <Button type="button" onClick={previewFile} disabled={isPending}>
                {isPending ? "正在生成..." : "生成预览"}
              </Button>
            </div>
            {previewError(previewResult) ? <p className="text-sm text-destructive">{previewError(previewResult)}</p> : null}
          </div>
        ) : null}

        {step === 3 && preview ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ink">预览导入</h2>
              <p className="mt-2 text-sm leading-7 text-ink-2">
                {platformLabels[preview.platform]}账单：成功解析 {preview.stats.parsed} 行，将导入 {preview.stats.willImport} 行。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-module-expenses/12 p-3 text-module-expenses">解析成功 {preview.stats.parsed}</div>
              <div className="rounded-lg bg-module-expenses/12 p-3 text-module-expenses">将导入 {preview.stats.willImport}</div>
              <div className="rounded-lg bg-surface-2 p-3 text-ink-2">重复跳过 {preview.stats.duplicate}</div>
              <div className="rounded-lg bg-surface-2 p-3 text-ink-2">状态过滤 {preview.stats.filtered}</div>
              <div className="rounded-lg bg-surface-2 p-3 text-ink-2">解析失败 {preview.stats.failed}</div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[58rem] text-left text-sm">
                <thead className="bg-surface-2 text-ink-2">
                  <tr>
                    <th className="px-3 py-2">行</th>
                    <th className="px-3 py-2">时间</th>
                    <th className="px-3 py-2">商户</th>
                    <th className="px-3 py-2">商品</th>
                    <th className="px-3 py-2">方向</th>
                    <th className="px-3 py-2">金额</th>
                    <th className="px-3 py-2">分类</th>
                    <th className="px-3 py-2">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.txnNo} className="border-t border-border">
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.txnTime}</td>
                      <td className="px-3 py-2">{row.merchant ?? "-"}</td>
                      <td className="px-3 py-2">{row.item ?? "-"}</td>
                      <td className="px-3 py-2">{expenseDirectionLabels[row.direction]}</td>
                      <td className="px-3 py-2">¥{row.amount}</td>
                      <td className="px-3 py-2">{row.categoryId ? "已命中" : "未分类"}</td>
                      <td className="px-3 py-2">
                        {row.duplicate ? (
                          <span className="text-ink-3">重复跳过</span>
                        ) : (
                          <span className="text-module-expenses">可导入</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.errors.length > 0 ? (
              <div className="space-y-2 rounded-lg bg-surface-2 p-4">
                <h3 className="font-medium text-ink">解析失败行</h3>
                {preview.errors.map((error) => (
                  <div key={`${error.rowNumber}-${error.txnNo ?? "unknown"}`} className="flex gap-2 text-sm text-ink-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>
                      第 {error.rowNumber} 行：{error.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                返回
              </Button>
              <Button type="button" onClick={executeImport} disabled={isPending || preview.stats.willImport === 0}>
                {isPending ? "正在导入..." : "确认导入"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
