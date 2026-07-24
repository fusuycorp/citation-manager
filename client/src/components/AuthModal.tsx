import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  showToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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

      onSuccess(data.user, data.token);
      showToast(tab === "login" ? `Welcome back, ${data.user.firstName || data.user.email}!` : "Registration successful!");

      if (data.autoClaimedCount && data.autoClaimedCount > 0) {
        showToast(`🎉 Automatically linked ${data.autoClaimedCount} pending citation invite(s) to your profile!`);
      }

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem" }}>
        {/* Header Tabs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => { setTab("login"); setError(null); }}
              style={{
                fontSize: "1.2rem",
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
                fontSize: "1.2rem",
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
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: "0.4rem 0.6rem" }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Domain Whitelist Banner Note */}
        {tab === "register" && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--primary-light)", border: "1px solid rgba(37,99,235,0.2)", fontSize: "0.85rem", color: "var(--primary)", marginBottom: "1.2rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <i className="fa-solid fa-shield-halved" style={{ fontSize: "1.1rem" }}></i>
            <div>
              <strong>Domain Whitelist Protection Active:</strong> Registration requires an authorized institutional email (e.g. <code>@bogazici.edu.tr</code> or <code>@gmail.com</code>).
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", fontSize: "0.85rem", color: "var(--accent-rose)", marginBottom: "1.2rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <div>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {tab === "register" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mehmet"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aydın"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address (Username)</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. mehmet.aydin@bogazici.edu.tr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
