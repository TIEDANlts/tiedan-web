"use client";

import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  executeMediaImportAction,
  parseMediaImportFileAction,
  previewMediaImportAction,
  type MediaImportExecuteState,
  type MediaImportParseState,
  type MediaImportPreviewState,
} from "@/modules/media/actions";
import type { MediaImportMapping } from "@/modules/media/import-parser";
import {
  type MediaStatusValue,
  type MediaTypeValue,
  mediaStatusLabel,
  mediaStatuses,
  mediaTypeLabels,
  mediaTypes,
} from "@/modules/media/utils";

type WizardStep = 1 | 2 | 3 | 4;
type MappingKey = keyof MediaImportMapping;

const mappingFields: Array<{ key: MappingKey; label: string; required?: boolean }> = [
  { key: "title", label: "标题", required: true },
  { key: "type", label: "类型" },
  { key: "rating", label: "评分" },
  { key: "review", label: "短评" },
  { key: "markedAt", label: "标记日期" },
  { key: "link", label: "豆瓣链接" },
  { key: "year", label: "年份" },
  { key: "coverUrl", label: "封面 URL" },
  { key: "status", label: "状态" },
];

const initialStatusTextMap = {
  WISHLIST: "想看,想读,wishlist",
  DOING: "在看,在读,doing,progress",
  DONE: "看过,读过,done,complete",
  DROPPED: "弃,dropped",
} as const satisfies Record<MediaStatusValue, string>;

function StepBadge({ step, current, label }: { step: WizardStep; current: WizardStep; label: string }) {
  const active = current === step;
  const done = current > step;

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span
        className={
          active || done
            ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-module-media text-white"
            : "flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3"
        }
      >
        {done ? <CheckCircle2 className="size-4" /> : step}
      </span>
      <span className={active ? "font-medium text-ink" : "text-ink-2"}>{label}</span>
    </div>
  );
}

function buildStatusValueMap(statusTexts: Record<MediaStatusValue, string>) {
  const entries: Array<[string, MediaStatusValue]> = [];

  for (const status of mediaStatuses) {
    for (const value of statusTexts[status].split(",")) {
      const text = value.trim();
      if (text) {
        entries.push([text, status]);
      }
    }
  }

  return Object.fromEntries(entries);
}

function parseError(result: MediaImportParseState | null) {
  return result && !result.ok ? result.message : null;
}

function previewError(result: MediaImportPreviewState | null) {
  return result && !result.ok ? result.message : null;
}

function executeError(result: MediaImportExecuteState | null) {
  return result && !result.ok ? result.message : null;
}

