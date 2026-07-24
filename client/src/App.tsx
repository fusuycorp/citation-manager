import React, { useEffect, useState } from "react";
import { AuthModal } from "./components/AuthModal";
import { CitationEditorModal } from "./components/CitationEditorModal";
import { CitationInspectorPane } from "./components/CitationInspectorPane";
import { CitationList } from "./components/CitationList";
import { CitationPreviewerModal } from "./components/CitationPreviewerModal";
import { CoAuthorInviteModal } from "./components/CoAuthorInviteModal";
import { Navbar } from "./components/Navbar";
import { UserDashboardSidebar } from "./components/UserDashboardSidebar";
import { WelcomeModal } from "./components/WelcomeModal";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AuthPage } from "./pages/AuthPage";
import { HelpPage } from "./pages/HelpPage";
import { ProfilePage } from "./pages/ProfilePage";
import { UserSettingsPage } from "./pages/UserSettingsPage";

// Helper to safely detect Browser / OS system theme preference
function getInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem("citation_theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch (_) {}
  return "light";
}

function parseHashRoute(): { page: "dashboard" | "admin" | "settings" | "auth" | "help" | "profile"; profileTarget: string } {
  try {
    if (typeof window !== "undefined" && window.location.hash) {
      const raw = window.location.hash.replace(/^#\/?/, "");
      if (raw.startsWith("profile/")) {
        const target = decodeURIComponent(raw.replace("profile/", ""));
        return { page: "profile", profileTarget: target };
      }
      if (["dashboard", "admin", "settings", "auth", "help"].includes(raw)) {
        return { page: raw as any, profileTarget: "" };
      }
    }
  } catch (_) {}
  return { page: "dashboard", profileTarget: "" };
}

export const App: React.FC = () => {
  const initialRoute = parseHashRoute();
  
  // Page Routing State: "dashboard" | "admin" | "settings" | "auth" | "help" | "profile"
  const [currentPage, setCurrentPage] = useState<"dashboard" | "admin" | "settings" | "auth" | "help" | "profile">(initialRoute.page);

  // Profile Identifier State
  const [profileTarget, setProfileTarget] = useState<string>(initialRoute.profileTarget);

  // Dynamic Browser / OS System Theme Default
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme());
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("citation_token");
    } catch (_) {
      return null;
    }
  });

  const [citations, setCitations] = useState<any[]>([]);
  const [activeScope, setActiveScope] = useState<"my" | "unowned" | "all">("all");
  const [selectedPubType, setSelectedPubType] = useState<string | null>(null);

  // Search & Facet Filters State
  const [searchQuery, setSearchQuery] = useState("");
  
  // Multi-Author List & Active Filter State
  const [authorList, setAuthorList] = useState<string[]>([]);
  const [activeAuthors, setActiveAuthors] = useState<string[]>([]);

  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [journalFilter, setJournalFilter] = useState("");

  // Ordering & Sorting State
  const [sortBy, setSortBy] = useState<"created_at" | "year" | "title" | "journal">("created_at");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Available Filter Options from API
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableJournals, setAvailableJournals] = useState<string[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);

  // Pagination & Per-Page Controls State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  // Counts & Trays
  const [scopeCounts, setScopeCounts] = useState<{ my: number; unowned: number; all: number }>({ my: 0, unowned: 0, all: 0 });
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // Default View Density set to COMPACT
  const [viewDensity, setViewDensity] = useState<"card" | "compact">("compact");
  const [inspectedCitation, setInspectedCitation] = useState<any | null>(null);

  // Modals
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCitation, setEditingCitation] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewingCitation, setPreviewingCitation] = useState<any | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitingCitation, setInvitingCitation] = useState<any | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Browser Navigation & History Sync
  const navigateToPage = (pg: "dashboard" | "admin" | "settings" | "auth" | "help" | "profile", target?: string) => {
    setCurrentPage(pg);
    if (pg === "profile" && target) {
      setProfileTarget(target);
      window.location.hash = `profile/${encodeURIComponent(target)}`;
    } else {
      setProfileTarget("");
      window.location.hash = pg;
    }
  };

  const handleNavigateProfile = (idOrName: string) => {
    navigateToPage("profile", idOrName);
  };

  const handleBackNavigation = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigateToPage("dashboard");
    }
  };

  // Sync state with browser back/forward buttons (popstate & hashchange)
  useEffect(() => {
    const handleRouteSync = () => {
      const route = parseHashRoute();
      setCurrentPage(route.page);
      setProfileTarget(route.profileTarget);
    };

    window.addEventListener("hashchange", handleRouteSync);
    window.addEventListener("popstate", handleRouteSync);
    return () => {
      window.removeEventListener("hashchange", handleRouteSync);
      window.removeEventListener("popstate", handleRouteSync);
    };
  }, []);

  // Sync theme with DOM
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
    } catch (_) {}
  }, [theme]);

  // Check one-time welcome modal on initial user login
  useEffect(() => {
    if (user && user.id) {
      const welcomeKey = `citation_welcome_seen_${user.id}`;
      try {
        if (!localStorage.getItem(welcomeKey)) {
          setIsWelcomeModalOpen(true);
          localStorage.setItem(welcomeKey, "true");
        }
      } catch (_) {}
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Session expired");
          return res.json();
        })
        .then((data) => {
          setUser(data.user);
          setActiveScope("my");
        })
        .catch(() => {
          try {
            localStorage.removeItem("citation_token");
          } catch (_) {}
          setToken(null);
          setUser(null);
          setActiveScope("all");
        });

      fetch("/api/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.preferences?.viewDensity) setViewDensity(data.preferences.viewDensity);
        })
        .catch(() => {});

      fetch("/api/invitations", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.invitations) {
            setPendingInvitesCount(data.invitations.filter((i: any) => i.status === "pending").length);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const fetchCitations = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let yearParam = "";
      if (selectedYears.length > 0) {
        const sorted = [...selectedYears].sort((a, b) => a - b);
        let isContiguous = true;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i + 1] !== sorted[i] + 1) {
            isContiguous = false;
            break;
          }
        }
        if (isContiguous && sorted.length > 1) {
          yearParam = `${sorted[0]}..${sorted[sorted.length - 1]}`;
        } else {
          yearParam = sorted.join(",");
        }
      }

      const authorParam = activeAuthors.length > 0 ? activeAuthors.join("||") : "";

      let url = `/api/citations?scope=${activeScope}&search=${encodeURIComponent(searchQuery)}&author=${encodeURIComponent(authorParam)}&year=${encodeURIComponent(yearParam)}&journal=${encodeURIComponent(journalFilter)}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}&limit=${limit}`;
      if (selectedPubType) url += `&pubType=${selectedPubType}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.ok) {
        const fetched = data.citations || [];
        setCitations(fetched);
        setPagination(data.pagination || { total: 0, totalPages: 1 });

        if (data.scopeCounts) {
          setScopeCounts(data.scopeCounts);
        }

        if (data.filterOptions) {
          setAvailableYears(data.filterOptions.availableYears || []);
          setAvailableJournals(data.filterOptions.availableJournals || []);
          setAvailableAuthors(data.filterOptions.availableAuthors || []);
        }

        if (!inspectedCitation && fetched.length > 0) {
          setInspectedCitation(fetched[0]);
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === "dashboard") {
      fetchCitations();
    }
  }, [token, activeScope, searchQuery, activeAuthors, selectedYears, journalFilter, sortBy, sortOrder, selectedPubType, page, limit, currentPage]);

  const handleAddAuthor = (auth: string) => {
    if (!authorList.includes(auth)) {
      setAuthorList((prev) => [...prev, auth]);
    }
    if (!activeAuthors.includes(auth)) {
      setActiveAuthors((prev) => [...prev, auth]);
    }
    setPage(1);
  };

  const handleToggleAuthorActive = (auth: string) => {
    setActiveAuthors((prev) => (prev.includes(auth) ? prev.filter((item) => item !== auth) : [...prev, auth]));
    setPage(1);
  };

  const handleDeleteAuthor = (auth: string) => {
    setAuthorList((prev) => prev.filter((item) => item !== auth));
    setActiveAuthors((prev) => prev.filter((item) => item !== auth));
    setPage(1);
  };

  const handleClearAuthors = () => {
    setAuthorList([]);
    setActiveAuthors([]);
    setPage(1);
  };

  const handleToggleYear = (y: number) => {
    setSelectedYears((prev) => (prev.includes(y) ? prev.filter((item) => item !== y) : [...prev, y]));
    setPage(1);
  };

  const handleSelectYearRange = (startYear: number, endYear: number) => {
    const minY = Math.min(startYear, endYear);
    const maxY = Math.max(startYear, endYear);
    const years: number[] = [];
    for (let y = minY; y <= maxY; y++) {
      years.push(y);
    }
    setSelectedYears(years);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setAuthorList([]);
    setActiveAuthors([]);
    setSelectedYears([]);
    setJournalFilter("");
    setSelectedPubType(null);
    setSortBy("created_at");
    setSortOrder("DESC");
    setPage(1);
  };

  const handleAuthSuccess = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    try {
      localStorage.setItem("citation_token", userToken);
    } catch (_) {}
    setActiveScope("my");
    navigateToPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem("citation_token");
    } catch (_) {}
    setActiveScope("all");
    setInspectedCitation(null);
    navigateToPage("dashboard");
    showToast("Logged out successfully.");
  };

  const handleOpenPreview = async (cit: any) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/citations/${cit.id}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setInspectedCitation(data.citation);
        setPreviewingCitation(data.citation);
        setIsPreviewOpen(true);
      }
    } catch (_) {}
  };

  const handleOpenEdit = (cit: any) => {
    if (!token) {
      navigateToPage("auth");
      return;
    }
    setEditingCitation(cit);
    setIsEditorOpen(true);
  };

  const handleOpenInvite = (cit: any) => {
    if (!token) {
      navigateToPage("auth");
      return;
    }
    setInvitingCitation(cit);
    setIsInviteOpen(true);
  };

  const handleClaim = async (citationId: string) => {
    if (!token) {
      navigateToPage("auth");
      return;
    }
    try {
      const res = await fetch(`/api/citations/${citationId}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Citation claimed and added to your profile!");
        fetchCitations();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch (_) {}
  };

  const handleUnlink = async (citationId: string) => {
    if (!token) return;
    if (!confirm("Remove this citation from your profile? If no other owners remain, it will be placed in the Unowned state.")) return;

    try {
      const res = await fetch(`/api/citations/${citationId}/ownership`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.isNowUnowned ? "Unlinked! Citation is now in the Unowned state." : "Unlinked from your profile.");
        fetchCitations();
      }
    } catch (_) {}
  };

  const hasActiveFilters = searchQuery || authorList.length > 0 || selectedYears.length > 0 || journalFilter || selectedPubType || sortBy !== "created_at" || sortOrder !== "DESC";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        user={user}
        onOpenAuth={() => navigateToPage("auth")}
        onLogout={handleLogout}
        onNavigatePage={(pg) => navigateToPage(pg)}
        onNavigateProfile={handleNavigateProfile}
        theme={theme}
        onToggleTheme={() => {
          const next = theme === "light" ? "dark" : "light";
          setTheme(next);
          try {
            localStorage.setItem("citation_theme", next);
          } catch (_) {}
        }}
        currentPage={currentPage}
      />

      {/* Pages */}
      {currentPage === "admin" && (
        <AdminDashboardPage
          token={token}
          showToast={showToast}
          onBackToDashboard={handleBackNavigation}
        />
      )}

      {currentPage === "settings" && user && (
        <UserSettingsPage
          user={user}
          token={token}
          showToast={showToast}
          onUpdateUser={(updated) => setUser(updated)}
          onBackToDashboard={handleBackNavigation}
        />
      )}

      {currentPage === "profile" && (
        <ProfilePage
          identifier={profileTarget}
          token={token}
          currentUserId={user ? user.id : null}
          onBackToDashboard={handleBackNavigation}
          onNavigateProfile={handleNavigateProfile}
          onFilterByAuthor={(authorName) => {
            handleAddAuthor(authorName);
            setActiveScope("all");
          }}
          showToast={showToast}
        />
      )}

      {currentPage === "auth" && (
        <AuthPage
          onSuccess={handleAuthSuccess}
          showToast={showToast}
          onBackToDashboard={handleBackNavigation}
        />
      )}

      {currentPage === "help" && (
        <HelpPage onBackToDashboard={handleBackNavigation} />
      )}

      {currentPage === "dashboard" && (
        <main style={{ flex: 1, maxWidth: 1400, width: "100%", margin: "0 auto", padding: "1.5rem", display: "flex", gap: "1.5rem" }}>
          {/* Left Pane: Sidebar housing Scope Collections & All Filters */}
          <UserDashboardSidebar
            activeScope={activeScope}
            onScopeChange={(scope) => {
              setActiveScope(scope);
              setPage(1);
            }}
            selectedPubType={selectedPubType}
            onSelectPubType={(pt) => {
              setSelectedPubType(pt);
              setPage(1);
            }}
            authorList={authorList}
            activeAuthors={activeAuthors}
            onAddAuthor={handleAddAuthor}
            onToggleAuthorActive={handleToggleAuthorActive}
            onDeleteAuthor={handleDeleteAuthor}
            onClearAuthors={handleClearAuthors}
            selectedYears={selectedYears}
            onToggleYear={handleToggleYear}
            onSelectYearRange={handleSelectYearRange}
            onClearYears={() => setSelectedYears([])}
            journalFilter={journalFilter}
            onJournalFilterChange={(val) => {
              setJournalFilter(val);
              setPage(1);
            }}
            availableYears={availableYears || []}
            availableJournals={availableJournals || []}
            availableAuthors={availableAuthors || []}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            totalMyCount={scopeCounts.my}
            totalUnownedCount={scopeCounts.unowned}
            totalAllCount={scopeCounts.all}
            pendingInvitesCount={pendingInvitesCount}
            onOpenInvites={() => {
              if (!user) {
                navigateToPage("auth");
                return;
              }
              if (citations.length > 0) handleOpenInvite(citations[0]);
            }}
          />

          {/* Center Pane: Citations Stream & Search / Ordering Toolbar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Stream Toolbar: Search + Sort Controls + Density Switcher */}
            <div className="glass-panel" style={{ padding: "0.85rem 1.25rem", borderRadius: "var(--radius-lg)", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              {/* Keyword Search Input with Little X Clear Button */}
              <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}></i>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "2.4rem", paddingRight: searchQuery ? "2.2rem" : "0.75rem" }}
                  placeholder="Search title, keyword, DOI..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "0.2rem",
                    }}
                    title="Clear search query"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              {/* Sorting Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <i className="fa-solid fa-arrow-down-short-wide"></i> Sort:
                </span>
                <select
                  className="form-select"
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem", width: "auto" }}
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="created_at">Date Added</option>
                  <option value="year">Publication Year</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="journal">Journal Name</option>
                </select>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                  title={`Sort Order: ${sortOrder === "DESC" ? "Descending" : "Ascending"}`}
                >
                  {sortOrder === "DESC" ? (
                    <span><i className="fa-solid fa-arrow-down-wide-short"></i> Desc</span>
                  ) : (
                    <span><i className="fa-solid fa-arrow-up-wide-short"></i> Asc</span>
                  )}
                </button>
              </div>

              {/* Density Switcher & Count */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.2rem", background: "var(--bg-main)", padding: "0.2rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <button
                    className={`btn btn-sm ${viewDensity === "card" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setViewDensity("card")}
                    style={{ border: "none" }}
                    title="Card View Density"
                  >
                    <i className="fa-solid fa-table-cells-large"></i> Cards
                  </button>
                  <button
                    className={`btn btn-sm ${viewDensity === "compact" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setViewDensity("compact")}
                    style={{ border: "none" }}
                    title="Compact View Density"
                  >
                    <i className="fa-solid fa-list"></i> Compact
                  </button>
                </div>

                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  {pagination.total || 0} Citations
                </div>
              </div>
            </div>

            {/* Active Filter Chips / Badges Bar */}
            {hasActiveFilters && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 700, color: "var(--text-muted)", marginRight: "0.2rem" }}>Active Filters:</span>
                {searchQuery && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Keyword: "{searchQuery}"
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")}></i>
                  </span>
                )}
                {activeAuthors.length > 0 && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Authors: {activeAuthors.join(", ")}
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={handleClearAuthors}></i>
                  </span>
                )}
                {selectedYears.length > 0 && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Years: {Math.min(...selectedYears)} — {Math.max(...selectedYears)} ({selectedYears.length})
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setSelectedYears([])}></i>
                  </span>
                )}
                {journalFilter && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Journal: "{journalFilter}"
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setJournalFilter("")}></i>
                  </span>
                )}
                {selectedPubType && (
                  <span className="badge badge-owner" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    Type: {selectedPubType.toUpperCase()}
                    <i className="fa-solid fa-xmark" style={{ cursor: "pointer" }} onClick={() => setSelectedPubType(null)}></i>
                  </span>
                )}
                <button className="btn btn-outline btn-sm" onClick={handleClearFilters} style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem", marginLeft: "0.3rem" }}>
                  Reset All
                </button>
              </div>
            )}

            {/* Citations Stream */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--primary)" }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></i>
                <p style={{ fontWeight: 600 }}>Loading citations...</p>
              </div>
            ) : (
              <CitationList
                citations={citations}
                currentUserId={user ? user.id : null}
                viewDensity={viewDensity}
                inspectedCitationId={inspectedCitation?.id}
                onSelectCitation={(cit) => setInspectedCitation(cit)}
                onPreview={(c) => {
                  setInspectedCitation(c);
                  handleOpenPreview(c);
                }}
                onEdit={handleOpenEdit}
                onInvite={handleOpenInvite}
                onClaim={handleClaim}
                onUnlink={handleUnlink}
                onNavigateProfile={handleNavigateProfile}
                showToast={showToast}
              />
            )}

            {/* Enhanced Interactive Pagination Bar with Page Dropdown Jump & Per-Page Limit Selector */}
            {pagination.totalPages >= 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <i className="fa-solid fa-chevron-left"></i> Previous
                  </button>

                  {/* Interactive Page Number Dropdown */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
                    <span>Page</span>
                    <select
                      className="form-select"
                      style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem", width: "auto", fontWeight: 700, color: "var(--primary)" }}
                      value={page}
                      onChange={(e) => setPage(parseInt(e.target.value, 10))}
                      title="Click to jump directly to any page"
                    >
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                        <option key={pNum} value={pNum}>
                          {pNum}
                        </option>
                      ))}
                    </select>
                    <span>of {pagination.totalPages}</span>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>

                {/* Items Per Page Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <span>Show:</span>
                  <select
                    className="form-select"
                    style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", width: "auto" }}
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    title="Change number of citations per page"
                  >
                    <option value={12}>12 citations / page</option>
                    <option value={24}>24 citations / page</option>
                    <option value={48}>48 citations / page</option>
                    <option value={96}>96 citations / page</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane: Details Inspector */}
          <CitationInspectorPane
            citation={inspectedCitation}
            onClose={() => setInspectedCitation(null)}
            onEdit={handleOpenEdit}
            onInvite={handleOpenInvite}
            onUnlink={handleUnlink}
            onNavigateProfile={handleNavigateProfile}
            showToast={showToast}
          />
        </main>
      )}

      {/* Floating Action Hover Button (FAB) at Bottom Right */}
      {user && (
        <button
          onClick={() => {
            setEditingCitation(null);
            setIsEditorOpen(true);
          }}
          style={{
            position: "fixed",
            bottom: "2.2rem",
            right: "2.2rem",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.9rem 1.4rem",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.95rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(37, 99, 235, 0.45)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.03)";
            e.currentTarget.style.boxShadow = "0 14px 30px rgba(37, 99, 235, 0.55)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(37, 99, 235, 0.45)";
          }}
          title="Add New Academic Citation"
        >
          <i className="fa-solid fa-plus" style={{ fontSize: "1.1rem" }}></i>
          <span>Add Citation</span>
        </button>
      )}

      {/* Welcome Modal (One-Time Popup on First Login) */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onOpenTutorial={() => navigateToPage("help")}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        showToast={showToast}
      />

      <CitationEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        citation={editingCitation}
        token={token}
        onSaved={fetchCitations}
        showToast={showToast}
      />

      <CoAuthorInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        citation={invitingCitation}
        token={token}
        showToast={showToast}
        onOwnershipChanged={fetchCitations}
      />

      <CitationPreviewerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        citation={previewingCitation}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <i className="fa-solid fa-circle-check" style={{ color: "var(--accent-emerald)" }}></i>
          {toastMessage}
        </div>
      )}
    </div>
  );
};
