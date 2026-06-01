"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { KPICards } from "@/components/DataHub/KPICards";
import { FunnelChart } from "@/components/DataHub/FunnelChart";
import { RealtimeLedger } from "@/components/DataHub/RealtimeLedger";
import type { DashboardStats, FunnelTab } from "@/components/DataHub/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://shift-airdrop-backend.onrender.com";
const ADMIN_KEY =
  process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key";

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const { login } = useAdminAuth();

  const attempt = () => {
    const ok = login(pass);
    if (ok) onAuth();
    else setErr(true);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#030d0a",
    }}>
      <div style={{
        background: "rgba(10,22,16,0.9)", border: "1px solid rgba(0,200,150,0.2)",
        borderRadius: "16px", padding: "48px 40px", width: "100%", maxWidth: "400px",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 60px rgba(0,200,150,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "rgba(0,200,150,0.15)", border: "1px solid rgba(0,200,150,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px",
          }}>📊</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>Data Hub Analytics</div>
            <div style={{ color: "#3a7060", fontSize: "12px" }}>SHIFT RWA Omnichannel</div>
          </div>
        </div>
        <input
          type="password"
          placeholder="Enter admin passcode"
          value={pass}
          autoFocus
          onChange={e => { setPass(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(0,0,0,0.4)", border: `1px solid ${err ? "#ff6b6b" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "10px", padding: "12px 16px", color: "#fff",
            fontSize: "14px", outline: "none", marginBottom: "12px",
            transition: "border 0.2s", fontFamily: "inherit",
          }}
        />
        {err && <p style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "12px" }}>Incorrect passcode.</p>}
        <button
          onClick={attempt}
          style={{
            width: "100%", padding: "12px",
            background: "linear-gradient(135deg, #00c896 0%, #00a876 100%)",
            color: "#021a10", border: "none", borderRadius: "10px",
            fontWeight: 800, fontSize: "14px", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,200,150,0.3)",
            fontFamily: "inherit", letterSpacing: "0.02em",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Unlock Analytics
        </button>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({
  title, subtitle, children, action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(8,18,14,0.85)",
      border: "1px solid rgba(0,200,150,0.1)",
      borderRadius: "16px",
      backdropFilter: "blur(12px)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 24px", borderBottom: "1px solid rgba(0,200,150,0.08)",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {title}
          </h2>
          {subtitle && <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#3a7060" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Funnel Tab Switcher ──────────────────────────────────────────────────────
const FUNNEL_TABS: { key: FunnelTab; label: string }[] = [
  { key: "aum", label: "RWA Acquisition" },
  { key: "holder", label: "Holder Onboarding" },
  { key: "referral", label: "Brand Referrals" },
];

function FunnelTabs({ active, onChange }: { active: FunnelTab; onChange: (t: FunnelTab) => void }) {
  return (
    <div style={{
      display: "flex", background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px", padding: "3px", gap: "2px",
    }}>
      {FUNNEL_TABS.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: "6px 14px", borderRadius: "6px",
            fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
            background: active === t.key ? "rgba(0,200,150,0.15)" : "transparent",
            color: active === t.key ? "#00c896" : "#3a7060",
            boxShadow: active === t.key ? "0 0 12px rgba(0,200,150,0.12)" : "none",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
function DataHubNav({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  const router = useRouter();
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(3,13,10,0.92)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(0,200,150,0.08)",
      padding: "0 32px", height: "58px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: "0 1px 0 rgba(0,200,150,0.06)",
    }}>
      {/* Logo + nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px",
            background: "linear-gradient(135deg, #00c896, #00a876)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: "14px", color: "#030d0a",
          }}>S</div>
          <div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: 800, letterSpacing: "-0.02em" }}>SHIFT</div>
            <div style={{ color: "#3a7060", fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em", marginTop: "-2px" }}>Omnichannel Gate Hub</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {["Dashboard", "Markets", "Analytics", "Stitched GA4", "Portfolios", "Admin"].map((item, i) => (
            <button
              key={item}
              style={{
                padding: "5px 12px", borderRadius: "6px", border: "none",
                fontSize: "12.5px", fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? "#00c896" : "#3a6e5e",
                background: i === 0 ? "rgba(0,200,150,0.08)" : "transparent",
                borderBottom: i === 0 ? "2px solid #00c896" : "2px solid transparent",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px", padding: "6px 12px",
        }}>
          <span style={{ fontSize: "13px", color: "#3a7060" }}>🔍</span>
          <span style={{ fontSize: "12px", color: "#2a5040" }}>Search</span>
        </div>
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 14px", borderRadius: "8px",
            background: syncing ? "rgba(0,200,150,0.05)" : "rgba(0,200,150,0.1)",
            border: "1px solid rgba(0,200,150,0.2)",
            color: "#00c896", fontSize: "12px", fontWeight: 600,
            cursor: syncing ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
          }}
        >
          <span style={{
            display: "inline-block",
            animation: syncing ? "spin 1s linear infinite" : "none",
          }}>⟳</span>
          {syncing ? "Syncing…" : "Force Sync"}
        </button>
        <button
          onClick={() => router.push("/admin/dashboard")}
          style={{
            padding: "6px 12px", borderRadius: "8px",
            background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
            color: "#3a6e5e", fontSize: "12px", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← Admin
        </button>
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00c896", animation: "livePulse 2s ease infinite" }} />
          <span style={{ fontSize: "11px", color: "#00c896", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>
    </nav>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DataHubPage() {
  const { isAuthenticated } = useAdminAuth();
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnelTab, setFunnelTab] = useState<FunnelTab>("aum");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/dashboard-stats`, {
        headers: { "x-admin-key": ADMIN_KEY },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DashboardStats = await res.json();
      if (json.success) setStats(json);
      else throw new Error("API returned success: false");
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) setAuthed(true);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authed) return;
    fetchStats();
    // Auto-refresh every 30 seconds
    pollingRef.current = setInterval(fetchStats, 30_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [authed, fetchStats]);

  if (!authed) {
    return <AuthGate onAuth={() => { setAuthed(true); }} />;
  }

  const funnelSteps = stats?.funnels?.[funnelTab] ?? [];

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#030d0a", color: "#e0e0e0", fontFamily: "var(--font-inter-var, 'Inter', sans-serif)" }}>
        <DataHubNav onSync={fetchStats} syncing={loading} />

        <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 32px 64px" }}>

          {/* Page title */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              Omnichannel Gate Hub
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#3a7060" }}>
              Real-time cross-channel KPIs · GA4 identity stitching · Solana on-chain attribution
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)",
              borderRadius: "10px", padding: "12px 16px", color: "#ff6b6b",
              marginBottom: "20px", fontSize: "13px",
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* KPI Cards */}
          <div style={{ marginBottom: "20px" }}>
            <KPICards metrics={stats?.metrics ?? null} loading={loading} />
          </div>

          {/* Conversion Funnel */}
          <div style={{ marginBottom: "20px" }}>
            <SectionCard
              title={`Conversion Funnel`}
              subtitle={`Omnichannel acquisition pipeline · ${FUNNEL_TABS.find(t => t.key === funnelTab)?.label}`}
              action={<FunnelTabs active={funnelTab} onChange={setFunnelTab} />}
            >
              <FunnelChart steps={funnelSteps} loading={loading} activeTab={funnelTab} />
            </SectionCard>
          </div>

          {/* Real-Time Ledger */}
          <SectionCard
            title="Real-Time Ledger (Solana ↔ GA4)"
            subtitle="Live identity stitching log · Wallet × GA4 × Snag attribution records"
            action={
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00c896", animation: "livePulse 2s ease infinite" }} />
                <span style={{ fontSize: "11px", color: "#00c896", fontWeight: 600 }}>LIVE STREAM</span>
              </div>
            }
          >
            <RealtimeLedger
              profiles={stats?.recentStitched ?? []}
              loading={loading}
            />
          </SectionCard>

        </main>
      </div>
    </>
  );
}
