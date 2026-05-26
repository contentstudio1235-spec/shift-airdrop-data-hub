"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "@/styles/admin.module.css";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAdminAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);

  const navItems = [
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
          `${process.env.NEXT_PUBLIC_API_URL || "https://shift-airdrop-backend.onrender.com"}/api/admin/dashboard`,
          { headers: { "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key" } }
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
