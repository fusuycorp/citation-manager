import { existsSync } from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { join } from "path";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import citationRoutes from "./routes/citations";
import doiRoutes from "./routes/doi";
import invitationRoutes from "./routes/invitations";
import metricsRoutes from "./routes/metrics";
import preferencesRoutes from "./routes/preferences";
import profileRoutes from "./routes/profiles";
import userRoutes from "./routes/users";

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Health Check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString(), runtime: "Bun" });
});

// Mount API Routes
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/citations", citationRoutes);
app.route("/api/users", userRoutes);
app.route("/api/invitations", invitationRoutes);
app.route("/api/doi", doiRoutes);
app.route("/api/metrics", metricsRoutes);
app.route("/api/preferences", preferencesRoutes);
app.route("/api/profiles", profileRoutes);

// Serve Frontend Static Files
const distPath = join(import.meta.dir, "../dist");
if (existsSync(distPath)) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

const PORT = parseInt(process.env.PORT || "3000", 10);

console.log(`🚀 Citation Manager Bun server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
