export const EXPENSE_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export function validateExpenseImportFile(file: unknown): { ok: true; file: File } | { ok: false; message: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "请选择要导入的微信或支付宝 CSV 文件。" };
  }

  if (file.size > EXPENSE_IMPORT_MAX_BYTES) {
    return { ok: false, message: "账单文件不能超过 10MB，请拆分后导入。" };
  }

  if (!/\.csv$/i.test(file.name)) {
    return { ok: false, message: "账单导入只支持 CSV 文件。" };
  }

  return { ok: true, file };
}
