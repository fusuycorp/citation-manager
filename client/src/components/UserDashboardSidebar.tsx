import React, { useEffect, useRef, useState } from "react";

interface UserDashboardSidebarProps {
  activeScope: "my" | "unowned" | "all";
  onScopeChange: (scope: "my" | "unowned" | "all") => void;
  selectedPubType: string | null;
  onSelectPubType: (pubType: string | null) => void;
  authorList: string[];
  activeAuthors: string[];
  onAddAuthor: (val: string) => void;
  onToggleAuthorActive: (val: string) => void;
  onDeleteAuthor: (val: string) => void;
  onClearAuthors: () => void;
  selectedYears: number[];
  onToggleYear: (year: number) => void;
  onSelectYearRange: (startYear: number, endYear: number) => void;
  onClearYears: () => void;
  journalFilter: string;
  onJournalFilterChange: (val: string) => void;
  availableYears: number[];
  availableJournals: string[];
  availableAuthors?: string[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  totalMyCount: number;
  totalUnownedCount: number;
  totalAllCount: number;
  pendingInvitesCount: number;
  onOpenInvites: () => void;
}

export const UserDashboardSidebar: React.FC<UserDashboardSidebarProps> = ({
  activeScope,
  onScopeChange,
  selectedPubType,
  onSelectPubType,
  authorList = [],
  activeAuthors = [],
  onAddAuthor,
  onToggleAuthorActive,
  onDeleteAuthor,
  onClearAuthors,
  selectedYears = [],
  onToggleYear,
  onSelectYearRange,
  onClearYears,
  journalFilter,
  onJournalFilterChange,
  availableYears = [],
  availableJournals = [],
  availableAuthors = [],
  onClearFilters,
  hasActiveFilters,
  totalMyCount = 0,
  totalUnownedCount = 0,
  totalAllCount = 0,
  pendingInvitesCount = 0,
  onOpenInvites,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(270);
  const isResizing = useRef(false);

  // Author Search Autocomplete & Focus State
  const [authorSearchInput, setAuthorSearchInput] = useState("");
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  // UI Style Mode for Year Filter: "slider" | "checkbox"
  const [yearUiStyle, setYearUiStyle] = useState<"slider" | "checkbox">("slider");
  const [activeThumb, setActiveThumb] = useState<"start" | "end">("start");

  const pubTypes = [
    { id: "article", label: "Journal Articles", icon: "fa-newspaper" },
    { id: "book", label: "Books & Monographs", icon: "fa-book" },
    { id: "conference", label: "Conference Papers", icon: "fa-users-rectangle" },
    { id: "thesis", label: "Theses & Dissertations", icon: "fa-graduation-cap" },
    { id: "webpage", label: "Webpages & Reports", icon: "fa-globe" },
  ];

  const safeYears = Array.isArray(availableYears) && availableYears.length > 0 ? availableYears : [2000, 2026];
  const minYear = Math.min(...safeYears);
  const maxYear = Math.max(...safeYears);

  // Initialize sliders to most left (minYear) and most right (maxYear)
  const [sliderMin, setSliderMin] = useState<number>(minYear);
  const [sliderMax, setSliderMax] = useState<number>(maxYear);

  // Sync sliders to absolute most left and most right when availableYears update from DB
  useEffect(() => {
    if (Array.isArray(availableYears) && availableYears.length > 0) {
      const minY = Math.min(...availableYears);
      const maxY = Math.max(...availableYears);
      if (selectedYears.length === 0) {
        setSliderMin(minY);
        setSliderMax(maxY);
      }
    }
  }, [availableYears, selectedYears.length]);

  // Sync sliders when selectedYears is cleared externally
  useEffect(() => {
    if (selectedYears.length === 0) {
      setSliderMin(minYear);
      setSliderMax(maxYear);
    } else {
      setSliderMin(Math.min(...selectedYears));
      setSliderMax(Math.max(...selectedYears));
    }
  }, [selectedYears, minYear, maxYear]);

  // Handle Drag Resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX - 24;
    if (newWidth >= 220 && newWidth <= 480) {
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  if (isCollapsed) {
    return (
      <aside
        className="glass-panel"
        style={{
          width: 48,
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1rem 0",
          gap: "1rem",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(false)}
        title="Expand Library Sidebar"
      >
        <button className="btn btn-secondary btn-sm" style={{ padding: "0.4rem" }}>
          <i className="fa-solid fa-angles-right"></i>
        </button>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.08em", color: "var(--primary)" }}>
          LIBRARY & FILTERS
        </div>
      </aside>
    );
  }

  const safeJournals = Array.isArray(availableJournals) ? availableJournals : [];
  const safeAuthors = Array.isArray(availableAuthors) ? availableAuthors : [];

  // Fuzzy Search Filter for Author Suggestions
  const matchingAuthors = authorSearchInput.trim()
    ? safeAuthors.filter((a) => a.toLowerCase().includes(authorSearchInput.toLowerCase().trim()))
    : [];

  const handleSelectAuthorSuggestion = (authorName: string) => {
    onAddAuthor(authorName);
    setAuthorSearchInput("");
    setShowAuthorDropdown(false);
  };

  const handleAuthorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && authorSearchInput.trim()) {
      e.preventDefault();
      onAddAuthor(authorSearchInput.trim());
      setAuthorSearchInput("");
      setShowAuthorDropdown(false);
    }
  };

  const rangeSpan = Math.max(1, maxYear - minYear);
  const leftPercent = ((sliderMin - minYear) / rangeSpan) * 100;
  const rightPercent = 100 - ((sliderMax - minYear) / rangeSpan) * 100;
  const isSameYear = sliderMin === sliderMax;

  return (
    <aside
      className="glass-panel"
      style={{
        width,
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        height: "fit-content",
        position: "relative",
      }}
    >
      {/* Right Edge Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          right: -3,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: "ew-resize",
          background: "transparent",
        }}
        title="Drag to resize library sidebar"
      />

      {/* Header with Retract Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
          Library & Facet Filters
        </h4>
        <button className="btn btn-secondary btn-sm" onClick={() => setIsCollapsed(true)} title="Collapse Sidebar" style={{ padding: "0.25rem 0.5rem" }}>
          <i className="fa-solid fa-angles-left"></i>
        </button>
      </div>

      {/* Scope Collections */}
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <button
            className={`btn btn-sm ${activeScope === "my" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onScopeChange("my")}
            style={{ justifyContent: "space-between", width: "100%", textAlign: "left", border: "none" }}
          >
            <span><i className="fa-solid fa-user-bookmark"></i> My Citations</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{totalMyCount}</span>
          </button>

          <button
            className={`btn btn-sm ${activeScope === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onScopeChange("all")}
            style={{ justifyContent: "space-between", width: "100%", textAlign: "left", border: "none" }}
          >
            <span><i className="fa-solid fa-globe"></i> Global Directory</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{totalAllCount}</span>
          </button>

          <button
            className={`btn btn-sm ${activeScope === "unowned" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onScopeChange("unowned")}
            style={{ justifyContent: "space-between", width: "100%", textAlign: "left", border: "none" }}
          >
            <span><i className="fa-solid fa-ghost"></i> Unowned / Orphans</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{totalUnownedCount}</span>
          </button>
        </div>
      </div>

      {/* Facet Filters Section */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Filter Directory
          </h4>
          {hasActiveFilters && (
            <button style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }} onClick={onClearFilters}>
              Reset All
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {/* Multi-Author Fuzzy Search Input with Dropdown Autocomplete & Checkboxes Underneath */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block" }}>
                Author Names ({activeAuthors.length}/{authorList.length}):
              </label>
              {authorList.length > 0 && (
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }}
                  onClick={onClearAuthors}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Fuzzy Search Input Field */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "0.35rem 1.8rem 0.35rem 0.6rem" }}
                placeholder="Fuzzy search author..."
                value={authorSearchInput}
                onChange={(e) => {
                  setAuthorSearchInput(e.target.value);
                  setShowAuthorDropdown(true);
                }}
                onFocus={() => setShowAuthorDropdown(true)}
                onKeyDown={handleAuthorKeyDown}
              />
              {authorSearchInput && (
                <button
                  type="button"
                  onClick={() => setAuthorSearchInput("")}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    padding: "0.2rem",
                  }}
                  title="Clear search text"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}

              {/* Autocomplete Dropdown Suggestions */}
              {showAuthorDropdown && matchingAuthors.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    maxHeight: 160,
                    overflowY: "auto",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-md)",
                    zIndex: 100,
                  }}
                >
                  {matchingAuthors.map((authorName) => (
                    <div
                      key={authorName}
                      onClick={() => handleSelectAuthorSuggestion(authorName)}
                      style={{
                        padding: "0.4rem 0.75rem",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <i className="fa-solid fa-user" style={{ fontSize: "0.7rem", marginRight: "0.4rem", color: "var(--primary)" }}></i>
                      {authorName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Authors Checkbox List with Delete (X) Button */}
            {authorList.length > 0 && (
              <div
                style={{
                  marginTop: "0.5rem",
                  maxHeight: 130,
                  overflowY: "auto",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {authorList.map((auth) => {
                  const isChecked = activeAuthors.includes(auth);
                  return (
                    <div
                      key={auth}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.78rem",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          cursor: "pointer",
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? "var(--primary)" : "var(--text-muted)",
                          userSelect: "none",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleAuthorActive(auth)}
                          style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                        />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {auth}
                        </span>
                      </label>

                      {/* Little X Button on the Right to Completely Delete from Filtering List */}
                      <button
                        type="button"
                        onClick={() => onDeleteAuthor(auth)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          padding: "0.1rem 0.3rem",
                          marginLeft: "0.4rem",
                        }}
                        title={`Delete "${auth}" from filter list`}
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Publication Year Filter Component */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block" }}>
                Publication Year:
              </label>
              <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                {/* Interface Style Switcher Button */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setYearUiStyle(yearUiStyle === "slider" ? "checkbox" : "slider")}
                  style={{ fontSize: "0.65rem", padding: "0.15rem 0.35rem", borderRadius: "var(--radius-sm)" }}
                  title="Toggle Year Filter UI Style (Single Slider with 2 Selectable Ends vs Checkbox List)"
                >
                  <i className={`fa-solid ${yearUiStyle === "slider" ? "fa-sliders" : "fa-list-check"}`}></i>{" "}
                  {yearUiStyle === "slider" ? "Checkbox UI" : "Slider Line UI"}
                </button>

                {selectedYears.length > 0 && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }}
                    onClick={onClearYears}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Mode 1: Single Slider Line with Two Non-Overlapping Selectable Ends (Defaults to Most Left & Most Right) */}
            {yearUiStyle === "slider" ? (
              <div
                style={{
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {/* START and END Labels Only (Defaulting Most Left & Most Right) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--primary)" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500, display: "block" }}>START</span>
                    {sliderMin}
                  </div>
                  {isSameYear && (
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent-purple)", background: "rgba(136, 19, 55, 0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                      Exact Year
                    </span>
                  )}
                  <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--primary)", textAlign: "right" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500, display: "block" }}>END</span>
                    {sliderMax}
                  </div>
                </div>

                {/* Single Line Dual-Thumb Slider Container */}
                <div
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickRatio = (e.clientX - rect.left) / rect.width;
                    const clickYear = minYear + clickRatio * rangeSpan;
                    const distToMin = Math.abs(clickYear - sliderMin);
                    const distToMax = Math.abs(clickYear - sliderMax);
                    setActiveThumb(distToMin <= distToMax ? "start" : "end");
                  }}
                  onTouchStart={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    if (!touch) return;
                    const clickRatio = (touch.clientX - rect.left) / rect.width;
                    const clickYear = minYear + clickRatio * rangeSpan;
                    const distToMin = Math.abs(clickYear - sliderMin);
                    const distToMax = Math.abs(clickYear - sliderMax);
                    setActiveThumb(distToMin <= distToMax ? "start" : "end");
                  }}
                  style={{ position: "relative", height: 26, display: "flex", alignItems: "center" }}
                >
                  {/* Background Track Line */}
                  <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, background: "var(--border-color)" }} />
                  {/* Highlighted Active Range Line */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${leftPercent}%`,
                      right: `${rightPercent}%`,
                      height: 6,
                      borderRadius: 3,
                      background: "linear-gradient(90deg, #1e3a8a, #881337)",
                    }}
                  />
                  {/* Left Thumb Input (Start Year Control - Defaults Most Left) */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      transform: isSameYear ? "translateX(-9px)" : "none",
                      pointerEvents: "none",
                    }}
                  >
                    <input
                      type="range"
                      min={minYear}
                      max={maxYear}
                      value={sliderMin}
                      onChange={(e) => {
                        const newMin = Math.min(parseInt(e.target.value, 10), sliderMax);
                        setSliderMin(newMin);
                        onSelectYearRange(newMin, sliderMax);
                      }}
                      onFocus={() => setActiveThumb("start")}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                        margin: 0,
                        appearance: "none",
                        background: "transparent",
                        cursor: "pointer",
                        zIndex: activeThumb === "start" ? 10 : 3,
                      }}
                      title={`Start Year: ${sliderMin}`}
                    />
                  </div>

