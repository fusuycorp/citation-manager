import { describe, expect, test } from "bun:test";
import {
  escapeAttr,
  formatCitation,
  parseAuthorString,
  parseRawAuthorsList,
  parseRawCitationString,
  sanitizeLatex,
  toHighwireMetaTags,
  type CitationData,
} from "../formatter";

describe("Author Parsing", () => {
  test("parses Last, First string correctly", () => {
    const author = parseAuthorString("DEHKHARGHANI, R.");
    expect(author.lastName).toBe("Dehkharghani");
    expect(author.firstName).toBe("R.");
  });

  test("parses full uppercase names correctly", () => {
    const author = parseAuthorString("AYDIN, MEHMET NAFİZ");
    expect(author.lastName).toBe("Aydin");
    expect(author.firstName).toBe("MEHMET NAFİZ");
  });

  test("parses array of strings or raw string list", () => {
    const list = parseRawAuthorsList(["KORKMAZ, Ö.", "AYDIN, M. N."]);
    expect(list.length).toBe(2);
    expect(list[0].lastName).toBe("Korkmaz");
    expect(list[1].lastName).toBe("Aydin");
  });

  test("parses authors with & and 'and' and et al.", () => {
    const list1 = parseRawAuthorsList("Smith, J., & Jones, B., et al.");
    expect(list1.length).toBe(2);
    expect(list1[0].lastName).toBe("Smith");
    expect(list1[1].lastName).toBe("Jones");

    const list2 = parseRawAuthorsList("Dehkharghani, R., Aydin, M. N., and Yildirim, Ş.");
    expect(list2.length).toBe(3);
    expect(list2[0].lastName).toBe("Dehkharghani");
    expect(list2[1].lastName).toBe("Aydin");
    expect(list2[2].lastName).toBe("Yildirim");
  });
});

describe("HTML Escaping & LaTeX Sanitization", () => {
  test("escapeAttr escapes &, <, >, \", and '", () => {
    const input = `<script>alert("test & 'hello'")</script>`;
    const escaped = escapeAttr(input);
    expect(escaped).toBe("&lt;script&gt;alert(&quot;test &amp; &#39;hello&#39;&quot;)&lt;/script&gt;");
  });

  test("toHighwireMetaTags applies robust HTML escaping", () => {
    const citation: CitationData = {
      title: 'A "Novel" Approach & <Breakthrough> in \'AI\'',
      authors: [{ firstName: "John & Jane", lastName: '<Smith & "Doe">' }],
      year: 2025,
      journalOrPublisher: 'Nature & "Science"',
    };
    const tags = toHighwireMetaTags(citation);
    expect(tags[0]).toContain("&quot;Novel&quot; Approach &amp; &lt;Breakthrough&gt; in &#39;AI&#39;");
    expect(tags[1]).toContain("&lt;Smith &amp; &quot;Doe&quot;&gt;, John &amp; Jane");
    expect(tags[3]).toContain("Nature &amp; &quot;Science&quot;");
  });

  test("sanitizeLatex escapes LaTeX delimiters and special characters", () => {
    const input = "Exploring 100% of C# & {Braces} with $100_cost in ~home ^top \\back";
    const sanitized = sanitizeLatex(input);
    expect(sanitized).toContain("\\%");
    expect(sanitized).toContain("\\&");
    expect(sanitized).toContain("\\{Braces\\}");
    expect(sanitized).toContain("\\$100\\_cost");
    expect(sanitized).toContain("\\textasciitilde{}");
    expect(sanitized).toContain("\\textasciicircum{}");
    expect(sanitized).toContain("\\textbackslash{}");
  });

  test("formatBibTeX sanitizes fields against LaTeX delimiters", () => {
    const cite: CitationData = {
      title: "Analysis of 99% Accuracy & {Sub-Models} in C#",
      authors: [{ firstName: "A. & B.", lastName: "O'Connor_Smith" }],
      year: 2024,
      journalOrPublisher: "ACM & IEEE Transactions",
    };
    const res = formatCitation(cite, "BibTeX");
    expect(res.referenceText).toContain("99\\% Accuracy \\& \\{Sub-Models\\} in C\\#");
    expect(res.referenceText).toContain("ACM \\& IEEE Transactions");
  });
});

