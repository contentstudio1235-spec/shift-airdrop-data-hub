"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "@/styles/admin.module.css";

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

  const formatWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-6)}`;

  const getActiveFunnelData = () => {
    if (!data?.funnels) return [];
    return data.funnels[activeFunnelTab] || [];
  };

  return (
    <div className="text-on-surface antialiased min-h-screen pb-8 bg-[#050505]">
      <nav className="bg-surface/70 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_0_15px_rgba(0,200,150,0.1)] fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16 md:hidden">
        <div className="flex items-center gap-2">
          <button className="text-on-surface-variant hover:text-primary transition-colors duration-200">
            <span className="material-symbols-outlined text-4xl">menu</span>
          </button>
          <span className="font-bold tracking-tight text-2xl font-bold tracking-tighter text-primary text-glow">SHIFT</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative">
            <span className="material-symbols-outlined">sync</span>
            {loading && <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full animate-pulse"></span>}
          </button>
          <button onClick={() => router.push("/admin/dashboard")} className="text-on-surface-variant hover:text-primary transition-colors duration-200">
            <span className="material-symbols-outlined">exit_to_app</span>
          </button>
        </div>
      </nav>

      <nav className="bg-surface/70 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_0_15px_rgba(0,200,150,0.1)] fixed top-0 w-full z-50 justify-between items-center px-10 h-16 hidden md:flex">
        <div className="flex items-center gap-6">
          <span className="font-bold tracking-tight text-3xl font-bold tracking-tighter text-primary">SHIFT RWA</span>
          <div className="flex gap-4">
            <button className="font-normal text-base text-primary border-b-2 border-primary pb-1">Analytics</button>
            <button onClick={() => router.push("/admin/dashboard")} className="font-normal text-base text-on-surface-variant hover:text-primary transition-colors duration-200">Admin Main</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-2">
            <span className="material-symbols-outlined">sync</span>
            {loading && <span className="text-xs text-primary animate-pulse">Syncing...</span>}
          </button>
        </div>
      </nav>

      <aside className="bg-surface-container-lowest/80 backdrop-blur-md border-r border-outline-variant/10 fixed left-0 top-0 h-full flex-col py-6 docked left-0 h-screen w-64 transition-all duration-300 ease-in-out hidden md:flex z-40 pt-24">
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-primary">hub</span>
            </div>
            <div>
              <div className="font-bold tracking-tight text-2xl text-primary font-black text-glow">SHIFT RWA</div>
              <div className="font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Omnichannel Hub</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 px-2 flex-grow">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-xs text-primary bg-primary/10 border-r-2 border-primary">
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </button>
          <button onClick={() => setActiveFunnelTab("aum")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-xs ${activeFunnelTab === 'aum' ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">account_balance_wallet</span> AUM Holding
          </button>
          <button onClick={() => setActiveFunnelTab("holder")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-xs ${activeFunnelTab === 'holder' ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">monitoring</span> Holder Acquisition
          </button>
          <button onClick={() => setActiveFunnelTab("referral")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold uppercase tracking-wider text-xs ${activeFunnelTab === 'referral' ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-white/5'}`}>
            <span className="material-symbols-outlined">filter_alt</span> Brand Awareness
          </button>
        </div>
      </aside>

      <main className="pt-20 px-4 md:px-10 md:pl-[calc(16rem+2.5rem)] md:pt-24 max-w-7xl mx-auto space-y-lg pb-24 md:pb-0">
        <header className="md:hidden flex flex-col gap-1 mb-4">
          <h1 className="font-bold tracking-tight text-2xl text-on-surface">Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse neon-glow"></span>
            <span className="font-semibold uppercase tracking-wider text-xs text-primary">System Live</span>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-xl neon-glow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold uppercase tracking-wider text-xs text-on-surface-variant tracking-wider">STITCHED GA4 PROFILES</span>
            </div>
            <div className="font-bold text-3xl text-on-surface text-3xl font-bold tracking-tight">
              {loading ? "..." : (data?.metrics?.stitchedUsers || 0).toLocaleString()}
            </div>
            <div className="mt-md h-12 w-full relative flex items-end">
              <div className="absolute bottom-0 w-full h-full liquid-chart-gradient rounded-b-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <svg className="w-full h-full preserve-aspect-ratio-none stroke-primary" fill="none" strokeWidth="2" viewBox="0 0 100 30">
                <path d="M0,25 L10,22 L20,28 L30,15 L40,18 L50,8 L60,12 L70,5 L80,10 L90,2 L100,8"></path>
              </svg>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl neon-glow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold uppercase tracking-wider text-xs text-on-surface-variant tracking-wider">ACTIVE AUM HOLDERS</span>
            </div>
            <div className="font-bold text-3xl text-on-surface text-3xl font-bold tracking-tight">
              {loading ? "..." : (data?.metrics?.activeHolders || 0).toLocaleString()}
            </div>
            <div className="mt-md h-12 w-full relative flex items-end">
              <div className="absolute bottom-0 w-full h-full liquid-chart-gradient rounded-b-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <svg className="w-full h-full preserve-aspect-ratio-none stroke-primary" fill="none" strokeWidth="2" viewBox="0 0 100 30">
                <path d="M0,20 L15,25 L30,18 L45,22 L60,10 L75,15 L90,5 L100,2"></path>
              </svg>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl neon-glow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold uppercase tracking-wider text-xs text-on-surface-variant tracking-wider">USD VOLUME</span>
            </div>
            <div className="font-bold text-3xl text-on-surface text-3xl font-bold tracking-tight">
              ${loading ? "..." : Number(data?.metrics?.totalVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-md h-12 w-full relative flex items-end">
              <div className="absolute bottom-0 w-full h-full liquid-chart-gradient rounded-b-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <svg className="w-full h-full preserve-aspect-ratio-none stroke-primary" fill="none" strokeWidth="2" viewBox="0 0 100 30">
                <path d="M0,28 L12,25 L24,20 L36,22 L48,15 L60,10 L72,12 L84,5 L96,0 L100,0"></path>
              </svg>
            </div>
          </div>
        </section>

        <section className="glass-panel p-4 rounded-xl mt-6">
          <h2 className="font-bold tracking-tight text-2xl text-on-surface mb-6 text-glow border-b border-outline-variant/20 pb-2">
            CONVERSION FUNNEL <span className="text-on-surface-variant text-base font-normal font-normal">({activeFunnelTab.toUpperCase()})</span>
          </h2>
          <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-2">
            {loading ? (
               <div className="py-10 text-on-surface-variant">Loading funnel...</div>
            ) : (() => {
              const steps = getActiveFunnelData();
              if (!steps || steps.length === 0) return <div className="py-10 text-on-surface-variant">No funnel data</div>;
              
              const maxVal = Math.max(...steps.map((s: any) => Number(s.count))) || 1;
              return steps.map((step: any, idx: number) => {
                const val = Number(step.count);
                const prevStep = steps[idx - 1];
                let stepConv = 100;
                if (prevStep) {
                  const prevVal = Number(prevStep.count) || 1;
                  stepConv = (val / prevVal) * 100;
                }
                
                // Width mapping: 100% -> 90% -> 80% -> 70%
                const widthPct = Math.max(40, 100 - (idx * 10));
                
                let bgClass = "bg-surface-container-highest";
                let glowClass = "";
                let borderClass = "border-outline-variant/30";
                
                if (idx === 1) {
                  bgClass = "bg-gradient-to-r from-surface-container-highest to-surface-container";
                  borderClass = "border-primary/20";
                } else if (idx === 2) {
                  bgClass = "bg-gradient-to-r from-surface-container-highest to-primary/10";
                  borderClass = "border-primary/40";
                  glowClass = "neon-glow";
                } else if (idx >= 3) {
                  bgClass = "bg-gradient-to-r from-primary/20 to-primary/30";
                  borderClass = "border-primary";
                  glowClass = "neon-glow shadow-[0_0_20px_rgba(0,200,150,0.3)]";
                }

                return (
                  <div key={step.name} className="relative group" style={{ width: `${widthPct}%` }}>
                    <div className={`w-full ${bgClass} border ${borderClass} rounded-lg p-2 flex justify-between items-center z-10 relative ${glowClass}`}>
                      <span className={`font-semibold uppercase tracking-wider text-xs ${idx >= 3 ? 'text-on-primary font-bold' : idx > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {step.name}
                      </span>
                      <span className={`font-bold text-3xl ${idx >= 3 ? 'text-on-primary' : 'text-on-surface'} font-bold`}>
                        {val.toLocaleString()}
                      </span>
                    </div>
                    
                    {idx > 0 && (
                      <div className="absolute -right-16 top-2 hidden md:block">
                        <span className="font-semibold uppercase tracking-wider text-xs text-secondary bg-secondary/10 px-2 py-1 rounded">{stepConv.toFixed(1)}%</span>
                      </div>
                    )}
                    
                    {idx < steps.length - 1 && (
                      <div className="h-8 flex justify-center items-center relative">
                        <div className={`h-full w-px ${idx === 0 ? 'bg-outline-variant/50' : idx === 1 ? 'bg-primary/30' : 'bg-primary/50'} relative`}>
                          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${idx === 0 ? 'bg-surface-container border-outline-variant/30 text-on-surface-variant' : 'bg-surface-container border-primary/30 text-primary'} px-2 rounded-full border z-20`}>
                            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                          </div>
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 md:hidden">
                          <span className="font-semibold uppercase tracking-wider text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded text-[10px]">
                            {steps[idx + 1] ? ((Number(steps[idx + 1].count) / val) * 100).toFixed(1) + '%' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </section>

        <section className="glass-panel p-4 rounded-xl flex flex-col mt-6">
          <div className="flex justify-between items-center mb-4 border-b border-outline-variant/20 pb-2">
            <h2 className="font-bold tracking-tight text-2xl text-on-surface text-glow">
              REAL-TIME LEDGER <span className="text-on-surface-variant text-base font-normal font-normal">(Solana <span className="material-symbols-outlined text-sm align-middle mx-1">sync_alt</span> GA4)</span>
            </h2>
          </div>
          <div className="overflow-x-auto no-scrollbar w-full rounded-lg border border-outline-variant/10">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-highest border-b border-outline-variant/30">
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium">Timestamp</th>
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium">Solana Wallet</th>
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium">GA4 ID</th>
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium">Activity</th>
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium text-right">Amount</th>
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium text-center">Snag Code</th>
                  <th className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody className="font-normal text-base text-on-surface">
                {loading ? (
                   <tr>
                     <td colSpan={7} className="p-4 text-center text-on-surface-variant font-normal">
                       Loading ledger...
                     </td>
                   </tr>
                ) : !data?.recentStitched || data.recentStitched.length === 0 ? (
                   <tr>
                     <td colSpan={7} className="p-4 text-center text-on-surface-variant font-normal">
                       No recent transactions found.
                     </td>
                   </tr>
                ) : (
                  data.recentStitched.map((profile: any) => (
                    <tr key={profile.wallet} className="border-b border-outline-variant/10 hover:bg-white/5 transition-colors group">
                      <td className="p-2 font-semibold uppercase tracking-wider text-xs text-on-surface-variant">
                        {new Date(profile.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                      </td>
                      <td className="p-2 font-semibold uppercase tracking-wider text-xs text-primary font-medium tracking-wide">
                        {formatWallet(profile.wallet)}
                      </td>
                      <td className="p-2 font-semibold uppercase tracking-wider text-xs text-secondary">
                        {profile.ga_user_id}
                      </td>
                      <td className="p-2">
                        <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>Token Purchase
                        </span>
                      </td>
                      <td className="p-2 font-bold text-3xl text-right text-on-surface">
                        {Number(profile.total_xp).toLocaleString()} XP
                      </td>
                      <td className="p-2 text-center font-semibold uppercase tracking-wider text-xs text-on-surface-variant">
                        {profile.snag_custom_referral_code || 'organic'}
                      </td>
                      <td className="p-2 text-right">
                        <button className="bg-surface-container-highest border border-outline-variant/50 px-2 py-1 rounded-full inline-flex items-center gap-1 group-hover:border-primary/50 transition-colors">
                          <span className="material-symbols-outlined text-[14px] text-secondary">diamond</span>
                          <span className="font-semibold uppercase tracking-wider text-xs text-primary font-bold">{Number(profile.snag_points).toLocaleString()} PTS</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
