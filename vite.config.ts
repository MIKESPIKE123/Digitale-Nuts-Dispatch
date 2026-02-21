import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleInspectionSyncRequest } from "./scripts/inspecties-sync-endpoint.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMPORT_NUTS_SCRIPT_PATH = path.join(__dirname, "scripts", "import-nuts-data.mjs");
const IMPORT_IMPACT_SCRIPT_PATH = path.join(__dirname, "scripts", "import-impact-data.mjs");

function runNodeScript(scriptPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [scriptPath],
      { cwd: __dirname, env: process.env },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr?.trim() || stdout?.trim() || error.message;
          reject(new Error(message));
          return;
        }
        resolve(`${stdout ?? ""}\n${stderr ?? ""}`.trim());
      }
    );
  });
}

async function runDataImportScripts(): Promise<string> {
  const outputs: string[] = [];
  const nutsOutput = await runNodeScript(IMPORT_NUTS_SCRIPT_PATH);
  if (nutsOutput) {
    outputs.push(`[import:data]\n${nutsOutput}`);
  }

  const impactOutput = await runNodeScript(IMPORT_IMPACT_SCRIPT_PATH);
  if (impactOutput) {
    outputs.push(`[import:impact]\n${impactOutput}`);
  }

  return outputs.join("\n\n").trim();
}

const syncApiPlugin = {
  name: "dn-dispatch-sync-api",
  configureServer(server: Parameters<NonNullable<import("vite").Plugin["configureServer"]>>[0]) {
    registerApiMiddlewares(server.middlewares);
  },
  configurePreviewServer(server: Parameters<
    NonNullable<import("vite").Plugin["configurePreviewServer"]>
  >[0]) {
    registerApiMiddlewares(server.middlewares);
  },
};

function registerApiMiddlewares(middlewares: { use: (...args: unknown[]) => void }): void {
  middlewares.use("/api/inspecties/sync", (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    void handleInspectionSyncRequest(req, res, { rootDir: __dirname });
  });

  middlewares.use("/api/sync-dispatch-data", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    try {
      const output = await runDataImportScripts();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Synchronisatie voltooid.",
          output,
        })
      );
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Onbekende fout tijdens synchronisatie.",
        })
      );
    }
  });
}

export default defineConfig({
  plugins: [react(), syncApiPlugin],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("maplibre-gl") || id.includes("react-map-gl")) {
            return "map-vendor";
          }

          if (id.includes("jspdf") || id.includes("html2canvas")) {
            return "pdf-vendor";
          }

          return undefined;
        },
      },
    },
  },
});
