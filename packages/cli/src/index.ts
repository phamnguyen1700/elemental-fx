#!/usr/bin/env node

import { runCli } from "./run";

runCli(process.argv.slice(2), process.cwd()).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`elemental-fx: ${message}`);
  process.exitCode = 1;
});