describe("Dynamic et al. Behaviors across Styles", () => {
  const author1 = { firstName: "Alice", lastName: "Smith" };
  const author2 = { firstName: "Bob", lastName: "Jones" };
  const author3 = { firstName: "Charlie", lastName: "Brown" };
  const author4 = { firstName: "David", lastName: "Miller" };

  const singleAuthorCite: CitationData = {
    title: "Single Author Study",
    authors: [author1],
    year: 2024,
    pages: "10-20",
  };

  const twoAuthorCite: CitationData = {
    title: "Two Author Study",
    authors: [author1, author2],
    year: 2024,
    pages: "10-20",
  };

  const threeAuthorCite: CitationData = {
    title: "Three Author Study",
    authors: [author1, author2, author3],
    year: 2024,
    pages: "10-20",
  };

  const fourAuthorCite: CitationData = {
    title: "Four Author Study",
    authors: [author1, author2, author3, author4],
    year: 2024,
    pages: "10-20",
  };

  test("Harvard dynamic et al.", () => {
    // 1 Author: no et al.
    const res1 = formatCitation(singleAuthorCite, "Harvard");
    expect(res1.inTextParenthetical).toBe("(Smith, 2024)");
    expect(res1.inTextNarrative).toBe("Smith (2024)");

    // 2 Authors: no et al.
    const res2 = formatCitation(twoAuthorCite, "Harvard");
    expect(res2.inTextParenthetical).toBe("(Smith and Jones, 2024)");
    expect(res2.inTextNarrative).toBe("Smith and Jones (2024)");

    // 3+ Authors: et al.
    const res3 = formatCitation(threeAuthorCite, "Harvard");
    expect(res3.inTextParenthetical).toBe("(Smith et al., 2024)");
    expect(res3.inTextNarrative).toBe("Smith et al. (2024)");
  });

  test("IEEE dynamic et al.", () => {
    // 1 Author
    const res1 = formatCitation(singleAuthorCite, "IEEE", 1);
    expect(res1.inTextNarrative).toBe("Smith [1]");

    // 2 Authors
    const res2 = formatCitation(twoAuthorCite, "IEEE", 2);
    expect(res2.inTextNarrative).toBe("Smith and Jones [2]");

    // 3+ Authors
    const res3 = formatCitation(threeAuthorCite, "IEEE", 3);
    expect(res3.inTextNarrative).toBe("Smith et al. [3]");
  });

  test("MLA 9 dynamic et al.", () => {
    // 1 Author with pages
    const res1 = formatCitation(singleAuthorCite, "MLA9");
    expect(res1.inTextParenthetical).toBe("(Smith 10-20)");
    expect(res1.inTextNarrative).toBe("Smith (10-20)");

    // 2 Authors with pages
    const res2 = formatCitation(twoAuthorCite, "MLA9");
    expect(res2.inTextParenthetical).toBe("(Smith and Jones 10-20)");
    expect(res2.inTextNarrative).toBe("Smith and Jones (10-20)");

    // 3+ Authors with pages
    const res3 = formatCitation(threeAuthorCite, "MLA9");
    expect(res3.inTextParenthetical).toBe("(Smith et al. 10-20)");
    expect(res3.inTextNarrative).toBe("Smith et al. (10-20)");

    // Without pages
    const noPagesCite: CitationData = { title: "Test", authors: [author1, author2], year: 2024 };
    const resNoPages = formatCitation(noPagesCite, "MLA9");
    expect(resNoPages.inTextParenthetical).toBe("(Smith and Jones)");
    expect(resNoPages.inTextNarrative).toBe("Smith and Jones");
  });

  test("Chicago 17 dynamic et al.", () => {
    // 1 Author
    const res1 = formatCitation(singleAuthorCite, "Chicago17");
    expect(res1.inTextParenthetical).toBe("(Smith 2024)");
    expect(res1.inTextNarrative).toBe("Smith (2024)");

    // 2 Authors
    const res2 = formatCitation(twoAuthorCite, "Chicago17");
    expect(res2.inTextParenthetical).toBe("(Smith and Jones 2024)");
    expect(res2.inTextNarrative).toBe("Smith and Jones (2024)");

    // 3 Authors
    const res3 = formatCitation(threeAuthorCite, "Chicago17");
    expect(res3.inTextParenthetical).toBe("(Smith, Jones, and Brown 2024)");
    expect(res3.inTextNarrative).toBe("Smith, Jones, and Brown (2024)");

    // 4+ Authors
    const res4 = formatCitation(fourAuthorCite, "Chicago17");
    expect(res4.inTextParenthetical).toBe("(Smith et al. 2024)");
    expect(res4.inTextNarrative).toBe("Smith et al. (2024)");
  });
});

