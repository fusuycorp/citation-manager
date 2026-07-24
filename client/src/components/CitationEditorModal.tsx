import React, { useEffect, useState } from "react";

interface AuthorInput {
  firstName: string;
  lastName: string;
}

interface CitationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: any | null;
  token: string | null;
  onSaved: () => void;
  showToast: (msg: string) => void;
}

export const CitationEditorModal: React.FC<CitationEditorModalProps> = ({
  isOpen,
  onClose,
  citation,
  token,
  onSaved,
  showToast,
}) => {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState<AuthorInput[]>([{ firstName: "", lastName: "" }]);
  const [year, setYear] = useState<string>("");
  const [journalOrPublisher, setJournalOrPublisher] = useState("");
  const [volume, setVolume] = useState("");
  const [issue, setIssue] = useState("");
  const [pages, setPages] = useState("");
  const [doi, setDoi] = useState("");
  const [url, setUrl] = useState("");
  const [pubType, setPubType] = useState("article");
  const [loading, setLoading] = useState(false);
  const [doiFetching, setDoiFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (citation) {
      setTitle(citation.title || "");
      setAuthors(citation.authors && citation.authors.length > 0 ? citation.authors : [{ firstName: "", lastName: "" }]);
      setYear(citation.year ? String(citation.year) : "");
      setJournalOrPublisher(citation.journalOrPublisher || "");
      setVolume(citation.volume || "");
      setIssue(citation.issue || "");
      setPages(citation.pages || "");
      setDoi(citation.doi || "");
      setUrl(citation.url || "");
      setPubType(citation.pubType || "article");
    } else {
      setTitle("");
      setAuthors([{ firstName: "", lastName: "" }]);
      setYear(new Date().getFullYear().toString());
      setJournalOrPublisher("");
      setVolume("");
      setIssue("");
      setPages("");
      setDoi("");
      setUrl("");
      setPubType("article");
    }
    setError(null);
  }, [citation, isOpen]);

  if (!isOpen) return null;

  const handleFetchDoiMetadata = async () => {
    if (!doi.trim()) {
      setError("Please enter a valid DOI number to fetch metadata (e.g. 10.1007/s42979-024-03500-1).");
      return;
    }

    setError(null);
    setDoiFetching(true);

    try {
      const res = await fetch(`/api/doi/lookup?doi=${encodeURIComponent(doi)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "DOI lookup failed");

      const meta = data.metadata;
      if (meta) {
        if (meta.title) setTitle(meta.title);
        if (meta.authors && meta.authors.length > 0) setAuthors(meta.authors);
        if (meta.year) setYear(String(meta.year));
        if (meta.journalOrPublisher) setJournalOrPublisher(meta.journalOrPublisher);
        if (meta.volume) setVolume(meta.volume);
        if (meta.issue) setIssue(meta.issue);
        if (meta.pages) setPages(meta.pages);
        if (meta.url) setUrl(meta.url);

        showToast("✨ Auto-populated citation details from Crossref!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDoiFetching(false);
    }
  };

  const handleAddAuthor = () => {
    setAuthors([...authors, { firstName: "", lastName: "" }]);
  };

  const handleRemoveAuthor = (index: number) => {
    if (authors.length === 1) return;
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const handleAuthorChange = (index: number, field: "firstName" | "lastName", val: string) => {
    const next = [...authors];
    next[index][field] = val;
    setAuthors(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = citation ? `/api/citations/${citation.id}` : "/api/citations";
      const method = citation ? "PUT" : "POST";

      const validAuthors = authors.filter((a) => a.lastName.trim() !== "");
      if (validAuthors.length === 0) {
        throw new Error("At least one author last name is required.");
      }

      const payload = {
        title,
        authors: validAuthors,
        year: year ? parseInt(year, 10) : null,
        journalOrPublisher,
        volume,
        issue,
        pages,
        doi,
        url,
        pubType,
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save citation");
      }

      showToast(citation ? "Citation updated successfully!" : "New citation added!");
      onSaved();
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
            {citation ? "Edit Citation Root Data" : "Create New Academic Citation"}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* DOI Resolution Quick Bar */}
        <div style={{ padding: "0.8rem 1rem", background: "var(--primary-light)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "var(--radius-md)", marginBottom: "1.2rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, background: "var(--bg-main)" }}
            placeholder="Enter DOI (e.g. 10.1007/s42979-024-03500-1) to auto-fill..."
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleFetchDoiMetadata} disabled={doiFetching || !doi}>
            {doiFetching ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Fetch Metadata</>}
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(244,63,94,0.15)", color: "var(--accent-rose)", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Article / Paper Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Exploring ISIS’ Takfir Discourse: A BERT-Based Approach"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label className="form-label">Authors List *</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddAuthor}>
                <i className="fa-solid fa-user-plus"></i> Add Author
              </button>
            </div>
            {authors.map((auth, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="First Name / Initials (e.g. M. N.)"
                  value={auth.firstName}
                  onChange={(e) => handleAuthorChange(i, "firstName", e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Last Name (e.g. Aydın)"
                  required
                  value={auth.lastName}
                  onChange={(e) => handleAuthorChange(i, "lastName", e.target.value)}
                />
                {authors.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveAuthor(i)}>
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Publication Year</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 2025"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Publication Type</label>
              <select className="form-select" value={pubType} onChange={(e) => setPubType(e.target.value)}>
                <option value="article">Journal Article</option>
                <option value="book">Book / Monograph</option>
                <option value="conference">Conference / Proceedings</option>
                <option value="thesis">Thesis / Dissertation</option>
                <option value="webpage">Web Page / Report</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Journal / Publisher</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. SN Computer Science"
                value={journalOrPublisher}
                onChange={(e) => setJournalOrPublisher(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Volume</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 6"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Issue / Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 8"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pages Range</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 908 or 101-115"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">DOI Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 10.1007/s42979-024-03500-1"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">URL Link</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : citation ? "Save Changes" : "Create Citation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
