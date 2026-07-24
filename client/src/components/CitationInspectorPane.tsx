import React, { useRef, useState } from "react";

export type CitationStyle = "APA7" | "IEEE" | "MLA9" | "Chicago17" | "Harvard" | "BibTeX" | "RIS" | "CSL-JSON";

interface CitationInspectorPaneProps {
  citation: any | null;
  onClose: () => void;
  onEdit: (citation: any) => void;
  onInvite: (citation: any) => void;
  onUnlink?: (citationId: string) => void;
  onNavigateProfile?: (authorName: string) => void;
  showToast: (msg: string) => void;
}

// Fallback client-side formatter if backend API pre-rendered formats are missing
function formatClientCitation(citation: any, style: CitationStyle) {
  if (!citation) return { referenceText: "", inTextParenthetical: "", inTextNarrative: "" };

  const authors = citation.authors || [];
  const firstAuth = authors[0]?.lastName || "Author";
  const year = citation.year || "n.d.";
  const title = citation.title || "Untitled Paper";
  const journal = citation.journalOrPublisher || "Academic Journal";

  if (style === "APA7") {
    return {
      referenceText: `${firstAuth}, A. (${year}). ${title}. ${journal}.`,
      inTextParenthetical: `(${firstAuth}, ${year})`,
      inTextNarrative: `${firstAuth} (${year})`,
    };
  }
  if (style === "IEEE") {
    return {
      referenceText: `[1] A. ${firstAuth}, "${title}," ${journal}, ${year}.`,
      inTextParenthetical: `[1]`,
      inTextNarrative: `Ref. [1]`,
    };
  }
  if (style === "MLA9") {
    return {
      referenceText: `${firstAuth}, Author. "${title}." ${journal}, ${year}.`,
      inTextParenthetical: `(${firstAuth} ${year})`,
      inTextNarrative: `${firstAuth}`,
    };
  }
  if (style === "BibTeX") {
    const bibKey = `${firstAuth.toLowerCase()}${year}`;
    return {
      referenceText: `@article{${bibKey},\n  title={${title}},\n  author={${firstAuth}},\n  journal={${journal}},\n  year={${year}}\n}`,
      inTextParenthetical: `\\cite{${bibKey}}`,
      inTextNarrative: `\\cite{${bibKey}}`,
    };
  }
  return {
    referenceText: `${firstAuth} (${year}). ${title}. ${journal}.`,
    inTextParenthetical: `(${firstAuth}, ${year})`,
    inTextNarrative: `${firstAuth} (${year})`,
  };
}

