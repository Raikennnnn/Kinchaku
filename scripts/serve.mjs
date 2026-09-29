// Starts the Vite dev or preview server from this project's real folder path.
// Tools that can't pass paths with spaces launch this through the Windows
// short path (PROJEC~2). Vite must not see that short path: its file watcher
// breaks, and it refuses to serve its own client from a "different" folder.
// So we resolve the real long path and load Vite from there.
// Usage: node scripts/serve.mjs dev|preview [port]
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = realpathSync.native(join(dirname(fileURLToPath(import.meta.url)), ".."));
process.chdir(root);
const { createServer, preview } = await import(pathToFileURL(join(root, "node_modules/vite/dist/node/index.js")).href);

const mode = process.argv[2] ?? "dev";
const port = Number(process.argv[3] ?? (mode === "preview" ? 4173 : 5173));
const configFile = join(root, "vite.config.ts");

const server =
  mode === "preview"
    ? await preview({ root, configFile, preview: { port, strictPort: true } })
    : await createServer({ root, configFile, server: { port, strictPort: true } });
if (mode !== "preview") await server.listen();
server.printUrls();
