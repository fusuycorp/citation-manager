import React, { useEffect, useState } from "react";

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  showToast: (msg: string) => void;
  onPreferencesSaved?: (prefs: any) => void;
}

export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({
  isOpen,
  onClose,
  token,
  showToast,
  onPreferencesSaved,
}) => {
  const [defaultCslStyle, setDefaultCslStyle] = useState("APA7");
  const [defaultInTextMode, setDefaultInTextMode] = useState("parenthetical");
  const [viewDensity, setViewDensity] = useState("compact");
  const [defaultExportFormat, setDefaultExportFormat] = useState("BibTeX");
  const [exportIncludeAbstract, setExportIncludeAbstract] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      fetch("/api/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.preferences) {
            setDefaultCslStyle(data.preferences.defaultCslStyle || "APA7");
            setDefaultInTextMode(data.preferences.defaultInTextMode || "parenthetical");
            setViewDensity(data.preferences.viewDensity || "compact");
            setDefaultExportFormat(data.preferences.defaultExportFormat || "BibTeX");
            setExportIncludeAbstract(!!data.preferences.exportIncludeAbstract);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const prefs = {
        defaultCslStyle,
        defaultInTextMode,
        viewDensity,
        defaultExportFormat,
        exportIncludeAbstract,
      };

      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      });

      if (!res.ok) throw new Error("Failed to save preferences");

      showToast("Citation preferences saved!");
      if (onPreferencesSaved) onPreferencesSaved(prefs);
      onClose();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem", maxWidth: 540 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
              <i className="fa-solid fa-sliders" style={{ color: "var(--primary)" }}></i> Citation & Workspace Preferences
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Customize default citation formatting styles, view density, and export settings.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Default Citation Format</label>
            <select className="form-select" value={defaultCslStyle} onChange={(e) => setDefaultCslStyle(e.target.value)}>
              <option value="APA7">APA 7th Edition (Default)</option>
              <option value="IEEE">IEEE</option>
              <option value="MLA9">MLA 9th Edition</option>
              <option value="Chicago17">Chicago 17th Edition</option>
              <option value="Harvard">Harvard</option>
              <option value="BibTeX">BibTeX (.bib)</option>
              <option value="RIS">RIS (.ris)</option>
              <option value="CSL-JSON">CSL-JSON</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default In-Text Mode</label>
            <select className="form-select" value={defaultInTextMode} onChange={(e) => setDefaultInTextMode(e.target.value)}>
              <option value="parenthetical">Parenthetical - (Aydın et al., 2025)</option>
              <option value="narrative">Narrative - Aydın et al. (2025)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default View Density</label>
            <select className="form-select" value={viewDensity} onChange={(e) => setViewDensity(e.target.value)}>
              <option value="compact">Compact List View (Default - High Density)</option>
              <option value="card">Detailed Card View (Rich Cards)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default Export Format</label>
            <select className="form-select" value={defaultExportFormat} onChange={(e) => setDefaultExportFormat(e.target.value)}>
              <option value="BibTeX">BibTeX (.bib)</option>
              <option value="RIS">RIS (.ris)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