describe("Resilient Raw Citation String Parsing", () => {
  test("handles 4-digit title text correctly without breaking year", () => {
    const raw = "Smith, J. (2024). Vision 2030 and Future AI. SN Computer Science, 6(8), 908.";
    const parsed = parseRawCitationString(raw);
    expect(parsed.year).toBe(2024);
    expect(parsed.title).toBe("Vision 2030 and Future AI");
    expect(parsed.journal).toBe("SN Computer Science");
    expect(parsed.volume).toBe("6");
    expect(parsed.issue).toBe("8");
    expect(parsed.pages).toBe("908");
  });

  test("handles parenthetical 4-digit numbers in title", () => {
    const raw = "Dehkharghani, R., Aydin, M. N. (2025). The (2024) Election & Sentiment Analysis. SN Computer Science, 6(8), 908.";
    const parsed = parseRawCitationString(raw);
    expect(parsed.year).toBe(2025);
    expect(parsed.authors.length).toBe(2);
    expect(parsed.title).toContain("The (2024) Election & Sentiment Analysis");
    expect(parsed.journal).toBe("SN Computer Science");
  });

  test("handles abbreviations and decimals in title without improper splitting", () => {
    const raw = "Smith, J. (2023). A Study of U.S. Healthcare in 2020 and BERT-2.0. Nature Medicine, 14(2), 100-115. https://doi.org/10.1038/s41591-023-0001";
    const parsed = parseRawCitationString(raw);
    expect(parsed.year).toBe(2023);
    expect(parsed.title).toBe("A Study of U.S. Healthcare in 2020 and BERT-2.0");
    expect(parsed.journal).toBe("Nature Medicine");
    expect(parsed.volume).toBe("14");
    expect(parsed.issue).toBe("2");
    expect(parsed.pages).toBe("100-115");
    expect(parsed.doi).toBe("10.1038/s41591-023-0001");
  });

  test("handles quoted titles", () => {
    const raw = 'Smith, J. (2022). "Deep Learning: An e.g. vs. i.e. Study." IEEE Transactions, 5(1), 10-20.';
    const parsed = parseRawCitationString(raw);
    expect(parsed.year).toBe(2022);
    expect(parsed.title).toBe("Deep Learning: An e.g. vs. i.e. Study");
    expect(parsed.journal).toBe("IEEE Transactions");
  });
});

describe("Citation Formatting Engine Baseline", () => {
  const sampleCitation: CitationData = {
    title: "Exploring ISIS’ Takfir Discourse: A BERT-Based Entity Level Sentiment Analysis Approach",
    authors: [
      { firstName: "R.", lastName: "Dehkharghani" },
      { firstName: "M. N.", lastName: "Aydin" },
      { firstName: "Ş.", lastName: "Yildirim" },
    ],
    year: 2025,
    journalOrPublisher: "SN Computer Science",
    volume: "6",
    issue: "8",
    pages: "908",
    doi: "10.1007/s42979-024-03500-1",
  };

  test("Formats APA 7 Reference & In-text", () => {
    const res = formatCitation(sampleCitation, "APA7");
    expect(res.referenceText).toContain("Dehkharghani, R., Aydin, M. N., & Yildirim, Ş. (2025)");
    expect(res.referenceText).toContain("SN Computer Science");
    expect(res.inTextParenthetical).toBe("(Dehkharghani et al., 2025)");
    expect(res.inTextNarrative).toBe("Dehkharghani et al. (2025)");
  });

  test("Formats IEEE Reference & In-text", () => {
    const res = formatCitation(sampleCitation, "IEEE", 1);
    expect(res.referenceText).toContain("[1] R. Dehkharghani, M. N. Aydin, and Ş. Yildirim");
    expect(res.inTextParenthetical).toBe("[1]");
  });

  test("Formats MLA 9 Reference & In-text", () => {
    const res = formatCitation(sampleCitation, "MLA9");
    expect(res.referenceText).toContain("Dehkharghani, R., et al.");
    expect(res.inTextParenthetical).toBe("(Dehkharghani et al. 908)");
  });

  test("Formats BibTeX Export", () => {
    const res = formatCitation(sampleCitation, "BibTeX");
    expect(res.referenceText).toContain("@article{dehkharghani2025explorin");
    expect(res.referenceText).toContain("author = {Dehkharghani, R. and Aydin, M. N. and Yildirim, Ş.}");
  });

  test("Formats RIS Export", () => {
    const res = formatCitation(sampleCitation, "RIS");
    expect(res.referenceText).toContain("TY  - JOUR");
    expect(res.referenceText).toContain("AU  - Dehkharghani, R.");
    expect(res.referenceText).toContain("ER  - ");
  });

  test("Serializes CSL-JSON Object", () => {
    const res = formatCitation(sampleCitation, "CSL-JSON");
    const csl = JSON.parse(res.referenceText);
    expect(csl.title).toContain("Exploring ISIS’ Takfir Discourse");
    expect(csl.author.length).toBe(3);
    expect(csl.issued["date-parts"][0][0]).toBe(2025);
  });

  test("Generates COinS OpenURL & Highwire Meta Tags", () => {
    const res = formatCitation(sampleCitation, "APA7");
    expect(res.coinsHTML).toContain('class="Z3988"');
    expect(res.coinsHTML).toContain("rft.atitle=");
    expect(res.highwireMetaTags).toBeDefined();
    expect(res.highwireMetaTags![0]).toContain("citation_title");
  });
});
