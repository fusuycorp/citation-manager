import React, { useEffect, useState } from "react";

interface UserSettingsPageProps {
  user: any;
  token: string | null;
  showToast: (msg: string) => void;
  onUpdateUser: (updatedUser: any) => void;
  onBackToDashboard: () => void;
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  user,
  token,
  showToast,
  onUpdateUser,
  onBackToDashboard,
}) => {
  // Profile State
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Preference State
  const [defaultCslStyle, setDefaultCslStyle] = useState("APA7");
  const [defaultInTextMode, setDefaultInTextMode] = useState("parenthetical");
  const [viewDensity, setViewDensity] = useState("card");
  const [defaultExportFormat, setDefaultExportFormat] = useState("BibTeX");
  const [exportIncludeAbstract, setExportIncludeAbstract] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetch("/api/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.preferences) {
            setDefaultCslStyle(data.preferences.defaultCslStyle || "APA7");
            setDefaultInTextMode(data.preferences.defaultInTextMode || "parenthetical");
            setViewDensity(data.preferences.viewDensity || "card");
            setDefaultExportFormat(data.preferences.defaultExportFormat || "BibTeX");
            setExportIncludeAbstract(!!data.preferences.exportIncludeAbstract);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileLoading(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      showToast("Profile information updated successfully!");
      onUpdateUser(data.user);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPassword !== confirmPassword) {
      setPassError("New password and confirm password do not match");
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      showToast("🔐 Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefLoading(true);

    try {
      const prefs = {
        defaultCslStyle,
        defaultInTextMode,
        viewDensity,
        defaultExportFormat,
        exportIncludeAbstract,
      };

      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        showToast("Citation preferences saved!");
      }
    } catch (_) {
    } finally {
      setPrefLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard} style={{ marginBottom: "0.5rem" }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Account & Citation Preferences</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Manage your personal profile, security password, and default citation formatting preferences.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Profile Information Section */}
        <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i className="fa-solid fa-user-gear" style={{ color: "var(--primary)" }}></i> Profile Information
          </h3>

          {profileError && (
            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1rem", fontSize: "0.85rem" }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Email Address (Username)</label>
              <input type="email" className="form-input" value={user.email} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
            </div>

            <div className="form-group">
              <label className="form-label">First Name</label>
              <input type="text" className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={profileLoading}>
              {profileLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Save Profile Changes"}
            </button>
          </form>
        </div>

        {/* Security & Password Change Section */}
        <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i className="fa-solid fa-key" style={{ color: "var(--accent-amber)" }}></i> Security & Password Change
          </h3>

          {passError && (
            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1rem", fontSize: "0.85rem" }}>
              <i className="fa-solid fa-circle-exclamation"></i> {passError}
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" placeholder="••••••••" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">New Password (min. 6 characters)</label>
              <input type="password" className="form-input" placeholder="••••••••" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={passLoading}>
              {passLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Citation Formatting Preferences */}
      <div className="glass-panel" style={{ padding: "1.8rem", borderRadius: "var(--radius-lg)", marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-sliders" style={{ color: "var(--accent-purple)" }}></i> Citation Formatting Defaults
        </h3>

        <form onSubmit={handleSavePreferences} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Default Citation Style</label>
            <select className="form-select" value={defaultCslStyle} onChange={(e) => setDefaultCslStyle(e.target.value)}>
              <option value="APA7">APA 7th Edition (Default)</option>
              <option value="IEEE">IEEE</option>
              <option value="MLA9">MLA 9th Edition</option>
              <option value="Chicago17">Chicago 17th Edition</option>
              <option value="Harvard">Harvard</option>
              <option value="BibTeX">BibTeX</option>
              <option value="RIS">RIS</option>
              <option value="CSL-JSON">CSL-JSON</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default In-Text Citation Mode</label>
            <select className="form-select" value={defaultInTextMode} onChange={(e) => setDefaultInTextMode(e.target.value)}>
              <option value="parenthetical">Parenthetical - (Aydın et al., 2025)</option>
              <option value="narrative">Narrative - Aydın et al. (2025)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default View Density</label>
            <select className="form-select" value={viewDensity} onChange={(e) => setViewDensity(e.target.value)}>
              <option value="card">Detailed Card View (Rich Cards)</option>
              <option value="compact">Compact List View (High Density)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default Export Standard</label>
            <select className="form-select" value={defaultExportFormat} onChange={(e) => setDefaultExportFormat(e.target.value)}>
              <option value="BibTeX">BibTeX (.bib)</option>
              <option value="RIS">RIS (.ris)</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" className="btn btn-primary" disabled={prefLoading}>
              {prefLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
