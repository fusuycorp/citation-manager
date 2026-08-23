import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface AdminDashboardPageProps {
  token?: string | null;
  showToast: (msg: string) => void;
  onBackToDashboard: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  token: propToken,
  showToast,
  onBackToDashboard,
}) => {
  const { token: authToken } = useAuth();
  const token = propToken !== undefined ? propToken : authToken;
  const [activeTab, setActiveTab] = useState<"metrics" | "domains" | "users" | "duplicates" | "audit">("metrics");
  const [metrics, setMetrics] = useState<any | null>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filtering State for Master User List
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [userSortBy, setUserSortBy] = useState<"created_at" | "email" | "name" | "citations">("created_at");
  const [userSortOrder, setUserSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Add Domain State
  const [newDomain, setNewDomain] = useState("");
  const [policyType, setPolicyType] = useState<"EXACT" | "WILDCARD">("EXACT");

  // Edit Domain State
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editDomainPattern, setEditDomainPattern] = useState("");
  const [editPolicyType, setEditPolicyType] = useState<"EXACT" | "WILDCARD">("EXACT");

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserFirstName, setEditUserFirstName] = useState("");
  const [editUserLastName, setEditUserLastName] = useState("");
  const [editUserRole, setEditUserRole] = useState("user");
  const [editUserPassword, setEditUserPassword] = useState("");

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
    if (token) {
      fetchMetrics();
      fetchDomains();
      fetchUsers();
      fetchDuplicates();
      fetchAuditLogs();
    }
  }, [token]);

  const handleStartEditUser = (u: any) => {
    setEditingUserId(u.id);
    setEditUserEmail(u.email);
    setEditUserFirstName(u.firstName || "");
    setEditUserLastName(u.lastName || "");
    setEditUserRole(u.role || "user");
    setEditUserPassword("");
    setError(null);
  };

  const handleSaveEditUser = async (id: string) => {
    if (!editUserEmail.trim()) {
      setError("Email address is required.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: editUserEmail,
          firstName: editUserFirstName,
          lastName: editUserLastName,
          role: editUserRole,
          newPassword: editUserPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user details");

      showToast(`Updated user profile for ${editUserEmail}`);
      setEditingUserId(null);
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    if (!newDomain.trim()) return;

    setError(null);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: newDomain.trim(), policyType }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Domain policy '${newDomain.trim()}' added`);
        setNewDomain("");
        fetchDomains();
        fetchMetrics();
        fetchAuditLogs();
      } else {
        setError(data.error);
      }
    } catch (_) {}
  };

  const handleSaveEditDomain = async (id: string) => {
    if (!editDomainPattern.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: editDomainPattern.trim(), policyType: editPolicyType }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Updated domain policy`);
        setEditingDomainId(null);
        fetchDomains();
        fetchAuditLogs();
      } else {
        setError(data.error);
      }
    } catch (_) {}
  };

  const handleDeleteDomain = async (id: string, domainPattern: string) => {
    if (!confirm(`Are you sure you want to remove domain policy '${domainPattern}'?`)) return;
    try {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Domain policy '${domainPattern}' removed`);
        fetchDomains();
        fetchMetrics();
        fetchAuditLogs();
      }
    } catch (_) {}
  };

  // Filtered & Sorted Master User List
  const filteredUsers = usersList
    .filter((u) => {
      const query = userSearchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        u.email.toLowerCase().includes(query) ||
        (u.firstName && u.firstName.toLowerCase().includes(query)) ||
        (u.lastName && u.lastName.toLowerCase().includes(query)) ||
        (u.displayName && u.displayName.toLowerCase().includes(query));

      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchSearch && matchRole;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (userSortBy === "email") {
        cmp = a.email.localeCompare(b.email);
      } else if (userSortBy === "name") {
        cmp = (a.displayName || a.email).localeCompare(b.displayName || b.email);
      } else if (userSortBy === "citations") {
        cmp = (b.ownedCitationsCount || 0) - (a.ownedCitationsCount || 0);
      } else {
        cmp = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return userSortOrder === "ASC" ? cmp : -cmp;
    });

  const hasUserFilters = userSearchQuery || userRoleFilter !== "all" || userSortBy !== "created_at" || userSortOrder !== "DESC";

  const handleResetUserFilters = () => {
    setUserSearchQuery("");
    setUserRoleFilter("all");
    setUserSortBy("created_at");
    setUserSortOrder("DESC");
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Admin Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard} style={{ marginBottom: "0.5rem" }}>
            <i className="fa-solid fa-arrow-left"></i> Back to User Dashboard
          </button>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <i className="fa-solid fa-shield-halved" style={{ color: "var(--primary)" }}></i> System Administrative Control Portal
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Master User Directory & Profile Editing, Institutional Whitelist Policies, Duplicate Center & Audit Logs.
          </p>
        </div>
      </div>

      {/* KPI Cards Banner */}
      {metrics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Registered Users</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.2rem" }}>{metrics.totalUsers}</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Active Citations</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-emerald)", marginTop: "0.2rem" }}>{metrics.totalCitations}</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Orphan Citations</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-amber)", marginTop: "0.2rem" }}>{metrics.orphanCitations}</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Whitelisted Domains</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-purple)", marginTop: "0.2rem" }}>{metrics.activeDomains}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button className={`btn ${activeTab === "metrics" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("metrics")}>
          <i className="fa-solid fa-chart-pie"></i> System Status
        </button>
        <button className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("users")}>
          <i className="fa-solid fa-users-gear"></i> Master User List ({usersList.length})
        </button>
        <button className={`btn ${activeTab === "domains" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("domains")}>
          <i className="fa-solid fa-globe"></i> Domain Whitelist ({domains.length})
        </button>
        <button className={`btn ${activeTab === "duplicates" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("duplicates")}>
          <i className="fa-solid fa-copy"></i> Duplicates Scanner ({duplicates.length})
        </button>
        <button className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("audit")}>
          <i className="fa-solid fa-list-check"></i> System Audit Logs ({auditLogs.length})
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.8rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-lg)" }}>
        {activeTab === "metrics" && metrics && (
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>System Health & Infrastructure Overview</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div style={{ padding: "1.2rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontWeight: 800, marginBottom: "0.6rem" }}>Metadata Resolution APIs</h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
                  <li>Crossref REST API (Polite Pool): <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Active (45ms)</span></li>
                  <li>DataCite REST API: <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Active</span></li>
                  <li>NCBI PubMed API: <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Active</span></li>
                </ul>
              </div>

              <div style={{ padding: "1.2rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontWeight: 800, marginBottom: "0.6rem" }}>Database Engine & Server</h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
                  <li>Runtime: <span style={{ color: "var(--primary)", fontWeight: 700 }}>Bun Native Engine</span></li>
                  <li>Database: <span style={{ color: "var(--primary)", fontWeight: 700 }}>bun:sqlite WAL Mode</span></li>
                  <li>Domain Whitelist Protection: <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Enforcing Strict Policy</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Searchable & Filterable Master User List */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Master User List & Profile Editing</h3>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
                Showing {filteredUsers.length} of {usersList.length} Users
              </span>
            </div>

            {/* Master User List Toolbar: Search + Role Filter + Sort Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
                background: "var(--bg-main)",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
              }}
            >
              {/* Keyword Search Input */}
              <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.8rem" }}></i>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: "0.85rem", padding: "0.35rem 2rem 0.35rem 2.2rem" }}
                  placeholder="Search user email or name..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                {userSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setUserSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              {/* Role Filter Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Role:</span>
                <select
                  className="form-select"
                  style={{ fontSize: "0.85rem", padding: "0.35rem 0.6rem", width: "auto" }}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                >
                  <option value="all">All Roles</option>
                  <option value="user">Regular Users</option>
                  <option value="admin">Administrators Only</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Sort:</span>
                <select
                  className="form-select"
                  style={{ fontSize: "0.85rem", padding: "0.35rem 0.6rem", width: "auto" }}
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                >
                  <option value="created_at">Date Joined</option>
                  <option value="email">Email Address</option>
                  <option value="name">Display Name</option>
                  <option value="citations">Most Citations Owned</option>
                </select>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setUserSortOrder(userSortOrder === "DESC" ? "ASC" : "DESC")}
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                  title={`Order: ${userSortOrder === "DESC" ? "Descending" : "Ascending"}`}
                >
                  {userSortOrder === "DESC" ? (
                    <i className="fa-solid fa-arrow-down-wide-short"></i>
                  ) : (
                    <i className="fa-solid fa-arrow-up-wide-short"></i>
                  )}
                </button>
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasUserFilters && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem", fontSize: "0.8rem", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Active User Filters:</span>
                {userSearchQuery && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Keyword: "{userSearchQuery}"
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setUserSearchQuery("")}></i>
                  </span>
                )}
                {userRoleFilter !== "all" && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Role: {userRoleFilter.toUpperCase()}
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setUserRoleFilter("all")}></i>
                  </span>
                )}
                <button className="btn btn-outline btn-sm" onClick={handleResetUserFilters} style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem", marginLeft: "0.2rem" }}>
                  Reset Filters
                </button>
              </div>
            )}

            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-users-slash" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></i>
                <p style={{ fontWeight: 600 }}>No users match the specified search query or role filter.</p>
                <button className="btn btn-secondary btn-sm" onClick={handleResetUserFilters} style={{ marginTop: "0.8rem" }}>
                  Reset User Filters
                </button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem" }}>User Display Name</th>
                    <th style={{ padding: "0.75rem" }}>Email Address (Username)</th>
                    <th style={{ padding: "0.75rem" }}>Owned Citations</th>
                    <th style={{ padding: "0.75rem" }}>System Role</th>
                    <th style={{ padding: "0.75rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isEditing = editingUserId === u.id;

                    if (isEditing) {
                      return (
                        <tr key={u.id} style={{ background: "var(--primary-light)", borderBottom: "2px solid var(--primary)" }}>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="First"
                                value={editUserFirstName}
                                onChange={(e) => setEditUserFirstName(e.target.value)}
                                style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Last"
                                value={editUserLastName}
                                onChange={(e) => setEditUserLastName(e.target.value)}
                                style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <input
                              type="email"
                              className="form-input"
                              value={editUserEmail}
                              onChange={(e) => setEditUserEmail(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          </td>
                          <td style={{ padding: "0.6rem" }}>{u.ownedCitationsCount}</td>
                          <td style={{ padding: "0.6rem" }}>
                            <select
                              className="form-select"
                              value={editUserRole}
                              onChange={(e) => setEditUserRole(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                              <button className="btn btn-primary btn-sm" onClick={() => handleSaveEditUser(u.id)} disabled={loading}>
                                {loading ? "Saving..." : "Save"}
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingUserId(null)}>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 700 }}>
                          <i className="fa-solid fa-user-circle" style={{ marginRight: "0.4rem", color: "var(--primary)" }}></i>
                          {u.displayName}
                        </td>
                        <td style={{ padding: "0.75rem" }}>{u.email}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <span className="badge badge-owner">{u.ownedCitationsCount} Citations</span>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{ fontWeight: 700, color: u.role === "admin" ? "var(--accent-purple)" : "var(--text-muted)" }}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleStartEditUser(u)} title="Edit User Master Profile">
                              <i className="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button
                              className={`btn btn-sm ${u.role === "admin" ? "btn-outline" : "btn-primary"}`}
                              onClick={() => handleToggleRole(u.id, u.role)}
                            >
                              {u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Institutional Domain Whitelist */}
        {activeTab === "domains" && (
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>Institutional Domain Whitelist Policy</h3>
            
            {/* Add New Policy Form */}
            <form onSubmit={handleAddDomain} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", background: "var(--bg-main)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Domain pattern (e.g. @mit.edu or *.ac.uk)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                style={{ flex: 1 }}
              />
              <select className="form-select" value={policyType} onChange={(e) => setPolicyType(e.target.value as any)} style={{ width: "auto" }}>
                <option value="EXACT">EXACT Domain (@domain.com)</option>
                <option value="WILDCARD">WILDCARD Subdomain (*.domain.edu)</option>
              </select>
              <button type="submit" className="btn btn-primary">
                <i className="fa-solid fa-plus"></i> Add Domain Policy
              </button>
            </form>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Domain Pattern</th>
                  <th style={{ padding: "0.75rem" }}>Policy Matching Type</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => {
                  const isEditing = editingDomainId === d.id;
                  if (isEditing) {
                    return (
                      <tr key={d.id} style={{ background: "var(--primary-light)", borderBottom: "2px solid var(--primary)" }}>
                        <td style={{ padding: "0.6rem" }}>
                          <input
                            type="text"
                            className="form-input"
                            value={editDomainPattern}
                            onChange={(e) => setEditDomainPattern(e.target.value)}
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.6rem" }}>
                          <select
                            className="form-select"
                            value={editPolicyType}
                            onChange={(e) => setEditPolicyType(e.target.value as any)}
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                          >
                            <option value="EXACT">EXACT</option>
                            <option value="WILDCARD">WILDCARD</option>
                          </select>
                        </td>
                        <td style={{ padding: "0.6rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveEditDomain(d.id)}>Save</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingDomainId(null)}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 700 }}>
                        <i className="fa-solid fa-shield-check" style={{ marginRight: "0.4rem", color: "var(--accent-emerald)" }}></i>
                        {d.domain}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span className="badge badge-owner">{d.policyType}</span>
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingDomainId(d.id);
                              setEditDomainPattern(d.domain);
                              setEditPolicyType(d.policyType);
                            }}
                          >
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleDeleteDomain(d.id, d.domain)}>
                            <i className="fa-solid fa-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Duplicates Scanner */}
        {activeTab === "duplicates" && (
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>Citation Duplicate Resolution Scanner</h3>
            {duplicates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--accent-emerald)" }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}></i>
                <p style={{ fontWeight: 700 }}>No duplicate citations detected in database directory.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {duplicates.map((dup, idx) => (
                  <div key={dup.id || idx} style={{ padding: "1rem", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{dup.sourceTitle || dup.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {dup.matchReason ? (
                        <span>Match Reason: <span style={{ fontWeight: 800, color: "var(--accent-rose)" }}>{dup.matchReason}</span>{dup.targetTitle ? ` (Target: ${dup.targetTitle})` : ""}</span>
                      ) : (
                        <span>Duplicate occurrences: <span style={{ fontWeight: 800, color: "var(--accent-rose)" }}>{dup.duplicateCount}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: System Audit Logs */}
        {activeTab === "audit" && (
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem" }}>System Security & Administrative Audit Trail</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "0.6rem" }}>Timestamp</th>
                  <th style={{ padding: "0.6rem" }}>Admin Email</th>
                  <th style={{ padding: "0.6rem" }}>Action Performed</th>
                  <th style={{ padding: "0.6rem" }}>Target Symbol</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.6rem", color: "var(--text-muted)" }}>
                      {new Date(log.created_at || log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.6rem", fontWeight: 700 }}>{log.admin_email || log.adminEmail}</td>
                    <td style={{ padding: "0.6rem" }}>
                      <span className="badge badge-owner">{log.action}</span>
                    </td>
                    <td style={{ padding: "0.6rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                      {log.target || log.details || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
