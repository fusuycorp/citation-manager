import React from "react";

interface HeroBannerProps {
  user: any;
  onOpenSettings: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ user, onOpenSettings }) => {
  return (
    <div
      className="glass-panel"
      style={{
        padding: "1.5rem 1.8rem",
        borderRadius: "var(--radius-lg)",
        marginBottom: "1.25rem",
        background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.3rem" }}>
            Academic Citation & Bibliometric Hub
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Co-own, index, and dynamically format papers into <strong>APA 7th</strong>, <strong>IEEE</strong>, <strong>MLA 9th</strong>, <strong>Chicago 17th</strong>, <strong>BibTeX</strong>, <strong>RIS</strong>, and <strong>CSL-JSON</strong>.
          </p>
        </div>
        {user && (
          <button className="btn btn-secondary btn-sm" onClick={onOpenSettings}>
            <i className="fa-solid fa-gear"></i> Settings
          </button>
        )}
      </div>
    </div>
  );
};
