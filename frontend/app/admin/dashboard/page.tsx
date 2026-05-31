"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "@/styles/admin.module.css";

// ── Types ──────────────────────────────────────────────────────────────────
interface TokenHolderStats {
  symbol: string;
  name: string;
  mint: string;
  holders: number;
  error?: string;
}
interface OnChainHolders {
  tokens: TokenHolderStats[];
  uniqueHolders: number;
  totalHolderSlots: number;
  fetchedAt: string;
  cached: boolean;
}

// Token accent colours: green for longs, red/orange for shorts
const TOKEN_COLORS: Record<string, string> = {
  TSL2L: "#00ff88",
  TSL1S: "#ff6b6b",
  SOX3L: "#00d4ff",
  SOX3S: "#ff9f43",
  SPX3S: "#ff6b6b",
  SPX3L: "#00ff88",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://shift-airdrop-backend.onrender.com";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAdminAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);

  // On-chain holders state
  const [holders, setHolders] = useState<OnChainHolders | null>(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState<string | null>(null);

  const navItems = [
    { label: "📊 Data Hub Analytics", path: "/admin/data-hub" },
    { label: "👥 User Management", path: "/admin/users" },
    { label: "🏆 Badges", path: "/admin/badges" },
    { label: "🎖️ Certificates", path: "/admin/certificates" },
    { label: "👑 KOL Whitelist", path: "/admin/kol" },
    { label: "⚙️ Configuration", path: "/admin/configuration" },
    { label: "📋 Audit Logs", path: "/admin/audit" },
  ];

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/admin/dashboard`,
          { headers: { "x-admin-key": ADMIN_KEY } }
        );
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        const data = await res.json();
        setMetrics(data.metrics || {});
        setRecentActivity(data.recentActivity || []);
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [isAuthenticated]);

  // Fetch on-chain holder counts (cached 5 min on server)
  const fetchHolders = useCallback(async (force = false) => {
    setHoldersLoading(true);
    setHoldersError(null);
    try {
      const url = `${API_BASE}/api/admin/onchain-holders${force ? "?force=1" : ""}`;
      const res = await fetch(url, { headers: { "x-admin-key": ADMIN_KEY } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OnChainHolders = await res.json();
      setHolders(data);
    } catch (err: any) {
      setHoldersError(err?.message || "Failed to fetch holder data");
    } finally {
      setHoldersLoading(false);
    }
  }, []);

  // Auto-load holders when authenticated
  useEffect(() => {
    if (isAuthenticated) fetchHolders();
  }, [isAuthenticated, fetchHolders]);

  if (!isAuthenticated) {
    return (
      <div className={styles.adminPage}>
        <div className={styles.authGate}>
          <h2>Admin Access Required</h2>
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
          />
          {authError && <p style={{ color: "#e63946" }}>Invalid passcode</p>}
          <button
            className={styles.btnPrimary}
            onClick={() => {
              const ok = login(passcode);
              if (!ok) setAuthError(true);
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className={styles.adminPage} style={{ padding: 40, color: "#888" }}>Loading dashboard...</div>;

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <h1>Admin Dashboard</h1>
        <p>SHIFT airdrop system overview and metrics</p>
      </div>

      {/* Navigation Menu */}
      <div className={styles.adminNavGrid}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={styles.navButton}
            onClick={() => router.push(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <h3>Total Users</h3>
          <p style={{fontSize: "2.5em", color: "#00ff00"}}>{metrics?.total_users || 0}</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Total Shift Points</h3>
          <p style={{fontSize: "2.5em", color: "#00ff00"}}>{(metrics?.total_xp || 0).toLocaleString()}</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Badges (30d)</h3>
          <p style={{fontSize: "2.5em", color: "#00ff00"}}>{metrics?.badge_count || 0}</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Certificates (30d)</h3>
          <p style={{fontSize: "2.5em", color: "#00ff00"}}>{metrics?.certificate_count || 0}</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Hall of Fame</h3>
          <p style={{fontSize: "2.5em", color: "#ffd700"}}>{metrics?.hof_count || 0}</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Avg Multiplier</h3>
          <p style={{fontSize: "2.5em", color: "#00ff00"}}>{(metrics?.avg_multiplier || 1).toFixed(2)}x</p>
        </div>
      </div>

      {/* ── On-Chain Holders ── */}
      <section style={{ marginTop: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "1.3rem" }}>
            📊 On-Chain Holders (Live)
          </h2>
          <button
            onClick={() => fetchHolders(true)}
            disabled={holdersLoading}
            style={{
              background: holdersLoading ? "#1a1a1a" : "#111",
              border: "1px solid #333",
              borderRadius: "8px",
              color: holdersLoading ? "#555" : "#00ff88",
              padding: "6px 16px",
              fontSize: "0.82rem",
              cursor: holdersLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {holdersLoading ? "⏳ Fetching…" : "🔄 Refresh"}
          </button>
          {holders && (
            <span style={{ color: "#555", fontSize: "0.78rem" }}>
              {holders.cached ? "⚡ cached · " : ""}
              updated {new Date(holders.fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {holdersError && (
          <div style={{ color: "#ff6b6b", background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "0.85rem" }}>
            ⚠️ {holdersError}
          </div>
        )}

        {/* Unique holders summary card — hero metric */}
        {holders && (
          <div style={{
            background: "linear-gradient(135deg, #0d1f14 0%, #0a1a0a 100%)",
            border: "1px solid #1a4d2e",
            borderRadius: "12px",
            padding: "24px 32px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "32px",
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ color: "#555", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Unique Holders (all 6 assets)
              </div>
              <div style={{ fontSize: "3rem", fontWeight: 700, color: "#00ff88", lineHeight: 1 }}>
                {holdersLoading ? "—" : holders.uniqueHolders.toLocaleString()}
              </div>
            </div>
            <div style={{ width: "1px", height: "60px", background: "#1a4d2e" }} />
            <div>
              <div style={{ color: "#555", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Total Holder Slots
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 600, color: "#aaa", lineHeight: 1 }}>
                {holdersLoading ? "—" : holders.totalHolderSlots.toLocaleString()}
              </div>
              <div style={{ color: "#555", fontSize: "0.75rem", marginTop: "4px" }}>
                (holders across all tokens combined)
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ color: "#555", fontSize: "0.75rem", marginBottom: "4px" }}>Multi-asset holders</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "#ffd700" }}>
                {holdersLoading || !holders ? "—" : (holders.totalHolderSlots - holders.uniqueHolders).toLocaleString()}
              </div>
              <div style={{ color: "#555", fontSize: "0.72rem" }}>wallets hold 2+ assets</div>
            </div>
          </div>
        )}

        {/* Per-token breakdown */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}>
          {holdersLoading && !holders
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  background: "#111",
                  border: "1px solid #1e1e1e",
                  borderRadius: "10px",
                  padding: "20px",
                  textAlign: "center",
                  animation: "pulse 1.5s infinite",
                }}>
                  <div style={{ color: "#333", fontSize: "0.8rem", marginBottom: "8px" }}>Loading…</div>
                  <div style={{ fontSize: "2rem", color: "#222" }}>—</div>
                </div>
              ))
            : (holders?.tokens || []).map((token) => {
                const color = TOKEN_COLORS[token.symbol] || "#00ff88";
                const isShort = token.symbol.endsWith("S");
                return (
                  <div key={token.symbol} style={{
                    background: "#111",
                    border: `1px solid ${isShort ? "#3a1515" : "#153a20"}`,
                    borderRadius: "10px",
                    padding: "20px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* top accent bar */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: color }} />

                    <div style={{ color: color, fontWeight: 700, fontSize: "1rem", marginBottom: "2px" }}>
                      {token.symbol}
                    </div>
                    <div style={{ color: "#555", fontSize: "0.72rem", marginBottom: "12px", lineHeight: 1.3 }}>
                      {token.name}
                    </div>

                    {token.error ? (
                      <div style={{ color: "#ff6b6b", fontSize: "0.78rem" }}>⚠️ Error</div>
                    ) : (
                      <>
                        <div style={{ fontSize: "2.4rem", fontWeight: 700, color, lineHeight: 1 }}>
                          {holdersLoading ? "…" : token.holders.toLocaleString()}
                        </div>
                        <div style={{ color: "#666", fontSize: "0.75rem", marginTop: "6px" }}>on-chain holders</div>
                      </>
                    )}

                    <div style={{
                      marginTop: "12px",
                      padding: "4px 10px",
                      background: isShort ? "#2a1515" : "#152a1a",
                      borderRadius: "20px",
                      display: "inline-block",
                      fontSize: "0.7rem",
                      color: "#888",
                    }}>
                      {isShort ? "📉 SHORT" : "📈 LONG"}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Mint addresses reference */}
        {holders && (
          <details style={{ marginTop: "16px", color: "#555", fontSize: "0.78rem" }}>
            <summary style={{ cursor: "pointer", color: "#888" }}>Show contract addresses</summary>
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {holders.tokens.map(t => (
                <div key={t.symbol} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ color: TOKEN_COLORS[t.symbol] || "#aaa", fontWeight: 600, width: "60px" }}>{t.symbol}</span>
                  <code style={{ color: "#666", fontSize: "0.75rem", fontFamily: "monospace", wordBreak: "break-all" }}>{t.mint}</code>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* ── Recent Admin Activity ── */}
      <section style={{marginTop: "40px"}}>
        <h2>Recent Admin Activity</h2>
        {recentActivity.length === 0 ? (
          <p>No recent activity</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Action</th><th>Resource</th><th>Admin</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.slice(0, 20).map((a, i) => (
                <tr key={i}>
                  <td>{a.action}</td>
                  <td>{a.resource_type}</td>
                  <td>{(a.admin_wallet || "").slice(0, 8)}...</td>
                  <td>{new Date(a.created_at || "").toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
