export const MEDIA_IMPORT_MAX_BYTES = 20 * 1024 * 1024;

export function validateMediaImportFile(file: unknown): { ok: true; file: File } | { ok: false; message: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "请选择要导入的 CSV 或 XLSX 文件。" };
  }

  if (file.size > MEDIA_IMPORT_MAX_BYTES) {
    return { ok: false, message: "书影导入文件不能超过 20MB，请拆分后导入。" };
  }

  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return { ok: false, message: "只支持 CSV 或 XLSX 文件。" };
  }

  return { ok: true, file };
}
