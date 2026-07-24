import { describe, expect, test } from "bun:test";
import { formatCitation, parseAuthorString, parseRawAuthorsList, type CitationData } from "../formatter";

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
});

describe("Citation Formatting Engine", () => {
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
    expect(res.coinsHTML).toContain("class=\"Z3988\"");
    expect(res.coinsHTML).toContain("rft.atitle=");
    expect(res.highwireMetaTags).toBeDefined();
    expect(res.highwireMetaTags![0]).toContain("citation_title");
  });
});
