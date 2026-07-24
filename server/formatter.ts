export interface Author {
  firstName?: string;
  lastName: string;
}

export interface CitationData {
  id?: string;
  title: string;
  authors: Author[];
  year?: number | null;
  journalOrPublisher?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
  pubType?: string | null;
}

export type CitationStyle = "APA7" | "IEEE" | "MLA9" | "Chicago17" | "Harvard" | "BibTeX" | "RIS" | "CSL-JSON";
export type InTextMode = "parenthetical" | "narrative";

export interface FormattedCitation {
  style: CitationStyle;
  referenceText: string;
  inTextParenthetical: string;
  inTextNarrative: string;
  coinsHTML?: string;
  highwireMetaTags?: string[];
}

/**
 * Clean & Format Author Name strings into structured Author objects
 * e.g., "AYDIN, M. N." -> { firstName: "M. N.", lastName: "Aydın" }
 */
export function parseAuthorString(authorStr: string): Author {
  const str = authorStr.trim();
  if (str.includes(",")) {
    const [last, first] = str.split(",").map((s) => s.trim());
    return { firstName: first || "", lastName: capitalizeName(last) };
  } else {
    const parts = str.split(" ").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) {
      return { lastName: capitalizeName(parts[0]) };
    }
    const last = parts.pop()!;
    const first = parts.join(" ");
    return { firstName: first, lastName: capitalizeName(last) };
  }
}

export function parseRawAuthorsList(raw: string | string[]): Author[] {
  if (Array.isArray(raw)) {
    return raw.map(parseAuthorString);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === "string" ? parseAuthorString(item) : item));
      }
    } catch (_) {
      const splits = raw.split(/;| & | and /i).map((s) => s.trim()).filter(Boolean);
      return splits.map(parseAuthorString);
    }
  }
  return [];
}

function capitalizeName(name: string): string {
  if (!name) return "";
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return name;
}

function formatInitials(firstName?: string): string {
  if (!firstName) return "";
  const parts = firstName.split(/[\s.-]+/).filter(Boolean);
  return parts.map((p) => `${p.charAt(0).toUpperCase()}.`).join(" ");
}

/**
 * Export CSL-JSON Object
 */
export function toCSLJSON(data: CitationData): any {
  const authors = data.authors && data.authors.length > 0 ? data.authors : [{ lastName: "Anonymous" }];
  
  return {
    id: data.id || `cite-${Date.now()}`,
    type: data.pubType === "book" ? "book" : data.pubType === "conference" ? "paper-conference" : "article-journal",
    title: data.title,
    author: authors.map((a) => ({
      family: a.lastName,
      given: a.firstName || "",
    })),
    issued: data.year ? { "date-parts": [[data.year]] } : undefined,
    "container-title": data.journalOrPublisher || undefined,
    volume: data.volume || undefined,
    issue: data.issue || undefined,
    page: data.pages || undefined,
    DOI: data.doi || undefined,
    URL: data.url || undefined,
  };
}

/**
 * Generate COinS OpenURL HTML Tag for Zotero/Mendeley Browser Extensions
 */
export function toCOinS(data: CitationData): string {
  const params: string[] = [
    "url_ver=Z39.88-2004",
    "ctx_ver=Z39.88-2004",
    "rft_val_fmt=info:ofi/fmt:kev:mtx:journal",
    `rft.atitle=${encodeURIComponent(data.title)}`,
  ];

  if (data.journalOrPublisher) params.push(`rft.jtitle=${encodeURIComponent(data.journalOrPublisher)}`);
  if (data.year) params.push(`rft.date=${data.year}`);
  if (data.volume) params.push(`rft.volume=${encodeURIComponent(data.volume)}`);
  if (data.issue) params.push(`rft.issue=${encodeURIComponent(data.issue)}`);
  if (data.pages) params.push(`rft.pages=${encodeURIComponent(data.pages)}`);
  if (data.doi) params.push(`rft_id=info:doi/${encodeURIComponent(data.doi)}`);

  if (data.authors) {
    for (const a of data.authors) {
      params.push(`rft.aulast=${encodeURIComponent(a.lastName)}`);
      if (a.firstName) params.push(`rft.aufirst=${encodeURIComponent(a.firstName)}`);
    }
  }

  return `<span class="Z3988" title="${params.join("&")}"></span>`;
}

