import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return sourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe("server action modules", () => {
  it("only export async functions as runtime values", () => {
    const invalidExports = sourceFiles(path.join(process.cwd(), "src")).flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const hasUseServerDirective = /^\s*["']use server["'];?/m.test(source);

      if (!hasUseServerDirective) {
        return [];
      }

      return source
        .split(/\r?\n/)
        .map((line, index) => ({ line, index: index + 1 }))
        .filter(({ line }) => /^\s*export\s+(const|let|var|class|enum)\b/.test(line))
        .map(({ line, index }) => `${path.relative(process.cwd(), filePath)}:${index} ${line.trim()}`);
    });

    expect(invalidExports).toEqual([]);
  });

  it("keeps form action state types outside target server action modules", () => {
    const targets = [
      ["posts", "PostActionState", "initialPostActionState"],
      ["games", "GameActionState", "initialGameActionState"],
      ["media", "MediaActionState", "initialMediaActionState"],
      ["trips", "TripActionState", "initialTripActionState"],
      ["todos", "TodoActionState", "initialTodoActionState"],
      ["expenses", "ExpenseActionState", "initialExpenseActionState"],
    ] as const;

    const misplacedTypes = targets.flatMap(([moduleName, typeName]) => {
      const actionSource = readFileSync(path.join(process.cwd(), "src", "modules", moduleName, "actions.ts"), "utf8");
      return new RegExp(`^\\s*export\\s+type\\s+${typeName}\\b`, "m").test(actionSource)
        ? [`${moduleName}/actions.ts exports ${typeName}`]
        : [];
    });

    const missingStateExports = targets.flatMap(([moduleName, typeName, initialName]) => {
      const stateSource = readFileSync(path.join(process.cwd(), "src", "modules", moduleName, "action-state.ts"), "utf8");
      const hasType = new RegExp(`^\\s*export\\s+type\\s+${typeName}\\b`, "m").test(stateSource);
      const hasInitial = new RegExp(`^\\s*export\\s+const\\s+${initialName}\\b`, "m").test(stateSource);

      return hasType && hasInitial ? [] : [`${moduleName}/action-state.ts is missing ${typeName} or ${initialName}`];
    });

    expect([...misplacedTypes, ...missingStateExports]).toEqual([]);
  });
});
