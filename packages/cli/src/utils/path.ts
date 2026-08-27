import { existsSync } from "node:fs";
import path from "node:path";

export function resolveOutputFile(
  cwd: string,
  outputDir: string | undefined,
  fileName: string
): string {
  const defaultDir = existsSync(path.join(cwd, "src"))
    ? path.join("src", "components", "effects")
    : path.join("components", "effects");
  const targetDir = outputDir ?? defaultDir;

  return path.resolve(cwd, targetDir, fileName);
}

export function assertInsideProject(cwd: string, filePath: string): void {
  const root = path.resolve(cwd);
  const target = path.resolve(filePath);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside the project: ${target}`);
  }
}
