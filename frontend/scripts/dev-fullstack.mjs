import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectDir = path.resolve(frontendDir, "..");
const backendDir = path.join(projectDir, "backend");
const backendUrl = "http://127.0.0.1:8000";
const backend = spawn(
  process.env.PYTHON || "python",
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  { cwd: backendDir, stdio: "inherit", env: process.env },
);

let frontend;
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (frontend && frontend.exitCode === null) frontend.kill();
  if (backend.exitCode === null) backend.kill();
  const exitTimer = setTimeout(() => process.exit(exitCode), 500);
  exitTimer.unref();
}

backend.on("error", (error) => {
  console.error(`Could not start the backend: ${error.message}`);
  stop(1);
});
backend.on("exit", (code) => {
  if (!stopping) {
    console.error(`Backend stopped${code ? ` with exit code ${code}` : ""}.`);
    stop(code || 1);
  }
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

async function waitForBackend() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (stopping || backend.exitCode !== null) throw new Error("Backend exited before it became ready.");
    try {
      const response = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch {
      // Keep waiting while Uvicorn imports the application and completes startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error("Backend did not become ready within 60 seconds.");
}

try {
  console.log("Starting TruthLens backend...");
  await waitForBackend();
  console.log("Backend ready. Starting the frontend...");
  frontend = spawn(
    process.execPath,
    [path.join(frontendDir, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1"],
    { cwd: frontendDir, stdio: "inherit", env: process.env },
  );
  frontend.on("error", (error) => {
    console.error(`Could not start the frontend: ${error.message}`);
    stop(1);
  });
  frontend.on("exit", (code) => {
    if (!stopping) stop(code || 0);
  });
} catch (error) {
  console.error(error.message);
  stop(1);
}
