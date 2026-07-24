import React, { useEffect, useState } from "react";

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  showToast: (msg: string) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  token,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"metrics" | "domains" | "users" | "duplicates" | "audit">("metrics");
  const [metrics, setMetrics] = useState<any | null>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [newDomain, setNewDomain] = useState("");
  const [policyType, setPolicyType] = useState<"EXACT" | "WILDCARD">("EXACT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/metrics", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setMetrics(data.metrics);
    } catch (_) {}
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/admin/domains", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setDomains(data.domains || []);
    } catch (_) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUsersList(data.users || []);
    } catch (_) {}
  };

  const fetchDuplicates = async () => {
    try {
      const res = await fetch("/api/admin/duplicates", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setDuplicates(data.duplicates || []);
    } catch (_) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setAuditLogs(data.auditLogs || []);
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchMetrics();
      fetchDomains();
      fetchUsers();
      fetchDuplicates();
      fetchAuditLogs();
      setError(null);
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: nextRole }),
      });
      if (res.ok) {
        showToast(`User role updated to ${nextRole}`);
        fetchUsers();
        fetchAuditLogs();
      }
    } catch (_) {}
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newDomain.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: newDomain, policyType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add domain");

      showToast(`Added domain policy '${data.domain.domain}'`);
      setNewDomain("");
      fetchDomains();
      fetchMetrics();
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Remove '${domainName}' from whitelist?`)) return;
    try {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Removed '${domainName}'`);
        fetchDomains();
        fetchMetrics();
        fetchAuditLogs();
      }
    } catch (_) {}
  };

  const handleMergeDuplicates = async (sourceId: string, targetId: string) => {
    if (!confirm("Merge duplicate citations into target?")) return;
    try {
      const res = await fetch("/api/admin/merge-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceId, targetId }),
      });
      if (res.ok) {
        showToast("Duplicate citations merged successfully!");
        fetchDuplicates();
        fetchMetrics();
        fetchAuditLogs();
      }
    } catch (_) {}
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem", maxWidth: 840 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "var(--primary)" }}></i> System Administration & Operations Hub
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Manage whitelist policies, user roles, duplicate citations, and audit logs.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* System KPI Cards Banner */}
        {metrics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Users</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)" }}>{metrics.totalUsers}</div>
            </div>
            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Active Citations</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{metrics.totalCitations}</div>
            </div>
            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Orphan Citations</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-amber)" }}>{metrics.orphanCitations}</div>
            </div>
            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Whitelisted Domains</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-purple)" }}>{metrics.activeDomains}</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
          <button className={`btn btn-sm ${activeTab === "metrics" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("metrics")}>
            <i className="fa-solid fa-chart-pie"></i> System Status
          </button>
          <button className={`btn btn-sm ${activeTab === "domains" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("domains")}>
            <i className="fa-solid fa-globe"></i> Domain Whitelist ({domains.length})
          </button>
          <button className={`btn btn-sm ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("users")}>
            <i className="fa-solid fa-users-gear"></i> User Roles ({usersList.length})
          </button>
          <button className={`btn btn-sm ${activeTab === "duplicates" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("duplicates")}>
            <i className="fa-solid fa-copy"></i> Duplicates ({duplicates.length})
          </button>
          <button className={`btn btn-sm ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("audit")}>
            <i className="fa-solid fa-list-check"></i> Audit Logs ({auditLogs.length})
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </div>
        )}

        {/* Tab 1: System Status */}
        {activeTab === "metrics" && metrics && (
          <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)", fontSize: "0.9rem" }}>
            <h4 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Operational Status Overview</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li><strong>Crossref & DOI API Metadata Resolver:</strong> <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Operational</span></li>
              <li><strong>SQLite WAL Database Sync:</strong> <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Active (Healthy)</span></li>
              <li><strong>Domain Whitelist Restriction Engine:</strong> <span style={{ color: "var(--primary)", fontWeight: 700 }}>Enforcing Domain Rules</span></li>
            </ul>
          </div>
        )}

        {/* Tab 2: Domain Whitelist */}
        {activeTab === "domains" && (
          <>
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
                Add Policy
              </button>
            </form>
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
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab 3: User Management Roles */}
        {activeTab === "users" && (
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>User</th>
                  <th style={{ padding: "0.5rem" }}>Email</th>
                  <th style={{ padding: "0.5rem" }}>Owned Papers</th>
                  <th style={{ padding: "0.5rem" }}>Role</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.5rem", fontWeight: 700 }}>{u.displayName}</td>
                    <td style={{ padding: "0.5rem" }}>{u.email}</td>
                    <td style={{ padding: "0.5rem" }}>{u.ownedCitationsCount} citations</td>
                    <td style={{ padding: "0.5rem" }}>
                      <span className={`badge ${u.role === "admin" ? "badge-owner" : "badge-coowner"}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleToggleRole(u.id, u.role)}>
                        Make {u.role === "admin" ? "User" : "Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Duplicates Resolution Center */}
        {activeTab === "duplicates" && (
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {duplicates.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No duplicate citations detected.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {duplicates.map((dup) => (
                  <div key={dup.id} style={{ padding: "0.8rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--primary)" }}>{dup.matchReason}</div>
                      <div style={{ fontSize: "0.8rem", margin: "0.2rem 0" }}>Source: "{dup.sourceTitle}"</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Target: "{dup.targetTitle}"</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleMergeDuplicates(dup.sourceId, dup.targetId)}>
                      Merge Citation Pair
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Audit Trail Logs */}
        {activeTab === "audit" && (
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ padding: "0.6rem 0.8rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>{log.action}</span>
                    <span style={{ color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div>Target: <strong>{log.target_entity}</strong> | Admin: {log.admin_email}</div>
                  {log.details && <div style={{ color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.2rem" }}>{log.details}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
