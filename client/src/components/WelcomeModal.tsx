import React from "react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTutorial: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = React.memo(({ isOpen, onClose, onOpenTutorial }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "2.5rem", maxWidth: 580, textAlign: "center", borderRadius: "var(--radius-lg)" }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "16px",
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "2rem",
            marginBottom: "1.25rem",
            boxShadow: "0 8px 24px rgba(37,99,235,0.3)",
          }}
        >
          <i className="fa-solid fa-graduation-cap"></i>
        </div>

        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Welcome to CiteSphere!
        </h2>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1rem" }}>
          Academic Citation & Bibliometric Hub
        </h3>

        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Co-own, index, and dynamically format papers into <strong>APA 7th</strong>, <strong>IEEE</strong>, <strong>MLA 9th</strong>, <strong>Chicago 17th</strong>, <strong>BibTeX</strong>, <strong>RIS</strong>, and <strong>CSL-JSON</strong>.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginBottom: "1.8rem",
            textAlign: "left",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ padding: "0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--primary)", marginRight: "0.4rem" }}></i>
            <strong>1-Click DOI Fetch:</strong> Auto-pull metadata via Crossref REST API.
          </div>
          <div style={{ padding: "0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <i className="fa-solid fa-users" style={{ color: "var(--accent-purple)", marginRight: "0.4rem" }}></i>
            <strong>Multi-Owner Papers:</strong> Share paper ownership & send co-author invites.
          </div>
          <div style={{ padding: "0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <i className="fa-solid fa-chart-line" style={{ color: "var(--accent-emerald)", marginRight: "0.4rem" }}></i>
            <strong>Bibliometric Metrics:</strong> Track your h-index, i10-index, and publication volume.
          </div>
          <div style={{ padding: "0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <i className="fa-solid fa-table-columns" style={{ color: "var(--accent-amber)", marginRight: "0.4rem" }}></i>
            <strong>3-Pane Layout:</strong> Resizable & retractable sidebar and inspector panes.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              onClose();
              onOpenTutorial();
            }}
          >
            <i className="fa-solid fa-book-open"></i> How to Use Tutorial
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Get Started <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
});
