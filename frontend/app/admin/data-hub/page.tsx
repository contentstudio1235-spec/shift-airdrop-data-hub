"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "@/styles/admin.module.css";

// Harmonized dark theme variables and HSL colors for dynamic glows
const ACCENT_COLORS = {
  emerald: "#00c896",
  emeraldGlow: "rgba(0, 200, 150, 0.25)",
  glassBg: "rgba(17, 17, 17, 0.75)",
  glassBorder: "rgba(255, 255, 255, 0.05)",
  gold: "#ffd700",
  blue: "#00d4ff",
  purple: "#ab47bc",
  dropoffRed: "#ff6b6b",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://shift-airdrop-backend.onrender.com";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key";

export default function DataHubAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAdminAuth();
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);

  // Stats state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFunnelTab, setActiveFunnelTab] = useState<"aum" | "holder" | "referral">("aum");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/dashboard-stats`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Failed to retrieve stats");
      }
    } catch (err: any) {
      console.error("Data Hub Stats Error:", err);
      setError(err?.message || "Failed to load Data Hub analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchStats();
  }, [isAuthenticated, fetchStats]);

  if (!isAuthenticated) {
    return (
      <div className={styles.adminPage}>
        <div className={styles.authGate}>
          <div style={{
            background: ACCENT_COLORS.glassBg,
            border: `1px solid ${ACCENT_COLORS.glassBorder}`,
            borderRadius: "16px",
            padding: "40px",
            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px ${ACCENT_COLORS.glassBorder}`,
            backdropFilter: "blur(12px)",
            textAlign: "center",
            maxWidth: "400px"
          }}>
            <h2 style={{ color: "#fff", fontSize: "1.4rem", marginBottom: "8px" }}>📊 Data Hub Analytics</h2>
            <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "24px" }}>Passcode required to view attribution streams</p>
            <input
              type="password"
              placeholder="Enter admin passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const ok = login(passcode);
                  if (!ok) setAuthError(true);
                }
              }}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid #222",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
                marginBottom: "16px",
                transition: "border 0.2s"
              }}
            />
            {authError && <p style={{ color: ACCENT_COLORS.dropoffRed, fontSize: "0.82rem", marginBottom: "16px" }}>Invalid passcode</p>}
            <button
              onClick={() => {
                const ok = login(passcode);
                if (!ok) setAuthError(true);
              }}
              style={{
                width: "100%",
                background: `linear-gradient(135deg, ${ACCENT_COLORS.emerald} 0%, #00a876 100%)`,
                color: "#000",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontWeight: "700",
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: `0 4px 14px ${ACCENT_COLORS.emeraldGlow}`
              }}
            >
              Unlock Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper: Format wallet output
  const formatWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-6)}`;

  // Funnel details depending on selected tab
  const getActiveFunnelData = () => {
    if (!data?.funnels) return [];
    return data.funnels[activeFunnelTab] || [];
  };

  const getFunnelTitle = () => {
    switch (activeFunnelTab) {
      case "aum": return "AUM Holding Milestone Funnel (KPI 1)";
      case "holder": return "Unique Holder Acquisition Funnel (KPI 3)";
      case "referral": return "Brand Awareness & Viral Referral Funnel (KPI 4)";
    }
  };

  return (
    <div className={styles.adminPage} style={{ background: "#060606", color: "#e0e0e0", fontFamily: "var(--font-inter-var)" }}>
      {/* Header section with glow background */}
      <div style={{
        position: "relative",
        borderBottom: `1px solid ${ACCENT_COLORS.glassBorder}`,
        paddingBottom: "24px",
        marginBottom: "32px"
      }}>
        <div style={{
          position: "absolute",
          top: "-50px",
          left: "10%",
          width: "250px",
          height: "150px",
          background: `radial-gradient(circle, ${ACCENT_COLORS.emeraldGlow} 0%, rgba(0,0,0,0) 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none"
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.03em" }}>
              📊 SHIFT Omnichannel Data Hub
            </h1>
            <p style={{ color: "#666", fontSize: "0.92rem", marginTop: "4px" }}>
              Unified Attribution, SQL database stitches, and GA4 telemetry sync
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => router.push("/admin/dashboard")}
              style={{
                background: "transparent",
                border: `1px solid ${ACCENT_COLORS.glassBorder}`,
                borderRadius: "8px",
                color: "#aaa",
                padding: "8px 16px",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              ⬅️ Admin Main
            </button>
            <button
              onClick={fetchStats}
              disabled={loading}
              style={{
                background: loading ? "rgba(20, 20, 20, 0.5)" : "#111",
                border: "1px solid #222",
                borderRadius: "8px",
                color: ACCENT_COLORS.emerald,
                padding: "8px 20px",
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: loading ? "none" : `0 4px 12px rgba(0, 0, 0, 0.3)`
              }}
            >
              {loading ? "Syncing..." : "🔄 Force Sync"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: "rgba(230, 57, 70, 0.08)",
          border: `1px solid ${ACCENT_COLORS.dropoffRed}`,
          borderRadius: "8px",
          color: ACCENT_COLORS.dropoffRed,
          padding: "16px",
          marginBottom: "24px",
          fontSize: "0.9rem"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main KPI Stats Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginBottom: "32px"
      }}>
        {/* Metric 1 */}
        <div style={{
          background: ACCENT_COLORS.glassBg,
          border: `1px solid ${ACCENT_COLORS.glassBorder}`,
          borderRadius: "12px",
          padding: "24px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: ACCENT_COLORS.blue }} />
          <h3 style={{ fontSize: "0.78rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Stitched GA4 Profiles</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "2.4rem", fontWeight: 700, color: "#fff" }}>
              {loading ? "..." : data?.metrics?.stitchedUsers || 0}
            </span>
            <span style={{ color: "#444", fontSize: "0.85rem" }}>
              / {loading ? "..." : data?.metrics?.totalUsers || 0} total
            </span>
          </div>
          <div style={{ color: ACCENT_COLORS.blue, fontSize: "0.75rem", marginTop: "8px", fontWeight: 600 }}>
            {data?.metrics?.totalUsers ? ((data.metrics.stitchedUsers / data.metrics.totalUsers) * 100).toFixed(1) : 0}% Mapping Efficiency
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{
          background: ACCENT_COLORS.glassBg,
          border: `1px solid ${ACCENT_COLORS.glassBorder}`,
          borderRadius: "12px",
          padding: "24px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: ACCENT_COLORS.emerald }} />
          <h3 style={{ fontSize: "0.78rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Active AUM Holders (On-chain)</h3>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "#fff" }}>
            {loading ? "..." : data?.metrics?.activeHolders || 0}
          </div>
          <div style={{ color: ACCENT_COLORS.emerald, fontSize: "0.75rem", marginTop: "8px", fontWeight: 600 }}>
            Unique wallets holding SHIFT tokenized assets
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{
          background: ACCENT_COLORS.glassBg,
          border: `1px solid ${ACCENT_COLORS.glassBorder}`,
          borderRadius: "12px",
          padding: "24px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: ACCENT_COLORS.purple }} />
          <h3 style={{ fontSize: "0.78rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Accumulated Trading Volume</h3>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "#fff" }}>
            ${loading ? "..." : Number(data?.metrics?.totalVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ color: ACCENT_COLORS.purple, fontSize: "0.75rem", marginTop: "8px", fontWeight: 600 }}>
            Total volume executed under system tracking (USD)
          </div>
        </div>
      </div>

      {/* Conversion Funnels Section */}
      <section style={{
        background: ACCENT_COLORS.glassBg,
        border: `1px solid ${ACCENT_COLORS.glassBorder}`,
        borderRadius: "16px",
        padding: "28px",
        marginBottom: "32px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff", margin: 0 }}>
              📈 Omnichannel Conversion Funnels
            </h2>
            <p style={{ color: "#666", fontSize: "0.82rem", marginTop: "4px" }}>Select a funnel to inspect conversion drop-offs</p>
          </div>
          {/* Tabs switch */}
          <div style={{
            display: "flex",
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid #1e1e1e",
            borderRadius: "8px",
            padding: "4px"
          }}>
            <button
              onClick={() => setActiveFunnelTab("aum")}
              style={{
                background: activeFunnelTab === "aum" ? "#1a1a1a" : "transparent",
                border: "none",
                borderRadius: "6px",
                color: activeFunnelTab === "aum" ? ACCENT_COLORS.emerald : "#666",
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              KPI 1: AUM Hold
            </button>
            <button
              onClick={() => setActiveFunnelTab("holder")}
              style={{
                background: activeFunnelTab === "holder" ? "#1a1a1a" : "transparent",
                border: "none",
                borderRadius: "6px",
                color: activeFunnelTab === "holder" ? ACCENT_COLORS.blue : "#666",
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              KPI 3: Holder Onboarding
            </button>
            <button
              onClick={() => setActiveFunnelTab("referral")}
              style={{
                background: activeFunnelTab === "referral" ? "#1a1a1a" : "transparent",
                border: "none",
                borderRadius: "6px",
                color: activeFunnelTab === "referral" ? ACCENT_COLORS.purple : "#666",
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              KPI 4: Brand Awareness
            </button>
          </div>
        </div>

        {/* Dynamic Funnel View */}
        <h3 style={{ fontSize: "1rem", color: "#fff", fontWeight: 600, marginBottom: "20px" }}>{getFunnelTitle()}</h3>

        {loading ? (
          <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>Loading conversion pathways...</div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "32px",
            alignItems: "center",
            minHeight: "260px"
          }}>
            {/* Visual Funnel Stack (Pure geometric SVG + CSS) */}
            <div style={{ position: "relative", padding: "10px" }}>
              <svg viewBox="0 0 600 240" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                <defs>
                  <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={activeFunnelTab === "aum" ? ACCENT_COLORS.emerald : activeFunnelTab === "holder" ? ACCENT_COLORS.blue : ACCENT_COLORS.purple} />
                    <stop offset="100%" stopColor="#051c14" />
                  </linearGradient>
                </defs>

                {/* Render funnel polygons based on steps */}
                {(() => {
                  const steps = getActiveFunnelData();
                  if (steps.length === 0) return null;
                  const totalSteps = steps.length;
                  const baseWidth = 500;
                  const maxVal = Math.max(...steps.map((s: any) => Number(s.count))) || 1;
                  
                  return steps.map((step: any, idx: number) => {
                    const val = Number(step.count);
                    const conversionRate = (val / maxVal) * 100;
                    
                    // Compute geometric points for 3D tapered funnel segment
                    const segmentHeight = 200 / totalSteps;
                    const topY = idx * segmentHeight + 10;
                    const bottomY = (idx + 1) * segmentHeight + 10;
                    
                    const nextStep = steps[idx + 1];
                    const nextVal = nextStep ? Number(nextStep.count) : val;
                    
                    const curWidth = baseWidth * (val / maxVal);
                    const nextWidth = baseWidth * (nextVal / maxVal);
                    
                    const xStartTop = (600 - curWidth) / 2;
                    const xEndTop = xStartTop + curWidth;
                    
                    const xStartBottom = (600 - nextWidth) / 2;
                    const xEndBottom = xStartBottom + nextWidth;
                    
                    const polygonPoints = `${xStartTop},${topY} ${xEndTop},${topY} ${xEndBottom},${bottomY} ${xStartBottom},${bottomY}`;
                    
                    // Color accent
                    const glowColor = activeFunnelTab === "aum" ? ACCENT_COLORS.emerald : activeFunnelTab === "holder" ? ACCENT_COLORS.blue : ACCENT_COLORS.purple;

                    return (
                      <g key={step.name} style={{ cursor: "pointer" }}>
                        <polygon
                          points={polygonPoints}
                          fill="url(#glowGrad)"
                          stroke={glowColor}
                          strokeWidth="1.5"
                          opacity={0.3 + (idx * 0.15)}
                          style={{ transition: "all 0.3s ease" }}
                        />
                        {/* Text Overlay for counts */}
                        <text
                          x="300"
                          y={topY + segmentHeight / 2 + 5}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {step.name}: {val} users ({conversionRate.toFixed(0)}%)
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>

            {/* Funnel Table Breakdown */}
            <div style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid #1e1e1e",
              borderRadius: "10px",
              padding: "20px"
            }}>
              <h4 style={{ fontSize: "0.85rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>Funnel Breakdown</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {(() => {
                  const arr = getActiveFunnelData();
                  const maxVal = Math.max(...arr.map((s: any) => Number(s.count))) || 1;
                  return arr.map((step: any, idx: number) => {
                    const prevStep = arr[idx - 1];
                    const val = Number(step.count);
                  
                  // Total conversion of the funnel
                  const totalConv = (val / maxVal) * 100;
                  
                  // Step-by-step retention (drop-off)
                  let stepConv = 100;
                  if (prevStep) {
                    const prevVal = Number(prevStep.count) || 1;
                    stepConv = (val / prevVal) * 100;
                  }

                  return (
                    <div key={step.name} style={{ borderBottom: idx !== arr.length - 1 ? "1px solid #141414" : "none", paddingBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 500 }}>{step.name}</span>
                        <span style={{ fontSize: "0.85rem", color: ACCENT_COLORS.emerald, fontWeight: 700 }}>{val}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#666" }}>
                        <span>Cumulative: {totalConv.toFixed(1)}%</span>
                        {idx !== 0 && (
                          <span style={{ color: stepConv >= 80 ? ACCENT_COLORS.emerald : stepConv >= 50 ? ACCENT_COLORS.gold : ACCENT_COLORS.dropoffRed }}>
                            Retention: {stepConv.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Stitched Profiles Ledger */}
      <section style={{
        background: ACCENT_COLORS.glassBg,
        border: `1px solid ${ACCENT_COLORS.glassBorder}`,
        borderRadius: "16px",
        padding: "28px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
      }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff", margin: 0 }}>
            🔗 Real-Time Stitched Identity Ledger
          </h2>
          <p style={{ color: "#666", fontSize: "0.82rem", marginTop: "4px" }}>
            Stitched profiles linking Solana wallets to Google Analytics Client IDs and referral campaigns
          </p>
        </div>

        {loading ? (
          <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>Loading identity records...</div>
        ) : !data?.recentStitched || data.recentStitched.length === 0 ? (
          <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
            ℹ️ No stitched user sessions found. Connect wallets on frontend to begin mapping.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table} style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                  <th style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", padding: "12px 16px" }}>Solana Wallet</th>
                  <th style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", padding: "12px 16px" }}>GA4 Client ID</th>
                  <th style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", padding: "12px 16px" }}>Referral Campaign</th>
                  <th style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", padding: "12px 16px" }}>Total XP</th>
                  <th style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", padding: "12px 16px" }}>Snag Points</th>
                  <th style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", padding: "12px 16px" }}>Stitched At</th>
                </tr>
              </thead>
              <tbody>
                {data.recentStitched.map((profile: any) => (
                  <tr key={profile.wallet} style={{ borderBottom: "1px solid #141414", transition: "all 0.15s" }}>
                    <td style={{ padding: "14px 16px", color: ACCENT_COLORS.emerald, fontWeight: "600", fontFamily: "monospace" }}>
                      {formatWallet(profile.wallet)}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#aaa", fontFamily: "monospace" }}>
                      {profile.ga_user_id}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {profile.snag_custom_referral_code ? (
                        <span style={{
                          background: "rgba(171, 71, 188, 0.12)",
                          color: ACCENT_COLORS.purple,
                          border: "1px solid rgba(171, 71, 188, 0.25)",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "0.76rem",
                          fontWeight: 600
                        }}>
                          🏷️ {profile.snag_custom_referral_code}
                        </span>
                      ) : (
                        <span style={{ color: "#444", fontSize: "0.78rem" }}>organic</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", color: ACCENT_COLORS.blue, fontWeight: 700 }}>
                      {Number(profile.total_xp).toLocaleString()} XP
                    </td>
                    <td style={{ padding: "14px 16px", color: ACCENT_COLORS.gold, fontWeight: 700 }}>
                      {Number(profile.snag_points).toLocaleString()} SP
                    </td>
                    <td style={{ padding: "14px 16px", color: "#666", fontSize: "0.78rem" }}>
                      {new Date(profile.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
