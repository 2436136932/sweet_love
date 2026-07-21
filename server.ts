import express from "express";
import path from "path";
import { env } from "./src/server/config.js";
import apiRouter from "./src/server/routes.js";
import { thumbnailMiddleware } from "./src/server/middleware/thumbnail.js";

const isProduction =
  process.env.NODE_ENV === "production" ||
  (process.argv[1] ? path.normalize(process.argv[1]).includes(`dist-server${path.sep}server.js`) : false);

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.use("/uploads", thumbnailMiddleware);
  app.use("/uploads", express.static(env.uploadDir));
  app.use("/api", apiRouter);

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${env.port}`);
  });
}

startServer();
