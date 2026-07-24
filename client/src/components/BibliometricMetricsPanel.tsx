import React, { useEffect, useState } from "react";

interface BibliometricMetricsPanelProps {
  token: string | null;
}

export const BibliometricMetricsPanel: React.FC<BibliometricMetricsPanelProps> = ({ token }) => {
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    if (token) {
      fetch("/api/metrics/user", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  if (!metrics) return null;

  return (
    <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-chart-line" style={{ color: "var(--primary)" }}></i> Bibliometric Analytics & Impact Metrics
        </h3>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Calculated Live</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        {/* Total Publications */}
        <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Publications</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>{metrics.totalPublications}</div>
        </div>

        {/* Total Citations */}
        <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Citations</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-purple)" }}>{metrics.totalCitations}</div>
        </div>

        {/* h-index */}
        <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>h-index</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{metrics.hIndex}</div>
        </div>

        {/* i10-index */}
        <div style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>i10-index</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-amber)" }}>{metrics.i10Index}</div>
        </div>
      </div>
    </div>
  );
};
