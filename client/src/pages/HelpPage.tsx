import React from "react";

interface HelpPageProps {
  onBackToDashboard: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onBackToDashboard }) => {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard} style={{ marginBottom: "0.75rem" }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <i className="fa-solid fa-graduation-cap" style={{ color: "var(--primary)" }}></i> CiteSphere Tutorial & User Guide
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
          Learn how to index citations, resolve DOIs, manage co-author paper ownership, and format bibliographies.
        </p>
      </div>

      {/* Guide Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Section 1: Adding Citations */}
        <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <i className="fa-solid fa-cloud-arrow-down" style={{ color: "var(--primary)" }}></i> 1. Adding & Fetching Metadata
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
            You can add papers manually or automatically pull metadata from Crossref:
          </p>
          <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-main)" }}>
            <li><strong>Auto-Fill via DOI:</strong> Click <em>"+ Add Citation"</em>, paste a DOI (e.g. <code>10.1007/s10639-024-13271-9</code>), and click <strong>"Fetch Metadata from DOI"</strong>.</li>
            <li><strong>Manual Entry:</strong> Enter title, publication year, journal or publisher, and add author names with first and last name fields.</li>
          </ul>
        </div>

        {/* Section 2: Co-Ownership & Invites */}
        <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <i className="fa-solid fa-users" style={{ color: "var(--accent-purple)" }}></i> 2. Co-Ownership & Collaborations
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Citations can be co-owned by multiple authors on the platform:
          </p>
          <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-main)" }}>
            <li><strong>Invite Co-Authors:</strong> Click <em>"Co-Authors"</em> on any paper to auto-search registered users by surname or send in-app invites.</li>
            <li><strong>Unlinking Papers:</strong> Removing a paper from your profile does not delete it. If no owners remain, it moves to the <strong>Unowned / Orphan</strong> state.</li>
          </ul>
        </div>

        {/* Section 3: Live CSL Citation Engine */}
        <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--accent-amber)" }}></i> 3. CSL Engine & In-Text Formatting
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Format citations in 8 standard academic styles directly from the inspector:
          </p>
          <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-main)" }}>
            <li><strong>Supported Styles:</strong> APA 7th Edition, IEEE, MLA 9th, Chicago 17th, Harvard, BibTeX, RIS, and CSL-JSON.</li>
            <li><strong>In-Text Modes:</strong> Toggle between <strong>Parenthetical</strong> <code>(Aydın et al., 2025)</code> and <strong>Narrative</strong> <code>Aydın et al. (2025)</code> in-text formats.</li>
          </ul>
        </div>

        {/* Section 4: 3-Pane Customization */}
        <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <i className="fa-solid fa-table-columns" style={{ color: "var(--accent-emerald)" }}></i> 4. 3-Pane Resizable Workspace
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Customize your layout density and pane sizes for maximum efficiency:
          </p>
          <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-main)" }}>
            <li><strong>Resizable & Retractable Panes:</strong> Drag the inner edges of the left Library sidebar or right Inspector pane to resize. Click the collapse icons to retract them.</li>
            <li><strong>Density View Switcher:</strong> Toggle between <strong>Detailed Card View</strong> and <strong>Compact List View</strong> on the toolbar.</li>
          </ul>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="glass-panel" style={{ marginTop: "2rem", padding: "1.5rem", borderRadius: "var(--radius-lg)", textAlign: "center", background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(124,58,237,0.06))" }}>
        <h4 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.4rem" }}>Ready to manage your academic library?</h4>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Return to your personal workspace to start indexing papers.
        </p>
        <button className="btn btn-primary" onClick={onBackToDashboard}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