                  {/* Right Thumb Input (End Year Control - Defaults Most Right) */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      transform: isSameYear ? "translateX(9px)" : "none",
                      pointerEvents: "none",
                    }}
                  >
                    <input
                      type="range"
                      min={minYear}
                      max={maxYear}
                      value={sliderMax}
                      onChange={(e) => {
                        const newMax = Math.max(parseInt(e.target.value, 10), sliderMin);
                        setSliderMax(newMax);
                        onSelectYearRange(sliderMin, newMax);
                      }}
                      onFocus={() => setActiveThumb("end")}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                        margin: 0,
                        appearance: "none",
                        background: "transparent",
                        cursor: "pointer",
                        zIndex: activeThumb === "end" ? 10 : 4,
                      }}
                      title={`End Year: ${sliderMax}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Checkbox Scrollbox List UI */
              <div
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                }}
              >
                {safeYears.map((y) => {
                  const isChecked = selectedYears.includes(y);
                  return (
                    <label
                      key={y}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: isChecked ? 700 : 500,
                        color: isChecked ? "var(--primary)" : "var(--text-main)",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleYear(y)}
                        style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                      />
                      <span>{y}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Journal / Publisher Dropdown */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.2rem", display: "block" }}>
              Journal / Publisher:
            </label>
            <select
              className="form-select"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
              value={journalFilter || ""}
              onChange={(e) => onJournalFilterChange(e.target.value)}
            >
              <option value="">All Journals</option>
              {safeJournals.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Publication Type Faceting */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Publication Type
          </h4>
          {selectedPubType && (
            <button style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }} onClick={() => onSelectPubType(null)}>
              Clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {pubTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onSelectPubType(selectedPubType === type.id ? null : type.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.4rem 0.65rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                borderColor: selectedPubType === type.id ? "var(--primary)" : "transparent",
                background: selectedPubType === type.id ? "var(--primary-light)" : "transparent",
                color: selectedPubType === type.id ? "var(--primary)" : "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: selectedPubType === type.id ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <i className={`fa-solid ${type.icon}`}></i> {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collaboration Trays */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
        <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
          Collaboration
        </h4>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenInvites}
          style={{ justifyContent: "space-between", width: "100%" }}
        >
          <span><i className="fa-solid fa-envelope-open-text" style={{ color: "var(--accent-purple)" }}></i> Invites & Co-Authors</span>
          {pendingInvitesCount > 0 && (
            <span className="badge badge-owner">{pendingInvitesCount} New</span>
          )}
        </button>
      </div>
    </aside>
  );
};
