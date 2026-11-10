// `npm run demo`: builds and starts the production app for the presentation.
// - production build, so the Review page and its API are hidden (they only exist in npm run dev)
// - Next.js telemetry off; the app makes no outside requests (only Ollama on localhost)
// Usage: npm run demo            (http://localhost:3000)
//        npm run demo -- 3001    (another port)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const port = process.argv[2] ?? "3000";
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" };

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [next, ...args], { cwd: APP, env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`next ${args[0]} exited with ${code}`))));
  });
}

console.log("Building the demo (production, telemetry off)…");
await run(["build"]);
console.log(`\nStarting on http://localhost:${port}  — Review page is hidden in this build.`);
console.log(`Check it in another terminal:  npm run preflight -- http://localhost:${port}\n`);
await run(["start", "-p", port]);
