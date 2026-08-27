import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEffectDefinition } from "../registry/effects";
import { detectPackageManager, getInstallCommand } from "../utils/package-manager";
import { assertInsideProject, resolveOutputFile } from "../utils/path";
import { runCommand } from "../utils/run-command";

interface AddOptions {
  effectName: string;
  outputDir?: string | undefined;
  overwrite: boolean;
  dryRun: boolean;
  install: boolean;
}

export async function addEffect(argv: string[], cwd: string): Promise<void> {
  const options = parseAddArgs(argv);
  if (!options) return;

  const effect = getEffectDefinition(options.effectName);
  const outputFile = resolveOutputFile(cwd, options.outputDir, effect.fileName);
  assertInsideProject(cwd, outputFile);
  const source = effect.template();

  if (options.dryRun) {
    console.log(`Target: ${outputFile}`);
    console.log(source);
    return;
  }

  if (existsSync(outputFile) && !options.overwrite) {
    throw new Error(
      `${path.relative(cwd, outputFile)} already exists. Pass --overwrite to replace it.`
    );
  }

  if (options.install) {
    const packageManager = detectPackageManager(cwd);
    const installCommand = getInstallCommand(packageManager, effect.dependencies);
    await runCommand(installCommand.command, installCommand.args, cwd);
  }

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, source, "utf8");

  console.log(`Created ${path.relative(cwd, outputFile)}`);
}

function parseAddArgs(argv: string[]): AddOptions | null {
  const [effectName, ...rest] = argv;

  if (effectName === "--help" || effectName === "-h") {
    printAddHelp();
    return null;
  }

  if (!effectName) {
    printAddHelp();
    throw new Error("Missing effect name.");
  }

  const options: AddOptions = {
    effectName,
    overwrite: false,
    dryRun: false,
    install: true
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--overwrite") {
      options.overwrite = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
      options.install = false;
    } else if (arg === "--no-install") {
      options.install = false;
    } else if (arg === "--path") {
      const value = rest[index + 1];
      if (!value) throw new Error("--path requires a directory.");
      options.outputDir = value;
      index += 1;
    } else {
      throw new Error(`Unknown option "${arg}".`);
    }
  }

  return options;
}

function printAddHelp(): void {
  console.log(`Usage:
  elemental-fx add water-surface
  elemental-fx add ink-cursor
  elemental-fx add water-surface --path src/components/effects
  elemental-fx add water-surface --dry-run
`);
}
