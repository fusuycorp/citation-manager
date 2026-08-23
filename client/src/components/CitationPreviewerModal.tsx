import React, { useState } from "react";
export type CitationStyle = "APA7" | "IEEE" | "MLA9" | "Chicago17" | "Harvard" | "BibTeX" | "RIS" | "CSL-JSON";

interface CitationPreviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: any | null;
  showToast: (msg: string) => void;
}

export const CitationPreviewerModal: React.FC<CitationPreviewerModalProps> = React.memo(({ 
  isOpen,
  onClose,
  citation,
  showToast,
}) => {
  const [activeStyle, setActiveStyle] = useState<CitationStyle>("APA7");
  const [inTextVariant, setInTextVariant] = useState<"parenthetical" | "narrative">("parenthetical");

  if (!isOpen || !citation || !citation.formats) return null;

  const currentFormat = citation.formats[activeStyle];

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
    showToast(`Exported citation as .${ext}`);
  };

  const stylesList: { id: CitationStyle; name: string }[] = [
    { id: "APA7", name: "APA 7th (Default)" },
    { id: "IEEE", name: "IEEE" },
    { id: "MLA9", name: "MLA 9th" },
    { id: "Chicago17", name: "Chicago 17th" },
    { id: "Harvard", name: "Harvard" },
    { id: "BibTeX", name: "BibTeX" },
    { id: "RIS", name: "RIS" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem", maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--primary)" }}></i> Citation Engine & Previewer
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Generate reference list entries and in-text citations across multiple standard formats.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Style Selector Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem", padding: "0.4rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          {stylesList.map((s) => (
            <button
              key={s.id}
              className={`btn btn-sm ${activeStyle === s.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveStyle(s.id)}
              style={{ border: "none" }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Display Reference List Format Entry */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>
              Reference List Entry ({activeStyle})
            </h4>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopy(currentFormat.referenceText, `${activeStyle} reference`)}
              >
                <i className="fa-solid fa-copy"></i> Copy Reference
              </button>
              {activeStyle === "BibTeX" && (
                <button className="btn btn-outline btn-sm" onClick={() => handleExportFile("bib", currentFormat.referenceText)}>
                  <i className="fa-solid fa-download"></i> .bib File
                </button>
              )}
              {activeStyle === "RIS" && (
                <button className="btn btn-outline btn-sm" onClick={() => handleExportFile("ris", currentFormat.referenceText)}>
                  <i className="fa-solid fa-download"></i> .ris File
                </button>
              )}
              {activeStyle !== "BibTeX" && activeStyle !== "RIS" && (
                <button className="btn btn-outline btn-sm" onClick={() => handleExportFile("txt", currentFormat.referenceText)}>
                  <i className="fa-solid fa-download"></i> .txt File
                </button>
              )}
            </div>
          </div>
          <div
            style={{
              padding: "1rem 1.2rem",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              fontFamily: activeStyle === "BibTeX" || activeStyle === "RIS" ? "var(--font-mono)" : "var(--font-sans)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              whiteSpace: activeStyle === "BibTeX" || activeStyle === "RIS" ? "pre-wrap" : "normal",
              wordBreak: "break-word",
            }}
          >
            {currentFormat.referenceText}
          </div>
        </div>

        {/* Display In-Text Citation Format Entry */}
        {activeStyle !== "BibTeX" && activeStyle !== "RIS" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>
                  In-Text Citation
                </h4>
                <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-main)", padding: "0.2rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <button
                    className={`btn btn-sm ${inTextVariant === "parenthetical" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setInTextVariant("parenthetical")}
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", border: "none" }}
                  >
                    Parenthetical
                  </button>
                  <button
                    className={`btn btn-sm ${inTextVariant === "narrative" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setInTextVariant("narrative")}
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", border: "none" }}
                  >
                    Narrative
                  </button>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  handleCopy(
                    inTextVariant === "parenthetical" ? currentFormat.inTextParenthetical : currentFormat.inTextNarrative,
                    `In-text ${inTextVariant} citation`
                  )
                }
              >
                <i className="fa-solid fa-copy"></i> Copy In-Text
              </button>
            </div>
            <div
              style={{
                padding: "0.9rem 1.2rem",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-main)",
                border: "1px solid var(--border-color)",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--primary)",
              }}
            >
              {inTextVariant === "parenthetical" ? currentFormat.inTextParenthetical : currentFormat.inTextNarrative}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
