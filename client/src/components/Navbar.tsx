import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  user?: { email: string; firstName?: string; lastName?: string; role?: string } | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onNavigatePage: (page: "dashboard" | "admin" | "settings" | "auth" | "help" | "profile") => void;
  onNavigateProfile?: (idOrName: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  user: propUser,
  onOpenAuth,
  onLogout: propOnLogout,
  onNavigatePage,
  onNavigateProfile,
  theme,
  onToggleTheme,
  currentPage,
}) => {
  const { user: authUser, logout: authLogout } = useAuth();
  const user = propUser !== undefined ? propUser : authUser;
  const handleLogout = propOnLogout || authLogout;

  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  const handleProfileSearch = (val: string) => {
    setProfileSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(val.trim())}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok && !controller.signal.aborted) {
          setSearchResults(data.results || []);
          setShowDropdown(true);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // Ignore network errors or aborted fetches
        }
      }
    }, 300);
  };

  const handleSelectSearchResult = (res: any) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    setProfileSearchQuery("");
    setShowDropdown(false);
    if (onNavigateProfile) {
      onNavigateProfile(res.identifier);
    }
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    setProfileSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleLoginClick = () => {
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      onNavigatePage("auth");
    }
  };

  return (
    <header className="glass-panel" style={{ position: "sticky", top: 0, zIndex: 100, padding: "0.8rem 1.5rem" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        {/* Brand Logo */}
        <div
          onClick={() => onNavigatePage("dashboard")}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
        >
          <div style={{ width: 38, height: 38, borderRadius: "10px", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "1.2rem", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            <i className="fa-solid fa-quote-left"></i>
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em", background: "linear-gradient(135deg, var(--text-main), var(--primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CiteSphere
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Academic Citation Manager
            </p>
          </div>
        </div>

        {/* Global Scholar Profile Search Bar */}
        <div style={{ position: "relative", minWidth: 240 }}>
          <i className="fa-solid fa-user-graduate" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.8rem" }}></i>
          <input
            type="text"
            className="form-input"
            style={{ fontSize: "0.8rem", padding: "0.35rem 1.8rem 0.35rem 2.2rem" }}
            placeholder="Search scholar profile..."
            value={profileSearchQuery}
            onChange={(e) => handleProfileSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
          />
          {profileSearchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}

          {/* Autocomplete Profile Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "100%",
                marginTop: 4,
                maxHeight: 220,
                overflowY: "auto",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                zIndex: 110,
              }}
            >
              {searchResults.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(r)}
                  style={{
                    padding: "0.45rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <i className={`fa-solid ${r.type === "user" ? "fa-user-check" : "fa-user-graduate"}`} style={{ color: r.type === "user" ? "var(--primary)" : "var(--accent-amber)", fontSize: "0.75rem" }}></i>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    {r.type === "user" ? "User Profile" : `${r.paperCount} Papers`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls & Dedicated Page Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Main Citations Stream Navigation Button */}
          <button
            className={`btn btn-sm ${currentPage === "dashboard" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onNavigatePage("dashboard")}
            title="Go to Citations Directory Stream"
          >
            <i className="fa-solid fa-house"></i> Citations Stream
          </button>

          {/* Help & Tutorial Button */}
          <button
            className={`btn btn-sm ${currentPage === "help" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onNavigatePage("help")}
            title="How to Use Tutorial & Guide"
          >
            <i className="fa-solid fa-circle-question"></i> Help
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onToggleTheme} title="Toggle Theme" style={{ padding: "0.45rem 0.6rem" }}>
            <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`}></i>
          </button>

          {user ? (
            <>
              {user.role === "admin" && (
                <button
                  className={`btn btn-sm ${currentPage === "admin" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => onNavigatePage("admin")}
                >
                  <i className="fa-solid fa-shield-halved"></i> Admin Portal
                </button>
              )}

              {/* User Profile Link */}
              <button
                className={`btn btn-sm ${currentPage === "profile" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => onNavigateProfile && onNavigateProfile(user.firstName ? `${user.firstName} ${user.lastName}` : user.email)}
                title="View My Scholar Profile"
              >
                <i className="fa-solid fa-id-card"></i> My Profile
              </button>

              {/* User Settings Link */}
              <button
                className={`btn btn-sm ${currentPage === "settings" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => onNavigatePage("settings")}
                title="Account & Password Settings"
              >
                <i className="fa-solid fa-gear"></i> Settings
              </button>

              {/* User Profile Badge */}
              <div
                onClick={() => onNavigateProfile && onNavigateProfile(user.firstName ? `${user.firstName} ${user.lastName}` : user.email)}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.6rem", background: "var(--bg-main)", borderRadius: "var(--radius-full)", border: "1px solid var(--border-color)", cursor: "pointer" }}
                title="View Profile"
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.8rem" }}>
                  {(user.firstName ? user.firstName.charAt(0) : user.email.charAt(0)).toUpperCase()}
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                </div>
              </div>

              <button className="btn btn-secondary btn-sm" onClick={handleLogout} title="Logout" style={{ padding: "0.45rem 0.6rem" }}>
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleLoginClick}>
              <i className="fa-solid fa-user"></i> Login / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
