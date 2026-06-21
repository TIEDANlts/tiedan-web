import { execFileSync } from "node:child_process";

export const e2eDbUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://personal_site:personal_site@127.0.0.1:5432/personal_site?schema=public";

function toWslPath(windowsPath: string) {
  const normalized = windowsPath.replace(/\\/g, "/");
  const drive = normalized.slice(0, 1).toLowerCase();
  return `/mnt/${drive}${normalized.slice(2)}`;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function runDbAdmin<T>(command: string, payload: unknown = {}): T {
  const repoPath = shellQuote(toWslPath(process.cwd()));
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const script = [
    `cd ${repoPath}`,
    `DATABASE_URL=${shellQuote(e2eDbUrl)} npx tsx e2e/support/db-admin.ts ${shellQuote(command)} ${shellQuote(encodedPayload)}`,
  ].join(" && ");

  const output = execFileSync("wsl.exe", ["-d", "Ubuntu-24.04", "-u", "root", "--", "sh", "-lc", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(output) as T;
}

export function cleanupE2eData(prefix: string) {
  runDbAdmin("cleanup", { prefix });
}

export type SeedResult = {
  slugBase: string;
  postSlug: string;
  tripId: string;
  mediaId: string;
  categoryId: string | null;
  today: string;
};

export function seedE2eData(prefix: string) {
  return runDbAdmin<SeedResult>("seed", { prefix });
}
