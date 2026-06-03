"use client";
import React, { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "@/styles/admin.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://shift-airdrop-backend.onrender.com";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key";

export default function AdminUsersPage() {
  const { isAuthenticated, login } = useAdminAuth();
  const [searchWallet, setSearchWallet] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchWallet.trim()) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/users/${searchWallet}`, {
        headers: { "x-admin-key": ADMIN_KEY }
      });
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();
      setUserInfo(data.user);
    } catch (error) {
      alert("Error: " + ((error as Error).message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAudit = async () => {
    if (!searchWallet.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/audit?wallet=${searchWallet}&limit=50`, {
        headers: { "x-admin-key": ADMIN_KEY }
      });
      if (!res.ok) throw new Error("Failed to load audit");
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      alert("Error: " + ((error as Error).message || "Unknown"));
    }
  };

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <h1>User Management</h1>
        <p>View user multipliers, badges, and certificates</p>
      </div>

      <div className={styles.searchSection}>
        <form onSubmit={handleSearch}>
          <input type="text" value={searchWallet} onChange={(e) => setSearchWallet(e.target.value)} placeholder="Enter wallet address..." style={{flex: 1}} />
          <button type="submit" disabled={loading}>{loading ? "Searching..." : "Search"}</button>
        </form>
      </div>

      {userInfo && (
        <div className={styles.userPanel}>
          <div style={{display: "flex", gap: "20px", marginBottom: "20px"}}>
            <button onClick={() => setActiveTab("info")} style={{borderBottom: activeTab === "info" ? "2px solid #00ff00" : "none"}}>User Info</button>
            <button onClick={() => {setActiveTab("audit"); handleLoadAudit();}} style={{borderBottom: activeTab === "audit" ? "2px solid #00ff00" : "none"}}>Audit Trail</button>
          </div>

          {activeTab === "info" && (
            <div>
              <h2>User: {userInfo.wallet.slice(0, 8)}...</h2>

              <section style={{marginBottom: "40px"}}>
                <h3>Shift Points &amp; Multiplier</h3>
                <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px"}}>
                  <div style={{background: "#1a1a1a", padding: "20px", borderRadius: "8px"}}>
                    <label>Total Shift Points</label>
                    <p style={{fontSize: "1.5em", color: "#00ff00"}}>{(userInfo.xp_earnedshift_points || 0).toLocaleString()}</p>
                  </div>
                  <div style={{background: "#1a1a1a", padding: "20px", borderRadius: "8px"}}>
                    <label>Badges</label>
                    <p style={{fontSize: "1.5em", color: "#00ff00"}}>{userInfo.badge_count || 0}</p>
                  </div>
                  <div style={{background: "#1a1a1a", padding: "20px", borderRadius: "8px"}}>
                    <label>Certificates</label>
                    <p style={{fontSize: "1.5em", color: "#00ff00"}}>{userInfo.certificate_count || 0}</p>
                  </div>
                  <div style={{background: "#1a1a1a", padding: "20px", borderRadius: "8px"}}>
                    <label>Total Multiplier</label>
                    <p style={{fontSize: "1.5em", color: "#ffd700"}}>{(userInfo.permanent_multiplier || 1).toFixed(2)}x</p>
                  </div>
                </div>
              </section>

              <section style={{marginBottom: "40px"}}>
                <h3>Multiplier Breakdown</h3>
                <div style={{background: "#1a1a1a", padding: "20px", borderRadius: "8px"}}>
                  <div style={{display: "flex", justifyContent: "space-between", marginBottom: "10px"}}><span>Base</span><span>1.00x</span></div>
                  <div style={{display: "flex", justifyContent: "space-between", marginBottom: "10px"}}><span>Badges (Perm)</span><span>+{(userInfo.permanent_multiplier - 1).toFixed(2)}x</span></div>
                  <div style={{display: "flex", justifyContent: "space-between", marginBottom: "10px"}}><span>Badges (Dyn)</span><span>+{(userInfo.dynamic_multiplier || 0).toFixed(2)}x</span></div>
                  <hr />
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "1.2em", fontWeight: "bold", color: "#00ff00"}}>
                    <span>TOTAL</span><span>{(userInfo.permanent_multiplier + (userInfo.dynamic_multiplier || 0)).toFixed(2)}x</span>
                  </div>
                </div>
              </section>

              {userInfo.badges.length > 0 && (
                <section>
                  <h3>Badges ({userInfo.badges.length})</h3>
                  <table className={styles.table}>
                    <thead><tr><th>Badge</th><th>Earned</th></tr></thead>
                    <tbody>
                      {userInfo.badges.map((b: any, i: number) => <tr key={i}><td>{b.name}</td><td>{new Date(b.earned_at).toLocaleDateString()}</td></tr>)}
                    </tbody>
                  </table>
                </section>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div>
              <h2>Audit Trail</h2>
              {auditLogs.length === 0 ? <p>No audit logs</p> : (
                <table className={styles.table}>
                  <thead><tr><th>Action</th><th>Resource</th><th>Admin</th><th>Date</th></tr></thead>
                  <tbody>
                    {auditLogs.map((log, i) => <tr key={i}><td>{log.action}</td><td>{log.resource_type}</td><td>{(log.admin_wallet || "").slice(0, 8)}...</td><td>{new Date(log.created_at).toLocaleDateString()}</td></tr>)}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
