import { addEffect } from "./commands/add";

export async function runCli(argv: string[], cwd: string): Promise<void> {
  const [command, ...args] = argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "add") {
    await addEffect(args, cwd);
    return;
  }

  throw new Error(`Unknown command "${command}". Run "elemental-fx --help".`);
}

function printHelp(): void {
  console.log(`elemental-fx

Usage:
  elemental-fx add <effect> [options]

Effects:
  water-surface
  ink-cursor

Options:
  --path <dir>     Output directory. Defaults to src/components/effects when src exists.
  --overwrite      Replace an existing generated file.
  --dry-run        Print the target path and file contents without writing.
  --no-install     Skip installing the required runtime package.
  --help           Show command help.
`);
}