export const CitationInspectorPane: React.FC<CitationInspectorPaneProps> = ({
  citation,
  onClose,
  onEdit,
  onInvite,
  onUnlink,
  onNavigateProfile,
  showToast,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(360);
  const isResizing = useRef(false);

  const [activeStyle, setActiveStyle] = useState<CitationStyle>("APA7");

  // Handle Drag Resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX - 24;
    if (newWidth >= 260 && newWidth <= 640) {
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  if (isCollapsed) {
    return (
      <aside
        className="glass-panel"
        style={{
          width: 44,
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1rem 0",
          gap: "1rem",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(false)}
        title="Expand Details Inspector Pane"
      >
        <button className="btn btn-secondary btn-sm" style={{ padding: "0.4rem" }}>
          <i className="fa-solid fa-angles-left"></i>
        </button>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.08em", color: "var(--primary)" }}>
          DETAILS INSPECTOR
        </div>
      </aside>
    );
  }

  if (!citation) {
    return (
      <aside
        className="glass-panel"
        style={{
          width,
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "var(--text-muted)",
          position: "relative",
        }}
      >
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "ew-resize",
            background: "transparent",
          }}
          title="Drag to resize details pane"
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", width: "100%" }}>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
            Details
          </h4>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsCollapsed(true)} title="Collapse Pane">
            <i className="fa-solid fa-angles-right"></i>
          </button>
        </div>

        <i className="fa-solid fa-book-open-reader" style={{ fontSize: "2.2rem", marginBottom: "0.75rem", opacity: 0.5, color: "var(--primary)" }}></i>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.3rem", fontFamily: "var(--font-serif)" }}>Academic Reference Details</h4>
        <p style={{ fontSize: "0.8rem", maxWidth: 220 }}>Select any citation card from the directory stream to inspect metadata details & live CSL citation output.</p>
      </aside>
    );
  }

  // Retrieve formatted reference & both in-text modes
  const clientFallback = formatClientCitation(citation, activeStyle);
  const referenceText = citation.formats?.[activeStyle]?.referenceText || clientFallback.referenceText;
  const inTextParenthetical = citation.formats?.[activeStyle]?.inTextParenthetical || clientFallback.inTextParenthetical;
  const inTextNarrative = citation.formats?.[activeStyle]?.inTextNarrative || clientFallback.inTextNarrative;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  const handleExportFile = (ext: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `citation_${citation.id.slice(0, 8)}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported .${ext} file!`);
  };

  const isRawExport = activeStyle === "BibTeX" || activeStyle === "RIS" || activeStyle === "CSL-JSON";

  return (
    <aside
      className="glass-panel"
      style={{
        width,
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        height: "fit-content",
        position: "relative",
      }}
    >
      {/* Left Edge Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          left: -3,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: "ew-resize",
          background: "transparent",
        }}
        title="Drag to resize details pane"
      />

      {/* Header with Retract Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <i className="fa-solid fa-circle-info" style={{ color: "var(--primary)" }}></i> Details
        </h4>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsCollapsed(true)} title="Collapse Pane" style={{ padding: "0.25rem 0.5rem" }}>
            <i className="fa-solid fa-angles-right"></i>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose} title="Close Pane" style={{ padding: "0.25rem 0.5rem" }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      {/* Title & Metadata */}
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.4, marginBottom: "0.5rem", color: "var(--text-main)", fontFamily: "var(--font-serif)" }}>
          {citation.title}
        </h3>

        {/* Clickable Scholar Author Links */}
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
          <i className="fa-solid fa-users" style={{ marginRight: "0.4rem", opacity: 0.7 }}></i>
          {citation.authors && citation.authors.length > 0
            ? citation.authors.map((a: any, idx: number) => {
                const fullName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
                const displayName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
                return (
                  <React.Fragment key={idx}>
                    <span
                      onClick={() => onNavigateProfile && onNavigateProfile(fullName)}
                      style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                      title={`View profile for ${displayName}`}
                    >
                      {displayName}
                    </span>
                    {idx < citation.authors.length - 1 ? "; " : ""}
                  </React.Fragment>
                );
              })
            : "Unknown"}
        </div>

        {citation.journalOrPublisher && (
          <div style={{ fontSize: "0.8rem", fontStyle: "italic", marginBottom: "0.6rem" }}>
            {citation.journalOrPublisher} {citation.year ? `(${citation.year})` : ""}
          </div>
        )}

        {citation.doi && (
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", wordBreak: "break-all", marginBottom: "0.6rem" }}>
            <strong style={{ color: "var(--primary)" }}>DOI:</strong>{" "}
            <a href={citation.doi.startsWith("http") ? citation.doi : `https://doi.org/${citation.doi}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
              {citation.doi}
            </a>
          </div>
        )}

        {citation.isOwner && (
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(citation)} style={{ flex: 1 }}>
              <i className="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onInvite(citation)}>
              <i className="fa-solid fa-user-plus"></i> Co-Owners
            </button>
            {onUnlink && (
              <button
                className="btn btn-outline btn-sm"
                style={{ borderColor: "rgba(244,63,94,0.4)", color: "var(--accent-rose)" }}
                onClick={() => onUnlink(citation.id)}
                title="Un-own paper and release ownership"
              >
                <i className="fa-solid fa-link-slash"></i> Un-own
              </button>
            )}
          </div>
        )}
      </div>

      {/* Abstract Section */}
      {citation.abstract && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.85rem" }}>
          <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            Abstract
          </h4>
          <p style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "var(--text-main)", maxHeight: 110, overflowY: "auto", paddingRight: "0.3rem" }}>
            {citation.abstract}
          </p>
        </div>
      )}

      {/* Citation Style Switcher Bar */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.85rem" }}>
        <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          Citation Style Switcher
        </h4>

        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {(["APA7", "IEEE", "MLA9", "Chicago17", "BibTeX", "RIS", "CSL-JSON"] as CitationStyle[]).map((style) => (
            <button
              key={style}
              className={`btn btn-sm ${activeStyle === style ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveStyle(style)}
              style={{ fontSize: "0.7rem", padding: "0.25rem 0.45rem", borderRadius: "var(--radius-sm)" }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Citation Output & Copy / Download Box */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            {activeStyle} Formatted Reference
          </h4>
          {isRawExport && (
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}
              onClick={() => handleExportFile(activeStyle === "BibTeX" ? "bib" : activeStyle === "RIS" ? "ris" : "json", referenceText)}
            >
              <i className="fa-solid fa-download"></i> Export .{activeStyle === "BibTeX" ? "bib" : activeStyle === "RIS" ? "ris" : "json"}
            </button>
          )}
        </div>

        {/* Scrollable Formatted Reference Content Box */}
        <div
          style={{
            padding: "0.85rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            background: "var(--bg-main)",
            fontSize: "0.82rem",
            lineHeight: 1.5,
            fontFamily: isRawExport ? "var(--font-mono)" : "var(--font-serif)",
            wordBreak: "break-word",
            whiteSpace: isRawExport ? "pre-wrap" : "normal",
            maxHeight: 140,
            overflowY: "auto",
          }}
        >
          {referenceText}
        </div>

        {/* Copy Reference Button Positioned Directly Underneath the Scrollable Box */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => handleCopy(referenceText, `${activeStyle} Reference`)}
          style={{
            width: "100%",
            justifyContent: "center",
            background: "var(--primary)",
            color: "#ffffff",
            fontWeight: 700,
            border: "none",
          }}
        >
          <i className="fa-solid fa-copy"></i> Copy Reference
        </button>

        {/* Both In-Text Citation Formats (Parenthetical & Narrative Side-by-Side) */}
        {!isRawExport && (
          <div style={{ marginTop: "0.4rem" }}>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              In-Text Citation Variants
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {/* Parenthetical In-Text Citation Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: "0.5rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>PARENTHETICAL</span>
                  <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>{inTextParenthetical}</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}
                  onClick={() => handleCopy(inTextParenthetical, "Parenthetical In-Text Citation")}
                  title="Copy Parenthetical In-Text"
                >
                  <i className="fa-solid fa-copy"></i> Copy
                </button>
              </div>

              {/* Narrative In-Text Citation Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: "0.5rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, display: "block" }}>NARRATIVE</span>
                  <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>{inTextNarrative}</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}
                  onClick={() => handleCopy(inTextNarrative, "Narrative In-Text Citation")}
                  title="Copy Narrative In-Text"
                >
                  <i className="fa-solid fa-copy"></i> Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
