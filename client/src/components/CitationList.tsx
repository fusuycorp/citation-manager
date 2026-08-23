import React from "react";
import { useAuth } from "../context/AuthContext";

interface CitationListProps {
  citations: any[];
  currentUserId?: string | null;
  viewDensity: "card" | "compact";
  inspectedCitationId?: string | null;
  onSelectCitation: (citation: any) => void;
  onPreview: (citation: any) => void;
  onEdit: (citation: any) => void;
  onInvite: (citation: any) => void;
  onClaim: (citationId: string) => void;
  onUnlink: (citationId: string) => void;
  onNavigateProfile?: (authorName: string) => void;
  showToast: (msg: string) => void;
}

export const CitationList: React.FC<CitationListProps> = React.memo(({
  citations,
  currentUserId: propCurrentUserId,
  viewDensity,
  inspectedCitationId,
  onSelectCitation,
  onPreview,
  onEdit,
  onInvite,
  onClaim,
  onUnlink,
  onNavigateProfile,
  showToast,
}) => {
  const { user } = useAuth();
  const currentUserId = propCurrentUserId !== undefined ? propCurrentUserId : (user?.id || null);

  if (!citations || citations.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "3.5rem 2rem", borderRadius: "var(--radius-lg)", color: "var(--text-muted)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", fontSize: "1.5rem" }}>
          <i className="fa-solid fa-book-bookmark"></i>
        </div>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.4rem", color: "var(--text-main)", fontFamily: "var(--font-serif)" }}>
          No Academic Citations Found
        </h3>
        <p style={{ fontSize: "0.85rem", maxWidth: 420, margin: "0 auto 1.25rem auto", lineHeight: 1.5 }}>
          No records match your active scope or filter criteria. Try adjusting your keyword search, publication year range, or facet filters.
        </p>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  const handleAuthorClick = (authorName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateProfile) {
      onNavigateProfile(authorName);
    }
  };

  // Compact List View
  if (viewDensity === "compact") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {citations.map((cit) => {
          const formattedAPA = cit.formats?.APA7?.referenceText || `${cit.authors?.[0]?.lastName || "Author"} (${cit.year || "n.d."}). ${cit.title}.`;
          const isSelected = inspectedCitationId === cit.id;

          return (
            <div
              key={cit.id}
              onClick={() => onSelectCitation(cit)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                background: isSelected ? "var(--primary-light)" : "var(--bg-card)",
                border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: "1rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", fontFamily: "var(--font-serif)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cit.title}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {cit.authors?.map((a: any, idx: number) => {
                    const fullName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
                    return (
                      <React.Fragment key={idx}>
                        <span
                          onClick={(e) => handleAuthorClick(fullName, e)}
                          style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          title={`View profile for ${fullName}`}
                        >
                          {a.lastName}
                        </span>
                        {idx < cit.authors.length - 1 ? ", " : ""}
                      </React.Fragment>
                    );
                  })}{" "}
                  ({cit.year || "n.d."}) • {cit.journalOrPublisher || "Publication"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {cit.isOwner ? (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderColor: "rgba(244,63,94,0.4)", color: "var(--accent-rose)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnlink(cit.id);
                    }}
                    title="Un-own paper (release ownership)"
                  >
                    <i className="fa-solid fa-link-slash"></i> Un-own
                  </button>
                ) : (
                  currentUserId && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaim(cit.id);
                      }}
                      title="Claim Ownership of Paper"
                    >
                      <i className="fa-solid fa-plus"></i> Claim
                    </button>
                  )
                )}

                <button className="btn btn-secondary btn-sm" onClick={(e) => copyToClipboard(formattedAPA, "APA Citation", e)} title="Copy APA 7">
                  <i className="fa-solid fa-copy"></i>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onPreview(cit); }} title="Preview">
                  <i className="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Detailed Card View
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
      {citations.map((cit) => {
        const formattedAPA = cit.formats?.APA7?.referenceText || "";
        const isSelected = inspectedCitationId === cit.id;

        return (
          <div
            key={cit.id}
            className="glass-panel"
            onClick={() => onSelectCitation(cit)}
            style={{
              padding: "1.25rem",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "1rem",
              border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
              boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span className="badge badge-owner" style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>
                  {cit.pubType || "Article"}
                </span>
                {cit.year && (
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
                    {cit.year}
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.4, color: "var(--text-main)", fontFamily: "var(--font-serif)", marginBottom: "0.6rem" }}>
                {cit.title}
              </h3>

              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                <i className="fa-solid fa-user-graduate" style={{ marginRight: "0.3rem", color: "var(--primary)" }}></i>
                {cit.authors?.map((a: any, idx: number) => {
                  const fullName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
                  return (
                    <React.Fragment key={idx}>
                      <span
                        onClick={(e) => handleAuthorClick(fullName, e)}
                        style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        title={`View profile for ${fullName}`}
                      >
                        {a.firstName ? `${a.firstName} ${a.lastName}` : a.lastName}
                      </span>
                      {idx < cit.authors.length - 1 ? ", " : ""}
                    </React.Fragment>
                  );
                })}
              </div>

              {cit.journalOrPublisher && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  {cit.journalOrPublisher} {cit.volume ? `Vol. ${cit.volume}` : ""} {cit.issue ? `(${cit.issue})` : ""}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button className="btn btn-secondary btn-sm" onClick={(e) => copyToClipboard(formattedAPA, "APA Citation", e)} title="Copy Reference">
                  <i className="fa-solid fa-copy"></i> Copy APA
                </button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onPreview(cit); }} title="Preview">
                  <i className="fa-solid fa-eye"></i>
                </button>
              </div>

              {cit.isOwner ? (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderColor: "rgba(244,63,94,0.4)", color: "var(--accent-rose)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlink(cit.id);
                  }}
                  title="Un-own paper (release ownership)"
                >
                  <i className="fa-solid fa-link-slash"></i> Un-own
                </button>
              ) : (
                currentUserId && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClaim(cit.id);
                    }}
                  >
                    <i className="fa-solid fa-plus"></i> Claim
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
