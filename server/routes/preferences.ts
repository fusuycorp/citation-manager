import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type UserSession } from "../middleware";

const preferences = new Hono();

preferences.use("*", authMiddleware);

// GET /api/preferences - Fetch user preference settings
preferences.get("/", (c) => {
  const user = c.get("user") as UserSession;

  let row = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(user.id) as any;

  if (!row) {
    // Insert default preference settings if none exist
    db.prepare(`
      INSERT INTO user_preferences (user_id, default_csl_style, default_in_text_mode, view_density, default_export_format, export_include_abstract)
      VALUES (?, 'APA7', 'parenthetical', 'compact', 'BibTeX', 1)
    `).run(user.id);

    row = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(user.id) as any;
  }

  return c.json({
    preferences: {
      defaultCslStyle: row.default_csl_style,
      defaultInTextMode: row.default_in_text_mode,
      viewDensity: row.view_density || "compact",
      defaultExportFormat: row.default_export_format,
      exportIncludeAbstract: !!row.export_include_abstract,
    },
  });
});

// PUT /api/preferences - Update user preference settings
preferences.put("/", async (c) => {
  const user = c.get("user") as UserSession;
  try {
    const body = await c.req.json();
    const { defaultCslStyle, defaultInTextMode, viewDensity, defaultExportFormat, exportIncludeAbstract } = body;

    db.prepare(`
      INSERT INTO user_preferences (user_id, default_csl_style, default_in_text_mode, view_density, default_export_format, export_include_abstract)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        default_csl_style = excluded.default_csl_style,
        default_in_text_mode = excluded.default_in_text_mode,
        view_density = excluded.view_density,
        default_export_format = excluded.default_export_format,
        export_include_abstract = excluded.export_include_abstract
    `).run(
      user.id,
      defaultCslStyle || "APA7",
      defaultInTextMode || "parenthetical",
      viewDensity || "compact",
      defaultExportFormat || "BibTeX",
      exportIncludeAbstract ? 1 : 0
    );

    return c.json({ message: "Preferences saved successfully" });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update preferences" }, 500);
  }
});

export default preferences;
