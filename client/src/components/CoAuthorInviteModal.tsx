import React, { useEffect, useState } from "react";

interface CoAuthorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: any | null;
  token: string | null;
  showToast: (msg: string) => void;
  onOwnershipChanged: () => void;
}

export const CoAuthorInviteModal: React.FC<CoAuthorInviteModalProps> = ({
  isOpen,
  onClose,
  citation,
  token,
  showToast,
  onOwnershipChanged,
}) => {
  const [matchingUsers, setMatchingUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (citation && isOpen) {
      // Extract author surnames from citation
      const surnames = (citation.authors || []).map((a: any) => a.lastName).filter(Boolean);
      fetchAutoSurnameMatches(surnames);
    }
    setSearchQuery("");
    setSearchResults([]);
    setInviteEmail("");
  }, [citation, isOpen]);

  const fetchAutoSurnameMatches = async (surnames: string[]) => {
    if (!surnames || surnames.length === 0) return;
    try {
      const results: any[] = [];
      const seenIds = new Set<string>();

      for (const s of surnames) {
        const res = await fetch(`/api/users/search?surname=${encodeURIComponent(s)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.users) {
          for (const u of data.users) {
            if (!seenIds.has(u.id)) {
              seenIds.add(u.id);
              results.push(u);
            }
          }
        }
      }
      setMatchingUsers(results);
    } catch (_) {}
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(val)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (_) {}
  };

  const handleSendInvite = async (emailToSend: string) => {
    if (!emailToSend || !citation) return;
    setLoading(true);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          citationId: citation.id,
          invitedEmail: emailToSend,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      showToast(data.message);
      onOwnershipChanged();
      setInviteEmail("");
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !citation) return null;

  const currentOwnerIds = (citation.owners || []).map((o: any) => o.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              <i className="fa-solid fa-user-plus" style={{ color: "var(--primary)" }}></i> Co-Author Invitations & Ownership
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Manage co-owners for <em>"{citation.title.slice(0, 50)}..."</em>
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Existing Co-Owners List */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-main)" }}>
            Current Active Co-Owners ({citation.owners ? citation.owners.length : 0})
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {citation.owners && citation.owners.length > 0 ? (
              citation.owners.map((owner: any) => (
                <div key={owner.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)", background: "var(--primary-light)", border: "1px solid rgba(37,99,235,0.3)", fontSize: "0.85rem", fontWeight: 600 }}>
                  <i className="fa-solid fa-user-check" style={{ color: "var(--primary)" }}></i>
                  {owner.name} ({owner.email})
                </div>
              ))
            ) : (
              <span className="badge badge-unowned">
                <i className="fa-solid fa-ghost"></i> No Owners (Unowned Record State)
              </span>
            )}
          </div>
        </div>

        {/* Smart Author Surname Matches Section */}
        {matchingUsers.length > 0 && (
          <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "var(--radius-md)", background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-purple)", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> Auto-Detected Surname Matches in System
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              The following registered users match author surnames found in this citation:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {matchingUsers.map((u) => {
                const isAlreadyOwner = currentOwnerIds.includes(u.id);
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{u.displayName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>
                    </div>
                    {isAlreadyOwner ? (
                      <span className="badge badge-owner">Co-Owner</span>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handleSendInvite(u.email)} disabled={loading}>
                        <i className="fa-solid fa-link"></i> Add Co-Owner
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Registered Users */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>Search Registered Users</h4>
          <input
            type="text"
            className="form-input"
            placeholder="Search user by surname, first name, or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 150, overflowY: "auto" }}>
              {searchResults.map((u) => {
                const isAlreadyOwner = currentOwnerIds.includes(u.id);
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.7rem", background: "var(--bg-main)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                    <span>{u.displayName} ({u.email})</span>
                    {isAlreadyOwner ? (
                      <span className="badge badge-owner">Co-Owner</span>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handleSendInvite(u.email)} disabled={loading}>
                        Add Co-Owner
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Send In-App Invite for Unregistered Email */}
        <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
            <i className="fa-solid fa-paper-plane" style={{ color: "var(--primary)" }}></i> Invite Unregistered Author
          </h4>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            If the co-author is not yet on the platform, enter their whitelisted email address. They will automatically co-own this paper when they register!
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. coauthor@bogazici.edu.tr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className="btn btn-primary" onClick={() => handleSendInvite(inviteEmail)} disabled={loading || !inviteEmail}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Send Invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
