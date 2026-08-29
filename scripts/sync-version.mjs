import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

const rootPackagePath = resolve(root, "package.json");

const packagePaths = [
  "packages/canvas-effects/package.json",
  "packages/deformable-effects/package.json",
  "packages/fluid-effects/package.json",
  "packages/cli/package.json"
];

const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
const version = rootPackage.version;

if (!version) {
  throw new Error("Root package.json does not contain a version.");
}

// Sync package versions
for (const relativePath of packagePaths) {
  const packagePath = resolve(root, relativePath);
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  packageJson.version = version;

  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  console.log(`Synced ${packageJson.name} -> ${version}`);
}

// Sync version used by the CLI when installing runtime packages
const cliVersionPath = resolve(root, "packages/cli/src/version.ts");

await writeFile(cliVersionPath, `export const ELEMENTAL_FX_VERSION = "${version}";\n`, "utf8");

console.log(`Synced CLI runtime version -> ${version}`);
console.log(`All elemental-fx packages synced to ${version}.`);
