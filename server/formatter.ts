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

export interface ParsedRawCitation {
  title: string;
  authors: Author[];
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
}

/**
 * Clean & Format Author Name strings into structured Author objects
 * e.g., "AYDIN, M. N." -> { firstName: "M. N.", lastName: "Aydin" }
 */
export function parseAuthorString(authorStr: string): Author {
  const str = authorStr.trim().replace(/\s*,?\s*et\s+al\.?$/i, "").trim();
  if (!str) return { lastName: "Unknown" };

  if (str.includes(",")) {
    const firstCommaIdx = str.indexOf(",");
    const last = str.slice(0, firstCommaIdx).trim();
    const first = str.slice(firstCommaIdx + 1).trim();
    return { firstName: first || undefined, lastName: capitalizeName(last) };
  } else {
    const parts = str.split(/\s+/).map((s) => s.trim()).filter(Boolean);
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
    return raw
      .map((item) => (typeof item === "string" ? parseAuthorString(item) : item))
      .filter((a): a is Author => Boolean(a && (a.lastName || a.firstName)));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? parseAuthorString(item) : item))
          .filter((a): a is Author => Boolean(a && (a.lastName || a.firstName)));
      }
    } catch (_) {
      // Not JSON
    }

    // Strip trailing et al.
    let cleaned = trimmed.replace(/\s*,?\s*et\s+al\.?$/i, "").trim();

    // Semicolon separated
    if (cleaned.includes(";")) {
      return cleaned
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(parseAuthorString);
    }

    // Replace " & " or " and " with a semicolon delimiter
    cleaned = cleaned.replace(/\s*(?:,\s*)?(?:&|and)\s+/gi, " ; ");

    if (cleaned.includes(";")) {
      const parts = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
      const authors: Author[] = [];
      for (const part of parts) {
        // If a segment contains multiple comma-separated Last, First pairs:
        const subParts = part.split(/,\s*(?=[A-Z\u00C0-\u017F][\w\u00C0-\u017F'-]+,\s*)/);
        for (const sp of subParts) {
          if (sp.trim()) authors.push(parseAuthorString(sp.trim()));
        }
      }
      return authors;
    }

    // Comma-separated pairs: "Smith, J., Doe, A."
    const commaSplit = cleaned.split(/,\s*(?=[A-Z\u00C0-\u017F][\w\u00C0-\u017F'-]+,\s*)/);
    if (commaSplit.length > 1) {
      return commaSplit.map((s) => s.trim()).filter(Boolean).map(parseAuthorString);
    }

    // Fallback: single author
    return [parseAuthorString(cleaned)];
  }
  return [];
}

export function capitalizeName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed === trimmed.toUpperCase()) {
    return trimmed
      .toLowerCase()
      .split(" ")
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
      .join(" ");
  }
  return trimmed;
}

export function formatInitials(firstName?: string): string {
  if (!firstName) return "";
  const parts = firstName.split(/[\s.-]+/).filter(Boolean);
  return parts.map((p) => `${p.charAt(0).toUpperCase()}.`).join(" ");
}

/**
 * Robust HTML attribute escaping for meta tags and attributes
 */
export function escapeAttr(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize LaTeX special characters and delimiters in BibTeX outputs
 */
export function sanitizeLatex(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\x00BACKSLASH\x00")
    .replace(/([{}%$#_&])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/\x00BACKSLASH\x00/g, "\\textbackslash{}");
}

/**
 * Robust sentence / abbreviation splitter for Title and Journal extraction
 */
export function splitTitleAndJournal(text: string): { title: string; journal: string | null } {
  let cleaned = text.trim();
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // 1. Quoted title: "Title." Journal or “Title.” Journal
  const quotedMatch = cleaned.match(/^["“](.+?)["”][\.,]?\s*(.*)$/);
  if (quotedMatch) {
    const title = quotedMatch[1].replace(/[\.,]$/, "").trim();
    const journal = quotedMatch[2].replace(/^[\.,\s]+/, "").trim() || null;
    return { title, journal };
  }

  // 2. Look for sentence boundary: dot followed by whitespace and non-abbreviation
  const abbrevRegex = /\b(?:U\.S|U\.K|E\.U|U\.S\.A|e\.g|i\.e|et al|vs|etc|Dr|Prof|Mr|Mrs|Ms|St|No|Vol|pp|ed|Eds|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|[A-Z])\.$/i;

  const dotIndices: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "." && i + 1 < cleaned.length && /\s/.test(cleaned[i + 1])) {
      if (i > 0 && /\d/.test(cleaned[i - 1]) && i + 2 < cleaned.length && /\d/.test(cleaned[i + 2])) {
        continue; // Decimal number e.g. 2.0 or 3.14
      }
      const beforeDot = cleaned.slice(0, i + 1);
      if (!abbrevRegex.test(beforeDot)) {
        dotIndices.push(i);
      }
    }
  }

  if (dotIndices.length > 0) {
    const splitIdx = dotIndices[0];
    const title = cleaned.slice(0, splitIdx).trim();
    const journal = cleaned.slice(splitIdx + 1).replace(/^[\.,\s]+/, "").trim() || null;
    return { title, journal };
  }

  return { title: cleaned, journal: null };
}

/**
 * Resilient raw citation string parser
 */
export function parseRawCitationString(raw: string): ParsedRawCitation {
  const str = raw.trim();

  // Extract DOI if present
  let doi: string | null = null;
  const doiMatch = str.match(/(?:https?:\/\/doi\.org\/|doi:\s*|doi\.org\/)?(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
  if (doiMatch) {
    doi = doiMatch[1];
  }

  let year: number | null = null;
  let authors: Author[] = [];
  let title = str;
  let journal: string | null = null;
  let volume: string | null = null;
  let issue: string | null = null;
  let pages: string | null = null;

  // 1. Standard format: Authors (YYYY). Rest
  const standardMatch = str.match(/^([\s\S]+?)\s*\(((?:18|19|20)\d{2}[a-z]?)\)\s*[\.:]?\s*([\s\S]*)$/);

  let restPart = "";
  if (standardMatch) {
    const yearDigits = standardMatch[2].match(/\d{4}/);
    if (yearDigits) {
      year = parseInt(yearDigits[0], 10);
    }
    authors = parseRawAuthorsList(standardMatch[1]);
    restPart = standardMatch[3].trim();
  } else {
    // 2. Chicago format: Authors. YYYY. "Title." Rest
    const chicagoMatch = str.match(/^([\s\S]+?)\.\s*((?:18|19|20)\d{2})\.\s*([\s\S]*)$/);
    if (chicagoMatch) {
      year = parseInt(chicagoMatch[2], 10);
      authors = parseRawAuthorsList(chicagoMatch[1]);
      restPart = chicagoMatch[3].trim();
    } else {
      // 3. Fallback: find first (YYYY)
      const fallbackYearMatch = str.match(/\(((?:18|19|20)\d{2})\)/);
      if (fallbackYearMatch && fallbackYearMatch.index !== undefined) {
        year = parseInt(fallbackYearMatch[1], 10);
        const authorsPart = str.slice(0, fallbackYearMatch.index).trim();
        restPart = str.slice(fallbackYearMatch.index + fallbackYearMatch[0].length).replace(/^[\.:\s]+/, "").trim();
        authors = parseRawAuthorsList(authorsPart);
      } else {
        restPart = str;
      }
    }
  }

  // Clean restPart
  let cleanedRest = restPart
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/(?:doi:\s*|doi\.org\/)?10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/gi, "")
    .trim();

  if (cleanedRest.startsWith(".")) cleanedRest = cleanedRest.slice(1).trim();

  // Volume, Issue, Pages extraction
  const volIssuePageMatch =
    cleanedRest.match(/(?:,\s*|\.\s*|\s+)(?:vol\.\s*)?(\d+)\s*\(([^)]+)\)\s*(?:,\s*|:\s*|\s*pp?\.\s*)([\d–-]+)/i) ||
    cleanedRest.match(/(?:,\s*|\.\s*)(?:vol\.\s*)?(\d+)\s*,\s*(?:no\.\s*)?(\d+)\s*,\s*pp?\.\s*([\d–-]+)/i);

  if (volIssuePageMatch && volIssuePageMatch.index !== undefined) {
    volume = volIssuePageMatch[1];
    issue = volIssuePageMatch[2];
    pages = volIssuePageMatch[3];
    cleanedRest = cleanedRest.slice(0, volIssuePageMatch.index).trim();
  } else {
    const pagesMatch = cleanedRest.match(/(?:,\s*|\.\s*)pp?\.\s*([\d–-]+)/i);
    if (pagesMatch && pagesMatch.index !== undefined) {
      pages = pagesMatch[1];
      cleanedRest = cleanedRest.slice(0, pagesMatch.index).trim();
    }
  }

  const splitResult = splitTitleAndJournal(cleanedRest);
  if (splitResult.title) {
    title = splitResult.title;
  }
  if (splitResult.journal) {
    journal = splitResult.journal;
  }

  if (authors.length === 0) {
    authors = [{ lastName: "Unknown Author" }];
  }

  return { title, authors, year, journal, volume, issue, pages, doi };
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

  return `<span class="Z3988" title="${escapeAttr(params.join("&"))}"></span>`;
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
      const authorName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
      tags.push(`<meta name="citation_author" content="${escapeAttr(authorName)}">`);
    }
  }
  if (data.year) tags.push(`<meta name="citation_publication_date" content="${escapeAttr(String(data.year))}">`);
  if (data.journalOrPublisher) tags.push(`<meta name="citation_journal_title" content="${escapeAttr(data.journalOrPublisher)}">`);
  if (data.volume) tags.push(`<meta name="citation_volume" content="${escapeAttr(data.volume)}">`);
  if (data.issue) tags.push(`<meta name="citation_issue" content="${escapeAttr(data.issue)}">`);
  if (data.doi) tags.push(`<meta name="citation_doi" content="${escapeAttr(data.doi)}">`);

  return tags;
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

  let narrative = "";
  if (authors.length === 1) {
    narrative = `${authors[0].lastName} [${index}]`;
  } else if (authors.length === 2) {
    narrative = `${authors[0].lastName} and ${authors[1].lastName} [${index}]`;
  } else {
    narrative = `${authors[0].lastName} et al. [${index}]`;
  }

  return {
    style: "IEEE",
    referenceText: ref,
    inTextParenthetical: `[${index}]`,
    inTextNarrative: narrative,
  };
}

// MLA 9 Format
function formatMLA9(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  const formatFirstAuthor = (a: Author) => (a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName);
  const formatSubsequentAuthor = (a: Author) => (a.firstName ? `${a.firstName} ${a.lastName}` : a.lastName);

  let authorRef = "";
  if (authors.length === 1) {
    authorRef = formatFirstAuthor(authors[0]);
  } else if (authors.length === 2) {
    authorRef = `${formatFirstAuthor(authors[0])}, and ${formatSubsequentAuthor(authors[1])}`;
  } else {
    authorRef = `${formatFirstAuthor(authors[0])}, et al.`;
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
  let parenthetical = "";
  let narrative = "";

  if (authors.length === 1) {
    parenthetical = `(${authors[0].lastName}${pagesStr})`;
    narrative = data.pages ? `${authors[0].lastName} (${data.pages})` : authors[0].lastName;
  } else if (authors.length === 2) {
    parenthetical = `(${authors[0].lastName} and ${authors[1].lastName}${pagesStr})`;
    narrative = data.pages
      ? `${authors[0].lastName} and ${authors[1].lastName} (${data.pages})`
      : `${authors[0].lastName} and ${authors[1].lastName}`;
  } else {
    parenthetical = `(${authors[0].lastName} et al.${pagesStr})`;
    narrative = data.pages ? `${authors[0].lastName} et al. (${data.pages})` : `${authors[0].lastName} et al.`;
  }

  return { style: "MLA9", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// Chicago 17
function formatChicago17(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  const formatFirstAuthor = (a: Author) => (a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName);
  const formatSubsequentAuthor = (a: Author) => (a.firstName ? `${a.firstName} ${a.lastName}` : a.lastName);

  let authorRef = "";
  if (authors.length === 1) {
    authorRef = formatFirstAuthor(authors[0]);
  } else if (authors.length <= 3) {
    const formatted = authors.map((a, i) => (i === 0 ? formatFirstAuthor(a) : formatSubsequentAuthor(a)));
    if (formatted.length === 2) {
      authorRef = `${formatted[0]}, and ${formatted[1]}`;
    } else {
      authorRef = `${formatted[0]}, ${formatted[1]}, and ${formatted[2]}`;
    }
  } else {
    authorRef = `${formatFirstAuthor(authors[0])}, et al.`;
  }

  let ref = `${authorRef}. ${yearStr}. "${data.title}."`;
  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += ` ${data.volume}`;
    if (data.issue) ref += `, no. ${data.issue}`;
    if (data.pages) ref += `: ${data.pages}`;
    ref += `.`;
  }

  let parenthetical = "";
  let narrative = "";

  if (authors.length === 1) {
    parenthetical = `(${authors[0].lastName} ${yearStr})`;
    narrative = `${authors[0].lastName} (${yearStr})`;
  } else if (authors.length === 2) {
    parenthetical = `(${authors[0].lastName} and ${authors[1].lastName} ${yearStr})`;
    narrative = `${authors[0].lastName} and ${authors[1].lastName} (${yearStr})`;
  } else if (authors.length === 3) {
    parenthetical = `(${authors[0].lastName}, ${authors[1].lastName}, and ${authors[2].lastName} ${yearStr})`;
    narrative = `${authors[0].lastName}, ${authors[1].lastName}, and ${authors[2].lastName} (${yearStr})`;
  } else {
    parenthetical = `(${authors[0].lastName} et al. ${yearStr})`;
    narrative = `${authors[0].lastName} et al. (${yearStr})`;
  }

  return { style: "Chicago17", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// Harvard Format
function formatHarvard(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  const formatAuthor = (a: Author) => {
    const initials = formatInitials(a.firstName);
    return initials ? `${a.lastName}, ${initials}` : a.lastName;
  };

  let authorRef = "";
  if (authors.length === 1) {
    authorRef = formatAuthor(authors[0]);
  } else if (authors.length <= 3) {
    const formatted = authors.map(formatAuthor);
    if (formatted.length === 2) {
      authorRef = `${formatted[0]} and ${formatted[1]}`;
    } else {
      authorRef = `${formatted.slice(0, -1).join(", ")} and ${formatted[formatted.length - 1]}`;
    }
  } else {
    authorRef = `${formatAuthor(authors[0])} et al.`;
  }

  let ref = `${authorRef}, ${yearStr}. ${data.title}.`;
  if (data.journalOrPublisher) {
    ref += ` ${data.journalOrPublisher}`;
    if (data.volume) ref += `, ${data.volume}`;
    if (data.issue) ref += `(${data.issue})`;
    if (data.pages) ref += `, pp.${data.pages}`;
    ref += `.`;
  }

  let parenthetical = "";
  let narrative = "";

  if (authors.length === 1) {
    parenthetical = `(${authors[0].lastName}, ${yearStr})`;
    narrative = `${authors[0].lastName} (${yearStr})`;
  } else if (authors.length === 2) {
    parenthetical = `(${authors[0].lastName} and ${authors[1].lastName}, ${yearStr})`;
    narrative = `${authors[0].lastName} and ${authors[1].lastName} (${yearStr})`;
  } else {
    parenthetical = `(${authors[0].lastName} et al., ${yearStr})`;
    narrative = `${authors[0].lastName} et al. (${yearStr})`;
  }

  return { style: "Harvard", referenceText: ref, inTextParenthetical: parenthetical, inTextNarrative: narrative };
}

// BibTeX Format
function formatBibTeX(data: CitationData, authors: Author[], yearStr: string): FormattedCitation {
  const cleanYear = yearStr !== "n.d." ? yearStr.replace(/[^0-9]/g, "") : "";
  const citeKey = `${authors[0].lastName.toLowerCase().replace(/[^a-z0-9]/g, "")}${cleanYear}${data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8)}`;

  const authorBib = authors
    .map((a) => (a.firstName ? `${sanitizeLatex(a.lastName)}, ${sanitizeLatex(a.firstName)}` : sanitizeLatex(a.lastName)))
    .join(" and ");

  let bib = `@article{${citeKey},\n`;
  bib += `  author = {${authorBib}},\n`;
  bib += `  title = {${sanitizeLatex(data.title)}},\n`;
  if (data.journalOrPublisher) bib += `  journal = {${sanitizeLatex(data.journalOrPublisher)}},\n`;
  if (yearStr !== "n.d.") bib += `  year = {${yearStr}},\n`;
  if (data.volume) bib += `  volume = {${sanitizeLatex(data.volume)}},\n`;
  if (data.issue) bib += `  number = {${sanitizeLatex(data.issue)}},\n`;
  if (data.pages) bib += `  pages = {${sanitizeLatex(data.pages)}},\n`;
  if (data.doi) bib += `  doi = {${sanitizeLatex(data.doi)}},\n`;
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