/**
 * Generate Highwire Press Meta Tags for Google Scholar Indexing
 */
export function toHighwireMetaTags(data: CitationData): string[] {
  const tags: string[] = [
    `<meta name="citation_title" content="${escapeAttr(data.title)}">`,
  ];

  if (data.authors) {
    for (const a of data.authors) {
      tags.push(`<meta name="citation_author" content="${escapeAttr(`${a.lastName}, ${a.firstName || ""}`.trim())}">`);
    }
  }
  if (data.year) tags.push(`<meta name="citation_publication_date" content="${data.year}">`);
  if (data.journalOrPublisher) tags.push(`<meta name="citation_journal_title" content="${escapeAttr(data.journalOrPublisher)}">`);
  if (data.volume) tags.push(`<meta name="citation_volume" content="${escapeAttr(data.volume)}">`);
  if (data.issue) tags.push(`<meta name="citation_issue" content="${escapeAttr(data.issue)}">`);
  if (data.doi) tags.push(`<meta name="citation_doi" content="${escapeAttr(data.doi)}">`);

  return tags;
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;");
}

export function formatCitation(data: CitationData, style: CitationStyle = "APA7", index: number = 1): FormattedCitation {
  const authors = data.authors && data.authors.length > 0 ? data.authors : [{ lastName: "Anonymous" }];
  const yearStr = data.year ? `${data.year}` : "n.d.";

  const coins = toCOinS(data);
  const highwire = toHighwireMetaTags(data);

  let formatted: FormattedCitation;

  switch (style) {
    case "APA7":
      formatted = formatAPA7(data, authors, yearStr);
      break;
    case "IEEE":
      formatted = formatIEEE(data, authors, yearStr, index);
      break;
    case "MLA9":
      formatted = formatMLA9(data, authors, yearStr);
      break;
    case "Chicago17":
      formatted = formatChicago17(data, authors, yearStr);
      break;
    case "Harvard":
      formatted = formatHarvard(data, authors, yearStr);
      break;
    case "BibTeX":
      formatted = formatBibTeX(data, authors, yearStr);
      break;
    case "RIS":
      formatted = formatRIS(data, authors, yearStr);
      break;
    case "CSL-JSON":
      formatted = {
        style: "CSL-JSON",
        referenceText: JSON.stringify(toCSLJSON(data), null, 2),
        inTextParenthetical: `(${authors[0].lastName}, ${yearStr})`,
        inTextNarrative: `${authors[0].lastName} (${yearStr})`,
      };
      break;
    default:
      formatted = formatAPA7(data, authors, yearStr);
  }

  formatted.coinsHTML = coins;
  formatted.highwireMetaTags = highwire;
  return formatted;
}

