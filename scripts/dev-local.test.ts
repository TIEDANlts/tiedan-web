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
    const keepAliveIndex = script.indexOf('Write-Step "Keeping WSL alive for local port forwarding"');
    const startPostgresIndex = script.indexOf('Write-Step "Starting PostgreSQL in WSL Docker"');

    expect(script).toContain("wsl.exe");
    expect(script).toContain("--user");
    expect(script).toContain("root");
    expect(script).toContain("docker compose -f $ComposePath up -d");
    expect(script).toContain("Stop-WslKeepAlive");
    expect(script).toContain("nohup sh -c");
    expect(script).toContain("Wait-ForTcpPort");
    expect(script).toContain("Wait-ForPostgresReady");
    expect(script).toContain("Resolve-DatabaseHost");
    expect(script).toContain("Set-DatabaseHost");
    expect(script).toContain("Get-WslPrimaryIp");
    expect(keepAliveIndex).toBeGreaterThanOrEqual(0);
    expect(startPostgresIndex).toBeGreaterThanOrEqual(0);
    expect(keepAliveIndex).toBeLessThan(startPostgresIndex);
    expect(script).toMatch(/-FilePath "npx\.cmd"[\s\S]*"prisma", "migrate", "deploy"/);
    expect(script).toMatch(/-FilePath "npx\.cmd"[\s\S]*"prisma", "generate"/);
    expect(script).toMatch(/-FilePath "npm\.cmd"[\s\S]*"run", "db:seed"/);
    expect(script).toContain("& npm.cmd run dev");
  });

  test("uses the reachable PostgreSQL host for every Windows-side command", () => {
    const script = readFileSync(new URL("./dev-local.ps1", import.meta.url), "utf8");
    const resolveHostIndex = script.indexOf("$resolvedDatabaseHost = Resolve-DatabaseHost");
    const setHostIndex = script.indexOf("Set-DatabaseHost -HostName $resolvedDatabaseHost");
    const migrateIndex = script.indexOf('Write-Step "Applying Prisma migrations"');
    const devIndex = script.indexOf("& npm.cmd run dev");

    expect(resolveHostIndex).toBeGreaterThanOrEqual(0);
    expect(setHostIndex).toBeGreaterThan(resolveHostIndex);
    expect(setHostIndex).toBeLessThan(migrateIndex);
    expect(script).toContain("$env:DATABASE_URL");
    expect(devIndex).toBeGreaterThan(setHostIndex);
  });
});
