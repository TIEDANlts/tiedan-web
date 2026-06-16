import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

describe("local development launcher", () => {
  test("exposes a PowerShell one-command startup script through npm", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["dev:local"]).toBe(
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev-local.ps1",
    );
  });

  test("starts the required local services before launching Next dev", () => {
    const script = readFileSync(new URL("./dev-local.ps1", import.meta.url), "utf8");

    expect(script).toContain("wsl.exe");
    expect(script).toContain("-u");
    expect(script).toContain("root");
    expect(script).toContain("docker compose -f $ComposePath up -d");
    expect(script).toContain("Start-Process");
    expect(script).toContain("Wait-ForTcpPort");
    expect(script).toMatch(/-FilePath "npx\.cmd"[\s\S]*"prisma", "migrate", "deploy"/);
    expect(script).toMatch(/-FilePath "npx\.cmd"[\s\S]*"prisma", "generate"/);
    expect(script).toMatch(/-FilePath "npm\.cmd"[\s\S]*"run", "db:seed"/);
    expect(script).toContain("& npm.cmd run dev");
  });
});
