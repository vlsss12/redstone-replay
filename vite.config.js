import { defineConfig } from "vite";
import replayHandler from "./api/replay.js";
export default defineConfig({
  server: { port: 4173, strictPort: true },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: { replay: "index.html", community: "community/index.html" },
    },
  },
  plugins: [
    {
      name: "local-replay-api",
      configureServer(server) {
        server.middlewares.use("/api/replay", async (req, res) => {
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (body) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
            return res;
          };
          let text = "";
          try {
            for await (const part of req) {
              text += part;
              if (Buffer.byteLength(text) > 3000) {
                res.status(413).json({ error: "Request too large." });
                return;
              }
            }
            req.body = text;
            await replayHandler(req, res);
          } catch {
            if (!res.writableEnded)
              res.status(400).json({ error: "Use a valid JSON request." });
          }
        });
      },
    },
  ],
});