// APA 7 Format
function formatAPA7(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  let authorRef = "";
  if (authors.length === 1) {
    const initials = formatInitials(authors[0].firstName);
    authorRef = `${authors[0].lastName}${initials ? `, ${initials}` : ""}`;
  } else if (authors.length === 2) {
    const a1 = `${authors[0].lastName}${formatInitials(authors[0].firstName) ? `, ${formatInitials(authors[0].firstName)}` : ""}`;
    const a2 = `${authors[1].lastName}${formatInitials(authors[1].firstName) ? `, ${formatInitials(authors[1].firstName)}` : ""}`;
    authorRef = `${a1}, & ${a2}`;
  } else if (authors.length <= 20) {
    const formatted = authors.map((a) => `${a.lastName}${formatInitials(a.firstName) ? `, ${formatInitials(a.firstName)}` : ""}`);
    authorRef = `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
  } else {
    const formatted = authors.slice(0, 19).map((a) => `${a.lastName}${formatInitials(a.firstName) ? `, ${formatInitials(a.firstName)}` : ""}`);
    const lastA = authors[authors.length - 1];
    authorRef = `${formatted.join(", ")}, ... ${lastA.lastName}${formatInitials(lastA.firstName) ? `, ${formatInitials(lastA.firstName)}` : ""}`;
  }

  let ref = `${authorRef} (${yearStr}). ${data.title}.`;

  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += `, ${data.volume}`;
    if (data.issue) ref += `(${data.issue})`;
    if (data.pages) ref += `, ${data.pages}`;
    ref += `.`;
  }

  if (data.doi) {
    const cleanDoi = data.doi.startsWith("http") ? data.doi : `https://doi.org/${data.doi}`;
    ref += ` ${cleanDoi}`;
  } else if (data.url) {
    ref += ` ${data.url}`;
  }

  let parenthetical = "";
  let narrative = "";
  if (authors.length === 1) {
    parenthetical = `(${authors[0].lastName}, ${yearStr})`;
    narrative = `${authors[0].lastName} (${yearStr})`;
  } else if (authors.length === 2) {
    parenthetical = `(${authors[0].lastName} & ${authors[1].lastName}, ${yearStr})`;
    narrative = `${authors[0].lastName} and ${authors[1].lastName} (${yearStr})`;
  } else {
    parenthetical = `(${authors[0].lastName} et al., ${yearStr})`;
    narrative = `${authors[0].lastName} et al. (${yearStr})`;
  }

  return { style: "APA7", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// IEEE Format
function formatIEEE(data: CitationData, authors: Author[], yearStr: string, index: number): FormattedCitation {
  let authorRef = "";
  if (authors.length <= 6) {
    const formatted = authors.map((a) => {
      const initials = formatInitials(a.firstName);
      return `${initials ? `${initials} ` : ""}${a.lastName}`;
    });
    if (formatted.length === 1) authorRef = formatted[0];
    else if (formatted.length === 2) authorRef = `${formatted[0]} and ${formatted[1]}`;
    else authorRef = `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
  } else {
    const initials = formatInitials(authors[0].firstName);
    authorRef = `${initials ? `${initials} ` : ""}${authors[0].lastName} et al.`;
  }

  let ref = `[${index}] ${authorRef}, "${data.title},"`;

  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += `, vol. ${data.volume}`;
    if (data.issue) ref += `, no. ${data.issue}`;
    if (data.pages) ref += `, pp. ${data.pages}`;
  }
  ref += `, ${yearStr}.`;

  if (data.doi) {
    ref += ` doi: ${data.doi}.`;
  }

  return {
    style: "IEEE",
    referenceText: ref,
    inTextParenthetical: `[${index}]`,
    inTextNarrative: `${authors[0].lastName} et al. [${index}]`,
  };
}

// MLA 9 Format
function formatMLA9(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  let authorRef = "";
  if (authors.length === 1) {
    authorRef = `${authors[0].lastName}, ${authors[0].firstName || ""}`.trim();
  } else if (authors.length === 2) {
    authorRef = `${authors[0].lastName}, ${authors[0].firstName || ""}, and ${authors[1].firstName || ""} ${authors[1].lastName}`.trim();
  } else {
    authorRef = `${authors[0].lastName}, ${authors[0].firstName || ""}, et al.`.trim();
  }

  let ref = `${authorRef}. "${data.title}."`;
  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += `, vol. ${data.volume}`;
    if (data.issue) ref += `, no. ${data.issue}`;
    ref += `, ${yearStr}`;
    if (data.pages) ref += `, pp. ${data.pages}`;
    ref += `.`;
  } else {
    ref += ` ${yearStr}.`;
  }

  const pagesStr = data.pages ? ` ${data.pages}` : "";
  const parenthetical = authors.length > 2 ? `(${authors[0].lastName} et al.${pagesStr})` : `(${authors[0].lastName}${pagesStr})`;
  const narrative = authors.length > 2 ? `${authors[0].lastName} et al. (${pagesStr.trim()})` : `${authors[0].lastName} (${pagesStr.trim()})`;

  return { style: "MLA9", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// Chicago 17
function formatChicago17(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  let authorRef = "";
  if (authors.length === 1) {
    authorRef = `${authors[0].lastName}, ${authors[0].firstName || ""}`.trim();
  } else if (authors.length <= 3) {
    const formatted = authors.map((a, i) => (i === 0 ? `${a.lastName}, ${a.firstName || ""}` : `${a.firstName || ""} ${a.lastName}`).trim());
    authorRef = `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
  } else {
    authorRef = `${authors[0].lastName}, ${authors[0].firstName || ""}, et al.`.trim();
  }

  let ref = `${authorRef}. ${yearStr}. "${data.title}."`;
  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += ` ${data.volume}`;
    if (data.issue) ref += `, no. ${data.issue}`;
    if (data.pages) ref += `: ${data.pages}`;
    ref += `.`;
  }

  const parenthetical = authors.length > 3 ? `(${authors[0].lastName} et al. ${yearStr})` : `(${authors[0].lastName} ${yearStr})`;
  const narrative = authors.length > 3 ? `${authors[0].lastName} et al. (${yearStr})` : `${authors[0].lastName} (${yearStr})`;

  return { style: "Chicago17", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// Harvard Format
function formatHarvard(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  let authorRef = "";
  if (authors.length === 1) {
    authorRef = `${authors[0].lastName}, ${formatInitials(authors[0].firstName)}`;
  } else if (authors.length <= 3) {
    const formatted = authors.map((a) => `${a.lastName}, ${formatInitials(a.firstName)}`);
    authorRef = `${formatted.slice(0, -1).join(", ")} and ${formatted[formatted.length - 1]}`;
  } else {
    authorRef = `${authors[0].lastName}, ${formatInitials(authors[0].firstName)} et al.`;
  }

  let ref = `${authorRef}, ${yearStr}. ${data.title}.`;
  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += `, ${data.volume}`;
    if (data.issue) ref += `(${data.issue})`;
    if (data.pages) ref += `, pp.${data.pages}`;
    ref += `.`;
  }

  const parenthetical = `(${authors[0].lastName} et al., ${yearStr})`;
  const narrative = `${authors[0].lastName} et al. (${yearStr})`;

  return { style: "Harvard", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// BibTeX Format
function formatBibTeX(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  const citeKey = `${authors[0].lastName.toLowerCase().replace(/[^a-z]/g, "")}${yearStr}${data.title
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 8)}`;

  const authorBib = authors.map((a) => `${a.lastName}, ${a.firstName || ""}`.trim()).join(" and ");

  let bib = `@article{${citeKey},\n`;
  bib += `  author = {${authorBib}},\n`;
  bib += `  title = {${data.title}},\n`;
  if (data.journalOrPublisher) bib += `  journal = {${data.journalOrPublisher}},\n`;
  if (yearStr !== "n.d.") bib += `  year = {${yearStr}},\n`;
  if (data.volume) bib += `  volume = {${data.volume}},\n`;
  if (data.issue) bib += `  number = {${data.issue}},\n`;
  if (data.pages) bib += `  pages = {${data.pages}},\n`;
  if (data.doi) bib += `  doi = {${data.doi}},\n`;
  if (data.url) bib += `  url = {${data.url}},\n`;
  bib += `}`;

  return {
    style: "BibTeX",
    referenceText: bib,
    inTextParenthetical: `\\cite{${citeKey}}`,
    inTextNarrative: `\\cite{${citeKey}}`,
  };
}

// RIS Format
function formatRIS(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  let ris = `TY  - JOUR\n`;
  for (const a of authors) {
    ris += `AU  - ${a.lastName}, ${a.firstName || ""}\n`;
  }
  ris += `TI  - ${data.title}\n`;
  if (data.journalOrPublisher) ris += `JO  - ${data.journalOrPublisher}\n`;
  if (yearStr !== "n.d.") ris += `PY  - ${yearStr}\n`;
  if (data.volume) ris += `VL  - ${data.volume}\n`;
  if (data.issue) ris += `IS  - ${data.issue}\n`;
  if (data.pages) ris += `SP  - ${data.pages}\n`;
  if (data.doi) ris += `DO  - ${data.doi}\n`;
  if (data.url) ris += `UR  - ${data.url}\n`;
  ris += `ER  - `;

  return {
    style: "RIS",
    referenceText: ris,
    inTextParenthetical: `(${authors[0].lastName}, ${yearStr})`,
    inTextNarrative: `${authors[0].lastName} (${yearStr})`,
  };
}
