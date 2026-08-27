import { spawn } from "node:child_process";

export function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";

    const executable = isWindows ? process.env.ComSpec || "cmd.exe" : command;

    const commandArgs = isWindows ? ["/d", "/s", "/c", command, ...args] : args;

    const child = spawn(executable, commandArgs, {
      cwd,
      stdio: "inherit"
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.`)
        );
      }
    });
  });
}
