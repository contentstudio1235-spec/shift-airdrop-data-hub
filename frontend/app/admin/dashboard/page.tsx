"use client";
import React, { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import styles from "@/styles/admin.module.css";

export default function AdminDashboardPage() {
  const { isAuthenticated } = useAdminAuth();
  const [metrics, setMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!isAuthenticated) return <div>Not authenticated.</div>;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", {
          headers: { "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || "" }
        });
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
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <h1>Admin Dashboard</h1>
        <p>SHIFT airdrop system overview and metrics</p>
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
