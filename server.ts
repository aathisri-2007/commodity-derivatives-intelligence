import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const PYTHON_PORT = 5001;
const isProd = process.env.NODE_ENV === "production" && fs.existsSync(path.resolve(__dirname, "dist"));

let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log(`[Python Backend] Launching Flask API on port ${PYTHON_PORT}...`);
  pythonProcess = spawn("python3", ["backend/app.py"], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PYTHON_PORT),
      PYTHONPATH: __dirname,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  pythonProcess.stdout?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Flask] ${msg}`);
  });

  pythonProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[Flask Error] ${msg}`);
  });

  pythonProcess.on("exit", (code, signal) => {
    console.warn(`[Python Backend] Exited with code ${code}, signal ${signal}`);
  });
}

async function startServer() {
  const app = express();

  // Start Flask
  startPythonBackend();

  // Proxy /api requests to Flask API on port 5001 preserving full path
  const apiProxy = createProxyMiddleware({
    pathFilter: "/api",
    target: `http://127.0.0.1:${PYTHON_PORT}`,
    changeOrigin: true,
    ws: false,
    on: {
      error: (err: Error, _req: any, res: any) => {
        console.error("[Proxy Error]", err.message);
        if (!res.headersSent && typeof res.status === "function") {
          res.status(502).json({
            success: false,
            error: "Python analytical service is initializing or unreachable. Please retry in a few seconds.",
          });
        }
      },
    },
  });

  app.use(apiProxy);

  if (!isProd) {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve static files from dist
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Commodity Derivatives Intelligence server listening on http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    console.log("Shutting down servers...");
    if (pythonProcess) {
      pythonProcess.kill("SIGTERM");
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  if (pythonProcess) pythonProcess.kill();
  process.exit(1);
});
