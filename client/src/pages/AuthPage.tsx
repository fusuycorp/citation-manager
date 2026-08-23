import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface AuthPageProps {
  onSuccess: (user: any, token: string) => void;
  showToast: (msg: string) => void;
  onBackToDashboard: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, showToast, onBackToDashboard }) => {
  const { login } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = tab === "login" ? { email, password } : { email, password, firstName, lastName };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      login(data.user, data.token);
      if (onSuccess) {
        onSuccess(data.user, data.token);
      }
      showToast(tab === "login" ? `Welcome back, ${data.user.firstName || data.user.email}!` : "Registration successful!");

      if (data.autoClaimedCount && data.autoClaimedCount > 0) {
        showToast(`🎉 Automatically linked ${data.autoClaimedCount} pending citation invite(s) to your profile!`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: 480, padding: "2.5rem", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}>
        <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard} style={{ marginBottom: "1.5rem" }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Directory
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            <i className="fa-solid fa-quote-left"></i>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>CiteSphere Authentication</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Academic Citation Management Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "0.5rem" }}>
          <button
            onClick={() => { setTab("login"); setError(null); }}
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tab === "login" ? "var(--primary)" : "var(--text-muted)",
              borderBottom: tab === "login" ? "3px solid var(--primary)" : "3px solid transparent",
              paddingBottom: "0.3rem",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("register"); setError(null); }}
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tab === "register" ? "var(--primary)" : "var(--text-muted)",
              borderBottom: tab === "register" ? "3px solid var(--primary)" : "3px solid transparent",
              paddingBottom: "0.3rem",
            }}
          >
            Register
          </button>
        </div>

        {/* Domain Whitelist Note */}
        {tab === "register" && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--primary-light)", border: "1px solid rgba(37,99,235,0.2)", fontSize: "0.85rem", color: "var(--primary)", marginBottom: "1.2rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <i className="fa-solid fa-shield-halved" style={{ fontSize: "1.1rem" }}></i>
            <div>
              <strong>Domain Whitelist Active:</strong> Email domain must match institutional whitelist (e.g. <code>@bogazici.edu.tr</code>, <code>@gmail.com</code>, <code>*.ac.uk</code>).
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1.2rem", fontSize: "0.85rem" }}>
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === "register" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input type="text" className="form-input" placeholder="e.g. Mehmet" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-input" placeholder="e.g. Aydın" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address (Username)</label>
            <input type="email" className="form-input" placeholder="e.g. mehmet.aydin@bogazici.edu.tr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
