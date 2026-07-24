import React, { useEffect, useState } from "react";

interface AdminDomainManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  showToast: (msg: string) => void;
}

export const AdminDomainManagerModal: React.FC<AdminDomainManagerModalProps> = ({
  isOpen,
  onClose,
  token,
  showToast,
}) => {
  const [domains, setDomains] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [policyType, setPolicyType] = useState<"EXACT" | "WILDCARD">("EXACT");
  const [tab, setTab] = useState<"domains" | "audit">("domains");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/admin/domains", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDomains(data.domains || []);
      }
    } catch (_) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.auditLogs || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchDomains();
      fetchAuditLogs();
      setNewDomain("");
      setError(null);
    }
  }, [isOpen]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newDomain.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: newDomain, policyType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add domain");

      showToast(`Domain policy '${data.domain.domain}' added to whitelist!`);
      setNewDomain("");
      fetchDomains();
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove '${domainName}' from the whitelist?`)) return;

    try {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Removed '${domainName}' from whitelist.`);
        fetchDomains();
        fetchAuditLogs();
      }
    } catch (_) {}
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem", maxWidth: 740 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "var(--primary)" }}></i> System Administration & Domain Control
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Manage whitelisted domain policies and inspect immutable security audit logs.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
          <button
            className={`btn btn-sm ${tab === "domains" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("domains")}
          >
            <i className="fa-solid fa-globe"></i> Domain Policy Matrix ({domains.length})
          </button>
          <button
            className={`btn btn-sm ${tab === "audit" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("audit")}
          >
            <i className="fa-solid fa-list-check"></i> System Audit Trail ({auditLogs.length})
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </div>
        )}

        {tab === "domains" ? (
          <>
            {/* Add Domain Form */}
            <form onSubmit={handleAddDomain} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Domain pattern (e.g. bogazici.edu.tr or *.ac.uk)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <select className="form-select" value={policyType} onChange={(e) => setPolicyType(e.target.value as any)}>
                <option value="EXACT">EXACT Match</option>
                <option value="WILDCARD">WILDCARD (*.)</option>
              </select>
              <button type="submit" className="btn btn-primary" disabled={loading || !newDomain}>
                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Add Policy"}
              </button>
            </form>

            {/* List of Whitelisted Domains */}
            <div>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>Active Domain Whitelist Policies</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 240, overflowY: "auto" }}>
                {domains.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{d.domain}</span>
                      <span className={`badge ${d.policy_type === "WILDCARD" ? "badge-coowner" : "badge-owner"}`}>
                        {d.policy_type || "EXACT"}
                      </span>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDomain(d.id, d.domain)}>
                      <i className="fa-solid fa-trash-can"></i> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Audit Logs Table */
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {auditLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>No audit log events recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ padding: "0.6rem 0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--primary)" }}>{log.action}</span>
                      <span style={{ color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div>Target: <strong>{log.target_entity}</strong> | By: {log.admin_email}</div>
                    {log.details && <div style={{ color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.2rem" }}>{log.details}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
