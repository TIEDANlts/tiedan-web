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
    const startPostgresIndex = script.indexOf('Write-Step "Starting PostgreSQL in WSL Docker"');
    const migrateIndex = script.indexOf('Write-Step "Applying Prisma migrations in WSL"');
    const devIndex = script.indexOf('Write-Step "Starting Next.js dev server in WSL"');

    expect(script).toContain("wsl.exe");
    expect(script).toContain("wsl.exe -d $wslDistro -u root");
    expect(script).not.toContain("--distribution");
    expect(script).not.toContain("--user");
    expect(script).toContain("root");
    expect(script).toContain("docker compose -f $ComposePath up -d");
    expect(script).toContain("Wait-ForPostgresReady");
    expect(startPostgresIndex).toBeGreaterThanOrEqual(0);
    expect(migrateIndex).toBeGreaterThan(startPostgresIndex);
    expect(devIndex).toBeGreaterThan(migrateIndex);
    expect(script).toContain("$wslDatabaseEnv npx prisma migrate deploy");
    expect(script).toContain("$wslDatabaseEnv npx prisma generate");
    expect(script).toContain("$wslDatabaseEnv npm run db:seed");
    expect(script).toContain("$wslDatabaseEnv npm run dev -- --hostname 0.0.0.0");
  });

  test("runs database-dependent commands inside WSL instead of Windows port forwarding", () => {
    const script = readFileSync(new URL("./dev-local.ps1", import.meta.url), "utf8");
    const invokeWslChecked = script.slice(
      script.indexOf("function Invoke-WslChecked"),
      script.indexOf("function Invoke-WslCommand"),
    );

    expect(script).toContain("Invoke-WslChecked");
    expect(script).toContain("Invoke-WslCommand");
    expect(invokeWslChecked).toContain("& wsl.exe -d $wslDistro -u root -- sh -lc $Command");
    expect(invokeWslChecked).not.toContain("Invoke-Checked");
    expect(script).toContain("127.0.0.1:${databasePort}");
    expect(script).not.toContain("Resolve-DatabaseHost");
    expect(script).not.toContain("$env:DATABASE_URL");
    expect(script).not.toContain("& npm.cmd run dev");
  });
});
