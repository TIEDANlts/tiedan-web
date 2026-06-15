import { Buffer } from "node:buffer";

export type JsonTableMap = Record<string, unknown[]>;

type CreateJsonZipInput = {
  generatedAt: string;
  tables: JsonTableMap;
};

const ZIP_NOTE = "图片不包含在导出包内；JSON 保留图片 URL/key，图片随服务器 uploads 卷与每日备份保存。";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function localHeader(filename: Buffer, content: Buffer, checksum: number, offsetDate = new Date()) {
  const { dosDate, dosTime } = dosDateTime(offsetDate);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(filename.length, 26);

  return Buffer.concat([header, filename, content]);
}

function centralHeader(filename: Buffer, content: Buffer, checksum: number, offset: number, offsetDate = new Date()) {
  const { dosDate, dosTime } = dosDateTime(offsetDate);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(dosTime, 12);
  header.writeUInt16LE(dosDate, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(content.length, 20);
  header.writeUInt32LE(content.length, 24);
  header.writeUInt16LE(filename.length, 28);
  header.writeUInt32LE(offset, 42);

  return Buffer.concat([header, filename]);
}

function endRecord(entryCount: number, centralSize: number, centralOffset: number) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);

  return record;
}

function jsonBuffer(value: unknown) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createJsonZip(input: CreateJsonZipInput) {
  const manifest = {
    exportedAt: input.generatedAt,
    tables: Object.fromEntries(
      Object.entries(input.tables).map(([table, rows]) => [
        table,
        {
          file: `${table}.json`,
          count: rows.length,
        },
      ]),
    ),
    note: ZIP_NOTE,
  };
  const entries = [
    ...Object.entries(input.tables).map(([table, rows]) => ({
      name: `${table}.json`,
      content: jsonBuffer(rows),
    })),
    {
      name: "manifest.json",
      content: jsonBuffer(manifest),
    },
  ].sort((a, b) => a.name.localeCompare(b.name));

  let offset = 0;
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const timestamp = new Date(input.generatedAt);

  for (const entry of entries) {
    const filename = Buffer.from(entry.name, "utf8");
    const checksum = crc32(entry.content);
    const local = localHeader(filename, entry.content, checksum, timestamp);
    const central = centralHeader(filename, entry.content, checksum, offset, timestamp);

    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  return Buffer.concat([...localParts, central, endRecord(entries.length, central.length, offset)]);
}

export function readJsonZipEntries(zip: Buffer) {
  const entries: Record<string, unknown> = {};
  let offset = 0;

  while (offset < zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = zip.readUInt32LE(offset + 18);
    const filenameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + filenameLength;
    const contentStart = nameEnd + extraLength;
    const contentEnd = contentStart + compressedSize;
    const name = zip.subarray(nameStart, nameEnd).toString("utf8");
    const content = zip.subarray(contentStart, contentEnd).toString("utf8");

    entries[name] = JSON.parse(content);
    offset = contentEnd;
  }

  return entries;
}
