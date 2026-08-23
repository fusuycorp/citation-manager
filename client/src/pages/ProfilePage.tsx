import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface ProfilePageProps {
  identifier: string;
  token?: string | null;
  currentUserId?: string | null;
  onBackToDashboard: () => void;
  onNavigateProfile: (idOrName: string) => void;
  onFilterByAuthor: (authorName: string) => void;
  showToast: (msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  identifier,
  token: propToken,
  currentUserId: propCurrentUserId,
  onBackToDashboard,
  onNavigateProfile,
  onFilterByAuthor,
  showToast,
}) => {
  const { user: authUser, token: authToken } = useAuth();
  const token = propToken !== undefined ? propToken : authToken;
  const currentUserId = propCurrentUserId !== undefined ? propCurrentUserId : (authUser?.id || null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`/api/profiles/${encodeURIComponent(identifier)}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfileData(data);
        } else {
          // Fallback to Template Author Profile if backend returns empty
          setProfileData({
            type: "author",
            profile: {
              name: identifier,
              paperCount: 0,
              coAuthors: [],
              isRegisteredUser: false,
            },
            citations: [],
          });
        }
      })
      .catch(() => {
        // Fallback to Template Author Profile on network error
        setProfileData({
          type: "author",
          profile: {
            name: identifier,
            paperCount: 0,
            coAuthors: [],
            isRegisteredUser: false,
          },
          citations: [],
        });
      })
      .finally(() => setLoading(false));
  }, [identifier, token]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center", color: "var(--primary)" }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "2.5rem", marginBottom: "1rem" }}></i>
        <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.2rem" }}>Loading Scholar Profile...</h3>
      </div>
    );
  }

  // Always use profileData or fallback template (NEVER show Profile Not Found screen)
  const safeData = profileData || {
    type: "author",
    profile: { name: identifier, paperCount: 0, coAuthors: [], isRegisteredUser: false },
    citations: [],
  };

  const { type, profile, citations = [] } = safeData;
  const isUser = type === "user";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Back Button */}
      <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard} style={{ marginBottom: "1.25rem" }}>
        <i className="fa-solid fa-arrow-left"></i> Back to Directory Stream
      </button>

      {/* Scholar / Author Header Banner Card */}
      <div
        className="glass-panel"
        style={{
          padding: "2rem",
          borderRadius: "var(--radius-lg)",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          {/* Avatar Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: isUser ? "linear-gradient(135deg, #1e3a8a, #0f766e)" : "linear-gradient(135deg, #b45309, #881337)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.2rem",
              fontWeight: 800,
              boxShadow: "var(--shadow-md)",
            }}
          >
            {(profile.name || identifier || "A").charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--primary)" }}>
                {profile.name || identifier}
              </h2>
              {isUser ? (
                <span className="badge badge-owner" style={{ fontSize: "0.75rem", background: "rgba(30, 58, 138, 0.15)", color: "var(--primary)" }}>
                  <i className="fa-solid fa-user-check" style={{ marginRight: "0.3rem" }}></i> Registered User
                </span>
              ) : (
                <span className="badge badge-owner" style={{ fontSize: "0.75rem", background: "rgba(180, 83, 9, 0.15)", color: "var(--accent-amber)" }}>
                  <i className="fa-solid fa-book-bookmark" style={{ marginRight: "0.3rem" }}></i> Scholar Profile Template
                </span>
              )}
            </div>

            {isUser && profile.email && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                <i className="fa-solid fa-envelope" style={{ marginRight: "0.4rem" }}></i>
                {profile.email}
              </div>
            )}

            {!isUser && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: "0.4rem" }}></i>
                Unregistered Scholar Directory Profile
              </div>
            )}
          </div>
        </div>

        {/* Publication Stats Metrics */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
              minWidth: 110,
            }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>{citations.length}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Publications</div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              onFilterByAuthor(profile.name || identifier);
              onBackToDashboard();
            }}
            style={{ height: "fit-content", alignSelf: "center", padding: "0.6rem 1rem" }}
          >
            <i className="fa-solid fa-filter"></i> Filter Directory by Author
          </button>
        </div>
      </div>

      {/* Co-Authors Network Section */}
      {profile.coAuthors && profile.coAuthors.length > 0 && (
        <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "2rem" }}>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <i className="fa-solid fa-users" style={{ color: "var(--primary)" }}></i> Frequent Co-Authors
          </h4>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {profile.coAuthors.map((coAuthor: string, idx: number) => (
              <span
                key={idx}
                onClick={() => onNavigateProfile(coAuthor)}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  color: "var(--primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--primary-light)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-main)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
                title={`Inspect profile for ${coAuthor}`}
              >
                <i className="fa-solid fa-user-graduate" style={{ marginRight: "0.35rem", fontSize: "0.75rem" }}></i>
                {coAuthor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bibliography Section Stream */}
      <div>
        <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.3rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-book-open" style={{ color: "var(--primary)" }}></i>
          Authored Publications ({citations.length})
        </h3>

        {citations.length === 0 ? (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.5 }}></i>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.3rem" }}>No Indexed Citations Found for "{profile.name || identifier}"</h4>
            <p style={{ fontSize: "0.8rem", maxWidth: 400, margin: "0 auto" }}>
              Currently no publication records in the directory match this author name.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {citations.map((cit: any) => {
              const formattedAPA = cit.formats?.APA7?.referenceText || `${cit.authors?.[0]?.lastName || "Author"} (${cit.year || "n.d."}). ${cit.title}.`;

              return (
                <div
                  key={cit.id}
                  className="glass-panel"
                  style={{
                    padding: "1.25rem",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.4, color: "var(--text-main)" }}>
                      {cit.title}
                    </h4>
                    {cit.year && (
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                        {cit.year}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <i className="fa-solid fa-users" style={{ marginRight: "0.4rem" }}></i>
                    {cit.authors?.map((a: any, idx: number) => {
                      const dName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
                      return (
                        <React.Fragment key={idx}>
                          <span
                            onClick={() => onNavigateProfile(dName)}
                            style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          >
                            {dName}
                          </span>
                          {idx < cit.authors.length - 1 ? "; " : ""}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {cit.journalOrPublisher && (
                    <div style={{ fontSize: "0.8rem", fontStyle: "italic", color: "var(--text-muted)" }}>
                      {cit.journalOrPublisher} {cit.volume ? `Vol. ${cit.volume}` : ""} {cit.issue ? `(${cit.issue})` : ""}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "0.6rem", marginTop: "0.2rem" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => copyToClipboard(formattedAPA, "APA Reference")}
                    >
                      <i className="fa-solid fa-copy"></i> Copy Citation
                    </button>
                    {cit.doi && (
                      <a
                        href={cit.doi.startsWith("http") ? cit.doi : `https://doi.org/${cit.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--primary)" }}
                      >
                        DOI: {cit.doi}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
