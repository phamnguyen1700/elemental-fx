import { existsSync } from "node:fs";
import path from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface InstallCommand {
  command: string;
  args: string[];
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(cwd, "bun.lockb")) || existsSync(path.join(cwd, "bun.lock")))
    return "bun";
  return "npm";
}

export function getInstallCommand(
  packageManager: PackageManager,
  dependencies: string[]
): InstallCommand {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["add", ...dependencies] };
    case "yarn":
      return { command: "yarn", args: ["add", ...dependencies] };
    case "bun":
      return { command: "bun", args: ["add", ...dependencies] };
    case "npm":
      return { command: "npm", args: ["install", ...dependencies] };
  }
}