export function MediaImportWizard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [parseResult, setParseResult] = useState<MediaImportParseState | null>(null);
  const [previewResult, setPreviewResult] = useState<MediaImportPreviewState | null>(null);
  const [executeResult, setExecuteResult] = useState<MediaImportExecuteState | null>(null);
  const [mapping, setMapping] = useState<MediaImportMapping | null>(null);
  const [defaultType, setDefaultType] = useState<MediaTypeValue>("BOOK");
  const [defaultStatus, setDefaultStatus] = useState<MediaStatusValue>("DONE");
  const [statusTexts, setStatusTexts] = useState<Record<MediaStatusValue, string>>(initialStatusTextMap);
  const [isPending, startTransition] = useTransition();
  const parsed = parseResult?.ok ? parseResult.parsed : null;
  const headers = parsed?.headers ?? [];

  function payload() {
    if (!parsed || !mapping) {
      return null;
    }

    return {
      rows: parsed.rows,
      mapping,
      defaults: {
        defaultType,
        defaultStatus,
        statusValueMap: buildStatusValueMap(statusTexts),
      },
    };
  }

  function uploadFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setParseResult({ ok: false, message: "请选择一个 CSV 或 XLSX 文件。" });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await parseMediaImportFileAction(formData);
      setParseResult(result);
      setPreviewResult(null);
      setExecuteResult(null);
      if (result.ok) {
        setMapping(result.mapping);
        setStep(2);
      }
    });
  }

  function preview() {
    const nextPayload = payload();
    if (!nextPayload) {
      return;
    }

    startTransition(async () => {
      const result = await previewMediaImportAction(nextPayload);
      setPreviewResult(result);
      if (result.ok) {
        setStep(3);
      }
    });
  }

  function execute() {
    const nextPayload = payload();
    if (!nextPayload) {
      return;
    }

    startTransition(async () => {
      const result = await executeMediaImportAction(nextPayload);
      setExecuteResult(result);
      if (result.ok) {
        setStep(4);
      }
    });
  }

  return (
    <div className="space-y-5">
      <nav className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
        <StepBadge step={1} current={step} label="上传" />
        <StepBadge step={2} current={step} label="列映射" />
        <StepBadge step={3} current={step} label="预览" />
        <StepBadge step={4} current={step} label="导入结果" />
      </nav>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-module-media/12 text-module-media">
              <FileSpreadsheet className="size-6" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ink">上传文件</h2>
              <p className="mt-2 text-sm leading-7 text-ink-2">
                支持 CSV 和 XLSX。CSV 会先按 UTF-8 解码，失败后回退 GBK。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" />
              <Button type="button" onClick={uploadFile} disabled={isPending}>
                <Upload className="size-4" />
                {isPending ? "正在解析..." : "解析文件"}
              </Button>
            </div>
            {parseError(parseResult) ? <p className="text-sm text-destructive">{parseError(parseResult)}</p> : null}
          </div>
        ) : null}

        {step === 2 && parsed && mapping ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ink">确认列映射</h2>
              <p className="mt-2 text-sm leading-7 text-ink-2">
                已读取 {parsed.rows.length} 行，编码：{parsed.encoding ?? "xlsx"}。自动预选可以手动调整。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {mappingFields.map((field) => (
                <label key={field.key} className="block space-y-2 text-sm font-medium text-ink">
                  <span>{field.label}{field.required ? " *" : ""}</span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(event) => setMapping({ ...mapping, [field.key]: event.target.value || null })}
                    className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                  >
                    <option value="">不映射</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium text-ink">
                <span>本批默认类型</span>
                <select
                  value={defaultType}
                  onChange={(event) => setDefaultType(event.target.value as MediaTypeValue)}
                  className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  {mediaTypes.map((type) => (
                    <option key={type} value={type}>
                      {mediaTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium text-ink">
                <span>本批默认状态</span>
                <select
                  value={defaultStatus}
                  onChange={(event) => setDefaultStatus(event.target.value as MediaStatusValue)}
                  className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  {mediaStatuses.map((status) => (
                    <option key={status} value={status}>
                      {mediaStatusLabel(defaultType, status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mapping.status ? (
              <div className="grid gap-3 rounded-lg bg-surface-2 p-4 md:grid-cols-2">
                {mediaStatuses.map((status) => (
                  <label key={status} className="block space-y-2 text-sm font-medium text-ink">
                    <span>{mediaStatusLabel(defaultType, status)} 对应值</span>
                    <Input
                      value={statusTexts[status]}
                      onChange={(event) => setStatusTexts({ ...statusTexts, [status]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                重新上传
              </Button>
              <Button type="button" onClick={preview} disabled={isPending || !mapping.title}>
                {isPending ? "正在预览..." : "生成预览"}
              </Button>
            </div>
            {previewError(previewResult) ? <p className="text-sm text-destructive">{previewError(previewResult)}</p> : null}
          </div>
        ) : null}

        {step === 3 && previewResult?.ok ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ink">预览导入</h2>
              <p className="mt-2 text-sm leading-7 text-ink-2">
                共 {previewResult.stats.total} 行，可解析 {previewResult.stats.valid} 行，将导入 {previewResult.stats.willImport} 行，跳过疑似重复 {previewResult.stats.duplicates} 行。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-module-media/12 p-3 text-module-media">将导入 {previewResult.stats.willImport}</div>
              <div className="rounded-lg bg-surface-2 p-3 text-ink-2">疑似重复 {previewResult.stats.duplicates}</div>
              <div className="rounded-lg bg-surface-2 p-3 text-ink-2">解析成功 {previewResult.stats.valid}</div>
              <div className="rounded-lg bg-surface-2 p-3 text-ink-2">解析失败 {previewResult.stats.invalid}</div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="bg-surface-2 text-ink-2">
                  <tr>
                    <th className="px-3 py-2">行</th>
                    <th className="px-3 py-2">标题</th>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">评分</th>
                    <th className="px-3 py-2">日期</th>
                    <th className="px-3 py-2">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-border">
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.title || "-"}</td>
                      <td className="px-3 py-2">{mediaTypeLabels[row.type]}</td>
                      <td className="px-3 py-2">{mediaStatusLabel(row.type, row.status)}</td>
                      <td className="px-3 py-2">{row.rating ? `${row.rating}/10` : "-"}</td>
                      <td className="px-3 py-2">{row.markedAt ?? "-"}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="text-destructive">{row.error}</span>
                        ) : row.duplicate ? (
                          <span className="text-ink-3">重复跳过</span>
                        ) : (
                          <span className="text-module-media">可导入</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                返回映射
              </Button>
              <Button type="button" onClick={execute} disabled={isPending}>
                {isPending ? "正在导入..." : "执行导入"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 && executeResult?.ok ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 size-6 text-module-media" />
              <div>
                <h2 className="font-heading text-2xl font-semibold text-ink">导入完成</h2>
                <p className="mt-2 text-sm leading-7 text-ink-2">
                  成功 {executeResult.success} 行，跳过 {executeResult.skipped} 行，失败 {executeResult.failed} 行。
                </p>
              </div>
            </div>

            {executeResult.reasons.length > 0 ? (
              <div className="space-y-2 rounded-lg bg-surface-2 p-4">
                {executeResult.reasons.map((reason, index) => (
                  <div key={`${reason.rowNumber}-${index}`} className="flex gap-2 text-sm text-ink-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-module-media" />
                    <span>
                      第 {reason.rowNumber} 行：{reason.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(1)}>
                继续导入
              </Button>
            </div>
            {executeError(executeResult) ? <p className="text-sm text-destructive">{executeError(executeResult)}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
