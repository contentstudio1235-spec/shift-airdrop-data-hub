"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { KPICards } from "@/components/DataHub/KPICards";
import { FunnelChart } from "@/components/DataHub/FunnelChart";
import { RealtimeLedger } from "@/components/DataHub/RealtimeLedger";
import { OnchainPanel } from "@/components/DataHub/OnchainPanel";
import type {
  HubData,
  FunnelTab,
  AdminDashboard,
  OnchainHolders,
  AnalyticsDashboard,
  Leaderboard,
} from "@/components/DataHub/types";

const API = process.env.NEXT_PUBLIC_API_URL || "https://shift-airdrop-backend.onrender.com";
const KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key";
const H = { "x-admin-key": KEY };

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const { login } = useAdminAuth();
  const attempt = () => { const ok = login(pass); if (ok) onAuth(); else setErr(true); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#030d0a" }}>
      <div style={{
        background: "rgba(10,22,16,0.9)", border: "1px solid rgba(0,200,150,0.2)",
        borderRadius: "16px", padding: "48px 40px", width: "100%", maxWidth: "400px",
        backdropFilter: "blur(16px)", boxShadow: "0 0 60px rgba(0,200,150,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,200,150,0.15)", border: "1px solid rgba(0,200,150,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📊</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>Data Hub Analytics</div>
            <div style={{ color: "#3a7060", fontSize: "12px" }}>SHIFT RWA Omnichannel Gate Hub</div>
          </div>
        </div>
        <input
          type="password" placeholder="Enter admin passcode" value={pass} autoFocus
          onChange={e => { setPass(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.4)", border: `1px solid ${err ? "#ff6b6b" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", padding: "12px 16px", color: "#fff", fontSize: "14px", outline: "none", marginBottom: "12px", transition: "border 0.2s", fontFamily: "inherit" }}
        />
        {err && <p style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "12px" }}>Incorrect passcode.</p>}
        <button onClick={attempt} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #00c896 0%, #00a876 100%)", color: "#021a10", border: "none", borderRadius: "10px", fontWeight: 800, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,200,150,0.3)", fontFamily: "inherit" }}>
          Unlock Analytics
        </button>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div style={{ background: "rgba(8,18,14,0.85)", border: "1px solid rgba(0,200,150,0.1)", borderRadius: "16px", backdropFilter: "blur(12px)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid rgba(0,200,150,0.08)", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</h2>
          {subtitle && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#3a7060" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  );
}

// ─── Funnel Tab Switch ─────────────────────────────────────────────────────────
const TABS: { key: FunnelTab; label: string }[] = [
  { key: "aum", label: "RWA Acquisition" },
  { key: "holder", label: "Holder Onboarding" },
  { key: "referral", label: "Brand Referrals" },
];

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color = "#00c896" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
      <div style={{ width: "3px", height: "28px", borderRadius: "2px", background: color, boxShadow: `0 0 6px ${color}60` }} />
      <div>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#3a7060", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ fontSize: "17px", fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
function LeaderRow({ entry }: { entry: any }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 70px", gap: "12px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: "13px", textAlign: "center" }}>{medals[entry.rank] || <span style={{ color: "#3a7060", fontSize: "12px" }}>#{entry.rank}</span>}</div>
      <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#00c896" }}>
        {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
      </div>
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {Number(entry.totalSp).toLocaleString()} SP
      </div>
      <div style={{ fontSize: "11px", color: "#a78bfa", textAlign: "right" }}>
        {entry.multiplier}x · {entry.badgeCount}🏆
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onSync, syncing, lastSync }: { onSync: () => void; syncing: boolean; lastSync: Date | null }) {
  const router = useRouter();
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(3,13,10,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,200,150,0.08)", padding: "0 32px", height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 0 rgba(0,200,150,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #00c896, #00a876)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "14px", color: "#030d0a" }}>S</div>
          <div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>SHIFT RWA</div>
            <div style={{ color: "#2a6050", fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em" }}>Omnichannel Gate Hub</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          {["Dashboard", "Markets", "Analytics", "Stitched GA4", "Portfolios", "Admin"].map((item, i) => (
            <button key={item} onClick={i === 5 ? () => router.push("/admin/dashboard") : undefined} style={{ padding: "5px 12px", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "#00c896" : "#2a5040", background: i === 0 ? "rgba(0,200,150,0.08)" : "transparent", borderBottom: i === 0 ? "2px solid #00c896" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit" }}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {lastSync && <span style={{ fontSize: "10px", color: "#2a5040" }}>⚡ {lastSync.toLocaleTimeString()}</span>}
        <button onClick={onSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "8px", background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)", color: "#00c896", fontSize: "12px", fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          <span style={{ display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none" }}>⟳</span>
          {syncing ? "Syncing…" : "Force Sync"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00c896", animation: "livePulse 2s ease infinite" }} />
          <span style={{ fontSize: "10px", color: "#00c896", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
        </div>
      </div>
    </nav>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DataHubPage() {
  const { isAuthenticated } = useAdminAuth();
  const [authed, setAuthed] = useState(false);
  const [hub, setHub] = useState<HubData>({ admin: null, onchain: null, analytics: null, leaderboard: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnelTab, setFunnelTab] = useState<FunnelTab>("aum");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const polling = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [adminRes, onchainRes, analyticsRes, lbRes] = await Promise.allSettled([
        fetch(`${API}/api/admin/dashboard`, { headers: H, cache: "no-store" }).then(r => r.json() as Promise<AdminDashboard>),
        fetch(`${API}/api/admin/onchain-holders`, { headers: H, cache: "no-store" }).then(r => r.json() as Promise<OnchainHolders>),
        fetch(`${API}/api/analytics/dashboard-stats`, { headers: H, cache: "no-store" }).then(r => r.json() as Promise<AnalyticsDashboard>),
        fetch(`${API}/api/leaderboard?limit=10`, { headers: H, cache: "no-store" }).then(r => r.json() as Promise<Leaderboard>),
      ]);

      setHub({
        admin: adminRes.status === "fulfilled" ? adminRes.value : null,
        onchain: onchainRes.status === "fulfilled" ? onchainRes.value : null,
        analytics: analyticsRes.status === "fulfilled" ? analyticsRes.value : null,
        leaderboard: lbRes.status === "fulfilled" ? lbRes.value : null,
      });
      setLastSync(new Date());
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAuthenticated) setAuthed(true); }, [isAuthenticated]);

  useEffect(() => {
    if (!authed) return;
    fetchAll();
    polling.current = setInterval(fetchAll, 30_000);
    return () => { if (polling.current) clearInterval(polling.current); };
  }, [authed, fetchAll]);

  if (!authed) return <AuthGate onAuth={() => setAuthed(true)} />;

  const m = hub.admin?.metrics;
  const a = hub.analytics?.metrics;
  const funnelSteps = hub.analytics?.funnels?.[funnelTab] ?? [];
  const leaders = hub.leaderboard?.leaderboard ?? [];

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#030d0a", color: "#e0e0e0", fontFamily: "var(--font-inter-var, 'Inter', sans-serif)" }}>
        <Nav onSync={fetchAll} syncing={loading} lastSync={lastSync} />

        <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 32px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Page header */}
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Omnichannel Gate Hub</h1>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#2a5040" }}>
              4 live data feeds · GA4 identity stitching · Solana on-chain attribution · Snag loyalty sync
            </p>
          </div>

          {error && (
            <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: "10px", padding: "12px 16px", color: "#ff6b6b", fontSize: "12px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Row 1: 4 Admin KPI Stats ─────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <StatPill label="Total Users" value={loading ? "…" : (m?.total_users ?? 0).toLocaleString()} color="#00c896" />
            <StatPill label="Total SHIFT Points" value={loading ? "…" : Number(m?.total_xp ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} color="#a78bfa" />
            <StatPill label="Badges Awarded (30D)" value={loading ? "…" : String(m?.badge_count ?? 0)} color="#60a5fa" />
            <StatPill label="Avg Multiplier" value={loading ? "…" : `${Number(m?.avg_multiplier ?? 1).toFixed(2)}x`} color="#fbbf24" />
          </div>

          {/* ── Row 2: Analytics KPI Cards with sparklines ───────────────────── */}
          <KPICards metrics={a ?? null} loading={loading} />

          {/* ── Row 3: Funnel (left) + On-chain Holders (right) ─────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Card
              title={`Conversion Funnel (RWA Acquisition)`}
              subtitle={TABS.find(t => t.key === funnelTab)?.label}
              action={
                <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "3px", gap: "2px" }}>
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setFunnelTab(t.key)} style={{ padding: "5px 12px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", background: funnelTab === t.key ? "rgba(0,200,150,0.15)" : "transparent", color: funnelTab === t.key ? "#00c896" : "#2a5040" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              }
            >
              <FunnelChart steps={funnelSteps} loading={loading} activeTab={funnelTab} />
            </Card>

            <Card
              title="On-Chain Holders (Live)"
              subtitle="All 6 SHIFT Series Tokens · Solana mainnet"
              action={
                hub.onchain?.uniqueHolders !== undefined
                  ? <span style={{ fontSize: "11px", color: "#00c896", fontWeight: 700, background: "rgba(0,200,150,0.1)", padding: "3px 10px", borderRadius: "20px", border: "1px solid rgba(0,200,150,0.2)" }}>
                      {hub.onchain.uniqueHolders} unique wallets
                    </span>
                  : null
              }
            >
              <OnchainPanel data={hub.onchain} loading={loading} />
            </Card>
          </div>

          {/* ── Row 4: Leaderboard (left) + Recent Stitched Ledger (right) ───── */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px" }}>
            <Card
              title="Points Leaderboard"
              subtitle="Top earners by SHIFT Points"
              action={
                <span style={{ fontSize: "10px", color: "#2a5040" }}>
                  live · {leaders.length} shown
                </span>
              }
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: "36px", marginBottom: "8px", borderRadius: "6px", background: "linear-gradient(90deg, #0a1812 25%, #0f2218 50%, #0a1812 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s ease infinite" }} />
                ))
              ) : leaders.length === 0 ? (
                <div style={{ color: "#2a5040", fontSize: "12px", padding: "20px 0", textAlign: "center" }}>No leaderboard data</div>
              ) : (
                leaders.map(e => <LeaderRow key={e.wallet} entry={e} />)
              )}
            </Card>

            <Card
              title="Real-Time Ledger (Solana ↔ GA4)"
              subtitle="Live identity stitching · Wallet × GA4 × Snag attribution"
              action={
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00c896", animation: "livePulse 2s ease infinite" }} />
                  <span style={{ fontSize: "10px", color: "#00c896", fontWeight: 700 }}>LIVE STREAM</span>
                </div>
              }
            >
              <RealtimeLedger profiles={hub.analytics?.recentStitched ?? []} loading={loading} />
            </Card>
          </div>

        </main>
      </div>
    </>
  );
}
