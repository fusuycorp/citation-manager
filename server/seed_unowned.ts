import { db } from "./db";

// Remove temporary unowned test entries
db.prepare("DELETE FROM citations WHERE id NOT IN (SELECT citation_id FROM user_citations)").run();

const unownedPapers = [
  {
    id: "unowned-001",
    title: "Quantum Information Processing & Scalable Distributed Ledger Protocols",
    authors: JSON.stringify([{ firstName: "Alice", lastName: "Smith" }, { firstName: "Bob", lastName: "Jones" }]),
    year: 2025,
    journalOrPublisher: "ACM Transactions on Quantum Computing",
    volume: "12", issue: "3", pages: "101-118",
    doi: "10.1145/3600001", pubType: "article",
    abstract: "This paper analyzes quantum key distribution protocols for blockchain consensus mechanisms."
  },
  {
    id: "unowned-002",
    title: "Deep Reinforcement Learning for Autonomous Robotic Manipulation in Dynamic Environments",
    authors: JSON.stringify([{ firstName: "Carlos", lastName: "Mendoza" }, { firstName: "Elena", lastName: "Rostova" }]),
    year: 2024,
    journalOrPublisher: "IEEE Transactions on Robotics",
    volume: "40", issue: "2", pages: "450-466",
    doi: "10.1109/TRO.2024.3350012", pubType: "article",
    abstract: "Novel deep Q-learning architectures applied to zero-shot robotic arm trajectory planning."
  },
  {
    id: "unowned-003",
    title: "Perovskite Solar Cells: Material Stability Optimization & Photovoltaic Efficiency",
    authors: JSON.stringify([{ firstName: "Kenji", lastName: "Takahashi" }, { firstName: "Wei", lastName: "Zhang" }]),
    year: 2024,
    journalOrPublisher: "Nature Materials",
    volume: "23", issue: "8", pages: "1120-1129",
    doi: "10.1038/s41563-024-01850-x", pubType: "article",
    abstract: "An examination of degradation mitigation strategies in halide perovskite solar modules."
  },
  {
    id: "unowned-004",
    title: "Zero-Knowledge Proof Cryptography in Privacy-Preserving Health Records",
    authors: JSON.stringify([{ firstName: "David", lastName: "Nakamoto" }, { firstName: "Sophia", lastName: "Alvarez" }]),
    year: 2023,
    journalOrPublisher: "IEEE Security & Privacy",
    volume: "21", issue: "5", pages: "34-45",
    doi: "10.1109/MSEC.2023.3289000", pubType: "article",
    abstract: "Applying zk-SNARKs to electronic medical record management while maintaining HIPAA compliance."
  },
  {
    id: "unowned-005",
    title: "CRISPR-Cas9 Gene Editing in Mammalian Neurological Tissue Regeneration",
    authors: JSON.stringify([{ firstName: "Hannah", lastName: "Abbott" }, { firstName: "Marcus", lastName: "Vance" }]),
    year: 2023,
    journalOrPublisher: "Cell Stem Cell",
    volume: "32", issue: "4", pages: "512-526",
    doi: "10.1016/j.stem.2023.03.015", pubType: "article",
    abstract: "Targeted genetic therapies for spinal cord injury repair using AAV vector delivery."
  },
  {
    id: "unowned-006",
    title: "Graph Neural Networks for Large-Scale Molecular Property Prediction",
    authors: JSON.stringify([{ firstName: "Vikram", lastName: "Patel" }, { firstName: "Laura", lastName: "Dupont" }]),
    year: 2025,
    journalOrPublisher: "Journal of Chemical Information and Modeling",
    volume: "65", issue: "1", pages: "88-102",
    doi: "10.1021/acs.jcim.4c01200", pubType: "article",
    abstract: "Message-passing neural networks evaluated against PubChem bioassay benchmark datasets."
  },
  {
    id: "unowned-007",
    title: "High-Temperature Superconductivity Mechanisms in Nickelate Heterostructures",
    authors: JSON.stringify([{ firstName: "Oliver", lastName: "Lindqvist" }, { firstName: "Ingrid", lastName: "Hansen" }]),
    year: 2022,
    journalOrPublisher: "Physical Review Letters",
    volume: "128", issue: "19", pages: "197001",
    doi: "10.1103/PhysRevLett.128.197001", pubType: "article",
    abstract: "Resonant inelastic X-ray scattering measurements of magnetic excitations in infinite-layer nickelates."
  },
  {
    id: "unowned-008",
    title: "Transformer Architectures for Multi-Modal Satellite Remote Sensing Classification",
    authors: JSON.stringify([{ firstName: "Fatima", lastName: "Al-Mansoori" }, { firstName: "Jean-Pierre", lastName: "Dubois" }]),
    year: 2024,
    journalOrPublisher: "ISPRS Journal of Photogrammetry and Remote Sensing",
    volume: "208", pages: "215-230",
    doi: "10.1016/j.isprsjprs.2024.01.012", pubType: "article",
    abstract: "Combining Sentinel-2 multispectral imaging with Sentinel-1 SAR data using vision transformers."
  },
  {
    id: "unowned-009",
    title: "Neuromorphic Event-Based Vision Sensors for High-Speed Object Tracking",
    authors: JSON.stringify([{ firstName: "Tetsuya", lastName: "Sato" }, { firstName: "Maria", lastName: "Ferrari" }]),
    year: 2023,
    journalOrPublisher: "Frontiers in Neuroscience",
    volume: "17", pages: "1089230",
    doi: "10.3389/fnins.2023.1089230", pubType: "article",
    abstract: "Asynchronous bio-inspired vision processing algorithms for micro-aerial vehicle navigation."
  },
  {
    id: "unowned-010",
    title: "Solid-State Battery Electrolytes: Lithium Metal Anode Interfacial Dynamics",
    authors: JSON.stringify([{ firstName: "Grace", lastName: "O'Connor" }, { firstName: "Kwak", lastName: "Min-Jun" }]),
    year: 2025,
    journalOrPublisher: "ACS Energy Letters",
    volume: "10", issue: "2", pages: "675-688",
    doi: "10.1021/acsenergylett.4c02999", pubType: "article",
    abstract: "In-situ transmission electron microscopy of dendrite formation across sulfide electrolyte interfaces."
  }
];

for (const p of unownedPapers) {
  db.prepare(`
    INSERT INTO citations (id, title, authors, year, journal_or_publisher, volume, issue, pages, doi, pub_type, abstract)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.id, p.title, p.authors, p.year, p.journalOrPublisher, p.volume, p.issue, p.pages, p.doi, p.pubType, p.abstract);
}

const cntRow = db.prepare("SELECT COUNT(*) as cnt FROM citations WHERE id NOT IN (SELECT citation_id FROM user_citations)").get() as { cnt: number };
console.log("Successfully seeded 10 unique, distinct unowned papers. Total Unowned Count:", cntRow.cnt);
